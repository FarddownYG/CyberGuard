import { useState } from "react";
import { ExternalLink, Search, Loader2, AlertTriangle, CheckCircle, Shield, Globe, ArrowRight, Lock, Eye, Code } from "lucide-react";
import { ToolPageLayout } from "./ToolPageLayout";
import type { GuiConfig } from "./zip-generator";

const REDIRECT_PARAMS = ["url", "next", "redirect", "redirect_uri", "redirect_url", "return", "returnTo",
  "return_url", "continue", "dest", "destination", "redir", "forward", "forward_url", "out", "view",
  "login", "link", "goto", "target", "to", "ref", "site", "page"];

const TEST_TARGETS = ["https://evil.com", "//evil.com", "https://evil.com%40example.com",
  "/\\evil.com", "https://evil.com/.example.com", "https://example.com@evil.com"];

function RedirectCheckerTool() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ param: string; target: string; redirected: boolean; finalUrl: string }[] | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

  const check = async () => {
    if (!url) return;
    setLoading(true);
    setError("");
    setResults(null);
    setProgress(0);

    let base = url.trim();
    if (!base.startsWith("http")) base = "https://" + base;
    base = base.replace(/\/+$/, "");

    const scanResults: { param: string; target: string; redirected: boolean; finalUrl: string }[] = [];
    const totalTests = REDIRECT_PARAMS.length;
    let done = 0;

    for (const param of REDIRECT_PARAMS) {
      const testUrl = `${base}?${param}=${encodeURIComponent(TEST_TARGETS[0])}`;
      try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(testUrl)}`;
        const res = await fetch(proxyUrl);
        const data = await res.json();
        const finalUrl = data.status?.url || testUrl;
        const redirected = finalUrl !== testUrl && finalUrl.includes("evil.com");
        scanResults.push({ param, target: TEST_TARGETS[0], redirected, finalUrl });
      } catch {
        scanResults.push({ param, target: TEST_TARGETS[0], redirected: false, finalUrl: "Erreur" });
      }
      done++;
      setProgress(Math.round((done / totalTests) * 100));
    }

    setResults(scanResults);
    setLoading(false);
  };

  const vulnCount = results?.filter(r => r.redirected).length || 0;

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && check()}
          placeholder="https://exemple.com/login" className="flex-1 px-4 py-3 bg-[#0a0a0f] border border-[#1e293b] rounded-lg text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#f97316]/40"
          style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.9rem" }} />
        <button onClick={check} disabled={loading || !url} className="px-6 py-3 rounded-lg transition-all flex items-center gap-2 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", color: "#fff", fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Tester
        </button>
      </div>

      {loading && (
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <span className="text-[#94a3b8]" style={{ fontSize: "0.75rem" }}>Test de {REDIRECT_PARAMS.length} parametres...</span>
            <span className="text-[#f97316]" style={{ fontSize: "0.75rem" }}>{progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#1e293b]">
            <div className="h-full rounded-full bg-[#f97316] transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg p-4 mb-4 flex items-start gap-3" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <AlertTriangle className="w-4 h-4 text-[#ef4444] flex-shrink-0 mt-0.5" />
          <p className="text-[#ef4444]" style={{ fontSize: "0.82rem" }}>{error}</p>
        </div>
      )}

      {results && (
        <div className="space-y-3">
          <div className="rounded-lg p-4" style={{ background: vulnCount > 0 ? "rgba(239,68,68,0.05)" : "rgba(57,255,20,0.04)", border: `1px solid ${vulnCount > 0 ? "rgba(239,68,68,0.15)" : "rgba(57,255,20,0.12)"}` }}>
            <span style={{ fontSize: "0.9rem", color: vulnCount > 0 ? "#ef4444" : "#39ff14" }}>
              {vulnCount > 0 ? `${vulnCount} parametre(s) potentiellement vulnerable(s)` : "Aucune redirection ouverte detectee"}
            </span>
          </div>
          <p className="text-[#64748b]" style={{ fontSize: "0.72rem" }}>
            {REDIRECT_PARAMS.length} parametres testes: {REDIRECT_PARAMS.join(", ")}
          </p>
          {results.filter(r => r.redirected).map(r => (
            <div key={r.param} className="rounded-lg p-3 flex items-start gap-3" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)" }}>
              <AlertTriangle className="w-4 h-4 text-[#ef4444] flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-[#ef4444]" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.8rem" }}>?{r.param}=</span>
                <p className="text-[#94a3b8]" style={{ fontSize: "0.72rem" }}>Redirige vers une URL externe</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const PYTHON_SCRIPT = `#!/usr/bin/env python3
"""
Open Redirect Checker - CyberGuard
Teste 24 parametres de redirection courants contre une URL cible.

Usage:
    python redirect_checker.py https://exemple.com/login
    python redirect_checker.py https://exemple.com -o rapport.json
"""

import argparse, json, sys, urllib.request, urllib.error, urllib.parse, ssl

PARAMS = ["url", "next", "redirect", "redirect_uri", "redirect_url", "return", "returnTo",
    "return_url", "continue", "dest", "destination", "redir", "forward", "forward_url",
    "out", "view", "login", "link", "goto", "target", "to", "ref", "site", "page"]

TARGETS = ["https://evil.com", "//evil.com", "https://evil.com%40example.com",
    "/\\\\evil.com", "https://evil.com/.example.com"]

def test_redirect(base_url, param, target, timeout=10):
    sep = "&" if "?" in base_url else "?"
    test_url = f"{base_url}{sep}{param}={urllib.parse.quote(target, safe='')}"
    ctx = ssl.create_default_context()
    req = urllib.request.Request(test_url)
    req.add_header("User-Agent", "CyberGuard-Redirect/1.0")
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=timeout) as resp:
            final = resp.geturl()
            return {"param": param, "target": target, "redirected": "evil.com" in final, "final_url": final}
    except urllib.error.HTTPError as e:
        loc = e.headers.get("Location", "")
        return {"param": param, "target": target, "redirected": "evil.com" in loc, "final_url": loc}
    except:
        return {"param": param, "target": target, "redirected": False, "final_url": "erreur"}

