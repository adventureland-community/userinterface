export function formatTime(timeSeconds: number | null | undefined): string {
  if (!timeSeconds) {
    return "?";
  }

  const prefixes = [
    { unit: "s", n: 1, resolution: 0, minMultiplier: 0 },
    { unit: "min", n: 60, resolution: 0, minMultiplier: 99.5 / 60 },
    { unit: "h", n: 3600, resolution: 1, minMultiplier: 99.5 / 60 },
    { unit: "d", n: 86400, resolution: 1, minMultiplier: 99.5 / 24 },
  ];

  let result: string | undefined;
  for (let i = prefixes.length - 1; i >= 0; i--) {
    const prefix = prefixes[i];
    if (timeSeconds >= prefix.minMultiplier * prefix.n) {
      result = `${(timeSeconds / prefix.n).toFixed(prefix.resolution)}${prefix.unit}`;
      break;
    }
  }
  return result ?? "?";
}

/**
 * Compact remaining-time label for buff icons (fits ~22px tiles).
 * Prefer short units: 45s / 3m / 2h / 1d.
 */
export function formatDurationCompact(
  timeSeconds: number | null | undefined,
): string {
  if (timeSeconds == null || !(timeSeconds > 0)) return "";
  if (timeSeconds < 60) return `${Math.max(1, Math.ceil(timeSeconds))}s`;
  if (timeSeconds < 60 * 60) return `${Math.round(timeSeconds / 60)}m`;
  if (timeSeconds < 60 * 60 * 24) return `${Math.round(timeSeconds / 3600)}h`;
  return `${Math.round(timeSeconds / 86400)}d`;
}

/**
 * Sticky absolute end time for buff/CD remaining displays.
 * Avoids restarting a progress animation every time `ms` is re-broadcast
 * with a similar remaining value (common on observe / party soft-sync).
 *
 * @param lastMs Previous raw `ms` reading. Identical rebroadcasts must not
 *   push the sticky end forward (that makes labels jump 17s→16s→17s).
 */
export function syncEndsAt(
  prevEndsAt: number,
  ms: number | undefined,
  now: number = Date.now(),
  lastMs?: number,
): number {
  if (!(ms != null && ms > 0)) return 0;
  const next = now + ms;
  if (!prevEndsAt) return next;

  const stickyRemain = prevEndsAt - now;

  // Same remaining reading rebroadcast while we still have a live sticky end —
  // keep counting down locally instead of jumping the label back up.
  if (
    lastMs != null &&
    lastMs > 0 &&
    Math.abs(ms - lastMs) <= 750 &&
    prevEndsAt > now + 200 &&
    ms <= stickyRemain + 750
  ) {
    return prevEndsAt;
  }

  if (ms > stickyRemain + 750) return next;
  if (ms < stickyRemain - 250) return next;
  return prevEndsAt;
}

export function getPercent(value: number, precision: number): string {
  return `${Math.max(0, Math.min(100, value * 100)).toFixed(precision)}%`;
}

export function getTimeUntil(dateString: string | undefined): string {
  if (!dateString) return "";
  const target = new Date(dateString);
  const now = new Date();
  return formatTime((target.getTime() - now.getTime()) / 1000);
}

/** Compact number for meter totals and bar labels (1.2k, 3.45M). */
export function formatCompactNumber(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (a >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return String(Math.round(n));
}

/** Compact rate without unit suffix (1.2k, 45.0). */
export function formatCompactRate(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return n.toFixed(1);
}

/** Compact rate with /s suffix for meter status readouts. */
export function formatCompactRatePerSec(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k/s";
  return `${Math.round(n)}/s`;
}

/** AL servers use UTC-5/+1/+7 without DST. */
export function getALServerTime(timeOffset: number | string | undefined): string {
  const offset = parseInt(String(timeOffset ?? 0), 10) || 0;
  const dt = new Date(Date.now() + offset * 3600 * 1000);
  return (
    dt.getUTCHours().toString().padStart(2, "0") +
    ":" +
    dt.getUTCMinutes().toString().padStart(2, "0")
  );
}
