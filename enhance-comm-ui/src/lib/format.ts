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
 * with a similar remaining value (common on observe sockets).
 */
export function syncEndsAt(
  prevEndsAt: number,
  ms: number | undefined,
  now: number = Date.now(),
): number {
  if (!(ms != null && ms > 0)) return 0;
  const next = now + ms;
  if (!prevEndsAt || next > prevEndsAt + 750) return next;
  if (next < prevEndsAt - 250) return next;
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
