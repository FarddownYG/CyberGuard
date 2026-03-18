import { useState, useCallback } from "react";
import {
  Eye, Search, Loader2, AlertTriangle, Globe, User, Mail, Phone,
  Shield, Server, Camera, Clock, Database, Fingerprint, GitBranch,
  Link, MapPin, Hash, FileText, Wifi, ChevronDown, ChevronUp, Copy,
  CheckCircle, XCircle,
} from "lucide-react";
import { ToolPageLayout } from "./ToolPageLayout";
import type { GuiConfig } from "./zip-generator";

// ─── Types ──────────────────────────────────────────────────────────
interface ModuleResult {
  module: string;
  icon: string;
  status: "success" | "partial" | "error" | "pending";
  data: Record<string, any>;
  elapsed: number;
}

interface OsintReport {
  target: string;
  targetType: "username" | "email" | "domain" | "ip" | "phone";
  timestamp: string;
  modules: ModuleResult[];
  totalTime: number;
}

// ─── Target Detection ───────────────────────────────────────────────
function detectTargetType(input: string): OsintReport["targetType"] {
  const trimmed = input.trim();
  if (/^[\w.+-]+@[\w.-]+\.\w+$/.test(trimmed)) return "email";
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(trimmed)) return "ip";
  if (/^[+]?\d[\d\s-]{6,}$/.test(trimmed.replace(/\s/g, ""))) return "phone";
  if (/^[\w.-]+\.\w{2,}$/.test(trimmed) && trimmed.includes(".")) return "domain";
  return "username";
}

// ─── CORS-safe fetch helper ─────────────────────────────────────────
const PROXIES = [
  (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
];

async function safeFetch(url: string, timeout = 8000): Promise<Response> {
  for (const proxy of PROXIES) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const res = await fetch(proxy(url), { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) return res;
    } catch { /* next proxy */ }
  }
  throw new Error("All proxies failed");
}

async function directFetch(url: string, timeout = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const res = await fetch(url, { signal: controller.signal });
  clearTimeout(timer);
  return res;
}

// ─── Module: Username Enumeration ───────────────────────────────────
const PLATFORMS = [
  { name: "GitHub", url: "https://api.github.com/users/{}", check: "json" },
  { name: "GitLab", url: "https://gitlab.com/api/v4/users?username={}", check: "jsonArray" },
  { name: "Reddit", url: "https://www.reddit.com/user/{}/about.json", check: "json" },
  { name: "HackerNews", url: "https://hacker-news.firebaseio.com/v0/user/{}.json", check: "json" },
  { name: "Keybase", url: "https://keybase.io/_/api/1.0/user/lookup.json?usernames={}", check: "json" },
  { name: "Dev.to", url: "https://dev.to/api/users/by_username?url={}", check: "json" },
  { name: "Medium", url: "https://medium.com/@{}?format=json", check: "text" },
  { name: "npm", url: "https://registry.npmjs.org/-/user/org.couchdb.user:{}", check: "json" },
  { name: "PyPI", url: "https://pypi.org/user/{}/", check: "status" },
  { name: "RubyGems", url: "https://rubygems.org/api/v1/profiles/{}.json", check: "json" },
  { name: "Gravatar", url: "https://en.gravatar.com/{}.json", check: "json" },
  { name: "Pastebin", url: "https://pastebin.com/u/{}", check: "status" },
  { name: "Replit", url: "https://replit.com/@{}", check: "status" },
  { name: "Lichess", url: "https://lichess.org/api/user/{}", check: "json" },
  { name: "Chess.com", url: "https://api.chess.com/pub/player/{}", check: "json" },
  { name: "Duolingo", url: "https://www.duolingo.com/2017-06-30/users?username={}", check: "json" },
  { name: "Docker Hub", url: "https://hub.docker.com/v2/users/{}/", check: "json" },
  { name: "Spotify", url: "https://open.spotify.com/user/{}", check: "status" },
  { name: "SoundCloud", url: "https://soundcloud.com/{}", check: "status" },
  { name: "Twitch", url: "https://www.twitch.tv/{}", check: "status" },
  { name: "YouTube", url: "https://www.youtube.com/@{}", check: "status" },
  { name: "TikTok", url: "https://www.tiktok.com/@{}", check: "status" },
  { name: "Twitter/X", url: "https://twitter.com/{}", check: "status" },
  { name: "Instagram", url: "https://www.instagram.com/{}/", check: "status" },
  { name: "Pinterest", url: "https://www.pinterest.com/{}/", check: "status" },
  { name: "Flickr", url: "https://www.flickr.com/people/{}/", check: "status" },
  { name: "Imgur", url: "https://imgur.com/user/{}", check: "status" },
  { name: "StackOverflow", url: "https://api.stackexchange.com/2.3/users?inname={}&site=stackoverflow", check: "jsonField:items" },
  { name: "BuyMeACoffee", url: "https://www.buymeacoffee.com/{}", check: "status" },
  { name: "Ko-fi", url: "https://ko-fi.com/{}", check: "status" },
  { name: "Linktree", url: "https://linktr.ee/{}", check: "status" },
  { name: "About.me", url: "https://about.me/{}", check: "status" },
  { name: "Trello", url: "https://trello.com/{}", check: "status" },
  { name: "Bitbucket", url: "https://bitbucket.org/api/2.0/users/{}", check: "json" },
  { name: "Mastodon.social", url: "https://mastodon.social/@{}", check: "status" },
  { name: "HackTheBox", url: "https://www.hackthebox.com/home/users/profile/{}", check: "status" },
  { name: "TryHackMe", url: "https://tryhackme.com/p/{}", check: "status" },
  { name: "Codewars", url: "https://www.codewars.com/api/v1/users/{}", check: "json" },
  { name: "LeetCode", url: "https://leetcode.com/{}/", check: "status" },
  { name: "Codeforces", url: "https://codeforces.com/api/user.info?handles={}", check: "json" },
];

async function moduleUsername(username: string): Promise<ModuleResult> {
  const t0 = performance.now();
  const found: string[] = [];
  const notFound: string[] = [];
  const errors: string[] = [];

  const checks = PLATFORMS.map(async (p) => {
    const url = p.url.replace("{}", username);
    try {
      let res: Response;
      try { res = await directFetch(url, 6000); } catch { res = await safeFetch(url, 8000); }
      if (p.check === "json" && res.ok) {
        const j = await res.json();
        if (j && !j.error && !j.errors) found.push(p.name);
        else notFound.push(p.name);
      } else if (p.check === "jsonArray" && res.ok) {
        const j = await res.json();
        if (Array.isArray(j) && j.length > 0) found.push(p.name);
        else notFound.push(p.name);
      } else if (p.check === "jsonField:items" && res.ok) {
        const j = await res.json();
        if (j.items && j.items.length > 0) found.push(p.name);
        else notFound.push(p.name);
      } else if (p.check === "status") {
        if (res.ok || res.status === 200) found.push(p.name);
        else notFound.push(p.name);
      } else if (p.check === "text" && res.ok) {
        found.push(p.name);
      } else {
        notFound.push(p.name);
      }
    } catch {
      errors.push(p.name);
    }
  });

  await Promise.allSettled(checks);
  return {
    module: "Username Enumeration",
    icon: "👤",
    status: found.length > 0 ? "success" : "partial",
    data: { found, notFound, errors, totalPlatforms: PLATFORMS.length },
    elapsed: performance.now() - t0,
  };
}

