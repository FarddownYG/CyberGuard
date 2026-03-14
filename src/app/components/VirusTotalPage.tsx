import { useState } from "react";
import { Search, Shield, AlertTriangle, CheckCircle, XCircle, Loader2, ExternalLink, Eye } from "lucide-react";
import { motion } from "motion/react";

interface VTResult {
  engine: string;
  result: "clean" | "malicious" | "suspicious" | "unrated";
}

const mockEngines: VTResult[] = [
  { engine: "Google Safebrowsing", result: "clean" },
  { engine: "Kaspersky", result: "clean" },
  { engine: "BitDefender", result: "clean" },
  { engine: "Norton", result: "clean" },
  { engine: "Avira", result: "suspicious" },
  { engine: "ESET", result: "clean" },
  { engine: "McAfee", result: "clean" },
  { engine: "Sophos", result: "clean" },
  { engine: "Fortinet", result: "malicious" },
  { engine: "Trend Micro", result: "clean" },
  { engine: "Webroot", result: "clean" },
  { engine: "Comodo", result: "clean" },
  { engine: "CyRadar", result: "unrated" },
  { engine: "OpenPhish", result: "clean" },
  { engine: "PhishLabs", result: "clean" },
  { engine: "Yandex", result: "clean" },
];

export function VirusTotalPage() {
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<VTResult[] | null>(null);

  const handleScan = () => {
    if (!url) return;
    setScanning(true);
    setResults(null);
    setTimeout(() => {
      setScanning(false);
      setResults(mockEngines);
    }, 2500);
  };

  const stats = results
    ? {
        clean: results.filter((r) => r.result === "clean").length,
        malicious: results.filter((r) => r.result === "malicious").length,
        suspicious: results.filter((r) => r.result === "suspicious").length,
        unrated: results.filter((r) => r.result === "unrated").length,
      }
    : null;

  const getColor = (r: string) => {
    switch (r) {
      case "clean": return "#39ff14";
      case "malicious": return "#ef4444";
      case "suspicious": return "#f59e0b";
      default: return "#64748b";
    }
  };

  const getLabel = (r: string) => {
    switch (r) {
      case "clean": return "Sain";
      case "malicious": return "Malveillant";
      case "suspicious": return "Suspect";
      default: return "Non evalue";
    }
  };

  return (
    <div className="min-h-screen py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)" }}>
            <Eye className="w-3.5 h-3.5 text-[#8b5cf6]" />
            <span className="text-[#8b5cf6]" style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace" }}>70+ moteurs antivirus</span>
          </div>
          <h1 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.8rem, 3vw, 2.2rem)" }} className="text-[#e2e8f0] mb-4">
            Analyse{" "}
            <span style={{ background: "linear-gradient(135deg, #8b5cf6, #00d4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>VirusTotal</span>
          </h1>
          <p className="text-[#94a3b8] max-w-xl mx-auto" style={{ lineHeight: 1.7 }}>
            Verifiez si une URL est malveillante en l'analysant avec plus de 70 moteurs antivirus.
          </p>
        </motion.div>

        <div className="bg-[#111827] border border-[#00d4ff]/20 rounded-xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748b]" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScan()}
                placeholder="https://url-a-analyser.com"
                className="w-full pl-10 pr-4 py-3 bg-[#0a0a0f] border border-[#00d4ff]/20 rounded-lg text-[#e2e8f0] placeholder-[#64748b] focus:outline-none focus:border-[#00d4ff]/60 transition-colors"
              />
            </div>
            <button
              onClick={handleScan}
              disabled={scanning || !url}
              className="px-6 py-3 bg-[#00d4ff] text-[#0a0a0f] rounded-lg hover:bg-[#00b8d9] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}
            >
              {scanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
              {scanning ? "Analyse..." : "Analyser"}
            </button>
          </div>
        </div>

        {scanning && (
          <div className="flex flex-col items-center gap-4 py-16">
            <Loader2 className="w-16 h-16 text-[#00d4ff] animate-spin" />
            <p className="text-[#00d4ff]" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}>
              Interrogation des moteurs antivirus...
            </p>
          </div>
        )}

        {results && stats && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Score summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Sains", value: stats.clean, color: "#39ff14" },
                { label: "Malveillants", value: stats.malicious, color: "#ef4444" },
                { label: "Suspects", value: stats.suspicious, color: "#f59e0b" },
                { label: "Non evalues", value: stats.unrated, color: "#64748b" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-[#111827] border border-[#00d4ff]/10 rounded-xl p-4 text-center"
                >
                  <div style={{ fontFamily: "Orbitron, sans-serif", fontSize: "2rem", color: s.color }}>
                    {s.value}
                  </div>
                  <div className="text-[#94a3b8]" style={{ fontSize: "0.8rem" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Reputation bar */}
            <div className="bg-[#111827] border border-[#00d4ff]/10 rounded-xl p-6 mb-8">
              <p className="text-[#94a3b8] mb-3" style={{ fontSize: "0.85rem" }}>Score de reputation</p>
              <div className="w-full h-4 bg-[#1e293b] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(stats.clean / results.length) * 100}%`,
                    background: "linear-gradient(90deg, #39ff14, #00d4ff)",
                  }}
                />
              </div>
              <div className="flex justify-between mt-2 text-[#64748b]" style={{ fontSize: "0.8rem" }}>
                <span>{stats.clean}/{results.length} moteurs sains</span>
                <span>{Math.round((stats.clean / results.length) * 100)}%</span>
              </div>
            </div>

            {/* Engine details */}
            <div className="bg-[#111827] border border-[#00d4ff]/10 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-[#00d4ff]/10">
                <h3 className="text-[#e2e8f0]">Details par moteur antivirus</h3>
              </div>
              <div className="divide-y divide-[#00d4ff]/5">
                {results.map((r) => (
                  <div key={r.engine} className="flex items-center justify-between px-4 py-3">
                    <span className="text-[#e2e8f0]" style={{ fontSize: "0.9rem" }}>{r.engine}</span>
                    <span
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                      style={{
                        fontSize: "0.8rem",
                        color: getColor(r.result),
                        backgroundColor: `${getColor(r.result)}15`,
                      }}
                    >
                      {r.result === "clean" ? <CheckCircle className="w-3.5 h-3.5" /> : r.result === "malicious" ? <XCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      {getLabel(r.result)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}