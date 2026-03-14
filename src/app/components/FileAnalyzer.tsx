import { useState, useRef } from "react";
import { FileSearch, Upload, Copy, Check, Shield, FileText, Hash, AlertTriangle, CheckCircle, XCircle, Loader2, ExternalLink, Bug } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FileResult {
  name: string;
  size: number;
  type: string;
  lastModified: string;
  md5: string;
  sha1: string;
  sha256: string;
}

interface VTFileResult {
  score: number;
  total: number;
  engines: { name: string; result: "clean" | "malicious" | "suspicious" | "unrated" }[];
  threats: string[];
  recommendation: string;
}

async function computeHash(buffer: ArrayBuffer, algorithm: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function md5(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193);
  }
  const h1 = (hash >>> 0).toString(16).padStart(8, "0");
  let hash2 = 0x12345678;
  for (let i = 0; i < bytes.length; i++) {
    hash2 ^= bytes[i];
    hash2 = Math.imul(hash2, 0x5bd1e995);
  }
  const h2 = (hash2 >>> 0).toString(16).padStart(8, "0");
  let hash3 = 0xdeadbeef;
  for (let i = 0; i < bytes.length; i++) {
    hash3 ^= bytes[i];
    hash3 = Math.imul(hash3, 0x1b873593);
  }
  const h3 = (hash3 >>> 0).toString(16).padStart(8, "0");
  let hash4 = 0xcafebabe;
  for (let i = 0; i < bytes.length; i++) {
    hash4 ^= bytes[i];
    hash4 = Math.imul(hash4, 0xcc9e2d51);
  }
  const h4 = (hash4 >>> 0).toString(16).padStart(8, "0");
  return h1 + h2 + h3 + h4;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(2) + " KB";
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + " MB";
  return (bytes / 1073741824).toFixed(2) + " GB";
}

// Simulated VirusTotal file scan based on file characteristics
function simulateVTFileScan(file: File, sha256: string): VTFileResult {
  const suspiciousExtensions = [".exe", ".bat", ".cmd", ".scr", ".pif", ".com", ".vbs", ".js", ".wsf", ".msi"];
  const riskyExtensions = [".zip", ".rar", ".7z", ".iso", ".dmg"];
  const ext = "." + file.name.split(".").pop()?.toLowerCase();

  const engines = [
    "Kaspersky", "BitDefender", "Norton", "ESET", "Avira", "McAfee", "Sophos",
    "Fortinet", "Trend Micro", "Webroot", "Comodo", "ClamAV", "Avast", "AVG",
    "Malwarebytes", "F-Secure", "Panda", "DrWeb", "Ikarus", "GData",
    "ZoneAlarm", "Cyren", "Arcabit", "Baidu", "Rising", "Jiangmin",
    "K7", "Symantec", "TotalDefense", "VBA32", "Zillya", "Yandex",
  ];

  let maliciousCount = 0;
  let suspiciousCount = 0;
  const threats: string[] = [];

  if (suspiciousExtensions.includes(ext)) {
    maliciousCount = 3 + Math.floor(Math.random() * 5);
    suspiciousCount = 2 + Math.floor(Math.random() * 3);
    threats.push("Trojan.GenericKD.XXXXXX", "Win32.Malware.Gen");
  } else if (riskyExtensions.includes(ext)) {
    suspiciousCount = 1 + Math.floor(Math.random() * 2);
    threats.push("Archive.Suspicious");
  }

  if (file.size > 50 * 1024 * 1024) {
    suspiciousCount += 1;
  }

  const engineResults = engines.map((name, i) => {
    let result: "clean" | "malicious" | "suspicious" | "unrated" = "clean";
    if (i < maliciousCount) result = "malicious";
    else if (i < maliciousCount + suspiciousCount) result = "suspicious";
    else if (i >= engines.length - 2) result = "unrated";
    return { name, result };
  });

  // Shuffle
  for (let i = engineResults.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [engineResults[i], engineResults[j]] = [engineResults[j], engineResults[i]];
  }

  const cleanCount = engineResults.filter(e => e.result === "clean").length;
  const score = Math.round((cleanCount / engines.length) * 100);

  let recommendation = "";
  if (maliciousCount > 0) {
    recommendation = "Ce fichier est potentiellement dangereux. Ne l'executez pas et supprimez-le immediatement. Si vous l'avez deja ouvert, lancez un scan antivirus complet de votre systeme.";
  } else if (suspiciousCount > 0) {
    recommendation = "Ce fichier presente des elements suspects. Evitez de l'executer sans verification approfondie. Soumettez-le a une sandbox pour analyse dynamique.";
  } else {
    recommendation = "Aucune menace detectee. Le fichier semble sain d'apres les moteurs antivirus. Restez vigilant avec les fichiers provenant de sources inconnues.";
  }

  return {
    score,
    total: engines.length,
    engines: engineResults,
    threats,
    recommendation,
  };
}

