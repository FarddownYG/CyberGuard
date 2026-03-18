import { useState } from "react";
import { FileText, Search, Loader2, AlertTriangle, CheckCircle, Shield, Globe, Eye, Lock, Code } from "lucide-react";
import { ToolPageLayout } from "./ToolPageLayout";
import type { GuiConfig } from "./zip-generator";

const SENSITIVE_PATHS = ["/admin", "/api", "/backup", "/.env", "/config", "/debug", "/phpmyadmin",
  "/wp-admin", "/cpanel", "/.git", "/server-status", "/server-info", "/.htaccess",
  "/wp-config", "/database", "/dump", "/sql", "/log", "/tmp", "/private", "/secret",
  "/internal", "/staging", "/test", "/dev", "/swagger", "/graphql", "/actuator",
  "/.svn", "/.hg", "/.DS_Store", "/composer.json", "/package.json", "/.gitlab",
  "/jenkins", "/sonar", "/kibana", "/elasticsearch", "/solr", "/cgi-bin",
  "/wp-includes", "/wp-json", "/xmlrpc", "/feed", "/sitemap",
  "/.well-known", "/robots.txt", "/crossdomain.xml", "/clientaccesspolicy.xml",
  "/phpinfo", "/info.php", "/test.php", "/install", "/setup", "/upgrade",
  "/console", "/terminal", "/shell", "/cmd", "/exec",
  "/metrics", "/health", "/status", "/monitoring", "/trace",
  "/uploads", "/files", "/documents", "/downloads", "/media",
  "/cron", "/scheduler", "/queue", "/worker",
  "/redis", "/memcached", "/mongo", "/mysql",
  "/.dockerenv", "/docker-compose", "/Dockerfile",
  "/node_modules", "/vendor", "/bower_components",
  "/error_log", "/access_log", "/debug.log",
  "/web.config", "/applicationhost.config", "/machine.config"];

interface RobotsResult {
  disallowed: string[];
  allowed: string[];
  sitemaps: string[];
  userAgents: string[];
  sensitiveExposed: string[];
  crawlDelay: string | null;
}

function parseRobots(text: string): RobotsResult {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"));
  const disallowed: string[] = [];
  const allowed: string[] = [];
  const sitemaps: string[] = [];
  const userAgents: string[] = [];
  let crawlDelay: string | null = null;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith("disallow:")) disallowed.push(line.split(":").slice(1).join(":").trim());
    else if (lower.startsWith("allow:")) allowed.push(line.split(":").slice(1).join(":").trim());
    else if (lower.startsWith("sitemap:")) sitemaps.push(line.split(":").slice(1).join(":").trim());
    else if (lower.startsWith("user-agent:")) userAgents.push(line.split(":").slice(1).join(":").trim());
    else if (lower.startsWith("crawl-delay:")) crawlDelay = line.split(":").slice(1).join(":").trim();
  }

  const sensitiveExposed = disallowed.filter(path =>
    SENSITIVE_PATHS.some(sp => path.toLowerCase().includes(sp.toLowerCase()))
  );

  return { disallowed, allowed, sitemaps, userAgents, sensitiveExposed, crawlDelay };
}

