import { getReact, e } from "../../host/react";

export type ChartSeries = {
  label: string;
  color: string;
  values: number[];
};

export type MetricChartProps = {
  width?: number;
  height?: number;
  series: ChartSeries[];
  emptyText?: string;
};

/** Lightweight canvas line chart for party combat history. */
export function MetricChart(props: MetricChartProps): any {
  const React = getReact();
  const ref = React.useRef(null);
  const width = props.width || 280;
  const height = props.height || 100;
  const series = props.series || [];
  const emptyText = props.emptyText || "No samples yet";

  React.useEffect(() => {
    const canvas = ref.current as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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
      ctx.font = "15px sans-serif";
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

    for (let s = 0; s < series.length; s++) {
      const vals = series[s].values;
      if (vals.length < 2) continue;
      ctx.strokeStyle = series[s].color;
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
    ctx.font = "14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(Math.round(maxVal).toLocaleString(), padL, 12);
  }, [series, width, height, emptyText]);

  return e("canvas", {
    ref,
    style: {
      display: "block",
      width,
      height,
      border: "1px solid #333",
      background: "#111",
    },
  });
}