// ─── Module: Email Intelligence ─────────────────────────────────────
async function moduleEmail(email: string): Promise<ModuleResult> {
  const t0 = performance.now();
  const data: Record<string, any> = { email };
  const [localPart, domain] = email.split("@");
  data.localPart = localPart;
  data.domain = domain;

  // Gravatar check
  try {
    const res = await directFetch(`https://en.gravatar.com/${encodeURIComponent(email)}.json`, 5000);
    if (res.ok) {
      const j = await res.json();
      data.gravatar = {
        displayName: j.entry?.[0]?.displayName,
        profileUrl: j.entry?.[0]?.profileUrl,
        photos: j.entry?.[0]?.photos?.length || 0,
        accounts: j.entry?.[0]?.accounts?.map((a: any) => ({ domain: a.domain, username: a.username })),
      };
    }
  } catch { /* no gravatar */ }

  // MX records via DNS
  try {
    const res = await directFetch(`https://dns.google/resolve?name=${domain}&type=MX`, 5000);
    if (res.ok) {
      const j = await res.json();
      data.mxRecords = (j.Answer || []).map((a: any) => a.data).filter(Boolean);
      const mxStr = data.mxRecords.join(" ").toLowerCase();
      if (mxStr.includes("google") || mxStr.includes("gmail")) data.emailProvider = "Google Workspace / Gmail";
      else if (mxStr.includes("outlook") || mxStr.includes("microsoft")) data.emailProvider = "Microsoft 365 / Outlook";
      else if (mxStr.includes("protonmail") || mxStr.includes("proton")) data.emailProvider = "ProtonMail";
      else if (mxStr.includes("zoho")) data.emailProvider = "Zoho Mail";
      else if (mxStr.includes("icloud") || mxStr.includes("apple")) data.emailProvider = "iCloud Mail";
      else data.emailProvider = "Custom / Self-hosted";
    }
  } catch { /* */ }

  // HaveIBeenPwned - public API (no key needed for breach name check)
  try {
    const res = await safeFetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=true`, 6000);
    if (res.ok) {
      const j = await res.json();
      data.breaches = j.map((b: any) => b.Name);
      data.breachCount = j.length;
    }
  } catch {
    data.breaches = [];
    data.breachNote = "API ncessite une cl premium. Utilisez la version Python avec --hibp-key.";
  }

  return {
    module: "Email Intelligence",
    icon: "📧",
    status: "success",
    data,
    elapsed: performance.now() - t0,
  };
}

// ─── Module: Domain Intelligence ────────────────────────────────────
async function moduleDomain(domain: string): Promise<ModuleResult> {
  const t0 = performance.now();
  const data: Record<string, any> = { domain };

  // DNS records
  const recordTypes = ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA"];
  const dnsResults: Record<string, string[]> = {};
  await Promise.allSettled(
    recordTypes.map(async (type) => {
      try {
        const res = await directFetch(`https://dns.google/resolve?name=${domain}&type=${type}`, 5000);
        if (res.ok) {
          const j = await res.json();
          dnsResults[type] = (j.Answer || []).map((a: any) => a.data).filter(Boolean);
        }
      } catch { /* */ }
    })
  );
  data.dns = dnsResults;

  // RDAP/WHOIS
  try {
    const tld = domain.split(".").pop() || "";
    const servers: Record<string, string> = { com: "https://rdap.verisign.com/com/v1", net: "https://rdap.verisign.com/net/v1", org: "https://rdap.org/org/v1" };
    const base = servers[tld] || "https://rdap.org";
    const res = await directFetch(`${base}/domain/${domain}`, 8000);
    if (res.ok) {
      const j = await res.json();
      const events: Record<string, string> = {};
      for (const ev of j.events || []) events[ev.eventAction] = ev.eventDate?.split("T")[0] || "";
      data.whois = {
        registrar: j.entities?.find((e: any) => e.roles?.includes("registrar"))?.vcardArray?.[1]?.find((v: any) => v[0] === "fn")?.[3] || "N/A",
        created: events.registration,
        expires: events.expiration,
        updated: events["last changed"],
        nameservers: (j.nameservers || []).map((ns: any) => ns.ldhName).filter(Boolean),
        status: j.status,
        dnssec: j.secureDNS?.delegationSigned ? "Signed" : "Unsigned",
      };
    }
  } catch { /* */ }

  // Certificate Transparency (subdomains)
  try {
    const res = await safeFetch(`https://crt.sh/?q=%.${domain}&output=json`, 10000);
    if (res.ok) {
      const j = await res.json();
      const subs = new Set<string>();
      j.forEach((e: any) => {
        (e.name_value || "").split("\n").forEach((n: string) => {
          const clean = n.trim().replace("*.", "");
          if (clean.endsWith(domain) && clean !== domain) subs.add(clean);
        });
      });
      data.subdomains = [...subs].sort().slice(0, 100);
    }
  } catch { /* */ }

  // Web Archive (Wayback Machine)
  try {
    const res = await directFetch(`https://archive.org/wayback/available?url=${domain}`, 5000);
    if (res.ok) {
      const j = await res.json();
      data.webArchive = j.archived_snapshots?.closest;
    }
  } catch { /* */ }

  return {
    module: "Domain Intelligence",
    icon: "🌐",
    status: Object.keys(data).length > 2 ? "success" : "partial",
    data,
    elapsed: performance.now() - t0,
  };
}

// ─── Module: IP Intelligence ────────────────────────────────────────
async function moduleIP(ip: string): Promise<ModuleResult> {
  const t0 = performance.now();
  const data: Record<string, any> = { ip };

  // ip-api.com (free, no key)
  try {
    const res = await directFetch(`http://ip-api.com/json/${ip}?fields=66846719`, 5000);
    if (res.ok) {
      const j = await res.json();
      data.geo = {
        country: j.country, countryCode: j.countryCode, region: j.regionName,
        city: j.city, zip: j.zip, lat: j.lat, lon: j.lon, timezone: j.timezone,
        isp: j.isp, org: j.org, as: j.as, asname: j.asname,
        mobile: j.mobile, proxy: j.proxy, hosting: j.hosting,
      };
    }
  } catch { /* */ }

  // ipinfo.io fallback
  try {
    const res = await directFetch(`https://ipinfo.io/${ip}/json`, 5000);
    if (res.ok) {
      const j = await res.json();
      if (!data.geo) {
        data.geo = { country: j.country, region: j.region, city: j.city, org: j.org, timezone: j.timezone };
      }
      data.ipinfo = { hostname: j.hostname, anycast: j.anycast };
    }
  } catch { /* */ }

  // Reverse DNS
  try {
    const res = await directFetch(`https://dns.google/resolve?name=${ip.split(".").reverse().join(".")}.in-addr.arpa&type=PTR`, 5000);
    if (res.ok) {
      const j = await res.json();
      data.reverseDns = (j.Answer || []).map((a: any) => a.data).filter(Boolean);
    }
  } catch { /* */ }

  // AbuseIPDB (without key we just note it)
  data.abuseCheck = "Utilisez la version Python avec --abuseipdb-key pour un rapport complet.";

  // Shodan (without key)
  try {
    const res = await directFetch(`https://internetdb.shodan.io/${ip}`, 5000);
    if (res.ok) {
      const j = await res.json();
      data.shodan = { ports: j.ports, hostnames: j.hostnames, cpes: j.cpes, vulns: j.vulns, tags: j.tags };
    }
  } catch { /* */ }

  return {
    module: "IP Intelligence",
    icon: "📡",
    status: data.geo ? "success" : "partial",
    data,
    elapsed: performance.now() - t0,
  };
}

