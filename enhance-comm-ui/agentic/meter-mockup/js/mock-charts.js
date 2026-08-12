/** Canvas helpers — pie / area / multi-line / HP timeline. */
window.MockCharts = (() => {
  function sizeCanvas(canvas) {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(40, Math.floor(rect.width));
    const h = Math.max(40, Math.floor(rect.height));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  function clear(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0f141c";
    ctx.fillRect(0, 0, w, h);
  }

  function grid(ctx, w, h, rows = 4, cols = 6) {
    ctx.strokeStyle = "rgba(80,100,120,0.25)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= rows; i++) {
      const y = (h * i) / rows;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let i = 0; i <= cols; i++) {
      const x = (w * i) / cols;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  }

  function pie(canvas, slices) {
    const { ctx, w, h } = sizeCanvas(canvas);
    clear(ctx, w, h);
    const total = slices.reduce((s, x) => s + x.value, 0) || 1;
    const r = Math.min(w, h) * 0.38;
    const cx = w / 2;
    const cy = h / 2;
    let a0 = -Math.PI / 2;
    for (const sl of slices) {
      const a1 = a0 + (sl.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a0, a1);
      ctx.closePath();
      ctx.fillStyle = sl.color;
      ctx.fill();
      a0 = a1;
    }
  }

  function multiLine(canvas, lines, opts = {}) {
    const {
      stack = false,
      integrate = false,
      normalize = false,
      fill = false,
      axis = false,
      dots = false,
      fmtY = (v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v))),
    } = opts;
    const { ctx, w, h } = sizeCanvas(canvas);
    clear(ctx, w, h);
    if (!lines.length) {
      grid(ctx, w, h);
      return { max: 1, pad: 6, left: 6 };
    }

    let data = lines.map((l) => ({ ...l, pts: l.pts.slice() }));
    if (integrate) {
      data = data.map((l) => {
        let sum = 0;
        return { ...l, pts: l.pts.map((v) => (sum += v)) };
      });
    }
    if (stack) {
      const n = data[0].pts.length;
      for (let i = 0; i < n; i++) {
        let acc = 0;
        for (const l of data) {
          acc += l.pts[i];
          l.pts[i] = acc;
        }
      }
    }
    if (normalize) {
      const n = data[0].pts.length;
      for (let i = 0; i < n; i++) {
        let sum = 0;
        for (const l of data) sum += l.pts[i];
        if (!sum) continue;
        for (const l of data) l.pts[i] = (l.pts[i] / sum) * 100;
      }
    }

    let max = 1;
    for (const l of data) for (const v of l.pts) if (v > max) max = v;

    const left = axis ? 34 : 6;
    const pad = 6;
    const plotW = w - left - pad;
    const plotH = h - pad * 2;

    grid(ctx, w, h);
    if (axis) {
      ctx.fillStyle = "rgba(15,20,28,0.85)";
      ctx.fillRect(0, 0, left - 2, h);
      ctx.fillStyle = "#8b9bb0";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      for (let i = 0; i <= 4; i++) {
        const v = (max * (4 - i)) / 4;
        const y = pad + (plotH * i) / 4;
        ctx.fillText(fmtY(v), left - 6, y);
      }
    }

    const order = stack ? data.slice().reverse() : data;
    for (const l of order) {
      ctx.beginPath();
      for (let i = 0; i < l.pts.length; i++) {
        const x = left + (plotW * i) / (l.pts.length - 1 || 1);
        const y = h - pad - (plotH * l.pts[i]) / max;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      if (stack || fill) {
        ctx.lineTo(left + plotW, h - pad);
        ctx.lineTo(left, h - pad);
        ctx.closePath();
        ctx.fillStyle = l.color + (stack ? "88" : "33");
        ctx.fill();
        if (!stack) {
          ctx.beginPath();
          for (let i = 0; i < l.pts.length; i++) {
            const x = left + (plotW * i) / (l.pts.length - 1 || 1);
            const y = h - pad - (plotH * l.pts[i]) / max;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = l.color;
          ctx.lineWidth = 1.75;
          ctx.stroke();
        }
      } else {
        ctx.strokeStyle = l.color;
        ctx.lineWidth = 1.75;
        ctx.stroke();
      }
      if (dots && l.pts.length) {
        const i = l.pts.length - 1;
        const x = left + (plotW * i) / (l.pts.length - 1 || 1);
        const y = h - pad - (plotH * l.pts[i]) / max;
        ctx.fillStyle = l.color;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    return { max, pad, left, plotW, plotH, h, w, data };
  }

  /** Map clientX inside canvas → sample index / values for hover. */
  function hitTest(layout, lines, clientX, canvas) {
    if (!layout || !lines.length) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const n = lines[0].pts.length;
    if (n < 2) return null;
    const t = Math.max(0, Math.min(1, (x - layout.left) / layout.plotW));
    const idx = Math.round(t * (n - 1));
    return {
      idx,
      x: layout.left + (layout.plotW * idx) / (n - 1),
      samples: lines.map((l) => ({ name: l.name, color: l.color, value: l.pts[idx] })),
    };
  }

  function drawCrosshair(canvas, layout, hit) {
    if (!layout || !hit) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = "rgba(200,220,240,0.45)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(hit.x, layout.pad);
    ctx.lineTo(hit.x, layout.h - layout.pad);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function hpLine(canvas, series, markers) {
    const { ctx, w, h } = sizeCanvas(canvas);
    clear(ctx, w, h);
    grid(ctx, w, h, 4, series.length - 1 || 1);
    const pad = 6;
    ctx.beginPath();
    for (let i = 0; i < series.length; i++) {
      const x = pad + ((w - pad * 2) * i) / (series.length - 1 || 1);
      const y = h - pad - ((h - pad * 2) * series[i]) / 100;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#6fcf97";
    ctx.lineWidth = 2;
    ctx.stroke();
    if (markers) {
      for (const m of markers) {
        const i = Math.min(series.length - 1, Math.max(0, m.i));
        const x = pad + ((w - pad * 2) * i) / (series.length - 1 || 1);
        const y = h - pad - ((h - pad * 2) * series[i]) / 100;
        ctx.fillStyle = "#e25555";
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  return { pie, multiLine, hpLine, hitTest, drawCrosshair };
})();
