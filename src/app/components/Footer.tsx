import { Shield, Github, Linkedin, Mail, ExternalLink, Heart } from "lucide-react";
import { Link } from "react-router";

const toolLinks = [
  { label: "Hacking Éthique", path: "/hacking-ethique" },
  { label: "Analyse VirusTotal", path: "/virustotal" },
  { label: "SSL Checker", path: "/ssl-checker" },
  { label: "Mots de passe", path: "/tools/password" },
  { label: "Analyseur fichiers", path: "/tools/file-analyzer" },
  { label: "Email Checker", path: "/tools/email-checker" },
  { label: "DNS Security", path: "/tools/dns-checker" },
];

const resourceLinks = [
  { label: "Blog Sécurité", path: "/blog" },
  { label: "Page de Statut", path: "/status" },
  { label: "À propos", path: "/about" },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden" style={{ background: "linear-gradient(180deg, #070710, #050508)" }}>
      {/* Top border glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.3), transparent)" }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4 group w-fit">
              <div className="relative">
                <Shield className="w-7 h-7 text-[#00d4ff] group-hover:text-[#39ff14] transition-colors" />
                <div className="absolute inset-0 bg-[#00d4ff]/20 rounded-full blur-lg" />
              </div>
              <span
                className="text-[#00d4ff] tracking-[0.15em] group-hover:text-[#39ff14] transition-colors"
                style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.9rem" }}
              >
                CYBERGUARD
              </span>
            </Link>
            <p className="text-[#64748b] mb-6" style={{ fontSize: "0.85rem", lineHeight: 1.7 }}>
              Plateforme open-source de cybersécurité. Testez, analysez et renforcez la sécurité de vos sites web.
            </p>
            <div className="flex gap-2">
              {[
                { icon: Github, href: "https://github.com", label: "GitHub" },
                { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
                { icon: Mail, href: "mailto:contact@cyberguard.dev", label: "Email" },
              ].map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 text-[#64748b] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Tools */}
          <div>
            <h4
              className="text-[#94a3b8] mb-4 tracking-[0.15em]"
              style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem" }}
            >
              OUTILS
            </h4>
            <ul className="space-y-2.5">
              {toolLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.path}
                    className="text-[#64748b] hover:text-[#00d4ff] transition-colors duration-200 inline-flex items-center gap-1 group"
                    style={{ fontSize: "0.85rem" }}
                  >
                    {link.label}
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4
              className="text-[#94a3b8] mb-4 tracking-[0.15em]"
              style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem" }}
            >
              RESSOURCES
            </h4>
            <ul className="space-y-2.5">
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.path}
                    className="text-[#64748b] hover:text-[#00d4ff] transition-colors duration-200"
                    style={{ fontSize: "0.85rem" }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Status */}
          <div>
            <h4
              className="text-[#94a3b8] mb-4 tracking-[0.15em]"
              style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem" }}
            >
              SYSTÈME
            </h4>
            <Link
              to="/status"
              className="flex items-center gap-2.5 p-3 rounded-lg transition-all duration-300 group mb-4 hover:bg-[#00d4ff]/5"
              style={{ background: "rgba(0,212,255,0.03)", border: "1px solid rgba(0,212,255,0.1)" }}
            >
              <div className="relative">
                <div className="w-2.5 h-2.5 rounded-full bg-[#00d4ff]" />
                <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-[#00d4ff] animate-ping opacity-30" />
              </div>
              <div>
                <p className="text-[#00d4ff]" style={{ fontSize: "0.8rem" }}>Voir le statut en direct</p>
                <p className="text-[#64748b]" style={{ fontSize: "0.8rem" }}>Vérifications temps réel</p>
              </div>
            </Link>
            <div className="p-3 rounded-lg" style={{ background: "rgba(0,212,255,0.03)", border: "1px solid rgba(0,212,255,0.08)" }}>
              <p className="text-[#64748b]" style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace" }}>
                $ cyberguard --version<br />
                <span className="text-[#00d4ff]">v3.0.0</span> — build 2026.03.14
              </p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="pt-6 pb-2">
          <p className="text-[#3a4255] text-center max-w-3xl mx-auto" style={{ fontSize: "0.68rem", lineHeight: 1.6 }}>
            <strong className="text-[#4a5568]">Disclaimer :</strong> CyberGuard est une plateforme mise à disposition à titre informatif et éducatif uniquement, sans aucune obligation d'utilisation. L'équipe CyberGuard décline toute responsabilité quant aux conséquences, dommages ou répercussions pouvant résulter de l'utilisation des outils proposés sur ce site. L'utilisateur est seul responsable de l'usage qu'il fait de ces outils et s'engage à les utiliser dans le respect de la législation en vigueur.
          </p>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <p className="text-[#4a5568] flex items-center gap-1.5" style={{ fontSize: "0.75rem" }}>
            &copy; 2026 CyberGuard. Fait avec <Heart className="w-3 h-3 text-[#ef4444]/50" /> pour la cybersécurité.
          </p>
          <div className="flex items-center gap-4 text-[#4a5568]" style={{ fontSize: "0.75rem" }}>
            <Link to="/about" className="hover:text-[#94a3b8] transition-colors">Mentions légales</Link>
            <span className="text-[#1e293b]">|</span>
            <Link to="/about" className="hover:text-[#94a3b8] transition-colors">Confidentialité</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}