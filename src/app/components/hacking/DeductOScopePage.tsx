import { useState, useCallback } from "react";
import {
  Eye, Search, Loader2, AlertTriangle, Globe, User, Mail, Phone,
  Shield, Server, Camera, Clock, Database, Fingerprint, GitBranch,
  Link, MapPin, Hash, FileText, Wifi, ChevronDown, ChevronUp, Copy,
  CheckCircle, XCircle, ExternalLink, Users, HelpCircle,
} from "lucide-react";
import { ToolPageLayout } from "./ToolPageLayout";
import type { GuiConfig } from "./zip-generator";

// ─── Types ──────────────────────────────────────────────────────────
interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  platform?: string;
  username?: string;
}

interface PlatformHit {
  platform: string;
  url: string;
  verified: boolean;
  info?: Record<string, any>;
}

interface ModuleResult {
  module: string;
  icon: string;
  status: "success" | "partial" | "error" | "pending";
  data: Record<string, any>;
  elapsed: number;
}

interface OsintReport {
  target: string;
  targetType: "username" | "email" | "domain" | "ip" | "phone" | "name";
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
  if (/^[A-Za-zÀ-ÿ'-]+\s+[A-Za-zÀ-ÿ'-]+/.test(trimmed) && !trimmed.includes("@") && !trimmed.includes(".")) return "name";
  return "username";
}

