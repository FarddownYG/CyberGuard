import { useState } from "react";
import { Globe, Search, Loader2, AlertTriangle, Shield, Eye, FileText, Lock, Clock, Server } from "lucide-react";
import { ToolPageLayout } from "./ToolPageLayout";
import type { GuiConfig } from "./zip-generator";

interface WhoisData {
  domain: string;
  registrar?: string;
  created?: string;
  updated?: string;
  expires?: string;
  nameservers?: string[];
  status?: string[];
  dnssec?: string;
  error?: string;
}

function WhoisLookupTool() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WhoisData | null>(null);
  const [error, setError] = useState("");

  const lookup = async () => {
    if (!domain) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const clean = domain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
      // Use RDAP (free, IETF standard, CORS-friendly)
      const tld = clean.split(".").pop() || "";
      const rdapServers: Record<string, string> = {
        com: "https://rdap.verisign.com/com/v1",
        net: "https://rdap.verisign.com/net/v1",
        org: "https://rdap.org/org/v1",
      };
      const rdapBase = rdapServers[tld] || `https://rdap.org`;
      const res = await fetch(`${rdapBase}/domain/${clean}`);

      if (!res.ok) throw new Error("Domaine non trouve");
      const data = await res.json();

      const nameservers = (data.nameservers || []).map((ns: any) => ns.ldhName || ns.unicodeName || "").filter(Boolean);
      const events: Record<string, string> = {};
      for (const ev of data.events || []) {
        events[ev.eventAction] = ev.eventDate;
      }

      const registrar = data.entities?.find((e: any) => e.roles?.includes("registrar"));
      const registrarName = registrar?.vcardArray?.[1]?.find((v: any) => v[0] === "fn")?.[3] || registrar?.handle || "N/A";

      setResult({
        domain: clean,
        registrar: registrarName,
        created: events.registration?.split("T")[0],
        updated: events["last changed"]?.split("T")[0],
        expires: events.expiration?.split("T")[0],
        nameservers,
        status: data.status || [],
        dnssec: data.secureDNS?.delegationSigned ? "Signe" : "Non signe",
      });
    } catch {
      setError("Impossible de recuperer les infos WHOIS. Le TLD n'est peut-etre pas supporte via RDAP. Utilisez la version Python.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input value={domain} onChange={e => setDomain(e.target.value)} onKeyDown={e => e.key === "Enter" && lookup()}
          placeholder="exemple.com" className="flex-1 px-4 py-3 bg-[#0a0a0f] border border-[#1e293b] rounded-lg text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#a855f7]/40"
          style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.9rem" }} />
        <button onClick={lookup} disabled={loading || !domain} className="px-6 py-3 rounded-lg transition-all flex items-center gap-2 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #a855f7, #9333ea)", color: "#fff", fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Lookup
        </button>
      </div>

      {error && (
        <div className="rounded-lg p-4 mb-4 flex items-start gap-3" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <AlertTriangle className="w-4 h-4 text-[#ef4444] flex-shrink-0 mt-0.5" />
          <p className="text-[#ef4444]" style={{ fontSize: "0.82rem" }}>{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          {[
            { label: "Domaine", value: result.domain, color: "#a855f7" },
            { label: "Registrar", value: result.registrar, color: "#00d4ff" },
            { label: "Date de creation", value: result.created, color: "#39ff14" },
            { label: "Derniere mise a jour", value: result.updated, color: "#f59e0b" },
            { label: "Expiration", value: result.expires, color: result.expires && new Date(result.expires) < new Date(Date.now() + 30 * 86400000) ? "#ef4444" : "#39ff14" },
            { label: "DNSSEC", value: result.dnssec, color: result.dnssec === "Signe" ? "#39ff14" : "#f59e0b" },
          ].filter(r => r.value).map(r => (
            <div key={r.label} className="rounded-lg p-3 flex items-center justify-between" style={{ background: "rgba(17,24,39,0.5)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <span className="text-[#94a3b8]" style={{ fontSize: "0.82rem" }}>{r.label}</span>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem", color: r.color }}>{r.value}</span>
            </div>
          ))}

          {result.nameservers && result.nameservers.length > 0 && (
            <div className="rounded-lg p-3" style={{ background: "rgba(17,24,39,0.5)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <span className="text-[#94a3b8] block mb-2" style={{ fontSize: "0.82rem" }}>Nameservers</span>
              {result.nameservers.map(ns => (
                <p key={ns} className="text-[#00d4ff]" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem" }}>{ns}</p>
              ))}
            </div>
          )}

          {result.status && result.status.length > 0 && (
            <div className="rounded-lg p-3" style={{ background: "rgba(17,24,39,0.5)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <span className="text-[#94a3b8] block mb-2" style={{ fontSize: "0.82rem" }}>Status</span>
              <div className="flex flex-wrap gap-1.5">
                {result.status.map(s => (
                  <span key={s} className="px-2 py-0.5 rounded text-[#a855f7]" style={{ background: "rgba(168,85,247,0.1)", fontSize: "0.7rem", fontFamily: "JetBrains Mono, monospace" }}>{s}</span>
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
WHOIS Lookup - CyberGuard
Recherche WHOIS/RDAP pour un domaine. Registrar, dates, nameservers, DNSSEC.
Aucune API requise — utilise le protocole RDAP (IETF standard).

Usage:
    python whois_lookup.py exemple.com
    python whois_lookup.py exemple.com -o whois.json
"""

import argparse, json, sys, urllib.request, socket

def rdap_lookup(domain):
    tld = domain.rsplit(".", 1)[-1]
    servers = {"com": "https://rdap.verisign.com/com/v1", "net": "https://rdap.verisign.com/net/v1", "org": "https://rdap.org/org/v1"}
    base = servers.get(tld, "https://rdap.org")
    url = f"{base}/domain/{domain}"
    req = urllib.request.Request(url)
    req.add_header("Accept", "application/rdap+json")
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode())

def whois_socket(domain):
    """Fallback: raw WHOIS via socket (port 43)"""
    tld = domain.rsplit(".", 1)[-1]
    whois_servers = {"com": "whois.verisign-grs.com", "net": "whois.verisign-grs.com",
                     "org": "whois.pir.org", "fr": "whois.nic.fr", "io": "whois.nic.io"}
    server = whois_servers.get(tld, f"whois.nic.{tld}")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        sock.connect((server, 43))
        sock.sendall(f"{domain}\\r\\n".encode())
        data = b""
        while True:
            chunk = sock.recv(4096)
            if not chunk:
                break
            data += chunk
        sock.close()
        return data.decode("utf-8", errors="replace")
    except Exception as e:
        return f"Erreur WHOIS: {e}"

def main():
    parser = argparse.ArgumentParser(description="WHOIS Lookup - CyberGuard")
    parser.add_argument("domain", help="Domaine a rechercher")
    parser.add_argument("-o", "--output", help="Export JSON")
    parser.add_argument("--raw", action="store_true", help="WHOIS brut via socket (port 43)")
    args = parser.parse_args()

    domain = args.domain.lower().replace("https://", "").replace("http://", "").strip("/")
    CYAN, GREEN, YELLOW, RED, RESET = "\\033[96m", "\\033[92m", "\\033[93m", "\\033[91m", "\\033[0m"

    if args.raw:
        raw = whois_socket(domain)
        print(raw)
        return

    try:
        data = rdap_lookup(domain)
    except Exception as e:
        print(f"{RED}RDAP echoue: {e}{RESET}")
        print(f"{YELLOW}Tentative WHOIS brut...{RESET}")
        print(whois_socket(domain))
        return

    events = {ev["eventAction"]: ev["eventDate"].split("T")[0] for ev in data.get("events", [])}
    nameservers = [ns.get("ldhName", "") for ns in data.get("nameservers", [])]
    registrar = next((e for e in data.get("entities", []) if "registrar" in (e.get("roles") or [])), None)
    reg_name = "N/A"
    if registrar and registrar.get("vcardArray"):
        for v in registrar["vcardArray"][1]:
            if v[0] == "fn":
                reg_name = v[3]

    print(f"\\n{'='*60}")
    print(f"  {CYAN}Domaine:{RESET}     {domain}")
    print(f"  {CYAN}Registrar:{RESET}   {reg_name}")
    print(f"  {GREEN}Creation:{RESET}    {events.get('registration', 'N/A')}")
    print(f"  {YELLOW}Mise a jour:{RESET} {events.get('last changed', 'N/A')}")
    print(f"  Expiration:   {events.get('expiration', 'N/A')}")
    print(f"  DNSSEC:       {'Signe' if data.get('secureDNS', {}).get('delegationSigned') else 'Non signe'}")
    print(f"  Nameservers:  {', '.join(nameservers)}")
    print(f"  Status:       {', '.join(data.get('status', []))}")
    print(f"{'='*60}")

    if args.output:
        with open(args.output, "w") as f:
            json.dump({"domain": domain, "registrar": reg_name, "events": events,
                       "nameservers": nameservers, "status": data.get("status", [])}, f, indent=2)

if __name__ == "__main__":
    main()
`;

const README = `# WHOIS Lookup - CyberGuard
Recherche WHOIS/RDAP. Registrar, dates, nameservers, DNSSEC.
## Utilisation
\`\`\`bash
python whois_lookup.py google.com
python whois_lookup.py exemple.com --raw    # WHOIS brut port 43
\`\`\`
## API requise: Aucune. Utilise RDAP (protocole IETF standard).
`;

const GUI_CONFIG: GuiConfig = {
  title: "WHOIS Lookup",
  inputType: "url",
  inputPlaceholder: "exemple.com",
  buttonText: "Lookup",
  importLine: "from whois_lookup import rdap_lookup, whois_socket",
  processCode: `            domain = inp.lower().replace("https://","").replace("http://","").strip("/")
            try:
                return rdap_lookup(domain)
            except:
                return {"raw_whois": whois_socket(domain)}`,
};

export function WhoisLookupPage() {
  return (
    <ToolPageLayout title="WHOIS" subtitle="Lookup" description="Recherche WHOIS/RDAP pour un domaine. Registrar, dates de creation/expiration, nameservers et statut DNSSEC."
      disableOnlineTest
      toolSlug="whois_lookup" icon={Globe} color="#a855f7" hubAnchor="whois-lookup"
      features={[
        { icon: Globe, title: "RDAP standard", desc: "Utilise le protocole RDAP de l'IETF. Pas de scraping, donnees structurees." },
        { icon: Clock, title: "Dates completes", desc: "Creation, mise a jour, expiration du domaine." },
        { icon: Server, title: "Nameservers", desc: "Liste tous les serveurs DNS autoritaires du domaine." },
        { icon: Shield, title: "DNSSEC", desc: "Verifie si le domaine utilise DNSSEC (signature DNS)." },
        { icon: Lock, title: "WHOIS brut", desc: "La version Python supporte aussi le WHOIS raw via socket port 43." },
        { icon: Eye, title: "Zero API", desc: "RDAP est gratuit, public et sans authentification." },
      ]}
      requirements={["Python 3.7+", "Aucune dependance", "Connexion internet", "Support RDAP + WHOIS raw"]}
      pythonScript={PYTHON_SCRIPT} readmeContent={README}
      guiConfig={GUI_CONFIG}
    >
      <WhoisLookupTool />
    </ToolPageLayout>
  );
}

export { WhoisLookupTool };