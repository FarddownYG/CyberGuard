import { useRef, useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import {
  Shield, Search, Lock, BookOpen, ChevronRight, Zap, Eye, ShieldCheck,
  Key, FileSearch, Mail, Globe, ArrowRight, Terminal, Cpu, Fingerprint,
} from "lucide-react";
import { motion } from "motion/react";
import { GlitchText, CyberCard } from "./CyberEffects";

// ─── Hook: detect mobile ─────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

// ─── Hook: IntersectionObserver ──────────────────────────────────────────
function useInView(ref: React.RefObject<HTMLElement | null>, opts?: { once?: boolean }) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (opts?.once) observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return inView;
}

// ─── Features ────────────────────────────────────────────────────────────
const features = [
  { icon: Search, title: "Hacking Éthique", desc: "Pentest automatisé propulsé par Shannon AI — analyse white-box + exploitation dynamique réelle.", link: "/hacking-ethique", color: "#00d4ff", tag: "Pentest" },
  { icon: Eye, title: "Analyse VirusTotal", desc: "Vérifiez si une URL est malveillante avec 70+ moteurs antivirus en simultané.", link: "/virustotal", color: "#8b5cf6", tag: "URL Scan" },
  { icon: Lock, title: "SSL Checker", desc: "Testez la validité de votre certificat SSL et la sécurité de vos connexions HTTPS.", link: "/ssl-checker", color: "#39ff14", tag: "Certificat" },
  { icon: Key, title: "Générateur de Mots de Passe", desc: "Créez des mots de passe cryptographiquement sécurisés avec Web Crypto API.", link: "/tools/password", color: "#f59e0b", tag: "Password" },
  { icon: FileSearch, title: "Analyseur de Fichiers", desc: "Calculez les hash SHA-256/SHA-1 de vos fichiers directement dans le navigateur.", link: "/tools/file-analyzer", color: "#ef4444", tag: "Hash" },
  { icon: Mail, title: "Email Checker", desc: "Détectez les emails jetables, le typosquatting et le phishing.", link: "/tools/email-checker", color: "#06b6d4", tag: "Anti-Phishing" },
  { icon: Globe, title: "DNS Security", desc: "Vérifiez SPF, DKIM, DMARC, DNSSEC et HSTS de votre domaine.", link: "/tools/dns-checker", color: "#ec4899", tag: "DNS" },
  { icon: BookOpen, title: "Blog Sécurité", desc: "Apprenez les bonnes pratiques de cybersécurité et les attaques courantes.", link: "/blog", color: "#39ff14", tag: "Éducation" },
];

// ─── Terminal Lines ──────────────────────────────────────────────────────
function TerminalLine({ text, delay }: { text: string; delay: number }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        setDisplayed(text.slice(0, i + 1));
        i++;
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, 25);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, delay]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-[#39ff14]" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem" }}>$</span>
      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem" }} className="text-[#94a3b8]">
        {displayed}
        {!done && <span className="animate-pulse text-[#00d4ff]">|</span>}
      </span>
    </div>
  );
}

// ─── Matrix Rain Canvas (desktop only, optimized) ────────────────────────
function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    const chars = "01ABCDEF";
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = Array(columns).fill(1);

    const draw = () => {
      ctx.fillStyle = "rgba(5,5,8,0.06)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const alpha = 0.03 + Math.random() * 0.04;
        ctx.fillStyle = i % 3 === 0
          ? `rgba(0,212,255,${alpha})`
          : i % 3 === 1
            ? `rgba(57,255,20,${alpha})`
            : `rgba(139,92,246,${alpha})`;
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    // 60ms interval instead of 50ms = less CPU
    const interval = setInterval(draw, 60);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.5 }}
    />
  );
}