// ─── Module: Phone Intelligence ─────────────────────────────────────
async function modulePhone(phone: string): Promise<ModuleResult> {
  const t0 = performance.now();
  const clean = phone.replace(/[\s\-().]/g, "");
  const data: Record<string, any> = { phone: clean };

  // Country code detection
  const CC: Record<string, string> = {
    "1": "US/CA", "7": "RU", "20": "EG", "27": "ZA", "30": "GR", "31": "NL", "32": "BE",
    "33": "FR", "34": "ES", "36": "HU", "39": "IT", "40": "RO", "41": "CH", "43": "AT",
    "44": "GB", "45": "DK", "46": "SE", "47": "NO", "48": "PL", "49": "DE", "51": "PE",
    "52": "MX", "53": "CU", "54": "AR", "55": "BR", "56": "CL", "57": "CO", "58": "VE",
    "60": "MY", "61": "AU", "62": "ID", "63": "PH", "64": "NZ", "65": "SG", "66": "TH",
    "81": "JP", "82": "KR", "84": "VN", "86": "CN", "90": "TR", "91": "IN", "92": "PK",
    "93": "AF", "94": "LK", "95": "MM", "212": "MA", "213": "DZ", "216": "TN", "218": "LY",
    "220": "GM", "221": "SN", "225": "CI", "234": "NG", "237": "CM", "243": "CD",
    "244": "AO", "254": "KE", "255": "TZ", "256": "UG", "260": "ZM", "263": "ZW",
    "351": "PT", "352": "LU", "353": "IE", "354": "IS", "358": "FI", "380": "UA",
    "852": "HK", "853": "MO", "855": "KH", "856": "LA", "880": "BD", "886": "TW",
    "960": "MV", "961": "LB", "962": "JO", "963": "SY", "964": "IQ", "965": "KW",
    "966": "SA", "967": "YE", "968": "OM", "971": "AE", "972": "IL", "973": "BH", "974": "QA",
    "975": "BT", "976": "MN", "977": "NP", "992": "TJ", "993": "TM", "994": "AZ",
    "995": "GE", "996": "KG", "998": "UZ",
  };

  const stripped = clean.replace(/^\+/, "");
  let countryDetected = "Unknown";
  for (const len of [3, 2, 1]) {
    const prefix = stripped.substring(0, len);
    if (CC[prefix]) { countryDetected = CC[prefix]; data.countryCode = `+${prefix}`; break; }
  }
  data.country = countryDetected;
  data.format = {
    e164: clean.startsWith("+") ? clean : `+${clean}`,
    national: clean,
  };
  data.lineType = "Utilisez la version Python pour la detection opérateur (numverify/Twilio)";

  return {
    module: "Phone Intelligence",
    icon: "📱",
    status: "success",
    data,
    elapsed: performance.now() - t0,
  };
}

// ─── Master Runner ──────────────────────────────────────────────────
async function runOsint(target: string): Promise<OsintReport> {
  const t0 = performance.now();
  const targetType = detectTargetType(target);
  const modules: ModuleResult[] = [];

  switch (targetType) {
    case "username":
      modules.push(await moduleUsername(target));
      // also check email pattern
      modules.push(await moduleEmail(`${target}@gmail.com`));
      break;
    case "email": {
      modules.push(await moduleEmail(target));
      const localPart = target.split("@")[0];
      modules.push(await moduleUsername(localPart));
      const domain = target.split("@")[1];
      modules.push(await moduleDomain(domain));
      break;
    }
    case "domain":
      modules.push(await moduleDomain(target));
      // resolve IP from domain
      try {
        const res = await directFetch(`https://dns.google/resolve?name=${target}&type=A`, 5000);
        if (res.ok) {
          const j = await res.json();
          const ip = j.Answer?.[0]?.data;
          if (ip) modules.push(await moduleIP(ip));
        }
      } catch { /* */ }
      break;
    case "ip":
      modules.push(await moduleIP(target));
      break;
    case "phone":
      modules.push(await modulePhone(target));
      break;
  }

  return {
    target,
    targetType,
    timestamp: new Date().toISOString(),
    modules,
    totalTime: performance.now() - t0,
  };
}

// ─── Collapsible Module Card ────────────────────────────────────────
function ModuleCard({ result }: { result: ModuleResult }) {
  const [expanded, setExpanded] = useState(true);
  const statusColors = { success: "#39ff14", partial: "#f59e0b", error: "#ef4444", pending: "#64748b" };
  const statusLabels = { success: "Complet", partial: "Partiel", error: "Erreur", pending: "En cours" };

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "rgba(17,24,39,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span style={{ fontSize: "1.2rem" }}>{result.icon}</span>
          <span className="text-[#e2e8f0]" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}>
            {result.module}
          </span>
          <span
            className="px-2 py-0.5 rounded-full"
            style={{ fontSize: "0.65rem", color: statusColors[result.status], background: `${statusColors[result.status]}15`, border: `1px solid ${statusColors[result.status]}30` }}
          >
            {statusLabels[result.status]}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[#4a5568]" style={{ fontSize: "0.72rem", fontFamily: "JetBrains Mono, monospace" }}>
            {result.elapsed.toFixed(0)}ms
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-[#4a5568]" /> : <ChevronDown className="w-4 h-4 text-[#4a5568]" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-white/[0.03]">
          <div className="pt-3 space-y-2">
            {renderData(result.data)}
          </div>
        </div>
      )}
    </div>
  );
}

