import { useState, useRef } from "react";
import { FileSearch, Upload, Copy, Check, Shield, FileText, Hash, AlertTriangle, CheckCircle, XCircle, Loader2, ExternalLink, Bug, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getFileReport, uploadFile, pollAnalysis, parseFileResults, VTError, type VTFileResult } from "./vt-api";
import { getApiKey, getQuota } from "./vt-rate-limiter";
import { QuotaDisplay } from "./QuotaDisplay";

interface FileResult {
  name: string;
  size: number;
  type: string;
  lastModified: string;
  md5: string;
  sha1: string;
  sha256: string;
}

async function computeHash(buffer: ArrayBuffer, algorithm: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function md5(buffer: ArrayBuffer): string {
  // NOTE: This is NOT real MD5. Web Crypto API does not support MD5.
  // This is a fast FNV-based fingerprint used as a local identifier only.
  // The real MD5 hash is provided by VirusTotal when available.
  const bytes = new Uint8Array(buffer);
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193);
  }
  const h1 = (hash >>> 0).toString(16).padStart(8, "0");
  let hash2 = 0x12345678;
  for (let i = 0; i < bytes.length; i++) {
    hash2 ^= bytes[i];
    hash2 = Math.imul(hash2, 0x5bd1e995);
  }
  const h2 = (hash2 >>> 0).toString(16).padStart(8, "0");
  let hash3 = 0xdeadbeef;
  for (let i = 0; i < bytes.length; i++) {
    hash3 ^= bytes[i];
    hash3 = Math.imul(hash3, 0x1b873593);
  }
  const h3 = (hash3 >>> 0).toString(16).padStart(8, "0");
  let hash4 = 0xcafebabe;
  for (let i = 0; i < bytes.length; i++) {
    hash4 ^= bytes[i];
    hash4 = Math.imul(hash4, 0xcc9e2d51);
  }
  const h4 = (hash4 >>> 0).toString(16).padStart(8, "0");
  return h1 + h2 + h3 + h4;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(2) + " KB";
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + " MB";
  return (bytes / 1073741824).toFixed(2) + " GB";
}

type VTPhase = "idle" | "hashing" | "looking-up" | "uploading" | "polling" | "done" | "not-found" | "error";

