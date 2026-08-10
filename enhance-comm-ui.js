// ==UserScript==
// @name         Adventure.land COMM UI Enhancement
// @namespace    http://tampermonkey.net/
// @version      0.7
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
  function findEntityById(id) {
    if (id == null || id === "") return void 0;
    const tid = String(id);
    const raw = window.entities;
    if (!raw) return void 0;
    const list = Array.isArray(raw) ? raw.filter(Boolean) : Object.values(raw);
    let deadMatch;
    for (let i = 0; i < list.length; i++) {
      const ent = list[i];
      if (!ent || String(ent.id) !== tid) continue;
      if (!ent.dead) return ent;
      if (!deadMatch) deadMatch = ent;
    }
    if (!Array.isArray(raw)) {
      const byKey = raw[tid];
      if (byKey && String(byKey.id) === tid) {
        if (!byKey.dead) return byKey;
        if (!deadMatch) deadMatch = byKey;
      }
    }
    return deadMatch;
  }
  function getObserving() {
    const snap = window.observing;
    if (snap == null) return snap;
    if (snap.id != null) {
      const live = findEntityById(snap.id);
      if (live) return live;
    }
    return snap;
  }
  function getObservingId() {
    const obs = getObserving();
    return (obs == null ? void 0 : obs.id) != null ? String(obs.id) : void 0;
  }
  function getS() {
    return window.S;
  }
  function getSocket() {
    return window.socket;
  }
  function emitObserverCommand(code) {
    const sock = getSocket();
    if (!sock || typeof sock.emit !== "function") return false;
    const trimmed = String(code || "").trim();
    if (!trimmed) return false;
    sock.emit("o:command", trimmed);
    return true;
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
  var listeners = /* @__PURE__ */ new Set();
  var intervalId = null;
  function resolveTarget(observing) {
    if (observing == null || observing.target == null || observing.target === "") {
      return void 0;
    }
    const ent = findEntityById(observing.target);
    if (!ent || ent.dead) return void 0;
    return ent;
  }
  function buildSnapshot() {
    const entities = getEntitiesList();
    const observing = getObserving();
    const observingId = (observing == null ? void 0 : observing.id) != null ? String(observing.id) : getObservingId();
    return {
      entities,
      observingId,
      observing,
      target: resolveTarget(observing),
      S: getS(),
      serverRegion: getServerRegion(),
      serverIdentifier: getServerIdentifier(),
      now: Date.now()
    };
  }
  function ensureInterval() {
    if (intervalId != null) return;
    const tick = () => {
      const snap = buildSnapshot();
      const cbs = Array.from(listeners);
      for (let i = 0; i < cbs.length; i++) {
        try {
          cbs[i](snap);
        } catch (e2) {
        }
      }
    };
    tick();
    intervalId = window.setInterval(tick, INTERVAL_MS);
  }
  function maybeStopInterval() {
    if (listeners.size > 0 || intervalId == null) return;
    window.clearInterval(intervalId);
    intervalId = null;
  }
  function subscribeTick(cb) {
    listeners.add(cb);
    ensureInterval();
    return () => {
      listeners.delete(cb);
      maybeStopInterval();
    };
  }
  function startTick(cb) {
    return subscribeTick(cb);
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
      source: data.source != null ? String(data.source) : void 0,
      splash: !!data.splash,
      damageType: data.damage_type != null ? String(data.damage_type) : void 0,
      evade: !!data.evade,
      miss: !!data.miss,
      at,
      raw: data
    };
    if (data.heal !== void 0) {
      ev.heal = Math.abs(Number(data.heal) || 0);
    }
    if (data.damage !== void 0) {
      ev.damage = Math.abs(Number(data.damage) || 0);
    }
    if (data.lifesteal) ev.lifesteal = Math.abs(Number(data.lifesteal) || 0);
    if (data.manasteal) ev.manasteal = Math.abs(Number(data.manasteal) || 0);
    if (data.dreturn) ev.dreturn = Math.abs(Number(data.dreturn) || 0);
    if (data.reflect && typeof data.reflect === "number") {
      ev.reflect = Math.abs(data.reflect);
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

  // src/meters/combatChannels.ts
  var COMBAT_CHANNELS = [
    "dps",
    "base",
    "blast",
    "burn",
    "cleave",
    "hps",
    "mps",
    "dr",
    "reflect"
  ];
  var CHANNEL_LABELS = {
    dps: "DPS",
    base: "Base",
    blast: "Blast",
    burn: "Burn",
    cleave: "Cleave",
    hps: "HPS",
    mps: "MPS",
    dr: "DR",
    reflect: "RF"
  };
  var CHANNEL_COLORS = {
    dps: "#E53935",
    base: "#6D1B7B",
    blast: "#FB8C00",
    burn: "#FDD835",
    cleave: "#8D6E63",
    hps: "#43A047",
    mps: "#1E88E5",
    dr: "#546E7A",
    reflect: "#26A69A"
  };

  // src/meters/partyCombat.ts
  var COMBAT_BREAK_MS = 12e3;
  var HISTORY_MS = 5e3;
  var MAX_HISTORY = 60;
  var players = {};
  var vitalsShadow = {};
  var history = [];
  var lastHistoryAt = 0;
  var sessionStartedAt = 0;
  var lastCombatAt = 0;
  var unsub2 = null;
  var playerMeta = {};
  var watchedPartyIds = /* @__PURE__ */ new Set();
  var watchedPartyKey = "";
  var visiblePlayerIds = /* @__PURE__ */ new Set();
  function soloKey(id, name) {
    return `solo:${name || id}`;
  }
  function partyKeyFor(ent, id) {
    if (!ent) return soloKey(id);
    if (ent.party) return ent.party;
    return soloKey(id, ent.name);
  }
  function rate(sum, now) {
    if (!sessionStartedAt) return 0;
    const elapsed = Math.max(now - sessionStartedAt, 1e3);
    return sum * 1e3 / elapsed;
  }
  function channelRate(p, ch, now) {
    switch (ch) {
      case "dps":
        return rate(p.dealt, now);
      case "base":
        return rate(p.base, now);
      case "blast":
        return rate(p.blast, now);
      case "burn":
        return rate(p.burn, now);
      case "cleave":
        return rate(p.cleave, now);
      case "hps":
        return rate(p.heal, now);
      case "mps":
        return rate(p.mana, now);
      case "dr":
        return rate(p.dr, now);
      case "reflect":
        return rate(p.reflect, now);
      default: {
        const _exhaustive = ch;
        return _exhaustive;
      }
    }
  }
  function ensurePlayer(id) {
    let p = players[id];
    if (!p) {
      const meta = playerMeta[id];
      p = {
        dealt: 0,
        base: 0,
        blast: 0,
        burn: 0,
        cleave: 0,
        heal: 0,
        mana: 0,
        dr: 0,
        reflect: 0,
        name: (meta == null ? void 0 : meta.name) || id,
        ctype: meta == null ? void 0 : meta.ctype,
        partyKey: (meta == null ? void 0 : meta.partyKey) || soloKey(id)
      };
      players[id] = p;
    }
    return p;
  }
  function isPlayerId(id) {
    if (!id) return false;
    if (playerMeta[id]) return true;
    const ent = getEntitiesRecord()[id];
    if (ent) {
      return !!(ent.player || ent.type === "character");
    }
    return !/^\d+$/.test(id);
  }
  function syncShadowFromEntity(id, ent) {
    if (!ent) return;
    const maxHp = ent.max_hp || 0;
    const maxMp = ent.max_mp || 0;
    if (!(maxHp > 0) && !(maxMp > 0)) return;
    vitalsShadow[id] = {
      hp: ent.hp != null ? ent.hp : maxHp,
      maxHp,
      mp: ent.mp != null ? ent.mp : maxMp,
      maxMp
    };
  }
  function ensureShadow(id) {
    let s = vitalsShadow[id];
    if (s) return s;
    const ent = getEntitiesRecord()[id];
    if (!ent) return null;
    syncShadowFromEntity(id, ent);
    return vitalsShadow[id] || null;
  }
  function effectiveGain(id, amount, kind) {
    if (!(amount > 0)) return 0;
    const live = getEntitiesRecord()[id];
    const s = ensureShadow(id);
    if (kind === "hp") {
      const maxHp = s && s.maxHp || (live == null ? void 0 : live.max_hp) || 0;
      if (!(maxHp > 0)) return amount;
      const liveHp = live == null ? void 0 : live.hp;
      const shadowHp = s ? s.hp : void 0;
      let hp;
      if (liveHp != null && shadowHp != null) hp = Math.min(liveHp, shadowHp);
      else if (shadowHp != null) hp = shadowHp;
      else if (liveHp != null) hp = liveHp;
      else return amount;
      const missing2 = Math.max(0, maxHp - hp);
      const gained2 = Math.min(amount, missing2);
      const next2 = Math.min(maxHp, hp + gained2);
      if (s) {
        s.hp = next2;
        s.maxHp = maxHp;
      } else {
        vitalsShadow[id] = {
          hp: next2,
          maxHp,
          mp: (live == null ? void 0 : live.mp) || 0,
          maxMp: (live == null ? void 0 : live.max_mp) || 0
        };
      }
      return gained2;
    }
    const maxMp = s && s.maxMp || (live == null ? void 0 : live.max_mp) || 0;
    if (!(maxMp > 0)) return amount;
    const liveMp = live == null ? void 0 : live.mp;
    const shadowMp = s ? s.mp : void 0;
    let mp;
    if (liveMp != null && shadowMp != null) mp = Math.min(liveMp, shadowMp);
    else if (shadowMp != null) mp = shadowMp;
    else if (liveMp != null) mp = liveMp;
    else return amount;
    const missing = Math.max(0, maxMp - mp);
    const gained = Math.min(amount, missing);
    const next = Math.min(maxMp, mp + gained);
    if (s) {
      s.mp = next;
      s.maxMp = maxMp;
    } else {
      vitalsShadow[id] = {
        hp: (live == null ? void 0 : live.hp) || 0,
        maxHp: (live == null ? void 0 : live.max_hp) || 0,
        mp: next,
        maxMp
      };
    }
    return gained;
  }
  function applyDamageToShadow(id, damage) {
    if (!(damage > 0)) return;
    const s = ensureShadow(id);
    if (!s || !(s.maxHp > 0)) return;
    s.hp = Math.max(0, s.hp - damage);
  }
  function noteCombatActivity(now) {
    if (sessionStartedAt && lastCombatAt && now - lastCombatAt > COMBAT_BREAK_MS) {
      resetPartyCombat();
    }
    lastCombatAt = now;
    if (!sessionStartedAt) sessionStartedAt = now;
  }
  function onEvent2(ev) {
    const now = ev.at;
    const actorIsPlayer = isPlayerId(ev.actor);
    const targetIsPlayer = isPlayerId(ev.target);
    const hasCombatSignal = !!(ev.damage && ev.damage > 0) || !!(ev.heal && ev.heal > 0) || !!(ev.lifesteal && ev.lifesteal > 0) || !!(ev.manasteal && ev.manasteal > 0) || !!(ev.dreturn && ev.dreturn > 0) || !!(ev.reflect && ev.reflect > 0);
    if (!hasCombatSignal) return;
    const relevant = actorIsPlayer && !!ev.actor || targetIsPlayer && (!!ev.dreturn || !!ev.reflect);
    if (relevant) noteCombatActivity(now);
    if (ev.dreturn && targetIsPlayer && ev.target && !actorIsPlayer) {
      ensurePlayer(ev.target).dr += ev.dreturn;
    }
    if (ev.reflect && targetIsPlayer && ev.target && !actorIsPlayer) {
      ensurePlayer(ev.target).reflect += ev.reflect;
    }
    if (ev.damage && ev.damage > 0 && ev.target && targetIsPlayer) {
      applyDamageToShadow(ev.target, ev.damage);
    }
    if (!ev.actor || !actorIsPlayer) return;
    const p = ensurePlayer(ev.actor);
    if (ev.heal && ev.heal > 0 && ev.target) {
      p.heal += effectiveGain(ev.target, ev.heal, "hp");
    }
    if (ev.lifesteal && ev.lifesteal > 0) {
      p.heal += effectiveGain(ev.actor, ev.lifesteal, "hp");
    }
    if (ev.manasteal && ev.manasteal > 0) {
      p.mana += effectiveGain(ev.actor, ev.manasteal, "mp");
    }
    if (ev.damage && ev.damage > 0) {
      p.dealt += ev.damage;
      if (ev.source === "burn") p.burn += ev.damage;
      else if (ev.splash) p.blast += ev.damage;
      else if (ev.source === "cleave") p.cleave += ev.damage;
      else p.base += ev.damage;
    }
    maybeSampleHistory(now);
  }
  function maybeSampleHistory(now) {
    if (now - lastHistoryAt < HISTORY_MS) return;
    lastHistoryAt = now;
    const parties = {};
    const ids = Object.keys(players);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const p = players[id];
      const key = p.partyKey;
      if (!parties[key]) parties[key] = {};
      const bucket = parties[key];
      for (let c = 0; c < COMBAT_CHANNELS.length; c++) {
        const ch = COMBAT_CHANNELS[c];
        bucket[ch] = (bucket[ch] || 0) + channelRate(p, ch, now);
      }
    }
    history.push({ at: now, parties });
    while (history.length > MAX_HISTORY) history.shift();
  }
  function updateCombatContext(entities) {
    const observing = getObserving();
    const observingId = getObservingId();
    const nextMeta = {};
    const nextWatched = /* @__PURE__ */ new Set();
    const now = Date.now();
    if (sessionStartedAt && lastCombatAt && now - lastCombatAt > COMBAT_BREAK_MS) {
      resetPartyCombat();
    }
    if (observingId && observing) {
      nextWatched.add(String(observingId));
      watchedPartyKey = observing.party || soloKey(String(observingId), observing.name);
      if (observing.party) {
        for (let i = 0; i < entities.length; i++) {
          const ent = entities[i];
          if (ent.player && ent.party === observing.party) {
            nextWatched.add(String(ent.id));
          }
        }
      }
    } else {
      watchedPartyKey = "";
    }
    watchedPartyIds = nextWatched;
    const nextVisible = /* @__PURE__ */ new Set();
    for (let i = 0; i < entities.length; i++) {
      const ent = entities[i];
      if (!ent.player || !ent.id) continue;
      const id = String(ent.id);
      nextVisible.add(id);
      nextMeta[id] = {
        name: ent.name || id,
        ctype: ent.ctype,
        partyKey: partyKeyFor(ent, id)
      };
      syncShadowFromEntity(id, ent);
      if (players[id]) {
        players[id].name = nextMeta[id].name;
        players[id].ctype = nextMeta[id].ctype;
        players[id].partyKey = nextMeta[id].partyKey;
      }
    }
    visiblePlayerIds = nextVisible;
    playerMeta = nextMeta;
  }
  function startPartyCombat() {
    if (!unsub2) unsub2 = onDamage(onEvent2);
    return () => {
      if (unsub2) {
        unsub2();
        unsub2 = null;
      }
    };
  }
  function resetPartyCombat() {
    const keys = Object.keys(players);
    for (let i = 0; i < keys.length; i++) delete players[keys[i]];
    history.length = 0;
    lastHistoryAt = 0;
    sessionStartedAt = 0;
    lastCombatAt = 0;
  }
  function includePlayer(id, scope) {
    if (scope === "all") return true;
    if (scope === "visible") return visiblePlayerIds.has(id);
    if (!watchedPartyIds.size) return false;
    return watchedPartyIds.has(id);
  }
  function listPartyKeys(scope) {
    const set = /* @__PURE__ */ new Set();
    const ids = Object.keys(players);
    for (let i = 0; i < ids.length; i++) {
      if (!includePlayer(ids[i], scope)) continue;
      set.add(players[ids[i]].partyKey);
    }
    if (watchedPartyKey) set.add(watchedPartyKey);
    const out = Array.from(set);
    out.sort((a, b) => {
      if (a === watchedPartyKey) return -1;
      if (b === watchedPartyKey) return 1;
      return a.localeCompare(b);
    });
    return out;
  }
  function getWatchedPartyKey() {
    return watchedPartyKey;
  }
  function getCombatRows(scope, partyFilter) {
    const now = Date.now();
    const rows = [];
    const ids = Object.keys(players);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      if (!includePlayer(id, scope)) continue;
      const p = players[id];
      if (partyFilter && p.partyKey !== partyFilter) continue;
      const rates = {};
      for (let c = 0; c < COMBAT_CHANNELS.length; c++) {
        const ch = COMBAT_CHANNELS[c];
        rates[ch] = channelRate(p, ch, now);
      }
      rows.push({
        id,
        name: p.name,
        ctype: p.ctype,
        partyKey: p.partyKey,
        rates
      });
    }
    rows.sort((a, b) => b.rates.dps - a.rates.dps);
    return rows;
  }
  function buildCombatBarRows(scope, channel, partyFilter) {
    const rows = getCombatRows(scope, partyFilter);
    let max = 0;
    for (let i = 0; i < rows.length; i++) {
      max = Math.max(max, rows[i].rates[channel] || 0);
    }
    return rows.filter((r) => (r.rates[channel] || 0) > 0).map((r) => ({
      id: r.id,
      name: r.name,
      ctype: r.ctype,
      value: r.rates[channel] || 0,
      barMax: max || 1,
      label: Math.round(r.rates[channel] || 0).toLocaleString()
    }));
  }
  function getCombatHistory() {
    return history;
  }
  function getCombatSessionStartedAt() {
    return sessionStartedAt;
  }
  function getPartyTotals(scope, partyFilter) {
    const rows = getCombatRows(scope, partyFilter);
    const out = {};
    for (let c = 0; c < COMBAT_CHANNELS.length; c++) {
      out[COMBAT_CHANNELS[c]] = 0;
    }
    for (let i = 0; i < rows.length; i++) {
      for (let c = 0; c < COMBAT_CHANNELS.length; c++) {
        const ch = COMBAT_CHANNELS[c];
        out[ch] += rows[i].rates[ch] || 0;
      }
    }
    return out;
  }

  // src/lib/layout.ts
  var PANEL_IDS = [
    "players",
    "enemies",
    "topCenter",
    "paperdoll",
    "buffInfo",
    "itemInfo",
    "kills",
    "combat",
    "playerFrame",
    "targetFrame",
    "bossBar",
    "threat",
    "pdps",
    "hitDps",
    "coopV1",
    "coopV2",
    "command",
    "bag",
    "toggles"
  ];
  var PANEL_LABELS = {
    players: "Players",
    enemies: "Enemies",
    topCenter: "Server / Map",
    paperdoll: "Paperdoll",
    buffInfo: "Buff info",
    itemInfo: "Item info",
    kills: "Kills",
    combat: "Combat",
    playerFrame: "Player frame",
    targetFrame: "Target frame",
    bossBar: "Boss bar",
    threat: "Threat",
    pdps: "PDPS",
    hitDps: "Hit DPS",
    coopV1: "Coop V1",
    coopV2: "Coop V2",
    command: "Command",
    bag: "Bag",
    toggles: "Layout"
  };
  var DEFAULT_LAYOUT_DESKTOP = {
    players: { x: 0.4, y: 0.4, anchor: "tl" },
    enemies: { x: 99.6, y: 0.4, anchor: "tr" },
    topCenter: { x: 50, y: 0.4, anchor: "tc" },
    paperdoll: { x: 0.5, y: 30, anchor: "tl" },
    buffInfo: { x: 0.8, y: 10, anchor: "tl" },
    itemInfo: { x: 16.8, y: 10, anchor: "tl" },
    kills: { x: 27, y: 99.2, anchor: "br" },
    combat: { x: 95, y: 99.2, anchor: "br" },
    playerFrame: { x: 40.5, y: 86, anchor: "bc" },
    targetFrame: { x: 60, y: 86, anchor: "bc" },
    bossBar: { x: 50, y: 8, anchor: "tc" },
    threat: { x: 82, y: 75, anchor: "br" },
    pdps: { x: 78, y: 90, anchor: "tr" },
    hitDps: { x: 99.5, y: 50, anchor: "tr" },
    coopV1: { x: 91, y: 63, anchor: "tr" },
    coopV2: { x: 99.5, y: 63, anchor: "tr" },
    command: { x: 50, y: 42, anchor: "center" },
    bag: { x: 0.5, y: 99.2, anchor: "bl" },
    toggles: { x: 99.5, y: 99.2, anchor: "br" }
  };
  var DEFAULT_LAYOUT_TABLET = {
    players: { x: 0.5, y: 0.5, anchor: "tl" },
    enemies: { x: 99.5, y: 0.5, anchor: "tr" },
    topCenter: { x: 50, y: 0.5, anchor: "tc" },
    paperdoll: { x: 1, y: 28, anchor: "tl" },
    buffInfo: { x: 1, y: 12, anchor: "tl" },
    itemInfo: { x: 17, y: 12, anchor: "tl" },
    combat: { x: 99.2, y: 52, anchor: "tr" },
    kills: { x: 99.2, y: 72, anchor: "tr" },
    playerFrame: { x: 32, y: 78, anchor: "bc" },
    targetFrame: { x: 68, y: 78, anchor: "bc" },
    bossBar: { x: 50, y: 9, anchor: "tc" },
    pdps: { x: 99.2, y: 14, anchor: "tr" },
    hitDps: { x: 99.2, y: 28, anchor: "tr" },
    coopV1: { x: 0.8, y: 14, anchor: "tl" },
    coopV2: { x: 0.8, y: 28, anchor: "tl" },
    threat: { x: 99.2, y: 40, anchor: "tr" },
    command: { x: 50, y: 44, anchor: "center" },
    bag: { x: 0.8, y: 78, anchor: "bl" },
    toggles: { x: 99.2, y: 98.5, anchor: "br" }
  };
  var DEFAULT_LAYOUT_PHONE = {
    players: { x: 0.5, y: 0.5, anchor: "tl" },
    enemies: { x: 99.5, y: 0.5, anchor: "tr" },
    topCenter: { x: 50, y: 0.4, anchor: "tc" },
    paperdoll: { x: 50, y: 36, anchor: "center" },
    buffInfo: { x: 2, y: 14, anchor: "tl" },
    itemInfo: { x: 2, y: 36, anchor: "tl" },
    combat: { x: 50, y: 72, anchor: "bc" },
    kills: { x: 98, y: 58, anchor: "br" },
    playerFrame: { x: 28, y: 62, anchor: "bc" },
    targetFrame: { x: 72, y: 62, anchor: "bc" },
    bossBar: { x: 50, y: 10, anchor: "tc" },
    pdps: { x: 99, y: 16, anchor: "tr" },
    hitDps: { x: 99, y: 28, anchor: "tr" },
    coopV1: { x: 1, y: 16, anchor: "tl" },
    coopV2: { x: 1, y: 28, anchor: "tl" },
    threat: { x: 50, y: 48, anchor: "tc" },
    command: { x: 50, y: 42, anchor: "center" },
    bag: { x: 50, y: 88, anchor: "bc" },
    toggles: { x: 98, y: 98, anchor: "br" }
  };
  function defaultLayoutFor(profile) {
    switch (profile) {
      case "desktop":
        return DEFAULT_LAYOUT_DESKTOP;
      case "tablet":
        return DEFAULT_LAYOUT_TABLET;
      case "phone":
        return DEFAULT_LAYOUT_PHONE;
      default: {
        const _exhaustive = profile;
        return _exhaustive;
      }
    }
  }
  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }
  function normalizePos(raw, fallback) {
    if (!raw || typeof raw !== "object") return { ...fallback };
    const anchor = raw.anchor || fallback.anchor;
    const valid = [
      "tl",
      "tr",
      "bl",
      "br",
      "tc",
      "bc",
      "center"
    ];
    return {
      x: clamp(Number(raw.x), 0, 100) || 0,
      y: clamp(Number(raw.y), 0, 100) || 0,
      anchor: valid.indexOf(anchor) >= 0 ? anchor : fallback.anchor
    };
  }
  function mergeLayout(partial, profile = "desktop") {
    const defaults = defaultLayoutFor(profile);
    const out = {};
    for (let i = 0; i < PANEL_IDS.length; i++) {
      const id = PANEL_IDS[i];
      out[id] = normalizePos(partial && partial[id], defaults[id]);
    }
    return out;
  }
  function anchorTransform(anchor) {
    switch (anchor) {
      case "tl":
        return "translate(0, 0)";
      case "tr":
        return "translate(-100%, 0)";
      case "bl":
        return "translate(0, -100%)";
      case "br":
        return "translate(-100%, -100%)";
      case "tc":
        return "translate(-50%, 0)";
      case "bc":
        return "translate(-50%, -100%)";
      case "center":
        return "translate(-50%, -50%)";
      default: {
        const _exhaustive = anchor;
        return _exhaustive;
      }
    }
  }
  function panelStyle(pos, editing) {
    return {
      position: "absolute",
      left: `${pos.x}%`,
      top: `${pos.y}%`,
      transform: anchorTransform(pos.anchor),
      pointerEvents: "auto",
      zIndex: editing ? 40 : 20,
      // Hug children so layout chrome matches real frame footprints.
      width: "fit-content",
      height: "fit-content",
      maxWidth: "96vw",
      maxHeight: "96vh",
      boxSizing: "border-box"
    };
  }
  function deltaToPercent(dx, dy, containerW, containerH) {
    return {
      dxPct: containerW > 0 ? dx / containerW * 100 : 0,
      dyPct: containerH > 0 ? dy / containerH * 100 : 0
    };
  }
  function snapPercent(n, threshold = 2.2, peerValues) {
    const targets = [0, 50, 100];
    if (peerValues && peerValues.length) {
      for (let i = 0; i < peerValues.length; i++) {
        const v = peerValues[i];
        if (Number.isFinite(v)) targets.push(v);
      }
    }
    let best = n;
    let bestDist = threshold + 1;
    for (let i = 0; i < targets.length; i++) {
      const d = Math.abs(n - targets[i]);
      if (d < bestDist) {
        bestDist = d;
        best = targets[i];
      }
    }
    return bestDist <= threshold ? best : n;
  }
  function softAvoidOverlap(id, pos, others, nudge = 3.2) {
    const ids = Object.keys(others);
    let x = pos.x;
    let y = pos.y;
    for (let i = 0; i < ids.length; i++) {
      const otherId = ids[i];
      if (otherId === id) continue;
      const o = others[otherId];
      if (!o || o.anchor !== pos.anchor) continue;
      const dx = Math.abs(o.x - x);
      const dy = Math.abs(o.y - y);
      if (dx < nudge && dy < nudge) {
        if (dx <= dy) {
          x = clamp(o.x + (x >= o.x ? nudge : -nudge), 0, 100);
        } else {
          y = clamp(o.y + (y >= o.y ? nudge : -nudge), 0, 100);
        }
      }
    }
    if (x === pos.x && y === pos.y) return pos;
    return { ...pos, x, y };
  }

  // src/lib/viewport.ts
  var PHONE_MAX_WIDTH = 700;
  var TABLET_MAX_WIDTH = 1100;
  function detectViewportProfile(width, height) {
    const w = typeof width === "number" && width > 0 ? width : typeof window !== "undefined" ? window.innerWidth : 1280;
    const h = typeof height === "number" && height > 0 ? height : typeof window !== "undefined" ? window.innerHeight : 800;
    const short = Math.min(w, h);
    if (w <= PHONE_MAX_WIDTH || short <= 480 && w < 980) return "phone";
    if (w <= TABLET_MAX_WIDTH || short <= 820 && w < 1280) return "tablet";
    return "desktop";
  }
  function isTouchishProfile(profile) {
    return profile === "tablet" || profile === "phone";
  }
  var VIEWPORT_PROFILES = [
    "desktop",
    "tablet",
    "phone"
  ];
  function profileLabel(profile) {
    switch (profile) {
      case "desktop":
        return "Desktop";
      case "tablet":
        return "Tablet";
      case "phone":
        return "Phone";
      default: {
        const _exhaustive = profile;
        return _exhaustive;
      }
    }
  }

  // src/lib/settings.ts
  var KEY = "al-comm-ui-settings-v1";
  function resolvePartyFocus(focus, watchedPartyKey3) {
    if (focus === "all") {
      return { scope: "all", partyFilter: null, historyKey: null };
    }
    if (focus === "visible") {
      return { scope: "visible", partyFilter: null, historyKey: null };
    }
    if (focus === "watched") {
      const key = watchedPartyKey3 || null;
      return { scope: "watched", partyFilter: key, historyKey: key };
    }
    return { scope: "all", partyFilter: focus, historyKey: focus };
  }
  function effectivePartyFocus(focus, hasObserver) {
    if (!hasObserver && focus === "watched") return "visible";
    return focus;
  }
  function effectiveKillScope(scope, hasObserver) {
    if (!hasObserver && scope === "watched") return "all";
    return scope;
  }
  var CLOSABLE_PANEL_IDS = [
    "bossBar",
    "combat",
    "kills",
    "threat",
    "pdps",
    "hitDps",
    "coopV1",
    "coopV2",
    "command",
    "bag"
  ];
  var DEFAULT_PANEL_VISIBLE = {
    bossBar: true,
    combat: true,
    kills: true,
    threat: true,
    pdps: true,
    hitDps: false,
    coopV1: true,
    coopV2: true,
    command: false,
    /** Bag panel shell is always allowed; open/close follows inventory. */
    bag: true
  };
  var DEFAULT_COMMAND_SNIPPETS = [
    { id: "loot", name: "Loot", code: "loot()" },
    { id: "stop", name: "Stop move", code: "stop('move')" },
    {
      id: "say-hi",
      name: "Say hi",
      code: "say('hi')"
    }
  ];
  var DEFAULTS = {
    partyScope: "watched",
    killScope: "watched",
    combatView: "table",
    combatChannels: ["dps", "base", "blast", "burn", "hps"],
    barChannel: "dps",
    partyFocus: "watched",
    panelLayout: {},
    panelLayoutsByProfile: {},
    layoutProfileMode: "auto",
    panelVisible: { ...DEFAULT_PANEL_VISIBLE },
    commandSnippets: DEFAULT_COMMAND_SNIPPETS.slice(),
    commandDraft: "",
    combatCompact: false,
    bagOpenPreferred: false,
    panelOpacity: {}
  };
  function resolveLayoutProfile(mode, detected) {
    if (mode && mode !== "auto") return mode;
    return detected || detectViewportProfile();
  }
  function mergeLayoutsByProfile(partial, legacyFlat) {
    const out = {};
    if (partial && typeof partial === "object") {
      for (let i = 0; i < VIEWPORT_PROFILES.length; i++) {
        const profile = VIEWPORT_PROFILES[i];
        const chunk = partial[profile];
        if (chunk && typeof chunk === "object") {
          out[profile] = mergeLayout(chunk, profile);
        }
      }
    }
    if (legacyFlat && typeof legacyFlat === "object" && Object.keys(legacyFlat).length && !out.desktop) {
      out.desktop = mergeLayout(legacyFlat, "desktop");
    }
    return out;
  }
  function layoutForProfile(settings, profile) {
    var _a;
    const resolved = profile || resolveLayoutProfile(settings.layoutProfileMode, detectViewportProfile());
    const stored = (_a = settings.panelLayoutsByProfile) == null ? void 0 : _a[resolved];
    if (stored && Object.keys(stored).length) {
      return mergeLayout(stored, resolved);
    }
    if (resolved === "desktop" && settings.panelLayout) {
      return mergeLayout(settings.panelLayout, "desktop");
    }
    return mergeLayout(null, resolved);
  }
  function clampOpacity(n) {
    if (!Number.isFinite(n)) return 1;
    return Math.max(0.25, Math.min(1, n));
  }
  var CHANNEL_SET = new Set(COMBAT_CHANNELS);
  function isCombatChannel(v) {
    return typeof v === "string" && CHANNEL_SET.has(v);
  }
  function normalizeChannels(raw) {
    if (!Array.isArray(raw)) return DEFAULTS.combatChannels.slice();
    const out = [];
    for (let i = 0; i < raw.length; i++) {
      const v = raw[i];
      if (isCombatChannel(v) && out.indexOf(v) < 0) out.push(v);
    }
    return out.length ? out : DEFAULTS.combatChannels.slice();
  }
  function normalizeBarChannel(raw) {
    return isCombatChannel(raw) ? raw : DEFAULTS.barChannel;
  }
  function mergePanelOpacity(partial) {
    const out = {};
    if (!partial || typeof partial !== "object") return out;
    const keys = Object.keys(partial);
    for (let i = 0; i < keys.length; i++) {
      const id = keys[i];
      const v = partial[id];
      if (typeof v === "number") out[id] = clampOpacity(v);
    }
    return out;
  }
  function panelOpacityOf(settings, id) {
    var _a;
    const v = (_a = settings.panelOpacity) == null ? void 0 : _a[id];
    return typeof v === "number" ? clampOpacity(v) : 1;
  }
  function mergePanelVisible(partial, legacyCombatVisible) {
    const out = { ...DEFAULT_PANEL_VISIBLE };
    if (typeof legacyCombatVisible === "boolean" && (partial == null ? void 0 : partial.combat) == null) {
      out.combat = legacyCombatVisible;
    }
    if (partial && typeof partial === "object") {
      for (let i = 0; i < CLOSABLE_PANEL_IDS.length; i++) {
        const id = CLOSABLE_PANEL_IDS[i];
        if (typeof partial[id] === "boolean") {
          out[id] = partial[id];
        }
      }
    }
    return out;
  }
  function normalizeSnippets(raw) {
    if (!Array.isArray(raw)) return DEFAULT_COMMAND_SNIPPETS.slice();
    const out = [];
    for (let i = 0; i < raw.length; i++) {
      const row = raw[i];
      if (!row || typeof row !== "object") continue;
      const name = String(row.name || "").trim();
      const code = String(row.code || "");
      if (!name && !code.trim()) continue;
      const id = typeof row.id === "string" && row.id ? row.id : `snip-${i}-${Date.now()}`;
      const folderRaw = typeof row.folder === "string" ? row.folder.trim() : "";
      const snip = {
        id,
        name: name || `Snippet ${out.length + 1}`,
        code
      };
      if (folderRaw) snip.folder = folderRaw;
      out.push(snip);
    }
    return out;
  }
  function normalizeLayoutProfileMode(raw) {
    if (raw === "desktop" || raw === "tablet" || raw === "phone" || raw === "auto") {
      return raw;
    }
    return "auto";
  }
  function migrate(parsed) {
    const panelLayoutsByProfile = mergeLayoutsByProfile(
      parsed.panelLayoutsByProfile,
      parsed.panelLayout
    );
    const layoutProfileMode = normalizeLayoutProfileMode(
      parsed.layoutProfileMode
    );
    const activeProfile = resolveLayoutProfile(layoutProfileMode);
    const panelLayout = layoutForProfile(
      {
        ...DEFAULTS,
        panelLayout: parsed.panelLayout || {},
        panelLayoutsByProfile,
        layoutProfileMode
      },
      activeProfile
    );
    const next = {
      ...DEFAULTS,
      ...parsed,
      combatChannels: normalizeChannels(parsed.combatChannels),
      barChannel: normalizeBarChannel(parsed.barChannel),
      panelLayout,
      panelLayoutsByProfile,
      layoutProfileMode,
      panelVisible: mergePanelVisible(
        parsed.panelVisible,
        parsed.combatVisible
      ),
      commandSnippets: normalizeSnippets(parsed.commandSnippets),
      commandDraft: typeof parsed.commandDraft === "string" ? parsed.commandDraft : "",
      combatCompact: !!parsed.combatCompact,
      bagOpenPreferred: !!parsed.bagOpenPreferred,
      panelOpacity: mergePanelOpacity(parsed.panelOpacity)
    };
    if (!parsed.combatView && parsed.combatViews) {
      if (parsed.combatViews.table) next.combatView = "table";
      else if (parsed.combatViews.bars) next.combatView = "bars";
      else if (parsed.combatViews.graph) next.combatView = "graph";
    }
    if (!parsed.partyFocus) {
      if (parsed.partyScope === "all" && parsed.graphPartyKey) {
        next.partyFocus = parsed.graphPartyKey;
      } else if (parsed.partyScope === "all") {
        next.partyFocus = "all";
      } else {
        next.partyFocus = "watched";
      }
    }
    delete next.combatVisible;
    return next;
  }
  function freshDefaults() {
    return {
      ...DEFAULTS,
      combatChannels: DEFAULTS.combatChannels.slice(),
      panelLayout: mergeLayout(null, "desktop"),
      panelLayoutsByProfile: {},
      layoutProfileMode: "auto",
      panelVisible: mergePanelVisible(null),
      commandSnippets: DEFAULT_COMMAND_SNIPPETS.slice(),
      commandDraft: "",
      combatCompact: false,
      bagOpenPreferred: false,
      panelOpacity: {}
    };
  }
  var settingsCache = null;
  function readSettingsFromStorage() {
    var _a;
    try {
      const raw = (_a = window.localStorage) == null ? void 0 : _a.getItem(KEY);
      if (!raw) return freshDefaults();
      return migrate(JSON.parse(raw));
    } catch (e2) {
      return freshDefaults();
    }
  }
  function writeSettingsToStorage(next) {
    var _a;
    try {
      (_a = window.localStorage) == null ? void 0 : _a.setItem(KEY, JSON.stringify(next));
    } catch (e2) {
    }
  }
  function getSettings() {
    if (!settingsCache) settingsCache = readSettingsFromStorage();
    return settingsCache;
  }
  function loadSettings() {
    return getSettings();
  }
  function patchSettings(partial) {
    var _a;
    const current = getSettings();
    const next = {
      ...current,
      ...partial
    };
    if (partial.combatChannels) {
      next.combatChannels = normalizeChannels(partial.combatChannels);
    }
    if (partial.barChannel != null) {
      next.barChannel = normalizeBarChannel(partial.barChannel);
    }
    if (partial.layoutProfileMode != null) {
      next.layoutProfileMode = normalizeLayoutProfileMode(
        partial.layoutProfileMode
      );
    }
    if (partial.panelLayoutsByProfile) {
      next.panelLayoutsByProfile = mergeLayoutsByProfile({
        ...current.panelLayoutsByProfile,
        ...partial.panelLayoutsByProfile
      });
    }
    if (partial.panelLayout) {
      const profile = resolveLayoutProfile(next.layoutProfileMode);
      const merged = mergeLayout(
        {
          ...((_a = current.panelLayoutsByProfile) == null ? void 0 : _a[profile]) || current.panelLayout,
          ...partial.panelLayout
        },
        profile
      );
      next.panelLayout = merged;
      next.panelLayoutsByProfile = {
        ...next.panelLayoutsByProfile,
        [profile]: merged
      };
    }
    if (!partial.panelLayout && (partial.panelLayoutsByProfile || partial.layoutProfileMode != null)) {
      next.panelLayout = layoutForProfile(next);
    }
    if (partial.panelVisible) {
      next.panelVisible = mergePanelVisible({
        ...current.panelVisible,
        ...partial.panelVisible
      });
    }
    if (partial.commandSnippets) {
      next.commandSnippets = normalizeSnippets(partial.commandSnippets);
    }
    if (typeof partial.commandDraft === "string") {
      next.commandDraft = partial.commandDraft;
    }
    if (typeof partial.combatCompact === "boolean") {
      next.combatCompact = partial.combatCompact;
    }
    if (typeof partial.bagOpenPreferred === "boolean") {
      next.bagOpenPreferred = partial.bagOpenPreferred;
    }
    if (partial.panelOpacity) {
      next.panelOpacity = mergePanelOpacity({
        ...current.panelOpacity,
        ...partial.panelOpacity
      });
    }
    delete next.combatVisible;
    settingsCache = next;
    writeSettingsToStorage(next);
    return next;
  }
  function saveSettings(partial) {
    return patchSettings(partial);
  }
  function savePanelPos(id, pos, profile) {
    var _a;
    const settings = getSettings();
    const resolved = profile || resolveLayoutProfile(settings.layoutProfileMode);
    return saveSettings({
      panelLayoutsByProfile: {
        [resolved]: {
          ...((_a = settings.panelLayoutsByProfile) == null ? void 0 : _a[resolved]) || {},
          [id]: pos
        }
      },
      panelLayout: { [id]: pos }
    });
  }
  function savePanelVisible(id, visible) {
    return saveSettings({ panelVisible: { [id]: visible } });
  }
  function resetPanelLayout(profile) {
    const settings = getSettings();
    const resolved = profile || resolveLayoutProfile(settings.layoutProfileMode);
    const defaults = mergeLayout(null, resolved);
    return saveSettings({
      panelLayoutsByProfile: {
        ...settings.panelLayoutsByProfile,
        [resolved]: defaults
      },
      panelLayout: defaults
    });
  }
  function importPanelLayouts(layoutsByProfile) {
    const merged = mergeLayoutsByProfile(layoutsByProfile, null);
    return saveSettings({
      panelLayoutsByProfile: {
        ...getSettings().panelLayoutsByProfile,
        ...merged
      }
    });
  }
  function partyFocusLabel(focus, watchedName) {
    if (focus === "watched") {
      return watchedName ? `Watched \xB7 ${watchedName}` : "Watched party";
    }
    if (focus === "visible") return "Visible parties";
    if (focus === "all") return "All parties";
    if (focus.indexOf("solo:") === 0) return focus.slice(5);
    return focus;
  }
  function killScopeLabel(scope, watchedName) {
    if (scope === "watched") {
      return watchedName ? `Watched \xB7 ${watchedName}` : "Watched party";
    }
    if (scope === "visible" || scope === "all") return "Visible parties";
    const _exhaustive = scope;
    return _exhaustive;
  }

  // src/kpi/sessionKills.ts
  var ATTRIBUTION_MS = 8e3;
  var NEAR_RANGE = 400;
  var mtypeCounts = {};
  var partyKillCounts = {};
  var lastSeen = /* @__PURE__ */ new Map();
  var blameByTarget = /* @__PURE__ */ new Map();
  var totalKills = 0;
  var sessionStartedAt2 = 0;
  var trackingId;
  var trackingName = "";
  var watchedPartyIds2 = /* @__PURE__ */ new Set();
  var watchedPartyKey2 = "";
  var playerParty = /* @__PURE__ */ new Map();
  var unsubKill2 = null;
  var unsubDmg = null;
  function soloKey2(id, name) {
    return `solo:${name || id}`;
  }
  function clearCounts() {
    const keys = Object.keys(mtypeCounts);
    for (let i = 0; i < keys.length; i++) delete mtypeCounts[keys[i]];
    const pkeys = Object.keys(partyKillCounts);
    for (let i = 0; i < pkeys.length; i++) delete partyKillCounts[pkeys[i]];
    totalKills = 0;
    sessionStartedAt2 = 0;
  }
  function ensureSession(observingId, name) {
    if (trackingId !== observingId) {
      trackingId = observingId;
      trackingName = name || observingId;
      clearCounts();
    } else if (name) {
      trackingName = name;
    }
  }
  function killScope() {
    const stored = loadSettings().killScope || "watched";
    const observingId = getObservingId();
    const hasObserver = observingId != null && observingId !== "";
    return effectiveKillScope(stored, hasObserver);
  }
  function isWatchedActor(actorId) {
    if (!actorId || !trackingId) return false;
    if (actorId === trackingId) return true;
    return watchedPartyIds2.has(actorId);
  }
  function creditedPartyKey(actorId) {
    if (killScope() === "watched") {
      if (!isWatchedActor(actorId)) return void 0;
      return watchedPartyKey2 || soloKey2(actorId);
    }
    return playerParty.get(actorId);
  }
  function pruneBlame(now) {
    const cutoff = now - ATTRIBUTION_MS;
    const ids = Array.from(blameByTarget.keys());
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const row = blameByTarget.get(id);
      if (!row || row.at < cutoff) blameByTarget.delete(id);
    }
  }
  function recordDamage(ev) {
    if (!ev.target || !ev.damage || ev.damage <= 0) return;
    if (!ev.actor) return;
    const now = ev.at;
    pruneBlame(now);
    let row = blameByTarget.get(ev.target);
    if (!row) {
      row = { at: now, actors: /* @__PURE__ */ new Set() };
      blameByTarget.set(ev.target, row);
    }
    row.at = now;
    row.actors.add(ev.actor);
    const seen = lastSeen.get(ev.target);
    if (seen == null ? void 0 : seen.mtype) row.mtype = seen.mtype;
  }
  function attributionPartyKey(monsterId, now) {
    const observing = getObserving();
    if ((observing == null ? void 0 : observing.target) && String(observing.target) === monsterId) {
      return watchedPartyKey2 || (trackingId ? soloKey2(trackingId) : void 0);
    }
    pruneBlame(now);
    const blame = blameByTarget.get(monsterId);
    if (blame && blame.at >= now - ATTRIBUTION_MS) {
      const actors = Array.from(blame.actors);
      for (let i = 0; i < actors.length; i++) {
        const key = creditedPartyKey(actors[i]);
        if (key) return key;
      }
    }
    const seen = lastSeen.get(monsterId);
    if ((seen == null ? void 0 : seen.nearAt) != null && now - seen.nearAt <= ATTRIBUTION_MS) {
      if (killScope() === "all" && seen.nearPartyKey) return seen.nearPartyKey;
      if (killScope() === "watched" && trackingId) {
        return watchedPartyKey2 || soloKey2(trackingId);
      }
    }
    return void 0;
  }
  function handleKill2(ev) {
    var _a, _b, _c;
    const scope = killScope();
    const observingId = getObservingId();
    if (scope === "watched") {
      if (!observingId) return;
      const observing = getObserving();
      ensureSession(observingId, (observing == null ? void 0 : observing.name) || observingId);
    } else if (observingId) {
      const observing = getObserving();
      ensureSession(observingId, (observing == null ? void 0 : observing.name) || observingId);
    } else if (!sessionStartedAt2) {
      sessionStartedAt2 = ev.at;
    }
    const partyKey = attributionPartyKey(ev.id, ev.at);
    if (!partyKey) return;
    const mtype = ((_a = lastSeen.get(ev.id)) == null ? void 0 : _a.mtype) || ((_b = blameByTarget.get(ev.id)) == null ? void 0 : _b.mtype) || ((_c = getEntitiesRecord()[ev.id]) == null ? void 0 : _c.mtype);
    if (!mtype) return;
    mtypeCounts[mtype] = (mtypeCounts[mtype] || 0) + 1;
    partyKillCounts[partyKey] = (partyKillCounts[partyKey] || 0) + 1;
    totalKills += 1;
    if (!sessionStartedAt2) sessionStartedAt2 = ev.at;
    blameByTarget.delete(ev.id);
    lastSeen.delete(ev.id);
  }
  function updateKillContext(entities) {
    const observingId = getObservingId();
    const observing = getObserving();
    const now = Date.now();
    const nextParty = /* @__PURE__ */ new Map();
    const nextWatched = /* @__PURE__ */ new Set();
    if (observingId && observing) {
      ensureSession(observingId, observing.name || observingId);
      nextWatched.add(observingId);
      watchedPartyKey2 = observing.party || soloKey2(observingId, observing.name);
      if (observing.party) {
        for (let i = 0; i < entities.length; i++) {
          const ent = entities[i];
          if (ent.player && ent.party === observing.party && ent.id) {
            nextWatched.add(String(ent.id));
          }
        }
      }
    } else {
      watchedPartyKey2 = "";
    }
    watchedPartyIds2 = nextWatched;
    for (let i = 0; i < entities.length; i++) {
      const ent = entities[i];
      if (ent.player && ent.id) {
        nextParty.set(
          String(ent.id),
          ent.party || soloKey2(String(ent.id), ent.name)
        );
      }
    }
    playerParty = nextParty;
    for (let i = 0; i < entities.length; i++) {
      const ent = entities[i];
      if (ent.type !== "monster" || !ent.mtype || ent.id == null) continue;
      const id = String(ent.id);
      const prev = lastSeen.get(id);
      const row = {
        mtype: ent.mtype,
        nearAt: prev == null ? void 0 : prev.nearAt,
        nearPartyKey: prev == null ? void 0 : prev.nearPartyKey
      };
      if (observing) {
        const dist = simpleDistance(observing, ent);
        if (Number.isFinite(dist) && dist <= NEAR_RANGE) {
          row.nearAt = now;
          row.nearPartyKey = watchedPartyKey2 || soloKey2(observing.id, observing.name);
        }
      }
      if (ent.target) {
        const tid = String(ent.target);
        if (killScope() === "watched" && watchedPartyIds2.has(tid)) {
          row.nearAt = now;
          row.nearPartyKey = watchedPartyKey2;
        } else if (killScope() === "all" && playerParty.has(tid)) {
          row.nearAt = now;
          row.nearPartyKey = playerParty.get(tid);
        }
      }
      if (killScope() === "all") {
        for (let p = 0; p < entities.length; p++) {
          const pl = entities[p];
          if (!pl.player) continue;
          const dist = simpleDistance(pl, ent);
          if (Number.isFinite(dist) && dist <= NEAR_RANGE) {
            row.nearAt = now;
            row.nearPartyKey = pl.party || soloKey2(String(pl.id), pl.name);
            break;
          }
        }
      }
      lastSeen.set(id, row);
      const blame = blameByTarget.get(id);
      if (blame) blame.mtype = ent.mtype;
    }
  }
  function startSessionKills() {
    if (!unsubKill2) unsubKill2 = onKill(handleKill2);
    if (!unsubDmg) unsubDmg = onDamage(recordDamage);
    return () => {
      if (unsubKill2) {
        unsubKill2();
        unsubKill2 = null;
      }
      if (unsubDmg) {
        unsubDmg();
        unsubDmg = null;
      }
    };
  }
  function resetKillSession() {
    clearCounts();
    blameByTarget.clear();
  }
  function getStats() {
    var _a;
    const byMtype = [];
    const keys = Object.keys(mtypeCounts);
    for (let i = 0; i < keys.length; i++) {
      byMtype.push({ mtype: keys[i], count: mtypeCounts[keys[i]] });
    }
    byMtype.sort((a, b) => b.count - a.count);
    const byParty = [];
    const pkeys = Object.keys(partyKillCounts);
    for (let i = 0; i < pkeys.length; i++) {
      byParty.push({ party: pkeys[i], count: partyKillCounts[pkeys[i]] });
    }
    byParty.sort((a, b) => b.count - a.count);
    const scope = killScope();
    const observingId = getObservingId();
    const hasObserver = observingId != null && observingId !== "";
    const active = scope === "all" || hasObserver;
    let killsPerMinute = null;
    let killsPerHour = null;
    let killsPerDay = null;
    if (sessionStartedAt2 && totalKills > 0) {
      const elapsedSec = Math.max(Date.now() - sessionStartedAt2, 1e3) / 1e3;
      const perSec = totalKills / elapsedSec;
      killsPerMinute = perSec * 60;
      killsPerHour = perSec * 3600;
      killsPerDay = perSec * 86400;
    }
    return {
      total: totalKills,
      byMtype,
      byParty,
      trackingId: observingId || trackingId,
      trackingName: ((_a = getObserving()) == null ? void 0 : _a.name) || trackingName,
      sessionStartedAt: sessionStartedAt2,
      killsPerMinute,
      killsPerHour,
      killsPerDay,
      active,
      scope
    };
  }

  // src/host/commander.ts
  var listeners2 = [];
  function subscribeCommanderOpen(fn) {
    listeners2.push(fn);
    return () => {
      const idx = listeners2.indexOf(fn);
      if (idx >= 0) listeners2.splice(idx, 1);
    };
  }
  function openCommander(draft) {
    const payload = {};
    if (typeof draft === "string") payload.draft = draft;
    for (let i = 0; i < listeners2.length; i++) {
      listeners2[i](payload);
    }
  }
  function ourShowCommander(fvalue) {
    openCommander(typeof fvalue === "string" ? fvalue : void 0);
  }
  function installCommanderHook() {
    const w = window;
    const apply = () => {
      if (w.show_commander === ourShowCommander) return;
      if (typeof w.show_commander === "function" && w.show_commander !== ourShowCommander && !w.__alCommShowCommander) {
        w.__alCommShowCommander = w.show_commander;
      }
      w.show_commander = ourShowCommander;
    };
    apply();
    let ticks = 0;
    const timer = window.setInterval(() => {
      apply();
      ticks += 1;
      if (ticks >= 40) window.clearInterval(timer);
    }, 500);
  }

  // src/host/commChrome/types.ts
  function esc(text) {
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // src/host/commChrome/chromeCss.ts
  var STYLE_ID = "comm-ui-chrome-css";
  function injectChromeCss() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
/* Hide stock observe gamebuttons \u2014 never restyle .gamebutton.block into the strip */
#observeui {
  display: none !important;
}