function RobotsAnalyzerTool() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RobotsResult | null>(null);
  const [rawText, setRawText] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"url" | "paste">("url");

  const fetchRobots = async () => {
    if (!url) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      let base = url.trim();
      if (!base.startsWith("http")) base = "https://" + base;
      base = base.replace(/\/+$/, "");

      const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(base + "/robots.txt")}`);
      const text = await res.text();

      if (text.includes("<html") || text.includes("<!DOCTYPE")) {
        setError("Aucun fichier robots.txt trouve ou contenu invalide.");
        return;
      }

      setRawText(text);
      setResult(parseRobots(text));
    } catch {
      setError("Impossible de recuperer le robots.txt. Utilisez le mode 'Coller' ou la version Python.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = () => {
    if (!rawText) return;
    setResult(parseRobots(rawText));
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(["url", "paste"] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); setResult(null); }}
            className="px-4 py-2 rounded-lg transition-all"
            style={{ background: mode === m ? "rgba(6,182,212,0.15)" : "rgba(17,24,39,0.5)", border: `1px solid ${mode === m ? "rgba(6,182,212,0.3)" : "rgba(255,255,255,0.05)"}`, color: mode === m ? "#06b6d4" : "#64748b", fontSize: "0.82rem" }}>
            {m === "url" ? "Scanner une URL" : "Coller le contenu"}
          </button>
        ))}
      </div>

      {mode === "url" ? (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && fetchRobots()}
            placeholder="exemple.com" className="flex-1 px-4 py-3 bg-[#0a0a0f] border border-[#1e293b] rounded-lg text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#06b6d4]/40"
            style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.9rem" }} />
          <button onClick={fetchRobots} disabled={loading || !url}
            className="px-6 py-3 rounded-lg transition-all flex items-center gap-2 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #06b6d4, #0891b2)", color: "#0a0a0f", fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Analyser
          </button>
        </div>
      ) : (
        <div className="mb-6">
          <textarea value={rawText} onChange={e => setRawText(e.target.value)} rows={6} placeholder="Collez le contenu de robots.txt ici..."
            className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#1e293b] rounded-lg text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none mb-3 resize-none"
            style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem" }} />
          <button onClick={handlePaste} disabled={!rawText} className="px-6 py-3 rounded-lg transition-all flex items-center gap-2 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #06b6d4, #0891b2)", color: "#0a0a0f", fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}>
            <FileText className="w-4 h-4" /> Analyser
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg p-4 mb-4 flex items-start gap-3" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <AlertTriangle className="w-4 h-4 text-[#ef4444] flex-shrink-0 mt-0.5" />
          <p className="text-[#ef4444]" style={{ fontSize: "0.82rem" }}>{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Sensitive paths */}
          {result.sensitiveExposed.length > 0 && (
            <div className="rounded-lg p-4" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-[#ef4444]" />
                <span className="text-[#ef4444]" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.82rem" }}>Paths sensibles exposes ({result.sensitiveExposed.length})</span>
              </div>
              {result.sensitiveExposed.map((p, i) => (
                <p key={i} className="text-[#f59e0b] ml-6" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem" }}>{p}</p>
              ))}
              <p className="text-[#94a3b8] mt-2 ml-6" style={{ fontSize: "0.72rem" }}>Ces paths dans Disallow revelent des ressources sensibles aux attaquants.</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Disallow", value: result.disallowed.length, color: "#ef4444" },
              { label: "Allow", value: result.allowed.length, color: "#39ff14" },
              { label: "Sitemaps", value: result.sitemaps.length, color: "#00d4ff" },
              { label: "User-Agents", value: result.userAgents.length, color: "#8b5cf6" },
            ].map(s => (
              <div key={s.label} className="rounded-lg p-3 text-center" style={{ background: "rgba(17,24,39,0.5)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p style={{ color: s.color, fontFamily: "Orbitron, sans-serif", fontSize: "1.2rem" }}>{s.value}</p>
                <p className="text-[#64748b]" style={{ fontSize: "0.72rem" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Disallowed paths */}
          {result.disallowed.length > 0 && (
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="px-4 py-2" style={{ background: "rgba(239,68,68,0.06)", borderBottom: "1px solid rgba(239,68,68,0.08)" }}>
                <span className="text-[#ef4444]" style={{ fontSize: "0.78rem", fontFamily: "Orbitron, sans-serif" }}>Disallow ({result.disallowed.length})</span>
              </div>
              <div className="max-h-48 overflow-y-auto p-3 space-y-1">
                {result.disallowed.map((p, i) => (
                  <p key={i} className="text-[#94a3b8]" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem" }}>{p}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const PYTHON_SCRIPT = `#!/usr/bin/env python3
"""
Robots.txt & Sitemap Analyzer - CyberGuard
Analyse le robots.txt d'un site et detecte les paths sensibles exposes.

Usage:
    python robots_analyzer.py https://exemple.com
    python robots_analyzer.py -f robots.txt
"""

import argparse, json, sys, urllib.request, urllib.error, ssl

SENSITIVE = ["/admin", "/api", "/backup", "/.env", "/config", "/debug",
    "/phpmyadmin", "/wp-admin", "/.git", "/server-status", "/.htaccess",
    "/database", "/dump", "/sql", "/log", "/private", "/secret",
    "/swagger", "/graphql", "/actuator", "/wp-config", "/cpanel"]

def fetch_robots(url):
    if not url.startswith("http"):
        url = "https://" + url
    url = url.rstrip("/") + "/robots.txt"
    ctx = ssl.create_default_context()
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "CyberGuard-Robots/1.0")
    with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
        return resp.read().decode("utf-8", errors="replace")

