import { getReact, e } from "../../../host/react";
import { MetricChart, type ChartSeries } from "../../chrome/MetricChart";
import { classColors } from "../../../lib/colors";
import type { PartyFocus } from "../../../lib/settingsFocus";
import { PIXEL_TEXT } from "../../../lib/typeScale";
import { getPlayerMeta } from "../../../meters/meterEngine";
import { runMeterQuery } from "../../../meters/meterQuery";
import { getLiveSegment } from "../../../meters/meterSession";
import { segmentWantsLiveTick } from "../../../meters/meterSegmentRef";
import { subscribeMeterTick } from "../../../meters/meterUiTick";
import type {
  MeterInstance,
  MeterResult,
  SegmentRef,
} from "../../../meters/meterTypes";
import {
  hideMeterTooltip,
  showMeterTooltip,
} from "../../../meters/meterTooltip";
import { injectMeterChromeCss } from "../meterChromeCss";
import { paintMetricCanvas } from "../paintMetricCanvas";

function fmtRate(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return n.toFixed(1);
}

function historyToSeries(
  result: MeterResult,
  enabled: Record<string, boolean> | undefined,
  windowPts: number | undefined,
): ChartSeries[] {
  if (result.kind !== "history") return [];
  const meta = getPlayerMeta();
  const series: ChartSeries[] = [];
  for (let i = 0; i < result.seriesKeys.length && i < 12; i++) {
    const id = result.seriesKeys[i];
    if (enabled && enabled[id] === false) continue;
    const values: number[] = [];
    const pts = result.points;
    const start =
      windowPts && windowPts > 0 ? Math.max(0, pts.length - windowPts) : 0;
    for (let p = start; p < pts.length; p++) {
      values.push(pts[p].values[id] || 0);
    }
    series.push({
      label: meta[id]?.name || id,
      color: classColors[meta[id]?.ctype || ""] || "#888",
      values,
      // stash id for legend
      ...({ id } as any),
    });
  }
  return series;
}

export function MeterHistoryChart(props: {
  result: MeterResult;
  width?: number;
  height?: number;
  fill?: boolean;
  stack?: boolean;
  integrate?: boolean;
  normalize?: boolean;
}): any {
  const React = getReact();
  const wrapRef = React.useRef(null as HTMLDivElement | null);
  const [box, setBox] = React.useState({ w: 280, h: 120 });

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      setBox({
        w: Math.max(80, el.clientWidth),
        h: Math.max(60, el.clientHeight),
      });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (props.result.kind !== "history") {
    return e(
      "div",
      { style: { padding: "8px", color: "#888", ...PIXEL_TEXT } },
      "No history",
    );
  }
  const series = historyToSeries(props.result, undefined, undefined);
  const w = props.width || box.w;
  const h = props.height || box.h;
  return e(
    "div",
    { className: "ecu-meter-chart-fill", ref: wrapRef },
    e(
      "div",
      { className: "ecu-meter-graph-canvas-wrap" },
      e(MetricChart, {
        width: w,
        height: h,
        series,
        emptyText: "No samples yet",
        fill: props.fill,
        stack: props.stack,
        integrate: props.integrate,
        normalize: props.normalize,
      }),
    ),
  );
}

