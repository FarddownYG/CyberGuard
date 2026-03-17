import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

// ─── Shared: detect mobile / low-perf devices ────────────────────────────
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

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

// ─── Global Scanline Overlay ─────────────────────────────────────────────
export function ScanlineOverlay() {
  const isMobile = useIsMobile();
  // Skip scanlines on mobile — pure cosmetic, saves compositing
  if (isMobile) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[100]"
      style={{
        background:
          "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.015) 3px, rgba(0,0,0,0.015) 6px)",
        mixBlendMode: "multiply",
      }}
    />
  );
}

// ─── Cursor Glow (follows mouse) ─────────────────────────────────────────
export function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) return;
    let animFrame: number;
    let currentX = 0, currentY = 0;
    let targetX = 0, targetY = 0;

    const onMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const animate = () => {
      currentX += (targetX - currentX) * 0.15;
      currentY += (targetY - currentY) * 0.15;
      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${currentX - 200}px, ${currentY - 200}px, 0)`;
      }
      animFrame = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    animFrame = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(animFrame);
    };
  }, [isMobile]);

  if (isMobile) return null;

  return (
    <div
      ref={glowRef}
      className="fixed top-0 left-0 w-[400px] h-[400px] pointer-events-none z-[90]"
      style={{
        background: "radial-gradient(circle, rgba(0,212,255,0.06) 0%, rgba(0,212,255,0.02) 30%, transparent 70%)",
        borderRadius: "50%",
        willChange: "transform",
      }}
    />
  );
}

// ─── Floating Binary/Hex Data ────────────────────────────────────────────
const DATA_CHARS = "0123456789ABCDEF";

function FloatingDatum({ index }: { index: number }) {
  const [chars, setChars] = useState("");
  const col = (index * 137) % 100;
  const duration = 8 + (index % 7) * 3;
  const delay = (index % 11) * 1.5;

  useEffect(() => {
    const genChars = () => {
      let s = "";
      const len = 4 + (index % 5);
      for (let i = 0; i < len; i++) s += DATA_CHARS[Math.floor(Math.random() * DATA_CHARS.length)];
      return s;
    };
    setChars(genChars());
    const interval = setInterval(() => setChars(genChars()), 5000 + index * 400);
    return () => clearInterval(interval);
  }, [index]);

  return (
    <motion.div
      className="absolute pointer-events-none select-none"
      style={{
        left: `${col}%`,
        fontFamily: "JetBrains Mono, monospace",
        fontSize: "0.55rem",
        color: index % 3 === 0 ? "rgba(0,212,255,0.08)" : index % 3 === 1 ? "rgba(57,255,20,0.06)" : "rgba(139,92,246,0.06)",
        letterSpacing: "0.1em",
        writingMode: index % 4 === 0 ? "vertical-rl" : "horizontal-tb",
        willChange: "transform, opacity",
      }}
      animate={{
        y: ["-10%", "110vh"],
        opacity: [0, 0.6, 0.6, 0],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      {chars}
    </motion.div>
  );
}

export function FloatingData() {
  const isMobile = useIsMobile();
  // Completely disabled on mobile
  if (isMobile) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Reduced from 18 to 10 items */}
      {Array.from({ length: 10 }, (_, i) => (
        <FloatingDatum key={i} index={i} />
      ))}
    </div>
  );
}

// ─── Page Transition Wrapper ─────────────────────────────────────────────
export function PageTransition({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const reduced = usePrefersReducedMotion();

  // Simplified transition on mobile (no blur filter which is very expensive)
  if (isMobile || reduced) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Top sweep line on page enter */}
      <motion.div
        className="fixed top-16 left-0 right-0 h-px z-50 pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, #00d4ff, #39ff14, transparent)" }}
        initial={{ scaleX: 0, opacity: 1 }}
        animate={{ scaleX: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 0.8, times: [0, 0.3, 0.7, 1], ease: "easeInOut" }}
      />
      {children}
    </motion.div>
  );
}

// ─── Glitch Text Component ───────────────────────────────────────────────
export function GlitchText({
  text,
  className = "",
  style = {},
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [glitch, setGlitch] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    // No glitch on mobile
    if (isMobile) return;
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 150);
    }, 4000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, [isMobile]);

  return (
    <span className={`relative inline-block ${className}`} style={style}>
      {text}
      {glitch && !isMobile && (
        <>
          <span
            className="absolute top-0 left-0 w-full"
            style={{
              ...style,
              color: "#00d4ff",
              clipPath: "polygon(0 0, 100% 0, 100% 45%, 0 45%)",
              transform: "translate(-2px, -1px)",
              opacity: 0.8,
            }}
          >
            {text}
          </span>
          <span
            className="absolute top-0 left-0 w-full"
            style={{
              ...style,
              color: "#39ff14",
              clipPath: "polygon(0 55%, 100% 55%, 100% 100%, 0 100%)",
              transform: "translate(2px, 1px)",
              opacity: 0.8,
            }}
          >
            {text}
          </span>
        </>
      )}
    </span>
  );
}

// ─── Cyber Border Card (hover scanner effect) ────────────────────────────
export function CyberCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const isMobile = useIsMobile();

  const onMouseMove = (e: React.MouseEvent) => {
    if (isMobile || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={isMobile ? undefined : onMouseMove}
      className={`relative group ${className}`}
    >
      {/* Animated border glow following mouse — desktop only */}
      {!isMobile && (
        <div
          className="absolute -inset-px rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(400px circle at ${mousePos.x}% ${mousePos.y}%, rgba(0,212,255,0.15), transparent 50%)`,
          }}
        />
      )}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          background: "rgba(17,24,39,0.5)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Scanner line on hover — desktop only */}
        {!isMobile && (
          <motion.div
            className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, #00d4ff, transparent)" }}
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
        )}
        {children}
      </div>
    </div>
  );
}