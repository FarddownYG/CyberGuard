import { useState } from "react";
import { Radio, Search, Loader2, AlertTriangle, CheckCircle, XCircle, Shield, Globe, Server, Lock, Eye, Zap } from "lucide-react";
import { ToolPageLayout } from "./ToolPageLayout";
import type { GuiConfig } from "./zip-generator";

const COMMON_PORTS = [
  { port: 21, service: "FTP", risk: "Authentification souvent faible" },
  { port: 22, service: "SSH", risk: "Brute-force si expose" },
  { port: 23, service: "Telnet", risk: "Protocole non chiffre — critique" },
  { port: 25, service: "SMTP", risk: "Open relay possible" },
  { port: 53, service: "DNS", risk: "DNS amplification" },
  { port: 80, service: "HTTP", risk: "Trafic non chiffre" },
  { port: 110, service: "POP3", risk: "Credentials en clair" },
  { port: 143, service: "IMAP", risk: "Credentials en clair" },
  { port: 443, service: "HTTPS", risk: "OK si bien configure" },
  { port: 445, service: "SMB", risk: "EternalBlue, ransomware" },
  { port: 993, service: "IMAPS", risk: "Faible si cert invalide" },
  { port: 995, service: "POP3S", risk: "Faible si cert invalide" },
  { port: 1433, service: "MSSQL", risk: "Base de donnees exposee" },
  { port: 3306, service: "MySQL", risk: "Base de donnees exposee" },
  { port: 3389, service: "RDP", risk: "Bureau distant expose — critique" },
  { port: 5432, service: "PostgreSQL", risk: "Base de donnees exposee" },
  { port: 5900, service: "VNC", risk: "Bureau distant non chiffre" },
  { port: 6379, service: "Redis", risk: "Souvent sans auth" },
  { port: 8080, service: "HTTP Alt", risk: "Proxy ou app de dev" },
  { port: 8443, service: "HTTPS Alt", risk: "App secondaire" },
  { port: 27017, service: "MongoDB", risk: "Souvent sans auth" },
];