#bottom {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 260;
  padding: 8px 10px calc(10px + env(safe-area-inset-bottom, 0px));
  text-align: center;
  pointer-events: none;
  background: none !important;
  background-image: none !important;
}
#bottom .ecu-chrome-stack,
#bottom .ecu-chrome-stack * {
  pointer-events: auto;
}

/* Vertical stack: action bar above character/server strip */
.ecu-chrome-stack {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  width: auto;
  max-width: min(96vw, 1200px);
  margin: 0 auto;
  pointer-events: auto;
}

/* Secondary control cluster \u2014 same visual language, larger hit targets */
.ecu-actions {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: stretch;
  justify-content: center;
  gap: 8px;
  padding: 6px 8px;
  background: rgba(14, 14, 14, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-sizing: border-box;
  align-self: center;
}

.ecu-btn {
  appearance: none;
  border: 1px solid #7a7a7a;
  border-radius: 0;
  background: #252525;
  color: #f5f5f5;
  font: inherit;
  font-size: 16px;
  font-weight: 500 !important;
  letter-spacing: 0.02em;
  text-shadow: none !important;
  box-shadow: none !important;
  text-transform: none;
  box-sizing: border-box;
  padding: 0 18px;
  min-width: 88px;
  min-height: 40px;
  height: 40px;
  margin: 0;
  cursor: pointer;
  line-height: 1.2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}
.ecu-btn:hover {
  background: #343434;
  border-color: #a0a0a0;
  color: #fff;
}
.ecu-btn:active {
  background: #3d3d3d;
}
.ecu-btn:disabled,
.ecu-btn.is-disabled {
  opacity: 0.4;
  cursor: default;
  pointer-events: none;
}

/* Primary strip: character chips + server only */
.ecu-chrome {
  display: inline-flex;
  flex-direction: row;
  align-items: stretch;
  justify-content: center;
  gap: 0;
  width: auto;
  max-width: 100%;
  margin: 0;
  pointer-events: auto;
  background: rgba(14, 14, 14, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-sizing: border-box;
  min-height: 68px;
  height: 68px;
  overflow: visible;
}

.ecu-strip-sep {
  flex: 0 0 1px;
  width: 1px;
  align-self: stretch;
  margin: 10px 0;
  background: rgba(255, 255, 255, 0.14);
}

.charactersui.charactersuic {
  display: flex !important;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: 2px;
  padding: 4px 8px;
  max-width: min(78vw, 920px);
  min-width: 0;
  flex: 0 1 auto;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x;
  scrollbar-width: thin;
  text-align: left;
}

.ecu-char {
  appearance: none;
  border: 0;
  background: transparent;
  color: #eee;
  font: inherit;
  font-weight: 400 !important;
  text-shadow: none !important;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
  min-width: 0;
  max-width: 240px;
  height: 100%;
  padding: 0 12px 0 6px;
  cursor: pointer;
  text-align: left;
  line-height: 1.15;
  overflow: hidden;
}
.ecu-char:hover { background: rgba(255, 255, 255, 0.07); }
.ecu-char.is-active {
  background: rgba(225, 55, 88, 0.2);
  box-shadow: inset 0 -3px 0 #e13758;
}
.ecu-char.is-active:hover {
  background: rgba(225, 55, 88, 0.28);
}
.ecu-char-sprite {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  overflow: hidden;
}
.ecu-char-sprite > * {
  transform: scale(1.2);
  transform-origin: center center;
}
.ecu-char-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 3px;
  min-width: 0;
  overflow: hidden;
}
.ecu-char-name {
  font-size: 17px;
  font-weight: 500 !important;
  letter-spacing: 0.02em;
  color: #f5f5f5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 170px;
  text-shadow: none !important;
}
.ecu-char-sub {
  flex: 0 0 auto;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-shadow: none !important;
}
.ecu-empty {
  display: inline-flex;
  align-items: center;
  height: 100%;
  padding: 0 16px;
  color: rgba(255, 255, 255, 0.45);
  font-size: 15px;
  font-weight: 400 !important;
  text-shadow: none !important;
}

.serversui.serversuic,
.serversuic {
  display: flex !important;
  position: relative;
  flex: 0 0 auto;
  align-items: stretch;
  margin: 0 !important;
  overflow: visible;
}
.ecu-server-dd {
  position: relative;
  display: flex;
  min-width: 0;
  text-align: left;
  height: 100%;
  overflow: visible;
}
.ecu-server-dd-trigger {
  appearance: none;
  border: 0;
  background: transparent;
  color: #eee;
  font: inherit;
  font-weight: 400 !important;
  text-shadow: none !important;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  height: 100%;
  padding: 0 16px;
  cursor: pointer;
  text-align: left;
  line-height: 1.15;
  min-width: 188px;
  box-sizing: border-box;
}
.ecu-server-dd-trigger:hover { background: rgba(255, 255, 255, 0.07); }
.ecu-server-dd.is-open .ecu-server-dd-trigger {
  background: rgba(133, 199, 107, 0.16);
  box-shadow: inset 0 -3px 0 #85c76b;
}
.ecu-server-dd-meta {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 3px;
  min-width: 0;
}
.ecu-server-dd-name {
  font-size: 21px;
  font-weight: 400 !important;
  color: #f2f2f2;
  white-space: nowrap;
  text-shadow: none !important;
}
.ecu-server-dd-sub {
  flex: 0 0 auto;
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  color: #85c76b;
  white-space: nowrap;
  text-shadow: none !important;
}
/* Current connection RTT from host globals pings[] / ping_ack */
.ecu-server-dd-ping {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 3px;
  min-width: 52px;
}
.ecu-server-dd-bars {
  display: flex;
  align-items: flex-end;
  gap: 1px;
  height: 18px;
}
.ecu-server-dd-bar {
  display: block;
  width: 3px;
  min-height: 2px;
  background: #8ab4c9;
  opacity: 0.92;
}
.ecu-server-dd-ping-ms {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: #8ab4c9;
  white-space: nowrap;
  text-shadow: none !important;
  font-weight: 400 !important;
}
.ecu-server-dd-chevron {
  flex: 0 0 auto;
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid rgba(255, 255, 255, 0.5);
}
.ecu-server-dd.is-open .ecu-server-dd-chevron {
  transform: rotate(180deg);
  border-top-color: #85c76b;
}
.ecu-server-dd-menu {
  display: none;
  position: absolute;
  left: auto;
  right: 0;
  bottom: calc(100% + 6px);
  min-width: 100%;
  width: max(100%, 240px);
  z-index: 270;
  max-height: min(42vh, 320px);
  overflow: auto;
  padding: 4px;
  background: #141414;
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.6);
  pointer-events: auto;
}
.ecu-server-dd.is-open .ecu-server-dd-menu { display: block; }
.ecu-server-dd-option {
  appearance: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  width: 100%;
  padding: 12px 14px;
  margin: 0;
  border: 0;
  background: transparent;
  color: #eee;
  font: inherit;
  font-size: 18px;
  font-weight: 400 !important;
  text-shadow: none !important;
  cursor: pointer;
  text-align: left;
  box-sizing: border-box;
}
.ecu-server-dd-option:hover { background: rgba(255, 255, 255, 0.08); }
.ecu-server-dd-option.is-active {
  background: rgba(133, 199, 107, 0.14);
  box-shadow: inset 3px 0 0 #85c76b;
}
.ecu-server-dd-option-name {
  font-weight: 400 !important;
  text-shadow: none !important;
}
.ecu-server-dd-option-players {
  color: #85c76b;
  font-variant-numeric: tabular-nums;
  font-size: 16px;
  font-weight: 400 !important;
  text-shadow: none !important;
}
.ecu-server-dd-empty {
  padding: 14px;
  color: #888;
  font-size: 15px;
  text-align: center;
}