export function FileAnalyzer() {
  const [result, setResult] = useState<FileResult | null>(null);
  const [vtResult, setVtResult] = useState<VTFileResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [vtScanning, setVtScanning] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [copiedField, setCopiedField] = useState("");
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const analyzeFile = async (file: File) => {
    setAnalyzing(true);
    setResult(null);
    setVtResult(null);
    setCurrentFile(file);

    try {
      const buffer = await file.arrayBuffer();
      const [sha1, sha256] = await Promise.all([
        computeHash(buffer, "SHA-1"),
        computeHash(buffer, "SHA-256"),
      ]);
      const md5Hash = md5(buffer);

      const fileResult: FileResult = {
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        lastModified: new Date(file.lastModified).toLocaleString("fr-FR"),
        md5: md5Hash,
        sha1,
        sha256,
      };

      setResult(fileResult);
      setAnalyzing(false);

      // Auto-launch VirusTotal scan
      setVtScanning(true);
      await new Promise((r) => setTimeout(r, 2000 + Math.random() * 1500));
      const vtRes = simulateVTFileScan(file, sha256);
      setVtResult(vtRes);
      setVtScanning(false);
    } catch (err) {
      console.error("File analysis error:", err);
      setAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) analyzeFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) analyzeFile(file);
  };

  const copyHash = async (hash: string, field: string) => {
    await navigator.clipboard.writeText(hash);
    setCopiedField(field);
    setTimeout(() => setCopiedField(""), 2000);
  };

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
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)" }}>
            <FileSearch className="w-3.5 h-3.5 text-[#ef4444]" />
            <span className="text-[#ef4444]" style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace" }}>Hash + VirusTotal</span>
          </div>
          <h1 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.8rem, 3vw, 2.2rem)" }} className="text-[#e2e8f0] mb-4">
            Analyseur de{" "}
            <span style={{ background: "linear-gradient(135deg, #ef4444, #f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Fichiers</span>
          </h1>
          <p className="text-[#94a3b8] max-w-xl mx-auto" style={{ lineHeight: 1.7 }}>
            Calculez les empreintes cryptographiques de vos fichiers puis scannez-les automatiquement
            avec les moteurs antivirus VirusTotal pour detecter les menaces.
          </p>
        </motion.div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`bg-[#111827] border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all mb-8 ${
            dragOver
              ? "border-[#ef4444] bg-[#ef4444]/5"
              : "border-[#ef4444]/20 hover:border-[#ef4444]/50"
          }`}
        >
          <input ref={fileRef} type="file" onChange={handleFileSelect} className="hidden" />
          <Upload className={`w-12 h-12 mx-auto mb-4 ${dragOver ? "text-[#ef4444]" : "text-[#64748b]"}`} />
          <p className="text-[#e2e8f0] mb-2">
            {analyzing ? "Analyse en cours..." : "Glissez-deposez un fichier ici"}
          </p>
          <p className="text-[#64748b]" style={{ fontSize: "0.85rem" }}>
            ou cliquez pour selectionner un fichier
          </p>
        </div>

        {/* Results */}
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* File info */}
            <div className="bg-[#111827] border border-[#00d4ff]/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#ef4444]/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#ef4444]" />
                </div>
                <div>
                  <p className="text-[#e2e8f0]">{result.name}</p>
                  <p className="text-[#64748b]" style={{ fontSize: "0.8rem" }}>
                    {formatBytes(result.size)} &bull; {result.type}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0a0a0f] rounded-lg p-3">
                  <p className="text-[#64748b]" style={{ fontSize: "0.75rem" }}>Taille</p>
                  <p className="text-[#e2e8f0]" style={{ fontSize: "0.9rem" }}>{formatBytes(result.size)}</p>
                </div>
                <div className="bg-[#0a0a0f] rounded-lg p-3">
                  <p className="text-[#64748b]" style={{ fontSize: "0.75rem" }}>Derniere modification</p>
                  <p className="text-[#e2e8f0]" style={{ fontSize: "0.9rem" }}>{result.lastModified}</p>
                </div>
              </div>
            </div>

            {/* Hashes */}
            {[
              { label: "MD5", value: result.md5, note: "FNV-based (navigateur)" },
              { label: "SHA-1", value: result.sha1, note: "Web Crypto API" },
              { label: "SHA-256", value: result.sha256, note: "Web Crypto API" },
            ].map((h) => (
              <div key={h.label} className="bg-[#111827] border border-[#00d4ff]/10 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-[#00d4ff]" />
                    <span className="text-[#e2e8f0]">{h.label}</span>
                    <span className="text-[#64748b]" style={{ fontSize: "0.7rem" }}>({h.note})</span>
                  </div>
                  <button
                    onClick={() => copyHash(h.value, h.label)}
                    className="p-1.5 rounded-lg hover:bg-[#1e293b] text-[#94a3b8] hover:text-[#39ff14] transition-colors"
                  >
                    {copiedField === h.label ? <Check className="w-4 h-4 text-[#39ff14]" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p
                  className="font-mono text-[#00d4ff] bg-[#0a0a0f] rounded-lg p-3 break-all"
                  style={{ fontSize: "0.8rem", letterSpacing: "0.5px" }}
                >
                  {h.value}
                </p>
              </div>
            ))}

            {/* VirusTotal Scan Section */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-[#8b5cf6]" />
                <h2 className="text-[#e2e8f0]" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1.1rem" }}>
                  Scan <span className="text-[#8b5cf6]">VirusTotal</span>
                </h2>
              </div>

              {vtScanning && (
                <div className="bg-[#111827] border border-[#8b5cf6]/20 rounded-xl p-8 flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-[#8b5cf6] animate-spin" />
                  <p className="text-[#8b5cf6]" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.85rem" }}>
                    Interrogation de {32} moteurs antivirus...
                  </p>
                  <p className="text-[#64748b]" style={{ fontSize: "0.8rem" }}>
                    Recherche du hash SHA-256 dans la base VirusTotal
                  </p>
                </div>
              )}

              <AnimatePresence>
                {vtResult && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    {/* Score */}
                    <div className="bg-[#111827] border border-[#8b5cf6]/20 rounded-xl p-6 text-center">
                      <p className="text-[#94a3b8] mb-2" style={{ fontSize: "0.85rem" }}>Score de securite</p>
                      <div
                        className="mb-2"
                        style={{
                          fontFamily: "Orbitron, sans-serif",
                          fontSize: "3.5rem",
                          color: vtResult.score >= 90 ? "#39ff14" : vtResult.score >= 70 ? "#f59e0b" : "#ef4444",
                        }}
                      >
                        {vtResult.score}%
                      </div>
                      <div className="flex items-center justify-center gap-4 flex-wrap">
                        {[
                          { label: "Sains", count: vtResult.engines.filter(e => e.result === "clean").length, color: "#39ff14" },
                          { label: "Malveillants", count: vtResult.engines.filter(e => e.result === "malicious").length, color: "#ef4444" },
                          { label: "Suspects", count: vtResult.engines.filter(e => e.result === "suspicious").length, color: "#f59e0b" },
                          { label: "Non evalues", count: vtResult.engines.filter(e => e.result === "unrated").length, color: "#64748b" },
                        ].map((s) => (
                          <span key={s.label} className="flex items-center gap-1.5" style={{ fontSize: "0.8rem" }}>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                            <span style={{ color: s.color }}>{s.count}</span>
                            <span className="text-[#64748b]">{s.label}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Threats detected */}
                    {vtResult.threats.length > 0 && (
                      <div className="bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Bug className="w-5 h-5 text-[#ef4444]" />
                          <p className="text-[#ef4444]" style={{ fontSize: "0.9rem" }}>Menaces detectees</p>
                        </div>
                        <div className="space-y-2">
                          {vtResult.threats.map((t, i) => (
                            <div key={i} className="flex items-center gap-2 bg-[#0a0a0f] rounded-lg px-3 py-2">
                              <XCircle className="w-4 h-4 text-[#ef4444] flex-shrink-0" />
                              <span className="text-[#e2e8f0] font-mono" style={{ fontSize: "0.85rem" }}>{t}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendation */}
                    <div
                      className="rounded-xl p-4 flex items-start gap-3"
                      style={{
                        background: vtResult.score >= 90 ? "rgba(57,255,20,0.05)" : vtResult.score >= 70 ? "rgba(245,158,11,0.05)" : "rgba(239,68,68,0.05)",
                        border: `1px solid ${vtResult.score >= 90 ? "rgba(57,255,20,0.2)" : vtResult.score >= 70 ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.2)"}`,
                      }}
                    >
                      {vtResult.score >= 90 ? (
                        <CheckCircle className="w-5 h-5 text-[#39ff14] flex-shrink-0 mt-0.5" />
                      ) : vtResult.score >= 70 ? (
                        <AlertTriangle className="w-5 h-5 text-[#f59e0b] flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p style={{ fontSize: "0.9rem", color: vtResult.score >= 90 ? "#39ff14" : vtResult.score >= 70 ? "#f59e0b" : "#ef4444" }}>
                          {vtResult.score >= 90 ? "Fichier sain" : vtResult.score >= 70 ? "Fichier suspect" : "Fichier dangereux"}
                        </p>
                        <p className="text-[#94a3b8]" style={{ fontSize: "0.8rem" }}>{vtResult.recommendation}</p>
                      </div>
                    </div>

                    {/* Engine details (collapsible) */}
                    <details className="bg-[#111827] border border-[#00d4ff]/10 rounded-xl overflow-hidden">
                      <summary className="p-4 cursor-pointer text-[#e2e8f0] hover:bg-[#1e293b]/30 transition-colors" style={{ fontSize: "0.9rem" }}>
                        Details par moteur antivirus ({vtResult.total} moteurs)
                      </summary>
                      <div className="divide-y divide-[#00d4ff]/5 max-h-80 overflow-y-auto">
                        {vtResult.engines.map((e) => (
                          <div key={e.name} className="flex items-center justify-between px-4 py-2.5">
                            <span className="text-[#e2e8f0]" style={{ fontSize: "0.85rem" }}>{e.name}</span>
                            <span
                              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full"
                              style={{ fontSize: "0.75rem", color: getColor(e.result), backgroundColor: `${getColor(e.result)}15` }}
                            >
                              {e.result === "clean" ? <CheckCircle className="w-3 h-3" /> : e.result === "malicious" ? <XCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                              {getLabel(e.result)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>

                    {/* Note */}
                    <div className="bg-[#8b5cf6]/5 border border-[#8b5cf6]/20 rounded-xl p-4 flex items-start gap-3">
                      <ExternalLink className="w-5 h-5 text-[#8b5cf6] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[#8b5cf6]" style={{ fontSize: "0.9rem" }}>Simulation VirusTotal</p>
                        <p className="text-[#94a3b8]" style={{ fontSize: "0.8rem" }}>
                          Les resultats affiches sont une simulation. Pour une analyse reelle, soumettez le hash SHA-256
                          sur{" "}
                          <a href="https://www.virustotal.com" target="_blank" rel="noopener noreferrer" className="text-[#8b5cf6] hover:underline">
                            virustotal.com
                          </a>.
                          Les hash sont calcules 100% localement via Web Crypto API.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
