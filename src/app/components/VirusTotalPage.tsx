import { useState } from "react";
import { Search, Shield, AlertTriangle, CheckCircle, XCircle, Loader2, Eye, Info, ExternalLink, Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { submitUrl, pollAnalysis, getUrlReport, parseUrlResults, VTError, type VTUrlResult } from "./vt-api";
import { getApiKey, getQuota } from "./vt-rate-limiter";
import { QuotaDisplay } from "./QuotaDisplay";

type ScanPhase = "idle" | "submitting" | "polling" | "fetching" | "done" | "error";

export function VirusTotalPage() {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [results, setResults] = useState<VTUrlResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const apiKey = getApiKey();

  const handleScan = async () => {
    if (!url.trim()) return;

    const quota = getQuota();
    if (!quota.canRequest) {
      setErrorMsg(quota.blockedReason || "Rate limit atteint");
      setPhase("error");
      return;
    }

    setPhase("submitting");
    setResults(null);
    setErrorMsg("");
    setStatusMsg("Soumission de l'URL a VirusTotal...");

    try {
      // Step 1: Submit URL
      const analysisId = await submitUrl(url.trim());

      // Step 2: Poll for results
      setPhase("polling");
      setStatusMsg("Analyse en cours par 70+ moteurs antivirus...");

      await pollAnalysis(analysisId, (status) => {
        if (status === "queued") setStatusMsg("En file d'attente...");
        else if (status === "in-progress") setStatusMsg("Analyse en cours...");
      });

      // Step 3: Fetch full URL report
      setPhase("fetching");
      setStatusMsg("Recuperation du rapport complet...");

      const report = await getUrlReport(url.trim());
      const parsed = parseUrlResults(report);

      setResults(parsed);
      setPhase("done");
    } catch (err) {
      if (err instanceof VTError) {
        setErrorMsg(err.message);
        if (err.code === "NotFoundError" || err.code === "HTTP_404") {
          setErrorMsg("URL non trouvee dans la base VirusTotal. Elle est peut-etre en cours d'analyse. Reessayez dans quelques instants.");
        }
      } else {
        setErrorMsg("Erreur inattendue. Verifiez votre connexion et la configuration de l'API key.");
      }
      setPhase("error");
    }
  };

  const totalEngines = results ? results.engines.length : 0;

  const getColor = (cat: string) => {
    switch (cat) {
      case "harmless": return "#39ff14";
      case "malicious": return "#ef4444";
      case "suspicious": return "#f59e0b";
      case "undetected": return "#64748b";
      default: return "#475569";
    }
  };

  const getLabel = (cat: string) => {
    switch (cat) {
      case "harmless": return "Sain";
      case "malicious": return "Malveillant";
      case "suspicious": return "Suspect";
      case "undetected": return "Non evalue";
      case "timeout": return "Timeout";
      default: return cat;
    }
  };

  return (
    <div className="min-h-screen py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)" }}>
            <Eye className="w-3.5 h-3.5 text-[#8b5cf6]" />
            <span className="text-[#8b5cf6]" style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace" }}>API v3 — 70+ moteurs antivirus</span>
          </div>
          <h1 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.8rem, 3vw, 2.2rem)" }} className="text-[#e2e8f0] mb-4">
            Analyse{" "}
            <span style={{ background: "linear-gradient(135deg, #8b5cf6, #00d4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>VirusTotal</span>
          </h1>
          <p className="text-[#94a3b8] max-w-xl mx-auto" style={{ lineHeight: 1.7 }}>
            Verifiez si une URL est malveillante en l'analysant avec plus de 70 moteurs antivirus via l'API VirusTotal v3.
          </p>
        </motion.div>

        {/* API Key status + Quota */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-[#111827] border border-[#00d4ff]/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${apiKey ? "bg-[#39ff14]" : "bg-[#ef4444]"} animate-pulse`} />
              <span className="text-[#e2e8f0]" style={{ fontSize: "0.85rem", fontFamily: "JetBrains Mono, monospace" }}>
                {apiKey ? "API connectee" : "API non configuree"}
              </span>
            </div>
            <p className="text-[#64748b]" style={{ fontSize: "0.72rem" }}>
              {apiKey
                ? "Cle VirusTotal chargee depuis les variables d'environnement Vercel."
                : "Ajoutez VITE_VIRUSTOTAL_API_KEY dans vos variables d'environnement Vercel pour activer les scans reels."}
            </p>
          </div>
          <QuotaDisplay />
        </div>

        {/* Search input */}
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
                disabled={phase === "submitting" || phase === "polling" || phase === "fetching"}
              />
            </div>
            <button
              onClick={handleScan}
              disabled={phase === "submitting" || phase === "polling" || phase === "fetching" || !url.trim() || !apiKey}
              className="px-6 py-3 bg-[#00d4ff] text-[#0a0a0f] rounded-lg hover:bg-[#00b8d9] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}
            >
              {phase !== "idle" && phase !== "done" && phase !== "error" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Shield className="w-5 h-5" />
              )}
              {phase === "submitting" ? "Soumission..." : phase === "polling" ? "Analyse..." : phase === "fetching" ? "Chargement..." : "Analyser"}
            </button>
          </div>

          {!apiKey && (
            <div className="mt-3 flex items-start gap-2 bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-lg p-3">
              <Info className="w-4 h-4 text-[#f59e0b] flex-shrink-0 mt-0.5" />
              <p className="text-[#f59e0b]" style={{ fontSize: "0.75rem" }}>
                Configurez <code className="bg-[#f59e0b]/10 px-1 rounded">VITE_VIRUSTOTAL_API_KEY</code> dans les variables d'environnement Vercel pour activer les scans.
              </p>
            </div>
          )}
        </div>

        {/* Scanning progress */}
        <AnimatePresence>
          {(phase === "submitting" || phase === "polling" || phase === "fetching") && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-16"
            >
              <div className="relative">
                <Loader2 className="w-16 h-16 text-[#00d4ff] animate-spin" />
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ boxShadow: "0 0 30px rgba(0,212,255,0.2)" }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <p className="text-[#00d4ff]" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}>
                {statusMsg}
              </p>
              {phase === "polling" && (
                <div className="flex items-center gap-2 text-[#64748b]" style={{ fontSize: "0.75rem" }}>
                  <Clock className="w-3.5 h-3.5" />
                  <span>L'analyse peut prendre 15-60 secondes (polling toutes les 15s pour respecter le rate limit)</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {phase === "error" && errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-xl p-6 flex items-start gap-3 mb-8"
          >
            <XCircle className="w-5 h-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[#ef4444]" style={{ fontSize: "0.9rem" }}>Erreur</p>
              <p className="text-[#94a3b8]" style={{ fontSize: "0.85rem" }}>{errorMsg}</p>
            </div>
          </motion.div>
        )}

        {/* Results */}
        {results && phase === "done" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Score summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Sains", value: results.stats.harmless, color: "#39ff14" },
                { label: "Malveillants", value: results.stats.malicious, color: "#ef4444" },
                { label: "Suspects", value: results.stats.suspicious, color: "#f59e0b" },
                { label: "Non evalues", value: results.stats.undetected, color: "#64748b" },
              ].map((s) => (
                <div key={s.label} className="bg-[#111827] border border-[#00d4ff]/10 rounded-xl p-4 text-center">
                  <div style={{ fontFamily: "Orbitron, sans-serif", fontSize: "2rem", color: s.color }}>
                    {s.value}
                  </div>
                  <div className="text-[#94a3b8]" style={{ fontSize: "0.8rem" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Scan info */}
            <div className="bg-[#111827] border border-[#00d4ff]/10 rounded-xl p-4 mb-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[#64748b]" style={{ fontSize: "0.75rem" }}>URL:</span>
                <span className="text-[#00d4ff] font-mono" style={{ fontSize: "0.8rem" }}>{results.url}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#64748b]" style={{ fontSize: "0.75rem" }}>Scanne:</span>
                <span className="text-[#e2e8f0]" style={{ fontSize: "0.8rem" }}>{results.scanDate}</span>
              </div>
              <a
                href={`https://www.virustotal.com/gui/url/${btoa(url).replace(/=+$/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1.5 text-[#8b5cf6] hover:text-[#a78bfa] transition-colors"
                style={{ fontSize: "0.8rem" }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Voir sur VirusTotal
              </a>
            </div>

            {/* Reputation bar */}
            <div className="bg-[#111827] border border-[#00d4ff]/10 rounded-xl p-6 mb-8">
              <p className="text-[#94a3b8] mb-3" style={{ fontSize: "0.85rem" }}>Score de reputation</p>
              <div className="w-full h-4 bg-[#1e293b] rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: results.stats.malicious > 0
                      ? "linear-gradient(90deg, #ef4444, #f59e0b)"
                      : "linear-gradient(90deg, #39ff14, #00d4ff)",
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${totalEngines > 0 ? (results.stats.harmless / totalEngines) * 100 : 0}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
              <div className="flex justify-between mt-2 text-[#64748b]" style={{ fontSize: "0.8rem" }}>
                <span>{results.stats.harmless}/{totalEngines} moteurs sains</span>
                <span>{totalEngines > 0 ? Math.round((results.stats.harmless / totalEngines) * 100) : 0}%</span>
              </div>
            </div>

            {/* Engine details */}
            <div className="bg-[#111827] border border-[#00d4ff]/10 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-[#00d4ff]/10 flex items-center justify-between">
                <h3 className="text-[#e2e8f0]">Details par moteur antivirus</h3>
                <span className="text-[#64748b]" style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace" }}>
                  {totalEngines} moteurs
                </span>
              </div>
              <div className="divide-y divide-[#00d4ff]/5 max-h-[500px] overflow-y-auto">
                {results.engines.map((r) => (
                  <div key={r.name} className="flex items-center justify-between px-4 py-3">
                    <span className="text-[#e2e8f0]" style={{ fontSize: "0.9rem" }}>{r.name}</span>
                    <div className="flex items-center gap-2">
                      {r.result && (
                        <span className="text-[#64748b] font-mono" style={{ fontSize: "0.7rem" }}>{r.result}</span>
                      )}
                      <span
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                        style={{
                          fontSize: "0.8rem",
                          color: getColor(r.category),
                          backgroundColor: `${getColor(r.category)}15`,
                        }}
                      >
                        {r.category === "harmless" ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : r.category === "malicious" ? (
                          <XCircle className="w-3.5 h-3.5" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        )}
                        {getLabel(r.category)}
                      </span>
                    </div>
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