function renderData(data: Record<string, any>, depth = 0): JSX.Element[] {
  const elements: JSX.Element[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;

    if (key === "found" && Array.isArray(value)) {
      elements.push(
        <div key={key} className="space-y-1">
          <span className="text-[#39ff14] block" style={{ fontSize: "0.78rem", fontFamily: "JetBrains Mono, monospace" }}>
            Trouvé sur {value.length} plateforme(s) :
          </span>
          <div className="flex flex-wrap gap-1.5">
            {value.map((p: string) => (
              <span key={p} className="inline-flex items-center gap-1 px-2 py-0.5 rounded" style={{ background: "rgba(57,255,20,0.08)", border: "1px solid rgba(57,255,20,0.15)", fontSize: "0.72rem", color: "#39ff14", fontFamily: "JetBrains Mono, monospace" }}>
                <CheckCircle className="w-3 h-3" />{p}
              </span>
            ))}
          </div>
        </div>
      );
    } else if (key === "notFound" && Array.isArray(value)) {
      elements.push(
        <details key={key} className="text-[#4a5568]">
          <summary className="cursor-pointer" style={{ fontSize: "0.72rem", fontFamily: "JetBrains Mono, monospace" }}>
            Non trouvé : {value.length} plateforme(s)
          </summary>
          <div className="flex flex-wrap gap-1 mt-1">
            {value.map((p: string) => (
              <span key={p} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: "rgba(100,116,139,0.06)", fontSize: "0.65rem" }}>
                <XCircle className="w-2.5 h-2.5" />{p}
              </span>
            ))}
          </div>
        </details>
      );
    } else if (key === "errors" && Array.isArray(value) && value.length > 0) {
      elements.push(
        <details key={key} className="text-[#f59e0b]">
          <summary className="cursor-pointer" style={{ fontSize: "0.72rem", fontFamily: "JetBrains Mono, monospace" }}>
            Timeout/Erreur : {value.length}
          </summary>
          <div className="flex flex-wrap gap-1 mt-1">
            {value.map((p: string) => (
              <span key={p} className="px-1.5 py-0.5 rounded text-[#f59e0b]" style={{ background: "rgba(245,158,11,0.06)", fontSize: "0.65rem" }}>{p}</span>
            ))}
          </div>
        </details>
      );
    } else if (key === "subdomains" && Array.isArray(value)) {
      elements.push(
        <details key={key}>
          <summary className="text-[#00d4ff] cursor-pointer" style={{ fontSize: "0.78rem", fontFamily: "JetBrains Mono, monospace" }}>
            {value.length} sous-domaine(s) trouvé(s)
          </summary>
          <div className="mt-1 max-h-40 overflow-y-auto space-y-0.5">
            {value.map((s: string) => (
              <p key={s} className="text-[#94a3b8]" style={{ fontSize: "0.7rem", fontFamily: "JetBrains Mono, monospace" }}>{s}</p>
            ))}
          </div>
        </details>
      );
    } else if (key === "breaches" && Array.isArray(value)) {
      elements.push(
        <div key={key} className="space-y-1">
          <span className={value.length > 0 ? "text-[#ef4444]" : "text-[#39ff14]"} style={{ fontSize: "0.78rem", fontFamily: "JetBrains Mono, monospace" }}>
            {value.length > 0 ? `⚠ ${value.length} breach(es) trouvée(s)` : "✓ Aucune breach trouvée"}
          </span>
          {value.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {value.map((b: string) => (
                <span key={b} className="px-2 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", fontSize: "0.7rem", color: "#ef4444", fontFamily: "JetBrains Mono, monospace" }}>{b}</span>
              ))}
            </div>
          )}
        </div>
      );
    } else if (key === "dns" && typeof value === "object") {
      elements.push(
        <div key={key} className="space-y-1.5">
          <span className="text-[#94a3b8] block" style={{ fontSize: "0.75rem" }}>DNS Records</span>
          {Object.entries(value).filter(([, v]) => Array.isArray(v) && (v as string[]).length > 0).map(([type, records]) => (
            <div key={type} className="flex gap-2 items-start">
              <span className="text-[#00d4ff] w-12 shrink-0" style={{ fontSize: "0.72rem", fontFamily: "JetBrains Mono, monospace" }}>{type}</span>
              <div className="flex flex-wrap gap-1">
                {(records as string[]).map((r: string, i: number) => (
                  <span key={`${r}-${i}`} className="text-[#e2e8f0]" style={{ fontSize: "0.7rem", fontFamily: "JetBrains Mono, monospace" }}>{r}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    } else if (typeof value === "object" && !Array.isArray(value)) {
      elements.push(
        <div key={key} className="space-y-1" style={{ marginLeft: depth * 12 }}>
          <span className="text-[#94a3b8] block" style={{ fontSize: "0.75rem" }}>{key}</span>
          {renderData(value, depth + 1)}
        </div>
      );
    } else if (Array.isArray(value)) {
      elements.push(
        <div key={key} className="flex gap-2 items-start" style={{ marginLeft: depth * 12 }}>
          <span className="text-[#64748b] w-28 shrink-0" style={{ fontSize: "0.72rem" }}>{key}</span>
          <span className="text-[#e2e8f0]" style={{ fontSize: "0.72rem", fontFamily: "JetBrains Mono, monospace" }}>{value.join(", ")}</span>
        </div>
      );
    } else {
      elements.push(
        <div key={key} className="flex gap-2 items-start" style={{ marginLeft: depth * 12 }}>
          <span className="text-[#64748b] w-28 shrink-0" style={{ fontSize: "0.72rem" }}>{key}</span>
          <span className="text-[#e2e8f0]" style={{ fontSize: "0.72rem", fontFamily: "JetBrains Mono, monospace" }}>{String(value)}</span>
        </div>
      );
    }
  }
  return elements;
}

// ─── Interactive Tool ───────────────────────────────────────────────
function DeductOScopeTool() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<OsintReport | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const run = useCallback(async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const result = await runOsint(input.trim());
      setReport(result);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [input]);

  const copyJson = useCallback(() => {
    if (report) {
      navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [report]);

  const typeLabels: Record<string, string> = {
    username: "👤 Username", email: "📧 Email", domain: "🌐 Domain", ip: "📡 IP", phone: "📱 Phone",
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="username, email@test.com, domaine.com, 8.8.8.8, +33612345678"
          className="flex-1 px-4 py-3 bg-[#0a0a0f] border border-[#1e293b] rounded-lg text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#ff6b35]/40"
          style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.9rem" }}
        />
        <button
          onClick={run}
          disabled={loading || !input.trim()}
          className="px-6 py-3 rounded-lg transition-all flex items-center gap-2 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #ff6b35, #e55d2b)", color: "#fff", fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          Investiguer
        </button>
      </div>

      {input.trim() && !loading && !report && (
        <div className="mb-4 text-[#64748b]" style={{ fontSize: "0.78rem", fontFamily: "JetBrains Mono, monospace" }}>
          Type détecté : {typeLabels[detectTargetType(input.trim())] || "Unknown"}
        </div>
      )}

      {error && (
        <div className="rounded-lg p-4 mb-4 flex items-start gap-3" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <AlertTriangle className="w-4 h-4 text-[#ef4444] flex-shrink-0 mt-0.5" />
          <p className="text-[#ef4444]" style={{ fontSize: "0.82rem" }}>{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: "rgba(17,24,39,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-[#1e293b]" />
                <div className="h-4 w-40 rounded bg-[#1e293b]" />
              </div>
            </div>
          ))}
          <p className="text-center text-[#64748b]" style={{ fontSize: "0.78rem" }}>
            Investigation en cours... Modules OSINT actifs.
          </p>
        </div>
      )}

      {report && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="rounded-xl p-4 flex flex-wrap items-center justify-between gap-3" style={{ background: "linear-gradient(135deg, rgba(255,107,53,0.06), rgba(255,107,53,0.02))", border: "1px solid rgba(255,107,53,0.15)" }}>
            <div className="flex items-center gap-3">
              <Fingerprint className="w-5 h-5 text-[#ff6b35]" />
              <div>
                <p className="text-[#e2e8f0]" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.85rem" }}>
                  {report.target}
                </p>
                <p className="text-[#64748b]" style={{ fontSize: "0.72rem" }}>
                  {typeLabels[report.targetType]} • {report.modules.length} module(s) • {(report.totalTime / 1000).toFixed(1)}s
                </p>
              </div>
            </div>
            <button
              onClick={copyJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", fontSize: "0.75rem" }}
            >
              {copied ? <CheckCircle className="w-3.5 h-3.5 text-[#39ff14]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copié !" : "JSON"}
            </button>
          </div>

          {/* Module results */}
          <div className="space-y-3">
            {report.modules.map((m, i) => (
              <ModuleCard key={`${m.module}-${i}`} result={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Python Script (UNIFIED MEGA OSINT) ─────────────────────────────
const PYTHON_SCRIPT = `#!/usr/bin/env python3
"""
DeductOScope - CyberGuard OSINT Framework
==========================================
Outil d'investigation OSINT multi-modules unifié.
Detection automatique du type de cible (username, email, domain, IP, phone).
40+ plateformes, DNS, WHOIS, breach check, geolocation, Shodan, Wayback, CT logs.

Usage:
    python deductoscope.py <cible>
    python deductoscope.py john_doe --modules username,email
    python deductoscope.py exemple.com --modules domain --deep
    python deductoscope.py 8.8.8.8 -o rapport.json -j
    python deductoscope.py john@mail.com --hibp-key YOUR_KEY
    python deductoscope.py +33612345678 --modules phone

Modules: username, email, domain, ip, phone, all
"""

import argparse, json, sys, os, re, socket, ssl, time, hashlib
import urllib.request, urllib.parse, urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from typing import Any, Optional

# ══════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ══════════════════════════════════════════════════════════════════════

VERSION = "3.0.0"
MAX_THREADS = 32
TIMEOUT = 10
USER_AGENT = "DeductOScope/3.0 (CyberGuard OSINT Framework)"

C = {
    "R": "\\033[91m", "G": "\\033[92m", "Y": "\\033[93m", "B": "\\033[94m",
    "M": "\\033[95m", "C": "\\033[96m", "W": "\\033[97m", "D": "\\033[90m",
    "BOLD": "\\033[1m", "DIM": "\\033[2m", "X": "\\033[0m",
    "BG_R": "\\033[41m", "BG_G": "\\033[42m", "BG_Y": "\\033[43m",
}

def banner():
    print(f"""
{C['C']}{C['BOLD']}╔═══════════════════════════════════════════════════��══════════╗
║          DeductOScope — CyberGuard OSINT Framework          ║
║          Multi-module Intelligence Gathering v{VERSION}          ║
╚══════════════════════════════════════════════════════════════╝{C['X']}
    """)

# ══════════════════════════════════════════════════════════════════════
# NETWORK LAYER — Article 1 : Zero point de défaillance unique
# ══════════════════════════════════════════════════════════════════════

PROXIES = [
    lambda u: f"https://api.allorigins.win/raw?url={{urllib.parse.quote(u, safe='')}}",
    lambda u: f"https://corsproxy.io/?{{urllib.parse.quote(u, safe='')}}",
]

def http_get(url, timeout=TIMEOUT, headers=None, retries=3, use_proxy=False):
    """Resilient HTTP GET with retry + proxy fallback (Article 1 & 3)"""
    h = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    if headers:
        h.update(headers)
    
    for attempt in range(retries):
        try:
            target = url if not use_proxy else PROXIES[attempt % len(PROXIES)](url)
            req = urllib.request.Request(target, headers=h)
            ctx = ssl.create_default_context()
            with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
                data = resp.read().decode("utf-8", errors="replace")
                return json.loads(data) if resp.headers.get("Content-Type", "").startswith("application/json") or data.strip().startswith(("{", "[")) else data
        except Exception as e:
            if attempt == retries - 1:
                if not use_proxy:
                    return http_get(url, timeout, headers, 2, use_proxy=True)
                return None
            time.sleep(min(1 * (attempt + 1), 3))
    return None

def http_head(url, timeout=6):
    """HTTP HEAD — returns status code"""
    try:
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        return e.code
    except:
        return -1

# ══════════════════════════════════════════════════════════════════════
# TARGET TYPE DETECTION
# ══════════════════════════════════════════════════════════════════════

def detect_type(target):
    t = target.strip()
    if re.match(r'^[\\w.+-]+@[\\w.-]+\\.\\w+$', t): return "email"
    if re.match(r'^(\\d{1,3}\\.){3}\\d{1,3}$', t): return "ip"
    if re.match(r'^[+]?\\d[\\d\\s-]{6,}$', t.replace(" ", "")): return "phone"
    if re.match(r'^[\\w.-]+\\.\\w{2,}$', t) and "." in t: return "domain"
    return "username"

# ══════════════════════════════════════════════════════════════════════
# MODULE 1: USERNAME ENUMERATION (40+ platforms)
# ══════════════════════════════════════════════════════════════════════

PLATFORMS = [
    ("GitHub", "https://api.github.com/users/{}", "json"),
    ("GitLab", "https://gitlab.com/api/v4/users?username={}", "jsonArray"),
    ("Reddit", "https://www.reddit.com/user/{}/about.json", "json"),
    ("HackerNews", "https://hacker-news.firebaseio.com/v0/user/{}.json", "json"),
    ("Keybase", "https://keybase.io/_/api/1.0/user/lookup.json?usernames={}", "json"),
    ("Dev.to", "https://dev.to/api/users/by_username?url={}", "json"),
    ("npm", "https://registry.npmjs.org/-/user/org.couchdb.user:{}", "json"),
    ("RubyGems", "https://rubygems.org/api/v1/profiles/{}.json", "json"),
    ("Gravatar", "https://en.gravatar.com/{}.json", "json"),
    ("Lichess", "https://lichess.org/api/user/{}", "json"),
    ("Chess.com", "https://api.chess.com/pub/player/{}", "json"),
    ("Docker Hub", "https://hub.docker.com/v2/users/{}/", "json"),
    ("Bitbucket", "https://bitbucket.org/api/2.0/users/{}", "json"),
    ("Codewars", "https://www.codewars.com/api/v1/users/{}", "json"),
    ("Codeforces", "https://codeforces.com/api/user.info?handles={}", "json"),
    ("PyPI", "https://pypi.org/user/{}/", "head"),
    ("Pastebin", "https://pastebin.com/u/{}", "head"),
    ("Replit", "https://replit.com/@{}", "head"),
    ("Spotify", "https://open.spotify.com/user/{}", "head"),
    ("SoundCloud", "https://soundcloud.com/{}", "head"),
    ("Twitch", "https://www.twitch.tv/{}", "head"),
    ("YouTube", "https://www.youtube.com/@{}", "head"),
    ("TikTok", "https://www.tiktok.com/@{}", "head"),
    ("Twitter/X", "https://twitter.com/{}", "head"),
    ("Instagram", "https://www.instagram.com/{}/", "head"),
    ("Pinterest", "https://www.pinterest.com/{}/", "head"),
    ("Flickr", "https://www.flickr.com/people/{}/", "head"),
    ("Imgur", "https://imgur.com/user/{}", "head"),
    ("BuyMeACoffee", "https://www.buymeacoffee.com/{}", "head"),
    ("Ko-fi", "https://ko-fi.com/{}", "head"),
    ("Linktree", "https://linktr.ee/{}", "head"),
    ("About.me", "https://about.me/{}", "head"),
    ("Trello", "https://trello.com/{}", "head"),
    ("Mastodon.social", "https://mastodon.social/@{}", "head"),
    ("LeetCode", "https://leetcode.com/{}/", "head"),
    ("Medium", "https://medium.com/@{}", "head"),
    ("HackTheBox", "https://www.hackthebox.com/home/users/profile/{}", "head"),
    ("TryHackMe", "https://tryhackme.com/p/{}", "head"),
    ("Telegram", "https://t.me/{}", "head"),
    ("VK", "https://vk.com/{}", "head"),
]

def check_platform(name, url_tpl, check_type, username):
    url = url_tpl.format(username)
    try:
        if check_type == "json":
            data = http_get(url, timeout=8)
            if data and isinstance(data, dict) and not data.get("error") and not data.get("errors"):
                return (name, True, url, data)
        elif check_type == "jsonArray":
            data = http_get(url, timeout=8)
            if data and isinstance(data, list) and len(data) > 0:
                return (name, True, url, data[0] if data else {})
        elif check_type == "head":
            status = http_head(url)
            if status == 200:
                return (name, True, url, {})
        return (name, False, url, None)
    except:
        return (name, False, url, None)

def module_username(username, threads=MAX_THREADS):
    print(f"\\n{C['C']}[MODULE] Username Enumeration — {len(PLATFORMS)} plateformes{C['X']}")
    found, not_found, errors = [], [], []
    t0 = time.time()
    
    with ThreadPoolExecutor(max_workers=threads) as pool:
        futures = {pool.submit(check_platform, n, u, c, username): n for n, u, c in PLATFORMS}
        for i, future in enumerate(as_completed(futures)):
            try:
                name, exists, url, data = future.result()
                if exists:
                    found.append({"platform": name, "url": url, "data": data})
                    print(f"  {C['G']}[+]{C['X']} {name}: {url}")
                else:
                    not_found.append(name)
            except:
                errors.append(futures[future])
            # Progress
            sys.stdout.write(f"\\r  {C['D']}[{i+1}/{len(PLATFORMS)}]{C['X']} ")
            sys.stdout.flush()
    
    elapsed = time.time() - t0
    print(f"\\n  {C['C']}Resultat:{C['X']} {C['G']}{len(found)}{C['X']} trouve(s) / {len(PLATFORMS)} testes | {elapsed:.1f}s")
    return {"module": "username", "found": found, "not_found": not_found, "errors": errors, "elapsed": elapsed}

# ══════════════════════════════════════════════════════════════════════
# MODULE 2: EMAIL INTELLIGENCE
# ══════════════════════════════════════════════════════════════════════

def module_email(email, hibp_key=None):
    print(f"\\n{C['C']}[MODULE] Email Intelligence{C['X']}")
    t0 = time.time()
    local, domain = email.split("@")
    result = {"module": "email", "email": email, "local": local, "domain": domain}
    
    # Gravatar
    try:
        import hashlib
        email_hash = hashlib.md5(email.lower().strip().encode()).hexdigest()
        g = http_get(f"https://en.gravatar.com/{email_hash}.json")
        if g and isinstance(g, dict) and "entry" in g:
            entry = g["entry"][0]
            result["gravatar"] = {
                "displayName": entry.get("displayName"),
                "profileUrl": entry.get("profileUrl"),
                "photos": len(entry.get("photos", [])),
                "accounts": [{"domain": a.get("domain"), "username": a.get("username")} for a in entry.get("accounts", [])],
            }
            print(f"  {C['G']}[+]{C['X']} Gravatar: {entry.get('displayName', 'N/A')}")
    except: pass
    
    # MX records
    try:
        mx = http_get(f"https://dns.google/resolve?name={domain}&type=MX")
        if mx and "Answer" in mx:
            records = [a["data"] for a in mx["Answer"]]
            result["mx"] = records
            mx_str = " ".join(records).lower()
            if "google" in mx_str or "gmail" in mx_str: result["provider"] = "Google Workspace / Gmail"
            elif "outlook" in mx_str or "microsoft" in mx_str: result["provider"] = "Microsoft 365"
            elif "proton" in mx_str: result["provider"] = "ProtonMail"
            elif "zoho" in mx_str: result["provider"] = "Zoho"
            else: result["provider"] = "Custom / Self-hosted"
            print(f"  {C['G']}[+]{C['X']} Provider: {result['provider']}")
    except: pass
    
    # HaveIBeenPwned
    if hibp_key:
        try:
            breaches = http_get(
                f"https://haveibeenpwned.com/api/v3/breachedaccount/{urllib.parse.quote(email)}?truncateResponse=true",
                headers={"hibp-api-key": hibp_key}
            )
            if breaches and isinstance(breaches, list):
                result["breaches"] = [b["Name"] for b in breaches]
                print(f"  {C['R']}[!]{C['X']} {len(breaches)} breach(es) trouvee(s): {', '.join(result['breaches'][:10])}")
            else:
                result["breaches"] = []
                print(f"  {C['G']}[+]{C['X']} Aucune breach trouvee")
        except: result["breaches_note"] = "Erreur API HIBP"
    else:
        result["breaches_note"] = "Ajoutez --hibp-key pour verifier les breaches"
    
    # Email validation (MX exists = deliverable)
    result["mx_valid"] = bool(result.get("mx"))
    
    elapsed = time.time() - t0
    result["elapsed"] = elapsed
    print(f"  {C['C']}Temps:{C['X']} {elapsed:.1f}s")
    return result

# ══════════════════════════════════════════════════════════════════════
# MODULE 3: DOMAIN INTELLIGENCE
# ══════════════════════════════════════════════════════════════════════

def module_domain(domain, deep=False):
    print(f"\\n{C['C']}[MODULE] Domain Intelligence{C['X']}")
    t0 = time.time()
    result = {"module": "domain", "domain": domain}
    
    # DNS Records
    dns_types = ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA", "CAA", "SRV"]
    dns = {}
    for rtype in dns_types:
        try:
            r = http_get(f"https://dns.google/resolve?name={domain}&type={rtype}")
            if r and "Answer" in r:
                dns[rtype] = [a["data"] for a in r["Answer"]]
                print(f"  {C['G']}[+]{C['X']} {rtype}: {', '.join(dns[rtype][:3])}")
        except: pass
    result["dns"] = dns
    
    # WHOIS/RDAP
    try:
        tld = domain.rsplit(".", 1)[-1]
        servers = {"com": "https://rdap.verisign.com/com/v1", "net": "https://rdap.verisign.com/net/v1", "org": "https://rdap.org/org/v1"}
        base = servers.get(tld, "https://rdap.org")
        rdap = http_get(f"{base}/domain/{domain}")
        if rdap and isinstance(rdap, dict):
            events = {ev["eventAction"]: ev["eventDate"].split("T")[0] for ev in rdap.get("events", [])}
            registrar = next((e for e in rdap.get("entities", []) if "registrar" in (e.get("roles") or [])), None)
            reg_name = "N/A"
            if registrar and registrar.get("vcardArray"):
                for v in registrar["vcardArray"][1]:
                    if v[0] == "fn": reg_name = v[3]
            result["whois"] = {
                "registrar": reg_name,
                "created": events.get("registration"),
                "expires": events.get("expiration"),
                "updated": events.get("last changed"),
                "nameservers": [ns.get("ldhName", "") for ns in rdap.get("nameservers", [])],
                "status": rdap.get("status", []),
                "dnssec": rdap.get("secureDNS", {}).get("delegationSigned", False),
            }
            print(f"  {C['G']}[+]{C['X']} Registrar: {reg_name}")
            print(f"  {C['G']}[+]{C['X']} Created: {events.get('registration', 'N/A')}")
    except: pass
    
    # Certificate Transparency (subdomains)
    try:
        ct = http_get(f"https://crt.sh/?q=%.{domain}&output=json", timeout=15)
        if ct and isinstance(ct, list):
            subs = set()
            for entry in ct:
                for name in (entry.get("name_value", "") or "").split("\\n"):
                    clean = name.strip().replace("*.", "")
                    if clean.endswith(domain) and clean != domain:
                        subs.add(clean)
            result["subdomains"] = sorted(subs)[:200]
            print(f"  {C['G']}[+]{C['X']} {len(result['subdomains'])} sous-domaine(s) via CT logs")
    except: pass
    
    # Wayback Machine
    try:
        wb = http_get(f"https://archive.org/wayback/available?url={domain}")
        if wb and wb.get("archived_snapshots", {}).get("closest"):
            snap = wb["archived_snapshots"]["closest"]
            result["wayback"] = {"url": snap.get("url"), "timestamp": snap.get("timestamp"), "status": snap.get("status")}
            print(f"  {C['G']}[+]{C['X']} Wayback: {snap.get('timestamp', 'N/A')}")
    except: pass
    
    # Technology detection (headers)
    if deep:
        try:
            req = urllib.request.Request(f"https://{domain}", headers={"User-Agent": USER_AGENT})
            ctx = ssl.create_default_context()
            with urllib.request.urlopen(req, timeout=8, context=ctx) as resp:
                headers_dict = dict(resp.headers)
                techs = []
                h_lower = {k.lower(): v for k, v in headers_dict.items()}
                if "x-powered-by" in h_lower: techs.append(h_lower["x-powered-by"])
                if "server" in h_lower: techs.append(h_lower["server"])
                if "x-aspnet-version" in h_lower: techs.append("ASP.NET")
                result["technologies"] = techs
                result["headers"] = headers_dict
                print(f"  {C['G']}[+]{C['X']} Technologies: {', '.join(techs) if techs else 'N/A'}")
        except: pass
    
    elapsed = time.time() - t0
    result["elapsed"] = elapsed
    print(f"  {C['C']}Temps:{C['X']} {elapsed:.1f}s")
    return result

# ══════════════════════════════════════════════════════════════════════
# MODULE 4: IP INTELLIGENCE
# ══════════════════════════════════════════════════════════════════════

def module_ip(ip):
    print(f"\\n{C['C']}[MODULE] IP Intelligence{C['X']}")
    t0 = time.time()
    result = {"module": "ip", "ip": ip}
    
    # Geolocation (ip-api.com)
    try:
        geo = http_get(f"http://ip-api.com/json/{ip}?fields=66846719")
        if geo:
            result["geo"] = {
                "country": geo.get("country"), "countryCode": geo.get("countryCode"),
                "region": geo.get("regionName"), "city": geo.get("city"),
                "zip": geo.get("zip"), "lat": geo.get("lat"), "lon": geo.get("lon"),
                "timezone": geo.get("timezone"), "isp": geo.get("isp"),
                "org": geo.get("org"), "as": geo.get("as"), "asname": geo.get("asname"),
                "mobile": geo.get("mobile"), "proxy": geo.get("proxy"), "hosting": geo.get("hosting"),
            }
            print(f"  {C['G']}[+]{C['X']} Location: {geo.get('city')}, {geo.get('country')}")
            print(f"  {C['G']}[+]{C['X']} ISP: {geo.get('isp')}")
            print(f"  {C['G']}[+]{C['X']} ASN: {geo.get('as')}")
            if geo.get("proxy"): print(f"  {C['Y']}[!]{C['X']} VPN/Proxy detecte")
            if geo.get("hosting"): print(f"  {C['Y']}[!]{C['X']} Hebergeur / Datacenter")
    except: pass
    
    # Reverse DNS
    try:
        rev = ip.split(".")
        rev.reverse()
        ptr = http_get(f"https://dns.google/resolve?name={'.'.join(rev)}.in-addr.arpa&type=PTR")
        if ptr and "Answer" in ptr:
            result["reverse_dns"] = [a["data"] for a in ptr["Answer"]]
            print(f"  {C['G']}[+]{C['X']} rDNS: {', '.join(result['reverse_dns'])}")
    except: pass
    
    # Shodan InternetDB (free, no key)
    try:
        shodan = http_get(f"https://internetdb.shodan.io/{ip}")
        if shodan and isinstance(shodan, dict) and "ip" in shodan:
            result["shodan"] = {
                "ports": shodan.get("ports", []),
                "hostnames": shodan.get("hostnames", []),
                "cpes": shodan.get("cpes", []),
                "vulns": shodan.get("vulns", []),
                "tags": shodan.get("tags", []),
            }
            if shodan.get("ports"): print(f"  {C['G']}[+]{C['X']} Ports: {', '.join(map(str, shodan['ports'][:20]))}")
            if shodan.get("vulns"): print(f"  {C['R']}[!]{C['X']} CVEs: {', '.join(shodan['vulns'][:10])}")
            if shodan.get("hostnames"): print(f"  {C['G']}[+]{C['X']} Hostnames: {', '.join(shodan['hostnames'][:5])}")
    except: pass
    
    # ipinfo.io
    try:
        info = http_get(f"https://ipinfo.io/{ip}/json")
        if info and isinstance(info, dict):
            result["ipinfo"] = {"hostname": info.get("hostname"), "anycast": info.get("anycast")}
    except: pass
    
    elapsed = time.time() - t0
    result["elapsed"] = elapsed
    print(f"  {C['C']}Temps:{C['X']} {elapsed:.1f}s")
    return result

# ══════════════════════════════════════════════════════════════════════
# MODULE 5: PHONE INTELLIGENCE
# ══════════════════════════════════════════════════════════════════════

COUNTRY_CODES = {
    "1": "US/CA", "7": "RU", "20": "EG", "27": "ZA", "30": "GR", "31": "NL",
    "32": "BE", "33": "FR", "34": "ES", "36": "HU", "39": "IT", "40": "RO",
    "41": "CH", "43": "AT", "44": "GB", "45": "DK", "46": "SE", "47": "NO",
    "48": "PL", "49": "DE", "51": "PE", "52": "MX", "54": "AR", "55": "BR",
    "56": "CL", "57": "CO", "60": "MY", "61": "AU", "62": "ID", "63": "PH",
    "64": "NZ", "65": "SG", "66": "TH", "81": "JP", "82": "KR", "84": "VN",
    "86": "CN", "90": "TR", "91": "IN", "92": "PK", "212": "MA", "213": "DZ",
    "216": "TN", "234": "NG", "254": "KE", "351": "PT", "353": "IE",
    "354": "IS", "358": "FI", "380": "UA", "852": "HK", "886": "TW",
    "961": "LB", "962": "JO", "966": "SA", "971": "AE", "972": "IL", "974": "QA",
}

def module_phone(phone):
    print(f"\\n{C['C']}[MODULE] Phone Intelligence{C['X']}")
    t0 = time.time()
    clean = re.sub(r"[\\s\\-().]+", "", phone)
    stripped = clean.lstrip("+")
    result = {"module": "phone", "phone": clean, "e164": f"+{stripped}" if not clean.startswith("+") else clean}
    
    for length in [3, 2, 1]:
        prefix = stripped[:length]
        if prefix in COUNTRY_CODES:
            result["country"] = COUNTRY_CODES[prefix]
            result["country_code"] = f"+{prefix}"
            result["national"] = stripped[length:]
            print(f"  {C['G']}[+]{C['X']} Pays: {COUNTRY_CODES[prefix]} (+{prefix})")
            break
    
    result["line_note"] = "Utilisez numverify.com ou Twilio pour la detection operateur."
    
    elapsed = time.time() - t0
    result["elapsed"] = elapsed
    return result

# ══════════════════════════════════════════════════════════════════════
# MASTER ORCHESTRATOR
# ══════════════════════════════════════════════════════════════════════

def run_investigation(target, modules=None, deep=False, hibp_key=None, threads=MAX_THREADS):
    target_type = detect_type(target)
    
    print(f"  {C['BOLD']}Cible:{C['X']}  {C['W']}{target}{C['X']}")
    print(f"  {C['BOLD']}Type:{C['X']}   {target_type}")
    print(f"  {C['BOLD']}Date:{C['X']}   {datetime.now().isoformat()}")
    print(f"  {C['BOLD']}Threads:{C['X']} {threads}")
    
    if modules:
        active = [m.strip() for m in modules.split(",")]
    else:
        # Auto-select based on target type
        type_modules = {
            "username": ["username", "email"],
            "email": ["email", "username", "domain"],
            "domain": ["domain", "ip"],
            "ip": ["ip"],
            "phone": ["phone"],
        }
        active = type_modules.get(target_type, ["username"])
    
    print(f"  {C['BOLD']}Modules:{C['X']} {', '.join(active)}")
    print(f"  {'─' * 58}")
    
    results = {"target": target, "type": target_type, "timestamp": datetime.now().isoformat(), "modules": []}
    t_total = time.time()
    
    for mod in active:
        if mod == "username":
            username = target.split("@")[0] if target_type == "email" else target
            results["modules"].append(module_username(username, threads))
        elif mod == "email":
            email = target if target_type == "email" else f"{target}@gmail.com"
            results["modules"].append(module_email(email, hibp_key))
        elif mod == "domain":
            domain = target.split("@")[1] if target_type == "email" else target
            results["modules"].append(module_domain(domain, deep))
        elif mod == "ip":
            if target_type == "domain":
                # Resolve domain to IP first
                try:
                    dns = http_get(f"https://dns.google/resolve?name={target}&type=A")
                    if dns and "Answer" in dns:
                        ip = dns["Answer"][0]["data"]
                        results["modules"].append(module_ip(ip))
                except: pass
            else:
                results["modules"].append(module_ip(target))
        elif mod == "phone":
            results["modules"].append(module_phone(target))
    
    results["total_time"] = time.time() - t_total
    
    print(f"\\n{'═' * 60}")
    print(f"  {C['C']}{C['BOLD']}Investigation terminee{C['X']}")
    print(f"  Modules: {len(results['modules'])} | Temps total: {results['total_time']:.1f}s")
    print(f"{'═' * 60}")
    
    return results

# ══════════════════════════════════════════════════════════════════════
# CLI ENTRYPOINT
# ══════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="DeductOScope - CyberGuard OSINT Framework",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples:
  python deductoscope.py johndoe
  python deductoscope.py johndoe --modules username,email
  python deductoscope.py exemple.com --modules domain --deep
  python deductoscope.py 8.8.8.8 -o rapport.json
  python deductoscope.py john@mail.com --hibp-key YOUR_KEY
  python deductoscope.py +33612345678 --modules phone
        """
    )
    parser.add_argument("target", help="Cible (username, email, domain, IP, phone)")
    parser.add_argument("--modules", "-m", help="Modules: username,email,domain,ip,phone (defaut: auto)")
    parser.add_argument("--deep", action="store_true", help="Analyse approfondie (headers, tech detection)")
    parser.add_argument("--hibp-key", help="Cle API HaveIBeenPwned")
    parser.add_argument("--threads", "-t", type=int, default=MAX_THREADS, help=f"Threads (defaut: {MAX_THREADS})")
    parser.add_argument("--output", "-o", help="Export JSON")
    parser.add_argument("--json", "-j", action="store_true", help="Sortie JSON brute")
    args = parser.parse_args()
    
    if not args.json:
        banner()
    
    results = run_investigation(args.target, args.modules, args.deep, args.hibp_key, args.threads)
    
    if args.json:
        print(json.dumps(results, indent=2, default=str, ensure_ascii=False))
    
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, default=str, ensure_ascii=False)
        print(f"\\n  {C['G']}[+]{C['X']} Rapport exporte: {args.output}")

if __name__ == "__main__":
    main()
`;

const README = `# DeductOScope - CyberGuard OSINT Framework
Outil d'investigation OSINT multi-modules unifié. Détection automatique du type de cible.

## Modules
- **Username Enumeration** : 40+ plateformes (GitHub, Reddit, Twitter, Instagram, etc.)
- **Email Intelligence** : Gravatar, MX, provider, breach check (HIBP)
- **Domain Intelligence** : DNS (9 types), WHOIS/RDAP, CT subdomains, Wayback, tech detection
- **IP Intelligence** : Geolocation, rDNS, Shodan InternetDB, ASN, VPN/proxy detection
- **Phone Intelligence** : Country code, format E.164, carrier detection

## Utilisation
\`\`\`bash
python deductoscope.py johndoe
python deductoscope.py john@mail.com --hibp-key YOUR_KEY
python deductoscope.py exemple.com --deep
python deductoscope.py 8.8.8.8 -o rapport.json
python deductoscope.py +33612345678
\`\`\`

## Aucune API requise (optionnel : HaveIBeenPwned pour les breaches)
Cree par CyberGuard — https://cyber-guard-dusky.vercel.app
`;

const GUI_CONFIG: GuiConfig = {
  title: "DeductOScope OSINT",
  inputType: "url",
  inputPlaceholder: "username, email, domain, IP, or phone",
  buttonText: "Investiguer",
  importLine: "from deductoscope import run_investigation",
  processCode: `            return run_investigation(inp)`,
};

export function DeductOScopePage() {
  return (
    <ToolPageLayout
      title="DeductO" subtitle="Scope"
      description="Framework OSINT multi-modules unifié. Détection automatique du type de cible (username, email, domain, IP, phone). 40+ plateformes, DNS 9 types, WHOIS/RDAP, CT logs, Shodan, Wayback Machine, breach check."
      toolSlug="deductoscope"
      icon={Eye}
      color="#ff6b35"
      hubAnchor="deductoscope"
      features={[
        { icon: User, title: "Username Enumeration", desc: "40+ plateformes testées en parallèle : GitHub, Reddit, Twitter, Instagram, TikTok, Medium, Docker Hub, etc." },
        { icon: Mail, title: "Email Intelligence", desc: "Gravatar, provider MX, validation, breach check HaveIBeenPwned, comptes liés." },
        { icon: Globe, title: "Domain Intelligence", desc: "DNS 9 types, WHOIS/RDAP, sous-domaines CT logs, Wayback Machine, tech detection." },
        { icon: MapPin, title: "IP Intelligence", desc: "Géolocation, ISP, ASN, reverse DNS, Shodan InternetDB (ports, CVEs), VPN/proxy detection." },
        { icon: Phone, title: "Phone Intelligence", desc: "120+ country codes, format E.164, détection opérateur via numverify/Twilio." },
        { icon: Fingerprint, title: "Auto-Detection", desc: "Détection automatique du type de cible. Modules sélectionnés intelligemment." },
        { icon: Database, title: "Multi-Threading", desc: "32 threads par défaut. Toutes les plateformes testées simultanément." },
        { icon: FileText, title: "Export JSON", desc: "Rapport complet structuré JSON pour intégration pipeline CI/CD ou archivage." },
      ]}
      requirements={["Python 3.7+ (aucune dépendance externe)", "Optionnel : clé API HaveIBeenPwned pour breach check"]}
      pythonScript={PYTHON_SCRIPT}
      readmeContent={README}
      guiConfig={GUI_CONFIG}
    >
      <DeductOScopeTool />
    </ToolPageLayout>
  );
}
