import { esc } from "./types";

/** Host `/comm` ping samples from functions.js (`push_ping` / `ping_ack`). */
export const PING_SPARK_BARS = 12;

export type PingSparkBar = {
  /** Bar height 0–100 (min 10 when sample present). */
  pct: number;
  color: string;
  ms: number;
};

/** Last N samples as spark-bar heights — shared by desktop HTML + phone React. */
export function pingSparkBars(
  samples: number[],
  maxBars: number = PING_SPARK_BARS,
): PingSparkBar[] {
  if (!samples.length) return [];
  const start = Math.max(0, samples.length - Math.max(1, maxBars));
  let max = 1;
  for (let i = start; i < samples.length; i++) {
    max = Math.max(max, samples[i]);
  }
  const out: PingSparkBar[] = [];
  for (let i = start; i < samples.length; i++) {
    const ms = samples[i];
    out.push({
      pct: Math.max(10, Math.round((ms / max) * 100)),
      color: pingColor(ms),
      ms,
    });
  }
  return out;
}

/** Read stock `window.pings` (filled by silent `ping(true)` + `ping_ack`). */
function readCommPings(): number[] {
  const raw = window.pings;
  if (!Array.isArray(raw) || !raw.length) return [];
  const out: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    const n = Number(raw[i]);
    if (Number.isFinite(n) && n >= 0) out.push(n);
  }
  return out;
}

export function averagePingMs(samples: number[]): number | null {
  if (!samples.length) return null;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i];
  return sum / samples.length;
}

/** green <100 · amber <200 · red ≥200 — same as desktop server dropdown. */
export function pingColor(ms: number): string {
  if (ms < 100) return "#85c76b";
  if (ms < 200) return "#d4a84b";
  return "#e05555";
}

function pingBarsHtml(samples: number[]): string {
  const bars = pingSparkBars(samples);
  if (!bars.length) return "";
  let html = "<span class='ecu-server-dd-bars' aria-hidden='true'>";
  for (let i = 0; i < bars.length; i++) {
    html +=
      "<span class='ecu-server-dd-bar' style='height:" +
      bars[i].pct +
      "%;background:" +
      bars[i].color +
      "'></span>";
  }
  html += "</span>";
  return html;
}

export function pingBlockHtml(samples: number[]): string {
  const avg = averagePingMs(samples);
  const label = avg == null ? "—" : Math.round(avg) + "ms";
  const color = avg == null ? "#8ab4c9" : pingColor(avg);
  const title =
    avg == null
      ? "Ping unavailable (no samples yet)"
      : "Avg ping " +
        Math.round(avg) +
        "ms over last " +
        samples.length +
        " sample" +
        (samples.length === 1 ? "" : "s") +
        " · green <100 · amber <200 · red ≥200";
  return (
    "<span class='ecu-server-dd-ping' title='" +
    esc(title) +
    "'>" +
    pingBarsHtml(samples) +
    "<span class='ecu-server-dd-ping-ms' style='color:" +
    color +
    "'>" +
    esc(label) +
    "</span></span>"
  );
}

export function readPingSamples(): number[] {
  return readCommPings();
}

let lastPingHudKey = "";

export function syncServerPingHud(): void {
  const roots = document.querySelectorAll(".ecu-server-dd");
  if (!roots.length) return;
  const samples = readCommPings();
  const avg = averagePingMs(samples);
  const key =
    String(samples.length) +
    ":" +
    (samples.length ? samples[samples.length - 1] : "") +
    ":" +
    (avg == null ? "" : Math.round(avg));
  const hasPing = !!document.querySelector(".ecu-server-dd-ping");
  if (key === lastPingHudKey && hasPing) return;
  lastPingHudKey = key;

  const html = pingBlockHtml(samples);
  for (let i = 0; i < roots.length; i++) {
    const root = roots[i];
    const existing = root.querySelector(".ecu-server-dd-ping");
    if (existing) {
      const wrap = document.createElement("div");
      wrap.innerHTML = html;
      const next = wrap.firstElementChild;
      if (next) existing.replaceWith(next);
    } else {
      const trigger = root.querySelector(".ecu-server-dd-trigger");
      const chevron = root.querySelector(".ecu-server-dd-chevron");
      if (!trigger) continue;
      const wrap = document.createElement("div");
      wrap.innerHTML = html;
      const next = wrap.firstElementChild;
      if (!next) continue;
      if (chevron) trigger.insertBefore(next, chevron);
      else trigger.append(next);
    }
  }
}
