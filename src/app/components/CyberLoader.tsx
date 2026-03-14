import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Shield } from "lucide-react";

const BOOT_LINES = [
  { text: "CYBERGUARD SECURITY SUITE v3.0", delay: 0, color: "#00d4ff" },
  { text: "Initializing kernel modules...", delay: 200, color: "#94a3b8" },
  { text: "[OK] Crypto engine loaded", delay: 500, color: "#39ff14" },
  { text: "[OK] Shannon AI pentester ready", delay: 800, color: "#39ff14" },
  { text: "[OK] VirusTotal API linked", delay: 1050, color: "#39ff14" },
  { text: "[OK] SSL/TLS scanner online", delay: 1250, color: "#39ff14" },
  { text: "[OK] DNS security module active", delay: 1400, color: "#39ff14" },
  { text: "Loading threat intelligence...", delay: 1600, color: "#94a3b8" },
  { text: "[OK] All systems operational", delay: 1900, color: "#39ff14" },
  { text: "READY.", delay: 2200, color: "#00d4ff" },
];

function BootLine({ text, delay, color }: { text: string; delay: number; color: string }) {
  const [visible, setVisible] = useState(false);
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    const t1 = setTimeout(() => {
      setVisible(true);
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setDisplayText(text.slice(0, i));
        if (i >= text.length) clearInterval(interval);
      }, 12);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(t1);
  }, [text, delay]);

  if (!visible) return null;

  return (
    <div className="flex items-center gap-2">
      <span style={{ color: "#00d4ff", fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem" }}>{">"}</span>
      <span style={{ color, fontFamily: "JetBrains Mono, monospace", fontSize: "0.72rem" }}>
        {displayText}
        {displayText.length < text.length && <span className="animate-pulse">_</span>}
      </span>
    </div>
  );
}

export function CyberLoader({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"boot" | "logo" | "done">("boot");

  useEffect(() => {
    // Progress bar
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(interval); return 100; }
        return p + Math.random() * 8 + 2;
      });
    }, 80);

    // Logo phase
    const t1 = setTimeout(() => setPhase("logo"), 2400);
    // Done
    const t2 = setTimeout(() => setPhase("done"), 3200);
    const t3 = setTimeout(onComplete, 3600);

    return () => {
      clearInterval(interval);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== "done" && (
        <motion.div
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: "#050508" }}
        >
          {/* Animated grid */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(0,212,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.4) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            {/* Sweep line */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, #00d4ff, transparent)" }}
              animate={{ top: ["0%", "100%"] }}
              transition={{ duration: 2.5, ease: "linear", repeat: Infinity }}
            />
            {/* Corner decorations */}
            <div className="absolute top-6 left-6 w-16 h-16">
              <div className="absolute top-0 left-0 w-full h-px bg-[#00d4ff]/30" />
              <div className="absolute top-0 left-0 w-px h-full bg-[#00d4ff]/30" />
            </div>
            <div className="absolute top-6 right-6 w-16 h-16">
              <div className="absolute top-0 right-0 w-full h-px bg-[#00d4ff]/30" />
              <div className="absolute top-0 right-0 w-px h-full bg-[#00d4ff]/30" />
            </div>
            <div className="absolute bottom-6 left-6 w-16 h-16">
              <div className="absolute bottom-0 left-0 w-full h-px bg-[#00d4ff]/30" />
              <div className="absolute bottom-0 left-0 w-px h-full bg-[#00d4ff]/30" />
            </div>
            <div className="absolute bottom-6 right-6 w-16 h-16">
              <div className="absolute bottom-0 right-0 w-full h-px bg-[#00d4ff]/30" />
              <div className="absolute bottom-0 right-0 w-px h-full bg-[#00d4ff]/30" />
            </div>
          </div>

          {/* Hex pattern */}
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill='none' stroke='%2300d4ff' stroke-width='0.5'/%3E%3C/svg%3E")`,
            backgroundSize: "60px 60px",
          }} />

          <div className="relative z-10 w-full max-w-lg px-8">
            <AnimatePresence mode="wait">
              {phase === "boot" && (
                <motion.div
                  key="boot"
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-1.5"
                >
                  {BOOT_LINES.map((line, i) => (
                    <BootLine key={i} {...line} />
                  ))}

                  {/* Progress bar */}
                  <div className="mt-6 pt-4" style={{ borderTop: "1px solid rgba(0,212,255,0.1)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: "#64748b" }}>
                        SYSTEM INIT
                      </span>
                      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: "#00d4ff" }}>
                        {Math.min(100, Math.round(progress))}%
                      </span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(0,212,255,0.1)" }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: "linear-gradient(90deg, #00d4ff, #39ff14)", width: `${Math.min(100, progress)}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {phase === "logo" && (
                <motion.div
                  key="logo"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.2 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="relative">
                    <Shield className="w-20 h-20 text-[#00d4ff]" />
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{ boxShadow: "0 0 60px rgba(0,212,255,0.4), 0 0 120px rgba(0,212,255,0.1)" }}
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    {/* Orbiting ring */}
                    <motion.div
                      className="absolute -inset-4 rounded-full border border-[#00d4ff]/20"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    >
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#39ff14]" />
                    </motion.div>
                  </div>
                  <motion.span
                    initial={{ opacity: 0, letterSpacing: "0.5em" }}
                    animate={{ opacity: 1, letterSpacing: "0.3em" }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1.5rem", color: "#00d4ff" }}
                  >
                    CYBERGUARD
                  </motion.span>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: "#39ff14" }}
                  >
                    SECURITY SUITE INITIALIZED
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Scanlines */}
          <div
            className="absolute inset-0 pointer-events-none z-20"
            style={{
              background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