export function MeterSeriesView(props: {
  result: MeterResult;
  instance: MeterInstance;
  segmentRef: SegmentRef;
  partyFocus?: PartyFocus;
  onPatch: (partial: Partial<MeterInstance>) => void;
}): any {
  const React = getReact();
  const canvasRef = React.useRef(null as HTMLCanvasElement | null);
  const wrapRef = React.useRef(null as HTMLDivElement | null);
  const legendRef = React.useRef(null as HTMLDivElement | null);
  const metaRef = React.useRef(null as HTMLSpanElement | null);
  const propsRef = React.useRef(props);
  propsRef.current = props;

  const mode =
    props.instance.seriesMode ||
    (props.instance.presentation === "compare" ? "compare" : "realtime");
  const isCompare = mode === "compare";
  const rtMetric = props.instance.rtMetric || "dps";
  const rtWindow = props.instance.rtWindow || 30;
  const rtPaused = !!props.instance.rtPaused;

  React.useEffect(() => {
    injectMeterChromeCss();
  }, []);

  const paintLive = React.useCallback(() => {
    const p = propsRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const hist = runMeterQuery(
      { kind: "history" },
      {
        segmentRef: p.segmentRef,
        partyFocus: p.partyFocus,
        now: Date.now(),
      },
    );
    const win = p.instance.rtWindow || 30;
    // ~1 sample/sec → window seconds ≈ points
    const series = historyToSeries(
      hist,
      p.instance.seriesEnabled,
      isCompare ? undefined : win,
    );
    const width = Math.max(
      200,
      (wrapRef.current && wrapRef.current.clientWidth) || 280,
    );
    const height = Math.max(
      80,
      (wrapRef.current && wrapRef.current.clientHeight) || 120,
    );
    paintMetricCanvas(canvas, {
      width,
      height,
      series,
      emptyText: "No samples yet",
      fill: !isCompare,
      stack: isCompare && !!p.instance.stack,
      integrate: isCompare && !!p.instance.integrate,
      normalize: isCompare && !!p.instance.normalize,
    });

    const leg = legendRef.current;
    if (leg && hist.kind === "history") {
      const meta = getPlayerMeta();
      const enabled = p.instance.seriesEnabled || {};
      const keys = hist.seriesKeys;
      // Update rates in place when labels exist; else rebuild
      const existing = leg.querySelectorAll("[data-id]");
      if (existing.length !== keys.length) {
        leg.innerHTML = "";
        for (let i = 0; i < keys.length; i++) {
          const id = keys[i];
          const on = enabled[id] !== false;
          const last =
            hist.points.length > 0
              ? hist.points[hist.points.length - 1].values[id] || 0
              : 0;
          const lab = document.createElement("label");
          lab.className = "leg-item" + (on ? " on" : "");
          lab.setAttribute("data-id", id);
          lab.style.cssText =
            "display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0;font-size:11px;color:#c5d0e0;cursor:pointer";
          lab.innerHTML = `<input type="checkbox" ${on ? "checked" : ""}/>
            <span style="width:8px;height:8px;background:${classColors[meta[id]?.ctype || ""] || "#888"}"></span>
            <span>${meta[id]?.name || id}</span>
            <b class="leg-rate" style="font-variant-numeric:tabular-nums">${fmtRate(last)}</b>`;
          const input = lab.querySelector("input") as HTMLInputElement;
          input.onchange = () => {
            const next = {
              ...(propsRef.current.instance.seriesEnabled || {}),
            };
            next[id] = input.checked;
            // keep at least one on
            const anyOn = Object.keys(next).some((k) => next[k] !== false);
            if (!anyOn) {
              next[id] = true;
              input.checked = true;
            }
            propsRef.current.onPatch({ seriesEnabled: next });
          };
          leg.appendChild(lab);
        }
      } else {
        for (let i = 0; i < existing.length; i++) {
          const el = existing[i] as HTMLElement;
          const id = el.getAttribute("data-id") || "";
          const last =
            hist.points.length > 0
              ? hist.points[hist.points.length - 1].values[id] || 0
              : 0;
          const rateEl = el.querySelector(".leg-rate");
          if (rateEl) rateEl.textContent = fmtRate(last);
        }
      }
    }

    if (metaRef.current && !isCompare) {
      const n = series.length;
      metaRef.current.textContent = `${n} · ${rtMetric.toUpperCase()} · ${rtWindow}s`;
    }
  }, [isCompare, rtMetric, rtWindow]);

  React.useEffect(() => {
    paintLive();
    if (isCompare) return;
    return subscribeMeterTick(() => {
      if (propsRef.current.instance.rtPaused) return;
      if (
        !segmentWantsLiveTick(
          propsRef.current.segmentRef,
          getLiveSegment(),
        )
      ) {
        return;
      }
      paintLive();
    });
  }, [
    paintLive,
    isCompare,
    props.instance.stack,
    props.instance.integrate,
    props.instance.normalize,
    props.instance.seriesEnabled,
    props.instance.rtMetric,
    props.instance.rtWindow,
    props.segmentRef,
    props.partyFocus,
  ]);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => paintLive());
    ro.observe(el);
    return () => ro.disconnect();
  }, [paintLive]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.onmousemove = (ev: MouseEvent) => {
      const hist = runMeterQuery(
        { kind: "history" },
        {
          segmentRef: propsRef.current.segmentRef,
          partyFocus: propsRef.current.partyFocus,
        },
      );
      if (hist.kind !== "history" || hist.points.length < 2) return;
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const idx = Math.max(
        0,
        Math.min(
          hist.points.length - 1,
          Math.round((x / rect.width) * (hist.points.length - 1)),
        ),
      );
      const pt = hist.points[idx];
      const meta = getPlayerMeta();
      const rows = hist.seriesKeys
        .map((id) => ({
          id,
          name: meta[id]?.name || id,
          color: classColors[meta[id]?.ctype || ""] || "#888",
          value: pt.values[id] || 0,
        }))
        .filter((r) => r.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
      const html =
        `<h4>Sample ${idx + 1}</h4><ul>` +
        rows
          .map(
            (s) =>
              `<li><span style="color:${s.color}">${s.name}</span><b>${fmtRate(s.value)}/s</b></li>`,
          )
          .join("") +
        `</ul>`;
      showMeterTooltip(ev, html);
    };
    canvas.onmouseleave = () => hideMeterTooltip();
    return () => {
      canvas.onmousemove = null;
      canvas.onmouseleave = null;
    };
  }, []);

  const tab = (label: string, active: boolean, onClick: () => void) =>
    e(
      "button",
      {
        type: "button",
        className: "ecu-meter-tab" + (active ? " active" : ""),
        onClick,
      },
      label,
    );

  return e(
    "div",
    { className: "ecu-meter-chart-fill" },
    isCompare
      ? e(
          "div",
          {
            className: "chart-tools",
            style: { flex: "0 0 auto" },
          },
          toggleBtn("Stack", !!props.instance.stack, () =>
            props.onPatch({ stack: !props.instance.stack }),
          ),
          toggleBtn("Integrate", !!props.instance.integrate, () =>
            props.onPatch({ integrate: !props.instance.integrate }),
          ),
          toggleBtn("Normalize", !!props.instance.normalize, () =>
            props.onPatch({ normalize: !props.instance.normalize }),
          ),
        )
      : e(
          "div",
          {
            className: "chart-tools",
            style: { flex: "0 0 auto" },
          },
          tab("DPS", rtMetric === "dps", () =>
            props.onPatch({ rtMetric: "dps" }),
          ),
          tab("HPS", rtMetric === "hps", () =>
            props.onPatch({ rtMetric: "hps" }),
          ),
          tab("Taken", rtMetric === "taken", () =>
            props.onPatch({ rtMetric: "taken" }),
          ),
          tab("15s", rtWindow === 15, () => props.onPatch({ rtWindow: 15 })),
          tab("30s", rtWindow === 30, () => props.onPatch({ rtWindow: 30 })),
          tab("60s", rtWindow === 60, () => props.onPatch({ rtWindow: 60 })),
          tab(rtPaused ? "▶" : "⏸", false, () =>
            props.onPatch({ rtPaused: !rtPaused }),
          ),
          e(
            "span",
            {
              ref: metaRef,
              style: { color: "#8b9bb4", fontSize: 11, marginLeft: 4 },
            },
            `· ${rtMetric.toUpperCase()} · ${rtWindow}s`,
          ),
        ),
    e(
      "div",
      {
        ref: wrapRef,
        className: "ecu-meter-graph-canvas-wrap",
      },
      e("canvas", {
        ref: canvasRef,
        style: {
          display: "block",
          width: "100%",
          height: "100%",
          border: "1px solid #333",
          background: "#111",
        },
      }),
    ),
    e("div", {
      ref: legendRef,
      "data-leg": "1",
      style: { flex: "0 0 auto", maxHeight: "30%", overflow: "auto" },
    }),
  );
}

