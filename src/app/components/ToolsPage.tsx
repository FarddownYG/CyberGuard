import { Link } from "react-router";
import { Shield, Lock, Eye, Key, FileSearch, Mail, Globe, ArrowRight, Wrench, Sparkles } from "lucide-react";
import { motion } from "motion/react";

const tools = [
  {
    icon: Shield,
    title: "Hacking Éthique",
    desc: "Une suite complète d'outils pour tester la sécurité d'un site web. Scanne les failles, analyse le code, et génère un rapport détaillé.",
    link: "/hacking-ethique",
    color: "#00d4ff",
    glowClass: "glow-blue",
    tag: "Shannon AI",
    popular: true,
  },
  {
    icon: Eye,
    title: "Analyse VirusTotal",
    desc: "Colle un lien et on vérifie s'il est dangereux avec plus de 70 antivirus en même temps. Tu sais tout de suite si c'est safe ou pas.",
    link: "/virustotal",
    color: "#8b5cf6",
    glowClass: "glow-purple",
    tag: "URL Scan",
    popular: true,
  },
  {
    icon: Lock,
    title: "SSL Checker",
    desc: "Vérifie le petit cadenas d'un site web. On regarde si la connexion est bien chiffrée et si le certificat de sécurité est valide.",
    link: "/ssl-checker",
    color: "#39ff14",
    glowClass: "glow-green",
    tag: "Certificat",
    popular: false,
  },
  {
    icon: Key,
    title: "Générateur de Mots de Passe",
    desc: "Crée des mots de passe solides et aléatoires. Tu choisis la longueur, les caractères, et on te dit à quel point il est difficile à pirater.",
    link: "/tools/password",
    color: "#f59e0b",
    glowClass: "glow-amber",
    tag: "Password",
    popular: false,
  },
  {
    icon: FileSearch,
    title: "Analyseur de Fichiers",
    desc: "Examine un fichier pour savoir ce qu'il contient vraiment : type réel, empreinte unique (hash), et scan antivirus via VirusTotal.",
    link: "/tools/file-analyzer",
    color: "#ef4444",
    glowClass: "glow-red",
    tag: "Hash + VT",
    popular: false,
  },
  {
    icon: Mail,
    title: "Vérificateur d'Email",
    desc: "Colle un email suspect et on te dit si c'est du phishing. On vérifie les liens, l'expéditeur, et les signes d'arnaque.",
    link: "/tools/email-checker",
    color: "#06b6d4",
    glowClass: "glow-cyan",
    tag: "Anti-Phishing",
    popular: true,
  },
  {
    icon: Globe,
    title: "DNS Security Check",
    desc: "Vérifie si un nom de domaine est bien protégé contre le spam et l'usurpation d'identité. On regarde les réglages anti-fraude (SPF, DKIM, DMARC).",
    link: "/tools/dns-checker",
    color: "#ec4899",
    glowClass: "glow-pink",
    tag: "DNS",
    popular: false,
  },
];

export function ToolsPage() {
  return (
    <div className="min-h-screen py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6"
            style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.12)" }}
          >
            <Wrench className="w-3.5 h-3.5 text-[#00d4ff]" />
            <span className="text-[#00d4ff]" style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace" }}>
              7 outils disponibles
            </span>
          </div>
          <h1
            style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.8rem, 3vw, 2.5rem)" }}
            className="text-[#e2e8f0] mb-4"
          >
            Hub{" "}
            <span style={{ background: "linear-gradient(135deg, #00d4ff, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Outils
            </span>
          </h1>
          <p className="text-[#94a3b8] max-w-2xl mx-auto" style={{ lineHeight: 1.7 }}>
            Une suite complète d'outils pour analyser, tester et renforcer la sécurité de votre présence en ligne.
            Tous les outils sont gratuits et fonctionnent directement dans votre navigateur.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tools.map((tool, i) => (
            <motion.div
              key={tool.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link
                to={tool.link}
                className={`group block h-full rounded-xl p-6 cyber-card ${tool.glowClass} relative overflow-hidden`}
              >
                <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl" style={{ background: `${tool.color}10` }} />

                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-11 h-11 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                      style={{ background: `${tool.color}10` }}
                    >
                      <tool.icon className="w-5 h-5" style={{ color: tool.color }} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 rounded-full"
                        style={{
                          fontSize: "0.65rem",
                          color: tool.color,
                          background: `${tool.color}08`,
                          border: `1px solid ${tool.color}15`,
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                      >
                        {tool.tag}
                      </span>
                      {tool.popular && (
                        <span
                          className="px-2 py-0.5 rounded-full flex items-center gap-1"
                          style={{
                            fontSize: "0.6rem",
                            color: "#f59e0b",
                            background: "rgba(245,158,11,0.08)",
                            border: "1px solid rgba(245,158,11,0.15)",
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          Populaire
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-[#e2e8f0] mb-2 group-hover:text-white transition-colors" style={{ fontSize: "1.05rem" }}>
                    {tool.title}
                  </h3>
                  <p className="text-[#64748b] group-hover:text-[#94a3b8] mb-5 transition-colors" style={{ fontSize: "0.85rem", lineHeight: 1.6 }}>
                    {tool.desc}
                  </p>

                  <span className="inline-flex items-center gap-1.5 transition-all duration-300 group-hover:gap-2.5" style={{ fontSize: "0.82rem", color: tool.color }}>
                    Utiliser l'outil
                    <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}