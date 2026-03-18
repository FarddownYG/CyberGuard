import { motion } from "motion/react";
import {
  ArrowLeft, Download, Globe, AlertTriangle, Shield,
  ChevronRight, Zap, ExternalLink, Monitor, ShieldOff
} from "lucide-react";
import { Link } from "react-router";
import type { ReactNode, ComponentType } from "react";
import { downloadToolZip, downloadCToolZip } from "./zip-generator";
import type { GuiConfig } from "./zip-generator";
import { C_SCRIPTS } from "./c-scripts";

interface Feature {
  icon: ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}

interface ToolPageLayoutProps {
  title: string;
  subtitle: string;
  description: string;
  features: Feature[];
  requirements: string[];
  pythonScript: string;
  readmeContent: string;
  toolSlug: string;
  icon: ComponentType<{ className?: string }>;
  color?: string;
  needsApiKey?: boolean;
  apiKeyName?: string;
  children?: ReactNode;
  hubAnchor?: string;
  guiConfig?: GuiConfig;
  disableOnlineTest?: boolean;
}

export function ToolPageLayout({
  title,
  subtitle,
  description,
  features,
  requirements,
  pythonScript,
  readmeContent,
  toolSlug,
  icon: Icon,
  color = "#00d4ff",
  needsApiKey,
  apiKeyName,
  children,
  guiConfig,
  disableOnlineTest,
}: ToolPageLayoutProps) {
  const handleDownload = () => {
    downloadToolZip(toolSlug, pythonScript, readmeContent, guiConfig);
  };

  const handleDownloadC = () => {
    const cScript = C_SCRIPTS[toolSlug];
    if (cScript) {
      downloadCToolZip(toolSlug, cScript, readmeContent);
    }
  };

  const hasCVersion = !!C_SCRIPTS[toolSlug];

  const scrollToDemo = () => {
    const el = document.getElementById("interactive-demo");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen py-20 relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-8"
          style={{
            background: `radial-gradient(circle, ${color}20, transparent 70%)`,
            top: "-10%",
            right: "-10%",
          }}
        />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back link */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <Link
            to="/hacking-ethique"
            className="inline-flex items-center gap-2 text-[#64748b] hover:text-[#00d4ff] transition-colors mb-8"
            style={{ fontSize: "0.85rem" }}
          >
            <ArrowLeft className="w-4 h-4" />
            Retour au Hacking Ethique
          </Link>
        </motion.div>

        {/* Web version banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-xl px-4 py-3 flex items-center gap-3"
          style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}
        >
          <AlertTriangle className="w-4 h-4 text-[#f59e0b] flex-shrink-0" />
          <p className="text-[#f59e0b]/90" style={{ fontSize: "0.78rem", lineHeight: 1.5 }}>
            La version web est limitee en puissance (navigateur). Pour de meilleurs resultats,{" "}
            <button onClick={handleDownload} className="underline hover:text-[#f59e0b] transition-colors cursor-pointer" style={{ fontFamily: "Orbitron, sans-serif" }}>
              telechargez l'outil Python
            </button>{" "}
            qui exploite toute la puissance de votre machine.
          </p>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6"
            style={{ background: `${color}10`, border: `1px solid ${color}20` }}
          >
            <Zap className="w-3.5 h-3.5" style={{ color }} />
            <span
              style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace", color }}
            >
              {needsApiKey ? `Necessite ${apiKeyName || "API Key"}` : "100% Gratuit — Aucune API requise"}
            </span>
          </div>
          <h1
            style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.8rem, 4vw, 2.5rem)" }}
            className="text-[#e2e8f0] mb-4"
          >
            <span
              style={{
                background: `linear-gradient(135deg, ${color}, #8b5cf6)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {title}
            </span>{" "}
            {subtitle && <span className="text-[#e2e8f0]">{subtitle}</span>}
          </h1>
          <p className="text-[#94a3b8] max-w-2xl mx-auto mb-8" style={{ lineHeight: 1.7 }}>
            {description}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {children && !disableOnlineTest && (
              <button
                onClick={scrollToDemo}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(57,255,20,0.3)] hover:scale-[1.02] cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #39ff14, #22c55e)",
                  color: "#0a0a0f",
                  fontFamily: "Orbitron, sans-serif",
                  fontSize: "0.9rem",
                }}
              >
                <Monitor className="w-5 h-5" />
                Tester dans le navigateur
              </button>
            )}
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,212,255,0.3)] hover:scale-[1.02]"
              style={{
                background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                color: "#0a0a0f",
                fontFamily: "Orbitron, sans-serif",
                fontSize: "0.9rem",
              }}
            >
              <Download className="w-5 h-5" />
              Python + GUI
            </button>
            {hasCVersion && (
              <button
                onClick={handleDownloadC}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  color: "#0a0a0f",
                  fontFamily: "Orbitron, sans-serif",
                  fontSize: "0.9rem",
                }}
              >
                <Download className="w-5 h-5" />
                Version C (10-100x plus rapide)
              </button>
            )}
          </div>
        </motion.div>

        {/* Features grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-10"
        >
          <h2
            className="text-[#e2e8f0] mb-6 flex items-center gap-2"
            style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1.05rem" }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
            Fonctionnalites
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className="rounded-xl p-5 group hover:border-[#00d4ff]/20 transition-all duration-300"
                style={{
                  background: "rgba(17,24,39,0.4)",
                  border: `1px solid ${color}10`,
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: `${color}15` }}
                >
                  <item.icon className="w-4.5 h-4.5" style={{ color }} />
                </div>
                <p className="text-[#e2e8f0] mb-1" style={{ fontSize: "0.88rem" }}>
                  {item.title}
                </p>
                <p className="text-[#64748b]" style={{ fontSize: "0.78rem", lineHeight: 1.6 }}>
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Disabled Online Test Banner */}
        {disableOnlineTest && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-10 rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <div
              className="px-5 py-3 flex items-center gap-2.5"
              style={{ background: "rgba(239,68,68,0.08)", borderBottom: "1px solid rgba(239,68,68,0.1)" }}
            >
              <ShieldOff className="w-4.5 h-4.5 text-[#ef4444]" />
              <span className="text-[#ef4444]" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.82rem" }}>
                Test en ligne desactive
              </span>
            </div>
            <div className="p-5" style={{ background: "rgba(239,68,68,0.03)" }}>
              <p className="text-[#e2e8f0] mb-3" style={{ fontSize: "0.88rem", lineHeight: 1.7 }}>
                Pour des raisons de securite, le test en ligne de cet outil est{" "}
                <strong className="text-[#ef4444]">desactive</strong>.
              </p>
              <p className="text-[#94a3b8] mb-4" style={{ fontSize: "0.82rem", lineHeight: 1.7 }}>
                Cet outil envoie des requetes vers des serveurs externes. Si on le laissait accessible en ligne,
                notre site pourrait etre utilise comme <strong className="text-[#e2e8f0]">proxy pour des attaques</strong> contre
                des cibles sans autorisation — ce qu'on refuse categoriquement.
              </p>
              <div className="rounded-lg p-4 mb-4" style={{ background: "rgba(57,255,20,0.04)", border: "1px solid rgba(57,255,20,0.1)" }}>
                <p className="text-[#39ff14] mb-1" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}>
                  La solution
                </p>
                <p className="text-[#94a3b8]" style={{ fontSize: "0.82rem", lineHeight: 1.7 }}>
                  Telechargez l'outil Python ci-dessus et executez-le <strong className="text-[#e2e8f0]">depuis votre propre machine</strong>.
                  Comme ca, c'est <strong className="text-[#e2e8f0]">votre IP</strong> qui fait la requete — pas la notre.
                  Vous restez responsable de vos actions, et notre site ne sert pas de relais.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#00d4ff]" />
                <p className="text-[#64748b]" style={{ fontSize: "0.75rem" }}>
                  CyberGuard — Pas de proxy, pas de relais. Usage responsable uniquement.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Interactive Demo */}
        {children && !disableOnlineTest && (
          <motion.div
            id="interactive-demo"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-10 scroll-mt-24"
          >
            <h2
              className="text-[#e2e8f0] mb-6 flex items-center gap-2"
              style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1.05rem" }}
            >
              <Monitor className="w-5 h-5" style={{ color }} />
              Tester en ligne
            </h2>
            <div
              className="rounded-xl p-6"
              style={{ background: "rgba(17,24,39,0.3)", border: `1px solid ${color}15` }}
            >
              {children}
            </div>
          </motion.div>
        )}

        {/* Requirements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl p-6 mb-10"
          style={{ background: "rgba(245,158,11,0.03)", border: "1px solid rgba(245,158,11,0.1)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-[#f59e0b]" />
            <h3
              className="text-[#f59e0b]"
              style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.9rem" }}
            >
              Prerequis (version Python)
            </h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {[...requirements, "PyQt6 (optionnel, pour l'interface graphique)"].map((req) => (
              <div key={req} className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-[#f59e0b] flex-shrink-0 mt-0.5" />
                <span className="text-[#94a3b8]" style={{ fontSize: "0.82rem" }}>
                  {req}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-xl p-5 mb-10 flex items-start gap-3"
          style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.15)" }}
        >
          <AlertTriangle className="w-5 h-5 text-[#f59e0b] flex-shrink-0 mt-0.5" />
          <div>
            <p
              className="text-[#f59e0b] mb-1"
              style={{ fontSize: "0.85rem", fontFamily: "Orbitron, sans-serif" }}
            >
              Usage responsable uniquement
            </p>
            <p className="text-[#94a3b8]" style={{ fontSize: "0.8rem", lineHeight: 1.6 }}>
              Cet outil est destine exclusivement a l'analyse de securite de{" "}
              <strong className="text-[#e2e8f0]">vos propres systemes</strong> ou de systemes pour
              lesquels vous avez une autorisation explicite du proprietaire. Toute utilisation non
              autorisee est illegale.
            </p>
          </div>
        </motion.div>

        {/* Download CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center rounded-xl p-10"
          style={{
            background: `linear-gradient(135deg, ${color}08, rgba(139,92,246,0.04))`,
            border: `1px solid ${color}18`,
          }}
        >
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-60" style={{ color }} />
          <h3
            className="text-[#e2e8f0] mb-2"
            style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1.1rem" }}
          >
            Telecharger {title}
          </h3>
          <p className="text-[#64748b] mb-2 max-w-md mx-auto" style={{ fontSize: "0.85rem" }}>
            Script Python complet avec interface graphique PyQt6, documentation et guide d'utilisation.{" "}
            {hasCVersion && "Version C haute performance egalement disponible. "}
            {needsApiKey
              ? `Vous devrez configurer votre propre cle ${apiKeyName || "API"}.`
              : "Aucune cle API requise."}
          </p>
          <p className="text-[#4a5568] mb-6 max-w-md mx-auto" style={{ fontSize: "0.75rem" }}>
            Le .zip contient : {toolSlug}.py (CLI) + {toolSlug}_gui.py (PyQt6) + README + DISCLAIMER
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,212,255,0.3)] hover:scale-[1.02]"
              style={{
                background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                color: "#0a0a0f",
                fontFamily: "Orbitron, sans-serif",
                fontSize: "0.88rem",
              }}
            >
              <Download className="w-5 h-5" />
              Python .zip
            </button>
            {hasCVersion && (
              <button
                onClick={handleDownloadC}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  color: "#0a0a0f",
                  fontFamily: "Orbitron, sans-serif",
                  fontSize: "0.88rem",
                }}
              >
                <Download className="w-5 h-5" />
                C .zip
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}