// ==UserScript==
// @name         Adventure.land COMM UI Enhancement
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  enhance https://adventure.land/comm/
// @author       kevinsandow
// @contributors vett0, thmsn
// @match        https://adventure.land/comm
// @match        https://adventure.land/comm?borders=1
// @match        https://thmsn.adventureland.community/comm
// @match        https://thmsn.adventureland.community/comm?borders=1
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

var EnhanceCommUI = (() => {
  // src/host/react.ts
  function getReact() {
    const React = window.React;
    if (!React) {
      throw new Error("window.React is not available");
    }
    return React;
  }
  function getReactDOM() {
    const ReactDOM = window.ReactDOM;
    if (!ReactDOM) {
      throw new Error("window.ReactDOM is not available");
    }
    return ReactDOM;
  }
  function e(type, props, ...children) {
    const React = getReact();
    return React.createElement(type, props, ...children);
  }

  // src/host/al.ts
  function getG() {
    return window.G;
  }
  function getEntitiesRecord() {
    const raw = window.entities;
    if (!raw) return {};
    if (Array.isArray(raw)) {
      const out = {};
      for (let i = 0; i < raw.length; i++) {
        const ent = raw[i];
        if (ent && ent.id != null) out[String(ent.id)] = ent;
      }
      return out;
    }
    return raw;
  }
  function getEntitiesList() {
    const raw = window.entities;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(Boolean);
    return Object.values(raw);
  }
  function getObserving() {
    return window.observing;
  }
  function getObservingId() {
    var _a;
    return (_a = window.observing) == null ? void 0 : _a.id;
  }
  function getS() {
    return window.S;
  }
  function getSocket() {
    return window.socket;
  }
  function getServerRegion() {
    return window.server_region;
  }
  function getServerIdentifier() {
    return window.server_identifier;
  }
  function getMapName() {
    var _a;
    return (_a = window.map) == null ? void 0 : _a.map_name;
  }
  function simpleDistance(a, b) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (typeof window.simple_distance === "function") {
      return window.simple_distance(a, b);
    }
    const ax = (_b = (_a = a == null ? void 0 : a.real_x) != null ? _a : a == null ? void 0 : a.x) != null ? _b : 0;
    const ay = (_d = (_c = a == null ? void 0 : a.real_y) != null ? _c : a == null ? void 0 : a.y) != null ? _d : 0;
    const bx = (_f = (_e = b == null ? void 0 : b.real_x) != null ? _e : b == null ? void 0 : b.x) != null ? _f : 0;
    const by = (_h = (_g = b == null ? void 0 : b.real_y) != null ? _g : b == null ? void 0 : b.y) != null ? _h : 0;
    const dx = ax - bx;
    const dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function calculateDifficulty(monster) {
    if (typeof window.calculate_difficulty === "function") {
      return window.calculate_difficulty(monster);
    }
    return 0;
  }

  // src/tick.ts
  var INTERVAL_MS = 100;
  function buildSnapshot() {
    const entities = getEntitiesList();
    const observingId = getObservingId();
    const observing = getObserving();
    let target;
    if (observing == null ? void 0 : observing.target) {
      for (let i = 0; i < entities.length; i++) {
        if (entities[i].id === observing.target) {
          target = entities[i];
          break;
        }
      }
    }
    return {
      entities,
      observingId,
      observing,
      target,
      S: getS(),
      serverRegion: getServerRegion(),
      serverIdentifier: getServerIdentifier(),
      now: Date.now()
    };
  }
  function startTick(cb) {
    const tick = () => {
      cb(buildSnapshot());
    };
    tick();
    const id = window.setInterval(tick, INTERVAL_MS);
    return () => window.clearInterval(id);
  }

  // src/sockets/hub.ts
  var killListeners = [];
  var damageListeners = [];
  var lastSocketId = null;
  var hubStarted = false;
  var pollTimer = null;
  function emitKill(ev) {
    for (let i = 0; i < killListeners.length; i++) {
      killListeners[i](ev);
    }
  }
  function emitDamage(ev) {
    for (let i = 0; i < damageListeners.length; i++) {
      damageListeners[i](ev);
    }
  }
  function onDeath(data) {
    if (!data || data.id == null) return;
    emitKill({
      id: String(data.id),
      luckm: data.luckm,
      at: Date.now()
    });
  }
  function onHit(data) {
    if (!data) return;
    const at = Date.now();
    const ev = {
      actor: data.hid != null ? String(data.hid) : data.actor != null ? String(data.actor) : void 0,
      target: data.id != null ? String(data.id) : data.target != null ? String(data.target) : void 0,
      at,
      raw: data
    };
    if (data.heal !== void 0) {
      ev.heal = Math.abs(Number(data.heal) || 0);
    } else if (data.damage !== void 0) {
      ev.damage = Math.abs(Number(data.damage) || 0);
    }
    if (data.evade || data.miss || data.reflect) {
    }
    emitDamage(ev);
  }
  function onAction(data) {
    if (!data) return;
    void data;
  }
  function maybeResubscribe() {
    const socket = getSocket();
    if (!socket || !socket.id) return;
    if (socket.id === lastSocketId) return;
    lastSocketId = socket.id;
    socket.on("death", onDeath);
    socket.on("hit", onHit);
    socket.on("action", onAction);
  }
  function onKill(listener) {
    killListeners.push(listener);
    return () => {
      const idx = killListeners.indexOf(listener);
      if (idx >= 0) killListeners.splice(idx, 1);
    };
  }
  function onDamage(listener) {
    damageListeners.push(listener);
    return () => {
      const idx = damageListeners.indexOf(listener);
      if (idx >= 0) damageListeners.splice(idx, 1);
    };
  }
  function startSocketHub() {
    if (hubStarted) {
      return () => {
      };
    }
    hubStarted = true;
    maybeResubscribe();
    pollTimer = window.setInterval(maybeResubscribe, 500);
    return () => {
      if (pollTimer != null) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
      hubStarted = false;
      lastSocketId = null;
    };
  }

  // src/crypt/tracker.ts
  var CRYPT_BOSSES_MTYPES = [
    "a1",
    "a2",
    "a3",
    "a4",
    "a5",
    "a6",
    "a7",
    "a8"
  ];
  var CRYPT_IMPORTANT_MOBS_MTYPES = [
    ...CRYPT_BOSSES_MTYPES,
    "vbat",
    "nerfedbat"
  ];
  var CRYPT_MOBS_STATES_AND_STATS = {};
  var idToMobData = /* @__PURE__ */ new Map();
  var unsubKill = null;
  function isBossMtype(mtype) {
    return CRYPT_BOSSES_MTYPES.indexOf(mtype) >= 0;
  }
  function handleKill(ev) {
    const mobData = idToMobData.get(ev.id);
    if (!mobData) return;
    const instanceData = CRYPT_MOBS_STATES_AND_STATS[mobData.in];
    if (!instanceData) return;
    const mobRichData = instanceData[mobData.mtype];
    if (!mobRichData) return;
    mobRichData.deadCount += 1;
    if (isBossMtype(mobData.mtype)) {
      const boss = mobRichData;
      boss.luckm = ev.luckm;
      boss.deathEventTimestamp = ev.at;
    }
  }
  function startCryptTracker() {
    if (!unsubKill) {
      unsubKill = onKill(handleKill);
    }
    return () => {
      if (unsubKill) {
        unsubKill();
        unsubKill = null;
      }
    };
  }
  function updateFromEntities(instanceId, entities) {
    if (!instanceId) return;
    if (!(instanceId in CRYPT_MOBS_STATES_AND_STATS)) {
      CRYPT_MOBS_STATES_AND_STATS[instanceId] = {};
    }
    const now = Date.now();
    const list = Array.isArray(entities) ? entities : Object.values(entities);
    for (let i = 0; i < list.length; i++) {
      const entity = list[i];
      if (!entity) continue;
      if (!entity.visible || entity.dead) continue;
      if (!entity.mtype || CRYPT_IMPORTANT_MOBS_MTYPES.indexOf(entity.mtype) < 0) {
        continue;
      }
      const instanceData = CRYPT_MOBS_STATES_AND_STATS[instanceId];
      if (isBossMtype(entity.mtype)) {
        if (!(entity.mtype in instanceData)) {
          instanceData[entity.mtype] = {
            deadCount: 0,
            firstSeen: now,
            lastSeen: now,
            lastSeenLevel: entity.level,
            lastSeenFocus: entity.focus
          };
        } else {
          const boss = instanceData[entity.mtype];
          boss.lastSeen = now;
          boss.lastSeenLevel = entity.level;
        }
      } else if (!(entity.mtype in instanceData)) {
        instanceData[entity.mtype] = { deadCount: 0 };
      }
      idToMobData.set(entity.id, {
        mtype: entity.mtype,
        in: entity.in || instanceId
      });
    }
  }
  function getInstanceData(instanceId) {
    var _a;
    if (!instanceId) return {};
    return (_a = CRYPT_MOBS_STATES_AND_STATS[instanceId]) != null ? _a : {};
  }
  function resolveFocusMtype(focusId) {
    var _a;
    if (!focusId) return void 0;
    return (_a = idToMobData.get(focusId)) == null ? void 0 : _a.mtype;
  }

  // src/meters/combatMeter.ts
  var WINDOW_MS = 1e4;
  var samples = [];
  var unsub = null;
  function prune(now) {
    const cutoff = now - WINDOW_MS;
    while (samples.length > 0 && samples[0].at < cutoff) {
      samples.shift();
    }
  }
  function onEvent(ev) {
    const damage = ev.damage || 0;
    const heal = ev.heal || 0;
    if (!damage && !heal) return;
    samples.push({
      at: ev.at,
      actor: ev.actor,
      damage,
      heal
    });
    prune(ev.at);
  }
  function startCombatMeter() {
    if (!unsub) {
      unsub = onDamage(onEvent);
    }
    return () => {
      if (unsub) {
        unsub();
        unsub = null;
      }
    };
  }
  function getDps(now = Date.now()) {
    prune(now);
    let total = 0;
    for (let i = 0; i < samples.length; i++) {
      total += samples[i].damage;
    }
    return total / (WINDOW_MS / 1e3);
  }
  function getActorDamage(now = Date.now()) {
    prune(now);
    const out = {};
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      if (!s.actor || !s.damage) continue;
      out[s.actor] = (out[s.actor] || 0) + s.damage;
    }
    return out;
  }
  function estimateTtk(hp, dps = getDps()) {
    if (hp == null || hp <= 0 || !dps || dps <= 0) return void 0;
    return hp / dps;
  }

  // src/kpi/sessionKills.ts
  var mtypeCounts = {};
  var lastSeenMtype = /* @__PURE__ */ new Map();
  var totalKills = 0;
  var unsub2 = null;
  function handleKill2(ev) {
    var _a;
    const mtype = lastSeenMtype.get(ev.id) || ((_a = getEntitiesRecord()[ev.id]) == null ? void 0 : _a.mtype) || "?";
    mtypeCounts[mtype] = (mtypeCounts[mtype] || 0) + 1;
    totalKills += 1;
  }
  function updateSeenMtypes(entities) {
    for (let i = 0; i < entities.length; i++) {
      const ent = entities[i];
      if (ent.type === "monster" && ent.mtype) {
        lastSeenMtype.set(ent.id, ent.mtype);
      }
    }
  }
  function startSessionKills() {
    if (!unsub2) {
      unsub2 = onKill(handleKill2);
    }
    return () => {
      if (unsub2) {
        unsub2();
        unsub2 = null;
      }
    };
  }
  function getStats() {
    const byMtype = [];
    const keys = Object.keys(mtypeCounts);
    for (let i = 0; i < keys.length; i++) {
      byMtype.push({ mtype: keys[i], count: mtypeCounts[keys[i]] });
    }
    byMtype.sort((a, b) => b.count - a.count);
    return { total: totalKills, byMtype };
  }

  // src/lib/colors.ts
  var classColors = {
    merchant: "#7f7f7f",
    mage: "#3e6eed",
    warrior: "#f07f2f",
    priest: "#eb4d82",
    ranger: "#8a512b",
    paladin: "#a3b4b9",
    rogue: "#44b75c"
  };

  // src/lib/format.ts
  function formatTime(timeSeconds) {
    if (!timeSeconds) {
      return "?";
    }
    const prefixes = [
      { unit: "s", n: 1, resolution: 0, minMultiplier: 0 },
      { unit: "min", n: 60, resolution: 0, minMultiplier: 99.5 / 60 },
      { unit: "h", n: 3600, resolution: 1, minMultiplier: 99.5 / 60 },
      { unit: "d", n: 86400, resolution: 1, minMultiplier: 99.5 / 24 }
    ];
    let result;
    for (let i = prefixes.length - 1; i >= 0; i--) {
      const prefix = prefixes[i];
      if (timeSeconds >= prefix.minMultiplier * prefix.n) {
        result = `${(timeSeconds / prefix.n).toFixed(prefix.resolution)}${prefix.unit}`;
        break;
      }
    }
    return result != null ? result : "?";
  }
  function getPercent(value, precision) {
    return `${Math.max(0, Math.min(100, value * 100)).toFixed(precision)}%`;
  }
  function getTimeUntil(dateString) {
    if (!dateString) return "";
    const target = new Date(dateString);
    const now = /* @__PURE__ */ new Date();
    return formatTime((target.getTime() - now.getTime()) / 1e3);
  }
  function getALServerTime(timeOffset) {
    const offset = parseInt(String(timeOffset != null ? timeOffset : 0), 10) || 0;
    const dt = new Date(Date.now() + offset * 3600 * 1e3);
    return dt.getUTCHours().toString().padStart(2, "0") + ":" + dt.getUTCMinutes().toString().padStart(2, "0");
  }

  // src/meters/RankMeter.ts
  function RankMeter(props) {
    const { title, className, rows } = props;
    if (!rows || rows.length === 0) return null;
    return e(
      "div",
      {
        className,
        style: {
          display: "flex",
          overflow: "auto",
          flexDirection: "column",
          margin: "4px",
          border: "2px double gray",
          background: "black",
          gap: "2px"
        }
      },
      e(
        "div",
        {
          style: {
            padding: "2px",
            whiteSpace: "nowrap",
            textShadow: "0 0 2px black",
            position: "relative"
          }
        },
        title
      ),
      ...rows.map(
        (row) => e(
          "div",
          {
            key: row.id,
            style: {
              position: "relative",
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between"
            }
          },
          e("div", {
            style: {
              position: "absolute",
              top: 0,
              bottom: 0,
              width: row.barMax > 0 ? getPercent(row.value / row.barMax, 3) : "0%",
              background: classColors[row.ctype || ""] || "#666"
            }
          }),
          e(
            "div",
            {
              style: {
                padding: "2px",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                overflow: "hidden",
                textShadow: "0 0 2px black",
                position: "relative"
              }
            },
            row.name
          ),
          e(
            "div",
            {
              style: {
                padding: "2px",
                whiteSpace: "nowrap",
                textShadow: "0 0 2px black",
                position: "relative"
              }
            },
            row.label
          )
        )
      )
    );
  }

  // src/queries/entities.ts
  var MTYPES_TO_SQUASH = ["nerfedbat", "nerfedmummy", "zapper0", "crab"];
  function isCoopBoss(entity) {
    return entity.cooperative === true;
  }
  function shouldSquash(mtype) {
    if (!mtype) return false;
    return MTYPES_TO_SQUASH.indexOf(mtype) >= 0;
  }
  function playersList(entities) {
    const out = [];
    for (let i = 0; i < entities.length; i++) {
      const ent = entities[i];
      if (ent.player && ent.type === "character") out.push(ent);
    }
    return out;
  }
  function partyGroups(entities) {
    const players = playersList(entities);
    const result = {};
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const key = player.party || "";
      if (!result[key]) result[key] = [];
      result[key].push(player);
    }
    const entries = Object.entries(result);
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    for (let i = 0; i < entries.length; i++) {
      entries[i][1].sort((a, b) => a.id.localeCompare(b.id));
    }
    return entries;
  }
  function aggroByTarget(entities) {
    const out = {};
    for (let i = 0; i < entities.length; i++) {
      const ent = entities[i];
      if (ent.type !== "monster" || !ent.target) continue;
      if (!out[ent.target]) out[ent.target] = [];
      out[ent.target].push(ent);
    }
    return out;
  }
  function aggroedMonsters(entities) {
    const out = [];
    for (let i = 0; i < entities.length; i++) {
      const ent = entities[i];
      if (ent.type === "monster" && ent.cooperative !== true && ent.target) {
        out.push(ent);
      }
    }
    out.sort((a, b) => {
      const cmp = (a.mtype || "").localeCompare(b.mtype || "");
      if (cmp !== 0) return cmp;
      return a.id < b.id ? -1 : 1;
    });
    return out;
  }
  function coopBosses(entities) {
    const out = [];
    for (let i = 0; i < entities.length; i++) {
      if (isCoopBoss(entities[i])) out.push(entities[i]);
    }
    return out;
  }
  function findEntity(entities, id) {
    if (!id) return void 0;
    for (let i = 0; i < entities.length; i++) {
      if (entities[i].id === id) return entities[i];
    }
    return void 0;
  }

  // src/meters/strategies/pdps.ts
  function buildPdpsRows(entities) {
    const players = playersList(entities).filter((p) => (p.pdps || 0) > 0).sort((a, b) => (b.pdps || 0) - (a.pdps || 0));
    let maxPdps = 0;
    for (let i = 0; i < players.length; i++) {
      maxPdps = Math.max(maxPdps, players[i].pdps || 0);
    }
    if (!maxPdps || players.length === 0) return [];
    return players.map((player) => {
      const value = player.pdps || 0;
      return {
        id: player.id,
        name: player.name || player.id,
        ctype: player.ctype,
        value,
        barMax: maxPdps,
        label: value.toLocaleString(void 0, { maximumFractionDigits: 0 })
      };
    });
  }

  // src/meters/strategies/coopV1.ts
  function coopPlayers(entities) {
    const ids = new Set(entities.map((e2) => e2.id));
    return entities.filter(
      (e2) => {
        var _a, _b, _c, _d;
        return e2.player && e2.type === "character" && (((_b = (_a = e2.s) == null ? void 0 : _a.coop) == null ? void 0 : _b.p) || 0) > 0 && ((_d = (_c = e2.s) == null ? void 0 : _c.coop) == null ? void 0 : _d.id) != null && ids.has(String(e2.s.coop.id));
      }
    ).sort((a, b) => {
      var _a, _b, _c, _d;
      return (((_b = (_a = b.s) == null ? void 0 : _a.coop) == null ? void 0 : _b.p) || 0) - (((_d = (_c = a.s) == null ? void 0 : _c.coop) == null ? void 0 : _d.p) || 0);
    });
  }
  function buildCoopV1Rows(entities) {
    var _a, _b;
    const players = coopPlayers(entities);
    let maxContribution = 0;
    let totalContribution = 0;
    for (let i = 0; i < players.length; i++) {
      const p = ((_b = (_a = players[i].s) == null ? void 0 : _a.coop) == null ? void 0 : _b.p) || 0;
      maxContribution = Math.max(maxContribution, p);
      totalContribution += p;
    }
    if (!maxContribution || players.length === 0) return [];
    return players.map((player) => {
      var _a2, _b2;
      const value = ((_b2 = (_a2 = player.s) == null ? void 0 : _a2.coop) == null ? void 0 : _b2.p) || 0;
      return {
        id: player.id,
        name: player.name || player.id,
        ctype: player.ctype,
        value,
        barMax: maxContribution,
        label: `${getPercent(value / totalContribution, 3)} | ${value.toLocaleString(void 0, { maximumFractionDigits: 0 })}`
      };
    });
  }

  // src/meters/strategies/coopV2.ts
  function coopPlayers2(entities) {
    const ids = new Set(entities.map((e2) => e2.id));
    return entities.filter(
      (e2) => {
        var _a, _b, _c, _d;
        return e2.player && e2.type === "character" && (((_b = (_a = e2.s) == null ? void 0 : _a.coop) == null ? void 0 : _b.p) || 0) > 0 && ((_d = (_c = e2.s) == null ? void 0 : _c.coop) == null ? void 0 : _d.id) != null && ids.has(String(e2.s.coop.id));
      }
    ).sort((a, b) => {
      var _a, _b, _c, _d;
      return (((_b = (_a = b.s) == null ? void 0 : _a.coop) == null ? void 0 : _b.p) || 0) - (((_d = (_c = a.s) == null ? void 0 : _c.coop) == null ? void 0 : _d.p) || 0);
    });
  }
  function pointsPow065(player) {
    var _a, _b, _c;
    return Math.pow(Math.max(0, (_c = (_b = (_a = player == null ? void 0 : player.s) == null ? void 0 : _a.coop) == null ? void 0 : _b.p) != null ? _c : 0), 0.65);
  }
  function buildCoopV2Rows(entities) {
    const players = coopPlayers2(entities);
    if (players.length === 0) return [];
    const powers = [];
    let maxPower = 0;
    let totalPower = 0.1;
    for (let i = 0; i < players.length; i++) {
      const p = pointsPow065(players[i]);
      powers.push(p);
      maxPower = Math.max(maxPower, p);
      totalPower += p;
    }
    return players.map((player, i) => {
      const value = powers[i];
      return {
        id: player.id,
        name: player.name || player.id,
        ctype: player.ctype,
        value,
        barMax: maxPower || 1,
        label: `${getPercent(value / totalPower, 3)} | ${value.toLocaleString(void 0, { maximumFractionDigits: 0 })}`
      };
    });
  }

  // src/meters/strategies/hitDps.ts
  var WINDOW_SEC = 10;
  function buildHitDpsRows(entities, now = Date.now()) {
    const actorDamage = getActorDamage(now);
    const rows = [];
    const ids = Object.keys(actorDamage);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const total = actorDamage[id];
      const dps = total / WINDOW_SEC;
      if (dps <= 0) continue;
      const ent = findEntity(entities, id);
      rows.push({
        id,
        name: (ent == null ? void 0 : ent.name) || id,
        ctype: ent == null ? void 0 : ent.ctype,
        value: dps,
        barMax: 0,
        label: dps.toLocaleString(void 0, { maximumFractionDigits: 0 })
      });
    }
    rows.sort((a, b) => b.value - a.value);
    let max = 0;
    for (let i = 0; i < rows.length; i++) {
      max = Math.max(max, rows[i].value);
    }
    for (let i = 0; i < rows.length; i++) {
      rows[i].barMax = max || 1;
    }
    return rows;
  }

  // src/host/icons.ts
  function itemContainer(item, actual) {
    if (typeof window.item_container !== "function") {
      return "";
    }
    return window.item_container(item, actual);
  }
  function addTint(selector, args) {
    if (typeof window.add_tint === "function") {
      window.add_tint(selector, args);
    }
  }
  function setXTarget(entity) {
    window.xtarget = entity || null;
  }
  function slotSkin(slot) {
    var _a, _b;
    if (!slot || !slot.name) return void 0;
    const def = (_b = (_a = window.G) == null ? void 0 : _a.items) == null ? void 0 : _b[slot.name];
    return slot.skin || (def == null ? void 0 : def.skin);
  }

  // src/ui/frames/Players.ts
  function Players(props) {
    const parties = partyGroups(props.entities);
    return e(
      "div",
      {
        style: {
          padding: "4px",
          display: "flex",
          gap: "4px",
          flexDirection: "column"
        }
      },
      ...parties.map(
        (party) => e(
          "div",
          {
            key: party[0],
            style: {
              display: "flex",
              gap: "4px",
              flexWrap: "wrap"
            }
          },
          e(
            "div",
            { style: { flex: "0 0 100%" } },
            e(
              "span",
              { style: { color: "white", padding: "4px", background: "black" } },
              party[0] || "(no party)"
            )
          ),
          ...party[1].map(
            (player) => e(
              "div",
              {
                key: player.id,
                className: "player",
                style: {
                  display: "flex",
                  width: "120px",
                  background: "black",
                  flexDirection: "column"
                }
              },
              e(
                "div",
                { style: { position: "relative" } },
                e("div", {
                  style: {
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    width: getPercent(
                      (player.hp || 0) / (player.max_hp || 1),
                      1
                    ),
                    background: classColors[player.ctype || ""] || "#666"
                  }
                }),
                e(
                  "div",
                  {
                    style: {
                      padding: "2px",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      position: "relative",
                      textShadow: "0 0 2px black",
                      cursor: "pointer"
                    },
                    onClick: () => {
                      setXTarget(player);
                      props.setSelectedEntity(player.id);
                    }
                  },
                  `${player.level} ${player.id}`
                )
              ),
              e("div", {
                style: {
                  background: "blue",
                  height: "4px",
                  width: getPercent(
                    (player.mp || 0) / (player.max_mp || 1),
                    1
                  )
                }
              })
            )
          )
        )
      )
    );
  }

  // src/ui/frames/MapInfo.ts
  function getMapData(entities) {
    const mapData = { map: getMapName() };
    if (entities.length > 0) {
      mapData.in = entities[0].in;
    }
    return mapData;
  }
  function copyOnClick(text, popupId) {
    return function() {
      const showPopup = function(id, message) {
        const popup = document.getElementById(id);
        if (!popup) return;
        popup.innerHTML = message;
        popup.classList.toggle("show");
        setTimeout(function() {
          popup.classList.toggle("show");
        }, 1e3);
      };
      navigator.clipboard.writeText(text).then(
        function() {
          showPopup(popupId, "Copied instance ID!");
        },
        function(err) {
          console.error("Could not copy instance ID:", err);
          showPopup(popupId, "Copy failure, look into console.");
        }
      );
    };
  }
  var copyInstanceIdPopupId = "copyInstanceIdPopup";
  function MapInfo(props) {
    const mapNameData = getMapData(props.entities);
    let instanceIdElement = void 0;
    if (mapNameData && mapNameData.map && mapNameData.map !== mapNameData.in) {
      if (mapNameData.in) {
        const firstAndLastSymbolsCount = 5;
        let instanceIdToShow;
        if (firstAndLastSymbolsCount < mapNameData.in.length / 2) {
          instanceIdToShow = `${mapNameData.in.slice(0, firstAndLastSymbolsCount)}` + "*".repeat(mapNameData.in.length - 2 * firstAndLastSymbolsCount) + `${mapNameData.in.slice(mapNameData.in.length - firstAndLastSymbolsCount)}`;
        } else {
          instanceIdToShow = mapNameData.in;
        }
        instanceIdElement = e(
          "div",
          {},
          e(
            "div",
            { onClick: copyOnClick(mapNameData.in, copyInstanceIdPopupId) },
            `in : ${instanceIdToShow}`
          ),
          e(
            "div",
            { className: "popup" },
            e("span", { id: copyInstanceIdPopupId, className: "popuptext" })
          )
        );
      } else {
        instanceIdElement = "in: unknown";
      }
    }
    return e(
      "div",
      {
        key: "mapName",
        style: {
          background: "black",
          border: "2px double gray",
          padding: "4px"
        }
      },
      e(
        "div",
        {
          style: {
            display: "flex",
            gap: "4px"
          }
        },
        `Map: ${mapNameData && mapNameData.map ? mapNameData.map : "loading"}`
      ),
      instanceIdElement
    );
  }

  // src/ui/frames/CryptProgress.ts
  function CryptProgress(props) {
    const mapName = getMapData(props.entities);
    if (!mapName || mapName.map !== "crypt") {
      return null;
    }
    updateFromEntities(mapName.in, props.entities);
    const currentlySeeMtypes = /* @__PURE__ */ new Set();
    const aggroedMtypes = /* @__PURE__ */ new Set();
    for (let i = 0; i < props.entities.length; i++) {
      const entity = props.entities[i];
      if (!entity) continue;
      if (entity.type !== "monster" || !entity.visible || entity.dead) continue;
      if (!entity.mtype || CRYPT_IMPORTANT_MOBS_MTYPES.indexOf(entity.mtype) < 0) {
        continue;
      }
      currentlySeeMtypes.add(entity.mtype);
      if (entity.target) aggroedMtypes.add(entity.mtype);
    }
    const instanceData = getInstanceData(mapName.in);
    const elems = [];
    for (let i = 0; i < CRYPT_IMPORTANT_MOBS_MTYPES.length; i++) {
      const mtype = CRYPT_IMPORTANT_MOBS_MTYPES[i];
      const mobRichData = instanceData[mtype];
      let borderColor = "gray";
      if (aggroedMtypes.has(mtype)) borderColor = "red";
      else if (currentlySeeMtypes.has(mtype)) borderColor = "yellow";
      let status = "??";
      let lastSeenComponent = null;
      let levelComponent = "";
      let focusComponent = null;
      let luckmComponent = null;
      if (mobRichData) {
        if (CRYPT_BOSSES_MTYPES.indexOf(mtype) >= 0) {
          const boss = mobRichData;
          if (boss.deadCount > 0) {
            status = `Died ${formatTime((Date.now() - (boss.deathEventTimestamp || 0)) / 1e3)} ago`;
            if (boss.luckm != null) {
              luckmComponent = `luckm: ${boss.luckm.toFixed(3)}`;
            }
          } else {
            status = "Alive";
            if (aggroedMtypes.has(mtype)) lastSeenComponent = "Aggroed!";
            else if (currentlySeeMtypes.has(mtype)) lastSeenComponent = "We see!";
            else if (boss.lastSeen != null) {
              lastSeenComponent = `Seen ${formatTime((Date.now() - boss.lastSeen) / 1e3)} ago`;
            }
            if (boss.lastSeenFocus) {
              const focusMtype = resolveFocusMtype(boss.lastSeenFocus);
              if (focusMtype) focusComponent = `Focus: ${focusMtype}`;
            }
          }
          if (boss.lastSeenLevel != null) {
            levelComponent = ` (${boss.lastSeenLevel} lvl)`;
          }
        } else {
          status = `Died: ${mobRichData.deadCount}`;
        }
      }
      elems.push(
        e(
          "div",
          {
            key: mtype,
            style: {
              background: "black",
              border: `2px double ${borderColor}`,
              padding: "4px"
            }
          },
          e("div", { key: "mtype" }, `${mtype}${levelComponent}`),
          e("div", { key: "state" }, status),
          lastSeenComponent ? e("div", { key: "lastSeen" }, lastSeenComponent) : void 0,
          focusComponent ? e("div", { key: "focus" }, focusComponent) : void 0,
          luckmComponent ? e("div", { key: "luckm" }, luckmComponent) : void 0
        )
      );
    }
    return e(
      "div",
      {
        key: "content",
        style: {
          display: "flex",
          gap: "4px"
        }
      },
      ...elems
    );
  }

  // src/ui/frames/ServerInfo.ts
  function ServerInfo(props) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const timeOffset = (_c = (_b = (_a = props.S) == null ? void 0 : _a.schedule) == null ? void 0 : _b.time_offset) != null ? _c : 0;
    const events = Object.entries((_d = props.S) != null ? _d : {}).filter(
      (entry) => entry[0] !== "schedule"
    );
    return e(
      "div",
      {
        key: "content",
        style: {
          display: "flex",
          gap: "4px"
        }
      },
      e(
        "div",
        {
          style: {
            background: "black",
            border: "2px double gray",
            padding: "4px"
          }
        },
        `${(_e = props.serverRegion) != null ? _e : ""} ${(_f = props.serverIdentifier) != null ? _f : ""}`,
        e("br"),
        getALServerTime(timeOffset) + (((_h = (_g = props.S) == null ? void 0 : _g.schedule) == null ? void 0 : _h.night) ? "\u{1F31B}" : "\u2600\uFE0F")
      ),
      ...events.map(
        (event) => {
          var _a2, _b2;
          return e(
            "div",
            {
              key: event[0],
              style: {
                background: "black",
                border: "2px double gray",
                padding: "4px"
              }
            },
            event[0],
            e("br"),
            ((_a2 = event[1]) == null ? void 0 : _a2.live) ? "live" : ((_b2 = event[1]) == null ? void 0 : _b2.event) ? getTimeUntil(event[1].event) : ""
          );
        }
      )
    );
  }

  // src/ui/chrome/EffectsRow.ts
  function buildEntityEffects(entity) {
    var _a, _b, _c;
    const G = getG();
    const state = entity.s || {};
    const out = [];
    const keys = Object.keys(state);
    for (let i = 0; i < keys.length; i++) {
      const condition = keys[i];
      const actual = state[condition];
      if (!actual) continue;
      if ((_b = (_a = G == null ? void 0 : G.skills) == null ? void 0 : _a[condition]) == null ? void 0 : _b.ui) {
        const def = G.skills[condition];
        if (def == null ? void 0 : def.skin) {
          out.push({
            id: condition,
            skin: def.skin,
            ms: actual.ms,
            stacks: actual.s,
            actual
          });
        }
        continue;
      }
      const prop = (_c = G == null ? void 0 : G.conditions) == null ? void 0 : _c[condition];
      if (!actual.skin && (!prop || !prop.ui && (!actual.s || actual.s < 20))) {
        continue;
      }
      if (entity.type === "monster" && condition === "poisonous") continue;
      const skin = actual.skin || (prop == null ? void 0 : prop.skin);
      if (!skin) continue;
      out.push({
        id: condition,
        skin,
        ms: actual.ms,
        stacks: actual.s,
        actual
      });
    }
    return out;
  }
  function effectsKey(effects) {
    return effects.map((ef) => ef.id).join("|");
  }
  function EffectIcon(props) {
    const React = getReact();
    const ref = React.useRef(null);
    const { effect, hostClass } = props;
    React.useEffect(() => {
      const el = ref.current;
      if (!el) return;
      const html = itemContainer(
        { skin: effect.skin, onclick: `condition_click('${effect.id}')` },
        effect.actual
      );
      if (html) {
        el.innerHTML = html;
        const selector = `.${hostClass}`;
        if (effect.ms != null && effect.ms > 0) {
          addTint(selector, { ms: effect.ms, type: "progress" });
        }
      } else {
        el.textContent = effect.id + (effect.stacks != null ? ` ${effect.stacks}` : "") + (effect.ms != null ? ` (${formatTime(effect.ms / 1e3)})` : "");
      }
      return () => {
        if (el) el.innerHTML = "";
      };
    }, [effect.id, effect.skin, hostClass]);
    React.useEffect(() => {
      if (effect.ms == null) return;
      addTint(`.${hostClass}`, { ms: effect.ms, type: "progress" });
    }, [effect.ms, hostClass]);
    return e("div", {
      ref,
      className: hostClass,
      title: effect.id,
      style: {
        display: "inline-block",
        background: "black",
        padding: "1px",
        minWidth: "20px",
        minHeight: "20px",
        fontSize: "10px"
      }
    });
  }
  function EffectsRow(props) {
    const React = getReact();
    const effects = buildEntityEffects(props.entity);
    const key = effectsKey(effects);
    if (effects.length === 0) return null;
    return e(
      "div",
      {
        key,
        style: {
          display: "flex",
          marginBottom: "4px",
          gap: "2px",
          flexWrap: "wrap"
        }
      },
      ...effects.map((ef) => {
        const hostClass = `comm-fx-${props.entity.id}-${ef.id}`.replace(
          /[^a-zA-Z0-9_-]/g,
          "_"
        );
        return e(EffectIcon, {
          key: ef.id,
          effect: ef,
          hostClass
        });
      })
    );
  }

  // src/ui/chrome/VitalsColumn.ts
  function VitalsColumn(props) {
    const {
      hp,
      maxHp,
      mp,
      maxMp,
      hpColor = "red",
      showMp = true,
      children,
      onClick,
      nameStyle
    } = props;
    const hpPct = maxHp > 0 ? hp / maxHp : 0;
    const mpPct = maxMp && maxMp > 0 ? (mp || 0) / maxMp : 0;
    return e(
      "div",
      {
        style: {
          display: "flex",
          width: "100%",
          flexDirection: "column"
        }
      },
      e(
        "div",
        {
          style: {
            background: "black",
            position: "relative"
          }
        },
        e("div", {
          style: {
            position: "absolute",
            top: 0,
            bottom: 0,
            width: getPercent(hpPct, 1),
            background: hpColor
          }
        }),
        e(
          "div",
          {
            style: Object.assign(
              {
                padding: "4px",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                overflow: "hidden",
                position: "relative",
                textShadow: "0 0 2px black",
                cursor: onClick ? "pointer" : void 0
              },
              nameStyle || {}
            ),
            onClick
          },
          children
        )
      ),
      showMp ? e(
        "div",
        { style: { background: "black" } },
        e("div", {
          style: {
            background: "blue",
            height: "4px",
            width: getPercent(mpPct, 1)
          }
        })
      ) : null
    );
  }

  // src/ui/chrome/ObservedUnit.ts
  function ObservedUnit(props) {
    var _a;
    const {
      entity,
      hpColor,
      fontSize,
      trailing,
      onSelect,
      showEffects = true,
      showMp = true
    } = props;
    const name = `${(_a = entity.level) != null ? _a : 1} ${entity.name || entity.id}` + (entity.type === "monster" ? ` #${entity.id}` : "");
    const label = trailing ? e(
      "span",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          gap: "8px",
          width: "100%"
        }
      },
      e("span", {}, name),
      e(
        "span",
        { style: { fontSize: "14px", opacity: 0.95, flexShrink: 0 } },
        trailing
      )
    ) : name;
    return e(
      "div",
      {
        style: {
          display: "flex",
          width: "100%",
          flexDirection: "column"
        }
      },
      e(
        VitalsColumn,
        {
          hp: entity.hp || 0,
          maxHp: entity.max_hp || 1,
          mp: entity.mp,
          maxMp: entity.max_mp,
          hpColor,
          showMp,
          nameStyle: fontSize != null ? { fontSize } : void 0,
          onClick: onSelect ? () => onSelect(entity.id) : void 0
        },
        label
      ),
      showEffects ? e(EffectsRow, { entity }) : null
    );
  }

  // src/ui/frames/BossInfo.ts
  function BossInfo(props) {
    const bosses = coopBosses(props.entities);
    return e(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: "4px", width: "100%" } },
      ...bosses.map(
        (boss) => e(ObservedUnit, {
          key: boss.id,
          entity: boss,
          hpColor: "red",
          fontSize: "24px",
          onSelect: (id) => {
            setXTarget(boss);
            props.setSelectedEntity(id);
          }
        })
      )
    );
  }

  // src/ui/frames/Enemies.ts
  function Enemies(props) {
    const enemies = aggroedMonsters(props.entities);
    const enemiesToSquash = [];
    const importantEnemies = [];
    for (let i = 0; i < enemies.length; i++) {
      if (shouldSquash(enemies[i].mtype)) enemiesToSquash.push(enemies[i]);
      else importantEnemies.push(enemies[i]);
    }
    const squashEnemiesCounts = {};
    for (let i = 0; i < enemiesToSquash.length; i++) {
      const mtype = enemiesToSquash[i].mtype || "?";
      squashEnemiesCounts[mtype] = (squashEnemiesCounts[mtype] || 0) + 1;
    }
    const maxEnemiesToShow = 10;
    const moreEnemiesCount = Math.max(0, importantEnemies.length - maxEnemiesToShow);
    const squashKeys = Object.keys(squashEnemiesCounts);
    return e(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          paddingTop: "4px"
        }
      },
      ...importantEnemies.slice(0, maxEnemiesToShow).map(
        (enemy) => {
          var _a;
          return e(
            "div",
            {
              key: enemy.id,
              style: {
                display: "flex",
                width: "100%",
                flexDirection: "column",
                textAlign: "left"
              }
            },
            e(
              "div",
              { style: { background: "black", position: "relative" } },
              e("div", {
                style: {
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  width: getPercent((enemy.hp || 0) / (enemy.max_hp || 1), 1),
                  background: "red"
                }
              }),
              e(
                "div",
                {
                  style: {
                    padding: "4px",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                    position: "relative",
                    textShadow: "0 0 2px black",
                    cursor: "pointer"
                  },
                  onClick: () => {
                    setXTarget(enemy);
                    props.setSelectedEntity(enemy.id);
                  }
                },
                `${(_a = enemy.level) != null ? _a : 1} ${enemy.name} #${enemy.id} (${getPercent((enemy.hp || 0) / (enemy.max_hp || 1), 1)})`
              )
            ),
            e(
              "div",
              { style: { background: "black" } },
              e("div", {
                style: {
                  background: "blue",
                  height: "4px",
                  width: getPercent((enemy.mp || 0) / (enemy.max_mp || 1), 1)
                }
              })
            )
          );
        }
      ),
      ...squashKeys.map(
        (enemyMtype) => e(
          "div",
          { key: enemyMtype, style: { background: "black" } },
          `also ${squashEnemiesCounts[enemyMtype]} aggroed ${enemyMtype}'s`
        )
      ),
      moreEnemiesCount ? e(
        "div",
        { style: { background: "black" } },
        `...and ${moreEnemiesCount} more aggroed enemies`
      ) : void 0
    );
  }

  // src/ui/chrome/GearGrid.ts
  var GEAR_SLOTS = [
    "helmet",
    "earring1",
    "earring2",
    "amulet",
    "chest",
    "cape",
    "pants",
    "shoes",
    "gloves",
    "belt",
    "ring1",
    "ring2",
    "orb",
    "mainhand",
    "offhand",
    "elixir"
  ];
  function tradeSlotNames(slots) {
    const names = [];
    const keys = Object.keys(slots);
    for (let i = 0; i < keys.length; i++) {
      if (keys[i].indexOf("trade") === 0 && slots[keys[i]]) {
        names.push(keys[i]);
      }
    }
    names.sort((a, b) => {
      const na = parseInt(a.replace("trade", ""), 10) || 0;
      const nb = parseInt(b.replace("trade", ""), 10) || 0;
      return na - nb;
    });
    return names;
  }
  function SlotCell(props) {
    const { slotName, slot, showPrice } = props;
    const skin = slotSkin(slot);
    let content = e(
      "div",
      {
        style: {
          width: "40px",
          height: "40px",
          background: "#222",
          border: "1px solid #444",
          fontSize: "9px",
          color: "#666",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }
      },
      slotName.replace("trade", "t")
    );
    if (slot && skin) {
      const html = itemContainer({ skin, size: 40, slot: slotName }, slot);
      if (html) {
        content = e("div", {
          style: { display: "inline-block" },
          dangerouslySetInnerHTML: { __html: html }
        });
      } else {
        content = e(
          "div",
          {
            style: {
              width: "40px",
              height: "40px",
              background: "#333",
              border: "1px solid #666",
              fontSize: "9px",
              padding: "2px"
            },
            title: slot.name
          },
          slot.name,
          slot.level != null ? ` +${slot.level}` : ""
        );
      }
    }
    return e(
      "div",
      {
        key: slotName,
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "2px"
        }
      },
      content,
      showPrice && (slot == null ? void 0 : slot.price) != null ? e(
        "div",
        { style: { fontSize: "10px", color: "#ffd700" } },
        String(slot.price)
      ) : null
    );
  }
  function GearGrid(props) {
    const slots = props.entity.slots;
    if (!slots) return null;
    const tradeNames = tradeSlotNames(slots);
    return e(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: "6px" } },
      e(
        "div",
        {
          style: {
            display: "flex",
            flexWrap: "wrap",
            gap: "4px"
          }
        },
        ...GEAR_SLOTS.map(
          (name) => e(SlotCell, { key: name, slotName: name, slot: slots[name] })
        )
      ),
      tradeNames.length ? e(
        "div",
        {
          style: {
            display: "flex",
            flexWrap: "wrap",
            gap: "4px",
            borderTop: "1px solid #444",
            paddingTop: "4px"
          }
        },
        ...tradeNames.map(
          (name) => e(SlotCell, {
            key: name,
            slotName: name,
            slot: slots[name],
            showPrice: true
          })
        )
      ) : null
    );
  }

  // src/ui/frames/EntityInfo.ts
  function EntityInfo(props) {
    var _a, _b, _c, _d;
    const entity = findEntity(props.entities, props.selectedEntity);
    if (!entity) return null;
    return e(
      "span",
      {
        style: {
          display: "inline-flex",
          overflow: "auto",
          flexDirection: "column",
          margin: "4px",
          border: "2px double gray",
          background: "black",
          gap: "2px",
          padding: "4px",
          maxHeight: "280px"
        },
        onClick: () => setXTarget(entity)
      },
      e(
        "div",
        {},
        `${entity.name}${(entity == null ? void 0 : entity.mtype) ? ` (${entity.mtype})` : ""}, lvl ${(_a = entity.level) != null ? _a : 1}${entity.type === "monster" ? ` #${entity.id}` : ""}`
      ),
      entity.ctype ? e("div", {}, `Class: ${entity.ctype}`) : void 0,
      entity.age ? e("div", {}, `Age: ${entity.age}`) : void 0,
      entity.party ? e("div", {}, `Party: ${entity.party}`) : void 0,
      e("br"),
      e("div", {}, `HP: ${entity.hp} / ${entity.max_hp}`),
      e("div", {}, `MP: ${entity.mp} / ${entity.max_mp}`),
      entity.heal ? e("div", {}, `Heal: ${entity.heal}`) : void 0,
      entity.attack ? e(
        "div",
        {},
        `Attack: ${entity.attack} ${(_b = entity == null ? void 0 : entity.damage_type) != null ? _b : ""}`
      ) : void 0,
      e("div", {}, `Armor: ${(_c = entity.armor) != null ? _c : 0}`),
      e("div", {}, `Resistance: ${(_d = entity.resistance) != null ? _d : 0}`),
      entity.evasion ? e("div", {}, `Evasion: ${getPercent(entity.evasion / 100, 2)}`) : void 0,
      entity.reflection ? e(
        "div",
        {},
        `Reflection: ${getPercent(entity.reflection / 100, 2)}`
      ) : void 0,
      e("br"),
      entity.speed != null ? e("div", {}, `Speed: ${entity.speed.toFixed(2)}`) : void 0,
      entity.frequency != null ? e("div", {}, `Frequency: ${entity.frequency.toFixed(2)}`) : void 0,
      entity.slots ? e(GearGrid, { entity }) : null
    );
  }

  // src/geometry/combat.ts
  function distance(a, b) {
    if (!a || !b) return void 0;
    return simpleDistance(a, b);
  }
  function outOfRange(observer, target) {
    if (!observer || !target) return void 0;
    const range = observer.range;
    if (range == null) return void 0;
    const d = distance(observer, target);
    if (d == null) return void 0;
    return d > range;
  }
  function difficultyBadge(monster) {
    if (!monster || monster.type !== "monster") return void 0;
    const level = calculateDifficulty(monster);
    if (level >= 2) return { level, label: "Hard", color: "#ff4444" };
    if (level === 1) return { level, label: "Med", color: "#ffaa00" };
    return { level, label: "Easy", color: "#66cc66" };
  }

  // src/ui/frames/PlayerRow.ts
  function PlayerRow(props) {
    const { observing, target } = props;
    const dps = getDps();
    let targetTrailing = null;
    if (target) {
      const hpPct = getPercent((target.hp || 0) / (target.max_hp || 1), 1);
      const ttk = estimateTtk(target.hp, dps);
      const dist = distance(observing, target);
      const oor = outOfRange(observing, target);
      const diff = difficultyBadge(target);
      const parts = [hpPct];
      if (ttk != null) parts.push(`TTK ${formatTime(ttk)}`);
      if (dist != null) parts.push(`${Math.round(dist)}`);
      if (oor) parts.push("OOR");
      if (diff) parts.push(diff.label);
      targetTrailing = parts.join(" \xB7 ");
    }
    return e(
      "div",
      {
        style: {
          display: "flex",
          gap: "16px"
        }
      },
      e(
        "div",
        { style: { width: "55%" } },
        observing ? e(ObservedUnit, {
          entity: observing,
          hpColor: classColors[observing.ctype || ""] || "#666",
          fontSize: "24px",
          onSelect: (id) => {
            setXTarget(observing);
            props.setSelectedEntity(id);
          }
        }) : void 0
      ),
      e(
        "div",
        { style: { width: "45%" } },
        target ? e(ObservedUnit, {
          entity: target,
          hpColor: classColors[target.ctype || ""] || "red",
          fontSize: "24px",
          trailing: targetTrailing,
          onSelect: (id) => {
            setXTarget(target);
            props.setSelectedEntity(id);
          }
        }) : void 0
      )
    );
  }

  // src/ui/frames/ThreatTable.ts
  function ThreatTable(props) {
    const byTarget = aggroByTarget(props.entities);
    const targetIds = Object.keys(byTarget);
    if (targetIds.length === 0) return null;
    targetIds.sort((a, b) => {
      if (a === props.observingId) return -1;
      if (b === props.observingId) return 1;
      return byTarget[b].length - byTarget[a].length;
    });
    return e(
      "div",
      {
        style: {
          display: "flex",
          overflow: "auto",
          flexDirection: "column",
          margin: "4px",
          border: "2px double gray",
          background: "black",
          gap: "2px",
          maxHeight: "160px",
          minWidth: "160px"
        }
      },
      e(
        "div",
        {
          style: {
            padding: "2px",
            whiteSpace: "nowrap",
            textShadow: "0 0 2px black"
          }
        },
        "Threat"
      ),
      ...targetIds.map((tid) => {
        const mobs = byTarget[tid];
        const target = findEntity(props.entities, tid);
        const name = (target == null ? void 0 : target.name) || tid;
        const counts = {};
        for (let i = 0; i < mobs.length; i++) {
          const mt = mobs[i].mtype || "?";
          counts[mt] = (counts[mt] || 0) + 1;
        }
        const summary = Object.keys(counts).map((mt) => `${counts[mt]}\xD7${mt}`).join(", ");
        return e(
          "div",
          {
            key: tid,
            style: {
              padding: "2px 4px",
              display: "flex",
              justifyContent: "space-between",
              gap: "8px",
              fontSize: "12px",
              background: tid === props.observingId ? "rgba(80,0,0,0.5)" : void 0
            }
          },
          e("span", {}, name),
          e("span", { style: { color: "#ccc" } }, `${mobs.length} (${summary})`)
        );
      })
    );
  }

  // src/ui/frames/KillKpiPanel.ts
  function KillKpiPanel() {
    const stats = getStats();
    if (stats.total === 0) return null;
    return e(
      "div",
      {
        style: {
          display: "flex",
          overflow: "auto",
          flexDirection: "column",
          margin: "4px",
          border: "2px double gray",
          background: "black",
          gap: "2px",
          maxHeight: "140px",
          minWidth: "140px"
        }
      },
      e(
        "div",
        {
          style: {
            padding: "2px",
            whiteSpace: "nowrap",
            textShadow: "0 0 2px black"
          }
        },
        `Kills: ${stats.total}`
      ),
      ...stats.byMtype.slice(0, 12).map(
        (row) => e(
          "div",
          {
            key: row.mtype,
            style: {
              padding: "2px 4px",
              display: "flex",
              justifyContent: "space-between",
              fontSize: "12px"
            }
          },
          e("span", {}, row.mtype),
          e("span", {}, String(row.count))
        )
      )
    );
  }

  // src/ui/frames/CommUI.ts
  function toggleButton(label, visible, onClick, last) {
    return e(
      "button",
      {
        style: {
          cursor: "pointer",
          padding: "2px 4px",
          fontSize: "12px",
          margin: last ? "0 10px 5px 0" : "0 0 5px 0"
        },
        onClick
      },
      `${label}: ${visible ? "HIDE" : "SHOW"}`
    );
  }
  function CommUI(props) {
    const React = getReact();
    const snap = props.snap;
    const [isVisiblePdps, setIsVisiblePdps] = React.useState(true);
    const [isVisibleCoopV1, setIsVisibleCoopV1] = React.useState(true);
    const [isVisibleCoopV2, setIsVisibleCoopV2] = React.useState(true);
    const [isVisibleHitDps, setIsVisibleHitDps] = React.useState(true);
    const [isVisibleThreat, setIsVisibleThreat] = React.useState(true);
    const [isVisibleKills, setIsVisibleKills] = React.useState(true);
    const [selectedEntity, setSelectedEntity] = React.useState(void 0);
    React.useEffect(() => {
      updateSeenMtypes(snap.entities);
    }, [snap.entities]);
    const pdpsRows = buildPdpsRows(snap.entities);
    const coopV1Rows = buildCoopV1Rows(snap.entities);
    const coopV2Rows = buildCoopV2Rows(snap.entities);
    const hitDpsRows = buildHitDpsRows(snap.entities, snap.now);
    return e(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          height: "100%"
        }
      },
      e(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            flexGrow: 1
          }
        },
        e(
          "div",
          { style: { width: "376px" } },
          e(Players, {
            entities: snap.entities,
            setSelectedEntity
          })
        ),
        e(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              flex: 1,
              padding: "4px 16px"
            }
          },
          e(ServerInfo, {
            S: snap.S,
            serverRegion: snap.serverRegion,
            serverIdentifier: snap.serverIdentifier
          }),
          e(MapInfo, { entities: snap.entities }),
          e(CryptProgress, { entities: snap.entities }),
          e(BossInfo, {
            entities: snap.entities,
            setSelectedEntity
          })
        ),
        e(
          "div",
          {
            style: {
              width: "calc(376px - 134px)",
              textAlign: "right",
              paddingRight: "134px"
            }
          },
          e(Enemies, {
            entities: snap.entities,
            setSelectedEntity
          })
        )
      ),
      e(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexGrow: 1
          }
        },
        e(
          "div",
          {
            style: {
              width: "376px",
              paddingBottom: "28px"
            }
          },
          e(EntityInfo, {
            entities: snap.entities,
            selectedEntity
          }),
          isVisibleKills ? e(KillKpiPanel) : null
        ),
        e(
          "div",
          {
            style: {
              flex: "1 1 0%",
              padding: "4px 16px 168px"
            }
          },
          e(PlayerRow, {
            observing: snap.observing,
            target: snap.target,
            setSelectedEntity
          })
        ),
        isVisibleThreat ? e(
          "div",
          { style: { width: "200px", paddingBottom: "12px" } },
          e(ThreatTable, {
            entities: snap.entities,
            observingId: snap.observingId
          })
        ) : null,
        isVisiblePdps ? e(
          "div",
          { style: { width: "200px", paddingBottom: "12px" } },
          e(RankMeter, {
            title: "PDPS",
            className: "PdpsMeter",
            rows: pdpsRows
          })
        ) : null,
        isVisibleHitDps ? e(
          "div",
          { style: { width: "200px", paddingBottom: "12px" } },
          e(RankMeter, {
            title: "Hit DPS",
            className: "HitDpsMeter",
            rows: hitDpsRows
          })
        ) : null,
        isVisibleCoopV1 ? e(
          "div",
          { style: { width: "200px", paddingBottom: "12px" } },
          e(RankMeter, {
            title: "s.coop v1",
            rows: coopV1Rows
          })
        ) : null,
        isVisibleCoopV2 ? e(
          "div",
          { style: { width: "200px", paddingBottom: "12px" } },
          e(RankMeter, {
            title: "s.coop v2",
            className: "CoopContributionMeterV2",
            rows: coopV2Rows
          })
        ) : null
      ),
      e(
        "div",
        {
          style: {
            height: "30px",
            flexShrink: 0,
            flexGrow: 0,
            width: "100%",
            flexDirection: "row",
            justifyContent: "flex-end",
            display: "flex",
            gap: "8px"
          }
        },
        toggleButton(
          "Pdps",
          isVisiblePdps,
          () => setIsVisiblePdps(!isVisiblePdps)
        ),
        toggleButton(
          "Hit DPS",
          isVisibleHitDps,
          () => setIsVisibleHitDps(!isVisibleHitDps)
        ),
        toggleButton(
          "Threat",
          isVisibleThreat,
          () => setIsVisibleThreat(!isVisibleThreat)
        ),
        toggleButton(
          "Kills",
          isVisibleKills,
          () => setIsVisibleKills(!isVisibleKills)
        ),
        toggleButton(
          "Coop V1",
          isVisibleCoopV1,
          () => setIsVisibleCoopV1(!isVisibleCoopV1)
        ),
        toggleButton(
          "Coop V2",
          isVisibleCoopV2,
          () => setIsVisibleCoopV2(!isVisibleCoopV2),
          true
        )
      )
    );
  }

  // src/main.ts
  var POPUP_CSS = `
/* Popup container */
.popup {
  position: relative;
  display: inline;
  cursor: pointer;
}

/* The actual popup (appears on top) */
.popup .popuptext {
  visibility: hidden;
  width: 160px;
  background-color: #555;
  color: #fff;
  text-align: center;
  border-radius: 6px;
  padding: 8px 0;
  position: absolute;
  z-index: 1;
  bottom: 125%;
  left: 50%;
  margin-left: -80px;
}

/* Popup arrow */
.popup .popuptext::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -5px;
  border-width: 5px;
  border-style: solid;
  border-color: #555 transparent transparent transparent;
}

/* Toggle this class when clicking on the popup container (hide and show the popup) */
.popup .show {
  visibility: visible;
  -webkit-animation: fadeIn 1s;
  animation: fadeIn 1s
}

/* Add animation (fade in the popup) */
@-webkit-keyframes fadeIn {
  from {opacity: 0;}
  to {opacity: 1;}
}

@keyframes fadeIn {
  from {opacity: 0;}
  to {opacity:1 ;}
}
`;
  var PROGRESS_CSS = `
progress.comm-ui-hp-bar {
  border-radius: 0;
  height: 1em;
}
progress.comm-ui-hp-bar::-webkit-progress-bar {
  background-color: gray;
}
progress.comm-ui-hp-bar::-webkit-progress-value {
  background-color: red;
}
progress.comm-ui-mp-bar {
  border-radius: 0;
  height: 1em;
}
progress.comm-ui-mp-bar::-webkit-progress-bar {
  background-color: gray;
}
progress.comm-ui-mp-bar::-webkit-progress-value {
  background-color: blue;
}
`;
  function injectCss(id, css) {
    if (document.querySelector(`#${id}`)) return;
    const style = document.createElement("style");
    style.id = id;
    style.innerText = css;
    document.head.append(style);
  }
  function ensureReact(onReady) {
    if (window.React && window.ReactDOM) {
      onReady();
      return;
    }
    if (!document.querySelector("#react")) {
      const reactScript = document.createElement("script");
      reactScript.id = "react";
      reactScript.src = "https://unpkg.com/react@18/umd/react.development.js";
      reactScript.crossOrigin = "";
      document.head.append(reactScript);
    }
    const existingDom = document.querySelector("#react-dom");
    if (!existingDom) {
      const reactDomScript = document.createElement("script");
      reactDomScript.id = "react-dom";
      reactDomScript.src = "https://unpkg.com/react-dom@18/umd/react-dom.development.js";
      reactDomScript.crossOrigin = "";
      reactDomScript.addEventListener("load", onReady);
      document.head.append(reactDomScript);
    } else {
      existingDom.addEventListener("load", onReady);
    }
  }
  function Root() {
    const React = getReact();
    const [snap, setSnap] = React.useState(null);
    React.useEffect(() => {
      const stopTick = startTick((s) => setSnap(s));
      return () => stopTick();
    }, []);
    if (!snap) return null;
    return e(CommUI, { snap });
  }
  function onLoad() {
    injectCss("comm-copy-popup-css", POPUP_CSS);
    injectCss("comm-ui-css", PROGRESS_CSS);
    startSocketHub();
    startCryptTracker();
    startCombatMeter();
    startSessionKills();
    let domContainer = document.querySelector("#comm-ui");
    if (!domContainer) {
      domContainer = document.createElement("div");
      domContainer.id = "comm-ui";
      domContainer.style.zIndex = "10";
      domContainer.style.position = "fixed";
      domContainer.style.width = "100%";
      domContainer.style.height = "100%";
      document.body.append(domContainer);
    }
    const ReactDOM = getReactDOM();
    const root = ReactDOM.createRoot(domContainer);
    root.render(e(Root));
    const bottom = document.getElementById("bottom");
    if (bottom) {
      bottom.style.pointerEvents = "none";
    }
  }
  (function bootstrap() {
    "use strict";
    ensureReact(onLoad);
  })();
})();