def main():
    parser = argparse.ArgumentParser(description="Open Redirect Checker - CyberGuard")
    parser.add_argument("url", help="URL cible")
    parser.add_argument("-o", "--output", help="Export JSON")
    args = parser.parse_args()

    RED, GREEN, YELLOW, CYAN, RESET = "\\033[91m", "\\033[92m", "\\033[93m", "\\033[96m", "\\033[0m"
    print(f"\\n  {CYAN}Test de {len(PARAMS)} parametres x {len(TARGETS)} payloads = {len(PARAMS)*len(TARGETS)} tests{RESET}")

    all_results = []
    vuln_count = 0
    for param in PARAMS:
        for target in TARGETS:
            r = test_redirect(args.url, param, target)
            all_results.append(r)
            if r["redirected"]:
                vuln_count += 1
                print(f"  {RED}VULNERABLE{RESET}  ?{param}={target}  →  {r['final_url']}")

    print(f"\\n  {vuln_count} redirection(s) ouverte(s) trouvee(s)")
    if vuln_count == 0:
        print(f"  {GREEN}Aucune redirection ouverte detectee{RESET}")

    if args.output:
        with open(args.output, "w") as f:
            json.dump(all_results, f, indent=2)

if __name__ == "__main__":
    main()
`;

const README = `# Open Redirect Checker - CyberGuard
Teste 24 parametres x 5 payloads = 120 tests de redirection ouverte.
## Utilisation
\`\`\`bash
python redirect_checker.py https://exemple.com/login
python redirect_checker.py https://exemple.com -o rapport.json
\`\`\`
## API requise: Aucune.
`;

const GUI_CONFIG: GuiConfig = {
  title: "Open Redirect Checker",
  inputType: "url",
  inputPlaceholder: "https://exemple.com/login",
  buttonText: "Tester",
  importLine: "from redirect_checker import test_redirect, PARAMS, TARGETS",
  processCode: `            results = []
            vuln = 0
            for param in PARAMS:
                for target in TARGETS:
                    r = test_redirect(inp, param, target)
                    if r["redirected"]:
                        vuln += 1
                        results.append(r)
            return {"url": inp, "vulnerable_count": vuln, "total_tests": len(PARAMS)*len(TARGETS), "vulnerabilities": results}`,
};

export function RedirectCheckerPage() {
  return (
    <ToolPageLayout title="Open Redirect" subtitle="Checker" description="Teste 24 parametres de redirection courants avec 5 payloads differents pour detecter les open redirects."
      disableOnlineTest
      toolSlug="redirect_checker" icon={ExternalLink} color="#f97316" hubAnchor="redirect-checker"
      features={[
        { icon: ExternalLink, title: "24 parametres", desc: "url, next, redirect, return, goto, target et 18 autres." },
        { icon: Shield, title: "5 payloads de bypass", desc: "URL directe, protocol-relative, encoding, path confusion." },
        { icon: Globe, title: "120 tests", desc: "24 params x 5 payloads = test exhaustif en quelques secondes." },
        { icon: ArrowRight, title: "Suivi de redirections", desc: "Suit la chaine complete de redirections." },
        { icon: Eye, title: "Zero API", desc: "Simple requetes HTTP. Aucune cle requise." },
        { icon: Code, title: "Export JSON", desc: "Exportez pour vos rapports de pentest." },
      ]}
      requirements={["Python 3.7+", "Aucune dependance", "Connexion internet", "Autorisation sur la cible"]}
      pythonScript={PYTHON_SCRIPT} readmeContent={README}
      guiConfig={GUI_CONFIG}
    >
      <RedirectCheckerTool />
    </ToolPageLayout>
  );
}

export { RedirectCheckerTool };