function toggleBtn(label: string, on: boolean, onClick: () => void): any {
  return e(
    "button",
    {
      type: "button",
      className: "ecu-meter-tab" + (on ? " active" : ""),
      onClick,
    },
    label,
  );
}

export function MeterPieView(props: { result: MeterResult }): any {
  const React = getReact();
  const wrapRef = React.useRef(null as HTMLDivElement | null);
  const canvasRef = React.useRef(null as HTMLCanvasElement | null);
  const [box, setBox] = React.useState({ w: 200, h: 160 });

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      setBox({
        w: Math.max(80, el.clientWidth),
        h: Math.max(80, el.clientHeight),
      });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || props.result.kind !== "pie") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Leave room for legend (~42% width); chart is square in remaining space.
    const legendShare = 0.42;
    const availW = Math.max(60, Math.floor(box.w * (1 - legendShare) - 10));
    const size = Math.max(64, Math.min(availW, box.h - 8));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const slices = props.result.slices;
    let sum = 0;
    for (let i = 0; i < slices.length; i++) sum += slices[i].value;
    if (!(sum > 0)) {
      ctx.fillStyle = "#888";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Empty", size / 2, size / 2);
      return;
    }
    const radius = size * 0.38;
    let angle = -Math.PI / 2;
    for (let i = 0; i < slices.length; i++) {
      const slice = slices[i];
      const frac = slice.value / sum;
      const next = angle + frac * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(size / 2, size / 2);
      ctx.arc(size / 2, size / 2, radius, angle, next);
      ctx.closePath();
      ctx.fillStyle = slice.color || "#666";
      ctx.fill();
      angle = next;
    }
  }, [props.result, box]);

  if (props.result.kind !== "pie") {
    return e("div", { style: { padding: "8px", color: "#888" } }, "No pie");
  }
  return e(
    "div",
    { className: "ecu-meter-chart-fill", ref: wrapRef },
    e(
      "div",
      { className: "ecu-meter-pie" },
      e(
        "div",
        { className: "ecu-meter-pie-canvas-wrap" },
        e("canvas", { ref: canvasRef }),
      ),
      e(
        "div",
        { className: "ecu-meter-pie-legend", style: { ...PIXEL_TEXT } },
        ...props.result.slices.map((s) =>
          e(
            "div",
            { key: s.id, style: { color: s.color || "#ccc" } },
            `${s.name} ${Math.round(s.value)}`,
          ),
        ),
      ),
    ),
  );
}
