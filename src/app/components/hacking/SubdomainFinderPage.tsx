import { useState } from "react";
import { Globe, Search, Loader2, CheckCircle, AlertTriangle, Shield, Eye, FileText, Zap, Code } from "lucide-react";
import { ToolPageLayout } from "./ToolPageLayout";
import type { GuiConfig } from "./zip-generator";

interface SubdomainResult {
  name: string;
  issuer: string;
  notBefore: string;
  notAfter: string;
}

function SubdomainFinderTool() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SubdomainResult[] | null>(null);
  const [error, setError] = useState("");

  const findSubdomains = async () => {
    if (!domain) return;
    setLoading(true);
    setError("");
    setResults(null);

    try {
      const cleanDomain = domain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
      const res = await fetch(`https://crt.sh/?q=%25.${cleanDomain}&output=json`);
      if (!res.ok) throw new Error("Erreur API crt.sh");

      const data = await res.json();
      const seen = new Set<string>();
      const subdomains: SubdomainResult[] = [];

      for (const cert of data) {
        const names = (cert.name_value || "").split("\n");
        for (const name of names) {
          const clean = name.trim().toLowerCase().replace(/^\*\./, "");
          if (clean && clean.includes(cleanDomain) && !seen.has(clean)) {
            seen.add(clean);
            subdomains.push({
              name: clean,
              issuer: cert.issuer_name || "N/A",
              notBefore: cert.not_before || "",
              notAfter: cert.not_after || "",
            });
          }
        }
      }

      subdomains.sort((a, b) => a.name.localeCompare(b.name));
      setResults(subdomains);
    } catch {
      setError("Impossible de contacter crt.sh. Reessayez ou utilisez la version Python.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && findSubdomains()}
          placeholder="exemple.com"
          className="flex-1 px-4 py-3 bg-[#0a0a0f] border border-[#1e293b] rounded-lg text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#f97316]/40"
          style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.9rem" }}
        />
        <button
          onClick={findSubdomains}
          disabled={loading || !domain}
          className="px-6 py-3 rounded-lg transition-all flex items-center gap-2 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", color: "#fff", fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Scanner
        </button>
      </div>

      {error && (
        <div className="rounded-lg p-4 mb-4 flex items-start gap-3" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <AlertTriangle className="w-4 h-4 text-[#ef4444] flex-shrink-0 mt-0.5" />
          <p className="text-[#ef4444]" style={{ fontSize: "0.82rem" }}>{error}</p>
        </div>
      )}

      {results && (
        <div className="space-y-3">
          <div className="rounded-lg p-4 flex items-center gap-3" style={{ background: "rgba(57,255,20,0.04)", border: "1px solid rgba(57,255,20,0.1)" }}>
            <CheckCircle className="w-5 h-5 text-[#39ff14]" />
            <span className="text-[#e2e8f0]" style={{ fontSize: "0.9rem" }}>
              <strong style={{ color: "#39ff14" }}>{results.length}</strong> sous-domaine{results.length > 1 ? "s" : ""} trouve{results.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="max-h-96 overflow-y-auto">
              {results.map((r, i) => (
                <div
                  key={r.name + i}
                  className="px-4 py-2.5 flex items-center gap-3 hover:bg-white/2 transition-colors"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", background: i % 2 === 0 ? "rgba(17,24,39,0.3)" : "transparent" }}
                >
                  <Globe className="w-3.5 h-3.5 text-[#f97316] flex-shrink-0" />
                  <span className="text-[#e2e8f0] flex-1" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.78rem" }}>{r.name}</span>
                  <span className="text-[#64748b] hidden sm:block" style={{ fontSize: "0.68rem" }}>{r.notAfter ? `exp: ${r.notAfter.split("T")[0]}` : ""}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const PYTHON_SCRIPT = `#!/usr/bin/env python3
"""
Subdomain Finder - CyberGuard
Trouve les sous-domaines d'un domaine via Certificate Transparency (crt.sh).
Aucune API requise — utilise les logs publics de certificats SSL.

Usage:
    python subdomain_finder.py exemple.com
    python subdomain_finder.py exemple.com -o subdomains.txt
    python subdomain_finder.py exemple.com --resolve
"""

import argparse
import json
import socket
import sys
import urllib.request
import urllib.error

def find_subdomains(domain):
    url = f"https://crt.sh/?q=%25.{domain}&output=json"
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "CyberGuard-SubdomainFinder/1.0")

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
    except Exception as e:
        return {"error": str(e)}

    seen = set()
    subdomains = []
    for cert in data:
        names = cert.get("name_value", "").split("\\n")
        for name in names:
            clean = name.strip().lower().replace("*.", "")
            if clean and domain in clean and clean not in seen:
                seen.add(clean)
                subdomains.append({
                    "name": clean,
                    "issuer": cert.get("issuer_name", "N/A"),
                    "not_before": cert.get("not_before", ""),
                    "not_after": cert.get("not_after", ""),
                })

    subdomains.sort(key=lambda x: x["name"])
    return {"domain": domain, "count": len(subdomains), "subdomains": subdomains}

def resolve_subdomain(name):
    try:
        ip = socket.gethostbyname(name)
        return ip
    except socket.gaierror:
        return None

def main():
    parser = argparse.ArgumentParser(description="Subdomain Finder - CyberGuard")
    parser.add_argument("domain", help="Domaine cible")
    parser.add_argument("-o", "--output", help="Fichier de sortie")
    parser.add_argument("--resolve", action="store_true", help="Resoudre les IPs de chaque sous-domaine")
    parser.add_argument("--json", action="store_true", help="Sortie JSON")
    args = parser.parse_args()

    CYAN = "\\033[96m"
    GREEN = "\\033[92m"
    YELLOW = "\\033[93m"
    RED = "\\033[91m"
    RESET = "\\033[0m"

    print(f"\\n  {CYAN}Recherche de sous-domaines pour {args.domain}...{RESET}")
    result = find_subdomains(args.domain)

    if "error" in result:
        print(f"  {RED}Erreur: {result['error']}{RESET}")
        sys.exit(1)

    print(f"  {GREEN}{result['count']} sous-domaines trouves{RESET}\\n")

    for sub in result["subdomains"]:
        line = f"  {GREEN}[+]{RESET} {sub['name']}"
        if args.resolve:
            ip = resolve_subdomain(sub["name"])
            if ip:
                line += f"  →  {CYAN}{ip}{RESET}"
            else:
                line += f"  →  {YELLOW}non resolu{RESET}"
        print(line)

    if args.output:
        with open(args.output, "w") as f:
            if args.json:
                json.dump(result, f, indent=2, ensure_ascii=False)
            else:
                for sub in result["subdomains"]:
                    f.write(sub["name"] + "\\n")
        print(f"\\n  Sauvegarde dans {args.output}")

if __name__ == "__main__":
    main()
`;

const README = `# Subdomain Finder - CyberGuard

Trouve les sous-domaines d'un domaine via Certificate Transparency logs (crt.sh).

## Utilisation
\`\`\`bash
python subdomain_finder.py exemple.com
python subdomain_finder.py exemple.com --resolve
python subdomain_finder.py exemple.com -o subs.txt
\`\`\`

## Fonctionnalites
- Enumeration via crt.sh (logs de certificats publics)
- Resolution DNS optionnelle (--resolve)
- Export texte ou JSON

## API requise
Aucune cle API. Utilise les logs publics de Certificate Transparency.
`;

const GUI_CONFIG: GuiConfig = {
  title: "Subdomain Finder",
  inputType: "url",
  inputPlaceholder: "exemple.com",
  buttonText: "Scanner",
  importLine: "from subdomain_finder import find_subdomains",
  processCode: `            return find_subdomains(inp)`,
};

export function SubdomainFinderPage() {
  return (
    <ToolPageLayout
      title="Subdomain"
      subtitle="Finder"
      description="Decouvrez tous les sous-domaines d'un domaine via les logs de Certificate Transparency (crt.sh). Donnees reelles, aucune API requise."
      disableOnlineTest
      toolSlug="subdomain_finder"
      icon={Globe}
      color="#f97316"
      hubAnchor="subdomain-finder"
      features={[
        { icon: Globe, title: "Certificate Transparency", desc: "Utilise les logs publics de certificats SSL pour enumerer les sous-domaines." },
        { icon: Search, title: "Donnees reelles", desc: "Pas de brute-force — des donnees reelles issues de vrais certificats." },
        { icon: Shield, title: "Aucune API requise", desc: "crt.sh est gratuit et public. Aucune cle necessaire." },
        { icon: Eye, title: "Resolution DNS", desc: "La version Python peut resoudre l'IP de chaque sous-domaine." },
        { icon: Zap, title: "Export multiple", desc: "Export en texte ou JSON pour integration dans vos workflows." },
        { icon: FileText, title: "Reconnaissance", desc: "Etape essentielle de la phase de recon en pentest." },
      ]}
      requirements={["Python 3.7+", "Aucune dependance externe", "Connexion internet", "Autorisation sur la cible"]}
      pythonScript={PYTHON_SCRIPT}
      readmeContent={README}
      guiConfig={GUI_CONFIG}
    >
      <SubdomainFinderTool />
    </ToolPageLayout>
  );
}

export { SubdomainFinderTool };