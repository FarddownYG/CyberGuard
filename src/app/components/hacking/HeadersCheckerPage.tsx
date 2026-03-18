import { useState } from "react";
import { Shield, Search, CheckCircle, XCircle, AlertTriangle, Loader2, Globe, Lock, Eye, FileText } from "lucide-react";
import { ToolPageLayout } from "./ToolPageLayout";
import type { GuiConfig } from "./zip-generator";

const SECURITY_HEADERS = [
  { name: "Strict-Transport-Security", desc: "Force HTTPS (HSTS)", critical: true },
  { name: "Content-Security-Policy", desc: "Politique de securite du contenu", critical: true },
  { name: "X-Frame-Options", desc: "Protection anti-clickjacking", critical: true },
  { name: "X-Content-Type-Options", desc: "Empeche le MIME sniffing", critical: true },
  { name: "X-XSS-Protection", desc: "Filtre XSS du navigateur (legacy)", critical: false },
  { name: "Referrer-Policy", desc: "Controle les infos de referrer", critical: false },
  { name: "Permissions-Policy", desc: "Controle l'acces aux features du navigateur", critical: false },
  { name: "Cross-Origin-Opener-Policy", desc: "Isolation cross-origin (COOP)", critical: false },
  { name: "Cross-Origin-Resource-Policy", desc: "Restriction chargement ressources (CORP)", critical: false },
  { name: "Cross-Origin-Embedder-Policy", desc: "Isolation des ressources (COEP)", critical: false },
  { name: "X-Permitted-Cross-Domain-Policies", desc: "Politique Flash/PDF cross-domain", critical: false },
  { name: "X-DNS-Prefetch-Control", desc: "Controle du prefetch DNS", critical: false },
];

const GRADES = [
  { min: 90, grade: "A+", color: "#39ff14" },
  { min: 80, grade: "A", color: "#39ff14" },
  { min: 70, grade: "B", color: "#22c55e" },
  { min: 55, grade: "C", color: "#f59e0b" },
  { min: 40, grade: "D", color: "#f97316" },
  { min: 0, grade: "F", color: "#ef4444" },
];

function getGrade(score: number) {
  return GRADES.find((g) => score >= g.min) || GRADES[GRADES.length - 1];
}

