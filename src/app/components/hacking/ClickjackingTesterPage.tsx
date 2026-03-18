import { useState } from "react";
import { Frame, Shield, AlertTriangle, CheckCircle, XCircle, Globe, Loader2, Eye, Lock, Zap } from "lucide-react";
import { ToolPageLayout } from "./ToolPageLayout";
import type { GuiConfig } from "./zip-generator";

function ClickjackingTesterTool() {
  const [url, setUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ vulnerable: boolean | null; loaded: boolean; error?: string } | null>(null);

  const testClickjacking = () => {
    if (!url) return;
    setTesting(true);
    setResult(null);

    let targetUrl = url.trim();
    if (!targetUrl.startsWith("http")) targetUrl = "https://" + targetUrl;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;";
    iframe.src = targetUrl;

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        document.body.removeChild(iframe);
        setResult({ vulnerable: false, loaded: false });
        setTesting(false);
      }
    }, 8000);

    iframe.onload = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      try {
        // Try accessing content - if it loaded in iframe, it's vulnerable
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        setResult({ vulnerable: true, loaded: true });
      } catch {
        // Cross-origin but loaded = potentially vulnerable
        setResult({ vulnerable: true, loaded: true });
      }
      document.body.removeChild(iframe);
      setTesting(false);
    };

    iframe.onerror = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      setResult({ vulnerable: false, loaded: false });
      document.body.removeChild(iframe);
      setTesting(false);
    };

    document.body.appendChild(iframe);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && testClickjacking()}
          placeholder="https://exemple.com"
          className="flex-1 px-4 py-3 bg-[#0a0a0f] border border-[#1e293b] rounded-lg text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#f59e0b]/40"
          style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.9rem" }}
        />
        <button
          onClick={testClickjacking}
          disabled={testing || !url}
          className="px-6 py-3 rounded-lg transition-all flex items-center gap-2 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#0a0a0f", fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}
        >
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Frame className="w-4 h-4" />}
          Tester
        </button>
      </div>

      {testing && (
        <div className="rounded-lg p-6 text-center" style={{ background: "rgba(17,24,39,0.6)", border: "1px solid rgba(245,158,11,0.15)" }}>
          <Loader2 className="w-8 h-8 text-[#f59e0b] animate-spin mx-auto mb-3" />
          <p className="text-[#f59e0b]" style={{ fontSize: "0.85rem" }}>Test en cours... Tentative de chargement dans une iframe...</p>
        </div>
      )}

      {result && !testing && (
        <div className="rounded-xl p-6" style={{
          background: result.vulnerable ? "rgba(239,68,68,0.06)" : "rgba(57,255,20,0.04)",
          border: `1px solid ${result.vulnerable ? "rgba(239,68,68,0.2)" : "rgba(57,255,20,0.15)"}`,
        }}>
          <div className="flex items-center gap-3 mb-4">
            {result.vulnerable ? (
              <XCircle className="w-8 h-8 text-[#ef4444]" />
            ) : (
              <CheckCircle className="w-8 h-8 text-[#39ff14]" />
            )}
            <div>
              <p className="text-[#e2e8f0]" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1.1rem" }}>
                {result.vulnerable ? "Potentiellement vulnerable" : "Protege"}
              </p>
              <p className="text-[#94a3b8]" style={{ fontSize: "0.82rem" }}>
                {result.vulnerable
                  ? "Le site a pu etre charge dans une iframe. Il pourrait etre vulnerable au clickjacking."
                  : "Le site bloque le chargement en iframe (X-Frame-Options ou CSP frame-ancestors)."}
              </p>
            </div>
          </div>
          {result.vulnerable && (
            <div className="rounded-lg p-3 mt-3" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)" }}>
              <p className="text-[#f59e0b]" style={{ fontSize: "0.78rem", lineHeight: 1.6 }}>
                <strong>Recommandation:</strong> Ajoutez <code className="text-[#ef4444] bg-[#0a0a0f] px-1.5 py-0.5 rounded">X-Frame-Options: DENY</code> ou{" "}
                <code className="text-[#ef4444] bg-[#0a0a0f] px-1.5 py-0.5 rounded">Content-Security-Policy: frame-ancestors 'none'</code> dans vos headers HTTP.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const PYTHON_SCRIPT = `#!/usr/bin/env python3
"""
Clickjacking Tester - CyberGuard
Verifie si un site est vulnerable au clickjacking en analysant les headers HTTP.

Usage:
    python clickjacking_tester.py https://exemple.com
    python clickjacking_tester.py -f urls.txt
"""

import argparse
import json
import sys
import urllib.request
import urllib.error
import ssl

def test_clickjacking(url):
    if not url.startswith("http"):
        url = "https://" + url

    ctx = ssl.create_default_context()
    req = urllib.request.Request(url, method="GET")
    req.add_header("User-Agent", "CyberGuard-Clickjacking/1.0")

    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            headers = {k.lower(): v for k, v in resp.getheaders()}
    except urllib.error.HTTPError as e:
        headers = {k.lower(): v for k, v in e.headers.items()}
    except Exception as e:
        return {"url": url, "error": str(e)}

    x_frame = headers.get("x-frame-options", "").upper()
    csp = headers.get("content-security-policy", "")
    frame_ancestors = ""
    if "frame-ancestors" in csp:
        for part in csp.split(";"):
            if "frame-ancestors" in part:
                frame_ancestors = part.strip()

    protections = []
    vulnerable = True

    if x_frame in ("DENY", "SAMEORIGIN"):
        protections.append(f"X-Frame-Options: {x_frame}")
        vulnerable = False
    if frame_ancestors:
        protections.append(f"CSP {frame_ancestors}")
        if "'none'" in frame_ancestors or "'self'" in frame_ancestors:
            vulnerable = False

    return {
        "url": url,
        "vulnerable": vulnerable,
        "x_frame_options": x_frame or "ABSENT",
        "csp_frame_ancestors": frame_ancestors or "ABSENT",
        "protections": protections,
    }

def main():
    parser = argparse.ArgumentParser(description="Clickjacking Tester - CyberGuard")
    parser.add_argument("url", nargs="?", help="URL a tester")
    parser.add_argument("-f", "--file", help="Fichier d'URLs")
    parser.add_argument("-o", "--output", help="Export JSON")
    args = parser.parse_args()

    urls = []
    if args.file:
        with open(args.file) as f:
            urls = [l.strip() for l in f if l.strip()]
    elif args.url:
        urls = [args.url]
    else:
        parser.print_help()
        sys.exit(1)

    RED = "\\033[91m"
    GREEN = "\\033[92m"
    YELLOW = "\\033[93m"
    RESET = "\\033[0m"

    all_results = []
    for url in urls:
        result = test_clickjacking(url)
        all_results.append(result)

        if "error" in result:
            print(f"  {RED}ERREUR{RESET} {url}: {result['error']}")
            continue

        status = f"{RED}VULNERABLE{RESET}" if result["vulnerable"] else f"{GREEN}PROTEGE{RESET}"
        print(f"  {status}  {url}")
        print(f"    X-Frame-Options: {result['x_frame_options']}")
        print(f"    CSP frame-ancestors: {result['csp_frame_ancestors']}")
        if result["protections"]:
            for p in result["protections"]:
                print(f"    {GREEN}[+] {p}{RESET}")
        if result["vulnerable"]:
            print(f"    {YELLOW}Fix: Ajoutez X-Frame-Options: DENY{RESET}")

    if args.output:
        with open(args.output, "w") as f:
            json.dump(all_results, f, indent=2)

if __name__ == "__main__":
    main()
`;

const README = `# Clickjacking Tester - CyberGuard

Teste si un site est vulnerable au clickjacking via l'analyse des headers HTTP.

## Utilisation
\`\`\`bash
python clickjacking_tester.py https://exemple.com
python clickjacking_tester.py -f urls.txt
\`\`\`

## API requise: Aucune. Analyse les headers HTTP directement.
`;

const GUI_CONFIG: GuiConfig = {
  title: "Clickjacking Tester",
  inputType: "url",
  inputPlaceholder: "https://exemple.com",
  buttonText: "Tester",
  importLine: "from clickjacking_tester import test_clickjacking",
  processCode: `            return test_clickjacking(inp)`,
};

export function ClickjackingTesterPage() {
  return (
    <ToolPageLayout
      title="Clickjacking"
      subtitle="Tester"
      description="Testez si un site est vulnerable au clickjacking. Verification de X-Frame-Options et CSP frame-ancestors."
      disableOnlineTest
      toolSlug="clickjacking_tester"
      icon={Frame}
      color="#f59e0b"
      hubAnchor="clickjacking-tester"
      features={[
        { icon: Frame, title: "Test iframe reel", desc: "Tente de charger le site dans une iframe pour verifier." },
        { icon: Shield, title: "Headers HTTP", desc: "Analyse X-Frame-Options et CSP frame-ancestors." },
        { icon: AlertTriangle, title: "Recommandations", desc: "Propose les headers a ajouter pour se proteger." },
        { icon: Globe, title: "Scan en masse", desc: "Testez des dizaines de sites depuis un fichier." },
        { icon: Eye, title: "Zero API", desc: "Simple requete HTTP. Aucune cle API." },
        { icon: Lock, title: "Export JSON", desc: "Sauvegardez les resultats pour vos rapports." },
      ]}
      requirements={["Python 3.7+", "Aucune dependance", "Connexion internet", "Autorisation sur la cible"]}
      pythonScript={PYTHON_SCRIPT}
      readmeContent={README}
      guiConfig={GUI_CONFIG}
    >
      <ClickjackingTesterTool />
    </ToolPageLayout>
  );
}

export { ClickjackingTesterTool };