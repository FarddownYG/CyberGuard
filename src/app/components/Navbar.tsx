import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { Shield, Menu, X, ChevronDown, Key, FileSearch, Mail, Globe, Wrench, Lock, Eye, Activity } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const mainLinks = [
  { path: "/", label: "Accueil" },
  { path: "/hacking-ethique", label: "Hacking Éthique" },
  { path: "/virustotal", label: "VirusTotal" },
];

const toolLinks = [
  { path: "/tools", label: "Hub Outils", icon: Wrench, desc: "Tous nos outils" },
  { path: "/ssl-checker", label: "SSL Checker", icon: Lock, desc: "Certificats SSL/TLS" },
  { path: "/tools/password", label: "Mots de passe", icon: Key, desc: "Générateur sécurisé" },
  { path: "/tools/file-analyzer", label: "Analyseur fichiers", icon: FileSearch, desc: "Hash SHA-256" },
  { path: "/tools/email-checker", label: "Email Checker", icon: Mail, desc: "Anti-phishing" },
  { path: "/tools/dns-checker", label: "DNS Security", icon: Globe, desc: "SPF/DKIM/DMARC" },
];

const secondaryLinks = [
  { path: "/blog", label: "Blog", icon: Eye },
  { path: "/status", label: "Statut", icon: Activity },
];