// ─── Animated Counter ────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = "" }: { target: string; suffix?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);
  const numericTarget = parseInt(target.replace(/\D/g, ""));

  useEffect(() => {
    if (!isInView) return;
    let frame = 0;
    const totalFrames = 60;
    const timer = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * numericTarget));
      if (frame >= totalFrames) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, numericTarget]);

  return (
    <div ref={ref}>
      {count}{suffix}
    </div>
  );
}

// ─── Simple Gradient Background for Mobile ───────────────────────────────
function MobileHeroBackground() {
  return (
    <div className="absolute inset-0">
      {/* Static gradient — no animation */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 30% 40%, rgba(0,212,255,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(139,92,246,0.06) 0%, transparent 60%)",
        }}
      />
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "linear-gradient(rgba(0,212,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}

// ─── Desktop Hero Background (full effects) ──────────────────────────────
function DesktopHeroBackground() {
  const particles = useMemo(
    () =>
      Array.from({ length: 15 }).map((_, i) => ({
        id: `p-${i}`,
        left: `${(i * 3.17 + 7) % 100}%`,
        top: `${(i * 6.3 + 5) % 100}%`,
        duration: 3 + (i % 6) * 0.7,
        delay: (i % 9) * 0.3,
        size: i % 4 === 0 ? "w-2 h-2" : i % 3 === 0 ? "w-1.5 h-1.5" : "w-1 h-1",
        color: i % 3 === 0 ? "bg-[#00d4ff]/40" : i % 3 === 1 ? "bg-[#39ff14]/30" : "bg-[#8b5cf6]/30",
      })),
    []
  );

  return (
    <>
      <MatrixRain />

      {/* Hex grid */}
      <div className="absolute inset-0 overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hexgrid" width="56" height="100" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
              <path d="M28 66L0 50V16L28 0l28 16v34L28 66z" fill="none" stroke="#00d4ff" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hexgrid)" />
        </svg>
      </div>

      {/* Pulsing radar circles — reduced to 2 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        {[0, 1].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-[#00d4ff]/10"
            style={{
              width: `${300 + i * 200}px`,
              height: `${300 + i * 200}px`,
              top: `${-(150 + i * 100)}px`,
              left: `${-(150 + i * 100)}px`,
            }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.15, 0, 0.15] }}
            transition={{ duration: 4, delay: i * 1.3, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* Animated grid */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "linear-gradient(rgba(0,212,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.3) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
          animate={{ backgroundPosition: ["0px 0px", "80px 80px"] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />

        {/* Glow orbs — reduced blur from 150/120/100 to 80 */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#00d4ff]/5 rounded-full blur-[80px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-[#8b5cf6]/5 rounded-full blur-[80px]"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Floating particles — reduced from 35 to 15 */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute ${p.size} rounded-full ${p.color}`}
          style={{ left: p.left, top: p.top, willChange: "transform, opacity" }}
          animate={{ y: [0, -40, 0], opacity: [0.1, 0.6, 0.1], scale: [1, 1.3, 1] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}

      {/* Network lines — reduced to 6 */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.04]">
        {particles.slice(0, 6).map((p, i) => {
          const next = particles[(i + 3) % particles.length];
          return (
            <motion.line
              key={`line-${i}`}
              x1={p.left} y1={p.top} x2={next.left} y2={next.top}
              stroke="#00d4ff" strokeWidth="0.5"
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 3 + i * 0.5, repeat: Infinity }}
            />
          );
        })}
      </svg>
    </>
  );
}

// ═════════════════��═════════════════════════════════════════════════════════
// ─── MAIN HOMEPAGE ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
export function HomePage() {
  const isMobile = useIsMobile();

  return (
    <div>
      {/* ═══════════ HERO SECTION ═══════════ */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background: simple on mobile, full effects on desktop */}
        {isMobile ? <MobileHeroBackground /> : <DesktopHeroBackground />}

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20 z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left - Content */}
            <motion.div
              initial={{ opacity: 0, x: isMobile ? 0 : -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8"
                style={{
                  background: "linear-gradient(135deg, rgba(0,212,255,0.1), rgba(57,255,20,0.05))",
                  border: "1px solid rgba(0,212,255,0.2)",
                }}
              >
                <motion.div
                  className="w-2 h-2 rounded-full bg-[#39ff14]"
                  animate={{ boxShadow: ["0 0 4px #39ff14", "0 0 12px #39ff14", "0 0 4px #39ff14"] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="text-[#00d4ff]" style={{ fontSize: "0.8rem", fontFamily: "JetBrains Mono, monospace" }}>
                  v3.0 — Suite complète de cybersécurité
                </span>
              </motion.div>

              <h1
                className="text-[#e2e8f0] mb-6"
                style={{
                  fontFamily: "Orbitron, sans-serif",
                  fontSize: "clamp(1.8rem, 4.5vw, 3.8rem)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                }}
              >
                Sécurisez votre{" "}
                <GlitchText
                  text="présence digitale"
                  style={{
                    background: "linear-gradient(135deg, #00d4ff, #39ff14)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    fontFamily: "Orbitron, sans-serif",
                    fontSize: "inherit",
                  }}
                />
              </h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-[#94a3b8] mb-10 max-w-lg"
                style={{ fontSize: "clamp(0.9rem, 2vw, 1.05rem)", lineHeight: 1.8 }}
              >
                Détectez les vulnérabilités, analysez les URLs suspectes et protégez vos sites
                avec notre suite d'outils de pentest automatisés. Gratuit. Open-source.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-3 sm:gap-4"
              >
                <Link
                  to="/hacking-ethique"
                  className="group inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl transition-all duration-300 hover:shadow-[0_0_40px_rgba(0,212,255,0.4)] relative overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, #00d4ff, #0091b3)",
                    boxShadow: "0 0 30px rgba(0,212,255,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
                    fontFamily: "Orbitron, sans-serif",
                    fontSize: "0.82rem",
                    color: "#0a0a0f",
                  }}
                >
                  {/* Shimmer sweep — desktop only */}
                  {!isMobile && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                      animate={{ x: ["-200%", "200%"] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
                    />
                  )}
                  <Shield className="w-5 h-5 relative z-10" />
                  <span className="relative z-10">Analyser mon site</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform relative z-10" />
                </Link>
                <Link
                  to="/tools"
                  className="group inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl transition-all duration-300 text-[#e2e8f0] hover:text-[#00d4ff] hover:border-[#00d4ff]/30"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backdropFilter: "blur(10px)",
                    fontFamily: "Orbitron, sans-serif",
                    fontSize: "0.82rem",
                  }}
                >
                  Voir les outils
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>

              {/* Trust badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-10 pt-8 border-t border-white/5"
              >
                {[
                  { icon: ShieldCheck, label: "100% Gratuit" },
                  { icon: Fingerprint, label: "Zéro data collectée" },
                  { icon: Cpu, label: "Traitement local" },
                ].map((badge, i) => (
                  <motion.div
                    key={badge.label}
                    className="flex items-center gap-2 text-[#64748b]"
                    style={{ fontSize: "0.75rem" }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + i * 0.1 }}
                  >
                    <badge.icon className="w-4 h-4 text-[#39ff14]/60" />
                    {badge.label}
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right - Terminal (desktop only) */}
            {!isMobile && (
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <div
                  className="rounded-2xl overflow-hidden relative"
                  style={{
                    background: "rgba(17,24,39,0.7)",
                    border: "1px solid rgba(0,212,255,0.15)",
                    boxShadow: "0 20px 80px rgba(0,0,0,0.5), 0 0 60px rgba(0,212,255,0.08)",
                    backdropFilter: "blur(20px)",
                  }}
                >
                  {/* Animated top border */}
                  <motion.div
                    className="absolute top-0 left-0 h-px"
                    style={{ background: "linear-gradient(90deg, transparent, #00d4ff, #39ff14, transparent)" }}
                    animate={{ width: ["0%", "100%"] }}
                    transition={{ duration: 2, delay: 0.5, ease: "easeOut" }}
                  />

                  {/* Terminal header */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                    <div className="w-3 h-3 rounded-full bg-[#ef4444]/80" />
                    <div className="w-3 h-3 rounded-full bg-[#f59e0b]/80" />
                    <div className="w-3 h-3 rounded-full bg-[#39ff14]/80" />
                    <span className="ml-2 text-[#64748b]" style={{ fontSize: "0.7rem", fontFamily: "JetBrains Mono, monospace" }}>
                      cyberguard@terminal
                    </span>
                    <motion.div
                      className="ml-auto w-2 h-2 rounded-full bg-[#39ff14]"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  </div>

                  {/* Terminal body */}
                  <div className="p-5 space-y-2.5">
                    <TerminalLine text="cyberguard scan --target https://example.com" delay={600} />
                    <TerminalLine text="[INFO] Initializing security scan..." delay={2200} />
                    <TerminalLine text="[SCAN] Checking HTTP headers..." delay={3400} />
                    <TerminalLine text="[SCAN] Testing SSL/TLS configuration..." delay={4400} />
                    <TerminalLine text="[SCAN] Running XSS detection..." delay={5200} />
                    <TerminalLine text="[SCAN] Analyzing SQL injection vectors..." delay={6000} />
                    <TerminalLine text='[OK] Score: 92/100 — "Site sécurisé"' delay={7200} />

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 8.2 }}
                      className="mt-4 pt-3 border-t border-white/5"
                    >
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: "Headers", score: "A+", color: "#39ff14" },
                          { label: "SSL", score: "A+", color: "#39ff14" },
                          { label: "XSS", score: "B", color: "#f59e0b" },
                        ].map((item, idx) => (
                          <motion.div
                            key={item.label}
                            className="text-center p-2.5 rounded-lg relative overflow-hidden"
                            style={{ background: `${item.color}08`, border: `1px solid ${item.color}20` }}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 8.4 + idx * 0.15 }}
                          >
                            <div style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1.2rem", color: item.color }}>
                              {item.score}
                            </div>
                            <div className="text-[#64748b]" style={{ fontSize: "0.65rem", fontFamily: "JetBrains Mono, monospace" }}>
                              {item.label}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#070710] to-transparent" />
      </section>

      {/* ═══════════ FEATURES GRID ═══════════ */}
      <section className="py-16 sm:py-24 bg-[#070710] relative">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(0,212,255,0.5) 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6"
              style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.1)" }}
            >
              <Terminal className="w-3.5 h-3.5 text-[#00d4ff]" />
              <span className="text-[#00d4ff]" style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace" }}>
                8 outils disponibles
              </span>
            </div>
            <h2
              className="text-[#e2e8f0] mb-4"
              style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.3rem, 3vw, 2.2rem)" }}
            >
              Suite complète de{" "}
              <span style={{ background: "linear-gradient(135deg, #00d4ff, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                sécurité
              </span>
            </h2>
            <p className="text-[#94a3b8] max-w-2xl mx-auto" style={{ fontSize: "clamp(0.85rem, 2vw, 1rem)", lineHeight: 1.7 }}>
              Analysez, testez et renforcez la sécurité de votre présence en ligne avec nos outils gratuits.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={f.link} className="group block h-full">
                  <CyberCard className="h-full">
                    <div className="p-5 sm:p-6 relative">
                      <div className="relative">
                        <div className="flex items-center gap-3 mb-4">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                            style={{ background: `${f.color}10` }}
                          >
                            <f.icon className="w-5 h-5" style={{ color: f.color }} />
                          </div>
                          <span
                            className="px-2 py-0.5 rounded-full"
                            style={{
                              fontSize: "0.65rem",
                              color: f.color,
                              background: `${f.color}08`,
                              border: `1px solid ${f.color}15`,
                              fontFamily: "JetBrains Mono, monospace",
                            }}
                          >
                            {f.tag}
                          </span>
                        </div>

                        <h3 className="text-[#e2e8f0] mb-2 group-hover:text-white transition-colors" style={{ fontSize: "1.05rem" }}>
                          {f.title}
                        </h3>
                        <p className="text-[#64748b] group-hover:text-[#94a3b8] mb-4 transition-colors" style={{ fontSize: "0.85rem", lineHeight: 1.6 }}>
                          {f.desc}
                        </p>

                        <span
                          className="inline-flex items-center gap-1.5 transition-all duration-300 group-hover:gap-2.5"
                          style={{ fontSize: "0.8rem", color: f.color }}
                        >
                          Explorer
                          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                        </span>
                      </div>
                    </div>
                  </CyberCard>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ STATS SECTION ═══════════ */}
      <section className="py-16 sm:py-20 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] bg-[#00d4ff]/5 rounded-full blur-[80px]" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            {[
              { value: "8", suffix: "+", label: "Outils disponibles", color: "#00d4ff" },
              { value: "30", suffix: "+", label: "Articles blog", color: "#39ff14" },
              { value: "70", suffix: "+", label: "Moteurs AV (via VT)", color: "#8b5cf6" },
              { value: "0", suffix: "", label: "Données collectées", color: "#f59e0b" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <CyberCard>
                  <div className="text-center p-4 sm:p-6 relative group">
                    <div
                      className="mb-2"
                      style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.4rem, 3vw, 2.2rem)", color: s.color }}
                    >
                      <AnimatedCounter target={s.value} suffix={s.suffix} />
                    </div>
                    <div className="text-[#64748b]" style={{ fontSize: "clamp(0.7rem, 1.5vw, 0.8rem)" }}>
                      {s.label}
                    </div>
                  </div>
                </CyberCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA SECTION ═══════════ */}
      <section className="py-16 sm:py-24 bg-[#070710] relative">
        <div
          className="absolute inset-0 opacity-[0.04] hidden sm:block"
          style={{
            backgroundImage: "linear-gradient(rgba(0,212,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.2) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <motion.div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
              style={{
                background: "linear-gradient(135deg, rgba(0,212,255,0.1), rgba(57,255,20,0.05))",
                border: "1px solid rgba(0,212,255,0.15)",
              }}
              animate={{
                boxShadow: [
                  "0 0 20px rgba(0,212,255,0.1)",
                  "0 0 40px rgba(0,212,255,0.2)",
                  "0 0 20px rgba(0,212,255,0.1)",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Zap className="w-7 h-7 text-[#00d4ff]" />
            </motion.div>
            <h2
              className="text-[#e2e8f0] mb-4"
              style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.3rem, 3vw, 2rem)" }}
            >
              Prêt à sécuriser votre site ?
            </h2>
            <p className="text-[#94a3b8] mb-8 max-w-xl mx-auto" style={{ lineHeight: 1.7, fontSize: "clamp(0.85rem, 2vw, 1rem)" }}>
              Lancez votre premier scan en moins de 30 secondes. Aucune inscription requise.
            </p>
            <Link
              to="/hacking-ethique"
              className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-xl transition-all duration-300 hover:shadow-[0_0_50px_rgba(0,212,255,0.4)] relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #00d4ff, #0091b3)",
                boxShadow: "0 0 40px rgba(0,212,255,0.2), 0 8px 32px rgba(0,0,0,0.3)",
                fontFamily: "Orbitron, sans-serif",
                fontSize: "0.85rem",
                color: "#0a0a0f",
              }}
            >
              {!isMobile && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                  animate={{ x: ["-200%", "200%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 3 }}
                />
              )}
              <Shield className="w-5 h-5 relative z-10" />
              <span className="relative z-10">Lancer un scan gratuit</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform relative z-10" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}