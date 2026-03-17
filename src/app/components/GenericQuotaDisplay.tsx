import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Activity, Clock, Calendar, CalendarDays, AlertTriangle, Ban } from "lucide-react";
import { getGenericQuota, formatDuration, type RateLimitConfig, type GenericQuotaInfo } from "./rate-limiter";

interface Props {
  config: RateLimitConfig;
  title: string;
  accentColor?: string;
}

export function GenericQuotaDisplay({ config, title, accentColor = "#00d4ff" }: Props) {
  const [quota, setQuota] = useState<GenericQuotaInfo>(getGenericQuota(config));

  useEffect(() => {
    const interval = setInterval(() => setQuota(getGenericQuota(config)), 2000);
    return () => clearInterval(interval);
  }, [config]);

  const bars = [
    {
      label: "Par minute",
      used: quota.minuteUsed,
      max: quota.minuteMax,
      icon: Clock,
      color: accentColor,
      suffix: "/min",
    },
    {
      label: "Aujourd'hui",
      used: quota.dayUsed,
      max: quota.dayMax,
      icon: Calendar,
      color: "#39ff14",
      suffix: "/jour",
    },
    {
      label: "Ce mois",
      used: quota.monthUsed,
      max: quota.monthMax,
      icon: CalendarDays,
      color: "#8b5cf6",
      suffix: "/mois",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#111827] border rounded-xl p-4"
      style={{ borderColor: `${accentColor}15` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4" style={{ color: accentColor }} />
        <span
          className="text-[#e2e8f0]"
          style={{ fontSize: "0.85rem", fontFamily: "Orbitron, sans-serif" }}
        >
          {title}
        </span>
        {!quota.canRequest && (
          <span className="ml-auto flex items-center gap-1 text-[#f59e0b]" style={{ fontSize: "0.7rem" }}>
            <AlertTriangle className="w-3 h-3" />
            Limite atteinte
          </span>
        )}
      </div>

      <div className="space-y-3">
        {bars.map((bar) => {
          const pct = bar.max > 0 ? (bar.used / bar.max) * 100 : 0;
          const isNear = pct >= 80;
          const isFull = pct >= 100;

          return (
            <div key={bar.label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <bar.icon className="w-3 h-3" style={{ color: bar.color }} />
                  <span className="text-[#94a3b8]" style={{ fontSize: "0.7rem" }}>
                    {bar.label}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontFamily: "JetBrains Mono, monospace",
                    color: isFull ? "#ef4444" : isNear ? "#f59e0b" : bar.color,
                  }}
                >
                  {bar.used}/{bar.max.toLocaleString("fr-FR")}
                  <span className="text-[#64748b]"> {bar.suffix}</span>
                </span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, pct)}%`,
                    background: isFull
                      ? "#ef4444"
                      : isNear
                        ? `linear-gradient(90deg, ${bar.color}, #f59e0b)`
                        : bar.color,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, pct)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Cooldown timer */}
      {quota.cooldownRemaining > 0 && (
        <div
          className="mt-3 pt-3 flex items-center gap-2"
          style={{ borderTop: `1px solid ${accentColor}12` }}
        >
          <Clock className="w-3 h-3 text-[#f59e0b]" />
          <span className="text-[#f59e0b]" style={{ fontSize: "0.7rem", fontFamily: "JetBrains Mono, monospace" }}>
            Cooldown : {formatDuration(quota.cooldownRemaining)}
          </span>
        </div>
      )}

      {/* Next minute slot */}
      {quota.nextSlotIn > 0 && quota.cooldownRemaining === 0 && (
        <div
          className="mt-3 pt-3 flex items-center gap-2"
          style={{ borderTop: `1px solid ${accentColor}12` }}
        >
          <Clock className="w-3 h-3 text-[#f59e0b]" />
          <span className="text-[#f59e0b]" style={{ fontSize: "0.7rem", fontFamily: "JetBrains Mono, monospace" }}>
            Prochain slot dans {quota.nextSlotIn}s
          </span>
        </div>
      )}

      {/* Manual block (billing error etc.) */}
      {quota.isManualBlock && (
        <div
          className="mt-3 pt-3 flex items-start gap-2"
          style={{ borderTop: "1px solid rgba(239,68,68,0.15)" }}
        >
          <Ban className="w-3.5 h-3.5 text-[#ef4444] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[#ef4444]" style={{ fontSize: "0.72rem" }}>
              {quota.manualBlockReason}
            </p>
            {quota.manualBlockRemaining > 0 && (
              <p className="text-[#64748b] mt-0.5" style={{ fontSize: "0.68rem", fontFamily: "JetBrains Mono, monospace" }}>
                Deblocage dans : {formatDuration(quota.manualBlockRemaining)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Generic blocked reason */}
      {!quota.canRequest && quota.blockedReason && !quota.isManualBlock && (
        <div
          className="mt-3 pt-3 text-[#f59e0b]"
          style={{ borderTop: "1px solid rgba(245,158,11,0.15)", fontSize: "0.72rem" }}
        >
          {quota.blockedReason}
        </div>
      )}
    </motion.div>
  );
}
