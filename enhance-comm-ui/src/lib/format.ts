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
