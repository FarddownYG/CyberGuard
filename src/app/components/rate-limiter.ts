/**
 * Generic Rate Limiter — localStorage-based persistence
 * Reusable for Pentesting, Email Checker, or any module.
 *
 * Each module gets its own storage key and limits.
 */

export interface RateLimitConfig {
  storageKey: string;
  minuteMax: number;
  dayMax: number;
  monthMax: number;
  /** Optional cooldown in seconds between requests (e.g. 7200 = 2h) */
  cooldownSeconds?: number;
  labels: {
    minuteLabel: string;
    dayLabel: string;
    monthLabel: string;
  };
}

interface StoredRequests {
  timestamps: number[];
  /** Optional: track billing errors / forced blocks */
  blockedUntil?: number;
  blockReason?: string;
}

function getStored(key: string): StoredRequests {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { timestamps: [] };
    return JSON.parse(raw);
  } catch {
    return { timestamps: [] };
  }
}

function setStored(key: string, data: StoredRequests) {
  localStorage.setItem(key, JSON.stringify(data));
}

function now(): number {
  return Date.now();
}

function cleanup(timestamps: number[]): number[] {
  const cutoff = now() - 31 * 24 * 60 * 60 * 1000;
  return timestamps.filter((t) => t > cutoff);
}

function countInWindow(timestamps: number[], windowMs: number): number {
  const cutoff = now() - windowMs;
  return timestamps.filter((t) => t > cutoff).length;
}

function countToday(timestamps: number[]): number {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  return timestamps.filter((t) => t >= todayStart.getTime()).length;
}

function countThisMonth(timestamps: number[]): number {
  const d = new Date();
  const monthStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).getTime();
  return timestamps.filter((t) => t >= monthStart).length;
}

export interface GenericQuotaInfo {
  minuteUsed: number;
  minuteMax: number;
  dayUsed: number;
  dayMax: number;
  monthUsed: number;
  monthMax: number;
  canRequest: boolean;
  blockedReason: string | null;
  /** Seconds until next slot (minute-based) */
  nextSlotIn: number;
  /** Seconds until cooldown expires (0 if none) */
  cooldownRemaining: number;
  /** If a manual block is set (e.g. billing error) */
  isManualBlock: boolean;
  manualBlockReason: string | null;
  /** Seconds until manual block expires */
  manualBlockRemaining: number;
}

export function getGenericQuota(config: RateLimitConfig): GenericQuotaInfo {
  const stored = getStored(config.storageKey);
  const ts = cleanup(stored.timestamps);

  const minuteUsed = countInWindow(ts, 60_000);
  const dayUsed = countToday(ts);
  const monthUsed = countThisMonth(ts);

  let blockedReason: string | null = null;
  let cooldownRemaining = 0;
  let isManualBlock = false;
  let manualBlockReason: string | null = null;
  let manualBlockRemaining = 0;

  // Check manual block (e.g. billing error)
  if (stored.blockedUntil && stored.blockedUntil > now()) {
    isManualBlock = true;
    manualBlockReason = stored.blockReason || "Bloqué temporairement";
    manualBlockRemaining = Math.ceil((stored.blockedUntil - now()) / 1000);
    blockedReason = manualBlockReason;
  }

  // Check cooldown between requests
  if (!blockedReason && config.cooldownSeconds && ts.length > 0) {
    const lastRequest = Math.max(...ts);
    const cooldownMs = config.cooldownSeconds * 1000;
    const timeSinceLast = now() - lastRequest;
    if (timeSinceLast < cooldownMs) {
      cooldownRemaining = Math.ceil((cooldownMs - timeSinceLast) / 1000);
      blockedReason = `Cooldown actif. Prochain scan disponible dans ${formatDuration(cooldownRemaining)}.`;
    }
  }

  // Check rate limits
  if (!blockedReason && minuteUsed >= config.minuteMax) {
    blockedReason = `Limite par minute atteinte (${config.minuteMax}/${config.labels.minuteLabel}).`;
  }
  if (!blockedReason && dayUsed >= config.dayMax) {
    blockedReason = `Limite journalière atteinte (${config.dayMax}/${config.labels.dayLabel}). Réessayez demain.`;
  }
  if (!blockedReason && monthUsed >= config.monthMax) {
    blockedReason = `Limite mensuelle atteinte (${config.monthMax}/${config.labels.monthLabel}). Réessayez le mois prochain.`;
  }

  // Calculate next minute slot
  let nextSlotIn = 0;
  if (minuteUsed >= config.minuteMax && ts.length > 0) {
    const oldest = ts.filter((t) => t > now() - 60_000).sort((a, b) => a - b)[0];
    if (oldest) {
      nextSlotIn = Math.ceil((oldest + 60_000 - now()) / 1000);
    }
  }

  return {
    minuteUsed,
    minuteMax: config.minuteMax,
    dayUsed,
    dayMax: config.dayMax,
    monthUsed,
    monthMax: config.monthMax,
    canRequest: blockedReason === null,
    blockedReason,
    nextSlotIn,
    cooldownRemaining,
    isManualBlock,
    manualBlockReason,
    manualBlockRemaining,
  };
}

export function recordGenericRequest(config: RateLimitConfig): boolean {
  const quota = getGenericQuota(config);
  if (!quota.canRequest) return false;

  const stored = getStored(config.storageKey);
  stored.timestamps = cleanup(stored.timestamps);
  stored.timestamps.push(now());
  setStored(config.storageKey, stored);
  return true;
}

/** Set a manual block (e.g. after billing error detection) */
export function setManualBlock(storageKey: string, durationSeconds: number, reason: string) {
  const stored = getStored(storageKey);
  stored.blockedUntil = now() + durationSeconds * 1000;
  stored.blockReason = reason;
  setStored(storageKey, stored);
}

/** Clear a manual block */
export function clearManualBlock(storageKey: string) {
  const stored = getStored(storageKey);
  delete stored.blockedUntil;
  delete stored.blockReason;
  setStored(storageKey, stored);
}

/** Format seconds into human-readable duration */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0s";
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}j`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}min`);
  if (seconds > 0 && days === 0) parts.push(`${seconds}s`);
  return parts.join(" ") || "0s";
}

// ─── Pentesting Config ─────────────────────────────────────────────────
// Shannon uses Claude Opus (~$15/scan). Monthly Anthropic budget: $100.
// Limits: 1 scan per 2h cooldown, max 2/day, max 6/month.
export const PENTEST_RATE_CONFIG: RateLimitConfig = {
  storageKey: "cyberguard_pentest_requests",
  minuteMax: 1,
  dayMax: 2,
  monthMax: 6,
  cooldownSeconds: 7200, // 2h between scans
  labels: {
    minuteLabel: "min",
    dayLabel: "jour",
    monthLabel: "mois",
  },
};

// ─── Email Checker Config ──────────────────────────────────────────────
// Gemini 2.0 Flash free tier: 15 RPM, 1500 RPD.
// Conservative limits to stay well within free tier.
export const EMAIL_RATE_CONFIG: RateLimitConfig = {
  storageKey: "cyberguard_email_requests",
  minuteMax: 5,
  dayMax: 50,
  monthMax: 1500,
  labels: {
    minuteLabel: "min",
    dayLabel: "jour",
    monthLabel: "mois",
  },
};