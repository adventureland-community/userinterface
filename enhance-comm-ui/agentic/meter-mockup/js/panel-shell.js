/** Panel shell — create / drag / chrome buttons. Rendering via MockViews.REGISTRY. */
window.MockShell = (() => {
  let zCounter = 1;
  let openMenu = null;

  function closeSegMenu() {
    if (openMenu) {
      openMenu.remove();
      openMenu = null;
    }
  }

  function createPanel(stage, panels, preset, x, y, api, overrides = {}) {
    const D = window.MockData;
    const V = window.MockViews;

    const p = {
      id: "pnl_" + Math.random().toString(36).slice(2, 8),
      kind: preset.kind,
      metric: preset.metric || "damage",
      actorId: preset.actorId || "p1",
      seriesMode: preset.seriesMode,
      query: preset.query || overrides.query,
      presentation: preset.presentation || overrides.presentation,
      layout: preset.layout || overrides.layout,
      chartQuery: preset.chartQuery || overrides.chartQuery,
      chartPresentation: preset.chartPresentation || overrides.chartPresentation,
      /** Skada window.selectedset — per panel, not global */
      selectedset: overrides.selectedset || api.defaultSegment?.() || D.getDefaultSelectedset(),
      w: preset.w,
      h: preset.h,
      x,
      y,
      ...overrides,
    };
    if (!p.selectedset) p.selectedset = "current";

    const el = document.createElement("div");
    el.className = "panel";
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.width = p.w + "px";
    el.style.height = p.h + "px";
    el.style.resize = "both";
    el.innerHTML = `
      <div class="panel-title">
        <span class="grip">⠿</span>
        <span class="ttl"></span>
        <span class="btns">
          <button type="button" data-act="seg" title="Segment (Skada)">Seg</button>
          <button type="button" data-act="prev" title="Prev mode">‹</button>
          <button type="button" data-act="next" title="Next mode">›</button>
          <button type="button" data-act="dup" title="Duplicate">⧉</button>
          <button type="button" data-act="cfg" title="Open inspector">⚙</button>
          <button type="button" data-act="close" title="Close">✕</button>
        </span>
      </div>
      <div class="panel-body"></div>
      <div class="panel-status"></div>`;
    p.el = el;
    stage.appendChild(el);

    const dispose = () => {
      closeSegMenu();
      if (window.MockSeries?.clearTick) window.MockSeries.clearTick(p);
      if (window.MockBars?.clearTick) window.MockBars.clearTick(p);
      else if (p._tick) {
        clearInterval(p._tick);
        p._tick = null;
      }
      if (typeof p.onDispose === "function") p.onDispose();
    };
    p.dispose = dispose;

    const panelSegLabel = () => {
      const scope = D.PARTY_SCOPES.find((x) => x.id === D.getPartyScope())?.label || "";
      const chip = D.setLabel(p.selectedset);
      const resolved = D.resolveSegment(p.selectedset);
      const t = V.fmtTime(resolved.durationSec);
      return `${chip} · ${t} · ${scope}`;
    };

    const render = () => {
      el.classList.toggle("fade-idle", api.opts.fade);
      D.withSegment(p.selectedset, () => {
        el.querySelector(".ttl").innerHTML = V.titleFor(p, panelSegLabel());
        el.querySelector(".panel-status").innerHTML =
          `<span>${p.kind}${p.seriesMode ? ":" + p.seriesMode : ""}</span><span>${panelSegLabel()}</span>`;
        const body = el.querySelector(".panel-body");
        const ctx = {
          opts: api.opts,
          showTooltip: api.showTooltip,
          hideTooltip: api.hideTooltip,
          redraw: render,
          openPreset: api.openPreset,
          /** Encounter footer / in-panel: only this window (Skada) */
          selectSegment: (id) => {
            p.selectedset = id;
            render();
          },
          segLabel: panelSegLabel,
          panel: p,
        };
        const entry = V.REGISTRY[p.kind];
        if (entry?.render) entry.render(body, p, ctx);
      });
    };
    p.render = render;

    function openSegmentMenu(anchorBtn) {
      closeSegMenu();
      const menu = document.createElement("div");
      menu.className = "seg-menu";
      const head = document.createElement("div");
      head.className = "seg-menu-h";
      head.textContent = "Segment";
      menu.appendChild(head);
      for (const s of D.listSegments()) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "seg-menu-item" + (p.selectedset === s.id ? " active" : "");
        const mark = s.id === "current" ? "●" : s.id === "total" ? "Σ" : s.outcome === "wipe" ? "✗" : "✓";
        btn.innerHTML = `<span class="mark">${mark}</span><span>${s.titleChip || s.short}</span><span class="meta">${V.fmtTime(s.durationSec)}</span>`;
        btn.onclick = (e) => {
          e.stopPropagation();
          p.selectedset = s.id;
          closeSegMenu();
          render();
        };
        menu.appendChild(btn);
      }
      const rect = anchorBtn.getBoundingClientRect();
      menu.style.left = Math.min(window.innerWidth - 220, rect.left) + "px";
      menu.style.top = rect.bottom + 4 + "px";
      document.body.appendChild(menu);
      openMenu = menu;
      const dismiss = (ev) => {
        if (menu.contains(ev.target) || anchorBtn.contains(ev.target)) return;
        closeSegMenu();
        document.removeEventListener("mousedown", dismiss);
      };
      setTimeout(() => document.addEventListener("mousedown", dismiss), 0);
    }

    el.addEventListener("mousedown", () => {
      el.style.zIndex = String(++zCounter);
      el.classList.add("active");
      for (const o of panels) if (o !== p) o.el.classList.remove("active");
    });

    el.querySelector(".panel-title").addEventListener("mousedown", (e) => {
      if (e.target.closest("button")) return;
      e.preventDefault();
      const ox = e.clientX - p.x;
      const oy = e.clientY - p.y;
      const move = (ev) => {
        p.x = Math.max(0, ev.clientX - ox);
        p.y = Math.max(0, ev.clientY - oy);
        el.style.left = p.x + "px";
        el.style.top = p.y + "px";
      };
      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    });

    // Right-click title → Segment menu (Skada)
    el.querySelector(".panel-title").addEventListener("contextmenu", (e) => {
      if (e.target.closest("button")) return;
      e.preventDefault();
      openSegmentMenu(el.querySelector('[data-act="seg"]'));
    });

    el.querySelector('[data-act="seg"]').onclick = (e) => {
      e.stopPropagation();
      openSegmentMenu(e.currentTarget);
    };
    el.querySelector('[data-act="close"]').onclick = () => {
      dispose();
      el.remove();
      const i = panels.indexOf(p);
      if (i >= 0) panels.splice(i, 1);
    };
    el.querySelector('[data-act="dup"]').onclick = () =>
      createPanel(stage, panels, preset, p.x + 24, p.y + 24, api, {
        ...overrides,
        selectedset: p.selectedset,
      });
    el.querySelector('[data-act="next"]').onclick = () => {
      if (p.kind === "bars") {
        p.metric = D.cycleMetric(p.metric, 1);
        p.nav = [{ view: "players" }];
        render();
      }
    };
    el.querySelector('[data-act="prev"]').onclick = () => {
      if (p.kind === "bars") {
        p.metric = D.cycleMetric(p.metric, -1);
        p.nav = [{ view: "players" }];
        render();
      }
    };
    el.querySelector('[data-act="cfg"]').onclick = () =>
      api.openPreset("inspector", p.x + 40, p.y + 40, { actorId: p.actorId || "p1" });

    panels.push(p);
    render();
    return p;
  }

  return { createPanel };
})();
