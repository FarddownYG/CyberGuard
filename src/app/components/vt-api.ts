/**
 * VirusTotal API v3 Client
 *
 * Uses the Vercel rewrite proxy (/api/vt/*) to avoid CORS issues.
 * All calls go through /api/vt/ which Vercel rewrites to
 * https://www.virustotal.com/api/v3/
 *
 * API key is sent as x-apikey header.
 */

import { getApiKey, recordRequest, getQuota } from "./vt-rate-limiter";

const VT_PROXY_BASE = "/api/vt";

export class VTError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

async function vtFetch(path: string, options: RequestInit = {}): Promise<any> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new VTError(
      "Clé API VirusTotal non configurée. Ajoutez VITE_VIRUSTOTAL_API_KEY dans vos variables d'environnement Vercel.",
      "NO_API_KEY"
    );
  }

  const quota = getQuota();
  if (!quota.canRequest) {
    throw new VTError(quota.blockedReason || "Rate limit atteint", "RATE_LIMITED");
  }

  // Record this request
  if (!recordRequest()) {
    throw new VTError("Rate limit atteint", "RATE_LIMITED");
  }

  const url = `${VT_PROXY_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "x-apikey": apiKey,
      accept: "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const errMsg = body?.error?.message || `VirusTotal API error ${res.status}`;
    const errCode = body?.error?.code || `HTTP_${res.status}`;
    throw new VTError(errMsg, errCode);
  }

  return res.json();
}

// ─── URL Scanning ────────────────────────────────────────────────────────

/** Submit a URL for scanning. Returns analysis ID. */
export async function submitUrl(targetUrl: string): Promise<string> {
  const body = new URLSearchParams({ url: targetUrl });
  const data = await vtFetch("/urls", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  // Response: { data: { type: "analysis", id: "..." } }
  return data.data.id;
}

/** Get URL analysis results */
export async function getUrlAnalysis(analysisId: string): Promise<any> {
  return vtFetch(`/analyses/${analysisId}`);
}

/** Get URL report by URL ID (base64 of URL without padding) */
export async function getUrlReport(targetUrl: string): Promise<any> {
  const urlId = btoa(targetUrl).replace(/=+$/, "");
  return vtFetch(`/urls/${urlId}`);
}

// ─── File Scanning ───────────────────────────────────────────────────────

/** Get file report by hash (SHA-256, SHA-1, or MD5) */
export async function getFileReport(hash: string): Promise<any> {
  return vtFetch(`/files/${hash}`);
}

/** Upload a file for scanning (max 32MB via this endpoint) */
export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const data = await vtFetch("/files", {
    method: "POST",
    body: formData,
    headers: {}, // Let browser set content-type with boundary
  });
  return data.data.id;
}

/** Get upload URL for large files (>32MB) */
export async function getUploadUrl(): Promise<string> {
  const data = await vtFetch("/files/upload_url");
  return data.data;
}

/** Get analysis status */
export async function getAnalysis(analysisId: string): Promise<any> {
  return vtFetch(`/analyses/${analysisId}`);
}

// ─── Polling Helper ──────────────────────────────────────────────────────

/**
 * Poll an analysis until it completes.
 * Respects rate limits: waits 15s between polls (to stay under 4/min).
 */
export async function pollAnalysis(
  analysisId: string,
  onProgress?: (status: string) => void,
  maxAttempts = 20
): Promise<any> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await getAnalysis(analysisId);
    const status = result.data.attributes.status;

    if (onProgress) onProgress(status);

    if (status === "completed") {
      return result;
    }

    // Wait 15s between polls (4 requests/min max)
    await new Promise((r) => setTimeout(r, 15_000));
  }

  throw new VTError("Analyse trop longue. Réessayez plus tard.", "TIMEOUT");
}

// ─── URL Analysis Full Flow ──────────────────────────────────────────────

export interface VTUrlResult {
  url: string;
  scanDate: string;
  stats: {
    harmless: number;
    malicious: number;
    suspicious: number;
    undetected: number;
    timeout: number;
  };
  engines: {
    name: string;
    category: "harmless" | "malicious" | "suspicious" | "undetected" | "timeout";
    result: string | null;
  }[];
  reputation: number;
  totalVotes: { harmless: number; malicious: number };
}

/** Parse VT URL analysis results into our format */
export function parseUrlResults(data: any): VTUrlResult {
  const attrs = data.data.attributes;
  const lastAnalysis = attrs.last_analysis_results || {};
  const stats = attrs.last_analysis_stats || {};

  const engines = Object.entries(lastAnalysis).map(([name, info]: [string, any]) => ({
    name,
    category: info.category as VTUrlResult["engines"][0]["category"],
    result: info.result || null,
  }));

  // Sort: malicious first, then suspicious, then harmless, then undetected
  const order = { malicious: 0, suspicious: 1, harmless: 2, undetected: 3, timeout: 4 };
  engines.sort((a, b) => (order[a.category] ?? 5) - (order[b.category] ?? 5));

  return {
    url: attrs.url || attrs.last_final_url || "",
    scanDate: attrs.last_analysis_date
      ? new Date(attrs.last_analysis_date * 1000).toLocaleString("fr-FR")
      : new Date().toLocaleString("fr-FR"),
    stats: {
      harmless: stats.harmless || 0,
      malicious: stats.malicious || 0,
      suspicious: stats.suspicious || 0,
      undetected: stats.undetected || 0,
      timeout: stats.timeout || 0,
    },
    engines,
    reputation: attrs.reputation || 0,
    totalVotes: attrs.total_votes || { harmless: 0, malicious: 0 },
  };
}

/** Parse VT file report into similar format */
export interface VTFileResult {
  sha256: string;
  sha1: string;
  md5: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  scanDate: string;
  stats: {
    harmless: number;
    malicious: number;
    suspicious: number;
    undetected: number;
    timeout: number;
    failure: number;
  };
  engines: {
    name: string;
    category: string;
    result: string | null;
  }[];
  reputation: number;
  tags: string[];
  threats: string[];
}

export function parseFileResults(data: any): VTFileResult {
  const attrs = data.data.attributes;
  const lastAnalysis = attrs.last_analysis_results || {};
  const stats = attrs.last_analysis_stats || {};

  const engines = Object.entries(lastAnalysis).map(([name, info]: [string, any]) => ({
    name,
    category: info.category || "undetected",
    result: info.result || null,
  }));

  const order: Record<string, number> = { malicious: 0, suspicious: 1, harmless: 2, undetected: 3, timeout: 4, failure: 5 };
  engines.sort((a, b) => (order[a.category] ?? 5) - (order[b.category] ?? 5));

  // Extract threat names
  const threats = engines
    .filter((e) => e.result && e.category === "malicious")
    .map((e) => e.result!)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 10);

  return {
    sha256: attrs.sha256 || "",
    sha1: attrs.sha1 || "",
    md5: attrs.md5 || "",
    fileName: attrs.meaningful_name || attrs.names?.[0] || "Inconnu",
    fileSize: attrs.size || 0,
    fileType: attrs.type_description || attrs.type_tag || "Inconnu",
    scanDate: attrs.last_analysis_date
      ? new Date(attrs.last_analysis_date * 1000).toLocaleString("fr-FR")
      : new Date().toLocaleString("fr-FR"),
    stats: {
      harmless: stats.harmless || 0,
      malicious: stats.malicious || 0,
      suspicious: stats.suspicious || 0,
      undetected: stats.undetected || 0,
      timeout: stats.timeout || 0,
      failure: stats["type-unsupported"] || stats.failure || 0,
    },
    engines,
    reputation: attrs.reputation || 0,
    tags: attrs.tags || [],
    threats,
  };
}