export function FileAnalyzer() {
  const [result, setResult] = useState<FileResult | null>(null);
  const [vtResult, setVtResult] = useState<VTFileResult | null>(null);
  const [vtPhase, setVtPhase] = useState<VTPhase>("idle");
  const [vtStatus, setVtStatus] = useState("");
  const [vtError, setVtError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [copiedField, setCopiedField] = useState("");
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const apiKey = getApiKey();

  const analyzeFile = async (file: File) => {
    setVtPhase("hashing");
    setResult(null);
    setVtResult(null);
    setVtError("");
    setCurrentFile(file);
    setVtStatus("Calcul des empreintes cryptographiques...");

    try {
      const buffer = await file.arrayBuffer();
      const [sha1, sha256] = await Promise.all([
        computeHash(buffer, "SHA-1"),
        computeHash(buffer, "SHA-256"),
      ]);
      const md5Hash = md5(buffer);

      const fileResult: FileResult = {
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        lastModified: new Date(file.lastModified).toLocaleString("fr-FR"),
        md5: md5Hash,
        sha1,
        sha256,
      };

      setResult(fileResult);

      // Try VT lookup if API key is configured
      if (!apiKey) {
        setVtPhase("idle");
        return;
      }

      const quota = getQuota();
      if (!quota.canRequest) {
        setVtError(quota.blockedReason || "Rate limit atteint");
        setVtPhase("error");
        return;
      }

      // Step 1: Look up hash
      setVtPhase("looking-up");
      setVtStatus("Recherche du hash SHA-256 dans la base VirusTotal...");

      try {
        const report = await getFileReport(sha256);
        const parsed = parseFileResults(report);
        setVtResult(parsed);
        setVtPhase("done");
      } catch (err) {
        if (err instanceof VTError && (err.code === "NotFoundError" || err.code === "HTTP_404")) {
          // File not in VT database - offer to upload
          setVtPhase("not-found");
          setVtStatus("Fichier inconnu de VirusTotal");
        } else {
          throw err;
        }
      }
    } catch (err) {
      if (err instanceof VTError) {
        setVtError(err.message);
      } else {
        setVtError("Erreur lors de l'analyse. Verifiez votre connexion.");
      }
      setVtPhase("error");
    }
  };

  const handleUploadToVT = async () => {
    if (!currentFile) return;

    const quota = getQuota();
    if (!quota.canRequest) {
      setVtError(quota.blockedReason || "Rate limit atteint");
      setVtPhase("error");
      return;
    }

    try {
      setVtPhase("uploading");
      setVtStatus("Upload du fichier vers VirusTotal...");

      if (currentFile.size > 32 * 1024 * 1024) {
        setVtError("Le fichier depasse 32 MB. L'upload de gros fichiers necessite un endpoint special (non supporte en free tier).");
        setVtPhase("error");
        return;
      }

      const analysisId = await uploadFile(currentFile);

      // Poll
      setVtPhase("polling");
      setVtStatus("Analyse en cours par les moteurs antivirus...");

      const analysis = await pollAnalysis(analysisId, (status) => {
        if (status === "queued") setVtStatus("En file d'attente...");
        else if (status === "in-progress") setVtStatus("Scan en cours...");
      });

      // Now fetch full report
      const sha256 = result?.sha256;
      if (sha256) {
        setVtStatus("Recuperation du rapport complet...");
        try {
          const report = await getFileReport(sha256);
          const parsed = parseFileResults(report);
          setVtResult(parsed);
          setVtPhase("done");
        } catch {
          // If report not yet available, show analysis stats
          const stats = analysis.data.attributes.stats;
          setVtResult({
            sha256: sha256,
            sha1: result?.sha1 || "",
            md5: result?.md5 || "",
            fileName: currentFile.name,
            fileSize: currentFile.size,
            fileType: currentFile.type,
            scanDate: new Date().toLocaleString("fr-FR"),
            stats: {
              harmless: stats?.harmless || 0,
              malicious: stats?.malicious || 0,
              suspicious: stats?.suspicious || 0,
              undetected: stats?.undetected || 0,
              timeout: stats?.timeout || 0,
              failure: stats?.failure || 0,
            },
            engines: [],
            reputation: 0,
            tags: [],
            threats: [],
          });
          setVtPhase("done");
        }
      }
    } catch (err) {
      if (err instanceof VTError) {
        setVtError(err.message);
      } else {
        setVtError("Erreur lors de l'upload.");
      }
      setVtPhase("error");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) analyzeFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) analyzeFile(file);
  };

  const copyHash = async (hash: string, field: string) => {
    await navigator.clipboard.writeText(hash);
    setCopiedField(field);
    setTimeout(() => setCopiedField(""), 2000);
  };

  const getColor = (r: string) => {
    switch (r) {
      case "clean": case "harmless": return "#39ff14";
      case "malicious": return "#ef4444";
      case "suspicious": return "#f59e0b";
      default: return "#64748b";
    }
  };

  const getLabel = (r: string) => {
    switch (r) {
      case "clean": case "harmless": return "Sain";
      case "malicious": return "Malveillant";
      case "suspicious": return "Suspect";
      default: return "Non evalue";
    }
  };

  return (
    <div className="min-h-screen py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)" }}>
            <FileSearch className="w-3.5 h-3.5 text-[#ef4444]" />
            <span className="text-[#ef4444]" style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace" }}>Hash + VirusTotal API v3</span>
          </div>
          <h1 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.8rem, 3vw, 2.2rem)" }} className="text-[#e2e8f0] mb-4">
            Analyseur de{" "}
            <span style={{ background: "linear-gradient(135deg, #ef4444, #f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Fichiers</span>
          </h1>
          <p className="text-[#94a3b8] max-w-xl mx-auto" style={{ lineHeight: 1.7 }}>
            Calculez les empreintes cryptographiques de vos fichiers puis scannez-les automatiquement
            avec les moteurs antivirus VirusTotal pour detecter les menaces.
          </p>
        </motion.div>

        {/* Quota display */}
        <div className="mb-6">
          <QuotaDisplay />
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`bg-[#111827] border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all mb-8 ${
            dragOver
              ? "border-[#ef4444] bg-[#ef4444]/5"
              : "border-[#ef4444]/20 hover:border-[#ef4444]/50"
          }`}
        >
          <input ref={fileRef} type="file" onChange={handleFileSelect} className="hidden" />
          <Upload className={`w-12 h-12 mx-auto mb-4 ${dragOver ? "text-[#ef4444]" : "text-[#64748b]"}`} />
          <p className="text-[#e2e8f0] mb-2">
            {vtPhase === "hashing" ? "Calcul des hash en cours..." : "Glissez-deposez un fichier ici"}
          </p>
          <p className="text-[#64748b]" style={{ fontSize: "0.85rem" }}>
            ou cliquez pour selectionner un fichier (max 32 MB pour l'upload VT)
          </p>
        </div>

        {/* Results */}
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* File info */}
            <div className="bg-[#111827] border border-[#00d4ff]/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#ef4444]/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#ef4444]" />
                </div>
                <div>
                  <p className="text-[#e2e8f0]">{result.name}</p>
                  <p className="text-[#64748b]" style={{ fontSize: "0.8rem" }}>
                    {formatBytes(result.size)} &bull; {result.type}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0a0a0f] rounded-lg p-3">
                  <p className="text-[#64748b]" style={{ fontSize: "0.75rem" }}>Taille</p>
                  <p className="text-[#e2e8f0]" style={{ fontSize: "0.9rem" }}>{formatBytes(result.size)}</p>
                </div>
                <div className="bg-[#0a0a0f] rounded-lg p-3">
                  <p className="text-[#64748b]" style={{ fontSize: "0.75rem" }}>Derniere modification</p>
                  <p className="text-[#e2e8f0]" style={{ fontSize: "0.9rem" }}>{result.lastModified}</p>
                </div>
              </div>
            </div>

            {/* Hashes */}
            {[
              { label: "Empreinte locale", value: result.md5, note: "FNV-based — ce n'est PAS du vrai MD5" },
              { label: "SHA-1", value: result.sha1, note: "Web Crypto API" },
              { label: "SHA-256", value: result.sha256, note: "Web Crypto API — utilise pour le lookup VT" },
            ].map((h) => (
              <div key={h.label} className="bg-[#111827] border border-[#00d4ff]/10 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-[#00d4ff]" />
                    <span className="text-[#e2e8f0]">{h.label}</span>
                    <span className="text-[#64748b]" style={{ fontSize: "0.7rem" }}>({h.note})</span>
                  </div>
                  <button
                    onClick={() => copyHash(h.value, h.label)}
                    className="p-1.5 rounded-lg hover:bg-[#1e293b] text-[#94a3b8] hover:text-[#39ff14] transition-colors"
                  >
                    {copiedField === h.label ? <Check className="w-4 h-4 text-[#39ff14]" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p
                  className="font-mono text-[#00d4ff] bg-[#0a0a0f] rounded-lg p-3 break-all"
                  style={{ fontSize: "0.8rem", letterSpacing: "0.5px" }}
                >
                  {h.value}
                </p>
              </div>
            ))}

            {/* VirusTotal Scan Section */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-[#8b5cf6]" />
                <h2 className="text-[#e2e8f0]" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1.1rem" }}>
                  Scan <span className="text-[#8b5cf6]">VirusTotal</span>
                </h2>
              </div>

              {!apiKey && (
                <div className="bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-xl p-4 flex items-start gap-3">
                  <Info className="w-5 h-5 text-[#f59e0b] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[#f59e0b]" style={{ fontSize: "0.9rem" }}>API non configuree</p>
                    <p className="text-[#94a3b8]" style={{ fontSize: "0.8rem" }}>
                      Ajoutez <code className="bg-[#f59e0b]/10 px-1 rounded">VITE_VIRUSTOTAL_API_KEY</code> dans vos variables
                      d'environnement Vercel pour activer le scan automatique. Les hash sont calcules 100% localement via Web Crypto API.
                    </p>
                  </div>
                </div>
              )}

              {/* Scanning state */}
              {(vtPhase === "looking-up" || vtPhase === "uploading" || vtPhase === "polling") && (
                <div className="bg-[#111827] border border-[#8b5cf6]/20 rounded-xl p-8 flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-[#8b5cf6] animate-spin" />
                  <p className="text-[#8b5cf6]" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.85rem" }}>
                    {vtStatus}
                  </p>
                </div>
              )}

              {/* Not found - offer upload */}
              {vtPhase === "not-found" && (
                <div className="bg-[#111827] border border-[#f59e0b]/20 rounded-xl p-6 text-center">
                  <AlertTriangle className="w-10 h-10 text-[#f59e0b] mx-auto mb-3" />
                  <p className="text-[#f59e0b] mb-2" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.95rem" }}>
                    Fichier inconnu
                  </p>
                  <p className="text-[#94a3b8] mb-4" style={{ fontSize: "0.85rem" }}>
                    Ce fichier n'a jamais ete analyse par VirusTotal. Vous pouvez le soumettre pour analyse.
                  </p>
                  <button
                    onClick={handleUploadToVT}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#8b5cf6] text-white rounded-lg hover:bg-[#7c3aed] transition-colors"
                    style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}
                  >
                    <Upload className="w-4 h-4" />
                    Soumettre a VirusTotal
                  </button>
                </div>
              )}

              {/* Error */}
              {vtPhase === "error" && vtError && (
                <div className="bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-xl p-4 flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[#ef4444]" style={{ fontSize: "0.9rem" }}>Erreur</p>
                    <p className="text-[#94a3b8]" style={{ fontSize: "0.8rem" }}>{vtError}</p>
                  </div>
                </div>
              )}

              {/* VT Results */}
              <AnimatePresence>
                {vtResult && vtPhase === "done" && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    {/* Score */}
                    <div className="bg-[#111827] border border-[#8b5cf6]/20 rounded-xl p-6 text-center">
                      <p className="text-[#94a3b8] mb-2" style={{ fontSize: "0.85rem" }}>Resultat VirusTotal</p>
                      <div className="flex items-center justify-center gap-4 flex-wrap">
                        {[
                          { label: "Sains", count: vtResult.stats.harmless, color: "#39ff14" },
                          { label: "Malveillants", count: vtResult.stats.malicious, color: "#ef4444" },
                          { label: "Suspects", count: vtResult.stats.suspicious, color: "#f59e0b" },
                          { label: "Non evalues", count: vtResult.stats.undetected, color: "#64748b" },
                        ].map((s) => (
                          <span key={s.label} className="flex items-center gap-1.5" style={{ fontSize: "0.8rem" }}>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                            <span style={{ color: s.color, fontFamily: "Orbitron, sans-serif", fontSize: "1.2rem" }}>{s.count}</span>
                            <span className="text-[#64748b]">{s.label}</span>
                          </span>
                        ))}
                      </div>

                      {vtResult.sha256 && (
                        <a
                          href={`https://www.virustotal.com/gui/file/${vtResult.sha256}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 mt-4 text-[#8b5cf6] hover:text-[#a78bfa] transition-colors"
                          style={{ fontSize: "0.8rem" }}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Voir le rapport complet sur VirusTotal
                        </a>
                      )}
                    </div>

                    {/* Threats */}
                    {vtResult.threats.length > 0 && (
                      <div className="bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Bug className="w-5 h-5 text-[#ef4444]" />
                          <p className="text-[#ef4444]" style={{ fontSize: "0.9rem" }}>Menaces detectees</p>
                        </div>
                        <div className="space-y-2">
                          {vtResult.threats.map((t, i) => (
                            <div key={i} className="flex items-center gap-2 bg-[#0a0a0f] rounded-lg px-3 py-2">
                              <XCircle className="w-4 h-4 text-[#ef4444] flex-shrink-0" />
                              <span className="text-[#e2e8f0] font-mono" style={{ fontSize: "0.85rem" }}>{t}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendation */}
                    <div
                      className="rounded-xl p-4 flex items-start gap-3"
                      style={{
                        background: vtResult.stats.malicious === 0 ? "rgba(57,255,20,0.05)" : "rgba(239,68,68,0.05)",
                        border: `1px solid ${vtResult.stats.malicious === 0 ? "rgba(57,255,20,0.2)" : "rgba(239,68,68,0.2)"}`,
                      }}
                    >
                      {vtResult.stats.malicious === 0 ? (
                        <CheckCircle className="w-5 h-5 text-[#39ff14] flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p style={{ fontSize: "0.9rem", color: vtResult.stats.malicious === 0 ? "#39ff14" : "#ef4444" }}>
                          {vtResult.stats.malicious === 0 ? "Fichier sain" : `${vtResult.stats.malicious} moteur(s) detectent une menace`}
                        </p>
                        <p className="text-[#94a3b8]" style={{ fontSize: "0.8rem" }}>
                          {vtResult.stats.malicious === 0
                            ? "Aucune menace detectee par les moteurs antivirus VirusTotal."
                            : "Ce fichier a ete signale comme malveillant. Ne l'executez pas et supprimez-le immediatement."}
                        </p>
                      </div>
                    </div>

                    {/* Engine details */}
                    {vtResult.engines.length > 0 && (
                      <details className="bg-[#111827] border border-[#00d4ff]/10 rounded-xl overflow-hidden">
                        <summary className="p-4 cursor-pointer text-[#e2e8f0] hover:bg-[#1e293b]/30 transition-colors" style={{ fontSize: "0.9rem" }}>
                          Details par moteur antivirus ({vtResult.engines.length} moteurs)
                        </summary>
                        <div className="divide-y divide-[#00d4ff]/5 max-h-80 overflow-y-auto">
                          {vtResult.engines.map((e) => (
                            <div key={e.name} className="flex items-center justify-between px-4 py-2.5">
                              <span className="text-[#e2e8f0]" style={{ fontSize: "0.85rem" }}>{e.name}</span>
                              <div className="flex items-center gap-2">
                                {e.result && (
                                  <span className="text-[#64748b] font-mono" style={{ fontSize: "0.65rem" }}>{e.result}</span>
                                )}
                                <span
                                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full"
                                  style={{ fontSize: "0.75rem", color: getColor(e.category), backgroundColor: `${getColor(e.category)}15` }}
                                >
                                  {e.category === "harmless" || e.category === "clean" ? <CheckCircle className="w-3 h-3" /> : e.category === "malicious" ? <XCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                  {getLabel(e.category)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}

                    {/* Real API notice */}
                    <div className="bg-[#39ff14]/5 border border-[#39ff14]/20 rounded-xl p-4 flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-[#39ff14] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[#39ff14]" style={{ fontSize: "0.9rem" }}>Analyse reelle VirusTotal API v3</p>
                        <p className="text-[#94a3b8]" style={{ fontSize: "0.8rem" }}>
                          Ces resultats proviennent de l'API VirusTotal v3 en temps reel.
                          Les hash sont calcules localement via Web Crypto API.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}