import { useState } from "react";
import { ShieldCheck, AlertTriangle, CheckCircle, XCircle, Info, Shield, Code, Lock, Eye, Zap } from "lucide-react";
import { ToolPageLayout } from "./ToolPageLayout";
import type { GuiConfig } from "./zip-generator";

interface CspIssue {
  severity: "critical" | "warning" | "info";
  directive: string;
  message: string;
}

function evaluateCsp(csp: string): CspIssue[] {
  const issues: CspIssue[] = [];
  const directives = new Map<string, string>();

  csp.split(";").forEach((d) => {
    const parts = d.trim().split(/\s+/);
    if (parts.length >= 1) directives.set(parts[0].toLowerCase(), parts.slice(1).join(" "));
  });

  // Missing directives
  if (!directives.has("default-src")) issues.push({ severity: "critical", directive: "default-src", message: "Directive default-src absente. Aucune politique de fallback." });
  if (!directives.has("script-src") && !directives.has("default-src")) issues.push({ severity: "critical", directive: "script-src", message: "Aucune restriction sur les scripts. XSS possible." });
  if (!directives.has("object-src")) issues.push({ severity: "warning", directive: "object-src", message: "object-src non defini. Les plugins Flash/Java peuvent etre charges." });
  if (!directives.has("base-uri")) issues.push({ severity: "warning", directive: "base-uri", message: "base-uri non defini. Un attaquant pourrait modifier la base URL." });
  if (!directives.has("frame-ancestors")) issues.push({ severity: "warning", directive: "frame-ancestors", message: "frame-ancestors non defini. Clickjacking possible." });
  if (!directives.has("form-action")) issues.push({ severity: "info", directive: "form-action", message: "form-action non defini. Les formulaires peuvent soumettre vers n'importe quel domaine." });
  if (!directives.has("style-src") && !directives.has("default-src")) issues.push({ severity: "warning", directive: "style-src", message: "style-src non defini. Les styles inline sont autorises par defaut." });
  if (!directives.has("img-src") && !directives.has("default-src")) issues.push({ severity: "info", directive: "img-src", message: "img-src non defini. Les images peuvent etre chargees depuis n'importe quelle source." });
  if (!directives.has("connect-src") && !directives.has("default-src")) issues.push({ severity: "info", directive: "connect-src", message: "connect-src non defini. Les requetes AJAX/WebSocket/fetch sont non restreintes." });
  if (!directives.has("font-src") && !directives.has("default-src")) issues.push({ severity: "info", directive: "font-src", message: "font-src non defini. Les polices peuvent etre chargees depuis n'importe quelle source." });
  if (!directives.has("media-src") && !directives.has("default-src")) issues.push({ severity: "info", directive: "media-src", message: "media-src non defini. Audio/Video non restreints." });
  if (!directives.has("worker-src") && !directives.has("default-src")) issues.push({ severity: "info", directive: "worker-src", message: "worker-src non defini. Les Web Workers ne sont pas restreints." });
  if (!directives.has("child-src") && !directives.has("default-src")) issues.push({ severity: "info", directive: "child-src", message: "child-src non defini. Les iframes enfants ne sont pas restreintes." });

  // Dangerous values
  const allValues = csp.toLowerCase();
  if (allValues.includes("'unsafe-inline'")) issues.push({ severity: "critical", directive: "unsafe-inline", message: "'unsafe-inline' detecte. Les scripts inline sont autorises — XSS trivial." });
  if (allValues.includes("'unsafe-eval'")) issues.push({ severity: "critical", directive: "unsafe-eval", message: "'unsafe-eval' detecte. eval(), Function(), setTimeout(string) sont autorises." });
  if (allValues.includes("'unsafe-hashes'")) issues.push({ severity: "warning", directive: "unsafe-hashes", message: "'unsafe-hashes' detecte. Les event handlers inline sont autorises." });
  if (allValues.includes("data:") && (allValues.includes("script-src") || allValues.includes("default-src"))) {
    issues.push({ severity: "critical", directive: "data:", message: "data: URI autorise dans script-src. Permet d'injecter du JavaScript via data:text/html." });
  }
  if (allValues.includes("data:") && allValues.includes("img-src")) {
    issues.push({ severity: "info", directive: "data: (img)", message: "data: URI autorise dans img-src. Generalement acceptable pour les images inline." });
  }
  if (/ \*[ ;]|: \*[ ;]| \*$/.test(allValues)) issues.push({ severity: "critical", directive: "wildcard *", message: "Wildcard '*' detecte. Toute source est autorisee — CSP inefficace." });
  if (allValues.includes("http:")) issues.push({ severity: "warning", directive: "http:", message: "Sources HTTP autorisees. Preferez HTTPS pour eviter le MITM." });
  if (allValues.includes("blob:") && (allValues.includes("script-src") || allValues.includes("default-src"))) {
    issues.push({ severity: "critical", directive: "blob:", message: "blob: URI dans script-src. Permet d'executer du JS via Blob URLs." });
  }

  // Best practices
  if (!directives.has("upgrade-insecure-requests")) issues.push({ severity: "info", directive: "upgrade-insecure-requests", message: "upgrade-insecure-requests absent. Les sous-ressources HTTP ne seront pas automatiquement upgradees en HTTPS." });
  if (!directives.has("block-all-mixed-content")) {
    if (!directives.has("upgrade-insecure-requests")) {
      issues.push({ severity: "info", directive: "block-all-mixed-content", message: "block-all-mixed-content absent. Le contenu mixte HTTP/HTTPS peut etre charge." });
    }
  }
  if (directives.has("report-uri") && !directives.has("report-to")) {
    issues.push({ severity: "info", directive: "report-uri", message: "report-uri est deprecie. Utilisez report-to a la place (ou les deux pour compatibilite)." });
  }

  // Nonce/hash analysis
  const hasNonce = /'nonce-[^']+'/i.test(csp);
  const hasHash = /'sha256-[^']+'/i.test(csp) || /'sha384-[^']+'/i.test(csp) || /'sha512-[^']+'/i.test(csp);
  if (hasNonce) issues.push({ severity: "info", directive: "nonce", message: "Nonce detecte. Bonne pratique si genere aleatoirement a chaque requete." });
  if (hasHash) issues.push({ severity: "info", directive: "hash", message: "Hash de script detecte. Approche stricte et recommandee." });
  if (hasNonce && allValues.includes("'unsafe-inline'")) {
    issues.push({ severity: "warning", directive: "nonce+unsafe-inline", message: "Nonce ET unsafe-inline presents. Le nonce est ignore dans les anciens navigateurs, unsafe-inline prendrait le relais." });
  }
  if (allValues.includes("'strict-dynamic'")) {
    issues.push({ severity: "info", directive: "strict-dynamic", message: "'strict-dynamic' detecte. Les scripts charges par des scripts de confiance sont autorises. Approche moderne." });
  }

  // Sandbox check
  if (directives.has("sandbox")) {
    const sandboxVal = directives.get("sandbox") || "";
    if (sandboxVal.includes("allow-scripts") && sandboxVal.includes("allow-same-origin")) {
      issues.push({ severity: "critical", directive: "sandbox", message: "sandbox avec allow-scripts + allow-same-origin = le sandbox peut etre echappe. Extremement dangereux." });
    } else {
      issues.push({ severity: "info", directive: "sandbox", message: "Directive sandbox presente. Restriction forte sur la page." });
    }
  }

  // Bypasses connus
  if (allValues.includes("cdn.jsdelivr.net") || allValues.includes("cdnjs.cloudflare.com") || allValues.includes("unpkg.com")) {
    issues.push({ severity: "warning", directive: "CDN bypass", message: "CDN public autorise (jsdelivr/cdnjs/unpkg). Ces CDNs peuvent servir des scripts malveillants." });
  }
  if (allValues.includes("google.com") || allValues.includes("googleapis.com")) {
    issues.push({ severity: "info", directive: "Google bypass", message: "Domaines Google autorises. Certains endpoints Google sont connus pour des bypasses CSP (JSONP)." });
  }
  if (allValues.includes("accounts.google.com") || allValues.includes("www.google.com/recaptcha")) {
    issues.push({ severity: "info", directive: "Google services", message: "Services Google detectes (reCAPTCHA, OAuth). Necessaire mais elargit la surface d'attaque." });
  }
  if (allValues.includes("ajax.googleapis.com") || allValues.includes("cdn.google.com")) {
    issues.push({ severity: "warning", directive: "Google CDN", message: "Google CDN autorise. Certaines librairies hebergees peuvent etre utilisees pour des bypasses." });
  }
  if (allValues.includes("raw.githubusercontent.com") || allValues.includes("gist.githubusercontent.com")) {
    issues.push({ severity: "critical", directive: "GitHub raw", message: "GitHub raw content autorise. N'importe qui peut heberger du JS malveillant sur GitHub." });
  }
  if (allValues.includes("pastebin.com")) {
    issues.push({ severity: "critical", directive: "Pastebin", message: "Pastebin autorise. Source connue pour heberger du code malveillant." });
  }

  if (issues.length === 0) issues.push({ severity: "info", directive: "CSP", message: "Aucun probleme majeur detecte. La politique semble correcte." });

  return issues;
}

