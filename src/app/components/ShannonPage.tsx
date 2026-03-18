import { motion } from "motion/react";
import {
  Shield, Terminal, Bug, Code, FileText, Github, ExternalLink,
  ArrowRight, Download, Cpu, Zap, ChevronRight, ArrowLeft,
  BookOpen, Server, Lock, AlertTriangle, Globe
} from "lucide-react";
import { Link } from "react-router";

const SHANNON_GITHUB = "https://github.com/FarddownYG/shannon";

const PIPELINE_STEPS = [
  { label: "Vous clonez Shannon", icon: Download, color: "#00d4ff" },
  { label: "Configurez votre clé API Anthropic", icon: Lock, color: "#8b5cf6" },
  { label: "Lancez le scan sur votre cible", icon: Terminal, color: "#f59e0b" },
  { label: "Recevez un rapport PDF détaillé", icon: FileText, color: "#39ff14" },
];

const FEATURES = [
  {
    icon: Terminal,
    title: "White-box AI",
    desc: "Analyse le code source et exécute de vraies exploitations contre l'application en live. Aucune simulation.",
  },
  {
    icon: Bug,
    title: "Zéro faux positifs",
    desc: "\"No Exploit, No Report\" — seules les vulnérabilités avec un PoC fonctionnel sont rapportées.",
  },
  {
    icon: Code,
    title: "OWASP Top 10",
    desc: "Injection, XSS, SSRF, Auth bypass, Authz — 5 pipelines d'analyse en parallèle.",
  },
  {
    icon: FileText,
    title: "Rapports actionnables",
    desc: "PoC copy-paste + remédiations détaillées. Score 96.15% sur le benchmark XBOW.",
  },
  {
    icon: Cpu,
    title: "Propulsé par Claude",
    desc: "Utilise l'API Anthropic (Claude) pour le raisonnement autonome et la génération d'exploits.",
  },
  {
    icon: Server,
    title: "100% local",
    desc: "Tourne sur votre machine via Docker. Vos données ne quittent jamais votre environnement.",
  },
];

const INSTALL_STEPS = [
  {
    step: "1",
    title: "Clonez le repository",
    code: "git clone https://github.com/FarddownYG/shannon.git\ncd shannon",
  },
  {
    step: "2",
    title: "Configurez votre clé API",
    code: "export ANTHROPIC_API_KEY=sk-ant-...",
  },
  {
    step: "3",
    title: "Lancez Shannon",
    code: "# Scan rapide\nshannon scan --target https://votre-app.com --type quick\n\n# Scan complet OWASP\nshannon scan --target https://votre-app.com --type full",
  },
];

