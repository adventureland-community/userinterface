/**
 * Details-style Time Line — condition / CD Gantt from sampled entity.s fixtures.
 */
window.MockTimeline = (() => {
  const D = () => window.MockData;

  function renderTimeline(body, state, ctx) {
    if (!state.tlFilter) state.tlFilter = "all";
    const Dref = D();
    const dur = Dref.SEG_SEC || 1;
    const lanes = Dref.timelineLanes(state.tlFilter);

    body.innerHTML = `
      <div class="timeline-panel">
        <div class="chart-tools">
          <button type="button" data-f="all">All</button>
          <button type="button" data-f="debuffs">Debuffs</button>
          <button type="button" data-f="buffs">Buffs</button>
          <button type="button" data-f="cds">CDs</button>
          <span class="rt-meta">${Dref.activeSegment().label} · ${Math.round(dur)}s</span>
        </div>
        <div class="tl-ruler" data-ruler></div>
        <div class="tl-body" data-lanes></div>
      </div>`;

    for (const btn of body.querySelectorAll("[data-f]")) {
      btn.classList.toggle("active", btn.getAttribute("data-f") === state.tlFilter);
      btn.onclick = () => {
        state.tlFilter = btn.getAttribute("data-f");
        ctx.redraw();
      };
    }

    const ruler = body.querySelector("[data-ruler]");
    const ticks = 6;
    let marks = "";
    for (let i = 0; i <= ticks; i++) {
      const t = Math.round((dur * i) / ticks);
      const left = (i / ticks) * 100;
      marks += `<span style="left:${left}%">${fmtClock(t)}</span>`;
    }
    ruler.innerHTML = marks;

    const host = body.querySelector("[data-lanes]");
    for (const lane of lanes) {
      const row = document.createElement("div");
      row.className = "tl-lane";
      const bars = lane.intervals
        .map((iv) => {
          const left = (iv.t0 / dur) * 100;
          const width = Math.max(0.8, ((iv.t1 - iv.t0) / dur) * 100);
          return `<i class="tl-bar ${iv.kind}" title="${iv.label} ${fmtClock(iv.t0)}–${fmtClock(iv.t1)}"
            style="left:${left}%;width:${width}%;background:${iv.color}"></i>`;
        })
        .join("");
      row.innerHTML = `
        <div class="tl-name" style="color:${lane.color}">${lane.name}</div>
        <div class="tl-track">${bars}</div>`;
      host.appendChild(row);
    }

    // Uptime table for selected / you
    const focus = Dref.PLAYERS.find((p) => p.you) || Dref.PLAYERS[0];
    const up = Dref.conditionUptime(focus.id);
    const table = document.createElement("div");
    table.className = "tl-uptime";
    table.innerHTML = `<div class="tl-uptime-h">Buffs / debuffs — ${focus.name}</div>` +
      up
        .slice(0, 8)
        .map(
          (r) =>
            `<div class="tl-up-row"><span class="swatch" style="background:${r.color}"></span>${r.label}
              <b>${(r.uptime * 100).toFixed(0)}%</b> <span class="muted">${r.apps}× · ${r.kind}</span></div>`,
        )
        .join("");
    body.querySelector(".timeline-panel").appendChild(table);
  }

  function fmtClock(sec) {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  }

  function titleFor() {
    return `Time Line — ${D().activeSegment().short}`;
  }

  return { renderTimeline, titleFor, fmtClock };
})();