function CspEvaluatorTool() {
  const [csp, setCsp] = useState("");
  const [issues, setIssues] = useState<CspIssue[] | null>(null);

  const handleEvaluate = () => {
    if (!csp) return;
    setIssues(evaluateCsp(csp));
  };

  const criticals = issues?.filter((i) => i.severity === "critical").length || 0;
  const warnings = issues?.filter((i) => i.severity === "warning").length || 0;

  return (
    <div>
      <textarea
        value={csp}
        onChange={(e) => setCsp(e.target.value)}
        placeholder="Collez votre politique CSP ici... (ex: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline')"
        rows={4}
        className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#1e293b] rounded-lg text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#22c55e]/40 transition-colors mb-4 resize-none"
        style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem" }}
      />
      <button
        onClick={handleEvaluate}
        disabled={!csp}
        className="px-6 py-3 rounded-lg transition-all flex items-center gap-2 disabled:opacity-40 mb-6"
        style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#0a0a0f", fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}
      >
        <ShieldCheck className="w-4 h-4" /> Evaluer la CSP
      </button>

      {issues && (
        <div className="space-y-3">
          <div className="rounded-lg p-4 flex items-center gap-4" style={{ background: "rgba(17,24,39,0.6)", border: "1px solid rgba(255,255,255,0.05)" }}>
            {criticals > 0 && <span className="text-[#ef4444]" style={{ fontSize: "0.85rem" }}>{criticals} critique{criticals > 1 ? "s" : ""}</span>}
            {warnings > 0 && <span className="text-[#f59e0b]" style={{ fontSize: "0.85rem" }}>{warnings} warning{warnings > 1 ? "s" : ""}</span>}
            {criticals === 0 && warnings === 0 && <span className="text-[#39ff14]" style={{ fontSize: "0.85rem" }}>Politique solide</span>}
          </div>

          {issues.map((issue, i) => (
            <div
              key={i}
              className="rounded-lg p-3 flex items-start gap-3"
              style={{
                background: issue.severity === "critical" ? "rgba(239,68,68,0.04)" : issue.severity === "warning" ? "rgba(245,158,11,0.04)" : "rgba(0,212,255,0.03)",
                border: `1px solid ${issue.severity === "critical" ? "rgba(239,68,68,0.12)" : issue.severity === "warning" ? "rgba(245,158,11,0.1)" : "rgba(0,212,255,0.08)"}`,
              }}
            >
              {issue.severity === "critical" ? <XCircle className="w-4 h-4 text-[#ef4444] flex-shrink-0 mt-0.5" /> :
               issue.severity === "warning" ? <AlertTriangle className="w-4 h-4 text-[#f59e0b] flex-shrink-0 mt-0.5" /> :
               <Info className="w-4 h-4 text-[#00d4ff] flex-shrink-0 mt-0.5" />}
              <div>
                <span className="text-[#e2e8f0]" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.78rem" }}>{issue.directive}</span>
                <p className="text-[#94a3b8]" style={{ fontSize: "0.78rem", lineHeight: 1.5 }}>{issue.message}</p>
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
CSP Evaluator - CyberGuard
Analyse une politique Content-Security-Policy et detecte les failles.

Usage:
    python csp_evaluator.py "default-src 'self'; script-src 'unsafe-inline'"
    python csp_evaluator.py --url https://exemple.com
    python csp_evaluator.py -f csp.txt
"""

import argparse
import json
import sys
import re

try:
    import urllib.request
    HAS_URLLIB = True
except ImportError:
    HAS_URLLIB = False

def evaluate_csp(csp):
    issues = []
    directives = {}
    for part in csp.split(";"):
        part = part.strip()
        if not part:
            continue
        tokens = part.split()
        if tokens:
            directives[tokens[0].lower()] = " ".join(tokens[1:])

    csp_lower = csp.lower()

    # Missing critical directives
    if "default-src" not in directives:
        issues.append(("CRITICAL", "default-src", "Directive default-src absente"))
    if "script-src" not in directives and "default-src" not in directives:
        issues.append(("CRITICAL", "script-src", "Aucune restriction sur les scripts"))
    if "object-src" not in directives:
        issues.append(("WARNING", "object-src", "object-src non defini - plugins autorisés"))
    if "base-uri" not in directives:
        issues.append(("WARNING", "base-uri", "base-uri non defini"))
    if "frame-ancestors" not in directives:
        issues.append(("WARNING", "frame-ancestors", "Clickjacking possible"))
    if "form-action" not in directives:
        issues.append(("INFO", "form-action", "form-action non defini"))
    if "style-src" not in directives and "default-src" not in directives:
        issues.append(("WARNING", "style-src", "style-src non defini - styles inline autorises par defaut"))
    if "img-src" not in directives and "default-src" not in directives:
        issues.append(("INFO", "img-src", "img-src non defini - images peuvent etre chargees depuis n'importe quelle source"))
    if "connect-src" not in directives and "default-src" not in directives:
        issues.append(("INFO", "connect-src", "connect-src non defini - requetes AJAX/WebSocket/fetch sont non restreintes"))
    if "font-src" not in directives and "default-src" not in directives:
        issues.append(("INFO", "font-src", "font-src non defini - polices peuvent etre chargees depuis n'importe quelle source"))
    if "media-src" not in directives and "default-src" not in directives:
        issues.append(("INFO", "media-src", "media-src non defini - audio/video non restreints"))
    if "worker-src" not in directives and "default-src" not in directives:
        issues.append(("INFO", "worker-src", "worker-src non defini - Web Workers ne sont pas restreints"))
    if "child-src" not in directives and "default-src" not in directives:
        issues.append(("INFO", "child-src", "child-src non defini - iframes enfants ne sont pas restreintes"))

    # Dangerous values
    if "'unsafe-inline'" in csp_lower:
        issues.append(("CRITICAL", "unsafe-inline", "Scripts inline autorises - XSS trivial"))
    if "'unsafe-eval'" in csp_lower:
        issues.append(("CRITICAL", "unsafe-eval", "eval() autorise"))
    if "'unsafe-hashes'" in csp_lower:
        issues.append(("WARNING", "unsafe-hashes", "Event handlers inline autorises"))
    if "data:" in csp_lower and ("script-src" in csp_lower or "default-src" in csp_lower):
        issues.append(("CRITICAL", "data:", "data: URI dans script-src"))
    if "data:" in csp_lower and "img-src" in csp_lower:
        issues.append(("INFO", "data: (img)", "data: URI dans img-src - generalement acceptable pour les images inline"))
    if re.search(r'[: ]\*[ ;$]', csp_lower) or csp_lower.strip().endswith("*"):
        issues.append(("CRITICAL", "wildcard", "Wildcard * detecte - CSP inefficace"))
    if "http:" in csp_lower:
        issues.append(("WARNING", "http:", "Sources HTTP autorisees"))
    if "blob:" in csp_lower and ("script-src" in csp_lower or "default-src" in csp_lower):
        issues.append(("CRITICAL", "blob:", "blob: URI dans script-src"))

    # Best practices
    if "upgrade-insecure-requests" not in directives:
        issues.append(("INFO", "upgrade-insecure-requests", "upgrade-insecure-requests absent - sous-ressources HTTP ne seront pas automatiquement upgradees en HTTPS"))
    if "block-all-mixed-content" not in directives:
        if "upgrade-insecure-requests" not in directives:
            issues.append(("INFO", "block-all-mixed-content", "block-all-mixed-content absent - contenu mixte HTTP/HTTPS peut etre charge"))
    if "report-uri" in directives and "report-to" not in directives:
        issues.append(("INFO", "report-uri", "report-uri est deprecie - utilisez report-to a la place (ou les deux pour compatibilite)"))

    # Nonce/hash analysis
    has_nonce = re.search(r"'nonce-[^']+'", csp_lower)
    has_hash = re.search(r"'sha256-[^']+'", csp_lower) or re.search(r"'sha384-[^']+'", csp_lower) or re.search(r"'sha512-[^']+'", csp_lower)
    if has_nonce:
        issues.append(("INFO", "nonce", "Nonce detecte - bonne pratique si genere aleatoirement a chaque requete"))
    if has_hash:
        issues.append(("INFO", "hash", "Hash de script detecte - approche stricte et recommandee"))
    if has_nonce and "'unsafe-inline'" in csp_lower:
        issues.append(("WARNING", "nonce+unsafe-inline", "Nonce ET unsafe-inline presents - le nonce est ignore dans les anciens navigateurs, unsafe-inline prendrait le relais"))
    if "'strict-dynamic'" in csp_lower:
        issues.append(("INFO", "strict-dynamic", "'strict-dynamic' detecte - scripts charges par des scripts de confiance sont autorises - approche moderne"))

    # Sandbox check
    if "sandbox" in directives:
        sandbox_val = directives["sandbox"]
        if "allow-scripts" in sandbox_val and "allow-same-origin" in sandbox_val:
            issues.append(("CRITICAL", "sandbox", "sandbox avec allow-scripts + allow-same-origin = le sandbox peut etre echappe - extremement dangereux"))
        else:
            issues.append(("INFO", "sandbox", "Directive sandbox presente - restriction forte sur la page"))

    # Known bypasses
    bypass_cdns = ["cdn.jsdelivr.net", "cdnjs.cloudflare.com", "unpkg.com", "rawgit.com"]
    for cdn in bypass_cdns:
        if cdn in csp_lower:
            issues.append(("WARNING", f"CDN: {cdn}", f"{cdn} autorise - bypass CSP possible"))

    return issues

def fetch_csp(url):
    if not HAS_URLLIB:
        return None
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "CyberGuard-CSP/1.0")
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.headers.get("Content-Security-Policy")

def main():
    parser = argparse.ArgumentParser(description="CSP Evaluator - CyberGuard")
    parser.add_argument("csp", nargs="?", help="Politique CSP a analyser")
    parser.add_argument("--url", help="URL pour extraire la CSP")
    parser.add_argument("-f", "--file", help="Fichier contenant la CSP")
    parser.add_argument("-o", "--output", help="Export JSON")
    args = parser.parse_args()

    csp = None
    if args.url:
        csp = fetch_csp(args.url)
        if not csp:
            print("\\033[91mAucune CSP trouvee pour cette URL\\033[0m")
            sys.exit(1)
        print(f"CSP de {args.url}:")
        print(f"  {csp[:100]}...")
    elif args.file:
        with open(args.file) as f:
            csp = f.read().strip()
    elif args.csp:
        csp = args.csp
    else:
        parser.print_help()
        sys.exit(1)

    issues = evaluate_csp(csp)

    RED = "\\033[91m"
    YELLOW = "\\033[93m"
    CYAN = "\\033[96m"
    GREEN = "\\033[92m"
    RESET = "\\033[0m"

    colors = {"CRITICAL": RED, "WARNING": YELLOW, "INFO": CYAN}

    print(f"\\n{'='*60}")
    criticals = sum(1 for i in issues if i[0] == "CRITICAL")
    warnings = sum(1 for i in issues if i[0] == "WARNING")
    print(f"  {RED}{criticals} critiques{RESET} | {YELLOW}{warnings} warnings{RESET}")
    print(f"{'='*60}")

    for severity, directive, message in issues:
        color = colors.get(severity, "")
        print(f"  {color}[{severity}]{RESET} {directive}: {message}")

    if not issues:
        print(f"  {GREEN}Aucun probleme detecte{RESET}")

    if args.output:
        with open(args.output, "w") as f:
            json.dump([{"severity": s, "directive": d, "message": m} for s, d, m in issues], f, indent=2)

if __name__ == "__main__":
    main()
`;

const README = `# CSP Evaluator - CyberGuard

Analyse une Content-Security-Policy et detecte les failles de configuration.

## Utilisation
\`\`\`bash
python csp_evaluator.py "default-src 'self'; script-src 'unsafe-inline'"
python csp_evaluator.py --url https://google.com
\`\`\`

## Detections: unsafe-inline, unsafe-eval, wildcard, CDN bypasses, directives manquantes
## API requise: Aucune. 100% offline.
`;

const GUI_CONFIG: GuiConfig = {
  title: "CSP Evaluator",
  inputType: "text",
  inputPlaceholder: "default-src 'self'; script-src 'self' 'unsafe-inline'...",
  buttonText: "Evaluer",
  importLine: "from csp_evaluator import evaluate_csp",
  processCode: `            return evaluate_csp(inp)`,
};

export function CspEvaluatorPage() {
  return (
    <ToolPageLayout
      title="CSP"
      subtitle="Evaluator"
      description="Analysez votre Content-Security-Policy et detectez les failles: unsafe-inline, eval, wildcards, bypasses CDN et directives manquantes."
      toolSlug="csp_evaluator"
      icon={ShieldCheck}
      color="#22c55e"
      hubAnchor="csp-evaluator"
      features={[
        { icon: Shield, title: "Analyse complete", desc: "Verifie toutes les directives CSP critiques et optionnelles." },
        { icon: AlertTriangle, title: "Bypass CDN", desc: "Detecte les CDNs publics connus pour des bypasses CSP." },
        { icon: Code, title: "unsafe-inline/eval", desc: "Alerte sur les valeurs dangereuses qui annulent la CSP." },
        { icon: Eye, title: "Scoring", desc: "Compte les problemes critiques, warnings et informations." },
        { icon: Lock, title: "100% offline", desc: "Tout est analyse localement. Votre CSP reste privee." },
        { icon: Zap, title: "Fetch automatique", desc: "La version Python peut extraire la CSP directement depuis une URL." },
      ]}
      requirements={["Python 3.7+", "Aucune dependance externe", "Fonctionne 100% offline", "Supporte analyse par URL"]}
      pythonScript={PYTHON_SCRIPT}
      readmeContent={README}
      guiConfig={GUI_CONFIG}
    >
      <CspEvaluatorTool />
    </ToolPageLayout>
  );
}

export { CspEvaluatorTool };