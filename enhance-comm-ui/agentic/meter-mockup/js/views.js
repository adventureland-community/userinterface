/**
 * Meter view plugins — each (body, state, ctx) => void.
 * ctx: { opts, segLabel, showTooltip, hideTooltip, redraw, openInspector }
 */
window.MockViews = (() => {
  const D = () => window.MockData;
  const B = () => window.MockBars;
  const C = () => window.MockCharts;

  function fmtTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m${String(s).padStart(2, "0")}s`;
  }

  function barTooltip(e, row, metric, ctx) {
    const p = row.player;
    if (!p) return;
    const Dref = D();
    const abs = Dref.isAbsoluteMetric(metric);
    const total = Dref.playerMetric(p, metric);
    const rate = Dref.rateFor(p, metric);
    const topAbs = Dref.rankedAbilities(p).slice(0, 4);
    const topT = [...p.targetsAll].sort((a, b) => b.amount - a.amount).slice(0, 3);
    const valLine = abs
      ? `<div class="line"><span>Value</span><b>${Dref.formatMetricValue(metric, total)}</b></div>`
      : `<div class="line"><span>Total</span><b>${Dref.fmt(total)}</b></div>
         <div class="line"><span>Rate</span><b>${Dref.fmtRate(rate)}/s</b></div>`;
    let extra = "";
    if (metric === "avoidance") {
      const a = p.avoidance;
      extra = `<div class="sec">Breakdown</div>
        <ul>
          <li><span>Evade</span><b>${a.evade}</b></li>
          <li><span>Miss</span><b>${a.miss}</b></li>
          <li><span>Avoid</span><b>${a.avoid}</b></li>
          <li><span>Hits</span><b>${a.hits}</b></li>
          <li><span>MP absorb</span><b>${Dref.fmt(a.mpAbsorb)}</b></li>
        </ul>`;
    }
    ctx.showTooltip(
      e,
      `<h4>${p.name}</h4>${valLine}
       <div class="line"><span>Activity</span><b>${Math.round(p.activity * 100)}%</b></div>
       ${extra}
       <div class="sec">Top abilities</div>
       <ul>${topAbs.map((a) => `<li><span>${window.MockIcons.iconHtml(a, { icons: true, iconSize: 14 })}${a.name}</span><b>${Dref.fmt(a.value)}</b></li>`).join("")}</ul>
       <div class="sec">Top targets</div>
       <ul>${topT.map((t) => `<li><span>${t.name}</span><b>${Dref.fmt(t.amount)}</b></li>`).join("")}</ul>
       <div class="line" style="margin-top:6px"><span>Taken</span><b>${Dref.fmt(p.taken)}</b></div>`,
    );
  }

  const OC_COLORS = {
    hit: "#90caf9",
    crit: "#ef5350",
    tick: "#ffee58",
    miss: "#b0bec5",
    evade: "#80cbc4",
    avoid: "#ce93d8",
    splash: "#ffb74d",
  };

  function outcomeEntries(outcomes) {
    const entries = Object.entries(outcomes).filter(([, o]) => o.count > 0);
    const sumCount = entries.reduce((s, [, o]) => s + o.count, 0) || 1;
    return { entries, sumCount };
  }

  function outcomeTableHtml(outcomes, { swatches } = {}) {
    const Dref = D();
    const { entries, sumCount } = outcomeEntries(outcomes);
    const rows = entries
      .map(([k, o]) => {
        const label = swatches
          ? `<span class="key" style="background:${OC_COLORS[k] || "#888"}"></span>${k}`
          : k;
        return `<tr><td>${label}</td><td>${Dref.fmt(o.min)}</td><td>${Dref.fmt(o.avg)}</td><td>${Dref.fmt(o.max)}</td><td>${o.count}</td><td>${((o.count / sumCount) * 100).toFixed(0)}%</td></tr>`;
      })
      .join("");
    return `<table class="outcome-table"><thead><tr><th>Type</th><th>Min</th><th>Avg</th><th>Max</th><th>Count</th><th>%</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function bindAbilityList(container, player, state, ctx, metric) {
    const Dref = D();
    const rows = Dref.rankedAbilities(player, metric).map((r) => ({
      ...r,
      you: r.id === state.abilityKey,
    }));
    B().renderRankedRows(container, rows, {
      ...ctx.opts,
      onClick: (_e, r) => {
        state.abilityKey = r.id;
        ctx.redraw();
      },
    });
    return rows;
  }

  function crumbLabel(n) {
    if (n.view === "players") return "Players";
    if (n.view === "abilities") return n.name || "Abilities";
    if (n.view === "targets") return (n.name || "") + " targets";
    if (n.view === "ability_targets") return n.name || "Targets";
    return n.view;
  }

  function renderBars(body, state, ctx) {
    const Dref = D();
    const Bars = B();
    Bars.clearTick(state);

    const stack = state.nav || [{ view: "players" }];
    state.nav = stack;
    body.innerHTML = "";
    const top = stack[stack.length - 1];

    if (stack.length > 1) {
      const crumb = document.createElement("div");
      crumb.className = "nav-crumb";
      crumb.innerHTML = `<button type="button" data-back>←</button> <span>${stack.map(crumbLabel).join(" › ")}</span>`;
      crumb.querySelector("[data-back]").onclick = () => {
        stack.pop();
        ctx.redraw();
      };
      body.appendChild(crumb);
    }

    if (state.metric === "avoidance" && top.view === "players") {
      const tip = document.createElement("div");
      tip.className = "av-tip";
      tip.textContent = "% of attacks missed / evaded / avoided (burn ticks excluded).";
      body.appendChild(tip);
    }

    let rows = [];
    if (top.view === "players") {
      rows = Dref.rankedPlayers(state.metric);
    } else if (top.view === "abilities") {
      rows = Dref.rankedAbilities(Dref.playerById(top.actorId), state.metric);
    } else {
      const p = Dref.playerById(top.actorId);
      const list =
        top.view === "targets"
          ? p.targetsAll
          : p.abilities.find((a) => a.key === top.abilityKey)?.targets || [];
      rows = list.map((t) => ({
        id: t.id,
        name: t.name,
        color: "#607d8b",
        value: t.amount,
        kind: "target",
      }));
    }

    const list = document.createElement("div");
    list.className = "bar-list";
    body.appendChild(list);

    const barOpts = {
      ...ctx.opts,
      metric: state.metric,
      clear: true,
      onTooltipHide: ctx.hideTooltip,
      tooltipHtml: (e, r) => barTooltip(e, r, state.metric, ctx),
      onClick: (e, r) => {
        if (r.kind === "player") {
          stack.push(
            e.shiftKey
              ? { view: "targets", actorId: r.id, name: r.name }
              : { view: "abilities", actorId: r.id, name: r.name },
          );
          ctx.redraw();
        } else if (r.kind === "ability") {
          stack.push({ view: "ability_targets", actorId: r.player.id, abilityKey: r.id, name: r.name });
          ctx.redraw();
        }
      },
      onContextMenu: (e) => {
        e.preventDefault();
        if (stack.length > 1) {
          stack.pop();
          ctx.redraw();
        }
      },
    };

    Bars.renderRankedRows(list, rows, barOpts);

    // Live players view only when this panel's Current resolves to live ingest
    const resolved = Dref.resolveSegment(state.selectedset || "current");
    if (top.view === "players" && resolved.live && (state.selectedset || "current") === "current") {
      const hint = document.createElement("div");
      hint.className = "perf-hint";
      hint.textContent = "row-pool · patch on tick (no remount)";
      body.appendChild(hint);

      const onTick = () => {
        if (!list.isConnected) {
          Bars.clearTick(state);
          return;
        }
        const ref = state.selectedset || "current";
        Dref.withSegment(ref, () => {
          Bars.patchRankedRows(list, Dref.rankedPlayers(state.metric), barOpts);
        });
      };
      Bars.ensureBarTick(state, onTick);
    }
  }

  function renderInspector(body, state, ctx) {
    // Merged Details presentation — same query, Recount-style split layout
    if (state.layout === "details") {
      renderDetailsLayout(body, state, ctx);
      return;
    }
    const Dref = D();
    const p = Dref.playerById(state.actorId) || Dref.PLAYERS[0];
    state.actorId = p.id;
    const ab = p.abilities.find((a) => a.key === state.abilityKey) || p.abilities[0];
    state.abilityKey = ab.key;
    const tab = state.tab || "outcomes";

    body.innerHTML = `
      <div class="inspector">
        <div class="col">
          <div class="sec-h">${p.name} — overview
            <button type="button" class="linkish" data-layout="details" title="Recount Details layout">Details layout</button>
          </div>
          <div class="stat-grid">
            <div>Damage <b>${Dref.fmt(p.damage)}</b></div>
            <div>DPS <b>${Dref.fmtRate(p.damage / Dref.SEG_SEC)}</b></div>
            <div>Taken <b>${Dref.fmt(p.taken)}</b></div>
            <div>Heal <b>${Dref.fmt(p.heal)}</b></div>
            <div>HPS <b>${Dref.fmtRate(p.heal / Dref.SEG_SEC)}</b></div>
            <div>Activity <b>${Math.round(p.activity * 100)}%</b></div>
            <div>Deaths <b>${p.deaths}</b></div>
            <div>Heal Req <b>${Dref.fmt(p.healingRequired)}</b></div>
          </div>
          <div class="sec-h">Abilities</div>
          <div class="ab-list"></div>
        </div>
        <div class="col">
          <div class="tabs">
            <button type="button" data-tab="outcomes" class="${tab === "outcomes" ? "active" : ""}">Outcomes</button>
            <button type="button" data-tab="targets" class="${tab === "targets" ? "active" : ""}">Targets</button>
            <button type="button" data-tab="taken" class="${tab === "taken" ? "active" : ""}">Taken</button>
          </div>
          <div class="sec-h">${window.MockIcons.iconHtml({ iconKey: ab.key, letter: ab.letter, color: ab.color }, { icons: ctx.opts.icons !== false, iconSize: 18 })}${ab.label}</div>
          <div class="right"></div>
        </div>
      </div>`;

    body.querySelector("[data-layout]")?.addEventListener("click", () => {
      state.layout = "details";
      ctx.redraw();
    });

    bindAbilityList(body.querySelector(".ab-list"), p, state, ctx);

    for (const btn of body.querySelectorAll("[data-tab]")) {
      btn.onclick = () => {
        state.tab = btn.getAttribute("data-tab");
        ctx.redraw();
      };
    }

    const right = body.querySelector(".right");
    if (tab === "outcomes") {
      right.innerHTML = outcomeTableHtml(ab.outcomes);
    } else if (tab === "targets") {
      B().renderRankedRows(
        right,
        ab.targets.map((t) => ({ id: t.id, name: t.name, value: t.amount, color: "#607d8b" })),
        { ...ctx.opts },
      );
    } else {
      right.innerHTML = `<div class="stat-grid" style="padding:12px"><div>Damage taken <b>${Dref.fmt(p.taken)}</b></div><div>Deaths <b>${p.deaths}</b></div></div>`;
    }
  }

  function renderDetailsLayout(body, state, ctx) {
    const Dref = D();
    const p = Dref.playerById(state.actorId) || Dref.PLAYERS[0];
    state.actorId = p.id;
    const ranked = Dref.rankedAbilities(p);
    const sel = ranked.find((a) => a.id === state.abilityKey)?.ability || ranked[0]?.ability;
    if (!sel) return;
    state.abilityKey = sel.key;

    body.innerHTML = `
      <div class="details-split">
        <div class="details-tools"><button type="button" data-layout="inspector">← Inspector</button></div>
        <div class="details-pane">
          <canvas data-pie-top></canvas>
          <div class="list" data-list-top></div>
        </div>
        <div class="details-pane">
          <canvas data-pie-bot></canvas>
          <div class="list" data-list-bot></div>
        </div>
      </div>`;

    body.querySelector("[data-layout]").onclick = () => {
      state.layout = undefined;
      ctx.redraw();
    };

    bindAbilityList(body.querySelector("[data-list-top]"), p, state, ctx);
    C().pie(
      body.querySelector("[data-pie-top]"),
      ranked.map((a) => ({ value: a.value, color: a.color })),
    );

    const { entries } = outcomeEntries(sel.outcomes);
    body.querySelector("[data-list-bot]").innerHTML = outcomeTableHtml(sel.outcomes, { swatches: true });
    C().pie(
      body.querySelector("[data-pie-bot]"),
      entries.map(([k, o]) => ({ value: o.count, color: OC_COLORS[k] || "#888" })),
    );
  }

  function renderSummary(body, state, ctx) {
    const Dref = D();
    const p = Dref.playerById(state.actorId) || Dref.PLAYERS[0];
    state.actorId = p.id;
    const side = state.side || "outgoing";
    const mx = Dref.schoolMatrix(p.id, side);

    body.innerHTML = `
      <div class="summary">
        <div class="tabs">
          <button type="button" data-side="outgoing" class="${side === "outgoing" ? "active" : ""}">Outgoing</button>
          <button type="button" data-side="incoming" class="${side === "incoming" ? "active" : ""}">Incoming</button>
          <select data-actor>${Dref.PLAYERS.map((x) => `<option value="${x.id}" ${x.id === p.id ? "selected" : ""}>${x.name}</option>`).join("")}</select>
        </div>
        <div class="summary-cols">
          <div>
            <h5>Damage</h5>
            <div class="cell">Total <b>${Dref.fmt(p.damage)}</b></div>
            <div class="cell">DPS <b>${Dref.fmtRate(p.damage / Dref.SEG_SEC)}</b></div>
            <div class="cell">Taken <b>${Dref.fmt(p.taken)}</b></div>
            <div class="cell">Time <b>${fmtTime(Math.round(Dref.SEG_SEC * p.activity))} (${Math.round(p.activity * 100)}%)</b></div>
          </div>
          <div>
            <h5>Healing</h5>
            <div class="cell">Total <b>${Dref.fmt(p.heal)}</b></div>
            <div class="cell">HPS <b>${Dref.fmtRate(p.heal / Dref.SEG_SEC)}</b></div>
            <div class="cell">Self <b>${Dref.fmt(p.selfHeal)}</b></div>
            <div class="cell">Required <b>${Dref.fmt(p.healingRequired)}</b></div>
          </div>
          <div>
            <h5>Avoidance</h5>
            <div class="cell">Evade <b>${p.avoidance.evade}</b></div>
            <div class="cell">Miss <b>${p.avoidance.miss}</b></div>
            <div class="cell">Avoid <b>${p.avoidance.avoid}</b></div>
            <div class="cell">MP absorb <b>${Dref.fmt(p.avoidance.mpAbsorb)}</b></div>
          </div>
        </div>
        <div class="sec-h" style="margin:0 -8px 6px">Attack summary (${side}) — from query API</div>
        <table class="matrix"><thead><tr><th></th><th>Physical</th><th>Magical</th><th>Pure</th></tr></thead><tbody data-mx></tbody></table>
      </div>`;

    for (const b of body.querySelectorAll("[data-side]")) {
      b.onclick = () => {
        state.side = b.getAttribute("data-side");
        ctx.redraw();
      };
    }
    body.querySelector("[data-actor]").onchange = (e) => {
      state.actorId = e.target.value;
      ctx.redraw();
    };
    const tb = body.querySelector("[data-mx]");
    for (const [k, cols] of Object.entries(mx)) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${k}</td><td class="phys">${cols[0]}</td><td class="mag">${cols[1]}</td><td class="pure">${cols[2]}</td>`;
      tb.appendChild(tr);
    }
  }

  function renderDeath(body, state, ctx) {
    const Dref = D();
    const death = Dref.DEATHS.find((d) => d.id === state.deathId) || Dref.DEATHS[0];
    state.deathId = death.id;
    const showDmg = state.filtDmg !== false;
    const showHeal = state.filtHeal !== false;

    body.innerHTML = `
      <div class="death">
        <div class="death-side" data-side></div>
        <div class="death-main">
          <div class="death-killers" data-killers></div>
          <div class="death-log" data-log></div>
          <div class="death-graph"><canvas data-hp></canvas></div>
          <div class="death-filters">
            <label><input type="checkbox" data-f="dmg" ${showDmg ? "checked" : ""}/> Damage</label>
            <label><input type="checkbox" data-f="heal" ${showHeal ? "checked" : ""}/> Heals</label>
          </div>
        </div>
      </div>`;

    const side = body.querySelector("[data-side]");
    for (const d of Dref.DEATHS) {
      const el = document.createElement("div");
      el.className = "ditem" + (d.id === death.id ? " active" : "");
      el.innerHTML = `<div class="t">${fmtTime(d.atFightSec)}</div><div style="color:${Dref.CLASS_COLORS[d.ctype]}">${d.name}</div>`;
      el.onclick = () => {
        state.deathId = d.id;
        ctx.redraw();
      };
      side.appendChild(el);
    }
    body.querySelector("[data-killers]").innerHTML = death.killers
      .map((k) => {
        const ic = window.MockIcons.iconHtml({ iconKey: k.key }, { icons: true, iconSize: 16 });
        return `<span>${ic}${k.label} <b>${Dref.fmt(k.amount)}</b></span>`;
      })
      .join("");

    const strip = Dref.deathConditionStrip(death.id);
    if (strip.length) {
      const el = document.createElement("div");
      el.className = "death-cond-strip";
      const win = 15;
      el.innerHTML =
        `<div class="death-cond-h">Conditions (−${win}s)</div><div class="death-cond-track">` +
        strip
          .map((iv) => {
            const left = ((iv.t0 + win) / win) * 100;
            const width = Math.max(2, ((iv.t1 - iv.t0) / win) * 100);
            return `<i title="${iv.label}" style="left:${left}%;width:${width}%;background:${iv.color}"></i>`;
          })
          .join("") +
        `</div>`;
      body.querySelector(".death-main").insertBefore(el, body.querySelector("[data-log]"));
    }

    const log = body.querySelector("[data-log]");
    for (const ev of death.events) {
      if (ev.kind === "dmg" && !showDmg) continue;
      if (ev.kind === "heal" && !showHeal) continue;
      const row = document.createElement("div");
      row.className = "drow";
      const amt = ev.kind === "heal" ? `+${Dref.fmt(ev.amount)}` : `−${Dref.fmt(ev.amount)}`;
      const ic = window.MockIcons.iconHtml({ iconKey: ev.abilityKey }, { icons: true, iconSize: 16 });
      row.innerHTML = `
        <span class="t">${ev.t.toFixed(1)}</span>
        <span class="amt ${ev.kind}">${amt}</span>
        <span class="abil">${ic}[${ev.ability}] <span style="color:var(--muted)">${ev.source}</span></span>
        <div class="hpbar"><i style="width:${ev.hp}%"></i></div>
        <span class="t">${ev.hp}%</span>`;
      log.appendChild(row);
    }
    C().hpLine(
      body.querySelector("[data-hp]"),
      death.hpSeries,
      death.hpSeries
        .map((_, i) => ({ i }))
        .filter((_, i) => i > 0 && death.hpSeries[i] < death.hpSeries[i - 1] - 15),
    );
    for (const cb of body.querySelectorAll("[data-f]")) {
      cb.onchange = () => {
        state.filtDmg = body.querySelector('[data-f="dmg"]').checked;
        state.filtHeal = body.querySelector('[data-f="heal"]').checked;
        ctx.redraw();
      };
    }
  }

  function renderSeries(body, state, ctx) {
    window.MockSeries.renderSeries(body, state, ctx);
  }

  function renderChart(body, state, ctx) {
    window.MockChartView.renderChart(body, state, ctx);
  }

  function renderTimeline(body, state, ctx) {
    window.MockTimeline.renderTimeline(body, state, ctx);
  }

  function renderEncounter(body, state, ctx) {
    const Dref = D();
    const meta = Dref.encounterMeta();
    const scopeLabel = Dref.PARTY_SCOPES.find((s) => s.id === meta.partyScope)?.label || meta.partyScope;
    body.innerHTML = `
      <div class="encounter">
        <div class="enc-head">
          <div class="enc-title"><b>${meta.name}</b> · ${fmtTime(meta.durationSec)} · <span class="enc-scope">${scopeLabel}</span></div>
          <div class="enc-stats">
            <span>${meta.players} players</span>
            <span class="bad">${meta.deaths} deaths</span>
            <span>DT <b>${Dref.fmt(meta.totalTaken)}</b></span>
            <span>Dmg <b>${Dref.fmt(meta.totalDmg)}</b></span>
            <span>Heal <b>${Dref.fmt(meta.totalHeal)}</b></span>
          </div>
        </div>
        <div class="enc-grid">
          <div class="widget tone-taken"><h5>Damage Taken — Players</h5><div class="wbody" data-w="taken"></div></div>
          <div class="widget tone-spell"><h5>Damage Taken — By Ability</h5><div class="wbody" data-w="spells"></div></div>
          <div class="widget tone-death"><h5>Deaths</h5><div class="wbody" data-w="deaths"></div></div>
          <div class="widget tone-dmg"><h5>Damage Done</h5><div class="wbody" data-w="dmg"></div></div>
          <div class="widget tone-heal"><h5>Healing Required</h5><div class="wbody" data-w="hr"></div></div>
          <div class="widget tone-av"><h5>Avoidance %</h5><div class="wbody" data-w="av"></div></div>
        </div>
        <div class="enc-fights">
          <div class="enc-fights-h">Fights</div>
          <div class="enc-fight-list" data-fights></div>
        </div>
      </div>`;

    const openPlayer = (id) => {
      if (ctx.openPreset) {
        ctx.openPreset("inspector", (ctx.panel?.x || 40) + 40, (ctx.panel?.y || 40) + 40, { actorId: id });
      }
    };

    const mini = (sel, rows, metric) =>
      B().renderRankedRows(body.querySelector(sel), rows, {
        ...ctx.opts,
        metric,
        onClick: (_e, r) => {
          if (r.id) openPlayer(r.id);
        },
      });

    mini('[data-w="taken"]', Dref.rankedPlayers("taken"), "taken");
    mini(
      '[data-w="spells"]',
      Dref.INCOMING_SPELLS.map((s) => ({
        id: s.key,
        name: s.label,
        value: s.amount,
        color: s.color,
        iconKey: s.iconKey || s.key,
        kind: "ability",
      })),
    );
    mini('[data-w="dmg"]', Dref.rankedPlayers("damage"), "damage");
    mini('[data-w="hr"]', Dref.rankedPlayers("healing_required"), "healing_required");
    mini(
      '[data-w="av"]',
      Dref.rankedPlayers("avoidance").map((r) => ({ ...r, pctMode: true })),
      "avoidance",
    );

    const deaths = body.querySelector('[data-w="deaths"]');
    for (const [i, d] of Dref.DEATHS.entries()) {
      const row = document.createElement("div");
      row.className = "row clickable";
      row.innerHTML = `<span class="rank">${i + 1}.</span><span class="name" style="color:${Dref.CLASS_COLORS[d.ctype]}">${d.name}</span><span class="vals">${fmtTime(d.atFightSec)}</span>`;
      row.onclick = () => {
        if (ctx.openPreset) {
          ctx.openPreset("death", (ctx.panel?.x || 12) + 24, Math.max(12, (ctx.panel?.y || 40) - 40), {
            deathId: d.id,
          });
        }
      };
      deaths.appendChild(row);
    }

    const fightList = body.querySelector("[data-fights]");
    const activeId = state.selectedset || Dref.getDefaultSelectedset();
    for (const s of Dref.listSegments()) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "enc-fight" + (s.id === activeId ? " active" : "");
      const mark = s.id === "current" ? "●" : s.id === "total" ? "Σ" : s.outcome === "wipe" ? "✗" : "✓";
      btn.innerHTML = `<span class="mark">${mark}</span><span class="lab">${s.titleChip || s.label}</span><span class="meta">${fmtTime(s.durationSec)} · ${s.deaths}d</span>`;
      btn.onclick = () => {
        if (ctx.selectSegment) ctx.selectSegment(s.id);
      };
      fightList.appendChild(btn);
    }
  }

  function renderPie(body, state, ctx) {
    const Dref = D();
    const p = Dref.playerById(state.actorId) || Dref.PLAYERS[0];
    state.actorId = p.id;
    body.innerHTML = `
      <div class="chart-panel">
        <div class="chart-tools">
          <select data-actor>${Dref.PLAYERS.map((x) => `<option value="${x.id}" ${x.id === p.id ? "selected" : ""}>${x.name}</option>`).join("")}</select>
          <span style="color:var(--muted)">Ability mix</span>
        </div>
        <div class="chart-wrap"><canvas></canvas></div>
        <div class="chart-legend" data-leg></div>
      </div>`;
    C().pie(
      body.querySelector("canvas"),
      Dref.rankedAbilities(p).map((a) => ({ value: a.value, color: a.color })),
    );
    body.querySelector("[data-leg]").innerHTML = p.abilities
      .map((a) => {
        const ic = window.MockIcons.iconHtml({ iconKey: a.key, letter: a.letter, color: a.color }, { icons: true, iconSize: 16 });
        return `<span>${ic}${a.label}</span>`;
      })
      .join("");
    body.querySelector("[data-actor]").onchange = (e) => {
      state.actorId = e.target.value;
      ctx.redraw();
    };
  }

  /** kind → { render, title }. Avoidance is bars+metric; realtime/compare share series. */
  const REGISTRY = {
    bars: {
      render: renderBars,
      title: (panel, seg) => `${D().modeLabel(panel.metric)}: <span class="seg">${D().setLabel(panel.selectedset)}</span>`,
    },
    inspector: {
      render: renderInspector,
      title: (panel) =>
        panel.layout === "details"
          ? `Detail — ${D().playerById(panel.actorId)?.name || ""}'s Hostile`
          : `Inspector — ${D().playerById(panel.actorId)?.name || ""}`,
    },
    // details → inspector (merged); keep key for old presets
    details: {
      render: (body, state, ctx) => {
        state.layout = "details";
        renderInspector(body, state, ctx);
      },
      title: (panel) => `Detail — ${D().playerById(panel.actorId)?.name || ""}'s Hostile`,
    },
    summary: {
      render: renderSummary,
      title: (panel) => `Summary — ${D().playerById(panel.actorId)?.name || ""}`,
    },
    death: {
      render: renderDeath,
      title: () => "Advanced Death Logs",
    },
    series: {
      render: renderSeries,
      title: (panel) => {
        const Dref = D();
        const n = Object.values(panel.enabled || {}).filter(Boolean).length || Dref.scopedPlayers().length;
        if (panel.seriesMode === "compare") return "Graph — Damage Comparison";
        const win = panel.rtWindow || 30;
        const live =
          panel.rtPaused
            ? "paused"
            : (panel.selectedset || "current") === "current" && Dref.isCombatLive()
              ? "live"
              : "frozen";
        return `Realtime ${(panel.rtMetric || "dps").toUpperCase()} · ${n} · ${win}s · ${live}`;
      },
    },
    chart: {
      render: renderChart,
      title: (panel) => window.MockChartView.titleFor(panel),
    },
    timeline: {
      render: renderTimeline,
      title: (panel) => `${window.MockTimeline.titleFor()} · ${D().setLabel(panel.selectedset)}`,
    },
    pie: {
      render: renderPie,
      title: (panel) => `Ability Mix — ${D().playerById(panel.actorId)?.name || ""}`,
    },
    encounter: {
      render: renderEncounter,
      title: (panel) => {
        const m = D().encounterMeta();
        return `Encounter Summary — ${D().setLabel(panel.selectedset)} · ${m.deaths} deaths`;
      },
    },
  };

  function titleFor(panel, segLabel) {
    return REGISTRY[panel.kind]?.title?.(panel, segLabel) || panel.kind;
  }

  return { REGISTRY, titleFor, fmtTime };
})();