export function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setToolsOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const isActive = (path: string) => location.pathname === path;
  const isToolActive = toolLinks.some((l) => isActive(l.path));

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        backgroundColor: scrolled ? "rgba(10,10,15,0.88)" : "rgba(10,10,15,0.6)",
        backdropFilter: "blur(20px) saturate(180%)",
        borderBottom: scrolled ? "1px solid rgba(0,212,255,0.12)" : "1px solid rgba(0,212,255,0.04)",
        boxShadow: scrolled ? "0 8px 32px rgba(0,0,0,0.4), 0 0 60px rgba(0,212,255,0.03)" : "none",
      }}
    >
      {/* Scroll progress bar */}
      <div
        className="absolute bottom-0 left-0 h-[2px] transition-all duration-150"
        style={{
          width: `${scrollProgress}%`,
          background: "linear-gradient(90deg, #00d4ff, #39ff14)",
          opacity: scrollProgress > 0 ? 0.6 : 0,
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group relative">
            <div className="relative">
              <Shield className="w-8 h-8 text-[#00d4ff] group-hover:text-[#39ff14] transition-colors duration-300" />
              <div className="absolute inset-0 w-8 h-8 bg-[#00d4ff]/20 rounded-full blur-lg group-hover:bg-[#39ff14]/20 transition-colors duration-300" />
            </div>
            <span
              className="text-[#00d4ff] tracking-[0.2em] group-hover:text-[#39ff14] transition-colors duration-300"
              style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1rem" }}
            >
              CYBERGUARD
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {mainLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="relative px-3 py-2 rounded-lg transition-all duration-300 group"
                style={{ fontSize: "0.82rem" }}
              >
                <span className={`relative z-10 transition-colors duration-300 ${
                  isActive(link.path) ? "text-[#00d4ff]" : "text-[#94a3b8] group-hover:text-[#e2e8f0]"
                }`}>
                  {link.label}
                </span>
                {isActive(link.path) && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-[#00d4ff]/10 rounded-lg"
                    style={{ border: "1px solid rgba(0,212,255,0.2)" }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
              </Link>
            ))}

            {/* Tools dropdown */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setToolsOpen(!toolsOpen)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all duration-300 ${
                  isToolActive || toolsOpen
                    ? "text-[#00d4ff] bg-[#00d4ff]/10"
                    : "text-[#94a3b8] hover:text-[#e2e8f0]"
                }`}
                style={{ fontSize: "0.82rem" }}
              >
                Outils
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${toolsOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {toolsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 rounded-xl overflow-hidden"
                    style={{
                      backgroundColor: "rgba(17,24,39,0.95)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(0,212,255,0.15)",
                      boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(0,212,255,0.05)",
                    }}
                  >
                    <div className="p-1.5">
                      {toolLinks.map((link) => (
                        <Link
                          key={link.path}
                          to={link.path}
                          onClick={() => setToolsOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group/item ${
                            isActive(link.path)
                              ? "bg-[#00d4ff]/10 text-[#00d4ff]"
                              : "text-[#94a3b8] hover:bg-white/5 hover:text-[#e2e8f0]"
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
                            isActive(link.path) ? "bg-[#00d4ff]/20" : "bg-white/5 group-hover/item:bg-[#00d4ff]/10"
                          }`}>
                            <link.icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p style={{ fontSize: "0.82rem" }}>{link.label}</p>
                            <p className="text-[#64748b]" style={{ fontSize: "0.7rem" }}>{link.desc}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="w-px h-4 bg-[#1e293b] mx-1" />

            {secondaryLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`relative px-3 py-2 rounded-lg transition-all duration-300 group ${
                  isActive(link.path)
                    ? "text-[#00d4ff]"
                    : "text-[#94a3b8] hover:text-[#e2e8f0]"
                }`}
                style={{ fontSize: "0.82rem" }}
              >
                {link.label}
                {isActive(link.path) && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-[#00d4ff]/10 rounded-lg"
                    style={{ border: "1px solid rgba(0,212,255,0.2)" }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
              </Link>
            ))}

            <Link
              to="/about"
              className={`relative px-3 py-2 rounded-lg transition-all duration-300 ${
                isActive("/about") ? "text-[#00d4ff]" : "text-[#94a3b8] hover:text-[#e2e8f0]"
              }`}
              style={{ fontSize: "0.82rem" }}
            >
              À propos
              {isActive("/about") && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-[#00d4ff]/10 rounded-lg"
                  style={{ border: "1px solid rgba(0,212,255,0.2)" }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden relative w-10 h-10 flex items-center justify-center rounded-lg text-[#00d4ff] hover:bg-[#00d4ff]/10 transition-colors"
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            <AnimatePresence mode="wait">
              {mobileOpen ? (
                <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <X className="w-5 h-5" />
                </motion.div>
              ) : (
                <motion.div key="m" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Menu className="w-5 h-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 top-16 bg-black/60 lg:hidden z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="lg:hidden overflow-hidden relative z-50"
              style={{
                backgroundColor: "rgba(10,10,15,0.98)",
                backdropFilter: "blur(20px)",
                borderBottom: "1px solid rgba(0,212,255,0.1)",
              }}
            >
              <div className="px-4 py-3 space-y-1 max-h-[75vh] overflow-y-auto">
                <p className="text-[#64748b] px-3 py-1.5" style={{ fontSize: "0.7rem", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.1em" }}>
                  NAVIGATION
                </p>
                {mainLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`block px-3 py-2.5 rounded-lg transition-all ${
                      isActive(link.path)
                        ? "text-[#00d4ff] bg-[#00d4ff]/10"
                        : "text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-white/5"
                    }`}
                    style={{ fontSize: "0.9rem" }}
                  >
                    {link.label}
                  </Link>
                ))}

                <p className="text-[#64748b] px-3 pt-3 pb-1.5" style={{ fontSize: "0.7rem", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.1em" }}>
                  OUTILS
                </p>
                {toolLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      isActive(link.path)
                        ? "text-[#00d4ff] bg-[#00d4ff]/10"
                        : "text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-white/5"
                    }`}
                    style={{ fontSize: "0.9rem" }}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                ))}

                <p className="text-[#64748b] px-3 pt-3 pb-1.5" style={{ fontSize: "0.7rem", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.1em" }}>
                  PLUS
                </p>
                {secondaryLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      isActive(link.path)
                        ? "text-[#00d4ff] bg-[#00d4ff]/10"
                        : "text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-white/5"
                    }`}
                    style={{ fontSize: "0.9rem" }}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                ))}
                <Link
                  to="/about"
                  className={`block px-3 py-2.5 rounded-lg transition-all ${
                    isActive("/about")
                      ? "text-[#00d4ff] bg-[#00d4ff]/10"
                      : "text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-white/5"
                  }`}
                  style={{ fontSize: "0.9rem" }}
                >
                  À propos
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}