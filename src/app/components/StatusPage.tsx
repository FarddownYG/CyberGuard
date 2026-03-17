import { useState, useEffect } from "react";
import { Activity, CheckCircle, AlertTriangle, XCircle, Globe, Shield, FileSearch, Mail, Eye, Key, Lock } from "lucide-react";
import { motion } from "motion/react";

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "down";
  description: string;
  icon: React.ElementType;
  lastCheck: string;
}

/** Ping a URL and measure latency. Returns latency in ms or -1 if down. */
async function pingService(url: string): Promise<number> {
  const start = performance.now();
  try {
    await fetch(url, { method: "HEAD", mode: "no-cors", cache: "no-store" });
    return Math.round(performance.now() - start);
  } catch {
    return -1;
  }
}

export function StatusPage() {
  // Real services: only things that actually exist on this site
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: "Site Web (Frontend)", status: "operational", description: "Application React hébergée sur Vercel", icon: Globe, lastCheck: "" },
    { name: "Analyse VirusTotal", status: "operational", description: "Proxy API v3 via Vercel rewrites", icon: Eye, lastCheck: "" },
    { name: "Analyseur de Fichiers", status: "operational", description: "Hash local + lookup VirusTotal", icon: FileSearch, lastCheck: "" },
    { name: "Email Checker", status: "operational", description: "Analyse locale anti-phishing", icon: Mail, lastCheck: "" },
    { name: "Générateur de Mots de Passe", status: "operational", description: "Web Crypto API (100% local)", icon: Key, lastCheck: "" },
    { name: "DNS Security Check", status: "operational", description: "DNS-over-HTTPS via Google/Cloudflare", icon: Shield, lastCheck: "" },
    { name: "SSL Checker", status: "operational", description: "Page vitrine (lien externe à venir)", icon: Lock, lastCheck: "" },
  ]);

  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString("fr-FR"));
  const [checking, setChecking] = useState(false);

  const runChecks = async () => {
    setChecking(true);
    const now = new Date().toLocaleTimeString("fr-FR");

    // Actually ping our own site to verify it's up
    const sitePing = await pingService(window.location.origin);

    // Check VirusTotal proxy
    let vtStatus: "operational" | "degraded" | "down" = "operational";
    const vtKey = import.meta.env.VITE_VIRUSTOTAL_API_KEY;
    if (!vtKey || vtKey === "YOUR_API_KEY_HERE") {
      vtStatus = "degraded"; // API key not configured
    } else {
      try {
        const vtRes = await fetch("/api/vt/urls", { method: "HEAD", signal: AbortSignal.timeout(5000) });
        // 4xx is expected (no body), but means proxy works
        vtStatus = vtRes.status < 500 ? "operational" : "down";
      } catch {
        vtStatus = "down";
      }
    }

    // Check DNS-over-HTTPS (Google)
    let dnsStatus: "operational" | "degraded" | "down" = "operational";
    try {
      const dnsRes = await fetch("https://dns.google/resolve?name=example.com&type=A", { signal: AbortSignal.timeout(5000) });
      dnsStatus = dnsRes.ok ? "operational" : "degraded";
    } catch {
      dnsStatus = "down";
    }

    // Check HaveIBeenPwned API (used by Password Generator)
    let hibpStatus: "operational" | "degraded" | "down" = "operational";
    try {
      const hibpRes = await fetch("https://api.pwnedpasswords.com/range/00000", { signal: AbortSignal.timeout(5000) });
      hibpStatus = hibpRes.ok ? "operational" : "degraded";
    } catch {
      hibpStatus = "down";
    }

    setServices((prev) =>
      prev.map((s) => {
        let status: "operational" | "degraded" | "down" = "operational";
        if (s.name === "Site Web (Frontend)") status = sitePing >= 0 ? "operational" : "down";
        else if (s.name === "Analyse VirusTotal") status = vtStatus;
        else if (s.name === "Analyseur de Fichiers") status = vtStatus; // depends on VT
        else if (s.name === "DNS Security Check") status = dnsStatus;
        else if (s.name === "Générateur de Mots de Passe") status = hibpStatus === "down" ? "degraded" : "operational";
        // Email Checker & SSL Checker are 100% local
        return { ...s, status, lastCheck: now };
      })
    );

    setLastUpdated(now);
    setChecking(false);
  };

  useEffect(() => {
    runChecks();
    const interval = setInterval(runChecks, 30_000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const allOperational = services.every((s) => s.status === "operational");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational": return "#39ff14";
      case "degraded": return "#f59e0b";
      default: return "#ef4444";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "operational": return "Opérationnel";
      case "degraded": return "Dégradé";
      default: return "Hors service";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "operational": return <CheckCircle className="w-3.5 h-3.5 text-[#39ff14]" />;
      case "degraded": return <AlertTriangle className="w-3.5 h-3.5 text-[#f59e0b]" />;
      default: return <XCircle className="w-3.5 h-3.5 text-[#ef4444]" />;
    }
  };

  return (
    <div className="min-h-screen py-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6" style={{ background: "rgba(57,255,20,0.04)", border: "1px solid rgba(57,255,20,0.1)" }}>
            <Activity className="w-3.5 h-3.5 text-[#39ff14]" />
            <span className="text-[#39ff14]" style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace" }}>En direct</span>
          </div>
          <h1 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.8rem, 3vw, 2.2rem)" }} className="text-[#e2e8f0] mb-4">
            Statut des{" "}
            <span style={{ background: "linear-gradient(135deg, #39ff14, #00d4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Services</span>
          </h1>
          <p className="text-[#94a3b8]">État en temps réel des services CyberGuard</p>
        </motion.div>

        {/* Overall status */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl p-6 mb-8 text-center"
          style={{
            background: allOperational ? "rgba(57,255,20,0.03)" : "rgba(245,158,11,0.03)",
            border: `1px solid ${allOperational ? "rgba(57,255,20,0.15)" : "rgba(245,158,11,0.15)"}`,
          }}
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            {allOperational ? <CheckCircle className="w-7 h-7 text-[#39ff14]" /> : <AlertTriangle className="w-7 h-7 text-[#f59e0b]" />}
            <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1.1rem", color: allOperational ? "#39ff14" : "#f59e0b" }}>
              {allOperational ? "Tous les systèmes sont opérationnels" : "Certains services sont dégradés"}
            </span>
          </div>
          <p className="text-[#4a5568]" style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace" }}>
            Dernière vérification : {lastUpdated} | Auto-refresh 30s
            {checking && " | Vérification en cours..."}
          </p>
        </motion.div>

        {/* 90-day uptime — no historical data available */}
        <div className="rounded-xl p-6 mb-6" style={{ background: "rgba(17,24,39,0.5)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#e2e8f0]" style={{ fontSize: "0.95rem" }}>Historique de disponibilité</h3>
          </div>
          <div className="text-center py-4">
            <p className="text-[#64748b]" style={{ fontSize: "0.8rem" }}>
              Aucun historique de disponibilité enregistré. Les vérifications ci-dessous sont effectuées en temps réel à chaque visite de cette page.
            </p>
            <p className="text-[#4a5568] mt-2" style={{ fontSize: "0.7rem", fontFamily: "JetBrains Mono, monospace" }}>
              Un système de monitoring 24/7 avec historique n'est pas encore en place.
            </p>
          </div>
        </div>

        {/* Services */}
        <div className="space-y-3">
          {services.map((service, i) => (
            <motion.div
              key={service.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.06 }}
              className="rounded-xl p-5 group"
              style={{ background: "rgba(17,24,39,0.4)", border: "1px solid rgba(255,255,255,0.04)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,212,255,0.06)" }}>
                    <service.icon className="w-4 h-4 text-[#00d4ff]" />
                  </div>
                  <div>
                    <p className="text-[#e2e8f0]" style={{ fontSize: "0.88rem" }}>{service.name}</p>
                    <p className="text-[#4a5568]" style={{ fontSize: "0.7rem", fontFamily: "JetBrains Mono, monospace" }}>
                      {service.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                    style={{ fontSize: "0.7rem", color: getStatusColor(service.status), background: `${getStatusColor(service.status)}08`, border: `1px solid ${getStatusColor(service.status)}15`, fontFamily: "JetBrains Mono, monospace" }}
                  >
                    {getStatusIcon(service.status)}
                    {getStatusLabel(service.status)}
                  </span>
                  <div className="relative w-2.5 h-2.5">
                    <div className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ backgroundColor: getStatusColor(service.status) }} />
                    <div className="absolute inset-0 rounded-full" style={{ backgroundColor: getStatusColor(service.status) }} />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Incidents — no tracking system in place */}
        <div className="rounded-xl p-6 mt-8" style={{ background: "rgba(17,24,39,0.4)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <h3 className="text-[#e2e8f0] mb-4" style={{ fontSize: "0.95rem" }}>Derniers incidents</h3>
          <div className="text-center py-8">
            <Activity className="w-10 h-10 text-[#64748b]/40 mx-auto mb-3" />
            <p className="text-[#64748b]" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.85rem" }}>
              Pas de système de suivi d'incidents
            </p>
            <p className="text-[#4a5568] mt-1" style={{ fontSize: "0.75rem" }}>
              Les incidents ne sont pas encore tracés automatiquement. Les vérifications sont effectuées à chaque chargement de cette page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}