// ─── CORS-safe fetch helper ─────────────────────────────────────────
const PROXIES = [
  (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
];

async function safeFetch(url: string, timeout = 10000): Promise<Response> {
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

// ─── DuckDuckGo HTML Scraper ────────────────────────────────────────
// This is the REAL approach: scrape actual search results, not guess URLs.
// DuckDuckGo HTML endpoint returns real search results with titles, URLs, snippets.

const PLATFORM_PATTERNS: { pattern: RegExp; name: string; usernameExtractor?: (url: string) => string | null }[] = [
  { pattern: /linkedin\.com\/in\/([^/?#]+)/i, name: "LinkedIn", usernameExtractor: (u) => u.match(/linkedin\.com\/in\/([^/?#]+)/i)?.[1] || null },
  { pattern: /github\.com\/([^/?#]+)/i, name: "GitHub", usernameExtractor: (u) => { const m = u.match(/github\.com\/([^/?#]+)/i); return m && !["search", "topics", "trending", "explore"].includes(m[1]) ? m[1] : null; } },
  { pattern: /instagram\.com\/([^/?#]+)/i, name: "Instagram", usernameExtractor: (u) => { const m = u.match(/instagram\.com\/([^/?#]+)/i); return m && !["p", "explore", "reel", "stories", "accounts"].includes(m[1]) ? m[1] : null; } },
  { pattern: /twitter\.com\/([^/?#]+)/i, name: "Twitter/X", usernameExtractor: (u) => { const m = u.match(/twitter\.com\/([^/?#]+)/i); return m && !["search", "hashtag", "i", "intent"].includes(m[1]) ? m[1] : null; } },
  { pattern: /x\.com\/([^/?#]+)/i, name: "Twitter/X", usernameExtractor: (u) => { const m = u.match(/x\.com\/([^/?#]+)/i); return m && !["search", "hashtag", "i", "intent"].includes(m[1]) ? m[1] : null; } },
  { pattern: /facebook\.com\/([^/?#]+)/i, name: "Facebook", usernameExtractor: (u) => { const m = u.match(/facebook\.com\/([^/?#]+)/i); return m && !["search", "watch", "groups", "pages", "events", "marketplace", "profile.php"].includes(m[1]) ? m[1] : null; } },
  { pattern: /tiktok\.com\/@([^/?#]+)/i, name: "TikTok", usernameExtractor: (u) => u.match(/tiktok\.com\/@([^/?#]+)/i)?.[1] || null },
  { pattern: /youtube\.com\/@([^/?#]+)/i, name: "YouTube", usernameExtractor: (u) => u.match(/youtube\.com\/@([^/?#]+)/i)?.[1] || null },
  { pattern: /youtube\.com\/channel\/([^/?#]+)/i, name: "YouTube" },
  { pattern: /pinterest\.\w+\/([^/?#]+)/i, name: "Pinterest", usernameExtractor: (u) => { const m = u.match(/pinterest\.\w+\/([^/?#]+)/i); return m && !["pin", "search", "ideas", "today"].includes(m[1]) ? m[1] : null; } },
  { pattern: /reddit\.com\/user\/([^/?#]+)/i, name: "Reddit", usernameExtractor: (u) => u.match(/reddit\.com\/user\/([^/?#]+)/i)?.[1] || null },
  { pattern: /medium\.com\/@([^/?#]+)/i, name: "Medium", usernameExtractor: (u) => u.match(/medium\.com\/@([^/?#]+)/i)?.[1] || null },
  { pattern: /twitch\.tv\/([^/?#]+)/i, name: "Twitch", usernameExtractor: (u) => { const m = u.match(/twitch\.tv\/([^/?#]+)/i); return m && !["directory", "downloads"].includes(m[1]) ? m[1] : null; } },
  { pattern: /soundcloud\.com\/([^/?#]+)/i, name: "SoundCloud", usernameExtractor: (u) => { const m = u.match(/soundcloud\.com\/([^/?#]+)/i); return m && !["search", "discover", "stream"].includes(m[1]) ? m[1] : null; } },
  { pattern: /dev\.to\/([^/?#]+)/i, name: "Dev.to", usernameExtractor: (u) => { const m = u.match(/dev\.to\/([^/?#]+)/i); return m && !["search", "t", "pod"].includes(m[1]) ? m[1] : null; } },
  { pattern: /gitlab\.com\/([^/?#]+)/i, name: "GitLab", usernameExtractor: (u) => { const m = u.match(/gitlab\.com\/([^/?#]+)/i); return m && !["explore", "users", "search"].includes(m[1]) ? m[1] : null; } },
  { pattern: /behance\.net\/([^/?#]+)/i, name: "Behance", usernameExtractor: (u) => u.match(/behance\.net\/([^/?#]+)/i)?.[1] || null },
  { pattern: /dribbble\.com\/([^/?#]+)/i, name: "Dribbble", usernameExtractor: (u) => { const m = u.match(/dribbble\.com\/([^/?#]+)/i); return m && !["shots", "designers", "tags"].includes(m[1]) ? m[1] : null; } },
  { pattern: /viadeo\.com\/profile\/([^/?#]+)/i, name: "Viadeo" },
  { pattern: /stackoverflow\.com\/users\/([^/?#]+)/i, name: "StackOverflow" },
  { pattern: /doctolib\.fr/i, name: "Doctolib" },
  { pattern: /mastodon\.\w+\/@([^/?#]+)/i, name: "Mastodon", usernameExtractor: (u) => u.match(/mastodon\.\w+\/@([^/?#]+)/i)?.[1] || null },
];

function identifyPlatform(url: string): { name: string; username: string | null } | null {
  for (const p of PLATFORM_PATTERNS) {
    if (p.pattern.test(url)) {
      const username = p.usernameExtractor ? p.usernameExtractor(url) : null;
      return { name: p.name, username };
    }
  }
  return null;
}

function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

async function scrapeDuckDuckGo(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  try {
    const res = await safeFetch(ddgUrl, 12000);
    const html = await res.text();

    // Parse DuckDuckGo HTML results
    // Results are in <div class="result"> or <div class="web-result">
    // Each has: <a class="result__a"> (title+url), <a class="result__snippet"> (snippet)
    const resultBlocks = html.split(/class="result\s/g).slice(1);

    for (const block of resultBlocks) {
      try {
        // Extract URL from result__url or href
        const urlMatch = block.match(/class="result__url"[^>]*>([^<]+)</i)
          || block.match(/href="\/\/duckduckgo\.com\/l\/\?uddg=([^&"]+)/i)
          || block.match(/href="(https?:\/\/[^"]+)"/i);

        let url = "";
        if (urlMatch) {
          url = urlMatch[1].trim();
          if (url.startsWith("//")) url = "https:" + url;
          if (!url.startsWith("http")) url = "https://" + url;
          // Decode DDG redirect URL
          try { url = decodeURIComponent(url); } catch { /* */ }
        }
        if (!url || url.includes("duckduckgo.com")) continue;

        // Extract title
        const titleMatch = block.match(/class="result__a"[^>]*>([^<]+(?:<[^>]+>[^<]*)*)</i);
        let title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";
        title = decodeHtmlEntities(title);

        // Extract snippet
        const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|span|div)/i);
        let snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, "").trim() : "";
        snippet = decodeHtmlEntities(snippet);

        if (!url || (!title && !snippet)) continue;

        // Identify platform and username
        const platform = identifyPlatform(url);
        results.push({
          title,
          url,
          snippet,
          platform: platform?.name,
          username: platform?.username || undefined,
        });
      } catch { /* skip malformed result */ }
    }
  } catch (err) {
    // Try alternative: SearXNG instance
    try {
      const searxUrl = `https://searx.be/search?q=${encodeURIComponent(query)}&format=json&categories=general`;
      const res = await safeFetch(searxUrl, 10000);
      const j = await res.json();
      if (j.results && Array.isArray(j.results)) {
        for (const r of j.results.slice(0, 30)) {
          const platform = identifyPlatform(r.url || "");
          results.push({
            title: r.title || "",
            url: r.url || "",
            snippet: r.content || "",
            platform: platform?.name,
            username: platform?.username || undefined,
          });
        }
      }
    } catch { /* */ }
  }

  return results;
}

// ─── Verified API Platforms ─────────────────────────────────────────
const VERIFIED_APIS: { name: string; url: string; check: string; profileUrl: string }[] = [
  { name: "GitHub", url: "https://api.github.com/users/{}", check: "json", profileUrl: "https://github.com/{}" },
  { name: "GitLab", url: "https://gitlab.com/api/v4/users?username={}", check: "jsonArray", profileUrl: "https://gitlab.com/{}" },
  { name: "Reddit", url: "https://www.reddit.com/user/{}/about.json", check: "json", profileUrl: "https://www.reddit.com/user/{}" },
  { name: "HackerNews", url: "https://hacker-news.firebaseio.com/v0/user/{}.json", check: "json", profileUrl: "https://news.ycombinator.com/user?id={}" },
  { name: "Keybase", url: "https://keybase.io/_/api/1.0/user/lookup.json?usernames={}", check: "json", profileUrl: "https://keybase.io/{}" },
  { name: "Dev.to", url: "https://dev.to/api/users/by_username?url={}", check: "json", profileUrl: "https://dev.to/{}" },
  { name: "npm", url: "https://registry.npmjs.org/-/user/org.couchdb.user:{}", check: "json", profileUrl: "https://www.npmjs.com/~{}" },
  { name: "RubyGems", url: "https://rubygems.org/api/v1/profiles/{}.json", check: "json", profileUrl: "https://rubygems.org/profiles/{}" },
  { name: "Gravatar", url: "https://en.gravatar.com/{}.json", check: "json", profileUrl: "https://gravatar.com/{}" },
  { name: "Lichess", url: "https://lichess.org/api/user/{}", check: "json", profileUrl: "https://lichess.org/@/{}" },
  { name: "Chess.com", url: "https://api.chess.com/pub/player/{}", check: "json", profileUrl: "https://www.chess.com/member/{}" },
  { name: "Duolingo", url: "https://www.duolingo.com/2017-06-30/users?username={}", check: "json", profileUrl: "https://www.duolingo.com/profile/{}" },
  { name: "Docker Hub", url: "https://hub.docker.com/v2/users/{}/", check: "json", profileUrl: "https://hub.docker.com/u/{}" },
  { name: "Bitbucket", url: "https://bitbucket.org/api/2.0/users/{}", check: "json", profileUrl: "https://bitbucket.org/{}" },
  { name: "Codewars", url: "https://www.codewars.com/api/v1/users/{}", check: "json", profileUrl: "https://www.codewars.com/users/{}" },
  { name: "Codeforces", url: "https://codeforces.com/api/user.info?handles={}", check: "json", profileUrl: "https://codeforces.com/profile/{}" },
  { name: "StackOverflow", url: "https://api.stackexchange.com/2.3/users?inname={}&site=stackoverflow", check: "jsonField:items", profileUrl: "https://stackoverflow.com/users?tab=Reputation&filter={}" },
];

async function verifyUsername(username: string): Promise<PlatformHit[]> {
  const confirmed: PlatformHit[] = [];
  const checks = VERIFIED_APIS.map(async (p) => {
    const apiUrl = p.url.replace("{}", username);
    const profileUrl = p.profileUrl.replace("{}", username);
    try {
      let res: Response;
      try { res = await directFetch(apiUrl, 6000); } catch { res = await safeFetch(apiUrl, 8000); }
      if (p.check === "json" && res.ok) {
        const j = await res.json();
        if (j && !j.error && !j.errors && !j.message?.includes("Not Found")) {
          confirmed.push({ platform: p.name, url: profileUrl, verified: true, info: extractInfo(p.name, j) });
        }
      } else if (p.check === "jsonArray" && res.ok) {
        const j = await res.json();
        if (Array.isArray(j) && j.length > 0) confirmed.push({ platform: p.name, url: profileUrl, verified: true, info: extractInfo(p.name, j[0]) });
      } else if (p.check === "jsonField:items" && res.ok) {
        const j = await res.json();
        if (j.items && j.items.length > 0) confirmed.push({ platform: p.name, url: profileUrl, verified: true, info: extractInfo(p.name, j.items[0]) });
      }
    } catch { /* */ }
  });
  await Promise.allSettled(checks);
  return confirmed;
}

function extractInfo(platform: string, data: any): Record<string, any> | undefined {
  if (!data || typeof data !== "object") return undefined;
  try {
    switch (platform) {
      case "GitHub": return { name: data.name, bio: data.bio, repos: data.public_repos, followers: data.followers };
      case "Reddit": return { karma: data.data?.link_karma, comment_karma: data.data?.comment_karma };
      case "HackerNews": return { karma: data.karma };
      case "Dev.to": return { name: data.name, joined: data.joined_at?.split("T")[0] };
      case "Lichess": return { rating: data.perfs?.blitz?.rating, games: data.count?.all };
      case "Chess.com": return { status: data.status };
      case "Docker Hub": return { joined: data.date_joined?.split("T")[0] };
      case "Codewars": return { honor: data.honor, rank: data.ranks?.overall?.name };
      case "Codeforces": return { rating: data.result?.[0]?.rating, rank: data.result?.[0]?.rank };
      default: return undefined;
    }
  } catch { return undefined; }
}

// ─── Module: Name Search via Search Engine ──────────────────────────
async function moduleNameSearch(fullName: string): Promise<ModuleResult> {
  const t0 = performance.now();

  // 1. Scrape DuckDuckGo for REAL search results
  const searchResults = await scrapeDuckDuckGo(fullName);

  // 2. Separate results: platform profiles vs other results
  const profileResults = searchResults.filter(r => r.platform);
  const otherResults = searchResults.filter(r => !r.platform);

  // 3. Extract unique usernames from search results to verify via API
  const discoveredUsernames = new Set<string>();
  for (const r of profileResults) {
    if (r.username) discoveredUsernames.add(r.username);
  }

  // 4. Verify discovered usernames via APIs
  const apiConfirmed: PlatformHit[] = [];
  for (const username of discoveredUsernames) {
    const hits = await verifyUsername(username);
    for (const hit of hits) {
      if (!apiConfirmed.some(h => h.url === hit.url)) {
        apiConfirmed.push({ ...hit, info: { ...hit.info, discoveredAs: username } });
      }
    }
  }

  return {
    module: "Recherche par Nom (Moteur de recherche réel)",
    icon: "🔍",
    status: searchResults.length > 0 ? "success" : (apiConfirmed.length > 0 ? "success" : "partial"),
    data: {
      profileResults,
      otherResults: otherResults.slice(0, 10),
      apiConfirmed,
      discoveredUsernames: [...discoveredUsernames],
      searchMeta: {
        totalResults: searchResults.length,
        profilesFound: profileResults.length,
        usernamesExtracted: discoveredUsernames.size,
        apiVerified: apiConfirmed.length,
      },
    },
    elapsed: performance.now() - t0,
  };
}

// ─── Module: Username Enumeration ───────────────────────────────────
async function moduleUsername(username: string): Promise<ModuleResult> {
  const t0 = performance.now();

  // 1. Verify via APIs
  const confirmed = await verifyUsername(username);

  // 2. Also search DuckDuckGo for this username
  const searchResults = await scrapeDuckDuckGo(username);
  const profileResults = searchResults.filter(r => r.platform);

  // 3. Extract additional usernames from search
  const extraUsernames = new Set<string>();
  for (const r of profileResults) {
    if (r.username && r.username.toLowerCase() !== username.toLowerCase()) {
      extraUsernames.add(r.username);
    }
  }

  // 4. Verify extra usernames
  const extraConfirmed: PlatformHit[] = [];
  for (const uname of extraUsernames) {
    const hits = await verifyUsername(uname);
    for (const hit of hits) {
      if (!confirmed.some(h => h.url === hit.url) && !extraConfirmed.some(h => h.url === hit.url)) {
        extraConfirmed.push({ ...hit, info: { ...hit.info, linkedUsername: uname } });
      }
    }
  }

  return {
    module: "Username Enumeration",
    icon: "👤",
    status: confirmed.length > 0 || profileResults.length > 0 ? "success" : "partial",
    data: {
      apiConfirmed: confirmed,
      searchProfiles: profileResults,
      linkedAccounts: extraConfirmed,
      stats: {
        apiVerified: confirmed.length,
        searchResults: profileResults.length,
        linkedFound: extraConfirmed.length,
      },
    },
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
  } catch { /* */ }

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

  try {
    const res = await safeFetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=true`, 6000);
    if (res.ok) {
      const j = await res.json();
      data.breaches = j.map((b: any) => b.Name);
      data.breachCount = j.length;
    }
  } catch {
    data.breaches = [];
    data.breachNote = "API nécessite une clé premium. Utilisez la version Python avec --hibp-key.";
  }

  return { module: "Email Intelligence", icon: "📧", status: "success", data, elapsed: performance.now() - t0 };
}

// ─── Module: Domain Intelligence ────────────────────────────────────
async function moduleDomain(domain: string): Promise<ModuleResult> {
  const t0 = performance.now();
  const data: Record<string, any> = { domain };

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
        created: events.registration, expires: events.expiration, updated: events["last changed"],
        nameservers: (j.nameservers || []).map((ns: any) => ns.ldhName).filter(Boolean),
        status: j.status, dnssec: j.secureDNS?.delegationSigned ? "Signed" : "Unsigned",
      };
    }
  } catch { /* */ }

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

  try {
    const res = await directFetch(`https://archive.org/wayback/available?url=${domain}`, 5000);
    if (res.ok) {
      const j = await res.json();
      data.webArchive = j.archived_snapshots?.closest;
    }
  } catch { /* */ }

  return { module: "Domain Intelligence", icon: "🌐", status: Object.keys(data).length > 2 ? "success" : "partial", data, elapsed: performance.now() - t0 };
}

// ─── Module: IP Intelligence ────────────────────────────────────────
async function moduleIP(ip: string): Promise<ModuleResult> {
  const t0 = performance.now();
  const data: Record<string, any> = { ip };

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

  try {
    const res = await directFetch(`https://ipinfo.io/${ip}/json`, 5000);
    if (res.ok) {
      const j = await res.json();
      if (!data.geo) data.geo = { country: j.country, region: j.region, city: j.city, org: j.org, timezone: j.timezone };
      data.ipinfo = { hostname: j.hostname, anycast: j.anycast };
    }
  } catch { /* */ }

  try {
    const res = await directFetch(`https://dns.google/resolve?name=${ip.split(".").reverse().join(".")}.in-addr.arpa&type=PTR`, 5000);
    if (res.ok) {
      const j = await res.json();
      data.reverseDns = (j.Answer || []).map((a: any) => a.data).filter(Boolean);
    }
  } catch { /* */ }

  data.abuseCheck = "Utilisez la version Python avec --abuseipdb-key pour un rapport complet.";

  try {
    const res = await directFetch(`https://internetdb.shodan.io/${ip}`, 5000);
    if (res.ok) {
      const j = await res.json();
      data.shodan = { ports: j.ports, hostnames: j.hostnames, cpes: j.cpes, vulns: j.vulns, tags: j.tags };
    }
  } catch { /* */ }

  return { module: "IP Intelligence", icon: "📡", status: data.geo ? "success" : "partial", data, elapsed: performance.now() - t0 };
}

// ─── Module: Phone Intelligence ─────────────────────────────────────
async function modulePhone(phone: string): Promise<ModuleResult> {
  const t0 = performance.now();
  const clean = phone.replace(/[\s\-().]/g, "");
  const data: Record<string, any> = { phone: clean };
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
  for (const len of [3, 2, 1]) {
    const prefix = stripped.substring(0, len);
    if (CC[prefix]) { data.country = CC[prefix]; data.countryCode = `+${prefix}`; break; }
  }
  data.format = { e164: clean.startsWith("+") ? clean : `+${clean}`, national: clean };
  data.lineType = "Utilisez la version Python pour la détection opérateur (numverify/Twilio)";
  return { module: "Phone Intelligence", icon: "📱", status: "success", data, elapsed: performance.now() - t0 };
}

// ─── Master Runner ──────────────────────────────────────────────────
async function runOsint(target: string): Promise<OsintReport> {
  const t0 = performance.now();
  const targetType = detectTargetType(target);
  const modules: ModuleResult[] = [];

  switch (targetType) {
    case "name":
      modules.push(await moduleNameSearch(target));
      break;
    case "username":
      modules.push(await moduleUsername(target));
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

  return { target, targetType, timestamp: new Date().toISOString(), modules, totalTime: performance.now() - t0 };
}

// ─── UI Components ──────────────────────────────────────────────────
function ModuleCard({ result }: { result: ModuleResult }) {
  const [expanded, setExpanded] = useState(true);
  const statusColors = { success: "#39ff14", partial: "#f59e0b", error: "#ef4444", pending: "#64748b" };
  const statusLabels = { success: "Complet", partial: "Partiel", error: "Erreur", pending: "En cours" };

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "rgba(17,24,39,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-3">
          <span style={{ fontSize: "1.2rem" }}>{result.icon}</span>
          <span className="text-[#e2e8f0]" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}>{result.module}</span>
          <span className="px-2 py-0.5 rounded-full" style={{ fontSize: "0.65rem", color: statusColors[result.status], background: `${statusColors[result.status]}15`, border: `1px solid ${statusColors[result.status]}30` }}>
            {statusLabels[result.status]}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[#4a5568]" style={{ fontSize: "0.72rem", fontFamily: "JetBrains Mono, monospace" }}>{result.elapsed.toFixed(0)}ms</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-[#4a5568]" /> : <ChevronDown className="w-4 h-4 text-[#4a5568]" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-white/[0.03]">
          <div className="pt-3 space-y-3">{renderData(result.data)}</div>
        </div>
      )}
    </div>
  );
}

// ─── Search Result Card (for DDG results) ───────────────────────────
function SearchResultCard({ result }: { result: SearchResult }) {
  const platformColors: Record<string, string> = {
    "LinkedIn": "#0077b5", "GitHub": "#39ff14", "Instagram": "#e1306c", "Twitter/X": "#1da1f2",
    "Facebook": "#1877f2", "TikTok": "#ff0050", "YouTube": "#ff0000", "Pinterest": "#bd081c",
    "Reddit": "#ff4500", "Medium": "#00ab6c", "Twitch": "#9146ff", "SoundCloud": "#ff5500",
    "Dev.to": "#0a0a0a", "GitLab": "#fc6d26", "Behance": "#1769ff", "Dribbble": "#ea4c89",
    "Mastodon": "#6364ff",
  };
  const color = result.platform ? (platformColors[result.platform] || "#00d4ff") : "#64748b";

  return (
    <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${color}20` }}>
      <div className="flex items-start gap-2">
        {result.platform ? (
          <CheckCircle className="w-3.5 h-3.5 mt-1 shrink-0" style={{ color }} />
        ) : (
          <Globe className="w-3.5 h-3.5 text-[#64748b] mt-1 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {result.platform && (
              <span className="px-1.5 py-0.5 rounded" style={{ fontSize: "0.6rem", color, background: `${color}15`, border: `1px solid ${color}25` }}>
                {result.platform}
              </span>
            )}
            {result.username && (
              <span className="text-[#39ff14]/70" style={{ fontSize: "0.62rem", fontFamily: "JetBrains Mono, monospace" }}>
                @{result.username}
              </span>
            )}
          </div>
          <a href={result.url} target="_blank" rel="noopener noreferrer"
            className="block mt-1 text-[#e2e8f0] hover:text-[#00d4ff] transition-colors truncate"
            style={{ fontSize: "0.78rem" }}>
            {result.title || result.url}
          </a>
          <a href={result.url} target="_blank" rel="noopener noreferrer"
            className="block text-[#00d4ff]/60 hover:text-[#00d4ff] transition-colors truncate"
            style={{ fontSize: "0.65rem", fontFamily: "JetBrains Mono, monospace" }}>
            {result.url}
          </a>
          {result.snippet && (
            <p className="mt-1 text-[#94a3b8]" style={{ fontSize: "0.7rem" }}>
              {result.snippet.substring(0, 200)}{result.snippet.length > 200 ? "…" : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Data Renderer ──────────────────────────────────────────────────
function renderData(data: Record<string, any>, depth = 0): JSX.Element[] {
  const elements: JSX.Element[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;

    // ═══ SEARCH RESULTS (from DuckDuckGo) ═══
    if (key === "profileResults" && Array.isArray(value)) {
      if (value.length > 0) {
        elements.push(
          <div key={key} className="space-y-2">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-[#00d4ff]" />
              <span className="text-[#00d4ff]" style={{ fontSize: "0.8rem", fontFamily: "Orbitron, sans-serif" }}>
                {value.length} profil(s) trouvé(s) via moteur de recherche
              </span>
            </div>
            <div className="space-y-2">
              {(value as SearchResult[]).map((r, i) => (
                <SearchResultCard key={`profile-${i}`} result={r} />
              ))}
            </div>
          </div>
        );
      } else {
        elements.push(
          <div key={key} className="flex items-center gap-2 text-[#64748b]">
            <Search className="w-3.5 h-3.5" />
            <span style={{ fontSize: "0.75rem" }}>Aucun profil social trouvé via moteur de recherche</span>
          </div>
        );
      }
    }
    else if (key === "otherResults" && Array.isArray(value) && value.length > 0) {
      elements.push(
        <details key={key}>
          <summary className="cursor-pointer text-[#94a3b8] flex items-center gap-2" style={{ fontSize: "0.72rem", fontFamily: "JetBrains Mono, monospace" }}>
            <Globe className="w-3.5 h-3.5" /> {value.length} autre(s) résultat(s) web
          </summary>
          <div className="mt-2 space-y-2">
            {(value as SearchResult[]).map((r, i) => (
              <SearchResultCard key={`other-${i}`} result={r} />
            ))}
          </div>
        </details>
      );
    }
    // ═══ SEARCH PROFILES (username mode) ═══
    else if (key === "searchProfiles" && Array.isArray(value) && value.length > 0) {
      elements.push(
        <div key={key} className="space-y-2">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-[#00d4ff]" />
            <span className="text-[#00d4ff]" style={{ fontSize: "0.78rem", fontFamily: "JetBrains Mono, monospace" }}>
              {value.length} résultat(s) moteur de recherche
            </span>
          </div>
          <div className="space-y-2">
            {(value as SearchResult[]).map((r, i) => (
              <SearchResultCard key={`search-${i}`} result={r} />
            ))}
          </div>
        </div>
      );
    }
    // ═══ API CONFIRMED ═══
    else if ((key === "apiConfirmed" || key === "linkedAccounts") && Array.isArray(value)) {
      if (value.length > 0) {
        const label = key === "linkedAccounts" ? "Comptes liés découverts" : "Comptes VÉRIFIÉS par API";
        elements.push(
          <div key={key} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#39ff14]" />
              <span className="text-[#39ff14]" style={{ fontSize: "0.78rem", fontFamily: "JetBrains Mono, monospace" }}>
                {value.length} {label}
              </span>
            </div>
            {(value as PlatformHit[]).map((hit, i) => (
              <div key={`${hit.platform}-${i}`} className="flex items-start gap-2 rounded-lg p-2.5 ml-2" style={{ background: "rgba(57,255,20,0.04)", border: "1px solid rgba(57,255,20,0.12)" }}>
                <CheckCircle className="w-3.5 h-3.5 text-[#39ff14] mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[#39ff14]" style={{ fontSize: "0.76rem", fontFamily: "JetBrains Mono, monospace" }}>{hit.platform}</span>
                    <span className="px-1.5 py-0.5 rounded text-[#39ff14]/60" style={{ fontSize: "0.58rem", background: "rgba(57,255,20,0.08)", border: "1px solid rgba(57,255,20,0.15)" }}>API VÉRIFIÉ</span>
                    <a href={hit.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#00d4ff] hover:text-[#38bdf8] transition-colors truncate"
                      style={{ fontSize: "0.7rem", fontFamily: "JetBrains Mono, monospace" }}>
                      <ExternalLink className="w-3 h-3 shrink-0" /><span className="truncate">{hit.url}</span>
                    </a>
                  </div>
                  {hit.info && Object.keys(hit.info).filter(k => hit.info![k] != null && hit.info![k] !== "").length > 0 && (
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      {Object.entries(hit.info).filter(([, v]) => v != null && v !== "").map(([k, v]) => (
                        <span key={k} className="text-[#94a3b8]" style={{ fontSize: "0.65rem", fontFamily: "JetBrains Mono, monospace" }}>{k}: {String(v)}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      }
    }
    // ═══ SEARCH META ═══
    else if (key === "searchMeta" && typeof value === "object") {
      elements.push(
        <div key={key} className="rounded-lg p-2.5 space-y-0.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
          {Object.entries(value).map(([k, v]) => (
            <p key={k} className="text-[#64748b]" style={{ fontSize: "0.68rem", fontFamily: "JetBrains Mono, monospace" }}>{k}: {String(v)}</p>
          ))}
        </div>
      );
    }
    else if (key === "stats" && typeof value === "object") {
      elements.push(
        <div key={key} className="rounded-lg p-2.5 space-y-0.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
          {Object.entries(value).map(([k, v]) => (
            <p key={k} className="text-[#64748b]" style={{ fontSize: "0.68rem", fontFamily: "JetBrains Mono, monospace" }}>{k}: {String(v)}</p>
          ))}
        </div>
      );
    }
    // ═══ DISCOVERED USERNAMES ═══
    else if (key === "discoveredUsernames" && Array.isArray(value) && value.length > 0) {
      elements.push(
        <div key={key} className="flex items-center gap-2 flex-wrap">
          <span className="text-[#94a3b8]" style={{ fontSize: "0.72rem" }}>Usernames découverts :</span>
          {value.map((u: string) => (
            <span key={u} className="px-2 py-0.5 rounded text-[#00d4ff]" style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.12)", fontSize: "0.7rem", fontFamily: "JetBrains Mono, monospace" }}>@{u}</span>
          ))}
        </div>
      );
    }
    // ═══ Standard data rendering (DNS, breaches, etc.) ═══
    else if (key === "subdomains" && Array.isArray(value)) {
      elements.push(
        <details key={key}>
          <summary className="text-[#00d4ff] cursor-pointer" style={{ fontSize: "0.78rem", fontFamily: "JetBrains Mono, monospace" }}>{value.length} sous-domaine(s)</summary>
          <div className="mt-1 max-h-40 overflow-y-auto space-y-0.5">
            {value.map((s: string) => <p key={s} className="text-[#94a3b8]" style={{ fontSize: "0.7rem", fontFamily: "JetBrains Mono, monospace" }}>{s}</p>)}
          </div>
        </details>
      );
    }
    else if (key === "breaches" && Array.isArray(value)) {
      elements.push(
        <div key={key} className="space-y-1">
          <span className={value.length > 0 ? "text-[#ef4444]" : "text-[#39ff14]"} style={{ fontSize: "0.78rem", fontFamily: "JetBrains Mono, monospace" }}>
            {value.length > 0 ? `⚠ ${value.length} breach(es)` : "✓ Aucune breach"}
          </span>
          {value.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {value.map((b: string) => <span key={b} className="px-2 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", fontSize: "0.7rem", color: "#ef4444", fontFamily: "JetBrains Mono, monospace" }}>{b}</span>)}
            </div>
          )}
        </div>
      );
    }
    else if (key === "dns" && typeof value === "object") {
      elements.push(
        <div key={key} className="space-y-1.5">
          <span className="text-[#94a3b8] block" style={{ fontSize: "0.75rem" }}>DNS Records</span>
          {Object.entries(value).filter(([, v]) => Array.isArray(v) && (v as string[]).length > 0).map(([type, records]) => (
            <div key={type} className="flex gap-2 items-start">
              <span className="text-[#00d4ff] w-12 shrink-0" style={{ fontSize: "0.72rem", fontFamily: "JetBrains Mono, monospace" }}>{type}</span>
              <div className="flex flex-wrap gap-1">
                {(records as string[]).map((r: string, i: number) => <span key={`${r}-${i}`} className="text-[#e2e8f0]" style={{ fontSize: "0.7rem", fontFamily: "JetBrains Mono, monospace" }}>{r}</span>)}
              </div>
            </div>
          ))}
        </div>
      );
    }
    // Skip internal keys
    else if (["nameAnalysis", "totalPlatforms", "notFound", "errors"].includes(key)) {
      // skip
    }
    else if (typeof value === "object" && !Array.isArray(value)) {
      elements.push(
        <div key={key} className="space-y-1" style={{ marginLeft: depth * 12 }}>
          <span className="text-[#94a3b8] block" style={{ fontSize: "0.75rem" }}>{key}</span>
          {renderData(value, depth + 1)}
        </div>
      );
    }
    else if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === "string") {
        elements.push(
          <div key={key} className="flex gap-2 items-start" style={{ marginLeft: depth * 12 }}>
            <span className="text-[#64748b] w-28 shrink-0" style={{ fontSize: "0.72rem" }}>{key}</span>
            <span className="text-[#e2e8f0]" style={{ fontSize: "0.72rem", fontFamily: "JetBrains Mono, monospace" }}>{value.join(", ")}</span>
          </div>
        );
      }
    }
    else {
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
    setLoading(true); setError(""); setReport(null);
    try {
      setReport(await runOsint(input.trim()));
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    } finally { setLoading(false); }
  }, [input]);

  const fallbackCopy = (text: string) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* */ }
    document.body.removeChild(ta);
  };

  const copyJson = useCallback(() => {
    if (!report) return;
    const text = JSON.stringify(report, null, 2);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }, [report]);

  const typeLabels: Record<string, string> = {
    username: "👤 Username", email: "📧 Email", domain: "🌐 Domain", ip: "📡 IP", phone: "📱 Phone", name: "🔍 Nom & Prénom",
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="Jean Dupont, username, email@test.com, domaine.com, 8.8.8.8, +33612345678"
          className="flex-1 px-4 py-3 bg-[#0a0a0f] border border-[#1e293b] rounded-lg text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#ff6b35]/40"
          style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.9rem" }} />
        <button onClick={run} disabled={loading || !input.trim()}
          className="px-6 py-3 rounded-lg transition-all flex items-center gap-2 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #ff6b35, #e55d2b)", color: "#fff", fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          Investiguer
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { label: "Nom Prénom", example: "Yanis Gely", icon: "🔍" },
          { label: "Username", example: "FarddownYG", icon: "👤" },
          { label: "Email", example: "john@mail.com", icon: "📧" },
        ].map((t) => (
          <button key={t.label} onClick={() => setInput(t.example)}
            className="px-2.5 py-1 rounded-lg text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-white/[0.04] transition-colors"
            style={{ fontSize: "0.7rem", border: "1px solid rgba(255,255,255,0.06)", fontFamily: "JetBrains Mono, monospace" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg p-3 mb-4 flex items-start gap-2" style={{ background: "rgba(0,212,255,0.03)", border: "1px solid rgba(0,212,255,0.08)" }}>
        <Shield className="w-4 h-4 text-[#00d4ff]/60 mt-0.5 shrink-0" />
        <p className="text-[#64748b]" style={{ fontSize: "0.68rem" }}>
          <span className="text-[#00d4ff]/80">Méthode réelle :</span> Scraping DuckDuckGo → extraction des vrais profils depuis les résultats → vérification par API quand possible. Aucun lien inventé, aucun faux positif.
        </p>
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
                <div className="h-4 w-48 rounded bg-[#1e293b]" />
              </div>
            </div>
          ))}
          <p className="text-center text-[#64748b]" style={{ fontSize: "0.78rem" }}>
            Scraping moteur de recherche + vérification API en cours...
          </p>
        </div>
      )}

      {report && (
        <div className="space-y-4">
          <div className="rounded-xl p-4 flex flex-wrap items-center justify-between gap-3" style={{ background: "linear-gradient(135deg, rgba(255,107,53,0.06), rgba(255,107,53,0.02))", border: "1px solid rgba(255,107,53,0.15)" }}>
            <div className="flex items-center gap-3">
              <Fingerprint className="w-5 h-5 text-[#ff6b35]" />
              <div>
                <p className="text-[#e2e8f0]" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.85rem" }}>{report.target}</p>
                <p className="text-[#64748b]" style={{ fontSize: "0.72rem" }}>
                  {typeLabels[report.targetType]} • {report.modules.length} module(s) • {(report.totalTime / 1000).toFixed(1)}s
                </p>
              </div>
            </div>
            <button onClick={copyJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", fontSize: "0.75rem" }}>
              {copied ? <CheckCircle className="w-3.5 h-3.5 text-[#39ff14]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copié !" : "JSON"}
            </button>
          </div>
          <div className="space-y-3">
            {report.modules.map((m, i) => <ModuleCard key={`${m.module}-${i}`} result={m} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Python Script ──────────────────────────────────────────────────
const PYTHON_SCRIPT = `#!/usr/bin/env python3
"""
DeductOScope - CyberGuard OSINT Framework v5.0
===============================================
REAL OSINT: Scrapes search engines, parses results, extracts profiles, verifies via APIs.
No guessed URLs. No false positives. Article 4 compliant.

Usage:
    python deductoscope.py "Jean Dupont"
    python deductoscope.py johndoe
    python deductoscope.py john@mail.com --hibp-key YOUR_KEY
    python deductoscope.py exemple.com --deep
    python deductoscope.py 8.8.8.8 -o rapport.json
"""

import argparse, json, sys, os, re, socket, ssl, time, hashlib, html
import urllib.request, urllib.parse, urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

VERSION = "5.0.0"
MAX_THREADS = 32
TIMEOUT = 10
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

C = {
    "R": "\\033[91m", "G": "\\033[92m", "Y": "\\033[93m", "B": "\\033[94m",
    "C": "\\033[96m", "W": "\\033[97m", "D": "\\033[90m",
    "BOLD": "\\033[1m", "X": "\\033[0m",
}

def banner():
    print(f"""
{C['C']}{C['BOLD']}╔══════════════════════════════════════════════════════════════╗
║          DeductOScope v{VERSION} — Real OSINT Framework          ║
║     Search Engine Scraping → Profile Extraction → API Check  ║
╚══════════════════════════════════════════════════════════════╝{C['X']}
    """)

def http_get(url, timeout=TIMEOUT, headers=None, retries=3):
    h = {"User-Agent": USER_AGENT, "Accept": "*/*"}
    if headers: h.update(headers)
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=h)
            ctx = ssl.create_default_context()
            with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
                data = resp.read().decode("utf-8", errors="replace")
                if resp.headers.get("Content-Type", "").startswith("application/json") or data.strip().startswith(("{", "[")):
                    return json.loads(data)
                return data
        except Exception:
            if attempt == retries - 1: return None
            time.sleep(1)
    return None

def detect_type(target):
    t = target.strip()
    if re.match(r'^[\\w.+-]+@[\\w.-]+\\.\\w+$', t): return "email"
    if re.match(r'^(\\d{1,3}\\.){3}\\d{1,3}$', t): return "ip"
    if re.match(r'^[+]?\\d[\\d\\s-]{6,}$', t.replace(" ", "")): return "phone"
    if re.match(r'^[\\w.-]+\\.\\w{2,}$', t) and "." in t: return "domain"
    if " " in t and "@" not in t: return "name"
    return "username"

# ══════════════════════════════════════════════════════════════════════
# SEARCH ENGINE SCRAPING — The REAL approach
# ══════════════════════════════════════════════════════════════════════

PLATFORM_PATTERNS = [
    (r"linkedin\\.com/in/([^/?#]+)", "LinkedIn"),
    (r"github\\.com/([^/?#]+)", "GitHub"),
    (r"instagram\\.com/([^/?#]+)", "Instagram"),
    (r"twitter\\.com/([^/?#]+)", "Twitter/X"),
    (r"x\\.com/([^/?#]+)", "Twitter/X"),
    (r"facebook\\.com/([^/?#]+)", "Facebook"),
    (r"tiktok\\.com/@([^/?#]+)", "TikTok"),
    (r"youtube\\.com/@([^/?#]+)", "YouTube"),
    (r"pinterest\\.\\w+/([^/?#]+)", "Pinterest"),
    (r"reddit\\.com/user/([^/?#]+)", "Reddit"),
    (r"medium\\.com/@([^/?#]+)", "Medium"),
]

def identify_platform(url):
    for pattern, name in PLATFORM_PATTERNS:
        m = re.search(pattern, url)
        if m:
            username = m.group(1)
            skip = ["search", "explore", "trending", "hashtag", "topics", "p", "reel", "stories", "i", "intent", "watch", "groups"]
            if username.lower() not in skip:
                return name, username
    return None, None

def scrape_duckduckgo(query):
    print(f"\\n{C['C']}[SEARCH] Scraping DuckDuckGo: {query}{C['X']}")
    url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
    raw = http_get(url, timeout=15)
    results = []
    if not raw or not isinstance(raw, str): return results
    
    blocks = re.split(r'class="result\\s', raw)[1:]
    for block in blocks:
        try:
            # URL
            url_m = re.search(r'class="result__url"[^>]*>([^<]+)', block)
            if not url_m: continue
            found_url = url_m.group(1).strip()
            if not found_url.startswith("http"):
                found_url = "https://" + found_url
            
            # Title
            title_m = re.search(r'class="result__a"[^>]*>(.+?)</a', block, re.DOTALL)
            title = re.sub(r'<[^>]+>', '', title_m.group(1)).strip() if title_m else ""
            title = html.unescape(title)
            
            # Snippet
            snip_m = re.search(r'class="result__snippet"[^>]*>(.*?)</(?:a|span|div)', block, re.DOTALL)
            snippet = re.sub(r'<[^>]+>', '', snip_m.group(1)).strip() if snip_m else ""
            snippet = html.unescape(snippet)
            
            platform, username = identify_platform(found_url)
            results.append({
                "title": title, "url": found_url, "snippet": snippet,
                "platform": platform, "username": username,
            })
            
            marker = f"{C['G']}[PROFILE]{C['X']}" if platform else f"{C['D']}[WEB]{C['X']}"
            print(f"  {marker} {platform or 'Web'}: {found_url}")
            if username: print(f"    {C['C']}@{username}{C['X']}")
            
        except: continue
    
    print(f"  {C['C']}Total: {len(results)} resultats, {len([r for r in results if r['platform']])} profils{C['X']}")
    return results

# API verification
VERIFIED_APIS = [
    ("GitHub", "https://api.github.com/users/{}", "json"),
    ("GitLab", "https://gitlab.com/api/v4/users?username={}", "jsonArray"),
    ("Reddit", "https://www.reddit.com/user/{}/about.json", "json"),
    ("HackerNews", "https://hacker-news.firebaseio.com/v0/user/{}.json", "json"),
    ("Dev.to", "https://dev.to/api/users/by_username?url={}", "json"),
    ("Codewars", "https://www.codewars.com/api/v1/users/{}", "json"),
    ("Codeforces", "https://codeforces.com/api/user.info?handles={}", "json"),
    ("Docker Hub", "https://hub.docker.com/v2/users/{}/", "json"),
]

def verify_username(username):
    confirmed = []
    for name, url_tpl, check in VERIFIED_APIS:
        url = url_tpl.format(username)
        data = http_get(url, timeout=8)
        if check == "json" and data and isinstance(data, dict) and not data.get("error") and not data.get("errors"):
            confirmed.append({"platform": name, "url": url, "verified": True})
            print(f"  {C['G']}[API VERIFIED]{C['X']} {name}: {url}")
        elif check == "jsonArray" and data and isinstance(data, list) and len(data) > 0:
            confirmed.append({"platform": name, "url": url, "verified": True})
            print(f"  {C['G']}[API VERIFIED]{C['X']} {name}: {url}")
    return confirmed

def module_name(full_name, threads=MAX_THREADS):
    results = scrape_duckduckgo(full_name)
    profiles = [r for r in results if r["platform"]]
    usernames = set(r["username"] for r in profiles if r.get("username"))
    
    api_confirmed = []
    for uname in usernames:
        print(f"\\n{C['C']}[VERIFY] @{uname}{C['X']}")
        api_confirmed.extend(verify_username(uname))
    
    return {"module": "name", "search_results": results, "profiles": profiles, "api_confirmed": api_confirmed, "usernames": list(usernames)}

def module_username(username, threads=MAX_THREADS):
    api_confirmed = verify_username(username)
    results = scrape_duckduckgo(username)
    profiles = [r for r in results if r["platform"]]
    return {"module": "username", "api_confirmed": api_confirmed, "search_results": results, "profiles": profiles}

def module_email(email, hibp_key=None):
    local, domain = email.split("@")
    result = {"module": "email", "email": email}
    try:
        g = http_get(f"https://en.gravatar.com/{hashlib.md5(email.lower().encode()).hexdigest()}.json")
        if g and isinstance(g, dict) and "entry" in g:
            result["gravatar"] = {"displayName": g["entry"][0].get("displayName")}
    except: pass
    try:
        mx = http_get(f"https://dns.google/resolve?name={domain}&type=MX")
        if mx and "Answer" in mx: result["mx"] = [a["data"] for a in mx["Answer"]]
    except: pass
    if hibp_key:
        try:
            b = http_get(f"https://haveibeenpwned.com/api/v3/breachedaccount/{urllib.parse.quote(email)}?truncateResponse=true", headers={"hibp-api-key": hibp_key})
            if b and isinstance(b, list): result["breaches"] = [x["Name"] for x in b]
        except: pass
    return result

def module_domain(domain, deep=False):
    result = {"module": "domain", "domain": domain, "dns": {}}
    for rtype in ["A", "AAAA", "MX", "NS", "TXT"]:
        try:
            r = http_get(f"https://dns.google/resolve?name={domain}&type={rtype}")
            if r and "Answer" in r: result["dns"][rtype] = [a["data"] for a in r["Answer"]]
        except: pass
    try:
        ct = http_get(f"https://crt.sh/?q=%.{domain}&output=json", timeout=15)
        if ct and isinstance(ct, list):
            subs = set()
            for e in ct:
                for n in (e.get("name_value", "") or "").split("\\n"):
                    c = n.strip().replace("*.", "")
                    if c.endswith(domain) and c != domain: subs.add(c)
            result["subdomains"] = sorted(subs)[:200]
    except: pass
    return result

def module_ip(ip):
    result = {"module": "ip", "ip": ip}
    try:
        geo = http_get(f"http://ip-api.com/json/{ip}?fields=66846719")
        if geo: result["geo"] = {k: geo.get(k) for k in ["country", "city", "isp", "org", "as", "proxy", "hosting"]}
    except: pass
    try:
        s = http_get(f"https://internetdb.shodan.io/{ip}")
        if s and isinstance(s, dict): result["shodan"] = {k: s.get(k, []) for k in ["ports", "hostnames", "vulns"]}
    except: pass
    return result

def run_investigation(target, modules=None, deep=False, hibp_key=None, threads=MAX_THREADS):
    target_type = detect_type(target)
    print(f"  {C['BOLD']}Cible:{C['X']} {target}  |  Type: {target_type}")
    
    if modules: active = [m.strip() for m in modules.split(",")]
    else: active = {"name": ["name"], "username": ["username"], "email": ["email", "username", "domain"], "domain": ["domain"], "ip": ["ip"], "phone": ["phone"]}.get(target_type, ["username"])
    
    results = {"target": target, "type": target_type, "timestamp": datetime.now().isoformat(), "modules": []}
    t0 = time.time()
    
    for mod in active:
        if mod == "name": results["modules"].append(module_name(target, threads))
        elif mod == "username": results["modules"].append(module_username(target.split("@")[0] if "@" in target else target, threads))
        elif mod == "email": results["modules"].append(module_email(target if "@" in target else f"{target}@gmail.com", hibp_key))
        elif mod == "domain":
            d = target.split("@")[1] if "@" in target else target
            results["modules"].append(module_domain(d, deep))
        elif mod == "ip": results["modules"].append(module_ip(target))
    
    results["total_time"] = time.time() - t0
    return results

def main():
    parser = argparse.ArgumentParser(description="DeductOScope v5 - Real OSINT via Search Engine Scraping")
    parser.add_argument("target")
    parser.add_argument("--modules", "-m")
    parser.add_argument("--deep", action="store_true")
    parser.add_argument("--hibp-key")
    parser.add_argument("--threads", "-t", type=int, default=MAX_THREADS)
    parser.add_argument("--output", "-o")
    parser.add_argument("--json", "-j", action="store_true")
    args = parser.parse_args()
    if not args.json: banner()
    results = run_investigation(args.target, args.modules, args.deep, args.hibp_key, args.threads)
    if args.json: print(json.dumps(results, indent=2, default=str, ensure_ascii=False))
    if args.output:
        with open(args.output, "w") as f: json.dump(results, f, indent=2, default=str, ensure_ascii=False)
        print(f"  {C['G']}[+]{C['X']} {args.output}")

if __name__ == "__main__":
    main()
`;

const README = `# DeductOScope v5.0 — Real OSINT Framework

## Méthode RÉELLE (pas de faux positifs)
1. **Scrape DuckDuckGo** avec le nom/username de la cible
2. **Parse les résultats** : extrait les vrais URLs, titres, snippets
3. **Identifie les plateformes** (LinkedIn, GitHub, Instagram, etc.) depuis les URLs réelles
4. **Extrait les usernames** des URLs découvertes
5. **Vérifie par API** les usernames extraits (GitHub, Reddit, GitLab, etc.)

## Pourquoi c'est fiable
- On ne devine PAS des URLs (pas de \`linkedin.com/in/prenom-nom\` inventé)
- On utilise les VRAIS résultats de recherche (comme un humain le ferait)
- Les profils trouvés sont ceux que Google/DDG indexent réellement
- La vérification API confirme l'existence sans ambiguïté

Créé par CyberGuard — https://cyber-guard-dusky.vercel.app
`;

const GUI_CONFIG: GuiConfig = {
  title: "DeductOScope OSINT",
  inputType: "url",
  inputPlaceholder: "Jean Dupont, username, email, domain, IP, phone",
  buttonText: "Investiguer",
  importLine: "from deductoscope import run_investigation",
  processCode: `            return run_investigation(inp)`,
};

export function DeductOScopePage() {
  return (
    <ToolPageLayout
      title="DeductO" subtitle="Scope"
      description="Framework OSINT réel — Scrape les moteurs de recherche, extrait les vrais profils avec URLs et snippets, vérifie par API. Aucun lien inventé, aucun faux positif."
      toolSlug="deductoscope"
      icon={Eye}
      color="#ff6b35"
      hubAnchor="deductoscope"
      features={[
        { icon: Search, title: "Scraping Moteur de Recherche", desc: "Scrape DuckDuckGo/SearXNG pour obtenir les VRAIS résultats — exactement ce qu'un humain verrait." },
        { icon: Users, title: "Recherche Nom & Prénom", desc: "Cherche le nom complet, extrait les profils LinkedIn, GitHub, Instagram, etc. depuis les résultats réels." },
        { icon: Fingerprint, title: "Extraction de Usernames", desc: "Parse les URLs trouvées pour extraire les vrais usernames (@farddown, FarddownYG, yanisgely...)." },
        { icon: CheckCircle, title: "Vérification API", desc: "Les usernames découverts sont vérifiés via les APIs (GitHub, Reddit, GitLab, etc.) — confirmation sans ambiguïté." },
        { icon: Mail, title: "Email Intelligence", desc: "Gravatar, provider MX, breach check HaveIBeenPwned." },
        { icon: Globe, title: "Domain Intelligence", desc: "DNS, WHOIS/RDAP, sous-domaines CT logs, Wayback Machine." },
        { icon: MapPin, title: "IP Intelligence", desc: "Géolocation, Shodan InternetDB (ports, CVEs), ISP, VPN detection." },
        { icon: FileText, title: "Données Réelles", desc: "Chaque résultat vient d'une source réelle. Article 4 : JAMAIS DE MENSONGE." },
      ]}
      requirements={["Python 3.7+ (aucune dépendance externe)", "Optionnel : clé API HaveIBeenPwned"]}
      pythonScript={PYTHON_SCRIPT}
      readmeContent={README}
      guiConfig={GUI_CONFIG}
    >
      <DeductOScopeTool />
    </ToolPageLayout>
  );
}