export function ShannonPage() {
  return (
    <div className="min-h-screen py-20 relative">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-8"
          style={{
            background: "radial-gradient(circle, rgba(0,212,255,0.12), transparent 70%)",
            top: "-10%",
            right: "-10%",
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-6"
          style={{
            background: "radial-gradient(circle, rgba(139,92,246,0.1), transparent 70%)",
            bottom: "10%",
            left: "-5%",
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
            Retour au Hacking Éthique
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6"
            style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.12)" }}
          >
            <Zap className="w-3.5 h-3.5 text-[#00d4ff]" />
            <span
              className="text-[#00d4ff]"
              style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace" }}
            >
              Open Source — Keygraph
            </span>
          </div>
          <h1
            style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(2rem, 4vw, 2.8rem)" }}
            className="text-[#e2e8f0] mb-4"
          >
            <span
              style={{
                background: "linear-gradient(135deg, #00d4ff, #8b5cf6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Shannon
            </span>{" "}
            — AI Pentester
          </h1>
          <p
            className="text-[#94a3b8] max-w-2xl mx-auto mb-8"
            style={{ lineHeight: 1.7 }}
          >
            L'IA pentester autonome de Keygraph. Analyse white-box, exploitation dynamique réelle
            et rapports actionnables. Zéro faux positifs : pas d'exploit = pas de rapport.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/hacking-ethique"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(57,255,20,0.3)] hover:scale-[1.02]"
              style={{
                background: "linear-gradient(135deg, #39ff14, #22c55e)",
                color: "#0a0a0f",
                fontFamily: "Orbitron, sans-serif",
                fontSize: "0.9rem",
              }}
            >
              <Globe className="w-5 h-5" />
              Tester dans le navigateur
            </Link>
            <a
              href={SHANNON_GITHUB}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,212,255,0.3)] hover:scale-[1.02]"
              style={{
                background: "linear-gradient(135deg, #00d4ff, #0099cc)",
                color: "#0a0a0f",
                fontFamily: "Orbitron, sans-serif",
                fontSize: "0.9rem",
              }}
            >
              <Github className="w-5 h-5" />
              Télécharger sur GitHub
              <ExternalLink className="w-4 h-4" />
            </a>
            <a
              href={`${SHANNON_GITHUB}#readme`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-[#94a3b8] hover:text-[#e2e8f0] transition-all"
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
                fontSize: "0.85rem",
              }}
            >
              <BookOpen className="w-4 h-4" />
              Documentation
            </a>
          </div>
        </motion.div>

        {/* Pipeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl p-6 mb-10"
          style={{ background: "rgba(0,212,255,0.02)", border: "1px solid rgba(0,212,255,0.06)" }}
        >
          <p className="text-[#94a3b8] mb-4" style={{ fontSize: "0.82rem" }}>
            <strong className="text-[#e2e8f0]">Comment ça marche</strong>
          </p>
          <div
            className="flex flex-wrap items-center gap-2 text-[#64748b]"
            style={{ fontSize: "0.72rem", fontFamily: "JetBrains Mono, monospace" }}
          >
            {PIPELINE_STEPS.map((step, i) => (
              <span key={step.label} className="flex items-center gap-2">
                <span
                  className="px-2.5 py-1 rounded"
                  style={{ background: `${step.color}15`, color: step.color }}
                >
                  {step.label}
                </span>
                {i < PIPELINE_STEPS.length - 1 && <ArrowRight className="w-3 h-3" />}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Features grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-10"
        >
          <h2
            className="text-[#e2e8f0] mb-6 flex items-center gap-2"
            style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1.05rem" }}
          >
            <Shield className="w-5 h-5 text-[#00d4ff]" />
            Fonctionnalités
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="rounded-xl p-5 group hover:border-[#00d4ff]/20 transition-all duration-300"
                style={{
                  background: "rgba(17,24,39,0.4)",
                  border: "1px solid rgba(0,212,255,0.06)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: "rgba(0,212,255,0.08)" }}
                >
                  <item.icon className="w-4.5 h-4.5 text-[#00d4ff]" />
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

        {/* Installation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-10"
        >
          <h2
            className="text-[#e2e8f0] mb-6 flex items-center gap-2"
            style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1.05rem" }}
          >
            <Terminal className="w-5 h-5 text-[#39ff14]" />
            Installation rapide
          </h2>
          <div className="space-y-4">
            {INSTALL_STEPS.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="rounded-xl overflow-hidden"
                style={{
                  background: "rgba(17,24,39,0.5)",
                  border: "1px solid rgba(0,212,255,0.08)",
                }}
              >
                <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <span
                    className="w-6 h-6 rounded-md flex items-center justify-center text-[#0a0a0f]"
                    style={{
                      background: "linear-gradient(135deg, #00d4ff, #0099cc)",
                      fontSize: "0.72rem",
                      fontFamily: "Orbitron, sans-serif",
                    }}
                  >
                    {s.step}
                  </span>
                  <span className="text-[#e2e8f0]" style={{ fontSize: "0.88rem" }}>
                    {s.title}
                  </span>
                </div>
                <pre
                  className="px-5 py-4 text-[#39ff14] overflow-x-auto"
                  style={{
                    fontSize: "0.78rem",
                    fontFamily: "JetBrains Mono, monospace",
                    lineHeight: 1.7,
                    background: "rgba(0,0,0,0.3)",
                  }}
                >
                  {s.code}
                </pre>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Requirements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-xl p-6 mb-10"
          style={{ background: "rgba(245,158,11,0.03)", border: "1px solid rgba(245,158,11,0.1)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-[#f59e0b]" />
            <h3 className="text-[#f59e0b]" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.9rem" }}>
              Prérequis
            </h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              "Une clé API Anthropic (Claude) active",
              "Docker installé sur votre machine",
              "~15$/scan en tokens Claude Opus",
              "Autorisation explicite sur la cible",
            ].map((req) => (
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
          transition={{ delay: 0.4 }}
          className="rounded-xl p-5 mb-10 flex items-start gap-3"
          style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.15)" }}
        >
          <AlertTriangle className="w-5 h-5 text-[#f59e0b] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[#f59e0b] mb-1" style={{ fontSize: "0.85rem", fontFamily: "Orbitron, sans-serif" }}>
              Usage responsable uniquement
            </p>
            <p className="text-[#94a3b8]" style={{ fontSize: "0.8rem", lineHeight: 1.6 }}>
              Shannon est destiné exclusivement à l'analyse de sécurité de <strong className="text-[#e2e8f0]">vos propres applications</strong> ou
              d'applications pour lesquelles vous avez une autorisation explicite du propriétaire.
              Toute utilisation non autorisée est illégale.
            </p>
          </div>
        </motion.div>

        {/* Final CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="text-center rounded-xl p-10"
          style={{
            background: "linear-gradient(135deg, rgba(0,212,255,0.04), rgba(139,92,246,0.04))",
            border: "1px solid rgba(0,212,255,0.1)",
          }}
        >
          <Shield className="w-12 h-12 text-[#00d4ff] mx-auto mb-4 opacity-60" />
          <h3
            className="text-[#e2e8f0] mb-2"
            style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1.1rem" }}
          >
            Prêt à auditer votre application ?
          </h3>
          <p className="text-[#64748b] mb-6 max-w-md mx-auto" style={{ fontSize: "0.85rem" }}>
            Clonez Shannon, configurez votre clé API Anthropic, et lancez votre premier pentest en quelques minutes.
          </p>
          <a
            href={SHANNON_GITHUB}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,212,255,0.3)] hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg, #00d4ff, #0099cc)",
              color: "#0a0a0f",
              fontFamily: "Orbitron, sans-serif",
              fontSize: "0.88rem",
            }}
          >
            <Github className="w-5 h-5" />
            Voir sur GitHub
            <ExternalLink className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </div>
  );
}