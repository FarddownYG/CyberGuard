import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft, Code, Zap, Eye, Save, Trash2, CheckCircle, AlertTriangle,
  Terminal, Download, Globe, Lock, RefreshCw, Search, Radio, Shield,
  Hash, FileSearch, ShieldCheck, Frame, Cpu, ExternalLink
} from "lucide-react";
import { motion } from "motion/react";
import { Link, useNavigate } from "react-router";
import { analyzePythonCode, type AnalyzedTool } from "./python-analyzer";
import {
  saveCustomTool, getCustomTools, deleteCustomTool, generateToolId,
  type CustomTool,
} from "./tool-store";
import type { ComponentType } from "react";

// Icon map for rendering
const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  Radio, Shield, Globe, Lock, RefreshCw, Search, Eye, Zap, Code,
  Hash, FileSearch, ShieldCheck, Frame, Cpu, ExternalLink,
};

const COLOR_OPTIONS = [
  { value: "#00d4ff", label: "Bleu electrique" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#f59e0b", label: "Ambre" },
  { value: "#22c55e", label: "Vert" },
  { value: "#ef4444", label: "Rouge" },
  { value: "#f97316", label: "Orange" },
  { value: "#f43f5e", label: "Rose" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#10b981", label: "Emeraude" },
  { value: "#a855f7", label: "Pourpre" },
];

const EXAMPLE_SCRIPT = `#!/usr/bin/env python3
"""
SSL Certificate Checker - CyberGuard
Verifie la validite et la configuration SSL/TLS d'un domaine.

Usage:
    python ssl_checker.py exemple.com
    python ssl_checker.py exemple.com -o rapport.json
"""

import argparse, json, ssl, socket, datetime

def check_ssl(domain, port=443, timeout=10):
    """Verifie le certificat SSL d'un domaine."""
    results = {"domain": domain, "port": port}
    try:
        ctx = ssl.create_default_context()
        with ctx.wrap_socket(socket.socket(), server_hostname=domain) as s:
            s.settimeout(timeout)
            s.connect((domain, port))
            cert = s.getpeercert()
            results["subject"] = dict(x[0] for x in cert.get("subject", ()))
            results["issuer"] = dict(x[0] for x in cert.get("issuer", ()))
            results["version"] = cert.get("version")
            results["serial"] = cert.get("serialNumber")
            not_after = cert.get("notAfter", "")
            results["expires"] = not_after
            exp_date = datetime.datetime.strptime(not_after, "%b %d %H:%M:%S %Y %Z")
            results["days_left"] = (exp_date - datetime.datetime.utcnow()).days
            results["valid"] = results["days_left"] > 0
            results["san"] = [x[1] for x in cert.get("subjectAltName", ())]
            results["protocol"] = s.version()
    except Exception as e:
        results["error"] = str(e)
        results["valid"] = False
    return results

def check_protocols(domain, port=443):
    """Teste les protocoles TLS supportes."""
    protocols = {}
    for proto_name, proto_const in [
        ("TLSv1.2", ssl.PROTOCOL_TLSv1_2 if hasattr(ssl, 'PROTOCOL_TLSv1_2') else None),
        ("TLSv1.3", None),
    ]:
        if proto_const is None:
            protocols[proto_name] = "non teste"
            continue
        try:
            ctx = ssl.SSLContext(proto_const)
            with ctx.wrap_socket(socket.socket(), server_hostname=domain) as s:
                s.settimeout(5)
                s.connect((domain, port))
                protocols[proto_name] = "supporte"
        except:
            protocols[proto_name] = "non supporte"
    return protocols

def main():
    parser = argparse.ArgumentParser(description="SSL Certificate Checker - CyberGuard")
    parser.add_argument("domain", help="Domaine a verifier")
    parser.add_argument("-p", "--port", type=int, default=443, help="Port (defaut: 443)")
    parser.add_argument("-o", "--output", help="Export JSON")
    args = parser.parse_args()

    print(f"\\n  Verification SSL de {args.domain}:{args.port}\\n")
    result = check_ssl(args.domain, args.port)
    protocols = check_protocols(args.domain, args.port)
    result["protocols"] = protocols

    for k, v in result.items():
        print(f"  {k}: {v}")

    if args.output:
        with open(args.output, "w") as f:
            json.dump(result, f, indent=2, default=str)
        print(f"\\n  Exporte: {args.output}")

if __name__ == "__main__":
    main()
`;

function CodeEditor({
  value,
  onChange,
  placeholder,
  readOnly = false,
  minHeight = "400px",
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: string;
}) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);

  const lineCount = value.split("\n").length;

  const handleScroll = () => {
    if (textRef.current && linesRef.current) {
      linesRef.current.scrollTop = textRef.current.scrollTop;
    }
  };

  const handleTab = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = textRef.current!;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newVal = value.slice(0, start) + "    " + value.slice(end);
      onChange?.(newVal);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 4;
      });
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden" style={{ border: "1px solid #1e293b" }}>
      {/* Header bar */}
      <div
        className="flex items-center gap-2 px-4 py-2"
        style={{ background: "#0f172a", borderBottom: "1px solid #1e293b" }}
      >
        <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/70" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/70" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#39ff14]/70" />
        <span
          className="ml-2 text-[#4a5568]"
          style={{ fontSize: "0.7rem", fontFamily: "JetBrains Mono, monospace" }}
        >
          {readOnly ? "preview.py" : "votre_outil.py"}
        </span>
      </div>

      <div className="flex" style={{ minHeight, background: "#0a0a0f" }}>
        {/* Line numbers */}
        <div
          ref={linesRef}
          className="select-none overflow-hidden flex-shrink-0 py-3 px-2 text-right"
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "0.75rem",
            lineHeight: "1.5rem",
            color: "#4a5568",
            minWidth: "3rem",
            background: "#0f172a",
          }}
        >
          {Array.from({ length: Math.max(lineCount, 20) }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Code area */}
        <textarea
          ref={textRef}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleTab}
          readOnly={readOnly}
          placeholder={placeholder}
          spellCheck={false}
          className="flex-1 resize-none p-3 bg-transparent text-[#e2e8f0] placeholder-[#2a3441] focus:outline-none"
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "0.8rem",
            lineHeight: "1.5rem",
            tabSize: 4,
            caretColor: "#00d4ff",
            minHeight,
          }}
        />
      </div>
    </div>
  );
}