/* Hide stock TOGGLE \u2014 strip shows chars + servers together */
#bottom > .gamebutton {
  display: none !important;
}

/* Narrow viewport: fold Follow/Bag/Command into the chip strip row */
@media (max-width: 900px) {
  .ecu-chrome-stack {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    align-items: stretch;
    gap: 4px;
  }
  .ecu-actions {
    flex: 0 0 auto;
    align-self: stretch;
    padding: 4px;
    gap: 4px;
    height: 68px;
    min-height: 68px;
    box-sizing: border-box;
  }
  .ecu-btn {
    min-width: 64px;
    min-height: 28px;
    height: 28px;
    padding: 0 10px;
    font-size: 13px;
  }
  .ecu-chrome {
    flex: 1 1 auto;
    min-width: 0;
  }
  .charactersui.charactersuic {
    max-width: min(62vw, 640px);
  }
}

/* Tablet / phone \u2014 larger hit targets (Edge/Firefox Android, Safari iOS) */
@media (pointer: coarse), (max-width: 1100px) {
  .ecu-btn {
    min-width: 88px !important;
    min-height: 44px !important;
    height: 44px !important;
    padding: 0 16px !important;
    font-size: 16px !important;
  }
  .ecu-actions {
    min-height: 56px;
    height: auto;
    padding: 6px 8px;
    gap: 8px;
  }
  .ecu-chrome {
    min-height: 76px;
    height: 76px;
  }
  .ecu-char {
    padding: 0 14px 0 8px;
    gap: 12px;
  }
  .ecu-char-sprite {
    width: 52px;
    height: 52px;
  }
  .ecu-char-name {
    font-size: 18px;
  }
  .ecu-server-dd-trigger {
    min-width: 200px;
    padding: 0 18px;
  }
}
#comm-ui.comm-ui-touch .comm-pos-panel button,
#comm-ui[data-viewport="tablet"] .comm-pos-panel button,
#comm-ui[data-viewport="phone"] .comm-pos-panel button {
  min-height: 32px;
}
#comm-ui[data-viewport="phone"] .comm-pos-combat,
#comm-ui[data-viewport="phone"] .comm-pos-bag,
#comm-ui[data-viewport="phone"] .comm-pos-command {
  max-width: 96vw;
}
`;
    document.head.append(style);
  }

  // src/host/commChrome/chromeActions.ts
  function clearObserve() {
    if (typeof window.init_socket !== "function") return;
    window.init_socket({});
  }
  function toggleObserve(name) {
    const n = String(name || "");
    if (!n) return;
    const obs = window.observing;
    if (obs && obs.name === n) {
      clearObserve();
      return;
    }
    if (typeof window.observe_character === "function") {
      window.observe_character(n);
    }
  }
  function onFollowClick(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    const sock = window.socket;
    if (sock && typeof sock.emit === "function") sock.emit("o:home");
  }
  function onBagClick(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    const render = window.render_inventory;
    if (typeof render !== "function") return;
    if (typeof window.draw_trigger === "function") {
      window.draw_trigger(() => render());
    } else {
      render();
    }
  }
  function onCommandClick(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    if (typeof window.show_commander === "function") {
      window.show_commander();
    }
  }
  function buildActionsEl() {
    const actions = document.createElement("div");
    actions.className = "ecu-actions";
    actions.setAttribute("data-ecu-actions", "1");
    const mk = (label, title, onClick) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ecu-btn";
      btn.textContent = label;
      btn.title = title;
      btn.addEventListener("click", onClick);
      return btn;
    };
    actions.append(
      mk("Follow", "Center on observed character", onFollowClick),
      mk("Bag", "Observed inventory", onBagClick),
      mk("Command", "Send a command to the observed character", onCommandClick)
    );
    return actions;
  }
  function syncActionsEnabled() {
    const watching = !!(window.observing && window.observing.name);
    const actions = document.querySelector(".ecu-actions");
    if (!actions) return;
    const buttons = actions.querySelectorAll(".ecu-btn");
    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      const label = (btn.textContent || "").trim();
      const needsObs = label === "Follow" || label === "Bag" || label === "Command";
      if (needsObs) {
        btn.disabled = !watching;
        btn.classList.toggle("is-disabled", !watching);
      }
    }
  }
  function ensureChromeShell() {
    const bottom = document.getElementById("bottom");
    if (!bottom) return;
    const observe = document.getElementById("observeui");
    if (observe) {
      observe.classList.add("hidden");
      observe.style.display = "none";
    }
    const existingStack = bottom.querySelector(
      ".ecu-chrome-stack"
    );
    if (existingStack) {
      const chromeEl = existingStack.querySelector(
        ".ecu-chrome"
      );
      const charsEl = bottom.querySelector(".charactersuic");
      const serversEl = bottom.querySelector(".serversuic") || bottom.querySelector(".serversui");
      if (chromeEl && charsEl && !chromeEl.contains(charsEl)) {
        chromeEl.insertBefore(charsEl, chromeEl.firstChild);
      }
      if (chromeEl && serversEl && !chromeEl.contains(serversEl)) {
        chromeEl.append(serversEl);
      }
      let actionsEl = null;
      for (let i = 0; i < existingStack.children.length; i++) {
        const child = existingStack.children[i];
        if (child.classList && child.classList.contains("ecu-actions")) {
          actionsEl = child;
          break;
        }
      }
      const nestedActions = chromeEl ? chromeEl.querySelector(".ecu-actions") : null;
      if (nestedActions) nestedActions.remove();
      if (!actionsEl) {
        actionsEl = buildActionsEl();
        existingStack.insertBefore(actionsEl, existingStack.firstChild);
      }
      syncActionsEnabled();
      return;
    }
    const chars = bottom.querySelector(".charactersuic");
    const servers = bottom.querySelector(".serversuic") || bottom.querySelector(".serversui");
    const legacyChrome = bottom.querySelector(".ecu-chrome");
    const legacyActions = bottom.querySelector(".ecu-actions");
    const stack = document.createElement("div");
    stack.className = "ecu-chrome-stack";
    const chrome = document.createElement("div");
    chrome.className = "ecu-chrome";
    if (chars) {
      chars.classList.remove("hidden");
      chars.style.display = "flex";
      chrome.append(chars);
    }
    if (servers) {
      servers.classList.remove("hidden");
      servers.style.display = "flex";
      if (chars) {
        const sep = document.createElement("div");
        sep.className = "ecu-strip-sep";
        sep.setAttribute("aria-hidden", "true");
        chrome.append(sep);
      }
      chrome.append(servers);
    }
    if (legacyChrome) legacyChrome.remove();
    if (legacyActions) legacyActions.remove();
    stack.append(buildActionsEl(), chrome);
    bottom.insertBefore(stack, bottom.firstChild);
    syncActionsEnabled();
  }

  // src/host/commChrome/characterChips.ts
  var rcCache = "-1";
  var rcListCache = "-1";
  function invalidateCharacterCache() {
    rcCache = "-1";
  }
  function renderCharactersHud() {
    var _a, _b;
    ensureChromeShell();
    const chars = window.X && window.X.characters || [];
    let key = "";
    let listKey = "";
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      key += c.name + " " + c.level + " " + c.server + " " + c.rip + " " + c.skin + " " + c.online + "|";
      listKey += c.name + " " + c.online + "|";
    }
    const obsName = window.observing && window.observing.name;
    if (obsName) key += "obs:" + obsName;
    if (key === rcCache) {
      syncActionsEnabled();
      return;
    }
    const root = document.querySelector(".charactersuic");
    if (root && listKey === rcListCache && root.querySelectorAll(".ecu-char").length) {
      rcCache = key;
      const nodes = root.querySelectorAll(".ecu-char");
      for (let i = 0; i < nodes.length; i++) {
        const onclick = nodes[i].getAttribute("onclick") || "";
        const m = onclick.match(/__ecuToggleObserve\("([^"]+)"\)/) || onclick.match(/observe_character\("([^"]+)"\)/);
        const fullName = m ? m[1] : "";
        const active = !!(obsName && obsName === fullName);
        nodes[i].classList.toggle("is-active", active);
        const prevTitle = nodes[i].getAttribute("title") || "";
        const baseTitle = prevTitle.replace(
          /\s*·\s*Click again to stop observing$/,
          ""
        );
        nodes[i].setAttribute(
          "title",
          active ? baseTitle + " \xB7 Click again to stop observing" : baseTitle
        );
      }
      syncActionsEnabled();
      return;
    }
    rcCache = key;
    rcListCache = listKey;
    let html = "";
    const spriteFn = window.sprite;
    const serverUi = window.server_to_ui;
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      if (!char.online) continue;
      const active = !!(obsName && obsName === char.name);
      const serverLabel = typeof serverUi === "function" ? serverUi(char.server) : String(char.server || "");
      const shortName = char.name.length <= 16 ? char.name : char.name.substr(0, 15) + "\u2026";
      const spriteHtml = typeof spriteFn === "function" ? spriteFn(char.skin || "", { cx: char.cx, rip: char.rip }) : "";
      const title = esc(char.name) + " \xB7 Lv." + esc(String((_a = char.level) != null ? _a : "")) + " \xB7 " + esc(serverLabel) + (active ? " \xB7 Click again to stop observing" : "");
      html += "<button type='button' class='ecu-char" + (active ? " is-active" : "") + "' title='" + title + `' onclick='if(window.bc&&bc(this)) return; (window.__ecuToggleObserve||observe_character)("` + esc(char.name) + `");'>`;
      html += "<span class='ecu-char-sprite'>" + spriteHtml + "</span>";
      html += "<span class='ecu-char-meta'>";
      html += "<span class='ecu-char-name'>" + esc(shortName) + "</span>";
      html += "<span class='ecu-char-sub'>Lv." + esc(String((_b = char.level) != null ? _b : "")) + "</span>";
      html += "</span></button>";
    }
    if (!html) html = "<div class='ecu-empty'>No characters online</div>";
    const targets = document.querySelectorAll(".charactersuic");
    for (let i = 0; i < targets.length; i++) {
      targets[i].innerHTML = html;
    }
    syncActionsEnabled();
  }

  // src/host/commChrome/pingHud.ts
  var PING_SPARK_BARS = 12;
  function readCommPings() {
    const raw = window.pings;
    if (!Array.isArray(raw) || !raw.length) return [];
    const out = [];
    for (let i = 0; i < raw.length; i++) {
      const n = Number(raw[i]);
      if (Number.isFinite(n) && n >= 0) out.push(n);
    }
    return out;
  }
  function averagePingMs(samples2) {
    if (!samples2.length) return null;
    let sum = 0;
    for (let i = 0; i < samples2.length; i++) sum += samples2[i];
    return sum / samples2.length;
  }
  function pingColor(ms) {
    if (ms < 100) return "#85c76b";
    if (ms < 200) return "#d4a84b";
    return "#e05555";
  }
  function pingBarsHtml(samples2) {
    if (!samples2.length) return "";
    const start = Math.max(0, samples2.length - PING_SPARK_BARS);
    let max = 1;
    for (let i = start; i < samples2.length; i++) {
      max = Math.max(max, samples2[i]);
    }
    let html = "<span class='ecu-server-dd-bars' aria-hidden='true'>";
    for (let i = start; i < samples2.length; i++) {
      const pct = Math.max(10, Math.round(samples2[i] / max * 100));
      const color = pingColor(samples2[i]);
      html += "<span class='ecu-server-dd-bar' style='height:" + pct + "%;background:" + color + "'></span>";
    }
    html += "</span>";
    return html;
  }
  function pingBlockHtml(samples2) {
    const avg = averagePingMs(samples2);
    const label = avg == null ? "\u2014" : Math.round(avg) + "ms";
    const color = avg == null ? "#8ab4c9" : pingColor(avg);
    const title = avg == null ? "Ping unavailable (no samples yet)" : "Avg ping " + Math.round(avg) + "ms over last " + samples2.length + " sample" + (samples2.length === 1 ? "" : "s") + " \xB7 green <100 \xB7 amber <200 \xB7 red \u2265200";
    return "<span class='ecu-server-dd-ping' title='" + esc(title) + "'>" + pingBarsHtml(samples2) + "<span class='ecu-server-dd-ping-ms' style='color:" + color + "'>" + esc(label) + "</span></span>";
  }
  function readPingSamples() {
    return readCommPings();
  }
  var lastPingHudKey = "";
  function syncServerPingHud() {
    const roots = document.querySelectorAll(".ecu-server-dd");
    if (!roots.length) return;
    const samples2 = readCommPings();
    const avg = averagePingMs(samples2);
    const key = String(samples2.length) + ":" + (samples2.length ? samples2[samples2.length - 1] : "") + ":" + (avg == null ? "" : Math.round(avg));
    const hasPing = !!document.querySelector(".ecu-server-dd-ping");
    if (key === lastPingHudKey && hasPing) return;
    lastPingHudKey = key;
    const html = pingBlockHtml(samples2);
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

  // src/host/commChrome/serverDropdown.ts
  var DOC_BOUND = "__ecuCommServerDdDocBound";
  var slCache = "-1";
  var slListCache = "-1";
  function closeServerDd() {
    const nodes = document.querySelectorAll(".ecu-server-dd");
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].classList.remove("is-open");
      nodes[i].setAttribute("aria-expanded", "false");
    }
  }
  function isServerDdOpen() {
    return !!document.querySelector(".ecu-server-dd.is-open");
  }
  function toggleServerDd(event) {
    if (event) {
      if (event.preventDefault) event.preventDefault();
      if (event.stopPropagation) event.stopPropagation();
      if (typeof window.btc === "function") window.btc(event);
    }
    const root = event && event.currentTarget && event.currentTarget.closest && event.currentTarget.closest(".ecu-server-dd") || document.querySelector(".ecu-server-dd");
    if (!root) return;
    const open = root.classList.contains("is-open");
    closeServerDd();
    if (!open) {
      root.classList.add("is-open");
      root.setAttribute("aria-expanded", "true");
    }
  }
  function selectServer(index) {
    closeServerDd();
    const i = parseInt(String(index), 10);
    const servers = window.X && window.X.servers || [];
    if (!(i >= 0) || i >= servers.length) return;
    const server = servers[i];
    if (!server || !server.address) return;
    window.server_address = server.address;
    window.server_path = server.path;
    if (typeof window.init_socket === "function") {
      window.init_socket();
    }
  }
  function bindServerDdDoc() {
    if (window[DOC_BOUND]) return;
    window[DOC_BOUND] = true;
    document.addEventListener("click", (event) => {
      let t = event.target;
      if (t && t.nodeType === 3) t = t.parentNode;
      if (t && t.closest && t.closest(".ecu-server-dd")) return;
      closeServerDd();
    });
  }
  function onServerOptionClick(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    const btn = ev.currentTarget;
    if (!btn) return;
    const idx = btn.getAttribute("data-server-index");
    if (idx == null) return;
    selectServer(idx);
  }
  function onServerTriggerClick(ev) {
    toggleServerDd(ev);
  }
  function wireServerDdHandlers(root) {
    const trigger = root.querySelector(".ecu-server-dd-trigger");
    if (trigger) {
      trigger.addEventListener("click", onServerTriggerClick);
    }
    const opts = root.querySelectorAll(".ecu-server-dd-option");
    for (let i = 0; i < opts.length; i++) {
      opts[i].addEventListener("click", onServerOptionClick);
    }
  }
  function renderServersHud() {
    ensureChromeShell();
    const servers = window.X && window.X.servers || [];
    let key = "";
    let listKey = "";
    let currentIndex = -1;
    for (let i = 0; i < servers.length; i++) {
      const server = servers[i];
      key += server.region + " " + server.name + " " + server.players + "|";
      listKey += server.region + " " + server.name + "|";
      if (window.server_region === server.region && window.server_identifier === server.name) {
        currentIndex = i;
      }
    }
    if (window.socket && currentIndex < 0) {
      key += "conn:" + window.server_region + " " + window.server_identifier;
    } else {
      key += "cur:" + currentIndex;
    }
    if (key === slCache) return;
    let triggerName = "Select server\u2026";
    let triggerPlayers = "";
    let triggerPlayersTitle = "Players online";
    if (currentIndex >= 0 && servers[currentIndex]) {
      triggerName = servers[currentIndex].region + " " + servers[currentIndex].name;
      triggerPlayers = String(servers[currentIndex].players);
      triggerPlayersTitle = triggerPlayers + " player" + (servers[currentIndex].players === 1 ? "" : "s") + " online";
    } else if (window.socket && window.server_region) {
      triggerName = window.server_region + " " + (window.server_identifier || "");
    }
    const pingSamples = readPingSamples();
    const existing = document.querySelector(".ecu-server-dd");
    if (existing && listKey === slListCache && existing.querySelectorAll(".ecu-server-dd-option").length === servers.length) {
      slCache = key;
      const nameEl = existing.querySelector(".ecu-server-dd-name");
      const subEl = existing.querySelector(".ecu-server-dd-sub");
      if (nameEl) nameEl.textContent = triggerName;
      if (subEl) {
        subEl.textContent = triggerPlayers !== "" ? triggerPlayers : "\u2014";
        subEl.setAttribute("title", triggerPlayersTitle);
      }
      const opts = existing.querySelectorAll(".ecu-server-dd-option");
      for (let i = 0; i < opts.length && i < servers.length; i++) {
        opts[i].classList.toggle("is-active", i === currentIndex);
        const p = opts[i].querySelector(".ecu-server-dd-option-players");
        if (p) {
          p.textContent = String(servers[i].players);
          p.setAttribute(
            "title",
            String(servers[i].players) + " player" + (servers[i].players === 1 ? "" : "s") + " online"
          );
        }
      }
      syncServerPingHud();
      return;
    }
    slCache = key;
    slListCache = listKey;
    const wasOpen = !!document.querySelector(".ecu-server-dd.is-open");
    let menuHtml = "";
    if (!servers.length) {
      menuHtml = "<div class='ecu-server-dd-empty'>No servers online</div>";
    } else {
      for (let i = 0; i < servers.length; i++) {
        const server = servers[i];
        const playersTitle = String(server.players) + " player" + (server.players === 1 ? "" : "s") + " online";
        menuHtml += "<button type='button' class='ecu-server-dd-option" + (i === currentIndex ? " is-active" : "") + "' data-server-index='" + i + "'>";
        menuHtml += "<span class='ecu-server-dd-option-name'>" + esc(server.region + " " + server.name) + "</span>";
        menuHtml += "<span class='ecu-server-dd-option-players' title='" + esc(playersTitle) + "'>" + esc(String(server.players)) + "</span>";
        menuHtml += "</button>";
      }
    }
    const html = "<div class='ecu-server-dd" + (wasOpen ? " is-open" : "") + "' aria-expanded='" + (wasOpen ? "true" : "false") + "'><button type='button' class='ecu-server-dd-trigger' aria-haspopup='listbox'><span class='ecu-server-dd-meta'><span class='ecu-server-dd-name'>" + esc(triggerName) + "</span><span class='ecu-server-dd-sub' title='" + esc(triggerPlayersTitle) + "'>" + esc(triggerPlayers !== "" ? triggerPlayers : "\u2014") + "</span></span>" + pingBlockHtml(pingSamples) + "<span class='ecu-server-dd-chevron' aria-hidden='true'></span></button><div class='ecu-server-dd-menu' role='listbox'>" + menuHtml + "</div></div>";
    const targets = document.querySelectorAll(
      ".serversuic, .serversui.serversuic"
    );
    const applyTo = targets.length ? targets : document.querySelectorAll(".serversui");
    for (let i = 0; i < applyTo.length; i++) {
      applyTo[i].innerHTML = html;
      applyTo[i].style.display = "flex";
      applyTo[i].classList.remove("hidden");
      const dd = applyTo[i].querySelector(".ecu-server-dd");
      if (dd) wireServerDdHandlers(dd);
    }
  }

  // src/host/dialogHost.ts
  var STYLE_ID2 = "comm-ui-dialog-host-css";
  var CLOSE_CLASS = "ecu-dialog-close";
  var BOUND = "__ecuDialogDismissBound";
  var PATCHED = "__ecuDialogRendersPatched";
  var JQ_PATCHED = "__ecuDialogJqueryPatched";
  var ADOPTED_CLASS = "ecu-info-dialog-adopted";
  var BUFF_DIALOG_ID = "ecu-buff-dialog";
  var ITEM_DIALOG_ID = "ecu-item-dialog";
  var STOCK_DIALOG_ID = "topleftcornerdialog";
  var BUFF_SEL = "#" + BUFF_DIALOG_ID;
  var ITEM_SEL = "#" + ITEM_DIALOG_ID;
  var STOCK_SEL = "#" + STOCK_DIALOG_ID;
  function dialogIdFor(kind) {
    return kind === "buff" ? BUFF_DIALOG_ID : ITEM_DIALOG_ID;
  }
  function panelAttrFor(kind) {
    return kind === "buff" ? "buffInfo" : "itemInfo";
  }
  function injectDialogHostCss() {
    if (document.getElementById(STYLE_ID2)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID2;
    style.textContent = `
/* Fallback host when not yet adopted into CommUI layout panel. */
#topleftcorner:not(.ecu-info-slot-host) {
  position: fixed !important;
  top: 8px !important;
  left: 8px !important;
  z-index: 230 !important;
  pointer-events: none !important;
  max-width: min(96vw, 520px);
  max-height: min(80vh, calc(100vh - 96px));
  overflow: auto;
}
#topleftcornerui {
  pointer-events: auto !important;
  vertical-align: top;
  display: inline-block;
}
/* Stub: stock clears still target this id; real content lives in ecu-* hosts. */
#${STOCK_DIALOG_ID} {
  display: none !important;
}
#${BUFF_DIALOG_ID},
#${ITEM_DIALOG_ID} {
  pointer-events: auto !important;
  vertical-align: top;
  display: inline-block;
  position: relative;
}
#${BUFF_DIALOG_ID}.${ADOPTED_CLASS},
#${ITEM_DIALOG_ID}.${ADOPTED_CLASS} {
  display: block;
  max-width: min(96vw, 520px);
  max-height: min(80vh, calc(100vh - 96px));
  overflow: auto;
}
#${BUFF_DIALOG_ID} .${CLOSE_CLASS},
#${ITEM_DIALOG_ID} .${CLOSE_CLASS} {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 2;
  cursor: pointer;
  border: 1px solid #555;
  background: #1c1c1c;
  color: #ddd;
  width: 28px;
  height: 28px;
  line-height: 24px;
  padding: 0;
  font-size: 18px;
  text-align: center;
  box-sizing: border-box;
}
#${BUFF_DIALOG_ID} .${CLOSE_CLASS}:hover,
#${ITEM_DIALOG_ID} .${CLOSE_CLASS}:hover {
  border-color: #888;
  color: #fff;
}
`;
    document.head.append(style);
  }
  function dialogEl(kind) {
    return document.getElementById(dialogIdFor(kind));
  }
  function hasContent(el) {
    return !!(el && String(el.innerHTML || "").trim());
  }
  function isBuffDialogOpen() {
    return hasContent(dialogEl("buff"));
  }
  function isItemDialogOpen() {
    return hasContent(dialogEl("item"));
  }
  function isTopLeftDialogOpen() {
    return isBuffDialogOpen() || isItemDialogOpen();
  }
  function clearDialogOnlyXTarget() {
    if (window.__ecuDialogOnlyXTarget) {
      window.__ecuDialogOnlyXTarget = false;
      window.xtarget = null;
    }
  }
  function clearDialogsTarget() {
    try {
      window.dialogs_target = null;
    } catch (e2) {
    }
  }
  function closeBuffDialog() {
    const el = dialogEl("buff");
    if (!hasContent(el)) return false;
    el.innerHTML = "";
    clearDialogsTarget();
    clearDialogOnlyXTarget();
    return true;
  }
  function closeItemDialog() {
    const el = dialogEl("item");
    if (!hasContent(el)) return false;
    el.innerHTML = "";
    clearDialogsTarget();
    return true;
  }
  function closeTopLeftDialog() {
    if (closeBuffDialog()) return true;
    return closeItemDialog();
  }
  function closeAllInfoDialogs() {
    const a = closeBuffDialog();
    const b = closeItemDialog();
    return a || b;
  }
  function setInfoDialogLayoutEditing(editing) {
    window.__ecuInfoDialogLayoutEdit = !!editing;
  }
  function ensureCloseButton(dialog, kind) {
    if (!hasContent(dialog)) return;
    if (dialog.querySelector("." + CLOSE_CLASS)) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = CLOSE_CLASS;
    btn.title = "Close";
    btn.setAttribute("aria-label", "Close");
    btn.textContent = "\xD7";
    btn.addEventListener("click", (ev) => {
      if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
      if (ev && typeof ev.preventDefault === "function") ev.preventDefault();
      if (kind === "buff") closeBuffDialog();
      else closeItemDialog();
    });
    const panel = dialog.querySelector(".buyitem") || dialog.querySelector(".cccx") || dialog.firstElementChild;
    if (panel) {
      const pos = window.getComputedStyle(panel).position;
      if (!pos || pos === "static") panel.style.position = "relative";
      panel.appendChild(btn);
    } else {
      dialog.appendChild(btn);
    }
  }
  function observeCloseButton(dialog, kind) {
    if (typeof MutationObserver !== "function") {
      ensureCloseButton(dialog, kind);
      return;
    }
    const key = "__ecuCloseObs";
    if (dialog[key]) {
      ensureCloseButton(dialog, kind);
      return;
    }
    dialog[key] = true;
    const obs = new MutationObserver(() => {
      ensureCloseButton(dialog, kind);
    });
    obs.observe(dialog, { childList: true, subtree: true, characterData: true });
    ensureCloseButton(dialog, kind);
  }
  function installDialogDismiss() {
    if (window[BOUND]) return;
    window[BOUND] = true;
    document.addEventListener("mousedown", (ev) => {
      if (window.__ecuInfoDialogLayoutEdit) return;
      if (!isTopLeftDialogOpen()) return;
      const t = ev.target;
      if (!t) return;
      const el = t;
      const inBuff = !!(el.closest && (el.closest("#" + BUFF_DIALOG_ID) || el.closest('[data-panel="buffInfo"]')));
      const inItem = !!(el.closest && (el.closest("#" + ITEM_DIALOG_ID) || el.closest('[data-panel="itemInfo"]')));
      if (inBuff || inItem) return;
      closeAllInfoDialogs();
    });
  }
  function ensureNamedDialog(id, parent) {
    let dialog = document.getElementById(id);
    if (!dialog) {
      dialog = document.createElement("div");
      dialog.id = id;
      dialog.className = "bpclicks enableclicks";
      parent.append(dialog);
    }
    return dialog;
  }
  function ensureDialogElements() {
    injectDialogHostCss();
    let corner = document.getElementById("topleftcorner");
    if (!corner) {
      corner = document.createElement("div");
      corner.id = "topleftcorner";
      corner.className = "bpclicks";
      document.body.append(corner);
    }
    if (!document.getElementById("topleftcornerui")) {
      const ui = document.createElement("div");
      ui.id = "topleftcornerui";
      ui.className = "bpclicks";
      corner.append(ui);
    }
    const stock = ensureNamedDialog(STOCK_DIALOG_ID, corner);
    const buff = ensureNamedDialog(BUFF_DIALOG_ID, corner);
    const item = ensureNamedDialog(ITEM_DIALOG_ID, corner);
    return { buff, item, stock };
  }
  function remapStockSelector(selector, kind) {
    if (selector === STOCK_SEL || selector === STOCK_DIALOG_ID) {
      return kind === "buff" ? BUFF_SEL : ITEM_SEL;
    }
    return selector;
  }
  function installRenderPatches() {
    const w = window;
    const done = w[PATCHED] || (w[PATCHED] = {});
    if (!done.condition && typeof w.render_condition === "function") {
      const orig = w.render_condition;
      w.render_condition = function(selector, name) {
        return orig.call(
          this,
          remapStockSelector(selector, "buff"),
          name
        );
      };
      done.condition = true;
    }
    if (!done.skill && typeof w.render_skill === "function") {
      const orig = w.render_skill;
      w.render_skill = function(selector, skill, args) {
        return orig.call(
          this,
          remapStockSelector(selector, "buff"),
          skill,
          args
        );
      };
      done.skill = true;
    }
    if (!done.item && typeof w.render_item === "function") {
      const orig = w.render_item;
      w.render_item = function(selector, args) {
        return orig.call(
          this,
          remapStockSelector(selector, "item"),
          args
        );
      };
      done.item = true;
    }
    if (!done.slot && typeof w.slot_click === "function") {
      w.slot_click = function(name) {
        const target = w.xtarget || w.ctarget;
        const itemHost = document.getElementById(ITEM_DIALOG_ID);
        if (w.last_sclick && w.last_sclick === name && itemHost && String(itemHost.innerHTML || "").trim()) {
          itemHost.innerHTML = "";
          return;
        }
        if (target && target.slots && target.slots[name]) {
          w.last_sclick = name;
          w.dialogs_target = target;
          const slot = target.slots[name];
          const G = w.G;
          if (typeof w.render_item === "function" && G && G.items && slot.name) {
            w.render_item(ITEM_SEL, {
              id: "item" + name,
              item: G.items[slot.name],
              name: slot.name,
              actual: slot,
              slot: name,
              from_player: target.id
            });
          }
        }
      };
      done.slot = true;
    }
  }
  function installJqueryClearHook() {
    const $ = window.$;
    if (!$ || !$.fn || $.fn[JQ_PATCHED]) return;
    const orig = $.fn.html;
    if (typeof orig !== "function") return;
    $.fn[JQ_PATCHED] = true;
    $.fn.html = function() {
      if (arguments.length > 0 && arguments[0] === "" && this && this.length) {
        let hitStock = false;
        for (let i = 0; i < this.length; i++) {
          const node = this[i];
          if (node && node.id === STOCK_DIALOG_ID) {
            hitStock = true;
            break;
          }
        }
        if (hitStock) closeAllInfoDialogs();
      }
      return orig.apply(this, arguments);
    };
  }
  function adoptInfoDialog(kind, slot) {
    const { buff, item } = ensureDialogElements();
    const dialog = kind === "buff" ? buff : item;
    if (dialog.parentElement !== slot) {
      slot.appendChild(dialog);
    }
    dialog.classList.add(ADOPTED_CLASS);
    dialog.setAttribute("data-ecu-kind", kind);
    dialog.setAttribute("data-panel-host", panelAttrFor(kind));
    const corner = document.getElementById("topleftcorner");
    if (corner) corner.classList.add("ecu-info-slot-host");
    installRenderPatches();
    installJqueryClearHook();
    installDialogDismiss();
    observeCloseButton(dialog, kind);
    return dialog;
  }
  function ensureDialogHost() {
    const { buff, item } = ensureDialogElements();
    installRenderPatches();
    installJqueryClearHook();
    installDialogDismiss();
    observeCloseButton(buff, "buff");
    observeCloseButton(item, "item");
  }

  // src/host/keyboardPolicy.ts
  var BOUND2 = "__ecuCommKeyboardBound";
  function installCommKeyboardPolicy(handlers) {
    window.__ecuCommKeyHandlers = handlers;
    if (window[BOUND2]) return;
    window[BOUND2] = true;
    document.addEventListener("keydown", (ev) => {
      const key = ev.key || "";
      const code = ev.keyCode;
      const h = window.__ecuCommKeyHandlers || {};
      if (key === "Escape" || code === 27) {
        if (isTopLeftDialogOpen() && closeTopLeftDialog()) return;
        if (isServerDdOpen()) {
          closeServerDd();
          return;
        }
        if (h.clearPaperdoll && h.clearPaperdoll()) return;
        if (window.observing && window.__ecuClearObserve) {
          window.__ecuClearObserve();
        }
        return;
      }
      if ((key === "l" || key === "L") && ev.ctrlKey && ev.shiftKey && !ev.altKey) {
        const t = ev.target;
        const tag = t && t.tagName ? t.tagName.toLowerCase() : "";
        if (tag === "input" || tag === "textarea" || tag === "select" || t && t.isContentEditable) {
          return;
        }
        if (!h.toggleLayoutEdit) return;
        ev.preventDefault();
        h.toggleLayoutEdit();
      }
    });
  }
  function updateCommKeyboardHandlers(handlers) {
    window.__ecuCommKeyHandlers = handlers;
  }

  // src/host/commChrome.ts
  function suppressObserveUi() {
    const el = document.getElementById("observeui");
    if (el && el.style.display !== "none") {
      el.style.display = "none";
      el.classList.add("hidden");
    }
  }
  function watchObserveUiHidden() {
    const bottom = document.getElementById("bottom") || document.body;
    const mo = new MutationObserver(() => suppressObserveUi());
    mo.observe(bottom, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"]
    });
    suppressObserveUi();
    return () => mo.disconnect();
  }
  function installCommChrome() {
    if (window.__ecuCommChromePatched) return;
    window.__ecuCommChromePatched = true;
    injectChromeCss();
    bindServerDdDoc();
    installCommKeyboardPolicy({});
    window.__ecuToggleObserve = toggleObserve;
    window.__ecuClearObserve = clearObserve;
    window.close_comm_server_dd = closeServerDd;
    window.toggle_comm_server_dd = toggleServerDd;
    window.select_comm_server = selectServer;
    window.hide_nav = function() {
    };
    window.toggle_ui = function() {
      const trigger = document.querySelector(
        ".ecu-server-dd-trigger"
      );
      if (trigger) trigger.click();
    };
    window.render_characters = renderCharactersHud;
    window.render_servers = renderServersHud;
    const boot = () => {
      ensureChromeShell();
      renderCharactersHud();
      renderServersHud();
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot);
    } else {
      boot();
    }
    const stopObserveWatch = watchObserveUiHidden();
    let lastObs = "";
    let lastPingAt = 0;
    const unsubTick = subscribeTick((snap) => {
      const name = snap.observing && snap.observing.name || window.observing && window.observing.name || "";
      if (name !== lastObs) {
        lastObs = name;
        invalidateCharacterCache();
        renderCharactersHud();
      } else {
        syncActionsEnabled();
      }
      if (snap.now - lastPingAt >= 1e3) {
        lastPingAt = snap.now;
        syncServerPingHud();
      }
    });
    window.addEventListener("unload", () => {
      stopObserveWatch();
      unsubTick();
    });
  }

  // src/host/inventory.ts
  var HOST_ID = "bottomleftcorner";
  var STYLE_ID3 = "comm-ui-inventory-host-css";
  var MOUNT_ID = "comm-bag-mount";
  var SAVED_CHAR = "__ecuInvSavedChar";
  var HOLD_CHAR = "__ecuInvHoldChar";
  var listeners3 = [];
  function injectHostCss() {
    if (document.getElementById(STYLE_ID3)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID3;
    style.textContent = `
#${HOST_ID} {
  position: relative;
  left: auto;
  bottom: auto;
  z-index: auto;
  pointer-events: auto;
  max-width: min(96vw, 420px);
  max-height: min(70vh, calc(100vh - 72px));
  overflow: auto;
}
#${HOST_ID} .theinventory {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}
.imodal .theinventory {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}
#${MOUNT_ID} {
  pointer-events: auto;
}
`;
    document.head.append(style);
  }
  function notifyInventory(open) {
    for (let i = 0; i < listeners3.length; i++) {
      try {
        listeners3[i](open);
      } catch (e2) {
      }
    }
  }
  function subscribeInventory(listener) {
    listeners3.push(listener);
    return () => {
      const idx = listeners3.indexOf(listener);
      if (idx >= 0) listeners3.splice(idx, 1);
    };
  }
  function isInventoryOpen() {
    return !!window.inventory;
  }
  function applyBagLayoutPos(pos) {
    const host = document.getElementById(HOST_ID);
    if (!host) return;
    if (host.parentElement && host.parentElement.id === MOUNT_ID) {
      host.style.position = "relative";
      host.style.left = "";
      host.style.top = "";
      host.style.transform = "";
      host.style.zIndex = "";
      return;
    }
    const layout = mergeLayout(getSettings().panelLayout);
    const p = pos || layout.bag;
    const style = panelStyle(p, false);
    host.style.position = "fixed";
    host.style.left = String(style.left);
    host.style.top = String(style.top);
    host.style.transform = String(style.transform);
    host.style.zIndex = "240";
    host.style.pointerEvents = "auto";
    host.style.maxWidth = "min(96vw, 420px)";
    host.style.maxHeight = "min(70vh, calc(100vh - 72px))";
    host.style.overflow = "auto";
  }
  function ensureInventoryHost() {
    injectHostCss();
    let el = document.getElementById(HOST_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = HOST_ID;
      el.className = "bpclicks enableclicks";
      document.body.append(el);
    }
    applyBagLayoutPos();
    return el;
  }
  function attachInventoryToMount(mount) {
    if (!mount) return;
    mount.id = MOUNT_ID;
    const host = ensureInventoryHost();
    if (host.parentElement !== mount) {
      mount.append(host);
    }
    applyBagLayoutPos();
  }
  function callThroughDraw(fn) {
    if (typeof window.draw_trigger === "function") {
      window.draw_trigger(fn);
    } else {
      fn();
    }
  }
  function restoreCharacter() {
    if (!window[HOLD_CHAR]) return;
    window.character = window[SAVED_CHAR];
    delete window[SAVED_CHAR];
    window[HOLD_CHAR] = false;
  }
  function prepareObservingCharacter() {
    const obs = window.observing;
    if (!window[HOLD_CHAR]) {
      window[SAVED_CHAR] = window.character;
      window[HOLD_CHAR] = true;
    }
    if (obs) {
      window.character = obs;
    }
    const ch = window.character;
    if (!ch) return false;
    if (!ch.items) ch.items = [];
    if (ch.isize == null) ch.isize = 42;
    if (!ch.q) ch.q = {};
    return true;
  }
  function openInventory() {
    callThroughDraw(() => {
      if (typeof window.render_inventory === "function") {
        window.render_inventory();
      }
    });
  }
  function restorePreferredBagOpen() {
    const preferOpen = !!getSettings().bagOpenPreferred;
    if (!preferOpen) return;
    if (isInventoryOpen()) return;
    window.setTimeout(() => {
      if (isInventoryOpen()) return;
      if (typeof window.render_inventory === "function") {
        openInventory();
      }
    }, 600);
  }
  function installInventoryFix() {
    if (window.__ecuInventoryPatched) return;
    const tryPatch = () => {
      const original = window.render_inventory;
      if (typeof original !== "function") return false;
      if (window.__ecuInventoryPatched) return true;
      window.__ecuInventoryPatched = true;
      ensureInventoryHost();
      window.render_inventory = function patchedRenderInventory(reset) {
        ensureInventoryHost();
        if (window.inventory && !reset) {
          const host = document.getElementById(HOST_ID);
          if (host) host.innerHTML = "";
          window.inventory = false;
          restoreCharacter();
          notifyInventory(false);
          return;
        }
        const savedComm = window.is_comm;
        if (!prepareObservingCharacter()) {
          restoreCharacter();
          return;
        }
        window.is_comm = false;
        let opened = false;
        try {
          if (typeof window.hide_modal === "function") {
            try {
              window.hide_modal();
            } catch (e2) {
            }
          }
          const result = original.call(this, reset);
          opened = !!window.inventory;
          return result;
        } finally {
          window.is_comm = savedComm;
          restoreCharacter();
          if (opened) {
            applyBagLayoutPos();
            notifyInventory(true);
          } else if (!window.inventory) {
            notifyInventory(false);
          }
        }
      };
      restorePreferredBagOpen();
      return true;
    };
    if (tryPatch()) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (tryPatch() || attempts > 40) {
        window.clearInterval(timer);
      }
    }, 250);
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
    const { title, className, rows, embedded, highlightId } = props;
    if (!rows || rows.length === 0) return null;
    return e(
      "div",
      {
        className,
        style: {
          display: "flex",
          overflow: "auto",
          flexDirection: "column",
          margin: embedded ? 0 : "4px",
          border: embedded ? "none" : "2px solid #555",
          background: "black",
          gap: "2px",
          fontSize: "17px",
          textShadow: "none"
        }
      },
      e(
        "div",
        {
          style: {
            padding: "3px 8px",
            whiteSpace: "nowrap",
            position: "relative",
            fontSize: "14px",
            color: "#ccc",
            textShadow: "none"
          }
        },
        title
      ),
      ...rows.map((row) => {
        const isYou = highlightId != null && String(row.id) === String(highlightId);
        return e(
          "div",
          {
            key: row.id,
            style: {
              position: "relative",
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              minHeight: "22px",
              alignItems: "center",
              background: isYou ? "rgba(225,55,88,0.16)" : void 0,
              boxShadow: isYou ? "inset 3px 0 0 #e13758" : void 0
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
                padding: "2px 8px",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                overflow: "hidden",
                position: "relative",
                fontSize: "17px",
                textShadow: "none",
                color: isYou ? "#ffe0e8" : void 0
              }
            },
            row.name
          ),
          e(
            "div",
            {
              style: {
                padding: "2px 8px",
                whiteSpace: "nowrap",
                position: "relative",
                fontVariantNumeric: "tabular-nums",
                fontSize: "17px",
                textShadow: "none"
              }
            },
            row.label
          )
        );
      })
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
    const players2 = playersList(entities);
    const result = {};
    for (let i = 0; i < players2.length; i++) {
      const player = players2[i];
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
  function isCryptBossEntity(entity) {
    if (entity.type !== "monster" || !entity.mtype) return false;
    return CRYPT_BOSSES_MTYPES.indexOf(entity.mtype) >= 0;
  }
  function isAliveMonster(entity) {
    if (entity.type !== "monster") return false;
    if (entity.dead) return false;
    if (entity.hp != null && entity.hp <= 0) return false;
    return true;
  }
  function activeBosses(entities) {
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    for (let i = 0; i < entities.length; i++) {
      const ent = entities[i];
      if (!isAliveMonster(ent)) continue;
      if (!isCoopBoss(ent) && !isCryptBossEntity(ent)) continue;
      const id = String(ent.id);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(ent);
    }
    out.sort((a, b) => {
      const lb = b.level || 0;
      const la = a.level || 0;
      if (lb !== la) return lb - la;
      const cmp = String(a.name || a.mtype || a.id).localeCompare(
        String(b.name || b.mtype || b.id)
      );
      if (cmp !== 0) return cmp;
      return a.id < b.id ? -1 : 1;
    });
    return out;
  }
  function findEntity(entities, id) {
    if (id == null || id === "") return void 0;
    const tid = String(id);
    for (let i = 0; i < entities.length; i++) {
      if (String(entities[i].id) === tid) return entities[i];
    }
    return void 0;
  }

  // src/meters/strategies/pdps.ts
  function buildPdpsRows(entities) {
    const players2 = playersList(entities).filter((p) => (p.pdps || 0) > 0).sort((a, b) => (b.pdps || 0) - (a.pdps || 0));
    let maxPdps = 0;
    for (let i = 0; i < players2.length; i++) {
      maxPdps = Math.max(maxPdps, players2[i].pdps || 0);
    }
    if (!maxPdps || players2.length === 0) return [];
    return players2.map((player) => {
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
    const players2 = coopPlayers(entities);
    let maxContribution = 0;
    let totalContribution = 0;
    for (let i = 0; i < players2.length; i++) {
      const p = ((_b = (_a = players2[i].s) == null ? void 0 : _a.coop) == null ? void 0 : _b.p) || 0;
      maxContribution = Math.max(maxContribution, p);
      totalContribution += p;
    }
    if (!maxContribution || players2.length === 0) return [];
    return players2.map((player) => {
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
    const players2 = coopPlayers2(entities);
    if (players2.length === 0) return [];
    const powers = [];
    let maxPower = 0;
    let totalPower = 0.1;
    for (let i = 0; i < players2.length; i++) {
      const p = pointsPow065(players2[i]);
      powers.push(p);
      maxPower = Math.max(maxPower, p);
      totalPower += p;
    }
    return players2.map((player, i) => {
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

  // src/ui/chrome/PositionedPanel.ts
  function PositionedPanel(props) {
    const React = getReact();
    const { id, pos, editing, onMove, children, onClose, hidden, onShow } = props;
    const [hover, setHover] = React.useState(false);
    const dragging = React.useRef(false);
    const start = React.useRef({
      x: 0,
      y: 0,
      posX: 0,
      posY: 0
    });
    const lastPos = React.useRef(pos);
    lastPos.current = pos;
    const touchish = isTouchishProfile(props.viewportProfile || "desktop");
    const closeSize = touchish ? 36 : 22;
    const headerPad = touchish ? "8px 12px" : "3px 8px";
    const headerFont = touchish ? "15px" : "13px";
    const peerAxes = () => {
      const peers = props.peerLayout || {};
      const ids = Object.keys(peers);
      const xs = [];
      const ys = [];
      for (let i = 0; i < ids.length; i++) {
        if (ids[i] === id) continue;
        const p = peers[ids[i]];
        if (!p) continue;
        xs.push(p.x);
        ys.push(p.y);
      }
      return { xs, ys };
    };
    const onPointerDown = (ev) => {
      if (!editing) return;
      ev.preventDefault();
      ev.stopPropagation();
      dragging.current = true;
      start.current = {
        x: ev.clientX,
        y: ev.clientY,
        posX: pos.x,
        posY: pos.y
      };
      try {
        ev.currentTarget.setPointerCapture(ev.pointerId);
      } catch (e2) {
      }
    };
    const onPointerMove = (ev) => {
      if (!dragging.current) return;
      const root = document.getElementById("comm-ui") || document.documentElement;
      const rect = root.getBoundingClientRect();
      const { dxPct, dyPct } = deltaToPercent(
        ev.clientX - start.current.x,
        ev.clientY - start.current.y,
        rect.width,
        rect.height
      );
      let nextX = start.current.posX + dxPct;
      let nextY = start.current.posY + dyPct;
      nextX = Math.max(0, Math.min(100, nextX));
      nextY = Math.max(0, Math.min(100, nextY));
      const { xs, ys } = peerAxes();
      nextX = snapPercent(nextX, 2.2, xs);
      nextY = snapPercent(nextY, 2.2, ys);
      onMove(id, { ...pos, x: nextX, y: nextY });
    };
    const onPointerUp = (ev) => {
      if (!dragging.current) return;
      dragging.current = false;
      try {
        ev.currentTarget.releasePointerCapture(ev.pointerId);
      } catch (e2) {
      }
      const peers = props.peerLayout || {};
      const nudged = softAvoidOverlap(id, lastPos.current, peers);
      if (nudged.x !== lastPos.current.x || nudged.y !== lastPos.current.y) {
        onMove(id, nudged);
      }
    };
    const showClose = !!onClose && !hidden && (editing || hover || touchish);
    const opacity = typeof props.opacity === "number" && Number.isFinite(props.opacity) ? Math.max(0.25, Math.min(1, props.opacity)) : 1;
    const shellStyle = Object.assign(
      {},
      panelStyle(pos, editing),
      props.style || {},
      {
        opacity: editing && hidden ? Math.min(opacity, 0.72) : opacity
      },
      editing ? {
        outline: hidden ? "1px dashed rgba(140,140,140,0.7)" : "1px dashed rgba(255,220,100,0.85)",
        outlineOffset: "0px",
        background: hidden ? "rgba(20,20,20,0.55)" : "transparent"
      } : null
    );
    const closeBtn = showClose ? e(
      "button",
      {
        type: "button",
        title: `Hide ${PANEL_LABELS[id]}`,
        "aria-label": `Hide ${PANEL_LABELS[id]}`,
        onClick: (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          onClose();
        },
        onPointerDown: (ev) => ev.stopPropagation(),
        style: {
          position: "absolute",
          top: editing ? "2px" : "0",
          right: "0",
          zIndex: 2,
          width: `${closeSize}px`,
          height: `${closeSize}px`,
          padding: 0,
          margin: 0,
          border: "1px solid #555",
          background: "rgba(20,20,20,0.9)",
          color: "#ccc",
          fontSize: touchish ? "18px" : "14px",
          lineHeight: `${closeSize - 2}px`,
          cursor: "pointer",
          pointerEvents: "auto"
        }
      },
      "\xD7"
    ) : null;
    const editHeader = editing ? e(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: headerPad,
          paddingRight: onClose && !hidden ? `${closeSize + 8}px` : "8px",
          marginBottom: 0,
          background: hidden ? "rgba(30,30,30,0.92)" : "rgba(40,40,20,0.92)",
          border: hidden ? "1px solid #666" : "1px solid #886",
          cursor: "grab",
          userSelect: "none",
          fontSize: headerFont,
          color: hidden ? "#bbb" : "#ffe08a",
          whiteSpace: "nowrap",
          touchAction: "none",
          minHeight: touchish ? "40px" : void 0
        },
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel: onPointerUp
      },
      `\u283F ${PANEL_LABELS[id]}${hidden ? " (hidden)" : ""}`,
      hidden && onShow ? e(
        "button",
        {
          type: "button",
          onClick: (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            onShow();
          },
          onPointerDown: (ev) => ev.stopPropagation(),
          style: {
            marginLeft: "auto",
            cursor: "pointer",
            fontSize: touchish ? "14px" : "12px",
            padding: touchish ? "6px 12px" : "2px 8px",
            minHeight: touchish ? "36px" : void 0,
            border: "1px solid #7a7",
            background: "#1a2a1a",
            color: "#9e9"
          }
        },
        "Show"
      ) : null
    ) : null;
    const hiddenBodyStyle = Object.assign(
      {
        padding: "8px 10px",
        color: "#888",
        fontSize: "13px",
        minWidth: "120px",
        boxSizing: "border-box"
      },
      props.hiddenBodyStyle || {}
    );
    return e(
      "div",
      {
        className: `comm-pos-panel comm-pos-${id}`,
        "data-panel": id,
        style: shellStyle,
        onMouseEnter: onClose ? () => setHover(true) : void 0,
        onMouseLeave: onClose ? () => setHover(false) : void 0
      },
      editHeader,
      closeBtn,
      hidden && editing ? e(
        "div",
        {
          style: hiddenBodyStyle
        },
        `${PANEL_LABELS[id]} \u2014 closed`
      ) : children
    );
  }

  // src/ui/chrome/LayoutPlaceholder.ts
  function LayoutPlaceholder(props) {
    const accent = props.accent || "#555";
    return e(
      "div",
      {
        className: props.className,
        style: props.style
      },
      e(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 10px",
            background: `linear-gradient(90deg, ${accent}33, transparent)`,
            borderBottom: `1px solid ${accent}66`,
            color: "#888",
            fontSize: "17px"
          }
        },
        e("div", {
          style: {
            width: "8px",
            height: "8px",
            background: accent,
            flexShrink: 0
          }
        }),
        props.label
      ),
      props.children
    );
  }

  // src/ui/chrome/PanelShellDummy.ts
  function PanelShellDummy(props) {
    const rows = Math.max(1, props.rows || 3);
    const rowEls = [];
    for (let i = 0; i < rows; i++) {
      rowEls.push(
        e("div", {
          key: `r${i}`,
          style: {
            height: i === 0 ? "18px" : "14px",
            width: i === 0 ? "72%" : `${58 - i * 6}%`,
            background: i === 0 ? "#3a3a3a" : "#2a2a2a",
            opacity: 0.85
          }
        })
      );
    }
    return e(
      LayoutPlaceholder,
      {
        label: props.label,
        accent: props.accent || "#666",
        className: "comm-panel-shell-dummy",
        style: Object.assign(
          {
            opacity: 0.78,
            border: "2px solid #444",
            background: "rgba(0,0,0,0.88)",
            boxSizing: "border-box",
            minWidth: "160px"
          },
          props.style || {}
        )
      },
      e(
        "div",
        {
          style: {
            padding: "10px",
            display: "flex",
            flexDirection: "column",
            gap: "6px"
          }
        },
        props.hint ? e(
          "div",
          { style: { fontSize: "13px", color: "#777", marginBottom: "4px" } },
          props.hint
        ) : null,
        ...rowEls
      )
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
  function rebindTint(selector) {
    if (typeof window.get_tint !== "function") return;
    const tint = window.get_tint(selector);
    if (tint) tint.added = false;
  }
  function setXTarget(entity, opts) {
    window.xtarget = entity || null;
    window.__ecuDialogOnlyXTarget = !!(opts && opts.dialogOnly && entity);
  }
  function conditionClick(name) {
    if (typeof window.condition_click === "function") {
      window.condition_click(name);
    }
  }
  function slotClick(name) {
    if (typeof window.slot_click === "function") {
      window.slot_click(name);
    }
  }
  function slotSkin(slot) {
    var _a, _b;
    if (!slot || !slot.name) return void 0;
    const def = (_b = (_a = window.G) == null ? void 0 : _a.items) == null ? void 0 : _b[slot.name];
    return slot.skin || (def == null ? void 0 : def.skin);
  }

  // src/ui/chrome/EffectsRow.ts
  var lastConditionClick = "";
  var ICON_SIZE = 36;
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
            stacks: typeof actual.s === "number" ? actual.s : void 0,
            debuff: false,
            type: "skill",
            name: typeof def.name === "string" ? def.name : void 0
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
        stacks: typeof actual.s === "number" ? actual.s : void 0,
        debuff: !!(prop && prop.debuff),
        type: "condition",
        name: typeof (prop == null ? void 0 : prop.name) === "string" ? prop.name : void 0
      });
    }
    return out;
  }
  function effectsKey(effects) {
    return effects.map((ef) => ef.id).join("|");
  }
  function loaderId(hostClass) {
    return hostClass.replace(/[^a-zA-Z0-9_\-]/g, "_");
  }
  function effectTooltip(effect) {
    const parts = [];
    const label = effect.name || effect.id;
    const kind = effect.type === "skill" ? "Skill" : effect.debuff ? "Debuff" : "Buff";
    parts.push(`${label} (${kind})`);
    if (effect.ms != null && effect.ms > 0) {
      parts.push(`Remaining: ${formatTime(effect.ms / 1e3)}`);
    }
    if (effect.stacks != null && effect.stacks > 0) {
      parts.push(`Stacks: ${effect.stacks}`);
    }
    if (effect.name && effect.name !== effect.id) {
      parts.push(`id: ${effect.id}`);
    }
    return parts.join("\n");
  }
  function applyEffectTint(wrap, rid, ms) {
    if (!(ms != null && ms > 0)) return;
    const root = wrap.firstElementChild;
    const host = wrap.querySelector("div[style*='position: absolute']") || wrap.querySelector("div[style*='overflow']") || root;
    if (!host) return;
    const selector = ".skidloader" + rid;
    let loader = wrap.querySelector(selector);
    if (!loader) {
      loader = document.createElement("div");
      loader.className = "skidloader" + rid;
      loader.setAttribute(
        "style",
        "position: absolute; bottom: 0px; right: 0px; width: 4px; height: 1px; background-color: yellow"
      );
      host.appendChild(loader);
    }
    const until = Date.now() + ms;
    const prevUntil = Number(loader.getAttribute("data-until") || 0);
    if (prevUntil && until <= prevUntil + 400) return;
    loader.setAttribute("data-until", String(until));
    rebindTint(selector);
    loader.style.height = "1px";
    const img = host.querySelector("img");
    if (img) img.style.opacity = "0.5";
    addTint(selector, {
      ms,
      type: "skill",
      skid: rid
    });
  }
  function EffectIcon(props) {
    const React = getReact();
    const ref = React.useRef(null);
    const { effect, hostClass, entity, iconSize } = props;
    const entityId = String(entity.id);
    const rid = loaderId(hostClass);
    const tooltip = effectTooltip(effect);
    const clickable = effect.type !== "skill";
    React.useEffect(() => {
      const el = ref.current;
      if (!el) return;
      const opts = {
        skin: effect.skin,
        size: iconSize,
        draggable: false
      };
      const actual = typeof effect.stacks === "number" && effect.stacks ? { s: effect.stacks } : null;
      const html = itemContainer(opts, actual);
      if (html) {
        el.innerHTML = html;
        const root = el.firstElementChild;
        if (root) {
          root.style.margin = "0";
          root.removeAttribute("onmousedown");
          root.removeAttribute("ontouchstart");
          root.removeAttribute("onclick");
        }
        applyEffectTint(el, rid, effect.ms);
      } else {
        el.textContent = effect.id + (effect.stacks != null ? ` ${effect.stacks}` : "") + (effect.ms != null ? ` (${formatTime(effect.ms / 1e3)})` : "");
      }
      return () => {
        if (el) el.innerHTML = "";
      };
    }, [
      entityId,
      effect.id,
      effect.skin,
      effect.type,
      effect.stacks,
      hostClass,
      rid,
      iconSize
    ]);
    React.useEffect(() => {
      const el = ref.current;
      if (!el || !el.firstElementChild) return;
      applyEffectTint(el, rid, effect.ms);
    }, [entityId, effect.ms, rid]);
    const onClick = clickable ? (ev) => {
      if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
      if (ev && typeof ev.preventDefault === "function") ev.preventDefault();
      if (lastConditionClick === effect.id && isTopLeftDialogOpen()) {
        closeTopLeftDialog();
        lastConditionClick = "";
        return;
      }
      lastConditionClick = effect.id;
      setXTarget(entity, { dialogOnly: true });
      conditionClick(effect.id);
    } : void 0;
    return e("div", {
      ref,
      className: `comm-fx-icon ${hostClass}`,
      "data-condition": effect.id,
      "data-entity": entityId,
      title: tooltip,
      onClick,
      onMouseDown: clickable ? (ev) => {
        if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
      } : void 0,
      onPointerDown: clickable ? (ev) => {
        if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
      } : void 0,
      style: {
        position: "relative",
        display: "inline-block",
        verticalAlign: "top",
        // Allow .iqui / border overhang (right/bottom: -2px) to paint.
        overflow: "visible",
        flex: "0 0 auto",
        cursor: clickable ? "pointer" : "default",
        pointerEvents: "auto"
      }
    });
  }
  function EffectsRow(props) {
    const entityId = String(props.entity.id);
    const effects = buildEntityEffects(props.entity);
    const key = effectsKey(effects);
    const iconSize = typeof props.iconSize === "number" && props.iconSize > 0 ? props.iconSize : ICON_SIZE;
    const compact = !!props.compact;
    const gap = compact ? "3px" : "6px";
    const marginTop = compact ? "3px" : "6px";
    const padBottom = effects.length ? compact ? "2px" : "4px" : 0;
    const minHeight = effects.length ? iconSize + (compact ? 8 : 14) : 0;
    const maxVisible = typeof props.maxVisible === "number" ? props.maxVisible : compact ? 4 : 0;
    const overflow = maxVisible > 0 && effects.length > maxVisible ? effects.length - maxVisible : 0;
    const shown = overflow > 0 ? effects.slice(0, maxVisible) : effects;
    const hidden = overflow > 0 ? effects.slice(maxVisible) : [];
    const overflowTitle = hidden.map((ef) => {
      const label = ef.name || ef.id;
      const kind = ef.type === "skill" ? "skill" : ef.debuff ? "debuff" : "buff";
      return `${label} (${kind})`;
    }).join("\n");
    return e(
      "div",
      {
        key: `${entityId}:${key}`,
        className: "comm-fx-row" + (compact ? " is-compact" : ""),
        style: {
          display: "flex",
          flexDirection: "row",
          // Gap under MP bar so icons / quantity badges are not flush.
          marginTop,
          gap,
          flexWrap: compact && maxVisible > 0 ? "nowrap" : "wrap",
          alignItems: "flex-start",
          width: "100%",
          // Room for item_container chrome + .iqui (bottom:-2px overhang).
          minHeight,
          paddingBottom: padBottom,
          boxSizing: "border-box",
          pointerEvents: "auto",
          overflow: compact && maxVisible > 0 ? "hidden" : "visible"
        }
      },
      ...shown.map((ef) => {
        const hostClass = `comm-fx-${entityId}-${ef.id}`.replace(
          /[^a-zA-Z0-9_\-]/g,
          "_"
        );
        return e(EffectIcon, {
          key: `${entityId}-${ef.id}`,
          effect: ef,
          hostClass,
          entity: props.entity,
          iconSize
        });
      }),
      overflow > 0 ? e(
        "div",
        {
          className: "comm-fx-overflow",
          title: overflowTitle,
          style: {
            flex: "0 0 auto",
            minWidth: `${Math.max(22, iconSize - 4)}px`,
            height: `${iconSize}px`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(20,20,20,0.9)",
            border: "1px solid #555",
            color: "#ccc",
            fontSize: compact ? "11px" : "13px",
            lineHeight: 1,
            fontWeight: "normal",
            textShadow: "none",
            cursor: "default",
            boxSizing: "border-box"
          }
        },
        `+${overflow}`
      ) : null
    );
  }

  // src/ui/frames/Players.ts
  function hpPct(entity) {
    const max = entity.max_hp || 1;
    return Math.max(0, Math.min(100, Math.round((entity.hp || 0) / max * 100)));
  }
  function mpPct(entity) {
    const max = entity.max_mp || 1;
    return Math.max(0, Math.min(100, Math.round((entity.mp || 0) / max * 100)));
  }
  var CHIP_AGGRO_BADGE = {
    minWidth: "20px",
    height: "20px",
    fontSize: "14px",
    padX: "4px"
  };
  function chipOpacity(dead, oor) {
    if (dead) return 0.42;
    if (oor) return 0.62;
    return 1;
  }
  function Players(props) {
    const parties = partyGroups(props.entities);
    const byTarget = aggroByTarget(props.entities);
    const observing = props.observing;
    return e(
      "div",
      {
        className: "ecu-roster",
        style: {
          padding: "4px",
          display: "flex",
          gap: "6px",
          flexDirection: "column",
          maxWidth: "min(560px, 78vw)"
        }
      },
      parties.length ? null : e(
        "div",
        {
          style: {
            color: "#aaa",
            padding: "4px 2px",
            fontSize: "14px"
          }
        },
        "No parties in vision"
      ),
      ...parties.map(
        (party) => e(
          "div",
          {
            key: party[0] || "solo",
            className: "ecu-roster-party",
            style: { marginBottom: "2px" }
          },
          e(
            "div",
            {
              style: {
                fontSize: "12px",
                color: "#ccc",
                background: "rgba(0,0,0,0.55)",
                display: "inline-block",
                padding: "2px 6px",
                marginBottom: "4px"
              }
            },
            party[0] || "(no party)"
          ),
          e(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap",
                alignItems: "stretch",
                gap: "5px"
              }
            },
            ...party[1].map((player) => {
              var _a;
              const pid = String(player.id);
              const selected = props.selectedEntity != null && String(props.selectedEntity) === pid;
              const observed = props.observingId != null && String(props.observingId) === pid;
              const aggroMobs = byTarget[pid] || byTarget[player.id] || [];
              const hasAggro = aggroMobs.length > 0;
              const color = classColors[player.ctype || ""] || "#888";
              const dead = !!player.dead;
              const oor = !dead && !observed && !!observing && outOfRange(observing, player) === true;
              const aggroTitle = hasAggro ? `Aggro: ${aggroMobs.length} mob${aggroMobs.length === 1 ? "" : "s"}` : "";
              const nameTitle = [
                `${player.name || player.id}`,
                observed ? "Observing" : "",
                oor ? "Out of range" : "",
                dead ? "Dead" : "",
                aggroTitle
              ].filter(Boolean).join(" \xB7 ");
              let outline;
              if (hasAggro) outline = "1px solid #e05555";
              else if (observed) outline = "1px solid #e13758";
              else if (selected) outline = "1px solid #fff";
              return e(
                "div",
                {
                  key: player.id,
                  className: "ecu-chip" + (selected ? " is-selected" : "") + (observed ? " is-observed" : "") + (hasAggro ? " has-aggro" : "") + (dead ? " is-rip" : "") + (oor ? " is-oor" : ""),
                  title: nameTitle,
                  style: {
                    position: "relative",
                    flex: "0 0 auto",
                    width: "168px",
                    background: "transparent",
                    cursor: "pointer",
                    overflow: "visible",
                    boxSizing: "border-box",
                    opacity: chipOpacity(dead, oor)
                  },
                  onClick: () => {
                    if (selected) {
                      setXTarget(null);
                      props.setSelectedEntity(void 0);
                      return;
                    }
                    setXTarget(player);
                    props.setSelectedEntity(player.id);
                  }
                },
                e(
                  "div",
                  {
                    style: {
                      position: "relative",
                      height: "22px",
                      overflow: "hidden",
                      background: "rgba(0,0,0,0.45)",
                      outline,
                      boxShadow: hasAggro ? "inset 0 0 0 1px rgba(224,85,85,0.55)" : observed ? "inset 0 -2px 0 #e13758" : void 0
                    }
                  },
                  e("div", {
                    style: {
                      display: "block",
                      height: "100%",
                      width: `${hpPct(player)}%`,
                      background: color
                    }
                  }),
                  e(
                    "div",
                    {
                      style: {
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                        display: "flex",
                        alignItems: "center",
                        padding: "0 7px",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        fontSize: "15px",
                        letterSpacing: "0.04em",
                        lineHeight: 1,
                        color: "#fff",
                        pointerEvents: "none",
                        fontWeight: "normal",
                        textShadow: "none"
                      }
                    },
                    `${(_a = player.level) != null ? _a : ""} ${player.id}`
                  )
                ),
                hasAggro ? e(
                  "div",
                  {
                    className: "ecu-chip-aggro",
                    title: aggroTitle,
                    style: {
                      position: "absolute",
                      top: "-3px",
                      right: "-3px",
                      zIndex: 2,
                      minWidth: CHIP_AGGRO_BADGE.minWidth,
                      height: CHIP_AGGRO_BADGE.height,
                      padding: `0 ${CHIP_AGGRO_BADGE.padX}`,
                      boxSizing: "border-box",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#8a1e1e",
                      border: "1px solid #e05555",
                      color: "#ffd0d0",
                      fontSize: CHIP_AGGRO_BADGE.fontSize,
                      lineHeight: 1,
                      fontWeight: "normal",
                      textShadow: "none",
                      pointerEvents: "none"
                    }
                  },
                  String(aggroMobs.length)
                ) : null,
                e(
                  "div",
                  {
                    style: {
                      marginTop: "2px",
                      height: "5px",
                      overflow: "hidden",
                      background: "rgba(0,0,0,0.45)"
                    }
                  },
                  e("div", {
                    style: {
                      display: "block",
                      height: "100%",
                      width: `${mpPct(player)}%`,
                      background: "#3a6fd8"
                    }
                  })
                ),
                e(EffectsRow, {
                  key: `fx-${pid}`,
                  entity: player,
                  iconSize: 22,
                  compact: true,
                  maxVisible: 4
                })
              );
            })
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
          background: "rgba(0, 0, 0, 0.82)",
          border: "1px solid #555",
          padding: "4px 8px",
          fontSize: "14px",
          lineHeight: 1.25,
          color: "#eee"
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
  var chipStyle = {
    background: "rgba(0, 0, 0, 0.82)",
    border: "1px solid #555",
    padding: "4px 8px",
    fontSize: "14px",
    lineHeight: 1.25,
    color: "#eee",
    whiteSpace: "nowrap"
  };
  function ServerInfo(props) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const timeOffset = (_c = (_b = (_a = props.S) == null ? void 0 : _a.schedule) == null ? void 0 : _b.time_offset) != null ? _c : 0;
    const night = !!((_e = (_d = props.S) == null ? void 0 : _d.schedule) == null ? void 0 : _e.night);
    const events = Object.entries((_f = props.S) != null ? _f : {}).filter(
      (entry) => entry[0] !== "schedule"
    );
    const region = (_g = props.serverRegion) != null ? _g : "";
    const ident = (_h = props.serverIdentifier) != null ? _h : "";
    const serverLabel = `${region} ${ident}`.trim() || "\u2014";
    return e(
      "div",
      {
        key: "content",
        className: "ecu-server-info",
        style: {
          display: "flex",
          flexWrap: "wrap",
          gap: "4px",
          justifyContent: "center",
          alignItems: "stretch"
        }
      },
      e(
        "div",
        { style: chipStyle },
        e(
          "div",
          {
            style: {
              fontSize: "13px",
              color: "#f2f2f2",
              letterSpacing: "0.02em"
            }
          },
          serverLabel
        ),
        e(
          "div",
          {
            style: {
              fontSize: "12px",
              color: "#85c76b",
              fontVariantNumeric: "tabular-nums"
            }
          },
          getALServerTime(timeOffset) + (night ? " night" : " day")
        )
      ),
      ...events.map((event) => {
        var _a2, _b2;
        const live = !!((_a2 = event[1]) == null ? void 0 : _a2.live);
        const until = ((_b2 = event[1]) == null ? void 0 : _b2.event) ? getTimeUntil(event[1].event) : "";
        return e(
          "div",
          {
            key: event[0],
            style: {
              ...chipStyle,
              borderColor: live ? "#85c76b" : "#555"
            }
          },
          e(
            "div",
            {
              style: {
                fontSize: "13px",
                color: live ? "#b6e3a4" : "#eee"
              }
            },
            event[0]
          ),
          e(
            "div",
            {
              style: {
                fontSize: "12px",
                color: live ? "#85c76b" : "rgba(255,255,255,0.55)",
                fontVariantNumeric: "tabular-nums"
              }
            },
            live ? "live" : until
          )
        );
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
    const hpPct3 = maxHp > 0 ? hp / maxHp : 0;
    const mpPct2 = maxMp && maxMp > 0 ? (mp || 0) / maxMp : 0;
    return e(
      "div",
      {
        style: {
          display: "flex",
          width: "100%",
          flexDirection: "column",
          minWidth: 0
        }
      },
      e(
        "div",
        {
          style: {
            background: "black",
            position: "relative",
            width: "100%",
            minHeight: "30px",
            boxSizing: "border-box"
          }
        },
        e("div", {
          style: {
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: getPercent(hpPct3, 1),
            background: hpColor
          }
        }),
        e(
          "div",
          {
            style: Object.assign(
              {
                padding: "5px 10px",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                overflow: "hidden",
                position: "relative",
                textShadow: "none",
                fontWeight: "normal",
                cursor: onClick ? "pointer" : void 0,
                width: "100%",
                boxSizing: "border-box",
                lineHeight: "1.25"
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
        {
          style: {
            background: "black",
            width: "100%",
            height: "5px",
            boxSizing: "border-box"
          }
        },
        e("div", {
          style: {
            background: "#3a5fd4",
            height: "100%",
            width: getPercent(mpPct2, 1)
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
      showMp = true,
      threatCount = 0
    } = props;
    const name = `${(_a = entity.level) != null ? _a : 1} ${entity.name || entity.id}` + (entity.type === "monster" ? ` #${entity.id}` : "");
    const threatSpark = threatCount > 0 ? e(
      "span",
      {
        className: "comm-threat-spark",
        title: `Threat: ${threatCount} mob${threatCount === 1 ? "" : "s"} on you`,
        style: {
          flexShrink: 0,
          minWidth: "18px",
          height: "18px",
          padding: "0 4px",
          boxSizing: "border-box",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#8a1e1e",
          border: "1px solid #e05555",
          color: "#ffd0d0",
          fontSize: "12px",
          lineHeight: 1,
          fontWeight: "normal",
          textShadow: "none"
        }
      },
      String(threatCount)
    ) : null;
    const nameBlock = e(
      "span",
      {
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          minWidth: 0,
          overflow: "hidden"
        }
      },
      threatSpark,
      e(
        "span",
        {
          style: {
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0
          }
        },
        name
      )
    );
    const label = trailing ? e(
      "span",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          gap: "10px",
          width: "100%",
          alignItems: "center"
        }
      },
      nameBlock,
      e(
        "span",
        {
          style: {
            fontSize: "17px",
            opacity: 0.95,
            flexShrink: 0,
            fontWeight: "normal"
          }
        },
        trailing
      )
    ) : nameBlock;
    return e(
      "div",
      {
        className: "comm-unit",
        style: {
          display: "flex",
          width: "100%",
          flexDirection: "column",
          minWidth: 0,
          gap: "6px"
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
          nameStyle: {
            fontSize: fontSize != null ? fontSize : "21px",
            fontWeight: "normal"
          },
          onClick: onSelect ? () => onSelect(entity.id) : void 0
        },
        label
      ),
      showEffects ? e(EffectsRow, {
        key: `fx-${String(entity.id)}`,
        entity
      }) : null
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
  function hpPct2(entity) {
    const max = entity.max_hp || 1;
    return Math.max(0, Math.min(100, Math.round((entity.hp || 0) / max * 100)));
  }
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
    const moreEnemiesCount = Math.max(
      0,
      importantEnemies.length - maxEnemiesToShow
    );
    const squashKeys = Object.keys(squashEnemiesCounts);
    const shown = importantEnemies.slice(0, maxEnemiesToShow);
    if (!shown.length && !squashKeys.length) return null;
    return e(
      "div",
      {
        className: "ecu-aggro",
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          paddingTop: "4px",
          alignItems: "flex-end"
        }
      },
      e(
        "div",
        {
          style: {
            fontSize: "12px",
            color: "#ccc",
            background: "rgba(0,0,0,0.55)",
            display: "inline-block",
            padding: "2px 6px",
            alignSelf: "flex-end"
          }
        },
        "Aggro"
      ),
      e(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "flex-end",
            gap: "5px"
          }
        },
        ...shown.map((enemy) => {
          const selected = props.selectedEntity != null && String(props.selectedEntity) === String(enemy.id);
          return e(
            "div",
            {
              key: enemy.id,
              style: {
                position: "relative",
                flex: "0 0 auto",
                width: "168px",
                cursor: "pointer",
                overflow: "hidden",
                boxSizing: "border-box"
              },
              onClick: () => {
                setXTarget(enemy);
                props.setSelectedEntity(enemy.id);
              }
            },
            e(
              "div",
              {
                style: {
                  position: "relative",
                  height: "22px",
                  overflow: "hidden",
                  background: "rgba(0,0,0,0.45)",
                  outline: selected ? "1px solid #fff" : void 0
                }
              },
              e("div", {
                style: {
                  display: "block",
                  height: "100%",
                  width: `${hpPct2(enemy)}%`,
                  background: "#c44"
                }
              }),
              e(
                "div",
                {
                  style: {
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    display: "flex",
                    alignItems: "center",
                    padding: "0 7px",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                    fontSize: "15px",
                    letterSpacing: "0.04em",
                    lineHeight: 1,
                    color: "#ffd0d0",
                    pointerEvents: "none"
                  }
                },
                enemy.name || enemy.mtype || enemy.id
              )
            )
          );
        })
      ),
      ...squashKeys.map(
        (enemyMtype) => e(
          "div",
          {
            key: enemyMtype,
            style: {
              background: "rgba(0,0,0,0.55)",
              padding: "2px 6px",
              fontSize: "12px",
              color: "#aaa"
            }
          },
          `also ${squashEnemiesCounts[enemyMtype]} aggroed ${enemyMtype}'s`
        )
      ),
      moreEnemiesCount ? e(
        "div",
        {
          style: {
            background: "rgba(0,0,0,0.55)",
            padding: "2px 6px",
            fontSize: "12px",
            color: "#aaa"
          }
        },
        `...and ${moreEnemiesCount} more aggroed enemies`
      ) : void 0
    );
  }

  // src/ui/chrome/GearGrid.ts
  var GEAR_ROWS = [
    ["earring1", "helmet", "earring2", "amulet"],
    ["mainhand", "chest", "offhand", "cape"],
    ["ring1", "pants", "ring2", "orb"],
    ["belt", "shoes", "gloves", "elixir"]
  ];
  var SLOT_SHADE = {
    earring1: { shade: "shade_earring", s_op: 0.4 },
    helmet: { shade: "shade_helmet", s_op: 0.5 },
    earring2: { shade: "shade_earring", s_op: 0.4 },
    amulet: { shade: "shade_amulet", s_op: 0.4 },
    mainhand: { shade: "shade_mainhand", s_op: 0.36 },
    chest: { shade: "shade_chest", s_op: 0.4 },
    offhand: { shade: "shade_offhand", s_op: 0.4 },
    cape: { shade: "shade20_cape", s_op: 0.4 },
    ring1: { shade: "shade_ring", s_op: 0.4 },
    pants: { shade: "shade_pants", s_op: 0.5 },
    ring2: { shade: "shade_ring", s_op: 0.4 },
    orb: { shade: "shade20_orb", s_op: 0.4 },
    belt: { shade: "shade_belt", s_op: 0.4 },
    shoes: { shade: "shade_shoes", s_op: 0.5 },
    gloves: { shade: "shade_gloves", s_op: 0.4 },
    elixir: { shade: "shade20_elixir", s_op: 0.4 }
  };
  var TRADE_SHADE = { shade: "shade_gold", s_op: 0.2 };
  var SLOT_SIZE = 40;
  var EMPTY_BCOLOR = "#292929";
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
  function shadeFor(slotName) {
    if (slotName.indexOf("trade") === 0) return TRADE_SHADE;
    return SLOT_SHADE[slotName] || { shade: "placeholder", s_op: 0.4 };
  }
  function wrapContainerHtml(html) {
    return e("div", {
      style: { display: "inline-block", lineHeight: 0, fontSize: 0 },
      dangerouslySetInnerHTML: { __html: html },
      ref: (node) => {
        if (!node) return;
        const root = node.firstElementChild;
        if (!root) return;
        root.style.margin = "0";
        root.removeAttribute("onmousedown");
        root.removeAttribute("ontouchstart");
        root.removeAttribute("onclick");
      }
    });
  }
  function slotKey(slot) {
    var _a, _b;
    if (!slot || !slot.name) return "";
    return `${slot.name}|${(_a = slot.level) != null ? _a : ""}|${(_b = slot.q) != null ? _b : ""}`;
  }
  function SlotCell(props) {
    const { entity, slotName, slot, showPrice, diff } = props;
    const skin = slotSkin(slot);
    const { shade, s_op } = shadeFor(slotName);
    let content = null;
    const clickable = !!(slot && slot.name);
    if (slot && skin) {
      const html = itemContainer(
        {
          skin,
          size: SLOT_SIZE,
          slot: slotName,
          shade,
          s_op,
          draggable: false
        },
        slot
      );
      if (html) {
        content = wrapContainerHtml(html);
      } else {
        content = e(
          "div",
          {
            style: {
              width: `${SLOT_SIZE}px`,
              height: `${SLOT_SIZE}px`,
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
    } else {
      const html = itemContainer({
        size: SLOT_SIZE,
        shade,
        s_op,
        slot: slotName,
        bcolor: EMPTY_BCOLOR,
        draggable: false
      });
      if (html) {
        content = wrapContainerHtml(html);
      } else {
        content = e("div", {
          style: {
            width: `${SLOT_SIZE + 6}px`,
            height: `${SLOT_SIZE + 6}px`,
            background: "#000",
            border: `2px solid ${EMPTY_BCOLOR}`,
            boxSizing: "border-box"
          },
          title: slotName
        });
      }
    }
    const onSlotClick = clickable ? (ev) => {
      if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
      if (ev && typeof ev.preventDefault === "function") ev.preventDefault();
      setXTarget(entity);
      slotClick(slotName);
    } : void 0;
    return e(
      "div",
      {
        key: slotName,
        className: "comm-gear-slot" + (clickable ? " is-clickable" : ""),
        "data-slot": slotName,
        title: clickable ? slot.name : slotName,
        onClick: onSlotClick,
        onMouseDown: clickable ? (ev) => {
          if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
        } : void 0,
        onPointerDown: clickable ? (ev) => {
          if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
        } : void 0,
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "2px",
          position: "relative",
          cursor: clickable ? "pointer" : "default",
          pointerEvents: "auto"
        }
      },
      content,
      diff ? e(
        "div",
        {
          title: "Equip differs from watched",
          style: {
            position: "absolute",
            top: "-2px",
            right: "-2px",
            minWidth: "14px",
            height: "14px",
            padding: "0 3px",
            boxSizing: "border-box",
            background: "#3a2a10",
            border: "1px solid #c9a227",
            color: "#ffe08a",
            fontSize: "10px",
            lineHeight: "12px",
            textAlign: "center",
            fontWeight: "normal",
            textShadow: "none",
            pointerEvents: "none"
          }
        },
        "\u0394"
      ) : null,
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
    const compareSlots = props.compareTo && props.compareTo.slots;
    const tradeNames = tradeSlotNames(slots);
    const isDiff = (name) => {
      if (!compareSlots) return false;
      return slotKey(slots[name]) !== slotKey(compareSlots[name]);
    };
    return e(
      "div",
      {
        className: "comm-gear-grid",
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          pointerEvents: "auto"
        }
      },
      e(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            width: "fit-content"
          }
        },
        ...GEAR_ROWS.map(
          (row, ri) => e(
            "div",
            {
              key: `row${ri}`,
              style: {
                display: "flex",
                flexDirection: "row",
                flexWrap: "nowrap",
                gap: "2px"
              }
            },
            ...row.map(
              (name) => e(SlotCell, {
                key: name,
                entity: props.entity,
                slotName: name,
                slot: slots[name],
                diff: isDiff(name)
              })
            )
          )
        )
      ),
      tradeNames.length ? e(
        "div",
        {
          style: {
            display: "flex",
            flexWrap: "wrap",
            gap: "2px",
            borderTop: "1px solid #333",
            paddingTop: "4px",
            marginTop: "4px"
          }
        },
        e(
          "div",
          {
            style: {
              flex: "0 0 100%",
              fontSize: "10px",
              color: "#888",
              marginBottom: "2px",
              letterSpacing: "0.04em"
            }
          },
          "TRADE"
        ),
        ...tradeNames.map(
          (name) => e(SlotCell, {
            key: name,
            entity: props.entity,
            slotName: name,
            slot: slots[name],
            showPrice: true,
            diff: isDiff(name)
          })
        )
      ) : null
    );
  }

  // src/ui/paperdoll/CompareToWatched.ts
  function DeltaStat(props) {
    if (props.theirs == null || props.ours == null) return null;
    const d = props.theirs - props.ours;
    if (!Number.isFinite(d) || Math.abs(d) < 1e-4) return null;
    const positive = d > 0;
    const text = props.pct ? `${positive ? "+" : ""}${d.toFixed(1)}%` : `${positive ? "+" : ""}${Number.isInteger(d) ? d : d.toFixed(1)}`;
    return e(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          gap: "8px",
          fontSize: "14px",
          lineHeight: "18px"
        }
      },
      e("span", { style: { color: "#888" } }, props.label),
      e(
        "span",
        {
          style: {
            color: positive ? "#85c76b" : "#e07070",
            fontVariantNumeric: "tabular-nums"
          }
        },
        text
      )
    );
  }
  function CompareToWatched(props) {
    var _a, _b, _c, _d;
    const { entity, watching } = props;
    const watchName = watching.name || watching.id;
    return e(
      "div",
      {
        style: {
          borderTop: "1px solid #2a2a2a",
          paddingTop: "8px"
        }
      },
      e(
        "div",
        {
          style: {
            fontSize: "13px",
            color: "#888",
            marginBottom: "6px",
            letterSpacing: "0.04em"
          }
        },
        `VS ${watchName}`
      ),
      e(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "2px 12px",
            padding: "6px 8px",
            background: "#0a0a0a",
            border: "1px solid #2a2a2a"
          }
        },
        e(DeltaStat, {
          label: "ATK",
          theirs: entity.attack,
          ours: watching.attack
        }),
        e(DeltaStat, {
          label: "Heal",
          theirs: entity.heal,
          ours: watching.heal
        }),
        e(DeltaStat, {
          label: "Armor",
          theirs: (_a = entity.armor) != null ? _a : 0,
          ours: (_b = watching.armor) != null ? _b : 0
        }),
        e(DeltaStat, {
          label: "Res",
          theirs: (_c = entity.resistance) != null ? _c : 0,
          ours: (_d = watching.resistance) != null ? _d : 0
        }),
        e(DeltaStat, {
          label: "Eva",
          theirs: entity.evasion,
          ours: watching.evasion,
          pct: true
        }),
        e(DeltaStat, {
          label: "Refl",
          theirs: entity.reflection,
          ours: watching.reflection,
          pct: true
        }),
        e(DeltaStat, {
          label: "Speed",
          theirs: entity.speed,
          ours: watching.speed
        }),
        e(DeltaStat, {
          label: "Freq",
          theirs: entity.frequency,
          ours: watching.frequency
        }),
        e(DeltaStat, {
          label: "HP",
          theirs: entity.max_hp,
          ours: watching.max_hp
        }),
        e(DeltaStat, {
          label: "MP",
          theirs: entity.max_mp,
          ours: watching.max_mp
        })
      )
    );
  }

  // src/lib/frameSizes.ts
  var BAG_FRAME_WIDTH = 385;
  var BAG_FRAME_HEIGHT = 395;
  var BAG_PANEL_STYLE = {
    width: BAG_FRAME_WIDTH,
    minWidth: BAG_FRAME_WIDTH,
    minHeight: BAG_FRAME_HEIGHT,
    boxSizing: "border-box"
  };
  var PAPERDOLL_FRAME_WIDTH = 268;
  var PAPERDOLL_PANEL_STYLE = {
    width: "fit-content",
    maxWidth: "340px",
    boxSizing: "border-box"
  };
  var BOSS_BAR_PANEL_STYLE = {
    width: "min(520px, 72vw)",
    minWidth: "min(360px, 92vw)",
    boxSizing: "border-box"
  };
  var COMBAT_PANEL_STYLE = {
    width: "min(420px, 94vw)",
    minWidth: "min(280px, 92vw)",
    minHeight: "180px",
    boxSizing: "border-box"
  };
  var THREAT_PANEL_STYLE = {
    minWidth: "200px",
    width: "min(280px, 90vw)",
    minHeight: "96px",
    boxSizing: "border-box"
  };
  var COMMAND_PANEL_STYLE = {
    width: "min(560px, 94vw)",
    minHeight: "220px",
    boxSizing: "border-box"
  };
  var METER_PANEL_STYLE = {
    width: "200px",
    minWidth: "160px",
    minHeight: "72px",
    boxSizing: "border-box"
  };
  var KILLS_PANEL_STYLE = {
    width: "min(280px, 90vw)",
    minWidth: "180px",
    minHeight: "80px",
    boxSizing: "border-box"
  };
  var INFO_DIALOG_PANEL_STYLE = {
    width: "fit-content",
    maxWidth: "min(96vw, 520px)",
    // Above other play panels so buff/item tooltips stay readable.
    zIndex: 35,
    boxSizing: "border-box"
  };

  // src/ui/paperdoll/Stat.ts
  function Stat(props) {
    if (props.value == null || props.value === "") return null;
    return e(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          gap: "10px",
          fontSize: "15px",
          lineHeight: "20px"
        }
      },
      e("span", { style: { color: "#9a9a9a" } }, props.label),
      e(
        "span",
        { style: { color: props.accent || "#f0f0f0", textAlign: "right" } },
        props.value
      )
    );
  }

  // src/ui/paperdoll/VitalsBar.ts
  function VitalsBar(props) {
    const pct = props.max > 0 ? props.current / props.max : 0;
    return e(
      "div",
      { style: { marginBottom: "6px" } },
      e(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            fontSize: "14px",
            marginBottom: "3px",
            color: "#cfcfcf"
          }
        },
        e("span", {}, props.label),
        e("span", {}, `${props.current} / ${props.max}`)
      ),
      e(
        "div",
        {
          style: {
            height: "8px",
            background: "#1a1a1a",
            border: "1px solid #333",
            position: "relative",
            overflow: "hidden"
          }
        },
        e("div", {
          style: {
            width: getPercent(pct, 1),
            height: "100%",
            background: props.color
          }
        })
      )
    );
  }

  // src/ui/paperdoll/PaperdollDummy.ts
  var DUMMY_SLOT = 46;
  var PAPERDOLL_SHELL = {
    display: "flex",
    flexDirection: "column",
    margin: 0,
    background: "rgba(0,0,0,0.92)",
    boxShadow: "0 0 0 1px #111, 4px 4px 0 rgba(0,0,0,0.45)",
    width: PAPERDOLL_FRAME_WIDTH,
    minWidth: PAPERDOLL_FRAME_WIDTH,
    maxWidth: "340px",
    boxSizing: "border-box",
    overflow: "visible"
  };
  function PaperdollDummy() {
    const slots = [];
    for (let r = 0; r < 4; r++) {
      const cells = [];
      for (let c = 0; c < 4; c++) {
        cells.push(
          e("div", {
            key: `s${r}-${c}`,
            style: {
              width: DUMMY_SLOT,
              height: DUMMY_SLOT,
              background: "#0a0a0a",
              border: "2px solid #292929",
              boxSizing: "border-box"
            }
          })
        );
      }
      slots.push(
        e(
          "div",
          {
            key: `r${r}`,
            style: {
              display: "flex",
              flexDirection: "row",
              gap: "2px"
            }
          },
          ...cells
        )
      );
    }
    return e(
      LayoutPlaceholder,
      {
        className: "comm-paperdoll comm-paperdoll-dummy",
        label: "Paperdoll",
        style: Object.assign({}, PAPERDOLL_SHELL, {
          border: "2px dashed #555",
          opacity: 0.85
        })
      },
      e(
        "div",
        {
          style: {
            padding: "10px",
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }
        },
        e(
          "div",
          { style: { fontSize: "13px", color: "#666" } },
          "Select a unit to preview gear"
        ),
        e(
          "div",
          {},
          e(VitalsBar, {
            label: "HP",
            current: 0,
            max: 1,
            color: "#444"
          }),
          e(VitalsBar, {
            label: "MP",
            current: 0,
            max: 1,
            color: "#2a3a6a"
          })
        ),
        e(
          "div",
          {
            style: {
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "4px 14px",
              padding: "8px",
              background: "#0d0d0d",
              border: "1px solid #2a2a2a",
              color: "#555",
              fontSize: "15px",
              lineHeight: "20px"
            }
          },
          e(Stat, { label: "ATK", value: "\u2014" }),
          e(Stat, { label: "Armor", value: "\u2014" }),
          e(Stat, { label: "Res", value: "\u2014" }),
          e(Stat, { label: "Speed", value: "\u2014" })
        ),
        e(
          "div",
          {
            style: {
              borderTop: "1px solid #2a2a2a",
              paddingTop: "8px"
            }
          },
          e(
            "div",
            {
              style: {
                fontSize: "14px",
                color: "#555",
                marginBottom: "6px",
                letterSpacing: "0.04em"
              }
            },
            "GEAR"
          ),
          e(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                width: "fit-content"
              }
            },
            ...slots
          )
        )
      )
    );
  }

  // src/ui/frames/EntityInfo.ts
  function EntityInfo(props) {
    var _a, _b, _c;
    const entity = findEntity(props.entities, props.selectedEntity);
    if (!entity) {
      if (!props.layoutEdit) return null;
      return e(PaperdollDummy);
    }
    const accent = classColors[entity.ctype || ""] || (entity.type === "monster" ? "#c44" : "#888");
    const isPlayer = !!(entity.player || entity.type === "character");
    const title = `${entity.name || entity.id}` + (entity.mtype ? ` (${entity.mtype})` : "") + ` \xB7 ${(_a = entity.level) != null ? _a : 1}` + (entity.type === "monster" ? ` #${entity.id}` : "");
    const watching = props.observing;
    const compare = isPlayer && watching && String(watching.id) !== String(entity.id) && !!(watching.player || watching.type === "character");
    const close = () => {
      if (props.onClose) props.onClose();
      else setXTarget(null);
    };
    return e(
      "div",
      {
        className: "comm-paperdoll",
        style: Object.assign({}, PAPERDOLL_SHELL, {
          border: `2px solid ${accent}`
        }),
        onClick: (ev) => {
          ev.stopPropagation();
          setXTarget(entity);
        }
      },
      e(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 10px",
            background: `linear-gradient(90deg, ${accent}33, transparent)`,
            borderBottom: `1px solid ${accent}66`
          }
        },
        e("div", {
          style: {
            width: "8px",
            height: "8px",
            background: accent,
            flexShrink: 0
          }
        }),
        e(
          "div",
          {
            style: {
              flex: 1,
              minWidth: 0,
              fontSize: "17px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              textShadow: "none"
            },
            title
          },
          title
        ),
        e(
          "button",
          {
            type: "button",
            title: "Close",
            onClick: (ev) => {
              ev.stopPropagation();
              close();
            },
            style: {
              cursor: "pointer",
              border: "1px solid #555",
              background: "#1c1c1c",
              color: "#ddd",
              width: "32px",
              height: "32px",
              lineHeight: "28px",
              padding: 0,
              flexShrink: 0,
              fontSize: "18px"
            }
          },
          "\xD7"
        )
      ),
      e(
        "div",
        {
          style: {
            padding: "10px",
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }
        },
        e(
          "div",
          {
            style: {
              display: "flex",
              flexWrap: "wrap",
              gap: "4px 12px",
              fontSize: "14px",
              color: "#bdbdbd"
            }
          },
          entity.ctype ? e("span", { style: { color: accent } }, entity.ctype) : null,
          entity.party ? e("span", {}, `party ${entity.party}`) : null,
          entity.age != null ? e("span", {}, `age ${entity.age}`) : null,
          !isPlayer && entity.mtype ? e("span", {}, entity.mtype) : null
        ),
        e(
          "div",
          {},
          e(VitalsBar, {
            label: "HP",
            current: entity.hp || 0,
            max: entity.max_hp || 1,
            color: isPlayer ? accent : "#c33"
          }),
          e(VitalsBar, {
            label: "MP",
            current: entity.mp || 0,
            max: entity.max_mp || 1,
            color: "#3a5fd4"
          })
        ),
        e(
          "div",
          {
            style: {
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "4px 14px",
              padding: "8px",
              background: "#0d0d0d",
              border: "1px solid #2a2a2a"
            }
          },
          entity.attack ? e(Stat, {
            label: "ATK",
            value: `${entity.attack}${entity.damage_type ? ` ${entity.damage_type}` : ""}`
          }) : null,
          entity.heal ? e(Stat, { label: "Heal", value: entity.heal }) : null,
          e(Stat, { label: "Armor", value: (_b = entity.armor) != null ? _b : 0 }),
          e(Stat, { label: "Res", value: (_c = entity.resistance) != null ? _c : 0 }),
          entity.evasion ? e(Stat, {
            label: "Eva",
            value: getPercent(entity.evasion / 100, 1)
          }) : null,
          entity.reflection ? e(Stat, {
            label: "Refl",
            value: getPercent(entity.reflection / 100, 1)
          }) : null,
          entity.speed != null ? e(Stat, { label: "Speed", value: entity.speed.toFixed(1) }) : null,
          entity.frequency != null ? e(Stat, {
            label: "Freq",
            value: entity.frequency.toFixed(2)
          }) : null
        ),
        compare ? e(CompareToWatched, { entity, watching }) : null,
        entity.slots ? e(
          "div",
          {
            style: {
              borderTop: "1px solid #2a2a2a",
              paddingTop: "8px"
            }
          },
          e(
            "div",
            {
              style: {
                fontSize: "14px",
                color: "#888",
                marginBottom: "6px",
                letterSpacing: "0.04em"
              }
            },
            compare ? "GEAR \xB7 \u0394 vs watched" : "GEAR"
          ),
          e(GearGrid, {
            entity,
            compareTo: compare ? watching : null
          })
        ) : null
      )
    );
  }

  // src/ui/frames/InfoDialogPanel.ts
  function isOpen(kind) {
    return kind === "buff" ? isBuffDialogOpen() : isItemDialogOpen();
  }
  var LABELS = {
    buff: { label: "Buff info", hint: "Click a buff / condition" },
    item: { label: "Item info", hint: "Click a gear slot" }
  };
  function StockInfoPanel(props) {
    const React = getReact();
    const kind = props.kind;
    const slotRef = React.useRef(null);
    const [open, setOpen] = React.useState(isOpen(kind));
    const onOpenChange = props.onOpenChange;
    React.useEffect(() => {
      if (onOpenChange) onOpenChange(open);
    }, [open, onOpenChange]);
    React.useEffect(() => {
      const slot = slotRef.current;
      if (!slot) return;
      const dialog = adoptInfoDialog(kind, slot);
      setOpen(isOpen(kind));
      if (typeof MutationObserver !== "function") return;
      const obs = new MutationObserver(() => {
        setOpen(isOpen(kind));
      });
      obs.observe(dialog, {
        childList: true,
        subtree: true,
        characterData: true
      });
      return () => obs.disconnect();
    }, [kind]);
    const meta = LABELS[kind];
    const showDummy = !!props.layoutEdit && !open;
    const visible = open || !!props.layoutEdit;
    return e(
      "div",
      {
        className: `comm-info-dialog-panel comm-${kind}-info-panel`,
        style: {
          width: "fit-content",
          maxWidth: "min(96vw, 520px)",
          boxSizing: "border-box",
          minWidth: showDummy ? "200px" : void 0,
          minHeight: showDummy ? "120px" : void 0,
          pointerEvents: visible ? "auto" : "none"
        }
      },
      showDummy ? e(PanelShellDummy, {
        label: meta.label,
        hint: meta.hint,
        accent: kind === "buff" ? "#5a7a5a" : "#5a6a8a",
        rows: 4,
        style: {
          minWidth: "200px",
          minHeight: "120px",
          boxSizing: "border-box"
        }
      }) : null,
      e("div", {
        ref: slotRef,
        className: `comm-info-dialog-slot comm-${kind}-info-slot`,
        // Always mounted so stock writers can target the adopted host.
        style: {
          display: "block",
          height: open || props.layoutEdit ? void 0 : 0,
          overflow: open ? "visible" : "hidden",
          minHeight: 0
        }
      })
    );
  }
  function InfoDialogPanel(props) {
    return StockInfoPanel({
      kind: "buff",
      layoutEdit: props.layoutEdit,
      onOpenChange: props.onOpenChange
    });
  }

  // src/ui/chrome/FrameDummy.ts
  function FrameDummy(props) {
    const name = props.sampleName || props.label;
    const hpColor = props.hpColor || "#555";
    return e(
      "div",
      {
        className: "comm-unit comm-unit-dummy",
        style: {
          display: "flex",
          width: "100%",
          flexDirection: "column",
          minWidth: 0,
          gap: "6px",
          opacity: 0.72
        }
      },
      e(
        "div",
        {
          style: {
            display: "flex",
            width: "100%",
            flexDirection: "column",
            minWidth: 0
          }
        },
        e(
          "div",
          {
            style: {
              background: "black",
              position: "relative",
              width: "100%",
              minHeight: "30px",
              boxSizing: "border-box"
            }
          },
          e("div", {
            style: {
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: "62%",
              background: hpColor
            }
          }),
          e(
            "div",
            {
              style: {
                padding: "5px 10px",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                overflow: "hidden",
                position: "relative",
                fontSize: "21px",
                fontWeight: "normal",
                width: "100%",
                boxSizing: "border-box",
                lineHeight: "1.25",
                color: "#ccc"
              }
            },
            e(
              "span",
              {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "10px",
                  width: "100%",
                  alignItems: "center"
                }
              },
              e(
                "span",
                {
                  style: {
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    minWidth: 0
                  }
                },
                `1 ${name}`
              ),
              e(
                "span",
                {
                  style: {
                    fontSize: "14px",
                    opacity: 0.75,
                    flexShrink: 0,
                    color: "#aaa"
                  }
                },
                props.label
              )
            )
          )
        ),
        e(
          "div",
          {
            style: {
              background: "black",
              width: "100%",
              height: "5px",
              boxSizing: "border-box"
            }
          },
          e("div", {
            style: {
              background: "#2a3a6a",
              height: "100%",
              width: "40%"
            }
          })
        )
      )
    );
  }

  // src/ui/frames/PlayerRow.ts
  var UNIT_FRAME_STYLE = {
    width: "min(360px, 45vw)",
    minWidth: "280px",
    // Extra clearance so buffs/debuffs don't kiss the observe chrome.
    paddingBottom: "18px",
    boxSizing: "border-box"
  };
  function PlayerFrame(props) {
    const { observing, layoutEdit } = props;
    if (observing) {
      return e(ObservedUnit, {
        key: `obs-${String(observing.id)}`,
        entity: observing,
        hpColor: classColors[observing.ctype || ""] || "#666",
        fontSize: "21px",
        onSelect: (id) => {
          setXTarget(observing);
          props.setSelectedEntity(id);
        }
      });
    }
    if (layoutEdit) {
      return e(FrameDummy, {
        label: "Player",
        hpColor: "#5a4a6a"
      });
    }
    return null;
  }

  // src/ui/frames/TargetFrame.ts
  function targetTrailing(observing, target) {
    const dps = getDps();
    const hpPct3 = getPercent((target.hp || 0) / (target.max_hp || 1), 1);
    const ttk = estimateTtk(target.hp, dps);
    const dist = distance(observing, target);
    const oor = outOfRange(observing, target);
    const diff = difficultyBadge(target);
    const parts = [hpPct3];
    if (ttk != null) parts.push(`TTK ${formatTime(ttk)}`);
    if (dist != null) parts.push(`${Math.round(dist)}`);
    if (oor) parts.push("OOR");
    if (diff) parts.push(diff.label);
    return parts.join(" \xB7 ");
  }
  function threatOnTarget(entities, target, observingId) {
    if (!entities) return { count: 0, youHaveAggro: false };
    const byTarget = aggroByTarget(entities);
    const onYou = observingId != null ? byTarget[observingId] || [] : [];
    const youHaveAggro = !!observingId && target.type === "monster" && target.target != null && String(target.target) === String(observingId);
    return { count: onYou.length, youHaveAggro };
  }
  function TargetFrame(props) {
    const { observing, target, layoutEdit, entities } = props;
    const obsId = observing && observing.id != null ? String(observing.id) : void 0;
    if (target) {
      const threat = threatOnTarget(entities, target, obsId);
      const spark = threat.youHaveAggro || threat.count > 0 ? threat.count || 1 : 0;
      return e(ObservedUnit, {
        key: `tgt-${String(target.id)}`,
        entity: target,
        hpColor: classColors[target.ctype || ""] || "red",
        fontSize: "21px",
        trailing: targetTrailing(observing, target),
        threatCount: spark,
        onSelect: (id) => {
          setXTarget(target);
          props.setSelectedEntity(id);
        }
      });
    }
    if (layoutEdit) {
      return e(FrameDummy, {
        label: "Target",
        sampleName: "Sample Target",
        hpColor: "#6a3a3a"
      });
    }
    return null;
  }

  // src/ui/frames/BossBarPanel.ts
  function bossThreat(entity, observingId) {
    if (!observingId || entity.type !== "monster") return 0;
    if (entity.target != null && String(entity.target) === observingId) return 1;
    return 0;
  }
  function hpRatio(entity) {
    const max = entity.max_hp || 1;
    return (entity.hp || 0) / max;
  }
  function sortBosses(bosses, observingId) {
    const copy = bosses.slice();
    copy.sort((a, b) => {
      const aOnMe = bossThreat(a, observingId);
      const bOnMe = bossThreat(b, observingId);
      if (aOnMe !== bOnMe) return bOnMe - aOnMe;
      const hpCmp = hpRatio(a) - hpRatio(b);
      if (Math.abs(hpCmp) > 1e-4) return hpCmp;
      return String(a.id).localeCompare(String(b.id));
    });
    return copy;
  }
  function aggroName(boss, entities) {
    if (boss.target == null || boss.target === "") return null;
    const target = findEntity(entities, boss.target);
    if (target) return target.name || String(target.id);
    return String(boss.target);
  }
  var STACK_STYLE = {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    width: "100%"
  };
  function BossBarPanel(props) {
    const bosses = sortBosses(
      activeBosses(props.entities),
      props.observing && props.observing.id != null ? String(props.observing.id) : void 0
    );
    const obsId = props.observing && props.observing.id != null ? String(props.observing.id) : void 0;
    if (!bosses.length) {
      if (!props.layoutEdit) return null;
      return e(
        "div",
        { style: STACK_STYLE },
        e(FrameDummy, {
          label: "Boss",
          sampleName: "Cooperative Boss",
          hpColor: "#8a2a2a"
        }),
        e(FrameDummy, {
          label: "Boss",
          sampleName: "Crypt Boss",
          hpColor: "#6a2a6a"
        })
      );
    }
    return e(
      "div",
      { style: STACK_STYLE },
      ...bosses.map((boss) => {
        const onMe = bossThreat(boss, obsId) > 0;
        const aggro = aggroName(boss, props.entities);
        const pct = getPercent(hpRatio(boss), 1);
        return e(
          "div",
          {
            key: `boss-${String(boss.id)}`,
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "3px",
              cursor: "pointer",
              outline: onMe ? "1px solid rgba(224,85,85,0.55)" : void 0,
              outlineOffset: "1px"
            },
            title: "Click to target",
            onClick: () => {
              setXTarget(boss);
              props.setSelectedEntity(String(boss.id));
            }
          },
          e(ObservedUnit, {
            entity: boss,
            hpColor: onMe ? "#d43838" : "#c42a2a",
            fontSize: "22px",
            showMp: false,
            showEffects: false,
            trailing: pct,
            threatCount: onMe ? 1 : 0,
            onSelect: (id) => {
              setXTarget(boss);
              props.setSelectedEntity(id);
            }
          }),
          aggro ? e(
            "div",
            {
              style: {
                display: "inline-flex",
                alignSelf: "flex-start",
                alignItems: "center",
                gap: "6px",
                padding: "2px 8px",
                marginLeft: "2px",
                background: onMe ? "rgba(138,30,30,0.85)" : "rgba(30,30,30,0.9)",
                border: onMe ? "1px solid #e05555" : "1px solid #555",
                color: onMe ? "#ffd0d0" : "#bbb",
                fontSize: "13px",
                lineHeight: "1.2",
                fontWeight: "normal",
                textShadow: "none",
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              },
              title: onMe ? "Aggro on you" : `Aggro: ${aggro}`
            },
            onMe ? "Aggro \xB7 you" : `Aggro \xB7 ${aggro}`
          ) : e(
            "div",
            {
              style: {
                display: "inline-flex",
                alignSelf: "flex-start",
                padding: "2px 8px",
                marginLeft: "2px",
                background: "rgba(20,20,20,0.8)",
                border: "1px solid #444",
                color: "#888",
                fontSize: "13px",
                fontWeight: "normal",
                textShadow: "none"
              }
            },
            "Aggro \xB7 \u2014"
          )
        );
      })
    );
  }

  // src/ui/frames/ThreatTable.ts
  function ThreatTable(props) {
    const byTarget = aggroByTarget(props.entities);
    const targetIds = Object.keys(byTarget);
    if (targetIds.length === 0) {
      if (!props.layoutEdit) return null;
      return e(PanelShellDummy, {
        label: "Threat",
        hint: "Aggro by target",
        accent: "#844",
        rows: 4,
        style: THREAT_PANEL_STYLE
      });
    }
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
          gap: "3px",
          maxHeight: "200px",
          minWidth: "200px",
          fontSize: "15px"
        }
      },
      e(
        "div",
        {
          style: {
            padding: "6px 8px",
            whiteSpace: "nowrap",
            fontSize: "16px",
            textShadow: "none"
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
              padding: "5px 8px",
              display: "flex",
              justifyContent: "space-between",
              gap: "10px",
              fontSize: "15px",
              textShadow: "none",
              fontWeight: "normal",
              background: tid === props.observingId ? "rgba(80,0,0,0.5)" : void 0
            }
          },
          e("span", {}, name),
          e("span", { style: { color: "#ddd" } }, `${mobs.length} (${summary})`)
        );
      })
    );
  }

  // src/ui/frames/KillKpiPanel.ts
  function partyLabel(key) {
    return key.indexOf("solo:") === 0 ? key.slice(5) : key;
  }
  function killWord(n) {
    return n === 1 ? "kill" : "kills";
  }
  var softText = {
    textShadow: "none",
    fontWeight: "normal"
  };
  function KillKpiPanel() {
    const React = getReact();
    const [storedScope, setStoredScope] = React.useState(
      () => loadSettings().killScope
    );
    const stats = getStats();
    const hasObserver = getObservingId() != null && getObservingId() !== "";
    const scope = effectiveKillScope(storedScope, hasObserver);
    const setKillScope = (next) => {
      saveSettings({ killScope: next });
      setStoredScope(next);
    };
    const selectStyle = {
      fontSize: "16px",
      padding: "6px 10px",
      background: "#141414",
      color: "#eee",
      border: "1px solid #555",
      maxWidth: "260px",
      flex: "1 1 auto",
      ...softText
    };
    const resetBtn = e(
      "button",
      {
        type: "button",
        onClick: () => resetKillSession(),
        style: {
          cursor: "pointer",
          fontSize: "14px",
          padding: "4px 12px",
          border: "1px solid #555",
          background: "#1a1a1a",
          color: "#ccc",
          ...softText
        }
      },
      "Reset"
    );
    const header = (showReset) => e(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px"
        }
      },
      e("div", { style: { fontSize: "18px", ...softText } }, "Kills"),
      showReset ? resetBtn : null
    );
    const scopeRow = e(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }
      },
      e(
        "span",
        { style: { fontSize: "16px", color: "#bbb", ...softText } },
        "Scope"
      ),
      e(
        "select",
        {
          value: scope,
          style: selectStyle,
          onChange: (ev) => setKillScope(ev.target.value)
        },
        e(
          "option",
          { value: "watched" },
          killScopeLabel("watched", stats.trackingName)
        ),
        e("option", { value: "all" }, "Visible parties")
      )
    );
    const shell = (children) => e(
      "div",
      {
        style: {
          display: "flex",
          overflow: "auto",
          flexDirection: "column",
          margin: "4px",
          border: "2px solid #555",
          background: "rgba(0,0,0,0.94)",
          gap: "10px",
          padding: "10px",
          maxHeight: "280px",
          minWidth: "240px",
          fontSize: "16px",
          color: "#eee",
          ...softText
        }
      },
      ...children
    );
    if (!stats.active && scope === "watched") {
      return shell([
        header(false),
        scopeRow,
        e(
          "div",
          { style: { fontSize: "15px", color: "#999", ...softText } },
          "Select a character to track, or switch to visible parties."
        )
      ]);
    }
    const elapsedSec = stats.sessionStartedAt ? (Date.now() - stats.sessionStartedAt) / 1e3 : 0;
    const kpm = stats.killsPerMinute != null ? Math.round(stats.killsPerMinute) : null;
    const kph = stats.killsPerHour != null ? Math.round(stats.killsPerHour) : null;
    const kpd = stats.killsPerDay != null ? Math.round(stats.killsPerDay) : null;
    const rateCell = (value, unit) => e(
      "span",
      {
        style: {
          display: "inline-flex",
          gap: "2px",
          alignItems: "baseline",
          ...softText
        }
      },
      e("span", { style: { color: "#eee" } }, value != null ? String(value) : "\u2014"),
      e("span", { style: { color: "#888", fontSize: "14px" } }, `/${unit}`)
    );
    const listSection = (rows) => e(
      "div",
      {
        style: {
          borderTop: "1px solid #333",
          paddingTop: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "2px"
        }
      },
      ...rows
    );
    const listRow = (key, label, count) => e(
      "div",
      {
        key,
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "12px",
          fontSize: "15px",
          padding: "4px 0",
          ...softText
        }
      },
      e("span", { style: { color: "#ddd" } }, label),
      e("span", { style: { color: "#eee", minWidth: "2ch", textAlign: "right" } }, String(count))
    );
    return shell([
      header(true),
      scopeRow,
      e(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: "6px"
          }
        },
        e(
          "div",
          { style: { fontSize: "22px", lineHeight: "1.2", ...softText } },
          `${stats.total} ${killWord(stats.total)}`
        ),
        e(
          "div",
          {
            style: {
              display: "flex",
              flexWrap: "wrap",
              gap: "10px 14px",
              fontSize: "16px",
              ...softText
            }
          },
          ...kph != null ? [rateCell(kpm, "m"), rateCell(kph, "h"), rateCell(kpd, "d")] : [e("span", { style: { color: "#888" } }, "\u2014")]
        ),
        e(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "baseline",
              gap: "6px",
              fontSize: "15px",
              color: "#aaa",
              ...softText
            }
          },
          e("span", { style: { color: "#888" } }, "Session"),
          e(
            "span",
            {},
            stats.sessionStartedAt ? formatTime(elapsedSec) : "\u2014"
          )
        )
      ),
      scope === "all" && stats.byParty.length > 1 ? listSection(
        stats.byParty.slice(0, 8).map(
          (row) => listRow(row.party, partyLabel(row.party), row.count)
        )
      ) : null,
      stats.byMtype.length ? listSection(
        stats.byMtype.slice(0, 12).map((row) => listRow(row.mtype, row.mtype, row.count))
      ) : null
    ]);
  }

  // src/ui/chrome/MetricChart.ts
  function MetricChart(props) {
    const React = getReact();
    const ref = React.useRef(null);
    const width = props.width || 280;
    const height = props.height || 100;
    const series = props.series || [];
    const emptyText = props.emptyText || "No samples yet";
    React.useEffect(() => {
      const canvas = ref.current;
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
        ctx.font = "13px sans-serif";
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
        const y = padT + plotH * g / 2;
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
          const x = padL + plotW * i / Math.max(vals.length - 1, 1);
          const y = padT + plotH - plotH * (vals[i] || 0) / maxVal;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.fillStyle = "#ccc";
      ctx.font = "12px sans-serif";
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
        background: "#111"
      }
    });
  }

  // src/ui/frames/CombatMetricsPanel.ts
  var PRIMARY_CHANNELS = ["dps", "base", "hps"];
  var SECONDARY_CHANNELS = COMBAT_CHANNELS.filter(
    (ch) => PRIMARY_CHANNELS.indexOf(ch) < 0
  );
  function fmt(n) {
    return Math.round(n).toLocaleString();
  }
  function partyDisplay(key) {
    return key.indexOf("solo:") === 0 ? key.slice(5) : key;
  }
  function isChannelActive(ch, view, channels, barChannel) {
    return view === "bars" ? barChannel === ch : channels.indexOf(ch) >= 0;
  }
  function segBtn(label, active, onClick, first) {
    return e(
      "button",
      {
        type: "button",
        onClick,
        style: {
          cursor: "pointer",
          fontSize: "13px",
          lineHeight: "1.2",
          padding: "3px 9px",
          margin: 0,
          border: "none",
          borderLeft: first ? "none" : "1px solid #3a3a3a",
          borderRadius: 0,
          background: active ? "#2e2e2e" : "transparent",
          color: active ? "#eee" : "#888",
          textShadow: "none",
          fontWeight: "normal",
          outline: "none"
        }
      },
      label
    );
  }
  function channelChip(ch, active, onClick) {
    const color = CHANNEL_COLORS[ch];
    return e(
      "button",
      {
        type: "button",
        onClick,
        title: CHANNEL_LABELS[ch],
        style: {
          cursor: "pointer",
          fontSize: "12px",
          padding: "1px 5px",
          lineHeight: "1.2",
          margin: 0,
          border: active ? `1px solid ${color}` : "1px solid #2a2a2a",
          background: active ? `${color}18` : "transparent",
          color: active ? color : "#666",
          textShadow: "none",
          fontWeight: "normal"
        }
      },
      CHANNEL_LABELS[ch]
    );
  }
  function moreChip(expanded, hiddenActive, onClick) {
    const label = expanded ? "less" : hiddenActive > 0 ? `+${hiddenActive}` : "more";
    return e(
      "button",
      {
        type: "button",
        onClick,
        title: expanded ? "Hide secondary channels" : "Show more channels",
        style: {
          cursor: "pointer",
          fontSize: "11px",
          padding: "1px 5px",
          lineHeight: "1.2",
          margin: 0,
          border: "1px solid #333",
          background: expanded ? "#1c1c1c" : "transparent",
          color: "#888",
          textShadow: "none",
          fontWeight: "normal"
        }
      },
      label
    );
  }
  var cellPad = "2px 6px";
  function thCell(content, opts) {
    return e(
      "th",
      {
        key: opts && opts.key,
        style: {
          textAlign: opts && opts.textAlign || "left",
          padding: cellPad,
          fontWeight: "normal",
          textShadow: "none",
          color: opts && opts.color
        }
      },
      content
    );
  }
  function tdCell(content, opts) {
    return e(
      "td",
      {
        key: opts && opts.key,
        style: {
          padding: cellPad,
          fontWeight: "normal",
          textShadow: "none",
          textAlign: opts && opts.textAlign,
          color: opts && opts.color,
          maxWidth: opts && opts.maxWidth,
          overflow: opts && opts.overflow,
          textOverflow: opts && opts.textOverflow,
          whiteSpace: opts && opts.whiteSpace,
          fontVariantNumeric: opts && opts.fontVariantNumeric
        }
      },
      content
    );
  }
  function CombatMetricsPanel() {
    var _a, _b;
    const React = getReact();
    const [settings, setSettings] = React.useState(() => loadSettings());
    const [moreOpen, setMoreOpen] = React.useState(false);
    const patch = (partial) => {
      setSettings(saveSettings(partial));
    };
    const view = settings.combatView || "table";
    const storedFocus = settings.partyFocus || "watched";
    const compact = !!settings.combatCompact;
    const channels = compact ? ["dps", "hps"] : settings.combatChannels.length ? settings.combatChannels : ["dps"];
    const barChannel = compact ? settings.barChannel === "hps" ? "hps" : "dps" : settings.barChannel || "dps";
    const watchedId = getObservingId();
    const watchedKey = getWatchedPartyKey();
    const watching = ((_a = getObserving()) == null ? void 0 : _a.name) || ((_b = getObserving()) == null ? void 0 : _b.id) || "";
    const hasObserver = watchedId != null && watchedId !== "";
    const focus = effectivePartyFocus(storedFocus, hasObserver);
    const partyKeys = listPartyKeys("visible");
    const resolved = resolvePartyFocus(focus, watchedKey || "");
    const { scope, partyFilter, historyKey } = resolved;
    const rows = getCombatRows(scope, partyFilter);
    const totals = getPartyTotals(scope, partyFilter);
    const barRows = buildCombatBarRows(scope, barChannel, partyFilter);
    const history2 = getCombatHistory();
    const started = getCombatSessionStartedAt();
    const elapsed = started ? (Date.now() - started) / 1e3 : 0;
    const series = channels.slice(0, 4).map((ch) => ({
      label: CHANNEL_LABELS[ch],
      color: CHANNEL_COLORS[ch],
      values: history2.map((h) => {
        if (focus === "all" || focus === "visible") {
          const visibleKeys = focus === "visible" ? new Set(listPartyKeys("visible")) : null;
          let sum = 0;
          const keys = Object.keys(h.parties);
          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (visibleKeys && !visibleKeys.has(key)) continue;
            sum += h.parties[key] && h.parties[key][ch] || 0;
          }
          return sum;
        }
        if (!historyKey) return 0;
        const bucket = h.parties[historyKey];
        return bucket && bucket[ch] || 0;
      })
    }));
    const onChannelClick = (ch) => {
      if (view === "bars") {
        patch({ barChannel: ch });
        return;
      }
      const next = channels.slice();
      const idx = next.indexOf(ch);
      if (idx >= 0) {
        if (next.length <= 1) return;
        next.splice(idx, 1);
      } else {
        next.push(ch);
      }
      patch({ combatChannels: next });
    };
    const visibleSecondary = SECONDARY_CHANNELS.filter(
      (ch) => moreOpen || isChannelActive(ch, view, channels, barChannel)
    );
    const hiddenInactive = SECONDARY_CHANNELS.filter(
      (ch) => !moreOpen && !isChannelActive(ch, view, channels, barChannel)
    ).length;
    const chipChannels = PRIMARY_CHANNELS.concat(visibleSecondary);
    const selectStyle = {
      fontSize: "13px",
      lineHeight: "1.2",
      padding: "2px 6px",
      background: "#141414",
      color: "#ddd",
      border: "1px solid #444",
      maxWidth: "180px",
      minWidth: "0",
      flex: "1 1 auto"
    };
    return e(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          margin: "4px",
          border: "2px solid #555",
          background: "rgba(0,0,0,0.94)",
          gap: "6px",
          padding: "8px",
          width: "420px",
          maxHeight: "520px",
          overflow: "auto",
          fontSize: "14px",
          color: "#eee",
          textShadow: "none",
          fontWeight: "normal"
        }
      },
      // Header — title / elapsed+dps / Reset
      e(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minHeight: "22px"
          }
        },
        e(
          "div",
          {
            style: {
              fontSize: "16px",
              color: "#eee",
              textShadow: "none",
              flex: "0 0 auto"
            }
          },
          "Combat"
        ),
        e(
          "div",
          {
            style: {
              fontSize: "13px",
              color: "#999",
              textShadow: "none",
              flex: "1 1 auto",
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }
          },
          started ? `${formatTime(elapsed)} \xB7 ${fmt(totals.dps)} dps` : "waiting\u2026"
        ),
        e(
          "button",
          {
            type: "button",
            onClick: () => resetPartyCombat(),
            style: {
              cursor: "pointer",
              fontSize: "12px",
              lineHeight: "1.2",
              padding: "2px 8px",
              border: "1px solid #444",
              background: "#161616",
              color: "#aaa",
              textShadow: "none",
              fontWeight: "normal",
              flex: "0 0 auto"
            }
          },
          "Reset"
        ),
        e(
          "button",
          {
            type: "button",
            title: compact ? "Compact on \u2014 DPS + HPS only" : "Compact off \u2014 show all channels",
            onClick: () => patch({ combatCompact: !compact }),
            style: {
              cursor: "pointer",
              fontSize: "12px",
              lineHeight: "1.2",
              padding: "6px 12px",
              minHeight: "32px",
              border: compact ? "1px solid #85c76b" : "1px solid #444",
              background: compact ? "#1a2a1a" : "#161616",
              color: compact ? "#85c76b" : "#aaa",
              textShadow: "none",
              fontWeight: "normal",
              flex: "0 0 auto"
            }
          },
          compact ? "Compact" : "Full"
        ),
        hasObserver ? e(
          "button",
          {
            type: "button",
            title: "Focus the watched character's party",
            onClick: () => patch({ partyFocus: "watched" }),
            style: {
              cursor: "pointer",
              fontSize: "12px",
              lineHeight: "1.2",
              padding: "6px 10px",
              minHeight: "32px",
              border: focus === "watched" ? "1px solid #e13758" : "1px solid #444",
              background: focus === "watched" ? "rgba(225,55,88,0.18)" : "#161616",
              color: focus === "watched" ? "#ffe0e8" : "#aaa",
              textShadow: "none",
              fontWeight: "normal",
              flex: "0 0 auto"
            }
          },
          "My party"
        ) : null
      ),
      // Party + view tabs on one compact toolbar
      e(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap"
          }
        },
        e(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "5px",
              flex: "1 1 140px",
              minWidth: 0
            }
          },
          e(
            "span",
            {
              style: {
                fontSize: "12px",
                color: "#888",
                textShadow: "none",
                flex: "0 0 auto"
              }
            },
            "Party"
          ),
          e(
            "select",
            {
              value: focus,
              style: selectStyle,
              onChange: (ev) => {
                patch({ partyFocus: ev.target.value });
              }
            },
            e("option", { value: "watched" }, partyFocusLabel("watched", watching)),
            e("option", { value: "visible" }, "Visible parties"),
            e("option", { value: "all" }, "All parties"),
            partyKeys.length ? e("option", { value: "__sep__", disabled: true }, "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500") : null,
            ...partyKeys.map(
              (key) => e("option", { key, value: key }, partyDisplay(key))
            )
          )
        ),
        e(
          "div",
          {
            style: {
              display: "inline-flex",
              flex: "0 0 auto",
              border: "1px solid #444",
              background: "#111"
            }
          },
          segBtn("Table", view === "table", () => patch({ combatView: "table" }), true),
          segBtn("Bars", view === "bars", () => patch({ combatView: "bars" })),
          segBtn("Graph", view === "graph", () => patch({ combatView: "graph" }))
        )
      ),
      // Channel chips — hidden in compact (DPS+HPS forced)
      compact ? null : e(
        "div",
        {
          style: {
            display: "flex",
            flexWrap: "wrap",
            gap: "3px",
            alignItems: "center"
          }
        },
        e(
          "span",
          {
            style: {
              fontSize: "12px",
              color: "#888",
              marginRight: "2px",
              textShadow: "none"
            }
          },
          view === "bars" ? "Metric" : "Columns"
        ),
        ...chipChannels.map(
          (ch) => channelChip(
            ch,
            isChannelActive(ch, view, channels, barChannel),
            () => onChannelClick(ch)
          )
        ),
        SECONDARY_CHANNELS.length ? moreChip(moreOpen, hiddenInactive, () => setMoreOpen(!moreOpen)) : null
      ),
      // Content
      view === "graph" ? e(MetricChart, {
        width: 400,
        height: 140,
        series,
        emptyText: "Collecting samples\u2026"
      }) : null,
      view === "table" ? rows.length ? e(
        "div",
        { style: { overflowX: "auto" } },
        e(
          "table",
          {
            style: {
              borderCollapse: "collapse",
              width: "100%",
              fontSize: "17px",
              lineHeight: "1.25",
              textShadow: "none",
              fontWeight: "normal"
            }
          },
          e(
            "thead",
            {},
            e(
              "tr",
              {
                style: {
                  borderBottom: "1px solid #333",
                  color: "#999",
                  fontSize: "17px",
                  fontWeight: "normal"
                }
              },
              thCell("Name"),
              ...channels.map(
                (ch) => thCell(CHANNEL_LABELS[ch], {
                  key: ch,
                  textAlign: "right",
                  color: CHANNEL_COLORS[ch]
                })
              )
            )
          ),
          e(
            "tbody",
            {},
            ...rows.map((row) => {
              const isYou = watchedId != null && String(row.id) === String(watchedId);
              return e(
                "tr",
                {
                  key: row.id,
                  style: {
                    borderBottom: "1px solid #1a1a1a",
                    background: isYou ? "rgba(225,55,88,0.16)" : void 0,
                    boxShadow: isYou ? "inset 3px 0 0 #e13758" : void 0
                  }
                },
                tdCell(row.name, {
                  maxWidth: "130px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: isYou ? "#ffe0e8" : "#e8e8e8"
                }),
                ...channels.map(
                  (ch) => tdCell(fmt(row.rates[ch] || 0), {
                    key: ch,
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                    color: "#ddd"
                  })
                )
              );
            }),
            e(
              "tr",
              {
                key: "_total",
                style: {
                  background: "rgba(255,255,255,0.04)",
                  borderTop: "1px solid #3a3a3a",
                  color: "#cfcfcf",
                  fontWeight: "normal",
                  textShadow: "none"
                }
              },
              tdCell("Total", { color: "#bbb" }),
              ...channels.map(
                (ch) => tdCell(fmt(totals[ch] || 0), {
                  key: ch,
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums"
                })
              )
            )
          )
        )
      ) : e(
        "div",
        { style: { color: "#777", padding: "10px 2px", fontSize: "14px" } },
        "No combat data yet for this focus."
      ) : null,
      view === "bars" ? barRows.length ? e(RankMeter, {
        title: `${CHANNEL_LABELS[barChannel]} \xB7 ${partyFocusLabel(focus, watching)}`,
        className: "PartyCombatBars",
        rows: barRows,
        embedded: true,
        highlightId: watchedId
      }) : e(
        "div",
        { style: { color: "#777", padding: "10px 2px", fontSize: "14px" } },
        "No combat data yet for this focus."
      ) : null
    );
  }

  // src/host/codemirror.ts
  function getHostCodeMirror() {
    const CM = window.CodeMirror;
    return typeof CM === "function" ? CM : null;
  }
  function mountCommandCodeMirror(host, opts) {
    const CodeMirror = getHostCodeMirror();
    if (!CodeMirror) return null;
    while (host.firstChild) {
      host.removeChild(host.firstChild);
    }
    const cm = CodeMirror(host, {
      value: opts.value || "",
      mode: "javascript",
      indentUnit: 4,
      indentWithTabs: true,
      lineWrapping: true,
      lineNumbers: true,
      gutters: ["CodeMirror-linenumbers", "lspacer"],
      theme: "pixel",
      cursorHeight: 0.75,
      extraKeys: {
        "Ctrl-Enter": () => {
          opts.onCtrlEnter();
        },
        "Cmd-Enter": () => {
          opts.onCtrlEnter();
        }
      }
    });
    const wrap = cm.getWrapperElement();
    wrap.style.border = "1px solid #555";
    wrap.style.fontSize = "16px";
    wrap.style.lineHeight = "1.4";
    wrap.style.boxSizing = "border-box";
    wrap.style.width = "100%";
    cm.setSize("100%", "220px");
    cm.on("change", () => {
      opts.onChange(cm.getValue());
    });
    return cm;
  }
  function disposeCodeMirror(host) {
    if (!host) return;
    while (host.firstChild) {
      host.removeChild(host.firstChild);
    }
  }

  // src/ui/frames/CommandPanel.ts
  function btnStyle(opts) {
    const accent = (opts == null ? void 0 : opts.accent) === true;
    const danger = (opts == null ? void 0 : opts.danger) === true;
    return {
      cursor: "pointer",
      fontSize: "15px",
      padding: "5px 11px",
      border: danger ? "1px solid #844" : accent ? "1px solid #a86" : "1px solid #555",
      background: danger ? "#2a1515" : accent ? "#2a2410" : "#1a1a1a",
      color: danger ? "#eaa" : accent ? "#ffe08a" : "#ccc",
      textShadow: "none",
      fontWeight: "normal"
    };
  }
  function newId() {
    return `snip-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`;
  }
  function CommandPanel(props) {
    const React = getReact();
    const seedDraft = props.seedDraft;
    const openSeq = props.openSeq || 0;
    const [draft, setDraft] = React.useState(
      () => loadSettings().commandDraft || ""
    );
    const [snippets, setSnippets] = React.useState(
      () => loadSettings().commandSnippets.slice()
    );
    const [newName, setNewName] = React.useState("");
    const [newFolder, setNewFolder] = React.useState("");
    const [snippetQuery, setSnippetQuery] = React.useState("");
    const [folderFilter, setFolderFilter] = React.useState("all");
    const [status, setStatus] = React.useState("");
    const [selectedId, setSelectedId] = React.useState(
      null
    );
    const [cmAvailable] = React.useState(() => !!getHostCodeMirror());
    const editorHostRef = React.useRef(null);
    const textareaRef = React.useRef(null);
    const cmRef = React.useRef(null);
    const skipCmSyncRef = React.useRef(false);
    const draftRef = React.useRef(draft);
    const persistDraftRef = React.useRef((value) => {
      setDraft(value);
      saveSettings({ commandDraft: value });
    });
    const runCodeRef = React.useRef((_code) => {
    });
    draftRef.current = draft;
    const persistDraft = (value) => {
      setDraft(value);
      saveSettings({ commandDraft: value });
    };
    persistDraftRef.current = persistDraft;
    const persistSnippets = (next) => {
      setSnippets(next);
      saveSettings({ commandSnippets: next });
    };
    const runCode = (code) => {
      const ok = emitObserverCommand(code);
      if (ok) {
        setStatus("Sent to observed character");
      } else {
        setStatus("No socket or empty command");
      }
    };
    runCodeRef.current = runCode;
    const readEditorCode = () => {
      const cm = cmRef.current;
      if (cm) return cm.getValue();
      const el = textareaRef.current;
      if (el) return el.value;
      return draftRef.current;
    };
    const onRun = () => {
      runCode(readEditorCode());
    };
    React.useEffect(() => {
      if (!cmAvailable) return;
      const host = editorHostRef.current;
      if (!host) return;
      const cm = mountCommandCodeMirror(host, {
        value: draftRef.current,
        onChange: (value) => {
          skipCmSyncRef.current = true;
          persistDraftRef.current(value);
        },
        onCtrlEnter: () => {
          runCodeRef.current(readEditorCode());
        }
      });
      cmRef.current = cm;
      if (cm) {
        try {
          cm.focus();
          cm.refresh();
        } catch (e2) {
        }
      }
      return () => {
        disposeCodeMirror(host);
        cmRef.current = null;
      };
    }, [cmAvailable]);
    React.useEffect(() => {
      if (typeof seedDraft === "string") {
        persistDraft(seedDraft);
      }
      const cm = cmRef.current;
      if (cm) {
        try {
          if (typeof seedDraft === "string" && cm.getValue() !== seedDraft) {
            skipCmSyncRef.current = true;
            cm.setValue(seedDraft);
          }
          cm.focus();
          cm.refresh();
        } catch (e2) {
        }
        return;
      }
      const el = textareaRef.current;
      if (el && typeof el.focus === "function") {
        try {
          el.focus();
        } catch (e2) {
        }
      }
    }, [openSeq, seedDraft]);
    React.useEffect(() => {
      const cm = cmRef.current;
      if (!cm) return;
      if (skipCmSyncRef.current) {
        skipCmSyncRef.current = false;
        if (cm.getValue() === draft) return;
      }
      if (cm.getValue() !== draft) {
        skipCmSyncRef.current = true;
        cm.setValue(draft);
      }
    }, [draft]);
    const onSaveSnippet = () => {
      const name = String(newName || "").trim() || "Snippet";
      const code = String(readEditorCode() || "");
      if (!code.trim()) {
        setStatus("Write a command before saving");
        return;
      }
      if (code !== draft) persistDraft(code);
      const folder = String(newFolder || "").trim();
      const snip = { id: newId(), name, code };
      if (folder) snip.folder = folder;
      const next = snippets.slice();
      next.push(snip);
      persistSnippets(next);
      setNewName("");
      setStatus(folder ? `Saved \u201C${name}\u201D in ${folder}` : `Saved \u201C${name}\u201D`);
    };
    const onDelete = (id) => {
      const next = [];
      for (let i = 0; i < snippets.length; i++) {
        if (snippets[i].id !== id) next.push(snippets[i]);
      }
      persistSnippets(next);
      if (selectedId === id) setSelectedId(null);
      setStatus("Snippet removed");
    };
    const onPick = (snip) => {
      setSelectedId(snip.id);
      const cm = cmRef.current;
      if (cm && cm.getValue() !== snip.code) {
        skipCmSyncRef.current = true;
        try {
          cm.setValue(snip.code);
        } catch (e2) {
        }
      }
      persistDraft(snip.code);
    };
    const onKeyDown = (ev) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") {
        ev.preventDefault();
        onRun();
      }
    };
    const inputStyle = {
      fontSize: "16px",
      padding: "6px 9px",
      background: "#141414",
      color: "#eee",
      border: "1px solid #555",
      boxSizing: "border-box",
      textShadow: "none",
      fontWeight: "normal"
    };
    const folders = [];
    for (let i = 0; i < snippets.length; i++) {
      const f = snippets[i].folder;
      if (f && folders.indexOf(f) < 0) folders.push(f);
    }
    folders.sort((a, b) => a.localeCompare(b));
    const q = snippetQuery.trim().toLowerCase();
    const filtered = [];
    for (let i = 0; i < snippets.length; i++) {
      const snip = snippets[i];
      if (folderFilter === "__none__" && snip.folder) continue;
      if (folderFilter !== "all" && folderFilter !== "__none__" && (snip.folder || "") !== folderFilter) {
        continue;
      }
      if (q) {
        const hay = `${snip.name} ${snip.code} ${snip.folder || ""}`.toLowerCase();
        if (hay.indexOf(q) < 0) continue;
      }
      filtered.push(snip);
    }
    const snippetRows = [];
    for (let i = 0; i < filtered.length; i++) {
      const snip = filtered[i];
      const active = selectedId === snip.id;
      const preview = snip.code.replace(/\s+/g, " ").trim();
      snippetRows.push(
        e(
          "div",
          {
            key: snip.id,
            style: {
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "5px 7px",
              border: active ? "1px solid #a86" : "1px solid #3a3a3a",
              background: active ? "rgba(60,50,20,0.55)" : "rgba(18,18,18,0.9)"
            }
          },
          e(
            "button",
            {
              type: "button",
              onClick: () => onPick(snip),
              title: snip.code,
              style: {
                flex: 1,
                minWidth: 0,
                textAlign: "left",
                cursor: "pointer",
                border: "none",
                background: "transparent",
                color: "#eee",
                padding: 0,
                fontSize: "16px",
                lineHeight: "1.3",
                textShadow: "none",
                fontWeight: "normal"
              }
            },
            e(
              "div",
              {
                style: {
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }
              },
              snip.folder ? e(
                "span",
                {},
                e(
                  "span",
                  { style: { color: "#a86", marginRight: "6px" } },
                  snip.folder
                ),
                snip.name
              ) : snip.name
            ),
            e(
              "div",
              {
                style: {
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: "#999",
                  fontSize: "14px",
                  marginTop: "2px"
                }
              },
              preview || "(empty)"
            )
          ),
          e(
            "button",
            {
              type: "button",
              title: "Run snippet",
              onClick: () => {
                onPick(snip);
                runCode(snip.code);
              },
              style: btnStyle({ accent: true })
            },
            "Run"
          ),
          e(
            "button",
            {
              type: "button",
              title: "Delete snippet",
              onClick: () => onDelete(snip.id),
              style: btnStyle({ danger: true })
            },
            "\xD7"
          )
        )
      );
    }
    const editor = cmAvailable ? e("div", {
      ref: editorHostRef,
      className: "CommandPanel-editor",
      style: {
        width: "100%",
        minHeight: "220px"
      }
    }) : e("textarea", {
      ref: textareaRef,
      value: draft,
      rows: 10,
      spellCheck: false,
      onChange: (ev) => persistDraft(ev.target.value),
      onKeyDown,
      placeholder: "loot()\n// or any CODE for the watched character",
      style: Object.assign({}, inputStyle, {
        width: "100%",
        resize: "vertical",
        minHeight: "180px",
        fontFamily: "Consolas, Monaco, monospace",
        lineHeight: "1.4"
      })
    });
    return e(
      "div",
      {
        className: "CommandPanel",
        style: {
          display: "flex",
          flexDirection: "column",
          margin: "4px",
          border: "2px solid #555",
          background: "rgba(0,0,0,0.88)",
          gap: "10px",
          padding: "12px",
          width: "min(560px, 94vw)",
          maxHeight: "78vh",
          overflow: "auto",
          fontSize: "16px",
          color: "#eee",
          textShadow: "none",
          fontWeight: "normal"
        }
      },
      e(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: "8px"
          }
        },
        e("div", { style: { fontSize: "20px", color: "#ffe08a" } }, "Command"),
        e(
          "div",
          { style: { fontSize: "14px", color: "#aaa" } },
          "observer \u2192 code_eval \xB7 Ctrl+Enter"
        )
      ),
      editor,
      e(
        "div",
        {
          style: {
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            alignItems: "center"
          }
        },
        e(
          "button",
          {
            type: "button",
            onClick: onRun,
            style: btnStyle({ accent: true })
          },
          "Run"
        ),
        e(
          "input",
          {
            type: "text",
            value: newName,
            placeholder: "Snippet name",
            onChange: (ev) => setNewName(ev.target.value),
            style: Object.assign({}, inputStyle, {
              flex: "1 1 140px",
              minWidth: "120px"
            })
          }
        ),
        e(
          "input",
          {
            type: "text",
            value: newFolder,
            placeholder: "Folder (optional)",
            onChange: (ev) => setNewFolder(ev.target.value),
            style: Object.assign({}, inputStyle, {
              flex: "0 1 120px",
              minWidth: "100px"
            })
          }
        ),
        e(
          "button",
          {
            type: "button",
            onClick: onSaveSnippet,
            style: btnStyle()
          },
          "Save snippet"
        )
      ),
      status ? e(
        "div",
        { style: { fontSize: "14px", color: "#9a9" } },
        status
      ) : null,
      e(
        "div",
        {
          style: {
            fontSize: "16px",
            color: "#ccc",
            borderTop: "1px solid #333",
            paddingTop: "8px",
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            alignItems: "center"
          }
        },
        e("span", {}, "Snippets"),
        e("input", {
          type: "search",
          value: snippetQuery,
          placeholder: "Search\u2026",
          onChange: (ev) => setSnippetQuery(ev.target.value),
          style: Object.assign({}, inputStyle, {
            flex: "1 1 140px",
            minWidth: "120px",
            fontSize: "14px",
            padding: "4px 8px"
          })
        }),
        e(
          "select",
          {
            value: folderFilter,
            onChange: (ev) => setFolderFilter(ev.target.value),
            style: Object.assign({}, inputStyle, {
              flex: "0 1 140px",
              fontSize: "14px",
              padding: "4px 8px"
            })
          },
          e("option", { value: "all" }, "All folders"),
          e("option", { value: "__none__" }, "No folder"),
          ...folders.map((f) => e("option", { key: f, value: f }, f))
        )
      ),
      snippetRows.length ? e(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: "5px",
            minHeight: "120px"
          }
        },
        ...snippetRows
      ) : e(
        "div",
        { style: { fontSize: "15px", color: "#777" } },
        snippets.length ? "No snippets match this search/folder." : "No snippets yet \u2014 write a command and Save snippet."
      )
    );
  }

  // src/ui/frames/BagPanel.ts
  var HOST_ID2 = "bottomleftcorner";
  var BAG_SLOT_BOX = 50;
  var BAG_SLOT_MARGIN = 2;
  var BAG_COLS = 7;
  var BAG_ROWS = 6;
  function BagDummy() {
    const rows = [];
    for (let r = 0; r < BAG_ROWS; r++) {
      const cells = [];
      for (let c = 0; c < BAG_COLS; c++) {
        cells.push(
          e("div", {
            key: `b${r}-${c}`,
            style: {
              width: BAG_SLOT_BOX,
              height: BAG_SLOT_BOX,
              background: "#000",
              border: "2px solid #444",
              boxSizing: "border-box",
              margin: BAG_SLOT_MARGIN
            }
          })
        );
      }
      rows.push(
        e(
          "div",
          {
            key: `br${r}`,
            style: {
              display: "flex",
              flexDirection: "row",
              flexWrap: "nowrap",
              lineHeight: 0
            }
          },
          ...cells
        )
      );
    }
    return e(
      "div",
      {
        className: "comm-bag-dummy",
        style: {
          width: BAG_FRAME_WIDTH,
          height: BAG_FRAME_HEIGHT,
          minWidth: BAG_FRAME_WIDTH,
          minHeight: BAG_FRAME_HEIGHT,
          boxSizing: "border-box",
          background: "black",
          border: "5px solid gray",
          padding: "2px",
          opacity: 0.78,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }
      },
      e(
        "div",
        {
          style: {
            padding: "4px",
            fontSize: "15px",
            color: "gold",
            flexShrink: 0
          }
        },
        "GOLD: \u2014"
      ),
      e("div", {
        style: {
          borderBottom: "5px solid gray",
          marginBottom: "2px",
          marginLeft: "-5px",
          marginRight: "-5px",
          flexShrink: 0
        }
      }),
      e(
        "div",
        {
          style: {
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start"
          }
        },
        ...rows
      )
    );
  }
  function BagPanel(props) {
    const React = getReact();
    const mountRef = React.useRef(null);
    const [open, setOpen] = React.useState(() => isInventoryOpen());
    const layoutEdit = !!props.layoutEdit;
    const showDummy = layoutEdit && !open;
    React.useEffect(() => {
      attachInventoryToMount(mountRef.current);
      const unsub3 = subscribeInventory((next) => setOpen(next));
      return () => {
        unsub3();
        const host = document.getElementById(HOST_ID2);
        if (host) document.body.appendChild(host);
      };
    }, []);
    React.useLayoutEffect(() => {
      attachInventoryToMount(mountRef.current);
    });
    return e(
      "div",
      {
        className: "comm-bag-panel",
        style: {
          pointerEvents: "auto",
          width: showDummy ? BAG_FRAME_WIDTH : void 0,
          minWidth: showDummy ? BAG_FRAME_WIDTH : open ? BAG_FRAME_WIDTH : "120px",
          minHeight: showDummy ? BAG_FRAME_HEIGHT : open ? void 0 : "8px",
          height: showDummy ? BAG_FRAME_HEIGHT : void 0,
          boxSizing: "border-box"
        }
      },
      showDummy ? e(BagDummy) : null,
      e("div", {
        ref: mountRef,
        className: "comm-bag-mount",
        id: "comm-bag-mount",
        style: {
          // Keep mount in DOM for reparenting; hide while silhouette shows.
          display: showDummy ? "none" : "block",
          pointerEvents: "auto"
        }
      })
    );
  }

  // src/ui/hooks/usePanelLayoutState.ts
  function isClosable(id) {
    return CLOSABLE_PANEL_IDS.indexOf(id) >= 0;
  }
  function usePanelLayoutState() {
    const React = getReact();
    const settings0 = getSettings();
    const [panelVisible, setPanelVisible] = React.useState(
      () => mergePanelVisible(settings0.panelVisible)
    );
    const [panelOpacity, setPanelOpacity] = React.useState(
      () => mergePanelOpacity(settings0.panelOpacity)
    );
    const [opacityEdit, setOpacityEdit] = React.useState(false);
    const [layoutEdit, setLayoutEdit] = React.useState(false);
    const [detectedProfile, setDetectedProfile] = React.useState(
      () => detectViewportProfile()
    );
    const [layoutProfileMode, setLayoutProfileModeState] = React.useState(
      () => settings0.layoutProfileMode || "auto"
    );
    const viewportProfile = resolveLayoutProfile(
      layoutProfileMode,
      detectedProfile
    );
    const [layout, setLayout] = React.useState(
      () => layoutForProfile(settings0, viewportProfile)
    );
    React.useEffect(() => {
      const onResize = () => {
        setDetectedProfile(detectViewportProfile());
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }, []);
    React.useEffect(() => {
      const settings = getSettings();
      const next = layoutForProfile(settings, viewportProfile);
      setLayout(next);
      applyBagLayoutPos(next.bag);
    }, [viewportProfile]);
    const setLayoutProfileMode = (mode) => {
      setLayoutProfileModeState(mode);
      const settings = saveSettings({ layoutProfileMode: mode });
      const profile = resolveLayoutProfile(mode, detectViewportProfile());
      const next = layoutForProfile(settings, profile);
      setLayout(next);
      applyBagLayoutPos(next.bag);
    };
    const onMove = (id, pos) => {
      setLayout((prev) => {
        const next = { ...prev, [id]: pos };
        return next;
      });
      savePanelPos(id, pos, viewportProfile);
      if (id === "bag") applyBagLayoutPos(pos);
    };
    const resetLayout = () => {
      const settings = resetPanelLayout(viewportProfile);
      const next = layoutForProfile(settings, viewportProfile);
      setLayout(next);
      applyBagLayoutPos(next.bag);
    };
    const importLayouts = (layouts) => {
      const settings = importPanelLayouts(layouts);
      const next = layoutForProfile(settings, viewportProfile);
      setLayout(next);
      applyBagLayoutPos(next.bag);
    };
    const exportLayouts = () => {
      return { ...getSettings().panelLayoutsByProfile };
    };
    const setVisible = (id, visible2) => {
      if (!isClosable(id)) return;
      setPanelVisible((prev) => {
        const next = { ...prev, [id]: visible2 };
        return next;
      });
      savePanelVisible(id, visible2);
      if (id === "bag" && !visible2 && isInventoryOpen()) {
        openInventory();
      }
    };
    const setOpacity = (id, value) => {
      setPanelOpacity((prev) => {
        const next = { ...prev, [id]: value };
        saveSettings({ panelOpacity: { [id]: value } });
        return next;
      });
    };
    const visible = (id) => panelVisible[id] !== false;
    const opacityFor = (id) => {
      const v = panelOpacity[id];
      if (typeof v === "number") return v;
      return panelOpacityOf(getSettings(), id);
    };
    return {
      panelVisible,
      setPanelVisible,
      panelOpacity,
      opacityEdit,
      setOpacityEdit,
      layoutEdit,
      setLayoutEdit,
      layout,
      viewportProfile,
      layoutProfileMode,
      setLayoutProfileMode,
      onMove,
      resetLayout,
      importLayouts,
      exportLayouts,
      setVisible,
      setOpacity,
      visible,
      opacityFor
    };
  }

  // src/ui/hooks/useBagBridge.ts
  function useBagBridge(setPanelVisible) {
    const React = getReact();
    const [bagOpen, setBagOpen] = React.useState(() => isInventoryOpen());
    React.useEffect(() => {
      return subscribeInventory((open) => {
        setBagOpen(open);
        saveSettings({ bagOpenPreferred: open });
        if (open) {
          setPanelVisible((prev) => {
            if (prev.bag !== false) return prev;
            savePanelVisible("bag", true);
            return { ...prev, bag: true };
          });
        }
      });
    }, [setPanelVisible]);
    return { bagOpen };
  }

  // src/ui/hooks/useSelectionFromXTarget.ts
  function useSelectionFromXTarget(snap) {
    const React = getReact();
    const [selectedEntity, setSelectedEntity] = React.useState(
      void 0
    );
    const lastXTargetId = React.useRef(void 0);
    React.useEffect(() => {
      if (window.__ecuDialogOnlyXTarget) return;
      const xt = window.xtarget;
      const id = xt && xt.id != null ? String(xt.id) : void 0;
      if (id && id !== lastXTargetId.current) {
        lastXTargetId.current = id;
        setSelectedEntity(id);
      } else if (!id && lastXTargetId.current) {
        lastXTargetId.current = void 0;
      }
    }, [snap.now, snap.entities]);
    const closePaperdoll = () => {
      setSelectedEntity(void 0);
      lastXTargetId.current = void 0;
      setXTarget(null);
    };
    return { selectedEntity, setSelectedEntity, closePaperdoll };
  }

  // src/lib/layoutExport.ts
  var LAYOUT_EXPORT_VERSION = 1;
  function isPanelPos(raw) {
    if (!raw || typeof raw !== "object") return false;
    const o = raw;
    return typeof o.x === "number" && typeof o.y === "number";
  }
  function sanitizeProfileMap(raw) {
    const out = {};
    if (!raw || typeof raw !== "object") return out;
    const src = raw;
    for (let i = 0; i < VIEWPORT_PROFILES.length; i++) {
      const profile = VIEWPORT_PROFILES[i];
      const chunk = src[profile];
      if (!chunk || typeof chunk !== "object") continue;
      const map = {};
      const panelSrc = chunk;
      for (let j = 0; j < PANEL_IDS.length; j++) {
        const id = PANEL_IDS[j];
        if (isPanelPos(panelSrc[id])) map[id] = panelSrc[id];
      }
      if (Object.keys(map).length) out[profile] = map;
    }
    return out;
  }
  function buildLayoutExport(layoutsByProfile) {
    const layouts = {};
    for (let i = 0; i < VIEWPORT_PROFILES.length; i++) {
      const profile = VIEWPORT_PROFILES[i];
      const partial = layoutsByProfile[profile];
      if (!partial) continue;
      layouts[profile] = mergeLayout(partial);
    }
    return {
      version: LAYOUT_EXPORT_VERSION,
      kind: "enhance-comm-ui-layout",
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      layoutsByProfile: layouts
    };
  }
  function stringifyLayoutExport(layoutsByProfile) {
    return JSON.stringify(buildLayoutExport(layoutsByProfile), null, 2);
  }
  function parseLayoutExport(raw) {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e2) {
      return { ok: false, error: "Invalid JSON" };
    }
    if (!parsed || typeof parsed !== "object") {
      return { ok: false, error: "Expected a JSON object" };
    }
    const obj = parsed;
    if (obj.kind != null && obj.kind !== "enhance-comm-ui-layout") {
      return { ok: false, error: "Not an enhance-comm-ui layout export" };
    }
    const layoutsRaw = obj.layoutsByProfile || obj.panelLayoutsByProfile || (obj.panelLayout ? { desktop: obj.panelLayout } : null);
    const layoutsByProfile = sanitizeProfileMap(layoutsRaw);
    if (!Object.keys(layoutsByProfile).length) {
      return { ok: false, error: "No panel layouts found in export" };
    }
    return { ok: true, layoutsByProfile };
  }
  function downloadLayoutJson(json, filename) {
    const name = filename || `enhance-comm-ui-layout-${Date.now()}.json`;
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  // src/ui/frames/comm/LayoutEditChrome.ts
  function btnStyle2(active) {
    return {
      cursor: "pointer",
      fontSize: "13px",
      padding: "6px 10px",
      minHeight: "36px",
      border: active ? "1px solid #ffe08a" : "1px solid #886",
      background: active ? "#3a3510" : "#222",
      color: active ? "#ffe08a" : "#eee",
      textShadow: "none",
      fontWeight: "normal"
    };
  }
  function LayoutEditChrome(props) {
    const React = getReact();
    const [status, setStatus] = React.useState("");
    const [pasteOpen, setPasteOpen] = React.useState(false);
    const [pasteText, setPasteText] = React.useState("");
    const fileRef = React.useRef(null);
    const onExport = async () => {
      const json = stringifyLayoutExport(props.exportLayouts());
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(json);
          setStatus("Layout JSON copied");
        } else {
          downloadLayoutJson(json);
          setStatus("Layout JSON downloaded");
        }
      } catch (e2) {
        downloadLayoutJson(json);
        setStatus("Layout JSON downloaded");
      }
    };
    const onDownload = () => {
      downloadLayoutJson(stringifyLayoutExport(props.exportLayouts()));
      setStatus("Layout JSON downloaded");
    };
    const applyImportText = (raw) => {
      const parsed = parseLayoutExport(raw);
      if (parsed.ok === false) {
        setStatus(parsed.error);
        return;
      }
      props.importLayouts(parsed.layoutsByProfile);
      setStatus("Layout imported");
      setPasteOpen(false);
      setPasteText("");
    };
    const onFile = (ev) => {
      const file = ev.target && ev.target.files && ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        applyImportText(String(reader.result || ""));
      };
      reader.onerror = () => setStatus("Failed to read file");
      reader.readAsText(file);
      ev.target.value = "";
    };
    const modes = ["auto", "desktop", "tablet", "phone"];
    return e(
      "div",
      {
        style: {
          position: "absolute",
          left: "50%",
          top: "8px",
          transform: "translateX(-50%)",
          zIndex: 50,
          pointerEvents: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          alignItems: "stretch",
          padding: "8px 12px",
          background: "rgba(30,28,10,0.95)",
          border: "1px solid #aa8",
          color: "#ffe08a",
          fontSize: "14px",
          maxWidth: "min(960px, 96vw)",
          textShadow: "none",
          fontWeight: "normal"
        }
      },
      e(
        "div",
        {
          style: {
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            alignItems: "center"
          }
        },
        `Layout edit \xB7 ${profileLabel(props.viewportProfile)}` + (props.layoutProfileMode === "auto" ? " (auto)" : " (forced)"),
        e(
          "button",
          { type: "button", onClick: props.onReset, style: btnStyle2() },
          "Reset positions"
        ),
        e(
          "button",
          { type: "button", onClick: onExport, style: btnStyle2() },
          "Copy layout"
        ),
        e(
          "button",
          { type: "button", onClick: onDownload, style: btnStyle2() },
          "Download"
        ),
        e(
          "button",
          {
            type: "button",
            onClick: () => setPasteOpen((v) => !v),
            style: btnStyle2(pasteOpen)
          },
          pasteOpen ? "Cancel paste" : "Paste / import"
        ),
        e(
          "button",
          {
            type: "button",
            onClick: () => fileRef.current && fileRef.current.click(),
            style: btnStyle2()
          },
          "Upload JSON"
        ),
        e("input", {
          ref: fileRef,
          type: "file",
          accept: "application/json,.json",
          style: { display: "none" },
          onChange: onFile
        }),
        e(
          "button",
          {
            type: "button",
            onClick: props.onDone,
            style: btnStyle2(true)
          },
          "Done"
        )
      ),
      e(
        "div",
        {
          style: {
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            alignItems: "center",
            fontSize: "13px",
            color: "#ddd"
          }
        },
        e("span", { style: { color: "#aa8" } }, "Profile"),
        ...modes.map(
          (mode) => e(
            "button",
            {
              key: mode,
              type: "button",
              onClick: () => props.onProfileMode(mode),
              style: btnStyle2(props.layoutProfileMode === mode)
            },
            mode === "auto" ? "Auto" : profileLabel(mode)
          )
        ),
        e(
          "span",
          { style: { color: "#888", fontSize: "12px" } },
          "10% grid \xB7 snap 0/50/100 + peers \xB7 soft avoid \xB7 Ctrl+Shift+L"
        )
      ),
      status ? e("div", { style: { fontSize: "13px", color: "#9a9" } }, status) : null,
      pasteOpen ? e(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: "6px"
          }
        },
        e("textarea", {
          value: pasteText,
          rows: 5,
          placeholder: "Paste enhance-comm-ui layout JSON\u2026",
          onChange: (ev) => setPasteText(ev.target.value),
          style: {
            width: "100%",
            minHeight: "100px",
            background: "#141410",
            color: "#eee",
            border: "1px solid #665",
            fontSize: "12px",
            fontFamily: "Consolas, Monaco, monospace",
            textShadow: "none",
            fontWeight: "normal",
            boxSizing: "border-box"
          }
        }),
        e(
          "button",
          {
            type: "button",
            onClick: () => applyImportText(pasteText),
            style: btnStyle2(true)
          },
          "Apply import"
        )
      ) : null
    );
  }

  // src/ui/frames/comm/LayoutEditGrid.ts
  var MINOR_STEP = 5;
  var MAJOR_PCTS = [0, 25, 50, 75, 100];
  function isMajor(pct) {
    return MAJOR_PCTS.indexOf(pct) >= 0;
  }
  function lineStyle(axis, pct) {
    const major = isMajor(pct);
    const color = major ? "rgba(255, 245, 200, 0.62)" : "rgba(255, 245, 200, 0.34)";
    const border = `1px dashed ${color}`;
    if (axis === "v") {
      return {
        position: "absolute",
        left: `${pct}%`,
        top: 0,
        bottom: 0,
        width: 0,
        borderLeft: border,
        boxSizing: "border-box",
        pointerEvents: "none"
      };
    }
    return {
      position: "absolute",
      top: `${pct}%`,
      left: 0,
      right: 0,
      height: 0,
      borderTop: border,
      boxSizing: "border-box",
      pointerEvents: "none"
    };
  }
  function LayoutEditGrid() {
    const kids = [];
    for (let pct = 0; pct <= 100; pct += MINOR_STEP) {
      kids.push(
        e("div", {
          key: `v-${pct}`,
          className: isMajor(pct) ? "comm-layout-grid-line major" : "comm-layout-grid-line",
          style: lineStyle("v", pct)
        })
      );
      kids.push(
        e("div", {
          key: `h-${pct}`,
          className: isMajor(pct) ? "comm-layout-grid-line major" : "comm-layout-grid-line",
          style: lineStyle("h", pct)
        })
      );
    }
    return e(
      "div",
      {
        className: "comm-layout-edit-grid",
        "aria-hidden": true,
        style: {
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          overflow: "hidden"
        }
      },
      ...kids
    );
  }

  // src/ui/frames/comm/OpacityEditor.ts
  function OpacityEditor(props) {
    return e(
      "div",
      {
        style: {
          position: "absolute",
          right: "12px",
          bottom: "72px",
          zIndex: 55,
          pointerEvents: "auto",
          width: "220px",
          maxHeight: "50vh",
          overflow: "auto",
          padding: "8px 10px",
          background: "rgba(16,16,16,0.96)",
          border: "1px solid #555",
          color: "#ddd",
          fontSize: "13px"
        }
      },
      e(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "8px",
            color: "#ccc"
          }
        },
        "Panel opacity",
        e(
          "button",
          {
            type: "button",
            onClick: props.onClose,
            style: {
              cursor: "pointer",
              border: "1px solid #555",
              background: "#222",
              color: "#ddd",
              fontSize: "12px",
              padding: "1px 6px"
            }
          },
          "\xD7"
        )
      ),
      ...props.panelIds.map(
        (id) => e(
          "label",
          {
            key: id,
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "2px",
              marginBottom: "6px"
            }
          },
          e(
            "span",
            { style: { color: "#999" } },
            `${PANEL_LABELS[id]} \xB7 ${Math.round(props.opacityFor(id) * 100)}%`
          ),
          e("input", {
            type: "range",
            min: 25,
            max: 100,
            step: 5,
            value: Math.round(props.opacityFor(id) * 100),
            onChange: (ev) => {
              const pct = Number(ev.target.value);
              props.onChange(id, pct / 100);
            }
          })
        )
      )
    );
  }

  // src/ui/frames/CommUI.ts
  var OPACITY_PANEL_IDS = [
    "bossBar",
    "combat",
    "kills",
    "threat",
    "pdps",
    "hitDps",
    "coopV1",
    "coopV2",
    "command",
    "bag",
    "paperdoll",
    "infoDialog",
    "playerFrame",
    "targetFrame"
  ];
  function meterOrDummy(title, rows, layoutEdit, highlightId, className) {
    if (rows && rows.length) {
      return e(RankMeter, {
        title,
        className,
        rows,
        highlightId
      });
    }
    if (!layoutEdit) return null;
    return e(PanelShellDummy, {
      label: title,
      hint: "No contributors yet",
      accent: "#555",
      rows: 3,
      style: METER_PANEL_STYLE
    });
  }
  function CommUI(props) {
    const React = getReact();
    const snap = props.snap;
    const layoutState = usePanelLayoutState();
    const {
      setPanelVisible,
      opacityEdit,
      setOpacityEdit,
      layoutEdit,
      setLayoutEdit,
      layout,
      viewportProfile,
      layoutProfileMode,
      setLayoutProfileMode,
      onMove,
      resetLayout,
      importLayouts,
      exportLayouts,
      setVisible,
      setOpacity,
      visible,
      opacityFor
    } = layoutState;
    const { bagOpen } = useBagBridge(setPanelVisible);
    const { selectedEntity, setSelectedEntity, closePaperdoll } = useSelectionFromXTarget(snap);
    const [commandSeed, setCommandSeed] = React.useState(
      null
    );
    const [commandOpenSeq, setCommandOpenSeq] = React.useState(0);
    const [infoDialogOpen, setInfoDialogOpen] = React.useState(false);
    React.useEffect(() => {
      updateKillContext(snap.entities);
      updateCombatContext(snap.entities);
    }, [snap.entities]);
    React.useEffect(() => {
      updateCommKeyboardHandlers({
        clearPaperdoll: () => {
          if (!selectedEntity) return false;
          closePaperdoll();
          return true;
        },
        toggleLayoutEdit: () => setLayoutEdit((v) => !v)
      });
      return () => updateCommKeyboardHandlers({});
    }, [selectedEntity, closePaperdoll, setLayoutEdit]);
    React.useEffect(() => {
      setInfoDialogLayoutEditing(layoutEdit);
      return () => setInfoDialogLayoutEditing(false);
    }, [layoutEdit]);
    React.useEffect(() => {
      return subscribeCommanderOpen((payload) => {
        if (typeof payload.draft === "string") {
          setCommandSeed(payload.draft);
        } else {
          setCommandSeed(null);
        }
        setCommandOpenSeq((n) => n + 1);
        setVisible("command", true);
      });
    }, [setVisible]);
    React.useEffect(() => {
      const root = document.getElementById("comm-ui");
      if (!root) return;
      root.setAttribute("data-viewport", viewportProfile);
      root.classList.toggle(
        "comm-ui-touch",
        isTouchishProfile(viewportProfile)
      );
    }, [viewportProfile]);
    const pdpsRows = buildPdpsRows(snap.entities);
    const coopV1Rows = buildCoopV1Rows(snap.entities);
    const coopV2Rows = buildCoopV2Rows(snap.entities);
    const hitDpsRows = buildHitDpsRows(snap.entities, snap.now);
    const hasEnemies = aggroedMonsters(snap.entities).length > 0;
    const hasThreat = Object.keys(aggroByTarget(snap.entities)).length > 0;
    const hasBosses = activeBosses(snap.entities).length > 0;
    const panel = (id, child, opts) => {
      const isClosablePanel = (opts == null ? void 0 : opts.closable) === true;
      const isHidden = isClosablePanel && !visible(id);
      if (isHidden && !layoutEdit) return null;
      if ((opts == null ? void 0 : opts.empty) && !layoutEdit) return null;
      return e(
        PositionedPanel,
        {
          id,
          pos: layout[id],
          editing: layoutEdit,
          onMove,
          style: opts == null ? void 0 : opts.style,
          hidden: isHidden,
          hiddenBodyStyle: opts == null ? void 0 : opts.hiddenBodyStyle,
          opacity: opacityFor(id),
          peerLayout: layout,
          viewportProfile,
          onClose: isClosablePanel ? () => setVisible(id, false) : void 0,
          onShow: isClosablePanel ? () => setVisible(id, true) : void 0
        },
        child
      );
    };
    const touchPad = isTouchishProfile(viewportProfile);
    const toggleBtnPad = touchPad ? "10px 16px" : "5px 12px";
    const toggleFont = touchPad ? "16px" : "14px";
    return e(
      "div",
      {
        style: {
          position: "relative",
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          overflow: "hidden"
        }
      },
      layoutEdit ? e(LayoutEditGrid) : null,
      layoutEdit ? e(LayoutEditChrome, {
        onReset: resetLayout,
        onDone: () => setLayoutEdit(false),
        viewportProfile,
        layoutProfileMode,
        onProfileMode: setLayoutProfileMode,
        exportLayouts,
        importLayouts
      }) : null,
      opacityEdit ? e(OpacityEditor, {
        panelIds: OPACITY_PANEL_IDS,
        opacityFor,
        onChange: setOpacity,
        onClose: () => setOpacityEdit(false)
      }) : null,
      panel(
        "players",
        e(Players, {
          entities: snap.entities,
          setSelectedEntity,
          selectedEntity,
          observingId: snap.observingId,
          observing: snap.observing
        }),
        { style: { width: "auto", maxWidth: "min(560px, 78vw)" } }
      ),
      panel(
        "enemies",
        e(Enemies, {
          entities: snap.entities,
          setSelectedEntity,
          selectedEntity
        }),
        {
          style: { width: "auto", maxWidth: "min(420px, 78vw)", textAlign: "right" },
          empty: !hasEnemies
        }
      ),
      panel(
        "topCenter",
        e(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px"
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
        )
      ),
      panel(
        "bossBar",
        e(BossBarPanel, {
          entities: snap.entities,
          observing: snap.observing,
          setSelectedEntity,
          layoutEdit
        }),
        {
          closable: true,
          style: BOSS_BAR_PANEL_STYLE,
          empty: !hasBosses
        }
      ),
      selectedEntity || layoutEdit ? panel(
        "paperdoll",
        e(EntityInfo, {
          entities: snap.entities,
          selectedEntity,
          onClose: closePaperdoll,
          layoutEdit,
          observing: snap.observing
        }),
        { style: PAPERDOLL_PANEL_STYLE }
      ) : null,
      panel(
        "infoDialog",
        e(InfoDialogPanel, {
          layoutEdit,
          onOpenChange: setInfoDialogOpen
        }),
        {
          style: Object.assign({}, INFO_DIALOG_PANEL_STYLE, {
            zIndex: layoutEdit ? 45 : 35,
            pointerEvents: layoutEdit || infoDialogOpen ? "auto" : "none"
          })
        }
      ),
      panel("kills", e(KillKpiPanel), {
        closable: true,
        style: KILLS_PANEL_STYLE,
        hiddenBodyStyle: KILLS_PANEL_STYLE
      }),
      panel("combat", e(CombatMetricsPanel), {
        closable: true,
        style: COMBAT_PANEL_STYLE,
        hiddenBodyStyle: COMBAT_PANEL_STYLE
      }),
      panel(
        "command",
        e(CommandPanel, {
          seedDraft: commandSeed,
          openSeq: commandOpenSeq
        }),
        {
          closable: true,
          style: COMMAND_PANEL_STYLE,
          hiddenBodyStyle: COMMAND_PANEL_STYLE
        }
      ),
      bagOpen || layoutEdit ? panel(
        "bag",
        e(BagPanel, { layoutEdit }),
        {
          closable: true,
          style: layoutEdit ? BAG_PANEL_STYLE : void 0,
          hiddenBodyStyle: Object.assign({}, BAG_PANEL_STYLE, {
            display: "flex",
            alignItems: "flex-start"
          })
        }
      ) : null,
      snap.observing || layoutEdit ? panel(
        "playerFrame",
        e(PlayerFrame, {
          observing: snap.observing,
          setSelectedEntity,
          layoutEdit
        }),
        { style: UNIT_FRAME_STYLE }
      ) : null,
      snap.target || layoutEdit ? panel(
        "targetFrame",
        e(TargetFrame, {
          observing: snap.observing,
          target: snap.target,
          entities: snap.entities,
          setSelectedEntity,
          layoutEdit
        }),
        { style: UNIT_FRAME_STYLE }
      ) : null,
      panel(
        "threat",
        e(ThreatTable, {
          entities: snap.entities,
          observingId: snap.observingId,
          layoutEdit
        }),
        {
          closable: true,
          style: THREAT_PANEL_STYLE,
          empty: !hasThreat,
          hiddenBodyStyle: THREAT_PANEL_STYLE
        }
      ),
      panel(
        "pdps",
        meterOrDummy("PDPS", pdpsRows, layoutEdit, snap.observingId, "PdpsMeter"),
        {
          closable: true,
          style: METER_PANEL_STYLE,
          empty: !pdpsRows.length,
          hiddenBodyStyle: METER_PANEL_STYLE
        }
      ),
      panel(
        "hitDps",
        meterOrDummy(
          "Hit DPS (10s)",
          hitDpsRows,
          layoutEdit,
          snap.observingId,
          "HitDpsMeter"
        ),
        {
          closable: true,
          style: METER_PANEL_STYLE,
          empty: !hitDpsRows.length,
          hiddenBodyStyle: METER_PANEL_STYLE
        }
      ),
      panel(
        "coopV1",
        meterOrDummy("s.coop v1", coopV1Rows, layoutEdit, snap.observingId),
        {
          closable: true,
          style: METER_PANEL_STYLE,
          empty: !coopV1Rows.length,
          hiddenBodyStyle: METER_PANEL_STYLE
        }
      ),
      panel(
        "coopV2",
        meterOrDummy(
          "s.coop v2",
          coopV2Rows,
          layoutEdit,
          snap.observingId,
          "CoopContributionMeterV2"
        ),
        {
          closable: true,
          style: METER_PANEL_STYLE,
          empty: !coopV2Rows.length,
          hiddenBodyStyle: METER_PANEL_STYLE
        }
      ),
      panel(
        "toggles",
        e(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              pointerEvents: "auto"
            }
          },
          e(
            "button",
            {
              type: "button",
              title: "Toggle layout edit (Ctrl+Shift+L)",
              style: {
                cursor: "pointer",
                padding: toggleBtnPad,
                fontSize: toggleFont,
                minHeight: touchPad ? "40px" : void 0,
                border: layoutEdit ? "1px solid #ffe08a" : "1px solid #555",
                background: layoutEdit ? "#3a3510" : "#1a1a1a",
                color: layoutEdit ? "#ffe08a" : "#eee",
                textShadow: "none",
                fontWeight: "normal"
              },
              onClick: () => setLayoutEdit(!layoutEdit)
            },
            layoutEdit ? "Layout: ON" : "Layout"
          ),
          e(
            "button",
            {
              type: "button",
              title: "Per-panel overlay opacity",
              style: {
                cursor: "pointer",
                padding: toggleBtnPad,
                fontSize: toggleFont,
                minHeight: touchPad ? "40px" : void 0,
                border: opacityEdit ? "1px solid #8ab" : "1px solid #555",
                background: opacityEdit ? "#1a2830" : "#1a1a1a",
                color: opacityEdit ? "#9cf" : "#eee",
                textShadow: "none",
                fontWeight: "normal"
              },
              onClick: () => setOpacityEdit(!opacityEdit)
            },
            opacityEdit ? "Opacity: ON" : "Opacity"
          )
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

/* Defeat Adventure Land global pixel-font thickening inside our overlay */
#comm-ui, #comm-ui * {
  text-shadow: none !important;
  font-weight: normal !important;
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
    ensureDialogHost();
    installCommChrome();
    installInventoryFix();
    installCommanderHook();
    startSocketHub();
    startCryptTracker();
    startCombatMeter();
    startPartyCombat();
    startSessionKills();
    let domContainer = document.querySelector("#comm-ui");
    if (!domContainer) {
      domContainer = document.createElement("div");
      domContainer.id = "comm-ui";
      document.body.append(domContainer);
    }
    domContainer.style.zIndex = "220";
    domContainer.style.position = "fixed";
    domContainer.style.width = "100%";
    domContainer.style.height = "100%";
    domContainer.style.pointerEvents = "none";
    const ReactDOM = getReactDOM();
    const root = ReactDOM.createRoot(domContainer);
    root.render(e(Root));
  }
  (function bootstrap() {
    "use strict";
    ensureReact(onLoad);
  })();
})();
