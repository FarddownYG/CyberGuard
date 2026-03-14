import { Outlet, useLocation } from "react-router";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState, useCallback } from "react";
import { ArrowUp } from "lucide-react";
import { CyberLoader } from "./CyberLoader";
import { ScanlineOverlay, CursorGlow, FloatingData, PageTransition } from "./CyberEffects";

function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-xl flex items-center justify-center group cyber-btn-float"
          style={{
            background: "rgba(0,212,255,0.1)",
            border: "1px solid rgba(0,212,255,0.2)",
            backdropFilter: "blur(12px)",
          }}
          aria-label="Retour en haut"
        >
          <ArrowUp className="w-4.5 h-4.5 text-[#00d4ff] group-hover:text-[#39ff14] transition-colors" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export function Layout() {
  const location = useLocation();
  const [loading, setLoading] = useState(() => {
    // Only show loader on first visit in this session
    return !sessionStorage.getItem("cyberguard_loaded");
  });

  const handleLoaderComplete = useCallback(() => {
    setLoading(false);
    sessionStorage.setItem("cyberguard_loaded", "1");
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <>
      {/* Boot loader (first visit only) */}
      <AnimatePresence>
        {loading && <CyberLoader onComplete={handleLoaderComplete} />}
      </AnimatePresence>

      <div
        className={`min-h-screen bg-[#0a0a0f] text-[#e2e8f0] transition-opacity duration-500 ${loading ? "opacity-0" : "opacity-100"}`}
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        {/* Global cyber effects */}
        <ScanlineOverlay />
        <CursorGlow />
        <FloatingData />

        <Navbar />
        <main className="pt-16 relative z-10">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </main>
        <Footer />
        <ScrollToTopButton />
      </div>
    </>
  );
}