function AnalysisPanel({ analysis }: { analysis: AnalyzedTool }) {
  const IconComp = ICON_MAP[analysis.iconKey] || Code;

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{ background: "rgba(17,24,39,0.5)", border: `1px solid ${analysis.color}20` }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: `${analysis.color}20` }}
        >
          <IconComp className="w-5 h-5" style={{ color: analysis.color }} />
        </div>
        <div>
          <p className="text-[#e2e8f0]" style={{ fontSize: "0.95rem" }}>
            {analysis.name}
          </p>
          <span
            className="px-2 py-0.5 rounded text-xs"
            style={{ background: `${analysis.color}15`, color: analysis.color }}
          >
            {analysis.category}
          </span>
        </div>
      </div>

      <p className="text-[#94a3b8]" style={{ fontSize: "0.82rem", lineHeight: 1.6 }}>
        {analysis.description}
      </p>

      {/* Detected functions */}
      {analysis.functions.length > 0 && (
        <div>
          <p className="text-[#64748b] mb-1.5" style={{ fontSize: "0.72rem" }}>
            Fonctions detectees ({analysis.functions.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.functions.map((fn) => (
              <span
                key={fn}
                className="px-2 py-0.5 rounded text-[#39ff14]"
                style={{
                  background: "rgba(57,255,20,0.06)",
                  fontSize: "0.72rem",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {fn}()
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Features */}
      <div>
        <p className="text-[#64748b] mb-1.5" style={{ fontSize: "0.72rem" }}>
          Fonctionnalites auto-detectees
        </p>
        <div className="space-y-1.5">
          {analysis.features.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-[#39ff14] flex-shrink-0" />
              <span className="text-[#94a3b8]" style={{ fontSize: "0.78rem" }}>
                {f.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Dependencies */}
      <div>
        <p className="text-[#64748b] mb-1.5" style={{ fontSize: "0.72rem" }}>
          Dependances
        </p>
        {analysis.dependencies.length === 0 ? (
          <span className="text-[#39ff14]" style={{ fontSize: "0.78rem" }}>
            Aucune dependance externe
          </span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {analysis.dependencies.map((d) => (
              <span
                key={d}
                className="px-2 py-0.5 rounded text-[#f59e0b]"
                style={{ background: "rgba(245,158,11,0.08)", fontSize: "0.72rem" }}
              >
                {d}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* API Key */}
      {analysis.needsApiKey && (
        <div className="flex items-center gap-2 text-[#f59e0b]">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span style={{ fontSize: "0.78rem" }}>
            Necessite: {analysis.apiKeyName}
          </span>
        </div>
      )}

      {/* GUI config preview */}
      <div>
        <p className="text-[#64748b] mb-1" style={{ fontSize: "0.72rem" }}>
          Config GUI auto-generee
        </p>
        <pre
          className="text-[#94a3b8] rounded-lg p-2 overflow-x-auto"
          style={{
            background: "#0a0a0f",
            fontSize: "0.68rem",
            fontFamily: "JetBrains Mono, monospace",
            border: "1px solid #1e293b",
          }}
        >
          {`import: ${analysis.guiImportLine}\nprocess: ${analysis.guiProcessCode.trim()}\ninput: ${analysis.inputType} → "${analysis.inputPlaceholder}"`}
        </pre>
      </div>
    </div>
  );
}

export function ToolCreatorPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [analysis, setAnalysis] = useState<AnalyzedTool | null>(null);
  const [saved, setSaved] = useState(false);
  const [existingTools, setExistingTools] = useState<CustomTool[]>([]);
  const [activeTab, setActiveTab] = useState<"create" | "manage">("create");

  // Overrides
  const [nameOverride, setNameOverride] = useState("");
  const [descOverride, setDescOverride] = useState("");
  const [colorOverride, setColorOverride] = useState("");

  const refreshTools = useCallback(() => {
    setExistingTools(getCustomTools());
  }, []);

  useEffect(() => {
    refreshTools();
    const handler = () => refreshTools();
    window.addEventListener("cyberguard-tools-updated", handler);
    return () => window.removeEventListener("cyberguard-tools-updated", handler);
  }, [refreshTools]);

  // Auto-analyze on code change (debounced)
  useEffect(() => {
    if (!code.trim()) {
      setAnalysis(null);
      return;
    }
    const timer = setTimeout(() => {
      try {
        const result = analyzePythonCode(code);
        setAnalysis(result);
        setSaved(false);
      } catch {
        setAnalysis(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [code]);

  const handleSave = () => {
    if (!analysis) return;

    const tool: CustomTool = {
      id: generateToolId(),
      slug: analysis.slug,
      name: nameOverride || analysis.name,
      description: descOverride || analysis.description,
      pythonScript: code,
      features: analysis.features,
      requirements: analysis.requirements,
      needsApiKey: analysis.needsApiKey,
      apiKeyName: analysis.apiKeyName,
      inputType: analysis.inputType,
      inputPlaceholder: analysis.inputPlaceholder,
      color: colorOverride || analysis.color,
      iconKey: analysis.iconKey,
      category: analysis.category,
      mainFunction: analysis.mainFunction,
      guiImportLine: analysis.guiImportLine,
      guiProcessCode: analysis.guiProcessCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveCustomTool(tool);
    setSaved(true);
    refreshTools();
    setTimeout(() => setSaved(false), 3000);
  };

  const handleDelete = (id: string) => {
    deleteCustomTool(id);
    refreshTools();
  };

  const loadExample = () => {
    setCode(EXAMPLE_SCRIPT);
  };

  return (
    <div className="min-h-screen py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <Link
            to="/hacking-ethique"
            className="inline-flex items-center gap-2 text-[#64748b] hover:text-[#00d4ff] transition-colors mb-8"
            style={{ fontSize: "0.85rem" }}
          >
            <ArrowLeft className="w-4 h-4" />
            Retour au Hub
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4"
            style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}
          >
            <Terminal className="w-3.5 h-3.5 text-[#8b5cf6]" />
            <span
              className="text-[#8b5cf6]"
              style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace" }}
            >
              Createur d'outils
            </span>
          </div>
          <h1
            className="text-[#e2e8f0] mb-3"
            style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.5rem, 3vw, 2rem)" }}
          >
            <span
              style={{
                background: "linear-gradient(135deg, #8b5cf6, #00d4ff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Ajouter un outil
            </span>
          </h1>
          <p className="text-[#94a3b8] max-w-xl mx-auto" style={{ fontSize: "0.88rem", lineHeight: 1.7 }}>
            Collez votre code dans <strong className="text-[#e2e8f0]">n'importe quel langage</strong> (Python, C, JavaScript, Go, Rust...) — l'analyseur detecte automatiquement le nom, les fonctionnalites, et genere la page, le ZIP et la GUI PyQt6. Si le code n'est pas en Python, il sera automatiquement converti.
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 justify-center">
          {(["create", "manage"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-5 py-2.5 rounded-lg transition-all"
              style={{
                background: activeTab === tab ? "rgba(139,92,246,0.15)" : "rgba(17,24,39,0.4)",
                border: `1px solid ${activeTab === tab ? "rgba(139,92,246,0.3)" : "rgba(30,41,59,0.5)"}`,
                color: activeTab === tab ? "#8b5cf6" : "#64748b",
                fontFamily: "Orbitron, sans-serif",
                fontSize: "0.8rem",
              }}
            >
              {tab === "create" ? "Creer" : `Mes outils (${existingTools.length})`}
            </button>
          ))}
        </div>

        {activeTab === "create" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Code editor - 3/5 */}
              <div className="lg:col-span-3 space-y-4">
                <div className="flex items-center justify-between">
                  <h2
                    className="text-[#e2e8f0] flex items-center gap-2"
                    style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.95rem" }}
                  >
                    <Code className="w-4 h-4 text-[#8b5cf6]" />
                    Code source (tout langage)
                  </h2>
                  <button
                    onClick={loadExample}
                    className="px-3 py-1.5 rounded-lg text-[#64748b] hover:text-[#8b5cf6] transition-colors"
                    style={{
                      fontSize: "0.75rem",
                      background: "rgba(139,92,246,0.06)",
                      border: "1px solid rgba(139,92,246,0.1)",
                    }}
                  >
                    Charger un exemple
                  </button>
                </div>

                <CodeEditor
                  value={code}
                  onChange={setCode}
                  placeholder={"# Collez votre code ici (Python, C, JS, Go, Rust...)&#10;# L'analyseur detecte automatiquement :&#10;#   - Nom et description&#10;#   - Fonctions&#10;#   - Dependances&#10;#   - Type d'input (URL, texte)&#10;#   - Besoin d'API key&#10;&#10;// Du code C ou JS est accepte aussi !&#10;"}
                  minHeight="450px"
                />

                {/* Override fields */}
                {analysis && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl p-5 space-y-4"
                    style={{ background: "rgba(17,24,39,0.3)", border: "1px solid #1e293b" }}
                  >
                    <h3
                      className="text-[#e2e8f0] flex items-center gap-2"
                      style={{ fontSize: "0.85rem", fontFamily: "Orbitron, sans-serif" }}
                    >
                      <Zap className="w-3.5 h-3.5 text-[#f59e0b]" />
                      Personnaliser (optionnel)
                    </h3>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[#64748b] block mb-1" style={{ fontSize: "0.72rem" }}>
                          Nom de l'outil
                        </label>
                        <input
                          value={nameOverride}
                          onChange={(e) => setNameOverride(e.target.value)}
                          placeholder={analysis.name}
                          className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#1e293b] rounded-lg text-[#e2e8f0] placeholder-[#2a3441] focus:outline-none focus:border-[#8b5cf6]/40"
                          style={{ fontSize: "0.82rem" }}
                        />
                      </div>
                      <div>
                        <label className="text-[#64748b] block mb-1" style={{ fontSize: "0.72rem" }}>
                          Couleur
                        </label>
                        <div className="flex gap-1.5 flex-wrap">
                          {COLOR_OPTIONS.map((c) => (
                            <button
                              key={c.value}
                              onClick={() => setColorOverride(c.value)}
                              className="w-7 h-7 rounded-lg transition-all hover:scale-110"
                              style={{
                                background: c.value,
                                outline:
                                  (colorOverride || analysis.color) === c.value
                                    ? `2px solid ${c.value}`
                                    : "none",
                                outlineOffset: "2px",
                              }}
                              title={c.label}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[#64748b] block mb-1" style={{ fontSize: "0.72rem" }}>
                        Description
                      </label>
                      <textarea
                        value={descOverride}
                        onChange={(e) => setDescOverride(e.target.value)}
                        placeholder={analysis.description}
                        rows={2}
                        className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#1e293b] rounded-lg text-[#e2e8f0] placeholder-[#2a3441] focus:outline-none focus:border-[#8b5cf6]/40 resize-none"
                        style={{ fontSize: "0.82rem" }}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Save button */}
                {analysis && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3"
                  >
                    <button
                      onClick={handleSave}
                      className="flex-1 py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2.5 hover:scale-[1.01]"
                      style={{
                        background: saved
                          ? "linear-gradient(135deg, #39ff14, #22c55e)"
                          : "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                        color: saved ? "#0a0a0f" : "#fff",
                        fontFamily: "Orbitron, sans-serif",
                        fontSize: "0.88rem",
                      }}
                    >
                      {saved ? (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Outil ajoute au Hub !
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Ajouter au Hub
                        </>
                      )}
                    </button>
                  </motion.div>
                )}
              </div>

              {/* Analysis panel - 2/5 */}
              <div className="lg:col-span-2 space-y-4">
                <h2
                  className="text-[#e2e8f0] flex items-center gap-2"
                  style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.95rem" }}
                >
                  <Eye className="w-4 h-4 text-[#39ff14]" />
                  Analyse automatique
                </h2>

                {!analysis && (
                  <div
                    className="rounded-xl p-8 flex flex-col items-center justify-center text-center"
                    style={{ background: "rgba(17,24,39,0.3)", border: "1px solid #1e293b", minHeight: "300px" }}
                  >
                    <Terminal className="w-12 h-12 text-[#2a3441] mb-4" />
                    <p className="text-[#4a5568] mb-2" style={{ fontSize: "0.85rem" }}>
                      Collez votre code Python a gauche
                    </p>
                    <p className="text-[#2a3441]" style={{ fontSize: "0.75rem" }}>
                      L'analyse se lance automatiquement
                    </p>
                  </div>
                )}

                {analysis && <AnalysisPanel analysis={analysis} />}

                {/* What gets generated */}
                {analysis && (
                  <div
                    className="rounded-xl p-4 space-y-2"
                    style={{ background: "rgba(57,255,20,0.03)", border: "1px solid rgba(57,255,20,0.08)" }}
                  >
                    <p
                      className="text-[#39ff14] flex items-center gap-1.5"
                      style={{ fontSize: "0.78rem", fontFamily: "Orbitron, sans-serif" }}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Generation automatique
                    </p>
                    <div className="space-y-1.5">
                      {[
                        "Page dediee sur le Hub",
                        "Outil interactif dans le navigateur",
                        "ZIP telechargeable (CLI + GUI PyQt6)",
                        "README + DISCLAIMER",
                        "Branding CyberGuard",
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-[#39ff14]" />
                          <span className="text-[#94a3b8]" style={{ fontSize: "0.75rem" }}>
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Manage tab */}
        {activeTab === "manage" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {existingTools.length === 0 ? (
              <div
                className="rounded-xl p-12 text-center"
                style={{ background: "rgba(17,24,39,0.3)", border: "1px solid #1e293b" }}
              >
                <Terminal className="w-14 h-14 text-[#2a3441] mx-auto mb-4" />
                <p className="text-[#4a5568] mb-2" style={{ fontSize: "0.95rem" }}>
                  Aucun outil personalise
                </p>
                <p className="text-[#2a3441] mb-6" style={{ fontSize: "0.82rem" }}>
                  Creez votre premier outil dans l'onglet "Creer"
                </p>
                <button
                  onClick={() => setActiveTab("create")}
                  className="px-5 py-2.5 rounded-lg text-[#8b5cf6] hover:bg-[#8b5cf6]/10 transition-colors"
                  style={{
                    border: "1px solid rgba(139,92,246,0.2)",
                    fontSize: "0.85rem",
                    fontFamily: "Orbitron, sans-serif",
                  }}
                >
                  Creer un outil
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {existingTools.map((tool) => {
                  const IconComp = ICON_MAP[tool.iconKey] || Code;
                  return (
                    <div
                      key={tool.id}
                      className="rounded-xl p-5 group"
                      style={{
                        background: "rgba(17,24,39,0.4)",
                        border: `1px solid ${tool.color}15`,
                      }}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${tool.color}15` }}
                        >
                          <IconComp className="w-5 h-5" style={{ color: tool.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[#e2e8f0] truncate" style={{ fontSize: "0.88rem" }}>
                            {tool.name}
                          </p>
                          <p className="text-[#64748b] truncate" style={{ fontSize: "0.72rem" }}>
                            {tool.category} — {new Date(tool.createdAt).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                      </div>
                      <p
                        className="text-[#94a3b8] mb-4 line-clamp-2"
                        style={{ fontSize: "0.78rem", lineHeight: 1.5 }}
                      >
                        {tool.description}
                      </p>
                      <div className="flex gap-2">
                        <Link
                          to={`/hacking-ethique/custom/${tool.slug}`}
                          className="flex-1 py-2 rounded-lg text-center text-[#00d4ff] hover:bg-[#00d4ff]/10 transition-colors"
                          style={{ fontSize: "0.78rem", border: "1px solid rgba(0,212,255,0.15)" }}
                        >
                          Voir la page
                        </Link>
                        <button
                          onClick={() => handleDelete(tool.id)}
                          className="px-3 py-2 rounded-lg text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
                          style={{ border: "1px solid rgba(239,68,68,0.15)" }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}