function PortScannerTool() {
  const [host, setHost] = useState("");
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<{ port: number; service: string; risk: string; status: "open" | "closed" | "timeout" }[] | null>(null);
  const [progress, setProgress] = useState(0);

  const scan = async () => {
    if (!host) return;
    setScanning(true);
    setResults(null);
    setProgress(0);

    let target = host.trim();
    if (!target.startsWith("http")) target = "https://" + target;

    const scanResults: { port: number; service: string; risk: string; status: "open" | "closed" | "timeout" }[] = [];

    // Browser limitation: we can only check HTTP(S) ports via fetch
    for (let i = 0; i < COMMON_PORTS.length; i++) {
      const p = COMMON_PORTS[i];
      setProgress(Math.round(((i + 1) / COMMON_PORTS.length) * 100));

      try {
        const testUrl = `${target.split("://")[0]}://${target.replace(/^https?:\/\//, "").replace(/\/.*$/, "")}:${p.port}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        try {
          await fetch(testUrl, { mode: "no-cors", signal: controller.signal });
          clearTimeout(timeout);
          scanResults.push({ ...p, status: "open" });
        } catch (e: any) {
          clearTimeout(timeout);
          if (e.name === "AbortError") {
            scanResults.push({ ...p, status: "timeout" });
          } else {
            // Connection refused = port closed, but some errors mean open
            scanResults.push({ ...p, status: "closed" });
          }
        }
      } catch {
        scanResults.push({ ...p, status: "closed" });
      }
    }

    setResults(scanResults);
    setScanning(false);
  };

  const openPorts = results?.filter(r => r.status === "open").length || 0;

  return (
    <div>
      <div className="rounded-lg p-3 mb-4 flex items-start gap-2" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.1)" }}>
        <AlertTriangle className="w-4 h-4 text-[#f59e0b] flex-shrink-0 mt-0.5" />
        <p className="text-[#f59e0b]" style={{ fontSize: "0.75rem", lineHeight: 1.5 }}>
          Limitation navigateur: le scan depuis le navigateur utilise des requetes HTTP et ne peut pas faire un vrai scan TCP.
          Les resultats sont indicatifs. Pour un scan complet (21 ports TCP reels), utilisez la version Python.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input value={host} onChange={e => setHost(e.target.value)} onKeyDown={e => e.key === "Enter" && scan()}
          placeholder="exemple.com" className="flex-1 px-4 py-3 bg-[#0a0a0f] border border-[#1e293b] rounded-lg text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#f43f5e]/40"
          style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.9rem" }} />
        <button onClick={scan} disabled={scanning || !host} className="px-6 py-3 rounded-lg transition-all flex items-center gap-2 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #f43f5e, #e11d48)", color: "#fff", fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}>
          {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />} Scanner
        </button>
      </div>

      {scanning && (
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <span className="text-[#94a3b8]" style={{ fontSize: "0.75rem" }}>Scan en cours...</span>
            <span className="text-[#f43f5e]" style={{ fontSize: "0.75rem" }}>{progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#1e293b]">
            <div className="h-full rounded-full bg-[#f43f5e] transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {results && (
        <div className="space-y-3">
          <div className="rounded-lg p-4 flex items-center gap-3" style={{ background: "rgba(17,24,39,0.6)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <span className="text-[#e2e8f0]" style={{ fontSize: "0.9rem" }}>
              <strong style={{ color: openPorts > 0 ? "#f43f5e" : "#39ff14" }}>{openPorts}</strong> port{openPorts > 1 ? "s" : ""} potentiellement ouvert{openPorts > 1 ? "s" : ""} / {results.length}
            </span>
          </div>

          {results.filter(r => r.status === "open").map(r => (
            <div key={r.port} className="rounded-lg p-3 flex items-center gap-3" style={{ background: "rgba(244,63,94,0.05)", border: "1px solid rgba(244,63,94,0.12)" }}>
              <CheckCircle className="w-4 h-4 text-[#f43f5e]" />
              <div className="flex-1">
                <span className="text-[#e2e8f0]" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.82rem" }}>:{r.port}</span>
                <span className="text-[#94a3b8] ml-2" style={{ fontSize: "0.78rem" }}>{r.service}</span>
              </div>
              <span className="text-[#f59e0b]" style={{ fontSize: "0.7rem" }}>{r.risk}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const PYTHON_SCRIPT = `#!/usr/bin/env python3
"""
Port Scanner - CyberGuard
Scan TCP des 21 ports les plus courants et dangereux. Vrais sockets TCP.

Usage:
    python port_scanner.py exemple.com
    python port_scanner.py 192.168.1.1 --timeout 2
    python port_scanner.py exemple.com -o rapport.json
"""

import argparse, json, socket, sys, threading
from concurrent.futures import ThreadPoolExecutor, as_completed

PORTS = [
    (21, "FTP"), (22, "SSH"), (23, "Telnet"), (25, "SMTP"), (53, "DNS"),
    (80, "HTTP"), (110, "POP3"), (143, "IMAP"), (443, "HTTPS"), (445, "SMB"),
    (993, "IMAPS"), (995, "POP3S"), (1433, "MSSQL"), (3306, "MySQL"),
    (3389, "RDP"), (5432, "PostgreSQL"), (5900, "VNC"), (6379, "Redis"),
    (8080, "HTTP-Alt"), (8443, "HTTPS-Alt"), (27017, "MongoDB"),
]

def scan_port(host, port, timeout):
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except:
        return False

def grab_banner(host, port, timeout):
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        sock.connect((host, port))
        sock.sendall(b"HEAD / HTTP/1.0\\r\\n\\r\\n")
        banner = sock.recv(1024).decode("utf-8", errors="replace").strip()
        sock.close()
        return banner[:100] if banner else None
    except:
        return None

def main():
    parser = argparse.ArgumentParser(description="Port Scanner - CyberGuard")
    parser.add_argument("host", help="Hote cible")
    parser.add_argument("--timeout", "-t", type=float, default=1.5, help="Timeout par port (sec)")
    parser.add_argument("--banner", "-b", action="store_true", help="Banner grabbing")
    parser.add_argument("-o", "--output", help="Export JSON")
    parser.add_argument("--threads", type=int, default=10, help="Threads (default: 10)")
    args = parser.parse_args()

    host = args.host.replace("https://", "").replace("http://", "").strip("/")
    try:
        ip = socket.gethostbyname(host)
    except:
        print(f"\\033[91mResolution DNS echouee pour {host}\\033[0m")
        sys.exit(1)

    GREEN, RED, CYAN, YELLOW, RESET = "\\033[92m", "\\033[91m", "\\033[96m", "\\033[93m", "\\033[0m"
    print(f"\\n  {CYAN}Scan de {host} ({ip}) — {len(PORTS)} ports{RESET}")

    results = []
    open_count = 0

    with ThreadPoolExecutor(max_workers=args.threads) as executor:
        futures = {executor.submit(scan_port, ip, port, args.timeout): (port, service) for port, service in PORTS}
        for future in as_completed(futures):
            port, service = futures[future]
            is_open = future.result()
            banner = None
            if is_open and args.banner:
                banner = grab_banner(ip, port, args.timeout)
            results.append({"port": port, "service": service, "open": is_open, "banner": banner})
            if is_open:
                open_count += 1
                banner_str = f"  {YELLOW}{banner}{RESET}" if banner else ""
                print(f"  {GREEN}OPEN{RESET}    :{port:<6} {service}{banner_str}")

    results.sort(key=lambda x: x["port"])
    print(f"\\n  {open_count} port(s) ouvert(s) / {len(PORTS)} scannes")

    if args.output:
        with open(args.output, "w") as f:
            json.dump({"host": host, "ip": ip, "results": results, "open": open_count}, f, indent=2)

if __name__ == "__main__":
    main()
`;

const README = `# Port Scanner - CyberGuard
Scan TCP de 21 ports courants avec banner grabbing optionnel.
## Utilisation
\`\`\`bash
python port_scanner.py exemple.com
python port_scanner.py 192.168.1.1 --banner --timeout 2
python port_scanner.py exemple.com -o rapport.json
\`\`\`
## API requise: Aucune. Utilise des sockets TCP natifs.
`;

const GUI_CONFIG: GuiConfig = {
  title: "Port Scanner",
  inputType: "url",
  inputPlaceholder: "exemple.com ou 192.168.1.1",
  buttonText: "Scanner",
  importLine: "from port_scanner import scan_port, PORTS\nimport socket",
  processCode: `            host = inp.replace("https://","").replace("http://","").strip("/")
            ip = socket.gethostbyname(host)
            results = []
            for port, service in PORTS:
                is_open = scan_port(ip, port, 1.5)
                if is_open:
                    results.append({"port": port, "service": service, "status": "OPEN"})
            return {"host": host, "ip": ip, "open_ports": results, "total_scanned": len(PORTS)}`,
};

export function PortScannerPage() {
  return (
    <ToolPageLayout title="Port" subtitle="Scanner" description="Scan TCP des 21 ports les plus courants et dangereux. Banner grabbing, scan multi-threade et export JSON."
      disableOnlineTest
      toolSlug="port_scanner" icon={Radio} color="#f43f5e" hubAnchor="port-scanner"
      features={[
        { icon: Radio, title: "21 ports critiques", desc: "FTP, SSH, HTTP, HTTPS, RDP, MySQL, Redis, MongoDB et plus." },
        { icon: Server, title: "Vrais sockets TCP", desc: "La version Python fait de vrais scans TCP SYN (pas du HTTP)." },
        { icon: Eye, title: "Banner grabbing", desc: "Recupere la banniere du service pour identifier les versions." },
        { icon: Zap, title: "Multi-threade", desc: "10 threads par defaut pour un scan rapide." },
        { icon: Shield, title: "Zero API", desc: "Utilise des sockets natifs. Aucune cle requise." },
        { icon: Lock, title: "Risques documentes", desc: "Chaque port est accompagne de son risque de securite." },
      ]}
      requirements={["Python 3.7+", "Aucune dependance", "Connexion internet", "Autorisation sur la cible"]}
      pythonScript={PYTHON_SCRIPT} readmeContent={README}
      guiConfig={GUI_CONFIG}
    >
      <PortScannerTool />
    </ToolPageLayout>
  );
}

export { PortScannerTool };