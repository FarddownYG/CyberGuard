/**
 * VirusTotal Rate Limiter — localStorage-based persistence
 *
 * Free tier limits:
 *   - 4 lookups / minute
 *   - 500 lookups / day
 *   - 15,500 lookups / month
 *
 * Stores timestamps of each API call in localStorage.
 * Survives page reloads. Resets only when the time window expires.
 */

const STORAGE_KEY = "cyberguard_vt_requests";

interface StoredRequests {
  timestamps: number[]; // Unix ms
}

function getStored(): StoredRequests {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { timestamps: [] };
    return JSON.parse(raw);
  } catch {
    return { timestamps: [] };
  }
}

function setStored(data: StoredRequests) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function now(): number {
  return Date.now();
}

/** Remove timestamps older than 31 days to prevent localStorage bloat */
function cleanup(timestamps: number[]): number[] {
  const cutoff = now() - 31 * 24 * 60 * 60 * 1000;
  return timestamps.filter((t) => t > cutoff);
}

/** Count requests within the last `windowMs` milliseconds */
function countInWindow(timestamps: number[], windowMs: number): number {
  const cutoff = now() - windowMs;
  return timestamps.filter((t) => t > cutoff).length;
}

/** Count requests in the current calendar day (UTC) */
function countToday(timestamps: number[]): number {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const start = todayStart.getTime();
  return timestamps.filter((t) => t >= start).length;
}

/** Count requests in the current calendar month (UTC) */
function countThisMonth(timestamps: number[]): number {
  const d = new Date();
  const monthStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).getTime();
  return timestamps.filter((t) => t >= monthStart).length;
}

export interface QuotaInfo {
  minuteUsed: number;
  minuteMax: number;
  dayUsed: number;
  dayMax: number;
  monthUsed: number;
  monthMax: number;
  canRequest: boolean;
  blockedReason: string | null;
  /** Seconds until next minute slot opens (0 if available) */
  nextSlotIn: number;
}

export function getQuota(): QuotaInfo {
  const stored = getStored();
  const ts = cleanup(stored.timestamps);

  const minuteUsed = countInWindow(ts, 60_000);
  const dayUsed = countToday(ts);
  const monthUsed = countThisMonth(ts);

  const minuteMax = 4;
  const dayMax = 500;
  const monthMax = 15_500;

  let blockedReason: string | null = null;
  if (minuteUsed >= minuteMax) {
    blockedReason = "Limite par minute atteinte (4/min). Attendez quelques secondes.";
  } else if (dayUsed >= dayMax) {
    blockedReason = "Limite journaliere atteinte (500/jour). Reessayez demain.";
  } else if (monthUsed >= monthMax) {
    blockedReason = "Limite mensuelle atteinte (15 500/mois). Reessayez le mois prochain.";
  }

  // Calculate next available slot
  let nextSlotIn = 0;
  if (minuteUsed >= minuteMax && ts.length > 0) {
    const oldest = ts.filter((t) => t > now() - 60_000).sort((a, b) => a - b)[0];
    if (oldest) {
      nextSlotIn = Math.ceil((oldest + 60_000 - now()) / 1000);
    }
  }

  return {
    minuteUsed,
    minuteMax,
    dayUsed,
    dayMax,
    monthUsed,
    monthMax,
    canRequest: blockedReason === null,
    blockedReason,
    nextSlotIn,
  };
}

/** Record a new API request. Returns false if rate limited. */
export function recordRequest(): boolean {
  const quota = getQuota();
  if (!quota.canRequest) return false;

  const stored = getStored();
  stored.timestamps = cleanup(stored.timestamps);
  stored.timestamps.push(now());
  setStored(stored);
  return true;
}

/** Get the API key from env */
export function getApiKey(): string | null {
  const key = import.meta.env.VITE_VIRUSTOTAL_API_KEY;
  return key && key !== "YOUR_API_KEY_HERE" ? key : null;
}
