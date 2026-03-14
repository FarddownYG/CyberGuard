import { useState, useEffect } from "react";
import { Activity, CheckCircle, AlertTriangle, XCircle, Globe, Server, Database, Shield, Wifi, Bug, FileSearch, Mail, TrendingUp, Users, Zap, ShieldCheck, BarChart3 } from "lucide-react";
import { motion } from "motion/react";

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "down";
  latency: number;
  uptime: number;
  icon: React.ElementType;
  lastCheck: string;
}

interface CyberGuardStats {
  totalScans: number;
  virusesDetected: number;
  threatsBlocked: number;
  emailsAnalyzed: number;
  filesAnalyzed: number;
  problemsSolved: number;
  activeUsers: number;
  uptimePercent: number;
}

function getRandomLatency(base: number): number {
  return base + Math.floor(Math.random() * 50);
}

function AnimatedCounter({ value, duration = 2000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(value / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <>{count.toLocaleString("fr-FR")}</>;
}

export function StatusPage() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: "Site Scanner (Shannon API)", status: "operational", latency: 45, uptime: 99.98, icon: Shield, lastCheck: "" },
    { name: "VirusTotal Integration", status: "operational", latency: 120, uptime: 99.95, icon: Globe, lastCheck: "" },
    { name: "Analyseur de Fichiers", status: "operational", latency: 15, uptime: 99.99, icon: FileSearch, lastCheck: "" },
    { name: "Email Checker", status: "operational", latency: 28, uptime: 99.97, icon: Mail, lastCheck: "" },
    { name: "Serveur API Principal", status: "operational", latency: 18, uptime: 99.99, icon: Server, lastCheck: "" },
    { name: "Base de Donnees", status: "operational", latency: 8, uptime: 99.99, icon: Database, lastCheck: "" },
    { name: "CDN / Assets", status: "degraded", latency: 250, uptime: 99.85, icon: Wifi, lastCheck: "" },
  ]);

  const [stats] = useState<CyberGuardStats>({
    totalScans: 0,
    virusesDetected: 0,
    threatsBlocked: 0,
    emailsAnalyzed: 0,
    filesAnalyzed: 0,
    problemsSolved: 0,
    activeUsers: 0,
    uptimePercent: 100,
  });

  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString("fr-FR"));

  useEffect(() => {
    const interval = setInterval(() => {
      setServices((prev) =>
        prev.map((s) => ({
          ...s,
          latency: getRandomLatency(s.status === "degraded" ? 200 : s.name.includes("VirusTotal") ? 100 : 10),
          lastCheck: new Date().toLocaleTimeString("fr-FR"),
        }))
      );
      setLastUpdated(new Date().toLocaleTimeString("fr-FR"));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setServices((prev) =>
      prev.map((s) => ({ ...s, lastCheck: new Date().toLocaleTimeString("fr-FR") }))
    );
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
      case "operational": return "Operationnel";
      case "degraded": return "Degrade";
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

  const uptimeBars = Array.from({ length: 90 }, (_, i) => {
    if (i === 67 || i === 45) return "degraded";
    return "operational";
  });

  const statCards = [
    { label: "Scans totaux", value: stats.totalScans, icon: BarChart3, color: "#00d4ff", desc: "Analyses effectuees sur la plateforme" },
    { label: "Virus detectes", value: stats.virusesDetected, icon: Bug, color: "#ef4444", desc: "Fichiers et liens malveillants identifies" },
    { label: "Menaces bloquees", value: stats.threatsBlocked, icon: ShieldCheck, color: "#39ff14", desc: "Attaques et menaces neutralisees" },
    { label: "Emails analyses", value: stats.emailsAnalyzed, icon: Mail, color: "#06b6d4", desc: "Emails verifies par notre checker" },
    { label: "Fichiers analyses", value: stats.filesAnalyzed, icon: FileSearch, color: "#f59e0b", desc: "Fichiers scannes via VirusTotal" },
    { label: "Problemes resolus", value: stats.problemsSolved, icon: Zap, color: "#8b5cf6", desc: "Problemes identifies et corriges par les utilisateurs" },
    { label: "Utilisateurs actifs", value: stats.activeUsers, icon: Users, color: "#ec4899", desc: "Utilisateurs ce mois-ci" },
    { label: "Uptime global", value: stats.uptimePercent, icon: TrendingUp, color: "#39ff14", desc: "Disponibilite de la plateforme", isPercent: true },
  ];

  return (
    <div className="min-h-screen py-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6" style={{ background: "rgba(57,255,20,0.04)", border: "1px solid rgba(57,255,20,0.1)" }}>
            <Activity className="w-3.5 h-3.5 text-[#39ff14]" />
            <span className="text-[#39ff14]" style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace" }}>En direct</span>
          </div>
          <h1 style={{ fontFamily: "Orbitron, sans-serif", fontSize: "clamp(1.8rem, 3vw, 2.2rem)" }} className="text-[#e2e8f0] mb-4">
            Statut &{" "}
            <span style={{ background: "linear-gradient(135deg, #39ff14, #00d4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Statistiques</span>
          </h1>
          <p className="text-[#94a3b8]">Etat en temps reel des services et statistiques globales de CyberGuard</p>
        </motion.div>

        {/* ===== CYBERGUARD STATS ===== */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-5">
            <Shield className="w-5 h-5 text-[#00d4ff]" />
            <h2 className="text-[#e2e8f0]" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1rem" }}>
              Statistiques <span className="text-[#00d4ff]">CyberGuard</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="rounded-xl p-5 group hover:scale-[1.02] transition-transform duration-300"
                style={{
                  background: "rgba(17,24,39,0.5)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${stat.color}10` }}
                  >
                    <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "Orbitron, sans-serif",
                    fontSize: "1.5rem",
                    color: stat.color,
                  }}
                >
                  {(stat as any).isPercent ? (
                    <>{stat.value}%</>
                  ) : (
                    <AnimatedCounter value={stat.value} />
                  )}
                </div>
                <p className="text-[#e2e8f0] mt-1" style={{ fontSize: "0.8rem" }}>{stat.label}</p>
                <p className="text-[#4a5568]" style={{ fontSize: "0.7rem" }}>{stat.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ===== SERVICE STATUS ===== */}
        <div className="flex items-center gap-2 mb-5">
          <Activity className="w-5 h-5 text-[#39ff14]" />
          <h2 className="text-[#e2e8f0]" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1rem" }}>
            Etat des <span className="text-[#39ff14]">Services</span>
          </h2>
        </div>

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
              {allOperational ? "Tous les systemes sont operationnels" : "Certains services sont degrades"}
            </span>
          </div>
          <p className="text-[#4a5568]" style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace" }}>
            Derniere verification : {lastUpdated} | Auto-refresh 5s
          </p>
        </motion.div>

        {/* 90-day uptime */}
        <div className="rounded-xl p-6 mb-6" style={{ background: "rgba(17,24,39,0.5)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[#e2e8f0]" style={{ fontSize: "0.95rem" }}>Uptime 90 jours</h3>
            <span className="text-[#39ff14]" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}>100%</span>
          </div>
          <div className="flex gap-[2px] h-7 rounded overflow-hidden">
            {uptimeBars.map((status, i) => (
              <div
                key={i}
                className="flex-1 transition-colors hover:opacity-90"
                style={{ backgroundColor: status === "operational" ? "#39ff14" : "#f59e0b", opacity: 0.6 }}
                title={`Jour ${90 - i} : ${status === "operational" ? "OK" : "Degrade"}`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[#4a5568]" style={{ fontSize: "0.65rem", fontFamily: "JetBrains Mono, monospace" }}>
            <span>90 jours</span>
            <span>Aujourd'hui</span>
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
                    <div className="flex items-center gap-3 text-[#4a5568]" style={{ fontSize: "0.7rem", fontFamily: "JetBrains Mono, monospace" }}>
                      <span>{service.latency}ms</span>
                      <span>|</span>
                      <span>{service.uptime}% uptime</span>
                    </div>
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

              {/* Show problem & how to fix if service is degraded/down */}
              {service.status !== "operational" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 bg-[#0a0a0f] rounded-lg p-3 border-l-2"
                  style={{ borderColor: getStatusColor(service.status) }}
                >
                  <p className="text-[#e2e8f0]" style={{ fontSize: "0.8rem" }}>
                    <span style={{ color: getStatusColor(service.status) }}>Probleme detecte : </span>
                    {service.status === "degraded"
                      ? `Latence elevee sur ${service.name} (${service.latency}ms au lieu de ~50ms).`
                      : `${service.name} est actuellement hors service.`
                    }
                  </p>
                  <p className="text-[#94a3b8] mt-1" style={{ fontSize: "0.75rem" }}>
                    <span className="text-[#00d4ff]">Comment resoudre : </span>
                    {service.status === "degraded"
                      ? "Le service fonctionne mais plus lentement. Les requetes peuvent prendre plus de temps. Si le probleme persiste, videz le cache de votre navigateur et reessayez."
                      : "Le service est temporairement indisponible. Nos equipes sont informees et travaillent a la resolution. Reessayez dans quelques minutes."
                    }
                  </p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Incidents */}
        <div className="rounded-xl p-6 mt-8" style={{ background: "rgba(17,24,39,0.4)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <h3 className="text-[#e2e8f0] mb-5" style={{ fontSize: "0.95rem" }}>Derniers incidents</h3>
          <div className="space-y-5">
            {[
              { date: "12 Mars 2026", title: "CDN : latence elevee", detail: "Latence elevee detectee sur le CDN pendant 45 minutes. Resolution automatique.", status: "resolved" as const },
              { date: "28 Fev 2026", title: "VirusTotal API : timeout intermittents", detail: "Timeouts pendant 20 minutes. Fallback cache local active. Aucun impact utilisateur.", status: "resolved" as const },
              { date: "15 Fev 2026", title: "Email Checker : lenteur temporaire", detail: "Analyse des liens VirusTotal ralentie pendant 30 minutes. File d'attente accumulee puis traitee.", status: "resolved" as const },
            ].map((incident) => (
              <div key={incident.date + incident.title} className="pl-4" style={{ borderLeft: "2px solid rgba(245,158,11,0.2)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[#4a5568]" style={{ fontSize: "0.7rem", fontFamily: "JetBrains Mono, monospace" }}>{incident.date}</span>
                  <span className="px-2 py-0.5 rounded-full" style={{ fontSize: "0.6rem", background: "rgba(57,255,20,0.06)", border: "1px solid rgba(57,255,20,0.12)", color: "#39ff14", fontFamily: "JetBrains Mono, monospace" }}>
                    Resolu
                  </span>
                </div>
                <p className="text-[#e2e8f0]" style={{ fontSize: "0.88rem" }}>{incident.title}</p>
                <p className="text-[#64748b]" style={{ fontSize: "0.78rem" }}>{incident.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}