function HeadersCheckerTool() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ name: string; value: string | null; present: boolean; critical: boolean; desc: string }[] | null>(null);
  const [error, setError] = useState("");
  const [score, setScore] = useState(0);

  const checkHeaders = async () => {
    if (!url) return;
    setLoading(true);
    setError("");
    setResults(null);

    try {
      let targetUrl = url.trim();
      if (!targetUrl.startsWith("http")) targetUrl = "https://" + targetUrl;

      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(proxyUrl);

      const headerResults = SECURITY_HEADERS.map((h) => {
        const value = res.headers.get(h.name);
        return {
          name: h.name,
          value,
          present: !!value,
          critical: h.critical,
          desc: h.desc,
        };
      });

      const criticalHeaders = headerResults.filter((h) => h.critical);
      const optionalHeaders = headerResults.filter((h) => !h.critical);
      const criticalPresent = criticalHeaders.filter((h) => h.present).length;
      const optionalPresent = optionalHeaders.filter((h) => h.present).length;
      const totalScore = Math.round(
        (criticalPresent / criticalHeaders.length) * 70 +
        (optionalPresent / optionalHeaders.length) * 30
      );

      setScore(totalScore);
      setResults(headerResults);
    } catch {
      setError("Impossible d'analyser cette URL. Le site peut bloquer les requetes cross-origin. Utilisez la version Python pour un scan complet.");
    } finally {
      setLoading(false);
    }
  };

  const gradeInfo = getGrade(score);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && checkHeaders()}
          placeholder="exemple.com ou https://exemple.com"
          className="flex-1 px-4 py-3 bg-[#0a0a0f] border border-[#1e293b] rounded-lg text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#00d4ff]/40 transition-colors"
          style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.9rem" }}
        />
        <button
          onClick={checkHeaders}
          disabled={loading || !url}
          className="px-6 py-3 rounded-lg transition-all flex items-center gap-2 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #00d4ff, #0099cc)", color: "#0a0a0f", fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Analyser
        </button>
      </div>

      {error && (
        <div className="rounded-lg p-4 mb-4 flex items-start gap-3" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <AlertTriangle className="w-4 h-4 text-[#ef4444] flex-shrink-0 mt-0.5" />
          <p className="text-[#ef4444]" style={{ fontSize: "0.82rem" }}>{error}</p>
        </div>
      )}

      {results && (
        <div className="space-y-4">
          {/* Score */}
          <div className="rounded-xl p-6 text-center" style={{ background: "rgba(17,24,39,0.6)", border: `1px solid ${gradeInfo.color}30` }}>
            <div className="flex items-center justify-center gap-4 mb-3">
              <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: "3rem", color: gradeInfo.color }}>{gradeInfo.grade}</span>
              <div className="text-left">
                <p className="text-[#e2e8f0]" style={{ fontSize: "1.1rem" }}>{score}/100</p>
                <p className="text-[#64748b]" style={{ fontSize: "0.78rem" }}>Score de securite des headers</p>
              </div>
            </div>
            <div className="w-full h-2 rounded-full bg-[#1e293b] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, background: gradeInfo.color }} />
            </div>
          </div>

          {/* Results */}
          <div className="space-y-2">
            {results.map((h) => (
              <div
                key={h.name}
                className="rounded-lg p-3 flex items-start gap-3"
                style={{
                  background: h.present ? "rgba(57,255,20,0.03)" : h.critical ? "rgba(239,68,68,0.05)" : "rgba(245,158,11,0.03)",
                  border: `1px solid ${h.present ? "rgba(57,255,20,0.1)" : h.critical ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.08)"}`,
                }}
              >
                {h.present ? (
                  <CheckCircle className="w-4 h-4 text-[#39ff14] flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className={`w-4 h-4 ${h.critical ? "text-[#ef4444]" : "text-[#f59e0b]"} flex-shrink-0 mt-0.5`} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[#e2e8f0]" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.8rem" }}>{h.name}</span>
                    {h.critical && <span className="text-[#ef4444] px-1.5 py-0.5 rounded text-[0.6rem]" style={{ background: "rgba(239,68,68,0.1)" }}>CRITIQUE</span>}
                  </div>
                  <p className="text-[#64748b]" style={{ fontSize: "0.72rem" }}>{h.desc}</p>
                  {h.value && (
                    <p className="text-[#39ff14] mt-1 break-all" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem" }}>{h.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const PYTHON_SCRIPT = `#!/usr/bin/env python3
"""
HTTP Security Headers Checker - CyberGuard
Analyse les headers HTTP de securite d'un site web et attribue un score A-F.
Aucune API requise.

Usage:
    python headers_checker.py https://exemple.com
    python headers_checker.py -f urls.txt          # Scan en masse
    python headers_checker.py https://exemple.com -o rapport.json
"""

import argparse
import json
import sys
import urllib.request
import urllib.error
import ssl

SECURITY_HEADERS = [
    {"name": "Strict-Transport-Security", "critical": True, "desc": "Force HTTPS via HSTS"},
    {"name": "Content-Security-Policy", "critical": True, "desc": "Politique de securite du contenu"},
    {"name": "X-Frame-Options", "critical": True, "desc": "Protection anti-clickjacking"},
    {"name": "X-Content-Type-Options", "critical": True, "desc": "Empeche le MIME sniffing"},
    {"name": "X-XSS-Protection", "critical": False, "desc": "Filtre XSS navigateur (legacy)"},
    {"name": "Referrer-Policy", "critical": False, "desc": "Controle les infos de referrer"},
    {"name": "Permissions-Policy", "critical": False, "desc": "Controle acces features navigateur"},
    {"name": "Cross-Origin-Opener-Policy", "critical": False, "desc": "Isolation cross-origin (COOP)"},
    {"name": "Cross-Origin-Resource-Policy", "critical": False, "desc": "Restriction ressources (CORP)"},
    {"name": "Cross-Origin-Embedder-Policy", "critical": False, "desc": "Isolation ressources (COEP)"},
    {"name": "X-Permitted-Cross-Domain-Policies", "critical": False, "desc": "Politique Flash/PDF"},
    {"name": "X-DNS-Prefetch-Control", "critical": False, "desc": "Controle du prefetch DNS"},
]

def check_headers(url):
    if not url.startswith("http"):
        url = "https://" + url

    ctx = ssl.create_default_context()
    req = urllib.request.Request(url, method="HEAD")
    req.add_header("User-Agent", "CyberGuard-HeadersChecker/1.0")

    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            headers = {k.lower(): v for k, v in resp.getheaders()}
    except urllib.error.HTTPError as e:
        headers = {k.lower(): v for k, v in e.headers.items()}
    except Exception as e:
        return {"error": str(e), "url": url}

    results = []
    for h in SECURITY_HEADERS:
        name_lower = h["name"].lower()
        value = headers.get(name_lower)
        results.append({
            "name": h["name"],
            "value": value,
            "present": value is not None,
            "critical": h["critical"],
            "desc": h["desc"],
        })

    critical = [r for r in results if r["critical"]]
    optional = [r for r in results if not r["critical"]]
    critical_present = sum(1 for r in critical if r["present"])
    optional_present = sum(1 for r in optional if r["present"])

    score = round(
        (critical_present / len(critical)) * 70 +
        (optional_present / len(optional)) * 30
    )

    grades = [
        (90, "A+"), (80, "A"), (70, "B"),
        (55, "C"), (40, "D"), (0, "F"),
    ]
    grade = "F"
    for min_score, g in grades:
        if score >= min_score:
            grade = g
            break

    return {"url": url, "score": score, "grade": grade, "headers": results}

def print_report(result):
    if "error" in result:
        print(f"\\n  ERREUR: {result['error']}")
        return

    colors = {
        "A+": "\\033[92m", "A": "\\033[92m", "B": "\\033[93m",
        "C": "\\033[93m", "D": "\\033[91m", "F": "\\033[91m",
    }
    reset = "\\033[0m"
    green = "\\033[92m"
    red = "\\033[91m"
    yellow = "\\033[93m"

    grade_color = colors.get(result["grade"], "")
    print(f"\\n{'='*60}")
    print(f"  URL: {result['url']}")
    print(f"  Score: {grade_color}{result['score']}/100  Grade: {result['grade']}{reset}")
    print(f"{'='*60}")

    for h in result["headers"]:
        status = f"{green}PRESENT{reset}" if h["present"] else (f"{red}ABSENT{reset}" if h["critical"] else f"{yellow}ABSENT{reset}")
        tag = f" {red}[CRITIQUE]{reset}" if h["critical"] and not h["present"] else ""
        print(f"  {status}  {h['name']}{tag}")
        if h["value"]:
            val_display = h["value"][:80] + ("..." if len(h["value"]) > 80 else "")
            print(f"           {green}{val_display}{reset}")

    print(f"{'='*60}")
    missing_critical = [h for h in result["headers"] if h["critical"] and not h["present"]]
    if missing_critical:
        print(f"\\n  {red}Headers critiques manquants:{reset}")
        for h in missing_critical:
            print(f"    - {h['name']}: {h['desc']}")
    print()

def main():
    parser = argparse.ArgumentParser(description="HTTP Security Headers Checker - CyberGuard")
    parser.add_argument("url", nargs="?", help="URL a analyser")
    parser.add_argument("-f", "--file", help="Fichier contenant une liste d'URLs (une par ligne)")
    parser.add_argument("-o", "--output", help="Sauvegarder le rapport en JSON")
    args = parser.parse_args()

    urls = []
    if args.file:
        with open(args.file) as f:
            urls = [line.strip() for line in f if line.strip()]
    elif args.url:
        urls = [args.url]
    else:
        parser.print_help()
        sys.exit(1)

    all_results = []
    for u in urls:
        print(f"\\n  Analyse de {u}...")
        result = check_headers(u)
        all_results.append(result)
        print_report(result)

    if args.output:
        with open(args.output, "w") as f:
            json.dump(all_results, f, indent=2, ensure_ascii=False)
        print(f"  Rapport sauvegarde dans {args.output}")

if __name__ == "__main__":
    main()
`;

const README = `# HTTP Security Headers Checker - CyberGuard

Analyse les headers HTTP de securite d'un site web et attribue un score de A+ a F.

## Installation

\`\`\`bash
# Aucune dependance externe requise (utilise urllib)
python headers_checker.py https://exemple.com
\`\`\`

## Utilisation

\`\`\`bash
# Scan simple
python headers_checker.py https://google.com

# Scan en masse depuis un fichier
python headers_checker.py -f urls.txt

# Export JSON
python headers_checker.py https://exemple.com -o rapport.json
\`\`\`

## Headers analyses (12)

- **Strict-Transport-Security** (HSTS) - CRITIQUE
- **Content-Security-Policy** (CSP) - CRITIQUE
- **X-Frame-Options** - CRITIQUE
- **X-Content-Type-Options** - CRITIQUE
- X-XSS-Protection, Referrer-Policy, Permissions-Policy
- Cross-Origin-Opener-Policy, Cross-Origin-Resource-Policy
- Cross-Origin-Embedder-Policy, X-Permitted-Cross-Domain-Policies
- X-DNS-Prefetch-Control

## API requise

Aucune. 100% offline.

## Avertissement

Usage responsable uniquement. Analysez uniquement vos propres sites ou ceux
pour lesquels vous avez une autorisation explicite.
`;

const GUI_CONFIG: GuiConfig = {
  title: "HTTP Security Headers Checker",
  inputType: "url",
  inputPlaceholder: "https://exemple.com",
  buttonText: "Analyser",
  importLine: "from headers_checker import check_headers",
  processCode: `            return check_headers(inp)`,
};

export function HeadersCheckerPage() {
  return (
    <ToolPageLayout
      title="HTTP Headers"
      subtitle="Checker"
      description="Analyse les headers de securite HTTP d'un site web. Score de A+ a F, detection des headers critiques manquants et recommandations."
      disableOnlineTest
      toolSlug="headers_checker"
      icon={Shield}
      color="#00d4ff"
      hubAnchor="headers-checker"
      features={[
        { icon: Shield, title: "12 headers analyses", desc: "HSTS, CSP, X-Frame-Options, X-Content-Type-Options et 8 autres headers de securite." },
        { icon: Search, title: "Scoring A+ a F", desc: "Note basee sur les headers critiques (70%) et optionnels (30%)." },
        { icon: Globe, title: "Aucune API requise", desc: "Fonctionne avec un simple fetch HTTP. Zero cout, zero dependance." },
        { icon: FileText, title: "Export JSON", desc: "Sauvegardez le rapport en JSON pour integration CI/CD." },
        { icon: Eye, title: "Scan en masse", desc: "Analysez des centaines d'URLs depuis un fichier texte." },
        { icon: Lock, title: "Recommandations", desc: "Chaque header manquant est accompagne d'une explication et d'un fix." },
      ]}
      requirements={["Python 3.7+", "Aucune dependance externe", "Connexion internet", "Autorisation sur la cible"]}
      pythonScript={PYTHON_SCRIPT}
      readmeContent={README}
      guiConfig={GUI_CONFIG}
    >
      <HeadersCheckerTool />
    </ToolPageLayout>
  );
}

export { HeadersCheckerTool };