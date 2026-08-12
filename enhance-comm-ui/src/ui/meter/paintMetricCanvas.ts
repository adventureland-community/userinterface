/**
 * Paint metric series onto a canvas without React — for realtime tick path.
 */

import type { ChartSeries } from "../chrome/MetricChart";

export type PaintChartOpts = {
  width: number;
  height: number;
  series: ChartSeries[];
  emptyText?: string;
  fill?: boolean;
  stack?: boolean;
  normalize?: boolean;
  integrate?: boolean;
};

function transformValues(
  series: ChartSeries[],
  opts: { stack?: boolean; normalize?: boolean; integrate?: boolean },
): ChartSeries[] {
  let out = series.map((s) => ({
    ...s,
    values: s.values.slice(),
  }));
  if (opts.integrate) {
    for (let s = 0; s < out.length; s++) {
      let sum = 0;
      for (let i = 0; i < out[s].values.length; i++) {
        sum += out[s].values[i] || 0;
        out[s].values[i] = sum;
      }
    }
  }
  if (opts.stack || opts.normalize) {
    const len = out.reduce((m, s) => Math.max(m, s.values.length), 0);
    const stacked: ChartSeries[] = out.map((s) => ({
      ...s,
      values: new Array(len).fill(0),
    }));
    for (let i = 0; i < len; i++) {
      let total = 0;
      const raw: number[] = [];
      for (let s = 0; s < out.length; s++) {
        const v = out[s].values[i] || 0;
        raw.push(v);
        total += v;
      }
      let run = 0;
      for (let s = 0; s < out.length; s++) {
        let v = raw[s];
        if (opts.normalize && total > 0) v = (v / total) * 100;
        if (opts.stack) {
          run += v;
          stacked[s].values[i] = run;
        } else {
          stacked[s].values[i] = v;
        }
      }
    }
    out = stacked;
  }
  return out;
}

export function paintMetricCanvas(
  canvas: HTMLCanvasElement,
  opts: PaintChartOpts,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const width = opts.width;
  const height = opts.height;
  const emptyText = opts.emptyText || "No samples yet";
  const series = transformValues(opts.series || [], {
    stack: opts.stack,
    normalize: opts.normalize,
    integrate: opts.integrate,
  });

  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, width, height);

  let maxPoints = 0;
  let maxVal = 0;
  for (let s = 0; s < series.length; s++) {
    const vals = series[s].values;
    maxPoints = Math.max(maxPoints, vals.length);
    for (let i = 0; i < vals.length; i++) {
      maxVal = Math.max(maxVal, vals[i] || 0);
    }
  }

  if (maxPoints < 2 || maxVal <= 0) {
    ctx.fillStyle = "#888";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(emptyText, width / 2, height / 2);
    return;
  }

  const padL = 6;
  const padR = 6;
  const padT = 8;
  const padB = 16;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  for (let g = 0; g < 3; g++) {
    const y = padT + (plotH * g) / 2;
    ctx.moveTo(padL, y);
    ctx.lineTo(width - padR, y);
  }
  ctx.stroke();

  for (let s = series.length - 1; s >= 0; s--) {
    const vals = series[s].values;
    if (vals.length < 2) continue;
    const color = series[s].color || "#888";
    ctx.beginPath();
    for (let i = 0; i < vals.length; i++) {
      const x = padL + (plotW * i) / Math.max(vals.length - 1, 1);
      const y = padT + plotH - (plotH * (vals[i] || 0)) / maxVal;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    if (opts.fill || opts.stack) {
      const lastX =
        padL + (plotW * (vals.length - 1)) / Math.max(vals.length - 1, 1);
      ctx.lineTo(lastX, padT + plotH);
      ctx.lineTo(padL, padT + plotH);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < vals.length; i++) {
      const x = padL + (plotW * i) / Math.max(vals.length - 1, 1);
      const y = padT + plotH - (plotH * (vals[i] || 0)) / maxVal;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.fillStyle = "#ccc";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "left";
  const topLabel = opts.normalize
    ? "100%"
    : Math.round(maxVal).toLocaleString();
  ctx.fillText(topLabel, padL, 12);
}