def parse_robots(text):
    disallowed, allowed, sitemaps, agents = [], [], [], []
    crawl_delay = None
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        lower = line.lower()
        val = line.split(":", 1)[1].strip() if ":" in line else ""
        if lower.startswith("disallow:"):
            disallowed.append(val)
        elif lower.startswith("allow:"):
            allowed.append(val)
        elif lower.startswith("sitemap:"):
            sitemaps.append(val)
        elif lower.startswith("user-agent:"):
            agents.append(val)
        elif lower.startswith("crawl-delay:"):
            crawl_delay = val

    sensitive = [p for p in disallowed if any(s.lower() in p.lower() for s in SENSITIVE)]
    return {"disallowed": disallowed, "allowed": allowed, "sitemaps": sitemaps,
            "user_agents": agents, "sensitive_exposed": sensitive, "crawl_delay": crawl_delay}

def main():
    parser = argparse.ArgumentParser(description="Robots.txt Analyzer - CyberGuard")
    parser.add_argument("url", nargs="?", help="URL du site")
    parser.add_argument("-f", "--file", help="Fichier robots.txt local")
    parser.add_argument("-o", "--output", help="Export JSON")
    args = parser.parse_args()

    RED, GREEN, YELLOW, CYAN, RESET = "\\033[91m", "\\033[92m", "\\033[93m", "\\033[96m", "\\033[0m"

    if args.file:
        with open(args.file) as f:
            text = f.read()
    elif args.url:
        text = fetch_robots(args.url)
    else:
        parser.print_help(); sys.exit(1)

    result = parse_robots(text)
    print(f"\\n{'='*60}")
    print(f"  Disallow: {len(result['disallowed'])} | Allow: {len(result['allowed'])} | Sitemaps: {len(result['sitemaps'])}")
    if result["sensitive_exposed"]:
        print(f"\\n  {RED}Paths sensibles exposes ({len(result['sensitive_exposed'])}):{RESET}")
        for p in result["sensitive_exposed"]:
            print(f"    {YELLOW}[!] {p}{RESET}")
    for p in result["disallowed"]:
        print(f"  {RED}Disallow{RESET}: {p}")
    for s in result["sitemaps"]:
        print(f"  {CYAN}Sitemap{RESET}: {s}")

    if args.output:
        with open(args.output, "w") as f:
            json.dump(result, f, indent=2)

if __name__ == "__main__":
    main()
`;

const README = `# Robots.txt Analyzer - CyberGuard
Analyse le robots.txt et detecte les paths sensibles exposes.
## Utilisation
\`\`\`bash
python robots_analyzer.py https://google.com
python robots_analyzer.py -f robots.txt
\`\`\`
## API requise: Aucune.
`;

const GUI_CONFIG: GuiConfig = {
  title: "Robots.txt Analyzer",
  inputType: "url",
  inputPlaceholder: "exemple.com",
  buttonText: "Analyser",
  importLine: "from robots_analyzer import fetch_robots, parse_robots",
  processCode: `            text = fetch_robots(inp)
            return parse_robots(text)`,
};

export function RobotsAnalyzerPage() {
  return (
    <ToolPageLayout title="Robots.txt" subtitle="Analyzer" description="Analysez le fichier robots.txt d'un site et detectez les paths sensibles exposes aux attaquants."
      disableOnlineTest
      toolSlug="robots_analyzer" icon={FileText} color="#06b6d4" hubAnchor="robots-analyzer"
      features={[
        { icon: FileText, title: "Parsing complet", desc: "Analyse Disallow, Allow, Sitemap, User-Agent et Crawl-Delay." },
        { icon: AlertTriangle, title: "Paths sensibles", desc: "Detecte /admin, /.env, /.git, /api, /docker et 70+ patterns critiques." },
        { icon: Shield, title: "Information Disclosure", desc: "Le robots.txt revele souvent des paths que les devs veulent cacher." },
        { icon: Globe, title: "Mode URL ou copier-coller", desc: "Scannez directement ou collez le contenu manuellement." },
        { icon: Eye, title: "Zero API", desc: "Simple fetch HTTP. Aucune cle requise." },
        { icon: Code, title: "Export JSON", desc: "Exportez pour integration dans vos rapports." },
      ]}
      requirements={["Python 3.7+", "Aucune dependance", "Connexion internet", "Autorisation sur la cible"]}
      pythonScript={PYTHON_SCRIPT} readmeContent={README}
      guiConfig={GUI_CONFIG}
    >
      <RobotsAnalyzerTool />
    </ToolPageLayout>
  );
}

export { RobotsAnalyzerTool };