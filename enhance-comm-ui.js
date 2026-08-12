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
      const live2 = findEntityById(snap.id);
      if (live2) return live2;
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
  function resolveTarget(source) {
    if (source == null || source.target == null || source.target === "") {
      return void 0;
    }
    const ent = findEntityById(source.target);
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
  var actionListeners = [];
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
  function emitAction(ev) {
    for (let i = 0; i < actionListeners.length; i++) {
      actionListeners[i](ev);
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
      avoid: !!data.avoid,
      aoe: !!data.aoe,
      kill: !!data.kill,
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
    if (data.crit != null && Number(data.crit) > 1) {
      ev.crit = Number(data.crit);
    }
    if (data.pid != null) ev.pid = data.pid;
    emitDamage(ev);
  }
  function onAction(data) {
    if (!data) return;
    const at = Date.now();
    const ev = {
      actor: data.attacker != null ? String(data.attacker) : data.hid != null ? String(data.hid) : data.actor != null ? String(data.actor) : void 0,
      target: data.target != null ? String(data.target) : data.id != null ? String(data.id) : void 0,
      source: data.source != null ? String(data.source) : data.type != null ? String(data.type) : void 0,
      projectile: data.projectile != null ? String(data.projectile) : void 0,
      eta: data.eta != null ? Number(data.eta) : void 0,
      at,
      raw: data
    };
    if (data.pid != null) ev.pid = data.pid;
    if (data.damage !== void 0) {
      ev.damage = Math.abs(Number(data.damage) || 0);
    }
    if (data.heal !== void 0) {
      ev.heal = Math.abs(Number(data.heal) || 0);
    }
    emitAction(ev);
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
  function onActionSubscribe(listener) {
    actionListeners.push(listener);
    return () => {
      const idx = actionListeners.indexOf(listener);
      if (idx >= 0) actionListeners.splice(idx, 1);
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

  // src/meters/deathLog.ts
  var HP_RING = 40;
  var HIT_RING = 24;
  var vitalsShadow = {};
  var hpRing = {};
  var hitRing = {};
  var nameCache = {};
  function pushRing(arr, item, max) {
    arr.push(item);
    while (arr.length > max) arr.shift();
  }
  function syncShadowFromEntity(id, ent) {
    if (!ent) return;
    const maxHp = ent.max_hp || 0;
    const maxMp = ent.max_mp || 0;
    if (!(maxHp > 0) && !(maxMp > 0)) return;
    if (ent.name) nameCache[id] = ent.name;
    vitalsShadow[id] = {
      hp: ent.hp != null ? ent.hp : maxHp,
      maxHp,
      mp: ent.mp != null ? ent.mp : maxMp,
      maxMp
    };
    if (maxHp > 0) {
      if (!hpRing[id]) hpRing[id] = [];
      pushRing(
        hpRing[id],
        {
          at: Date.now(),
          hp: vitalsShadow[id].hp,
          maxHp
        },
        HP_RING
      );
    }
  }
  function ensureShadow(id) {
    let s = vitalsShadow[id];
    if (s) return s;
    return null;
  }
  function effectiveGain(id, amount, kind, live2) {
    if (!(amount > 0)) return 0;
    const s = ensureShadow(id);
    if (kind === "hp") {
      const maxHp = s && s.maxHp || (live2 == null ? void 0 : live2.max_hp) || 0;
      if (!(maxHp > 0)) return amount;
      const liveHp = live2 == null ? void 0 : live2.hp;
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
          mp: (live2 == null ? void 0 : live2.mp) || 0,
          maxMp: (live2 == null ? void 0 : live2.max_mp) || 0
        };
      }
      return gained2;
    }
    const maxMp = s && s.maxMp || (live2 == null ? void 0 : live2.max_mp) || 0;
    if (!(maxMp > 0)) return amount;
    const liveMp = live2 == null ? void 0 : live2.mp;
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
        hp: (live2 == null ? void 0 : live2.hp) || 0,
        maxHp: (live2 == null ? void 0 : live2.max_hp) || 0,
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
    if (!hpRing[id]) hpRing[id] = [];
    pushRing(hpRing[id], { at: Date.now(), hp: s.hp, maxHp: s.maxHp }, HP_RING);
  }
  function noteIncomingHit(ev) {
    if (!ev.target || !(ev.damage && ev.damage > 0)) return;
    if (!hitRing[ev.target]) hitRing[ev.target] = [];
    pushRing(
      hitRing[ev.target],
      {
        at: ev.at,
        actor: ev.actor,
        damage: ev.damage,
        source: ev.source
      },
      HIT_RING
    );
  }
  function buildDeathSnapshot(id, at, killerId) {
    return {
      id,
      name: nameCache[id] || id,
      at,
      killerId,
      hpLog: (hpRing[id] || []).slice(),
      recentHits: (hitRing[id] || []).slice()
    };
  }
  function clearDeathRings() {
    const hKeys = Object.keys(hpRing);
    for (let i = 0; i < hKeys.length; i++) delete hpRing[hKeys[i]];
    const tKeys = Object.keys(hitRing);
    for (let i = 0; i < tKeys.length; i++) delete hitRing[tKeys[i]];
  }

  // src/meters/rollingWindow.ts
  var WINDOW_MS = 1e4;
  var samples = [];
  var unsub = null;
  var ownedByEngine = false;
  function prune(now) {
    const cutoff = now - WINDOW_MS;
    while (samples.length > 0 && samples[0].at < cutoff) {
      samples.shift();
    }
  }
  function ingestRollingSample(ev) {
    const damage = ev.damage || 0;
    const heal = ev.heal || 0;
    if (!damage && !heal) return;
    samples.push({
      at: ev.at,
      actor: ev.actor,
      target: ev.target,
      damage,
      heal
    });
    prune(ev.at);
  }
  function attachRollingToEngine() {
    ownedByEngine = true;
    if (unsub) {
      unsub();
      unsub = null;
    }
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
  function getIncomingDps(targetId, now = Date.now()) {
    if (targetId == null || targetId === "") return 0;
    prune(now);
    const tid = String(targetId);
    let total = 0;
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      if (s.target !== tid || !s.damage) continue;
      total += s.damage;
    }
    return total / (WINDOW_MS / 1e3);
  }
  function getRollingWindowMs() {
    return WINDOW_MS;
  }
  function clearRollingWindow() {
    samples.length = 0;
  }
  function estimateTtk(hp, dps) {
    if (hp == null || !(hp > 0) || !(dps > 0)) return null;
    return hp / dps;
  }

  // src/meters/channelDerive.ts
  function deriveChannel(ev) {
    if (ev.dreturn && ev.dreturn > 0) return "dr";
    if (ev.reflect && ev.reflect > 0) return "reflect";
    if (ev.manasteal && ev.manasteal > 0) return "mana";
    if (ev.heal && ev.heal > 0 || ev.lifesteal && ev.lifesteal > 0) {
      return "heal";
    }
    if (!(ev.damage && ev.damage > 0)) return null;
    if (ev.source === "burn") return "burn";
    if (ev.splash) return "blast";
    if (ev.source === "cleave" || ev.aoe) return "cleave";
    return "base";
  }

  // src/meters/meterTypes.ts
  function emptyMisc() {
    return { interrupts: 0, dispels: 0, deaths: 0 };
  }
  function emptyOutcomes() {
    return {
      hits: 0,
      crits: 0,
      miss: 0,
      evade: 0,
      avoid: 0,
      kills: 0
    };
  }
  function damageAbilityKey(source) {
    if (!source || source === "attack") return "attack";
    return source;
  }
  function healAbilityKey(source, heal, lifesteal) {
    if (heal && heal > 0) {
      if (!source || source === "attack") return "heal";
      return source;
    }
    if (lifesteal && lifesteal > 0) return "lifesteal";
    if (!source || source === "attack") return "heal";
    return source;
  }
  function segmentDurationMs(seg, now = Date.now()) {
    const end = seg.endedAt != null ? seg.endedAt : now;
    return Math.max(end - seg.startedAt, 1);
  }

  // src/meters/sessionSegment.ts
  function ensureActor(seg, id, meta) {
    let a = seg.actors[id];
    if (!a) {
      a = {
        id,
        name: (meta == null ? void 0 : meta.name) || id,
        ctype: meta == null ? void 0 : meta.ctype,
        partyKey: (meta == null ? void 0 : meta.partyKey) || `solo:${id}`,
        damage: 0,
        heal: 0,
        taken: 0,
        healingRequired: 0,
        mana: 0,
        dr: 0,
        reflect: 0,
        base: 0,
        blast: 0,
        burn: 0,
        cleave: 0,
        outcomes: emptyOutcomes(),
        misc: emptyMisc(),
        abilities: {}
      };
      seg.actors[id] = a;
    } else if (meta) {
      if (meta.name) a.name = meta.name;
      if (meta.ctype) a.ctype = meta.ctype;
      if (meta.partyKey) a.partyKey = meta.partyKey;
    }
    return a;
  }
  function ensureAbility(actor, key) {
    let ab = actor.abilities[key];
    if (!ab) {
      ab = {
        key,
        damage: 0,
        heal: 0,
        splashDamage: 0,
        taken: 0,
        outcomes: emptyOutcomes(),
        targets: {}
      };
      actor.abilities[key] = ab;
    }
    return ab;
  }
  function ensureTarget(ab, id, name) {
    let t = ab.targets[id];
    if (!t) {
      t = {
        id,
        name: name || id,
        damage: 0,
        heal: 0,
        splashDamage: 0,
        outcomes: emptyOutcomes()
      };
      ab.targets[id] = t;
    } else if (name) {
      t.name = name;
    }
    return t;
  }
  function bumpOutcome(o, ev) {
    if (ev.miss) {
      o.miss += 1;
      return;
    }
    if (ev.evade) {
      o.evade += 1;
      return;
    }
    if (ev.avoid) {
      o.avoid += 1;
      return;
    }
    if (ev.damage && ev.damage > 0 || ev.heal && ev.heal > 0) {
      o.hits += 1;
      if (ev.crit && ev.crit > 1) o.crits += 1;
      if (ev.kill) o.kills += 1;
    }
  }
  function applyDamageToSegment(seg, ev, opts) {
    var _a;
    const { actorIsPlayer, targetIsPlayer } = opts;
    if (ev.dreturn && ev.dreturn > 0 && targetIsPlayer && ev.target) {
      ensureActor(seg, ev.target, opts.targetMeta).dr += ev.dreturn;
    }
    if (ev.reflect && ev.reflect > 0 && targetIsPlayer && ev.target) {
      ensureActor(seg, ev.target, opts.targetMeta).reflect += ev.reflect;
    }
    if (ev.damage && ev.damage > 0 && ev.target && targetIsPlayer) {
      const tgt = ensureActor(seg, ev.target, opts.targetMeta);
      tgt.taken += ev.damage;
      tgt.healingRequired += ev.damage;
    }
    if (!ev.actor || !actorIsPlayer) return;
    const actor = ensureActor(seg, ev.actor, opts.actorMeta);
    const targetId = ev.target || "_";
    const targetName = (_a = opts.targetMeta) == null ? void 0 : _a.name;
    const hasDamage = !!(ev.damage && ev.damage > 0);
    const healAmt = opts.effectiveHeal || 0;
    const manaAmt = opts.effectiveMana || 0;
    bumpOutcome(actor.outcomes, ev);
    if (hasDamage) {
      const dmgKey = damageAbilityKey(ev.source);
      const ab = ensureAbility(actor, dmgKey);
      const tgt = ensureTarget(ab, targetId, targetName);
      bumpOutcome(ab.outcomes, ev);
      bumpOutcome(tgt.outcomes, ev);
      actor.damage += ev.damage;
      ab.damage += ev.damage;
      tgt.damage += ev.damage;
      if (ev.splash) {
        ab.splashDamage += ev.damage;
        tgt.splashDamage += ev.damage;
      }
      const ch = deriveChannel(ev);
      if (ch === "burn") actor.burn += ev.damage;
      else if (ch === "blast") actor.blast += ev.damage;
      else if (ch === "cleave") actor.cleave += ev.damage;
      else if (ch === "base") actor.base += ev.damage;
    }
    if (healAmt > 0) {
      const hKey = healAbilityKey(ev.source, ev.heal, ev.lifesteal);
      const ab = ensureAbility(actor, hKey);
      const tgt = ensureTarget(ab, targetId, targetName);
      if (!hasDamage) {
        bumpOutcome(ab.outcomes, ev);
        bumpOutcome(tgt.outcomes, ev);
      }
      actor.heal += healAmt;
      ab.heal += healAmt;
      tgt.heal += healAmt;
    }
    if (manaAmt > 0) {
      actor.mana += manaAmt;
    }
  }
  function emptySegment(id, at, label) {
    return {
      id,
      startedAt: at,
      label,
      actors: {},
      deaths: [],
      conditions: [],
      casts: []
    };
  }
  function mergeSegments(id, parts, now) {
    var _a;
    const out = emptySegment(id, ((_a = parts[0]) == null ? void 0 : _a.startedAt) || now, "Total");
    out.endedAt = now;
    for (let i = 0; i < parts.length; i++) {
      const seg = parts[i];
      if (!out.startedAt || seg.startedAt < out.startedAt) {
        out.startedAt = seg.startedAt;
      }
      const ids = Object.keys(seg.actors);
      for (let a = 0; a < ids.length; a++) {
        const src = seg.actors[ids[a]];
        const dst = ensureActor(out, src.id, {
          name: src.name,
          ctype: src.ctype,
          partyKey: src.partyKey
        });
        dst.damage += src.damage;
        dst.heal += src.heal;
        dst.taken += src.taken;
        dst.healingRequired += src.healingRequired;
        dst.mana += src.mana;
        dst.dr += src.dr;
        dst.reflect += src.reflect;
        dst.base += src.base;
        dst.blast += src.blast;
        dst.burn += src.burn;
        dst.cleave += src.cleave;
        dst.outcomes.hits += src.outcomes.hits;
        dst.outcomes.crits += src.outcomes.crits;
        dst.outcomes.miss += src.outcomes.miss;
        dst.outcomes.evade += src.outcomes.evade;
        dst.outcomes.avoid += src.outcomes.avoid;
        dst.outcomes.kills += src.outcomes.kills;
        if (src.misc) {
          if (!dst.misc) dst.misc = emptyMisc();
          dst.misc.interrupts += src.misc.interrupts;
          dst.misc.dispels += src.misc.dispels;
          dst.misc.deaths += src.misc.deaths;
        }
        const abKeys = Object.keys(src.abilities);
        for (let k = 0; k < abKeys.length; k++) {
          const sab = src.abilities[abKeys[k]];
          const dab = ensureAbility(dst, sab.key);
          dab.damage += sab.damage;
          dab.heal += sab.heal;
          dab.splashDamage += sab.splashDamage;
          dab.taken += sab.taken;
          dab.outcomes.hits += sab.outcomes.hits;
          dab.outcomes.crits += sab.outcomes.crits;
          dab.outcomes.miss += sab.outcomes.miss;
          dab.outcomes.evade += sab.outcomes.evade;
          dab.outcomes.avoid += sab.outcomes.avoid;
          dab.outcomes.kills += sab.outcomes.kills;
          const tKeys = Object.keys(sab.targets);
          for (let t = 0; t < tKeys.length; t++) {
            const st = sab.targets[tKeys[t]];
            const dt = ensureTarget(dab, st.id, st.name);
            dt.damage += st.damage;
            dt.heal += st.heal;
            dt.splashDamage += st.splashDamage;
            dt.outcomes.hits += st.outcomes.hits;
            dt.outcomes.crits += st.outcomes.crits;
            dt.outcomes.miss += st.outcomes.miss;
            dt.outcomes.evade += st.outcomes.evade;
            dt.outcomes.avoid += st.outcomes.avoid;
            dt.outcomes.kills += st.outcomes.kills;
          }
        }
      }
      for (let d = 0; d < seg.deaths.length; d++) {
        out.deaths.push(seg.deaths[d]);
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
    "playerFrame",
    "targetFrame",
    "bossBar",
    "crypt",
    "threat",
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
    playerFrame: "Player frame",
    targetFrame: "Target frame",
    bossBar: "Boss bar",
    crypt: "Crypt progress",
    threat: "Threat",
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
    playerFrame: { x: 40.5, y: 86, anchor: "bc" },
    targetFrame: { x: 60, y: 86, anchor: "bc" },
    bossBar: { x: 50, y: 8, anchor: "tc" },
    crypt: { x: 50, y: 18, anchor: "tc" },
    threat: { x: 82, y: 75, anchor: "br" },
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
    kills: { x: 99.2, y: 72, anchor: "tr" },
    playerFrame: { x: 32, y: 78, anchor: "bc" },
    targetFrame: { x: 68, y: 78, anchor: "bc" },
    bossBar: { x: 50, y: 9, anchor: "tc" },
    crypt: { x: 50, y: 19, anchor: "tc" },
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
    kills: { x: 98, y: 58, anchor: "br" },
    playerFrame: { x: 28, y: 62, anchor: "bc" },
    targetFrame: { x: 72, y: 62, anchor: "bc" },
    bossBar: { x: 50, y: 10, anchor: "tc" },
    crypt: { x: 50, y: 18, anchor: "tc" },
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
  function migrateLegacyInfoDialog(partial) {
    if (!partial || typeof partial !== "object") return partial;
    const raw = partial;
    if (!raw.infoDialog) return partial;
    const legacy = raw.infoDialog;
    const out = { ...partial };
    delete out.infoDialog;
    if (!out.buffInfo) out.buffInfo = { ...legacy };
    if (!out.itemInfo) {
      const x = typeof legacy.x === "number" ? Math.min(100, legacy.x + 16) : 16;
      out.itemInfo = { x, y: legacy.y, anchor: legacy.anchor };
    }
    return out;
  }
  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }
  function normalizePos(raw, fallback) {
    if (!raw || typeof raw !== "object") return { ...fallback };
    const anchor = raw.anchor || fallback.anchor;
    const valid = ["tl", "tr", "bl", "br", "tc", "bc", "center"];
    return {
      x: clamp(Number(raw.x), 0, 100) || 0,
      y: clamp(Number(raw.y), 0, 100) || 0,
      anchor: valid.indexOf(anchor) >= 0 ? anchor : fallback.anchor
    };
  }
  function mergeLayout(partial, profile = "desktop") {
    const migrated = migrateLegacyInfoDialog(partial);
    const defaults = defaultLayoutFor(profile);
    const out = {};
    for (let i = 0; i < PANEL_IDS.length; i++) {
      const id = PANEL_IDS[i];
      out[id] = normalizePos(migrated && migrated[id], defaults[id]);
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
  function anchorToTopLeftOffset(anchor, widthPx, heightPx) {
    switch (anchor) {
      case "tl":
        return { ox: 0, oy: 0 };
      case "tr":
        return { ox: -widthPx, oy: 0 };
      case "bl":
        return { ox: 0, oy: -heightPx };
      case "br":
        return { ox: -widthPx, oy: -heightPx };
      case "tc":
        return { ox: -widthPx / 2, oy: 0 };
      case "bc":
        return { ox: -widthPx / 2, oy: -heightPx };
      case "center":
        return { ox: -widthPx / 2, oy: -heightPx / 2 };
      default: {
        const _exhaustive = anchor;
        return _exhaustive;
      }
    }
  }
  function reanchorKeepingVisual(pos, nextAnchor, panelW, panelH, rootW, rootH) {
    if (pos.anchor === nextAnchor) return pos;
    if (!(panelW > 0 && panelH > 0 && rootW > 0 && rootH > 0)) {
      return { ...pos, anchor: nextAnchor };
    }
    const ax = pos.x / 100 * rootW;
    const ay = pos.y / 100 * rootH;
    const cur = anchorToTopLeftOffset(pos.anchor, panelW, panelH);
    const left = ax + cur.ox;
    const top = ay + cur.oy;
    const next = anchorToTopLeftOffset(nextAnchor, panelW, panelH);
    const newAx = left - next.ox;
    const newAy = top - next.oy;
    return {
      x: clamp(newAx / rootW * 100, 0, 100),
      y: clamp(newAy / rootH * 100, 0, 100),
      anchor: nextAnchor
    };
  }
  var LAYOUT_ANCHOR_OPTIONS = [
    { id: "tl", glyph: "\u231C", title: "Top-left \u2014 grows down & right" },
    { id: "tc", glyph: "\u2303", title: "Top-center \u2014 grows down" },
    { id: "tr", glyph: "\u231D", title: "Top-right \u2014 grows down & left" },
    { id: "center", glyph: "\u25C6", title: "Center \u2014 grows both ways" },
    { id: "bl", glyph: "\u231E", title: "Bottom-left \u2014 grows up & right" },
    { id: "bc", glyph: "\u2304", title: "Bottom-center \u2014 grows up" },
    { id: "br", glyph: "\u231F", title: "Bottom-right \u2014 grows up & left" }
  ];
  var LAYOUT_ANCHOR_PAD = [
    ["tl", "tc", "tr"],
    [null, "center", null],
    ["bl", "bc", "br"]
  ];
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
  function snapPercent(n, threshold = 1, peerValues) {
    const targets = [50];
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
  function captureVisualSnapStart(panelEl, rootEl, pos) {
    if (!panelEl || !rootEl) return null;
    const p = panelEl.getBoundingClientRect();
    const c = rootEl.getBoundingClientRect();
    if (c.width <= 0 || c.height <= 0) return null;
    return {
      panelLeft: p.left,
      panelTop: p.top,
      panelRight: p.right,
      panelBottom: p.bottom,
      rootLeft: c.left,
      rootTop: c.top,
      rootW: c.width,
      rootH: c.height,
      posX: pos.x,
      posY: pos.y
    };
  }
  function snapDragToVisualEdges(clientX, clientY, pointerStart, visual, thresholdPx = 8) {
    const dx = clientX - pointerStart.clientX;
    const dy = clientY - pointerStart.clientY;
    let left = visual.panelLeft + dx;
    let right = visual.panelRight + dx;
    let top = visual.panelTop + dy;
    let bottom = visual.panelBottom + dy;
    const cLeft = visual.rootLeft;
    const cRight = visual.rootLeft + visual.rootW;
    const cTop = visual.rootTop;
    const cBottom = visual.rootTop + visual.rootH;
    const distL = left - cLeft;
    const distR = cRight - right;
    const distT = top - cTop;
    const distB = cBottom - bottom;
    let shiftX = 0;
    let shiftY = 0;
    let snapX = false;
    let snapY = false;
    if (Math.abs(distL) <= thresholdPx || Math.abs(distR) <= thresholdPx) {
      if (Math.abs(distL) <= Math.abs(distR) && Math.abs(distL) <= thresholdPx) {
        shiftX = -distL;
        snapX = true;
      } else if (Math.abs(distR) <= thresholdPx) {
        shiftX = distR;
        snapX = true;
      }
    }
    if (Math.abs(distT) <= thresholdPx || Math.abs(distB) <= thresholdPx) {
      if (Math.abs(distT) <= Math.abs(distB) && Math.abs(distT) <= thresholdPx) {
        shiftY = -distT;
        snapY = true;
      } else if (Math.abs(distB) <= thresholdPx) {
        shiftY = distB;
        snapY = true;
      }
    }
    const x = clamp(visual.posX + (dx + shiftX) / visual.rootW * 100, 0, 100);
    const y = clamp(visual.posY + (dy + shiftY) / visual.rootH * 100, 0, 100);
    return { x, y, snapX, snapY };
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
    base: "Direct",
    blast: "Explosion",
    burn: "DoT",
    cleave: "AoE",
    hps: "HPS",
    mps: "MPS",
    dr: "DR",
    reflect: "RF"
  };

  // src/lib/settingsFocus.ts
  function resolvePartyFocus(focus, watchedPartyKey3) {
    if (focus === "all") {
      return { scope: "all", partyFilter: null, historyKey: null };
    }
    if (focus === "visible") {
      return { scope: "visible", partyFilter: null, historyKey: null };
    }
    if (focus === "you") {
      return { scope: "watched", partyFilter: null, historyKey: null };
    }
    if (focus === "watched") {
      const key = watchedPartyKey3 || null;
      return { scope: "watched", partyFilter: key, historyKey: key };
    }
    return { scope: "all", partyFilter: focus, historyKey: focus };
  }
  function effectivePartyFocus(focus, hasObserver) {
    if (!hasObserver && (focus === "watched" || focus === "you")) {
      return "visible";
    }
    return focus;
  }
  function effectiveKillScope(scope, hasObserver) {
    if (!hasObserver && scope === "watched") return "visible";
    return scope;
  }
  function partyFocusChoiceLabel(focus, watchedName, partyLabels) {
    if (focus === "watched") {
      return watchedName ? `Party \xB7 ${watchedName}` : "Party";
    }
    if (focus === "you") {
      return watchedName ? `Only \xB7 ${watchedName}` : "You only";
    }
    if (focus === "visible") return "Visible";
    if (focus === "all") return "Session";
    if (typeof focus === "string" && focus.indexOf("solo:") === 0) {
      return focus.slice(5);
    }
    if (partyLabels && partyLabels[focus]) return partyLabels[focus];
    return String(focus);
  }
  function partyFocusLabel(focus, watchedName, hasObserver = true, partyLabels) {
    const eff = effectivePartyFocus(focus, hasObserver);
    return partyFocusChoiceLabel(eff, watchedName, partyLabels);
  }
  function partyFocusMenuOptions(ctx) {
    const name = ctx.watchedName;
    const out = [];
    if (ctx.hasObserver) {
      out.push({
        id: "watched",
        label: partyFocusChoiceLabel("watched", name)
      });
      out.push({
        id: "you",
        label: partyFocusChoiceLabel("you", name)
      });
    }
    out.push({ id: "visible", label: partyFocusChoiceLabel("visible") });
    out.push({ id: "all", label: partyFocusChoiceLabel("all") });
    const parties = ctx.visibleParties || [];
    const skipKey = ctx.watchedPartyKey || "";
    for (let i = 0; i < parties.length; i++) {
      const p = parties[i];
      if (skipKey && p.id === skipKey) continue;
      out.push({ id: p.id, label: p.label });
    }
    return out;
  }
  function killScopeLabel(scope, watchedName) {
    if (scope === "watched") {
      return watchedName ? `Party \xB7 ${watchedName}` : "Party";
    }
    if (scope === "visible") return "Visible";
    if (scope === "all") return "Session";
    const _exhaustive = scope;
    return _exhaustive;
  }

  // src/meters/meterCatalog.ts
  var VIEW_MODES = [
    { id: "bars", label: "Bars" },
    { id: "table", label: "Table" },
    { id: "pie", label: "Pie" },
    { id: "line", label: "Graph" },
    { id: "realtime", label: "Realtime", seriesMode: "realtime" },
    { id: "compare", label: "Compare", seriesMode: "compare" }
  ];
  function supportsViewModes(query) {
    return query.kind === "players" || query.kind === "channel" || query.kind === "avoidance" || query.kind === "rolling" || query.kind === "snapshot";
  }
  function applyViewMode(view) {
    for (let i = 0; i < VIEW_MODES.length; i++) {
      if (VIEW_MODES[i].id !== view) continue;
      const m = VIEW_MODES[i];
      return {
        presentation: m.id,
        seriesMode: m.seriesMode
      };
    }
    return { presentation: "bars", seriesMode: void 0 };
  }
  function catalogPresets(group) {
    const out = [];
    for (let i = 0; i < METER_PRESETS.length; i++) {
      const p = METER_PRESETS[i];
      if (p.catalog === false) continue;
      const g = p.catalogGroup || "meter";
      if (g === group) out.push(p);
    }
    return out;
  }
  var REPORT_TABS = [
    {
      kind: "encounter",
      label: "Encounter",
      presetId: "encounter",
      presentation: "encounter",
      query: { kind: "encounter_summary" }
    },
    {
      kind: "deaths",
      label: "Deaths",
      presetId: "death",
      presentation: "death_log",
      query: { kind: "death_log" }
    },
    {
      kind: "timeline",
      label: "Timeline",
      presetId: "timeline",
      presentation: "timeline",
      query: { kind: "timeline" }
    }
  ];
  function isReportPresentation(p) {
    return p === "death_log" || p === "encounter" || p === "timeline";
  }
  function reportTabByKind(kind) {
    for (let i = 0; i < REPORT_TABS.length; i++) {
      if (REPORT_TABS[i].kind === kind) return REPORT_TABS[i];
    }
    return REPORT_TABS[0];
  }
  function reportKindForPresentation(p) {
    if (p === "encounter") return "encounter";
    if (p === "death_log") return "deaths";
    if (p === "timeline") return "timeline";
    return null;
  }
  function metricFromModeQuery(q) {
    if (q.kind === "players") return q.metric;
    if (q.kind === "avoidance") return "avoidance";
    return "damage";
  }
  var BAR_MODE_CYCLE = [
    {
      id: "damage_done",
      label: "Damage Done",
      query: { kind: "players", metric: "damage", primary: "total" },
      presentation: "bars"
    },
    {
      id: "dps",
      label: "DPS",
      query: { kind: "players", metric: "damage", primary: "rate" },
      presentation: "bars"
    },
    {
      id: "taken",
      label: "Damage Taken",
      query: { kind: "players", metric: "taken", primary: "total" },
      presentation: "bars"
    },
    {
      id: "heal_done",
      label: "Healing Done",
      query: { kind: "players", metric: "heal", primary: "total" },
      presentation: "bars"
    },
    {
      id: "hps",
      label: "HPS",
      query: { kind: "players", metric: "heal", primary: "rate" },
      presentation: "bars"
    },
    {
      id: "healreq",
      label: "Healing Required",
      query: { kind: "players", metric: "healing_required", primary: "total" },
      presentation: "bars"
    },
    {
      id: "avoid",
      label: "Avoidance",
      query: { kind: "avoidance" },
      presentation: "bars"
    }
  ];
  var DISPLAY_TREE = [
    {
      id: "damage",
      label: "Damage",
      children: [BAR_MODE_CYCLE[0], BAR_MODE_CYCLE[1], BAR_MODE_CYCLE[2]]
    },
    {
      id: "heal",
      label: "Heal",
      children: [BAR_MODE_CYCLE[3], BAR_MODE_CYCLE[4], BAR_MODE_CYCLE[5]]
    },
    {
      id: "misc",
      label: "Miscellaneous",
      children: [
        BAR_MODE_CYCLE[6],
        {
          id: "interrupts",
          label: "Interrupts",
          query: { kind: "misc", metric: "interrupts" },
          presentation: "bars"
        },
        {
          id: "dispels",
          label: "Dispels",
          query: { kind: "misc", metric: "dispels" },
          presentation: "bars"
        },
        {
          id: "deaths_rank",
          label: "Deaths",
          query: { kind: "misc", metric: "deaths" },
          presentation: "bars"
        },
        {
          id: "cc_breaks",
          label: "CC Breaks",
          query: { kind: "misc", metric: "cc_breaks" },
          presentation: "bars"
        }
      ]
    }
  ];
  function displayLabelForQuery(query) {
    const idx = barModeIndex(query);
    if (idx >= 0) return BAR_MODE_CYCLE[idx].label;
    return "";
  }
  var PARTY_FOCUS_OPTIONS = partyFocusMenuOptions({ hasObserver: true });
  var METER_PRESETS = [
    {
      id: "damage",
      label: "Damage",
      query: { kind: "players", metric: "damage" },
      presentation: "bars",
      defaultVisible: true,
      // Bottom-right cluster; Healing snaps on the left (see heal snap).
      defaultPos: { x: 1, y: 28, anchor: "br" }
    },
    {
      id: "heal",
      label: "Healing",
      query: { kind: "players", metric: "heal" },
      presentation: "bars",
      defaultVisible: true,
      defaultPos: { x: 16, y: 28, anchor: "br" }
    },
    {
      id: "taken",
      label: "Damage taken",
      query: { kind: "players", metric: "taken" },
      presentation: "bars",
      defaultVisible: false,
      defaultPos: { x: 1, y: 70, anchor: "bl" }
    },
    {
      id: "avoid",
      label: "Avoidance",
      query: { kind: "avoidance" },
      presentation: "bars",
      defaultVisible: false,
      defaultPos: { x: 1, y: 50, anchor: "tl" }
    },
    {
      id: "inspector",
      label: "Inspector",
      query: { kind: "details", actorId: "" },
      presentation: "details",
      catalog: false,
      catalogGroup: "tool",
      defaultVisible: false,
      defaultPos: { x: 50, y: 55, anchor: "bc" },
      defaultFrame: { w: 560, h: 400 }
    },
    {
      id: "death",
      label: "Deaths",
      query: { kind: "death_log" },
      presentation: "death_log",
      catalog: false,
      catalogGroup: "tool",
      defaultVisible: false,
      defaultPos: { x: 50, y: 88, anchor: "bc" },
      defaultFrame: { w: 480, h: 320 }
    },
    {
      id: "compare",
      label: "Compare",
      query: { kind: "compare", metric: "damage" },
      presentation: "compare",
      seriesMode: "compare",
      catalog: false,
      defaultVisible: false,
      defaultPos: { x: 95, y: 40, anchor: "tr" }
    },
    {
      id: "realtime",
      label: "Realtime",
      query: { kind: "realtime" },
      presentation: "realtime",
      seriesMode: "realtime",
      catalog: false,
      defaultVisible: false,
      defaultPos: { x: 95, y: 22, anchor: "tr" }
    },
    {
      id: "encounter",
      label: "Encounter",
      query: { kind: "encounter_summary" },
      presentation: "encounter",
      catalog: false,
      catalogGroup: "tool",
      defaultVisible: false,
      defaultPos: { x: 50, y: 88, anchor: "bc" },
      defaultFrame: { w: 480, h: 320 }
    },
    {
      id: "timeline",
      label: "Timeline",
      query: { kind: "timeline" },
      presentation: "timeline",
      catalog: false,
      catalogGroup: "tool",
      defaultVisible: false,
      defaultPos: { x: 50, y: 88, anchor: "bc" },
      defaultFrame: { w: 480, h: 320 }
    },
    {
      id: "summary",
      label: "Summary",
      query: { kind: "summary" },
      presentation: "table",
      catalog: false,
      defaultVisible: false,
      defaultPos: { x: 30, y: 50, anchor: "center" }
    },
    {
      id: "pie",
      label: "Ability pie",
      query: { kind: "pie", metric: "damage" },
      presentation: "pie",
      catalog: false,
      defaultVisible: false,
      defaultPos: { x: 70, y: 50, anchor: "center" }
    },
    {
      id: "chart",
      label: "DPS graph",
      query: { kind: "history", channel: "dps" },
      presentation: "line",
      catalog: false,
      defaultVisible: false,
      defaultPos: { x: 95, y: 58, anchor: "br" }
    },
    {
      id: "rolling",
      label: "Hit DPS",
      query: { kind: "rolling" },
      presentation: "bars",
      catalogGroup: "al",
      defaultVisible: false,
      defaultPos: { x: 99.5, y: 50, anchor: "tr" }
    },
    {
      id: "pdps",
      label: "PDPS",
      query: { kind: "snapshot", mode: "pdps" },
      presentation: "bars",
      catalogGroup: "al",
      defaultVisible: false,
      hideWhenEmpty: true,
      defaultPos: { x: 99, y: 14, anchor: "tr" }
    },
    {
      id: "coop_v1",
      label: "s.coop v1",
      query: { kind: "snapshot", mode: "coop_v1" },
      presentation: "bars",
      catalogGroup: "al",
      defaultVisible: false,
      fadeWhenIdle: false,
      hideWhenEmpty: true,
      defaultPos: { x: 91, y: 63, anchor: "tr" }
    },
    {
      id: "coop_v2",
      label: "s.coop v2",
      query: { kind: "snapshot", mode: "coop_v2" },
      presentation: "bars",
      catalogGroup: "al",
      defaultVisible: false,
      fadeWhenIdle: false,
      hideWhenEmpty: true,
      defaultPos: { x: 99.5, y: 63, anchor: "tr" }
    },
    {
      id: "healreq",
      label: "Healing required",
      query: { kind: "players", metric: "healing_required" },
      presentation: "bars",
      defaultVisible: false,
      defaultPos: { x: 20, y: 40, anchor: "tl" }
    }
  ];
  function newId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  }
  function presetById(id) {
    for (let i = 0; i < METER_PRESETS.length; i++) {
      if (METER_PRESETS[i].id === id) return METER_PRESETS[i];
    }
    return null;
  }
  function instanceFromPreset(preset, overrides) {
    var _a, _b;
    const pos = (overrides == null ? void 0 : overrides.pos) || preset.defaultPos || { x: 50, y: 50, anchor: "center" };
    return {
      id: (overrides == null ? void 0 : overrides.id) || newId(`meter-${preset.id}`),
      label: (overrides == null ? void 0 : overrides.label) || preset.label,
      query: (overrides == null ? void 0 : overrides.query) || { ...preset.query },
      presentation: (overrides == null ? void 0 : overrides.presentation) || preset.presentation,
      seriesMode: (overrides == null ? void 0 : overrides.seriesMode) || preset.seriesMode,
      selectedset: (overrides == null ? void 0 : overrides.selectedset) || "current",
      partyFocus: (overrides == null ? void 0 : overrides.partyFocus) || "watched",
      fadeWhenIdle: (overrides == null ? void 0 : overrides.fadeWhenIdle) != null ? overrides.fadeWhenIdle : preset.fadeWhenIdle !== false,
      pos: { ...pos },
      visible: (overrides == null ? void 0 : overrides.visible) != null ? overrides.visible : true,
      opacity: (overrides == null ? void 0 : overrides.opacity) != null ? overrides.opacity : 1,
      stack: overrides == null ? void 0 : overrides.stack,
      integrate: overrides == null ? void 0 : overrides.integrate,
      normalize: overrides == null ? void 0 : overrides.normalize,
      locked: overrides == null ? void 0 : overrides.locked,
      hideWhenEmpty: (overrides == null ? void 0 : overrides.hideWhenEmpty) != null ? overrides.hideWhenEmpty : preset.hideWhenEmpty,
      frameW: (overrides == null ? void 0 : overrides.frameW) != null ? overrides.frameW : (_a = preset.defaultFrame) == null ? void 0 : _a.w,
      frameH: (overrides == null ? void 0 : overrides.frameH) != null ? overrides.frameH : (_b = preset.defaultFrame) == null ? void 0 : _b.h
    };
  }
  function meterHidesWhenEmpty(inst) {
    if (typeof inst.hideWhenEmpty === "boolean") return inst.hideWhenEmpty;
    return inst.query.kind === "snapshot";
  }
  function barModeIndex(query) {
    for (let i = 0; i < BAR_MODE_CYCLE.length; i++) {
      const m = BAR_MODE_CYCLE[i];
      if (query.kind !== m.query.kind) continue;
      if (query.kind === "players" && m.query.kind === "players") {
        if (query.metric !== m.query.metric) continue;
        const qPrimary = query.primary || "total";
        const mPrimary = m.query.kind === "players" ? m.query.primary || "total" : "total";
        if (qPrimary === mPrimary) return i;
      } else if (query.kind === "avoidance" && m.query.kind === "avoidance") {
        return i;
      }
    }
    return -1;
  }
  function cycleBarMode(query, delta) {
    let idx = barModeIndex(query);
    if (idx < 0) idx = 0;
    const next = (idx + delta + BAR_MODE_CYCLE.length * 8) % BAR_MODE_CYCLE.length;
    const m = BAR_MODE_CYCLE[next];
    return {
      query: { ...m.query },
      label: m.label
    };
  }
  function canCycleBarMode(query) {
    return query.kind === "players" || query.kind === "avoidance";
  }
  function formatMeterReportLines(title, rows, metricLabel) {
    const lines = [`[${title}${metricLabel ? ` \xB7 ${metricLabel}` : ""}]`];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rate = r.rate != null ? ` (${Math.round(r.rate)}/s)` : "";
      lines.push(
        `${i + 1}. ${r.name} \u2014 ${Math.round(r.value)}${rate} \xB7 ${Math.round(r.pct * 100)}%`
      );
    }
    return lines.join("\n");
  }

  // src/meters/meterPresets.ts
  var LEGACY_POS_MAP = {
    combat: "meter-chart",
    pdps: "meter-damage",
    hitDps: "meter-rolling",
    coopV1: "meter-coop_v1",
    coopV2: "meter-coop_v2"
  };
  function meterHasAnySnap(m) {
    const s = m.snap;
    if (!s) return false;
    return !!(s[1] || s[2] || s[3] || s[4]);
  }
  function stableId(presetId) {
    return `meter-${presetId}`;
  }
  function defaultMeterInstances() {
    const out = [];
    for (let i = 0; i < METER_PRESETS.length; i++) {
      const p = METER_PRESETS[i];
      if (!p.defaultVisible) continue;
      out.push(
        instanceFromPreset(p, {
          id: stableId(p.id),
          visible: true
        })
      );
    }
    const dmg = out.find((m) => m.id === stableId("damage"));
    const heal = out.find((m) => m.id === stableId("heal"));
    if (dmg && heal) {
      dmg.snap = { 1: heal.id };
      heal.snap = { 3: dmg.id };
      const h = dmg.frameH || heal.frameH;
      if (h) {
        dmg.frameH = h;
        heal.frameH = h;
      }
    }
    return out;
  }
  function isQuery(raw) {
    return raw && typeof raw === "object" && typeof raw.kind === "string";
  }
  var COMPOSITION_CHANNEL_LABELS = /* @__PURE__ */ new Set([
    "Explosion",
    "Direct",
    "DoT",
    "AoE"
  ]);
  function migrateRankedInstance(row2) {
    let query = row2.query;
    let presentation = row2.presentation || "bars";
    let label = row2.label;
    if (query.kind === "channel" && query.channel !== "dps") {
      query = { kind: "players", metric: "damage" };
      presentation = "bars";
      if (!label || COMPOSITION_CHANNEL_LABELS.has(label)) label = void 0;
    }
    if (query.kind === "players" || query.kind === "avoidance" || query.kind === "rolling" || query.kind === "snapshot") {
      if (presentation === "table" || presentation === "pie" || presentation === "line" || presentation === "realtime" || presentation === "compare") {
        presentation = "bars";
      }
    }
    return { query, presentation, label };
  }
  function normalizeMeterInstances(raw) {
    var _a, _b;
    if (!Array.isArray(raw) || !raw.length) return defaultMeterInstances();
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    for (let i = 0; i < raw.length; i++) {
      const row2 = raw[i];
      if (!row2 || typeof row2 !== "object" || !isQuery(row2.query)) continue;
      const id = typeof row2.id === "string" && row2.id ? row2.id : `meter-${i}-${Date.now()}`;
      const pos = row2.pos && typeof row2.pos.x === "number" && typeof row2.pos.y === "number" ? {
        x: row2.pos.x,
        y: row2.pos.y,
        anchor: row2.pos.anchor || "tl"
      } : { x: 50, y: 50, anchor: "center" };
      seen.add(id);
      let query = row2.query;
      let presentation = row2.presentation || "bars";
      let label = typeof row2.label === "string" ? row2.label : void 0;
      if ((id === "meterChannels" || id === "meter-chart") && query.kind === "channel" && query.channel === "dps") {
        query = { kind: "history", channel: "dps" };
        presentation = "line";
        if (!label || label === "DPS") label = "DPS graph";
      }
      const migrated = migrateRankedInstance({ query, presentation, label });
      query = migrated.query;
      presentation = migrated.presentation;
      label = migrated.label;
      out.push({
        id,
        label,
        query,
        presentation,
        seriesMode: row2.seriesMode,
        stack: !!row2.stack,
        integrate: !!row2.integrate,
        normalize: !!row2.normalize,
        rtMetric: row2.rtMetric,
        rtWindow: row2.rtWindow,
        rtPaused: !!row2.rtPaused,
        seriesEnabled: row2.seriesEnabled,
        selectedset: row2.selectedset || "current",
        partyFocus: row2.partyFocus || "watched",
        fadeWhenIdle: row2.fadeWhenIdle !== false,
        pos,
        visible: row2.visible !== false,
        opacity: typeof row2.opacity === "number" ? Math.min(1, Math.max(0.25, row2.opacity)) : 1,
        frameW: typeof row2.frameW === "number" && row2.frameW > 0 ? row2.frameW : void 0,
        frameH: typeof row2.frameH === "number" && row2.frameH > 0 ? row2.frameH : void 0,
        locked: typeof row2.locked === "boolean" ? row2.locked : void 0,
        hideWhenEmpty: typeof row2.hideWhenEmpty === "boolean" ? row2.hideWhenEmpty : void 0,
        alwaysShowSelf: typeof row2.alwaysShowSelf === "boolean" ? row2.alwaysShowSelf : void 0,
        snap: row2.snap && typeof row2.snap === "object" ? {
          1: typeof row2.snap[1] === "string" ? row2.snap[1] : void 0,
          2: typeof row2.snap[2] === "string" ? row2.snap[2] : void 0,
          3: typeof row2.snap[3] === "string" ? row2.snap[3] : void 0,
          4: typeof row2.snap[4] === "string" ? row2.snap[4] : void 0
        } : void 0
      });
    }
    if (!out.length) return defaultMeterInstances();
    const defaults = defaultMeterInstances();
    for (let i = 0; i < defaults.length; i++) {
      const d = defaults[i];
      if (!seen.has(d.id)) {
        out.push({
          ...d,
          pos: { ...d.pos },
          snap: d.snap ? { ...d.snap } : void 0
        });
        seen.add(d.id);
      }
    }
    const dmg = out.find((m) => m.id === "meter-damage");
    const heal = out.find((m) => m.id === "meter-heal");
    if (dmg && heal && !((_a = dmg.snap) == null ? void 0 : _a[1]) && !((_b = heal.snap) == null ? void 0 : _b[3]) && !meterHasAnySnap(dmg) && !meterHasAnySnap(heal)) {
      dmg.snap = { ...dmg.snap || {}, 1: heal.id };
      heal.snap = { ...heal.snap || {}, 3: dmg.id };
    }
    const next = [];
    for (let i = 0; i < out.length; i++) {
      const m = out[i];
      const isDetails = m.presentation === "details" || m.query.kind === "details";
      if (isDetails && m.query.kind === "details" && (!m.query.actorId || m.query.actorId === "")) {
        next.push({ ...m, presentation: "details", visible: false });
        continue;
      }
      next.push(m);
    }
    return next;
  }
  function migrateLegacyMeterLayout(instances, legacyLayout) {
    if (!legacyLayout) return instances;
    const next = instances.map((m) => ({ ...m, pos: { ...m.pos } }));
    const byId = {};
    for (let i = 0; i < next.length; i++) byId[next[i].id] = next[i];
    const legacyKeys = Object.keys(LEGACY_POS_MAP);
    for (let i = 0; i < legacyKeys.length; i++) {
      const legacyId = legacyKeys[i];
      const meterId = LEGACY_POS_MAP[legacyId];
      const pos = legacyLayout[legacyId];
      if (pos && byId[meterId]) {
        byId[meterId].pos = { ...pos };
      }
    }
    return next;
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

  // src/lib/partyBuffMode.ts
  var PARTY_BUFF_MODES = [
    "auto",
    "all",
    "observed",
    "compact",
    "shared",
    "off"
  ];
  var PARTY_BUFF_AUTO_THRESHOLD = 8;
  var PARTY_BUFF_COMPACT_MAX = 2;
  var PARTY_BUFF_DEFAULT_MAX = 4;
  function normalizePartyBuffMode(raw) {
    if (raw === "all" || raw === "auto" || raw === "observed" || raw === "compact" || raw === "shared" || raw === "off") {
      return raw;
    }
    return "auto";
  }
  function partyBuffModeLabel(mode) {
    switch (mode) {
      case "all":
        return "All";
      case "auto":
        return "Auto";
      case "observed":
        return "Obs";
      case "compact":
        return "Compact";
      case "shared":
        return "Shared";
      case "off":
        return "Off";
      default: {
        const _exhaustive = mode;
        return _exhaustive;
      }
    }
  }
  function partyBuffModeTitle(mode) {
    switch (mode) {
      case "all":
        return "Party buffs: under every chip";
      case "auto":
        return `Party buffs: all when \u2264${PARTY_BUFF_AUTO_THRESHOLD} chips; observed-only when larger`;
      case "observed":
        return "Party buffs: observed chip only";
      case "compact":
        return `Party buffs: max ${PARTY_BUFF_COMPACT_MAX} icons + overflow per chip`;
      case "shared":
        return "Party buffs: one shared strip per party (unique buffs)";
      case "off":
        return "Party buffs: hidden";
      default: {
        const _exhaustive = mode;
        return _exhaustive;
      }
    }
  }
  function nextPartyBuffMode(mode) {
    const idx = PARTY_BUFF_MODES.indexOf(mode);
    const next = idx < 0 ? 0 : (idx + 1) % PARTY_BUFF_MODES.length;
    return PARTY_BUFF_MODES[next];
  }
  function showUnderChipBuffs(mode, visibleChipCount, isObserved, threshold = PARTY_BUFF_AUTO_THRESHOLD) {
    switch (mode) {
      case "all":
      case "compact":
        return true;
      case "off":
      case "shared":
        return false;
      case "observed":
        return isObserved;
      case "auto":
        if (visibleChipCount <= threshold) return true;
        return isObserved;
      default: {
        const _exhaustive = mode;
        return _exhaustive;
      }
    }
  }
  function underChipBuffMaxVisible(mode) {
    switch (mode) {
      case "compact":
        return PARTY_BUFF_COMPACT_MAX;
      case "all":
      case "auto":
      case "observed":
        return PARTY_BUFF_DEFAULT_MAX;
      case "shared":
      case "off":
        return 0;
      default: {
        const _exhaustive = mode;
        return _exhaustive;
      }
    }
  }

  // src/lib/settings.ts
  var KEY = "al-comm-ui-settings-v1";
  var PANEL_IDS_SET = new Set(PANEL_IDS);
  var CLOSABLE_PANEL_IDS = [
    "bossBar",
    "crypt",
    "kills",
    "threat",
    "command",
    "bag"
  ];
  var DEFAULT_PANEL_VISIBLE = {
    bossBar: true,
    crypt: true,
    kills: true,
    threat: true,
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
    panelOpacity: {},
    partyBuffMode: "auto",
    meterInstances: defaultMeterInstances(),
    metersLocked: true,
    meterAlwaysShowSelf: true,
    meterWindowGrouping: true,
    meterBookmarks: [],
    meterRecentReports: [],
    metersHidden: false,
    meterClosedInstances: [],
    setupWizardDone: false,
    toursCompleted: {}
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
  function normalizeMeterBookmarks(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    for (let i = 0; i < raw.length; i++) {
      const row2 = raw[i];
      if (!row2 || typeof row2 !== "object") continue;
      if (typeof row2.id !== "string" || !row2.id) continue;
      if (typeof row2.label !== "string") continue;
      if (!row2.query || typeof row2.query !== "object" || typeof row2.query.kind !== "string") {
        continue;
      }
      out.push({
        id: row2.id,
        label: row2.label,
        query: { ...row2.query },
        presentation: row2.presentation,
        partyFocus: row2.partyFocus,
        selectedset: row2.selectedset
      });
    }
    return out;
  }
  function mergePanelOpacity(partial) {
    const out = {};
    if (!partial || typeof partial !== "object") return out;
    const raw = partial;
    if (typeof raw.infoDialog === "number") {
      if (typeof raw.buffInfo !== "number")
        out.buffInfo = clampOpacity(raw.infoDialog);
      if (typeof raw.itemInfo !== "number")
        out.itemInfo = clampOpacity(raw.infoDialog);
    }
    const keys = Object.keys(partial);
    for (let i = 0; i < keys.length; i++) {
      const id = keys[i];
      if (id === "infoDialog") continue;
      const v = raw[id];
      if (typeof v === "number" && PANEL_IDS_SET.has(id)) {
        out[id] = clampOpacity(v);
      }
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
    void legacyCombatVisible;
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
      const row2 = raw[i];
      if (!row2 || typeof row2 !== "object") continue;
      const name = String(row2.name || "").trim();
      const code = String(row2.code || "");
      if (!name && !code.trim()) continue;
      const id = typeof row2.id === "string" && row2.id ? row2.id : `snip-${i}-${Date.now()}`;
      const folderRaw = typeof row2.folder === "string" ? row2.folder.trim() : "";
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
      panelVisible: mergePanelVisible(parsed.panelVisible, parsed.combatVisible),
      commandSnippets: normalizeSnippets(parsed.commandSnippets),
      commandDraft: typeof parsed.commandDraft === "string" ? parsed.commandDraft : "",
      combatCompact: !!parsed.combatCompact,
      bagOpenPreferred: !!parsed.bagOpenPreferred,
      panelOpacity: mergePanelOpacity(parsed.panelOpacity),
      partyBuffMode: normalizePartyBuffMode(parsed.partyBuffMode),
      meterInstances: migrateLegacyMeterLayout(
        normalizeMeterInstances(parsed.meterInstances),
        parsed.panelLayout || panelLayout
      ),
      metersLocked: parsed.metersLocked !== false,
      meterAlwaysShowSelf: parsed.meterAlwaysShowSelf !== false,
      meterWindowGrouping: parsed.meterWindowGrouping !== false,
      meterBookmarks: normalizeMeterBookmarks(parsed.meterBookmarks),
      meterRecentReports: Array.isArray(parsed.meterRecentReports) ? parsed.meterRecentReports.filter(
        (r) => r && typeof r.id === "string" && typeof r.label === "string" && typeof r.text === "string"
      ).slice(0, 10) : [],
      metersHidden: !!parsed.metersHidden,
      setupWizardDone: !!parsed.setupWizardDone || !!(parsed.meterAppearance && parsed.meterAppearance.setupWizardDone),
      toursCompleted: parsed.toursCompleted && typeof parsed.toursCompleted === "object" ? parsed.toursCompleted : {}
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
      panelOpacity: {},
      partyBuffMode: "auto",
      meterInstances: defaultMeterInstances(),
      metersLocked: true,
      meterAlwaysShowSelf: true,
      meterWindowGrouping: true,
      meterBookmarks: [],
      meterRecentReports: [],
      metersHidden: false
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
    if (partial.partyBuffMode != null) {
      next.partyBuffMode = normalizePartyBuffMode(partial.partyBuffMode);
    }
    if (partial.meterInstances) {
      next.meterInstances = normalizeMeterInstances(partial.meterInstances);
    }
    if (typeof partial.metersLocked === "boolean") {
      next.metersLocked = partial.metersLocked;
    }
    if (typeof partial.meterAlwaysShowSelf === "boolean") {
      next.meterAlwaysShowSelf = partial.meterAlwaysShowSelf;
    }
    if (typeof partial.meterWindowGrouping === "boolean") {
      next.meterWindowGrouping = partial.meterWindowGrouping;
    }
    if (partial.meterBookmarks) {
      next.meterBookmarks = normalizeMeterBookmarks(partial.meterBookmarks);
    }
    if (partial.meterRecentReports) {
      next.meterRecentReports = partial.meterRecentReports.slice(0, 10);
    }
    if (typeof partial.metersHidden === "boolean") {
      next.metersHidden = partial.metersHidden;
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
  function resetMeterInstances() {
    return saveSettings({
      meterInstances: defaultMeterInstances(),
      metersLocked: true
    });
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

  // src/meters/meterUiTick.ts
  var listeners2 = [];
  var dirty = false;
  var raf = 0;
  function flush() {
    raf = 0;
    if (!dirty) return;
    dirty = false;
    for (let i = 0; i < listeners2.length; i++) {
      listeners2[i]();
    }
  }
  function markMeterDirty() {
    dirty = true;
    if (raf) return;
    raf = window.requestAnimationFrame(flush);
  }
  function subscribeMeterTick(listener) {
    listeners2.push(listener);
    return () => {
      const idx = listeners2.indexOf(listener);
      if (idx >= 0) listeners2.splice(idx, 1);
    };
  }

  // src/meters/meterAppearance.ts
  var appearanceListeners = [];
  function subscribeMeterAppearance(listener) {
    appearanceListeners.push(listener);
    return () => {
      const idx = appearanceListeners.indexOf(listener);
      if (idx >= 0) appearanceListeners.splice(idx, 1);
    };
  }
  function notifyMeterAppearance() {
    markMeterDirty();
    for (let i = 0; i < appearanceListeners.length; i++) {
      appearanceListeners[i]();
    }
  }
  var DEFAULT_METER_APPEARANCE = {
    showStatusbar: true,
    showTotalBar: true,
    animateBars: true,
    barHeight: 18,
    barSpacing: 1,
    windowScale: 1,
    showSpecIcons: true,
    showRankNumbers: true,
    segmentsLocked: false,
    disableGrouping: false,
    autoHideCombat: false,
    autoHideOoc: false,
    hoverAlpha: 1,
    idleAlpha: 0.85,
    deathLogInvert: false,
    deathLogLifePct: true,
    deathLogRelevanceSec: 15,
    testBars: false
  };
  function getMeterAppearance() {
    const s = getSettings();
    return { ...DEFAULT_METER_APPEARANCE, ...s.meterAppearance || {} };
  }
  function patchMeterAppearance(partial) {
    patchSettings({
      meterAppearance: { ...getMeterAppearance(), ...partial }
    });
    notifyMeterAppearance();
  }
  var INTERRUPT_ABILITY_KEYS = /* @__PURE__ */ new Set([
    "agitate",
    "taunt",
    "scare",
    "stomp",
    "warcry"
  ]);
  var DISPEL_ABILITY_KEYS = /* @__PURE__ */ new Set(["curse", "partyheal"]);

  // src/meters/meterSegmentMeta.ts
  function formatSegmentDuration(seg) {
    const end = seg.endedAt || Date.now();
    const sec = Math.max((end - seg.startedAt) / 1e3, 1);
    if (sec >= 3600) return `${(sec / 3600).toFixed(1)}h`;
    if (sec >= 60) return `${Math.round(sec / 60)}m`;
    return `${Math.round(sec)}s`;
  }
  function autoSegmentLabel(seg, seq) {
    if (seg.label) return seg.label;
    const dur = formatSegmentDuration(seg);
    const deaths = seg.deaths.length;
    if (deaths > 0) {
      return `Fight #${seq} \xB7 ${dur} \xB7 ${deaths} death${deaths === 1 ? "" : "s"}`;
    }
    return `Fight #${seq} \xB7 ${dur}`;
  }
  function inferSegmentOutcome(seg, partyActorIds) {
    if (seg.outcome) return seg.outcome;
    if (!partyActorIds.length) return "timeout";
    let dead = 0;
    for (let i = 0; i < partyActorIds.length; i++) {
      const id = partyActorIds[i];
      let wasDead = false;
      for (let d = 0; d < seg.deaths.length; d++) {
        if (seg.deaths[d].id === id) {
          wasDead = true;
          break;
        }
      }
      if (wasDead) dead += 1;
    }
    if (dead >= partyActorIds.length && dead > 0) return "wipe";
    if (seg.deaths.length === 0 && seg.endedAt) return "kill";
    return seg.deaths.length > 0 ? "wipe" : "kill";
  }
  function segmentOutcomeClass(outcome) {
    if (outcome === "wipe") return "ecu-seg-wipe";
    if (outcome === "kill") return "ecu-seg-kill";
    return "";
  }

  // src/meters/meterEngine.ts
  var COMBAT_BREAK_MS = 12e3;
  var MAX_PAST = 12;
  var HISTORY_MS = 5e3;
  var MAX_HISTORY = 60;
  var CONDITION_SAMPLE_MS = 500;
  var live = null;
  var past = [];
  var history = [];
  var lastHistoryAt = 0;
  var lastCombatAt = 0;
  var inCombat = false;
  var segSeq = 0;
  var playerMeta = {};
  var watchedPartyIds = /* @__PURE__ */ new Set();
  var watchedPartyKey = "";
  var visiblePlayerIds = /* @__PURE__ */ new Set();
  var youId = "";
  var lastConditionSample = 0;
  var openConditions = {};
  var unsubDamage = null;
  var unsubKill2 = null;
  var unsubAction = null;
  function soloKey(id, name) {
    return `solo:${name || id}`;
  }
  function partyKeyFor(ent, id) {
    if (!ent) return soloKey(id);
    if (ent.party) return ent.party;
    return soloKey(id, ent.name);
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
  function nextSegId() {
    segSeq += 1;
    return `fight-${segSeq}-${Date.now()}`;
  }
  function ensureLive(now) {
    if (!live) {
      live = emptySegment(nextSegId(), now);
      inCombat = true;
    }
    return live;
  }
  function endLive(now) {
    if (!live) return;
    live.endedAt = now;
    const partyIds = [];
    const ids = Object.keys(live.actors);
    for (let i = 0; i < ids.length; i++) {
      if (playerMeta[ids[i]]) partyIds.push(ids[i]);
    }
    live.seq = segSeq;
    live.outcome = inferSegmentOutcome(live, partyIds);
    live.label = autoSegmentLabel(live, segSeq);
    past.unshift(live);
    while (past.length > MAX_PAST) past.pop();
    live = null;
    inCombat = false;
    markMeterDirty();
  }
  function noteCombatActivity(now) {
    if (inCombat && lastCombatAt && now - lastCombatAt > COMBAT_BREAK_MS) {
      endLive(now);
    }
    lastCombatAt = now;
    if (!live) ensureLive(now);
    else inCombat = true;
  }
  function metaFor(id) {
    if (!id) return void 0;
    const m = playerMeta[id];
    if (m) return m;
    const ent = getEntitiesRecord()[id];
    if (!ent) return { name: id, partyKey: soloKey(id) };
    return {
      name: ent.name || id,
      ctype: ent.ctype,
      partyKey: partyKeyFor(ent, id)
    };
  }
  function sampleHistory(now) {
    if (now - lastHistoryAt < HISTORY_MS) return;
    lastHistoryAt = now;
    const seg = live;
    if (!seg || !seg.startedAt) return;
    const elapsed = Math.max(now - seg.startedAt, 1e3);
    const values = {};
    const ids = Object.keys(seg.actors);
    for (let i = 0; i < ids.length; i++) {
      const a = seg.actors[ids[i]];
      values[a.id] = a.damage * 1e3 / elapsed;
    }
    history.push({ at: now, values });
    while (history.length > MAX_HISTORY) history.shift();
  }
  function sampleConditions(now) {
    if (now - lastConditionSample < CONDITION_SAMPLE_MS) return;
    lastConditionSample = now;
    const seg = live;
    if (!seg) return;
    const ents = getEntitiesRecord();
    const ids = Object.keys(playerMeta);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const ent = ents[id];
      const s = ent && ent.s;
      if (!s || typeof s !== "object") continue;
      const keys = Object.keys(s);
      for (let k = 0; k < keys.length; k++) {
        const key = keys[k];
        const openKey = `${id}:${key}`;
        if (!openConditions[openKey]) {
          const iv = {
            actorId: id,
            key,
            startedAt: now
          };
          openConditions[openKey] = iv;
          seg.conditions.push(iv);
        }
      }
      const openKeys = Object.keys(openConditions);
      for (let o = 0; o < openKeys.length; o++) {
        const ok = openKeys[o];
        if (ok.indexOf(id + ":") !== 0) continue;
        const condKey = ok.slice(id.length + 1);
        if (s[condKey]) continue;
        const iv = openConditions[ok];
        if (iv && iv.endedAt == null) iv.endedAt = now;
        delete openConditions[ok];
      }
    }
  }
  function onDamageEvent(ev) {
    ingestRollingSample(ev);
    noteIncomingHit(ev);
    const actorIsPlayer = isPlayerId(ev.actor);
    const targetIsPlayer = isPlayerId(ev.target);
    const hasCombatSignal = !!(ev.damage && ev.damage > 0) || !!(ev.heal && ev.heal > 0) || !!(ev.lifesteal && ev.lifesteal > 0) || !!(ev.manasteal && ev.manasteal > 0) || !!(ev.dreturn && ev.dreturn > 0) || !!(ev.reflect && ev.reflect > 0) || !!ev.miss || !!ev.evade || !!ev.avoid;
    if (!hasCombatSignal) return;
    const relevant = actorIsPlayer && !!ev.actor || targetIsPlayer && (!!ev.dreturn || !!ev.reflect || !!ev.damage);
    if (relevant) noteCombatActivity(ev.at);
    if (ev.damage && ev.damage > 0 && ev.target && targetIsPlayer) {
      applyDamageToShadow(ev.target, ev.damage);
    }
    const liveEnts = getEntitiesRecord();
    let effectiveHeal = 0;
    let effectiveMana = 0;
    if (ev.heal && ev.heal > 0 && ev.target) {
      effectiveHeal += effectiveGain(
        ev.target,
        ev.heal,
        "hp",
        liveEnts[ev.target]
      );
    }
    if (ev.lifesteal && ev.lifesteal > 0 && ev.actor) {
      effectiveHeal += effectiveGain(
        ev.actor,
        ev.lifesteal,
        "hp",
        liveEnts[ev.actor]
      );
    }
    if (ev.manasteal && ev.manasteal > 0 && ev.actor) {
      effectiveMana += effectiveGain(
        ev.actor,
        ev.manasteal,
        "mp",
        liveEnts[ev.actor]
      );
    }
    const seg = ensureLive(ev.at);
    applyDamageToSegment(seg, ev, {
      actorMeta: metaFor(ev.actor),
      targetMeta: metaFor(ev.target),
      effectiveHeal,
      effectiveMana,
      actorIsPlayer,
      targetIsPlayer
    });
    sampleHistory(ev.at);
    markMeterDirty();
  }
  function onKillEvent(ev) {
    const now = ev.at;
    if (isPlayerId(ev.id) || playerMeta[ev.id]) {
      noteCombatActivity(now);
      const seg = ensureLive(now);
      seg.deaths.push(buildDeathSnapshot(ev.id, now));
      const actor = seg.actors[ev.id];
      if (actor) {
        if (!actor.misc) actor.misc = emptyMisc();
        actor.misc.deaths += 1;
      }
      markMeterDirty();
    }
  }
  function onActionEvent(ev) {
    if (!ev.actor || !isPlayerId(ev.actor)) return;
    noteCombatActivity(ev.at);
    const seg = ensureLive(ev.at);
    const src = (ev.source || "attack").toLowerCase();
    seg.casts.push({
      at: ev.at,
      actorId: ev.actor,
      source: ev.source || "attack",
      targetId: ev.target,
      pid: ev.pid
    });
    while (seg.casts.length > 200) seg.casts.shift();
    const actor = ensureActor(seg, ev.actor, metaFor(ev.actor));
    if (!actor.misc) actor.misc = emptyMisc();
    if (INTERRUPT_ABILITY_KEYS.has(src)) actor.misc.interrupts += 1;
    if (DISPEL_ABILITY_KEYS.has(src)) actor.misc.dispels += 1;
    markMeterDirty();
  }
  function resolveSegment(ref) {
    const r = ref || "current";
    if (r === "total") {
      const parts = [];
      if (live) parts.push(live);
      for (let i = 0; i < past.length; i++) parts.push(past[i]);
      if (!parts.length) return null;
      return mergeSegments("total", parts, Date.now());
    }
    if (typeof r === "object" && r.pastId) {
      for (let i = 0; i < past.length; i++) {
        if (past[i].id === r.pastId) return past[i];
      }
      return null;
    }
    if (inCombat && live) return live;
    if (past.length) return past[0];
    return live;
  }
  function listPastSegments() {
    return past.slice();
  }
  function getLiveSegment() {
    return live;
  }
  function isMeterInCombat() {
    return inCombat;
  }
  function getHistoryPoints() {
    return history;
  }
  function getWatchedPartyKey() {
    return watchedPartyKey;
  }
  function getYouId() {
    return youId;
  }
  function isVisiblePlayer(id) {
    return visiblePlayerIds.has(id);
  }
  function isWatchedPartyMember(id) {
    return watchedPartyIds.has(id);
  }
  function listVisibleParties() {
    const byKey = {};
    const ids = Array.from(visiblePlayerIds);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const meta = playerMeta[id];
      const key = (meta == null ? void 0 : meta.partyKey) || soloKey(id, meta == null ? void 0 : meta.name);
      const name = (meta == null ? void 0 : meta.name) || id;
      if (!byKey[key]) byKey[key] = [];
      if (byKey[key].indexOf(name) < 0) byKey[key].push(name);
    }
    const keys = Object.keys(byKey);
    const out = [];
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const members = byKey[key].slice().sort();
      const label = key.indexOf("solo:") === 0 ? members[0] || key.slice(5) : members.length ? `Party \xB7 ${members.join(", ")}` : `Party \xB7 ${key}`;
      out.push({ id: key, label, members });
    }
    out.sort((a, b) => a.label.localeCompare(b.label));
    return out;
  }
  function getPlayerMeta() {
    return playerMeta;
  }
  function updateMeterContext(entities) {
    const observing = getObserving();
    const observingId = getObservingId();
    const nextMeta = {};
    const nextWatched = /* @__PURE__ */ new Set();
    const now = Date.now();
    if (inCombat && lastCombatAt && now - lastCombatAt > COMBAT_BREAK_MS) {
      endLive(now);
    }
    youId = observingId ? String(observingId) : "";
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
      if (live && live.actors[id]) {
        live.actors[id].name = nextMeta[id].name;
        live.actors[id].ctype = nextMeta[id].ctype;
        live.actors[id].partyKey = nextMeta[id].partyKey;
      }
    }
    visiblePlayerIds = nextVisible;
    playerMeta = nextMeta;
    sampleConditions(now);
  }
  function resetAllMeters() {
    live = null;
    past = [];
    history = [];
    lastHistoryAt = 0;
    lastCombatAt = 0;
    inCombat = false;
    clearRollingWindow();
    clearDeathRings();
    const oks = Object.keys(openConditions);
    for (let i = 0; i < oks.length; i++) delete openConditions[oks[i]];
    markMeterDirty();
  }
  function resetCurrentMeterSegment() {
    live = null;
    lastCombatAt = 0;
    inCombat = false;
    clearRollingWindow();
    markMeterDirty();
  }
  function resetOverallMeterSegments() {
    past = [];
    history = [];
    lastHistoryAt = 0;
    markMeterDirty();
  }
  function startMeterEngine() {
    attachRollingToEngine();
    if (!unsubDamage) unsubDamage = onDamage(onDamageEvent);
    if (!unsubKill2) unsubKill2 = onKill(onKillEvent);
    if (!unsubAction) unsubAction = onActionSubscribe(onActionEvent);
    return () => {
      if (unsubDamage) {
        unsubDamage();
        unsubDamage = null;
      }
      if (unsubKill2) {
        unsubKill2();
        unsubKill2 = null;
      }
      if (unsubAction) {
        unsubAction();
        unsubAction = null;
      }
    };
  }

  // src/kpi/sessionKills.ts
  var ATTRIBUTION_MS = 8e3;
  var NEAR_RANGE = 400;
  var mtypeCounts = {};
  var partyKillCounts = {};
  var mtypeTiming = {};
  var partyTiming = {};
  var lastSeen = /* @__PURE__ */ new Map();
  var blameByTarget = /* @__PURE__ */ new Map();
  var totalKills = 0;
  var sessionStartedAt = 0;
  var trackingId;
  var trackingName = "";
  var watchedPartyIds2 = /* @__PURE__ */ new Set();
  var watchedPartyKey2 = "";
  var playerParty = /* @__PURE__ */ new Map();
  var unsubKill3 = null;
  var unsubDmg = null;
  function soloKey2(id, name) {
    return `solo:${name || id}`;
  }
  function clearRecord(rec) {
    const keys = Object.keys(rec);
    for (let i = 0; i < keys.length; i++) delete rec[keys[i]];
  }
  function clearCounts() {
    clearRecord(mtypeCounts);
    clearRecord(partyKillCounts);
    clearRecord(mtypeTiming);
    clearRecord(partyTiming);
    totalKills = 0;
    sessionStartedAt = 0;
  }
  function noteTiming(rec, key, at) {
    const prev = rec[key];
    if (!prev) {
      rec[key] = { firstAt: at, lastAt: at };
      return;
    }
    prev.lastAt = at;
  }
  function ratePerMinute(count, startedAt, now) {
    if (!startedAt || count <= 0) return null;
    const elapsedSec = Math.max(now - startedAt, 1e3) / 1e3;
    return count / elapsedSec * 60;
  }
  function meanIntervalSec(timing, count) {
    if (!timing || count < 2) return null;
    return (timing.lastAt - timing.firstAt) / (count - 1) / 1e3;
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
      const row2 = blameByTarget.get(id);
      if (!row2 || row2.at < cutoff) blameByTarget.delete(id);
    }
  }
  function recordDamage(ev) {
    if (!ev.target || !ev.damage || ev.damage <= 0) return;
    if (!ev.actor) return;
    const now = ev.at;
    pruneBlame(now);
    let row2 = blameByTarget.get(ev.target);
    if (!row2) {
      row2 = { at: now, actors: /* @__PURE__ */ new Set() };
      blameByTarget.set(ev.target, row2);
    }
    row2.at = now;
    row2.actors.add(ev.actor);
    const seen = lastSeen.get(ev.target);
    if (seen == null ? void 0 : seen.mtype) row2.mtype = seen.mtype;
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
    } else if (!sessionStartedAt) {
      sessionStartedAt = ev.at;
    }
    const partyKey = attributionPartyKey(ev.id, ev.at);
    if (!partyKey) return;
    const mtype = ((_a = lastSeen.get(ev.id)) == null ? void 0 : _a.mtype) || ((_b = blameByTarget.get(ev.id)) == null ? void 0 : _b.mtype) || ((_c = getEntitiesRecord()[ev.id]) == null ? void 0 : _c.mtype);
    if (!mtype) return;
    mtypeCounts[mtype] = (mtypeCounts[mtype] || 0) + 1;
    partyKillCounts[partyKey] = (partyKillCounts[partyKey] || 0) + 1;
    noteTiming(mtypeTiming, mtype, ev.at);
    noteTiming(partyTiming, partyKey, ev.at);
    totalKills += 1;
    if (!sessionStartedAt) sessionStartedAt = ev.at;
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
      const row2 = {
        mtype: ent.mtype,
        nearAt: prev == null ? void 0 : prev.nearAt,
        nearPartyKey: prev == null ? void 0 : prev.nearPartyKey
      };
      if (observing) {
        const dist = simpleDistance(observing, ent);
        if (Number.isFinite(dist) && dist <= NEAR_RANGE) {
          row2.nearAt = now;
          row2.nearPartyKey = watchedPartyKey2 || soloKey2(observing.id, observing.name);
        }
      }
      if (ent.target) {
        const tid = String(ent.target);
        if (killScope() === "watched" && watchedPartyIds2.has(tid)) {
          row2.nearAt = now;
          row2.nearPartyKey = watchedPartyKey2;
        } else if (killScope() === "all" && playerParty.has(tid)) {
          row2.nearAt = now;
          row2.nearPartyKey = playerParty.get(tid);
        }
      }
      if (killScope() === "all") {
        for (let p = 0; p < entities.length; p++) {
          const pl = entities[p];
          if (!pl.player) continue;
          const dist = simpleDistance(pl, ent);
          if (Number.isFinite(dist) && dist <= NEAR_RANGE) {
            row2.nearAt = now;
            row2.nearPartyKey = pl.party || soloKey2(String(pl.id), pl.name);
            break;
          }
        }
      }
      lastSeen.set(id, row2);
      const blame = blameByTarget.get(id);
      if (blame) blame.mtype = ent.mtype;
    }
  }
  function startSessionKills() {
    if (!unsubKill3) unsubKill3 = onKill(handleKill2);
    if (!unsubDmg) unsubDmg = onDamage(recordDamage);
    return () => {
      if (unsubKill3) {
        unsubKill3();
        unsubKill3 = null;
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
    const now = Date.now();
    const byMtype = [];
    const keys = Object.keys(mtypeCounts);
    for (let i = 0; i < keys.length; i++) {
      const mtype = keys[i];
      const count = mtypeCounts[mtype];
      byMtype.push({
        mtype,
        count,
        killsPerMinute: ratePerMinute(count, sessionStartedAt, now),
        avgIntervalSec: meanIntervalSec(mtypeTiming[mtype], count)
      });
    }
    byMtype.sort((a, b) => b.count - a.count);
    const byParty = [];
    const pkeys = Object.keys(partyKillCounts);
    for (let i = 0; i < pkeys.length; i++) {
      const party = pkeys[i];
      const count = partyKillCounts[party];
      byParty.push({
        party,
        count,
        killsPerMinute: ratePerMinute(count, sessionStartedAt, now)
      });
    }
    byParty.sort((a, b) => b.count - a.count);
    const scope = killScope();
    const observingId = getObservingId();
    const hasObserver = observingId != null && observingId !== "";
    const active = scope === "all" || hasObserver;
    let killsPerMinute = null;
    let killsPerHour = null;
    let killsPerDay = null;
    if (sessionStartedAt && totalKills > 0) {
      const elapsedSec = Math.max(now - sessionStartedAt, 1e3) / 1e3;
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
      sessionStartedAt,
      killsPerMinute,
      killsPerHour,
      killsPerDay,
      active,
      scope
    };
  }

  // src/host/commander.ts
  var listeners3 = [];
  function subscribeCommanderOpen(fn) {
    listeners3.push(fn);
    return () => {
      const idx = listeners3.indexOf(fn);
      if (idx >= 0) listeners3.splice(idx, 1);
    };
  }
  function openCommander(draft) {
    const payload = {};
    if (typeof draft === "string") payload.draft = draft;
    for (let i = 0; i < listeners3.length; i++) {
      listeners3[i](payload);
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
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.head.append(style);
    }
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

/* Secondary control cluster \u2014 compact icon buttons */
.ecu-actions {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: stretch;
  justify-content: center;
  gap: 6px;
  padding: 4px 6px;
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
.ecu-btn-icon-only {
  min-width: 36px;
  width: 36px;
  height: 36px;
  min-height: 36px;
  padding: 0;
}
.ecu-btn-icon {
  display: block;
  width: 18px;
  height: 18px;
  pointer-events: none;
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
  font-size: 18px;
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
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  font-weight: 400 !important;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-shadow: none !important;
}
/* Off-realm hint \u2014 only when char.server !== current (stock orange accent) */
.ecu-char-server {
  flex: 0 0 auto;
  color: #f3a05d;
  font-size: 14px;
  font-weight: 400 !important;
  letter-spacing: 0.02em;
  text-shadow: none !important;
}
.ecu-empty {
  display: inline-flex;
  align-items: center;
  height: 100%;
  padding: 0 16px;
  color: rgba(255, 255, 255, 0.45);
  font-size: 16px;
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
  font-size: 16px;
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
  font-size: 14px;
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
  width: max(100%, 280px);
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
  gap: 10px;
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
  flex: 0 1 auto;
  min-width: 0;
  font-weight: 400 !important;
  text-shadow: none !important;
  white-space: nowrap;
}
.ecu-server-dd-option-events {
  flex: 1 1 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  min-width: 0;
}
.ecu-server-dd-event {
  flex: 0 0 auto;
  padding: 2px 6px;
  border: 1px solid rgba(133, 199, 107, 0.45);
  background: rgba(133, 199, 107, 0.12);
  color: #b6e3a4;
  font-size: 13px;
  line-height: 1.2;
  font-weight: 400 !important;
  text-shadow: none !important;
  white-space: nowrap;
  max-width: 7.5em;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ecu-server-dd-event.is-live {
  border-color: #85c76b;
  color: #b6e3a4;
}
.ecu-server-dd-event-more {
  border-color: rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.65);
  font-variant-numeric: tabular-nums;
}
.ecu-server-dd-option-players {
  flex: 0 0 auto;
  color: #85c76b;
  font-variant-numeric: tabular-nums;
  font-size: 16px;
  font-weight: 400 !important;
  text-shadow: none !important;
}
.ecu-server-dd-empty {
  padding: 14px;
  color: #888;
  font-size: 16px;
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
    font-size: 14px;
  }
  .ecu-btn-icon-only {
    min-width: 32px !important;
    width: 32px;
    height: 32px !important;
    min-height: 32px !important;
    padding: 0 !important;
  }
  .ecu-chrome {
    flex: 1 1 auto;
    min-width: 0;
  }
  .charactersui.charactersuic {
    max-width: min(62vw, 640px);
  }
}

/* Party roster: Buffs control overlays top-right \u2014 no flow space when hidden */
.ecu-roster {
  position: relative;
}
.ecu-roster-buffs {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 3;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.12s ease;
}
.ecu-roster:hover .ecu-roster-buffs,
.ecu-roster.is-layout-edit .ecu-roster-buffs,
#comm-ui.comm-ui-touch .ecu-roster-buffs,
#comm-ui[data-viewport="tablet"] .ecu-roster-buffs,
#comm-ui[data-viewport="phone"] .ecu-roster-buffs {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
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
  .ecu-btn-icon-only {
    min-width: 44px !important;
    width: 44px !important;
    height: 44px !important;
    min-height: 44px !important;
    padding: 0 !important;
  }
  .ecu-btn-icon {
    width: 22px;
    height: 22px;
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
/* Layout edit: click through panel content to reach overlapping drag chrome. */
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-panel-body,
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-panel-body *,
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-hidden-body,
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-hidden-body * {
  pointer-events: none;
}
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-edit-header,
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-edit-header *,
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-panel-close,
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-anchor-pad,
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-anchor-pad button {
  pointer-events: auto;
}
/* Layout edit: subtle hover highlight on interactive chrome (header / \xD7 / anchor). */
#comm-ui .comm-pos-panel.comm-pos-editing {
  transition: box-shadow 0.12s ease;
}
#comm-ui .comm-pos-panel.comm-pos-editing:has(
  .comm-pos-edit-header:hover,
  .comm-pos-edit-header:active,
  .comm-pos-panel-close:hover,
  .comm-pos-anchor-pad:hover
) {
  box-shadow:
    0 0 0 1px rgba(255, 224, 138, 0.48),
    0 0 14px rgba(255, 220, 100, 0.13);
}
#comm-ui .comm-pos-panel.comm-pos-editing.comm-pos-hidden:has(
  .comm-pos-edit-header:hover,
  .comm-pos-edit-header:active
) {
  box-shadow:
    0 0 0 1px rgba(170, 170, 170, 0.42),
    0 0 12px rgba(130, 130, 130, 0.1);
}
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-edit-header {
  transition: background 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease;
}
#comm-ui .comm-pos-panel.comm-pos-editing:not(.comm-pos-hidden) .comm-pos-edit-header:hover,
#comm-ui .comm-pos-panel.comm-pos-editing:not(.comm-pos-hidden) .comm-pos-edit-header:active {
  background: rgba(52, 48, 24, 0.96) !important;
  border-color: #bba86a !important;
  box-shadow: inset 0 1px 0 rgba(255, 245, 200, 0.08);
}
#comm-ui .comm-pos-panel.comm-pos-editing.comm-pos-hidden .comm-pos-edit-header:hover,
#comm-ui .comm-pos-panel.comm-pos-editing.comm-pos-hidden .comm-pos-edit-header:active {
  background: rgba(42, 42, 42, 0.96) !important;
  border-color: #888 !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-panel-close {
  transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-panel-close:hover {
  border-color: #baa !important;
  background: rgba(35, 32, 18, 0.95) !important;
  color: #ffe08a !important;
}
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-anchor-pad button {
  transition: background 0.12s ease, border-color 0.12s ease;
}
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-anchor-pad button:not([aria-pressed="true"]):hover {
  border-color: #998 !important;
  background: rgba(35, 32, 18, 0.95) !important;
  color: #ddd !important;
}
#comm-ui[data-viewport="phone"] .comm-pos-combat,
#comm-ui[data-viewport="phone"] .comm-pos-bag,
#comm-ui[data-viewport="phone"] .comm-pos-command {
  max-width: 96vw;
}

/* Thin dark scrollbars \u2014 #comm-ui panels + enhancer chrome outside it.
   Touch scrolling is unchanged (overflow / -webkit-overflow-scrolling stay). */
#comm-ui,
#comm-ui *,
.ecu-chrome-stack,
.ecu-chrome-stack *,
.charactersui.charactersuic,
.ecu-server-dd-menu,
#bottomleftcorner,
#ecu-buff-dialog,
#ecu-item-dialog,
#topleftcorner {
  scrollbar-width: thin;
  scrollbar-color: #7a7048 #161616;
}
#comm-ui::-webkit-scrollbar,
#comm-ui *::-webkit-scrollbar,
.ecu-chrome-stack::-webkit-scrollbar,
.ecu-chrome-stack *::-webkit-scrollbar,
.charactersui.charactersuic::-webkit-scrollbar,
.ecu-server-dd-menu::-webkit-scrollbar,
#bottomleftcorner::-webkit-scrollbar,
#ecu-buff-dialog::-webkit-scrollbar,
#ecu-item-dialog::-webkit-scrollbar,
#topleftcorner::-webkit-scrollbar {
  width: 7px;
  height: 7px;
}
#comm-ui::-webkit-scrollbar-track,
#comm-ui *::-webkit-scrollbar-track,
.ecu-chrome-stack::-webkit-scrollbar-track,
.ecu-chrome-stack *::-webkit-scrollbar-track,
.charactersui.charactersuic::-webkit-scrollbar-track,
.ecu-server-dd-menu::-webkit-scrollbar-track,
#bottomleftcorner::-webkit-scrollbar-track,
#ecu-buff-dialog::-webkit-scrollbar-track,
#ecu-item-dialog::-webkit-scrollbar-track,
#topleftcorner::-webkit-scrollbar-track {
  background: #161616;
  border-radius: 0;
}
#comm-ui::-webkit-scrollbar-thumb,
#comm-ui *::-webkit-scrollbar-thumb,
.ecu-chrome-stack::-webkit-scrollbar-thumb,
.ecu-chrome-stack *::-webkit-scrollbar-thumb,
.charactersui.charactersuic::-webkit-scrollbar-thumb,
.ecu-server-dd-menu::-webkit-scrollbar-thumb,
#bottomleftcorner::-webkit-scrollbar-thumb,
#ecu-buff-dialog::-webkit-scrollbar-thumb,
#ecu-item-dialog::-webkit-scrollbar-thumb,
#topleftcorner::-webkit-scrollbar-thumb {
  background: #6e6640;
  border: 1px solid #3a3828;
  border-radius: 0;
}
#comm-ui::-webkit-scrollbar-thumb:hover,
#comm-ui *::-webkit-scrollbar-thumb:hover,
.ecu-chrome-stack::-webkit-scrollbar-thumb:hover,
.ecu-chrome-stack *::-webkit-scrollbar-thumb:hover,
.charactersui.charactersuic::-webkit-scrollbar-thumb:hover,
.ecu-server-dd-menu::-webkit-scrollbar-thumb:hover,
#bottomleftcorner::-webkit-scrollbar-thumb:hover,
#ecu-buff-dialog::-webkit-scrollbar-thumb:hover,
#ecu-item-dialog::-webkit-scrollbar-thumb:hover,
#topleftcorner::-webkit-scrollbar-thumb:hover {
  background: #9a8840;
}
#comm-ui::-webkit-scrollbar-corner,
#comm-ui *::-webkit-scrollbar-corner,
.ecu-chrome-stack::-webkit-scrollbar-corner,
.ecu-chrome-stack *::-webkit-scrollbar-corner,
.charactersui.charactersuic::-webkit-scrollbar-corner,
.ecu-server-dd-menu::-webkit-scrollbar-corner,
#bottomleftcorner::-webkit-scrollbar-corner,
#ecu-buff-dialog::-webkit-scrollbar-corner,
#ecu-item-dialog::-webkit-scrollbar-corner,
#topleftcorner::-webkit-scrollbar-corner {
  background: #161616;
}
`;
    document.head.append(style);
  }

  // src/host/commChrome/chromeActions.ts
  function clearObserve() {
    if (typeof window.init_socket !== "function") return;
    window.init_socket({});
  }
  function currentServerKey2() {
    const region = window.server_region;
    const ident = window.server_identifier;
    if (!region || !ident) return "";
    const servers = window.X && window.X.servers || [];
    for (let i = 0; i < servers.length; i++) {
      const s = servers[i];
      if (s.region === region && s.name === ident) {
        return s.key != null ? String(s.key) : "";
      }
    }
    return "";
  }
  function isCharOnCurrentServer2(char) {
    const key = currentServerKey2();
    if (!key || char.server == null || char.server === "") return true;
    return String(char.server) === key;
  }
  function toggleObserve(name) {
    const n = String(name || "");
    if (!n) return;
    const obs = window.observing;
    if (obs && obs.name === n) {
      clearObserve();
      return;
    }
    const chars = window.X && window.X.characters || [];
    let ch = null;
    for (let i = 0; i < chars.length; i++) {
      if (chars[i].name === n) {
        ch = chars[i];
        break;
      }
    }
    if (typeof window.observe_character === "function") {
      const ok = window.observe_character(n);
      if (ok !== false) return;
    }
    if (!ch || !ch.secret || ch.server == null) return;
    const servers = window.X && window.X.servers || [];
    for (let j = 0; j < servers.length; j++) {
      const server = servers[j];
      if (server.key != null && String(server.key) === String(ch.server)) {
        if (!server.address) return;
        window.server_address = server.address;
        window.server_path = server.path;
        if (typeof window.init_socket === "function") {
          window.init_socket({ secret: ch.secret });
        }
        return;
      }
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
  var ACTION_ICONS = {
    follow: '<svg class="ecu-btn-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg>',
    bag: '<svg class="ecu-btn-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 8h12l1 12H5L6 8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter"/><path d="M9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    command: '<svg class="ecu-btn-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="4" width="18" height="16" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 9l3 3-3 3M12 15h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"/></svg>'
  };
  function buildActionsEl() {
    const actions = document.createElement("div");
    actions.className = "ecu-actions";
    actions.setAttribute("data-ecu-actions", "1");
    actions.setAttribute("data-ecu-tour", "chrome-actions");
    const mk = (kind, label, title, onClick) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ecu-btn ecu-btn-icon-only";
      btn.title = title;
      btn.setAttribute("aria-label", label);
      btn.setAttribute("data-ecu-tour", "btn-" + kind);
      btn.innerHTML = ACTION_ICONS[kind];
      btn.addEventListener("click", onClick);
      return btn;
    };
    actions.append(
      mk("follow", "Follow", "Center on observed character", onFollowClick),
      mk("bag", "Bag", "Observed inventory", onBagClick),
      mk(
        "command",
        "Command",
        "Send a command to the observed character",
        onCommandClick
      )
    );
    return actions;
  }
  function syncActionTourAttrs(actions) {
    const map = {
      Follow: "btn-follow",
      Bag: "btn-bag",
      Command: "btn-command"
    };
    const buttons = actions.querySelectorAll(".ecu-btn");
    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      const label = (btn.getAttribute("aria-label") || "").trim();
      const tourId = map[label];
      if (tourId) btn.setAttribute("data-ecu-tour", tourId);
    }
  }
  function syncActionsEnabled() {
    const watching = !!(window.observing && window.observing.name);
    const actions = document.querySelector(".ecu-actions");
    if (!actions) return;
    syncActionTourAttrs(actions);
    const buttons = actions.querySelectorAll(".ecu-btn");
    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      const label = (btn.getAttribute("aria-label") || btn.textContent || "").trim();
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
      if (charsEl) charsEl.setAttribute("data-ecu-tour", "character-ui");
      if (serversEl) serversEl.setAttribute("data-ecu-tour", "server-picker");
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
      } else if (!actionsEl.querySelector(".ecu-btn-icon-only")) {
        const next = buildActionsEl();
        actionsEl.replaceWith(next);
        actionsEl = next;
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
      chars.setAttribute("data-ecu-tour", "character-ui");
      chrome.append(chars);
    }
    if (servers) {
      servers.classList.remove("hidden");
      servers.style.display = "flex";
      servers.setAttribute("data-ecu-tour", "server-picker");
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
    const curKey = currentServerKey2();
    let key = "cur:" + curKey + "|";
    let listKey = "cur:" + curKey + "|";
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      key += c.name + " " + c.level + " " + c.server + " " + c.rip + " " + c.skin + " " + c.online + "|";
      listKey += c.name + " " + c.online + " " + c.server + "|";
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
      const serverLabel2 = typeof serverUi === "function" ? serverUi(char.server) : String(char.server || "");
      const offServer = !isCharOnCurrentServer2(char) && !!serverLabel2;
      const shortName = char.name.length <= 16 ? char.name : char.name.substr(0, 15) + "\u2026";
      const spriteHtml = typeof spriteFn === "function" ? spriteFn(char.skin || "", { cx: char.cx, rip: char.rip }) : "";
      const title = esc(char.name) + " \xB7 Lv." + esc(String((_a = char.level) != null ? _a : "")) + " \xB7 " + esc(serverLabel2) + (active ? " \xB7 Click again to stop observing" : "") + (offServer && !active ? " \xB7 Click to switch server & observe" : "");
      html += "<button type='button' class='ecu-char" + (active ? " is-active" : "") + (offServer ? " is-off-server" : "") + "' title='" + title + `' onclick='if(window.bc&&bc(this)) return; (window.__ecuToggleObserve||observe_character)("` + esc(char.name) + `");'>`;
      html += "<span class='ecu-char-sprite'>" + spriteHtml + "</span>";
      html += "<span class='ecu-char-meta'>";
      html += "<span class='ecu-char-name'>" + esc(shortName) + "</span>";
      html += "<span class='ecu-char-sub'>";
      html += "Lv." + esc(String((_b = char.level) != null ? _b : ""));
      if (offServer) {
        html += "<span class='ecu-char-server'>" + esc(serverLabel2) + "</span>";
      }
      html += "</span>";
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

  // src/host/commChrome/serverEvents.ts
  var ALDATA_BASE = "https://aldata.earthiverse.ca";
  var EVENT_MONSTER_TYPES = [
    "franky",
    "snowman",
    "icegolem",
    "grinch",
    "gooblob",
    "pinkgoo",
    "wabbit",
    "dragold",
    "tiger",
    "mrpumpkin",
    "mrgreen"
  ];
  var POLL_MS = 45e3;
  var LIVE_MAX_AGE_MS = 5 * 60 * 1e3;
  var MAX_BADGES = 3;
  var cache = {
    fetchedAt: 0,
    byServer: {},
    failed: false
  };
  var pollTimer2 = null;
  var inFlight = null;
  var onUpdate = null;
  var lastNotifyKey = "";
  function serverKey(region, name) {
    return String(region || "") + "|" + String(name || "");
  }
  function isLiveRow(row2, now) {
    if (row2.hp != null && Number.isFinite(Number(row2.hp))) {
      if (!row2.lastSeen) return true;
    }
    if (!row2.lastSeen) return false;
    const t = Date.parse(row2.lastSeen);
    if (!Number.isFinite(t)) return false;
    return now - t <= LIVE_MAX_AGE_MS;
  }
  function uniqueTypes(types) {
    const seen = {};
    const out = [];
    for (let i = 0; i < types.length; i++) {
      const t = types[i];
      if (!t || seen[t]) continue;
      seen[t] = true;
      out.push(t);
    }
    return out;
  }
  function liveTypesFromLocalS() {
    const S = window.S;
    if (!S || typeof S !== "object") return [];
    const keys = Object.keys(S);
    const out = [];
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key === "schedule") continue;
      const entry = S[key];
      if (entry && entry.live) out.push(key);
    }
    return out;
  }
  function buildByServer(rows) {
    const now = Date.now();
    const acc = {};
    for (let i = 0; i < rows.length; i++) {
      const row2 = rows[i];
      if (!row2 || !row2.type || !row2.serverRegion || !row2.serverIdentifier) continue;
      if (!isLiveRow(row2, now)) continue;
      const key = serverKey(row2.serverRegion, row2.serverIdentifier);
      if (!acc[key]) acc[key] = [];
      acc[key].push(row2.type);
    }
    const keys = Object.keys(acc);
    for (let i = 0; i < keys.length; i++) {
      acc[keys[i]] = uniqueTypes(acc[keys[i]]);
    }
    return acc;
  }
  async function fetchAlDataEvents() {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      try {
        const url = ALDATA_BASE + "/monsters/" + encodeURIComponent(EVENT_MONSTER_TYPES.join(","));
        const res = await fetch(url);
        if (!res.ok) throw new Error("ALData HTTP " + res.status);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("ALData bad payload");
        cache = {
          fetchedAt: Date.now(),
          byServer: buildByServer(data),
          failed: false
        };
      } catch (_err) {
        cache = {
          fetchedAt: Date.now(),
          byServer: cache.byServer,
          failed: true
        };
      } finally {
        inFlight = null;
        notifyIfChanged();
      }
    })();
    return inFlight;
  }
  function notifyIfChanged() {
    const key = eventsCacheFingerprint();
    if (key === lastNotifyKey) return;
    lastNotifyKey = key;
    if (onUpdate) onUpdate();
  }
  function eventsCacheFingerprint() {
    const parts = [];
    const keys = Object.keys(cache.byServer).sort();
    for (let i = 0; i < keys.length; i++) {
      parts.push(keys[i] + "=" + cache.byServer[keys[i]].join(","));
    }
    const region = window.server_region || "";
    const ident = window.server_identifier || "";
    if (region && ident) {
      parts.push("local:" + serverKey(region, ident) + "=" + liveTypesFromLocalS().join(","));
    }
    return parts.join("|");
  }
  function getServerEventBadges(region, name) {
    const key = serverKey(region, name);
    let types = cache.byServer[key] ? cache.byServer[key].slice() : [];
    if (region && name && window.server_region === region && window.server_identifier === name) {
      types = uniqueTypes(types.concat(liveTypesFromLocalS()));
    }
    const badges = [];
    for (let i = 0; i < types.length; i++) {
      badges.push({ type: types[i], live: true });
    }
    return badges;
  }
  function eventsBadgesHtml(badges) {
    if (!badges.length) return "";
    const shown = badges.slice(0, MAX_BADGES);
    const extra = badges.length - shown.length;
    let html = "<span class='ecu-server-dd-option-events'>";
    for (let i = 0; i < shown.length; i++) {
      const b = shown[i];
      html += "<span class='ecu-server-dd-event" + (b.live ? " is-live" : "") + "' title='" + esc(b.type + (b.live ? " live" : "")) + "'>" + esc(b.type) + "</span>";
    }
    if (extra > 0) {
      html += "<span class='ecu-server-dd-event ecu-server-dd-event-more' title='" + esc(
        badges.slice(MAX_BADGES).map((b) => b.type).join(", ")
      ) + "'>+" + extra + "</span>";
    }
    html += "</span>";
    return html;
  }
  function syncServerEventBadges() {
    const servers = window.X && window.X.servers || [];
    const opts = document.querySelectorAll(".ecu-server-dd-option");
    for (let i = 0; i < opts.length && i < servers.length; i++) {
      const server = servers[i];
      const badges = getServerEventBadges(server.region, server.name);
      const html = eventsBadgesHtml(badges);
      const existing = opts[i].querySelector(".ecu-server-dd-option-events");
      if (!html) {
        if (existing) existing.remove();
        continue;
      }
      const wrap = document.createElement("div");
      wrap.innerHTML = html;
      const next = wrap.firstElementChild;
      if (!next) continue;
      if (existing) existing.replaceWith(next);
      else {
        const nameEl = opts[i].querySelector(".ecu-server-dd-option-name");
        if (nameEl && nameEl.parentElement === opts[i]) {
          const players = opts[i].querySelector(".ecu-server-dd-option-players");
          if (players) opts[i].insertBefore(next, players);
          else opts[i].append(next);
        } else {
          opts[i].append(next);
        }
      }
    }
  }
  function ensureServerEventsPolling(cb) {
    if (cb) onUpdate = cb;
    if (pollTimer2 != null) return;
    void fetchAlDataEvents();
    pollTimer2 = setInterval(() => {
      void fetchAlDataEvents();
    }, POLL_MS);
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
    ensureServerEventsPolling(() => {
      slCache = "-1";
      renderServersHud();
    });
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
    key += "|ev:" + eventsCacheFingerprint();
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
      syncServerEventBadges();
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
        const eventBadges = getServerEventBadges(server.region, server.name);
        menuHtml += "<button type='button' class='ecu-server-dd-option" + (i === currentIndex ? " is-active" : "") + "' data-server-index='" + i + "'>";
        menuHtml += "<span class='ecu-server-dd-option-name'>" + esc(server.region + " " + server.name) + "</span>";
        menuHtml += eventsBadgesHtml(eventBadges);
        menuHtml += "<span class='ecu-server-dd-option-players' title='" + esc(playersTitle) + "'>" + esc(String(server.players)) + "</span>";
        menuHtml += "</button>";
      }
    }
    const html = "<div class='ecu-server-dd" + (wasOpen ? " is-open" : "") + "' data-ecu-tour='server-picker-dd' aria-expanded='" + (wasOpen ? "true" : "false") + "'><button type='button' class='ecu-server-dd-trigger' aria-haspopup='listbox'><span class='ecu-server-dd-meta'><span class='ecu-server-dd-name'>" + esc(triggerName) + "</span><span class='ecu-server-dd-sub' title='" + esc(triggerPlayersTitle) + "'>" + esc(triggerPlayers !== "" ? triggerPlayers : "\u2014") + "</span></span>" + pingBlockHtml(pingSamples) + "<span class='ecu-server-dd-chevron' aria-hidden='true'></span></button><div class='ecu-server-dd-menu' role='listbox'>" + menuHtml + "</div></div>";
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

  // src/host/infoDialog/bindings.ts
  var openItemFn = null;
  var openConditionFn = null;
  function bindOpenHandlers(openItem2, openCondition2) {
    openItemFn = openItem2;
    openConditionFn = openCondition2;
  }
  function callOpenItem(entity, slotName, slotOverride) {
    if (openItemFn) openItemFn(entity, slotName, slotOverride);
  }
  function callOpenCondition(entity, conditionName) {
    if (openConditionFn) openConditionFn(entity, conditionName);
  }

  // src/host/infoDialog/types.ts
  var BUFF_DIALOG_ID = "ecu-buff-dialog";
  var ITEM_DIALOG_ID = "ecu-item-dialog";
  var STOCK_DIALOG_ID = "topleftcornerdialog";
  var INFO_SOURCE_ATTR = "data-ecu-info-source";
  var CLOSE_CLASS = "ecu-dialog-close";
  var ADOPTED_CLASS = "ecu-info-dialog-adopted";
  var BUFF_SEL = "#" + BUFF_DIALOG_ID;
  var ITEM_SEL = "#" + ITEM_DIALOG_ID;
  var STOCK_SEL = "#" + STOCK_DIALOG_ID;
  function dialogIdFor(kind) {
    return kind === "buff" ? BUFF_DIALOG_ID : ITEM_DIALOG_ID;
  }
  function panelAttrFor(kind) {
    return kind === "buff" ? "buffInfo" : "itemInfo";
  }

  // src/host/infoDialog/css.ts
  var STYLE_ID2 = "comm-ui-dialog-host-css";
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
/* Stub: leftover stock selectors still target this id; content lives in ecu-* hosts. */
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

  // src/host/infoDialog/hosts.ts
  function dialogEl(kind) {
    return document.getElementById(dialogIdFor(kind));
  }
  function hasContent(el) {
    return !!(el && String(el.innerHTML || "").trim());
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
    return dialog;
  }
  function ensureAdoptedHost(kind) {
    const { buff, item } = ensureDialogElements();
    const slotSel = kind === "item" ? ".comm-item-info-slot" : ".comm-buff-info-slot";
    const slot = document.querySelector(slotSel);
    if (slot) return adoptInfoDialog(kind, slot);
    return kind === "buff" ? buff : item;
  }

  // src/host/infoDialog/write.ts
  var listeners4 = /* @__PURE__ */ new Set();
  var pendingWriteKind = "item";
  function setPendingWriteKind(kind) {
    pendingWriteKind = kind;
  }
  function getPendingWriteKind() {
    return pendingWriteKind;
  }
  function subscribeInfoDialogChange(listener) {
    listeners4.add(listener);
    return () => {
      listeners4.delete(listener);
    };
  }
  function emitInfoDialogChange(kind, open) {
    for (const listener of Array.from(listeners4)) {
      try {
        listener(kind, open);
      } catch (e2) {
      }
    }
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
  function ensureCloseButton(dialog, kind, closeFn) {
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
      closeFn(kind);
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
  var FN_ORIG = "__ecuInfoOrig";
  function buildItemHtml(args) {
    const w = window;
    const renderItem = typeof w.render_item === "function" && w.render_item[FN_ORIG] || w.render_item;
    if (typeof renderItem !== "function") return "";
    try {
      const html = renderItem.call(w, "html", args);
      return typeof html === "string" ? html : "";
    } catch (e2) {
      return "";
    }
  }
  function buildConditionHtml(name) {
    const w = window;
    const G = w.G;
    if (!G || !G.conditions) return "";
    let def = G.conditions[name];
    let minutes = 0;
    let condition;
    const target = w.xtarget || w.ctarget;
    if (target && target.s && target.s[name] && target.s[name].ms) {
      minutes = target.s[name].ms / 6e3 / 10;
    }
    if (target && target.s && target.s[name]) {
      const clone = typeof w.clone === "function" ? w.clone : null;
      def = !def ? {} : clone ? clone(def) : { ...def };
      condition = target.s[name];
      const keys = Object.keys(condition);
      for (let i = 0; i < keys.length; i++) {
        def[keys[i]] = condition[keys[i]];
      }
    }
    return buildItemHtml({
      skin: condition && condition.skin || def && def.skin,
      item: def,
      prop: def,
      minutes,
      condition
    });
  }
  var closeKindImpl = () => false;
  function bindCloseImpl(fn) {
    closeKindImpl = fn;
  }
  function writeInfoHtml(kind, html) {
    const host2 = ensureAdoptedHost(kind);
    host2.innerHTML = html || "";
    if (hasContent(host2)) {
      ensureCloseButton(host2, kind, (k) => {
        closeKindImpl(k);
      });
    }
    emitInfoDialogChange(kind, hasContent(host2));
  }
  function clearInfoHost(kind) {
    const el = dialogEl(kind);
    if (!hasContent(el)) return false;
    el.innerHTML = "";
    if (kind === "buff") clearDialogOnlyXTarget();
    clearDialogsTarget();
    emitInfoDialogChange(kind, false);
    return true;
  }

  // src/host/infoDialog/dismiss.ts
  var BOUND = "__ecuDialogDismissBound";
  var layoutEditing = false;
  function setInfoDialogLayoutEditing(editing) {
    layoutEditing = !!editing;
  }
  function isOpen(kind) {
    return hasContent(dialogEl(kind));
  }
  function isInfoDialogChrome(el) {
    if (!el.closest) return false;
    return !!(el.closest("#" + BUFF_DIALOG_ID) || el.closest("#" + ITEM_DIALOG_ID) || el.closest('[data-panel="buffInfo"]') || el.closest('[data-panel="itemInfo"]'));
  }
  function isInfoSource(el) {
    if (!el.closest) return false;
    return !!el.closest("[" + INFO_SOURCE_ATTR + "]");
  }
  function installDialogDismiss() {
    if (window[BOUND]) return;
    window[BOUND] = true;
    document.addEventListener(
      "pointerdown",
      (ev) => {
        if (layoutEditing) return;
        if (!isOpen("buff") && !isOpen("item")) return;
        const t = ev.target;
        if (!t) return;
        const el = t;
        if (isInfoDialogChrome(el) || isInfoSource(el)) return;
        clearInfoHost("buff");
        clearInfoHost("item");
      },
      true
    );
  }

  // src/host/infoDialog/patches.ts
  var PATCHED = "__ecuDialogRendersPatched";
  var FN_MARK = "__ecuInfoPatched";
  var FN_ORIG2 = "__ecuInfoOrig";
  function markPatched(patched, orig) {
    patched[FN_MARK] = true;
    patched[FN_ORIG2] = orig;
    return patched;
  }
  function isOurPatch(fn) {
    return !!(fn && fn[FN_MARK]);
  }
  function isStockOrEcuSelector(selector) {
    return selector === STOCK_SEL || selector === STOCK_DIALOG_ID || selector === BUFF_SEL || selector === ITEM_SEL || selector === "#" + STOCK_DIALOG_ID;
  }
  function kindFromSelector(selector) {
    if (selector === BUFF_SEL) return "buff";
    if (selector === ITEM_SEL) return "item";
    return getPendingWriteKind();
  }
  function installRenderPatches() {
    const w = window;
    const done = w[PATCHED] || (w[PATCHED] = {});
    if (typeof w.render_condition === "function" && !isOurPatch(w.render_condition)) {
      const orig = w.render_condition[FN_ORIG2] || w.render_condition;
      w.render_condition = markPatched(function(selector, name) {
        setPendingWriteKind("buff");
        return orig.call(this, selector, name);
      }, orig);
      done.condition = true;
    }
    if (typeof w.render_skill === "function" && !isOurPatch(w.render_skill)) {
      const orig = w.render_skill[FN_ORIG2] || w.render_skill;
      w.render_skill = markPatched(function(selector, skill, args) {
        setPendingWriteKind("buff");
        return orig.call(this, selector, skill, args);
      }, orig);
      done.skill = true;
    }
    if (typeof w.render_item === "function" && !isOurPatch(w.render_item)) {
      const orig = w.render_item[FN_ORIG2] || w.render_item;
      w.render_item = markPatched(function(selector, args) {
        if (selector === "html") {
          return orig.call(this, "html", args);
        }
        if (isStockOrEcuSelector(selector)) {
          const kind = kindFromSelector(selector);
          setPendingWriteKind(kind);
          const html = orig.call(this, "html", args);
          if (typeof html === "string") writeInfoHtml(kind, html);
          return html;
        }
        return orig.call(this, selector, args);
      }, orig);
      done.item = true;
    }
    if (typeof w.slot_click === "function" && !isOurPatch(w.slot_click)) {
      const origSlot = w.slot_click[FN_ORIG2] || w.slot_click;
      w.slot_click = markPatched(function(name) {
        const target = w.xtarget || w.ctarget;
        if (target) callOpenItem(target, name);
      }, origSlot);
      done.slot = true;
    }
    if (typeof w.condition_click === "function" && !isOurPatch(w.condition_click)) {
      const origCond = w.condition_click[FN_ORIG2] || w.condition_click;
      w.condition_click = markPatched(function(name) {
        const target = w.xtarget || w.ctarget;
        if (target) callOpenCondition(target, name);
        else origCond.call(this, name);
      }, origCond);
      done.conditionClick = true;
    }
  }
  function installInfoDialogLifecycle() {
    ensureDialogElements();
    installRenderPatches();
    installDialogDismiss();
    if (!window.__ecuDialogPatchRetry) {
      window.__ecuDialogPatchRetry = true;
      let tries = 0;
      const timer = window.setInterval(() => {
        tries += 1;
        installRenderPatches();
        const w = window;
        const ready = isOurPatch(w.render_condition) && isOurPatch(w.render_item) && isOurPatch(w.slot_click) && isOurPatch(w.render_skill);
        if (ready || tries >= 80) {
          window.clearInterval(timer);
        }
      }, 250);
    }
  }

  // src/host/infoDialog/api.ts
  var lastConditionId = "";
  var lastSlotName = "";
  function resolvePaperdollEntity(entity) {
    if (!entity) return entity;
    const id = entity.id;
    if (id == null || id === "") return entity;
    const tid = String(id);
    const raw = window.entities;
    if (!raw) return entity;
    if (!Array.isArray(raw)) {
      const byKey = raw[tid] || raw[id];
      if (byKey && byKey.slots) return byKey;
    }
    const list = Array.isArray(raw) ? raw : Object.values(raw);
    for (let i = 0; i < list.length; i++) {
      const ent = list[i];
      if (ent && String(ent.id) === tid && ent.slots) return ent;
    }
    return entity;
  }
  function setDialogOnlyXTarget(entity) {
    window.xtarget = entity || null;
    window.__ecuDialogOnlyXTarget = !!entity;
  }
  function setSelectionXTarget(entity) {
    window.xtarget = entity || null;
    window.__ecuDialogOnlyXTarget = false;
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
  function closeBuffDialog() {
    lastConditionId = "";
    return clearInfoHost("buff");
  }
  function closeItemDialog() {
    lastSlotName = "";
    return clearInfoHost("item");
  }
  function closeInfo(kind) {
    if (kind === "buff") return closeBuffDialog();
    if (kind === "item") return closeItemDialog();
    if (closeBuffDialog()) return true;
    return closeItemDialog();
  }
  function closeTopLeftDialog() {
    return closeInfo();
  }
  function closeAllInfoDialogs() {
    const a = closeBuffDialog();
    const b = closeItemDialog();
    return a || b;
  }
  bindCloseImpl((kind) => closeInfo(kind));
  function openItem(entity, slotName, slotOverride, opts) {
    if (!entity || !slotName) return;
    installInfoDialogLifecycle();
    const target = resolvePaperdollEntity(entity);
    const slot = slotOverride && slotOverride.name ? slotOverride : target && target.slots && target.slots[slotName];
    if (!slot || !slot.name) return;
    const w = window;
    const itemHost = ensureAdoptedHost("item");
    if (lastSlotName === slotName && String(itemHost.innerHTML || "").trim()) {
      closeItemDialog();
      w.last_sclick = "";
      return;
    }
    const G = w.G;
    const def = G && G.items && G.items[slot.name];
    if (!def) return;
    setPendingWriteKind("item");
    lastSlotName = slotName;
    w.last_sclick = slotName;
    w.dialogs_target = target;
    if (opts && opts.dialogOnly) {
      setDialogOnlyXTarget(target);
    } else {
      setSelectionXTarget(target);
    }
    const html = buildItemHtml({
      id: "item" + slotName,
      item: def,
      name: slot.name,
      actual: slot,
      slot: slotName,
      from_player: target.id
    });
    writeInfoHtml("item", html);
  }
  function openCondition(entity, conditionName) {
    if (!entity || !conditionName) return;
    installInfoDialogLifecycle();
    const host2 = ensureAdoptedHost("buff");
    if (lastConditionId === conditionName && hasContent(host2)) {
      closeBuffDialog();
      return;
    }
    const w = window;
    setPendingWriteKind("buff");
    lastConditionId = conditionName;
    w.dialogs_target = entity;
    setDialogOnlyXTarget(entity);
    const html = buildConditionHtml(conditionName);
    writeInfoHtml("buff", html);
  }
  bindOpenHandlers(openItem, openCondition);
  function adoptInfoDialog2(kind, slot) {
    installInfoDialogLifecycle();
    return adoptInfoDialog(kind, slot);
  }
  function ensureDialogHost() {
    ensureDialogElements();
    installInfoDialogLifecycle();
    installRenderPatches();
    installDialogDismiss();
  }
  var info = {
    openItem,
    openBuff: openCondition,
    openCondition,
    close: closeInfo,
    closeAll: closeAllInfoDialogs,
    isOpen: (kind) => {
      if (kind === "buff") return isBuffDialogOpen();
      if (kind === "item") return isItemDialogOpen();
      return isTopLeftDialogOpen();
    },
    adopt: adoptInfoDialog2,
    ensure: ensureDialogHost,
    subscribe: subscribeInfoDialogChange,
    setLayoutEditing: setInfoDialogLayoutEditing,
    sourceAttr: INFO_SOURCE_ATTR
  };

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
        if (h.exitLayoutEdit && h.exitLayoutEdit()) return;
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
    let lastServer = "";
    let lastPingAt = 0;
    let lastEventsFp = "";
    const unsubTick = subscribeTick((snap) => {
      const name = snap.observing && snap.observing.name || window.observing && window.observing.name || "";
      const server = (snap.serverRegion || "") + " " + (snap.serverIdentifier || "");
      if (name !== lastObs || server !== lastServer) {
        lastObs = name;
        lastServer = server;
        invalidateCharacterCache();
        renderCharactersHud();
      } else {
        syncActionsEnabled();
      }
      if (snap.now - lastPingAt >= 1e3) {
        lastPingAt = snap.now;
        syncServerPingHud();
        const evFp = eventsCacheFingerprint();
        if (evFp !== lastEventsFp) {
          lastEventsFp = evFp;
          renderServersHud();
        }
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
  var BAG_SYNC_STAMP_KEY = "__ecuBagSyncedAt";
  var listeners5 = [];
  var syncListeners = [];
  var bagSyncedAt = null;
  var bagSyncedForName = null;
  var bagRenderedForName = null;
  var bagRefreshing = false;
  var refreshPendingName = null;
  var refreshPollTimer = null;
  var bagSyncSocketId = null;
  var bagSyncSocketPoll = null;
  var bagRefreshKind = null;
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
    for (let i = 0; i < listeners5.length; i++) {
      try {
        listeners5[i](open);
      } catch (e2) {
      }
    }
  }
  function notifyBagSync() {
    for (let i = 0; i < syncListeners.length; i++) {
      try {
        syncListeners[i]();
      } catch (e2) {
      }
    }
  }
  function observingSnapshotName(obs = window.observing) {
    if (!obs || obs.name == null) return null;
    return String(obs.name);
  }
  function hasItemsSnapshot(obs = window.observing) {
    return !!(obs && Array.isArray(obs.items));
  }
  function setBagSyncedAt(ts, name) {
    bagSyncedAt = ts;
    if (ts == null) bagSyncedForName = null;
    else if (name !== void 0) bagSyncedForName = name;
    notifyBagSync();
  }
  function setBagRefreshing(next) {
    if (bagRefreshing === next) return;
    bagRefreshing = next;
    notifyBagSync();
  }
  function clearRefreshPoll() {
    if (refreshPollTimer != null) {
      window.clearInterval(refreshPollTimer);
      refreshPollTimer = null;
    }
  }
  function onObserveWelcome(data) {
    if (data && data.character) {
      const ts = Date.now();
      data.character[BAG_SYNC_STAMP_KEY] = ts;
      const name = data.character.name != null ? String(data.character.name) : null;
      setBagSyncedAt(ts, name);
      return;
    }
    if (bagSyncedAt != null) setBagSyncedAt(null);
  }
  function backfillBagSyncedAt() {
    if (bagSyncedAt != null) return;
    const obs = window.observing;
    if (!hasItemsSnapshot(obs)) return;
    stampBagSyncedFromObserving(obs);
  }
  function syncBagStateForSocket() {
    const socket = window.socket;
    if (!socket || !socket.id || typeof socket.on !== "function") return;
    const socketChanged = socket.id !== bagSyncSocketId;
    if (socketChanged) {
      bagSyncSocketId = socket.id;
      socket.on("welcome", onObserveWelcome);
    }
    const obs = window.observing;
    if (hasItemsSnapshot(obs)) {
      if (socketChanged || bagSyncedAt == null) {
        stampBagSyncedFromObserving(obs);
      }
      const name = observingSnapshotName(obs);
      if (window.inventory && name != null && name !== bagRenderedForName) {
        reRenderLocalSnapshot();
      }
    } else if (socketChanged && bagSyncedAt != null) {
      setBagSyncedAt(null);
    }
  }
  function installBagSyncSocketWatch() {
    syncBagStateForSocket();
    if (bagSyncSocketPoll != null) return;
    bagSyncSocketPoll = window.setInterval(syncBagStateForSocket, 500);
  }
  function subscribeInventory(listener) {
    listeners5.push(listener);
    return () => {
      const idx = listeners5.indexOf(listener);
      if (idx >= 0) listeners5.splice(idx, 1);
    };
  }
  function subscribeBagSync(listener) {
    syncListeners.push(listener);
    return () => {
      const idx = syncListeners.indexOf(listener);
      if (idx >= 0) syncListeners.splice(idx, 1);
    };
  }
  function isInventoryOpen() {
    return !!window.inventory;
  }
  function getBagSyncedAt() {
    return bagSyncedAt;
  }
  function getBagSyncedName() {
    return bagSyncedForName;
  }
  function isBagGridStale() {
    if (!window.inventory) return false;
    const name = observingSnapshotName();
    if (!name || bagRenderedForName == null) return false;
    return name !== bagRenderedForName;
  }
  function isBagRefreshing() {
    return bagRefreshing;
  }
  function getBagRefreshKind() {
    return bagRefreshKind;
  }
  function hasObservingInventorySnapshot() {
    return hasItemsSnapshot();
  }
  function stampBagSyncedFromObserving(obs) {
    if (!obs) return;
    const name = observingSnapshotName(obs);
    const stamped = obs[BAG_SYNC_STAMP_KEY];
    if (typeof stamped === "number" && stamped > 0) {
      setBagSyncedAt(stamped, name);
      return;
    }
    const ts = Date.now();
    obs[BAG_SYNC_STAMP_KEY] = ts;
    setBagSyncedAt(ts, name);
  }
  function findObserveSecret(name) {
    const chars = window.X && window.X.characters || [];
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      if (ch && ch.name === name && ch.secret) return String(ch.secret);
    }
    return null;
  }
  function closeInventory() {
    closeInventoryHost();
  }
  function closeInventoryHost() {
    const host2 = document.getElementById(HOST_ID);
    if (host2) host2.innerHTML = "";
    window.inventory = false;
    bagRenderedForName = null;
    restoreCharacter();
    notifyInventory(false);
    notifyBagSync();
  }
  function reRenderLocalSnapshot() {
    bagRefreshKind = "local";
    callThroughDraw(() => {
      if (typeof window.render_inventory !== "function") return;
      if (window.inventory) {
        window.render_inventory(true);
        bagRenderedForName = observingSnapshotName();
        notifyBagSync();
      } else {
        window.render_inventory();
      }
    });
  }
  function refreshObservedInventory() {
    const obs = window.observing;
    const name = obs && obs.name != null ? String(obs.name) : "";
    const secret = name ? findObserveSecret(name) : null;
    if (!name || !secret || typeof window.init_socket !== "function") {
      reRenderLocalSnapshot();
      return;
    }
    clearRefreshPoll();
    bagRefreshKind = null;
    refreshPendingName = name;
    setBagRefreshing(true);
    if (window.inventory) closeInventoryHost();
    saveSettings({ bagOpenPreferred: true });
    const initSocket = window.init_socket;
    if (typeof initSocket !== "function") {
      setBagRefreshing(false);
      refreshPendingName = null;
      reRenderLocalSnapshot();
      return;
    }
    initSocket({ secret });
    let attempts = 0;
    refreshPollTimer = window.setInterval(() => {
      attempts += 1;
      const next = window.observing;
      if (next && next.name === refreshPendingName && next.items) {
        clearRefreshPoll();
        bagRefreshKind = "server";
        refreshPendingName = null;
        backfillBagSyncedAt();
        if (bagSyncedAt == null) stampBagSyncedFromObserving(next);
        openInventory();
        setBagRefreshing(false);
        return;
      }
      if (attempts > 40) {
        clearRefreshPoll();
        refreshPendingName = null;
        if (window.observing) {
          bagRefreshKind = "server";
          backfillBagSyncedAt();
          if (bagSyncedAt == null) stampBagSyncedFromObserving(window.observing);
          openInventory();
        } else {
          bagRefreshKind = "local";
        }
        setBagRefreshing(false);
      }
    }, 250);
  }
  function applyBagLayoutPos(pos) {
    const host2 = document.getElementById(HOST_ID);
    if (!host2) return;
    if (host2.parentElement && host2.parentElement.id === MOUNT_ID) {
      host2.style.position = "relative";
      host2.style.left = "";
      host2.style.top = "";
      host2.style.transform = "";
      host2.style.zIndex = "";
      return;
    }
    const layout = mergeLayout(getSettings().panelLayout);
    const p = pos || layout.bag;
    const style = panelStyle(p, false);
    host2.style.position = "fixed";
    host2.style.left = String(style.left);
    host2.style.top = String(style.top);
    host2.style.transform = String(style.transform);
    host2.style.zIndex = "240";
    host2.style.pointerEvents = "auto";
    host2.style.maxWidth = "min(96vw, 420px)";
    host2.style.maxHeight = "min(70vh, calc(100vh - 72px))";
    host2.style.overflow = "auto";
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
    const host2 = ensureInventoryHost();
    if (host2.parentElement !== mount) {
      mount.append(host2);
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
  function installInventoryClickBridge() {
    if (window.__ecuInvClickPatched) return;
    const tryPatch = () => {
      const original = window.inventory_click;
      if (typeof original !== "function") return false;
      if (window.__ecuInvClickPatched) return true;
      window.__ecuInvClickPatched = true;
      window.inventory_click = function patchedInventoryClick(num, event) {
        if (window.is_comm) {
          if (event && typeof window.stpr === "function") window.stpr(event);
          const obs = window.observing;
          const item = obs && Array.isArray(obs.items) ? obs.items[num] : null;
          if (!item || !item.name || item.name === "placeholder") return;
          openItem(obs, `inv${num}`, item, { dialogOnly: true });
          return;
        }
        return original.call(this, num, event);
      };
      return true;
    };
    if (tryPatch()) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (tryPatch() || attempts > 40) window.clearInterval(timer);
    }, 250);
  }
  function installInventoryFix() {
    installInventoryClickBridge();
    installBagSyncSocketWatch();
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
          const host2 = document.getElementById(HOST_ID);
          if (host2) host2.innerHTML = "";
          window.inventory = false;
          bagRenderedForName = null;
          restoreCharacter();
          notifyInventory(false);
          notifyBagSync();
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
            bagRenderedForName = observingSnapshotName();
            backfillBagSyncedAt();
            applyBagLayoutPos();
            notifyInventory(true);
            notifyBagSync();
          } else if (!window.inventory) {
            bagRenderedForName = null;
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
  if (typeof window !== "undefined") {
    installBagSyncSocketWatch();
  }

  // src/host/pageTitle.ts
  var BRAND = "Adventure Land";
  var installed = false;
  var lastTitle = null;
  function serverLabel() {
    const region = getServerRegion() || "";
    const ident = getServerIdentifier() || "";
    return `${region} ${ident}`.trim();
  }
  function formatCommPageTitle() {
    const parts = [];
    const obs = getObserving();
    const name = obs && obs.name != null ? String(obs.name) : "";
    if (name) {
      const dead = !!(obs && obs.dead);
      parts.push(dead ? `${name} (RIP)` : name);
    } else {
      parts.push("Comm");
    }
    const map = getMapName();
    if (map) parts.push(map);
    const server = serverLabel();
    if (server) parts.push(server);
    return `${parts.join(" \xB7 ")} | ${BRAND}`;
  }
  function applyPageTitle() {
    const next = formatCommPageTitle();
    if (next === lastTitle) return;
    lastTitle = next;
    if (document.title !== next) document.title = next;
  }
  function installPageTitle() {
    if (installed) return;
    installed = true;
    applyPageTitle();
    subscribeTick(() => applyPageTitle());
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
  function isFocusablePlayer(entity) {
    return !!(entity && entity.player && entity.type === "character");
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

  // src/queries/combatSignals.ts
  function combatSignals(entities) {
    const hasEnemies = aggroedMonsters(entities).length > 0;
    const hasThreat = Object.keys(aggroByTarget(entities)).length > 0;
    const hasBosses = activeBosses(entities).length > 0;
    return {
      hasEnemies,
      hasThreat,
      hasBosses,
      inCombat: hasEnemies || hasThreat || hasBosses
    };
  }

  // src/lib/typeScale.ts
  var TYPE = {
    /** Party chip / compact names */
    name: "16px",
    /** Unit-frame / threat / aggro bar names */
    nameLg: "18px",
    /** General body / panel content */
    body: "15px",
    /** Secondary chrome / meta labels */
    secondary: "14px",
    /** Absolute floor for secondary text */
    secondaryMin: "13px",
    /** Counts, ×N, overflow +N */
    count: "16px",
    /** Badge digits (aggro, threat spark, stacks) */
    badge: "15px",
    /** Alias — prefer TYPE.badge */
    countBadge: "15px",
    /** Compact chrome labels (gear TRADE, layout hints) */
    micro: "13px",
    /** Absolute floor — never go below for readable UI text */
    microMin: "13px",
    /** Panel titles */
    title: "17px",
    /** topCenter map/server body */
    chrome: "16px",
    /** topCenter secondary line (time / until) */
    chromeMeta: "14px"
  };
  var AGGRO_BADGE = {
    minWidth: "22px",
    height: "22px",
    fontSize: TYPE.badge,
    padX: "5px"
  };
  var PIXEL_TEXT = {
    fontWeight: "normal",
    textShadow: "none"
  };

  // src/ui/frames/comm/commSetupWizardCss.ts
  var injected = false;
  var CSS2 = `
.ecu-comm-wiz-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483003;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}
.ecu-comm-wiz {
  min-width: min(520px, 94vw);
  max-width: 560px;
  padding: 22px 24px 18px;
  background: linear-gradient(180deg, #1a171b 0%, #0e0c10 100%);
  border: 1px solid rgba(0, 0, 0, 0.85);
  outline: 1px solid rgba(232, 201, 106, 0.35);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.7);
  color: #eee;
  font-size: 17px;
}
.ecu-comm-wiz-logo {
  font-size: 28px;
  font-weight: normal;
  color: #ffd28a;
  letter-spacing: 0.02em;
  margin-bottom: 12px;
  text-shadow: none;
}
.ecu-comm-wiz h3 {
  margin: 0 0 10px;
  font-size: 20px;
  color: #fff;
  font-weight: normal;
}
.ecu-comm-wiz p {
  margin: 0 0 16px;
  color: rgba(220, 210, 210, 0.88);
  font-size: 17px;
  line-height: 1.5;
}
.ecu-comm-wiz-list {
  margin: 0 0 16px;
  padding-left: 20px;
  color: rgba(220, 210, 210, 0.88);
  font-size: 17px;
  line-height: 1.55;
}
.ecu-comm-wiz-list li {
  margin-bottom: 6px;
}
.ecu-comm-wiz-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 6px;
}
.ecu-comm-wiz-grid label {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #ddd;
  font-size: 17px;
  cursor: pointer;
}
.ecu-comm-wiz-grid label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
.ecu-comm-wiz-btn {
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: #eee;
  padding: 10px 18px;
  font-size: 17px;
  font-weight: normal;
  border-radius: 2px;
  align-self: flex-start;
}
.ecu-comm-wiz-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}
.ecu-comm-wiz-btn.primary {
  color: #ffd28a;
  border-color: rgba(232, 201, 106, 0.45);
  background: rgba(232, 201, 106, 0.12);
}
.ecu-comm-wiz-btn.primary:hover {
  background: rgba(232, 201, 106, 0.2);
}
.ecu-comm-wiz-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}
.ecu-comm-wiz-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(220, 210, 210, 0.72);
  font-size: 15px;
}
.ecu-comm-wiz-skip {
  cursor: pointer;
  background: transparent;
  border: none;
  color: rgba(220, 210, 210, 0.85);
  font-size: 15px;
  font-weight: normal;
  padding: 4px 0;
  text-decoration: underline;
}
.ecu-comm-wiz-skip:hover {
  color: #fff;
}
`;
  function injectCommSetupWizardCss() {
    if (injected || typeof document === "undefined") return;
    const el = document.createElement("style");
    el.setAttribute("data-ecu-comm-wiz", "1");
    el.textContent = CSS2;
    document.head.appendChild(el);
    injected = true;
  }

  // src/ui/frames/comm/CommUISetupWizard.ts
  var WIZARD_TITLE = "Comm UI";
  var STEP_KEY = "ecu-intro-step";
  function wizBtn(label, onClick, primary) {
    return e(
      "button",
      {
        type: "button",
        className: "ecu-comm-wiz-btn" + (primary ? " primary" : ""),
        onClick
      },
      label
    );
  }
  function featureList(items) {
    return e(
      "ul",
      { className: "ecu-comm-wiz-list" },
      ...items.map((text, i) => e("li", { key: `li-${i}` }, text))
    );
  }
  function readIntroStep() {
    try {
      const raw = sessionStorage.getItem(STEP_KEY);
      if (!raw) return 0;
      const n = parseInt(raw, 10);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch (e2) {
      return 0;
    }
  }
  function writeIntroStep(step) {
    try {
      sessionStorage.setItem(STEP_KEY, String(step));
    } catch (e2) {
    }
  }
  function clearIntroStep() {
    try {
      sessionStorage.removeItem(STEP_KEY);
    } catch (e2) {
    }
  }
  function CommUISetupWizard(props) {
    injectCommSetupWizardCss();
    const finish = () => {
      patchSettings({ setupWizardDone: true });
      patchMeterAppearance({ testBars: false });
      clearIntroStep();
      props.onDone();
    };
    const steps = [
      {
        title: "Welcome",
        body: "This overlay replaces the stock /comm panel. Everything is movable \u2014 party frames, map info, threat, combat meters, and more. A spotlight tour can walk you through each area when you're ready.",
        extra: null,
        actions: e(
          "div",
          { className: "ecu-comm-wiz-actions" },
          wizBtn("Next", () => props.onStep(1), true)
        )
      },
      {
        title: "How do you want to learn?",
        body: "Spotlight tours dim the screen and highlight one area at a time. You stay in control \u2014 Next, Back, or Skip at any point.",
        extra: featureList([
          "Recommended: short intro (~17 steps) \u2014 observe chrome, overlay essentials, PDPS",
          "Deeper tours appear once when you use layout, meters, inspect, and more",
          "Replay the intro anytime from the Intro button on the control strip"
        ]),
        actions: e(
          "div",
          { className: "ecu-comm-wiz-actions" },
          wizBtn("Back", () => props.onStep(0)),
          wizBtn("Explore on my own", finish),
          wizBtn(
            "Start spotlight tour",
            () => {
              clearIntroStep();
              patchSettings({ setupWizardDone: true });
              props.onStartTour();
            },
            true
          )
        )
      }
    ];
    const cur = steps[Math.min(props.step, steps.length - 1)];
    return e(
      "div",
      { className: "ecu-comm-wiz-backdrop" },
      e(
        "div",
        {
          className: "ecu-comm-wiz",
          style: PIXEL_TEXT,
          onMouseDown: (ev) => ev.stopPropagation()
        },
        e("div", { className: "ecu-comm-wiz-logo" }, WIZARD_TITLE),
        e("h3", null, cur.title),
        e("p", null, cur.body),
        cur.extra || null,
        cur.actions,
        e(
          "div",
          { className: "ecu-comm-wiz-foot" },
          e(
            "button",
            { type: "button", className: "ecu-comm-wiz-skip", onClick: finish },
            "Skip intro"
          ),
          `${props.step + 1} / ${steps.length}`
        )
      )
    );
  }

  // src/ui/frames/comm/guidedTour/guidedTourCss.ts
  var injected2 = false;
  var CSS3 = `
.ecu-tour-root {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  pointer-events: none;
}
.ecu-tour-shade {
  position: fixed;
  background: rgba(0, 0, 0, 0.76);
  pointer-events: auto;
  z-index: 0;
}
.ecu-tour-spot {
  position: fixed;
  border-radius: 4px;
  background: transparent;
  pointer-events: none;
  z-index: 1;
  outline: 2px solid rgba(255, 210, 138, 0.95);
  outline-offset: 2px;
  box-shadow:
    0 0 0 4px rgba(255, 210, 138, 0.12),
    0 0 20px rgba(255, 210, 138, 0.55);
  animation: ecu-tour-spot-pulse 1.8s ease-in-out infinite;
  transition: top 0.15s ease, left 0.15s ease, width 0.15s ease, height 0.15s ease;
}
@keyframes ecu-tour-spot-pulse {
  0%, 100% {
    outline-color: rgba(255, 210, 138, 0.82);
    box-shadow:
      0 0 0 4px rgba(255, 210, 138, 0.1),
      0 0 16px rgba(255, 210, 138, 0.42);
  }
  50% {
    outline-color: rgba(255, 228, 170, 1);
    box-shadow:
      0 0 0 7px rgba(255, 210, 138, 0.22),
      0 0 32px rgba(255, 210, 138, 0.78);
  }
}
.ecu-tour-connector {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
  overflow: visible;
}
.ecu-tour-connector line {
  stroke: rgba(255, 210, 138, 0.88);
  stroke-width: 2.5;
  stroke-dasharray: 9 7;
  animation: ecu-tour-dash 1.1s linear infinite;
}
@keyframes ecu-tour-dash {
  to { stroke-dashoffset: -16; }
}
.ecu-tour-card {
  position: fixed;
  z-index: 3;
  width: min(460px, calc(100vw - 24px));
  max-width: min(460px, calc(100vw - 24px));
  box-sizing: border-box;
  padding: 22px 24px 18px;
  background: linear-gradient(180deg, #1a171b 0%, #0e0c10 100%);
  border: 1px solid rgba(0, 0, 0, 0.85);
  outline: 1px solid rgba(232, 201, 106, 0.35);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.75);
  color: #eee;
  font-size: 19px;
  pointer-events: auto;
}
.ecu-tour-card h3 {
  margin: 0 0 10px;
  font-size: 24px;
  color: #fff;
  font-weight: normal;
}
.ecu-tour-card p {
  margin: 0 0 14px;
  color: rgba(220, 210, 210, 0.92);
  line-height: 1.55;
}
.ecu-tour-card .ecu-tour-hint {
  color: #e8b86a;
  font-size: 18px;
  line-height: 1.45;
  margin: 0 0 14px;
}
.ecu-tour-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.ecu-tour-actions-left {
  flex: 0 0 auto;
  min-width: 76px;
}
.ecu-tour-actions-right {
  display: flex;
  flex: 0 0 auto;
  gap: 10px;
  margin-left: auto;
}
.ecu-tour-btn {
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: #eee;
  padding: 10px 18px;
  font-size: 18px;
  font-weight: normal;
  border-radius: 2px;
  min-width: 76px;
  box-sizing: border-box;
}
.ecu-tour-btn.is-slot-hidden {
  visibility: hidden;
  pointer-events: none;
}
.ecu-tour-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
}
.ecu-tour-btn.primary {
  color: #ffd28a;
  border-color: rgba(232, 201, 106, 0.45);
  background: rgba(232, 201, 106, 0.12);
  min-width: 88px;
}
.ecu-tour-btn:disabled {
  cursor: default;
}
.ecu-tour-foot {
  margin-top: 12px;
  color: rgba(220, 210, 210, 0.65);
  font-size: 16px;
}
`;
  function injectGuidedTourCss() {
    if (typeof document === "undefined") return;
    if (injected2) {
      const existing = document.querySelector("style[data-ecu-tour]");
      if (existing) return;
    }
    let el = document.querySelector(
      "style[data-ecu-tour]"
    );
    if (!el) {
      el = document.createElement("style");
      el.setAttribute("data-ecu-tour", "1");
      document.head.appendChild(el);
    }
    el.textContent = CSS3;
    injected2 = true;
  }

  // src/ui/frames/comm/guidedTour/tourGeometry.ts
  function measureTarget(selector, kind = "region") {
    if (typeof document === "undefined") return null;
    const parts = selector.split(",").map((s) => s.trim());
    const pad2 = kind === "button" ? 10 : 12;
    for (let i = 0; i < parts.length; i++) {
      const sel = parts[i];
      if (!sel) continue;
      if (kind === "button") {
        const el = document.querySelector(sel);
        const rect = el ? rectForElement(el, pad2) : null;
        if (rect) return rect;
        continue;
      }
      const nodes = document.querySelectorAll(sel);
      let best = null;
      let bestArea = 0;
      for (let j = 0; j < nodes.length; j++) {
        const el = nodes[j];
        const rect = kind === "panel" ? rectForPanelShell(el, pad2) : rectForElement(el, pad2);
        if (!rect) continue;
        const area = rect.width * rect.height;
        if (area > bestArea) {
          best = rect;
          bestArea = area;
        }
      }
      if (best) return best;
    }
    return null;
  }
  function rectForElement(el, pad2) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    let top = r.top;
    let left = r.left;
    let right = r.right;
    let bottom = r.bottom;
    const kids = el.children;
    for (let i = 0; i < kids.length; i++) {
      const kr = kids[i].getBoundingClientRect();
      if (kr.width < 1 || kr.height < 1) continue;
      top = Math.min(top, kr.top);
      left = Math.min(left, kr.left);
      right = Math.max(right, kr.right);
      bottom = Math.max(bottom, kr.bottom);
    }
    return {
      top: Math.max(4, top - pad2),
      left: Math.max(4, left - pad2),
      width: right - left + pad2 * 2,
      height: bottom - top + pad2 * 2
    };
  }
  function rectForPanelShell(el, pad2) {
    const base = rectForElement(el, pad2);
    if (!base) return null;
    let top = base.top + pad2;
    let left = base.left + pad2;
    let right = left + base.width - pad2 * 2;
    let bottom = top + base.height - pad2 * 2;
    const mounts = el.querySelectorAll(
      "#bottomleftcorner, .comm-bag-mount, .CodeMirror, .ecu-command-editor"
    );
    for (let i = 0; i < mounts.length; i++) {
      const r = mounts[i].getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      top = Math.min(top, r.top);
      left = Math.min(left, r.left);
      right = Math.max(right, r.right);
      bottom = Math.max(bottom, r.bottom);
    }
    return {
      top: Math.max(4, top - pad2),
      left: Math.max(4, left - pad2),
      width: right - left + pad2 * 2,
      height: bottom - top + pad2 * 2
    };
  }
  function clampCardPos(top, left, cardW, cardH, vw, vh) {
    const w = Math.min(cardW, vw - 24);
    const h = Math.min(cardH, vh - 24);
    return {
      top: Math.max(12, Math.min(top, vh - h - 12)),
      left: Math.max(12, Math.min(left, vw - w - 12))
    };
  }
  function overlaps(a, b, gap = 12) {
    return !(a.left + a.width + gap <= b.left || b.left + b.width + gap <= a.left || a.top + a.height + gap <= b.top || b.top + b.height + gap <= a.top);
  }
  function shadePanels(spot, vw, vh) {
    if (!spot) {
      return [{ top: 0, left: 0, width: vw, height: vh }];
    }
    const out = [];
    if (spot.top > 0) {
      out.push({ top: 0, left: 0, width: vw, height: spot.top });
    }
    const bottomY = spot.top + spot.height;
    if (bottomY < vh) {
      out.push({ top: bottomY, left: 0, width: vw, height: vh - bottomY });
    }
    if (spot.left > 0) {
      out.push({
        top: spot.top,
        left: 0,
        width: spot.left,
        height: spot.height
      });
    }
    const rightX = spot.left + spot.width;
    if (rightX < vw) {
      out.push({
        top: spot.top,
        left: rightX,
        width: vw - rightX,
        height: spot.height
      });
    }
    return out;
  }
  function cardPosition(spot, cardW = 460, cardH = 240, placement = "auto") {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 18;
    const effectiveW = Math.min(cardW, vw - 24);
    if (!spot || placement === "center") {
      return clampCardPos(
        Math.max(20, vh * 0.06),
        (vw - effectiveW) / 2,
        effectiveW,
        cardH,
        vw,
        vh
      );
    }
    const spotRight = spot.left + spot.width;
    const spotBottom = spot.top + spot.height;
    const spotCx = spot.left + spot.width / 2;
    const spotCy = spot.top + spot.height / 2;
    const candidates = [];
    if (placement === "above" || placement === "auto") {
      candidates.push(
        clampCardPos(
          spot.top - cardH - gap,
          spotRight - effectiveW,
          effectiveW,
          cardH,
          vw,
          vh
        ),
        clampCardPos(
          spot.top - cardH - gap,
          spot.left,
          effectiveW,
          cardH,
          vw,
          vh
        ),
        clampCardPos(
          spot.top - cardH - gap,
          spotCx - effectiveW / 2,
          effectiveW,
          cardH,
          vw,
          vh
        )
      );
    }
    if (placement === "below" || placement === "auto") {
      candidates.push(
        clampCardPos(
          spotBottom + gap,
          spotCx - effectiveW / 2,
          effectiveW,
          cardH,
          vw,
          vh
        )
      );
    }
    if (placement === "auto") {
      candidates.push(
        clampCardPos(
          spotCy - cardH / 2,
          spot.left - effectiveW - gap,
          effectiveW,
          cardH,
          vw,
          vh
        ),
        clampCardPos(
          spotCy - cardH / 2,
          spotRight + gap,
          effectiveW,
          cardH,
          vw,
          vh
        )
      );
    }
    candidates.push(
      clampCardPos(
        Math.max(16, vh * 0.05),
        (vw - effectiveW) / 2,
        effectiveW,
        cardH,
        vw,
        vh
      )
    );
    const cardBox = (c) => ({
      top: c.top,
      left: c.left,
      width: effectiveW,
      height: cardH
    });
    let best = null;
    let bestScore = Infinity;
    for (let i = 0; i < candidates.length; i++) {
      const box = cardBox(candidates[i]);
      if (overlaps(box, spot)) continue;
      const cardCx = box.left + box.width / 2;
      const cardCy = box.top + box.height / 2;
      let score = Math.hypot(cardCx - spotCx, cardCy - spotCy);
      if (spotCy > vh * 0.62 && box.top + box.height <= spot.top + 4) {
        score *= 0.55;
      }
      if (spotCy < vh * 0.38 && box.top >= spotBottom - 4) {
        score *= 0.55;
      }
      if (score < bestScore) {
        bestScore = score;
        best = candidates[i];
      }
    }
    return best || candidates[candidates.length - 1];
  }
  function tourConnector(cardPos, cardW, cardH, spot) {
    const cardCx = cardPos.left + cardW / 2;
    const cardCy = cardPos.top + cardH / 2;
    const spotCx = spot.left + spot.width / 2;
    const spotCy = spot.top + spot.height / 2;
    const dist = Math.hypot(cardCx - spotCx, cardCy - spotCy);
    if (dist < 130) return null;
    const cardTop = cardPos.top;
    const cardBottom = cardPos.top + cardH;
    const cardLeft = cardPos.left;
    const cardRight = cardPos.left + cardW;
    const spotTop = spot.top;
    const spotBottom = spot.top + spot.height;
    const spotLeft = spot.left;
    const spotRight = spot.left + spot.width;
    if (cardBottom <= spotTop + 6) {
      return { x1: cardCx, y1: cardBottom, x2: spotCx, y2: spotTop };
    }
    if (cardTop >= spotBottom - 6) {
      return { x1: cardCx, y1: cardTop, x2: spotCx, y2: spotBottom };
    }
    if (cardRight <= spotLeft + 6) {
      return { x1: cardRight, y1: cardCy, x2: spotLeft, y2: spotCy };
    }
    if (cardLeft >= spotRight - 6) {
      return { x1: cardLeft, y1: cardCy, x2: spotRight, y2: spotCy };
    }
    return { x1: cardCx, y1: cardBottom, x2: spotCx, y2: spotTop };
  }

  // src/ui/frames/comm/guidedTour/tourCatalog.ts
  var INTRO_TOUR_ID = "intro";
  var INTRO_ALSO_COMPLETES = ["inspect"];
  var INTRO_TOUR = {
    id: INTRO_TOUR_ID,
    label: "Comm UI essentials",
    prepare: { showMeters: true },
    steps: [
      {
        section: "Observe",
        title: "Pick a character",
        body: "Click a character chip \u2014 party frames, meters, and the action bar all follow whoever is highlighted. Click the active chip again to stop observing.",
        target: '[data-ecu-tour="character-ui"]',
        targetKind: "region",
        missingHint: "Click any character chip in the strip below.",
        advanceWhen: "observing",
        enter: { refreshHud: true }
      },
      {
        section: "Observe",
        title: "Player & target frames",
        body: "HP, buffs, and resources for whoever you observe and whoever they are targeting.",
        target: ".comm-pos-panel.comm-pos-playerFrame",
        targetKind: "panel",
        missingHint: "Frames appear once someone is selected.",
        advanceWhen: "playerFrame"
      },
      {
        section: "Observe",
        title: "Server picker",
        body: "Switch realms without leaving /comm. Shows player count, ping, and live event badges.",
        target: '[data-ecu-tour="server-picker-dd"], [data-ecu-tour="server-picker"]',
        targetKind: "button",
        missingHint: "Server list appears at the bottom once /comm connects.",
        enter: { refreshHud: true }
      },
      {
        section: "Observe",
        title: "Action bar",
        body: "Follow centers the camera, Bag opens inventory, Command sends CODE \u2014 all for whoever you are observing.",
        target: '[data-ecu-tour="chrome-actions"]',
        targetKind: "region",
        missingHint: "Action buttons sit above the character strip.",
        enter: { refreshHud: true }
      },
      {
        section: "Observe",
        title: "Bag",
        body: "Click the bag icon to open the watched character's inventory here in the overlay.",
        target: '[data-ecu-tour="btn-bag"]',
        targetKind: "button",
        missingHint: "Click the bag icon in the action bar.",
        advanceWhen: "bagOpen",
        enter: { refreshHud: true }
      },
      {
        section: "Observe",
        title: "Bag panel",
        body: "Your inventory grid lives here while the bag is open. Drag it into place later with layout mode if you want it pinned.",
        target: ".comm-pos-panel.comm-pos-bag",
        targetKind: "panel",
        missingHint: "Open the bag from the action bar if the panel is not visible.",
        exit: { closeBag: true }
      },
      {
        section: "Observe",
        title: "Command",
        body: "Click the command icon to open the CODE editor for whoever you are observing.",
        target: '[data-ecu-tour="btn-command"]',
        targetKind: "button",
        missingHint: "Click the command icon in the action bar.",
        advanceWhen: "commandOpen",
        enter: { refreshHud: true }
      },
      {
        section: "Observe",
        title: "Command panel",
        body: "Type or paste CODE and press Ctrl+Enter to run it on the watched character. Saved presets live here too.",
        target: ".comm-pos-panel.comm-pos-command",
        targetKind: "panel",
        missingHint: "Click the command icon in the action bar to open this panel.",
        exit: { closeCommand: true, closeBag: true }
      },
      {
        section: "Overlay",
        title: "Control strip",
        body: "Bottom-right buttons for layout, meters, and adding panels.",
        target: ".comm-pos-toggles",
        targetKind: "region",
        enter: { closeBag: true, closeCommand: true }
      },
      {
        section: "Overlay",
        title: "Layout mode",
        body: "Turn this on to drag panels into place. Every panel appears at once so you can position them \u2014 it looks busy, and that's normal. A short layout tour runs the first time you enable it.",
        target: '[data-ecu-tour="btn-layout"]',
        targetKind: "button",
        missingHint: "Click the Layout button in the control strip."
      },
      {
        section: "Overlay",
        title: "Party roster",
        body: "Everyone nearby on this server. Click a party member to focus frames or inspect their gear.",
        target: ".comm-pos-players",
        targetKind: "region"
      },
      {
        section: "Overlay",
        title: "Map & events",
        body: "In-game map plus server clock and live/world events at the top of the overlay.",
        target: ".comm-pos-topCenter",
        targetKind: "region"
      },
      {
        section: "Overlay",
        title: "Combat meters",
        body: "Optional rank windows for damage, healing, and fight history.",
        target: ".ecu-meter-shell",
        targetKind: "region",
        missingHint: "No meter yet \u2014 the next step shows how to add one."
      },
      {
        section: "Overlay",
        title: "Add a meter",
        body: "Pick damage, healing, interrupts, deaths, or Adventure Land stats.",
        target: '[data-ecu-tour="btn-add-meter"]',
        targetKind: "button",
        enter: { meterAddOpen: true },
        exit: { meterAddOpen: false }
      },
      {
        section: "Overlay",
        title: "PDPS",
        body: "Under Adventure Land in the add dialog \u2014 live party-DPS snapshot during combat.",
        target: '[data-ecu-tour="preset-pdps"]',
        targetKind: "button",
        missingHint: "Tap + Meter to open the preset list.",
        enter: { meterAddOpen: true },
        exit: { meterAddOpen: false }
      },
      {
        section: "Overlay",
        title: "Kill counter",
        body: "Session kill KPI in a compact strip. Change scope in the panel header.",
        target: ".comm-pos-panel.comm-pos-kills",
        targetKind: "panel",
        enter: { closeBag: true, closeCommand: true }
      },
      {
        section: "Overlay",
        title: "You're set",
        body: "Explore at your own pace. Short tours still appear for layout mode, meter tools, and combat panels \u2014 each only once.",
        target: ".comm-pos-toggles",
        targetKind: "region"
      }
    ]
  };
  var LAYOUT_TOUR = {
    id: "layout",
    label: "Layout edit",
    prepare: { layoutEdit: true },
    steps: [
      {
        title: "Layout mode",
        body: "Every panel is visible so you can move them \u2014 it looks crowded at first. Pick one panel, drag its header, then adjust anchors and opacity below.",
        target: ".comm-pos-edit-header"
      },
      {
        title: "Anchor pad",
        body: "The 3\xD73 pad sets stretch direction \u2014 which corner stays fixed when the window grows.",
        target: ".comm-pos-anchor-pad",
        missingHint: "Anchor pad is on each panel header in layout mode."
      },
      {
        title: "Opacity & hide",
        body: "Slider fades a panel. \xD7 hides closable panels (command, threat, meters\u2026) without deleting your layout.",
        target: ".comm-pos-opacity-row",
        missingHint: "Opacity slider appears on panel headers in layout mode."
      }
    ]
  };
  var METERS_TOUR = {
    id: "meters",
    label: "Combat meters",
    prepare: { showMeters: true, testBars: true },
    steps: [
      {
        title: "Meter window",
        body: "Each window tracks its own metric. Drag the titlebar (Alt) to move without layout mode.",
        target: ".ecu-meter-shell",
        missingHint: "Add a meter from the control strip first."
      },
      {
        title: "Bar rows",
        body: "Click a row for Inspector (spells, targets). Right-click the body for bookmark slots.",
        target: ".ecu-meter-body",
        missingHint: "Add a meter window first."
      },
      {
        title: "Toolbar overview",
        body: "Titlebar icons control settings, scope, segments, displays, reports, and reset. Hover for menus \u2014 a toolbar tour appears when you first open one.",
        target: ".ecu-meter-titlebar",
        missingHint: "Add a meter window first."
      },
      {
        title: "Status bar",
        body: "Segment timer and DPS/HPS readout along the bottom.",
        target: ".ecu-meter-statusbar",
        missingHint: "Add a meter window first.",
        enter: { testBars: false }
      }
    ]
  };
  var METER_TOOLBAR_TOUR = {
    id: "meter-toolbar",
    label: "Meter toolbar",
    prepare: { showMeters: true },
    steps: [
      {
        title: "Settings",
        body: "Skins, bar text, animations, auto-hide, window control, and mass hide.",
        target: '[data-ecu-tour="meter-gear"]'
      },
      {
        title: "Segment",
        body: "Fight history \u2014 click older/newer segments. Hover for wipe/kill markers.",
        target: '[data-ecu-tour="meter-segment"]'
      },
      {
        title: "Display",
        body: "Switch damage / heal / taken and bars / pie / graph. Right-click for the full list.",
        target: '[data-ecu-tour="meter-display"]',
        missingHint: "Rank-based meters only \u2014 snapshot meters omit this button."
      },
      {
        title: "Report & tools",
        body: "Report copies fight summaries. \u229E opens encounter dashboard, deaths, and timeline.",
        target: '[data-ecu-tour="meter-report"]',
        missingHint: "Rank-based meters only."
      },
      {
        title: "Resize",
        body: "Corner handles and the bottom stretch tab change size. Encounter badges (skull/play) mark kills and segment starts.",
        target: ".ecu-meter-stretch-tab",
        missingHint: "Add a meter window first."
      }
    ]
  };
  var COMBAT_TOUR = {
    id: "combat",
    label: "Combat panels",
    steps: [
      {
        title: "Enemies",
        body: "Nearby monsters for quick targeting \u2014 click a row to select.",
        target: ".comm-pos-enemies",
        missingHint: "Appears when monsters are nearby."
      },
      {
        title: "Threat table",
        body: "Who mobs are attacking. Click a row to target that player.",
        target: ".comm-pos-threat",
        missingHint: "Shows during combat when threat data exists."
      },
      {
        title: "Boss bar",
        body: "Large HP bar during boss fights \u2014 click to target the boss.",
        target: ".comm-pos-bossBar",
        missingHint: "Appears during boss encounters."
      }
    ]
  };
  var COOP_TOUR = {
    id: "coop",
    label: "s.coop meter",
    steps: [
      {
        title: "s.coop meter",
        body: "Tracks shared kill participation (s.coop) for party members on this server. v1 and v2 use different formulas \u2014 add from + Meter \u2192 Adventure Land. The window only appears once someone has coop data.",
        target: '[data-ecu-tour="meter-coop"]',
        missingHint: "Coop panels hide until participation data exists."
      }
    ]
  };
  var INSPECT_TOUR = {
    id: "inspect",
    label: "Inspect",
    steps: [
      {
        title: "Paperdoll",
        body: "Gear, stats, and equipment for whoever you clicked. Close with \xD7 or Esc.",
        target: ".comm-pos-paperdoll"
      },
      {
        title: "Buff & item reference",
        body: "Floating info panels cross-reference buffs and items when you hover icons elsewhere.",
        target: ".comm-pos-buffInfo"
      }
    ]
  };
  var GUIDED_TOURS = [
    INTRO_TOUR,
    LAYOUT_TOUR,
    METERS_TOUR,
    METER_TOOLBAR_TOUR,
    COOP_TOUR,
    COMBAT_TOUR,
    INSPECT_TOUR
  ];
  var INTRO_TOUR_CHAIN = [INTRO_TOUR_ID];
  function tourById(id) {
    for (let i = 0; i < GUIDED_TOURS.length; i++) {
      if (GUIDED_TOURS[i].id === id) return GUIDED_TOURS[i];
    }
    return null;
  }
  function isTourCompleted(id) {
    const done = getSettings().toursCompleted || {};
    return !!done[id];
  }
  function markTourCompleted(id) {
    const prev = getSettings().toursCompleted || {};
    const next = { ...prev, [id]: true };
    if (id === INTRO_TOUR_ID) {
      for (let i = 0; i < INTRO_ALSO_COMPLETES.length; i++) {
        next[INTRO_ALSO_COMPLETES[i]] = true;
      }
    }
    patchSettings({ toursCompleted: next });
  }
  function migrateLegacyTourFlags() {
    const done = getSettings().toursCompleted || {};
    const next = { ...done };
    let changed = false;
    if (done.full && !done[INTRO_TOUR_ID]) {
      next[INTRO_TOUR_ID] = true;
      changed = true;
    }
    if (done.toggles && done.party && done.meters && !done[INTRO_TOUR_ID]) {
      next[INTRO_TOUR_ID] = true;
      changed = true;
    }
    if (changed) patchSettings({ toursCompleted: next });
  }

  // src/ui/frames/comm/guidedTour/tourAdvance.ts
  function tourAdvanceReady(when, ctx) {
    if (!when) return false;
    switch (when) {
      case "observing":
        return ctx.isObserving;
      case "bagOpen":
        return ctx.bagOpen;
      case "commandOpen":
        return ctx.commandOpen;
      case "playerFrame": {
        if (!ctx.isObserving) return false;
        const el = document.querySelector(
          ".comm-pos-panel.comm-pos-playerFrame"
        );
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.width > 8 && r.height > 8;
      }
      default: {
        const _exhaustive = when;
        return _exhaustive;
      }
    }
  }

  // src/ui/frames/comm/guidedTour/tourPortal.ts
  function TourPortal(props) {
    const React = getReact();
    const ReactDOM = getReactDOM();
    const [host2, setHost] = React.useState(null);
    React.useEffect(() => {
      const el = document.createElement("div");
      el.setAttribute("data-ecu-tour-portal", "1");
      document.body.appendChild(el);
      setHost(el);
      return () => {
        document.body.removeChild(el);
        setHost(null);
      };
    }, []);
    if (!host2) return null;
    return ReactDOM.createPortal(props.children, host2);
  }

  // src/ui/frames/comm/guidedTour/GuidedTourOverlay.ts
  var CARD_W = 460;
  var CARD_H_FALLBACK = 280;
  function tourBtn(label, onClick, opts) {
    const classes = ["ecu-tour-btn"];
    if (opts == null ? void 0 : opts.primary) classes.push("primary");
    if (opts == null ? void 0 : opts.hidden) classes.push("is-slot-hidden");
    return e(
      "button",
      {
        type: "button",
        className: classes.join(" "),
        disabled: !!(opts == null ? void 0 : opts.disabled),
        onClick
      },
      label
    );
  }
  function TourOverlayBody(props) {
    const React = getReact();
    const cardRef = React.useRef(null);
    const [spot, setSpot] = React.useState(null);
    const [cardPos, setCardPos] = React.useState({ top: 24, left: 24 });
    const [cardH, setCardH] = React.useState(CARD_H_FALLBACK);
    const [viewport, setViewport] = React.useState(() => ({
      w: typeof window !== "undefined" ? window.innerWidth : 1920,
      h: typeof window !== "undefined" ? window.innerHeight : 1080
    }));
    const advancedRef = React.useRef(false);
    const step = props.tour.steps[props.stepIndex];
    injectGuidedTourCss();
    React.useEffect(() => {
      advancedRef.current = false;
    }, [props.stepIndex, step == null ? void 0 : step.advanceWhen]);
    React.useLayoutEffect(() => {
      const el = cardRef.current;
      if (!el) return;
      const h = el.getBoundingClientRect().height;
      if (h > 40) setCardH(h);
    }, [step == null ? void 0 : step.title, step == null ? void 0 : step.body, step == null ? void 0 : step.missingHint, props.stepIndex, spot]);
    React.useEffect(() => {
      if (!step) return;
      const kind = step.targetKind || "region";
      const placement = step.cardPlacement || "auto";
      const measure = () => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        setViewport({ w: vw, h: vh });
        const rect = measureTarget(step.target, kind);
        setSpot(rect);
        const h = cardRef.current ? Math.max(
          CARD_H_FALLBACK,
          cardRef.current.getBoundingClientRect().height
        ) : cardH;
        setCardPos(cardPosition(rect, CARD_W, h, placement));
        return rect;
      };
      measure();
      window.addEventListener("resize", measure);
      let ro = null;
      const firstSel = step.target.split(",")[0].trim();
      const targetEl = document.querySelector(firstSel);
      if (typeof ResizeObserver !== "undefined" && targetEl) {
        ro = new ResizeObserver(() => measure());
        ro.observe(targetEl);
      }
      let missTimer = null;
      if (!targetEl) {
        missTimer = window.setInterval(() => {
          const rect = measure();
          if (rect && missTimer != null) {
            window.clearInterval(missTimer);
            missTimer = null;
            const el = document.querySelector(firstSel);
            if (typeof ResizeObserver !== "undefined" && el && !ro) {
              ro = new ResizeObserver(() => measure());
              ro.observe(el);
            }
          }
        }, 250);
      }
      return () => {
        window.removeEventListener("resize", measure);
        if (ro) ro.disconnect();
        if (missTimer != null) window.clearInterval(missTimer);
      };
    }, [
      step == null ? void 0 : step.target,
      step == null ? void 0 : step.targetKind,
      step == null ? void 0 : step.cardPlacement,
      props.stepIndex,
      cardH
    ]);
    React.useEffect(() => {
      if (!(step == null ? void 0 : step.advanceWhen) || advancedRef.current) return;
      let advanceTimer = null;
      const tick = () => {
        if (advancedRef.current) return;
        if (!tourAdvanceReady(step.advanceWhen, props.advanceContext)) return;
        advancedRef.current = true;
        advanceTimer = window.setTimeout(() => {
          if (props.stepIndex >= props.tour.steps.length - 1) {
            markTourCompleted(props.tour.id);
            props.onDone();
            return;
          }
          props.onStep(props.stepIndex + 1);
        }, 450);
      };
      tick();
      const id = window.setInterval(tick, 250);
      return () => {
        window.clearInterval(id);
        if (advanceTimer != null) window.clearTimeout(advanceTimer);
      };
    }, [
      step == null ? void 0 : step.advanceWhen,
      props.stepIndex,
      props.advanceContext.isObserving,
      props.advanceContext.bagOpen,
      props.advanceContext.commandOpen
    ]);
    React.useEffect(() => {
      if (!step) props.onDone();
    }, [step]);
    if (!step) return null;
    const isLast = props.stepIndex >= props.tour.steps.length - 1;
    const next = () => {
      if (isLast) {
        markTourCompleted(props.tour.id);
        props.onDone();
        return;
      }
      props.onStep(props.stepIndex + 1);
    };
    const back = () => {
      if (props.stepIndex > 0) props.onStep(props.stepIndex - 1);
    };
    const skip = () => {
      markTourCompleted(props.tour.id);
      props.onDone();
    };
    const shades = shadePanels(spot, viewport.w, viewport.h);
    const connector = spot != null ? tourConnector(cardPos, CARD_W, cardH, spot) : null;
    const showHint = !!step.missingHint && (!spot || !!step.advanceWhen);
    return e(
      "div",
      { className: "ecu-tour-root" },
      ...shades.map(
        (sh, i) => e("div", {
          key: "shade-" + i,
          className: "ecu-tour-shade",
          style: {
            top: sh.top + "px",
            left: sh.left + "px",
            width: sh.width + "px",
            height: sh.height + "px"
          }
        })
      ),
      spot ? e("div", {
        className: "ecu-tour-spot",
        style: {
          top: spot.top + "px",
          left: spot.left + "px",
          width: spot.width + "px",
          height: spot.height + "px"
        }
      }) : null,
      connector ? e(
        "svg",
        { className: "ecu-tour-connector", "aria-hidden": true },
        e(
          "defs",
          null,
          e(
            "marker",
            {
              id: "ecu-tour-arrowhead",
              markerWidth: 8,
              markerHeight: 8,
              refX: 6,
              refY: 4,
              orient: "auto"
            },
            e("path", {
              d: "M0,0 L8,4 L0,8 Z",
              fill: "rgba(255, 210, 138, 0.92)"
            })
          )
        ),
        e("line", {
          x1: connector.x1,
          y1: connector.y1,
          x2: connector.x2,
          y2: connector.y2,
          markerEnd: "url(#ecu-tour-arrowhead)"
        })
      ) : null,
      e(
        "div",
        {
          ref: cardRef,
          className: "ecu-tour-card",
          style: {
            ...PIXEL_TEXT,
            top: cardPos.top + "px",
            left: cardPos.left + "px"
          }
        },
        e("h3", null, step.title),
        e("p", null, step.body),
        showHint ? e("p", { className: "ecu-tour-hint" }, step.missingHint) : null,
        e(
          "div",
          { className: "ecu-tour-actions" },
          e(
            "div",
            { className: "ecu-tour-actions-left" },
            tourBtn("Back", back, {
              hidden: props.stepIndex === 0,
              disabled: props.stepIndex === 0
            })
          ),
          e(
            "div",
            { className: "ecu-tour-actions-right" },
            tourBtn("Skip tour", skip),
            tourBtn(isLast ? "Done" : "Next", next, { primary: true })
          )
        ),
        e(
          "div",
          { className: "ecu-tour-foot" },
          `${step.section || props.tour.label} \xB7 ${props.stepIndex + 1} / ${props.tour.steps.length}`
        )
      )
    );
  }
  function GuidedTourOverlay(props) {
    return e(TourPortal, null, e(TourOverlayBody, props));
  }

  // src/ui/frames/comm/guidedTour/contextualTour.ts
  var host = null;
  function registerContextualTourHost(next) {
    host = next;
  }
  function contextualToursAllowed() {
    return !!getSettings().setupWizardDone;
  }
  function tryContextualTour(id, delayMs) {
    if (!host || !contextualToursAllowed()) return;
    if (isTourCompleted(id)) return;
    const run = () => {
      if (!host || host.isBlocked()) return;
      if (isTourCompleted(id)) return;
      host.startTour(id);
    };
    if (delayMs != null && delayMs > 0) {
      window.setTimeout(run, delayMs);
      return;
    }
    run();
  }

  // src/ui/frames/comm/guidedTour/tourEffects.ts
  function snapshotTourPanelVisible(getPanelVisible) {
    const out = {};
    for (let i = 0; i < CLOSABLE_PANEL_IDS.length; i++) {
      const id = CLOSABLE_PANEL_IDS[i];
      out[id] = getPanelVisible(id);
    }
    return out;
  }
  function applyTourStepEffects(host2, effects, snap) {
    if (!effects) return;
    if (effects.layoutEdit != null) host2.setLayoutEdit(effects.layoutEdit);
    if (effects.showMeters && snap.metersHidden) host2.setMetersHidden(false);
    if (effects.testBars != null) host2.setTestBars(effects.testBars);
    if (effects.meterAddOpen != null) host2.setMeterAddOpen(effects.meterAddOpen);
    if (effects.closeCommand) host2.closeCommandPanel();
    if (effects.closeBag) host2.closeBagPanel();
    if (effects.refreshHud) host2.refreshCommHud();
  }
  function restoreTourUi(host2, snap) {
    host2.setLayoutEdit(snap.layoutEdit);
    host2.setMetersHidden(snap.metersHidden);
    host2.setMeterAddOpen(snap.meterAddOpen);
    host2.setTestBars(snap.testBars);
    const ids = CLOSABLE_PANEL_IDS;
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const was = snap.panelVisible[id];
      if (typeof was === "boolean") host2.setPanelVisible(id, was);
    }
  }
  function refreshCommChromeHud() {
    if (typeof window === "undefined") return;
    if (typeof window.render_characters === "function")
      window.render_characters();
    if (typeof window.render_servers === "function") window.render_servers();
  }
  function defaultTourEffectHost(deps) {
    return {
      snapshot: () => ({
        layoutEdit: deps.getLayoutEdit(),
        metersHidden: deps.getMetersHidden(),
        meterAddOpen: deps.getMeterAddOpen(),
        testBars: deps.getTestBars(),
        panelVisible: snapshotTourPanelVisible(deps.getPanelVisible)
      }),
      setLayoutEdit: deps.setLayoutEdit,
      setMetersHidden: deps.setMetersHidden,
      setMeterAddOpen: deps.setMeterAddOpen,
      setPanelVisible: deps.setPanelVisible,
      setTestBars: deps.setTestBars,
      closeCommandPanel: () => {
        deps.setPanelVisible("command", false);
      },
      closeBagPanel: () => {
        closeInventory();
        deps.setPanelVisible("bag", false);
      },
      refreshCommHud: refreshCommChromeHud
    };
  }

  // src/ui/frames/comm/guidedTour/tourRunner.ts
  function prepareEffects(prep) {
    const out = {};
    if (prep.layoutEdit) out.layoutEdit = true;
    if (prep.showMeters) out.showMeters = true;
    if (prep.testBars) out.testBars = true;
    return out;
  }
  function beginTourSession(host2, tour) {
    const snap = host2.snapshot();
    applyTourStepEffects(host2, prepareEffects(tour.prepare || {}), snap);
    return {
      snap,
      restore: () => restoreTourUi(host2, snap),
      applyStep: (stepIndex, prevIndex) => {
        if (prevIndex != null && prevIndex !== stepIndex) {
          const prev = tour.steps[prevIndex];
          if (prev == null ? void 0 : prev.exit) applyTourStepEffects(host2, prev.exit, snap);
        }
        const step = tour.steps[stepIndex];
        if (step == null ? void 0 : step.enter) applyTourStepEffects(host2, step.enter, snap);
      }
    };
  }
  function endTourSession(session, tour, stepIndex, host2) {
    if (!session) return;
    if (tour && host2 != null && stepIndex != null && stepIndex >= 0) {
      const step = tour.steps[stepIndex];
      if (step == null ? void 0 : step.exit) applyTourStepEffects(host2, step.exit, session.snap);
    }
    session.restore();
  }

  // src/ui/hooks/useCommGuidedTours.ts
  function useCommGuidedTours(opts) {
    const React = getReact();
    const [activeTour, setActiveTour] = React.useState(
      null
    );
    const sessionRef = React.useRef(null);
    const activeTourRef = React.useRef(activeTour);
    const setupWizardOpenRef = React.useRef(opts.setupWizardOpen);
    const optsRef = React.useRef(opts);
    activeTourRef.current = activeTour;
    setupWizardOpenRef.current = opts.setupWizardOpen;
    optsRef.current = opts;
    const effectHostRef = React.useRef(null);
    if (!effectHostRef.current) {
      effectHostRef.current = defaultTourEffectHost({
        getLayoutEdit: () => optsRef.current.layoutEdit,
        setLayoutEdit: (v) => optsRef.current.setLayoutEdit(v),
        getMetersHidden: () => optsRef.current.metersHidden,
        setMetersHidden: (v) => optsRef.current.setMetersHidden(v),
        getMeterAddOpen: () => optsRef.current.meterAddOpen,
        setMeterAddOpen: (v) => optsRef.current.setMeterAddOpen(v),
        getPanelVisible: (id) => optsRef.current.getPanelVisible(id),
        setPanelVisible: (id, visible) => {
          optsRef.current.setVisible(id, visible);
          if (visible) savePanelVisible(id, true);
        },
        getTestBars: () => !!getMeterAppearance().testBars,
        setTestBars: (enabled) => patchMeterAppearance({ testBars: enabled })
      });
    }
    const finishTour = (finishedId) => {
      const cur = activeTourRef.current;
      endTourSession(
        sessionRef.current,
        cur == null ? void 0 : cur.tour,
        cur == null ? void 0 : cur.step,
        effectHostRef.current
      );
      sessionRef.current = null;
      let found = false;
      for (let i = 0; i < INTRO_TOUR_CHAIN.length; i++) {
        if (found) {
          const id = INTRO_TOUR_CHAIN[i];
          if (isTourCompleted(id)) continue;
          const tour = tourById(id);
          if (!tour || !effectHostRef.current) return;
          sessionRef.current = beginTourSession(effectHostRef.current, tour);
          sessionRef.current.applyStep(0, null);
          setActiveTour({ tour, step: 0 });
          return;
        }
        if (INTRO_TOUR_CHAIN[i] === finishedId) found = true;
      }
      setActiveTour(null);
    };
    const launchTour = (id) => {
      var _a, _b;
      const tour = tourById(id);
      const host2 = effectHostRef.current;
      if (!tour || !host2) return;
      endTourSession(
        sessionRef.current,
        (_a = activeTourRef.current) == null ? void 0 : _a.tour,
        (_b = activeTourRef.current) == null ? void 0 : _b.step,
        host2
      );
      sessionRef.current = beginTourSession(host2, tour);
      sessionRef.current.applyStep(0, null);
      setActiveTour({ tour, step: 0 });
    };
    const launchContextualTour = (id) => {
      if (activeTourRef.current || setupWizardOpenRef.current) return;
      launchTour(id);
    };
    const startIntroTour = (force) => {
      optsRef.current.setSetupWizardOpen(false);
      for (let i = 0; i < INTRO_TOUR_CHAIN.length; i++) {
        const id = INTRO_TOUR_CHAIN[i];
        if (!force && isTourCompleted(id)) continue;
        launchTour(id);
        return;
      }
    };
    const toggleLayoutEdit = () => {
      const next = !optsRef.current.layoutEdit;
      optsRef.current.setLayoutEdit(next);
      if (next) tryContextualTour("layout", 220);
    };
    React.useEffect(() => {
      migrateLegacyTourFlags();
      registerContextualTourHost({
        isBlocked: () => !!activeTourRef.current || !!setupWizardOpenRef.current,
        startTour: launchContextualTour
      });
      return () => {
        var _a, _b;
        registerContextualTourHost(null);
        endTourSession(
          sessionRef.current,
          (_a = activeTourRef.current) == null ? void 0 : _a.tour,
          (_b = activeTourRef.current) == null ? void 0 : _b.step,
          effectHostRef.current
        );
      };
    }, []);
    const setActiveTourStep = (step) => {
      setActiveTour((prev) => {
        if (!prev || !sessionRef.current) return prev;
        sessionRef.current.applyStep(step, prev.step);
        return { tour: prev.tour, step };
      });
    };
    const tourOverlay = activeTour ? e(GuidedTourOverlay, {
      tour: activeTour.tour,
      stepIndex: activeTour.step,
      onStep: setActiveTourStep,
      onDone: () => finishTour(activeTour.tour.id),
      advanceContext: {
        isObserving: opts.isObserving,
        bagOpen: opts.bagOpen,
        commandOpen: opts.commandOpen
      }
    }) : null;
    return {
      startIntroTour,
      toggleLayoutEdit,
      tourOverlay
    };
  }

  // src/meters/meterCoopSignal.ts
  function hasVisibleCoopMeter(instances) {
    for (let i = 0; i < instances.length; i++) {
      const inst = instances[i];
      if (inst.visible === false) continue;
      const q = inst.query;
      if (q.kind !== "snapshot") continue;
      if (q.mode === "coop_v1" || q.mode === "coop_v2") return true;
    }
    return false;
  }

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
  function formatDurationCompact(timeSeconds) {
    if (timeSeconds == null || !(timeSeconds > 0)) return "";
    if (timeSeconds < 60) return `${Math.max(1, Math.ceil(timeSeconds))}s`;
    if (timeSeconds < 60 * 60) return `${Math.round(timeSeconds / 60)}m`;
    if (timeSeconds < 60 * 60 * 24) return `${Math.round(timeSeconds / 3600)}h`;
    return `${Math.round(timeSeconds / 86400)}d`;
  }
  function syncEndsAt(prevEndsAt, ms, now = Date.now(), lastMs) {
    if (!(ms != null && ms > 0)) return 0;
    const next = now + ms;
    if (!prevEndsAt) return next;
    const stickyRemain = prevEndsAt - now;
    if (lastMs != null && lastMs > 0 && Math.abs(ms - lastMs) <= 750 && prevEndsAt > now + 200 && ms <= stickyRemain + 750) {
      return prevEndsAt;
    }
    if (ms > stickyRemain + 750) return next;
    if (ms < stickyRemain - 250) return next;
    return prevEndsAt;
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
  function formatCompactNumber(n) {
    const a = Math.abs(n);
    if (a >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (a >= 1e3) return (n / 1e3).toFixed(1) + "k";
    return String(Math.round(n));
  }
  function formatCompactRate(n) {
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
    return n.toFixed(1);
  }
  function formatCompactRatePerSec(n) {
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "k/s";
    return `${Math.round(n)}/s`;
  }
  function getALServerTime(timeOffset) {
    const offset = parseInt(String(timeOffset != null ? timeOffset : 0), 10) || 0;
    const dt = new Date(Date.now() + offset * 3600 * 1e3);
    return dt.getUTCHours().toString().padStart(2, "0") + ":" + dt.getUTCMinutes().toString().padStart(2, "0");
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

  // src/meters/meterQuery.ts
  function focusToScope(focus) {
    const hasObserver = !!getYouId();
    const eff = effectivePartyFocus(focus || "watched", hasObserver);
    if (eff === "all") return "all";
    if (eff === "visible") return "visible";
    if (eff === "you") return "you";
    if (eff === "watched") return "party";
    return "party";
  }
  function playerInScope(actor, focus) {
    const scope = focusToScope(focus);
    const you = getYouId();
    switch (scope) {
      case "all":
        return true;
      case "visible":
        return isVisiblePlayer(actor.id);
      case "you":
        return !!you && actor.id === you;
      case "party": {
        const resolved = resolvePartyFocus(
          effectivePartyFocus(focus || "watched", !!you),
          getWatchedPartyKey()
        );
        if (resolved.partyFilter) {
          return actor.partyKey === resolved.partyFilter;
        }
        return isWatchedPartyMember(actor.id);
      }
      default: {
        const _exhaustive = scope;
        return _exhaustive;
      }
    }
  }
  function scopedActors(seg, focus) {
    const ids = Object.keys(seg.actors);
    const out = [];
    for (let i = 0; i < ids.length; i++) {
      const a = seg.actors[ids[i]];
      if (playerInScope(a, focus)) out.push(a);
    }
    return out;
  }
  function actorMetric(a, metric) {
    switch (metric) {
      case "damage":
        return a.damage;
      case "heal":
        return a.heal;
      case "taken":
        return a.taken;
      case "healing_required":
        return a.healingRequired;
      case "avoidance": {
        const o = a.outcomes;
        const total = o.hits + o.miss + o.evade + o.avoid;
        return total ? (o.miss + o.evade + o.avoid) / total : 0;
      }
      default: {
        const _exhaustive = metric;
        return _exhaustive;
      }
    }
  }
  function abilityMetric(ab, metric) {
    switch (metric) {
      case "damage":
        return ab.damage;
      case "heal":
        return ab.heal;
      case "taken":
        return ab.taken;
      case "healing_required":
        return ab.taken;
      case "avoidance": {
        const o = ab.outcomes;
        const total = o.hits + o.miss + o.evade + o.avoid;
        return total ? (o.miss + o.evade + o.avoid) / total : 0;
      }
      default: {
        const _exhaustive = metric;
        return _exhaustive;
      }
    }
  }
  function channelValue(a, ch) {
    switch (ch) {
      case "dps":
        return a.damage;
      case "base":
        return a.base;
      case "blast":
        return a.blast;
      case "burn":
        return a.burn;
      case "cleave":
        return a.cleave;
      case "hps":
        return a.heal;
      case "mps":
        return a.mana;
      case "dr":
        return a.dr;
      case "reflect":
        return a.reflect;
      default: {
        const _exhaustive = ch;
        return _exhaustive;
      }
    }
  }
  function actorUptimeRows(conditions, actorId, durationMs, now) {
    const byKey = {};
    for (let i = 0; i < conditions.length; i++) {
      const c = conditions[i];
      if (c.actorId !== actorId) continue;
      const end = c.endedAt != null ? c.endedAt : now;
      const ms = Math.max(0, end - c.startedAt);
      if (!byKey[c.key]) byKey[c.key] = { ms: 0, apps: 0 };
      byKey[c.key].ms += ms;
      byKey[c.key].apps += 1;
    }
    const dur = Math.max(durationMs, 1);
    const keys = Object.keys(byKey);
    const rows = [];
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const rec = byKey[k];
      rows.push({
        id: k,
        name: k,
        uptime: Math.min(1, rec.ms / dur),
        apps: rec.apps,
        activeMs: rec.ms
      });
    }
    rows.sort((a, b) => b.uptime - a.uptime || b.apps - a.apps);
    return rows;
  }
  function toRanked(items, durationMs, absolute, primary = "total") {
    let max = 0;
    let sum = 0;
    for (let i = 0; i < items.length; i++) {
      max = Math.max(max, items[i].value);
      sum += items[i].value;
    }
    if (!items.length || !(max > 0 || absolute)) return [];
    const sec = Math.max(durationMs / 1e3, 1);
    const withRate = items.map((it) => ({
      ...it,
      rate: absolute ? null : it.value / sec
    }));
    const sorted = primary === "rate" && !absolute ? withRate.slice().sort((a, b) => (b.rate || 0) - (a.rate || 0)) : withRate.slice().sort((a, b) => b.value - a.value);
    let barMax = max;
    if (primary === "rate" && !absolute) {
      barMax = 0;
      for (let i = 0; i < sorted.length; i++) {
        barMax = Math.max(barMax, sorted[i].rate || 0);
      }
    }
    const rows = [];
    for (let i = 0; i < sorted.length; i++) {
      const it = sorted[i];
      if (!(it.value > 0) && !absolute) continue;
      const rate = it.rate;
      const pct = sum > 0 ? it.value / sum : 0;
      let label;
      if (absolute) {
        label = `${(it.value * 100).toFixed(1)}%`;
      } else if (primary === "rate") {
        label = `${formatCompactRate(rate || 0)} (${formatCompactNumber(it.value)}) ${getPercent(pct, 3)}`;
      } else {
        label = `${formatCompactNumber(it.value)} (${formatCompactRate(rate || 0)}) ${getPercent(pct, 3)}`;
      }
      rows.push({
        id: it.id,
        name: it.name,
        ctype: it.ctype,
        value: it.value,
        rate,
        pct,
        barMax: barMax || 1,
        barValue: primary === "rate" && !absolute ? rate || 0 : void 0,
        label,
        kind: it.kind,
        you: it.you,
        splashDamage: it.splashDamage
      });
    }
    return rows;
  }
  function rankedPlayers(seg, metric, focus, now, primary = "total") {
    const actors = scopedActors(seg, focus);
    const you = getYouId();
    const items = actors.map((a) => ({
      id: a.id,
      name: a.name,
      ctype: a.ctype,
      value: actorMetric(a, metric),
      kind: "player",
      you: !!you && a.id === you
    }));
    const absolute = metric === "avoidance";
    return {
      kind: "ranked",
      rows: toRanked(
        items,
        segmentDurationMs(seg, now),
        absolute,
        absolute ? "total" : primary
      )
    };
  }
  function snapshotRows(mode, entities) {
    var _a, _b, _c, _d;
    if (mode === "pdps") {
      const players = playersList(entities).filter((p) => (p.pdps || 0) > 0).sort((a, b) => (b.pdps || 0) - (a.pdps || 0));
      let max2 = 0;
      for (let i = 0; i < players.length; i++) {
        max2 = Math.max(max2, players[i].pdps || 0);
      }
      const rows2 = [];
      for (let i = 0; i < players.length; i++) {
        const p = players[i];
        const value = p.pdps || 0;
        rows2.push({
          id: String(p.id),
          name: p.name || String(p.id),
          ctype: p.ctype,
          value,
          rate: null,
          pct: max2 > 0 ? value / max2 : 0,
          barMax: max2 || 1,
          label: value.toLocaleString(void 0, { maximumFractionDigits: 0 })
        });
      }
      return { kind: "ranked", rows: rows2 };
    }
    const ids = new Set(entities.map((e2) => String(e2.id)));
    const coop = entities.filter(
      (e2) => {
        var _a2, _b2, _c2, _d2;
        return e2.player && e2.type === "character" && (((_b2 = (_a2 = e2.s) == null ? void 0 : _a2.coop) == null ? void 0 : _b2.p) || 0) > 0 && ((_d2 = (_c2 = e2.s) == null ? void 0 : _c2.coop) == null ? void 0 : _d2.id) != null && ids.has(String(e2.s.coop.id));
      }
    ).sort((a, b) => {
      var _a2, _b2, _c2, _d2;
      return (((_b2 = (_a2 = b.s) == null ? void 0 : _a2.coop) == null ? void 0 : _b2.p) || 0) - (((_d2 = (_c2 = a.s) == null ? void 0 : _c2.coop) == null ? void 0 : _d2.p) || 0);
    });
    let max = 0;
    let total = 0;
    for (let i = 0; i < coop.length; i++) {
      const p = ((_b = (_a = coop[i].s) == null ? void 0 : _a.coop) == null ? void 0 : _b.p) || 0;
      max = Math.max(max, p);
      total += p;
    }
    const rows = [];
    for (let i = 0; i < coop.length; i++) {
      const player = coop[i];
      const value = ((_d = (_c = player.s) == null ? void 0 : _c.coop) == null ? void 0 : _d.p) || 0;
      const label = mode === "coop_v2" ? value.toFixed(2) : `${getPercent(total > 0 ? value / total : 0, 3)} | ${value.toLocaleString(void 0, { maximumFractionDigits: 0 })}`;
      rows.push({
        id: String(player.id),
        name: player.name || String(player.id),
        ctype: player.ctype,
        value,
        rate: null,
        pct: total > 0 ? value / total : 0,
        barMax: max || 1,
        label
      });
    }
    return { kind: "ranked", rows };
  }
  function rollingRanked(now) {
    const dmg = getActorDamage(now);
    const ids = Object.keys(dmg);
    const windowSec = getRollingWindowMs() / 1e3;
    const items = [];
    const meta = getEntitiesRecord();
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const ent = meta[id];
      items.push({
        id,
        name: (ent == null ? void 0 : ent.name) || id,
        ctype: ent == null ? void 0 : ent.ctype,
        value: dmg[id] / windowSec
      });
    }
    let max = 0;
    let sum = 0;
    for (let i = 0; i < items.length; i++) {
      max = Math.max(max, items[i].value);
      sum += items[i].value;
    }
    const sorted = items.slice().sort((a, b) => b.value - a.value);
    const rows = [];
    for (let i = 0; i < sorted.length; i++) {
      const it = sorted[i];
      if (!(it.value > 0)) continue;
      const pct = sum > 0 ? it.value / sum : 0;
      rows.push({
        id: it.id,
        name: it.name,
        ctype: it.ctype,
        value: it.value,
        rate: it.value,
        pct,
        barMax: max || 1,
        label: `${formatCompactRate(it.value)}/s ${getPercent(pct, 3)}`
      });
    }
    return { kind: "ranked", rows, title: "Hit DPS (10s)" };
  }
  function runMeterQuery(query, ctx = {}) {
    const now = ctx.now || Date.now();
    const focus = ctx.partyFocus;
    if (query.kind === "snapshot") {
      return snapshotRows(
        query.mode,
        ctx.entities || Object.values(getEntitiesRecord())
      );
    }
    if (query.kind === "rolling" || query.kind === "realtime") {
      return rollingRanked(now);
    }
    const seg = resolveSegment(ctx.segmentRef);
    if (!seg) return { kind: "empty", reason: "no segment" };
    const durationMs = segmentDurationMs(seg, now);
    switch (query.kind) {
      case "players":
        return rankedPlayers(
          seg,
          query.metric,
          focus,
          now,
          query.primary || "total"
        );
      case "abilities": {
        const actor = seg.actors[query.actorId];
        if (!actor) return { kind: "empty", reason: "no actor" };
        const metric = query.metric || "damage";
        const keys = Object.keys(actor.abilities);
        const items = keys.map((k) => {
          const ab = actor.abilities[k];
          return {
            id: k,
            name: k,
            value: abilityMetric(ab, metric),
            kind: "ability",
            splashDamage: ab.splashDamage
          };
        });
        return {
          kind: "ranked",
          rows: toRanked(items, durationMs, metric === "avoidance"),
          title: actor.name
        };
      }
      case "ability_targets": {
        const actor = seg.actors[query.actorId];
        const ab = actor == null ? void 0 : actor.abilities[query.ability];
        if (!ab) return { kind: "empty", reason: "no ability" };
        const metric = query.metric || "damage";
        const tKeys = Object.keys(ab.targets);
        const items = tKeys.map((tid) => {
          const t = ab.targets[tid];
          let value = 0;
          if (metric === "heal") value = t.heal;
          else if (metric === "avoidance") {
            const o = t.outcomes;
            const total = o.hits + o.miss + o.evade + o.avoid;
            value = total ? (o.miss + o.evade + o.avoid) / total : 0;
          } else value = t.damage;
          return {
            id: tid,
            name: t.name,
            value,
            kind: "target"
          };
        });
        return {
          kind: "ranked",
          rows: toRanked(items, durationMs, metric === "avoidance"),
          title: `${actor.name} \xB7 ${query.ability}`
        };
      }
      case "targets": {
        const actor = seg.actors[query.actorId];
        if (!actor) return { kind: "empty", reason: "no actor" };
        const metric = query.metric || "damage";
        const byTarget = {};
        const abKeys = Object.keys(actor.abilities);
        for (let i = 0; i < abKeys.length; i++) {
          const ab = actor.abilities[abKeys[i]];
          const tKeys = Object.keys(ab.targets);
          for (let t = 0; t < tKeys.length; t++) {
            const tg = ab.targets[tKeys[t]];
            if (!byTarget[tg.id]) {
              byTarget[tg.id] = {
                id: tg.id,
                name: tg.name,
                value: 0,
                kind: "target"
              };
            }
            byTarget[tg.id].value += metric === "heal" ? tg.heal : tg.damage;
          }
        }
        return {
          kind: "ranked",
          rows: toRanked(Object.values(byTarget), durationMs, false),
          title: `${actor.name} \xB7 targets`
        };
      }
      case "details": {
        const actor = seg.actors[query.actorId];
        if (!actor) return { kind: "empty", reason: "no actor" };
        const abKeys = Object.keys(actor.abilities);
        const abilityItems = abKeys.map((k) => ({
          id: k,
          name: k,
          // Prefer each ability's primary contribution (don't hide heals behind 0-damage).
          value: actor.abilities[k].damage >= actor.abilities[k].heal ? actor.abilities[k].damage : actor.abilities[k].heal,
          kind: "ability"
        }));
        const abilityRows = toRanked(abilityItems, durationMs, false);
        let abilityKey = query.ability;
        if (!abilityKey && abilityRows[0]) abilityKey = abilityRows[0].id;
        const ab = abilityKey ? actor.abilities[abilityKey] : void 0;
        const outcomes = ab ? ab.outcomes : actor.outcomes;
        const targetItems = ab ? Object.keys(ab.targets).map((tid) => {
          const t = ab.targets[tid];
          return {
            id: tid,
            name: t.name,
            value: t.damage >= t.heal ? t.damage : t.heal,
            kind: "target"
          };
        }) : [];
        let deathCount = 0;
        for (let i = 0; i < seg.deaths.length; i++) {
          if (seg.deaths[i].id === actor.id) deathCount += 1;
        }
        return {
          kind: "details",
          actorId: actor.id,
          actorName: actor.name,
          ctype: actor.ctype,
          ability: abilityKey,
          abilitySplash: ab ? ab.splashDamage : 0,
          outcomes,
          totals: {
            damage: actor.damage,
            heal: actor.heal,
            taken: actor.taken,
            healingRequired: actor.healingRequired
          },
          durationMs,
          abilityRows,
          uptimeRows: actorUptimeRows(seg.conditions, actor.id, durationMs, now),
          targetRows: toRanked(targetItems, durationMs, false),
          deaths: deathCount
        };
      }
      case "summary": {
        const actors = scopedActors(seg, focus);
        return {
          kind: "summary",
          matrix: actors.map((a) => ({
            id: a.id,
            name: a.name,
            damage: a.damage,
            heal: a.heal,
            taken: a.taken
          }))
        };
      }
      case "avoidance":
        return rankedPlayers(seg, "avoidance", focus, now);
      case "encounter_summary": {
        const actors = scopedActors(seg, focus);
        let totalDamage = 0;
        let totalHeal = 0;
        for (let i = 0; i < actors.length; i++) {
          totalDamage += actors[i].damage;
          totalHeal += actors[i].heal;
        }
        const dpsRows = rankedPlayers(seg, "damage", focus, now);
        return {
          kind: "encounter",
          durationMs,
          totalDamage,
          totalHeal,
          deaths: seg.deaths.length,
          topDps: dpsRows.kind === "ranked" && dpsRows.rows[0] ? dpsRows.rows[0] : void 0
        };
      }
      case "channel": {
        const actors = scopedActors(seg, focus);
        const items = actors.map((a) => ({
          id: a.id,
          name: a.name,
          ctype: a.ctype,
          value: channelValue(a, query.channel)
        }));
        return {
          kind: "ranked",
          rows: toRanked(items, durationMs, false)
        };
      }
      case "compare":
      case "history": {
        const points = getHistoryPoints();
        const seriesKeys = /* @__PURE__ */ new Set();
        const outPoints = [];
        for (let i = 0; i < points.length; i++) {
          const p = points[i];
          const values = {};
          const keys = Object.keys(p.values);
          for (let k = 0; k < keys.length; k++) {
            const id = keys[k];
            if (focus) {
              const live2 = getLiveSegment();
              const actor = live2 == null ? void 0 : live2.actors[id];
              if (actor && !playerInScope(actor, focus)) continue;
              if (!actor && focus !== "all" && focus !== "visible") {
                if (focus === "watched" && !isWatchedPartyMember(id)) continue;
              }
            }
            values[id] = p.values[id];
            seriesKeys.add(id);
          }
          outPoints.push({ at: p.at, values });
        }
        return {
          kind: "history",
          points: outPoints,
          seriesKeys: Array.from(seriesKeys)
        };
      }
      case "pie": {
        if (query.actorId) {
          const actor = seg.actors[query.actorId];
          if (!actor) return { kind: "empty", reason: "no actor" };
          const metric2 = query.metric || "damage";
          const keys = Object.keys(actor.abilities);
          const slices = keys.map((k) => {
            const ab = actor.abilities[k];
            return {
              id: k,
              name: k,
              value: abilityMetric(ab, metric2),
              color: classColors[actor.ctype || ""] || "#666"
            };
          });
          return { kind: "pie", slices: slices.filter((s) => s.value > 0) };
        }
        const actors = scopedActors(seg, focus);
        const metric = query.metric || "damage";
        return {
          kind: "pie",
          slices: actors.map((a) => ({
            id: a.id,
            name: a.name,
            value: actorMetric(a, metric),
            color: classColors[a.ctype || ""] || "#666"
          })).filter((s) => s.value > 0)
        };
      }
      case "death_log":
        return { kind: "death_log", deaths: seg.deaths.slice() };
      case "timeline":
        return {
          kind: "timeline",
          casts: seg.casts.slice(),
          conditions: seg.conditions.slice(),
          durationMs
        };
      case "conditions":
        return {
          kind: "timeline",
          casts: [],
          conditions: query.actorId ? seg.conditions.filter((c) => c.actorId === query.actorId) : seg.conditions.slice(),
          durationMs
        };
      case "misc": {
        const actors = scopedActors(seg, focus);
        const items = actors.map((a) => {
          const m = a.misc || { interrupts: 0, dispels: 0, deaths: 0 };
          let value = 0;
          if (query.metric === "interrupts") value = m.interrupts;
          else if (query.metric === "dispels") value = m.dispels;
          else if (query.metric === "deaths") value = m.deaths;
          else if (query.metric === "cc_breaks") {
            value = Object.keys(a.abilities).reduce((sum, k) => {
              if (INTERRUPT_ABILITY_KEYS.has(k)) return sum + 1;
              return sum;
            }, 0);
          }
          return {
            id: a.id,
            name: a.name,
            value,
            ctype: a.ctype,
            kind: "player"
          };
        });
        const labels = {
          interrupts: "Interrupts",
          dispels: "Dispels",
          deaths: "Deaths",
          cc_breaks: "CC Breaks"
        };
        return {
          kind: "ranked",
          rows: toRanked(
            items.filter((it) => it.value > 0),
            durationMs,
            true
          ),
          title: labels[query.metric] || query.metric
        };
      }
      default: {
        const _exhaustive = query;
        return { kind: "empty", reason: String(_exhaustive) };
      }
    }
  }
  function segmentTitle(ref) {
    const r = ref || "current";
    if (r === "total") return "Overall";
    if (typeof r === "object") {
      const seg = resolveSegment(r);
      return (seg == null ? void 0 : seg.label) || (seg == null ? void 0 : seg.id) || "Past";
    }
    void isMeterInCombat();
    return "Current";
  }

  // src/ui/hooks/useContextualTourTriggers.ts
  var TRIGGERS = [
    {
      id: "meters",
      delayMs: 350,
      when: (ctx, prev) => prev != null && ctx.meterCount > prev.meterCount
    },
    {
      id: "inspect",
      delayMs: 250,
      when: (ctx, prev) => !!ctx.selectedEntity && !(prev == null ? void 0 : prev.selectedEntity)
    },
    {
      id: "combat",
      delayMs: 450,
      when: (ctx, prev) => {
        const now = combatSignals(ctx.entities).inCombat;
        const was = prev ? combatSignals(prev.entities).inCombat : false;
        return now && !was;
      }
    },
    {
      id: "coop",
      delayMs: 500,
      oncePerSession: true,
      when: (ctx) => {
        if (isTourCompleted("coop")) return false;
        if (!hasVisibleCoopMeter(ctx.meterInstances)) return false;
        for (let i = 0; i < ctx.meterInstances.length; i++) {
          const inst = ctx.meterInstances[i];
          if (inst.visible === false) continue;
          const q = inst.query;
          if (q.kind !== "snapshot") continue;
          if (q.mode !== "coop_v1" && q.mode !== "coop_v2") continue;
          const peek = runMeterQuery(q, {
            entities: ctx.entities,
            partyFocus: inst.partyFocus,
            segmentRef: inst.selectedset
          });
          if (peek.kind === "ranked" && peek.rows.length > 0) return true;
        }
        return false;
      }
    }
  ];
  function scheduleContextualTour(pending, id, delayMs) {
    if (pending.has(id)) return;
    if (isTourCompleted(id)) return;
    pending.add(id);
    tryContextualTour(id, delayMs);
    window.setTimeout(() => pending.delete(id), delayMs + 120);
  }
  function useContextualTourTriggers(ctx) {
    const React = getReact();
    const prevRef = React.useRef(null);
    const onceFiredRef = React.useRef(/* @__PURE__ */ new Set());
    const pendingRef = React.useRef(/* @__PURE__ */ new Set());
    React.useEffect(() => {
      const prev = prevRef.current;
      for (let i = 0; i < TRIGGERS.length; i++) {
        const t = TRIGGERS[i];
        if (t.oncePerSession && onceFiredRef.current.has(t.id)) continue;
        if (!t.when(ctx, prev)) continue;
        if (t.oncePerSession) onceFiredRef.current.add(t.id);
        scheduleContextualTour(pendingRef.current, t.id, t.delayMs);
      }
      prevRef.current = {
        selectedEntity: ctx.selectedEntity,
        meterCount: ctx.meterCount,
        entities: ctx.entities,
        meterInstances: ctx.meterInstances
      };
    }, [ctx.selectedEntity, ctx.meterCount, ctx.entities, ctx.meterInstances]);
  }
  function triggerMeterToolbarTour() {
    tryContextualTour("meter-toolbar", 200);
  }

  // src/meters/meterWindowGroup.ts
  function oppositeSnapSide(side) {
    if (side === 1) return 3;
    if (side === 3) return 1;
    if (side === 2) return 4;
    return 2;
  }
  function emptySnap() {
    return {};
  }
  function meterHasSnap(inst) {
    const s = inst.snap;
    if (!s) return false;
    return !!(s[1] || s[2] || s[3] || s[4]);
  }
  function refreshSnapFlags(inst) {
    if (!meterHasSnap(inst)) {
      const next = { ...inst };
      delete next.horizontalSnap;
      delete next.verticalSnap;
      return next;
    }
    const s = inst.snap || {};
    const horizontal = !!(s[1] || s[3]);
    const vertical = !!(s[2] || s[4]);
    return {
      ...inst,
      horizontalSnap: horizontal || void 0,
      verticalSnap: vertical || void 0
    };
  }
  function applyGroupFrameSize(instances, resizedId, size) {
    const source = instances.find((m) => m.id === resizedId);
    if (!source) return instances;
    if (!meterHasSnap(source)) {
      return instances.map((m) => m.id === resizedId ? { ...m, ...size } : m);
    }
    const group = getMeterGroup(instances, resizedId);
    const ids = new Set(group.map((g) => g.id));
    const snap = source.snap || {};
    const shareH = !!source.horizontalSnap || !!(snap[1] || snap[3]);
    const shareW = !!source.verticalSnap || !!(snap[2] || snap[4]);
    return instances.map((m) => {
      if (!ids.has(m.id)) return m;
      const next = { ...m };
      if (size.frameW != null) {
        if (shareW) next.frameW = size.frameW;
        else if (m.id === resizedId) next.frameW = size.frameW;
      }
      if (size.frameH != null) {
        if (shareH) next.frameH = size.frameH;
        else if (m.id === resizedId) next.frameH = size.frameH;
      }
      return next;
    });
  }
  function getMeterGroup(instances, startId) {
    const byId = {};
    for (let i = 0; i < instances.length; i++) {
      byId[instances[i].id] = instances[i];
    }
    const start = byId[startId];
    if (!start) return [];
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    const queue = [startId];
    while (queue.length) {
      const id = queue.shift();
      if (seen.has(id)) continue;
      seen.add(id);
      const inst = byId[id];
      if (!inst) continue;
      out.push(inst);
      const snap = inst.snap || {};
      const sides = [1, 2, 3, 4];
      for (let i = 0; i < sides.length; i++) {
        const nid = snap[sides[i]];
        if (nid && !seen.has(nid)) queue.push(nid);
      }
    }
    return out;
  }
  function ungroupMeter(instances, id) {
    return instances.map((m) => {
      if (m.id === id) {
        return refreshSnapFlags({ ...m, snap: emptySnap() });
      }
      const snap = m.snap;
      if (!snap) return m;
      const next = { ...snap };
      let changed = false;
      const sides = [1, 2, 3, 4];
      for (let i = 0; i < sides.length; i++) {
        const side = sides[i];
        if (next[side] === id) {
          delete next[side];
          changed = true;
        }
      }
      return changed ? refreshSnapFlags({ ...m, snap: next }) : m;
    });
  }
  function groupMeters(instances, aId, bId, sideOnA) {
    if (aId === bId) return instances;
    const opp = oppositeSnapSide(sideOnA);
    return instances.map((m) => {
      if (m.id === aId) {
        const snap = { ...m.snap || {} };
        snap[sideOnA] = bId;
        return { ...m, snap };
      }
      if (m.id === bId) {
        const snap = { ...m.snap || {} };
        snap[opp] = aId;
        return { ...m, snap };
      }
      return m;
    });
  }
  function moveMeterGroup(instances, movedId, newPos) {
    const byId = {};
    for (let i = 0; i < instances.length; i++) {
      byId[instances[i].id] = instances[i];
    }
    const moved = byId[movedId];
    if (!moved) return instances;
    const old = moved.pos;
    const dx = newPos.x - old.x;
    const dy = newPos.y - old.y;
    if (dx === 0 && dy === 0) {
      return instances.map(
        (m) => m.id === movedId ? { ...m, pos: { ...newPos } } : m
      );
    }
    const group = getMeterGroup(instances, movedId);
    if (group.length <= 1) {
      return instances.map(
        (m) => m.id === movedId ? { ...m, pos: { ...newPos } } : m
      );
    }
    const groupIds = new Set(group.map((g) => g.id));
    return instances.map((m) => {
      if (!groupIds.has(m.id)) return m;
      if (m.id === movedId) return { ...m, pos: { ...newPos } };
      if ((m.pos.anchor || "tl") !== (newPos.anchor || old.anchor || "tl")) {
        return m;
      }
      return {
        ...m,
        pos: {
          ...m.pos,
          x: m.pos.x + dx,
          y: m.pos.y + dy
        }
      };
    });
  }
  function matchGroupHeight(instances, id, height) {
    const group = getMeterGroup(instances, id);
    if (group.length <= 1) {
      return instances.map((m) => m.id === id ? { ...m, frameH: height } : m);
    }
    const ids = new Set(group.map((g) => g.id));
    return instances.map((m) => ids.has(m.id) ? { ...m, frameH: height } : m);
  }
  var DEFAULT_SNAP_PX = 36;
  var GROUP_GAP_PX = 0;
  function findEdgeSnapCandidate(selfId, selfRect, others, thresholdPx = DEFAULT_SNAP_PX) {
    let best = null;
    let bestScore = Infinity;
    for (let i = 0; i < others.length; i++) {
      const o = others[i];
      if (o.id === selfId) continue;
      const r = o.rect;
      const candidates = [
        {
          side: 3,
          gap: Math.abs(selfRect.right - r.left),
          align: Math.abs(selfRect.top - r.top)
        },
        {
          side: 1,
          gap: Math.abs(selfRect.left - r.right),
          align: Math.abs(selfRect.top - r.top)
        },
        {
          side: 2,
          gap: Math.abs(selfRect.bottom - r.top),
          align: Math.abs(selfRect.left - r.left)
        },
        {
          side: 4,
          gap: Math.abs(selfRect.top - r.bottom),
          align: Math.abs(selfRect.left - r.left)
        }
      ];
      for (let c = 0; c < candidates.length; c++) {
        const cand = candidates[c];
        if (cand.gap > thresholdPx || cand.align > 80) continue;
        const score = cand.gap + cand.align * 0.25;
        if (score < bestScore) {
          bestScore = score;
          best = { otherId: o.id, sideOnSelf: cand.side, gap: score };
        }
      }
    }
    return best;
  }
  function nudgePosByPixels(pos, dxPx, dyPx, rootW, rootH) {
    const ax = pos.anchor || "tl";
    const dxPct = rootW > 0 ? dxPx / rootW * 100 : 0;
    const dyPct = rootH > 0 ? dyPx / rootH * 100 : 0;
    let x = pos.x;
    let y = pos.y;
    if (ax === "tr" || ax === "br") x -= dxPct;
    else if (ax === "tc" || ax === "bc" || ax === "center") x += dxPct;
    else x += dxPct;
    if (ax === "bl" || ax === "br" || ax === "bc") y -= dyPct;
    else if (ax === "center") y += dyPct;
    else y += dyPct;
    return {
      ...pos,
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    };
  }
  function attachMeterEdge(instances, selfId, otherId, sideOnSelf, selfRect, otherRect, rootW, rootH) {
    let dx = 0;
    let dy = 0;
    if (sideOnSelf === 3) {
      dx = otherRect.left - GROUP_GAP_PX - selfRect.right;
      dy = otherRect.top - selfRect.top;
    } else if (sideOnSelf === 1) {
      dx = otherRect.right + GROUP_GAP_PX - selfRect.left;
      dy = otherRect.top - selfRect.top;
    } else if (sideOnSelf === 2) {
      dy = otherRect.top - GROUP_GAP_PX - selfRect.bottom;
      dx = otherRect.left - selfRect.left;
    } else {
      dy = otherRect.bottom + GROUP_GAP_PX - selfRect.top;
      dx = otherRect.left - selfRect.left;
    }
    const byId = {};
    for (let i = 0; i < instances.length; i++)
      byId[instances[i].id] = instances[i];
    const self = byId[selfId];
    const other = byId[otherId];
    if (!self || !other) return instances;
    const alignedPos = nudgePosByPixels(self.pos, dx, dy, rootW, rootH);
    const matchH = sideOnSelf === 1 || sideOnSelf === 3;
    const h = matchH ? other.frameH || self.frameH || Math.round(otherRect.bottom - otherRect.top) : self.frameH;
    let next = instances.map((m) => {
      if (m.id !== selfId) return m;
      return {
        ...m,
        pos: alignedPos,
        frameH: h != null ? h : m.frameH
      };
    });
    next = groupMeters(next, selfId, otherId, sideOnSelf);
    if (matchH && h != null) next = matchGroupHeight(next, selfId, h);
    return next.map(refreshSnapFlags);
  }
  function isMeterSnapPeer(inst) {
    if (inst.visible === false) return false;
    if (inst.presentation === "details" || inst.presentation === "death_log" || inst.presentation === "encounter" || inst.presentation === "timeline") {
      return false;
    }
    return true;
  }
  function meterSnapPeerRects(instances, selfId) {
    if (typeof document === "undefined") return [];
    const others = [];
    for (let i = 0; i < instances.length; i++) {
      const m = instances[i];
      if (m.id === selfId || !isMeterSnapPeer(m)) continue;
      const el = document.querySelector(
        `.comm-pos-panel.comm-pos-${cssEscape(m.id)}`
      );
      if (!el) continue;
      others.push({ id: m.id, rect: el.getBoundingClientRect() });
    }
    return others;
  }
  function findMeterSnapPreviewTarget(instances, selfId, thresholdPx = DEFAULT_SNAP_PX) {
    if (typeof document === "undefined") return null;
    const selfEl = document.querySelector(
      `.comm-pos-panel.comm-pos-${cssEscape(selfId)}`
    );
    if (!selfEl) return null;
    const selfRect = selfEl.getBoundingClientRect();
    const others = meterSnapPeerRects(instances, selfId);
    const cand = findEdgeSnapCandidate(selfId, selfRect, others, thresholdPx);
    return cand ? cand.otherId : null;
  }
  function trySnapMeterOnDrop(instances, selfId, thresholdPx = DEFAULT_SNAP_PX) {
    if (typeof document === "undefined") return instances;
    const selfEl = document.querySelector(
      `.comm-pos-panel.comm-pos-${cssEscape(selfId)}`
    );
    if (!selfEl) return instances;
    const selfRect = selfEl.getBoundingClientRect();
    const others = meterSnapPeerRects(instances, selfId);
    const cand = findEdgeSnapCandidate(selfId, selfRect, others, thresholdPx);
    if (!cand) return instances;
    const peer = others.find((o) => o.id === cand.otherId);
    if (!peer) return instances;
    const rootEl = typeof document !== "undefined" && (document.getElementById("comm-ui") || document.getElementById("game") || document.body) || null;
    const root = rootEl ? rootEl.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
    return attachMeterEdge(
      instances,
      selfId,
      cand.otherId,
      cand.sideOnSelf,
      selfRect,
      peer.rect,
      root.width || window.innerWidth,
      root.height || window.innerHeight
    );
  }
  function cssEscape(id) {
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
      return CSS.escape(id);
    }
    return id.replace(/([^a-zA-Z0-9_-])/g, "\\$1");
  }
  function pinAlwaysShowSelf(rows, maxRows, youId2, enabled) {
    const capped = maxRows > 0 ? maxRows : rows.length;
    if (!enabled || !youId2 || rows.length <= capped) {
      return rows.slice(0, capped).map((r, i) => r.rank != null ? r : { ...r, rank: i + 1 });
    }
    const ranked = rows.map(
      (r, i) => r.rank != null ? r : { ...r, rank: i + 1 }
    );
    let youIdx = -1;
    for (let i = 0; i < ranked.length; i++) {
      if (ranked[i].id === youId2) {
        youIdx = i;
        break;
      }
    }
    if (youIdx < 0 || youIdx < capped) return ranked.slice(0, capped);
    const out = ranked.slice(0, capped - 1);
    out.push(ranked[youIdx]);
    return out;
  }
  function maxRowsForFrameHeight(frameH) {
    const h = frameH && frameH > 0 ? frameH : 180;
    const chrome = 52;
    const row2 = 16;
    return Math.max(3, Math.floor((h - chrome) / row2));
  }

  // src/lib/frameSizes.ts
  var BAG_FRAME_WIDTH = 385;
  var BAG_FRAME_HEIGHT = 395;
  var BAG_SYNC_CHROME_HEIGHT = 30;
  var BAG_PANEL_STYLE = {
    // minWidth floor only — fixed width + inventory host borders wraps slots.
    minWidth: BAG_FRAME_WIDTH,
    minHeight: BAG_FRAME_HEIGHT + BAG_SYNC_CHROME_HEIGHT,
    boxSizing: "border-box"
  };
  var PAPERDOLL_FRAME_WIDTH = 268;
  var PAPERDOLL_PANEL_STYLE = {
    width: "fit-content",
    maxWidth: "340px",
    boxSizing: "border-box",
    // Above buffInfo/itemInfo (z=35) so gear stays clickable while Item info is open.
    zIndex: 36
  };
  var BOSS_BAR_PANEL_STYLE = {
    width: "min(520px, 72vw)",
    minWidth: "min(360px, 92vw)",
    boxSizing: "border-box"
  };
  var CRYPT_PANEL_STYLE = {
    width: "fit-content",
    maxWidth: "min(720px, 96vw)",
    minWidth: "200px",
    boxSizing: "border-box"
  };
  var THREAT_PANEL_STYLE = {
    minWidth: "240px",
    width: "min(320px, 92vw)",
    minHeight: "120px",
    boxSizing: "border-box"
  };
  var COMMAND_PANEL_STYLE = {
    width: "min(560px, 94vw)",
    minHeight: "220px",
    boxSizing: "border-box"
  };
  var METER_PANEL_STYLE = {
    width: "320px",
    minWidth: "240px",
    minHeight: "140px",
    boxSizing: "border-box"
  };
  var METER_FRAME_DEFAULT = { w: 320, h: 200 };
  var REPORT_FRAME_DEFAULT = { w: 480, h: 320 };
  var METER_FRAME_MIN = { w: 240, h: 140 };
  var METER_FRAME_MAX = { w: 720, h: 560 };
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

  // src/ui/hooks/useCommMeterInstances.ts
  function useCommMeterInstances(layout) {
    const React = getReact();
    const [meterInstances, setMeterInstances] = React.useState(
      () => getSettings().meterInstances
    );
    const [meterSnapDragId, setMeterSnapDragId] = React.useState(
      null
    );
    const [meterSnapPeerId, setMeterSnapPeerId] = React.useState(
      null
    );
    const [metersLocked, setMetersLocked] = React.useState(
      () => getSettings().metersLocked !== false
    );
    const [closedMeters, setClosedMeters] = React.useState(
      () => getSettings().meterClosedInstances || []
    );
    const [altHeld, setAltHeld] = React.useState(false);
    const meterInstancesRef = React.useRef(meterInstances);
    meterInstancesRef.current = meterInstances;
    const setMetersLockedPersist = (locked) => {
      setMetersLocked(locked);
      patchSettings({ metersLocked: locked });
    };
    React.useEffect(() => {
      const onDown = (ev) => {
        if (ev.key === "Alt") setAltHeld(true);
      };
      const onUp = (ev) => {
        if (ev.key === "Alt") setAltHeld(false);
      };
      const onBlur = () => setAltHeld(false);
      window.addEventListener("keydown", onDown);
      window.addEventListener("keyup", onUp);
      window.addEventListener("blur", onBlur);
      return () => {
        window.removeEventListener("keydown", onDown);
        window.removeEventListener("keyup", onUp);
        window.removeEventListener("blur", onBlur);
      };
    }, []);
    const peerLayout = { ...layout };
    for (let i = 0; i < meterInstances.length; i++) {
      peerLayout[meterInstances[i].id] = meterInstances[i].pos;
    }
    const meterIsLocked = (inst) => {
      if (typeof inst.locked === "boolean") return inst.locked;
      return metersLocked;
    };
    const patchMeter = (id, partial) => {
      setMeterInstances((prev) => {
        let next = prev.map((m) => m.id === id ? { ...m, ...partial } : m);
        if (partial.selectedset != null && getMeterAppearance().segmentsLocked) {
          next = next.map((m) => ({ ...m, selectedset: partial.selectedset }));
        }
        patchSettings({ meterInstances: next });
        return next;
      });
    };
    const closeMeterRuntime = (id) => {
      setMeterInstances((prev) => {
        const inst = prev.find((m) => m.id === id);
        if (!inst) return prev;
        const next = prev.filter((m) => m.id !== id);
        const closed = (getSettings().meterClosedInstances || []).concat([inst]);
        patchSettings({ meterInstances: next, meterClosedInstances: closed });
        setClosedMeters(closed);
        return next;
      });
    };
    const reopenClosedMeter = (id) => {
      const closed = (getSettings().meterClosedInstances || []).slice();
      let inst = null;
      for (let i = 0; i < closed.length; i++) {
        if (closed[i].id === id) {
          inst = closed[i];
          closed.splice(i, 1);
          break;
        }
      }
      if (!inst) return;
      setClosedMeters(closed);
      setMeterInstances((prev) => {
        const next = prev.concat([{ ...inst, visible: true }]);
        patchSettings({ meterInstances: next, meterClosedInstances: closed });
        return next;
      });
    };
    const moveMeterWithGroup = (id, pos) => {
      setMeterInstances((prev) => {
        const next = moveMeterGroup(prev, id, pos);
        patchSettings({ meterInstances: next });
        return next;
      });
    };
    const snapMeterAfterMove = (id) => {
      setMeterSnapDragId(null);
      setMeterSnapPeerId(null);
      if (getSettings().meterWindowGrouping === false) return;
      if (getMeterAppearance().disableGrouping) return;
      setMeterInstances((prev) => {
        const next = trySnapMeterOnDrop(prev, id);
        if (next === prev) return prev;
        const a = prev.find((m) => m.id === id);
        const b = next.find((m) => m.id === id);
        if (a && b && a.pos.x === b.pos.x && a.pos.y === b.pos.y && JSON.stringify(a.snap || {}) === JSON.stringify(b.snap || {})) {
          return prev;
        }
        patchSettings({ meterInstances: next });
        return next;
      });
    };
    const onMeterDragStart = (id) => {
      setMeterSnapDragId(id);
      setMeterSnapPeerId(null);
    };
    const onMeterDragMove = (id) => {
      if (getSettings().meterWindowGrouping === false) {
        setMeterSnapPeerId(null);
        return;
      }
      setMeterSnapPeerId(findMeterSnapPreviewTarget(meterInstances, id));
    };
    const ungroupMeterPanel = (id) => {
      setMeterInstances((prev) => {
        const next = ungroupMeter(prev, id);
        patchSettings({ meterInstances: next });
        return next;
      });
    };
    const meterDragRefs = React.useRef(
      {}
    );
    const dragRefFor = (id) => {
      if (!meterDragRefs.current[id]) {
        meterDragRefs.current[id] = { current: null };
      }
      return meterDragRefs.current[id];
    };
    const focusInspector = (actorId, name) => {
      if (!actorId) return;
      setMeterInstances((prev) => {
        var _a, _b;
        for (let i = 0; i < prev.length; i++) {
          const m = prev[i];
          if (m.query.kind === "details" && m.query.actorId === actorId && m.visible !== false) {
            return prev;
          }
        }
        const preset = presetById("inspector");
        if (!preset) return prev;
        let n = 0;
        for (let i = 0; i < prev.length; i++) {
          if (prev[i].presentation === "details" || prev[i].query.kind === "details") {
            n += 1;
          }
        }
        const inst = instanceFromPreset(preset, {
          id: `meter-inspector-${Date.now().toString(36)}`,
          pos: {
            x: Math.min(92, 42 + n % 6 * 5),
            y: Math.min(82, 48 + n % 5 * 5),
            anchor: "bc"
          },
          query: { kind: "details", actorId },
          presentation: "details",
          label: `Inspector \xB7 ${name}`,
          visible: true,
          frameW: ((_a = preset.defaultFrame) == null ? void 0 : _a.w) || 560,
          frameH: ((_b = preset.defaultFrame) == null ? void 0 : _b.h) || 400
        });
        const next = prev.concat([inst]);
        patchSettings({ meterInstances: next });
        return next;
      });
    };
    const focusReport = (kind, from) => {
      const tab = reportTabByKind(kind);
      setMeterInstances((prev) => {
        var _a, _b;
        for (let i = 0; i < prev.length; i++) {
          if (!isReportPresentation(prev[i].presentation)) continue;
          const next2 = prev.map((m, j) => {
            if (j !== i) return m;
            return {
              ...m,
              presentation: tab.presentation,
              query: { ...tab.query },
              label: tab.label,
              visible: true,
              selectedset: (from == null ? void 0 : from.selectedset) != null ? from.selectedset : m.selectedset,
              partyFocus: (from == null ? void 0 : from.partyFocus) != null ? from.partyFocus : m.partyFocus
            };
          });
          patchSettings({ meterInstances: next2 });
          return next2;
        }
        const preset = presetById(tab.presetId);
        if (!preset) return prev;
        const inst = instanceFromPreset(preset, {
          id: `meter-report-${Date.now().toString(36)}`,
          pos: { x: 50, y: 88, anchor: "bc" },
          query: { ...tab.query },
          presentation: tab.presentation,
          label: tab.label,
          visible: true,
          selectedset: (from == null ? void 0 : from.selectedset) || "current",
          partyFocus: (from == null ? void 0 : from.partyFocus) || "watched",
          frameW: ((_a = preset.defaultFrame) == null ? void 0 : _a.w) || REPORT_FRAME_DEFAULT.w,
          frameH: ((_b = preset.defaultFrame) == null ? void 0 : _b.h) || REPORT_FRAME_DEFAULT.h
        });
        const next = prev.concat([inst]);
        patchSettings({ meterInstances: next });
        return next;
      });
    };
    const addMeterFromPreset = (presetId) => {
      const preset = presetById(presetId);
      if (!preset) return;
      const inst = instanceFromPreset(preset, {
        pos: {
          x: 40 + Math.random() * 20,
          y: 40 + Math.random() * 20,
          anchor: "center"
        }
      });
      setMeterInstances((prev) => {
        const next = prev.concat([inst]);
        patchSettings({ meterInstances: next });
        return next;
      });
    };
    const duplicateMeter = (id) => {
      setMeterInstances((prev) => {
        let src = null;
        for (let i = 0; i < prev.length; i++) {
          if (prev[i].id === id) {
            src = prev[i];
            break;
          }
        }
        if (!src) return prev;
        const copy = {
          ...src,
          id: `meter-dup-${Date.now().toString(36)}`,
          pos: {
            ...src.pos,
            x: Math.min(98, src.pos.x + 3),
            y: Math.min(98, src.pos.y + 3)
          }
        };
        const next = prev.concat([copy]);
        patchSettings({ meterInstances: next });
        return next;
      });
    };
    const removeMeter = (id) => {
      setMeterInstances((prev) => {
        const next = prev.filter((m) => m.id !== id);
        patchSettings({ meterInstances: next });
        return next;
      });
    };
    const applyAllSegments = (ref) => {
      setMeterInstances((prev) => {
        const next = prev.map((m) => ({ ...m, selectedset: ref }));
        patchSettings({ meterInstances: next });
        return next;
      });
    };
    const resetMetersFromSettings = () => {
      const next = resetMeterInstances();
      setMeterInstances(next.meterInstances);
      setMetersLockedPersist(next.metersLocked !== false);
    };
    return {
      meterInstances,
      meterInstancesRef,
      closedMeters,
      metersLocked,
      altHeld,
      meterSnapDragId,
      meterSnapPeerId,
      peerLayout,
      meterIsLocked,
      dragRefFor,
      patchMeter,
      closeMeterRuntime,
      reopenClosedMeter,
      moveMeterWithGroup,
      snapMeterAfterMove,
      onMeterDragStart,
      onMeterDragMove,
      ungroupMeterPanel,
      focusInspector,
      focusReport,
      addMeterFromPreset,
      duplicateMeter,
      removeMeter,
      applyAllSegments,
      setMeterInstances,
      setMetersLockedPersist,
      resetMetersFromSettings
    };
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
    const [bagRefreshing2, setBagRefreshing2] = React.useState(
      () => isBagRefreshing()
    );
    React.useEffect(() => {
      const unsubInv = subscribeInventory((open) => {
        setBagOpen(open);
        if (!isBagRefreshing()) {
          saveSettings({ bagOpenPreferred: open });
        }
        if (open) {
          setPanelVisible((prev) => {
            if (prev.bag !== false) return prev;
            savePanelVisible("bag", true);
            return { ...prev, bag: true };
          });
        }
      });
      const unsubSync = subscribeBagSync(() => {
        setBagRefreshing2(isBagRefreshing());
      });
      return () => {
        unsubInv();
        unsubSync();
      };
    }, [setPanelVisible]);
    return { bagOpen, bagRefreshing: bagRefreshing2 };
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
  function getTint(selector) {
    if (typeof window.get_tint === "function") {
      return window.get_tint(selector) || null;
    }
    return null;
  }
  function rebindTint(selector) {
    const tint = getTint(selector);
    if (tint) tint.added = false;
  }
  function setXTarget(entity, opts) {
    window.xtarget = entity || null;
    window.__ecuDialogOnlyXTarget = !!(opts && opts.dialogOnly && entity);
  }
  function slotSkin(slot) {
    var _a, _b;
    if (!slot || !slot.name) return void 0;
    const def = (_b = (_a = window.G) == null ? void 0 : _a.items) == null ? void 0 : _b[slot.name];
    return slot.skin || (def == null ? void 0 : def.skin);
  }
  function monsterSprite(mtype, opts) {
    var _a;
    if (!mtype || typeof window.sprite !== "function") return "";
    const size = (_a = opts == null ? void 0 : opts.size) != null ? _a : 22;
    return window.sprite(mtype, {
      scale: size / 40,
      width: size,
      height: size,
      overflow: true
    }) || "";
  }

  // src/ui/hooks/useSelectionFromXTarget.ts
  function maybeFocusPlayerId(id) {
    if (id == null || id === "") return void 0;
    const ent = findEntityById(id);
    if (!isFocusablePlayer(ent)) return void 0;
    return String(id);
  }
  function useSelectionFromXTarget(snap) {
    const React = getReact();
    const [selectedEntity, setSelectedEntityState] = React.useState(
      void 0
    );
    const [focusUnitId, setFocusUnitId] = React.useState(
      void 0
    );
    const lastXTargetId = React.useRef(void 0);
    const isObserving = snap.observingId != null && snap.observingId !== "";
    const setSelectedEntity = (id) => {
      setSelectedEntityState(id);
      if (id == null || id === "") {
        setFocusUnitId(void 0);
        return;
      }
      if (isObserving) return;
      const focusId = maybeFocusPlayerId(id);
      if (focusId) setFocusUnitId(focusId);
    };
    React.useEffect(() => {
      if (!isObserving) return;
      setFocusUnitId(void 0);
    }, [isObserving]);
    React.useEffect(() => {
      if (window.__ecuDialogOnlyXTarget) return;
      const xt = window.xtarget;
      const id = xt && xt.id != null ? String(xt.id) : void 0;
      if (id && id !== lastXTargetId.current) {
        lastXTargetId.current = id;
        setSelectedEntityState(id);
        if (!isObserving) {
          const focusId = maybeFocusPlayerId(id);
          if (focusId) setFocusUnitId(focusId);
        }
      } else if (!id && lastXTargetId.current) {
        lastXTargetId.current = void 0;
      }
    }, [snap.now, snap.entities, isObserving]);
    const clearFocus = () => {
      setFocusUnitId(void 0);
    };
    const closePaperdoll = () => {
      setSelectedEntityState(void 0);
      lastXTargetId.current = void 0;
      setFocusUnitId(void 0);
      setXTarget(null);
    };
    return {
      selectedEntity,
      setSelectedEntity,
      closePaperdoll,
      focusUnitId,
      clearFocus
    };
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
      if (isPanelPos(panelSrc.infoDialog)) {
        map.buffInfo = panelSrc.infoDialog;
        if (!isPanelPos(panelSrc.itemInfo)) {
          const legacy = panelSrc.infoDialog;
          map.itemInfo = {
            x: Math.min(100, legacy.x + 16),
            y: legacy.y,
            anchor: legacy.anchor
          };
        }
      }
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

  // src/lib/layoutGrid.ts
  var LAYOUT_GRID_STEP = 5;
  var LAYOUT_GRID_STEP_PRESETS = [1, 2.5, 5, 10, 25];
  var EPS = 1e-6;
  var TIER_RANK = {
    fine: 1,
    medium: 2,
    coarse: 3,
    edge: 4
  };
  function normalizeGridStep(raw) {
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(n) || n <= 0 || n > 50) return LAYOUT_GRID_STEP;
    for (let i = 0; i < LAYOUT_GRID_STEP_PRESETS.length; i++) {
      if (Math.abs(LAYOUT_GRID_STEP_PRESETS[i] - n) < EPS) {
        return LAYOUT_GRID_STEP_PRESETS[i];
      }
    }
    const rounded = Math.round(n * 2) / 2;
    return Math.max(0.5, Math.min(50, rounded));
  }
  function squareGridCellPx(step, widthPx, heightPx) {
    const s = normalizeGridStep(step);
    const minSide = Math.min(Math.max(1, widthPx), Math.max(1, heightPx));
    return Math.max(1, minSide * s / 100);
  }
  function snapPxToGridCell(px, cellPx) {
    const cell = Math.max(1, cellPx);
    if (!Number.isFinite(px)) return cell;
    return Math.round(px / cell) * cell;
  }
  function snapFrameSizeToGrid(w, h, step, widthPx, heightPx) {
    const cell = squareGridCellPx(step, widthPx, heightPx);
    return {
      w: snapPxToGridCell(w, cell),
      h: snapPxToGridCell(h, cell)
    };
  }
  function squareGridAxisPercents(lengthPx, cellPx) {
    const len = Math.max(1, lengthPx);
    const cell = Math.max(1, cellPx);
    const out = [];
    const count = Math.ceil(len / cell);
    for (let i = 0; i <= count; i++) {
      const px = Math.min(len, i * cell);
      const pct = Math.round(px / len * 1e5) / 1e3;
      if (!out.length || Math.abs(out[out.length - 1] - pct) > EPS) {
        out.push(pct > 100 - EPS ? 100 : pct);
      }
    }
    if (!out.length || Math.abs(out[out.length - 1] - 100) > EPS) out.push(100);
    return out;
  }
  function squareGridMetrics(step, widthPx, heightPx) {
    const cellPx = squareGridCellPx(step, widthPx, heightPx);
    return {
      cellPx,
      xPercents: squareGridAxisPercents(widthPx, cellPx),
      yPercents: squareGridAxisPercents(heightPx, cellPx)
    };
  }
  function bumpTier(into, percents, tier) {
    for (let i = 0; i < percents.length; i++) {
      const pct = percents[i];
      const key = Math.round(pct * 1e3) / 1e3;
      const prev = into.get(key);
      if (!prev || TIER_RANK[tier] > TIER_RANK[prev]) into.set(key, tier);
    }
  }
  function mapToSortedLines(map) {
    const keys = Array.from(map.keys());
    keys.sort((a, b) => a - b);
    const out = [];
    for (let i = 0; i < keys.length; i++) {
      const pct = keys[i];
      out.push({ pct, tier: map.get(pct) || "fine" });
    }
    return out;
  }
  function squareGridTieredLines(step, widthPx, heightPx) {
    const cellPx = squareGridCellPx(step, widthPx, heightPx);
    const xMap = /* @__PURE__ */ new Map();
    const yMap = /* @__PURE__ */ new Map();
    bumpTier(xMap, squareGridAxisPercents(widthPx, cellPx), "fine");
    bumpTier(yMap, squareGridAxisPercents(heightPx, cellPx), "fine");
    bumpTier(xMap, squareGridAxisPercents(widthPx, cellPx * 2), "medium");
    bumpTier(yMap, squareGridAxisPercents(heightPx, cellPx * 2), "medium");
    bumpTier(xMap, squareGridAxisPercents(widthPx, cellPx * 4), "coarse");
    bumpTier(yMap, squareGridAxisPercents(heightPx, cellPx * 4), "coarse");
    bumpTier(xMap, [0, 50, 100], "edge");
    bumpTier(yMap, [0, 50, 100], "edge");
    return {
      cellPx,
      x: mapToSortedLines(xMap),
      y: mapToSortedLines(yMap)
    };
  }
  function snapToAxisPercents(n, percents, skipScreenEdges = false, maxDistPct) {
    if (!percents.length || !Number.isFinite(n)) return n;
    let best = n;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < percents.length; i++) {
      const p = percents[i];
      if (skipScreenEdges && (p <= EPS || p >= 100 - EPS)) continue;
      const d = Math.abs(n - p);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    if (!Number.isFinite(bestDist) || bestDist === Number.POSITIVE_INFINITY) {
      return n;
    }
    if (maxDistPct != null && bestDist > maxDistPct) return n;
    return Math.max(0, Math.min(100, best));
  }

  // src/lib/layoutEditPrefs.ts
  var KEY2 = "al-comm-ui-layout-edit-prefs-v1";
  var DEFAULT_LAYOUT_CHROME_POS = {
    x: 50,
    y: 0.8
  };
  var DEFAULTS2 = {
    freePlacement: false,
    gridStep: LAYOUT_GRID_STEP,
    chromePos: { ...DEFAULT_LAYOUT_CHROME_POS }
  };
  var cache2 = null;
  var listeners6 = [];
  function clampPct(n) {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
  }
  function normalizeChromePos(raw) {
    if (!raw || typeof raw !== "object") {
      return { ...DEFAULT_LAYOUT_CHROME_POS };
    }
    const obj = raw;
    const x = typeof obj.x === "number" && Number.isFinite(obj.x) ? clampPct(obj.x) : DEFAULT_LAYOUT_CHROME_POS.x;
    const y = typeof obj.y === "number" && Number.isFinite(obj.y) ? clampPct(obj.y) : DEFAULT_LAYOUT_CHROME_POS.y;
    return { x, y };
  }
  function read() {
    var _a;
    try {
      const raw = (_a = window.localStorage) == null ? void 0 : _a.getItem(KEY2);
      if (!raw) return { ...DEFAULTS2, chromePos: { ...DEFAULT_LAYOUT_CHROME_POS } };
      const parsed = JSON.parse(raw);
      return {
        freePlacement: !!parsed.freePlacement,
        gridStep: parsed.gridStep != null ? normalizeGridStep(parsed.gridStep) : LAYOUT_GRID_STEP,
        chromePos: normalizeChromePos(parsed.chromePos)
      };
    } catch (e2) {
      return { ...DEFAULTS2, chromePos: { ...DEFAULT_LAYOUT_CHROME_POS } };
    }
  }
  function write(prefs) {
    var _a;
    try {
      (_a = window.localStorage) == null ? void 0 : _a.setItem(KEY2, JSON.stringify(prefs));
    } catch (e2) {
    }
  }
  function notify() {
    for (let i = 0; i < listeners6.length; i++) {
      listeners6[i]();
    }
  }
  function getLayoutEditPrefs() {
    if (!cache2) cache2 = read();
    return cache2;
  }
  function getLayoutFreePlacement() {
    return getLayoutEditPrefs().freePlacement;
  }
  function setLayoutFreePlacement(free) {
    const next = {
      ...getLayoutEditPrefs(),
      freePlacement: !!free
    };
    cache2 = next;
    write(next);
    notify();
    return next;
  }
  function getLayoutGridStep() {
    return getLayoutEditPrefs().gridStep;
  }
  function setLayoutGridStep(step) {
    const next = {
      ...getLayoutEditPrefs(),
      gridStep: normalizeGridStep(step)
    };
    cache2 = next;
    write(next);
    notify();
    return next;
  }
  function getLayoutChromePos() {
    return getLayoutEditPrefs().chromePos;
  }
  function setLayoutChromePos(pos) {
    const next = {
      ...getLayoutEditPrefs(),
      chromePos: normalizeChromePos(pos)
    };
    cache2 = next;
    write(next);
    notify();
    return next;
  }
  function subscribeLayoutEditPrefs(listener) {
    listeners6.push(listener);
    return () => {
      const idx = listeners6.indexOf(listener);
      if (idx >= 0) listeners6.splice(idx, 1);
    };
  }

  // src/lib/percentDrag.ts
  function layoutDragRoot() {
    return document.getElementById("comm-ui") || document.documentElement;
  }
  function percentFromPointerDrag(clientX, clientY, start, root = layoutDragRoot()) {
    const rect = root.getBoundingClientRect();
    const { dxPct, dyPct } = deltaToPercent(
      clientX - start.clientX,
      clientY - start.clientY,
      rect.width,
      rect.height
    );
    return {
      x: Math.max(0, Math.min(100, start.posX + dxPct)),
      y: Math.max(0, Math.min(100, start.posY + dyPct))
    };
  }
  function trySetPointerCapture(target, pointerId) {
    const el = target;
    if (!el || typeof el.setPointerCapture !== "function") return;
    try {
      el.setPointerCapture(pointerId);
    } catch (e2) {
    }
  }
  function tryReleasePointerCapture(target, pointerId) {
    const el = target;
    if (!el || typeof el.releasePointerCapture !== "function") return;
    try {
      el.releasePointerCapture(pointerId);
    } catch (e2) {
    }
  }

  // src/ui/frames/comm/LayoutEditChrome.ts
  var PANEL_W = 420;
  function btnStyle(active, compact) {
    return {
      ...PIXEL_TEXT,
      cursor: "pointer",
      fontSize: compact ? TYPE.secondary : TYPE.body,
      padding: compact ? "6px 9px" : "7px 11px",
      minHeight: compact ? "32px" : "36px",
      border: active ? "1px solid #ffe08a" : "1px solid #665",
      background: active ? "#3a3510" : "#1c1c18",
      color: active ? "#ffe08a" : "#ddd",
      borderRadius: "3px",
      flex: "0 0 auto"
    };
  }
  function rowStyle(wrap) {
    return {
      display: "flex",
      flexWrap: wrap ? "wrap" : "nowrap",
      gap: "6px",
      alignItems: "center",
      minWidth: 0
    };
  }
  function labelStyle() {
    return {
      color: "#c4b48a",
      fontSize: TYPE.secondary,
      letterSpacing: "0.03em",
      textTransform: "uppercase",
      flex: "0 0 58px",
      textAlign: "right"
    };
  }
  function segStyle() {
    return {
      display: "flex",
      flexWrap: "nowrap",
      gap: "0",
      alignItems: "center",
      border: "1px solid #554",
      borderRadius: "3px",
      overflow: "hidden",
      flex: "0 0 auto"
    };
  }
  function segBtnStyle(active) {
    return {
      ...btnStyle(active, true),
      border: "none",
      borderRadius: 0,
      borderRight: "1px solid #443",
      minWidth: "44px",
      padding: "6px 8px"
    };
  }
  function clampChromePos(pos, panelW, panelH) {
    const root = layoutDragRoot().getBoundingClientRect();
    const rw = Math.max(1, root.width);
    const rh = Math.max(1, root.height);
    const halfW = Math.min(panelW, rw - 16) / 2;
    const minX = halfW / rw * 100;
    const maxX = 100 - minX;
    const maxY = Math.max(0, (rh - panelH - 8) / rh * 100);
    return {
      x: Math.max(minX, Math.min(maxX, pos.x)),
      y: Math.max(0, Math.min(maxY, pos.y))
    };
  }
  function LayoutEditChrome(props) {
    const React = getReact();
    const [status, setStatus] = React.useState("");
    const [pasteOpen, setPasteOpen] = React.useState(false);
    const [pasteText, setPasteText] = React.useState("");
    const [freePlacement, setFreePlacement] = React.useState(
      () => getLayoutFreePlacement()
    );
    const [gridStep, setGridStep] = React.useState(() => getLayoutGridStep());
    const [chromePos, setChromePos] = React.useState(
      () => getLayoutChromePos()
    );
    const fileRef = React.useRef(null);
    const shellRef = React.useRef(null);
    const dragging = React.useRef(false);
    const dragStart = React.useRef({
      clientX: 0,
      clientY: 0,
      posX: 0,
      posY: 0
    });
    const chromePosRef = React.useRef(chromePos);
    chromePosRef.current = chromePos;
    React.useEffect(
      () => subscribeLayoutEditPrefs(() => {
        setFreePlacement(getLayoutFreePlacement());
        setGridStep(getLayoutGridStep());
        if (!dragging.current) {
          setChromePos(getLayoutChromePos());
        }
      }),
      []
    );
    const measure = () => {
      const el = shellRef.current;
      if (!el) return { w: PANEL_W, h: 200 };
      return { w: el.offsetWidth || PANEL_W, h: el.offsetHeight || 200 };
    };
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
    const toggleFree = () => {
      const next = setLayoutFreePlacement(!freePlacement);
      setFreePlacement(next.freePlacement);
    };
    const onGridStep = (step) => {
      const next = setLayoutGridStep(step);
      setGridStep(next.gridStep);
    };
    const onChromePointerDown = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      dragging.current = true;
      dragStart.current = {
        clientX: ev.clientX,
        clientY: ev.clientY,
        posX: chromePosRef.current.x,
        posY: chromePosRef.current.y
      };
      trySetPointerCapture(ev.currentTarget, ev.pointerId);
    };
    const onChromePointerMove = (ev) => {
      if (!dragging.current) return;
      const raw = percentFromPointerDrag(
        ev.clientX,
        ev.clientY,
        dragStart.current
      );
      const size = measure();
      const next = clampChromePos(raw, size.w, size.h);
      chromePosRef.current = next;
      setChromePos(next);
    };
    const onChromePointerUp = (ev) => {
      if (!dragging.current) return;
      dragging.current = false;
      tryReleasePointerCapture(ev.currentTarget, ev.pointerId);
      const size = measure();
      const clamped = clampChromePos(chromePosRef.current, size.w, size.h);
      const next = setLayoutChromePos(clamped);
      setChromePos(next.chromePos);
    };
    const modes = ["auto", "desktop", "tablet", "phone"];
    const stepLabel = `${gridStep}%`;
    const gridSeg = e(
      "div",
      { style: segStyle(), role: "group", "aria-label": "Grid step" },
      ...LAYOUT_GRID_STEP_PRESETS.map(
        (step, i) => e(
          "button",
          {
            key: `grid-${step}`,
            type: "button",
            onClick: () => onGridStep(step),
            style: {
              ...segBtnStyle(Math.abs(gridStep - step) < 1e-6),
              borderRight: i === LAYOUT_GRID_STEP_PRESETS.length - 1 ? "none" : "1px solid #443"
            },
            title: `Snap every ${step}% of the shorter side`
          },
          `${step}%`
        )
      )
    );
    const profileSeg = e(
      "div",
      { style: segStyle(), role: "group", "aria-label": "Layout profile" },
      ...modes.map(
        (mode, i) => e(
          "button",
          {
            key: mode,
            type: "button",
            onClick: () => props.onProfileMode(mode),
            style: {
              ...segBtnStyle(props.layoutProfileMode === mode),
              borderRight: i === modes.length - 1 ? "none" : "1px solid #443",
              minWidth: "52px"
            }
          },
          mode === "auto" ? "Auto" : profileLabel(mode)
        )
      )
    );
    return e(
      "div",
      {
        ref: shellRef,
        className: "comm-layout-edit-chrome",
        style: {
          position: "absolute",
          left: `${chromePos.x}%`,
          top: `${chromePos.y}%`,
          transform: "translateX(-50%)",
          zIndex: 80,
          pointerEvents: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          width: `min(${PANEL_W}px, calc(100vw - 24px))`,
          boxSizing: "border-box",
          padding: "8px 10px 10px",
          background: "rgba(22,20,14,0.96)",
          border: "1px solid #aa8",
          borderRadius: "4px",
          color: "#ffe08a",
          fontSize: TYPE.body,
          boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
          ...PIXEL_TEXT
        }
      },
      e(
        "div",
        {
          className: "comm-layout-edit-chrome-handle",
          title: "Drag to move this toolbar",
          "aria-label": "Drag Layout edit toolbar",
          style: {
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "2px 0 6px",
            cursor: "grab",
            userSelect: "none",
            touchAction: "none",
            color: "#ffe08a",
            fontSize: TYPE.title,
            borderBottom: "1px solid rgba(170,136,80,0.35)",
            marginBottom: "2px"
          },
          onPointerDown: onChromePointerDown,
          onPointerMove: onChromePointerMove,
          onPointerUp: onChromePointerUp,
          onPointerCancel: onChromePointerUp
        },
        e("span", { "aria-hidden": true }, "\u283F"),
        e(
          "span",
          {
            style: {
              flex: "1 1 auto",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }
          },
          `Layout edit \xB7 ${profileLabel(props.viewportProfile)}` + (props.layoutProfileMode === "auto" ? " (auto)" : "")
        ),
        e(
          "button",
          {
            type: "button",
            onClick: props.onDone,
            style: {
              ...btnStyle(true, false),
              marginLeft: "auto",
              minWidth: "72px",
              fontSize: TYPE.body
            }
          },
          "Done"
        )
      ),
      e(
        "div",
        { style: rowStyle(true) },
        e("span", { style: labelStyle() }, "Meters"),
        e(
          "button",
          {
            type: "button",
            onClick: props.onReset,
            style: btnStyle(false, true),
            title: "Reset HUD panel positions for this profile"
          },
          "Positions"
        ),
        props.onResetMeters ? e(
          "button",
          {
            type: "button",
            onClick: props.onResetMeters,
            style: btnStyle(false, true),
            title: "Replace meter windows with defaults: Damage, Healing, PDPS, s.coop v2"
          },
          "Meters"
        ) : null,
        props.onAddMeter ? e(
          "button",
          {
            type: "button",
            onClick: props.onAddMeter,
            style: btnStyle(false, true),
            title: "Add a meter panel from the catalog"
          },
          "+ Add"
        ) : null,
        props.onApplyAllCurrent ? e(
          "button",
          {
            type: "button",
            onClick: props.onApplyAllCurrent,
            style: btnStyle(false, true),
            title: "Set every meter segment to Current"
          },
          "\u2192 Cur"
        ) : null,
        props.onApplyAllTotal ? e(
          "button",
          {
            type: "button",
            onClick: props.onApplyAllTotal,
            style: btnStyle(false, true),
            title: "Set every meter segment to Total"
          },
          "\u2192 Tot"
        ) : null
      ),
      e(
        "div",
        { style: rowStyle() },
        e("span", { style: labelStyle() }, "Snap"),
        e(
          "button",
          {
            type: "button",
            onClick: toggleFree,
            style: btnStyle(freePlacement, true),
            title: freePlacement ? "Free placement: no grid snap (peer + screen-edge magnets)" : `Snap to square ${stepLabel} fine grid`
          },
          freePlacement ? "Free" : "Grid"
        ),
        gridSeg
      ),
      e(
        "div",
        { style: rowStyle() },
        e("span", { style: labelStyle() }, "File"),
        e(
          "button",
          {
            type: "button",
            onClick: onExport,
            style: btnStyle(false, true)
          },
          "Copy"
        ),
        e(
          "button",
          {
            type: "button",
            onClick: onDownload,
            style: btnStyle(false, true)
          },
          "Save"
        ),
        e(
          "button",
          {
            type: "button",
            onClick: () => setPasteOpen((v) => !v),
            style: btnStyle(pasteOpen, true)
          },
          pasteOpen ? "Cancel" : "Paste"
        ),
        e(
          "button",
          {
            type: "button",
            onClick: () => fileRef.current && fileRef.current.click(),
            style: btnStyle(false, true)
          },
          "Upload"
        ),
        e("input", {
          ref: fileRef,
          type: "file",
          accept: "application/json,.json",
          style: { display: "none" },
          onChange: onFile
        })
      ),
      e(
        "div",
        { style: rowStyle() },
        e("span", { style: labelStyle() }, "Profile"),
        profileSeg
      ),
      e(
        "div",
        {
          style: {
            color: "#a89878",
            fontSize: TYPE.secondary,
            lineHeight: 1.4,
            paddingTop: "2px"
          }
        },
        freePlacement ? "Free drag/resize \xB7 peer + screen-edge \xB7 Ctrl+Shift+L" : `${stepLabel} snap move/resize \xB7 Shift=free size \xB7 Ctrl+Shift+L`
      ),
      status ? e("div", { style: { fontSize: TYPE.secondary, color: "#9a9" } }, status) : null,
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
          rows: 4,
          placeholder: "Paste enhance-comm-ui layout JSON\u2026",
          onChange: (ev) => setPasteText(ev.target.value),
          style: {
            width: "100%",
            minHeight: "88px",
            background: "#141410",
            color: "#eee",
            border: "1px solid #665",
            borderRadius: "3px",
            fontSize: TYPE.secondary,
            boxSizing: "border-box",
            ...PIXEL_TEXT
          }
        }),
        e(
          "button",
          {
            type: "button",
            onClick: () => applyImportText(pasteText),
            style: btnStyle(true, true)
          },
          "Apply import"
        )
      ) : null
    );
  }

  // src/ui/frames/comm/CommMeterAddDialog.ts
  function CommMeterAddDialog(props) {
    const shellStyle = {
      position: "absolute",
      left: "50%",
      top: "20%",
      transform: "translateX(-50%)",
      zIndex: 90,
      pointerEvents: "auto",
      background: "rgba(16,16,16,0.97)",
      border: "1px solid #886",
      padding: "10px",
      maxWidth: "420px",
      maxHeight: "60vh",
      overflow: "auto",
      color: "#ddd",
      fontSize: "13px"
    };
    const presetBtn = (p, tone) => e(
      "button",
      {
        key: p.id,
        type: "button",
        "data-ecu-tour": "preset-" + p.id,
        onClick: () => {
          props.onAddPreset(p.id);
          props.onClose();
        },
        style: {
          cursor: "pointer",
          padding: "6px 10px",
          border: tone === "al" ? "1px solid #445566" : "1px solid #555",
          background: tone === "al" ? "#1a222a" : "#222",
          color: tone === "al" ? "#cde" : "#eee"
        }
      },
      p.label
    );
    return e(
      "div",
      { style: shellStyle },
      e(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "8px",
            color: "#ffe08a"
          }
        },
        "Add meter panel",
        e(
          "button",
          {
            type: "button",
            onClick: props.onClose,
            style: {
              cursor: "pointer",
              border: "1px solid #555",
              background: "#222",
              color: "#ddd"
            }
          },
          "\xD7"
        )
      ),
      e(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: "10px" } },
        e(
          "div",
          { style: { color: "#9ab", fontSize: "12px" } },
          "Displays \u2014 Damage / Healing / Taken\u2026 (\u2039 \u203A cycles these). View changes Bars / Pie / Graph."
        ),
        e(
          "div",
          { style: { display: "flex", flexWrap: "wrap", gap: "6px" } },
          ...catalogPresets("meter").map((p) => presetBtn(p, "meter"))
        ),
        e(
          "div",
          { style: { color: "#9ab", fontSize: "12px", marginTop: "4px" } },
          "Adventure Land \u2014 PDPS / Hit DPS / coop (not in Display cycle)"
        ),
        e(
          "div",
          { style: { display: "flex", flexWrap: "wrap", gap: "6px" } },
          ...catalogPresets("al").map((p) => presetBtn(p, "al"))
        )
      )
    );
  }

  // src/ui/chrome/PositionedPanel.ts
  var PEER_SNAP_PCT = 1;
  var VISUAL_EDGE_SNAP_PX = 8;
  function anchorMeta(id) {
    for (let i = 0; i < LAYOUT_ANCHOR_OPTIONS.length; i++) {
      if (LAYOUT_ANCHOR_OPTIONS[i].id === id) return LAYOUT_ANCHOR_OPTIONS[i];
    }
    return { glyph: "\xB7", title: id };
  }
  function PositionedPanel(props) {
    const React = getReact();
    const { id, pos, editing, onMove, children, onClose, hidden, onShow } = props;
    const panelLabel = props.label || PANEL_LABELS[id] || String(id);
    const [hover, setHover] = React.useState(false);
    const hoverLeaveTimer = React.useRef(
      null
    );
    const setPanelHover = (next) => {
      if (hoverLeaveTimer.current != null) {
        clearTimeout(hoverLeaveTimer.current);
        hoverLeaveTimer.current = null;
      }
      if (next) {
        setHover(true);
        return;
      }
      hoverLeaveTimer.current = setTimeout(() => {
        hoverLeaveTimer.current = null;
        setHover(false);
      }, 180);
    };
    React.useEffect(() => {
      return () => {
        if (hoverLeaveTimer.current != null) {
          clearTimeout(hoverLeaveTimer.current);
        }
      };
    }, []);
    const [freePlacement, setFreePlacement] = React.useState(
      () => getLayoutFreePlacement()
    );
    const freePlacementRef = React.useRef(freePlacement);
    freePlacementRef.current = freePlacement;
    const gridStepRef = React.useRef(getLayoutGridStep());
    const shellRef = React.useRef(null);
    React.useEffect(
      () => subscribeLayoutEditPrefs(() => {
        setFreePlacement(getLayoutFreePlacement());
        gridStepRef.current = getLayoutGridStep();
      }),
      []
    );
    React.useEffect(() => {
      if (!props.onResizeFrame) return;
      const el = shellRef.current;
      if (!el || typeof ResizeObserver === "undefined") return;
      let lastW = 0;
      let lastH = 0;
      let timer = 0;
      let shiftHeld = false;
      const onKey = (e2) => {
        if (e2.key === "Shift") shiftHeld = e2.type === "keydown";
      };
      window.addEventListener("keydown", onKey);
      window.addEventListener("keyup", onKey);
      const obs = new ResizeObserver(() => {
        const w = Math.round(el.offsetWidth);
        const h = Math.round(el.offsetHeight);
        if (w < 40 || h < 40) return;
        if (w === lastW && h === lastH) return;
        lastW = w;
        lastH = h;
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          if (!props.onResizeFrame) return;
          const free = freePlacementRef.current || shiftHeld || getLayoutFreePlacement();
          let outW = w;
          let outH = h;
          if (!free) {
            const root = layoutDragRoot().getBoundingClientRect();
            const snapped = snapFrameSizeToGrid(
              w,
              h,
              gridStepRef.current,
              root.width,
              root.height
            );
            outW = snapped.w;
            outH = snapped.h;
            if (outW !== w || outH !== h) {
              el.style.width = outW + "px";
              el.style.height = outH + "px";
              lastW = outW;
              lastH = outH;
            }
          }
          props.onResizeFrame({ w: outW, h: outH });
        }, 120);
      });
      obs.observe(el);
      return () => {
        window.clearTimeout(timer);
        obs.disconnect();
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("keyup", onKey);
      };
    }, [props.onResizeFrame]);
    const dragging = React.useRef(false);
    const start = React.useRef({
      clientX: 0,
      clientY: 0,
      posX: 0,
      posY: 0
    });
    const visualStart = React.useRef(null);
    const lastPos = React.useRef(pos);
    lastPos.current = pos;
    const touchish = isTouchishProfile(props.viewportProfile || "desktop");
    const closeSize = touchish ? 36 : 22;
    const headerPad = touchish ? "8px 12px" : "3px 8px";
    const headerFont = touchish ? "15px" : "13px";
    const anchorBtn = touchish ? 28 : 20;
    const setAnchor = (next) => {
      if (next === pos.anchor) return;
      const panelEl = shellRef.current;
      const rootEl = layoutDragRoot();
      if (!panelEl) {
        onMove(id, { ...pos, anchor: next });
        return;
      }
      const p = panelEl.getBoundingClientRect();
      const c = rootEl.getBoundingClientRect();
      onMove(
        id,
        reanchorKeepingVisual(pos, next, p.width, p.height, c.width, c.height)
      );
    };
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
      if (!editing && !props.movable) return;
      ev.preventDefault();
      ev.stopPropagation();
      dragging.current = true;
      start.current = {
        clientX: ev.clientX,
        clientY: ev.clientY,
        posX: pos.x,
        posY: pos.y
      };
      visualStart.current = captureVisualSnapStart(
        shellRef.current,
        layoutDragRoot(),
        pos
      );
      if (props.onDragStart) props.onDragStart(id);
      trySetPointerCapture(ev.currentTarget, ev.pointerId);
    };
    const onPointerMove = (ev) => {
      if (!dragging.current) return;
      const raw = percentFromPointerDrag(ev.clientX, ev.clientY, start.current);
      let nextX = raw.x;
      let nextY = raw.y;
      let edgeThresholdPx = VISUAL_EDGE_SNAP_PX;
      let useVisualEdge = true;
      if (!freePlacementRef.current) {
        const root = layoutDragRoot().getBoundingClientRect();
        const metrics = squareGridMetrics(
          gridStepRef.current,
          root.width,
          root.height
        );
        nextX = snapToAxisPercents(nextX, metrics.xPercents, false);
        nextY = snapToAxisPercents(nextY, metrics.yPercents, false);
        const cellPctX = metrics.cellPx / Math.max(1, root.width) * 100;
        const cellPctY = metrics.cellPx / Math.max(1, root.height) * 100;
        const peerThresh = Math.min(
          PEER_SNAP_PCT,
          Math.max(0.2, Math.min(cellPctX, cellPctY) * 0.4)
        );
        const { xs, ys } = peerAxes();
        nextX = snapPercent(nextX, peerThresh, xs);
        nextY = snapPercent(nextY, peerThresh, ys);
        useVisualEdge = false;
      } else {
        const { xs, ys } = peerAxes();
        nextX = snapPercent(nextX, PEER_SNAP_PCT, xs);
        nextY = snapPercent(nextY, PEER_SNAP_PCT, ys);
        edgeThresholdPx = VISUAL_EDGE_SNAP_PX;
      }
      const visual = visualStart.current;
      if (useVisualEdge && visual) {
        const edge = snapDragToVisualEdges(
          ev.clientX,
          ev.clientY,
          start.current,
          visual,
          edgeThresholdPx
        );
        if (edge.snapX) nextX = edge.x;
        if (edge.snapY) nextY = edge.y;
      }
      onMove(id, { ...pos, x: nextX, y: nextY });
      if (props.onDragMove) props.onDragMove(id, { ...pos, x: nextX, y: nextY });
    };
    const onPointerUp = (ev) => {
      if (!dragging.current) return;
      dragging.current = false;
      visualStart.current = null;
      tryReleasePointerCapture(ev.currentTarget, ev.pointerId);
      let finalPos = lastPos.current;
      if (props.softAvoid !== false) {
        const peers = props.peerLayout || {};
        const nudged = softAvoidOverlap(id, lastPos.current, peers);
        if (nudged.x !== lastPos.current.x || nudged.y !== lastPos.current.y) {
          finalPos = nudged;
          onMove(id, nudged);
        }
      }
      if (props.onMoveEnd) props.onMoveEnd(id, finalPos);
    };
    const dragHandlersRef = React.useRef({
      onPointerDown,
      onPointerMove,
      onPointerUp
    });
    dragHandlersRef.current = { onPointerDown, onPointerMove, onPointerUp };
    React.useEffect(() => {
      var _a;
      const el = (_a = props.extraDragRef) == null ? void 0 : _a.current;
      if (!el) return;
      const down = (ev) => {
        const t = ev.target;
        if (t && typeof t.closest === "function" && t.closest(
          "button, a, input, textarea, select, .ecu-meter-tool, .ecu-meter-ttl, .ecu-meter-btn"
        )) {
          return;
        }
        dragHandlersRef.current.onPointerDown(ev);
      };
      const move = (ev) => dragHandlersRef.current.onPointerMove(ev);
      const up = (ev) => dragHandlersRef.current.onPointerUp(ev);
      el.addEventListener("pointerdown", down);
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
      return () => {
        el.removeEventListener("pointerdown", down);
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
        el.removeEventListener("pointercancel", up);
      };
    }, [props.extraDragRef, editing, props.movable, id, pos.x, pos.y]);
    const showClose = !!onClose && !hidden && (hover || touchish || editing && !props.closeOnHoverOnly);
    const opacity = typeof props.opacity === "number" && Number.isFinite(props.opacity) ? Math.max(0.25, Math.min(1, props.opacity)) : 1;
    const interactiveBody = !!props.interactiveBody;
    const editChrome = props.editChrome === "grip" || props.editChrome === "anchors" ? props.editChrome : "full";
    const movable = !!props.movable && !editing;
    const shellStyle = Object.assign(
      {},
      panelStyle(pos, editing || movable),
      props.style || {},
      {
        opacity: editing && hidden ? Math.min(opacity, 0.72) : opacity
      },
      editing ? {
        // Cyan + dark edge — yellow grid uses the same warm dashes as the old outline.
        outline: hidden ? "2px dashed rgba(160,160,160,0.85)" : "2px solid rgba(80, 210, 255, 0.95)",
        outlineOffset: "0px",
        boxShadow: hidden ? "0 0 0 1px rgba(0,0,0,0.55)" : "0 0 0 1px rgba(0,0,0,0.75), 0 0 10px rgba(40,140,200,0.35)",
        background: hidden ? "rgba(20,20,20,0.55)" : "transparent",
        // Default: click-through so overlapping panels can be grabbed.
        // interactiveBody (Layout toggles): keep hits so buttons work.
        pointerEvents: interactiveBody ? "auto" : "none"
      } : movable ? {
        outline: "2px solid rgba(80, 210, 255, 0.85)",
        outlineOffset: "0px",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.7)",
        pointerEvents: "auto"
      } : null
    );
    const closeAbove = props.closePlacement === "above";
    const closeOnChrome = closeAbove && (editing || movable);
    const closeBtn = showClose ? e(
      "button",
      {
        type: "button",
        className: "comm-pos-panel-close" + (closeAbove ? " comm-pos-panel-close-above" : ""),
        title: `Hide ${panelLabel}`,
        "aria-label": `Hide ${panelLabel}`,
        onClick: (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          onClose();
        },
        onPointerDown: (ev) => ev.stopPropagation(),
        onMouseEnter: () => setPanelHover(true),
        onMouseLeave: () => setPanelHover(false),
        style: {
          position: "absolute",
          top: closeAbove ? closeOnChrome ? "2px" : `-${closeSize + 2}px` : editing ? "2px" : "0",
          right: closeOnChrome ? "2px" : "0",
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
    const anchorPad = editing ? e(
      "div",
      {
        className: "comm-pos-anchor-pad",
        title: "Stretch / anchor point",
        onPointerDown: (ev) => ev.stopPropagation(),
        style: {
          display: "grid",
          gridTemplateColumns: `repeat(3, ${anchorBtn}px)`,
          gridTemplateRows: `repeat(3, ${anchorBtn}px)`,
          gap: "2px",
          marginLeft: "auto",
          flexShrink: 0,
          cursor: "default"
        }
      },
      ...LAYOUT_ANCHOR_PAD.reduce((cells, row2) => {
        for (let c = 0; c < row2.length; c++) {
          const a = row2[c];
          if (!a) {
            cells.push(
              e("div", {
                key: `empty-${cells.length}`,
                style: { width: anchorBtn, height: anchorBtn }
              })
            );
            continue;
          }
          const meta = anchorMeta(a);
          const active = pos.anchor === a;
          cells.push(
            e(
              "button",
              {
                key: a,
                type: "button",
                title: meta.title,
                "aria-label": meta.title,
                "aria-pressed": active,
                onClick: (ev) => {
                  ev.preventDefault();
                  ev.stopPropagation();
                  setAnchor(a);
                },
                onPointerDown: (ev) => ev.stopPropagation(),
                style: {
                  width: `${anchorBtn}px`,
                  height: `${anchorBtn}px`,
                  padding: 0,
                  margin: 0,
                  border: active ? "1px solid #ffe08a" : "1px solid #666",
                  background: active ? "rgba(80,70,20,0.95)" : "rgba(20,20,20,0.9)",
                  color: active ? "#ffe08a" : "#bbb",
                  fontSize: touchish ? "14px" : "12px",
                  lineHeight: `${anchorBtn - 2}px`,
                  cursor: "pointer",
                  boxSizing: "border-box"
                }
              },
              meta.glyph
            )
          );
        }
        return cells;
      }, [])
    ) : null;
    const moveGrip = props.showMoveGrip !== false && (movable || editing && editChrome === "grip") ? e(
      "div",
      {
        className: "comm-pos-edit-grip",
        title: "Drag to move",
        "aria-label": "Drag to move",
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: touchish ? "6px 8px" : "2px 4px",
          marginBottom: "2px",
          background: "rgba(40,40,20,0.92)",
          border: "1px solid #886",
          cursor: "grab",
          userSelect: "none",
          color: "#ffe08a",
          fontSize: headerFont,
          lineHeight: 1,
          touchAction: "none",
          pointerEvents: "auto",
          flexShrink: 0
        },
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel: onPointerUp
      },
      e("span", { "aria-hidden": true }, "\u283F")
    ) : null;
    const editHeaderStyle = {
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
      minHeight: touchish ? "40px" : void 0,
      pointerEvents: "auto"
    };
    const editHeader = !editing ? moveGrip : editChrome === "grip" ? moveGrip : editChrome === "anchors" ? e(
      "div",
      {
        className: "comm-pos-edit-header is-anchors-only",
        title: `Drag to move \xB7 ${panelLabel}`,
        "aria-label": `Drag to move ${panelLabel}`,
        style: {
          ...editHeaderStyle,
          justifyContent: "space-between",
          paddingTop: touchish ? "4px" : "2px",
          paddingBottom: touchish ? "4px" : "2px"
        },
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel: onPointerUp
      },
      e(
        "span",
        {
          className: "comm-pos-edit-label",
          style: {
            overflow: "hidden",
            textOverflow: "ellipsis",
            minWidth: 0,
            flex: 1
          }
        },
        `${panelLabel}${hidden ? " (hidden)" : ""}`
      ),
      anchorPad
    ) : e(
      "div",
      {
        className: "comm-pos-edit-header",
        style: editHeaderStyle,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel: onPointerUp
      },
      e(
        "span",
        {
          className: "comm-pos-edit-label",
          style: {
            overflow: "hidden",
            textOverflow: "ellipsis",
            minWidth: 0,
            flex: 1
          }
        },
        `${panelLabel}${hidden ? " (hidden)" : ""}`
      ),
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
      ) : null,
      anchorPad
    );
    const opacityRow = editing && props.onOpacityChange && !hidden ? e(
      "div",
      {
        className: "comm-pos-opacity-row",
        style: {
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: touchish ? "4px 8px" : "2px 6px",
          marginBottom: "2px",
          background: "rgba(20,20,24,0.92)",
          border: "1px solid #555",
          color: "#bbb",
          fontSize: touchish ? "13px" : TYPE.secondaryMin,
          pointerEvents: "auto",
          flexShrink: 0,
          minWidth: 0
        },
        onPointerDown: (ev) => ev.stopPropagation()
      },
      e(
        "span",
        {
          style: {
            flexShrink: 0,
            color: "#999",
            minWidth: touchish ? "52px" : "44px"
          }
        },
        `${Math.round(opacity * 100)}%`
      ),
      e("input", {
        type: "range",
        min: 25,
        max: 100,
        step: 5,
        value: Math.round(opacity * 100),
        title: "Panel opacity",
        "aria-label": "Panel opacity",
        style: {
          flex: 1,
          minWidth: 0,
          margin: 0,
          cursor: "pointer"
        },
        onChange: (ev) => {
          const pct = Number(ev.target.value);
          if (!Number.isFinite(pct)) return;
          props.onOpacityChange(pct / 100);
        }
      })
    ) : null;
    const hiddenBodyStyle = Object.assign(
      {
        padding: "8px 10px",
        color: "#888",
        fontSize: TYPE.secondary,
        minWidth: "120px",
        boxSizing: "border-box"
      },
      props.hiddenBodyStyle || {}
    );
    return e(
      "div",
      {
        ref: shellRef,
        className: `comm-pos-panel comm-pos-${id}${editing ? " comm-pos-editing" : ""}${movable ? " comm-pos-movable" : ""}${hidden ? " comm-pos-hidden" : ""}${props.className ? ` ${props.className}` : ""}`,
        "data-panel": id,
        style: shellStyle,
        onMouseEnter: onClose ? () => setPanelHover(true) : void 0,
        onMouseLeave: onClose ? () => setPanelHover(false) : void 0
      },
      editHeader,
      opacityRow,
      closeBtn,
      hidden && editing ? e(
        "div",
        {
          className: "comm-pos-hidden-body",
          style: hiddenBodyStyle
        },
        `${panelLabel} \u2014 closed`
      ) : editing && !hidden ? e(
        "div",
        {
          className: "comm-pos-panel-body",
          style: interactiveBody ? { pointerEvents: "auto" } : void 0
        },
        children
      ) : children
    );
  }

  // src/ui/meter/meterToolbarIcons.ts
  var TOOLBAR_ICONS_DATA_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAAgCAYAAAD9qabkAAAX30lEQVR4nO1dC3QVVZbddd/LP5AQCH8BQUD5qDQgbUcJvwCi2ICRgIojqA3il9FZ0x91/LQ9aymuGZzBT8tEwJEWBaIoDtqgglFEWkf8oKD4QT4mhARCPi8vqapZ+75zsyrPAMl7L/YAOWvVenkvVXWrbp2zzz7nnnsLaJVWaZXTVqwI9vduRtyw7XQR9oHy9Ie5f+c064dWOcUBQMnmBxAnm09+o7LbAOoA1MqnfRqAgemPRAC/lHvtCKAYwFuePoilWGGggzDAOZX7u1VaQKjAxxIrTNGTAaQCSAOQAiBBQIDKFwBQBaAcwFEA1QCC8j/ESDGN4vsaYSFumDGYraUMwhIQZH88AmA2f/T7/bBtG67rjgewMcbtm/uPB5Akn5aAbkD6uy5GQGDa8rKbxsTLeFpZzykEAMbQfB6Faw+gF4BhAPoBOANAOwBlAPYC2AXgfwF8B6AEQKVHKW0PGEQiRvETBYgM+HgBwBVjqBEwCngMIpZiSdu8jvsty5p96aWX4swzz8TKlStRXFz8OYCPPeAYy3bZB+nCNDIEhAi4pfIcKuX+o2Ef5v4SpL/D+9ortqfPTX+3AsFJDgDG2FI8WxsAPZVS+Y7j0OshMzPT6dixo1VcXOwePHiQxxj5HYBNwgYqREGrwhhBJN62LYB/A5B3nH1/EGBaAeA2MQgqaCzFEqMYY1nWzZMnT8bll1+OhIQEtG3bFg899NBAAFkA/hoD4AtvlwaZCWC+ZVk3KqUs27ZfALBKQPiAgEF1FOCn5P5+A2BOGOMKF+P9nwOQL8+cYNAKAicpAPg8XqYTgB5icF/Lg02cNGkS7rzzTqSkpCilFBzHsSorK3H//fdj8+bNEOWZBKA3ACrn9wCKABwWEKBRNFchyUBuTkpKuuqmm25Cp06dEB8fD8sK6aTrupp6f/fdd71qamqwZMmSWa7rPugxwOa2eTwx3v+ybt26YeLEiejVqxd8Ph+qq6vRrl07lJWVjQPwjscYohXLE4YRACYvXbrUSk1NxRVXXDGBYCSAky/9XSygGwkIGKCZM23atEFnnHGGBjfT10ZMnx85coTM549Hjx6l3jwtTMSwkFhIxlBgEy8oUWiPbt+zQ20jN1lrAQkW8LqDidXAvhhdyykNAMpj/DT8Xyil/uA4TjelVIXjOC+7rlu8c+fOLmlpaVZcXJxWCioCY989e/a4lmUdcF23n1Lq147jECGyHcf5o4QGEBBorlEYALg6NzcXQ4cORefOncH2vUJlPOecc3gdSE5ORmVl5U4AZ3pyFLFQSF5LnFDwyy+88EJ07dpVe372RWZmJkaOHIm1a9fe7LruGwDeiEEy0FDyRGFBHXgNGRkZGmzeeuuttMOHD2PatGkzXdfl81six0UKAoYB+Gj8ffv2BYEmHABMn1dUVCA9Pd3Kz8+/t7S0lDs95QGBqMAvAejdA3h5kFyQJXS0O4A9CFk1/26oCaGbpfEzPk1TWL/ewQ1FwNZoruVUFRXmYUj1uwG4SCn1p5SUlK733XcfDZz9PsZ13brdu3dbP/74o1YIsx04cIDe1+L/AYz2+/3JPI7HK6X+leeT87aRdqwIFLLXgAEDtPen4qelpTXYaBAdO3bU3phsJC4ujm18I07DxLHRivGO92VmZmaMHTtWXwvZCAGJ1zF69GgkJnIXzYD4h4qyPZ8AIO+ji2w+Gp/jOEhKStJ98uqrr0KYwI0A+ghTSDpO/H6iNi16fhp/SkqK/gzfCHwEvT59+uD6668nI7lHQgcmiuOjufd4oF8n4GUaeKp4pbbyN29M97AnPk33bG2lszIsYIIFjFFYkgFcEOm1nMqiwrwsvcsApRQVPO2ZZ56xLrvsMtxxxx2WKF4PGlppaWm9R+BnWVmZNgRhDl0WLFhgMTHG43keno/nlfMnNVMxzCiEpqI0NtJthh/hG//Xvn179O/fHw8++CCNUklS0oBANMYIjzFeQepPwyPbYNvsB/7N38466yzuO0/0s7mAd6zEH3Mb1wO4m85vypQp1SNHjqxh+MW2+VzWrVvXzrKsaQBuYM5GkrRmtKC57VoG4Bvra258Duzz9PR0nQSdO3cumeG9AgJtxTlH1OddgNU9hN4zq7oFwKcAvgLwPwC+FU//lWRc/wbgIwAfyve3XaDQDdGvKy0gS+G/IrmOU11UmPfvCuA6pVTKE088YVGR6dlmzpwJJrvuvvturF+/Hueff36Dk/D766+/rv/P/bg/FYPHP/744xbPB+Af5PyRsAC9L5XuuDejlAYJMgGyhQceeIDsRUlcnBEDj+yTURBr0KBB2gOaUMgAEA3xqquuIhj0BzDjBEOtTU04ZkhCbvyKFSvat2/ffpD8r2zs2LEaBChs+5VXXjFMgEOTnQWEmssCmizmvg0IzJ8/n+38niGbPOtmg0BX4NN2cpArQ0rcdgPYJvGFKUihWBIObBMA4OcPbigDvcUFjshDG25pDGmVRgAgXhD7HMuyRubl5Vk9e/asR3rG+A899BCmT5+uKWd4PMjv/J3/535eD01KPn36dHqTbJ5f2onEKzVJ2CYpOD3xwIEDNRPw+XxKRhDaRcEEDDXmtWtvb4zfCO+bv9MYCA6Sg/DFIPbndU9Yvnx5hy5dujDHgI0bN5rfy8aNG1fDBCTbJwisWrWKv+dIiJzekv3tBV623bt3b9x4443s4+vkGpoNQCZ+0LG8D8ga7sfEkfEY9Ss/hl3gR40C9gsQHJahjzO6Klx2eSKmXpKI3JlJGHa+HyUusMsFitxQJ5JRtMqxGQCp7cykpCR1zTXXNGrkjSWCTrQPv8+aNYtGybZmSjvR0OKIQEAplSsgEKlBmOKYMTRCnp/A6L1f/s3fCAxMjkoCUEXRVoInBK4wwMrzMwZ/8803EyzLopc/PGbMmGBtbW09C5F7zI0R82kyCHTo0EEnY3Nzc8+VfMQ4Tw6v6ecTAEhMsjDpmmRc+9tk3H5PKv5wdzJS+yrsVKEED+O7/QoYn5eI/1iTgUeXpGPhs+0wemoyDrhAsgvUOMBRB7Ba6yR/Ispb9aWUiq+qqrLmzZvnLl++HIcOHTKK3ECYfGISqq6uTn/ye7jwOB7P88ydO9etrq5mKGDoYCRGERUIMBzw+XxXAng0QoOoL5ChkYcbf4MdTwCUTWzLsDKOONDIv7766qtLs7OztaETDNq0aUMQ4P46ARMIBPSzIAtZs2YNQWO0gEdU+Q8+52+//RbvvPMO9u/f36hOcPiVuSB+Mh80fPhwXHrppaMlFIkIgNgBwWoXq/5cicKXAqgJuEhvp3DXPan41VC/rjw7BOC3v2uDKf/YVg8yl+y3sfifyvHfz1XWJwpb7f7Y4helpmH6HcdhouTHPXv2DF+0aFHm2rVrrYKCggYKTQX78ssv8fzzz3Pc3x05cqQ1Y8YMnH322Q1idCrJnDlzODrA/j/I0MxxnHWe8M3XQvXyjYIAjWbBggVYuHDhdAB3yRCZHYlhGk98orYbGaFqTjuJUn3J2H+yGLEOP7Kysuq2bdvmJwjR2EeMGBG/devWkrFjx6Zt2bIljgyBmXvLsjq6rpss1xExKhFYWOPx7rvvol+/fqw9gAkRKexb6sSHH36oh0WHDRumWYgkQ3tFOiJARam1gU8/t3G4yEVtELh4Ujx+MTQOV+UmIb59jR4RmDUrEYndfPhqfQAFz1Wh4C/VKHVC8VeLeplTQPyypUiCbiIpp+u6RT6fr92gQYMaKLAx/ry8PHqgoG3b+9euXdu1oKAgnmWw4SAwePBgjsvX2rZdJFR2goxPF0mFYGM1HC0CAlRIDlmJROMRdXa8hcXQfwLApGXLlmUy7CDFpmRnZ9eReRkm8vDDD/M3hs713llqNEo9k7YiFgMoNPTt27frNgn6rMcgO9ixY4dOPnI4uKqqCuedd54GJoYjIhElIR05iDFMcYmDTa8GEZduIRAEhgz3Yegvk+FaQFyChf2FNXh1dRVWP1etyyD7KKCdEyqJjGU99qkmprCF2dq5LG6hftF2bduOY3bfq+xULnp+MX6yhWdt285XSgUJAF5qyOOoCLZtUwsGy3l/HTZE9LMAtInNo1VIEy41JRciYVHdCSbTNGWykY9Dm0ws0gjlHlgCrNtgW96iKG91ZKyEbWZlZWHIkCH6/J988olORDIcICDw2X/11VcaoDg6wnoIMzIS4f3/ROihikodvLCiBu++HURxEYN6hWANsPuLOqxcVoGXCmrAJjn4mxxWNdjKBI7PANhf/s6dOzvLli1TjONYXcZhnXD6T9pv2/Y+z+gMf9+3adOmXiwLJj2m8Ljx48frSjIqL5Xj2muvdYqKiuJMez/3c/HcS6TGX6/MxwMBk6gTYCWVpyNCM2rkTV5G9xHPZcIOemGeIysry/7ggw98nlzEsWr1o54dyPOTgUyZMkV7+M8//xzvvfceioqKtJ788MMP+hlfdNFFmv6TcbFCMJbC3qx0gIPFDqDq4E/yo6omiLogEB/XBnu/DWBHqYOzLMBvAY4bijv4AHye6amt0lBMMo59VMeHy+Erxnf0/nyoDXZWiqWuNPJuUtSjN37Pzs5mkq/B/jye5+H5eF6eX2h/i41Lt4CY/okTY44zRTCNgQB/o8eUvuCIB6cGsyMvaQbomUk2uoyXRk+PL1ON8fcSzn2YNm2azgNw2JHen8ZvKiDHjBmjRydaQmjAaX5gRD8Lg4YoWPF12Ls3iOKSWiQmx+PcYWkY3NkHdk+dA9huyOANAPDvVgD4qSiPolUEAoF673Ys5WbsR1rv8/lYlXYNP/mdvx/rGPO7nL/yJJo26i3FZXHNLADn0cDp5Qzb8Qo9MsGOwNe2bds8pdRSrg1gWdYrAgZNicfN1GbmSepKSkr0iEp5ebnOsusLs4jDjYNQI+eKibC97t2749xzz9X3SUbIjQB/8cUXayBoKWFH9OylcOvv49Glm8KB7x3s/sLGnq9dlBTXImdKKn4zP1NndQMeCmXo/8nkcX5O8YsxEmB/DAaDFod7OGzmFaNk9GpM9DHmW7lyZTxpPz0/jZ/lt+GjAN6/ed7aWs7Rwo/SXosnAGMgZjjuny3LupvFTmQxc+fO1UYeboAm10BDYPjDmZP79u1jvDxg+/btn0pFa1P0kOBYI6Ncr1533XXMzSSY0Rrq89atW3X7YYxAszAzU0/6N2Zgy/MyCVxYWKiTf6b9vXv3YteuXXq0JXySVjSi5OJZyXd2f+CSPKBTZwuHy4Ctm21s/ZuDNvEu4hFEh5xkDL0gCfPv6oBlfy7FnnJH5w1qpcNDsNkqjY60iFd+Vyk1e/Xq1YmkeFTmDRs26MQT0d0YtwGBe++9lw+/Qb24EXoFjhmzRHXcuHFaSVatWkWFCdi2XehhAScLAFzHce2cnJz6zDupbmMMgP3APmMsTLDgfixNloReUxOfrjiyEpndVyiJVI7S9C0sLPTLVGxtiJIXqGcF/C7hlhMrsCWg0MjXrFmjQY2JSeZ3COxkJ5s2bdI5I26xEGWqqBTQrw8wejJwXjZQdQT4oLAOhZsdfLHPRSpcpKRWoU1aHC4am4rc2RmoqnTxxmtHUfx9iPR3ktitlQEcmwEwY3PAcZz3161bl52Tk2M9+eST+PjjjzXVZeafJZ5eJnAsMd7+rrvu0uPHzBzTY7722mtMHm4RBlBxkgAAhTfbnUZM+ku6Sw9vRhR4v97MOzczSYbGyf8RUDdu3Him4zgX0qM3oU32S1CY70FJaPfjHACyL3pZGj/jcPZxTk6OdnRMzFH4W25u7hFZmOVItFNz2dbu3bvrs/0c4hs1apRmOTT8devW6WnYbJ9Dg2a4MhpxpANSE4CJeUCXnsChA4DyAe/81cGe/S46Cf5u2VaF/r3jMCI7FQeLajFtTgbiHeDZpw5p2tRPlI2Vg63yUwAg0FbJ2PyqQCAwat68eTRy/rY3GAz2vv322/0vvviirvc/kVD5brvtNgSDQd3n27dv7z5v3jxm/S1ZuaYowiKcv4cYCr1yw4YNeRdccIEudaWC0yPSEPm3YQL8jTE6DT8YDOpZk19//TWeeOIJGtGnslio24wkYFA8ONnA8Mcee0wDC9shu8rJyamRfY/26dMnk9fBtpmZF6+/yrMGQ8RgS0bx0UcfsairnhFyKjSTvCNGjNDMgEOD77//vgY7rtkQrZRJ5tQKAi+/BNgJgHJcJFtBlHznoLMLpDuhh3PYBTZvrMCuvbWwgy6S0v0o+yaoO4CKxnkDlNiOS5w6AGAWzGC8yUUT/pPVW47jcImpLMdx/MzwNobqXu9nhPtx/2XLlvHcNY7jLJdJKSzb/kDaCZwk9RnGEy8IBAKDFy5cOODmm2/WIEAwJBOgxzOjJTQ8rpXATxooh8kefZSVx3pG6/hm3rd3JIAgcODIkSNdaIA09MmTJ1dLUZXfsqxuLLnmsyD1nzp1Kr3+2zJP5ojcQ8QAwPOS8vfo0UPPspwwYYKZ/q2Lq8gGeN8cESBTiBYAjniql3w2UPJZqOPi4KINXF0bzeGnFLkj9v7eYhtbi6vqM6xmemtHWSeuRDqjVRqK3+PluJ4bx/dZ4HOmLAU2eOrUqbj11lsbGPrRo0dJaesBgN6AdekUficDYMa6oKCAcesOWarqW/H+5RHQf71vtENgnuObeiKTjec1jy8vL3994cKFA3keelrKihUrNCWm0Ag4kSrsOj+TWXHlEcTiBoDoxVfNnz/fL2DqF+NvN2TIkPaLFi3SzICemqxDjnle9qmMtuSaTIc5EJb20uDNs6YQjFj8c+WVV2Lnzp065ItW9gODOwCfUuPq5IZNHXSy/JYkcX2dJFa6e2b7xUmcSdpzlqwZQATeF8qjtIpH/GFZZ4IvJVEpNYixvknieZWahSD33MPFX0LCIhHSY4rZl6DA8lDHcQY6jnNAjD+SeNQ14QIVnFtjk4+OJ9zfHCvSHIMwDImWlV1bWztZHFSqUurfuSaeOS89v/TTfDG+CmFVJhHXXNbjHQ1YK2DCKdVXcYGV9evXx5nqQIYeHC7Mzc0tlaXI9nqW5orY+M3zNCsv6YsK63+yPiY9afwmHArTmWa3XwFMqgNeay8UvpMAQLk8vHT5/EzAwMtPLensoHifL0MMYEqkfXA6AIAxshpR2kOO4ywC8C+33HJLt9mzZ+OGG27QCUF6eCb55BiuvzCM30n7+MCZA3j66aexdOlS7rvPcZzHRIErIlws0hgBDh48qJWc0pzhJhooj+PxIjURUPEa0au/iCO61nhdo+wegCmR9wJURrlmvrcegH/Tuuh++xUUFGjjJ0iTkfH+ZsyYcUgWByWLOxCh968fOuSzNIuNNGf+AwGClYBMUnrO16z7DwA/BICJfmA9O5uoFuJcoRsyJZmlHnbgbcCS71+E2MC0YGg9kVYJk/DVaoyi03NsdRxnAWv38/Pzx3LNuVGjRlmsCWfSR4b0dvl8voG7du1KMrPF3n77bbe4mM4PG1zX5SqxO6NcJNIMZb2wePHimSYG964KfDyhYTIhRwNZvHgxZKXi5s4R8b4Aw+jfNzQQxtz8pCGyHZGAbLFYktwkAyulHwkuDg3TrEScl5dXIayXIwwvyZqZZRHG/qY9mzE9pbFVgY97AsfRfUKmKKsxRbok/L4SILsHsMm8ZIJj+xA6CTF8PpAQTIXE9QDCntAcFB0XtcpPpbGnalYHNusvMry6mKWsPp9vgG3bOuBVSn3nOM5TSqm5juNwyicVssq27R2ybNs7QkPpdiuiUAJzPWmyoAen80YqNP4FnsRYpIlIE3Z+w5ifYRKNkZnwRx7hi4J02e+bMa4+9cskKoa6f5A2RMfxuowwMIdTLPdXHWHsb1Yhmitz+Y/3XoBjiWmTxv+06MPJkvg9reRYD9VMREkSpWsviVd+9pUFPjfLA+4lALFD8i2HxEsdkpDNvKQimodvavGTPCFfU6s7veFNtScej2YYUucAACz1+XxTOGzK4qD8/HzScYalI00ZL2InfCZmGTDzZqB4ua/D4vHLw17CEknY0Zw3Ax1LDO03bwwy74M4Geo+Tis53kM15dRmEkyS57VcJja1PcZpKi6rPGPXJvHV0u8GPJ54Z8SZF4W4MVyxh7H+4LCMv3kJSqxfDWbWJDSGaaplg54cRSzeRlS/SlQU03nD3xnYavz4/yf/ByVWiZ66X5OOAAAAAElFTkSuQmCC";
  var ATTR_ICONS_DATA_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAAgCAYAAAD9qabkAAAsRklEQVR4nO19CZQcR333v6r6mJ6e+9jZa/bUrlbS6pYty7YkGzDYDjhA+ABDOAwmIeH4koBNYpMTHMD4SCDJMzhgMA6Y05zGxjKWbMu679We2nt25965u6evqu/1ahQUWbuShW0p7/Pvvd7ZmZ7uqq6p/1H/qwBew2t4DWcDgpcP+GW+38uGS7JT/4uATn8VRBFaWtsgUt8g8ILgYZTiqYlxPD42ugIA7MMAgDEA2AMAcxe36//rIADAOgB4PQBcDQDLASBcO5cBgOMAsBMAtgHAQQDQX8X20wDQDwDPA8DTC7R/aq4wuITwGgM49xCdGiMMwGjtPa79kAiAYbfHD52dbRCubxKDoXCQAW4DCiFKraZsJrXuxMTY2qnYrIRMGGRG6SgA+x4A9J2lMfu+rvkDExkACvOTm1p0/iQmaP6f00GtkxMKE7tfpx8SAHQDtZoB4AQADAKABf/7YI/H+wDgTgBoOs9rZgHgLgB4GADKZ5xDixAhOss5u/33A8AdF9D+dwCgBJcw/psBuDggMgHOQQDPDwEFBhgQxgh4AHvikSollFEGDoIJQYxjjGHBooJgMDEqgDvcWucWQNH1UtXULUAW5zAtaqhDFT0/XGE5xQLzfDuGBScnSC5O9NaJTn/UKfkaJOBFjnfKxOH0uiS3IHp8RI4EPYHuOv+KSLvn6jkWCydOTI1kj2d/PTCU2psslnKMEGSqFdByccXUqtVSbKJwnj1Av9Pc7INwJ+kHI4xFxPEECOERAgEZholll0/o6l7m5QTvKkZDbYZOOitYvcyoE1ugzeVWy8bx9O7YTmPg0QM8bz5tGMbcmQSJEPI3NzWsVRSVZedyGgDYx0xNwrwU4rWZR7stpbweT9OWrVsannzyN/fruh4/3xt0tDS92Z7E11y+EtwuCfYeHYaqbtx3qG/42wtds7a3+65I0Pfmy1d1w5HBcTg2NDFsE+7Y1Iz9eiG4FgC+BQAtF3j9NADcUpPK5wI6C/Hb0v6bv0f7UwDwofNs/6KAs/9ICHC9AA4/B7yIMcEIEEGARIyIiJBYMhmOVSyFIkt3EET8HPMQRt2WSX2dXtLZG5Xa3ndl6+UNG5taMaQQnEhmi2UlJ0iChfSA/tTu7L6/O6T8cLTMJhSbsSwGzGHMC5hzyBzv8vGiJyTI4XbZH10eEd0uDydIPBHcTlE0uMY67I94nA11PmmDJ4jWP3Vgl4SdKNrY082Fc1LGlPLTuaqmcQ6ZGUreIKb5IgG6uMZH8Ml5QRGADxHiRB6fiIKhCJJlN+J4yWYAPOZ4WZKCXkFqDYIZcTCBY9mGYMeqDeHO3uuXOgcT6YH+nYPb3KWhmVLmYL8nZGiDA/1n6wvX29t79bvf9c4133n40WPbntk2CQBuuyMAkDgPJmB31gEAnTbxbNm8Zd0nP/mJK4Aa8lNPbbMn8jkZwJtfd4XNPG7gCHk7R8gqpyQ+XlNvbUyc4/K+2sBByOfeunZZx1WA0J+uXd758x8/8ewOOH/Yz/uZmhT9fRCtLQn+EQA+D7CgAEJnEL9NF58FgL//PdtvqbX/T7XDuiQZgIvDvIswwcOB6MDA8RghCSOOICylderIlizT6xN8hCK1oppqWrG814TQ1a/r8ayPyrRr+SpPW/hqZ4A2YcQJNzG2tNrkz+80kdMA0ATrrZLRTk3L9bnD1QcPV+a58ouABRdHeA5jh8BxohPzcliQfEHJV9/qdkdXR7yR1gav2+ETOEHAvFPyezlXY5Cvr3OL0c6QZ0ma9MlPDf+ctXtWSWHvmqAUDAU6Ig0KFrA4GZtWS3MzOivm1fMfGlv6C/ZERLYu4AvUk0ikDfxhtyi73JgggQckcIAkN4DfQy1PiJn+JssQWqQeqWfTzctXbVgXEOLT2f0zuw983xsrjkSgMlPoaI27A5Y5OHCKpn4Hxlhuz979Q5+947PvffTRR6/55je/OfDVf//qzunY9PcBQAGA4rxutrAKaxNfQ2u05S8//olPvu3mm9/taWpuQje95Q+OVKvVcz57XTgop+cK7U2R4MfrQ/6tXa2N9seP/uU/f81WZc+JQ33D9tLme0/s2Av3/s2ffFmtap+emEn/VbGiSA2RsP3AhXgyrZ/HwNuEfxu8fLAJuQEA/nwBImRn0MR/AMBHXsb2/+609s9bC37VGABPMHEQSmSCeYkA4RBwGEDMGpY0UaF6d6ezc/M14dd9+yeZJ3KqduSDy/g3/dkK59sjAt/uDWGJuHge5CxCdQJibjdB0rUOSLtNEHwARp6Zk99u3BTOb25x8bsPV4yzMgDZ6xNFT1Dk3B5RcDWITAxw4ZZGX7S7q4Nil9vlc3lDbl+Ic4MvHBIi3ZFAgyhCkDCFi/qFwO7DR1mhnMNt9WuRX2wTvL0s+sYrVl3WGpTX3vHVbz0xegxPUMKfh83D/o7BTs4JYgHy4kAoiJYsXY683pAI4JUZkw0KTicG3scs7xJTc19LiaONuCDsWcaE5W/p8PauC7D4eHbHgR8feIyL5fdz5UISqqUqxcyyLEtfgIjNubm5/Q98/cGjD3/n4Xfc9te3Xblly5buT336U66du3beU7tGq73aBkUbzprUt997t161+a777rn33euuuGz+5DPP/BZ2PPf892tLiXPhhmyh/PHNG1b01of8YFgXPlcppeAQBVjRFYW+kakbACAIAHcDwIFzXPrpGvHbjODlxEdqtpAvn+N7d7zMxH96+7GaJnBpMQACFjgwEHtG2wNfNoHlTTCqDDk3RkhPTx1s2Lsrk4Vy1bqzV3z/u5byH/CDFaIejmfrfAIsayCw9EOAeANAHwUwpxjUv4EANCJbKyQbfusTjibqtF00tFBHpEBEckdaPU5/2Ovytcqyv9HZ2N3UJHrlDl1VqvVh0R8KeTpDAUdjax3XHJB5PyGUl4nHLGtJ/FjfD5lc72Zb33AdtCbW+GfL8aX1wcDy+oCj1+uWhyXJKVBRmn/exWET/ylYDBBlHn8QvP6wgTnZZShdayzd16Hpzvp02upmLm5d8yav27fSjZva3amWDuloqFEqjQ5lZ/f/4uhYaX98lGiJqmWWqro2Z0yM97PmaGgxRjT51LZtz+4/sP/aDes3BFetWhX67ve++5FP3/Zp8sMf/vArCJBtKzAoo7bl28QYt1BKbePU5ne+613r77/7nuvrAgEolUogyzI88sh/zRYLxWfOR/IQjNswQlvdTgkCXhfkimfaz84fhGDgOQ58Hhl4jtj3tY2S3zjHZdcAwJfglQGqLQMer3kM0FmY8LW15cIrhX+seQp+C5cI5gkCA0MEENYpYxqletFCOsFEqpfAzWFUt+2QeiBeZjNLw2jN1V52M1cyvGq7LAQ3hRykRcYgVRGQIIBjAwA+DEALAMzNAIkAhgdQyC86Ngab2Dem59eHZ4Pkr3c6PEE37wq4+EDA9dY3XXZFa0vd1QfGZqdJ0Kt6fBDtbnZ0BkN8087ir6XDLxzBToPA8p5OfmJuho5kJ6m7owGEljxeEjTqpvYp3T/adnCWx9V4MlcZcHsDbqtSslXoc0BEJ+eGysDmh1ShmloEvVoA2Stk6taKRz3RhjLi/JUyIL5lCb/G1y7LFaDm5PHy1MguPT+gJrRMIhdXJ0sVYlLKjIS3UikVpidGtFRiDCIRz2IdMBOJ+As/evRHfRvWbdg6PD5sNDY08g888MCHPC53yzce+uZuxpjtZrLX6hal1F5nvvvWW2+94Ut33x2glsH6Rwdg5ap16LHHHit///vff6g24c8Jm2DtgxACHMfNS/ALhUMQgCPEZiq22XT+nueAVDP4vdLz/X5b06m9p6cxAcd5MKiXA7YRddlZvBMX0QgocJyDYwQwYhYF08shTuKQ23Z6ZfJs8ooWua1lS8MNJ747YmYKBC/rkV3yBr/Ir+/AENyEADsZGBMIKAcguACoAWAOAeA+ACsO4G4HqCtKIVc8AMWzLwE5p8uBRUkwCYeJgycuF4mIiNatag5hRrDkEWVfOGg2/GjiQeej276OUgNxBALH3AN14OmoR6HWBqhYVfQfT95rzfQcc2xoe3P34QOGcSKZ2osFZ8nlq/OqhVxukbFAALYrzSLzhA8yBTAoQohl0lMgiBZpbIhi4iKzxFma9ji7B2RePNre0ul+favrpm2/HXQ/9syYW/aEO4WEo4nl+C3Y4CYASwrm0Qmn0/q+KHEIIWd+oL/vXMbIow8/8vAvbv7jm1csX7488MxvnzG8fi+59/57r4/U1/X+8xe++GOE0AHG5ufudXfcccdbbr/tNs/wyPC85N+8eTPq6zteuPPOO39QqVS+/xIm2+N+j6wGfK6PYoR6ZcmmiQuDUxJtTWWevKINQVvq2ozo2CKXvOv3sLafL+xlxfqaP3/gjHG5/iW4+X4fNNfcirad4dJgABxCmMPAWbaLD2OBJ1hEjImEIrKsDrc3hrg16p5EeOWWHu/GWzdEXcpxB8YaQHYWICgCzOxlkN7LYM0nMdT9HwBzhoF2gIFpMeBMDBZgFpvTOZ/XD7O2R+vFIPZktigSCEMtDYHI1FxFyyrG/hVtgc7GIG4pcTHPQ5Pf5n/67A9Ytj+FBU4AYhLkKMuooauLxfuOI3Miw5I8RQ+Vv2eZK0Rh3frXd5PDTYXYbCmX8xRSBUd8sRlNbGc6IDcG5KSE8CA7gbpcPHCcgJRyiQ6PjFLd5IiaLvBAq6oO9WoOOZ+IftApyXXu169YXt9RvyzkqMOCNXusatFKc2N8Ku5Mj4SHeAfZ5/WlRNHB61W1ci6CNOKJ+DP33XPflge+9sD10WiU27V3l8UYQ3d+9m+bNd38yP3336cghIJ/9Vefes8dd95Jjh49wgYHB+CqK65CpmGZX/7S3TsHBwd/YC8pzjf4ZGom3v+Pn7g5CwA3WZT2Cvx5rJgWAM8R26gJVV2HcMDbPzUT/9FiXweAf3iV4lI8NaPch05jAPaD/vUpengVcEdN27DtORcV8w+MEGDDQpaEkK2xCRYF0UdQYHUAVgccLDoxlddaIwL7w/d09rgbwInSDMAjIJAlBJ5uAKMAEPIAhK5mwJwI0BoE2TQFeQZBfMLSx0bN/MycUsznbVfW2TE/RRlzeWQhHPD6/W6nqyvir1sSckfHhUPuRzPfxTsOPwlKooiloBOwQMBIqBDY1AwIc6hwYhJ0VQVPox+t6rqMi9TV0wbRJZeDUn0hRz08EQWE+cUMSwyQiwGOUE4UuPr6gNHS7CdOJ4cx4sAwLTo1Pk3zc0nqdrsYx8dMjjqmky+kjCcaHblNl4UP3Hx90M8siJZVPVu/WXR2huqXPv5rc3l8NBjlsPQu0ZF8QBR5qapC9TxcQhMPP/Lws1s2b+n98J98uDWZTOKhwQEm8ARu/5vbncVi7nbbUnn7Z24jQwPH2YnhQVjS3oG6e5ZaD379wcHv/Nd3tteMXi9J1SyUlZoKzwMn21r5hYFSZo/ZvB3BMM7p/VoLAK3w6s35a85gir21PrzchseF0FRrbzdcEhoAAHJgQIQBZzBAEREFV3uhBzHwTpdBX7na37Kuy7VEPziMinuzmnelWwBeAAi4Aegcgub3IFCP2IILgdUHoMYYhFwIigJAWaFII0buSD6hGWxBBiCIiPhlkd/Q2dZ0dU/zmojP01YfkRoPkxd8Pxz9nr59cJsAOcqLkhOppjJv8/Y1RyDU3Q7D21+AarlEnX4/LpllVufwsj9quYkYWZc1F5iRPK6ih+c5G4v9wLbKD0Ar2ME7rZb2DodLEixmMsYoRwWB4WgrR2dik2Y+lwB/yAuYjJpW3p3o+4Fkxp6t5BwOr6NQREKGlkMzAdr2tuuC9ddv7iqUU8XOvucOXYeQp59w8l6EMsSW5ueQzDYlHrzzb+98buWqlb4rNm70G7oKY6MjoBs6+9wX7sK2vBwcHGDpmVlobmiEjZdfwXa9sGv2s3/72cdrhqZUbZ173rBOBh1CWalCSbH51IXhxFR8fv0vOQTgz61JvBFeXdjRfZXT3v/BqfiFVxHXXTIMQARAHg4cJgPs58C31AUNOgMjq0Dcz0O0O+ppctV5fdnBhB5cFRSh3oWgsRkgHATgfABMwMCFGVQHAbhjAEYCwLa35b0WeLuQvm+mMj1bPVHU590gZ4VLlsVQIOANuWV/UHaEGnzeRidPAz7LTTb6LsPiUiLs4feR5KFpYCoDi+jQvHU1pI6MQPLEAHO6XJgTTkbrqtUys0xGHbwEIs9jjBC145sw4MU5PLMN5RXE40bKI85kfEBEDi4MOk1Y1bIuSiHO71cgFkugkhJgHq8KkqPfgEJ9LlFwS2AhwMziq5aBS5fxAc4pdvmdQueGlU0j2bETTwxlKDAm2pJu/Dx+G7szs8lUcu9n/vozyx776WPrVq9ZS17YtQvGxyYBYx66l3UDsyzAvAArVq6Biqoaf/PXf9OXSqV+W5P+J8X5eaAhEu6OhHyOw4PjweZI0I0QypmWZbtsF7ObLIipeDouCvxwyO9poZSF/+DajavyJQU03cjtPzp4pit4E7z6UE/7/8qL0P7FeOazMwAHAaIzQCERPAEOhXQLqGlB2kHApZi01HcgMe5slMLN72gPiG11IjQuBRAbAbg2BEwCyPwLBWoBGBkGZpGBM4RgRjGtkZSqDezPHy/osZ0zdHfBWNgXLTscgsfr8RgWJ2RTWjLkNRslLATdxOdwR3yEK/OgTBWAqXTewhzoWALIwcHo9j3AAWGY55BhMEZ5i1WJAqlyiQY0v+ZySahqMLNUthTdXFQazsf123GRVc2OeKpaAq9W+HCkW2oLdxZGpndZqmZ5/VFQNIGVSyozqxxDjjImXMWFwCPpZlIqqgW3Z7lr4yffXf+WrSHcfM+Xdver6amvRbvrD8uzAbdxtNLEAJK1OP/FYPfV9lqMbd+xfecX7vpCzz/d9Tl3U1MzDA4NwfDQEFBLg97eVVAolMDhcKLPf/7z+R3P7Xih5vM/XcKdD+zgm+65fJlLZwtRQvCOFV0tdvz9WeM2zgPfi6fmpobGZ+7iCLlR4Imt8tr4ZS2u/3SshouL1RehzVVwqTCAgABOQoBltPlJU1gi2jY5RNOGoXEcSIjny7OTczONN6+sR043A10DUFQMqESB/AKBUwUQOpGV1BkbndYhLAHjXdQoJ0ql6dmJIxA8cTALz1cpyS8SjYkYBWRSi2lMB4ua+GntWfqE+jNjYvQEmjo+hiiiyBPxgkOUWOO6TjQ9MgGGqlJekpCuGFR0EsTLPCMiwfmyblBFLWOCIVcq69l8NqPp+mI6LQ7XtaF0ihFZ9hAGAgJqclZRMV294XWy39+Y2Dn8C8vixYZGj85MRjEWKSLdMqWtfk1RZalRX9t6pe89V18VbnNppvGfXxl8ZupI6hmHWC2kEkUTZNcxi4ELGHPUiPtcxjmtlliy8+577jaXr1j+6fe89z1IURWWzWRhJpYERglsuvJK+O4j/1X98r13P4QQmmCMKS9V9a8P+budkrhKN4z5dbumGblfPbP7KFwgHvrRk/HepR12DkDVIzvDnNsZrnkt7LXimbCDhC4mgv+ftHl2BqBSsEIYJIrtVBeknChTJaOY1agHR5hJc1i1snpSSRf2zKRD73pzI4yPGdbMrxgOiQjVe3F+VmRz254saiPj+XJWzxtspOj0ytb0aHFSLdHE7tnkvoJuzcy7hRZAWTWMQq5YyPsLc0xShZgw5v91+udkLDeE1EQRwuEw0kGHUroMjctWQpVWWUVPMSkoIy2vM0IxcwZ5RlpkCHojiOkO3BdLZidi0/uGp6ePVLW8YuiFRcNQ2zs7OZ6relrbLnNJbpcXCHUaVRcpHafWkjcteZ+pSs3xXXNHCQgGZsESYqIO1TrQNCx1btFv+KNbOm4JN0vygd2JzCMPHTtUTGQfc3qUMjPzJyaPD8zOprNF3SJlO7oYgJFzBOecnomEmpuamvfv3YfWr1/PrrjiCnj+uZ1gGAZkMmk4sG8vRJub8Lq1a5sOHjp0tHYN/1KszNGGUFY3zKRa1bFlUS8gkN64eUPEFgi/eW7/SzYG3PKON7knYqlgWVFtK2rForR8kv7Pqvm8lpV6MRlAmYIWrwKKyuDx8kByFGk9zVzdEhfXmcmZnNMtcKRqKtXtR2fhqj8IQ2Qzh4U5Szk+SrNPzVRjsUqZjqSK4OQrc1NqDKtsNmHm0ruycCxnodRkkU0XGCljNG/4OiuqOtP9fi/fEAq3mqISfsHY455MjvNGTuM8/gDiBR5SM3GI9q4AOwln5tAA0/J5xAcdCCMe9LwKFCjzef0o6GgCbY6ZY8lc4tDg7KH0XCmm66pBF08GcgRCTUEihTq9oS7BLBkNphl22Iv2qXGFSEmjaeXb1t2qNpUmikktDaMwpsT4iaRLaGh+Pen5wEeDb4AyNR9/YODgoYNjz6jF8qxDTJpUiw2kU6nY1NR0tVhQwKKGOe8gr1HDAjhFwLbLqnnN6tXv+vIXP/+Hv37iKXbvvffBF7/4BejpWQo7d70AkXAYZuNJaGqo5x/6xtdu+sAtH6kePnIkXbP+2y69843ntdVyd8Dr8m1c3X17Ra1eNTIx+3AtfPdCstne3dXWeIvH5YzqhvnrwbHpB2uf2xrNmci8Sj74hZC9CO3bbcKlYQRkFAV5EIIO4jRMSjTdIk5EuphF29rCnN9NdB/mqMDX+TmoqgY43QKUg1Z+34HcnqcTMeCQ2bSpzW85He5K//FKqEGCIgM9k6gmEgpL5AFV7CWGPp9VfHYwEsSNjS3hZR1Na8fd+9temPmNIxmLIx5EpGt5YAZApLUXHG4vDDz7POSTceAdDuTnA1Dxl8HjkaGuPYoCrlaIoh6WK1QL5QpNqZpYUVRL06pqVauWFpSIbo9HcHsbhIru7EZ+tEpuCjdEHF1O4qTeFFdE7c2ye2uDW1C2BhpHZisBbZXSnc2CVQ14yC2Xc20T+xPFX/+0b09qYuppBJU04c2MoWUmZ6ePZWKTfaqiWjogDwDSbcJeDKRmpfbZtrloNPpn/3L/PdeGAgF+yZIl7IXdu+H++++Dj33sY1BfVwdj4+Osvq6ezSbi0N7a7Lz/vnuvf/8Hb6lOT0/buQFDNUZgP7f9fkGu8/NtL+yyX//1sx+1pf6HC2VlvWVSO4HlEbgA2EsKjpBNHpdkRwROfOXbj/1mka8fvcgM4OhFaH+xoKhXlwE4XbLLS1Q5nTNUf4BragqQRsysLsugHSByQebERGoLEvfWLXXglhlU+g2m5NVywJvO0dSIw7CcUDWd5cPjZcqQeixmjByKWwfSRRovEzAwR5AbI75szPu/zwqny+VU8kB1Zhkx9URweHIQWJFhpCHG8Q7Wsnot8JITDW/fCfl4jHnDYQgF66BCS4AB065lK4DUiewP5evxUrqS7iwn05lcfqZSyucNLa+Z5TnNUgoLMgA7bp4nHAVdXemKuK/quHZFw6rmRghJxN3g45GTQ3QqR2f3PXnst4m0KllEdtSvb1jy9693tnpic8K93z06UElOHSCCUmZ6OpudnTg+E4sV5rLTlqElKYDJ5jN6OZ+t2p+FESIOgNlEv6QWLVb1eLwf/7d/veeNPMejA4ePM3/AB06XA471H4Wf/ewn6MY33wSxmTjrH+iH1pYoO3T4GOvo7Ip85atf/aMPvP8DQrFYsGMBbLuO7X4dRoAK7ByqR2rupIbudTnhqnV2xCrAA9+z7XYvDcs7o2AYJmQKJVCq51yJbK9F4r2aSwHpNE/A86eFB79amGe4lwQDqGh6NYsYkjns0Q3kotRsrFtetybYE2iVXMTpafXy0fXdorPrSgm0nAW5kUoFebTMROm4Xtb75DqpO9+fTZRnlWJKF2aOTOtH5XqJCy5xXHHgWH6/jJCpWoxq5sLqaCAUDrhkp5+GFJ/hNiW7+o1p6cxf18gaVqwDyzDwkd88xdRMAXxyEOpcEWRhnTocvHHj+pvxgNlvtjrb0XrrdTA2rs0mk5XhZC4xpVbiRascU63SnGqUFohDtnVtr9chOIR3L728YVP0ujUkIXmGfnIgN8lNFSyvl3N4Q0j2eIkpFYv93onZvImIR52cPDhlrr4KBa3VlerEOKaJI6W5mfH41Egsk05UlMosA1B/98xCHQaziGrS+PTgeDtgfg1BcPmy7sg1be2hJXv3x6IfufUDvkKhCMcHTzC/Pwhj4zPg8figR/agb33rO8nxiWnu+uvfGBzq79MPZlMsGm3FO559lkWjTeG/+MSt7/z6g9+86vL1TZmx8Uz/wEjyl5Si54CxRSvUNNUFTnaV5+cTen65fd+fhkMBWxP4WjpT4w7ngflCMjwHfo9rPjNwMfA8fto0qcrYfGbjq4FyLZdCrb1/vLYEerXat/EUXCoMwDJMEziGsUDcpm6FwkGu59oPbl2NeENOHBtWvBzD3PHjFaVolh2tERFlZ/PKaHW6OJY5AoSksU49pM3jFeu8xvgv40cUk2U6oo4VWYp8lkUpQ4gazJZ6C1sBvS6vKxLyB2UfBCxsMImXmbu9A4ciLSg3G2PThw4zfc4A0eNiyM2xgkNhkfp6+p6udzPwIoOknNpb6HvJdKKQ7ZuZ7J+cih0s59OzRjmlmpWMaqpzVaZXTqXQvgh+f/CGUFPorb1XdvGxoNPKKdyRyr7ZfnMsPpGtZsoMaTHRbQWZ7BEFpZThzRRjwMG2n8Me/zL/Bt7NqbP9I8enJvqSpVK2yqit7NjZFKfBUtjJRIl5/E9JzGjDjdct/fMvfO7tS3QmCydGDXT4aIo9+9wuaGxuhLGxQVAqKlx59Va0b+/ewqFDh+8ZGhpx+z3uT/Su6PHseO453TA05pC8ZPszz9Hmekn++r/c1tPRySyCyytu+9ufuH715NDhxUpUtTTVt/34Ny9c/s4bNgftAB6LUtANw2sPz0uNkpsPKEIIZIcI8UyuraWpYatdMGRqJv6ita/XLZyYy1fHGJuvm/hKawF2WKK9HLHOUMftoJzNNdvLKw07HsZO6LpE0oEZsv2ADqzpvqYl7t43/cUbrom0SIH/+NSTw/1D+cmwDNmlTbjY3nWCReqdJBjm+ex4cWYyoU9owLkzFaiEOj1sbn/2xGzVHIqEsUOdyJf2x62DVURKdmKBnWUv8YgsZJcOuv2O+kY5Mu3c45osDasBf0h0cAEcHxyGfHwaZLeLeeqcQDlqhcIhq7d1PfrDtneQVlaP+7VB7W3yNdjMuTI9bVRWlFLHb7Zt/1ExkRo3KkWgRtGkpmIiurARkOM50BTHge2/VHuNZWbjVVsdLcqmYOZZMpcxkmqM5cqmkS8fh+IUYsgEzOY0jCSi5s146cSSiXhsIDw+sjtZVfIagN2OTd/V/0nkVtl+f0ojOH0CUgRoO6XmgURseEVF5VlXWzdT5nIgmXE41j8NTnc9bNhwGRodHc088sgj91BGD5crJf4r//bvcPun/uLW1b29dXv2HTAq5UG6vFMnna3NqL01iMZHh5FLpiFKzQkGqHQOz+MNyWzhHzP5otdmAIqiwbplSx7Yse/4d88jbuF/oKJqwBEMnNMBEzMpW73uAYCPA8CLKgM5RFKkdD4N+NuvAgMo1tKCq6d9Zv8Wn6tpAq8GA7jrUsgD+F02IEY8ZcxpWuBRq+C1KObGd48qIyP58YLF9+dzMIR4VFWKRX1ntRiXfIJDN5igVMG7vAGvaA7zDanfzo4OHyw+zzsxrXNi/0DOmslbKCUJQJwEYR5hIaPRBVXwaKOn2WrNtxT9WclfjrCqRHXdyhPwaDgQaEE+bxA8Hhcs4Xvp5YEt0OFYannUQDnPUmw13uQciCVShUry6I3RnpVGuVhMzsRmNFUpI1MTqGGZ1KLUsJOTFgBCsCc1Wz7UN5RdmT/Of3TlSmn91b2e8uS0aA5RP3D67M9NJUvmsqpVKc2Yw0PPmFdtvRlZjKnZbKE0fWKvVlUqBtieDvbf1bnQi5jAAmCMlR7fNvpxn9fEt39s4x9b6gSLeOage5MTZnMWtHetQKZhwLe+9a09mUzm0Zr6KqQzmemv/+dDDX/1yY+9c/myXuf4SJa9YRPBhUKCGVWA5mbC3/PVPf/6xFOjX0BAqmyRFASLUtm0rLBl0nkJruo6SJJQTGfmXnI0oKrp8wlBkijYtoD5+54MOn0xYvGKPUY/qRHGK50ROFoz+qEzPn+hljhlM6pXWvpfkGH1FWMAAsdkDlkhE+P6ieESPP/lX6bf9vGrOno3triOHpxN6VU6aSlYOWEh88iMcaJ+jnqWNYhreYF0ShyO4qqJk7NGIiWJWlhkkZRG6WCJzbpFhNwcEA/BnEIpNexk4wVQF5VDiDFSN7lurMezuYX61MYpbQzSRsKoWAzapW6uW14FdagFaEnMjE9mJ+PFwcSShlBQw3r9C339e0dOjG3ftWffk0PDw7lKpZRCmPKWpmiWqhiWplvWqQq6ZwFj0Bhola5943Uda7zNXjdWc5l9B2dAGRp+0hrPirxMabmSMEeHj7NicWyeivqO9oFpyciUsGGWEzqAxoDZmS/aBZV+Zgz4nc+VPE93zsHWayOg6ACpTBZWL18JguyBB77xn/Gx0dFv1KRYvnaZOjI6+sS3H/mvpX/y4Q9f7lke4UZG+6jL60WMWeyZX6XM53dkfZQBIwghaxEVgFKWZgz6q7oRLStVt2leeAk7e1VpUQvypfn/05ZF7ZJgi9kflFqarG0QfCXx0ZrER2d8rtfOvdLtv/9SqQXwu4IgJnWJAtRjxhpCzVJTz+UNYd3ropHuRpEdTKaAsoTBsJUqWGp3mK+7pkda6ee5dsukjU6BmiMJa3RWZzOSwGQHz4TDaTbGY7AaHMTF2Rn2DGjBZLpFFxY/+44dOy4MOKdFwoudPXJXR6Rr/Uqhy+8L8B7ECQ7M3Hohj4qH4hPDI6MzR6dnEmMOAQxViS4pFgoDuw8e3xWbnh4rl+ZKVNc0HmPOUFVTLxWqVqVUtQzVBGvhtDRG4X2RdnlTYKlXmxjOTRw8EouR5MTecr6iirwxQxUFUskZq1gcqxGQExVymfk8ZtEhA8EmsuwnBa3G5JzopLH//DQAACTVBeSfrO9p3HpiqEx1psLlGxsQ0ArUuRH6z+/+NL1338E/BYC9tQl06r42UY3s3nfgp00NoY4/fW9zpFzgsC/ggaeenrCmhy1rXU/T+yqaZmUKij3BF7PIPe5yOqZiicxdVU3f1FgzCF4I7MwLWwsYHp+FfEl5vBZPcK6w4h21tGD7eCXwmdNKkrGL0L59X7s6E1xSDCAc8nZd0StsqcxVm9rbvc3B1Y3cg/++//nsjLKHmZCVBUJMADMoEWlpAxeRRcyVS2bCTRhMFszhWNGaZYRV6yRwTxYhXTWg2CQRp4sHXrWoWbaQmTOZZrGFpc/evQeOE1F0YIETD4xIgz6vd9/yjqXtt970+rcXq9D464NHd0ymUsMTk1Mj6UxqRsQcjQQDwb37830zyUQ2PZtIMUunAkGcaVmGWSlVTaWgmaW8SpWSTnXNtKvxLdQ+QiCaFev4xO5E/8CxsaQWTw4hS5kjPCiamanEpwfp+NjB0/pvG/QEC3E8zwydWtU5+juLv0389vnzRiDsc+948xVLeglHaLqksImdGpPcEr7xunaUzeZh48oM95un8WUlhY7VNIBTxkSboE2PjIWNK9PULbuhvbUDPf7krPHsjhR1Ox1m0O2ovvXKrut/vmf0ztRcecHJHU+m01euXba/omoP6cZcLjVXuDHodd/wfz/4tsi+oyN2WfAdB/uG9i10/brepTdGgr7ll63qsrMBLytV1LSiao8bpvWjZDrz4iqoZ8fnaz75l7su39cA4N6L2P6DL0OV41eGAWzcFFlXx5ebHXVC/eregP/Rp0aG9j+XeN7Lw1DII1S8EvCGTbwYULHMlCnTnPUQJBeolY+VraJOme7gwVUyoJpUWFwSwHIKyFE0oFo2kJ7SWbVsgaEtogEopUyFqSK1MKnOZXBxmsyk04nEiE9CxTml6t++5+CBilJNV4t5RasUysH6iJzQK2Z+Lq9UdV1DwBBlBrOUsmaUcopRyqpmpWSYVdUwddWkdtwsO8Mq/z8xAbpQVEtqWqympykuZnUzn0lPn5hLpuLaXGra+h1xz/eYAXYCwwgZagkxwzzNqPOSVwBcU3N0SaqoFwhiaCiWA0U32PDXs1ahspSzTF0DCgnC2Ynblu2qIsBq3UHETmPFmCNKpQrjT26fRHbtg0d+cEK3KEYuSTM66j2qadFYtCnqTc3ZhXAWxo+feNbWKB7saGm21/3rr7m893Vul/S62mk7pmBBBgAANwLAO+x/4ukcHBuetMuE3z02GTtf4rdh1arnTtcKd8xXZobfD/9QIz7rJbQfr7X/cuCSLQs+P7BblwXXL1fz163scm/o7XY3/mx7avdYWj/kJnzaiVHawFACAsiOXueBIQ5hIhLgDcqYYlJDp2AiAK5sgJVRzZJfwLydsZus0opqglE86f9HOZPpCzGByLK1Pk9LR70FCNtuYwqIIjufXHLyumFSXataWFdNQ1VMXavqguwhnOQSiSDalcJ5i1GkF/Oamk2WqsU5xSzndEupGMw0LGqZ1nx5mkWwdNmym69/60fRdFIbq5bmcoXMaHp6/FAxmZilWpWys6rypJMDpAlgZSkwqp1c+wsIQGcnNxaxr1t07C+pbaJOR0dLsy0chGsu753fGKSmARgH+4YWdKWu610qRII+ztYA5jcGGZ60Ga4+Nhl7SYlJp8EubWzvZ3Ch7kGbiXzw9yjC+fpaKTN7f4FXemOSi4L/HlQPAbFZxtE1fuHqomKkLYwTILqKllKplCkYdqKsyWw7EZv35vP2rkEIkGrNr6xtB5udS4R4xDBjjJUNyyhbmGoMW1WbAO3V8CIawMWGx+ttXn/ZVaJlmko2Ozd3/Nj+xd00nBMDw9wZvv0Lha/mljrFFE4ZqWjNLXWKgOx2zpHSPP/9U0lE5mn++1Ov9vXcS6kVcJFhR+y9p6aa15/nNYmaW+9sW4O9VLhrhrvPvoT24zWN49uXksHvbHgtC6sGjDFyyjKUS6VzSWVbDz+zishreOVxanPO62qbc9pxynVn2ZxzW83Q90ptDvqGWvsrztgc9Php7R+6VPz8r+E1vIZLeHtuuMj4f4jFI9izCXSLAAAAAElFTkSuQmCC";

  // src/ui/meter/css/meterBodyCoreCss.ts
  var METER_BODY_CORE_CSS = `
.ecu-meter-report-mark {
  color: var(--meter-accent);
  font-size: 11px;
  line-height: 1;
  flex-shrink: 0;
  opacity: 0.95;
}
.ecu-meter-inspector-class {
  display: inline-block;
  width: 4px;
  height: 14px;
  flex-shrink: 0;
  border-radius: 1px;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.55);
}
.ecu-meter-inspector-sub {
  color: var(--meter-muted);
  font-weight: 400;
  font-size: 10px;
  margin-left: 4px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.ecu-meter-shell.is-inspector .ecu-meter-player-tabs {
  background: #161a22;
  border-bottom: 1px solid rgba(0,0,0,0.55);
  padding: 0 4px;
}
.ecu-meter-shell.is-inspector .ecu-meter-player-tab {
  font-size: 12px;
  padding: 5px 10px;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.ecu-meter-shell.is-inspector .ecu-meter-player-tab.active {
  color: #ffe08a;
  border-bottom-color: #c9a227;
  background: rgba(201, 162, 39, 0.08);
}
.ecu-meter-shell.is-inspector .ecu-meter-inspector-body {
  background: #12141a;
}
.ecu-meter-shell.is-inspector .ecu-meter-status,
.ecu-meter-shell.is-report .ecu-meter-status {
  border-radius: 0;
  border-bottom: none;
}
.ecu-meter-shell.is-report .ecu-meter-report-tabs {
  background: rgba(0, 0, 0, 0.22);
  border: none;
  border-bottom: 1px solid rgba(0, 0, 0, 0.55);
  padding: 0 2px;
}
.ecu-meter-shell.is-report .ecu-meter-report-tab {
  flex: 1;
  cursor: pointer;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--meter-muted);
  padding: 4px 8px;
  font-size: 12px;
  margin-bottom: -1px;
}
.ecu-meter-shell.is-report .ecu-meter-report-tab:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}
.ecu-meter-shell.is-report .ecu-meter-report-tab.active {
  color: #ffe08a;
  border-bottom-color: #c9a227;
  background: rgba(201, 162, 39, 0.1);
}
.ecu-meter-report-tabs {
  display: flex;
  gap: 0;
  flex-shrink: 0;
  border: 1px solid var(--meter-border);
  border-top: none;
  border-bottom: none;
  background: var(--meter-panel-2);
}
.ecu-meter-report-tab {
  flex: 1;
  cursor: pointer;
  background: transparent;
  border: none;
  border-right: 1px solid var(--meter-border);
  color: var(--meter-muted);
  padding: 4px 6px;
  font-size: 14px;
}
.ecu-meter-report-tab:last-child { border-right: none; }
.ecu-meter-report-tab:hover { color: var(--meter-text); background: rgba(255,255,255,0.05); }
.ecu-meter-report-tab.active {
  color: var(--meter-accent);
  background: rgba(201, 162, 39, 0.12);
}
@media (hover: none), (pointer: coarse) {
  .ecu-meter-chrome-hover {
    opacity: 1;
    pointer-events: auto;
  }
}
/* Report dialog */
.ecu-meter-report-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483001;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12vh;
  pointer-events: auto;
}
.ecu-meter-report-dialog {
  min-width: min(420px, 92vw);
  max-width: 520px;
  max-height: 70vh;
  overflow: auto;
  background: linear-gradient(180deg, #1a171b 0%, #121114 100%);
  border: 1px solid rgba(0,0,0,0.85);
  outline: 1px solid rgba(232, 201, 106, 0.28);
  box-shadow: 0 14px 34px rgba(0,0,0,0.62);
  color: #eee;
  font-size: 12px;
  padding: 0;
}
.ecu-meter-report-dialog-hd {
  padding: 10px 12px 8px;
  background: linear-gradient(180deg, #34292d 0%, #241c20 100%);
  border-bottom: 1px solid rgba(0,0,0,0.55);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
}
.ecu-meter-report-dialog-kicker {
  font-size: 10px;
  color: rgba(220, 210, 210, 0.72);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 2px;
}
.ecu-meter-report-dialog-title {
  font-size: 13px;
  color: #ffd28a;
  letter-spacing: 0.02em;
}
.ecu-meter-report-dialog-sub {
  margin-top: 2px;
  color: rgba(220, 210, 210, 0.72);
  font-size: 11px;
}
.ecu-meter-report-dialog-label {
  color: rgba(220, 210, 210, 0.72);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ecu-meter-report-dialog-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px 12px 0;
}
.ecu-meter-report-dialog-count {
  margin-left: auto;
  color: rgba(220, 210, 210, 0.72);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.ecu-meter-report-chip {
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.05);
  color: #ddd;
  padding: 3px 8px;
  font-size: 11px;
  border-radius: 2px;
}
.ecu-meter-report-chip.active {
  color: #ffd28a;
  border-color: rgba(232, 201, 106, 0.45);
  background: rgba(232, 201, 106, 0.12);
}
.ecu-meter-report-preview {
  margin: 4px 12px 10px;
  padding: 10px;
  background: rgba(0,0,0,0.28);
  border: 1px solid rgba(255,255,255,0.08);
  white-space: pre-wrap;
  font-family: Consolas, Monaco, monospace;
  font-size: 11px;
  line-height: 1.35;
  max-height: 220px;
  overflow: auto;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
}
.ecu-meter-report-dialog-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 12px 10px;
}
.ecu-meter-report-btn {
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.16);
  background: rgba(255,255,255,0.06);
  color: #eee;
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 2px;
}
.ecu-meter-report-btn:hover {
  background: rgba(255,255,255,0.12);
}
.ecu-meter-report-recent {
  border-top: 1px solid rgba(255,255,255,0.1);
  padding: 8px 12px 10px;
}
/* Player drill tabs */
.ecu-meter-player-breakdown {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}
.ecu-meter-player-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 2px 4px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
}
.ecu-meter-player-tab {
  cursor: pointer;
  border: none;
  background: transparent;
  color: #9aa;
  padding: 3px 8px;
  font-size: 11px;
}
.ecu-meter-player-tab:hover {
  color: #eee;
}
.ecu-meter-player-tab.active {
  color: #ffd28a;
  border-bottom: 1px solid #c9a227;
}
.ecu-meter-player-summary .stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 10px;
  padding: 8px;
  font-size: 12px;
}
.ecu-meter-player-summary .stat-grid b {
  color: #ffd28a;
  font-weight: normal;
}
.ecu-meter-row .ecu-meter-who {
  font-size: 11px !important;
}
.ecu-meter-row .ecu-meter-vals {
  font-size: 11px !important;
}
.ecu-meter-icon {
  width: 14px !important;
  height: 14px !important;
}
.ecu-meter-body {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  overflow: auto;
  position: relative;
  padding: 0;
  background: var(--meter-panel);
  scrollbar-width: thin;
  scrollbar-color: rgba(180,180,180,0.35) transparent;
}
.ecu-meter-status {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 8px;
  border: none;
  border-radius: 0;
  color: var(--meter-muted);
  font-size: 11px;
  background: rgba(40, 44, 50, 0.7);
  flex-shrink: 0;
}
.ecu-meter-status.is-clickable {
  cursor: pointer;
}
.ecu-meter-status.is-clickable:hover {
  color: var(--meter-text);
}
.ecu-meter-bar-list { display: flex; flex-direction: column; }
.ecu-meter-row {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 3px;
  min-height: 16px;
  height: 16px;
  padding: 0 4px 0 2px;
  cursor: default;
  font-size: 11px;
  color: #fff;
  font-weight: normal;
  text-shadow: 1px 1px 0 #000, -1px 0 0 rgba(0,0,0,0.55);
  background: transparent;
  border: none;
}
.ecu-meter-row.clickable { cursor: pointer; }
.ecu-meter-row:nth-child(even) { background: transparent; }
.ecu-meter-row:hover { filter: brightness(1.12); }
.ecu-meter-row.you { box-shadow: inset 2px 0 0 var(--meter-you); }
.ecu-meter-row.is-selected { box-shadow: inset 2px 0 0 var(--meter-accent); }
.ecu-meter-splash-hint {
  color: #d4a017;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  opacity: 0.92;
}
.ecu-meter-row.has-skill { min-height: 18px; height: 18px; }
.ecu-meter-row:last-child {
  border-radius: 0 0 2px 2px;
}
.ecu-meter-row .ecu-meter-fill {
  position: absolute;
  inset: 0 auto 0 0;
  opacity: 0.78;
  pointer-events: none;
  border-radius: 0;
}
.ecu-meter-row:last-child .ecu-meter-fill {
  border-radius: 0 0 0 2px;
}
.ecu-meter-row .ecu-meter-rank {
  color: #fff;
  font-variant-numeric: tabular-nums;
  width: 16px;
  z-index: 1;
  font-size: 11px;
  opacity: 1;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
  margin: 0 !important;
}
/* Avoid AL global .name styles \u2014 use ecu-meter-who */
.ecu-meter-row .ecu-meter-who,
.ecu-meter-row .ecu-meter-label,
.ecu-meter-row .ecu-meter-vals {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
  text-shadow: inherit !important;
  font-weight: normal !important;
  padding: 0 !important;
  margin: 0 !important;
}
.ecu-meter-row .ecu-meter-who {
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  min-width: 0;
  font-size: 12px;
  color: var(--meter-text);
}
.ecu-meter-row .ecu-meter-label {
  overflow: hidden;
  text-overflow: ellipsis;
  color: inherit;
  font-size: inherit;
  line-height: 1.15;
}
.ecu-meter-row.clickable:hover .ecu-meter-label { text-decoration: underline; }
.ecu-meter-row .ecu-meter-vals {
  z-index: 1;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  font-size: 11px;
  color: #fff;
}
.ecu-meter-row .ecu-meter-pct { color: var(--meter-text); opacity: 0.75; }
.ecu-meter-icon {
  display: inline-block;
  flex-shrink: 0;
  background: #0a0c10;
  border: 1px solid #1a2230;
  border-radius: 2px;
  overflow: hidden;
  vertical-align: middle;
  text-align: center;
  font-size: 11px;
  color: #ccc;
}
.ecu-meter-icon-clip { display: block; overflow: hidden; }
.ecu-meter-icon-clip img { display: block; max-width: none; image-rendering: pixelated; }
.ecu-meter-tt {
  position: fixed;
  z-index: 10000;
  max-width: 300px;
  background: #121820;
  border: 1px solid #3d4d63;
  border-radius: 4px;
  padding: 8px 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.45);
  pointer-events: none;
  font-size: 14px;
  color: #e8eef7;
  line-height: 1.35;
}
.ecu-meter-tt h4 { margin: 0 0 6px; font-size: 15px; color: #fff; font-weight: normal; }
.ecu-meter-tt .line { display: flex; justify-content: space-between; gap: 12px; }
.ecu-meter-tt .sec { margin-top: 6px; color: #8b9bb4; font-size: 11px; text-transform: uppercase; }
.ecu-meter-tt ul { margin: 2px 0 0; padding: 0; list-style: none; }
.ecu-meter-tt li { display: flex; justify-content: space-between; gap: 10px; }
.ecu-meter-inspector {
  display: flex;
  flex-direction: row;
  min-height: 0;
  height: 100%;
  font-size: 12px;
  color: var(--meter-text);
  background: transparent;
}
.ecu-meter-inspector .ecu-meter-inspector-body {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
}
.ecu-meter-inspector-tabs-rail {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 72px;
  border-left: 1px solid var(--meter-border);
  background: rgba(0, 0, 0, 0.18);
}
.ecu-meter-inspector-tabs-rail .ecu-meter-player-tab {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 6px;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  background: transparent;
  color: var(--meter-muted);
  font-size: 11px;
  cursor: pointer;
}
.ecu-meter-inspector-tabs-rail .ecu-meter-player-tab:hover {
  color: var(--meter-text);
  background: rgba(255, 255, 255, 0.04);
}
.ecu-meter-inspector-tabs-rail .ecu-meter-player-tab.active {
  color: #ffe08a;
  background: rgba(201, 162, 39, 0.12);
  box-shadow: inset -2px 0 0 #c9a227;
  border-bottom-color: transparent;
}
.ecu-meter-inspector-compare {
  display: flex;
  gap: 1px;
  min-height: 0;
  overflow: auto;
  background: var(--meter-border);
}
.ecu-meter-inspector-compare-col {
  flex: 1;
  min-width: 0;
  background: #12141a;
  padding: 6px 8px;
}
.ecu-meter-inspector-compare-col.is-you {
  background: rgba(201, 162, 39, 0.06);
}
.ecu-meter-inspector-compare-h {
  font-size: 12px;
  color: #e8eef7;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--meter-border);
}
.ecu-meter-inspector-compare-stat {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  padding: 2px 0;
  color: #c5d0e0;
}
.ecu-meter-inspector-compare-stat b {
  color: #ffd28a;
  font-weight: normal;
  font-variant-numeric: tabular-nums;
}
.ecu-meter-encounter {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  font-size: 12px;
  color: var(--meter-text);
}
.ecu-meter-encounter-tabs {
  display: flex;
  flex-shrink: 0;
  border-bottom: 1px solid var(--meter-border);
  background: rgba(0, 0, 0, 0.15);
}
.ecu-meter-encounter-tab {
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--meter-muted);
  padding: 5px 10px;
  font-size: 12px;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.ecu-meter-encounter-tab:hover {
  color: var(--meter-text);
}
.ecu-meter-encounter-tab.active {
  color: #ffe08a;
  border-bottom-color: #c9a227;
  background: rgba(201, 162, 39, 0.08);
}
.ecu-meter-encounter-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 6px;
}
.ecu-meter-encounter-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  font-size: 11px;
  color: #8b9bb4;
  margin-bottom: 6px;
}
.ecu-meter-encounter-stats b {
  color: #c5d0e0;
}
.ecu-meter-encounter-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.ecu-meter-encounter-widget {
  border: 1px solid #2a3545;
  background: #0e1218;
  min-height: 80px;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.ecu-meter-encounter-widget-h {
  padding: 3px 6px;
  font-size: 10px;
  color: #8b9bb4;
  border-bottom: 1px solid #2a3545;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ecu-meter-encounter-widget-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.ecu-meter-timeline {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  padding: 4px;
  font-size: 11px;
}
.ecu-meter-timeline-tools {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
  flex-wrap: wrap;
  align-items: center;
}
.ecu-meter-timeline-meta {
  color: #666;
  margin-left: 4px;
  font-size: 10px;
}
.ecu-meter-timeline-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  max-height: 260px;
}
.ecu-meter-timeline-lane {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
}
.ecu-meter-timeline-name {
  width: 64px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #aaa;
  flex-shrink: 0;
}
.ecu-meter-timeline-track {
  position: relative;
  flex: 1;
  height: 14px;
  background: #1a1a1a;
  border: 1px solid #333;
}
.ecu-meter-timeline-bar {
  position: absolute;
  top: 2px;
  bottom: 2px;
  border-radius: 1px;
  min-width: 2px;
}
.ecu-meter-timeline-death {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e53935;
  z-index: 2;
  pointer-events: none;
  box-shadow: 0 0 4px rgba(229, 57, 53, 0.6);
}
.ecu-meter-inspector .ecu-meter-inspector-spell {
  padding: 2px 8px;
  font-size: 12px;
  color: #8b9bb0;
  flex-shrink: 0;
}
.ecu-meter-inspector .ecu-meter-inspector-summary .stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 10px;
  padding: 8px;
  font-size: 12px;
}
.ecu-meter-inspector .sec-h {
  font-size: 11px;
  color: var(--meter-muted);
  margin: 4px 8px 2px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ecu-meter-inspector .stat-grid b { color: #ffd28a; font-weight: normal; }
.ecu-meter-shell .ecu-meter-tab {
  cursor: pointer;
  font-size: 12px;
  padding: 3px 8px;
  border: 1px solid var(--meter-border);
  background: var(--meter-panel-2);
  color: var(--meter-text);
  border-radius: 2px;
}
.ecu-meter-shell .ecu-meter-tab.active {
  border-color: var(--meter-accent);
  background: rgba(201, 162, 39, 0.12);
  color: var(--meter-accent);
}
.ecu-meter-outcome {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
  font-size: 13px;
}
.ecu-meter-outcome th,
.ecu-meter-outcome td {
  padding: 4px 6px;
  border-bottom: 1px solid var(--meter-border);
  text-align: right;
}
.ecu-meter-outcome th:first-child,
.ecu-meter-outcome td:first-child { text-align: left; }
.ecu-meter-death {
  display: flex;
  gap: 0;
  height: 100%;
  min-height: 200px;
}
.ecu-meter-death-side {
  width: 132px;
  flex-shrink: 0;
  overflow: auto;
  border-right: 1px solid var(--meter-border);
  background: rgba(0, 0, 0, 0.15);
}
.ecu-meter-death-side button {
  display: block;
  width: 100%;
  text-align: left;
  cursor: pointer;
  padding: 8px 6px;
  border: none;
  border-bottom: 1px solid var(--meter-border);
  background: transparent;
  color: var(--meter-text);
  font-size: 13px;
  line-height: 1.25;
}
.ecu-meter-death-side button.active {
  background: rgba(229, 57, 53, 0.12);
  color: #ffcdd2;
  box-shadow: inset 3px 0 0 #e53935;
}
.ecu-meter-death-side-num {
  display: block;
  font-size: 10px;
  color: var(--meter-muted);
  font-variant-numeric: tabular-nums;
}
.ecu-meter-death-side-time {
  display: block;
  font-size: 10px;
  color: var(--meter-muted);
  margin-top: 2px;
}
.ecu-meter-death-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 6px 8px;
  gap: 8px;
}
.ecu-meter-death-hdr {
  flex-shrink: 0;
  border-bottom: 1px solid var(--meter-border);
  padding-bottom: 6px;
}
.ecu-meter-death-victim {
  font-size: 15px;
  font-weight: bold;
  color: #ffe0e8;
}
.ecu-meter-death-meta {
  font-size: 11px;
  color: var(--meter-muted);
  margin-top: 2px;
}
.ecu-meter-death-killer {
  font-size: 12px;
  color: #c5d0e0;
  margin-top: 4px;
}
.ecu-meter-death-killer b {
  color: #ef9a9a;
  font-weight: normal;
}
.ecu-meter-death-chart {
  flex-shrink: 0;
}
.ecu-meter-death-chart .sec-h,
.ecu-meter-death-sources .sec-h,
.ecu-meter-death-log .sec-h {
  margin-bottom: 4px;
}
.ecu-meter-death-sources {
  flex-shrink: 0;
}
.ecu-meter-death-source {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 2px 0;
}
.ecu-meter-death-source-icon {
  width: 16px;
  text-align: center;
}
.ecu-meter-death-source-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #c5d0e0;
  max-width: 120px;
}
.ecu-meter-death-source-bar {
  width: 72px;
  height: 6px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 1px;
  overflow: hidden;
}
.ecu-meter-death-source-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #c62828, #ef5350);
}
.ecu-meter-death-source-amt {
  font-variant-numeric: tabular-nums;
  color: #ef9a9a;
  min-width: 36px;
  text-align: right;
}
.ecu-meter-death-log {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.ecu-meter-death-log-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
  margin-bottom: 4px;
}
.ecu-meter-death-filters {
  display: flex;
  gap: 2px;
}
.ecu-meter-death-filter {
  cursor: pointer;
  padding: 2px 8px;
  border: 1px solid var(--meter-border);
  background: transparent;
  color: var(--meter-muted);
  font-size: 11px;
}
.ecu-meter-death-filter.active {
  background: rgba(201, 162, 39, 0.12);
  color: var(--meter-accent);
  border-color: rgba(201, 162, 39, 0.35);
}
.ecu-meter-death-log-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--meter-border);
  background: rgba(0, 0, 0, 0.12);
  font-size: 12px;
}
.ecu-meter-death-log-empty {
  padding: 12px;
  color: var(--meter-muted);
  text-align: center;
}
.ecu-meter-death-hit {
  display: grid;
  grid-template-columns: 52px 1fr auto;
  gap: 6px;
  align-items: center;
  padding: 3px 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  font-variant-numeric: tabular-nums;
}
.ecu-meter-death-hit.has-life {
  grid-template-columns: 52px 1fr auto auto;
}
.ecu-meter-death-hit-life {
  font-size: 10px;
  color: #ef9a9a;
  min-width: 32px;
  text-align: right;
}
.ecu-meter-death-hit-rel {
  color: var(--meter-muted);
  font-size: 11px;
}
.ecu-meter-death-hit-src {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #c5d0e0;
}
.ecu-meter-death-hit-actor {
  color: var(--meter-muted);
}
.ecu-meter-death-hit-amt {
  font-weight: bold;
  min-width: 40px;
  text-align: right;
}
.ecu-meter-death-hit.is-dmg .ecu-meter-death-hit-amt {
  color: #ef9a9a;
}
.ecu-meter-death-hit.is-heal .ecu-meter-death-hit-amt {
  color: #81c784;
}
.ecu-meter-shell.is-report .ecu-meter-death {
  min-height: 0;
}
@media (max-width: 520px) {
  .ecu-meter-inspector { grid-template-columns: 1fr; }
}
`;

  // src/ui/meter/css/meterViewsCss.ts
  var METER_VIEWS_CSS = `
.ecu-meter-shell .leg-item { user-select: none; font-size: 13px; }
.ecu-meter-shell .leg-item input { margin: 0; }
.ecu-meter-shell .chart-tools,
.ecu-meter-shell .tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}
/* \u2014\u2014 Details parity: bars & icons \u2014\u2014 */
.ecu-meter-icon.ecu-meter-icon-class {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 0;
  padding: 0;
  border: 1px solid rgba(0, 0, 0, 0.65);
  border-radius: 2px;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  color: #fff;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.85);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  overflow: hidden;
  vertical-align: middle;
}
.ecu-meter-fill.ecu-meter-fill-anim {
  transition: width 0.25s ease;
}
.ecu-meter-row.is-total {
  background: rgba(0, 0, 0, 0.42);
  min-height: 18px;
  height: 18px;
  font-weight: 600;
  border-top: 1px solid rgba(0, 0, 0, 0.55);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}
.ecu-meter-row.is-total .ecu-meter-fill {
  opacity: 0.92;
}
.ecu-meter-row.is-total:hover {
  filter: brightness(1.08);
}
.ecu-meter-bar-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(180, 180, 180, 0.35) transparent;
}
.ecu-meter-bar-scroll::-webkit-scrollbar {
  width: 6px;
}
.ecu-meter-bar-scroll::-webkit-scrollbar-thumb {
  background: rgba(180, 180, 180, 0.35);
  border-radius: 2px;
}
/* \u2014\u2014 Details parity: statusbar \u2014\u2014 */
.ecu-meter-statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  flex-shrink: 0;
  padding: 1px 6px;
  min-height: 18px;
  background: linear-gradient(180deg, rgba(40, 36, 38, 0.95) 0%, rgba(26, 21, 24, 0.98) 100%);
  border-top: 1px solid rgba(0, 0, 0, 0.55);
  color: var(--meter-muted);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}
.ecu-meter-status-micro {
  background: transparent;
  border: none;
  color: inherit;
  font: inherit;
  padding: 0 2px;
  white-space: nowrap;
  cursor: default;
  line-height: 1.3;
}
button.ecu-meter-status-micro {
  cursor: pointer;
}
button.ecu-meter-status-micro:hover,
.ecu-meter-status-micro.ecu-meter-status-link:hover {
  color: var(--meter-text);
}
.ecu-meter-status-micro.ecu-meter-status-link {
  cursor: pointer;
  margin-left: auto;
}
/* \u2014\u2014 Details parity: options panel \u2014\u2014 */
.ecu-meter-options-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483002;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
  pointer-events: auto;
}
.ecu-meter-options-panel {
  min-width: min(380px, 92vw);
  max-width: 440px;
  max-height: 78vh;
  overflow: auto;
  background: linear-gradient(180deg, #1a171b 0%, #121114 100%);
  border: 1px solid rgba(0, 0, 0, 0.85);
  outline: 1px solid rgba(232, 201, 106, 0.28);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.62);
  color: #eee;
  font-size: 12px;
  scrollbar-width: thin;
  scrollbar-color: #5a5050 #1a1618;
}
.ecu-meter-options-hd {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px 8px;
  background: linear-gradient(180deg, #34292d 0%, #241c20 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.55);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
.ecu-meter-options-hd b {
  color: #ffd28a;
  font-weight: 600;
}
.ecu-meter-options-sub {
  flex: 1;
  min-width: 0;
  color: rgba(220, 210, 210, 0.72);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-meter-options-close {
  cursor: pointer;
  background: transparent;
  border: none;
  color: var(--meter-muted);
  font-size: 18px;
  line-height: 1;
  padding: 0 4px;
}
.ecu-meter-options-close:hover {
  color: #fff;
}
.ecu-meter-options-body {
  padding: 8px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ecu-meter-opt-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 3px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.ecu-meter-opt-row:last-child {
  border-bottom: none;
}
.ecu-meter-opt-label {
  color: #ddd;
  font-size: 12px;
  flex: 1;
  min-width: 0;
}
.ecu-meter-opt-row input[type="checkbox"] {
  margin: 0;
  accent-color: #c9a227;
}
.ecu-meter-opt-row input[type="range"] {
  width: 120px;
  accent-color: #c9a227;
}
.ecu-meter-opt-btn {
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: #eee;
  padding: 4px 10px;
  font-size: 11px;
  border-radius: 2px;
}
.ecu-meter-opt-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}
/* \u2014\u2014 Inspector vertical tabs rail \u2014\u2014 */
.ecu-meter-inspector-tabs-rail {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 22px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 2px 0;
  background: rgba(0, 0, 0, 0.35);
  border-left: 1px solid rgba(0, 0, 0, 0.55);
  z-index: 4;
}
.ecu-meter-inspector-tab-rail {
  flex: 1;
  min-height: 28px;
  max-height: 72px;
  cursor: pointer;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 2px;
  border: none;
  background: transparent;
  color: var(--meter-muted);
  font-size: 10px;
  letter-spacing: 0.03em;
  line-height: 1;
}
.ecu-meter-inspector-tab-rail:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}
.ecu-meter-inspector-tab-rail.active {
  color: #ffd28a;
  background: rgba(201, 162, 39, 0.12);
  box-shadow: inset -2px 0 0 #c9a227;
}
.ecu-meter-shell.is-inspector:has(.ecu-meter-inspector-tabs-rail) .ecu-meter-inspector-body {
  padding-right: 22px;
}
/* \u2014\u2014 Details parity: encounter dashboard \u2014\u2014 */
.ecu-meter-encounter {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--meter-panel-solid);
}
.ecu-meter-enc-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px 12px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--meter-border);
  background: linear-gradient(180deg, rgba(74, 42, 44, 0.55) 0%, rgba(0, 0, 0, 0.15) 100%);
  flex-shrink: 0;
}
.ecu-meter-enc-title {
  font-size: 12px;
  color: #e8eef7;
}
.ecu-meter-enc-title b {
  color: var(--meter-accent);
}
.ecu-meter-enc-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  font-size: 10px;
  color: var(--meter-muted);
  font-variant-numeric: tabular-nums;
}
.ecu-meter-enc-stats b {
  color: #dce6f2;
}
.ecu-meter-enc-stats .is-bad {
  color: #ef9a9a;
}
.ecu-meter-enc-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 1px;
  background: var(--meter-border);
  flex: 1;
  min-height: 0;
}
@media (max-width: 520px) {
  .ecu-meter-enc-grid {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto;
  }
}
.ecu-meter-enc-widget {
  background: #12141a;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.ecu-meter-enc-widget-hd {
  margin: 0;
  padding: 4px 8px;
  font-size: 10px;
  color: var(--meter-accent);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--meter-border);
  background: rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}
.ecu-meter-enc-widget.tone-taken .ecu-meter-enc-widget-hd {
  color: #ffb74d;
  border-left: 2px solid #ffb74d;
}
.ecu-meter-enc-widget.tone-spell .ecu-meter-enc-widget-hd {
  color: #ef9a9a;
  border-left: 2px solid #ef9a9a;
}
.ecu-meter-enc-widget.tone-death .ecu-meter-enc-widget-hd {
  color: #ce93d8;
  border-left: 2px solid #ce93d8;
}
.ecu-meter-enc-widget.tone-dmg .ecu-meter-enc-widget-hd {
  color: #e57373;
  border-left: 2px solid #e57373;
}
.ecu-meter-enc-widget.tone-heal .ecu-meter-enc-widget-hd {
  color: #81c784;
  border-left: 2px solid #81c784;
}
.ecu-meter-enc-widget.tone-av .ecu-meter-enc-widget-hd {
  color: #80cbc4;
  border-left: 2px solid #80cbc4;
}
.ecu-meter-enc-widget-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(180, 180, 180, 0.35) transparent;
}
`;

  // src/ui/meter/css/meterCooltipCss.ts
  var METER_COOLTIP_CSS = `
/* Floating Cooltip (Details GameCooltip analogue)
 * Portaled to document.body \u2014 do NOT rely on --meter-* vars from .ecu-meter-shell. */
.ecu-meter-cooltip,
.ecu-meter-switch-overlay,
.ecu-meter-bookmark-overlay {
  --meter-cooltip-bg: #141214;
  --meter-muted: rgba(220, 210, 210, 0.78);
  --meter-accent: #e8c96a;
}
.ecu-meter-cooltip {
  position: fixed;
  background: #141214;
  border: 1px solid rgba(0,0,0,0.85);
  outline: 1px solid rgba(232, 201, 106, 0.28);
  border-radius: 0;
  padding: 4px 0;
  box-shadow: 0 10px 28px rgba(0,0,0,0.65);
  color: #eee;
  font-size: 11px;
  max-height: min(360px, 72vh);
  overflow-x: hidden;
  overflow-y: auto;
  pointer-events: auto;
  z-index: 2147483000;
  scrollbar-width: thin;
  scrollbar-color: #5a5050 #1a1618;
}
.ecu-meter-cooltip::-webkit-scrollbar {
  width: 8px;
}
.ecu-meter-cooltip::-webkit-scrollbar-track {
  background: #1a1618;
}
.ecu-meter-cooltip::-webkit-scrollbar-thumb {
  background: #5a5050;
  border-radius: 2px;
}
/* Hover bridge so mouse can travel from toolbar \u2192 tip without closing. */
.ecu-meter-cooltip::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: -10px;
  height: 10px;
}
.ecu-meter-cooltip-sec {
  padding: 4px 10px 2px;
  color: rgba(220, 210, 210, 0.78);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ecu-meter-cooltip-item {
  display: block;
  width: 100%;
  box-sizing: border-box;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  color: #eee;
  padding: 4px 12px;
  font-size: 12px;
  line-height: 1.35;
}
.ecu-meter-cooltip-item:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
}
.ecu-meter-cooltip-item.is-selected {
  color: #ffd28a;
  background: rgba(232, 201, 106, 0.12);
}
.ecu-meter-cooltip-item.is-muted {
  color: rgba(220, 210, 210, 0.55);
}
.ecu-meter-cooltip-div {
  height: 1px;
  margin: 4px 8px;
  background: rgba(255,255,255,0.1);
}
.ecu-meter-bookmark-overlay {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: #141214;
  border: 1px solid rgba(255,255,255,0.12);
  box-sizing: border-box;
  overflow: auto;
  z-index: 2147483000;
  pointer-events: auto;
  color: #eee;
}
.ecu-meter-bookmark-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}
.ecu-meter-bookmark-hint {
  padding: 0 2px 4px;
  color: rgba(220, 210, 210, 0.55);
  font-size: 10px;
}
.ecu-meter-bookmark-slot {
  cursor: grab;
  text-align: left;
  padding: 6px 8px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04);
  color: #eee;
  font-size: 11px;
  border-radius: 2px;
  min-height: 32px;
  touch-action: none;
  user-select: none;
}
.ecu-meter-bookmark-slot.is-dragging {
  opacity: 0.45;
  cursor: grabbing;
  border-style: dashed;
}
.ecu-meter-bookmark-slot.is-drop-target {
  border-color: rgba(232, 201, 106, 0.65);
  background: rgba(232, 201, 106, 0.14);
  box-shadow: inset 0 0 0 1px rgba(232, 201, 106, 0.25);
}
.ecu-meter-bookmark-slot:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.22);
}
.ecu-meter-bookmark-slot.is-empty {
  color: rgba(220, 210, 210, 0.55);
  font-style: italic;
}
/* All-displays Switch grid (title right-click) */
.ecu-meter-switch-overlay {
  position: fixed;
  padding: 6px;
  background: #141214;
  border: 1px solid rgba(0,0,0,0.85);
  outline: 1px solid rgba(232, 201, 106, 0.28);
  box-shadow: 0 10px 28px rgba(0,0,0,0.65);
  max-height: min(360px, 70vh);
  overflow: auto;
  color: #eee;
  font-size: 11px;
  z-index: 2147483000;
  pointer-events: auto;
  scrollbar-width: thin;
  scrollbar-color: #5a5050 #1a1618;
}
.ecu-meter-switch-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}
.ecu-meter-switch-sec {
  grid-column: 1 / -1;
  padding: 6px 4px 2px;
  color: rgba(220, 210, 210, 0.78);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ecu-meter-switch-cell {
  cursor: pointer;
  text-align: left;
  padding: 6px 8px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04);
  color: #eee;
  font-size: 11px;
  border-radius: 2px;
  min-height: 28px;
}
.ecu-meter-switch-cell:hover {
  background: rgba(255,255,255,0.1);
}
.ecu-meter-switch-cell.is-selected {
  color: #ffd28a;
  border-color: rgba(232, 201, 106, 0.45);
  background: rgba(232, 201, 106, 0.12);
}
/* \u2014\u2014 Details parity: segment outcome colors \u2014\u2014 */
.ecu-meter-cooltip-item.ecu-seg-wipe,
.ecu-seg-wipe {
  color: #ef5350;
}
.ecu-meter-cooltip-item.ecu-seg-wipe:hover {
  color: #ff8a80;
  background: rgba(229, 57, 53, 0.12);
}
.ecu-meter-cooltip-item.ecu-seg-kill,
.ecu-seg-kill {
  color: #66bb6a;
}
.ecu-meter-cooltip-item.ecu-seg-kill:hover {
  color: #a5d6a7;
  background: rgba(76, 175, 80, 0.12);
}
/* \u2014\u2014 Details parity: bookmark header \u2014\u2014 */
.ecu-meter-bookmark-hd {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  margin: -8px -8px 6px;
  background: linear-gradient(180deg, #34292d 0%, #241c20 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.55);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
}
.ecu-meter-bookmark-hd-title {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 600;
  color: #ffd28a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-meter-bookmark-hd .ecu-meter-tool,
.ecu-meter-bookmark-hd .ecu-meter-btn {
  flex-shrink: 0;
}
`;

  // src/ui/meter/css/meterShellCss.ts
  var METER_SHELL_CSS = `
.ecu-meter-shell {
  /* Details MainWindow / Minimalistic hybrid */
  --meter-panel: rgba(12, 12, 14, 0.72);
  --meter-panel-solid: #1a1518;
  --meter-panel-2: rgba(0, 0, 0, 0.22);
  --meter-border: rgba(0, 0, 0, 0.55);
  --meter-title: #4a2a2c;
  --meter-text: #ffffff;
  --meter-muted: rgba(220, 210, 210, 0.78);
  --meter-accent: #e8c96a;
  --meter-you: #7ec8ff;
  --meter-cooltip-bg: rgba(18, 14, 16, 0.96);
  --meter-toolbar: url(__TOOLBAR__);
  --meter-attr-icons: url(__ATTR__);
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  margin: 0;
  border: 1px solid rgba(0, 0, 0, 0.65);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  font-size: 12px;
  color: var(--meter-text);
  box-sizing: border-box;
  position: relative;
  pointer-events: auto;
  font-family: "Segoe UI", Tahoma, Arial, sans-serif;
}
.ecu-meter-shell.is-layout {
  padding-bottom: 18px; /* room for resize grip while arranging */
}
.ecu-meter-shell.is-idle:not(.is-inspector):not(.is-report) .ecu-meter-body {
  opacity: 0.42;
  background: var(--meter-panel);
}
/* Click-through bars when idle \u2014 titlebar still receives hover to wake. */
.ecu-meter-shell.is-idle:not(.is-inspector):not(.is-report):not(.is-interacting):not(.is-menu-open):not(.is-layout) .ecu-meter-body {
  pointer-events: none;
}
.ecu-meter-shell.is-idle:not(.is-inspector):not(.is-report).is-interacting .ecu-meter-body,
.ecu-meter-shell.is-idle:not(.is-inspector):not(.is-report):hover .ecu-meter-body {
  opacity: 1;
}
/* Inspector / Report stay denser / more opaque for reading. */
.ecu-meter-shell.is-inspector,
.ecu-meter-shell.is-report {
  background: var(--meter-panel-solid);
  border-radius: 2px;
  box-shadow: 0 4px 18px rgba(0,0,0,0.45);
}
.ecu-meter-shell.is-inspector .ecu-meter-body,
.ecu-meter-shell.is-report .ecu-meter-body {
  background: #12141a;
  border: 1px solid var(--meter-border);
  border-top: none;
  border-radius: 0 0 2px 2px;
}
.ecu-meter-resize {
  display: none;
  position: absolute;
  right: 1px;
  bottom: 1px;
  width: 18px;
  height: 18px;
  cursor: nwse-resize;
  z-index: 8;
  pointer-events: auto;
  touch-action: none;
  background:
    linear-gradient(135deg, transparent 52%, #8b9bb0 52%, #8b9bb0 58%, transparent 58%),
    linear-gradient(135deg, transparent 68%, #8b9bb0 68%, #8b9bb0 74%, transparent 74%),
    linear-gradient(135deg, transparent 84%, #8b9bb0 84%, #8b9bb0 90%, transparent 90%);
  opacity: 0.9;
}
.ecu-meter-resize-left {
  right: auto;
  left: 1px;
  cursor: nesw-resize;
  transform: scaleX(-1);
}
.ecu-meter-shell.is-layout .ecu-meter-resize,
.ecu-meter-shell.is-interacting .ecu-meter-resize {
  display: block;
}
/* Positioned meter frame \u2014 resize while arranging (layout edit, unlocked, or Alt). */
.comm-pos-panel.ecu-meter-frame {
  overflow: visible;
  resize: none;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
.comm-pos-panel.ecu-meter-frame > .comm-pos-panel-body {
  background: transparent !important;
  padding: 0 !important;
}
.comm-pos-panel.ecu-meter-frame.ecu-meter-grouped {
  outline: 1px solid rgba(201, 162, 39, 0.35);
  box-shadow: none;
}
.comm-pos-panel.ecu-meter-frame.ecu-meter-dragging {
  outline: 2px solid rgba(120, 200, 255, 0.85);
  box-shadow: 0 6px 20px rgba(0,0,0,0.45);
  z-index: 12;
}
.comm-pos-panel.ecu-meter-frame.ecu-meter-snap-target {
  outline: 2px solid rgba(232, 201, 106, 0.9);
  box-shadow:
    0 0 0 1px rgba(0,0,0,0.65),
    inset 0 0 0 1px rgba(232, 201, 106, 0.35);
}
/* Arrange/edit: overflow for cooltips; resize via meter shell grip only (not CSS resize). */
.comm-pos-panel.ecu-meter-frame.comm-pos-editing,
.comm-pos-panel.ecu-meter-frame.ecu-meter-arrange,
.comm-pos-panel.ecu-meter-frame.comm-pos-movable {
  overflow: visible;
  resize: none;
  min-width: 0;
  min-height: 0;
}
.comm-pos-panel.ecu-meter-frame.comm-pos-editing > .comm-pos-panel-body,
.comm-pos-panel.ecu-meter-frame.ecu-meter-arrange > .comm-pos-panel-body,
.comm-pos-panel.ecu-meter-frame.comm-pos-movable > .comm-pos-panel-body {
  overflow: hidden;
}
/* Hide \xD7 sits above the frame so it does not cover \u21BA / lock / gear. */
.comm-pos-panel.ecu-meter-frame > .comm-pos-panel-close-above {
  top: -24px;
  right: 0;
  border-radius: 3px;
}
/* While arranging, resize needs overflow:hidden \u2014 park \xD7 on the grip row. */
.comm-pos-panel.ecu-meter-frame.comm-pos-editing > .comm-pos-panel-close,
.comm-pos-panel.ecu-meter-frame.comm-pos-movable > .comm-pos-panel-close,
.comm-pos-panel.ecu-meter-frame.ecu-meter-arrange > .comm-pos-panel-close {
  top: 2px;
  right: 2px;
}
/* \u2014\u2014 Details parity: stretch tab \u2014\u2014 */
.ecu-meter-stretch-tab {
  position: absolute;
  top: -5px;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 7px;
  cursor: ns-resize;
  z-index: 9;
  border-radius: 2px 2px 0 0;
  background: linear-gradient(180deg, #5a4044 0%, #4a2a2c 100%);
  border: 1px solid rgba(0, 0, 0, 0.55);
  border-bottom: none;
  box-shadow: 0 -1px 0 rgba(255, 255, 255, 0.06);
  opacity: 0;
  transition: opacity 0.12s ease;
  touch-action: none;
}
.ecu-meter-stretch-tab::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 2px;
  transform: translateX(-50%);
  width: 14px;
  height: 2px;
  background: rgba(255, 255, 255, 0.35);
  border-radius: 1px;
}
.ecu-meter-shell.is-interacting .ecu-meter-stretch-tab,
.ecu-meter-shell.is-layout .ecu-meter-stretch-tab,
.ecu-meter-shell:hover .ecu-meter-stretch-tab {
  opacity: 0.95;
}
.ecu-meter-stretch-tab:active {
  opacity: 1;
  background: linear-gradient(180deg, #6a5054 0%, #5a3a3c 100%);
}
`;

  // src/ui/meter/css/meterTitlebarCss.ts
  var METER_TITLEBAR_CSS = `
.ecu-meter-shell.is-grouped .ecu-meter-titlebar {
  box-shadow: inset 3px 0 0 rgba(201, 162, 39, 0.55);
}
.ecu-meter-shell.is-inspector .ecu-meter-titlebar {
  background: linear-gradient(180deg, #2a3038 0%, #1e2228 100%);
  border-color: var(--meter-border);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
  min-height: 22px;
}
.ecu-meter-shell.is-inspector .ecu-meter-titlebar .ecu-meter-ttl {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
}
.ecu-meter-shell.is-report .ecu-meter-titlebar .ecu-meter-ttl {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
}
.ecu-meter-titlebar {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 1px 3px 1px 2px;
  background: #4a2a2c;
  border: none;
  border-bottom: 1px solid rgba(0,0,0,0.55);
  border-radius: 0;
  color: var(--meter-text);
  flex-shrink: 0;
  min-width: 0;
  min-height: 20px;
  box-shadow: none;
}
.ecu-meter-titlebar.is-draggable { cursor: grab; }
.ecu-meter-titlebar.is-draggable:active { cursor: grabbing; }
.ecu-meter-tools-left {
  display: flex;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
  transition: opacity 0.12s ease;
}
.ecu-meter-tool {
  cursor: pointer;
  background: transparent;
  border: none;
  color: var(--meter-muted);
  padding: 0;
  width: 18px;
  height: 18px;
  line-height: 18px;
  font-size: 11px;
  flex-shrink: 0;
  border-radius: 0;
  opacity: 0.92;
  text-shadow: 0 1px 2px rgba(0,0,0,0.55);
}
.ecu-meter-tool:hover,
.ecu-meter-tool.active {
  color: #fff;
  background: rgba(255,255,255,0.08);
  opacity: 1;
}
.ecu-meter-shell:not(:has(.ecu-meter-status)):not(:has(.ecu-meter-report-tabs)) .ecu-meter-titlebar {
  border-bottom: none;
  border-radius: 2px;
}
.ecu-meter-titlebar .ecu-meter-ttl {
  flex: 1;
  min-width: 0;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  color: #fff;
  padding: 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
  text-shadow: 1px 1px 0 rgba(0,0,0,0.9);
  display: flex;
  align-items: center;
}
.ecu-meter-titlebar .ecu-meter-ttl .ecu-meter-ttl-timer {
  color: var(--meter-muted);
  font-weight: 400;
  margin-left: 6px;
  font-variant-numeric: tabular-nums;
}
.ecu-meter-titlebar .ecu-meter-btn {
  cursor: pointer;
  background: transparent;
  border: none;
  color: var(--meter-muted);
  padding: 0;
  width: 20px;
  height: 18px;
  line-height: 18px;
  font-size: 12px;
  flex-shrink: 0;
  border-radius: 0;
}
.ecu-meter-titlebar .ecu-meter-btn.wide {
  width: auto;
  padding: 0 6px;
  font-size: 12px;
}
.ecu-meter-titlebar .ecu-meter-btn:hover {
  background: rgba(255,255,255,0.08);
  color: #fff;
}
.ecu-meter-titlebar .ecu-meter-btn.active {
  color: var(--meter-accent);
}
/* Primary icons stay; secondary chrome fades like Details lock/ungroup */
.ecu-meter-actions {
  display: flex;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
  position: relative;
  z-index: 5;
}
.ecu-meter-chrome-hover {
  display: flex;
  align-items: center;
  gap: 0;
  opacity: 0;
  transition: opacity 0.12s ease;
  pointer-events: none;
}
.ecu-meter-shell.is-interacting .ecu-meter-chrome-hover,
.ecu-meter-shell.is-menu-open .ecu-meter-chrome-hover,
.ecu-meter-shell.is-layout .ecu-meter-chrome-hover {
  opacity: 1;
  pointer-events: auto;
}
.ecu-meter-tool.is-icon {
  width: 16px;
  height: 16px;
  font-size: 0;
  line-height: 0;
  color: transparent;
  background-image: var(--meter-toolbar);
  background-repeat: no-repeat;
  background-size: 128px 16px;
  image-rendering: pixelated;
  opacity: 0.92;
  filter: drop-shadow(0 1px 1px rgba(0,0,0,0.75));
}
.ecu-meter-tool.is-icon:hover,
.ecu-meter-tool.is-icon.active {
  opacity: 1;
  filter: brightness(1.25) drop-shadow(0 1px 1px rgba(0,0,0,0.75));
  background-color: transparent;
}
.ecu-meter-tool.icon-mode { background-position: 0 0; }
.ecu-meter-tool.icon-segment { background-position: -16px 0; }
.ecu-meter-tool.icon-attribute { background-position: -32px 0; }
.ecu-meter-tool.icon-report { background-position: -48px 0; }
.ecu-meter-tool.icon-reset { background-position: -64px 0; }
.ecu-meter-tool.icon-close { background-position: -80px 0; }
.ecu-meter-attr-ball {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  margin: 0 2px 0 1px;
  background-image: var(--meter-attr-icons);
  background-repeat: no-repeat;
  background-size: 144px 18px;
  image-rendering: auto;
  border-radius: 2px;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.55);
}
.ecu-meter-attr-ball.attr-damage { background-position: 0 0; }
.ecu-meter-attr-ball.attr-heal { background-position: -18px 0; }
.ecu-meter-attr-ball.attr-taken { background-position: -36px 0; }
.ecu-meter-attr-ball.attr-other { background-position: -54px 0; }
/* Primary toolbar stays readable; secondary chrome fades until interact. */
.ecu-meter-shell:not(.is-interacting):not(.is-menu-open):not(.is-layout) .ecu-meter-tools-left {
  opacity: 0.9;
}
.ecu-meter-shell:not(.is-interacting):not(.is-menu-open):not(.is-layout) .ecu-meter-actions > .ecu-meter-tool {
  opacity: 0.55;
}
.ecu-meter-shell.is-interacting .ecu-meter-tools-left,
.ecu-meter-shell.is-menu-open .ecu-meter-tools-left,
.ecu-meter-shell.is-layout .ecu-meter-tools-left {
  opacity: 1;
}
.ecu-meter-ttl-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
/* \u2014\u2014 Details parity: encounter titlebar badges \u2014\u2014 */
.ecu-meter-encounter-badge {
  cursor: pointer;
  background: transparent;
  border: none;
  color: var(--meter-muted);
  padding: 0 2px;
  width: 18px;
  height: 18px;
  line-height: 18px;
  font-size: 11px;
  flex-shrink: 0;
  opacity: 0.88;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
}
.ecu-meter-encounter-badge:hover {
  color: #fff;
  opacity: 1;
  background: rgba(255, 255, 255, 0.08);
}
.ecu-meter-encounter-badge.is-skull {
  color: #ef9a9a;
}
.ecu-meter-encounter-badge.is-play {
  color: #81c784;
}
`;

  // src/ui/meter/meterChromeCss.ts
  var STYLE_ID4 = "ecu-meter-chrome-css";
  var CSS4 = [
    METER_SHELL_CSS,
    METER_TITLEBAR_CSS,
    METER_COOLTIP_CSS,
    METER_BODY_CORE_CSS,
    METER_VIEWS_CSS
  ].join("\n");
  function injectMeterChromeCss() {
    let style = document.getElementById(STYLE_ID4);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID4;
      document.head.appendChild(style);
    }
    style.textContent = CSS4.replace(
      "__TOOLBAR__",
      TOOLBAR_ICONS_DATA_URI
    ).replace("__ATTR__", ATTR_ICONS_DATA_URI);
  }

  // src/ui/meter/meterCooltipMenu.ts
  var COOLTIP_HIDE_MS = 420;
  var COOLTIP_Z = 2147483e3;
  function rectToAnchor(el) {
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  }
  function cooltipStyle(anchor, opts) {
    var _a;
    if (opts == null ? void 0 : opts.cover) {
      return {
        position: "fixed",
        left: Math.round(anchor.left),
        top: Math.round(anchor.top),
        width: Math.round(anchor.width),
        height: Math.round(anchor.height),
        zIndex: COOLTIP_Z
      };
    }
    const minW = (_a = opts == null ? void 0 : opts.minWidth) != null ? _a : 176;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad2 = 6;
    const estH = Math.min(360, Math.floor(vh * 0.72));
    let left = (opts == null ? void 0 : opts.preferRight) ? anchor.left + anchor.width - minW : anchor.left;
    let top = anchor.top + anchor.height + 4;
    if (top + Math.min(estH, 280) > vh - pad2) {
      top = Math.max(pad2, anchor.top - Math.min(estH, 280) - 4);
    }
    left = Math.max(pad2, Math.min(left, vw - minW - pad2));
    return {
      position: "fixed",
      left: Math.round(left),
      top: Math.round(top),
      minWidth: minW,
      zIndex: COOLTIP_Z
    };
  }

  // src/ui/meter/MeterReportDialog.ts
  function pushRecentReport(label, text) {
    const prev = getSettings().meterRecentReports || [];
    const next = [{ id: `rr-${Date.now().toString(36)}`, label, text }].concat(
      prev
    );
    patchSettings({ meterRecentReports: next.slice(0, 10) });
  }
  function MeterReportDialog(props) {
    const React = getReact();
    const [topN, setTopN] = React.useState(10);
    const [reverse, setReverse] = React.useState(false);
    injectMeterChromeCss();
    let sliced = props.rows.slice(0, topN);
    if (reverse) sliced = sliced.slice().reverse();
    const text = formatMeterReportLines(
      props.title,
      sliced.map((r) => ({
        name: r.name,
        value: r.value,
        rate: r.rate == null ? void 0 : r.rate,
        pct: r.pct
      })),
      props.segmentLabel
    );
    const copy = () => {
      var _a;
      if ((_a = navigator.clipboard) == null ? void 0 : _a.writeText) {
        void navigator.clipboard.writeText(text);
      }
      pushRecentReport(props.title, text);
    };
    const recent = getSettings().meterRecentReports || [];
    const availableRows = props.rows.length;
    const previewLabel = `${Math.min(topN, availableRows)} of ${availableRows}`;
    return e(
      "div",
      {
        className: "ecu-meter-report-dialog",
        onMouseDown: (ev) => ev.stopPropagation()
      },
      e(
        "div",
        { className: "ecu-meter-report-dialog-hd" },
        e("div", { className: "ecu-meter-report-dialog-kicker" }, "Report"),
        e("div", { className: "ecu-meter-report-dialog-title" }, props.title),
        e(
          "div",
          { className: "ecu-meter-report-dialog-sub" },
          props.segmentLabel
        )
      ),
      e(
        "div",
        { className: "ecu-meter-report-dialog-row" },
        e("span", { className: "ecu-meter-report-dialog-label" }, "Lines"),
        ...[5, 10, 15, 20, 30].map(
          (n) => e(
            "button",
            {
              key: String(n),
              type: "button",
              className: "ecu-meter-report-chip" + (topN === n ? " active" : ""),
              onClick: () => setTopN(n)
            },
            String(n)
          )
        ),
        e(
          "label",
          { className: "ecu-meter-report-reverse" },
          e("input", {
            type: "checkbox",
            checked: reverse,
            onChange: (ev) => setReverse(ev.target.checked)
          }),
          " Reverse"
        ),
        e("span", { className: "ecu-meter-report-dialog-count" }, previewLabel)
      ),
      e("div", { className: "ecu-meter-report-dialog-label" }, "Preview"),
      e("pre", { className: "ecu-meter-report-preview" }, text),
      e(
        "div",
        { className: "ecu-meter-report-dialog-actions" },
        e(
          "button",
          { type: "button", className: "ecu-meter-report-btn", onClick: copy },
          "Copy"
        ),
        e(
          "button",
          {
            type: "button",
            className: "ecu-meter-report-btn",
            onClick: props.onClose
          },
          "Close"
        )
      ),
      recent.length ? e(
        "div",
        { className: "ecu-meter-report-recent" },
        e("div", { className: "ecu-meter-report-dialog-label" }, "Recent"),
        ...recent.slice(0, 5).map(
          (r) => e(
            "button",
            {
              key: r.id,
              type: "button",
              className: "ecu-meter-cooltip-item",
              onClick: () => {
                var _a;
                if ((_a = navigator.clipboard) == null ? void 0 : _a.writeText) {
                  void navigator.clipboard.writeText(r.text);
                }
              }
            },
            r.label
          )
        )
      ) : null
    );
  }

  // src/ui/meter/MeterStatusbar.ts
  function MeterStatusbar(props) {
    const React = getReact();
    const [, tick] = React.useState(0);
    React.useEffect(() => {
      const id = window.setInterval(() => tick((n) => n + 1), 1e3);
      return () => window.clearInterval(id);
    }, []);
    const app = getMeterAppearance();
    if (!app.showStatusbar) return null;
    const seg = resolveSegment(props.segmentRef);
    const durMs = seg ? segmentDurationMs(seg, Date.now()) : 0;
    const durSec = Math.max(durMs / 1e3, 0);
    const inCombat2 = isMeterInCombat() && props.segmentRef === "current";
    let totalDmg = 0;
    let totalHeal = 0;
    if (seg) {
      const dmg = runMeterQuery(
        { kind: "players", metric: "damage", primary: "total" },
        { segmentRef: props.segmentRef, partyFocus: props.instance.partyFocus }
      );
      const heal = runMeterQuery(
        { kind: "players", metric: "heal", primary: "total" },
        { segmentRef: props.segmentRef, partyFocus: props.instance.partyFocus }
      );
      if (dmg.kind === "ranked") {
        for (let i = 0; i < dmg.rows.length; i++) totalDmg += dmg.rows[i].value;
      }
      if (heal.kind === "ranked") {
        for (let i = 0; i < heal.rows.length; i++) totalHeal += heal.rows[i].value;
      }
    }
    const dps = durSec > 0 ? totalDmg / durSec : 0;
    const hps = durSec > 0 ? totalHeal / durSec : 0;
    return e(
      "div",
      { className: "ecu-meter-statusbar" },
      e(
        "button",
        {
          type: "button",
          className: "ecu-meter-status-micro",
          onClick: (ev) => {
            var _a;
            ev.stopPropagation();
            (_a = props.onSegmentClick) == null ? void 0 : _a.call(props);
          },
          title: "Segment"
        },
        inCombat2 ? "Combat" : props.segmentLabel,
        ` \xB7 ${durSec.toFixed(0)}s`
      ),
      e(
        "span",
        { className: "ecu-meter-status-micro" },
        `Dmg ${formatCompactNumber(totalDmg)}`
      ),
      e(
        "span",
        { className: "ecu-meter-status-micro" },
        `DPS ${formatCompactRatePerSec(dps)}`
      ),
      e(
        "button",
        {
          type: "button",
          className: "ecu-meter-status-micro ecu-meter-status-link",
          onClick: (ev) => {
            var _a;
            ev.stopPropagation();
            (_a = props.onEncounterClick) == null ? void 0 : _a.call(props);
          },
          title: "Open Encounter"
        },
        `Heal ${formatCompactNumber(totalHeal)} \xB7 ${formatCompactRatePerSec(hps)} HPS`
      )
    );
  }

  // src/ui/meter/MeterOptionsPanel.ts
  function row(label, control) {
    return e(
      "div",
      { className: "ecu-meter-opt-row" },
      e("span", { className: "ecu-meter-opt-label" }, label),
      control
    );
  }
  function MeterOptionsPanel(props) {
    const React = getReact();
    const [app, setApp] = React.useState(getMeterAppearance());
    injectMeterChromeCss();
    const patch = (partial) => {
      patchMeterAppearance(partial);
      setApp(getMeterAppearance());
    };
    const chk = (key, label) => row(
      label,
      e("input", {
        type: "checkbox",
        checked: !!app[key],
        onChange: (ev) => patch({ [key]: ev.target.checked })
      })
    );
    return e(
      "div",
      {
        className: "ecu-meter-options-backdrop",
        onMouseDown: (ev) => {
          if (ev.target === ev.currentTarget) props.onClose();
        }
      },
      e(
        "div",
        {
          className: "ecu-meter-options-panel",
          onMouseDown: (ev) => ev.stopPropagation()
        },
        e(
          "div",
          { className: "ecu-meter-options-hd" },
          e("b", null, "Options"),
          props.instanceLabel ? e("span", { className: "ecu-meter-options-sub" }, props.instanceLabel) : null,
          e(
            "button",
            {
              type: "button",
              className: "ecu-meter-options-close",
              onClick: props.onClose
            },
            "\xD7"
          )
        ),
        e("div", { className: "ecu-meter-options-body" }, chk("showStatusbar", "Show statusbar"), chk("showTotalBar", "Total bar"), chk("animateBars", "Animate bars"), chk("showSpecIcons", "Class icons on bars"), chk("showRankNumbers", "Rank numbers"), chk("segmentsLocked", "Segments locked (all windows)"), chk("disableGrouping", "Disable new grouping"), chk("autoHideCombat", "Fade in combat"), chk("autoHideOoc", "Fade out of combat"), chk("deathLogLifePct", "Death log life %"), chk("deathLogInvert", "Invert death log"), row("Bar height", e("input", { type: "range", min: 14, max: 28, value: app.barHeight, onChange: (ev) => patch({ barHeight: Number(ev.target.value) }) })), row("Window scale", e("input", { type: "range", min: 80, max: 140, value: Math.round(app.windowScale * 100), onChange: (ev) => patch({ windowScale: Number(ev.target.value) / 100 }) })), row("Idle alpha", e("input", { type: "range", min: 20, max: 100, value: Math.round(app.idleAlpha * 100), onChange: (ev) => patch({ idleAlpha: Number(ev.target.value) / 100 }) })), row("Test bars", e("button", { type: "button", className: "ecu-meter-opt-btn", onClick: () => patch({ testBars: !app.testBars }) }, app.testBars ? "Hide test bars" : "Show test bars")), row("", e("button", { type: "button", className: "ecu-meter-opt-btn", onClick: () => patch({ ...DEFAULT_METER_APPEARANCE }) }, "Reset defaults")))
      )
    );
  }

  // src/meters/meterIcons.ts
  var CDN = "https://adventure.land";
  var SETS = {
    skills: {
      file: CDN + "/images/tiles/items/skills_20v6.png",
      size: 20,
      cols: 16,
      rows: 13
    },
    pack_1a: {
      file: CDN + "/images/tiles/items/pack_1a.png?v=11",
      size: 16,
      cols: 16,
      rows: 128
    }
  };
  var BY_KEY = {
    attack: ["skills", 1, 6],
    heal: ["skills", 1, 11],
    lifesteal: ["skills", 1, 11],
    cleave: ["skills", 2, 1],
    agitate: ["skills", 7, 1],
    taunt: ["pack_1a", 8, 85],
    partyheal: ["skills", 1, 4],
    curse: ["pack_1a", 11, 83],
    "3shot": ["skills", 1, 2],
    "5shot": ["skills", 2, 2],
    cburst: ["skills", 2, 0],
    burn: ["pack_1a", 10, 78],
    supershot: ["pack_1a", 8, 88],
    quickstab: ["skills", 3, 3],
    quickpunch: ["skills", 4, 3],
    piercingshot: ["skills", 7, 2],
    huntersmark: ["skills", 6, 2],
    dash: ["skills", 9, 1],
    stomp: ["skills", 3, 1],
    warcry: ["skills", 6, 1],
    tomb_slam: ["skills", 3, 11],
    spike_bite: ["skills", 3, 3],
    swarm: ["skills", 2, 2],
    cryptling_swarm: ["skills", 2, 2]
  };
  function resolveFromG(key) {
    try {
      const G = window.G;
      const skill = G && G.skills && G.skills[key];
      if (!skill) return null;
      if (BY_KEY[key]) return BY_KEY[key];
      if (skill.skin && BY_KEY[skill.skin]) return BY_KEY[skill.skin];
    } catch (e2) {
    }
    return BY_KEY[key] || null;
  }
  function skillIconHtml(key, displaySize = 18) {
    const pos = resolveFromG(key) || BY_KEY[key];
    if (!pos) {
      const letter = (key || "?").slice(0, 1).toUpperCase();
      return `<span class="ecu-meter-icon ecu-meter-icon-ab" style="width:${displaySize}px;height:${displaySize}px;line-height:${displaySize}px">${letter}</span>`;
    }
    const [setName, x, y] = pos;
    const set = SETS[setName];
    if (!set) return "";
    const scale = displaySize / set.size;
    const sheetW = set.cols * set.size * scale;
    const sheetH = set.rows * set.size * scale;
    return `<span class="ecu-meter-icon ecu-meter-icon-skill" title="${key}" style="width:${displaySize}px;height:${displaySize}px"><span class="ecu-meter-icon-clip" style="width:${displaySize}px;height:${displaySize}px"><img alt="" draggable="false" style="width:${sheetW}px;height:${sheetH}px;margin-top:-${y * displaySize}px;margin-left:-${x * displaySize}px" src="${set.file}"/></span></span>`;
  }
  var CLASS_LETTERS = {
    warrior: "W",
    mage: "M",
    priest: "P",
    ranger: "R",
    paladin: "L",
    rogue: "G",
    merchant: "$"
  };
  function classIconHtml(ctype, displaySize = 18) {
    const key = (ctype || "").toLowerCase();
    const letter = CLASS_LETTERS[key] || key.slice(0, 1).toUpperCase() || "?";
    const color = classColors[key] || "#607d8b";
    return `<span class="ecu-meter-icon ecu-meter-icon-class" title="${key || "unknown"}" style="width:${displaySize}px;height:${displaySize}px;line-height:${displaySize}px;background:${color}">${letter}</span>`;
  }
  function rowIconHtml(row2, opts) {
    if (opts && opts.icons === false) return "";
    const size = opts && opts.iconSize || 18;
    if (row2.kind === "ability" || BY_KEY[row2.id] || resolveFromG(row2.id)) {
      return skillIconHtml(row2.id, size);
    }
    if ((opts == null ? void 0 : opts.classIcons) !== false && row2.kind === "player" || !row2.kind && row2.ctype) {
      return classIconHtml(row2.ctype, size);
    }
    if (row2.ctype && (opts == null ? void 0 : opts.classIcons) !== false) {
      return classIconHtml(row2.ctype, size);
    }
    return "";
  }

  // src/meters/meterBarPool.ts
  function splashSuffix(row2) {
    if (!(row2.splashDamage != null && row2.splashDamage > 0)) return "";
    return ` <span class="ecu-meter-splash-hint" title="Explosion splash damage">+${formatCompactNumber(row2.splashDamage)}</span>`;
  }
  function formatRowValue(row2, share, opts) {
    if (opts.metric === "avoidance") {
      return `${(row2.value * 100).toFixed(1)}%`;
    }
    const splash = splashSuffix(row2);
    if (opts.detailsFormat !== false) {
      const rateStr = row2.rate != null ? formatCompactRate(row2.rate) : row2.barValue != null ? formatCompactRate(row2.barValue) : "";
      const pctStr = opts.pct !== false ? `${share.toFixed(1)}%` : "";
      const inner = rateStr && pctStr ? `${rateStr}, ${pctStr}` : rateStr ? rateStr : pctStr ? pctStr : "";
      return inner ? `${formatCompactNumber(row2.value)} (${inner})${splash}` : `${formatCompactNumber(row2.value)}${splash}`;
    }
    const ratePrimary = row2.barValue != null && row2.rate != null;
    if (ratePrimary) {
      const pct2 = opts.pct !== false ? `, ${share.toFixed(0)}%` : "";
      return `${formatCompactRate(row2.rate)} (${formatCompactNumber(row2.value)}${pct2})${splash}`;
    }
    if (row2.rate != null) {
      const pct2 = opts.pct !== false ? `, ${share.toFixed(0)}%` : "";
      return `${formatCompactNumber(row2.value)} (${formatCompactRate(row2.rate)}${pct2})${splash}`;
    }
    const pct = opts.pct !== false ? ` <span class="ecu-meter-pct">${share.toFixed(0)}%</span>` : "";
    return `${formatCompactNumber(row2.value)}${pct}${splash}`;
  }
  function rowColor(row2) {
    return row2.color || classColors[row2.ctype || ""] || "#607d8b";
  }
  function barAmount(row2) {
    return row2.barValue != null ? row2.barValue : row2.value;
  }
  function makeRowEl(r, i, opts, max, total) {
    const el = document.createElement("div");
    const isAbility = r.kind === "ability" || r.kind === "channel";
    el.className = "ecu-meter-row" + (r.you ? " you" : "") + (r.selected ? " is-selected" : "") + (r.id === "__total__" ? " is-total" : "") + (isAbility ? " has-skill" : "") + (opts.onClick || opts.onContextMenu ? " clickable" : "");
    el.dataset.id = r.id || String(i);
    const pct = max ? barAmount(r) / max * 100 : 0;
    const share = total ? r.value / total * 100 : 0;
    const icon = rowIconHtml(
      { id: r.id, ctype: r.ctype, kind: r.kind },
      {
        icons: opts.icons !== false,
        iconSize: 14,
        classIcons: opts.classIcons !== false
      }
    );
    const anim = opts.animate !== false ? " ecu-meter-fill-anim" : "";
    el.innerHTML = `
    <div class="ecu-meter-fill${anim}" style="width:${pct}%;background:${rowColor(r)}"></div>
    ${opts.rank !== false ? `<span class="ecu-meter-rank">${r.rank != null ? r.rank : i + 1}.</span>` : "<span></span>"}
    <span class="ecu-meter-who">${icon}<span class="ecu-meter-label"></span></span>
    <span class="ecu-meter-vals"></span>`;
    const label = el.querySelector(".ecu-meter-label");
    if (label) label.textContent = r.name;
    const vals = el.querySelector(".ecu-meter-vals");
    if (vals) vals.innerHTML = formatRowValue(r, share, opts);
    return el;
  }
  function bindRow(el, r, opts) {
    if (opts.tooltipHtml) {
      el.onmousemove = (e2) => opts.tooltipHtml(e2, r);
      el.onmouseleave = () => {
        if (opts.onTooltipHide) opts.onTooltipHide();
      };
    }
    if (opts.onClick) {
      el.onclick = (e2) => opts.onClick(e2, r);
    } else {
      el.onclick = null;
    }
    if (opts.onContextMenu) {
      el.oncontextmenu = (e2) => {
        e2.preventDefault();
        opts.onContextMenu(e2, r);
      };
    } else {
      el.oncontextmenu = null;
    }
  }
  function renderRankedRows(container, rows, opts = {}) {
    container.innerHTML = "";
    container.classList.add("ecu-meter-bar-list");
    const sorted = rows.length && rows[0].rank != null ? rows.slice() : rows.slice().sort((a, b) => barAmount(b) - barAmount(a));
    const max = sorted.reduce((m, r) => {
      const v = barAmount(r);
      return v > m ? v : m;
    }, 0) || 1;
    const total = sorted.reduce((s, r) => s + r.value, 0) || 1;
    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i];
      const el = makeRowEl(r, i, opts, max, total);
      bindRow(el, r, opts);
      container.appendChild(el);
    }
    container._barOpts = opts;
  }
  function patchRankedRows(container, rows, opts = {}) {
    const merged = {
      ...container._barOpts || {},
      ...opts
    };
    const sorted = rows.length && rows[0].rank != null ? rows.slice() : rows.slice().sort((a, b) => barAmount(b) - barAmount(a));
    const max = sorted.reduce((m, r) => {
      const v = barAmount(r);
      return v > m ? v : m;
    }, 0) || 1;
    const total = sorted.reduce((s, r) => s + r.value, 0) || 1;
    const stray = Array.from(container.children).filter(
      (el) => !el.classList.contains("ecu-meter-row")
    );
    for (let i = 0; i < stray.length; i++) {
      stray[i].remove();
    }
    const kids = Array.from(container.children).filter(
      (el) => el.classList.contains("ecu-meter-row")
    );
    while (kids.length > sorted.length) {
      const last = kids.pop();
      if (last) last.remove();
    }
    while (kids.length < sorted.length) {
      const r = sorted[kids.length];
      const el = makeRowEl(r, kids.length, merged, max, total);
      container.appendChild(el);
      kids.push(el);
    }
    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i];
      const el = kids[i];
      el.dataset.id = r.id || String(i);
      el.className = "ecu-meter-row" + (r.you ? " you" : "") + (r.selected ? " is-selected" : "") + (r.kind === "ability" || r.kind === "channel" ? " has-skill" : "") + (merged.onClick || merged.onContextMenu ? " clickable" : "");
      const fill = el.querySelector(".ecu-meter-fill");
      const pct = max ? barAmount(r) / max * 100 : 0;
      if (fill) {
        fill.style.width = pct + "%";
        fill.style.background = rowColor(r);
      }
      const rank = el.querySelector(".ecu-meter-rank");
      if (rank && merged.rank !== false) {
        rank.textContent = `${r.rank != null ? r.rank : i + 1}.`;
      }
      const label = el.querySelector(".ecu-meter-label");
      if (label) label.textContent = r.name;
      const nameHost = el.querySelector(".ecu-meter-who");
      if (nameHost && (r.kind === "ability" || r.kind === "channel")) {
        const existing = nameHost.querySelector(".ecu-meter-icon");
        if (!existing) {
          nameHost.insertAdjacentHTML(
            "afterbegin",
            rowIconHtml(
              { id: r.id, kind: "ability" },
              { icons: merged.icons !== false }
            )
          );
        }
      }
      const vals = el.querySelector(".ecu-meter-vals");
      const share = total ? r.value / total * 100 : 0;
      if (vals) vals.innerHTML = formatRowValue(r, share, merged);
      bindRow(el, r, merged);
    }
    container._barOpts = merged;
  }

  // src/meters/meterTooltip.ts
  var PAD = 8;
  var CURSOR = 14;
  var tipEl = null;
  function ensureTip() {
    if (tipEl && tipEl.isConnected) return tipEl;
    tipEl = document.createElement("div");
    tipEl.className = "ecu-meter-tt";
    tipEl.style.display = "none";
    document.body.appendChild(tipEl);
    return tipEl;
  }
  function placeTip(tip, clientX, clientY) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = tip.getBoundingClientRect();
    const tw = Math.max(1, rect.width);
    const th2 = Math.max(1, rect.height);
    let x = clientX + CURSOR;
    let y = clientY + CURSOR;
    if (x + tw > vw - PAD) x = clientX - tw - CURSOR;
    if (y + th2 > vh - PAD) y = clientY - th2 - CURSOR;
    x = Math.max(PAD, Math.min(vw - tw - PAD, x));
    y = Math.max(PAD, Math.min(vh - th2 - PAD, y));
    tip.style.left = Math.round(x) + "px";
    tip.style.top = Math.round(y) + "px";
  }
  function showMeterTooltip(ev, html) {
    const tip = ensureTip();
    tip.innerHTML = html;
    tip.style.display = "block";
    tip.style.left = "-9999px";
    tip.style.top = "0px";
    placeTip(tip, ev.clientX, ev.clientY);
  }
  function hideMeterTooltip() {
    if (!tipEl) return;
    tipEl.style.display = "none";
  }

  // src/meters/meterTestBars.ts
  var METER_TEST_BAR_ROWS = [
    {
      id: "t1",
      name: "TestWarrior",
      ctype: "warrior",
      value: 12e4,
      rate: 1200,
      pct: 0.4,
      barMax: 12e4,
      label: "",
      kind: "player"
    },
    {
      id: "t2",
      name: "TestMage",
      ctype: "mage",
      value: 9e4,
      rate: 900,
      pct: 0.3,
      barMax: 12e4,
      label: "",
      kind: "player"
    },
    {
      id: "t3",
      name: "TestPriest",
      ctype: "priest",
      value: 6e4,
      rate: 600,
      pct: 0.2,
      barMax: 12e4,
      label: "",
      kind: "player"
    }
  ];
  function meterTestBarResult() {
    return { kind: "ranked", rows: METER_TEST_BAR_ROWS.slice() };
  }

  // src/ui/meter/MeterBarRow.ts
  function toPoolRows(rows, highlightId, selectedRowId) {
    const you = getYouId();
    return rows.map((r) => ({
      ...r,
      you: r.you || !!you && r.id === you || r.id === highlightId,
      selected: selectedRowId ? r.id === selectedRowId : !!r.selected,
      color: classColors[r.ctype || ""] || void 0,
      rank: r.rank
    }));
  }
  function playerTooltipHtml(row2, metric, expand) {
    const rate = row2.rate != null ? `<div class="line"><span>Rate</span><b>${formatCompactRate(row2.rate)}/s</b></div>` : "";
    const abs = metric === "avoidance" ? `<div class="line"><span>Value</span><b>${(row2.value * 100).toFixed(1)}%</b></div>` : `<div class="line"><span>Total</span><b>${formatCompactNumber(row2.value)}</b></div>${rate}`;
    let extra = "";
    if (expand === "spells" && row2.kind === "player") {
      extra = `<div class="sec">Abilities (Shift)</div><ul><li><span>Tip</span><b>Click row \u2192 Inspector spells</b></li></ul>`;
    }
    if (expand === "targets") {
      extra = `<div class="sec">Targets (Ctrl)</div><ul><li><span>Tip</span><b>Inspector \u2192 Targets tab</b></li></ul>`;
    }
    return `<h4>${row2.name}</h4>${abs}
    <div class="line"><span>Share</span><b>${(row2.pct * 100).toFixed(0)}%</b></div>${extra}
    <div class="sec">Tip</div>
    <ul><li><span>Click row</span><b>Inspector</b></li></ul>`;
  }
  function abilityTooltipHtml(row2) {
    const splash = row2.splashDamage != null && row2.splashDamage > 0 ? `<div class="line"><span>Explosion</span><b>+${formatCompactNumber(row2.splashDamage)}</b></div>` : "";
    return `<h4>${skillIconHtml(row2.id, 14)} ${row2.name}</h4>
    <div class="line"><span>Total</span><b>${formatCompactNumber(row2.value)}</b></div>
    ${splash}
    ${row2.rate != null ? `<div class="line"><span>Rate</span><b>${formatCompactRate(row2.rate)}/s</b></div>` : ""}
    <div class="sec">Tip</div>
    <ul><li><span>Click</span><b>targets for spell</b></li></ul>`;
  }
  function MeterBarsView(props) {
    const React = getReact();
    const hostRef = React.useRef(null);
    const scrollRef = React.useRef(null);
    const propsRef = React.useRef(props);
    const scrollOffRef = React.useRef(0);
    propsRef.current = props;
    const paint = React.useCallback((full) => {
      var _a;
      const host2 = hostRef.current;
      const scrollEl = scrollRef.current;
      const listHost = scrollEl || host2;
      if (!listHost) return;
      const p = propsRef.current;
      const app = getMeterAppearance();
      const useTestBars = app.testBars && (p.query.kind === "players" || p.query.kind === "channel" || p.query.kind === "avoidance");
      let result = runMeterQuery(p.query, {
        segmentRef: p.segmentRef,
        partyFocus: p.partyFocus,
        entities: p.entities,
        now: Date.now()
      });
      if (useTestBars && p.query.kind === "players") {
        result = meterTestBarResult();
      } else if (useTestBars && result.kind === "ranked" && !result.rows.length) {
        result = meterTestBarResult();
      }
      if (result.kind !== "ranked" || !result.rows.length) {
        listHost.innerHTML = '<div style="padding:8px;color:#888;font-size:12px">No data</div>';
        delete listHost._barOpts;
        return;
      }
      const youId2 = getYouId();
      const showSelf = p.alwaysShowSelf != null ? p.alwaysShowSelf : getSettings().meterAlwaysShowSelf !== false;
      const isPlayerRoot = p.query.kind === "players" || p.query.kind === "avoidance" || p.query.kind === "rolling" || p.query.kind === "snapshot" || p.query.kind === "channel";
      const sorted = result.rows.slice().sort((a, b) => b.value - a.value);
      let totalVal = 0;
      let totalRate = 0;
      for (let i = 0; i < sorted.length; i++) {
        totalVal += sorted[i].value;
        if (sorted[i].rate != null) totalRate += sorted[i].rate;
      }
      const capped = isPlayerRoot ? pinAlwaysShowSelf(
        sorted,
        maxRowsForFrameHeight(p.frameH) + scrollOffRef.current,
        youId2 || p.highlightId,
        showSelf
      ) : sorted.slice(
        scrollOffRef.current,
        scrollOffRef.current + maxRowsForFrameHeight(p.frameH)
      );
      const rows = toPoolRows(capped, p.highlightId, p.selectedRowId);
      if (app.showTotalBar && isPlayerRoot && rows.length) {
        rows.push({
          id: "__total__",
          name: "Total",
          value: totalVal,
          rate: totalRate || null,
          pct: 1,
          barMax: ((_a = sorted[0]) == null ? void 0 : _a.barMax) || totalVal,
          label: "Total",
          kind: "player",
          color: "#888"
        });
      }
      const metric = p.metric || (p.query.kind === "players" ? p.query.metric : p.query.kind === "abilities" || p.query.kind === "ability_targets" || p.query.kind === "targets" ? p.query.metric : void 0);
      const opts = {
        rank: app.showRankNumbers,
        pct: true,
        metric,
        icons: true,
        classIcons: app.showSpecIcons,
        animate: app.animateBars,
        detailsFormat: true,
        onClick: p.onRowClick ? (ev, row2) => p.onRowClick(row2, ev) : void 0,
        onContextMenu: p.onRowContextMenu ? (ev, row2) => p.onRowContextMenu(row2, ev) : void 0,
        tooltipHtml: (ev, row2) => {
          const expand = ev.shiftKey ? "spells" : ev.ctrlKey ? "targets" : void 0;
          const html = row2.kind === "ability" ? abilityTooltipHtml(row2) : playerTooltipHtml(row2, metric, expand);
          showMeterTooltip(ev, html);
        },
        onTooltipHide: hideMeterTooltip
      };
      if (full || !listHost._barOpts) {
        renderRankedRows(listHost, rows, opts);
      } else {
        patchRankedRows(listHost, rows, opts);
      }
    }, []);
    React.useEffect(() => {
      injectMeterChromeCss();
      paint(true);
      const p = propsRef.current;
      const live2 = p.live !== false && p.segmentRef === "current" && (p.query.kind === "players" || p.query.kind === "channel" || p.query.kind === "avoidance" || p.query.kind === "rolling" || p.query.kind === "realtime" || p.query.kind === "snapshot" || p.query.kind === "abilities" || p.query.kind === "ability_targets" || p.query.kind === "targets");
      const offAppearance = subscribeMeterAppearance(() => paint(true));
      if (!live2) {
        return offAppearance;
      }
      const offTick = subscribeMeterTick(() => {
        if (!hostRef.current || !hostRef.current.isConnected) return;
        if (propsRef.current.segmentRef !== "current") return;
        paint(false);
      });
      return () => {
        offAppearance();
        offTick();
      };
    }, [
      paint,
      props.live,
      props.segmentRef,
      props.partyFocus,
      props.highlightId,
      props.selectedRowId,
      JSON.stringify(props.query)
    ]);
    return e(
      "div",
      {
        ref: hostRef,
        className: "ecu-meter-bar-host",
        style: {
          fontSize: `${Math.round(getMeterAppearance().windowScale * 100)}%`
        },
        onWheel: (ev) => {
          if (!scrollRef.current) return;
          ev.preventDefault();
          scrollOffRef.current = Math.max(
            0,
            scrollOffRef.current + (ev.deltaY > 0 ? 1 : -1)
          );
          paint(false);
        }
      },
      e("div", {
        ref: scrollRef,
        className: "ecu-meter-bar-scroll ecu-meter-bar-list"
      })
    );
  }

  // src/ui/meter/meterShellHelpers.ts
  function presentationFor(inst) {
    return inst.presentation || "bars";
  }
  function rootQuery(inst) {
    return inst.query;
  }
  function meterShellTourId(query) {
    if (query.kind === "snapshot") {
      if (query.mode === "pdps") return "meter-pdps";
      if (query.mode === "coop_v1" || query.mode === "coop_v2") return "meter-coop";
    }
    return void 0;
  }
  function modeLabel(q, label) {
    const fromCycle = displayLabelForQuery(q);
    if (fromCycle) return fromCycle;
    if (label) return label;
    switch (q.kind) {
      case "players":
        return q.metric === "heal" ? "Healing" : q.metric === "taken" ? "Damage taken" : q.metric === "healing_required" ? "Healing required" : q.metric === "avoidance" ? "Avoidance" : "Damage";
      case "channel":
        return CHANNEL_LABELS[q.channel] || q.channel;
      case "rolling":
      case "realtime":
        return "Hit DPS";
      case "snapshot":
        return q.mode;
      case "death_log":
        return "Deaths";
      case "history":
        return "DPS graph";
      case "compare":
        return "Compare";
      case "encounter_summary":
        return "Encounter";
      case "timeline":
        return "Timeline";
      case "pie":
        return "Pie";
      case "summary":
        return "Summary";
      case "details":
        return "Inspector";
      case "abilities":
      case "ability_targets":
      case "targets":
      case "avoidance":
      case "conditions":
        return "Meter";
      default: {
        const _exhaustive = q;
        return String(_exhaustive);
      }
    }
  }
  function chromeBtn(title, label, onClick, active, wide) {
    return e(
      "button",
      {
        type: "button",
        title,
        onClick: (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          onClick(ev);
        },
        onPointerDown: (ev) => ev.stopPropagation(),
        className: "ecu-meter-btn" + (wide ? " wide" : "") + (active ? " active" : "")
      },
      label
    );
  }
  function toolBtn(opts) {
    const iconClass = opts.icon ? " is-icon icon-" + opts.icon : "";
    const useNativeTitle = !opts.onEnter;
    return e(
      "button",
      {
        type: "button",
        title: useNativeTitle ? opts.title : void 0,
        "aria-label": opts.title,
        ...opts.tourId ? { "data-ecu-tour": opts.tourId } : {},
        onClick: (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (opts.onClick) opts.onClick(ev);
        },
        onContextMenu: opts.onContextMenu ? (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          opts.onContextMenu(ev);
        } : void 0,
        onPointerDown: (ev) => ev.stopPropagation(),
        onMouseEnter: (ev) => {
          if (opts.onEnter) opts.onEnter(ev.currentTarget);
        },
        onMouseLeave: () => {
          if (opts.onLeave) opts.onLeave();
        },
        className: "ecu-meter-tool" + iconClass + (opts.active ? " active" : "")
      },
      opts.icon ? null : opts.glyph || ""
    );
  }
  function attrBallClass(q) {
    if (q.kind === "players") {
      if (q.metric === "heal" || q.metric === "healing_required")
        return "attr-heal";
      if (q.metric === "taken") return "attr-taken";
      return "attr-damage";
    }
    return "attr-other";
  }
  function cooltipItemNode(item) {
    const run = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      item.onSelect();
    };
    return e(
      "button",
      {
        type: "button",
        className: "ecu-meter-cooltip-item" + (item.selected ? " is-selected" : "") + (item.muted ? " is-muted" : "") + (item.className ? " " + item.className : ""),
        // Prefer mousedown so selection wins the hover-leave race; suppress click.
        onMouseDown: run,
        onClick: (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
        }
      },
      (item.selected ? "\u25CF " : "") + item.label
    );
  }
  function cycleSegmentRef(current, past2, delta) {
    const chain = ["current", "total"];
    for (let i = 0; i < past2.length; i++) {
      chain.push({ pastId: past2[i].id });
    }
    const key = (s) => typeof s === "string" ? s : `past:${s.pastId}`;
    let idx = 0;
    const curKey = key(current);
    for (let i = 0; i < chain.length; i++) {
      if (key(chain[i]) === curKey) {
        idx = i;
        break;
      }
    }
    const next = idx + delta;
    if (next < 0) return chain[chain.length - 1];
    if (next >= chain.length) return chain[0];
    return chain[next];
  }

  // src/ui/chrome/MetricChart.ts
  function transformValues(series, opts) {
    let out = series.map((s) => ({
      ...s,
      values: s.values.slice()
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
      const stacked = out.map((s) => ({
        ...s,
        values: new Array(len).fill(0)
      }));
      for (let i = 0; i < len; i++) {
        let total = 0;
        const raw = [];
        for (let s = 0; s < out.length; s++) {
          const v = out[s].values[i] || 0;
          raw.push(v);
          total += v;
        }
        let run = 0;
        for (let s = 0; s < out.length; s++) {
          let v = raw[s];
          if (opts.normalize && total > 0) v = v / total * 100;
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
  function MetricChart(props) {
    const React = getReact();
    const ref = React.useRef(null);
    const width = props.width || 280;
    const height = props.height || 100;
    const emptyText = props.emptyText || "No samples yet";
    const series = transformValues(props.series || [], {
      stack: props.stack,
      normalize: props.normalize,
      integrate: props.integrate
    });
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
        const y = padT + plotH * g / 2;
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
          const x = padL + plotW * i / Math.max(vals.length - 1, 1);
          const y = padT + plotH - plotH * (vals[i] || 0) / maxVal;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        if (props.fill || props.stack) {
          const lastX = padL + plotW * (vals.length - 1) / Math.max(vals.length - 1, 1);
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
          const x = padL + plotW * i / Math.max(vals.length - 1, 1);
          const y = padT + plotH - plotH * (vals[i] || 0) / maxVal;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.fillStyle = "#ccc";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "left";
      const topLabel = props.normalize ? "100%" : Math.round(maxVal).toLocaleString();
      ctx.fillText(topLabel, padL, 12);
    }, [
      series,
      width,
      height,
      emptyText,
      props.fill,
      props.stack,
      props.normalize
    ]);
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

  // src/ui/meter/views/MeterMiscViews.ts
  var pad = {
    padding: "8px",
    color: "#888",
    fontSize: TYPE.body,
    ...PIXEL_TEXT
  };
  function fmtRelSec(deathAt, hitAt) {
    const d = (hitAt - deathAt) / 1e3;
    const sign = d <= 0 ? "" : "+";
    return `${sign}${d.toFixed(1)}s`;
  }
  var DEBUFF_CONDITION_KEYS = /* @__PURE__ */ new Set([
    "cursed",
    "burned",
    "poisoned",
    "weakness",
    "frozen",
    "stunned",
    "slowed"
  ]);
  function conditionKind(key) {
    return DEBUFF_CONDITION_KEYS.has(key) ? "debuff" : "buff";
  }
  function buildActorNameMap(segmentRef) {
    const map = {};
    const meta = getPlayerMeta();
    const metaIds = Object.keys(meta);
    for (let i = 0; i < metaIds.length; i++) {
      const id = metaIds[i];
      map[id] = meta[id].name;
    }
    const seg = resolveSegment(segmentRef);
    if (seg) {
      const actorIds = Object.keys(seg.actors);
      for (let i = 0; i < actorIds.length; i++) {
        const a = seg.actors[actorIds[i]];
        map[a.id] = a.name || map[a.id] || a.id;
      }
    }
    return map;
  }
  function lifePctAtHit(hpLog, hitAt) {
    if (!hpLog.length) return null;
    let best = hpLog[0];
    for (let i = 0; i < hpLog.length; i++) {
      const sample = hpLog[i];
      if (sample.at <= hitAt) best = sample;
    }
    if (!(best.maxHp > 0)) return null;
    return Math.round(best.hp / best.maxHp * 100);
  }
  function sameCtypePeers(segmentRef, actorId, ctype) {
    if (!ctype) return [];
    const seg = resolveSegment(segmentRef);
    if (!seg) return [];
    const peers = [];
    const ids = Object.keys(seg.actors);
    for (let i = 0; i < ids.length; i++) {
      const a = seg.actors[ids[i]];
      if (a.ctype !== ctype) continue;
      if (!getPlayerMeta()[a.id] && !a.damage && !a.heal && !a.taken) continue;
      peers.push(a);
    }
    peers.sort((a, b) => b.damage - a.damage);
    if (peers.length <= 1) return peers;
    const you = getYouId();
    const selfIdx = peers.findIndex((p) => p.id === actorId);
    if (selfIdx > 0) {
      const self = peers.splice(selfIdx, 1)[0];
      peers.unshift(self);
    } else if (you) {
      const youIdx = peers.findIndex((p) => p.id === you);
      if (youIdx > 1) {
        const row2 = peers.splice(youIdx, 1)[0];
        peers.splice(1, 0, row2);
      }
    }
    return peers;
  }
  function DeathSourceBar(props) {
    const React = getReact();
    const iconRef = React.useRef(null);
    React.useEffect(() => {
      if (!iconRef.current) return;
      iconRef.current.innerHTML = skillIconHtml(props.ability, 14);
    }, [props.ability]);
    return e(
      "div",
      { className: "ecu-meter-death-source" },
      e("span", { ref: iconRef, className: "ecu-meter-death-source-icon" }),
      e("span", { className: "ecu-meter-death-source-name" }, props.ability),
      e(
        "span",
        { className: "ecu-meter-death-source-bar" },
        e("span", {
          className: "ecu-meter-death-source-fill",
          style: { width: `${Math.round(props.pct * 100)}%` }
        })
      ),
      e("span", { className: "ecu-meter-death-source-amt" }, formatCompactNumber(props.amount))
    );
  }
  function DeathHitRow(props) {
    const React = getReact();
    const ref = React.useRef(null);
    const h = props.hit;
    const heal = h.damage < 0 || h.source === "heal";
    const amt = heal ? `+${formatCompactNumber(Math.abs(h.damage))}` : `\u2212${formatCompactNumber(h.damage)}`;
    const lifePct = props.showLifePct && props.hpLog ? lifePctAtHit(props.hpLog, h.at) : null;
    React.useEffect(() => {
      if (!ref.current) return;
      ref.current.innerHTML = `${skillIconHtml(h.source || "attack", 14)} ${h.source || "attack"}${h.actor ? ` <span class="ecu-meter-death-hit-actor">${h.actor}</span>` : ""}`;
    }, [h.source, h.actor]);
    return e(
      "div",
      {
        className: "ecu-meter-death-hit" + (heal ? " is-heal" : " is-dmg") + (lifePct != null ? " has-life" : "")
      },
      e(
        "span",
        { className: "ecu-meter-death-hit-rel" },
        fmtRelSec(props.deathAt, h.at)
      ),
      e("span", { ref, className: "ecu-meter-death-hit-src" }),
      e("span", { className: "ecu-meter-death-hit-amt" }, amt),
      lifePct != null ? e("span", { className: "ecu-meter-death-hit-life" }, `${lifePct}%`) : null
    );
  }
  function useDeathChartWidth(fallback = 320) {
    const React = getReact();
    const ref = React.useRef(null);
    const [width, setWidth] = React.useState(fallback);
    React.useEffect(() => {
      const el = ref.current;
      if (!el) return;
      const measure = () => setWidth(Math.max(120, Math.floor(el.clientWidth - 4)));
      measure();
      if (typeof ResizeObserver === "undefined") return;
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }, []);
    return { ref, width };
  }
  var OC_COLORS = {
    hits: "#90caf9",
    crits: "#ef5350",
    miss: "#b0bec5",
    evade: "#80cbc4",
    avoid: "#ce93d8",
    kills: "#e57373"
  };
  function outcomeRows(outcomes) {
    return [
      ["hits", outcomes.hits, OC_COLORS.hits],
      ["crits", outcomes.crits, OC_COLORS.crits],
      ["miss", outcomes.miss, OC_COLORS.miss],
      ["evade", outcomes.evade, OC_COLORS.evade],
      ["avoid", outcomes.avoid, OC_COLORS.avoid],
      ["kills", outcomes.kills, OC_COLORS.kills]
    ].filter(([, c]) => c > 0);
  }
  function OutcomeTable(props) {
    const rows = outcomeRows(props.outcomes);
    let sum = 0;
    for (let i = 0; i < rows.length; i++) sum += rows[i][1];
    if (!sum) sum = 1;
    return e(
      "table",
      { className: "ecu-meter-outcome" },
      e(
        "thead",
        null,
        e(
          "tr",
          null,
          e("th", null, "Type"),
          e("th", null, "Count"),
          e("th", null, "%")
        )
      ),
      e(
        "tbody",
        null,
        ...rows.map(
          ([name, count, color]) => e(
            "tr",
            { key: name },
            e(
              "td",
              null,
              props.swatches ? e("span", {
                style: {
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  background: color,
                  marginRight: 6
                }
              }) : null,
              name
            ),
            e("td", null, String(count)),
            e("td", null, `${(count / sum * 100).toFixed(0)}%`)
          )
        )
      )
    );
  }
  function MeterDetailsView(props) {
    var _a;
    const React = getReact();
    const [tab, setTab] = React.useState("spells");
    React.useEffect(() => {
      injectMeterChromeCss();
    }, []);
    const isDetails = props.result.kind === "details";
    const r = isDetails ? props.result : null;
    const abilityKey = props.selectedAbility || (r ? r.ability : void 0);
    if (!r) {
      return e(
        "div",
        { style: { padding: "8px", color: "#888", ...PIXEL_TEXT } },
        "Pick a player (or open Inspector after combat)"
      );
    }
    const sec = Math.max(r.durationMs / 1e3, 1);
    const tabs = [
      { id: "spells", label: "Spells" },
      { id: "targets", label: "Targets" },
      { id: "auras", label: "Auras" },
      { id: "compare", label: "Compare" },
      { id: "summary", label: "Summary" }
    ];
    const onSpellClick = (row2) => {
      if (props.onSelectAbility) props.onSelectAbility(row2.id);
      setTab("targets");
    };
    let body = null;
    if (tab === "spells") {
      body = e(MeterBarsView, {
        query: { kind: "abilities", actorId: r.actorId, metric: "damage" },
        segmentRef: props.segmentRef,
        partyFocus: props.partyFocus,
        live: false,
        selectedRowId: props.selectedAbility || void 0,
        onRowClick: onSpellClick
      });
    } else if (tab === "targets") {
      const ab = abilityKey || ((_a = r.abilityRows[0]) == null ? void 0 : _a.id);
      body = ab ? e(MeterBarsView, {
        query: {
          kind: "ability_targets",
          actorId: r.actorId,
          ability: ab,
          metric: "damage"
        },
        segmentRef: props.segmentRef,
        partyFocus: props.partyFocus,
        live: false
      }) : e(MeterBarsView, {
        query: { kind: "targets", actorId: r.actorId, metric: "damage" },
        segmentRef: props.segmentRef,
        partyFocus: props.partyFocus,
        live: false
      });
    } else if (tab === "auras") {
      body = e(
        "div",
        { className: "ecu-meter-inspector-summary", style: { ...PIXEL_TEXT } },
        e("div", { className: "sec-h" }, "Buff / condition uptime"),
        e(UptimeTable, { rows: r.uptimeRows || [] })
      );
    } else if (tab === "compare") {
      const peers = sameCtypePeers(props.segmentRef, r.actorId, r.ctype);
      body = peers.length > 1 ? e(
        "div",
        { className: "ecu-meter-inspector-compare" },
        ...peers.map((p) => {
          const secPeer = Math.max(r.durationMs / 1e3, 1);
          const isSelf = p.id === r.actorId;
          return e(
            "div",
            {
              key: p.id,
              className: "ecu-meter-inspector-compare-col" + (isSelf ? " is-you" : "")
            },
            e(
              "div",
              { className: "ecu-meter-inspector-compare-h" },
              p.name,
              isSelf ? " (you)" : ""
            ),
            e(
              "div",
              { className: "ecu-meter-inspector-compare-stat" },
              "Damage",
              e("b", null, formatCompactNumber(p.damage))
            ),
            e(
              "div",
              { className: "ecu-meter-inspector-compare-stat" },
              "DPS",
              e("b", null, formatCompactRate(p.damage / secPeer))
            ),
            e(
              "div",
              { className: "ecu-meter-inspector-compare-stat" },
              "Taken",
              e("b", null, formatCompactNumber(p.taken))
            ),
            e(
              "div",
              { className: "ecu-meter-inspector-compare-stat" },
              "Heal",
              e("b", null, formatCompactNumber(p.heal))
            ),
            e(
              "div",
              { className: "ecu-meter-inspector-compare-stat" },
              "HPS",
              e("b", null, formatCompactRate(p.heal / secPeer))
            )
          );
        })
      ) : e(
        "div",
        { style: { padding: 8, color: "#888", ...PIXEL_TEXT } },
        r.ctype ? "No other players with the same class in this segment" : "Class unknown \u2014 compare needs ctype"
      );
    } else {
      body = e(
        "div",
        { className: "ecu-meter-inspector-summary", style: { ...PIXEL_TEXT } },
        e(
          "div",
          { className: "stat-grid" },
          e("div", null, "Damage ", e("b", null, formatCompactNumber(r.totals.damage))),
          e("div", null, "DPS ", e("b", null, formatCompactRate(r.totals.damage / sec))),
          e("div", null, "Taken ", e("b", null, formatCompactNumber(r.totals.taken))),
          e("div", null, "Heal ", e("b", null, formatCompactNumber(r.totals.heal))),
          e("div", null, "HPS ", e("b", null, formatCompactRate(r.totals.heal / sec))),
          e(
            "div",
            null,
            "Heal Req ",
            e("b", null, formatCompactNumber(r.totals.healingRequired))
          ),
          e("div", null, "Deaths ", e("b", null, String(r.deaths)))
        ),
        e(
          "div",
          { className: "sec-h" },
          props.selectedAbility ? `${props.selectedAbility} \u2014 outcomes` : "Outcomes"
        ),
        e(OutcomeTable, { outcomes: r.outcomes }),
        r.uptimeRows && r.uptimeRows.length ? e(
          "div",
          null,
          e("div", { className: "sec-h" }, "Uptime"),
          e(UptimeTable, { rows: r.uptimeRows })
        ) : null
      );
    }
    return e(
      "div",
      { className: "ecu-meter-inspector" },
      e(
        "div",
        { className: "ecu-meter-inspector-body" },
        tab === "targets" && props.selectedAbility ? e(
          "div",
          { className: "ecu-meter-inspector-spell" },
          props.selectedAbility,
          r.abilitySplash > 0 ? ` \xB7 explosion splash ${formatCompactNumber(r.abilitySplash)}` : ""
        ) : null,
        body
      ),
      e(
        "div",
        { className: "ecu-meter-inspector-tabs-rail", style: { ...PIXEL_TEXT } },
        ...tabs.map(
          (t) => e(
            "button",
            {
              key: t.id,
              type: "button",
              className: "ecu-meter-player-tab" + (tab === t.id ? " active" : ""),
              onClick: () => setTab(t.id)
            },
            t.label
          )
        )
      )
    );
  }
  function UptimeTable(props) {
    if (!props.rows.length) {
      return e(
        "div",
        { style: { padding: 8, color: "#888", ...PIXEL_TEXT } },
        "No buff / condition samples yet (need entity.s while in combat)"
      );
    }
    return e(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 2,
          padding: "4px 0",
          ...PIXEL_TEXT
        }
      },
      ...props.rows.map(
        (row2) => e(
          "div",
          {
            key: row2.id,
            className: "ecu-meter-uptime-row",
            style: {
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: 8,
              padding: "3px 8px",
              alignItems: "center",
              fontSize: 15,
              color: "#c5d0e0"
            },
            title: `${row2.name}: ${(row2.activeMs / 1e3).toFixed(1)}s active`
          },
          e("span", null, row2.name),
          e(
            "b",
            { style: { color: "#fff" } },
            `${(row2.uptime * 100).toFixed(0)}%`
          ),
          e("span", { style: { color: "#8b9bb0" } }, `${row2.apps}\xD7`)
        )
      )
    );
  }
  function MeterDeathView(props) {
    const React = getReact();
    const [sel, setSel] = React.useState(0);
    const [filter, setFilter] = React.useState(
      "all"
    );
    const chartWrap = useDeathChartWidth();
    const appearance = getMeterAppearance();
    React.useEffect(() => {
      injectMeterChromeCss();
    }, []);
    if (props.result.kind !== "death_log") {
      return e("div", { style: pad }, "No deaths");
    }
    const deaths = props.result.deaths;
    if (!deaths.length) return e("div", { style: pad }, "No deaths yet");
    const idx = Math.min(sel, deaths.length - 1);
    const d = deaths[idx];
    const killers = {};
    for (let i = 0; i < d.recentHits.length; i++) {
      const h = d.recentHits[i];
      if (!(h.damage > 0)) continue;
      const key = h.source || h.actor || "unknown";
      killers[key] = (killers[key] || 0) + h.damage;
    }
    const killerList = Object.keys(killers).map((k) => ({ key: k, amount: killers[k] })).sort((a, b) => b.amount - a.amount).slice(0, 8);
    const killerMax = killerList.length > 0 ? killerList.reduce((m, k) => Math.max(m, k.amount), 0) : 1;
    const hpSeries = [
      {
        label: "HP",
        color: "#e53935",
        values: d.hpLog.map((h) => h.maxHp > 0 ? h.hp / h.maxHp * 100 : h.hp)
      }
    ];
    const relevanceMs = Math.max(appearance.deathLogRelevanceSec, 1) * 1e3;
    const filteredHits = d.recentHits.filter((h) => {
      const delta = d.at - h.at;
      if (delta < 0 || delta > relevanceMs) return false;
      const heal = h.damage < 0 || h.source === "heal";
      if (filter === "damage") return !heal && h.damage > 0;
      if (filter === "heal") return heal;
      return true;
    });
    const logHits = filteredHits.slice().sort(
      (a, b) => appearance.deathLogInvert ? b.at - a.at : a.at - b.at
    );
    const killerLabel = d.killerId && killerList.length ? killerList[0].key : d.killerId || null;
    const filterTabs = [
      { id: "all", label: "All" },
      { id: "damage", label: "Damage" },
      { id: "heal", label: "Heals" }
    ];
    return e(
      "div",
      { className: "ecu-meter-death", style: { ...PIXEL_TEXT } },
      e(
        "div",
        { className: "ecu-meter-death-side" },
        ...deaths.map(
          (row2, i) => e(
            "button",
            {
              key: `${row2.id}-${row2.at}`,
              type: "button",
              className: i === idx ? "active" : "",
              onClick: () => setSel(i)
            },
            e("span", { className: "ecu-meter-death-side-num" }, `#${i + 1}`),
            row2.name,
            e(
              "span",
              { className: "ecu-meter-death-side-time" },
              new Date(row2.at).toLocaleTimeString()
            )
          )
        )
      ),
      e(
        "div",
        { className: "ecu-meter-death-main" },
        e(
          "header",
          { className: "ecu-meter-death-hdr" },
          e("div", { className: "ecu-meter-death-victim" }, d.name),
          e(
            "div",
            { className: "ecu-meter-death-meta" },
            `#${idx + 1} \xB7 ${new Date(d.at).toLocaleTimeString()}`
          ),
          killerLabel ? e(
            "div",
            { className: "ecu-meter-death-killer" },
            "Killing blow: ",
            e("b", null, killerLabel)
          ) : null
        ),
        e(
          "section",
          { className: "ecu-meter-death-chart", ref: chartWrap.ref },
          e("div", { className: "sec-h" }, "Health"),
          e(MetricChart, {
            width: chartWrap.width,
            height: 88,
            series: hpSeries,
            emptyText: "No HP log",
            fill: true
          })
        ),
        killerList.length ? e(
          "section",
          { className: "ecu-meter-death-sources" },
          e("div", { className: "sec-h" }, "Damage sources"),
          ...killerList.map(
            (k) => e(DeathSourceBar, {
              key: k.key,
              ability: k.key,
              amount: k.amount,
              pct: k.amount / killerMax
            })
          )
        ) : null,
        e(
          "section",
          { className: "ecu-meter-death-log" },
          e(
            "div",
            { className: "ecu-meter-death-log-hdr" },
            e("div", { className: "sec-h" }, "Events"),
            e(
              "div",
              { className: "ecu-meter-death-filters" },
              ...filterTabs.map(
                (tab) => e(
                  "button",
                  {
                    key: tab.id,
                    type: "button",
                    className: "ecu-meter-death-filter" + (filter === tab.id ? " active" : ""),
                    onClick: () => setFilter(tab.id)
                  },
                  tab.label
                )
              )
            )
          ),
          e(
            "div",
            { className: "ecu-meter-death-log-scroll" },
            logHits.length ? logHits.map(
              (h, i) => e(DeathHitRow, {
                key: `${h.at}-${i}`,
                hit: h,
                deathAt: d.at,
                showLifePct: appearance.deathLogLifePct,
                hpLog: d.hpLog
              })
            ) : e("div", { className: "ecu-meter-death-log-empty" }, "No events")
          )
        )
      )
    );
  }
  function MeterEncounterView(props) {
    const React = getReact();
    const [tab, setTab] = React.useState("summary");
    React.useEffect(() => {
      injectMeterChromeCss();
    }, []);
    if (props.result.kind !== "encounter") {
      return e("div", { style: pad }, "No encounter");
    }
    const r = props.result;
    const sec = Math.max(r.durationMs / 1e3, 1);
    const tabs = [
      { id: "summary", label: "Summary" },
      { id: "deaths", label: "Deaths" },
      { id: "interrupts", label: "Interrupts" },
      { id: "dispels", label: "Dispels" }
    ];
    const widgets = [
      {
        key: "dmg",
        title: "Damage Done",
        query: { kind: "players", metric: "damage", primary: "total" }
      },
      {
        key: "dps",
        title: "DPS",
        query: { kind: "players", metric: "damage", primary: "rate" }
      },
      {
        key: "taken",
        title: "Damage Taken",
        query: { kind: "players", metric: "taken", primary: "total" }
      },
      {
        key: "heal",
        title: "Healing Done",
        query: { kind: "players", metric: "heal", primary: "total" }
      },
      {
        key: "hr",
        title: "Healing Required",
        query: { kind: "players", metric: "healing_required", primary: "total" }
      },
      {
        key: "av",
        title: "Avoidance",
        query: { kind: "avoidance" }
      }
    ];
    const deathResult = runMeterQuery(
      { kind: "death_log" },
      {
        segmentRef: props.segmentRef,
        partyFocus: props.partyFocus
      }
    );
    let body = null;
    if (tab === "summary") {
      body = e(
        "div",
        null,
        e(
          "div",
          { className: "ecu-meter-encounter-stats", style: { ...PIXEL_TEXT } },
          e("span", null, `${sec.toFixed(0)}s`),
          e("span", null, `${r.deaths} deaths`),
          e("span", null, "Dmg ", e("b", null, formatCompactNumber(r.totalDamage))),
          e("span", null, "DPS ", e("b", null, `${formatCompactNumber(r.totalDamage / sec)}/s`)),
          e("span", null, "Heal ", e("b", null, formatCompactNumber(r.totalHeal))),
          e("span", null, "HPS ", e("b", null, `${formatCompactNumber(r.totalHeal / sec)}/s`)),
          r.topDps ? e("span", { style: { color: "#e88" } }, `Top ${r.topDps.name}`) : null
        ),
        e(
          "div",
          { className: "ecu-meter-encounter-grid" },
          ...widgets.map(
            (w) => e(
              "div",
              { key: w.key, className: "ecu-meter-encounter-widget" },
              e("div", { className: "ecu-meter-encounter-widget-h" }, w.title),
              e(
                "div",
                { className: "ecu-meter-encounter-widget-body" },
                e(MeterBarsView, {
                  query: w.query,
                  segmentRef: props.segmentRef,
                  partyFocus: props.partyFocus,
                  live: false,
                  onRowContextMenu: props.onOpenPlayer ? (row2) => props.onOpenPlayer(row2.id, row2.name) : void 0,
                  onRowClick: props.onOpenPlayer ? (row2) => props.onOpenPlayer(row2.id, row2.name) : void 0
                })
              )
            )
          ),
          e(
            "div",
            { className: "ecu-meter-encounter-widget" },
            e("div", { className: "ecu-meter-encounter-widget-h" }, "Death Log"),
            e(
              "div",
              { className: "ecu-meter-encounter-widget-body" },
              deathResult.kind === "death_log" && deathResult.deaths.length ? e(
                "div",
                { style: { padding: "4px 6px", ...PIXEL_TEXT } },
                ...deathResult.deaths.slice(0, 8).map(
                  (d, i) => e(
                    "div",
                    {
                      key: `${d.id}-${d.at}`,
                      style: {
                        padding: "3px 0",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        fontSize: 11,
                        color: "#c5d0e0"
                      }
                    },
                    e("b", { style: { color: "#ef9a9a" } }, d.name),
                    ` \xB7 #${i + 1} \xB7 ${new Date(d.at).toLocaleTimeString()}`
                  )
                )
              ) : e(
                "div",
                { style: { padding: 8, color: "#888", fontSize: 11 } },
                "No deaths"
              )
            )
          )
        )
      );
    } else if (tab === "deaths") {
      body = deathResult.kind === "death_log" ? e(MeterDeathView, { result: deathResult }) : e("div", { style: pad }, "No deaths");
    } else if (tab === "interrupts") {
      body = e(MeterBarsView, {
        query: { kind: "misc", metric: "interrupts" },
        segmentRef: props.segmentRef,
        partyFocus: props.partyFocus,
        live: false,
        onRowClick: props.onOpenPlayer ? (row2) => props.onOpenPlayer(row2.id, row2.name) : void 0
      });
    } else {
      body = e(MeterBarsView, {
        query: { kind: "misc", metric: "dispels" },
        segmentRef: props.segmentRef,
        partyFocus: props.partyFocus,
        live: false,
        onRowClick: props.onOpenPlayer ? (row2) => props.onOpenPlayer(row2.id, row2.name) : void 0
      });
    }
    return e(
      "div",
      { className: "ecu-meter-encounter", style: { ...PIXEL_TEXT } },
      e(
        "div",
        { className: "ecu-meter-encounter-tabs" },
        ...tabs.map(
          (t) => e(
            "button",
            {
              key: t.id,
              type: "button",
              className: "ecu-meter-encounter-tab" + (tab === t.id ? " active" : ""),
              onClick: () => setTab(t.id)
            },
            t.label
          )
        )
      ),
      e("div", { className: "ecu-meter-encounter-body" }, body)
    );
  }
  function MeterTimelineView(props) {
    const React = getReact();
    const [filter, setFilter] = React.useState("all");
    React.useEffect(() => {
      injectMeterChromeCss();
    }, []);
    if (props.result.kind !== "timeline") {
      return e("div", { style: pad }, "No timeline");
    }
    const { casts, conditions, durationMs } = props.result;
    const durSec = Math.max(durationMs / 1e3, 1);
    const nameMap = buildActorNameMap(props.segmentRef);
    const seg = resolveSegment(props.segmentRef);
    const deaths = seg ? seg.deaths : [];
    let start = Date.now();
    for (let i = 0; i < conditions.length; i++) {
      start = Math.min(start, conditions[i].startedAt);
    }
    for (let i = 0; i < casts.length; i++) {
      start = Math.min(start, casts[i].at);
    }
    if (seg && seg.startedAt) start = Math.min(start, seg.startedAt);
    const lanes = {};
    for (let i = 0; i < conditions.length; i++) {
      const c = conditions[i];
      if (filter === "cds") continue;
      const ck = conditionKind(c.key);
      if (filter === "buffs" && ck !== "buff") continue;
      if (filter === "debuffs" && ck !== "debuff") continue;
      const key = c.actorId;
      if (!lanes[key]) lanes[key] = [];
      const t0 = (c.startedAt - start) / 1e3;
      const t1 = ((c.endedAt || Date.now()) - start) / 1e3;
      lanes[key].push({
        left: t0 / durSec * 100,
        width: Math.max(0.8, (t1 - t0) / durSec * 100),
        label: c.key,
        color: ck === "debuff" ? "#ab47bc" : "#5c6bc0",
        kind: "bar"
      });
    }
    for (let i = 0; i < casts.length; i++) {
      const c = casts[i];
      if (filter === "buffs" || filter === "debuffs") continue;
      const key = c.actorId;
      if (!lanes[key]) lanes[key] = [];
      const t0 = (c.at - start) / 1e3;
      lanes[key].push({
        left: t0 / durSec * 100,
        width: 1.2,
        label: c.source,
        color: "#ffb74d",
        kind: "bar"
      });
    }
    for (let i = 0; i < deaths.length; i++) {
      const d = deaths[i];
      const key = d.id;
      if (!lanes[key]) lanes[key] = [];
      const t0 = (d.at - start) / 1e3;
      lanes[key].push({
        left: t0 / durSec * 100,
        width: 0,
        label: `${d.name} died`,
        color: "#e53935",
        kind: "death"
      });
    }
    const laneIds = Object.keys(lanes);
    const filterTabs = ["all", "buffs", "debuffs", "cds"];
    return e(
      "div",
      { className: "ecu-meter-timeline", style: { ...PIXEL_TEXT } },
      e(
        "div",
        { className: "ecu-meter-timeline-tools" },
        ...filterTabs.map(
          (f) => e(
            "button",
            {
              key: f,
              type: "button",
              className: "ecu-meter-tab" + (filter === f ? " active" : ""),
              onClick: () => setFilter(f)
            },
            f
          )
        ),
        e(
          "span",
          { className: "ecu-meter-timeline-meta" },
          `${durSec.toFixed(0)}s`,
          deaths.length ? ` \xB7 ${deaths.length} deaths` : ""
        )
      ),
      e(
        "div",
        { className: "ecu-meter-timeline-scroll" },
        ...laneIds.slice(0, 12).map(
          (id) => e(
            "div",
            { key: id, className: "ecu-meter-timeline-lane" },
            e(
              "div",
              {
                className: "ecu-meter-timeline-name",
                title: nameMap[id] || id
              },
              nameMap[id] || id
            ),
            e(
              "div",
              { className: "ecu-meter-timeline-track" },
              ...lanes[id].map(
                (bar, bi) => bar.kind === "death" ? e("div", {
                  key: bi,
                  className: "ecu-meter-timeline-death",
                  title: bar.label,
                  style: {
                    left: `${Math.min(99, Math.max(0, bar.left))}%`
                  }
                }) : e("div", {
                  key: bi,
                  className: "ecu-meter-timeline-bar",
                  title: bar.label,
                  style: {
                    left: `${Math.min(99, Math.max(0, bar.left))}%`,
                    width: `${Math.min(100, bar.width)}%`,
                    background: bar.color
                  }
                })
              )
            )
          )
        )
      )
    );
  }

  // src/ui/meter/paintMetricCanvas.ts
  function transformValues2(series, opts) {
    let out = series.map((s) => ({
      ...s,
      values: s.values.slice()
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
      const stacked = out.map((s) => ({
        ...s,
        values: new Array(len).fill(0)
      }));
      for (let i = 0; i < len; i++) {
        let total = 0;
        const raw = [];
        for (let s = 0; s < out.length; s++) {
          const v = out[s].values[i] || 0;
          raw.push(v);
          total += v;
        }
        let run = 0;
        for (let s = 0; s < out.length; s++) {
          let v = raw[s];
          if (opts.normalize && total > 0) v = v / total * 100;
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
  function paintMetricCanvas(canvas, opts) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const width = opts.width;
    const height = opts.height;
    const emptyText = opts.emptyText || "No samples yet";
    const series = transformValues2(opts.series || [], {
      stack: opts.stack,
      normalize: opts.normalize,
      integrate: opts.integrate
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
      const y = padT + plotH * g / 2;
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
        const x = padL + plotW * i / Math.max(vals.length - 1, 1);
        const y = padT + plotH - plotH * (vals[i] || 0) / maxVal;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      if (opts.fill || opts.stack) {
        const lastX = padL + plotW * (vals.length - 1) / Math.max(vals.length - 1, 1);
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
        const x = padL + plotW * i / Math.max(vals.length - 1, 1);
        const y = padT + plotH - plotH * (vals[i] || 0) / maxVal;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = "#ccc";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "left";
    const topLabel = opts.normalize ? "100%" : Math.round(maxVal).toLocaleString();
    ctx.fillText(topLabel, padL, 12);
  }

  // src/ui/meter/views/MeterChartViews.ts
  function fmtRate(n) {
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
    return n.toFixed(1);
  }
  function historyToSeries(result, enabled, windowPts) {
    var _a, _b;
    if (result.kind !== "history") return [];
    const meta = getPlayerMeta();
    const series = [];
    for (let i = 0; i < result.seriesKeys.length && i < 12; i++) {
      const id = result.seriesKeys[i];
      if (enabled && enabled[id] === false) continue;
      const values = [];
      const pts = result.points;
      const start = windowPts && windowPts > 0 ? Math.max(0, pts.length - windowPts) : 0;
      for (let p = start; p < pts.length; p++) {
        values.push(pts[p].values[id] || 0);
      }
      series.push({
        label: ((_a = meta[id]) == null ? void 0 : _a.name) || id,
        color: classColors[((_b = meta[id]) == null ? void 0 : _b.ctype) || ""] || "#888",
        values,
        // stash id for legend
        ...{ id }
      });
    }
    return series;
  }
  function MeterHistoryChart(props) {
    if (props.result.kind !== "history") {
      return e(
        "div",
        { style: { padding: "8px", color: "#888", ...PIXEL_TEXT } },
        "No history"
      );
    }
    const series = historyToSeries(props.result, void 0, void 0);
    return e(MetricChart, {
      width: props.width || 280,
      height: props.height || 110,
      series,
      emptyText: "No samples yet",
      fill: props.fill,
      stack: props.stack,
      integrate: props.integrate,
      normalize: props.normalize
    });
  }
  function MeterSeriesView(props) {
    const React = getReact();
    const canvasRef = React.useRef(null);
    const wrapRef = React.useRef(null);
    const legendRef = React.useRef(null);
    const metaRef = React.useRef(null);
    const propsRef = React.useRef(props);
    propsRef.current = props;
    const mode = props.instance.seriesMode || (props.instance.presentation === "compare" ? "compare" : "realtime");
    const isCompare = mode === "compare";
    const rtMetric = props.instance.rtMetric || "dps";
    const rtWindow = props.instance.rtWindow || 30;
    const rtPaused = !!props.instance.rtPaused;
    React.useEffect(() => {
      injectMeterChromeCss();
    }, []);
    const paintLive = React.useCallback(() => {
      var _a, _b;
      const p = propsRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const hist = runMeterQuery(
        { kind: "history" },
        {
          segmentRef: p.segmentRef,
          partyFocus: p.partyFocus,
          now: Date.now()
        }
      );
      const win = p.instance.rtWindow || 30;
      const series = historyToSeries(
        hist,
        p.instance.seriesEnabled,
        isCompare ? void 0 : win
      );
      const width = Math.max(
        200,
        wrapRef.current && wrapRef.current.clientWidth || 280
      );
      paintMetricCanvas(canvas, {
        width,
        height: 120,
        series,
        emptyText: "No samples yet",
        fill: !isCompare,
        stack: isCompare && !!p.instance.stack,
        integrate: isCompare && !!p.instance.integrate,
        normalize: isCompare && !!p.instance.normalize
      });
      const leg = legendRef.current;
      if (leg && hist.kind === "history") {
        const meta = getPlayerMeta();
        const enabled = p.instance.seriesEnabled || {};
        const keys = hist.seriesKeys;
        const existing = leg.querySelectorAll("[data-id]");
        if (existing.length !== keys.length) {
          leg.innerHTML = "";
          for (let i = 0; i < keys.length; i++) {
            const id = keys[i];
            const on = enabled[id] !== false;
            const last = hist.points.length > 0 ? hist.points[hist.points.length - 1].values[id] || 0 : 0;
            const lab = document.createElement("label");
            lab.className = "leg-item" + (on ? " on" : "");
            lab.setAttribute("data-id", id);
            lab.style.cssText = "display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0;font-size:11px;color:#c5d0e0;cursor:pointer";
            lab.innerHTML = `<input type="checkbox" ${on ? "checked" : ""}/>
            <span style="width:8px;height:8px;background:${classColors[((_a = meta[id]) == null ? void 0 : _a.ctype) || ""] || "#888"}"></span>
            <span>${((_b = meta[id]) == null ? void 0 : _b.name) || id}</span>
            <b class="leg-rate" style="font-variant-numeric:tabular-nums">${fmtRate(last)}</b>`;
            const input = lab.querySelector("input");
            input.onchange = () => {
              const next = {
                ...propsRef.current.instance.seriesEnabled || {}
              };
              next[id] = input.checked;
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
            const el = existing[i];
            const id = el.getAttribute("data-id") || "";
            const last = hist.points.length > 0 ? hist.points[hist.points.length - 1].values[id] || 0 : 0;
            const rateEl = el.querySelector(".leg-rate");
            if (rateEl) rateEl.textContent = fmtRate(last);
          }
        }
      }
      if (metaRef.current && !isCompare) {
        const n = series.length;
        metaRef.current.textContent = `${n} \xB7 ${rtMetric.toUpperCase()} \xB7 ${rtWindow}s`;
      }
    }, [isCompare, rtMetric, rtWindow]);
    React.useEffect(() => {
      paintLive();
      if (isCompare) return;
      return subscribeMeterTick(() => {
        if (propsRef.current.instance.rtPaused) return;
        if (propsRef.current.segmentRef !== "current") return;
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
      props.partyFocus
    ]);
    React.useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.onmousemove = (ev) => {
        const hist = runMeterQuery(
          { kind: "history" },
          {
            segmentRef: propsRef.current.segmentRef,
            partyFocus: propsRef.current.partyFocus
          }
        );
        if (hist.kind !== "history" || hist.points.length < 2) return;
        const rect = canvas.getBoundingClientRect();
        const x = ev.clientX - rect.left;
        const idx = Math.max(
          0,
          Math.min(
            hist.points.length - 1,
            Math.round(x / rect.width * (hist.points.length - 1))
          )
        );
        const pt = hist.points[idx];
        const meta = getPlayerMeta();
        const rows = hist.seriesKeys.map((id) => {
          var _a, _b;
          return {
            id,
            name: ((_a = meta[id]) == null ? void 0 : _a.name) || id,
            color: classColors[((_b = meta[id]) == null ? void 0 : _b.ctype) || ""] || "#888",
            value: pt.values[id] || 0
          };
        }).filter((r) => r.value > 0).sort((a, b) => b.value - a.value).slice(0, 8);
        const html = `<h4>Sample ${idx + 1}</h4><ul>` + rows.map(
          (s) => `<li><span style="color:${s.color}">${s.name}</span><b>${fmtRate(s.value)}/s</b></li>`
        ).join("") + `</ul>`;
        showMeterTooltip(ev, html);
      };
      canvas.onmouseleave = () => hideMeterTooltip();
      return () => {
        canvas.onmousemove = null;
        canvas.onmouseleave = null;
      };
    }, []);
    const tab = (label, active, onClick) => e(
      "button",
      {
        type: "button",
        className: "ecu-meter-tab" + (active ? " active" : ""),
        onClick
      },
      label
    );
    return e(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 4,
          padding: 4
        }
      },
      isCompare ? e(
        "div",
        { style: { display: "flex", gap: 4, flexWrap: "wrap" } },
        toggleBtn(
          "Stack",
          !!props.instance.stack,
          () => props.onPatch({ stack: !props.instance.stack })
        ),
        toggleBtn(
          "Integrate",
          !!props.instance.integrate,
          () => props.onPatch({ integrate: !props.instance.integrate })
        ),
        toggleBtn(
          "Normalize",
          !!props.instance.normalize,
          () => props.onPatch({ normalize: !props.instance.normalize })
        )
      ) : e(
        "div",
        {
          style: {
            display: "flex",
            gap: 4,
            flexWrap: "wrap",
            alignItems: "center"
          }
        },
        tab(
          "DPS",
          rtMetric === "dps",
          () => props.onPatch({ rtMetric: "dps" })
        ),
        tab(
          "HPS",
          rtMetric === "hps",
          () => props.onPatch({ rtMetric: "hps" })
        ),
        tab(
          "Taken",
          rtMetric === "taken",
          () => props.onPatch({ rtMetric: "taken" })
        ),
        tab("15s", rtWindow === 15, () => props.onPatch({ rtWindow: 15 })),
        tab("30s", rtWindow === 30, () => props.onPatch({ rtWindow: 30 })),
        tab("60s", rtWindow === 60, () => props.onPatch({ rtWindow: 60 })),
        tab(
          rtPaused ? "\u25B6" : "\u23F8",
          false,
          () => props.onPatch({ rtPaused: !rtPaused })
        ),
        e(
          "span",
          {
            ref: metaRef,
            style: { color: "#8b9bb4", fontSize: 11, marginLeft: 4 }
          },
          `\xB7 ${rtMetric.toUpperCase()} \xB7 ${rtWindow}s`
        )
      ),
      e(
        "div",
        { ref: wrapRef, style: { width: "100%" } },
        e("canvas", {
          ref: canvasRef,
          style: {
            display: "block",
            width: "100%",
            height: 120,
            border: "1px solid #333",
            background: "#111"
          }
        })
      ),
      e("div", { ref: legendRef, "data-leg": "1" })
    );
  }
  function toggleBtn(label, on, onClick) {
    return e(
      "button",
      {
        type: "button",
        className: "ecu-meter-tab" + (on ? " active" : ""),
        onClick
      },
      label
    );
  }
  function MeterPieView(props) {
    const React = getReact();
    const ref = React.useRef(null);
    React.useEffect(() => {
      const canvas = ref.current;
      if (!canvas || props.result.kind !== "pie") return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const w = 160;
      const h = 160;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const slices = props.result.slices;
      let sum = 0;
      for (let i = 0; i < slices.length; i++) sum += slices[i].value;
      if (!(sum > 0)) {
        ctx.fillStyle = "#888";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Empty", w / 2, h / 2);
        return;
      }
      let angle = -Math.PI / 2;
      for (let i = 0; i < slices.length; i++) {
        const slice = slices[i];
        const frac = slice.value / sum;
        const next = angle + frac * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(w / 2, h / 2);
        ctx.arc(w / 2, h / 2, 60, angle, next);
        ctx.closePath();
        ctx.fillStyle = slice.color || "#666";
        ctx.fill();
        angle = next;
      }
    }, [props.result]);
    if (props.result.kind !== "pie") {
      return e("div", { style: { padding: "8px", color: "#888" } }, "No pie");
    }
    return e(
      "div",
      { style: { display: "flex", gap: "8px", alignItems: "center" } },
      e("canvas", { ref }),
      e(
        "div",
        {
          style: {
            fontSize: TYPE.body,
            ...PIXEL_TEXT,
            maxHeight: "140px",
            overflow: "auto"
          }
        },
        ...props.result.slices.map(
          (s) => e(
            "div",
            { key: s.id, style: { color: s.color || "#ccc" } },
            `${s.name} ${Math.round(s.value)}`
          )
        )
      )
    );
  }

  // src/ui/meter/views/MeterTableView.ts
  function MeterTableView(props) {
    if (props.result.kind === "summary") {
      const rows = props.result.matrix;
      return e(
        "table",
        {
          style: {
            width: "100%",
            borderCollapse: "collapse",
            fontSize: TYPE.body,
            ...PIXEL_TEXT
          }
        },
        e(
          "thead",
          null,
          e(
            "tr",
            null,
            e("th", { style: th }, "Name"),
            e("th", { style: th }, "Dmg"),
            e("th", { style: th }, "Heal"),
            e("th", { style: th }, "Taken")
          )
        ),
        e(
          "tbody",
          null,
          ...rows.map(
            (r) => e(
              "tr",
              { key: r.id },
              e("td", { style: td }, r.name),
              e("td", { style: td }, String(Math.round(r.damage))),
              e("td", { style: td }, String(Math.round(r.heal))),
              e("td", { style: td }, String(Math.round(r.taken)))
            )
          )
        )
      );
    }
    if (props.result.kind !== "ranked") {
      return e("div", { style: empty }, "No table data");
    }
    return e(
      "table",
      {
        style: {
          width: "100%",
          borderCollapse: "collapse",
          fontSize: TYPE.body,
          ...PIXEL_TEXT
        }
      },
      e(
        "thead",
        null,
        e(
          "tr",
          null,
          e("th", { style: th }, "#"),
          e("th", { style: th }, "Name"),
          e("th", { style: th }, "Value")
        )
      ),
      e(
        "tbody",
        null,
        ...props.result.rows.map(
          (r, i) => e(
            "tr",
            { key: r.id },
            e("td", { style: td }, String(i + 1)),
            e("td", { style: td }, r.name),
            e("td", { style: td }, r.label)
          )
        )
      )
    );
  }
  var th = {
    textAlign: "left",
    padding: "2px 6px",
    borderBottom: "1px solid #444",
    color: "#aaa"
  };
  var td = {
    padding: "2px 6px",
    borderBottom: "1px solid #333"
  };
  var empty = {
    padding: "8px",
    color: "#888",
    fontSize: TYPE.body,
    ...PIXEL_TEXT
  };

  // src/ui/meter/MeterShellBody.ts
  function renderMeterShellBody(props) {
    const {
      pres,
      result,
      selectedset,
      instance,
      entities,
      highlightId,
      activeQuery,
      barsProps,
      onPatchInstance,
      patchInspectorAbility,
      onFocusInspector
    } = props;
    if (pres === "details" || result.kind === "details") {
      let det = result;
      if (result.kind === "empty" || result.kind === "details" && !result.actorId) {
        return e(
          "div",
          null,
          e(
            "div",
            {
              style: {
                padding: "4px 8px",
                color: "#888",
                fontSize: "11px",
                ...PIXEL_TEXT
              }
            },
            "Click a player on Damage / Encounter, or pick below"
          ),
          e(MeterBarsView, {
            query: { kind: "players", metric: "damage" },
            segmentRef: selectedset,
            partyFocus: instance.partyFocus,
            entities,
            highlightId,
            live: false,
            onRowClick: (row2) => {
              onPatchInstance({
                query: { kind: "details", actorId: row2.id },
                label: `Inspector \xB7 ${row2.name}`
              });
            }
          })
        );
      }
      const selectedAbility = instance.query.kind === "details" ? instance.query.ability || null : null;
      return e(MeterDetailsView, {
        result: det,
        segmentRef: selectedset,
        partyFocus: instance.partyFocus,
        selectedAbility,
        onSelectAbility: (ability) => patchInspectorAbility(ability)
      });
    }
    if (pres === "death_log" || result.kind === "death_log") {
      return e(MeterDeathView, { result });
    }
    if (pres === "encounter" || result.kind === "encounter") {
      return e(MeterEncounterView, {
        result,
        segmentRef: selectedset,
        partyFocus: instance.partyFocus,
        onOpenPlayer: (id, name) => {
          if (onFocusInspector) onFocusInspector(id, name);
          else {
            onPatchInstance({
              query: { kind: "details", actorId: id },
              presentation: "details",
              label: `Inspector \xB7 ${name}`
            });
          }
        }
      });
    }
    if (pres === "timeline" || result.kind === "timeline") {
      return e(MeterTimelineView, { result, segmentRef: selectedset });
    }
    if (pres === "realtime" || pres === "compare" || pres === "series") {
      const hist = result.kind === "history" ? result : runMeterQuery(
        { kind: "history" },
        {
          segmentRef: selectedset,
          partyFocus: instance.partyFocus
        }
      );
      return e(MeterSeriesView, {
        result: hist,
        instance,
        segmentRef: selectedset,
        partyFocus: instance.partyFocus,
        onPatch: onPatchInstance
      });
    }
    if (pres === "line" || result.kind === "history") {
      const hist = result.kind === "history" ? result : runMeterQuery(
        { kind: "history" },
        {
          segmentRef: selectedset,
          partyFocus: instance.partyFocus
        }
      );
      return e(MeterHistoryChart, { result: hist, height: 120 });
    }
    if (pres === "pie" || result.kind === "pie") {
      const metric = metricFromModeQuery(rootQuery(instance));
      const pieMetric = metric === "heal" || metric === "healing_required" ? "heal" : metric === "taken" ? "taken" : "damage";
      const pie = result.kind === "pie" ? result : runMeterQuery(
        { kind: "pie", metric: pieMetric },
        {
          segmentRef: selectedset,
          partyFocus: instance.partyFocus
        }
      );
      return e(MeterPieView, { result: pie });
    }
    if (pres === "table") {
      if (result.kind === "summary" || result.kind === "ranked") {
        return e(MeterTableView, { result });
      }
      const ranked = runMeterQuery(rootQuery(instance), {
        segmentRef: selectedset,
        partyFocus: instance.partyFocus,
        entities
      });
      return e(MeterTableView, { result: ranked });
    }
    if (result.kind === "summary") {
      return e(MeterTableView, { result });
    }
    if (result.kind === "ranked" || activeQuery.kind === "players" || activeQuery.kind === "abilities" || activeQuery.kind === "ability_targets" || activeQuery.kind === "targets" || activeQuery.kind === "channel" || activeQuery.kind === "snapshot" || activeQuery.kind === "rolling" || activeQuery.kind === "realtime" || activeQuery.kind === "avoidance") {
      return e(MeterBarsView, barsProps);
    }
    if (result.kind === "empty") {
      return e(
        "div",
        {
          style: {
            padding: "8px",
            color: "#888",
            fontSize: TYPE.body,
            ...PIXEL_TEXT
          }
        },
        props.layoutEdit ? "No contributors yet" : "No data"
      );
    }
    return e(MeterTableView, { result });
  }

  // src/ui/meter/meterShellTipItems.ts
  function meterShellTipItems(ctx) {
    const {
      tip,
      partyMenuOpts,
      partyFocus,
      hasObserver,
      instance,
      onPatchInstance,
      closeTip,
      resolved,
      isCurrentSeg,
      titleSeg,
      durSec,
      partyLabel: partyLabel2,
      selectedset,
      applySegment,
      past: past2,
      actorPickerRows,
      setInspectorActor,
      onOpenReport,
      copyReport,
      openReportDialog,
      setOptionsOpen,
      watchedName,
      metersHidden,
      onToggleMetersHidden,
      onFocusInspector,
      onDuplicate,
      onClose,
      closedInstances,
      onReopenClosed
    } = ctx;
    if (!tip) return [];
    if (tip.kind === "party") {
      const items = partyMenuOpts.map((opt) => {
        const eff = effectivePartyFocus(partyFocus, hasObserver);
        const selected = partyFocus === opt.id || eff === opt.id;
        return {
          label: opt.label,
          selected,
          onSelect: () => {
            onPatchInstance({ partyFocus: opt.id });
            closeTip();
          }
        };
      });
      const alwaysOn = instance.alwaysShowSelf != null ? instance.alwaysShowSelf : getSettings().meterAlwaysShowSelf !== false;
      items.push({
        label: "Always show me",
        selected: alwaysOn,
        onSelect: () => {
          onPatchInstance({ alwaysShowSelf: !alwaysOn });
          closeTip();
        }
      });
      return items;
    }
    if (tip.kind === "seg") {
      const items = [];
      if (resolved) {
        items.push({
          label: `${isCurrentSeg ? "Current" : titleSeg} \xB7 ${durSec.toFixed(0)}s \xB7 ${partyLabel2}`,
          muted: true,
          onSelect: () => closeTip()
        });
      }
      items.push(
        {
          label: "Current",
          selected: selectedset === "current",
          onSelect: () => {
            applySegment("current");
            closeTip();
          }
        },
        {
          label: "Overall",
          selected: selectedset === "total",
          onSelect: () => {
            applySegment("total");
            closeTip();
          }
        }
      );
      for (let i = 0; i < past2.length; i++) {
        const p = past2[i];
        const sel = typeof selectedset === "object" && selectedset && selectedset.pastId === p.id;
        items.push({
          label: p.label || p.id,
          selected: !!sel,
          className: segmentOutcomeClass(p.outcome),
          onSelect: () => {
            applySegment({ pastId: p.id });
            closeTip();
          }
        });
      }
      return items;
    }
    if (tip.kind === "display") {
      const curIdx = barModeIndex(rootQuery(instance));
      const curId = curIdx >= 0 ? BAR_MODE_CYCLE[curIdx].id : "";
      const items = [];
      for (let g = 0; g < DISPLAY_TREE.length; g++) {
        const group = DISPLAY_TREE[g];
        for (let c = 0; c < group.children.length; c++) {
          const d = group.children[c];
          items.push({
            label: `${group.label} \u203A ${d.label}`,
            selected: d.id === curId,
            onSelect: () => {
              onPatchInstance({
                query: { ...d.query },
                label: d.label,
                presentation: "bars"
              });
              closeTip();
            }
          });
        }
      }
      return items;
    }
    if (tip.kind === "allDisplays") {
      return [];
    }
    if (tip.kind === "reset") {
      return [
        {
          label: "Reset Current fight",
          onSelect: () => {
            resetCurrentMeterSegment();
            onPatchInstance({ selectedset: "current" });
            closeTip();
          }
        },
        {
          label: "Reset Overall",
          onSelect: () => {
            resetOverallMeterSegments();
            closeTip();
          }
        },
        {
          label: "Reset All \u2192 Current",
          onSelect: () => {
            resetAllMeters();
            onPatchInstance({ selectedset: "current" });
            closeTip();
          }
        },
        {
          label: metersHidden ? "Show all meters" : "Hide all meters",
          onSelect: () => {
            if (onToggleMetersHidden) onToggleMetersHidden();
            else patchSettings({ metersHidden: !getSettings().metersHidden });
            closeTip();
          }
        }
      ];
    }
    if (tip.kind === "actor") {
      if (!actorPickerRows.length) {
        return [
          {
            label: "(no players in segment)",
            muted: true,
            onSelect: () => closeTip()
          }
        ];
      }
      return actorPickerRows.map((r) => ({
        label: r.name,
        onSelect: () => setInspectorActor(r.id, r.name)
      }));
    }
    if (tip.kind === "tools") {
      return REPORT_TABS.map((tab) => ({
        label: tab.label,
        onSelect: () => {
          if (onOpenReport) onOpenReport(tab.kind);
          closeTip();
        }
      }));
    }
    if (tip.kind === "report") {
      const items = [];
      const recent = getSettings().meterRecentReports || [];
      for (let i = 0; i < Math.min(3, recent.length); i++) {
        const r = recent[i];
        items.push({
          label: `Recent: ${r.label}`,
          onSelect: () => {
            var _a;
            if ((_a = navigator.clipboard) == null ? void 0 : _a.writeText) {
              void navigator.clipboard.writeText(r.text);
            }
            closeTip();
          }
        });
      }
      items.push({
        label: "Copy report",
        onSelect: () => {
          copyReport();
          closeTip();
        }
      });
      items.push({
        label: "Open report dialog\u2026",
        onSelect: () => {
          openReportDialog();
        }
      });
      return items;
    }
    if (tip.kind === "gear") {
      const items = [
        {
          label: "Standard (Visible party)",
          onSelect: () => {
            onPatchInstance({ partyFocus: "visible" });
            closeTip();
          }
        },
        {
          label: "Everything (All players)",
          onSelect: () => {
            onPatchInstance({ partyFocus: "all" });
            closeTip();
          }
        },
        { label: "\u2014", muted: true, onSelect: () => {
        } },
        {
          label: "Plugins \u2014 Encounter / Deaths / Timeline",
          onSelect: () => {
            closeTip();
            onOpenReport == null ? void 0 : onOpenReport("encounter");
          }
        },
        { label: "\u2014", muted: true, onSelect: () => {
        } },
        {
          label: "Options panel\u2026",
          onSelect: () => {
            closeTip();
            setOptionsOpen(true);
          }
        },
        {
          label: "Spell List\u2026",
          muted: true,
          onSelect: () => {
            closeTip();
            onFocusInspector == null ? void 0 : onFocusInspector(getYouId() || "", watchedName || "You");
          }
        },
        {
          label: "Statistics\u2026",
          onSelect: () => {
            closeTip();
            openReportDialog();
          }
        },
        { label: "\u2014", muted: true, onSelect: () => {
        } },
        {
          label: onDuplicate ? "Window Control \u2014 Create new" : "Create new window (layout edit)",
          onSelect: () => {
            closeTip();
            if (onDuplicate) onDuplicate();
          }
        }
      ];
      if (onClose) {
        items.push({
          label: "Window Control \u2014 Close window",
          onSelect: () => {
            closeTip();
            onClose();
          }
        });
      }
      const closed = closedInstances || [];
      for (let ci = 0; ci < closed.length; ci++) {
        const c = closed[ci];
        items.push({
          label: `Reopen: ${c.label || c.id}`,
          onSelect: () => {
            closeTip();
            onReopenClosed == null ? void 0 : onReopenClosed(c.id);
          }
        });
      }
      if (supportsViewModes(rootQuery(instance))) {
        items.push({ label: "\u2014", muted: true, onSelect: () => {
        } });
        items.push({
          label: "View mode",
          muted: true,
          onSelect: () => closeTip()
        });
        for (let vi = 0; vi < VIEW_MODES.length; vi++) {
          const vm = VIEW_MODES[vi];
          items.push({
            label: vm.label,
            selected: presentationFor(instance) === vm.id,
            onSelect: () => {
              onPatchInstance(applyViewMode(vm.id));
              closeTip();
            }
          });
        }
      }
      items.push({
        label: onToggleMetersHidden ? metersHidden ? "Show all meters" : "Hide all meters" : "Hide all meters",
        onSelect: () => {
          closeTip();
          onToggleMetersHidden == null ? void 0 : onToggleMetersHidden();
        }
      });
      return items;
    }
    return [];
  }

  // src/ui/meter/meterShellCooltip.ts
  function renderMeterShellCooltip(ctx) {
    var _a;
    const {
      tip,
      bmDrag,
      setBmDrag,
      bmDrop,
      setBmDrop,
      finishBookmarkDrag,
      applyBookmark,
      closeTip,
      instance,
      openTip,
      clearTipClose,
      scheduleTipClose,
      setOptionsOpen,
      saveBookmarkAtSlot,
      onPatchInstance,
      tipItems
    } = ctx;
    if (!tip) return null;
    if (tip.kind === "bookmarks") {
      const bookmarks = getSettings().meterBookmarks || [];
      const slots = [];
      const slotCount = Math.max(6, bookmarks.length + 1);
      for (let i = 0; i < slotCount; i++) {
        const bm = bookmarks[i];
        const slotClass = "ecu-meter-bookmark-slot" + (bmDrag === i ? " is-dragging" : "") + (bmDrop === i && bmDrag != null && bmDrag !== i ? " is-drop-target" : "");
        if (bm) {
          slots.push(
            e(
              "button",
              {
                key: bm.id,
                type: "button",
                className: slotClass,
                title: "Drag to reorder \xB7 Left: apply \xB7 Right: replace with current display",
                onPointerDown: (ev) => {
                  ev.preventDefault();
                  setBmDrag(i);
                  setBmDrop(i);
                  try {
                    ev.currentTarget.setPointerCapture(
                      ev.pointerId
                    );
                  } catch (_e) {
                  }
                },
                onPointerEnter: () => {
                  if (bmDrag != null) setBmDrop(i);
                },
                onPointerUp: () => finishBookmarkDrag(),
                onPointerCancel: () => finishBookmarkDrag(),
                onClick: (ev) => {
                  if (bmDrag != null) return;
                  ev.preventDefault();
                  applyBookmark(bm);
                  closeTip();
                },
                onContextMenu: (ev) => {
                  ev.preventDefault();
                  const next = (getSettings().meterBookmarks || []).slice();
                  next[i] = {
                    id: bm.id,
                    label: modeLabel(rootQuery(instance), instance.label),
                    query: { ...rootQuery(instance) },
                    presentation: presentationFor(instance),
                    partyFocus: instance.partyFocus,
                    selectedset: instance.selectedset
                  };
                  patchSettings({ meterBookmarks: next });
                  closeTip();
                }
              },
              bm.label
            )
          );
        } else {
          slots.push(
            e(
              "button",
              {
                key: `empty-${i}`,
                type: "button",
                className: slotClass + " is-empty",
                onPointerEnter: () => {
                  if (bmDrag != null) setBmDrop(i);
                },
                onPointerUp: () => finishBookmarkDrag(),
                onClick: (ev) => {
                  if (bmDrag != null) return;
                  ev.preventDefault();
                  openTip("bookmarkPick", ev.currentTarget, {
                    pin: true,
                    bookmarkSlot: i
                  });
                }
              },
              "Select Display"
            )
          );
        }
      }
      return e(
        "div",
        {
          className: "ecu-meter-bookmark-overlay",
          style: {
            ...cooltipStyle(tip.anchor, { cover: true }),
            ...PIXEL_TEXT
          },
          onMouseEnter: () => clearTipClose(),
          onMouseLeave: () => scheduleTipClose(),
          onContextMenu: (ev) => {
            ev.preventDefault();
            closeTip();
          }
        },
        e(
          "div",
          { className: "ecu-meter-bookmark-hd" },
          e("span", { className: "ecu-meter-bookmark-hd-title" }, "Bookmark"),
          e(
            "button",
            {
              type: "button",
              className: "ecu-meter-bookmark-hd-btn",
              title: "Options",
              onClick: (ev) => {
                ev.stopPropagation();
                setOptionsOpen(true);
                closeTip();
              }
            },
            "\u2699"
          ),
          e(
            "button",
            {
              type: "button",
              className: "ecu-meter-bookmark-hd-btn",
              title: "Close",
              onClick: (ev) => {
                ev.stopPropagation();
                closeTip();
              }
            },
            "\xD7"
          )
        ),
        e(
          "div",
          { className: "ecu-meter-bookmark-hint" },
          "Drag slots to reorder"
        ),
        e("div", { className: "ecu-meter-bookmark-grid" }, ...slots),
        e(
          "button",
          {
            type: "button",
            className: "ecu-meter-cooltip-item",
            onClick: () => closeTip()
          },
          "Close"
        )
      );
    }
    if (tip.kind === "bookmarkPick") {
      const slotIndex = (_a = tip.bookmarkSlot) != null ? _a : 0;
      const cells = [];
      for (let g = 0; g < DISPLAY_TREE.length; g++) {
        const group = DISPLAY_TREE[g];
        cells.push(
          e(
            "div",
            { key: `bp-sec-${group.id}`, className: "ecu-meter-switch-sec" },
            group.label
          )
        );
        for (let c = 0; c < group.children.length; c++) {
          const d = group.children[c];
          cells.push(
            e(
              "button",
              {
                key: d.id,
                type: "button",
                className: "ecu-meter-switch-cell",
                onMouseDown: (ev) => {
                  ev.preventDefault();
                  ev.stopPropagation();
                  saveBookmarkAtSlot(slotIndex, d);
                  closeTip();
                }
              },
              d.label
            )
          );
        }
      }
      return e(
        "div",
        {
          className: "ecu-meter-switch-overlay",
          style: {
            ...cooltipStyle(tip.anchor, { minWidth: 280, preferRight: true }),
            ...PIXEL_TEXT
          },
          onMouseEnter: () => clearTipClose(),
          onMouseLeave: () => scheduleTipClose()
        },
        e("div", { className: "ecu-meter-cooltip-sec" }, "Select Display"),
        e("div", { className: "ecu-meter-switch-grid" }, ...cells)
      );
    }
    if (tip.kind === "allDisplays") {
      const curIdx = barModeIndex(rootQuery(instance));
      const curId = curIdx >= 0 ? BAR_MODE_CYCLE[curIdx].id : "";
      const cells = [];
      for (let g = 0; g < DISPLAY_TREE.length; g++) {
        const group = DISPLAY_TREE[g];
        cells.push(
          e(
            "div",
            {
              key: `sec-${group.id}`,
              className: "ecu-meter-switch-sec"
            },
            group.label
          )
        );
        for (let c = 0; c < group.children.length; c++) {
          const d = group.children[c];
          cells.push(
            e(
              "button",
              {
                key: d.id,
                type: "button",
                className: "ecu-meter-switch-cell" + (d.id === curId ? " is-selected" : ""),
                onMouseDown: (ev) => {
                  ev.preventDefault();
                  ev.stopPropagation();
                  onPatchInstance({
                    query: { ...d.query },
                    label: d.label,
                    presentation: "bars"
                  });
                  closeTip();
                },
                onClick: (ev) => {
                  ev.preventDefault();
                  ev.stopPropagation();
                }
              },
              d.label
            )
          );
        }
      }
      return e(
        "div",
        {
          className: "ecu-meter-switch-overlay",
          style: {
            ...cooltipStyle(tip.anchor, { minWidth: 280, preferRight: true }),
            ...PIXEL_TEXT
          },
          onMouseEnter: () => clearTipClose(),
          onMouseLeave: () => scheduleTipClose()
        },
        e(
          "div",
          { className: "ecu-meter-cooltip-sec" },
          "Switch \xB7 All displays"
        ),
        e("div", { className: "ecu-meter-switch-grid" }, ...cells)
      );
    }
    if (tip.kind === "display") {
      const curIdx = barModeIndex(rootQuery(instance));
      const curId = curIdx >= 0 ? BAR_MODE_CYCLE[curIdx].id : "";
      const nodes2 = [];
      for (let g = 0; g < DISPLAY_TREE.length; g++) {
        const group = DISPLAY_TREE[g];
        if (g > 0) nodes2.push(e("div", { className: "ecu-meter-cooltip-div" }));
        nodes2.push(
          e("div", { className: "ecu-meter-cooltip-sec" }, group.label)
        );
        for (let c = 0; c < group.children.length; c++) {
          const d = group.children[c];
          nodes2.push(
            cooltipItemNode({
              label: d.label,
              selected: d.id === curId,
              onSelect: () => {
                onPatchInstance({
                  query: { ...d.query },
                  label: d.label,
                  presentation: "bars"
                });
                closeTip();
              }
            })
          );
        }
      }
      return e(
        "div",
        {
          className: "ecu-meter-cooltip",
          style: {
            ...cooltipStyle(tip.anchor, { minWidth: 168 }),
            ...PIXEL_TEXT
          },
          onMouseEnter: () => clearTipClose(),
          onMouseLeave: () => scheduleTipClose()
        },
        ...nodes2
      );
    }
    const items = tipItems();
    const nodes = [];
    let startIdx = 0;
    if (tip.kind === "seg" && items.length > 0 && items[0].muted && items[0].label.includes("\xB7")) {
      nodes.push(
        e("div", { className: "ecu-meter-cooltip-sec" }, items[0].label)
      );
      nodes.push(e("div", { className: "ecu-meter-cooltip-div" }));
      startIdx = 1;
    }
    for (let i = startIdx; i < items.length; i++) {
      const it = items[i];
      if (tip.kind === "report" && it.label.startsWith("Recent: ") && (i === 0 || !items[i - 1].label.startsWith("Recent: "))) {
        nodes.push(e("div", { className: "ecu-meter-cooltip-sec" }, "Recent"));
      }
      if (tip.kind === "report" && it.label === "Copy report" && (i === 0 || !items[i - 1].label.startsWith("Recent: "))) {
        nodes.push(e("div", { className: "ecu-meter-cooltip-div" }));
      }
      nodes.push(
        cooltipItemNode({
          ...it,
          label: it.label.startsWith("Recent: ") ? it.label.slice(8) : it.label
        })
      );
    }
    return e(
      "div",
      {
        className: "ecu-meter-cooltip",
        style: {
          ...cooltipStyle(tip.anchor, {
            minWidth: tip.kind === "report" || tip.kind === "reset" ? 188 : 168
          }),
          ...PIXEL_TEXT
        },
        onMouseEnter: () => clearTipClose(),
        onMouseLeave: () => scheduleTipClose()
      },
      ...nodes
    );
  }

  // src/ui/meter/meterShellTitlebar.ts
  function renderMeterShellTitlebar(ctx) {
    const {
      arrange,
      titlebarDragRef,
      isInspector,
      isReport,
      result,
      title,
      titleMode,
      resolved,
      isCurrentSeg,
      titleSeg,
      durSec,
      partyLabel: partyLabel2,
      instance,
      tip,
      optionsOpen,
      openTip,
      scheduleTipClose,
      cycleable,
      selectedset,
      past: past2,
      applySegment,
      reportOpen,
      openReportDialog,
      onOpenReport,
      cycle,
      onPatchInstance,
      locked,
      layoutEdit,
      onUngroup,
      onToggleLock,
      onConfigure,
      onDuplicate,
      onClose
    } = ctx;
    const titleChildren = [];
    if (isInspector && result.kind === "details" && result.actorId) {
      const ctype = result.ctype || "";
      titleChildren.push(
        e("span", {
          className: "ecu-meter-inspector-class",
          style: { background: classColors[ctype] || "#607d8b" },
          title: ctype || "class"
        })
      );
      const sec = Math.max(result.durationMs / 1e3, 1);
      titleChildren.push(
        e("span", { className: "ecu-meter-ttl-text" }, title),
        e(
          "span",
          { className: "ecu-meter-inspector-sub" },
          `${formatCompactRatePerSec(result.totals.damage / sec)} \xB7 ${sec.toFixed(0)}s`
        )
      );
    } else if (isReport) {
      titleChildren.push(
        e("span", { className: "ecu-meter-report-mark", title: "Report" }, "\u229E"),
        e("span", { className: "ecu-meter-ttl-text" }, title),
        resolved ? e(
          "span",
          { className: "ecu-meter-inspector-sub" },
          `${isCurrentSeg ? "Current" : titleSeg} \xB7 ${durSec.toFixed(0)}s \xB7 ${partyLabel2}`
        ) : null
      );
    } else {
      if (!isInspector) {
        titleChildren.push(
          e("span", {
            className: "ecu-meter-attr-ball " + attrBallClass(rootQuery(instance)),
            title: titleMode
          })
        );
      }
      titleChildren.push(e("span", { className: "ecu-meter-ttl-text" }, title));
    }
    return e(
      "div",
      {
        className: "ecu-meter-titlebar" + (arrange ? " is-draggable" : ""),
        style: { ...PIXEL_TEXT },
        ref: titlebarDragRef || void 0
      },
      !isInspector ? e(
        "div",
        { className: "ecu-meter-tools-left" },
        toolBtn({
          title: "Settings \u2014 options, window control",
          glyph: "\u2699",
          tourId: "meter-gear",
          active: (tip == null ? void 0 : tip.kind) === "gear" || optionsOpen,
          onEnter: (el) => openTip("gear", el),
          onLeave: scheduleTipClose,
          onClick: (ev) => openTip("gear", ev.currentTarget, {
            pin: true
          })
        }),
        toolBtn({
          title: "Mode / Scope \u2014 who appears",
          icon: "mode",
          tourId: "meter-mode",
          active: (tip == null ? void 0 : tip.kind) === "party",
          onEnter: (el) => openTip("party", el),
          onLeave: scheduleTipClose,
          onClick: (ev) => openTip("party", ev.currentTarget, {
            pin: true
          })
        }),
        toolBtn({
          title: "Segment \u2014 L click older \xB7 R click newer \xB7 hover menu",
          icon: "segment",
          tourId: "meter-segment",
          active: (tip == null ? void 0 : tip.kind) === "seg",
          onEnter: (el) => openTip("seg", el),
          onLeave: scheduleTipClose,
          onClick: (ev) => {
            const next = cycleSegmentRef(selectedset, past2, 1);
            applySegment(next);
            openTip("seg", ev.currentTarget, { pin: true });
          },
          onContextMenu: (ev) => {
            const next = cycleSegmentRef(selectedset, past2, -1);
            applySegment(next);
            openTip("seg", ev.currentTarget, { pin: true });
          }
        }),
        !isReport && cycleable ? toolBtn({
          title: "Attribute / Display \u2014 hover menu",
          icon: "attribute",
          tourId: "meter-display",
          active: (tip == null ? void 0 : tip.kind) === "display" || (tip == null ? void 0 : tip.kind) === "allDisplays",
          onEnter: (el) => openTip("display", el),
          onLeave: scheduleTipClose,
          onClick: (ev) => openTip("display", ev.currentTarget, {
            pin: true
          }),
          onContextMenu: (ev) => {
            openTip("allDisplays", ev.currentTarget, {
              pin: true
            });
          }
        }) : null,
        !isReport ? toolBtn({
          title: "Report \u2014 click opens dialog \xB7 hover for copy",
          icon: "report",
          tourId: "meter-report",
          active: (tip == null ? void 0 : tip.kind) === "report" || reportOpen,
          onEnter: (el) => openTip("report", el),
          onLeave: scheduleTipClose,
          onClick: () => {
            openReportDialog();
          }
        }) : null,
        !isReport && onOpenReport ? toolBtn({
          title: "Tools \u2014 Encounter \xB7 Deaths \xB7 Timeline",
          glyph: "\u229E",
          tourId: "meter-tools",
          active: (tip == null ? void 0 : tip.kind) === "tools",
          onEnter: (el) => openTip("tools", el),
          onLeave: scheduleTipClose,
          onClick: (ev) => openTip("tools", ev.currentTarget, {
            pin: true
          })
        }) : null,
        toolBtn({
          title: "Reset \u2014 hover menu \xB7 click opens menu",
          icon: "reset",
          tourId: "meter-reset",
          active: (tip == null ? void 0 : tip.kind) === "reset",
          onEnter: (el) => openTip("reset", el),
          onLeave: scheduleTipClose,
          onClick: (ev) => openTip("reset", ev.currentTarget, {
            pin: true
          })
        })
      ) : null,
      e(
        "button",
        {
          type: "button",
          className: "ecu-meter-ttl",
          style: { ...PIXEL_TEXT },
          onPointerDown: (ev) => {
            ev.stopPropagation();
          },
          onClick: (ev) => {
            if (isInspector) {
              openTip("actor", ev.currentTarget, { pin: true });
              return;
            }
            if (isReport) {
              openTip("seg", ev.currentTarget, { pin: true });
              return;
            }
            if (cycleable) {
              cycle(1);
              return;
            }
            openTip("seg", ev.currentTarget, { pin: true });
          },
          onContextMenu: (ev) => {
            ev.preventDefault();
            if (isInspector) {
              openTip("actor", ev.currentTarget, { pin: true });
              return;
            }
            if (isReport) {
              openTip("party", ev.currentTarget, { pin: true });
              return;
            }
            openTip("allDisplays", ev.currentTarget, {
              pin: true
            });
          },
          onWheel: (ev) => {
            if (!cycleable || isInspector || isReport) return;
            ev.preventDefault();
            ev.stopPropagation();
            cycle(ev.deltaY > 0 ? 1 : -1);
          },
          title: void 0,
          "aria-label": isInspector ? "Player \u2014 click to switch subject" : isReport ? "Report \u2014 click segment \xB7 right-click scope" : "Display \u2014 click cycle \xB7 wheel cycle \xB7 right-click all"
        },
        ...titleChildren
      ),
      e(
        "div",
        { className: "ecu-meter-actions" },
        isInspector ? toolBtn({
          title: "Player",
          glyph: "\u{1F464}",
          active: (tip == null ? void 0 : tip.kind) === "actor",
          onEnter: (el) => openTip("actor", el),
          onLeave: scheduleTipClose,
          onClick: (ev) => openTip("actor", ev.currentTarget, {
            pin: true
          })
        }) : null,
        e(
          "div",
          { className: "ecu-meter-chrome-hover" },
          onUngroup && meterHasSnap(instance) ? toolBtn({
            title: "Ungroup windows",
            glyph: "\u29C9",
            onClick: () => onUngroup()
          }) : null,
          !isInspector && !isReport ? toolBtn({
            title: (instance.frameH || METER_FRAME_DEFAULT.h) >= 340 ? "Unstretch window" : "Stretch window (taller)",
            glyph: "\u2195",
            onClick: () => {
              const h = instance.frameH || METER_FRAME_DEFAULT.h;
              onPatchInstance({
                frameH: h >= 340 ? METER_FRAME_DEFAULT.h : 360
              });
            }
          }) : null,
          onToggleLock ? toolBtn({
            title: locked ? "Unlock \u2014 drag titlebar to move (or hold Alt)" : "Lock this meter",
            glyph: locked ? "\u{1F512}" : "\u{1F513}",
            active: locked,
            onClick: () => onToggleLock()
          }) : null,
          onConfigure && layoutEdit ? toolBtn({
            title: "Add / configure meters",
            glyph: "\u2699",
            onClick: () => onConfigure()
          }) : null,
          onDuplicate && layoutEdit ? toolBtn({
            title: "Duplicate window",
            glyph: "+",
            onClick: () => onDuplicate()
          }) : null,
          layoutEdit && onClose ? chromeBtn(
            "Remove meter",
            "Rm",
            () => onClose(),
            false,
            true
          ) : null
        )
      )
    );
  }

  // src/ui/meter/MeterPanelShell.ts
  function MeterPanelShell(props) {
    var _a, _b;
    const React = getReact();
    const ReactDOM = getReactDOM();
    const {
      instance,
      highlightId,
      entities,
      watchedName,
      onPatchInstance,
      onFocusInspector,
      onOpenReport
    } = props;
    const arrange = !!props.arrange;
    const locked = props.locked === true;
    const [tick, setTick] = React.useState(0);
    const [tip, setTip] = React.useState(
      null
    );
    const [reportOpen, setReportOpen] = React.useState(false);
    const [optionsOpen, setOptionsOpen] = React.useState(false);
    const [interacting, setInteracting] = React.useState(false);
    const [stretchDrag, setStretchDrag] = React.useState(null);
    const tipCloseTimer = React.useRef(
      null
    );
    const tipPinnedRef = React.useRef(false);
    const shellRef = React.useRef(null);
    const patchInspectorAbility = (ability) => {
      const q = rootQuery(instance);
      if (q.kind !== "details") return;
      const next = { kind: "details", actorId: q.actorId };
      if (ability) next.ability = ability;
      onPatchInstance({ query: next });
    };
    const [bmDrag, setBmDrag] = React.useState(null);
    const [bmDrop, setBmDrop] = React.useState(null);
    const finishBookmarkDrag = () => {
      if (bmDrag != null && bmDrop != null && bmDrag !== bmDrop) {
        const bookmarks = (getSettings().meterBookmarks || []).slice();
        const moved = bookmarks[bmDrag];
        if (moved) {
          bookmarks.splice(bmDrag, 1);
          bookmarks.splice(bmDrop, 0, moved);
          patchSettings({ meterBookmarks: bookmarks });
        }
      }
      setBmDrag(null);
      setBmDrop(null);
    };
    const clearTipClose = () => {
      if (tipCloseTimer.current != null) {
        clearTimeout(tipCloseTimer.current);
        tipCloseTimer.current = null;
      }
    };
    const closeTip = () => {
      clearTipClose();
      tipPinnedRef.current = false;
      setTip(null);
    };
    const openTip = (kind, el, opts) => {
      clearTipClose();
      const pinned = !!(opts == null ? void 0 : opts.pin);
      if (pinned && props.onToolbarInteract) {
        const toolbarKinds = {
          gear: true,
          party: true,
          seg: true,
          display: true,
          allDisplays: true,
          report: true,
          tools: true,
          reset: true
        };
        if (toolbarKinds[kind]) props.onToolbarInteract();
      }
      tipPinnedRef.current = pinned;
      setInteracting(true);
      setTip({
        kind,
        anchor: rectToAnchor(el),
        pinned,
        bookmarkSlot: opts == null ? void 0 : opts.bookmarkSlot
      });
    };
    const openTipAnchor = (kind, anchor, opts) => {
      clearTipClose();
      const pinned = !!(opts == null ? void 0 : opts.pin);
      tipPinnedRef.current = pinned;
      setInteracting(true);
      setTip({ kind, anchor, pinned, bookmarkSlot: opts == null ? void 0 : opts.bookmarkSlot });
    };
    const scheduleTipClose = () => {
      if (tipPinnedRef.current) return;
      clearTipClose();
      tipCloseTimer.current = setTimeout(() => {
        tipPinnedRef.current = false;
        setTip(null);
        tipCloseTimer.current = null;
      }, COOLTIP_HIDE_MS);
    };
    React.useEffect(() => {
      if (!tip) return;
      const onDown = (ev) => {
        const el = ev.target;
        if (!el || typeof el.closest !== "function") return;
        if (el.closest(
          ".ecu-meter-cooltip, .ecu-meter-switch-overlay, .ecu-meter-bookmark-overlay, .ecu-meter-report-backdrop, .ecu-meter-tool, .ecu-meter-ttl"
        )) {
          return;
        }
        closeTip();
      };
      document.addEventListener("mousedown", onDown, true);
      return () => document.removeEventListener("mousedown", onDown, true);
    }, [tip]);
    React.useEffect(() => {
      injectMeterChromeCss();
      return subscribeMeterTick(() => setTick((n) => n + 1));
    }, []);
    React.useEffect(() => {
      closeTip();
    }, [instance.id]);
    const selectedset = instance.selectedset || "current";
    const activeQuery = rootQuery(instance);
    const result = runMeterQuery(activeQuery, {
      segmentRef: selectedset,
      partyFocus: instance.partyFocus,
      entities,
      now: Date.now()
    });
    void tick;
    const inCombat2 = isMeterInCombat();
    const presNow = presentationFor(instance);
    const isToolPanel = presNow === "details" || isReportPresentation(presNow);
    const idle = !isToolPanel && instance.fadeWhenIdle !== false && !inCombat2;
    const rootQ = rootQuery(instance);
    const titleMode = rootQ.kind === "players" || rootQ.kind === "avoidance" || rootQ.kind === "rolling" || rootQ.kind === "snapshot" ? modeLabel(rootQ) : modeLabel(rootQ, instance.label);
    const titleSeg = segmentTitle(selectedset);
    const isCurrentSeg = selectedset === "current";
    const openInspectorRow = (row2) => {
      if (onFocusInspector) {
        onFocusInspector(row2.id, row2.name);
        return;
      }
      if (presentationFor(instance) === "details") {
        onPatchInstance({
          query: { kind: "details", actorId: row2.id },
          label: `Inspector \xB7 ${row2.name}`
        });
      }
    };
    const onRowClick = (row2, ev) => {
      if ((ev == null ? void 0 : ev.button) != null && ev.button !== 0) return;
      const q = rootQuery(instance);
      const canInspect = q.kind === "players" || q.kind === "avoidance" || presentationFor(instance) === "encounter" || presentationFor(instance) === "details";
      if (!canInspect) return;
      openInspectorRow(row2);
    };
    const onRowContextMenu = (row2, ev) => {
      ev.preventDefault();
      onRowClick(row2);
    };
    const cycle = (delta) => {
      if (!canCycleBarMode(rootQuery(instance))) return;
      const next = cycleBarMode(rootQuery(instance), delta);
      onPatchInstance({
        query: next.query,
        label: next.label
      });
    };
    const past2 = listPastSegments();
    const resolved = resolveSegment(selectedset);
    const pres = presentationFor(instance);
    const barsProps = {
      query: activeQuery,
      segmentRef: selectedset,
      partyFocus: instance.partyFocus,
      entities,
      highlightId,
      live: selectedset === "current",
      frameH: instance.frameH,
      alwaysShowSelf: instance.alwaysShowSelf,
      onRowClick,
      onRowContextMenu
    };
    const body = renderMeterShellBody({
      pres,
      result,
      selectedset,
      instance,
      entities,
      highlightId,
      layoutEdit: props.layoutEdit,
      activeQuery,
      barsProps,
      onPatchInstance,
      patchInspectorAbility,
      onFocusInspector
    });
    const hasObserver = !!getYouId();
    const partyFocus = instance.partyFocus || "watched";
    const visibleParties = listVisibleParties();
    const partyLabels = {};
    for (let i = 0; i < visibleParties.length; i++) {
      partyLabels[visibleParties[i].id] = visibleParties[i].label;
    }
    const partyLabel2 = partyFocusLabel(
      partyFocus,
      watchedName,
      hasObserver,
      partyLabels
    );
    const partyMenuOpts = partyFocusMenuOptions({
      hasObserver,
      watchedName,
      watchedPartyKey: getWatchedPartyKey(),
      visibleParties
    });
    const actorPickerRows = (() => {
      if (!tip || tip.kind !== "actor") return [];
      const ranked = runMeterQuery(
        { kind: "players", metric: "damage" },
        {
          segmentRef: selectedset,
          partyFocus: instance.partyFocus,
          entities
        }
      );
      return ranked.kind === "ranked" ? ranked.rows : [];
    })();
    const setInspectorActor = (actorId, name) => {
      onPatchInstance({
        query: { kind: "details", actorId },
        presentation: "details",
        label: `Inspector \xB7 ${name}`
      });
      closeTip();
    };
    const clampFrame = (w, h) => ({
      frameW: Math.min(
        METER_FRAME_MAX.w,
        Math.max(METER_FRAME_MIN.w, Math.round(w))
      ),
      frameH: Math.min(
        METER_FRAME_MAX.h,
        Math.max(METER_FRAME_MIN.h, Math.round(h))
      )
    });
    const sizeFrame = (w, h, freeForm) => {
      if (freeForm || getLayoutFreePlacement()) {
        return clampFrame(w, h);
      }
      const root = layoutDragRoot().getBoundingClientRect();
      const snapped = snapFrameSizeToGrid(
        w,
        h,
        getLayoutGridStep(),
        root.width,
        root.height
      );
      return clampFrame(snapped.w, snapped.h);
    };
    const onResizePointerDown = (ev, corner = "br") => {
      ev.preventDefault();
      ev.stopPropagation();
      const startX = ev.clientX;
      const startY = ev.clientY;
      const startW = instance.frameW || METER_FRAME_DEFAULT.w;
      const startH = instance.frameH || METER_FRAME_DEFAULT.h;
      const target = ev.currentTarget;
      const shell = target.closest(".ecu-meter-shell");
      const outer = shell ? shell.closest(".comm-pos-panel") : null;
      if (shell) shell.classList.add("is-resizing");
      const pointerId = ev.pointerId;
      try {
        target.setPointerCapture(pointerId);
      } catch (e2) {
      }
      let pending = sizeFrame(startW, startH, !!ev.shiftKey);
      const shareH = !!instance.horizontalSnap || !!(instance.snap && (instance.snap[1] || instance.snap[3]));
      const shareW = !!instance.verticalSnap || !!(instance.snap && (instance.snap[2] || instance.snap[4]));
      const peerIds = props.resizeGroupIds || [];
      const syncOuter = (w, h) => {
        if (outer) {
          outer.style.width = w + "px";
          outer.style.height = h + "px";
        }
        for (let i = 0; i < peerIds.length; i++) {
          const pid = peerIds[i];
          const sel = typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(pid) : pid.replace(/([^a-zA-Z0-9_-])/g, "\\$1");
          const pel = document.querySelector(
            `.comm-pos-panel.comm-pos-${sel}`
          );
          if (!pel) continue;
          if (shareH) pel.style.height = h + "px";
          if (shareW) pel.style.width = w + "px";
        }
      };
      const onMove = (e2) => {
        const dx = e2.clientX - startX;
        const dy = e2.clientY - startY;
        const w = corner === "br" ? startW + dx : startW - dx;
        pending = sizeFrame(w, startH + dy, !!e2.shiftKey);
        syncOuter(pending.frameW, pending.frameH);
      };
      const onUp = () => {
        if (shell) shell.classList.remove("is-resizing");
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        try {
          target.releasePointerCapture(pointerId);
        } catch (e2) {
        }
        onPatchInstance(pending);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    };
    const durSec = resolved ? Math.max(segmentDurationMs(resolved) / 1e3, 1) : 0;
    const isInspector = presentationFor(instance) === "details";
    const isReport = isReportPresentation(presentationFor(instance));
    const activeReportKind = reportKindForPresentation(presentationFor(instance));
    const showStatusbar = isReportPresentation(presentationFor(instance));
    const encounterFooter = showStatusbar && resolved && activeReportKind === "encounter" ? e(
      "div",
      {
        className: "ecu-meter-status",
        style: { ...PIXEL_TEXT }
      },
      e("span", null, "Total damage"),
      (() => {
        const enc = runMeterQuery(
          { kind: "encounter_summary" },
          {
            segmentRef: selectedset,
            partyFocus: instance.partyFocus
          }
        );
        if (enc.kind !== "encounter") return null;
        return e("span", null, `${Math.round(enc.totalDamage)} dmg`);
      })()
    ) : null;
    const cycleable = canCycleBarMode(rootQuery(instance));
    const menuOpen = tip != null;
    const chromeActive = interacting || menuOpen || reportOpen;
    const reportTabLabel = ((_a = REPORT_TABS.find((t) => t.kind === activeReportKind)) == null ? void 0 : _a.label) || titleMode;
    const title = isInspector ? ((_b = instance.label) == null ? void 0 : _b.replace(/^Inspector · /, "")) || "Inspector" : isReport ? reportTabLabel : titleMode;
    const setReportTab = (kind) => {
      const tab = REPORT_TABS.find((t) => t.kind === kind);
      if (!tab) return;
      onPatchInstance({
        presentation: tab.presentation,
        query: { ...tab.query },
        label: tab.label
      });
      closeTip();
    };
    const applySegment = (next) => {
      onPatchInstance({ selectedset: next });
    };
    const copyReport = () => {
      var _a2;
      const ranked = runMeterQuery(rootQuery(instance), {
        segmentRef: selectedset,
        partyFocus: instance.partyFocus,
        entities
      });
      if (ranked.kind === "ranked") {
        const textOut = formatMeterReportLines(
          modeLabel(rootQuery(instance), instance.label),
          ranked.rows,
          segmentTitle(selectedset)
        );
        if ((_a2 = navigator.clipboard) == null ? void 0 : _a2.writeText) {
          void navigator.clipboard.writeText(textOut);
        }
      }
    };
    const saveBookmark = () => {
      const bm = {
        id: `bm-${Date.now().toString(36)}`,
        label: modeLabel(rootQuery(instance), instance.label),
        query: { ...rootQuery(instance) },
        presentation: presentationFor(instance),
        partyFocus: instance.partyFocus,
        selectedset: instance.selectedset
      };
      const prev = getSettings().meterBookmarks || [];
      patchSettings({ meterBookmarks: prev.concat([bm]) });
    };
    const saveBookmarkAtSlot = (slotIndex, d) => {
      const bm = {
        id: `bm-${Date.now().toString(36)}`,
        label: d.label,
        query: { ...d.query },
        presentation: "bars",
        partyFocus: instance.partyFocus,
        selectedset: instance.selectedset
      };
      const prev = (getSettings().meterBookmarks || []).slice();
      if (slotIndex >= prev.length) {
        prev.push(bm);
      } else {
        prev[slotIndex] = bm;
      }
      patchSettings({ meterBookmarks: prev });
    };
    const applyBookmark = (bm) => {
      onPatchInstance({
        query: { ...bm.query },
        presentation: bm.presentation || "bars",
        label: bm.label,
        partyFocus: bm.partyFocus,
        selectedset: bm.selectedset
      });
    };
    const openReportDialog = () => {
      closeTip();
      setReportOpen(true);
    };
    const tipItems = () => meterShellTipItems({
      tip,
      partyMenuOpts,
      partyFocus,
      hasObserver,
      instance,
      onPatchInstance,
      closeTip,
      resolved,
      isCurrentSeg,
      titleSeg,
      durSec,
      partyLabel: partyLabel2,
      selectedset,
      applySegment,
      past: past2,
      actorPickerRows,
      setInspectorActor,
      onOpenReport,
      copyReport,
      openReportDialog,
      setOptionsOpen,
      watchedName,
      metersHidden: props.metersHidden,
      onToggleMetersHidden: props.onToggleMetersHidden,
      onFocusInspector: props.onFocusInspector,
      onDuplicate: props.onDuplicate,
      onClose: props.onClose,
      closedInstances: props.closedInstances,
      onReopenClosed: props.onReopenClosed
    });
    const renderCooltip = () => renderMeterShellCooltip({
      tip,
      bmDrag,
      setBmDrag,
      bmDrop,
      setBmDrop,
      finishBookmarkDrag,
      applyBookmark,
      closeTip,
      instance,
      openTip,
      clearTipClose,
      scheduleTipClose,
      setOptionsOpen,
      saveBookmarkAtSlot,
      onPatchInstance,
      tipItems
    });
    const shellClass = "ecu-meter-shell" + (idle ? " is-idle" : "") + (menuOpen ? " is-menu-open" : "") + (chromeActive ? " is-interacting" : "") + (props.layoutEdit || arrange ? " is-layout" : "") + (isInspector ? " is-inspector" : "") + (isReport ? " is-report" : "") + (meterHasSnap(instance) ? " is-grouped" : "");
    const meterApp = getMeterAppearance();
    const shellTourId = meterShellTourId(rootQuery(instance));
    return e(
      "div",
      {
        className: shellClass,
        ...shellTourId ? { "data-ecu-tour": shellTourId } : {},
        style: {
          ...PIXEL_TEXT,
          fontSize: `${Math.round(meterApp.windowScale * 100)}%`
        },
        ref: (node) => {
          shellRef.current = node;
        },
        onMouseEnter: () => setInteracting(true),
        onMouseLeave: () => {
          setInteracting(false);
        }
      },
      renderMeterShellTitlebar({
        arrange,
        titlebarDragRef: props.titlebarDragRef,
        isInspector,
        isReport,
        result,
        title,
        titleMode,
        resolved,
        isCurrentSeg,
        titleSeg,
        durSec,
        partyLabel: partyLabel2,
        instance,
        tip,
        optionsOpen,
        openTip,
        scheduleTipClose,
        cycleable,
        selectedset,
        past: past2,
        applySegment,
        reportOpen,
        openReportDialog,
        onOpenReport,
        cycle,
        onPatchInstance,
        locked,
        layoutEdit: props.layoutEdit,
        onUngroup: props.onUngroup,
        onToggleLock: props.onToggleLock,
        onConfigure: props.onConfigure,
        onDuplicate: props.onDuplicate,
        onClose: props.onClose
      }),
      isReport ? e(
        "div",
        {
          className: "ecu-meter-report-tabs",
          style: { ...PIXEL_TEXT }
        },
        ...REPORT_TABS.map(
          (tab) => e(
            "button",
            {
              key: tab.kind,
              type: "button",
              className: "ecu-meter-report-tab" + (activeReportKind === tab.kind ? " active" : ""),
              onClick: () => setReportTab(tab.kind)
            },
            tab.label
          )
        )
      ) : null,
      encounterFooter,
      e(
        "div",
        {
          className: "ecu-meter-body",
          onContextMenu: (ev) => {
            if (isInspector || isReport) return;
            const t = ev.target;
            if (t && t.closest && t.closest("button, a, input, textarea")) return;
            ev.preventDefault();
            ev.stopPropagation();
            const shell = shellRef.current;
            if (!shell) return;
            openTipAnchor("bookmarks", rectToAnchor(shell));
          }
        },
        body
      ),
      !isInspector && !isReport ? MeterStatusbar({
        instance,
        segmentRef: selectedset || "current",
        segmentLabel: `${isCurrentSeg ? "Current" : titleSeg} \xB7 ${durSec.toFixed(0)}s`,
        onSegmentClick: () => {
          const shell = shellRef.current;
          if (shell) openTipAnchor("seg", rectToAnchor(shell));
        },
        onEncounterClick: () => {
          var _a2;
          return (_a2 = props.onOpenReport) == null ? void 0 : _a2.call(props, "encounter");
        }
      }) : null,
      !isInspector && !isReport && arrange ? e("div", {
        className: "ecu-meter-stretch-tab",
        title: "Drag to stretch",
        onPointerDown: (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          setStretchDrag(ev.clientY);
        },
        onPointerMove: (ev) => {
          if (stretchDrag == null) return;
          const dy = stretchDrag - ev.clientY;
          if (Math.abs(dy) < 4) return;
          const h = instance.frameH || METER_FRAME_DEFAULT.h;
          onPatchInstance({
            frameH: clampFrame(
              instance.frameW || METER_FRAME_DEFAULT.w,
              h + dy
            ).frameH
          });
          setStretchDrag(ev.clientY);
        },
        onPointerUp: () => setStretchDrag(null),
        onPointerCancel: () => setStretchDrag(null)
      }) : null,
      !isInspector && !isReport && resolved && (resolved.deaths.length > 0 || past2.length > 0) ? e(
        "div",
        { className: "ecu-meter-encounter-badges" },
        e(
          "button",
          {
            type: "button",
            className: "ecu-meter-encounter-badge is-skull",
            title: "Encounter Details",
            onClick: (ev) => {
              var _a2;
              ev.stopPropagation();
              (_a2 = props.onOpenReport) == null ? void 0 : _a2.call(props, "encounter");
            }
          },
          "\u{1F480}"
        ),
        e(
          "button",
          {
            type: "button",
            className: "ecu-meter-encounter-badge is-play",
            title: "Timeline",
            onClick: (ev) => {
              var _a2;
              ev.stopPropagation();
              (_a2 = props.onOpenReport) == null ? void 0 : _a2.call(props, "timeline");
            }
          },
          "\u25B6"
        )
      ) : null,
      tip && ReactDOM.createPortal ? ReactDOM.createPortal(renderCooltip(), document.body) : renderCooltip(),
      reportOpen && ReactDOM.createPortal ? ReactDOM.createPortal(
        (() => {
          const ranked = runMeterQuery(rootQuery(instance), {
            segmentRef: selectedset,
            partyFocus: instance.partyFocus,
            entities
          });
          const rows = ranked.kind === "ranked" ? ranked.rows : [];
          return e(
            "div",
            {
              className: "ecu-meter-report-backdrop",
              onMouseDown: (ev) => {
                if (ev.target === ev.currentTarget) setReportOpen(false);
              }
            },
            e(MeterReportDialog, {
              title: modeLabel(rootQuery(instance), instance.label),
              segmentLabel: segmentTitle(selectedset),
              rows,
              onClose: () => setReportOpen(false)
            })
          );
        })(),
        document.body
      ) : reportOpen ? (() => {
        const ranked = runMeterQuery(rootQuery(instance), {
          segmentRef: selectedset,
          partyFocus: instance.partyFocus,
          entities
        });
        const rows = ranked.kind === "ranked" ? ranked.rows : [];
        return e(MeterReportDialog, {
          title: modeLabel(rootQuery(instance), instance.label),
          segmentLabel: segmentTitle(selectedset),
          rows,
          onClose: () => setReportOpen(false)
        });
      })() : null,
      optionsOpen && ReactDOM.createPortal ? ReactDOM.createPortal(
        e(MeterOptionsPanel, {
          instanceLabel: instance.label,
          onClose: () => setOptionsOpen(false)
        }),
        document.body
      ) : optionsOpen ? e(MeterOptionsPanel, {
        instanceLabel: instance.label,
        onClose: () => setOptionsOpen(false)
      }) : null,
      props.layoutEdit || arrange ? e("div", {
        className: "ecu-meter-resize ecu-meter-resize-left",
        title: "Drag to resize (left corner \xB7 Shift = free size \xB7 Alt/Ctrl = group)",
        onPointerDown: (ev) => onResizePointerDown(ev, "bl")
      }) : null,
      props.layoutEdit || arrange ? e("div", {
        className: "ecu-meter-resize",
        title: getLayoutFreePlacement() ? "Drag to resize (Free placement \u2014 no grid snap)" : "Drag to resize (Shift = free size \xB7 Alt/Ctrl = group resize)",
        onPointerDown: (ev) => onResizePointerDown(ev, "br")
      }) : null
    );
  }

  // src/ui/frames/comm/CommMeterPanels.ts
  function buildCommMeterPanels(ctx) {
    var _a;
    const out = [];
    for (let mi = 0; mi < ctx.meterInstances.length; mi++) {
      const inst = ctx.meterInstances[mi];
      const isHidden = inst.visible === false;
      if (isHidden && !ctx.layoutEdit) continue;
      if (ctx.metersHidden && !ctx.layoutEdit) continue;
      if (!ctx.layoutEdit && meterHidesWhenEmpty(inst)) {
        const peek = runMeterQuery(inst.query, {
          entities: ctx.snap.entities,
          partyFocus: inst.partyFocus,
          segmentRef: inst.selectedset
        });
        const hasRows = peek.kind === "ranked" ? peek.rows.length > 0 : peek.kind !== "empty";
        if (!hasRows) continue;
      }
      const frameW = inst.frameW || METER_FRAME_DEFAULT.w;
      const frameH = inst.frameH || METER_FRAME_DEFAULT.h;
      const locked = ctx.meterIsLocked(inst);
      const playArrange = !ctx.layoutEdit && (!locked || ctx.altHeld);
      const arrange = ctx.layoutEdit || playArrange;
      const app = getMeterAppearance();
      let meterOpacity = inst.opacity != null ? inst.opacity : 1;
      const inCombat2 = isMeterInCombat();
      if (inCombat2 && app.autoHideCombat) {
        meterOpacity = Math.min(meterOpacity, app.idleAlpha);
      }
      if (!inCombat2 && app.autoHideOoc) {
        meterOpacity = Math.min(meterOpacity, app.idleAlpha);
      }
      out.push(
        e(
          PositionedPanel,
          {
            key: inst.id,
            id: inst.id,
            label: inst.label || inst.id,
            pos: inst.pos,
            editing: ctx.layoutEdit,
            editChrome: "anchors",
            movable: playArrange,
            showMoveGrip: false,
            softAvoid: false,
            extraDragRef: ctx.dragRefFor(inst.id),
            onMove: (_id, pos) => ctx.moveMeterWithGroup(inst.id, pos),
            onDragStart: () => ctx.onMeterDragStart(inst.id),
            onDragMove: () => ctx.onMeterDragMove(inst.id),
            onMoveEnd: () => ctx.snapMeterAfterMove(inst.id),
            className: "ecu-meter-frame" + (playArrange ? " ecu-meter-arrange" : "") + (meterHasSnap(inst) ? " ecu-meter-grouped" : "") + (ctx.meterSnapDragId === inst.id ? " ecu-meter-dragging" : "") + (ctx.meterSnapPeerId === inst.id ? " ecu-meter-snap-target" : ""),
            style: {
              ...METER_PANEL_STYLE,
              width: frameW + "px",
              height: frameH + "px",
              overflow: "visible"
            },
            closePlacement: "above",
            closeOnHoverOnly: true,
            hidden: isHidden,
            hiddenBodyStyle: {
              ...METER_PANEL_STYLE,
              width: frameW + "px",
              height: frameH + "px"
            },
            opacity: meterOpacity,
            onOpacityChange: ctx.layoutEdit ? (value) => ctx.patchMeter(inst.id, { opacity: value }) : void 0,
            peerLayout: ctx.peerLayout,
            viewportProfile: ctx.viewportProfile,
            interactiveBody: ctx.layoutEdit,
            onClose: () => ctx.patchMeter(inst.id, { visible: false }),
            onShow: () => ctx.patchMeter(inst.id, { visible: true })
          },
          e(
            "div",
            {
              style: {
                width: "100%",
                height: "100%",
                overflow: playArrange || ctx.layoutEdit ? "hidden" : "visible"
              }
            },
            e(MeterPanelShell, {
              instance: inst,
              highlightId: ctx.snap.observingId,
              entities: ctx.snap.entities,
              watchedName: (_a = ctx.snap.observing) == null ? void 0 : _a.name,
              layoutEdit: ctx.layoutEdit,
              arrange,
              locked,
              titlebarDragRef: ctx.dragRefFor(inst.id),
              onToggleLock: () => {
                ctx.patchMeter(inst.id, { locked: !locked });
              },
              onUngroup: meterHasSnap(inst) ? () => ctx.ungroupMeterPanel(inst.id) : void 0,
              resizeGroupIds: meterHasSnap(inst) ? getMeterGroup(ctx.meterInstances, inst.id).map((g) => g.id).filter((gid) => gid !== inst.id) : void 0,
              onToggleMetersHidden: () => ctx.setMetersHiddenPersist(!ctx.metersHidden),
              metersHidden: ctx.metersHidden,
              closedInstances: ctx.closedMeters,
              onReopenClosed: ctx.reopenClosedMeter,
              onPatchInstance: (partial) => {
                if (partial.frameW != null || partial.frameH != null) {
                  ctx.setMeterInstances((prev) => {
                    const next = applyGroupFrameSize(prev, inst.id, {
                      frameW: partial.frameW,
                      frameH: partial.frameH
                    }).map((m) => m.id === inst.id ? { ...m, ...partial } : m);
                    patchSettings({ meterInstances: next });
                    return next;
                  });
                  return;
                }
                ctx.patchMeter(inst.id, partial);
              },
              onFocusInspector: ctx.focusInspector,
              onOpenReport: (kind) => ctx.focusReport(kind, {
                selectedset: inst.selectedset,
                partyFocus: inst.partyFocus
              }),
              onDuplicate: () => ctx.duplicateMeter(inst.id),
              onClose: ctx.layoutEdit ? () => ctx.removeMeter(inst.id) : () => ctx.closeMeterRuntime(inst.id),
              onConfigure: () => ctx.setMeterAddOpen(true),
              onToolbarInteract: ctx.onToolbarInteract
            })
          )
        )
      );
    }
    return out;
  }

  // src/ui/frames/comm/LayoutEditGrid.ts
  function tierLook(tier) {
    switch (tier) {
      case "fine":
        return {
          dark: "rgba(0, 0, 0, 0.42)",
          light: "rgba(255, 255, 255, 0.5)",
          dashed: true
        };
      case "medium":
        return {
          dark: "rgba(0, 0, 0, 0.55)",
          light: "rgba(255, 250, 220, 0.7)",
          dashed: true
        };
      case "coarse":
        return {
          dark: "rgba(0, 0, 0, 0.7)",
          light: "rgba(255, 245, 200, 0.88)",
          dashed: false
        };
      case "edge":
        return {
          dark: "rgba(0, 0, 0, 0.82)",
          light: "rgba(255, 255, 255, 0.95)",
          dashed: false
        };
      default: {
        const _exhaustive = tier;
        return _exhaustive;
      }
    }
  }
  function strokeStyle(axis, color, dashed, offsetPx) {
    const border = `${dashed ? "1px dashed" : "1px solid"} ${color}`;
    if (axis === "v") {
      return {
        position: "absolute",
        left: `${offsetPx}px`,
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
      top: `${offsetPx}px`,
      left: 0,
      right: 0,
      height: 0,
      borderTop: border,
      boxSizing: "border-box",
      pointerEvents: "none"
    };
  }
  function gridLine(axis, pct, tier) {
    const look = tierLook(tier);
    const host2 = axis === "v" ? {
      position: "absolute",
      left: `${pct}%`,
      top: 0,
      bottom: 0,
      width: "2px",
      pointerEvents: "none"
    } : {
      position: "absolute",
      top: `${pct}%`,
      left: 0,
      right: 0,
      height: "2px",
      pointerEvents: "none"
    };
    return e(
      "div",
      {
        key: `${axis}-${tier}-${pct}`,
        className: `comm-layout-grid-line is-${tier}`,
        style: host2
      },
      e("div", {
        style: strokeStyle(axis, look.dark, look.dashed, 0)
      }),
      e("div", {
        style: strokeStyle(axis, look.light, look.dashed, 1)
      })
    );
  }
  function LayoutEditGrid() {
    const React = getReact();
    const wrapRef = React.useRef(null);
    const [gridStep, setGridStep] = React.useState(() => getLayoutGridStep());
    const [size, setSize] = React.useState(() => {
      const r = layoutDragRoot().getBoundingClientRect();
      return { w: r.width || 1, h: r.height || 1 };
    });
    React.useEffect(
      () => subscribeLayoutEditPrefs(() => {
        setGridStep(getLayoutGridStep());
      }),
      []
    );
    React.useEffect(() => {
      const root = layoutDragRoot();
      const measure = () => {
        const r = root.getBoundingClientRect();
        setSize({ w: Math.max(1, r.width), h: Math.max(1, r.height) });
      };
      measure();
      if (typeof ResizeObserver === "undefined") {
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
      }
      const ro = new ResizeObserver(measure);
      ro.observe(root);
      return () => ro.disconnect();
    }, []);
    const tiers = squareGridTieredLines(gridStep, size.w, size.h);
    const kids = [];
    for (let i = 0; i < tiers.x.length; i++) {
      kids.push(gridLine("v", tiers.x[i].pct, tiers.x[i].tier));
    }
    for (let j = 0; j < tiers.y.length; j++) {
      kids.push(gridLine("h", tiers.y[j].pct, tiers.y[j].tier));
    }
    return e(
      "div",
      {
        ref: wrapRef,
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

  // src/ui/frames/comm/CommControlStrip.ts
  function CommControlStrip(props) {
    const touchPad = isTouchishProfile(props.viewportProfile);
    const toggleBtnPad = touchPad ? "10px 16px" : "5px 12px";
    const toggleFont = touchPad ? "16px" : "14px";
    return e(
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
          "data-ecu-tour": "btn-layout",
          title: "Toggle layout edit (Ctrl+Shift+L)",
          style: {
            cursor: "pointer",
            padding: toggleBtnPad,
            fontSize: toggleFont,
            minHeight: touchPad ? "40px" : void 0,
            border: props.layoutEdit ? "1px solid #ffe08a" : "1px solid #555",
            background: props.layoutEdit ? "#3a3510" : "#1a1a1a",
            color: props.layoutEdit ? "#ffe08a" : "#eee",
            textShadow: "none",
            fontWeight: "normal",
            pointerEvents: "auto",
            position: "relative",
            zIndex: 1
          },
          onPointerDown: (ev) => {
            if (ev && typeof ev.stopPropagation === "function") {
              ev.stopPropagation();
            }
          },
          onClick: (ev) => {
            if (ev && typeof ev.stopPropagation === "function") {
              ev.stopPropagation();
            }
            props.toggleLayoutEdit();
          }
        },
        props.layoutEdit ? "Layout: ON" : "Layout"
      ),
      e(
        "button",
        {
          type: "button",
          "data-ecu-tour": "btn-meters",
          title: props.metersHidden ? "Show all meters" : "Hide all meters",
          style: {
            cursor: "pointer",
            padding: toggleBtnPad,
            fontSize: toggleFont,
            minHeight: touchPad ? "40px" : void 0,
            border: props.metersHidden ? "1px solid #886" : "1px solid #555",
            background: props.metersHidden ? "#2a1a1a" : "#1a1a1a",
            color: props.metersHidden ? "#c9a" : "#eee",
            textShadow: "none",
            fontWeight: "normal"
          },
          onClick: () => props.setMetersHiddenPersist(!props.metersHidden)
        },
        props.metersHidden ? "Meters: OFF" : "Meters"
      ),
      e(
        "button",
        {
          type: "button",
          "data-ecu-tour": "btn-add-meter",
          title: "Add meter panel",
          style: {
            cursor: "pointer",
            padding: toggleBtnPad,
            fontSize: toggleFont,
            minHeight: touchPad ? "40px" : void 0,
            border: "1px solid #555",
            background: "#1a1a1a",
            color: "#eee",
            textShadow: "none",
            fontWeight: "normal"
          },
          onClick: () => props.onAddMeter()
        },
        "+ Meter"
      ),
      e(
        "button",
        {
          type: "button",
          title: "Replay intro spotlight tour",
          style: {
            cursor: "pointer",
            padding: toggleBtnPad,
            fontSize: toggleFont,
            minHeight: touchPad ? "40px" : void 0,
            border: "1px solid #555",
            background: "#1a1a1a",
            color: "#bbb",
            textShadow: "none",
            fontWeight: "normal"
          },
          onClick: () => props.onReplayIntroTour()
        },
        "Intro"
      )
    );
  }

  // src/ui/chrome/ControlBadge.ts
  function ControlIcon(props) {
    const React = getReact();
    const ref = React.useRef(null);
    const { state, iconSize } = props;
    React.useEffect(() => {
      const el = ref.current;
      if (!el) return;
      const html = itemContainer(
        { skin: state.skin, size: iconSize, draggable: false },
        null
      );
      if (html) {
        el.innerHTML = html;
        const root = el.firstElementChild;
        if (root) {
          root.style.margin = "0";
          root.removeAttribute("onmousedown");
          root.removeAttribute("ontouchstart");
          root.removeAttribute("onclick");
        }
      } else {
        el.textContent = state.label.slice(0, 1);
      }
      return () => {
        if (el) el.innerHTML = "";
      };
    }, [state.skin, state.label, iconSize]);
    return e("div", {
      ref,
      className: "comm-ctrl-icon",
      style: {
        position: "relative",
        display: "inline-block",
        flex: "0 0 auto",
        overflow: "visible",
        pointerEvents: "none"
      }
    });
  }
  function badgeTitle(state) {
    if (state.kind === "fear") {
      return `${state.label} (fear ${state.fear})`;
    }
    return state.label;
  }
  function ControlBadge(props) {
    const { states, compact = false } = props;
    if (!states.length) return null;
    const iconSize = typeof props.iconSize === "number" && props.iconSize > 0 ? props.iconSize : compact ? 18 : 22;
    return e(
      "div",
      {
        className: "comm-ctrl-badges" + (compact ? " is-compact" : ""),
        style: {
          position: "absolute",
          top: compact ? "-3px" : "2px",
          left: compact ? "-3px" : "2px",
          zIndex: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: compact ? "2px" : "3px",
          pointerEvents: "none"
        }
      },
      ...states.map((state) => {
        const key = state.kind === "fear" ? `fear-${state.level}` : `cc-${state.id}`;
        return e(
          "div",
          {
            key,
            className: "comm-ctrl-badge" + (state.kind === "fear" ? ` is-fear is-${state.level}` : ` is-hardcc is-${state.id}`),
            title: badgeTitle(state),
            style: {
              display: "inline-flex",
              alignItems: "center",
              gap: compact ? "0" : "4px",
              maxWidth: compact ? void 0 : "100%",
              padding: compact ? "1px" : "1px 5px 1px 1px",
              boxSizing: "border-box",
              background: state.background,
              border: `1px solid ${state.border}`,
              color: state.color,
              fontSize: TYPE.badge,
              lineHeight: 1,
              ...PIXEL_TEXT
            }
          },
          e(ControlIcon, { state, iconSize }),
          compact ? null : e(
            "span",
            {
              style: {
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "7.5em"
              }
            },
            state.label
          )
        );
      })
    );
  }

  // src/lib/controlState.ts
  var HARD_CC = [
    {
      id: "stoned",
      severity: 5,
      fallbackSkin: "condition_neutral",
      fallbackLabel: "Stoned",
      color: "#d8d0c0",
      border: "#a09070",
      background: "rgba(60,50,30,0.9)"
    },
    {
      id: "deepfreezed",
      severity: 5,
      fallbackSkin: "condition_bad",
      fallbackLabel: "Deepfreezed",
      color: "#b8e0ff",
      border: "#5a9ec8",
      background: "rgba(20,40,70,0.9)"
    },
    {
      id: "stunned",
      severity: 4,
      fallbackSkin: "condition_bad",
      fallbackLabel: "Stunned",
      color: "#ffd0a0",
      border: "#c87830",
      background: "rgba(70,40,10,0.9)"
    },
    {
      id: "fingered",
      severity: 4,
      fallbackSkin: "condition_neutral",
      fallbackLabel: "Deep Meditation",
      color: "#e0d0ff",
      border: "#8860b0",
      background: "rgba(40,20,60,0.9)"
    },
    {
      id: "sleeping",
      severity: 3,
      fallbackSkin: "condition_bad",
      fallbackLabel: "Sleeping",
      color: "#d0d8e8",
      border: "#7080a0",
      background: "rgba(30,35,50,0.9)"
    }
  ];
  var FEAR_SKIN = "skill_scare";
  var FEAR_STYLE = {
    // Colors from stock fear logs (#B03736 / #B04157 / gray).
    scared: {
      severity: 1,
      label: "Scared",
      color: "#c8c8c8",
      border: "#888",
      background: "rgba(40,40,40,0.92)"
    },
    terrified: {
      severity: 2,
      label: "Terrified",
      color: "#ffc0c8",
      border: "#B04157",
      background: "rgba(80,20,35,0.92)"
    },
    petrified: {
      severity: 3,
      label: "Petrified",
      color: "#ffb0a8",
      border: "#B03736",
      background: "rgba(90,20,20,0.92)"
    }
  };
  function fearLevelFromValue(fear) {
    if (!(fear > 0)) return null;
    if (fear > 3) return "petrified";
    if (fear > 1) return "terrified";
    return "scared";
  }
  function getFearState(entity) {
    if (!entity) return null;
    const raw = entity.fear;
    const fear = typeof raw === "number" ? raw : 0;
    const level = fearLevelFromValue(fear);
    if (!level) return null;
    const style = FEAR_STYLE[level];
    return {
      kind: "fear",
      level,
      fear,
      label: style.label,
      severity: style.severity,
      color: style.color,
      border: style.border,
      background: style.background,
      skin: FEAR_SKIN
    };
  }
  function getHardCcState(entity) {
    var _a;
    if (!entity || !entity.s) return null;
    const G = getG();
    let best = null;
    for (let i = 0; i < HARD_CC.length; i++) {
      const def = HARD_CC[i];
      const actual = entity.s[def.id];
      if (!actual) continue;
      const prop = (_a = G == null ? void 0 : G.conditions) == null ? void 0 : _a[def.id];
      const skin = typeof actual.skin === "string" && actual.skin || typeof (prop == null ? void 0 : prop.skin) === "string" && prop.skin || def.fallbackSkin;
      const label = typeof (prop == null ? void 0 : prop.name) === "string" && prop.name || def.fallbackLabel;
      const next = {
        kind: "hardcc",
        id: def.id,
        label,
        severity: def.severity,
        color: def.color,
        border: def.border,
        background: def.background,
        skin
      };
      if (!best || next.severity > best.severity) best = next;
    }
    return best;
  }
  function getControlStates(entity) {
    const out = [];
    const hard = getHardCcState(entity);
    const fear = getFearState(entity);
    if (hard) out.push(hard);
    if (fear) out.push(fear);
    return out;
  }
  function controlBorderTint(states) {
    if (!states.length) return void 0;
    let best = states[0];
    for (let i = 1; i < states.length; i++) {
      const s = states[i];
      const bestRank = best.kind === "fear" ? best.severity + 10 : best.severity;
      const rank = s.kind === "fear" ? s.severity + 10 : s.severity;
      if (rank > bestRank) best = s;
    }
    return best.border;
  }
  var PROMOTED_HARD_CC_IDS = HARD_CC.map((d) => d.id);
  function hardCcFallbackSkin(id) {
    for (let i = 0; i < HARD_CC.length; i++) {
      if (HARD_CC[i].id === id) return HARD_CC[i].fallbackSkin;
    }
    return void 0;
  }

  // src/ui/chrome/EffectsRow.ts
  var ICON_SIZE = 36;
  var SKILL_UI_SPAN_MS = 24e3;
  function buffStartedAt(effect, endsAt, now, mode, prevStartedAt) {
    if (effect.type === "skill") {
      const spanMs = Math.max(SKILL_UI_SPAN_MS, endsAt - now);
      return endsAt - spanMs;
    }
    if (mode === "restart") return now;
    return prevStartedAt;
  }
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
      const promoted = PROMOTED_HARD_CC_IDS.indexOf(condition) !== -1;
      const debuffIcon = !!(prop && prop.debuff && prop.skin);
      if (!actual.skin && !promoted && !debuffIcon && (!prop || !prop.ui && (!actual.s || actual.s < 20))) {
        continue;
      }
      if (entity.type === "monster" && condition === "poisonous") continue;
      const skin = actual.skin || (prop == null ? void 0 : prop.skin) || hardCcFallbackSkin(condition);
      if (!skin) continue;
      out.push({
        id: condition,
        skin,
        ms: actual.ms,
        stacks: typeof actual.s === "number" ? actual.s : void 0,
        debuff: !!(prop && prop.debuff) || promoted,
        type: "condition",
        name: typeof (prop == null ? void 0 : prop.name) === "string" ? prop.name : void 0
      });
    }
    return out;
  }
  function stabilizeEffectOrder(effects, orderIds) {
    const byId = {};
    for (let i = 0; i < effects.length; i++) {
      byId[effects[i].id] = effects[i];
    }
    const nextOrder = [];
    const placed = {};
    for (let i = 0; i < orderIds.length; i++) {
      const id = orderIds[i];
      if (byId[id] && !placed[id]) {
        nextOrder.push(id);
        placed[id] = true;
      }
    }
    for (let i = 0; i < effects.length; i++) {
      const id = effects[i].id;
      if (!placed[id]) {
        nextOrder.push(id);
        placed[id] = true;
      }
    }
    const ordered = [];
    for (let i = 0; i < nextOrder.length; i++) {
      ordered.push(byId[nextOrder[i]]);
    }
    return { effects: ordered, orderIds: nextOrder };
  }
  function loaderId(hostClass) {
    return hostClass.replace(/[^a-zA-Z0-9_\-]/g, "_");
  }
  function syncStackBadge(wrap, stacks) {
    const root = wrap.firstElementChild;
    if (!root) return;
    let badge = root.querySelector(".iqui");
    if (stacks != null && stacks > 0) {
      if (!badge) {
        badge = document.createElement("div");
        badge.className = "iqui";
        const host2 = root.querySelector(
          "div[style*='overflow']"
        ) || root;
        host2.appendChild(badge);
      }
      badge.textContent = String(stacks);
    } else if (badge) {
      badge.remove();
    }
  }
  function effectTooltip(effect, remainingMs) {
    const parts = [];
    const label = effect.name || effect.id;
    const kind = effect.type === "skill" ? "Skill" : effect.debuff ? "Debuff" : "Buff";
    parts.push(`${label} (${kind})`);
    const ms = remainingMs != null && remainingMs > 0 ? remainingMs : effect.ms != null && effect.ms > 0 ? effect.ms : 0;
    if (ms > 0) {
      parts.push(`Remaining: ${formatTime(ms / 1e3)}`);
    }
    if (effect.stacks != null && effect.stacks > 0) {
      parts.push(`Stacks: ${effect.stacks}`);
    }
    if (effect.name && effect.name !== effect.id) {
      parts.push(`id: ${effect.id}`);
    }
    return parts.join("\n");
  }
  var EXTEND_ENDS_MS = 750;
  var EXTEND_REMAIN_MS = 500;
  function durationWasExtended(prevEndsAt, nextEndsAt, now) {
    if (!(prevEndsAt > 0)) return false;
    if (!(nextEndsAt > prevEndsAt + EXTEND_ENDS_MS)) return false;
    const prevRemain = Math.max(0, prevEndsAt - now);
    const nextRemain = Math.max(0, nextEndsAt - now);
    return nextRemain > prevRemain + EXTEND_REMAIN_MS;
  }
  function stackedTintWarnMs(effect, remainingMs) {
    const hint = Math.max(effect.ms || 0, remainingMs, 1e3);
    return Math.min(4e3, Math.max(2500, Math.floor(hint * 0.4)));
  }
  function wantsStackedSoftTint(effect) {
    return effect.stacks != null;
  }
  function shouldShowEffectTint(effect, remainingMs) {
    if (!(remainingMs > 0)) return false;
    if (!wantsStackedSoftTint(effect)) return true;
    return remainingMs <= stackedTintWarnMs(effect, remainingMs);
  }
  var STACKED_LABEL_SETTLE_MS = 1250;
  var STACKED_LABEL_DROP_MS = 1e3;
  function shouldShowRemainingLabel(effect, remainingMs, peakRemainMs, lastExtendAt, now) {
    if (!(remainingMs > 0)) return false;
    if (!wantsStackedSoftTint(effect)) return true;
    if (remainingMs <= stackedTintWarnMs(effect, remainingMs)) return true;
    if (!(lastExtendAt > 0) || now - lastExtendAt < STACKED_LABEL_SETTLE_MS) {
      return false;
    }
    const peak = Math.max(peakRemainMs, remainingMs);
    return remainingMs <= peak - STACKED_LABEL_DROP_MS;
  }
  function ensureSkidLoader(wrap, rid) {
    const root = wrap.firstElementChild;
    const host2 = wrap.querySelector("div[style*='position: absolute']") || wrap.querySelector("div[style*='overflow']") || root;
    if (!host2) return null;
    const selector = ".skidloader" + rid;
    let loader = wrap.querySelector(selector);
    if (!loader) {
      loader = document.createElement("div");
      loader.className = "skidloader" + rid;
      loader.setAttribute(
        "style",
        "position: absolute; bottom: 0px; right: 0px; width: 4px; height: 1px; background-color: yellow"
      );
      host2.appendChild(loader);
    }
    return loader;
  }
  function clearEffectTint(wrap, rid) {
    const selector = ".skidloader" + rid;
    const existing = getTint(selector);
    if (existing) {
      existing.end = /* @__PURE__ */ new Date(0);
      existing.ms = 0;
    }
    const loader = wrap.querySelector(selector);
    if (loader && loader.parentElement) loader.parentElement.removeChild(loader);
    const img = wrap.querySelector("img");
    if (img) img.style.opacity = "1";
  }
  function applyEffectTint(wrap, rid, endsAt, startedAt, mode) {
    var _a;
    const now = Date.now();
    const remaining = endsAt - now;
    const spanMs = endsAt - startedAt;
    if (!(remaining > 0) || !(startedAt > 0) || !(spanMs > 0)) return;
    const loader = ensureSkidLoader(wrap, rid);
    if (!loader) return;
    const selector = ".skidloader" + rid;
    const existing = getTint(selector);
    if (mode === "sync") {
      if (existing) {
        const prevStart = existing.start ? existing.start.getTime() : 0;
        const prevEnd = existing.end ? existing.end.getTime() : 0;
        if (Math.abs(prevStart - startedAt) < 50 && Math.abs(prevEnd - endsAt) < 50) {
          return;
        }
        existing.start = new Date(startedAt);
        existing.end = new Date(endsAt);
        existing.ms = remaining;
        return;
      }
      mode = "rebind";
    }
    rebindTint(selector);
    loader.style.height = "1px";
    const img = (_a = loader.parentElement) == null ? void 0 : _a.querySelector("img");
    if (img) img.style.opacity = "0.5";
    addTint(selector, {
      ms: remaining,
      type: "skill",
      skid: rid,
      start: new Date(startedAt)
    });
    const tint = getTint(selector);
    if (tint) {
      tint.start = new Date(startedAt);
      tint.end = new Date(endsAt);
    }
  }
  function EffectIcon(props) {
    const React = getReact();
    const iconRef = React.useRef(null);
    const endsAtRef = React.useRef(0);
    const startedAtRef = React.useRef(0);
    const tintShownRef = React.useRef(false);
    const peakRemainRef = React.useRef(0);
    const lastExtendAtRef = React.useRef(0);
    const lastMsRef = React.useRef(0);
    const { effect, hostClass, entity, iconSize } = props;
    const entityId = String(entity.id);
    const rid = loaderId(hostClass);
    const clickable = effect.type !== "skill";
    const [remainingMs, setRemainingMs] = React.useState(0);
    const [showRemainLabel, setShowRemainLabel] = React.useState(false);
    const noteDurationPeak = (remaining, extended) => {
      if (extended || !(peakRemainRef.current > 0)) {
        peakRemainRef.current = Math.max(
          effect.ms || 0,
          remaining,
          peakRemainRef.current
        );
        lastExtendAtRef.current = Date.now();
      }
    };
    const refreshRemainLabel = (remaining) => {
      setShowRemainLabel(
        shouldShowRemainingLabel(
          effect,
          remaining,
          peakRemainRef.current,
          lastExtendAtRef.current,
          Date.now()
        )
      );
    };
    const paintIcon = () => {
      const el = iconRef.current;
      if (!el) return;
      const opts = {
        skin: effect.skin,
        size: iconSize,
        draggable: false
      };
      const html = itemContainer(opts, null);
      if (html) {
        el.innerHTML = html;
        const root = el.firstElementChild;
        if (root) {
          root.style.margin = "0";
          root.removeAttribute("onmousedown");
          root.removeAttribute("ontouchstart");
          root.removeAttribute("onclick");
        }
      } else {
        el.textContent = effect.id;
      }
    };
    const hideTint = () => {
      const el = iconRef.current;
      if (el) clearEffectTint(el, rid);
      tintShownRef.current = false;
      if (wantsStackedSoftTint(effect)) startedAtRef.current = 0;
    };
    const pushTint = (mode) => {
      const el = iconRef.current;
      if (!el || !el.firstElementChild) return;
      const endsAt = endsAtRef.current;
      const remaining = endsAt - Date.now();
      if (!shouldShowEffectTint(effect, remaining)) {
        hideTint();
        return;
      }
      let startedAt = startedAtRef.current;
      if (wantsStackedSoftTint(effect) && !tintShownRef.current) {
        startedAt = Date.now();
        startedAtRef.current = startedAt;
        mode = "restart";
      }
      if (!(endsAt > Date.now()) || !(startedAt > 0)) return;
      applyEffectTint(el, rid, endsAt, startedAt, mode);
      tintShownRef.current = true;
    };
    React.useEffect(() => {
      const el = iconRef.current;
      if (!el) return;
      paintIcon();
      syncStackBadge(el, effect.stacks);
      tintShownRef.current = false;
      pushTint(startedAtRef.current > 0 ? "rebind" : "restart");
      return () => {
        if (el) el.innerHTML = "";
      };
    }, [effect.id, effect.skin, effect.type, hostClass, rid, iconSize]);
    React.useEffect(() => {
      const el = iconRef.current;
      if (!el || !el.firstElementChild) return;
      syncStackBadge(el, effect.stacks);
    }, [entityId, effect.id, effect.stacks]);
    React.useEffect(() => {
      const now = Date.now();
      const prev = endsAtRef.current;
      const rawMs = effect.ms;
      const next = syncEndsAt(prev, rawMs, now, lastMsRef.current);
      if (rawMs != null && rawMs > 0) lastMsRef.current = rawMs;
      endsAtRef.current = next;
      const remaining = Math.max(0, next - now);
      setRemainingMs(remaining);
      if (!(next > now)) {
        startedAtRef.current = 0;
        peakRemainRef.current = 0;
        lastExtendAtRef.current = 0;
        lastMsRef.current = 0;
        hideTint();
        setShowRemainLabel(false);
        return;
      }
      if (!prev) {
        noteDurationPeak(remaining, true);
        refreshRemainLabel(remaining);
        startedAtRef.current = buffStartedAt(
          effect,
          next,
          now,
          "restart",
          startedAtRef.current
        );
        pushTint("restart");
        return;
      }
      if (durationWasExtended(prev, next, now)) {
        noteDurationPeak(remaining, true);
        refreshRemainLabel(remaining);
        if (wantsStackedSoftTint(effect)) {
          hideTint();
          return;
        }
        if (!(startedAtRef.current > 0)) {
          startedAtRef.current = buffStartedAt(
            effect,
            next,
            now,
            "restart",
            0
          );
        } else {
          const maxSpan = Math.max(
            SKILL_UI_SPAN_MS,
            effect.ms || 0,
            next - now
          );
          if (next - startedAtRef.current > maxSpan) {
            startedAtRef.current = next - maxSpan;
          }
        }
        pushTint("sync");
        return;
      }
      refreshRemainLabel(remaining);
      if (!shouldShowEffectTint(effect, remaining)) {
        hideTint();
        return;
      }
      if (next < prev - 250) {
        if (effect.type === "skill") {
          startedAtRef.current = buffStartedAt(
            effect,
            next,
            now,
            "sync",
            startedAtRef.current
          );
        }
        pushTint("sync");
        return;
      }
      pushTint(tintShownRef.current ? "sync" : "restart");
    }, [entityId, effect.id, effect.ms, effect.stacks, rid]);
    React.useEffect(() => {
      const tick = () => {
        const ends = endsAtRef.current;
        if (!ends) {
          setRemainingMs(0);
          setShowRemainLabel(false);
          hideTint();
          return;
        }
        const remaining = Math.max(0, ends - Date.now());
        setRemainingMs(remaining);
        refreshRemainLabel(remaining);
        if (!shouldShowEffectTint(effect, remaining)) {
          if (tintShownRef.current) hideTint();
          return;
        }
        if (!tintShownRef.current) pushTint("restart");
      };
      tick();
      const id = window.setInterval(tick, 250);
      return () => window.clearInterval(id);
    }, [entityId, effect.id, effect.stacks, effect.ms, rid]);
    const msLabel = showRemainLabel && remainingMs > 0 ? formatDurationCompact(remainingMs / 1e3) : "";
    const tooltip = effectTooltip(
      effect,
      showRemainLabel ? remainingMs : void 0
    );
    const onClick = clickable ? (ev) => {
      if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
      if (ev && typeof ev.preventDefault === "function") ev.preventDefault();
      info.openCondition(entity, effect.id);
    } : void 0;
    return e(
      "div",
      {
        className: `comm-fx-icon ${hostClass}`,
        "data-condition": effect.id,
        "data-entity": entityId,
        [INFO_SOURCE_ATTR]: clickable ? "" : void 0,
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
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          verticalAlign: "top",
          overflow: "visible",
          flex: "0 0 auto",
          cursor: clickable ? "pointer" : "default",
          pointerEvents: "auto"
        }
      },
      e("div", {
        ref: iconRef,
        style: {
          position: "relative",
          display: "inline-block",
          verticalAlign: "top"
        }
      }),
      // Always reserve label height so show/hide does not reflow the row.
      e(
        "div",
        {
          className: "comm-fx-ms",
          style: {
            marginTop: "1px",
            zIndex: 2,
            padding: "0 3px",
            background: msLabel ? "rgba(0,0,0,0.82)" : "transparent",
            border: msLabel ? "1px solid #444" : "1px solid transparent",
            color: remainingMs <= 5e3 ? "#ffcc66" : "#e8e8e8",
            fontSize: TYPE.microMin,
            lineHeight: "14px",
            minHeight: "14px",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            visibility: msLabel ? "visible" : "hidden",
            ...PIXEL_TEXT
          }
        },
        msLabel || "\xA0"
      )
    );
  }
  function EffectsRow(props) {
    const React = getReact();
    const lastEffectsRef = React.useRef([]);
    const emptySinceRef = React.useRef(0);
    const orderIdsRef = React.useRef([]);
    let effects = buildEntityEffects(props.entity);
    if (effects.length) {
      const stabilized = stabilizeEffectOrder(effects, orderIdsRef.current);
      effects = stabilized.effects;
      orderIdsRef.current = stabilized.orderIds;
      lastEffectsRef.current = effects;
      emptySinceRef.current = 0;
    } else if (lastEffectsRef.current.length) {
      if (!emptySinceRef.current) emptySinceRef.current = Date.now();
      if (Date.now() - emptySinceRef.current < 500) {
        effects = lastEffectsRef.current;
      } else {
        lastEffectsRef.current = [];
        orderIdsRef.current = [];
      }
    }
    if (!effects.length) return null;
    const entityId = String(props.entity.id);
    const iconSize = typeof props.iconSize === "number" && props.iconSize > 0 ? props.iconSize : ICON_SIZE;
    const compact = !!props.compact;
    const gap = compact ? "3px" : "6px";
    const marginTop = compact ? "3px" : "6px";
    const padBottom = compact ? "2px" : "4px";
    const minHeight = iconSize + (compact ? 8 : 14) + 16;
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
        // Do NOT key by effects list — that remounts every icon when one buff
        // is added/removed. EffectIcon keys already identity each buff.
        className: "comm-fx-row" + (compact ? " is-compact" : ""),
        style: {
          display: "flex",
          flexDirection: "row",
          marginTop,
          gap,
          flexWrap: compact && maxVisible > 0 ? "nowrap" : "wrap",
          alignItems: "flex-start",
          width: "100%",
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
          key: `${entityId}-overflow`,
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
            fontSize: compact ? TYPE.badge : TYPE.secondary,
            lineHeight: 1,
            ...PIXEL_TEXT,
            cursor: "default",
            boxSizing: "border-box"
          }
        },
        `+${overflow}`
      ) : null
    );
  }

  // src/ui/chrome/SharedPartyEffects.ts
  function collectUniquePartyEffects(members) {
    const byId = {};
    const discovery = [];
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      const effects = buildEntityEffects(member);
      for (let j = 0; j < effects.length; j++) {
        const ef = effects[j];
        const prev = byId[ef.id];
        if (!prev) discovery.push(ef.id);
        if (!prev || (ef.ms || 0) > (prev.ms || 0)) {
          byId[ef.id] = { ...ef, entity: member };
        }
      }
    }
    const out = [];
    for (let i = 0; i < discovery.length; i++) out.push(byId[discovery[i]]);
    return out;
  }
  function SharedPartyEffects(props) {
    const React = getReact();
    const orderIdsRef = React.useRef([]);
    const collected = collectUniquePartyEffects(props.members);
    const stabilized = stabilizeEffectOrder(collected, orderIdsRef.current);
    orderIdsRef.current = stabilized.orderIds;
    const entries = stabilized.effects;
    if (!entries.length) {
      orderIdsRef.current = [];
      return null;
    }
    const iconSize = typeof props.iconSize === "number" && props.iconSize > 0 ? props.iconSize : 22;
    const maxVisible = typeof props.maxVisible === "number" ? props.maxVisible : 8;
    const overflow = maxVisible > 0 && entries.length > maxVisible ? entries.length - maxVisible : 0;
    const shown = overflow > 0 ? entries.slice(0, maxVisible) : entries;
    const hidden = overflow > 0 ? entries.slice(maxVisible) : [];
    const overflowTitle = hidden.map((ef) => {
      const label = ef.name || ef.id;
      const who = ef.entity.name || ef.entity.id;
      return `${label} \xB7 ${who}`;
    }).join("\n");
    return e(
      "div",
      {
        className: "comm-fx-row is-shared",
        style: {
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          gap: "3px",
          marginTop: "4px",
          marginBottom: "2px",
          alignItems: "flex-start",
          width: "100%",
          boxSizing: "border-box",
          pointerEvents: "auto"
        }
      },
      ...shown.map((ef) => {
        const hostClass = `comm-fx-shared-${ef.id}`.replace(
          /[^a-zA-Z0-9_\-]/g,
          "_"
        );
        return e(EffectIcon, {
          key: `shared-${ef.id}`,
          effect: ef,
          hostClass,
          entity: ef.entity,
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
            fontSize: TYPE.countBadge,
            lineHeight: 1,
            ...PIXEL_TEXT,
            cursor: "default",
            boxSizing: "border-box"
          }
        },
        `+${overflow}`
      ) : null
    );
  }

  // src/lib/stickyPresence.ts
  function isActuallyDead(entity) {
    return !!entity && entity.dead === true;
  }
  var THREAT_STICKY_MS = 1400;
  var threatStickyById = /* @__PURE__ */ new Map();
  function isLiveAggroMob(ent) {
    if (ent.dead) return false;
    return ent.type === "monster" && !!ent.target;
  }
  function stickyAggroByTarget(liveByTarget, resolveName, now = Date.now()) {
    const liveIds = Object.keys(liveByTarget);
    for (let i = 0; i < liveIds.length; i++) {
      const tid = liveIds[i];
      const raw = liveByTarget[tid] || [];
      const mobs = [];
      for (let j = 0; j < raw.length; j++) {
        if (isLiveAggroMob(raw[j])) mobs.push(raw[j]);
      }
      if (mobs.length === 0) {
        delete liveByTarget[tid];
        continue;
      }
      liveByTarget[tid] = mobs;
      threatStickyById.set(tid, {
        until: now + THREAT_STICKY_MS,
        mobs,
        name: resolveName(tid)
      });
    }
    const out = {};
    const liveKeys = Object.keys(liveByTarget);
    for (let i = 0; i < liveKeys.length; i++) {
      out[liveKeys[i]] = liveByTarget[liveKeys[i]];
    }
    const stickyIds = Array.from(threatStickyById.keys());
    for (let i = 0; i < stickyIds.length; i++) {
      const tid = stickyIds[i];
      const sticky = threatStickyById.get(tid);
      if (!sticky) continue;
      if (now > sticky.until) {
        threatStickyById.delete(tid);
        continue;
      }
      if (!out[tid]) {
        out[tid] = sticky.mobs;
      }
    }
    return out;
  }
  function sortThreatTargetIds(targetIds, observingId, nameOf) {
    const ids = targetIds.slice();
    ids.sort((a, b) => {
      if (observingId) {
        if (a === observingId) return -1;
        if (b === observingId) return 1;
      }
      const na = nameOf(a);
      const nb = nameOf(b);
      const cmp = na.localeCompare(nb);
      if (cmp !== 0) return cmp;
      return a.localeCompare(b);
    });
    return ids;
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
  function chipOpacity(dead) {
    if (dead) return 0.42;
    return 1;
  }
  function Players(props) {
    const React = getReact();
    const [buffMode, setBuffMode] = React.useState(
      () => getSettings().partyBuffMode || "auto"
    );
    const parties = partyGroups(props.entities);
    const byTarget = aggroByTarget(props.entities);
    const observing = props.observing;
    const visibleChipCount = playersList(props.entities).length;
    const sharedMode = buffMode === "shared";
    const cycleBuffMode = () => {
      const next = nextPartyBuffMode(buffMode);
      setBuffMode(patchSettings({ partyBuffMode: next }).partyBuffMode);
    };
    const buffsButton = parties.length ? e(
      "button",
      {
        type: "button",
        className: "ecu-roster-buffs",
        title: partyBuffModeTitle(buffMode),
        onClick: cycleBuffMode,
        style: {
          cursor: "pointer",
          fontSize: TYPE.secondaryMin,
          lineHeight: "1.2",
          padding: "3px 8px",
          minHeight: "26px",
          border: "1px solid #444",
          background: "#161616",
          color: "#ccc",
          ...PIXEL_TEXT
        }
      },
      `Buffs: ${partyBuffModeLabel(buffMode)}`
    ) : null;
    return e(
      "div",
      {
        className: "ecu-roster" + (props.layoutEdit ? " is-layout-edit" : ""),
        style: {
          padding: "4px",
          display: "flex",
          gap: "6px",
          flexDirection: "column",
          maxWidth: "min(560px, 78vw)",
          position: "relative"
        }
      },
      // Absolute overlay — must not reserve header row height when idle.
      buffsButton,
      !parties.length ? e(
        "div",
        {
          className: "ecu-roster-header",
          style: {
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "2px"
          }
        },
        e(
          "div",
          {
            style: {
              color: "#aaa",
              fontSize: TYPE.secondary,
              ...PIXEL_TEXT
            }
          },
          "No parties in vision"
        )
      ) : null,
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
                fontSize: TYPE.secondary,
                color: "#ccc",
                background: "rgba(0,0,0,0.55)",
                display: "inline-block",
                padding: "2px 6px",
                marginBottom: "4px",
                ...PIXEL_TEXT
              }
            },
            party[0] || "(no party)"
          ),
          sharedMode ? e(SharedPartyEffects, {
            key: `shared-${party[0] || "solo"}`,
            members: party[1],
            iconSize: 22,
            maxVisible: 8
          }) : null,
          e(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap",
                // flex-start: chips without EffectsRow must not stretch to match buffs.
                alignItems: "flex-start",
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
              const dead = isActuallyDead(player);
              const aggroTitle = hasAggro ? `Aggro: ${aggroMobs.length} mob${aggroMobs.length === 1 ? "" : "s"}` : "";
              const controlEntity = observed && observing && typeof observing.fear === "number" ? { ...player, fear: observing.fear } : player;
              const controlStates = getControlStates(controlEntity);
              const controlTint = controlBorderTint(controlStates);
              const controlTitle = controlStates.map(
                (s) => s.kind === "fear" ? `${s.label} (fear ${s.fear})` : s.label
              ).join(" \xB7 ");
              const nameTitle = [
                `${player.name || player.id}`,
                observed ? "Observing" : "",
                dead ? "Dead" : "",
                controlTitle,
                aggroTitle
              ].filter(Boolean).join(" \xB7 ");
              let outline;
              if (hasAggro) outline = "1px solid #e05555";
              else if (controlTint) outline = `1px solid ${controlTint}`;
              else if (observed) outline = "1px solid #e13758";
              else if (selected) outline = "1px solid #fff";
              const showBuffs = showUnderChipBuffs(
                buffMode,
                visibleChipCount,
                observed
              );
              const maxVisible = underChipBuffMaxVisible(buffMode);
              return e(
                "div",
                {
                  key: pid,
                  className: "ecu-chip" + (selected ? " is-selected" : "") + (observed ? " is-observed" : "") + (hasAggro ? " has-aggro" : "") + (controlStates.length ? " has-control" : "") + (dead ? " is-rip" : ""),
                  title: nameTitle,
                  style: {
                    position: "relative",
                    flex: "0 0 auto",
                    width: "168px",
                    background: "transparent",
                    cursor: "pointer",
                    overflow: "visible",
                    boxSizing: "border-box",
                    opacity: chipOpacity(dead)
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
                e(ControlBadge, {
                  states: controlStates,
                  compact: true,
                  iconSize: 16
                }),
                e(
                  "div",
                  {
                    style: {
                      position: "relative",
                      height: "26px",
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
                        fontSize: TYPE.name,
                        letterSpacing: "0.04em",
                        lineHeight: 1,
                        color: "#fff",
                        pointerEvents: "none",
                        ...PIXEL_TEXT
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
                      minWidth: AGGRO_BADGE.minWidth,
                      height: AGGRO_BADGE.height,
                      padding: `0 ${AGGRO_BADGE.padX}`,
                      boxSizing: "border-box",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#8a1e1e",
                      border: "1px solid #e05555",
                      color: "#ffd0d0",
                      fontSize: AGGRO_BADGE.fontSize,
                      lineHeight: 1,
                      ...PIXEL_TEXT,
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
                showBuffs ? e(EffectsRow, {
                  key: `fx-${pid}`,
                  entity: player,
                  iconSize: 22,
                  compact: true,
                  maxVisible
                }) : null
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
          fontSize: TYPE.chrome,
          lineHeight: 1.25,
          color: "#eee",
          ...PIXEL_TEXT
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

  // src/crypt/labels.ts
  var CRYPT_MOB_LABELS = {
    a1: "Spike",
    a2: "Bill",
    a3: "Lestat",
    a4: "Orlok",
    a5: "Elena",
    a6: "Marceline",
    a7: "Lucinda",
    a8: "Angel",
    vbat: "Vampireling",
    nerfedbat: "Bat"
  };
  function getCryptMobLabel(mtype) {
    return CRYPT_MOB_LABELS[mtype] || mtype;
  }

  // src/ui/frames/CryptProgress.ts
  var CRYPT_BAT_MTYPES = CRYPT_IMPORTANT_MOBS_MTYPES.filter(
    (mtype) => CRYPT_BOSSES_MTYPES.indexOf(mtype) < 0
  );
  var CARD_ICON_SIZE = 20;
  function findVisibleMob(entities, mtype) {
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (!entity) continue;
      if (entity.type !== "monster" || !entity.visible || entity.dead) continue;
      if (entity.mtype === mtype) return entity;
    }
    return void 0;
  }
  function wrapIconHtml(html) {
    return e("div", {
      style: { display: "inline-block", lineHeight: 0, fontSize: 0, flexShrink: 0 },
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
  var CARD_STYLE_BASE = {
    background: "black",
    padding: "4px 6px",
    minWidth: "72px",
    boxSizing: "border-box",
    fontSize: TYPE.chrome,
    lineHeight: 1.25,
    color: "#eee",
    ...PIXEL_TEXT
  };
  var META_STYLE = {
    fontSize: TYPE.secondary,
    color: "#ccc",
    ...PIXEL_TEXT
  };
  var SECTION_LABEL_STYLE = {
    fontSize: TYPE.secondary,
    color: "#888",
    padding: "2px 4px 0",
    ...PIXEL_TEXT
  };
  var PANEL_SHELL = {
    display: "flex",
    flexDirection: "column",
    margin: "4px",
    border: "2px double gray",
    background: "black",
    gap: "4px",
    fontSize: TYPE.chrome,
    opacity: 0.78,
    ...PIXEL_TEXT,
    ...CRYPT_PANEL_STYLE
  };
  function formatBossDeathStatus(boss) {
    const ago = boss.deathEventTimestamp != null ? formatTime((Date.now() - boss.deathEventTimestamp) / 1e3) : "?";
    if (boss.deadCount > 1) {
      return `Died \xB7 #${boss.deadCount} \xB7 ${ago} ago`;
    }
    return `Died ${ago} ago`;
  }
  function CryptCard(props) {
    const React = getReact();
    const displayName = getCryptMobLabel(props.mtype);
    const clickable = !!props.onClick;
    const iconHtml = React.useMemo(
      () => props.dummy ? "" : monsterSprite(props.mtype, { size: CARD_ICON_SIZE }),
      [props.mtype, props.dummy]
    );
    const icon = iconHtml ? wrapIconHtml(iconHtml) : null;
    return e(
      "div",
      {
        key: props.mtype,
        style: Object.assign({}, CARD_STYLE_BASE, {
          border: `2px double ${props.borderColor}`,
          cursor: clickable ? "pointer" : void 0,
          opacity: props.dummy ? 0.85 : void 0
        }),
        title: clickable ? "Click to target" : props.mtype,
        onClick: props.onClick
      },
      e(
        "div",
        {
          key: "nameRow",
          style: {
            display: "flex",
            alignItems: "center",
            gap: "4px",
            minWidth: 0
          }
        },
        icon,
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
          `${displayName}${props.levelComponent}`
        )
      ),
      e("div", { key: "state", style: META_STYLE }, props.status),
      props.lastSeenComponent ? e("div", { key: "lastSeen", style: META_STYLE }, props.lastSeenComponent) : void 0,
      props.focusComponent ? e("div", { key: "focus", style: META_STYLE }, props.focusComponent) : void 0,
      props.luckmComponent ? e("div", { key: "luckm", style: META_STYLE }, props.luckmComponent) : void 0
    );
  }
  function CryptProgressLayoutDummy() {
    return e(
      "div",
      {
        className: "comm-crypt-progress comm-crypt-progress-dummy",
        style: PANEL_SHELL
      },
      e(
        "div",
        {
          style: {
            padding: "5px 8px 0",
            whiteSpace: "nowrap",
            fontSize: TYPE.title,
            color: "#ccc",
            ...PIXEL_TEXT
          }
        },
        "Crypt"
      ),
      e(
        "div",
        {
          key: "content",
          style: {
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            padding: "0 4px 4px"
          }
        },
        e("div", { key: "bosses-label", style: SECTION_LABEL_STYLE }, "Bosses"),
        e(
          "div",
          {
            key: "bosses",
            style: { display: "flex", flexWrap: "wrap", gap: "4px" }
          },
          e(CryptCard, {
            key: "a1",
            mtype: "a1",
            borderColor: "yellow",
            levelComponent: " (10 lvl)",
            status: "Alive",
            lastSeenComponent: "We see!",
            focusComponent: null,
            luckmComponent: null,
            dummy: true
          }),
          e(CryptCard, {
            key: "a2",
            mtype: "a2",
            borderColor: "gray",
            levelComponent: "",
            status: "Died \xB7 #2 \xB7 3m ago",
            lastSeenComponent: null,
            focusComponent: null,
            luckmComponent: "luckm: 0.125",
            dummy: true
          })
        ),
        e("div", { key: "bats-label", style: SECTION_LABEL_STYLE }, "Bats"),
        e(
          "div",
          {
            key: "bats",
            style: { display: "flex", flexWrap: "wrap", gap: "4px" }
          },
          e(CryptCard, {
            key: "vbat",
            mtype: "vbat",
            borderColor: "red",
            levelComponent: "",
            status: "Died: 1",
            lastSeenComponent: null,
            focusComponent: null,
            luckmComponent: null,
            dummy: true
          }),
          e(CryptCard, {
            key: "nerfedbat",
            mtype: "nerfedbat",
            borderColor: "gray",
            levelComponent: "",
            status: "Died: 0",
            lastSeenComponent: null,
            focusComponent: null,
            luckmComponent: null,
            dummy: true
          })
        )
      )
    );
  }
  function buildCryptCard(mtype, props, currentlySeeMtypes, aggroedMtypes, instanceData) {
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
          status = formatBossDeathStatus(boss);
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
            if (focusMtype) {
              focusComponent = `Focus: ${getCryptMobLabel(focusMtype)}`;
            }
          }
        }
        if (boss.lastSeenLevel != null) {
          levelComponent = ` (${boss.lastSeenLevel} lvl)`;
        }
      } else {
        status = `Died: ${mobRichData.deadCount}`;
      }
    }
    let onClick;
    if (props.setSelectedEntity && currentlySeeMtypes.has(mtype)) {
      const visibleMob = findVisibleMob(props.entities, mtype);
      if (visibleMob) {
        onClick = () => {
          setXTarget(visibleMob);
          props.setSelectedEntity(String(visibleMob.id));
        };
      }
    }
    return e(CryptCard, {
      key: mtype,
      mtype,
      borderColor,
      levelComponent,
      status,
      lastSeenComponent,
      focusComponent,
      luckmComponent,
      onClick
    });
  }
  function renderMobSection(label, mtypes, props, currentlySeeMtypes, aggroedMtypes, instanceData) {
    const cards = [];
    for (let i = 0; i < mtypes.length; i++) {
      cards.push(
        buildCryptCard(
          mtypes[i],
          props,
          currentlySeeMtypes,
          aggroedMtypes,
          instanceData
        )
      );
    }
    return [
      e("div", { key: `${label}-label`, style: SECTION_LABEL_STYLE }, label),
      e(
        "div",
        {
          key: label,
          style: { display: "flex", flexWrap: "wrap", gap: "4px" }
        },
        ...cards
      )
    ];
  }
  function CryptProgress(props) {
    const mapName = getMapData(props.entities);
    const onCrypt = !!(mapName && mapName.map === "crypt");
    if (!onCrypt) {
      if (!props.layoutEdit) return null;
      return e(CryptProgressLayoutDummy);
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
    return e(
      "div",
      {
        className: "comm-crypt-progress",
        style: {
          display: "flex",
          flexDirection: "column",
          margin: "4px",
          border: "2px double gray",
          background: "black",
          gap: "4px",
          fontSize: TYPE.chrome,
          ...PIXEL_TEXT
        }
      },
      e(
        "div",
        {
          style: {
            padding: "5px 8px 0",
            whiteSpace: "nowrap",
            fontSize: TYPE.title,
            color: "#ccc",
            ...PIXEL_TEXT
          }
        },
        "Crypt"
      ),
      e(
        "div",
        {
          key: "content",
          style: {
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            padding: "0 4px 4px"
          }
        },
        ...renderMobSection(
          "Bosses",
          CRYPT_BOSSES_MTYPES,
          props,
          currentlySeeMtypes,
          aggroedMtypes,
          instanceData
        ),
        ...renderMobSection(
          "Bats",
          CRYPT_BAT_MTYPES,
          props,
          currentlySeeMtypes,
          aggroedMtypes,
          instanceData
        )
      )
    );
  }

  // src/ui/frames/ServerInfo.ts
  var chipStyle = {
    background: "rgba(0, 0, 0, 0.82)",
    border: "1px solid #555",
    padding: "4px 8px",
    fontSize: TYPE.chrome,
    lineHeight: 1.25,
    color: "#eee",
    whiteSpace: "nowrap",
    ...PIXEL_TEXT
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
    const serverLabel2 = `${region} ${ident}`.trim() || "\u2014";
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
              fontSize: TYPE.chromeMeta,
              color: "#f2f2f2",
              letterSpacing: "0.02em"
            }
          },
          serverLabel2
        ),
        e(
          "div",
          {
            style: {
              fontSize: TYPE.chromeMeta,
              color: "#85c76b",
              fontVariantNumeric: "tabular-nums"
            }
          },
          getALServerTime(timeOffset) + (night ? " night" : " day")
        )
      ),
      ...events.map((event) => {
        var _a2, _b2;
        const live2 = !!((_a2 = event[1]) == null ? void 0 : _a2.live);
        const until = ((_b2 = event[1]) == null ? void 0 : _b2.event) ? getTimeUntil(event[1].event) : "";
        return e(
          "div",
          {
            key: event[0],
            style: {
              ...chipStyle,
              borderColor: live2 ? "#85c76b" : "#555"
            }
          },
          e(
            "div",
            {
              style: {
                fontSize: TYPE.chromeMeta,
                color: live2 ? "#b6e3a4" : "#eee"
              }
            },
            event[0]
          ),
          e(
            "div",
            {
              style: {
                fontSize: TYPE.chromeMeta,
                color: live2 ? "#85c76b" : "rgba(255,255,255,0.55)",
                fontVariantNumeric: "tabular-nums"
              }
            },
            live2 ? "live" : until
          )
        );
      })
    );
  }

  // src/ui/frames/Enemies.ts
  function hpPctRaw(entity) {
    const max = entity.max_hp || 1;
    return Math.max(0, Math.min(100, (entity.hp || 0) / max * 100));
  }
  function hpBucket(entity) {
    return Math.round(hpPctRaw(entity) / 5) * 5;
  }
  function groupIdenticalEnemies(enemies) {
    const buckets = {};
    const order = [];
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      const mtype = enemy.mtype || "?";
      const key = `${mtype}@${hpBucket(enemy)}`;
      if (!buckets[key]) {
        buckets[key] = [];
        order.push(key);
      }
      buckets[key].push(enemy);
    }
    const groups = [];
    for (let i = 0; i < order.length; i++) {
      const key = order[i];
      const members = buckets[key];
      let focus = members[0];
      let lowest = hpPctRaw(focus);
      for (let j = 1; j < members.length; j++) {
        const pct = hpPctRaw(members[j]);
        if (pct < lowest) {
          lowest = pct;
          focus = members[j];
        }
      }
      groups.push({
        key,
        members,
        focus,
        hpPct: Math.round(lowest)
      });
    }
    return groups;
  }
  function groupContainsId(group, id) {
    if (id == null) return false;
    const tid = String(id);
    for (let i = 0; i < group.members.length; i++) {
      if (String(group.members[i].id) === tid) return true;
    }
    return false;
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
    const groups = groupIdenticalEnemies(importantEnemies);
    const maxGroupsToShow = 10;
    const shown = groups.slice(0, maxGroupsToShow);
    let moreEnemiesCount = 0;
    for (let i = maxGroupsToShow; i < groups.length; i++) {
      moreEnemiesCount += groups[i].members.length;
    }
    const squashKeys = Object.keys(squashEnemiesCounts);
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
            fontSize: TYPE.secondary,
            color: "#ccc",
            background: "rgba(0,0,0,0.55)",
            display: "inline-block",
            padding: "3px 8px",
            alignSelf: "flex-end",
            ...PIXEL_TEXT
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
        ...shown.map((group) => {
          const focus = group.focus;
          const count = group.members.length;
          const selected = groupContainsId(group, props.selectedEntity);
          const label = focus.name || focus.mtype || focus.id;
          return e(
            "div",
            {
              key: group.key,
              style: {
                position: "relative",
                flex: "0 0 auto",
                width: "168px",
                cursor: "pointer",
                overflow: "hidden",
                boxSizing: "border-box"
              },
              onClick: () => {
                setXTarget(focus);
                props.setSelectedEntity(focus.id);
              }
            },
            e(
              "div",
              {
                style: {
                  position: "relative",
                  height: "26px",
                  overflow: "hidden",
                  background: "rgba(0,0,0,0.45)",
                  outline: selected ? "1px solid #fff" : void 0
                }
              },
              e("div", {
                style: {
                  display: "block",
                  height: "100%",
                  width: `${group.hpPct}%`,
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
                    gap: "4px",
                    padding: "0 7px",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                    fontSize: TYPE.name,
                    letterSpacing: "0.04em",
                    lineHeight: 1,
                    color: "#ffd0d0",
                    pointerEvents: "none",
                    ...PIXEL_TEXT
                  }
                },
                e(
                  "span",
                  {
                    style: {
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      ...PIXEL_TEXT
                    }
                  },
                  label
                ),
                count > 1 ? e(
                  "span",
                  {
                    style: {
                      flexShrink: 0,
                      fontSize: TYPE.count,
                      color: "#ffe8e8",
                      ...PIXEL_TEXT
                    }
                  },
                  `\xD7${count}`
                ) : void 0
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
              padding: "3px 8px",
              fontSize: TYPE.secondaryMin,
              color: "#aaa",
              ...PIXEL_TEXT
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
            padding: "3px 8px",
            fontSize: TYPE.secondaryMin,
            color: "#aaa",
            ...PIXEL_TEXT
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
    var _a, _b, _c, _d;
    if (!slot || !slot.name) return "";
    return `${slot.name}|${(_a = slot.level) != null ? _a : ""}|${(_b = slot.q) != null ? _b : ""}|${(_c = slot.price) != null ? _c : ""}|${(_d = slot.skin) != null ? _d : ""}`;
  }
  function slotsFingerprint(slots) {
    if (!slots) return "";
    const keys = Object.keys(slots);
    keys.sort();
    const parts = [];
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      parts.push(`${k}:${slotKey(slots[k])}`);
    }
    return parts.join(";");
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
              fontSize: TYPE.microMin,
              padding: "2px",
              ...PIXEL_TEXT
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
    const onSlotPress = clickable ? (ev) => {
      if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
      if (ev && typeof ev.preventDefault === "function") ev.preventDefault();
      setXTarget(entity);
      info.openItem(entity, slotName, slot);
    } : void 0;
    return e(
      "div",
      {
        key: slotName,
        className: "comm-gear-slot" + (clickable ? " is-clickable" : ""),
        "data-slot": slotName,
        [INFO_SOURCE_ATTR]: clickable ? "" : void 0,
        title: clickable ? slot.name : slotName,
        onPointerDown: onSlotPress,
        onMouseDown: clickable ? (ev) => {
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
            minWidth: "18px",
            height: "18px",
            padding: "0 4px",
            boxSizing: "border-box",
            background: "#3a2a10",
            border: "1px solid #c9a227",
            color: "#ffe08a",
            fontSize: TYPE.microMin,
            lineHeight: "16px",
            textAlign: "center",
            ...PIXEL_TEXT,
            pointerEvents: "none"
          }
        },
        "\u0394"
      ) : null,
      showPrice && (slot == null ? void 0 : slot.price) != null ? e(
        "div",
        { style: { fontSize: TYPE.micro, color: "#ffd700", ...PIXEL_TEXT } },
        String(slot.price)
      ) : null
    );
  }
  function GearGrid(props) {
    const React = getReact();
    const slots = props.entity.slots;
    if (!slots) return null;
    const entityId = props.entity.id != null ? String(props.entity.id) : "";
    const compareId = props.compareTo && props.compareTo.id != null ? String(props.compareTo.id) : "";
    const fp = entityId + "|" + compareId + "|" + slotsFingerprint(slots) + "|" + slotsFingerprint(props.compareTo && props.compareTo.slots);
    return React.useMemo(() => {
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
            (row2, ri) => e(
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
              ...row2.map(
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
                fontSize: TYPE.micro,
                color: "#888",
                marginBottom: "2px",
                letterSpacing: "0.04em",
                ...PIXEL_TEXT
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
    }, [fp]);
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
          fontSize: TYPE.body,
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
            fontSize: TYPE.secondary,
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
          fontSize: TYPE.body,
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
            fontSize: TYPE.body,
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
          { style: { fontSize: TYPE.secondary, color: "#666" } },
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
              fontSize: TYPE.body,
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
                fontSize: TYPE.body,
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
              fontSize: TYPE.title,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              ...PIXEL_TEXT
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
              fontSize: "18px",
              ...PIXEL_TEXT
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
              fontSize: TYPE.body,
              color: "#bdbdbd",
              ...PIXEL_TEXT
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
                fontSize: TYPE.body,
                color: "#888",
                marginBottom: "6px",
                letterSpacing: "0.04em",
                ...PIXEL_TEXT
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
          { style: { fontSize: TYPE.secondary, color: "#777", marginBottom: "4px" } },
          props.hint
        ) : null,
        ...rowEls
      )
    );
  }

  // src/ui/frames/InfoDialogPanel.ts
  function isOpen2(kind) {
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
    const [open, setOpen] = React.useState(isOpen2(kind));
    const onOpenChange = props.onOpenChange;
    React.useEffect(() => {
      if (onOpenChange) onOpenChange(open);
    }, [open, onOpenChange]);
    React.useEffect(() => {
      const slot = slotRef.current;
      if (!slot) return;
      const dialog = adoptInfoDialog2(kind, slot);
      setOpen(isOpen2(kind));
      const unsub2 = subscribeInfoDialogChange((k, next) => {
        if (k === kind) setOpen(next);
      });
      if (typeof MutationObserver !== "function") {
        return () => unsub2();
      }
      const obs = new MutationObserver(() => {
        setOpen(isOpen2(kind));
      });
      obs.observe(dialog, {
        childList: true,
        subtree: true,
        characterData: true
      });
      return () => {
        obs.disconnect();
        unsub2();
      };
    }, [kind]);
    const meta = LABELS[kind];
    const showDummy = !!props.layoutEdit && !open;
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
          pointerEvents: open ? "auto" : "none"
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
        // Do not collapse to height:0 — jQuery injects HTML before React's
        // open-state update; clipping hid gear/buff info after the split.
        style: {
          display: "block",
          overflow: "visible",
          minHeight: 0
        }
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
    const hpPct2 = maxHp > 0 ? hp / maxHp : 0;
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
            width: getPercent(hpPct2, 1),
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
      effectsCompact,
      effectsMaxVisible,
      effectsIconSize,
      effectsOverlay = false,
      showMp = true,
      threatCount = 0,
      aggroLabel,
      aggroHot = false
    } = props;
    const controlStates = getControlStates(entity);
    const controlTint = controlBorderTint(controlStates);
    const name = `${(_a = entity.level) != null ? _a : 1} ${entity.name || entity.id}` + (entity.type === "monster" ? ` #${entity.id}` : "");
    const threatSpark = threatCount > 0 ? e(
      "span",
      {
        className: "comm-threat-spark",
        title: `Threat: ${threatCount} mob${threatCount === 1 ? "" : "s"} on you`,
        style: {
          flexShrink: 0,
          minWidth: AGGRO_BADGE.minWidth,
          height: AGGRO_BADGE.height,
          padding: `0 ${AGGRO_BADGE.padX}`,
          boxSizing: "border-box",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#8a1e1e",
          border: "1px solid #e05555",
          color: "#ffd0d0",
          fontSize: AGGRO_BADGE.fontSize,
          lineHeight: 1,
          ...PIXEL_TEXT
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
          overflow: "hidden",
          flex: "1 1 auto"
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
    const aggroChip = aggroLabel != null && aggroLabel !== "" ? e(
      "span",
      {
        className: "comm-boss-aggro",
        title: aggroHot ? "Aggro on you" : aggroLabel,
        style: {
          flex: "0 1 auto",
          minWidth: 0,
          maxWidth: "42%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          padding: "1px 6px",
          boxSizing: "border-box",
          background: aggroHot ? "rgba(138,30,30,0.85)" : "rgba(0,0,0,0.45)",
          border: aggroHot ? "1px solid #e05555" : "1px solid #555",
          color: aggroHot ? "#ffd0d0" : "#bbb",
          fontSize: TYPE.secondary,
          lineHeight: "1.2",
          ...PIXEL_TEXT
        }
      },
      aggroLabel
    ) : null;
    const trailingEl = trailing != null ? e(
      "span",
      {
        style: {
          fontSize: TYPE.nameLg,
          opacity: 0.95,
          flexShrink: 0,
          ...PIXEL_TEXT
        }
      },
      trailing
    ) : null;
    const label = trailingEl || aggroChip ? e(
      "span",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          gap: "8px",
          width: "100%",
          alignItems: "center",
          minWidth: 0
        }
      },
      nameBlock,
      aggroChip,
      trailingEl
    ) : nameBlock;
    const effectsRow = showEffects ? e(EffectsRow, {
      key: `fx-${String(entity.id)}`,
      entity,
      compact: !!effectsCompact,
      maxVisible: effectsMaxVisible,
      iconSize: effectsIconSize
    }) : null;
    const effectsSlot = effectsRow == null ? null : effectsOverlay ? e(
      "div",
      {
        className: "comm-fx-overlay",
        style: {
          position: "absolute",
          left: 0,
          right: 0,
          top: "100%",
          width: "100%",
          boxSizing: "border-box",
          pointerEvents: "auto",
          zIndex: 1
        }
      },
      effectsRow
    ) : effectsRow;
    const controlBadge = e(ControlBadge, {
      states: controlStates,
      compact: false,
      iconSize: 20
    });
    return e(
      "div",
      {
        className: "comm-unit" + (effectsOverlay ? " has-fx-overlay" : "") + (controlStates.length ? " has-control" : ""),
        style: {
          display: "flex",
          width: "100%",
          flexDirection: "column",
          minWidth: 0,
          // Overlay row is out of flow; skip flex gap so vitals hug the panel edge.
          gap: effectsOverlay ? 0 : "6px",
          position: "relative",
          overflow: effectsOverlay ? "visible" : void 0,
          outline: controlTint ? `1px solid ${controlTint}` : void 0,
          outlineOffset: controlTint ? "1px" : void 0
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
      controlBadge,
      effectsSlot
    );
  }

  // src/ui/chrome/FrameDummy.ts
  var DUMMY_FX_COLORS = ["#4a7a4a", "#7a4a4a", "#4a5a7a", "#7a6a3a"];
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
                    minWidth: 0,
                    flex: "1 1 auto"
                  }
                },
                `1 ${name}`
              ),
              props.showAggroInBar ? e(
                "span",
                {
                  className: "comm-boss-aggro",
                  style: {
                    flex: "0 1 auto",
                    minWidth: 0,
                    maxWidth: "42%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    padding: "1px 6px",
                    boxSizing: "border-box",
                    background: "rgba(0,0,0,0.45)",
                    border: "1px solid #555",
                    color: "#bbb",
                    fontSize: TYPE.secondary,
                    lineHeight: "1.2",
                    ...PIXEL_TEXT
                  }
                },
                "Aggro \xB7 Tank"
              ) : null,
              e(
                "span",
                {
                  style: {
                    fontSize: TYPE.body,
                    opacity: 0.75,
                    flexShrink: 0,
                    color: "#aaa",
                    ...PIXEL_TEXT
                  }
                },
                props.label
              )
            )
          )
        ),
        props.showMp !== false ? e(
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
        ) : null
      ),
      props.showEffectsPlaceholder ? e(
        "div",
        {
          className: "comm-fx-row is-compact",
          style: {
            display: "flex",
            flexDirection: "row",
            flexWrap: "nowrap",
            alignItems: "flex-start",
            gap: "3px",
            marginTop: "3px",
            width: "100%",
            minHeight: "30px",
            paddingBottom: "2px",
            boxSizing: "border-box",
            overflow: "hidden"
          }
        },
        ...DUMMY_FX_COLORS.map(
          (bg, i) => e("div", {
            key: `dummy-fx-${i}`,
            style: {
              flex: "0 0 auto",
              width: "22px",
              height: "22px",
              background: bg,
              border: "1px solid #555",
              boxSizing: "border-box"
            }
          })
        ),
        e(
          "div",
          {
            className: "comm-fx-overflow",
            style: {
              flex: "0 0 auto",
              minWidth: "18px",
              height: "22px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(20,20,20,0.9)",
              border: "1px solid #555",
              color: "#ccc",
              fontSize: TYPE.badge,
              lineHeight: 1,
              ...PIXEL_TEXT,
              boxSizing: "border-box"
            }
          },
          "+2"
        )
      ) : null
    );
  }

  // src/ui/frames/PlayerRow.ts
  var UNIT_FRAME_STYLE = {
    width: "min(360px, 45vw)",
    minWidth: "280px",
    // Effects overlay hangs below vitals — do not clip, and do not pad a
    // permanent empty strip (that would shift bc-anchored HP bars upward).
    overflow: "visible",
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
        effectsOverlay: true,
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

  // src/ui/frames/TargetFrame.ts
  function targetTrailing(observing, target) {
    const dps = getDps();
    const hpPct2 = getPercent((target.hp || 0) / (target.max_hp || 1), 1);
    const ttk = estimateTtk(target.hp, dps);
    const dist = distance(observing, target);
    const oor = outOfRange(observing, target);
    const diff = difficultyBadge(target);
    const parts = [hpPct2];
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
        effectsOverlay: true,
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
          hpColor: "#8a2a2a",
          showMp: false,
          showEffectsPlaceholder: true,
          showAggroInBar: true
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
        const aggroLabel = onMe ? "Aggro \xB7 you" : aggro ? `Aggro \xB7 ${aggro}` : "Aggro \xB7 \u2014";
        return e(
          "div",
          {
            key: `boss-${String(boss.id)}`,
            style: {
              display: "flex",
              flexDirection: "column",
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
            showEffects: true,
            effectsCompact: true,
            effectsIconSize: 22,
            // 0 = show all (EffectsRow wraps; no +N overflow chip).
            effectsMaxVisible: 0,
            trailing: pct,
            threatCount: onMe ? 1 : 0,
            aggroLabel,
            aggroHot: onMe,
            onSelect: (id) => {
              setXTarget(boss);
              props.setSelectedEntity(id);
            }
          })
        );
      })
    );
  }

  // src/ui/frames/ThreatTable.ts
  var MOB_ICON_SIZE = 22;
  var MAX_MOB_CHIPS = 6;
  function countByMtype(mobs) {
    const counts = {};
    for (let i = 0; i < mobs.length; i++) {
      const mt = mobs[i].mtype || "?";
      counts[mt] = (counts[mt] || 0) + 1;
    }
    const rows = [];
    const keys = Object.keys(counts);
    for (let i = 0; i < keys.length; i++) {
      rows.push({ mtype: keys[i], count: counts[keys[i]] });
    }
    rows.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.mtype.localeCompare(b.mtype);
    });
    return rows;
  }
  function wrapIconHtml2(html) {
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
  function MobChip(props) {
    const React = getReact();
    const { mtype, count } = props;
    const title = `${count}\xD7${mtype}`;
    const html = React.useMemo(
      () => monsterSprite(mtype, { size: MOB_ICON_SIZE }),
      [mtype]
    );
    let icon = null;
    if (html) icon = wrapIconHtml2(html);
    const countBadge = e(
      "span",
      {
        style: {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "22px",
          height: "20px",
          padding: "0 5px",
          boxSizing: "border-box",
          background: "rgba(80,20,20,0.95)",
          border: "1px solid #a44",
          color: "#ffe8e8",
          fontSize: TYPE.count,
          lineHeight: 1,
          ...PIXEL_TEXT
        }
      },
      `\xD7${count}`
    );
    if (!icon) {
      return e(
        "span",
        {
          title,
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "2px 6px",
            background: "rgba(40,20,20,0.9)",
            border: "1px solid #633",
            color: "#eee",
            fontSize: TYPE.badge,
            lineHeight: 1.2,
            ...PIXEL_TEXT,
            whiteSpace: "nowrap"
          }
        },
        `${count}\xD7${mtype}`
      );
    }
    return e(
      "span",
      {
        title,
        style: {
          display: "inline-flex",
          alignItems: "flex-end",
          gap: "3px",
          position: "relative",
          flexShrink: 0
        }
      },
      icon,
      countBadge
    );
  }
  function fmtRate2(n) {
    if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k`;
    return String(Math.round(n));
  }
  function pressureTrailing(target, tid) {
    const parts = [];
    if (target && target.max_hp) {
      parts.push(getPercent((target.hp || 0) / (target.max_hp || 1), 0));
    }
    const incoming = getIncomingDps(tid);
    if (incoming > 0) {
      parts.push(`${fmtRate2(incoming)}/s`);
      const ttk = estimateTtk(target == null ? void 0 : target.hp, incoming);
      if (ttk != null && ttk < 600) {
        parts.push(`TTK ${formatTime(ttk)}`);
      }
    }
    return parts.join(" \xB7 ");
  }
  function ThreatRow(props) {
    const { tid, mobs, observingId, setSelectedEntity } = props;
    const target = findEntity(props.entities, tid);
    const name = (target == null ? void 0 : target.name) || tid;
    const isYou = tid === observingId;
    const mtypes = countByMtype(mobs);
    const shown = mtypes.slice(0, MAX_MOB_CHIPS);
    const overflow = mtypes.length - shown.length;
    const trailing = pressureTrailing(target, tid);
    const hpColor = classColors[(target == null ? void 0 : target.ctype) || ""] || (isYou ? "#8a1e1e" : "#666");
    const aggroBadge = e(
      "span",
      {
        className: "comm-threat-spark",
        title: `${mobs.length} mob${mobs.length === 1 ? "" : "s"} aggroed`,
        style: {
          flexShrink: 0,
          minWidth: AGGRO_BADGE.minWidth,
          height: AGGRO_BADGE.height,
          padding: `0 ${AGGRO_BADGE.padX}`,
          boxSizing: "border-box",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#8a1e1e",
          border: "1px solid #e05555",
          color: "#ffd0d0",
          fontSize: AGGRO_BADGE.fontSize,
          lineHeight: 1,
          ...PIXEL_TEXT
        }
      },
      String(mobs.length)
    );
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
      aggroBadge,
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
    const trailingStyle = {
      fontSize: TYPE.secondary,
      opacity: 0.95,
      flexShrink: 0,
      ...PIXEL_TEXT,
      color: "#ddd"
    };
    const label = trailing ? e(
      "span",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          gap: "8px",
          width: "100%",
          alignItems: "center"
        }
      },
      nameBlock,
      e("span", { style: trailingStyle }, trailing)
    ) : nameBlock;
    const chips = e(
      "div",
      {
        style: {
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "5px",
          padding: "0 2px"
        }
      },
      ...shown.map(
        (row2) => e(MobChip, { key: row2.mtype, mtype: row2.mtype, count: row2.count })
      ),
      overflow > 0 ? e(
        "span",
        {
          style: {
            fontSize: TYPE.badge,
            color: "#bbb",
            ...PIXEL_TEXT
          },
          title: mtypes.slice(MAX_MOB_CHIPS).map((r) => `${r.count}\xD7${r.mtype}`).join(", ")
        },
        `+${overflow}`
      ) : null
    );
    const onSelect = target && setSelectedEntity ? () => {
      setXTarget(target);
      setSelectedEntity(String(target.id));
    } : void 0;
    const vitals = target ? e(
      VitalsColumn,
      {
        hp: target.hp || 0,
        maxHp: target.max_hp || 1,
        mp: target.mp,
        maxMp: target.max_mp,
        hpColor,
        showMp: true,
        nameStyle: {
          fontSize: TYPE.name,
          fontWeight: "normal"
        },
        onClick: onSelect
      },
      label
    ) : e(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          gap: "8px",
          padding: "4px 6px",
          fontSize: TYPE.name,
          ...PIXEL_TEXT,
          cursor: onSelect ? "pointer" : void 0
        },
        onClick: onSelect
      },
      nameBlock,
      trailing ? e("span", { style: trailingStyle }, trailing) : null
    );
    return e(
      "div",
      {
        key: tid,
        className: "comm-threat-row" + (isYou ? " is-you" : ""),
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "3px",
          padding: "3px 4px 5px",
          background: isYou ? "rgba(80,0,0,0.45)" : void 0,
          boxSizing: "border-box"
        }
      },
      vitals,
      chips
    );
  }
  function ThreatTable(props) {
    const nameOf = (tid) => {
      const ent = findEntity(props.entities, tid);
      return ent && ent.name || tid;
    };
    const byTarget = stickyAggroByTarget(
      aggroByTarget(props.entities),
      nameOf
    );
    const targetIds = sortThreatTargetIds(
      Object.keys(byTarget),
      props.observingId,
      nameOf
    );
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
    return e(
      "div",
      {
        className: "comm-threat-table",
        style: {
          display: "flex",
          overflow: "auto",
          flexDirection: "column",
          margin: "4px",
          border: "2px double gray",
          background: "black",
          gap: "2px",
          maxHeight: "280px",
          minWidth: "220px",
          fontSize: TYPE.name,
          ...PIXEL_TEXT
        }
      },
      e(
        "div",
        {
          style: {
            padding: "5px 8px 2px",
            whiteSpace: "nowrap",
            fontSize: TYPE.title,
            ...PIXEL_TEXT,
            color: "#ccc"
          }
        },
        "Threat"
      ),
      ...targetIds.map(
        (tid) => e(ThreatRow, {
          key: tid,
          tid,
          mobs: byTarget[tid],
          entities: props.entities,
          observingId: props.observingId,
          setSelectedEntity: props.setSelectedEntity
        })
      )
    );
  }

  // src/ui/frames/KillKpiPanel.ts
  var MOB_ICON_SIZE2 = 20;
  var LIST_ROW_HEIGHT = 30;
  var UNIT_COLOR = "#c8c8c8";
  var META_COLOR = "#b0b0b0";
  function partyLabel(key) {
    return key.indexOf("solo:") === 0 ? key.slice(5) : key;
  }
  function killWord(n) {
    return n === 1 ? "kill" : "kills";
  }
  function fmtCompact(n) {
    if (n >= 1e3) {
      const k = n / 1e3;
      const fixed = k >= 100 ? k.toFixed(0) : k.toFixed(1);
      return `${fixed.replace(/\.0$/, "")}k`;
    }
    return String(Math.round(n));
  }
  function fmtRate3(n) {
    if (n >= 1e3) return fmtCompact(n);
    if (n >= 100) return String(Math.round(n));
    return n.toFixed(1).replace(/\.0$/, "");
  }
  function wrapIconHtml3(html) {
    return e("div", {
      style: { display: "inline-block", lineHeight: 0, fontSize: 0, flexShrink: 0 },
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
  function metricCell(opts) {
    return e(
      "span",
      {
        key: opts.key,
        title: opts.title,
        style: {
          position: "relative",
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "baseline",
          gap: "2px",
          minWidth: opts.minWidth || "4.5ch",
          justifyContent: "flex-end",
          fontVariantNumeric: "tabular-nums",
          ...PIXEL_TEXT
        }
      },
      e(
        "span",
        {
          style: {
            fontSize: TYPE.count,
            color: "#eee",
            ...PIXEL_TEXT
          }
        },
        opts.value
      ),
      opts.unit ? e(
        "span",
        {
          style: {
            fontSize: TYPE.secondaryMin,
            color: UNIT_COLOR,
            ...PIXEL_TEXT
          }
        },
        opts.unit
      ) : null
    );
  }
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
      fontSize: TYPE.body,
      padding: "5px 8px",
      background: "#141414",
      color: "#eee",
      border: "1px solid #555",
      maxWidth: "200px",
      flex: "1 1 auto",
      minWidth: 0,
      ...PIXEL_TEXT
    };
    const resetBtn = e(
      "button",
      {
        type: "button",
        onClick: () => resetKillSession(),
        style: {
          cursor: "pointer",
          fontSize: TYPE.body,
          padding: "5px 10px",
          border: "1px solid #555",
          background: "#1a1a1a",
          color: "#ccc",
          flexShrink: 0,
          ...PIXEL_TEXT
        }
      },
      "Reset"
    );
    const title = e(
      "div",
      { style: { fontSize: TYPE.title, color: "#eee", ...PIXEL_TEXT } },
      "Kills"
    );
    const scopeRow = (showReset) => e(
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
        {
          style: {
            fontSize: TYPE.body,
            color: "#999",
            flexShrink: 0,
            ...PIXEL_TEXT
          }
        },
        "Scope"
      ),
      e(
        "select",
        {
          value: scope,
          style: selectStyle,
          onChange: (ev) => setKillScope(ev.target.value)
        },
        hasObserver ? e(
          "option",
          { value: "watched" },
          killScopeLabel("watched", stats.trackingName)
        ) : null,
        e("option", { value: "all" }, killScopeLabel("all"))
      ),
      showReset ? resetBtn : null
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
          maxHeight: "300px",
          minWidth: "300px",
          fontSize: TYPE.name,
          color: "#eee",
          ...PIXEL_TEXT
        }
      },
      ...children
    );
    if (!stats.active && scope === "watched") {
      return shell([
        title,
        scopeRow(false),
        e(
          "div",
          { style: { fontSize: TYPE.body, color: "#999", ...PIXEL_TEXT } },
          "Select a character to track, or switch to visible parties."
        )
      ]);
    }
    const elapsedSec = stats.sessionStartedAt ? (Date.now() - stats.sessionStartedAt) / 1e3 : 0;
    const kpm = stats.killsPerMinute;
    const kph = stats.killsPerHour;
    const kpd = stats.killsPerDay;
    const ratesReady = kph != null;
    const rateChip = (value, unit) => e(
      "div",
      {
        style: {
          flex: "1 1 0",
          minWidth: "64px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          padding: "8px 6px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid #444",
          ...PIXEL_TEXT
        }
      },
      e(
        "span",
        {
          style: {
            fontSize: TYPE.count,
            color: "#eee",
            lineHeight: 1.1,
            fontVariantNumeric: "tabular-nums",
            ...PIXEL_TEXT
          }
        },
        value != null ? fmtCompact(value) : "\u2014"
      ),
      e(
        "span",
        {
          style: {
            fontSize: TYPE.body,
            color: UNIT_COLOR,
            lineHeight: 1.1,
            letterSpacing: "0.04em",
            ...PIXEL_TEXT
          }
        },
        `/${unit}`
      )
    );
    const rateStrip = e(
      "div",
      {
        style: {
          display: "flex",
          gap: "6px",
          width: "100%"
        }
      },
      ...ratesReady ? [rateChip(kpm, "min"), rateChip(kph, "h"), rateChip(kpd, "d")] : [
        e(
          "div",
          {
            style: {
              flex: 1,
              padding: "8px",
              textAlign: "center",
              color: "#888",
              fontSize: TYPE.body,
              border: "1px solid #333",
              ...PIXEL_TEXT
            }
          },
          "Rates after first kill\u2026"
        )
      ]
    );
    const sessionLine = e(
      "div",
      {
        style: {
          fontSize: TYPE.body,
          color: "#aaa",
          ...PIXEL_TEXT
        }
      },
      `Session \xB7 ${stats.sessionStartedAt ? formatTime(elapsedSec) : "\u2014"}`
    );
    const hero = e(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "8px"
        }
      },
      e(
        "div",
        {
          style: {
            fontSize: "22px",
            lineHeight: "1.15",
            color: "#f0f0f0",
            ...PIXEL_TEXT
          }
        },
        `${stats.total} ${killWord(stats.total)}`
      ),
      rateStrip,
      sessionLine
    );
    const listSection = (heading, colHint, rows) => e(
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
      e(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: "8px",
            marginBottom: "4px"
          }
        },
        e(
          "div",
          {
            style: {
              fontSize: TYPE.body,
              color: "#888",
              ...PIXEL_TEXT
            }
          },
          heading
        ),
        colHint ? e(
          "div",
          {
            style: {
              fontSize: TYPE.secondaryMin,
              color: META_COLOR,
              ...PIXEL_TEXT
            }
          },
          colHint
        ) : null
      ),
      ...rows
    );
    const listRow = (opts) => {
      const share = opts.max > 0 ? Math.max(0, Math.min(1, opts.count / opts.max)) : 0;
      let icon = null;
      if (opts.mtype) {
        const html = monsterSprite(opts.mtype, { size: MOB_ICON_SIZE2 });
        if (html) icon = wrapIconHtml3(html);
      }
      const rate = opts.killsPerMinute != null ? metricCell({
        value: fmtRate3(opts.killsPerMinute),
        unit: "/min",
        title: "Kills per minute (session)",
        minWidth: "5.5ch"
      }) : metricCell({
        value: "\u2014",
        unit: "/min",
        title: "Kills per minute (session)",
        minWidth: "5.5ch"
      });
      const pace = opts.showPace !== false ? opts.avgIntervalSec != null ? metricCell({
        value: formatTime(opts.avgIntervalSec),
        unit: "avg",
        title: "Average interval between kills of this type (pace, not HP TTK)",
        minWidth: "5ch"
      }) : metricCell({
        value: "\u2014",
        unit: "avg",
        title: "Average interval between kills (needs 2+ kills)",
        minWidth: "5ch"
      }) : null;
      return e(
        "div",
        {
          key: opts.key,
          style: {
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            minHeight: `${LIST_ROW_HEIGHT}px`,
            height: `${LIST_ROW_HEIGHT}px`,
            padding: "0 6px",
            boxSizing: "border-box",
            ...PIXEL_TEXT
          }
        },
        e("div", {
          style: {
            position: "absolute",
            left: 0,
            top: 2,
            bottom: 2,
            width: `${(share * 100).toFixed(1)}%`,
            background: "rgba(180, 70, 70, 0.22)",
            pointerEvents: "none"
          }
        }),
        icon,
        e(
          "span",
          {
            style: {
              position: "relative",
              flex: "1 1 auto",
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: TYPE.body,
              color: "#ddd",
              ...PIXEL_TEXT
            }
          },
          opts.label
        ),
        rate,
        pace,
        e(
          "span",
          {
            style: {
              position: "relative",
              flexShrink: 0,
              fontSize: TYPE.count,
              color: "#eee",
              fontVariantNumeric: "tabular-nums",
              minWidth: "2.5ch",
              textAlign: "right",
              ...PIXEL_TEXT
            },
            title: "Kill count"
          },
          String(opts.count)
        )
      );
    };
    const partyMax = scope === "all" && stats.byParty.length ? stats.byParty[0].count : 0;
    const mtypeMax = stats.byMtype.length ? stats.byMtype[0].count : 0;
    return shell([
      title,
      scopeRow(true),
      hero,
      scope === "all" && stats.byParty.length > 1 ? listSection(
        "Parties",
        "/min \xB7 count",
        stats.byParty.slice(0, 8).map(
          (row2) => listRow({
            key: row2.party,
            label: partyLabel(row2.party),
            count: row2.count,
            max: partyMax,
            killsPerMinute: row2.killsPerMinute,
            showPace: false
          })
        )
      ) : null,
      stats.byMtype.length ? listSection(
        "Monsters",
        "/min \xB7 avg \xB7 count",
        stats.byMtype.slice(0, 12).map(
          (row2) => listRow({
            key: row2.mtype,
            label: row2.mtype,
            count: row2.count,
            max: mtypeMax,
            mtype: row2.mtype,
            killsPerMinute: row2.killsPerMinute,
            avgIntervalSec: row2.avgIntervalSec,
            showPace: true
          })
        )
      ) : null
    ]);
  }

  // src/host/codemirror.ts
  function getHostCodeMirror() {
    const CM = window.CodeMirror;
    return typeof CM === "function" ? CM : null;
  }
  function mountCommandCodeMirror(host2, opts) {
    const CodeMirror = getHostCodeMirror();
    if (!CodeMirror) return null;
    while (host2.firstChild) {
      host2.removeChild(host2.firstChild);
    }
    const cm = CodeMirror(host2, {
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
  function disposeCodeMirror(host2) {
    if (!host2) return;
    while (host2.firstChild) {
      host2.removeChild(host2.firstChild);
    }
  }

  // src/ui/frames/CommandPanel.ts
  function btnStyle2(opts) {
    const accent = (opts == null ? void 0 : opts.accent) === true;
    const danger = (opts == null ? void 0 : opts.danger) === true;
    return {
      cursor: "pointer",
      fontSize: TYPE.body,
      padding: "5px 11px",
      border: danger ? "1px solid #844" : accent ? "1px solid #a86" : "1px solid #555",
      background: danger ? "#2a1515" : accent ? "#2a2410" : "#1a1a1a",
      color: danger ? "#eaa" : accent ? "#ffe08a" : "#ccc",
      textShadow: "none",
      fontWeight: "normal"
    };
  }
  function newId2() {
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
      const host2 = editorHostRef.current;
      if (!host2) return;
      const cm = mountCommandCodeMirror(host2, {
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
        disposeCodeMirror(host2);
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
      const snip = { id: newId2(), name, code };
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
      fontSize: TYPE.name,
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
                fontSize: TYPE.name,
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
                  fontSize: TYPE.body,
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
              style: btnStyle2({ accent: true })
            },
            "Run"
          ),
          e(
            "button",
            {
              type: "button",
              title: "Delete snippet",
              onClick: () => onDelete(snip.id),
              style: btnStyle2({ danger: true })
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
          fontSize: TYPE.name,
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
          { style: { fontSize: TYPE.body, color: "#aaa" } },
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
            style: btnStyle2({ accent: true })
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
            style: btnStyle2()
          },
          "Save snippet"
        )
      ),
      status ? e(
        "div",
        { style: { fontSize: TYPE.body, color: "#9a9" } },
        status
      ) : null,
      e(
        "div",
        {
          style: {
            fontSize: TYPE.name,
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
            fontSize: TYPE.body,
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
              fontSize: TYPE.body,
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
        { style: { fontSize: TYPE.body, color: "#777" } },
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
  function formatBagSyncedLabel(syncedAt, now) {
    const ageSec = Math.floor(Math.max(0, now - syncedAt) / 1e3);
    if (ageSec < 15) return "Synced just now";
    if (ageSec < 60) return `Synced ${ageSec}s ago`;
    if (ageSec < 3600) {
      const m = Math.max(1, Math.floor(ageSec / 60));
      return `Synced ${m}m ago`;
    }
    const h = Math.floor(ageSec / 3600);
    return `Synced ${h}h ago`;
  }
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
            fontSize: TYPE.body,
            color: "gold",
            flexShrink: 0,
            ...PIXEL_TEXT
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
  function BagSyncChrome(props) {
    const React = getReact();
    const {
      syncedAt,
      syncedName,
      gridStale,
      refreshing,
      refreshKind,
      hasSnapshot
    } = props;
    const [now, setNow] = React.useState(() => Date.now());
    React.useEffect(() => {
      if (refreshing) return;
      const id = window.setInterval(() => setNow(Date.now()), 1e3);
      return () => window.clearInterval(id);
    }, [refreshing]);
    let label = "No snapshot yet";
    let title = "Observer inventory arrives on observe welcome; none is loaded yet.";
    if (refreshing) {
      label = "Refreshing\u2026";
      title = "Reconnecting observer for a fresh inventory snapshot from the server.";
    } else if (gridStale) {
      label = "Character changed";
      title = "Observed character changed; bag grid may still show the previous inventory until it redraws. Use Refresh if it stays stale.";
    } else if (syncedAt != null) {
      label = formatBagSyncedLabel(syncedAt, now);
      const who = syncedName ? ` for ${syncedName}` : "";
      title = `Observe welcome snapshot${who} (${new Date(syncedAt).toLocaleTimeString()}). Opening Bag does not refresh stock. Refresh reconnects the observer.`;
    } else if (hasSnapshot) {
      label = "Synced (age unknown)";
      title = "Inventory snapshot is loaded, but welcome time was not recorded (CommUI loaded after connect). Refresh for a fresh timestamp.";
    }
    if (!refreshing && !gridStale && refreshKind === "local") {
      title = "Last Refresh re-drew the local observing snapshot (no server round-trip).";
    } else if (!refreshing && !gridStale && refreshKind === "server") {
      title = "Last Refresh reconnected the observer and loaded a fresh welcome snapshot.";
    }
    return e(
      "div",
      {
        className: "comm-bag-sync-chrome",
        style: {
          display: "flex",
          alignItems: "center",
          gap: "8px",
          height: `${BAG_SYNC_CHROME_HEIGHT}px`,
          boxSizing: "border-box",
          padding: "2px 4px",
          marginBottom: "2px",
          background: "rgba(12,12,12,0.92)",
          border: "1px solid #444",
          // Stretch with the inventory host — do not lock to BAG_FRAME_WIDTH
          // (fixed width + #bottomleftcorner borders wraps floats into 6+1 rows).
          width: "100%",
          minWidth: BAG_FRAME_WIDTH
        }
      },
      e(
        "span",
        {
          title,
          style: {
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: TYPE.secondary,
            color: refreshing || gridStale ? "#c9a227" : "#aaa",
            ...PIXEL_TEXT
          }
        },
        label
      ),
      e(
        "button",
        {
          type: "button",
          disabled: refreshing,
          title: "Reconnect observer for a fresh inventory snapshot. Stock /comm has no lighter inventory refresh \u2014 falls back to re-drawing the local snapshot if reconnect is unavailable.",
          onClick: (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            refreshObservedInventory();
          },
          style: {
            flexShrink: 0,
            cursor: refreshing ? "wait" : "pointer",
            fontSize: TYPE.secondary,
            lineHeight: "1.2",
            padding: "3px 8px",
            minHeight: "26px",
            margin: 0,
            border: "1px solid #666",
            background: refreshing ? "#1a1a1a" : "#222",
            color: refreshing ? "#777" : "#ddd",
            ...PIXEL_TEXT
          }
        },
        "Refresh"
      )
    );
  }
  function BagPanel(props) {
    const React = getReact();
    const mountRef = React.useRef(null);
    const [open, setOpen] = React.useState(() => isInventoryOpen());
    const [syncedAt, setSyncedAt] = React.useState(() => getBagSyncedAt());
    const [syncedName, setSyncedName] = React.useState(() => getBagSyncedName());
    const [gridStale, setGridStale] = React.useState(() => isBagGridStale());
    const [refreshing, setRefreshing] = React.useState(() => isBagRefreshing());
    const [refreshKind, setRefreshKind] = React.useState(
      () => getBagRefreshKind()
    );
    const [hasSnapshot, setHasSnapshot] = React.useState(
      () => hasObservingInventorySnapshot()
    );
    const layoutEdit = !!props.layoutEdit;
    const showDummy = layoutEdit && !open && !refreshing;
    const showChrome = open || refreshing;
    React.useEffect(() => {
      attachInventoryToMount(mountRef.current);
      const unsubInv = subscribeInventory((next) => setOpen(next));
      const unsubSync = subscribeBagSync(() => {
        setSyncedAt(getBagSyncedAt());
        setSyncedName(getBagSyncedName());
        setGridStale(isBagGridStale());
        setRefreshing(isBagRefreshing());
        setRefreshKind(getBagRefreshKind());
        setHasSnapshot(hasObservingInventorySnapshot());
      });
      return () => {
        unsubInv();
        unsubSync();
        const host2 = document.getElementById(HOST_ID2);
        if (host2) document.body.appendChild(host2);
      };
    }, []);
    React.useLayoutEffect(() => {
      attachInventoryToMount(mountRef.current);
    }, [open, refreshing, showDummy]);
    return e(
      "div",
      {
        className: "comm-bag-panel",
        style: {
          // Dummy silhouette is click-through in layout edit (header drags).
          pointerEvents: showDummy ? "none" : "auto",
          // Open bag: minWidth only — explicit width shrinks #bottomleftcorner
          // under its gray border/padding and breaks the 7-col float grid.
          width: showDummy ? BAG_FRAME_WIDTH : void 0,
          minWidth: showDummy ? BAG_FRAME_WIDTH : showChrome ? BAG_FRAME_WIDTH : "120px",
          minHeight: showDummy ? BAG_FRAME_HEIGHT : showChrome ? void 0 : "8px",
          height: showDummy ? BAG_FRAME_HEIGHT : void 0,
          boxSizing: "border-box"
        }
      },
      showChrome ? e(BagSyncChrome, {
        syncedAt,
        syncedName,
        gridStale,
        refreshing,
        refreshKind,
        hasSnapshot
      }) : null,
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

  // src/ui/frames/comm/CommPanelLayout.ts
  function createPanelRenderer(deps) {
    return (id, child, opts) => {
      const isClosablePanel = (opts == null ? void 0 : opts.closable) === true;
      const isHidden = isClosablePanel && !deps.visible(id);
      if (isHidden && !deps.layoutEdit) return null;
      if ((opts == null ? void 0 : opts.empty) && !deps.layoutEdit) return null;
      return e(
        PositionedPanel,
        {
          id,
          pos: deps.layout[id],
          editing: deps.layoutEdit,
          onMove: deps.onMove,
          style: opts == null ? void 0 : opts.style,
          hidden: isHidden,
          hiddenBodyStyle: opts == null ? void 0 : opts.hiddenBodyStyle,
          opacity: deps.opacityFor(id),
          onOpacityChange: (opts == null ? void 0 : opts.editChrome) === "grip" ? void 0 : (value) => deps.setOpacity(id, value),
          peerLayout: deps.peerLayout,
          viewportProfile: deps.viewportProfile,
          interactiveBody: opts == null ? void 0 : opts.interactiveBody,
          editChrome: opts == null ? void 0 : opts.editChrome,
          onClose: isClosablePanel ? () => deps.setVisible(id, false) : void 0,
          onShow: isClosablePanel ? () => deps.setVisible(id, true) : void 0
        },
        child
      );
    };
  }
  function renderCommPanels(deps) {
    const panel = createPanelRenderer(deps);
    const snap = deps.snap;
    const isObserving = snap.observingId != null && snap.observingId !== "" || !!snap.observing;
    let framePlayer = snap.observing;
    let frameTarget = snap.target;
    if (!isObserving) {
      const focusEntity = deps.focusUnitId ? findEntity(snap.entities, deps.focusUnitId) : void 0;
      framePlayer = focusEntity;
      frameTarget = resolveTarget(focusEntity);
    }
    return [
      panel(
        "players",
        e(Players, {
          entities: snap.entities,
          setSelectedEntity: deps.setSelectedEntity,
          selectedEntity: deps.selectedEntity,
          observingId: snap.observingId,
          observing: snap.observing,
          layoutEdit: deps.layoutEdit
        }),
        { style: { width: "auto", maxWidth: "min(560px, 78vw)" } }
      ),
      panel(
        "enemies",
        e(Enemies, {
          entities: snap.entities,
          setSelectedEntity: deps.setSelectedEntity,
          selectedEntity: deps.selectedEntity
        }),
        {
          style: {
            width: "auto",
            maxWidth: "min(420px, 78vw)",
            textAlign: "right"
          },
          empty: !deps.combat.hasEnemies
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
          e(MapInfo, { entities: snap.entities })
        )
      ),
      panel(
        "crypt",
        e(CryptProgress, {
          entities: snap.entities,
          layoutEdit: deps.layoutEdit,
          setSelectedEntity: deps.setSelectedEntity
        }),
        {
          closable: true,
          style: CRYPT_PANEL_STYLE,
          empty: !deps.onCrypt,
          hiddenBodyStyle: CRYPT_PANEL_STYLE
        }
      ),
      panel(
        "bossBar",
        e(BossBarPanel, {
          entities: snap.entities,
          observing: snap.observing,
          setSelectedEntity: deps.setSelectedEntity,
          layoutEdit: deps.layoutEdit
        }),
        {
          closable: true,
          style: BOSS_BAR_PANEL_STYLE,
          empty: !deps.combat.hasBosses
        }
      ),
      deps.selectedEntity || deps.layoutEdit ? panel(
        "paperdoll",
        e(EntityInfo, {
          entities: snap.entities,
          selectedEntity: deps.selectedEntity,
          onClose: deps.closePaperdoll,
          layoutEdit: deps.layoutEdit,
          observing: snap.observing
        }),
        { style: PAPERDOLL_PANEL_STYLE }
      ) : null,
      panel(
        "buffInfo",
        e(StockInfoPanel, {
          kind: "buff",
          layoutEdit: deps.layoutEdit,
          onOpenChange: deps.setBuffInfoOpen
        }),
        {
          style: Object.assign({}, INFO_DIALOG_PANEL_STYLE, {
            zIndex: deps.layoutEdit ? 45 : 35,
            pointerEvents: deps.layoutEdit || deps.buffInfoOpen ? "auto" : "none"
          })
        }
      ),
      panel(
        "itemInfo",
        e(StockInfoPanel, {
          kind: "item",
          layoutEdit: deps.layoutEdit,
          onOpenChange: deps.setItemInfoOpen
        }),
        {
          style: Object.assign({}, INFO_DIALOG_PANEL_STYLE, {
            zIndex: deps.layoutEdit ? 45 : 35,
            pointerEvents: deps.layoutEdit || deps.itemInfoOpen ? "auto" : "none"
          })
        }
      ),
      panel("kills", e(KillKpiPanel), {
        closable: true,
        style: KILLS_PANEL_STYLE,
        hiddenBodyStyle: KILLS_PANEL_STYLE
      }),
      panel(
        "command",
        e(CommandPanel, {
          seedDraft: deps.commandSeed,
          openSeq: deps.commandOpenSeq
        }),
        {
          closable: true,
          style: COMMAND_PANEL_STYLE,
          hiddenBodyStyle: COMMAND_PANEL_STYLE
        }
      ),
      deps.bagOpen || deps.bagRefreshing || deps.layoutEdit ? panel("bag", e(BagPanel, { layoutEdit: deps.layoutEdit }), {
        closable: true,
        style: deps.layoutEdit ? BAG_PANEL_STYLE : void 0,
        hiddenBodyStyle: Object.assign({}, BAG_PANEL_STYLE, {
          display: "flex",
          alignItems: "flex-start"
        })
      }) : null,
      framePlayer || deps.layoutEdit ? panel(
        "playerFrame",
        e(PlayerFrame, {
          observing: framePlayer,
          setSelectedEntity: deps.setSelectedEntity,
          layoutEdit: deps.layoutEdit
        }),
        { style: UNIT_FRAME_STYLE }
      ) : null,
      frameTarget || deps.layoutEdit ? panel(
        "targetFrame",
        e(TargetFrame, {
          observing: framePlayer,
          target: frameTarget,
          entities: snap.entities,
          setSelectedEntity: deps.setSelectedEntity,
          layoutEdit: deps.layoutEdit
        }),
        { style: UNIT_FRAME_STYLE }
      ) : null,
      panel(
        "threat",
        e(ThreatTable, {
          entities: snap.entities,
          observingId: snap.observingId,
          layoutEdit: deps.layoutEdit,
          setSelectedEntity: deps.setSelectedEntity
        }),
        {
          closable: true,
          style: THREAT_PANEL_STYLE,
          empty: !deps.combat.hasThreat,
          hiddenBodyStyle: THREAT_PANEL_STYLE
        }
      )
    ];
  }
  function renderCommTogglesPanel(deps, controlStrip) {
    const panel = createPanelRenderer(deps);
    return panel("toggles", controlStrip, {
      interactiveBody: true,
      editChrome: "grip",
      style: { zIndex: 100 }
    });
  }

  // src/ui/frames/CommUI.ts
  function CommUI(props) {
    const React = getReact();
    const snap = props.snap;
    const layoutState = usePanelLayoutState();
    const {
      setPanelVisible,
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
    const { bagOpen, bagRefreshing: bagRefreshing2 } = useBagBridge(setPanelVisible);
    const { selectedEntity, setSelectedEntity, closePaperdoll, focusUnitId } = useSelectionFromXTarget(snap);
    const meters = useCommMeterInstances(layout);
    const [commandSeed, setCommandSeed] = React.useState(null);
    const [commandOpenSeq, setCommandOpenSeq] = React.useState(0);
    const [buffInfoOpen, setBuffInfoOpen] = React.useState(false);
    const [itemInfoOpen, setItemInfoOpen] = React.useState(false);
    const [meterAddOpen, setMeterAddOpen] = React.useState(false);
    const [metersHidden, setMetersHidden] = React.useState(
      () => !!getSettings().metersHidden
    );
    const [setupWizardOpen, setSetupWizardOpen] = React.useState(
      () => !getSettings().setupWizardDone
    );
    const [introStep, setIntroStep] = React.useState(() => readIntroStep());
    const setIntroStepPersist = (step) => {
      setIntroStep(step);
      writeIntroStep(step);
    };
    const setMetersHiddenPersist = (hidden) => {
      setMetersHidden(hidden);
      patchSettings({ metersHidden: hidden });
    };
    const guidedTours = useCommGuidedTours({
      layoutEdit,
      setLayoutEdit,
      metersHidden,
      setMetersHidden: setMetersHiddenPersist,
      meterAddOpen,
      setMeterAddOpen,
      setVisible,
      getPanelVisible: visible,
      setupWizardOpen,
      setSetupWizardOpen,
      isObserving: snap.observingId != null && snap.observingId !== "" || !!snap.observing,
      bagOpen,
      commandOpen: visible("command")
    });
    const { startIntroTour, toggleLayoutEdit, tourOverlay } = guidedTours;
    React.useEffect(() => {
      updateKillContext(snap.entities);
      updateMeterContext(snap.entities);
    }, [snap.entities]);
    React.useEffect(() => {
      updateCommKeyboardHandlers({
        clearPaperdoll: () => {
          if (!selectedEntity && !focusUnitId) return false;
          closePaperdoll();
          return true;
        },
        toggleLayoutEdit,
        exitLayoutEdit: () => {
          let wasOn = false;
          setLayoutEdit((v) => {
            wasOn = v;
            return false;
          });
          return wasOn;
        }
      });
      return () => updateCommKeyboardHandlers({});
    }, [selectedEntity, focusUnitId, closePaperdoll, toggleLayoutEdit]);
    React.useEffect(() => {
      info.setLayoutEditing(layoutEdit);
      return () => info.setLayoutEditing(false);
    }, [layoutEdit]);
    const commandOpenRef = React.useRef(false);
    commandOpenRef.current = visible("command");
    React.useEffect(() => {
      return subscribeCommanderOpen((payload) => {
        const hasDraft = typeof payload.draft === "string";
        if (hasDraft) {
          setCommandSeed(payload.draft);
          setCommandOpenSeq((n) => n + 1);
          setVisible("command", true);
          return;
        }
        if (commandOpenRef.current) {
          setVisible("command", false);
          return;
        }
        setCommandSeed(null);
        setCommandOpenSeq((n) => n + 1);
        setVisible("command", true);
      });
    }, [setVisible]);
    React.useEffect(() => {
      const root = document.getElementById("comm-ui");
      if (!root) return;
      root.setAttribute("data-viewport", viewportProfile);
      root.classList.toggle("comm-ui-touch", isTouchishProfile(viewportProfile));
    }, [viewportProfile]);
    const combat = combatSignals(snap.entities);
    const onCrypt = getMapData(snap.entities).map === "crypt";
    useContextualTourTriggers({
      selectedEntity,
      meterCount: meters.meterInstances.length,
      entities: snap.entities,
      meterInstances: meters.meterInstances
    });
    const panelDeps = {
      snap,
      layoutEdit,
      layout,
      peerLayout: meters.peerLayout,
      viewportProfile,
      visible,
      opacityFor,
      onMove,
      setVisible,
      setOpacity,
      selectedEntity,
      setSelectedEntity,
      closePaperdoll,
      focusUnitId,
      combat,
      onCrypt,
      commandSeed,
      commandOpenSeq,
      bagOpen,
      bagRefreshing: bagRefreshing2,
      buffInfoOpen,
      setBuffInfoOpen,
      itemInfoOpen,
      setItemInfoOpen
    };
    const meterPanels = buildCommMeterPanels({
      snap,
      meterInstances: meters.meterInstances,
      layoutEdit,
      metersHidden,
      altHeld: meters.altHeld,
      meterSnapDragId: meters.meterSnapDragId,
      meterSnapPeerId: meters.meterSnapPeerId,
      peerLayout: meters.peerLayout,
      viewportProfile,
      closedMeters: meters.closedMeters,
      meterIsLocked: meters.meterIsLocked,
      dragRefFor: meters.dragRefFor,
      moveMeterWithGroup: meters.moveMeterWithGroup,
      onMeterDragStart: meters.onMeterDragStart,
      onMeterDragMove: meters.onMeterDragMove,
      snapMeterAfterMove: meters.snapMeterAfterMove,
      patchMeter: meters.patchMeter,
      setMeterInstances: meters.setMeterInstances,
      setMetersHiddenPersist,
      reopenClosedMeter: meters.reopenClosedMeter,
      focusInspector: meters.focusInspector,
      focusReport: meters.focusReport,
      duplicateMeter: meters.duplicateMeter,
      removeMeter: meters.removeMeter,
      closeMeterRuntime: meters.closeMeterRuntime,
      ungroupMeterPanel: meters.ungroupMeterPanel,
      setMeterAddOpen,
      onToolbarInteract: triggerMeterToolbarTour
    });
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
        importLayouts,
        onApplyAllCurrent: () => meters.applyAllSegments("current"),
        onApplyAllTotal: () => meters.applyAllSegments("total"),
        onAddMeter: () => setMeterAddOpen(true),
        onResetMeters: () => meters.resetMetersFromSettings()
      }) : null,
      meterAddOpen ? e(CommMeterAddDialog, {
        onClose: () => setMeterAddOpen(false),
        onAddPreset: meters.addMeterFromPreset
      }) : null,
      ...renderCommPanels(panelDeps),
      ...meterPanels,
      setupWizardOpen ? e(CommUISetupWizard, {
        step: introStep,
        onStep: setIntroStepPersist,
        onDone: () => setSetupWizardOpen(false),
        onStartTour: () => startIntroTour(false)
      }) : null,
      renderCommTogglesPanel(
        panelDeps,
        e(CommControlStrip, {
          layoutEdit,
          toggleLayoutEdit,
          metersHidden,
          setMetersHiddenPersist,
          onAddMeter: () => setMeterAddOpen(true),
          onReplayIntroTour: () => startIntroTour(true),
          viewportProfile
        })
      ),
      tourOverlay
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

/* Defeat Adventure Land global pixel-font thickening inside our overlay.
 * Form controls must inherit \u2014 UA styles otherwise swap in a system font. */
#comm-ui, #comm-ui * {
  text-shadow: none !important;
  font-weight: normal !important;
}
#comm-ui button,
#comm-ui input,
#comm-ui select,
#comm-ui textarea {
  font-family: inherit;
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
    const existingDom = document.querySelector(
      "#react-dom"
    );
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
    installPageTitle();
    installCommanderHook();
    startSocketHub();
    startCryptTracker();
    startMeterEngine();
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
