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
      if (live2) {
        if (!live2.ctype && snap.ctype) live2.ctype = snap.ctype;
        return live2;
      }
    }
    return snap;
  }
  function getObservingId() {
    const obs = getObserving();
    return (obs == null ? void 0 : obs.id) != null ? String(obs.id) : void 0;
  }
  function getCharacter() {
    return window.character;
  }
  var KNOWN_CTYPES = /* @__PURE__ */ new Set([
    "warrior",
    "mage",
    "priest",
    "rogue",
    "ranger",
    "paladin",
    "merchant"
  ]);
  function asCtype(v) {
    if (typeof v !== "string" || !v) return void 0;
    const key = v.toLowerCase();
    return KNOWN_CTYPES.has(key) ? key : void 0;
  }
  function resolvePlayerCtype(id, ent) {
    var _a;
    if (!id) return void 0;
    const tid = String(id);
    const fromEnt = asCtype(ent == null ? void 0 : ent.ctype);
    if (fromEnt) return fromEnt;
    const live2 = ent || findEntityById(tid);
    const fromLive = asCtype(live2 == null ? void 0 : live2.ctype);
    if (fromLive) return fromLive;
    const observing = window.observing;
    if (observing && (String(observing.id) === tid || observing.name != null && String(observing.name) === tid)) {
      const fromObs = asCtype(observing.ctype);
      if (fromObs) return fromObs;
    }
    const character = getCharacter();
    if (character && (String(character.id) === tid || character.name != null && String(character.name) === tid)) {
      const fromChar = asCtype(character.ctype);
      if (fromChar) return fromChar;
    }
    const chars = ((_a = window.X) == null ? void 0 : _a.characters) || [];
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      if (!c) continue;
      if (c.name != null && String(c.name) === tid || c.id != null && String(c.id) === tid) {
        const fromX = asCtype(c.type);
        if (fromX) return fromX;
      }
    }
    return void 0;
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
  var visBound = false;
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
  function statusFingerprint(ent, includeMs) {
    const st = ent.s;
    if (!st) return "";
    const keys = Object.keys(st);
    let out = "";
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const actual = st[key];
      if (!actual) continue;
      const stacks = typeof actual.s === "number" ? actual.s : 0;
      const msBucket = includeMs && actual.ms != null && actual.ms > 0 ? Math.ceil(actual.ms / 2e3) : 0;
      out += `${key}:${stacks}:${msBucket},`;
    }
    return out;
  }
  function snapshotUiKey(snap) {
    const xt = window.xtarget;
    const xtId = xt && xt.id != null ? String(xt.id) : "";
    const targetId = snap.target && snap.target.id != null ? String(snap.target.id) : "";
    const obsId = snap.observingId != null ? String(snap.observingId) : "";
    const parts = [
      obsId,
      targetId,
      xtId,
      snap.serverRegion || "",
      snap.serverIdentifier || "",
      String(snap.entities.length)
    ];
    const ents = snap.entities;
    for (let i = 0; i < ents.length; i++) {
      const ent = ents[i];
      const id = ent.id != null ? String(ent.id) : "";
      const hud = !!ent.player || id === obsId || id === targetId || !!ent.cooperative;
      const hp = ent.hp != null ? Math.round(ent.hp) : 0;
      const mp = hud && ent.mp != null ? Math.round(ent.mp) : 0;
      parts.push(
        `${id}|${hp}|${mp}|${ent.dead ? 1 : 0}|${ent.rip ? 1 : 0}|${hud ? ent.fear || 0 : 0}|${ent.in || ""}|${ent.target || ""}|${hud ? statusFingerprint(ent, true) : ""}`
      );
    }
    return parts.join(";");
  }
  function publishSnapshot() {
    if (typeof document !== "undefined" && document.hidden) return;
    const snap = buildSnapshot();
    const cbs = Array.from(listeners);
    for (let i = 0; i < cbs.length; i++) {
      try {
        cbs[i](snap);
      } catch (e2) {
      }
    }
  }
  function onTickVisibility() {
    if (typeof document !== "undefined" && document.hidden) return;
    if (listeners.size === 0) return;
    publishSnapshot();
  }
  function ensureInterval() {
    if (intervalId != null) return;
    publishSnapshot();
    intervalId = window.setInterval(publishSnapshot, INTERVAL_MS);
    if (!visBound && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onTickVisibility);
      visBound = true;
    }
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
  function classSprite(ctype, opts) {
    var _a, _b, _c, _d, _e;
    if (!ctype || typeof window.sprite !== "function") return "";
    const key = ctype.toLowerCase();
    const look = (_d = (_c = (_b = (_a = window.G) == null ? void 0 : _a.classes) == null ? void 0 : _b[key]) == null ? void 0 : _c.looks) == null ? void 0 : _d[0];
    if (!look || !look[0]) return "";
    const size = (_e = opts == null ? void 0 : opts.size) != null ? _e : 18;
    return window.sprite(look[0], {
      cx: look[1] || {},
      scale: size / 40,
      width: size,
      height: size,
      overflow: true
    }) || "";
  }
  function lookFromSkinCx(skin, cx, extra) {
    if (!skin) return null;
    return {
      skin,
      cx: cx || {},
      rip: !!extra.rip,
      ctype: extra.ctype,
      name: extra.name,
      source: extra.source
    };
  }
  function resolveCharacterLook(id, opts) {
    var _a, _b, _c, _d, _e;
    const tid = id != null ? String(id) : "";
    const hintName = opts == null ? void 0 : opts.name;
    const hintCtype = (opts == null ? void 0 : opts.ctype) ? String(opts.ctype).toLowerCase() : void 0;
    const fromEnt = (ent, source) => lookFromSkinCx(ent == null ? void 0 : ent.skin, ent == null ? void 0 : ent.cx, {
      rip: ent == null ? void 0 : ent.rip,
      ctype: (ent == null ? void 0 : ent.ctype) || hintCtype,
      name: (ent == null ? void 0 : ent.name) || hintName,
      source
    });
    if (tid) {
      const fromLive = fromEnt(findEntityById(tid), "entity");
      if (fromLive) return fromLive;
      const observing = window.observing;
      if (observing && (String(observing.id) === tid || observing.name != null && String(observing.name) === tid || hintName && observing.name === hintName)) {
        const fromObs = fromEnt(observing, "entity");
        if (fromObs) return fromObs;
      }
      const character = window.character;
      if (character && (String(character.id) === tid || character.name != null && String(character.name) === tid || hintName && character.name === hintName)) {
        const fromChar = fromEnt(character, "entity");
        if (fromChar) return fromChar;
      }
    }
    const chars = ((_a = window.X) == null ? void 0 : _a.characters) || [];
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      if (!c) continue;
      const matchId = tid && c.id != null && String(c.id) === tid;
      const matchName = hintName && c.name === hintName || tid && c.name != null && String(c.name) === tid;
      if (!matchId && !matchName) continue;
      const fromRoster = lookFromSkinCx(c.skin, c.cx, {
        rip: c.rip,
        ctype: c.type || hintCtype,
        name: c.name || hintName,
        source: "roster"
      });
      if (fromRoster) return fromRoster;
    }
    const ctypeKey = hintCtype || void 0;
    if (ctypeKey) {
      const look = (_e = (_d = (_c = (_b = window.G) == null ? void 0 : _b.classes) == null ? void 0 : _c[ctypeKey]) == null ? void 0 : _d.looks) == null ? void 0 : _e[0];
      if (look && look[0]) {
        return {
          skin: look[0],
          cx: look[1] || {},
          ctype: ctypeKey,
          name: hintName,
          source: "class"
        };
      }
    }
    return null;
  }
  function characterSprite(id, opts) {
    var _a;
    if (typeof window.sprite !== "function") return "";
    const resolved = resolveCharacterLook(id, {
      ctype: opts == null ? void 0 : opts.ctype,
      name: opts == null ? void 0 : opts.name
    });
    if (!resolved || !resolved.skin) return "";
    const size = (_a = opts == null ? void 0 : opts.size) != null ? _a : 40;
    return window.sprite(resolved.skin, {
      cx: resolved.cx || {},
      rip: resolved.rip,
      scale: size / 40,
      width: size,
      height: size,
      overflow: true
    }) || "";
  }

  // src/lib/abilityIds.ts
  var HIT_SOURCE_TO_G = {
    burn: "burned"
  };
  function canonicalAbilityId(source) {
    if (!source) return source;
    const mapped = HIT_SOURCE_TO_G[source.toLowerCase()];
    return mapped || source;
  }

  // src/lib/gameIcon.ts
  var CLASS_LETTERS = {
    warrior: "W",
    mage: "M",
    priest: "P",
    rogue: "R",
    ranger: "Rg",
    paladin: "Pa",
    merchant: "Me"
  };
  var PROMOTED_DEBUFF_KEYS = /* @__PURE__ */ new Set([
    "stunned",
    "deepfreezed",
    "fingered",
    "frozen",
    "scared"
  ]);
  function escapeAttr(s) {
    return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function letterFallbackHtml(letter, size, title, bg) {
    const style = [
      `width:${size}px`,
      `height:${size}px`,
      `line-height:${size}px`,
      bg ? `background:${bg}` : ""
    ].filter(Boolean).join(";");
    return `<span class="ecu-meter-icon ecu-meter-icon-ab" title="${escapeAttr(title)}" style="${style}">${escapeAttr(letter)}</span>`;
  }
  function skinSheetHtml(skin, displaySize = 18, title) {
    try {
      const G = window.G;
      if (!G || !G.positions || !G.imagesets) return null;
      const pos = G.positions[skin];
      if (!pos) return null;
      const setName = pos[0] || "pack_20";
      const pack = G.imagesets[setName];
      if (!pack || !pack.file) return null;
      const x = pos[1];
      const y = pos[2];
      const scale = displaySize / pack.size;
      const sheetW = pack.columns * pack.size * scale;
      const sheetH = pack.rows * pack.size * scale;
      const tip = title || skin;
      return `<span class="ecu-meter-icon ecu-meter-icon-skin" title="${escapeAttr(tip)}" style="width:${displaySize}px;height:${displaySize}px"><span class="ecu-meter-icon-clip" style="width:${displaySize}px;height:${displaySize}px"><img alt="" draggable="false" style="width:${sheetW}px;height:${sheetH}px;margin-top:-${y * displaySize}px;margin-left:-${x * displaySize}px" src="${pack.file}"/></span></span>`;
    } catch (e2) {
      return null;
    }
  }
  function isConditionDebuff(key) {
    var _a, _b;
    const gid = canonicalAbilityId(key);
    if (PROMOTED_DEBUFF_KEYS.has(key) || PROMOTED_DEBUFF_KEYS.has(gid)) {
      return true;
    }
    const G = getG();
    const def = ((_a = G == null ? void 0 : G.conditions) == null ? void 0 : _a[gid]) || ((_b = G == null ? void 0 : G.conditions) == null ? void 0 : _b[key]);
    return !!(def && def.debuff);
  }
  function conditionKind(key) {
    return isConditionDebuff(key) ? "debuff" : "buff";
  }
  function conditionDisplayName(key) {
    var _a, _b;
    const G = getG();
    const gid = canonicalAbilityId(key);
    const def = ((_a = G == null ? void 0 : G.conditions) == null ? void 0 : _a[gid]) || ((_b = G == null ? void 0 : G.conditions) == null ? void 0 : _b[key]);
    if (def && typeof def.name === "string" && def.name) return def.name;
    return key;
  }
  function conditionSkin(key) {
    var _a, _b;
    const G = getG();
    const gid = canonicalAbilityId(key);
    const def = ((_a = G == null ? void 0 : G.conditions) == null ? void 0 : _a[gid]) || ((_b = G == null ? void 0 : G.conditions) == null ? void 0 : _b[key]);
    if (def && typeof def.skin === "string" && def.skin) return def.skin;
    return void 0;
  }
  function skillDisplayName(key) {
    var _a, _b, _c, _d, _e, _f;
    const G = getG();
    const gid = canonicalAbilityId(key);
    const skill = ((_a = G == null ? void 0 : G.skills) == null ? void 0 : _a[gid]) || ((_b = G == null ? void 0 : G.skills) == null ? void 0 : _b[key]);
    if (skill && typeof skill.name === "string" && skill.name) return skill.name;
    const cond = ((_c = G == null ? void 0 : G.conditions) == null ? void 0 : _c[gid]) || ((_d = G == null ? void 0 : G.conditions) == null ? void 0 : _d[key]);
    if (cond && typeof cond.name === "string" && cond.name) return cond.name;
    const item = ((_e = G == null ? void 0 : G.items) == null ? void 0 : _e[gid]) || ((_f = G == null ? void 0 : G.items) == null ? void 0 : _f[key]);
    if (item && typeof item.name === "string" && item.name) return item.name;
    return key;
  }
  function skillSkin(key) {
    var _a, _b, _c, _d, _e, _f;
    const G = getG();
    const gid = canonicalAbilityId(key);
    const skill = ((_a = G == null ? void 0 : G.skills) == null ? void 0 : _a[gid]) || ((_b = G == null ? void 0 : G.skills) == null ? void 0 : _b[key]);
    if (skill && typeof skill.skin === "string" && skill.skin) return skill.skin;
    const cond = ((_c = G == null ? void 0 : G.conditions) == null ? void 0 : _c[gid]) || ((_d = G == null ? void 0 : G.conditions) == null ? void 0 : _d[key]);
    if (cond && typeof cond.skin === "string" && cond.skin) return cond.skin;
    const item = ((_e = G == null ? void 0 : G.items) == null ? void 0 : _e[gid]) || ((_f = G == null ? void 0 : G.items) == null ? void 0 : _f[key]);
    if (item && typeof item.skin === "string" && item.skin) return item.skin;
    return void 0;
  }
  function itemSkin(key) {
    var _a;
    const G = getG();
    const def = (_a = G == null ? void 0 : G.items) == null ? void 0 : _a[key];
    if (def && typeof def.skin === "string" && def.skin) return def.skin;
    return void 0;
  }
  function itemDisplayName(key) {
    var _a;
    const G = getG();
    const def = (_a = G == null ? void 0 : G.items) == null ? void 0 : _a[key];
    if (def && typeof def.name === "string" && def.name) return def.name;
    return key;
  }
  function monsterDisplayName(mtype) {
    var _a;
    const G = getG();
    const def = (_a = G == null ? void 0 : G.monsters) == null ? void 0 : _a[mtype];
    if (def && typeof def.name === "string" && def.name) return def.name;
    return mtype;
  }
  function resolveMonsterMtype(id, opts) {
    const G = getG();
    const monsters = G == null ? void 0 : G.monsters;
    if (opts == null ? void 0 : opts.mtype) {
      if (!monsters || monsters[opts.mtype]) return opts.mtype;
    }
    if (monsters == null ? void 0 : monsters[id]) return id;
    const ent = findEntityById(id);
    if (ent == null ? void 0 : ent.mtype) return ent.mtype;
    if ((opts == null ? void 0 : opts.name) && (monsters == null ? void 0 : monsters[opts.name])) return opts.name;
    return (opts == null ? void 0 : opts.mtype) || void 0;
  }
  function resolveGameIcon(id, kind = "auto", opts) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
    const key = id || "";
    if (kind === "death") {
      return { id: key || "death", kind: "death", name: "Death" };
    }
    if (kind === "class") {
      return {
        id: key,
        kind: "class",
        ctype: (opts == null ? void 0 : opts.ctype) || key,
        name: (opts == null ? void 0 : opts.ctype) || key
      };
    }
    if (kind === "character" || kind === "actor") {
      const look = resolveCharacterLook(key, {
        ctype: opts == null ? void 0 : opts.ctype,
        name: opts == null ? void 0 : opts.name
      });
      return {
        id: key,
        kind: "character",
        skin: look == null ? void 0 : look.skin,
        ctype: (look == null ? void 0 : look.ctype) || (opts == null ? void 0 : opts.ctype),
        name: (look == null ? void 0 : look.name) || (opts == null ? void 0 : opts.name) || key,
        lookSource: (look == null ? void 0 : look.source) || "none"
      };
    }
    if (kind === "monster") {
      const mtype = resolveMonsterMtype(key, opts) || key;
      return {
        id: key,
        kind: "monster",
        mtype,
        name: (opts == null ? void 0 : opts.name) || monsterDisplayName(mtype)
      };
    }
    if (kind === "target") {
      if (opts == null ? void 0 : opts.ctype) {
        return {
          id: key,
          kind: "class",
          ctype: opts.ctype,
          name: opts.name || key
        };
      }
      const mtype = resolveMonsterMtype(key, opts);
      if (mtype) {
        return {
          id: key,
          kind: "monster",
          mtype,
          name: (opts == null ? void 0 : opts.name) || monsterDisplayName(mtype)
        };
      }
      return {
        id: key,
        kind: "monster",
        name: (opts == null ? void 0 : opts.name) || key
      };
    }
    const G = getG();
    const gid = canonicalAbilityId(key);
    const asCondition = () => ({
      id: gid,
      kind: "condition",
      skin: conditionSkin(gid),
      name: conditionDisplayName(gid),
      debuff: isConditionDebuff(gid)
    });
    const asSkill = () => ({
      id: gid,
      kind: "skill",
      skin: skillSkin(gid),
      name: skillDisplayName(gid)
    });
    const asItem = () => {
      var _a2, _b2;
      const def = ((_a2 = G == null ? void 0 : G.items) == null ? void 0 : _a2[gid]) || ((_b2 = G == null ? void 0 : G.items) == null ? void 0 : _b2[key]);
      return {
        id: gid,
        kind: "item",
        skin: itemSkin(gid) || itemSkin(key),
        name: typeof (def == null ? void 0 : def.name) === "string" ? def.name : key
      };
    };
    if (kind === "condition") return asCondition();
    if (kind === "auto" && ((_a = G == null ? void 0 : G.conditions) == null ? void 0 : _a[gid])) return asCondition();
    if (kind === "skill") {
      if (((_b = G == null ? void 0 : G.skills) == null ? void 0 : _b[gid]) || ((_c = G == null ? void 0 : G.skills) == null ? void 0 : _c[key])) return asSkill();
      if (((_d = G == null ? void 0 : G.conditions) == null ? void 0 : _d[gid]) || ((_e = G == null ? void 0 : G.conditions) == null ? void 0 : _e[key])) return asCondition();
      if (((_f = G == null ? void 0 : G.items) == null ? void 0 : _f[gid]) || ((_g = G == null ? void 0 : G.items) == null ? void 0 : _g[key])) return asItem();
      return {
        id: gid || key,
        kind: "skill",
        name: skillDisplayName(gid || key)
      };
    }
    if (kind === "auto" && (((_h = G == null ? void 0 : G.skills) == null ? void 0 : _h[gid]) || ((_i = G == null ? void 0 : G.skills) == null ? void 0 : _i[key]))) {
      return asSkill();
    }
    if (kind === "item" || kind === "auto" && (((_j = G == null ? void 0 : G.items) == null ? void 0 : _j[gid]) || ((_k = G == null ? void 0 : G.items) == null ? void 0 : _k[key]))) {
      return asItem();
    }
    return {
      id: gid || key,
      kind: kind === "auto" ? "skill" : kind,
      name: skillDisplayName(gid || key)
    };
  }
  function classIconHtml(ctype, displaySize = 18) {
    const key = (ctype || "").toLowerCase();
    if (!key) return "";
    const title = key;
    const color = classColors[key] || "#607d8b";
    const raw = classSprite(key || void 0, { size: displaySize });
    if (raw) {
      return `<span class="ecu-meter-icon ecu-meter-icon-class ecu-meter-icon-class-sprite" title="${escapeAttr(title)}" style="width:${displaySize}px;height:${displaySize}px;border-color:${color};background:${color}">${raw}</span>`;
    }
    const letter = CLASS_LETTERS[key] || key.slice(0, 1).toUpperCase() || "?";
    const style = [
      `width:${displaySize}px`,
      `height:${displaySize}px`,
      `line-height:${displaySize}px`,
      `background:${color}`
    ].join(";");
    return `<span class="ecu-meter-icon ecu-meter-icon-class" title="${escapeAttr(title)}" style="${style}">${escapeAttr(letter)}</span>`;
  }
  function characterIconHtml(id, opts) {
    const size = opts && opts.size || 40;
    const ctype = ((opts == null ? void 0 : opts.ctype) || "").toLowerCase();
    const tip = (opts == null ? void 0 : opts.title) || (ctype ? `${(opts == null ? void 0 : opts.name) || id} \xB7 ${ctype}` : (opts == null ? void 0 : opts.name) || id || "unknown");
    const color = classColors[ctype] || "#607d8b";
    const raw = characterSprite(id, {
      size,
      ctype: opts == null ? void 0 : opts.ctype,
      name: opts == null ? void 0 : opts.name
    });
    if (raw) {
      return `<span class="ecu-meter-icon ecu-meter-icon-character" title="${escapeAttr(tip)}" style="width:${size}px;height:${size}px;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;line-height:0">${raw}</span>`;
    }
    const classRaw = classSprite(ctype || void 0, { size });
    if (classRaw) {
      return `<span class="ecu-meter-icon ecu-meter-icon-class ecu-meter-icon-class-sprite" title="${escapeAttr(tip)}" style="width:${size}px;height:${size}px;border-color:${color};background:${color}">${classRaw}</span>`;
    }
    const letter = CLASS_LETTERS[ctype] || ((opts == null ? void 0 : opts.name) || id || "?").slice(0, 1).toUpperCase() || "?";
    return letterFallbackHtml(letter, size, tip, color);
  }
  function deathIconHtml(displaySize) {
    return letterFallbackHtml("\u271D", displaySize, "Death", "#c62828");
  }
  function monsterIconHtml(mtype, displaySize = 18, title) {
    const tip = title || monsterDisplayName(mtype) || mtype;
    const raw = monsterSprite(mtype, { size: displaySize });
    if (raw) {
      return `<span class="ecu-meter-icon ecu-meter-icon-monster" title="${escapeAttr(tip)}" style="width:${displaySize}px;height:${displaySize}px;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;line-height:0">${raw}</span>`;
    }
    return letterFallbackHtml(
      (tip || "?").slice(0, 1).toUpperCase(),
      displaySize,
      tip
    );
  }
  function gameIconHtml(id, opts) {
    const size = opts && opts.size || 18;
    const kind = opts && opts.kind || "auto";
    if (kind === "death") return deathIconHtml(size);
    if (kind === "class") return classIconHtml((opts == null ? void 0 : opts.ctype) || id, size);
    if (kind === "character" || kind === "actor") {
      return characterIconHtml(id, {
        size,
        ctype: opts == null ? void 0 : opts.ctype,
        name: opts == null ? void 0 : opts.name,
        title: opts == null ? void 0 : opts.title
      });
    }
    const resolved = resolveGameIcon(id, kind, {
      ctype: opts == null ? void 0 : opts.ctype,
      mtype: opts == null ? void 0 : opts.mtype,
      name: opts == null ? void 0 : opts.name
    });
    const title = (opts == null ? void 0 : opts.title) || resolved.name || id;
    if (resolved.kind === "monster") {
      if (resolved.mtype) return monsterIconHtml(resolved.mtype, size, title);
      return letterFallbackHtml(
        (title || id || "?").slice(0, 1).toUpperCase(),
        size,
        title
      );
    }
    if (resolved.kind === "character") {
      return characterIconHtml(id, {
        size,
        ctype: resolved.ctype || (opts == null ? void 0 : opts.ctype),
        name: resolved.name || (opts == null ? void 0 : opts.name),
        title
      });
    }
    if (resolved.kind === "class") {
      return classIconHtml(resolved.ctype || id, size);
    }
    if (resolved.skin) {
      const sheet = skinSheetHtml(resolved.skin, size, title);
      if (sheet) return sheet;
    }
    if (kind === "skill" || kind === "auto" || kind === "condition") {
      const asSkin = skinSheetHtml(resolved.id || id, size, title);
      if (asSkin) return asSkin;
    }
    const letter = (title || id || "?").slice(0, 1).toUpperCase();
    return letterFallbackHtml(letter, size, title);
  }
  function skillIconHtml(key, displaySize = 18) {
    return gameIconHtml(key, { kind: "skill", size: displaySize });
  }
  function targetIconHtml(row2, displaySize = 18) {
    return gameIconHtml(row2.id, {
      kind: "target",
      size: displaySize,
      ctype: row2.ctype,
      mtype: row2.mtype,
      name: row2.name,
      title: row2.name
    });
  }
  function rowIconHtml(row2, opts) {
    var _a, _b;
    if (opts && opts.icons === false) return "";
    const size = opts && opts.iconSize || 18;
    if (row2.id === "__total__") return "";
    if (row2.kind === "ability" || row2.kind === "channel") {
      return gameIconHtml(row2.id, { kind: "auto", size });
    }
    if (row2.kind === "target") {
      return targetIconHtml(row2, size);
    }
    if (row2.kind === "player") {
      if ((opts == null ? void 0 : opts.classIcons) && row2.ctype) return classIconHtml(row2.ctype, size);
      return "";
    }
    const G = getG();
    if (((_a = G == null ? void 0 : G.skills) == null ? void 0 : _a[row2.id]) || ((_b = G == null ? void 0 : G.conditions) == null ? void 0 : _b[row2.id])) {
      return gameIconHtml(row2.id, { kind: "auto", size });
    }
    if (row2.ctype) {
      if (opts == null ? void 0 : opts.classIcons) return classIconHtml(row2.ctype, size);
      return "";
    }
    return gameIconHtml(row2.id, { kind: "auto", size });
  }
  function paintItemContainerIcon(el, skin, size) {
    const html = itemContainer({ skin, size, draggable: false }, null);
    if (!html) {
      el.textContent = skin.slice(0, 1);
      return false;
    }
    el.innerHTML = html;
    const root = el.firstElementChild;
    if (root) {
      root.style.margin = "0";
      root.removeAttribute("onmousedown");
      root.removeAttribute("ontouchstart");
      root.removeAttribute("onclick");
    }
    return true;
  }
  function paintGameIcon(el, id, opts) {
    const size = opts && opts.size || 18;
    const kind = opts && opts.kind || "auto";
    if ((opts == null ? void 0 : opts.container) && kind !== "monster" && kind !== "target" && kind !== "character" && kind !== "actor" && kind !== "class") {
      const resolved = resolveGameIcon(id, kind, { ctype: opts == null ? void 0 : opts.ctype });
      const skin = resolved.skin || (kind === "skill" ? id : void 0);
      if (skin && paintItemContainerIcon(el, skin, size)) return;
    }
    el.innerHTML = gameIconHtml(id, {
      kind,
      size,
      ctype: opts == null ? void 0 : opts.ctype,
      mtype: opts == null ? void 0 : opts.mtype,
      name: opts == null ? void 0 : opts.name,
      title: opts == null ? void 0 : opts.title
    });
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
  function emptyHitAmountStats() {
    return { count: 0, total: 0, min: 0, max: 0 };
  }
  function bumpHitAmount(stats, amount) {
    if (!(amount > 0)) return;
    if (stats.count === 0) {
      stats.min = amount;
      stats.max = amount;
    } else {
      if (amount < stats.min) stats.min = amount;
      if (amount > stats.max) stats.max = amount;
    }
    stats.count += 1;
    stats.total += amount;
  }
  function mergeHitAmountStats(dest, src) {
    if (!src || src.count <= 0) return;
    if (dest.count === 0) {
      dest.count = src.count;
      dest.total = src.total;
      dest.min = src.min;
      dest.max = src.max;
      return;
    }
    dest.count += src.count;
    dest.total += src.total;
    if (src.min < dest.min) dest.min = src.min;
    if (src.max > dest.max) dest.max = src.max;
  }
  function dominantDamageType(types) {
    if (!types) return void 0;
    const keys = Object.keys(types);
    let best;
    let bestV = 0;
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const v = types[k] || 0;
      if (v > bestV) {
        bestV = v;
        best = k;
      }
    }
    return best;
  }
  function damageAbilityKey(source) {
    if (!source || source === "attack") return "attack";
    return canonicalAbilityId(source);
  }
  function healAbilityKey(source, heal, lifesteal) {
    if (heal && heal > 0) {
      if (!source || source === "attack") return "heal";
      return canonicalAbilityId(source);
    }
    if (lifesteal && lifesteal > 0) return "lifesteal";
    if (!source || source === "attack") return "heal";
    return canonicalAbilityId(source);
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
        normal: emptyHitAmountStats(),
        crit: emptyHitAmountStats(),
        damageTypes: {},
        targets: {}
      };
      actor.abilities[key] = ab;
    } else {
      if (!ab.normal) ab.normal = emptyHitAmountStats();
      if (!ab.crit) ab.crit = emptyHitAmountStats();
      if (!ab.damageTypes) ab.damageTypes = {};
    }
    return ab;
  }
  function ensureTarget(ab, id, name, meta) {
    let t = ab.targets[id];
    if (!t) {
      t = {
        id,
        name: name || id,
        mtype: meta == null ? void 0 : meta.mtype,
        ctype: meta == null ? void 0 : meta.ctype,
        damage: 0,
        heal: 0,
        splashDamage: 0,
        outcomes: emptyOutcomes(),
        normal: emptyHitAmountStats(),
        crit: emptyHitAmountStats()
      };
      ab.targets[id] = t;
    } else {
      if (name) t.name = name;
      if (meta == null ? void 0 : meta.mtype) t.mtype = meta.mtype;
      if (meta == null ? void 0 : meta.ctype) t.ctype = meta.ctype;
      if (!t.normal) t.normal = emptyHitAmountStats();
      if (!t.crit) t.crit = emptyHitAmountStats();
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
  function isCritHit(ev) {
    return !!(ev.crit && ev.crit > 1);
  }
  function bumpLandedAmount(ab, tgt, amount, crit) {
    if (!(amount > 0)) return;
    if (crit) {
      bumpHitAmount(ab.crit, amount);
      bumpHitAmount(tgt.crit, amount);
    } else {
      bumpHitAmount(ab.normal, amount);
      bumpHitAmount(tgt.normal, amount);
    }
  }
  function bumpDamageType(ab, damageType, amount) {
    if (!damageType || !(amount > 0)) return;
    const key = damageType.toLowerCase();
    ab.damageTypes[key] = (ab.damageTypes[key] || 0) + amount;
  }
  function applyDamageToSegment(seg, ev, opts) {
    var _a, _b, _c;
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
      const takenAb = ensureAbility(tgt, damageAbilityKey(ev.source));
      takenAb.taken += ev.damage;
    }
    if (!ev.actor || !actorIsPlayer) return;
    const actor = ensureActor(seg, ev.actor, opts.actorMeta);
    const targetId = ev.target || "_";
    const targetName = (_a = opts.targetMeta) == null ? void 0 : _a.name;
    const targetIconMeta = {
      mtype: (_b = opts.targetMeta) == null ? void 0 : _b.mtype,
      ctype: (_c = opts.targetMeta) == null ? void 0 : _c.ctype
    };
    const hasDamage = !!(ev.damage && ev.damage > 0);
    const healAmt = opts.effectiveHeal || 0;
    const manaAmt = opts.effectiveMana || 0;
    const crit = isCritHit(ev);
    bumpOutcome(actor.outcomes, ev);
    if (hasDamage) {
      const dmgKey = damageAbilityKey(ev.source);
      const ab = ensureAbility(actor, dmgKey);
      const tgt = ensureTarget(ab, targetId, targetName, targetIconMeta);
      bumpOutcome(ab.outcomes, ev);
      bumpOutcome(tgt.outcomes, ev);
      actor.damage += ev.damage;
      ab.damage += ev.damage;
      tgt.damage += ev.damage;
      if (ev.splash) {
        ab.splashDamage += ev.damage;
        tgt.splashDamage += ev.damage;
      }
      bumpLandedAmount(ab, tgt, ev.damage, crit);
      bumpDamageType(ab, ev.damageType, ev.damage);
      const ch = deriveChannel(ev);
      if (ch === "burn") actor.burn += ev.damage;
      else if (ch === "blast") actor.blast += ev.damage;
      else if (ch === "cleave") actor.cleave += ev.damage;
      else if (ch === "base") actor.base += ev.damage;
    }
    if (healAmt > 0) {
      const hKey = healAbilityKey(ev.source, ev.heal, ev.lifesteal);
      const ab = ensureAbility(actor, hKey);
      const tgt = ensureTarget(ab, targetId, targetName, targetIconMeta);
      if (!hasDamage) {
        bumpOutcome(ab.outcomes, ev);
        bumpOutcome(tgt.outcomes, ev);
      }
      actor.heal += healAmt;
      ab.heal += healAmt;
      tgt.heal += healAmt;
      bumpLandedAmount(ab, tgt, healAmt, !hasDamage && crit);
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
      casts: [],
      gearSwaps: []
    };
  }
  function mergeDamageTypes(dest, src) {
    if (!src) return;
    const keys = Object.keys(src);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      dest[k] = (dest[k] || 0) + (src[k] || 0);
    }
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
          mergeHitAmountStats(dab.normal, sab.normal);
          mergeHitAmountStats(dab.crit, sab.crit);
          mergeDamageTypes(dab.damageTypes, sab.damageTypes);
          const tKeys = Object.keys(sab.targets);
          for (let t = 0; t < tKeys.length; t++) {
            const st = sab.targets[tKeys[t]];
            const dt = ensureTarget(dab, st.id, st.name, {
              mtype: st.mtype,
              ctype: st.ctype
            });
            dt.damage += st.damage;
            dt.heal += st.heal;
            dt.splashDamage += st.splashDamage;
            dt.outcomes.hits += st.outcomes.hits;
            dt.outcomes.crits += st.outcomes.crits;
            dt.outcomes.miss += st.outcomes.miss;
            dt.outcomes.evade += st.outcomes.evade;
            dt.outcomes.avoid += st.outcomes.avoid;
            dt.outcomes.kills += st.outcomes.kills;
            mergeHitAmountStats(dt.normal, st.normal);
            mergeHitAmountStats(dt.crit, st.crit);
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
    const out = {
      x: clamp(Number(raw.x), 0, 100) || 0,
      y: clamp(Number(raw.y), 0, 100) || 0,
      anchor: valid.indexOf(anchor) >= 0 ? anchor : fallback.anchor
    };
    if (raw.snap && typeof raw.snap === "object") {
      const snap = {};
      const sides = [1, 2, 3, 4];
      for (let i = 0; i < sides.length; i++) {
        const side = sides[i];
        const nid = raw.snap[side];
        if (typeof nid === "string" && nid) snap[side] = nid;
      }
      if (snap[1] || snap[2] || snap[3] || snap[4]) out.snap = snap;
    }
    if (raw.horizontalSnap) out.horizontalSnap = true;
    if (raw.verticalSnap) out.verticalSnap = true;
    if (typeof raw.locked === "boolean") out.locked = raw.locked;
    return out;
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
  function anchorOrigin(anchor) {
    switch (anchor) {
      case "tl":
        return "0% 0%";
      case "tr":
        return "100% 0%";
      case "bl":
        return "0% 100%";
      case "br":
        return "100% 100%";
      case "tc":
        return "50% 0%";
      case "bc":
        return "50% 100%";
      case "center":
        return "50% 50%";
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
    const scale = typeof pos.scale === "number" && Number.isFinite(pos.scale) && pos.scale > 0 ? pos.scale : 1;
    const base = anchorTransform(pos.anchor);
    return {
      position: "absolute",
      left: `${pos.x}%`,
      top: `${pos.y}%`,
      transform: scale === 1 ? base : `${base} scale(${scale})`,
      transformOrigin: anchorOrigin(pos.anchor),
      pointerEvents: "auto",
      zIndex: editing ? 40 : 20,
      // Hug children so layout chrome matches real frame footprints.
      width: "fit-content",
      height: "fit-content",
      // Viewport ceiling so windows can fill the screen (was 96vw/96vh).
      maxWidth: "100vw",
      maxHeight: "100vh",
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
    burn: "Burned",
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
      label: "Summary",
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
      label: "Time Line",
      presetId: "timeline",
      presentation: "timeline",
      query: { kind: "timeline" }
    }
  ];
  var REPORT_STUB_TABS = [
    { id: "charts", label: "Charts" },
    { id: "emotes", label: "Emotes" },
    { id: "phases", label: "Phases" }
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
      defaultFrame: { w: 780, h: 520 }
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
      label: "Encounter Details",
      query: { kind: "encounter_summary" },
      presentation: "encounter",
      catalog: false,
      catalogGroup: "tool",
      defaultVisible: false,
      defaultPos: { x: 50, y: 88, anchor: "bc" },
      defaultFrame: { w: 780, h: 520 }
    },
    {
      id: "timeline",
      label: "Time Line",
      query: { kind: "timeline" },
      presentation: "timeline",
      catalog: false,
      catalogGroup: "tool",
      defaultVisible: false,
      defaultPos: { x: 50, y: 88, anchor: "bc" },
      defaultFrame: { w: 780, h: 520 }
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
      const ratePrimary = r.primary === "rate" || r.primary == null && r.barValue != null;
      if (ratePrimary && r.rate != null) {
        lines.push(
          `${i + 1}. ${r.name} \u2014 ${Math.round(r.rate)}/s (${Math.round(r.value)}) \xB7 ${Math.round(r.pct * 100)}%`
        );
      } else {
        const rate = r.rate != null ? ` (${Math.round(r.rate)}/s)` : "";
        lines.push(
          `${i + 1}. ${r.name} \u2014 ${Math.round(r.value)}${rate} \xB7 ${Math.round(r.pct * 100)}%`
        );
      }
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
    "Burned",
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
        zIndex: typeof row2.zIndex === "number" && Number.isFinite(row2.zIndex) && row2.zIndex > 0 ? Math.floor(row2.zIndex) : void 0,
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

  // src/lib/changelog.ts
  var FEATURE_OVERVIEW = [
    {
      label: "Movable panels",
      detail: "Drag panels and save layouts."
    },
    {
      label: "Player & target",
      detail: "HP, resources, and buffs for who you watch and their target."
    },
    {
      label: "Party roster",
      detail: "Party chips with vitals and buffs."
    },
    {
      label: "Character & server",
      detail: "Reworked chips, Follow / Bag / Command, richer server picker."
    },
    {
      label: "Command snippets",
      detail: "Save and rerun CODE presets."
    },
    {
      label: "Damage meters",
      detail: "Add windows for damage, healing, coop, and more."
    },
    {
      label: "Boss bars",
      detail: "Large boss HP with click-to-target."
    }
  ];
  var CHANGELOG = [
    {
      id: "0.7.1-windows",
      title: "Unified windows",
      items: [
        {
          label: "Lock any panel",
          detail: "HUD and meters share the same lock \u2014 unlock to drag; hold Alt to nudge while locked."
        },
        {
          label: "Cross-group snap",
          detail: "Edge-snap meters to HUD panels (and each other) in one group graph."
        },
        {
          label: "Window Control",
          detail: "\u2630 menu on panels: lock, ungroup, close, and reopen closed windows."
        }
      ]
    },
    {
      id: "0.7.0",
      title: "0.7",
      items: FEATURE_OVERVIEW
    }
  ];
  function latestChangelogId() {
    return CHANGELOG[0] ? CHANGELOG[0].id : "";
  }
  function unseenChangelogEntries(seenId) {
    if (!CHANGELOG.length) return [];
    if (!seenId) return [CHANGELOG[0]];
    const idx = CHANGELOG.findIndex((entry) => entry.id === seenId);
    if (idx < 0) return [CHANGELOG[0]];
    if (idx === 0) return [];
    return CHANGELOG.slice(0, idx);
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
    windowsLocked: true,
    metersLocked: true,
    meterAlwaysShowSelf: true,
    meterWindowGrouping: true,
    meterBookmarks: [],
    meterRecentReports: [],
    metersHidden: false,
    meterClosedInstances: [],
    setupWizardDone: false,
    changelogSeenId: null,
    toursCompleted: {},
    windowNumberById: {},
    nextWindowNumber: 1
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
      windowsLocked: typeof parsed.windowsLocked === "boolean" ? parsed.windowsLocked : parsed.metersLocked !== false,
      meterAlwaysShowSelf: parsed.meterAlwaysShowSelf !== false,
      meterWindowGrouping: parsed.meterWindowGrouping !== false,
      meterBookmarks: normalizeMeterBookmarks(parsed.meterBookmarks),
      meterRecentReports: Array.isArray(parsed.meterRecentReports) ? parsed.meterRecentReports.filter(
        (r) => r && typeof r.id === "string" && typeof r.label === "string" && typeof r.text === "string"
      ).slice(0, 10) : [],
      metersHidden: !!parsed.metersHidden,
      setupWizardDone: !!parsed.setupWizardDone || !!(parsed.meterAppearance && parsed.meterAppearance.setupWizardDone),
      changelogSeenId: typeof parsed.changelogSeenId === "string" ? parsed.changelogSeenId : null,
      toursCompleted: parsed.toursCompleted && typeof parsed.toursCompleted === "object" ? parsed.toursCompleted : {},
      windowNumberById: parsed.windowNumberById && typeof parsed.windowNumberById === "object" ? parsed.windowNumberById : {},
      nextWindowNumber: typeof parsed.nextWindowNumber === "number" && parsed.nextWindowNumber > 0 ? Math.floor(parsed.nextWindowNumber) : 1
    };
    if (next.setupWizardDone && typeof parsed.changelogSeenId !== "string") {
      next.changelogSeenId = latestChangelogId();
    }
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
      windowsLocked: true,
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
    if (typeof partial.windowsLocked === "boolean") {
      next.windowsLocked = partial.windowsLocked;
      next.metersLocked = partial.windowsLocked;
    } else if (typeof partial.metersLocked === "boolean") {
      next.metersLocked = partial.metersLocked;
      next.windowsLocked = partial.metersLocked;
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
    if (partial.windowNumberById) {
      next.windowNumberById = { ...partial.windowNumberById };
    }
    if (typeof partial.nextWindowNumber === "number" && partial.nextWindowNumber > 0) {
      next.nextWindowNumber = Math.floor(partial.nextWindowNumber);
    }
    if (partial.meterClosedInstances) {
      next.meterClosedInstances = partial.meterClosedInstances;
    }
    if (typeof partial.setupWizardDone === "boolean") {
      next.setupWizardDone = partial.setupWizardDone;
    }
    if (partial.changelogSeenId !== void 0) {
      next.changelogSeenId = partial.changelogSeenId;
    }
    if (partial.toursCompleted) {
      next.toursCompleted = { ...partial.toursCompleted };
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
  function savePanelPositions(updates, profile) {
    var _a;
    const settings = getSettings();
    const resolved = profile || resolveLayoutProfile(settings.layoutProfileMode);
    return saveSettings({
      panelLayoutsByProfile: {
        [resolved]: {
          ...((_a = settings.panelLayoutsByProfile) == null ? void 0 : _a[resolved]) || {},
          ...updates
        }
      },
      panelLayout: { ...updates }
    });
  }
  function savePanelVisible(id, visible) {
    return saveSettings({ panelVisible: { [id]: visible } });
  }
  function resetMeterInstances() {
    return saveSettings({
      meterInstances: defaultMeterInstances(),
      metersLocked: true,
      windowsLocked: true
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
  var MIN_FLUSH_MS = 50;
  var listeners2 = [];
  var dirty = false;
  var raf = 0;
  var delay = 0;
  var lastFlushAt = 0;
  function notify() {
    for (let i = 0; i < listeners2.length; i++) {
      listeners2[i]();
    }
  }
  function flush() {
    raf = 0;
    if (!dirty) return;
    if (typeof document !== "undefined" && document.hidden) return;
    dirty = false;
    lastFlushAt = performance.now();
    notify();
  }
  function schedule() {
    if (raf || delay) return;
    const wait = MIN_FLUSH_MS - (performance.now() - lastFlushAt);
    if (wait > 0) {
      delay = window.setTimeout(() => {
        delay = 0;
        if (!dirty) return;
        raf = window.requestAnimationFrame(flush);
      }, wait);
      return;
    }
    raf = window.requestAnimationFrame(flush);
  }
  function markMeterDirty() {
    dirty = true;
    schedule();
  }
  function subscribeMeterTick(listener) {
    listeners2.push(listener);
    return () => {
      const idx = listeners2.indexOf(listener);
      if (idx >= 0) listeners2.splice(idx, 1);
    };
  }
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && dirty) schedule();
    });
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
    showSpecIcons: false,
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
    const saved = s.meterAppearance || {};
    const optedIn = !!saved.classIconsMigratedOff;
    return {
      ...DEFAULT_METER_APPEARANCE,
      ...saved,
      showSpecIcons: optedIn ? !!saved.showSpecIcons : false
    };
  }
  function patchMeterAppearance(partial) {
    patchSettings({
      meterAppearance: {
        ...getMeterAppearance(),
        ...partial,
        classIconsMigratedOff: true
      }
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
  var MAX_GEAR_SWAPS = 4e3;
  var GEAR_SLOT_NAMES = [
    "helmet",
    "earring1",
    "earring2",
    "amulet",
    "mainhand",
    "chest",
    "offhand",
    "cape",
    "ring1",
    "pants",
    "ring2",
    "orb",
    "belt",
    "shoes",
    "gloves",
    "elixir"
  ];
  var live = null;
  var past = [];
  var history = [];
  var lastHistoryAt = 0;
  var lastCombatAt = 0;
  var inCombat = false;
  var segSeq = 0;
  var playerMeta = {};
  var ctypeById = {};
  var watchedPartyIds = /* @__PURE__ */ new Set();
  var watchedPartyKey = "";
  var visiblePlayerIds = /* @__PURE__ */ new Set();
  var youId = "";
  function rememberCtype(id, ctype) {
    if (ctype) {
      ctypeById[id] = ctype;
      return ctype;
    }
    return ctypeById[id];
  }
  function ctypeFor(id, ent) {
    return rememberCtype(id, resolvePlayerCtype(id, ent) || ctypeById[id]);
  }
  var lastConditionSample = 0;
  var openConditions = {};
  var lastGearByActor = {};
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
  function isPlayerEntity(ent) {
    return !!(ent && (ent.player || ent.type === "character"));
  }
  function isPlayerId(id) {
    if (!id) return false;
    if (playerMeta[id]) return true;
    const rec = getEntitiesRecord();
    if (isPlayerEntity(rec[id])) return true;
    const ent = findEntityById(id);
    if (isPlayerEntity(ent)) return true;
    return !/^\d+$/.test(id);
  }
  function rememberIdentity(set, ent, extra) {
    if (extra) set.add(String(extra));
    if (!ent) return;
    if (ent.id != null && String(ent.id) !== "") set.add(String(ent.id));
    if (ent.name) set.add(String(ent.name));
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
    clearGearSnapshots();
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
    if (m) {
      const ctype = ctypeFor(id) || m.ctype;
      if (ctype && m.ctype !== ctype) m.ctype = ctype;
      return m;
    }
    const ent = findEntityById(id) || getEntitiesRecord()[id];
    if (!ent) {
      return {
        name: id,
        ctype: ctypeFor(id),
        partyKey: soloKey(id)
      };
    }
    return {
      name: ent.name || id,
      ctype: ctypeFor(id, ent),
      mtype: ent.mtype,
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
    var _a;
    if (now - lastConditionSample < CONDITION_SAMPLE_MS) return;
    lastConditionSample = now;
    const seg = live;
    if (!seg) return;
    const ents = getEntitiesRecord();
    const ids = Object.keys(playerMeta);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const ent = findEntityById(id) || ents[id] || (((_a = playerMeta[id]) == null ? void 0 : _a.name) ? ents[playerMeta[id].name] : void 0);
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
  function clearGearSnapshots() {
    const ids = Object.keys(lastGearByActor);
    for (let i = 0; i < ids.length; i++) delete lastGearByActor[ids[i]];
  }
  function gearFingerprint(slot) {
    var _a, _b;
    if (!slot || !slot.name) return "";
    return `${slot.name}|${(_a = slot.level) != null ? _a : ""}|${(_b = slot.skin) != null ? _b : ""}`;
  }
  function parseGearFp(fp) {
    if (!fp) return {};
    const parts = fp.split("|");
    const name = parts[0] || void 0;
    const levelRaw = parts[1] ? Number(parts[1]) : NaN;
    const skin = parts[2] || void 0;
    return {
      name,
      level: Number.isFinite(levelRaw) ? levelRaw : void 0,
      skin: skin || void 0
    };
  }
  function slotsForActor(id) {
    const character = getCharacter();
    if (character && String(character.id) === id && character.slots) {
      return character.slots;
    }
    const liveEnt = findEntityById(id) || getEntitiesRecord()[id];
    if (liveEnt && liveEnt.slots) return liveEnt.slots;
    const observing = getObserving();
    if (observing && String(observing.id) === id && observing.slots) {
      return observing.slots;
    }
    return void 0;
  }
  function pushGearSwap(seg, actorId, slot, oldFp, newFp, now) {
    const oldS = parseGearFp(oldFp);
    const newS = parseGearFp(newFp);
    const itemName = newS.name || oldS.name;
    if (!itemName) return;
    const ev = {
      at: now,
      actorId,
      slot,
      oldName: oldS.name,
      newName: newS.name,
      oldLevel: oldS.level,
      newLevel: newS.level,
      skin: newS.skin || oldS.skin || itemSkin(itemName)
    };
    if (!seg.gearSwaps) seg.gearSwaps = [];
    seg.gearSwaps.push(ev);
    while (seg.gearSwaps.length > MAX_GEAR_SWAPS) seg.gearSwaps.shift();
  }
  function sampleGearSwaps(now) {
    const seg = live;
    if (!seg) return;
    const ids = Object.keys(playerMeta);
    let dirty2 = false;
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const slots = slotsForActor(id);
      if (!slots) continue;
      let prev = lastGearByActor[id];
      const first = !prev;
      if (!prev) {
        prev = {};
        lastGearByActor[id] = prev;
      }
      for (let s = 0; s < GEAR_SLOT_NAMES.length; s++) {
        const slot = GEAR_SLOT_NAMES[s];
        const nextFp = gearFingerprint(slots[slot]);
        const oldFp = prev[slot] || "";
        if (first) {
          prev[slot] = nextFp;
          continue;
        }
        if (oldFp === nextFp) continue;
        prev[slot] = nextFp;
        pushGearSwap(seg, id, slot, oldFp, nextFp, now);
        dirty2 = true;
      }
    }
    if (dirty2) markMeterDirty();
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
    while (seg.casts.length > 8e3) seg.casts.shift();
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
    if (!id) return false;
    if (visiblePlayerIds.has(id)) return true;
    const rec = getEntitiesRecord();
    if (isPlayerEntity(rec[id])) return true;
    const ent = findEntityById(id);
    if (!isPlayerEntity(ent)) return false;
    if (ent.id != null && visiblePlayerIds.has(String(ent.id))) return true;
    if (ent.name && visiblePlayerIds.has(String(ent.name))) return true;
    return true;
  }
  function isWatchedPartyMember(id) {
    if (!id) return false;
    if (watchedPartyIds.has(id)) return true;
    const rec = getEntitiesRecord();
    const ent = rec[id] || findEntityById(id);
    if (!ent) return false;
    if (ent.id != null && watchedPartyIds.has(String(ent.id))) return true;
    if (ent.name && watchedPartyIds.has(String(ent.name))) return true;
    return false;
  }
  function listVisibleParties() {
    const byKey = {};
    const ids = Object.keys(playerMeta);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      if (!isVisiblePlayer(id)) continue;
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
      rememberIdentity(nextWatched, observing, String(observingId));
      watchedPartyKey = observing.party || soloKey(String(observingId), observing.name);
      if (observing.party) {
        for (let i = 0; i < entities.length; i++) {
          const ent = entities[i];
          if (isPlayerEntity(ent) && ent.party === observing.party) {
            rememberIdentity(nextWatched, ent);
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
      if (!isPlayerEntity(ent)) continue;
      const id = ent.id != null && String(ent.id) !== "" ? String(ent.id) : ent.name ? String(ent.name) : "";
      if (!id) continue;
      rememberIdentity(nextVisible, ent, id);
      const ctype = ctypeFor(id, ent);
      nextMeta[id] = {
        name: ent.name || id,
        ctype,
        partyKey: partyKeyFor(ent, id)
      };
      syncShadowFromEntity(id, ent);
      if (live && live.actors[id]) {
        live.actors[id].name = nextMeta[id].name;
        if (ctype) live.actors[id].ctype = ctype;
        else if (!live.actors[id].ctype && ctypeById[id]) {
          live.actors[id].ctype = ctypeById[id];
        }
        live.actors[id].partyKey = nextMeta[id].partyKey;
      }
    }
    if (observingId && observing) {
      const id = String(observingId);
      rememberIdentity(nextVisible, observing, id);
      const ctype = ctypeFor(id, observing);
      const prev = nextMeta[id];
      nextMeta[id] = {
        name: observing.name || (prev == null ? void 0 : prev.name) || id,
        ctype: ctype || (prev == null ? void 0 : prev.ctype),
        partyKey: partyKeyFor(observing, id)
      };
      if (live && live.actors[id] && nextMeta[id].ctype) {
        live.actors[id].ctype = nextMeta[id].ctype;
        live.actors[id].name = nextMeta[id].name;
        live.actors[id].partyKey = nextMeta[id].partyKey;
      }
    }
    if (live) {
      const actorIds = Object.keys(live.actors);
      for (let i = 0; i < actorIds.length; i++) {
        const id = actorIds[i];
        const actor = live.actors[id];
        if (actor.ctype) {
          rememberCtype(id, actor.ctype);
          continue;
        }
        const ctype = ctypeFor(id);
        if (ctype) actor.ctype = ctype;
      }
    }
    const rec = getEntitiesRecord();
    const recKeys = Object.keys(rec);
    for (let i = 0; i < recKeys.length; i++) {
      const key = recKeys[i];
      const ent = rec[key];
      if (isPlayerEntity(ent)) rememberIdentity(nextVisible, ent, key);
    }
    visiblePlayerIds = nextVisible;
    playerMeta = nextMeta;
    sampleConditions(now);
    sampleGearSwaps(now);
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
    clearGearSnapshots();
    markMeterDirty();
  }
  function resetCurrentMeterSegment() {
    live = null;
    lastCombatAt = 0;
    inCombat = false;
    clearRollingWindow();
    clearGearSnapshots();
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

/* Party roster: Buffs mode chip sits in the first party header (gold WC family). */
.ecu-roster {
  position: relative;
}
.ecu-roster-buffs {
  cursor: pointer;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  padding: 1px 7px;
  min-height: 20px;
  line-height: 1.2;
  border: 1px solid #886;
  border-radius: 0;
  background: rgba(30, 30, 20, 0.92);
  color: #ffe08a;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.35);
  transition: background 0.1s ease, border-color 0.1s ease, color 0.1s ease;
}
.ecu-roster-buffs:hover {
  background: rgba(50, 42, 22, 0.96);
  border-color: #aa8;
  color: #ffe9a8;
}
.ecu-roster-buffs:active {
  background: rgba(40, 34, 18, 0.96);
}
.ecu-roster-buffs-k {
  color: rgba(255, 224, 138, 0.72);
  letter-spacing: 0.02em;
}
.ecu-roster-buffs-sep {
  color: rgba(255, 224, 138, 0.45);
  user-select: none;
}
.ecu-roster-buffs-v {
  color: #ffe08a;
  letter-spacing: 0.03em;
}
.ecu-roster-buffs:hover .ecu-roster-buffs-k,
.ecu-roster-buffs:hover .ecu-roster-buffs-v {
  color: #ffe9a8;
}
/* Layout-edit body is click-through \u2014 keep Buffs usable. */
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-panel-body .ecu-roster-buffs {
  pointer-events: auto !important;
  z-index: 8;
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
/* Details: large window numbers while left-hold dragging (~1s). HUD + meters. */
#comm-ui .comm-pos-window-id {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 30;
  font-size: clamp(48px, 55%, 120px);
  font-weight: 800;
  line-height: 1;
  color: #ff9a28;
  text-shadow:
    0 0 2px #000,
    0 2px 8px rgba(0, 0, 0, 0.85),
    0 0 24px rgba(255, 140, 20, 0.35);
  font-variant-numeric: tabular-nums;
  user-select: none;
}
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-edit-header,
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-edit-header *,
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-panel-close,
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-anchor-pad,
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-anchor-pad button,
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-ungroup,
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-lock,
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-wc,
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-wc *,
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-window-chrome,
#comm-ui .comm-pos-panel.comm-pos-editing .comm-pos-window-chrome * {
  pointer-events: auto;
}
/* Edge-snap group affordances (layout edit + play-arrange). */
#comm-ui .comm-pos-panel.comm-pos-grouped.comm-pos-editing,
#comm-ui .comm-pos-panel.comm-pos-grouped.comm-pos-arrange {
  box-shadow: 0 0 0 1px rgba(120, 200, 255, 0.35);
}
#comm-ui .comm-pos-panel.comm-pos-snap-target {
  box-shadow:
    0 0 0 2px rgba(120, 220, 255, 0.85),
    0 0 16px rgba(80, 180, 255, 0.25) !important;
}
#comm-ui .comm-pos-panel.comm-pos-dragging {
  opacity: 0.92;
}
/* Window Control menu */
#comm-ui .comm-pos-wc-item {
  display: block;
  width: 100%;
  text-align: left;
  cursor: pointer;
  font-size: 12px;
  padding: 4px 8px;
  border: none;
  background: transparent;
  color: #ffe08a;
}
#comm-ui .comm-pos-wc-item:hover {
  background: rgba(80, 70, 30, 0.9);
}
#comm-ui .comm-pos-edit-grip-row {
  pointer-events: auto;
  cursor: grab;
}
#comm-ui .comm-pos-edit-grip-row .comm-pos-edit-grip {
  flex: 1 1 auto;
  min-width: 48px;
}
/* Play-arrange lock / WC / grip: above the frame when space allows; otherwise
 * in-flow (is-inline) so chrome is not clipped and content shifts down. */
#comm-ui .comm-pos-arrange-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 100%;
  top: auto;
  z-index: 6;
  display: flex;
  align-items: stretch;
  justify-content: flex-end;
  gap: 4px;
  margin-bottom: 0;
  padding: 0 0 4px;
  box-sizing: border-box;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.12s ease;
  background: transparent;
  height: auto;
  overflow: visible;
}
/* Hit bridge into the panel so moving onto the bar does not fire mouseleave. */
#comm-ui .comm-pos-arrange-overlay.is-above::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  height: 6px;
}
#comm-ui .comm-pos-arrange-overlay.is-inline {
  position: relative;
  left: auto;
  right: auto;
  bottom: auto;
  top: auto;
  margin-bottom: 2px;
  padding-bottom: 0;
  /* Idle inline chrome must not reserve height \u2014 only when open. */
  max-height: 0;
  opacity: 0;
  overflow: hidden;
}
#comm-ui .comm-pos-arrange-overlay.is-chrome-only {
  justify-content: flex-end;
}
#comm-ui .comm-pos-arrange-overlay.has-grip {
  justify-content: stretch;
}
/* Mini drag header \u2014 same role as layout-edit header, but hover-only. */
#comm-ui .comm-pos-arrange-overlay .comm-pos-edit-grip {
  position: static;
  left: auto;
  top: auto;
  transform: none;
  flex: 1 1 auto;
  min-width: 48px;
  z-index: 0;
}
#comm-ui .comm-pos-arrange-overlay .comm-pos-window-chrome {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
}
#comm-ui .comm-pos-arrange-overlay .comm-pos-panel-close-in-chrome {
  position: relative;
  top: auto;
  right: auto;
  flex: 0 0 auto;
  align-self: center;
  z-index: 1;
}
#comm-ui .comm-pos-arrange-overlay > * {
  pointer-events: none;
}
/* JS hover class (delayed leave) \u2014 survives the gap to above-frame controls. */
@media (hover: hover) and (pointer: fine) {
  #comm-ui .comm-pos-panel.comm-pos-chrome-open > .comm-pos-arrange-overlay,
  #comm-ui .comm-pos-panel:focus-within > .comm-pos-arrange-overlay {
    opacity: 1;
    pointer-events: auto;
  }
  #comm-ui .comm-pos-panel.comm-pos-chrome-open > .comm-pos-arrange-overlay.is-inline,
  #comm-ui .comm-pos-panel:focus-within > .comm-pos-arrange-overlay.is-inline {
    max-height: 48px;
    overflow: visible;
  }
  #comm-ui .comm-pos-panel.comm-pos-chrome-open > .comm-pos-arrange-overlay > *,
  #comm-ui .comm-pos-panel:focus-within > .comm-pos-arrange-overlay > * {
    pointer-events: auto;
  }
}
/* Touch / coarse: always show so lock/WC remain reachable. */
@media (hover: none), (pointer: coarse) {
  #comm-ui .comm-pos-arrange-overlay {
    opacity: 1;
    pointer-events: auto;
  }
  #comm-ui .comm-pos-arrange-overlay.is-inline {
    max-height: 48px;
    overflow: visible;
  }
  #comm-ui .comm-pos-arrange-overlay > * {
    pointer-events: auto;
  }
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
  function currentServerKey() {
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
  function isCharOnCurrentServer(char) {
    const key = currentServerKey();
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
    const curKey = currentServerKey();
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
      const offServer = !isCharOnCurrentServer(char) && !!serverLabel2;
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
  var HANDLER = "__ecuDialogDismissHandler";
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
  function isTourChrome(el) {
    if (!el.closest) return false;
    return !!(el.closest("[data-ecu-tour-portal]") || el.closest(".ecu-tour-root") || el.closest(".ecu-tour-card"));
  }
  function onDialogDismissPointerDown(ev) {
    if (layoutEditing) return;
    if (!isOpen("buff") && !isOpen("item")) return;
    const t = ev.target;
    if (!t) return;
    const el = t;
    if (isInfoDialogChrome(el) || isInfoSource(el) || isTourChrome(el)) {
      return;
    }
    clearInfoHost("buff");
    clearInfoHost("item");
  }
  function installDialogDismiss() {
    const prev = window[HANDLER];
    if (prev) {
      document.removeEventListener("pointerdown", prev, true);
    }
    window[HANDLER] = onDialogDismissPointerDown;
    document.addEventListener("pointerdown", onDialogDismissPointerDown, true);
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
  var BOUND = "__ecuCommKeyboardBound";
  function installCommKeyboardPolicy(handlers) {
    window.__ecuCommKeyHandlers = handlers;
    if (window[BOUND]) return;
    window[BOUND] = true;
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

  // src/ui/frames/comm/commWizCaps.ts
  function capabilityCaps(items) {
    return e(
      "div",
      { className: "ecu-comm-wiz-caps" },
      ...items.map(
        (cap, i) => e(
          "div",
          { key: `cap-${i}`, className: "ecu-comm-wiz-cap" },
          e("div", { className: "ecu-comm-wiz-cap-label" }, cap.label),
          e("div", { className: "ecu-comm-wiz-cap-detail" }, cap.detail)
        )
      )
    );
  }

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
  min-width: min(560px, 94vw);
  max-width: 720px;
  padding: 26px 28px 22px;
  background: linear-gradient(180deg, #1a171b 0%, #0e0c10 100%);
  border: 1px solid rgba(0, 0, 0, 0.85);
  outline: 1px solid rgba(232, 201, 106, 0.35);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.7);
  color: #eee;
  font-size: 22px;
}
.ecu-comm-wiz-logo {
  font-size: 36px;
  font-weight: normal;
  color: #ffd28a;
  letter-spacing: 0.02em;
  margin-bottom: 14px;
  text-shadow: none;
}
.ecu-comm-wiz h3 {
  margin: 0 0 12px;
  font-size: 28px;
  color: #fff;
  font-weight: normal;
}
.ecu-comm-wiz p {
  margin: 0 0 18px;
  color: rgba(220, 210, 210, 0.92);
  font-size: 22px;
  line-height: 1.55;
}
.ecu-comm-wiz-list {
  margin: 0 0 18px;
  padding-left: 22px;
  color: rgba(220, 210, 210, 0.92);
  font-size: 22px;
  line-height: 1.55;
}
.ecu-comm-wiz-list li {
  margin-bottom: 8px;
}
.ecu-comm-wiz-caps {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 0 0 20px;
}
.ecu-comm-wiz-cap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-top: 2px solid rgba(232, 201, 106, 0.55);
  box-sizing: border-box;
  min-height: 0;
}
.ecu-comm-wiz-cap-label {
  color: #ffd28a;
  font-size: 19px;
  line-height: 1.25;
}
.ecu-comm-wiz-cap-detail {
  color: rgba(220, 210, 210, 0.9);
  font-size: 17px;
  line-height: 1.4;
}
@media (max-width: 560px) {
  .ecu-comm-wiz-caps {
    grid-template-columns: 1fr;
  }
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
  font-size: 22px;
  cursor: pointer;
}
.ecu-comm-wiz-grid label input[type="checkbox"] {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}
.ecu-comm-wiz-btn {
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: #eee;
  padding: 12px 20px;
  font-size: 22px;
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
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(220, 210, 210, 0.72);
  font-size: 20px;
}
.ecu-comm-wiz-skip {
  cursor: pointer;
  background: transparent;
  border: none;
  color: rgba(220, 210, 210, 0.85);
  font-size: 20px;
  font-weight: normal;
  padding: 4px 0;
  text-decoration: underline;
}
.ecu-comm-wiz-skip:hover {
  color: #fff;
}
.ecu-comm-wiz-changelog-block {
  margin: 0 0 4px;
}
.ecu-comm-wiz-changelog-ver {
  color: #ffd28a;
  font-size: 20px;
  margin: 0 0 10px;
}
.ecu-comm-wiz-changelog-sep {
  height: 1px;
  margin: 8px 0 16px;
  background: rgba(255, 255, 255, 0.08);
}
`;
  function injectCommSetupWizardCss() {
    if (typeof document === "undefined") return;
    let el = document.querySelector(
      "style[data-ecu-comm-wiz]"
    );
    if (!el) {
      el = document.createElement("style");
      el.setAttribute("data-ecu-comm-wiz", "1");
      document.head.appendChild(el);
    }
    el.textContent = CSS2;
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
  function markIntroComplete() {
    patchSettings({
      setupWizardDone: true,
      changelogSeenId: latestChangelogId()
    });
    patchMeterAppearance({ testBars: false });
    clearIntroStep();
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
      markIntroComplete();
      props.onDone();
    };
    const steps = [
      {
        title: "Overview",
        body: "",
        extra: capabilityCaps(FEATURE_OVERVIEW),
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
          "Deeper tours appear once when you use layout, meters, paperdoll, buffs, and more",
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
              markIntroComplete();
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
        cur.body ? e("p", null, cur.body) : null,
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

  // src/ui/frames/comm/CommUIWhatsNew.ts
  function CommUIWhatsNew(props) {
    injectCommSetupWizardCss();
    const dismiss = () => {
      patchSettings({ changelogSeenId: latestChangelogId() });
      props.onDone();
    };
    const entries = props.entries;
    const heading = entries.length === 1 ? `What's new in ${entries[0].title}` : "What's new";
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
        e("div", { className: "ecu-comm-wiz-logo" }, "Comm UI"),
        e("h3", null, heading),
        ...entries.map(
          (entry, ei) => e(
            "div",
            { key: entry.id, className: "ecu-comm-wiz-changelog-block" },
            entries.length > 1 ? e("div", { className: "ecu-comm-wiz-changelog-ver" }, entry.title) : null,
            capabilityCaps(entry.items),
            ei < entries.length - 1 ? e("div", { className: "ecu-comm-wiz-changelog-sep" }) : null
          )
        ),
        e(
          "div",
          { className: "ecu-comm-wiz-actions" },
          e(
            "button",
            {
              type: "button",
              className: "ecu-comm-wiz-btn primary",
              onClick: dismiss
            },
            "Got it"
          )
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
  font-size: 19px;
  line-height: 1.55;
}
.ecu-tour-card .ecu-tour-hint {
  color: #e8b86a;
  font-size: 19px;
  line-height: 1.55;
  margin: 0 0 14px;
}
.ecu-tour-cta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0 0 16px;
  padding: 12px 14px;
  background: rgba(232, 201, 106, 0.12);
  border: 1px solid rgba(232, 201, 106, 0.42);
  border-left: 4px solid #ffd28a;
  box-sizing: border-box;
  animation: ecu-tour-cta-pulse 2.2s ease-in-out infinite;
}
.ecu-tour-cta-label {
  color: #ffd28a;
  font-size: 15px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1.2;
}
.ecu-tour-cta-text {
  color: #ffe8b8;
  font-size: 20px;
  line-height: 1.4;
}
@keyframes ecu-tour-cta-pulse {
  0%, 100% {
    border-left-color: #ffd28a;
    background: rgba(232, 201, 106, 0.1);
  }
  50% {
    border-left-color: #ffe4aa;
    background: rgba(232, 201, 106, 0.18);
  }
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
  opacity: 0.38;
  color: rgba(220, 210, 210, 0.55);
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
}
.ecu-tour-btn.primary:disabled {
  color: rgba(232, 201, 106, 0.4);
  border-color: rgba(232, 201, 106, 0.16);
  background: rgba(232, 201, 106, 0.05);
}
.ecu-tour-foot {
  margin-top: 12px;
  color: rgba(220, 210, 210, 0.65);
  font-size: 16px;
}
`;
  function injectGuidedTourCss() {
    if (typeof document === "undefined") return;
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
  var PANEL_DOCK_FALLBACK = {
    itemInfo: { w: 240, h: 160 },
    buffInfo: { w: 240, h: 160 }
  };
  function measureTarget(selector, kind = "region") {
    if (typeof document === "undefined") return null;
    const parts = selector.split(",").map((s) => s.trim());
    const pad3 = kind === "button" ? 10 : 12;
    if (kind === "button") {
      for (let i = 0; i < parts.length; i++) {
        const sel = parts[i];
        if (!sel) continue;
        const el = document.querySelector(sel);
        const rect = el ? rectForElement(el, pad3) : null;
        if (rect) return rect;
      }
      return null;
    }
    let top = Infinity;
    let left = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    let found = false;
    for (let i = 0; i < parts.length; i++) {
      const sel = parts[i];
      if (!sel) continue;
      const nodes = document.querySelectorAll(sel);
      for (let j = 0; j < nodes.length; j++) {
        const el = nodes[j];
        const rect = kind === "panel" ? rectForPanelShell(el, pad3) : rectForElement(el, pad3);
        if (!rect) continue;
        found = true;
        top = Math.min(top, rect.top);
        left = Math.min(left, rect.left);
        right = Math.max(right, rect.left + rect.width);
        bottom = Math.max(bottom, rect.top + rect.height);
      }
    }
    if (!found) return null;
    return {
      top,
      left,
      width: right - left,
      height: bottom - top
    };
  }
  function rectForElement(el, pad3) {
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
      top: Math.max(4, top - pad3),
      left: Math.max(4, left - pad3),
      width: right - left + pad3 * 2,
      height: bottom - top + pad3 * 2
    };
  }
  function rectForEmptyPanelDock(el, pad3) {
    const r = el.getBoundingClientRect();
    if (!Number.isFinite(r.top) || !Number.isFinite(r.left)) return null;
    const panelId = el.getAttribute("data-panel") || "";
    const dock = PANEL_DOCK_FALLBACK[panelId] || (el.classList.contains("comm-pos-panel") ? { w: 200, h: 120 } : null);
    if (!dock) return null;
    return {
      top: Math.max(4, r.top - pad3),
      left: Math.max(4, r.left - pad3),
      width: dock.w + pad3 * 2,
      height: dock.h + pad3 * 2
    };
  }
  function rectForPanelShell(el, pad3) {
    const base = rectForElement(el, pad3);
    if (!base) return rectForEmptyPanelDock(el, pad3);
    let top = base.top + pad3;
    let left = base.left + pad3;
    let right = left + base.width - pad3 * 2;
    let bottom = top + base.height - pad3 * 2;
    const mounts = el.querySelectorAll(
      [
        "#bottomleftcorner",
        ".comm-bag-mount",
        ".CodeMirror",
        ".ecu-command-editor",
        ".comm-fx-overlay",
        ".comm-fx-row",
        ".comm-info-dialog-slot"
      ].join(", ")
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
      top: Math.max(4, top - pad3),
      left: Math.max(4, left - pad3),
      width: right - left + pad3 * 2,
      height: bottom - top + pad3 * 2
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
  var PAPERDOLL_TOUR_ID = "paperdoll-v2";
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
        target: ".comm-pos-panel.comm-pos-playerFrame, .comm-pos-panel.comm-pos-targetFrame",
        targetKind: "panel",
        missingHint: "Frames appear once someone is selected."
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
        body: "Explore at your own pace. Short tours still appear for layout mode, meter tools, paperdoll, trade slots, buffs, and combat panels \u2014 each only once.",
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
        body: "Right-side icons: Mode \xB7 Segment \xB7 Attribute \xB7 Report \xB7 Reset. Hover for menus \u2014 a toolbar tour appears when you first open one.",
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
        title: "Mode",
        body: "Who appears (party scope), Plugins (Encounter / Deaths / Timeline), Window Control, and Options \u2014 the Mode menu.",
        target: '[data-ecu-tour="meter-gear"]'
      },
      {
        title: "Segment",
        body: "Fight history \u2014 click older/newer segments. Hover for wipe/kill markers.",
        target: '[data-ecu-tour="meter-segment"]'
      },
      {
        title: "Attribute",
        body: "Switch Damage Done / DPS / Healing / Taken. Right-click for the full display grid.",
        target: '[data-ecu-tour="meter-display"]',
        missingHint: "Rank-based meters only \u2014 snapshot meters omit this button."
      },
      {
        title: "Report",
        body: "Copy fight summaries or open the report dialog. Reset is the last icon.",
        target: '[data-ecu-tour="meter-report"]',
        missingHint: "Rank-based meters only."
      },
      {
        title: "Resize",
        body: "Corner grips free-resize the frame. Stretch \u2195 on the titlebar toggles taller height. After fights, skull/play badges on the titlebar open Encounter / Timeline.",
        target: ".ecu-meter-resize",
        missingHint: "Unlock meters or enter layout edit to see resize grips."
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
  var PAPERDOLL_TOUR = {
    id: PAPERDOLL_TOUR_ID,
    label: "Paperdoll",
    steps: [
      {
        title: "Paperdoll",
        body: "Vitals, stats, and gear for whoever you clicked. Opens from a unit frame, party chip, or world click. Close with \xD7 or Esc.",
        target: ".comm-pos-paperdoll",
        targetKind: "panel",
        missingHint: "Click a player frame, party member, or entity to open the paperdoll."
      },
      {
        title: "Gear",
        body: "Equipped slots live here. Click any filled slot to open Item info \u2014 the tour continues when you do.",
        target: '[data-ecu-tour="paperdoll-gear"]',
        targetKind: "region",
        missingHint: "Click a filled gear slot on the paperdoll.",
        advanceWhen: "itemInfoOpen"
      },
      {
        title: "Item info",
        body: "Stock item details park in this panel \u2014 stats, lore, grade. It stays here so you can compare while looking at gear.",
        target: ".comm-pos-itemInfo",
        targetKind: "panel",
        missingHint: "Click a filled gear slot if Item info is not open yet."
      }
    ]
  };
  var PAPERDOLL_TRADE_TOUR = {
    id: "paperdoll-trade",
    label: "Paperdoll \xB7 trade slots",
    steps: [
      {
        title: "Trade slots",
        body: "This paperdoll has a TRADE row under gear \u2014 shop listings with prices (merchants and player stands).",
        target: '[data-ecu-tour="paperdoll-trade"]',
        targetKind: "region",
        missingHint: "Inspect a merchant or player stand that has trade items listed."
      },
      {
        title: "Inspect a listing",
        body: "Click a trade item to open Item info \u2014 same panel as equipped gear. The tour continues when you do.",
        target: '[data-ecu-tour="paperdoll-trade"]',
        targetKind: "region",
        missingHint: "Click a filled trade slot.",
        advanceWhen: "itemInfoOpen"
      },
      {
        title: "Item info",
        body: "Listing details park here so you can compare while browsing the paperdoll.",
        target: ".comm-pos-itemInfo",
        targetKind: "panel",
        missingHint: "Click a filled trade slot if Item info is not open yet."
      }
    ]
  };
  var BUFF_INFO_TOUR = {
    id: "buff-info",
    label: "Buff info",
    steps: [
      {
        title: "Buff info",
        body: "Stock condition details for the buff you clicked \u2014 what it does and how long it lasts.",
        target: ".comm-pos-buffInfo",
        targetKind: "panel",
        missingHint: "Click a buff icon on a unit or party frame."
      },
      {
        title: "Where to click",
        body: "Buff and condition icons on player/target frames and party chips open this panel. Click another icon anytime to switch.",
        target: '[data-ecu-tour="buff-icons"]',
        targetKind: "region",
        missingHint: "Buff icons appear under unit frames and on party chips when someone has effects."
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
    PAPERDOLL_TOUR,
    PAPERDOLL_TRADE_TOUR,
    BUFF_INFO_TOUR
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
    patchSettings({ toursCompleted: { ...prev, [id]: true } });
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
    if (!done[PAPERDOLL_TOUR_ID] && done["paperdoll-gear-v1"]) {
      next[PAPERDOLL_TOUR_ID] = true;
      changed = true;
    }
    if (done.paperdoll != null) {
      delete next.paperdoll;
      changed = true;
    }
    if (done["paperdoll-gear-v1"] != null) {
      delete next["paperdoll-gear-v1"];
      changed = true;
    }
    if (done.merchant && !done["paperdoll-trade"]) {
      next["paperdoll-trade"] = true;
      delete next.merchant;
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
      case "itemInfoOpen":
        return ctx.itemInfoOpen;
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
      const orphans = document.querySelectorAll("[data-ecu-tour-portal]");
      for (let i = 0; i < orphans.length; i++) {
        const node = orphans[i];
        if (node.parentNode) node.parentNode.removeChild(node);
      }
      const el = document.createElement("div");
      el.setAttribute("data-ecu-tour-portal", "1");
      document.body.appendChild(el);
      setHost(el);
      return () => {
        if (el.parentNode) el.parentNode.removeChild(el);
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
    const disabled = !!(opts == null ? void 0 : opts.disabled);
    return e(
      "button",
      {
        type: "button",
        className: classes.join(" "),
        disabled,
        onClick: (ev) => {
          if (disabled) return;
          if (ev && typeof ev.stopPropagation === "function") {
            ev.stopPropagation();
          }
          onClick();
        }
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
    const doneRef = React.useRef(false);
    const step = props.tour.steps[props.stepIndex];
    injectGuidedTourCss();
    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      markTourCompleted(props.tour.id);
      props.onDone();
    };
    const finishRef = React.useRef(finish);
    finishRef.current = finish;
    React.useEffect(() => {
      advancedRef.current = false;
    }, [props.stepIndex, step == null ? void 0 : step.advanceWhen]);
    React.useEffect(() => {
      doneRef.current = false;
    }, [props.tour.id]);
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
          if (doneRef.current) return;
          if (props.stepIndex >= props.tour.steps.length - 1) {
            finishRef.current();
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
      props.advanceContext.commandOpen,
      props.advanceContext.itemInfoOpen
    ]);
    React.useEffect(() => {
      if (!step) finishRef.current();
    }, [step]);
    if (!step) return null;
    const isLast = props.stepIndex >= props.tour.steps.length - 1;
    const waitForAction = !!step.advanceWhen;
    const next = () => {
      if (waitForAction) return;
      if (isLast) {
        finish();
        return;
      }
      props.onStep(props.stepIndex + 1);
    };
    const back = () => {
      if (props.stepIndex > 0) props.onStep(props.stepIndex - 1);
    };
    const skip = () => {
      finish();
    };
    const shades = shadePanels(spot, viewport.w, viewport.h);
    const connector = spot != null ? tourConnector(cardPos, CARD_W, cardH, spot) : null;
    const missingOnly = !!step.missingHint && !spot && !waitForAction;
    const ctaText = step.missingHint || (waitForAction ? "Complete the highlighted action to continue." : "");
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
        waitForAction ? e(
          "div",
          { className: "ecu-tour-cta" },
          e("div", { className: "ecu-tour-cta-label" }, "Your turn"),
          e("div", { className: "ecu-tour-cta-text" }, ctaText)
        ) : missingOnly ? e("p", { className: "ecu-tour-hint" }, step.missingHint) : null,
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
            // Action steps auto-advance — Next stays visible but disabled.
            tourBtn(isLast ? "Done" : "Next", next, {
              primary: true,
              disabled: waitForAction
            })
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
  var pendingQueue = [];
  function registerContextualTourHost(next) {
    host = next;
  }
  function contextualToursAllowed() {
    return !!getSettings().setupWizardDone;
  }
  function enqueuePending(id) {
    for (let i = 0; i < pendingQueue.length; i++) {
      if (pendingQueue[i] === id) return;
    }
    pendingQueue.push(id);
  }
  function flushContextualTourQueue() {
    if (!host || !contextualToursAllowed()) return;
    if (host.isBlocked()) return;
    while (pendingQueue.length > 0) {
      const id = pendingQueue.shift();
      if (isTourCompleted(id)) continue;
      if (host.isBlocked() || !host.startTour(id)) {
        enqueuePending(id);
        return;
      }
      return;
    }
  }
  function tryContextualTour(id, delayMs) {
    if (!host || !contextualToursAllowed()) return;
    if (isTourCompleted(id)) return;
    const run = () => {
      if (!host || isTourCompleted(id)) return;
      if (host.isBlocked() || !host.startTour(id)) {
        enqueuePending(id);
      }
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
    const toursBlockedRef = React.useRef(opts.toursBlocked);
    const optsRef = React.useRef(opts);
    activeTourRef.current = activeTour;
    toursBlockedRef.current = opts.toursBlocked;
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
      const id = finishedId || (cur == null ? void 0 : cur.tour.id);
      endTourSession(
        sessionRef.current,
        cur == null ? void 0 : cur.tour,
        cur == null ? void 0 : cur.step,
        effectHostRef.current
      );
      sessionRef.current = null;
      activeTourRef.current = null;
      setActiveTour(null);
      if (!id) {
        flushContextualTourQueue();
        return;
      }
      let found = false;
      for (let i = 0; i < INTRO_TOUR_CHAIN.length; i++) {
        if (found) {
          const nextId = INTRO_TOUR_CHAIN[i];
          if (isTourCompleted(nextId)) continue;
          const tour = tourById(nextId);
          if (!tour || !effectHostRef.current) {
            flushContextualTourQueue();
            return;
          }
          sessionRef.current = beginTourSession(effectHostRef.current, tour);
          sessionRef.current.applyStep(0, null);
          const next = { tour, step: 0 };
          activeTourRef.current = next;
          setActiveTour(next);
          return;
        }
        if (INTRO_TOUR_CHAIN[i] === id) found = true;
      }
      flushContextualTourQueue();
    };
    const launchTour = (id) => {
      var _a, _b;
      const tour = tourById(id);
      const effectHost = effectHostRef.current;
      if (!tour || !effectHost) return;
      endTourSession(
        sessionRef.current,
        (_a = activeTourRef.current) == null ? void 0 : _a.tour,
        (_b = activeTourRef.current) == null ? void 0 : _b.step,
        effectHost
      );
      sessionRef.current = beginTourSession(effectHost, tour);
      sessionRef.current.applyStep(0, null);
      const next = { tour, step: 0 };
      activeTourRef.current = next;
      setActiveTour(next);
    };
    const launchContextualTour = (id) => {
      if (activeTourRef.current || toursBlockedRef.current) return false;
      launchTour(id);
      return true;
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
        isBlocked: () => !!activeTourRef.current || !!toursBlockedRef.current,
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
    React.useEffect(() => {
      if (!opts.toursBlocked && !activeTour) {
        flushContextualTourQueue();
      }
    }, [opts.toursBlocked, activeTour]);
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
      onDone: () => {
        var _a;
        return finishTour((_a = activeTourRef.current) == null ? void 0 : _a.tour.id);
      },
      advanceContext: {
        isObserving: opts.isObserving,
        bagOpen: opts.bagOpen,
        commandOpen: opts.commandOpen,
        itemInfoOpen: opts.itemInfoOpen
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

  // src/meters/meterQueryRanked.ts
  function queryPlayers(query, seg, focus, now) {
    return rankedPlayers(seg, query.metric, focus, now, query.primary || "total");
  }
  function queryAbilities(query, seg, durationMs) {
    const actor = seg.actors[query.actorId];
    if (!actor) return { kind: "empty", reason: "no actor" };
    const metric = query.metric || "damage";
    const keys = Object.keys(actor.abilities);
    const items = keys.map((k) => {
      const ab = actor.abilities[k];
      return {
        id: k,
        name: skillDisplayName(k),
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
  function queryAbilityTargets(query, seg, durationMs) {
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
        kind: "target",
        mtype: t.mtype,
        ctype: t.ctype
      };
    });
    return {
      kind: "ranked",
      rows: toRanked(items, durationMs, metric === "avoidance"),
      title: `${actor.name} \xB7 ${skillDisplayName(query.ability)}`
    };
  }
  function queryTargets(query, seg, durationMs) {
    const actor = seg.actors[query.actorId];
    if (!actor) return { kind: "empty", reason: "no actor" };
    const metric = query.metric || "damage";
    return {
      kind: "ranked",
      rows: toRanked(aggregateActorTargets(actor, metric), durationMs, false),
      title: `${actor.name} \xB7 targets`
    };
  }
  function queryTakenBySpell(_query, seg, focus, durationMs) {
    const actors = scopedActors(seg, focus);
    const bySpell = {};
    for (let i = 0; i < actors.length; i++) {
      const abKeys = Object.keys(actors[i].abilities);
      for (let k = 0; k < abKeys.length; k++) {
        const ab = actors[i].abilities[abKeys[k]];
        if (!(ab.taken > 0)) continue;
        bySpell[ab.key] = (bySpell[ab.key] || 0) + ab.taken;
      }
    }
    const items = Object.keys(bySpell).map((key) => ({
      id: key,
      name: skillDisplayName(key),
      value: bySpell[key],
      kind: "ability"
    }));
    return {
      kind: "ranked",
      rows: toRanked(items, durationMs, false),
      title: "Damage Taken by Spell"
    };
  }
  function queryEnemyDamage(_query, seg, focus, durationMs) {
    const actors = scopedActors(seg, focus);
    const meta = getPlayerMeta();
    const byTarget = {};
    const skipPlayers = (tg) => {
      if (!(tg.damage > 0)) return false;
      if (meta[tg.id] || seg.actors[tg.id]) return false;
      return true;
    };
    for (let i = 0; i < actors.length; i++) {
      const rows = aggregateActorTargets(actors[i], "damage", skipPlayers);
      for (let r = 0; r < rows.length; r++) {
        const row2 = rows[r];
        if (!byTarget[row2.id]) {
          byTarget[row2.id] = {
            id: row2.id,
            name: row2.name || row2.id,
            value: 0,
            kind: "target",
            mtype: row2.mtype,
            ctype: row2.ctype
          };
        }
        byTarget[row2.id].value += row2.value;
        if (row2.mtype) byTarget[row2.id].mtype = row2.mtype;
        if (row2.ctype) byTarget[row2.id].ctype = row2.ctype;
        if (row2.name) byTarget[row2.id].name = row2.name;
      }
    }
    const items = Object.keys(byTarget).map((id) => byTarget[id]);
    return {
      kind: "ranked",
      rows: toRanked(items, durationMs, false),
      title: "Adds"
    };
  }
  function queryChannel(query, seg, focus, durationMs) {
    const actors = scopedActors(seg, focus);
    const items = actors.map((a) => ({
      id: a.id,
      name: a.name,
      ctype: a.ctype,
      value: channelValue(a, query.channel),
      kind: "player"
    }));
    return {
      kind: "ranked",
      rows: toRanked(items, durationMs, false)
    };
  }
  function queryPie(query, seg, focus) {
    if (query.actorId) {
      const actor = seg.actors[query.actorId];
      if (!actor) return { kind: "empty", reason: "no actor" };
      const metric2 = query.metric || "damage";
      const keys = Object.keys(actor.abilities);
      const slices = keys.map((k) => {
        const ab = actor.abilities[k];
        return {
          id: k,
          name: skillDisplayName(k),
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
  function queryMisc(query, seg, focus, durationMs) {
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

  // src/meters/meterQueryInspector.ts
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
  function queryDetails(query, seg, durationMs, now) {
    const actor = seg.actors[query.actorId];
    if (!actor) return { kind: "empty", reason: "no actor" };
    const metric = query.metric === "heal" || query.metric === "taken" || query.metric === "healing_required" || query.metric === "avoidance" ? query.metric : "damage";
    const primary = query.primary === "rate" ? "rate" : "total";
    const listMetric = metric === "heal" ? "heal" : metric === "taken" ? "taken" : "damage";
    const abKeys = Object.keys(actor.abilities);
    const abilityItems = abKeys.map((k) => {
      const ab2 = actor.abilities[k];
      return {
        id: k,
        name: skillDisplayName(k),
        value: abilityMetric(ab2, listMetric),
        kind: "ability",
        splashDamage: ab2.splashDamage
      };
    }).filter((it) => it.value > 0 || abKeys.length <= 1);
    const abilityRows = toRanked(abilityItems, durationMs, false, primary);
    let abilityKey = query.ability;
    if (!abilityKey && abilityRows[0]) abilityKey = abilityRows[0].id;
    const ab = abilityKey ? actor.abilities[abilityKey] : void 0;
    const outcomes = ab ? ab.outcomes : actor.outcomes;
    const abilityTotal = ab ? abilityMetric(ab, listMetric) : 0;
    let abilityCasts = 0;
    if (abilityKey) {
      const keyLower = abilityKey.toLowerCase();
      for (let i = 0; i < seg.casts.length; i++) {
        const c = seg.casts[i];
        if (c.actorId !== actor.id) continue;
        if ((c.source || "").toLowerCase() === keyLower) abilityCasts += 1;
      }
    }
    const targetItems = ab ? Object.keys(ab.targets).map((tid) => {
      const t = ab.targets[tid];
      let value = 0;
      if (listMetric === "heal") value = t.heal;
      else if (listMetric === "taken") value = t.damage;
      else value = t.damage;
      return {
        id: tid,
        name: t.name,
        value,
        kind: "target",
        mtype: t.mtype,
        ctype: t.ctype
      };
    }) : Object.keys(actor.abilities).length ? aggregateActorTargets(actor, listMetric) : [];
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
      metric,
      primary,
      abilitySplash: ab ? ab.splashDamage : 0,
      abilityTotal,
      abilityCasts,
      outcomes,
      hitNormal: (ab == null ? void 0 : ab.normal) ? { ...ab.normal } : emptyHitAmountStats(),
      hitCrit: (ab == null ? void 0 : ab.crit) ? { ...ab.crit } : emptyHitAmountStats(),
      damageType: ab ? dominantDamageType(ab.damageTypes) : void 0,
      totals: {
        damage: actor.damage,
        heal: actor.heal,
        taken: actor.taken,
        healingRequired: actor.healingRequired
      },
      durationMs,
      abilityRows,
      uptimeRows: actorUptimeRows(seg.conditions, actor.id, durationMs, now),
      targetRows: toRanked(targetItems, durationMs, false, primary),
      deaths: deathCount
    };
  }
  function querySummary(_query, seg, focus) {
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
  function queryEncounterSummary(_query, seg, focus, now, durationMs) {
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
  function queryHistory(_query, focus) {
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
  function queryDeathLog(_query, seg) {
    return { kind: "death_log", deaths: seg.deaths.slice() };
  }
  function queryTimeline(_query, seg, focus, durationMs) {
    const casts = [];
    for (let i = 0; i < seg.casts.length; i++) {
      if (actorIdInScope(seg.casts[i].actorId, seg, focus)) {
        casts.push(seg.casts[i]);
      }
    }
    const conditions = [];
    for (let i = 0; i < seg.conditions.length; i++) {
      if (actorIdInScope(seg.conditions[i].actorId, seg, focus)) {
        conditions.push(seg.conditions[i]);
      }
    }
    const gearSwaps = [];
    const swaps = seg.gearSwaps || [];
    for (let i = 0; i < swaps.length; i++) {
      if (actorIdInScope(swaps[i].actorId, seg, focus)) {
        gearSwaps.push(swaps[i]);
      }
    }
    return {
      kind: "timeline",
      casts,
      conditions,
      gearSwaps,
      durationMs
    };
  }
  function queryConditions(query, seg, focus, durationMs) {
    return {
      kind: "timeline",
      casts: [],
      conditions: query.actorId ? seg.conditions.filter((c) => c.actorId === query.actorId) : seg.conditions.filter((c) => actorIdInScope(c.actorId, seg, focus)),
      gearSwaps: [],
      durationMs
    };
  }

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
  function aggregateActorTargets(actor, metric, includeTarget) {
    const byTarget = {};
    const abKeys = Object.keys(actor.abilities);
    for (let i = 0; i < abKeys.length; i++) {
      const ab = actor.abilities[abKeys[i]];
      const tKeys = Object.keys(ab.targets);
      for (let t = 0; t < tKeys.length; t++) {
        const tg = ab.targets[tKeys[t]];
        if (includeTarget && !includeTarget(tg)) continue;
        if (!byTarget[tg.id]) {
          byTarget[tg.id] = {
            id: tg.id,
            name: tg.name || tg.id,
            value: 0,
            kind: "target",
            mtype: tg.mtype,
            ctype: tg.ctype
          };
        }
        byTarget[tg.id].value += metric === "heal" ? tg.heal : tg.damage;
        if (tg.mtype) byTarget[tg.id].mtype = tg.mtype;
        if (tg.ctype) byTarget[tg.id].ctype = tg.ctype;
        if (tg.name) byTarget[tg.id].name = tg.name;
      }
    }
    const ids = Object.keys(byTarget);
    const rows = [];
    for (let i = 0; i < ids.length; i++) {
      rows.push(byTarget[ids[i]]);
    }
    return rows;
  }
  function actorIdInScope(actorId, seg, focus) {
    const actor = seg.actors[actorId];
    if (actor) return playerInScope(actor, focus);
    const scope = focusToScope(focus);
    switch (scope) {
      case "all":
        return true;
      case "visible":
        return isVisiblePlayer(actorId);
      case "you": {
        const you = getYouId();
        return !!you && actorId === you;
      }
      case "party": {
        const you = getYouId();
        const resolved = resolvePartyFocus(
          effectivePartyFocus(focus || "watched", !!you),
          getWatchedPartyKey()
        );
        if (resolved.partyFilter) return false;
        return isWatchedPartyMember(actorId);
      }
      default: {
        const _exhaustive = scope;
        return _exhaustive;
      }
    }
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
        label = `${formatCompactRate(rate || 0)} (${formatCompactNumber(it.value)}, ${getPercent(pct, 3)})`;
      } else {
        label = `${formatCompactNumber(it.value)} (${formatCompactRate(rate || 0)}, ${getPercent(pct, 3)})`;
      }
      const useRate = primary === "rate" && !absolute;
      const barValue = useRate ? rate || 0 : it.value;
      rows.push({
        id: it.id,
        name: it.name,
        ctype: it.ctype,
        mtype: it.mtype,
        value: it.value,
        rate,
        pct,
        barMax: barMax || 1,
        barValue,
        primary: useRate ? "rate" : "total",
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
          barValue: value,
          primary: "total",
          label: value.toLocaleString(void 0, { maximumFractionDigits: 0 }),
          kind: "player"
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
        barValue: value,
        primary: "total",
        label,
        kind: "player"
      });
    }
    return { kind: "ranked", rows };
  }
  function rollingRanked(now) {
    var _a, _b;
    const dmg = getActorDamage(now);
    const ids = Object.keys(dmg);
    const windowSec = getRollingWindowMs() / 1e3;
    const items = [];
    const meta = getEntitiesRecord();
    const playerMeta2 = getPlayerMeta();
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const ent = meta[id];
      items.push({
        id,
        name: ((_a = playerMeta2[id]) == null ? void 0 : _a.name) || (ent == null ? void 0 : ent.name) || id,
        ctype: ((_b = playerMeta2[id]) == null ? void 0 : _b.ctype) || resolvePlayerCtype(id, ent) || (ent == null ? void 0 : ent.ctype),
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
        barValue: it.value,
        primary: "rate",
        label: `${formatCompactRate(it.value)}/s ${getPercent(pct, 3)}`,
        kind: "player"
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
        return queryPlayers(query, seg, focus, now);
      case "abilities":
        return queryAbilities(query, seg, durationMs);
      case "ability_targets":
        return queryAbilityTargets(query, seg, durationMs);
      case "targets":
        return queryTargets(query, seg, durationMs);
      case "details":
        return queryDetails(query, seg, durationMs, now);
      case "summary":
        return querySummary(query, seg, focus);
      case "avoidance":
        return rankedPlayers(seg, "avoidance", focus, now);
      case "encounter_summary":
        return queryEncounterSummary(query, seg, focus, now, durationMs);
      case "taken_by_spell":
        return queryTakenBySpell(query, seg, focus, durationMs);
      case "enemy_damage":
        return queryEnemyDamage(query, seg, focus, durationMs);
      case "channel":
        return queryChannel(query, seg, focus, durationMs);
      case "compare":
      case "history":
        return queryHistory(query, focus);
      case "pie":
        return queryPie(query, seg, focus);
      case "death_log":
        return queryDeathLog(query, seg);
      case "timeline":
        return queryTimeline(query, seg, focus, durationMs);
      case "conditions":
        return queryConditions(query, seg, focus, durationMs);
      case "misc":
        return queryMisc(query, seg, focus, durationMs);
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

  // src/ui/frames/comm/guidedTour/paperdollTrade.ts
  function entityHasTradeSlots(entity) {
    if (!entity || !entity.slots) return false;
    const slots = entity.slots;
    const keys = Object.keys(slots);
    for (let i = 0; i < keys.length; i++) {
      const name = keys[i];
      if (name.indexOf("trade") !== 0) continue;
      if (slots[name]) return true;
    }
    return false;
  }

  // src/ui/hooks/useContextualTourTriggers.ts
  function selectedEntity(ctx) {
    if (!ctx.selectedEntity) return void 0;
    return findEntity(ctx.entities, ctx.selectedEntity);
  }
  function selectedHasTradeSlots(ctx) {
    return entityHasTradeSlots(selectedEntity(ctx));
  }
  var TRIGGERS = [
    {
      id: "meters",
      delayMs: 350,
      when: (ctx, prev) => prev != null && ctx.meterCount > prev.meterCount
    },
    {
      // First paperdoll open while the base tour is incomplete.
      id: PAPERDOLL_TOUR_ID,
      delayMs: 300,
      when: (ctx, prev) => !!ctx.selectedEntity && !(prev == null ? void 0 : prev.selectedEntity) && !isTourCompleted(PAPERDOLL_TOUR_ID)
    },
    {
      // Rising edge: selected entity gains filled trade* slots (open or mid-inspect).
      id: "paperdoll-trade",
      delayMs: 320,
      when: (ctx, prev) => {
        if (isTourCompleted("paperdoll-trade")) return false;
        const now = !!ctx.selectedEntity && selectedHasTradeSlots(ctx);
        if (!now) return false;
        const was = !!(prev == null ? void 0 : prev.selectedEntity) && selectedHasTradeSlots(prev);
        return !was;
      }
    },
    {
      id: "buff-info",
      delayMs: 280,
      when: (ctx, prev) => ctx.buffInfoOpen && !(prev == null ? void 0 : prev.buffInfoOpen)
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
        buffInfoOpen: ctx.buffInfoOpen,
        meterCount: ctx.meterCount,
        entities: ctx.entities,
        meterInstances: ctx.meterInstances
      };
    }, [
      ctx.selectedEntity,
      ctx.buffInfoOpen,
      ctx.meterCount,
      ctx.entities,
      ctx.meterInstances
    ]);
  }
  function triggerMeterToolbarTour() {
    tryContextualTour("meter-toolbar", 200);
  }

  // src/meters/meterWindowStack.ts
  var METER_STACK_BASE = 50;
  var METER_STACK_MAX = 77;
  function maxMeterStackZ(peers) {
    let max = METER_STACK_BASE - 1;
    for (let i = 0; i < peers.length; i++) {
      const z = peers[i].zIndex;
      if (typeof z === "number" && z > max) max = z;
    }
    return max;
  }
  function nextMeterStackZ(peers) {
    const max = maxMeterStackZ(peers);
    if (max < METER_STACK_MAX) {
      return { zIndex: max + 1, peers };
    }
    const ranked = peers.map((m, i) => ({
      i,
      z: typeof m.zIndex === "number" ? m.zIndex : METER_STACK_BASE - 1
    })).sort((a, b) => a.z - b.z || a.i - b.i);
    const next = peers.slice();
    for (let r = 0; r < ranked.length; r++) {
      const row2 = next[ranked[r].i];
      next[ranked[r].i] = { ...row2, zIndex: METER_STACK_BASE + r };
    }
    return {
      zIndex: METER_STACK_BASE + ranked.length,
      peers: next
    };
  }
  function prepareNewMeterWindow(inst, peers) {
    const { zIndex, peers: nextPeers } = nextMeterStackZ(peers);
    return {
      peers: nextPeers,
      inst: {
        ...inst,
        locked: typeof inst.locked === "boolean" ? inst.locked : false,
        zIndex
      }
    };
  }
  function bringMeterToFront(peers, id) {
    let target = null;
    for (let i = 0; i < peers.length; i++) {
      if (peers[i].id === id) {
        target = peers[i];
        break;
      }
    }
    if (!target) return peers;
    const max = maxMeterStackZ(peers);
    if (typeof target.zIndex === "number" && target.zIndex === max && max >= METER_STACK_BASE) {
      return peers;
    }
    const { zIndex, peers: base } = nextMeterStackZ(peers);
    return base.map((m) => m.id === id ? { ...m, zIndex } : m);
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
    // Fill-screen ceiling — not a design max. Defaults still come from *FRAME_DEFAULT.
    maxWidth: "100vw",
    maxHeight: "100vh",
    boxSizing: "border-box"
  };
  var METER_FRAME_DEFAULT = { w: 320, h: 200 };
  var REPORT_FRAME_DEFAULT = { w: 780, h: 520 };
  var METER_FRAME_MIN = { w: 240, h: 140 };
  function clampMeterFrame(w, h, viewportW, viewportH) {
    const maxW = Number.isFinite(viewportW) && viewportW > 0 ? Math.round(viewportW) : Number.POSITIVE_INFINITY;
    const maxH = Number.isFinite(viewportH) && viewportH > 0 ? Math.round(viewportH) : Number.POSITIVE_INFINITY;
    return {
      frameW: Math.min(maxW, Math.max(METER_FRAME_MIN.w, Math.round(w))),
      frameH: Math.min(maxH, Math.max(METER_FRAME_MIN.h, Math.round(h)))
    };
  }
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
      if (query.mode === "coop_v1" || query.mode === "coop_v2")
        return "meter-coop";
    }
    return void 0;
  }
  function detailsAttributeLabel(metric, primary) {
    const rate = primary === "rate";
    if (metric === "heal") return rate ? "HPS" : "Healing Done";
    if (metric === "taken") return "Damage Taken";
    if (metric === "healing_required") return "Healing Required";
    if (metric === "avoidance") return "Avoidance";
    return rate ? "DPS" : "Damage Done";
  }
  function detailsWindowTitle(actorName, metric, primary) {
    return `${detailsAttributeLabel(metric, primary)} of ${actorName}`;
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
        return "Encounter Details";
      case "taken_by_spell":
        return "Damage Taken by Spell";
      case "enemy_damage":
        return "Adds";
      case "timeline":
        return "Time Line";
      case "pie":
        return "Pie";
      case "summary":
        return "Summary";
      case "details":
        return detailsAttributeLabel(q.metric, q.primary);
      case "abilities":
      case "ability_targets":
      case "targets":
      case "avoidance":
      case "conditions":
      case "misc":
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

  // src/ui/hooks/useCommMeterInstances.ts
  function useCommMeterInstances(layout) {
    const React = getReact();
    const [meterInstances, setMeterInstances] = React.useState(
      () => getSettings().meterInstances
    );
    const [closedMeters, setClosedMeters] = React.useState(
      () => getSettings().meterClosedInstances || []
    );
    const meterInstancesRef = React.useRef(meterInstances);
    meterInstancesRef.current = meterInstances;
    const peerLayout = { ...layout };
    for (let i = 0; i < meterInstances.length; i++) {
      peerLayout[meterInstances[i].id] = meterInstances[i].pos;
    }
    const meterIsLocked = (inst) => {
      if (typeof inst.locked === "boolean") return inst.locked;
      return getSettings().windowsLocked !== false;
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
    const raiseMeterToFront = (id) => {
      setMeterInstances((prev) => {
        const next = bringMeterToFront(prev, id);
        if (next === prev) return prev;
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
        const { zIndex, peers } = nextMeterStackZ(prev);
        const next = peers.concat([{ ...inst, visible: true, zIndex }]);
        patchSettings({ meterInstances: next, meterClosedInstances: closed });
        return next;
      });
    };
    const focusInspector = (actorId, name, opts) => {
      if (!actorId) return;
      const metric = (opts == null ? void 0 : opts.metric) || "damage";
      const primary = (opts == null ? void 0 : opts.primary) === "rate" ? "rate" : "total";
      const label = detailsWindowTitle(name, metric, primary);
      setMeterInstances((prev) => {
        var _a, _b;
        for (let i = 0; i < prev.length; i++) {
          const m = prev[i];
          if (m.query.kind === "details" && m.query.actorId === actorId && m.visible !== false) {
            const patched = prev.map((row2, j) => {
              if (j !== i) return row2;
              return {
                ...row2,
                query: {
                  kind: "details",
                  actorId,
                  metric,
                  primary,
                  ability: void 0
                },
                presentation: "details",
                label,
                visible: true,
                selectedset: (opts == null ? void 0 : opts.selectedset) != null ? opts.selectedset : row2.selectedset,
                partyFocus: (opts == null ? void 0 : opts.partyFocus) != null ? opts.partyFocus : row2.partyFocus
              };
            });
            const next2 = bringMeterToFront(patched, m.id);
            patchSettings({ meterInstances: next2 });
            return next2;
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
        const raw = instanceFromPreset(preset, {
          id: `meter-inspector-${Date.now().toString(36)}`,
          pos: {
            x: Math.min(92, 42 + n % 6 * 5),
            y: Math.min(82, 48 + n % 5 * 5),
            anchor: "bc"
          },
          query: { kind: "details", actorId, metric, primary },
          presentation: "details",
          label,
          visible: true,
          frameW: ((_a = preset.defaultFrame) == null ? void 0 : _a.w) || 640,
          frameH: ((_b = preset.defaultFrame) == null ? void 0 : _b.h) || 440,
          selectedset: opts == null ? void 0 : opts.selectedset,
          partyFocus: opts == null ? void 0 : opts.partyFocus
        });
        const opened = prepareNewMeterWindow(raw, prev);
        const next = opened.peers.concat([opened.inst]);
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
          const patched = prev.map((m, j) => {
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
          const next2 = bringMeterToFront(patched, prev[i].id);
          patchSettings({ meterInstances: next2 });
          return next2;
        }
        const preset = presetById(tab.presetId);
        if (!preset) return prev;
        const raw = instanceFromPreset(preset, {
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
        const opened = prepareNewMeterWindow(raw, prev);
        const next = opened.peers.concat([opened.inst]);
        patchSettings({ meterInstances: next });
        return next;
      });
    };
    const addMeterFromPreset = (presetId) => {
      const preset = presetById(presetId);
      if (!preset) return;
      setMeterInstances((prev) => {
        const raw = instanceFromPreset(preset, {
          pos: {
            x: 40 + Math.random() * 20,
            y: 40 + Math.random() * 20,
            anchor: "center"
          }
        });
        const opened = prepareNewMeterWindow(raw, prev);
        const next = opened.peers.concat([opened.inst]);
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
        const raw = {
          ...src,
          id: `meter-dup-${Date.now().toString(36)}`,
          pos: {
            ...src.pos,
            x: Math.min(98, src.pos.x + 3),
            y: Math.min(98, src.pos.y + 3)
          },
          // New window — do not inherit source lock / stack rank.
          locked: false,
          zIndex: void 0
        };
        const opened = prepareNewMeterWindow(raw, prev);
        const next = opened.peers.concat([opened.inst]);
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
      setClosedMeters(next.meterClosedInstances || []);
    };
    return {
      meterInstances,
      meterInstancesRef,
      closedMeters,
      peerLayout,
      meterIsLocked,
      patchMeter,
      raiseMeterToFront,
      closeMeterRuntime,
      reopenClosedMeter,
      focusInspector,
      focusReport,
      addMeterFromPreset,
      duplicateMeter,
      removeMeter,
      applyAllSegments,
      setMeterInstances,
      resetMetersFromSettings
    };
  }

  // src/lib/commWindow.ts
  var NO_GROUP_IDS = /* @__PURE__ */ new Set(["toggles"]);
  var CLOSABLE = new Set(CLOSABLE_PANEL_IDS);
  function canGroupWindow(id) {
    return !NO_GROUP_IDS.has(id);
  }
  function canCloseWindow(id) {
    return CLOSABLE.has(id);
  }
  function hudWindowIds() {
    const out = [];
    for (let i = 0; i < PANEL_IDS.length; i++) {
      const id = PANEL_IDS[i];
      if (canGroupWindow(id)) out.push(id);
    }
    return out;
  }

  // src/ui/hooks/usePanelLayoutState.ts
  function isClosable(id) {
    return canCloseWindow(id);
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
    const [windowsLocked, setWindowsLocked] = React.useState(
      () => settings0.windowsLocked !== false
    );
    const [altHeld, setAltHeld] = React.useState(false);
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
    const setWindowsLockedPersist = (locked) => {
      setWindowsLocked(locked);
      saveSettings({ windowsLocked: locked });
    };
    const panelIsLocked = (id) => {
      const pos = layout[id];
      if (pos && typeof pos.locked === "boolean") return pos.locked;
      return windowsLocked;
    };
    const setPanelLocked = (id, locked) => {
      setLayout((prev) => {
        const nextPos = { ...prev[id], locked };
        const next = { ...prev, [id]: nextPos };
        savePanelPos(id, nextPos, viewportProfile);
        return next;
      });
    };
    const setPanelPos = (id, pos) => {
      setLayout((prev) => {
        const nextPos = { ...prev[id], ...pos };
        const next = { ...prev, [id]: nextPos };
        savePanelPos(id, nextPos, viewportProfile);
        if (id === "bag") applyBagLayoutPos(nextPos);
        return next;
      });
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
      setLayout,
      viewportProfile,
      layoutProfileMode,
      setLayoutProfileMode,
      setPanelPos,
      windowsLocked,
      setWindowsLockedPersist,
      panelIsLocked,
      setPanelLocked,
      altHeld,
      resetLayout,
      importLayouts,
      exportLayouts,
      setVisible,
      setOpacity,
      visible,
      opacityFor
    };
  }

  // src/lib/panelEdgeGroup.ts
  var DEFAULT_EDGE_SNAP_PX = 36;
  var GROUP_GAP_PX = 0;
  function oppositeSnapSide(side) {
    if (side === 1) return 3;
    if (side === 3) return 1;
    if (side === 2) return 4;
    return 2;
  }
  function emptySnap() {
    return {};
  }
  function panelHasSnap(panel) {
    const s = panel.snap;
    if (!s) return false;
    return !!(s[1] || s[2] || s[3] || s[4]);
  }
  function refreshSnapFlags(panel) {
    if (!panelHasSnap(panel)) {
      const next = { ...panel };
      delete next.horizontalSnap;
      delete next.verticalSnap;
      return next;
    }
    const s = panel.snap || {};
    const horizontal = !!(s[1] || s[3]);
    const vertical = !!(s[2] || s[4]);
    return {
      ...panel,
      horizontalSnap: horizontal || void 0,
      verticalSnap: vertical || void 0
    };
  }
  function applyGroupFrameSize(panels, resizedId, size) {
    const source = panels.find((m) => m.id === resizedId);
    if (!source) return panels;
    if (!panelHasSnap(source)) {
      return panels.map((m) => m.id === resizedId ? { ...m, ...size } : m);
    }
    const group = getEdgeGroup(panels, resizedId);
    const ids = new Set(group.map((g) => g.id));
    const snap = source.snap || {};
    const shareH = !!source.horizontalSnap || !!(snap[1] || snap[3]);
    const shareW = !!source.verticalSnap || !!(snap[2] || snap[4]);
    return panels.map((m) => {
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
  function getEdgeGroup(panels, startId) {
    const byId = {};
    for (let i = 0; i < panels.length; i++) {
      byId[panels[i].id] = panels[i];
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
  function ungroupPanel(panels, id) {
    return panels.map((m) => {
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
  function groupPanels(panels, aId, bId, sideOnA) {
    if (aId === bId) return panels;
    const opp = oppositeSnapSide(sideOnA);
    return panels.map((m) => {
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
  function applyScreenPctDelta(pos, dxScreen, dyScreen) {
    const ax = pos.anchor || "tl";
    let x = pos.x;
    let y = pos.y;
    if (ax === "tr" || ax === "br") x -= dxScreen;
    else x += dxScreen;
    if (ax === "bl" || ax === "br" || ax === "bc") y -= dyScreen;
    else y += dyScreen;
    return {
      ...pos,
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    };
  }
  function screenPctDeltaFromMove(oldPos, newPos) {
    const ax = oldPos.anchor || "tl";
    const dx = newPos.x - oldPos.x;
    const dy = newPos.y - oldPos.y;
    return {
      dx: ax === "tr" || ax === "br" ? -dx : dx,
      dy: ax === "bl" || ax === "br" || ax === "bc" ? -dy : dy
    };
  }
  function moveEdgeGroup(panels, movedId, newPos) {
    const byId = {};
    for (let i = 0; i < panels.length; i++) {
      byId[panels[i].id] = panels[i];
    }
    const moved = byId[movedId];
    if (!moved) return panels;
    const old = moved.pos;
    const dx = newPos.x - old.x;
    const dy = newPos.y - old.y;
    if (dx === 0 && dy === 0) {
      return panels.map(
        (m) => m.id === movedId ? { ...m, pos: { ...newPos } } : m
      );
    }
    const group = getEdgeGroup(panels, movedId);
    if (group.length <= 1) {
      return panels.map(
        (m) => m.id === movedId ? { ...m, pos: { ...newPos } } : m
      );
    }
    const groupIds = new Set(group.map((g) => g.id));
    const screen = screenPctDeltaFromMove(old, newPos);
    return panels.map((m) => {
      if (!groupIds.has(m.id)) return m;
      if (m.id === movedId) return { ...m, pos: { ...newPos } };
      return {
        ...m,
        pos: applyScreenPctDelta(m.pos, screen.dx, screen.dy)
      };
    });
  }
  function matchGroupHeight(panels, id, height) {
    const group = getEdgeGroup(panels, id);
    if (group.length <= 1) {
      return panels.map((m) => m.id === id ? { ...m, frameH: height } : m);
    }
    const ids = new Set(group.map((g) => g.id));
    return panels.map((m) => ids.has(m.id) ? { ...m, frameH: height } : m);
  }
  function matchGroupWidth(panels, id, width) {
    const group = getEdgeGroup(panels, id);
    if (group.length <= 1) {
      return panels.map((m) => m.id === id ? { ...m, frameW: width } : m);
    }
    const ids = new Set(group.map((g) => g.id));
    return panels.map((m) => ids.has(m.id) ? { ...m, frameW: width } : m);
  }
  function findEdgeSnapCandidate(selfId, selfRect, others, thresholdPx = DEFAULT_EDGE_SNAP_PX) {
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
  function attachPanelEdge(panels, selfId, otherId, sideOnSelf, selfRect, otherRect, rootW, rootH) {
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
    for (let i = 0; i < panels.length; i++) byId[panels[i].id] = panels[i];
    const self = byId[selfId];
    const other = byId[otherId];
    if (!self || !other) return panels;
    const alignedPos = nudgePosByPixels(self.pos, dx, dy, rootW, rootH);
    const matchH = sideOnSelf === 1 || sideOnSelf === 3;
    const matchW = sideOnSelf === 2 || sideOnSelf === 4;
    const peerH = other.frameH || Math.round(otherRect.bottom - otherRect.top) || void 0;
    const peerW = other.frameW || Math.round(otherRect.right - otherRect.left) || void 0;
    const h = matchH ? peerH || self.frameH : self.frameH;
    const w = matchW ? peerW || self.frameW : self.frameW;
    let next = panels.map((m) => {
      if (m.id !== selfId) return m;
      return {
        ...m,
        pos: alignedPos,
        frameH: h != null ? h : m.frameH,
        frameW: w != null ? w : m.frameW
      };
    });
    next = groupPanels(next, selfId, otherId, sideOnSelf);
    if (matchH && h != null) next = matchGroupHeight(next, selfId, h);
    if (matchW && w != null) next = matchGroupWidth(next, selfId, w);
    return next.map(refreshSnapFlags);
  }
  function cssEscapePanelId(id) {
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
      return CSS.escape(id);
    }
    return id.replace(/([^a-zA-Z0-9_-])/g, "\\$1");
  }
  function collectEdgePeerRects(panels, selfId, canSnap) {
    if (typeof document === "undefined") return [];
    const others = [];
    for (let i = 0; i < panels.length; i++) {
      const m = panels[i];
      if (m.id === selfId || !canSnap(m, selfId)) continue;
      const el = document.querySelector(
        `.comm-pos-panel.comm-pos-${cssEscapePanelId(m.id)}`
      );
      if (!el) continue;
      others.push({ id: m.id, rect: el.getBoundingClientRect() });
    }
    return others;
  }
  function findSnapGuideTarget(panels, selfId, canSnap, nearPx = 140, thresholdPx = DEFAULT_EDGE_SNAP_PX) {
    if (typeof document === "undefined") return null;
    const selfEl = document.querySelector(
      `.comm-pos-panel.comm-pos-${cssEscapePanelId(selfId)}`
    );
    if (!selfEl) return null;
    const selfRect = selfEl.getBoundingClientRect();
    const others = collectEdgePeerRects(panels, selfId, canSnap);
    const tight = findEdgeSnapCandidate(selfId, selfRect, others, thresholdPx);
    if (tight) return { id: tight.otherId, canSnap: true };
    const loose = findEdgeSnapCandidate(selfId, selfRect, others, nearPx);
    if (loose) return { id: loose.otherId, canSnap: false };
    return null;
  }
  function trySnapOnDrop(panels, selfId, canSnap, thresholdPx = DEFAULT_EDGE_SNAP_PX) {
    if (typeof document === "undefined") return panels;
    const selfEl = document.querySelector(
      `.comm-pos-panel.comm-pos-${cssEscapePanelId(selfId)}`
    );
    if (!selfEl) return panels;
    const selfRect = selfEl.getBoundingClientRect();
    const others = collectEdgePeerRects(panels, selfId, canSnap);
    const cand = findEdgeSnapCandidate(selfId, selfRect, others, thresholdPx);
    if (!cand) return panels;
    const peer = others.find((o) => o.id === cand.otherId);
    if (!peer) return panels;
    const rootEl = typeof document !== "undefined" && (document.getElementById("comm-ui") || document.getElementById("game") || document.body) || null;
    const root = rootEl ? rootEl.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
    return attachPanelEdge(
      panels,
      selfId,
      cand.otherId,
      cand.sideOnSelf,
      selfRect,
      peer.rect,
      root.width || window.innerWidth,
      root.height || window.innerHeight
    );
  }

  // src/lib/commWindowGroup.ts
  function posToEdge(id, pos) {
    return {
      id,
      pos: { x: pos.x, y: pos.y, anchor: pos.anchor },
      snap: pos.snap,
      horizontalSnap: pos.horizontalSnap,
      verticalSnap: pos.verticalSnap
    };
  }
  function meterToEdge(m) {
    return {
      id: m.id,
      pos: { x: m.pos.x, y: m.pos.y, anchor: m.pos.anchor },
      snap: m.snap,
      frameW: m.frameW,
      frameH: m.frameH,
      horizontalSnap: m.horizontalSnap,
      verticalSnap: m.verticalSnap
    };
  }
  function applySnapFields(base, panel) {
    const next = {
      ...base,
      x: panel.pos.x,
      y: panel.pos.y,
      anchor: panel.pos.anchor || base.anchor
    };
    if (panel.snap && (panel.snap[1] || panel.snap[2] || panel.snap[3] || panel.snap[4])) {
      next.snap = panel.snap;
    } else {
      delete next.snap;
    }
    if (panel.horizontalSnap) next.horizontalSnap = true;
    else delete next.horizontalSnap;
    if (panel.verticalSnap) next.verticalSnap = true;
    else delete next.verticalSnap;
    return next;
  }
  function meterCanGroup(m) {
    if (m.visible === false) return false;
    if (!canGroupWindow(m.id)) return false;
    if (m.presentation === "details" || m.presentation === "death_log" || m.presentation === "encounter" || m.presentation === "timeline") {
      return false;
    }
    return true;
  }
  function windowsToEdgePanels(state) {
    const out = [];
    const hudIds = hudWindowIds();
    for (let i = 0; i < hudIds.length; i++) {
      const id = hudIds[i];
      const pos = state.layout[id];
      if (!pos) continue;
      out.push(posToEdge(id, pos));
    }
    for (let i = 0; i < state.meters.length; i++) {
      const m = state.meters[i];
      if (!meterCanGroup(m)) continue;
      out.push(meterToEdge(m));
    }
    return out;
  }
  function applyEdgePanelsToState(state, panels) {
    const byId = {};
    for (let i = 0; i < panels.length; i++) byId[panels[i].id] = panels[i];
    const layout = { ...state.layout };
    const hudIds = hudWindowIds();
    for (let i = 0; i < hudIds.length; i++) {
      const id = hudIds[i];
      const p = byId[id];
      if (!p || !layout[id]) continue;
      layout[id] = applySnapFields(layout[id], p);
    }
    const meters = state.meters.map((m) => {
      const p = byId[m.id];
      if (!p) return m;
      const pos = applySnapFields(m.pos, p);
      return {
        ...m,
        pos: { x: pos.x, y: pos.y, anchor: pos.anchor },
        snap: pos.snap,
        horizontalSnap: pos.horizontalSnap,
        verticalSnap: pos.verticalSnap,
        frameW: p.frameW != null ? p.frameW : m.frameW,
        frameH: p.frameH != null ? p.frameH : m.frameH
      };
    });
    return { layout, meters };
  }
  function moveCommWindowWithGroup(state, id, pos) {
    const panels = windowsToEdgePanels(state);
    const has = panels.some((p) => p.id === id);
    if (!has) {
      if (state.layout[id]) {
        return {
          ...state,
          layout: {
            ...state.layout,
            [id]: {
              ...state.layout[id],
              x: pos.x,
              y: pos.y,
              anchor: pos.anchor || state.layout[id].anchor
            }
          }
        };
      }
      return {
        ...state,
        meters: state.meters.map(
          (m) => m.id === id ? {
            ...m,
            pos: {
              ...m.pos,
              x: pos.x,
              y: pos.y,
              anchor: pos.anchor || m.pos.anchor
            }
          } : m
        )
      };
    }
    const moved = moveEdgeGroup(panels, id, {
      x: pos.x,
      y: pos.y,
      anchor: pos.anchor || "tl"
    });
    return applyEdgePanelsToState(state, moved);
  }
  function snapCommWindowAfterMove(state, id) {
    const panels = windowsToEdgePanels(state);
    if (!panels.some((p) => p.id === id)) return state;
    const next = trySnapOnDrop(panels, id, (p) => canGroupWindow(p.id));
    return applyEdgePanelsToState(state, next);
  }
  function ungroupCommWindow(state, id) {
    const panels = windowsToEdgePanels(state);
    if (!panels.some((p) => p.id === id)) return state;
    const next = ungroupPanel(panels, id);
    return applyEdgePanelsToState(state, next);
  }
  function commWindowHasSnap(state, id) {
    const panels = windowsToEdgePanels(state);
    for (let i = 0; i < panels.length; i++) {
      if (panels[i].id === id) return panelHasSnap(panels[i]);
    }
    return false;
  }
  function findCommSnapGuideTarget(state, selfId) {
    return findSnapGuideTarget(
      windowsToEdgePanels(state),
      selfId,
      (p) => canGroupWindow(p.id)
    );
  }
  var SCALE_MIN = 0.5;
  var SCALE_MAX = 1.5;
  function clampWindowScale(scale) {
    if (!Number.isFinite(scale)) return 1;
    return Math.max(SCALE_MIN, Math.min(SCALE_MAX, Math.round(scale * 100) / 100));
  }
  function applyScaleToCommWindows(state, id, scale) {
    const clamped = clampWindowScale(scale);
    const panels = windowsToEdgePanels(state);
    let group = getEdgeGroup(panels, id);
    if (!group.length) {
      group = panels.filter((p) => p.id === id);
    }
    const ids = new Set(group.map((g) => g.id));
    ids.add(id);
    const layout = { ...state.layout };
    const hudIds = hudWindowIds();
    for (let i = 0; i < hudIds.length; i++) {
      const hid = hudIds[i];
      if (!ids.has(hid) || !layout[hid]) continue;
      layout[hid] = { ...layout[hid], scale: clamped };
    }
    const meters = state.meters.map(
      (m) => ids.has(m.id) ? { ...m, scale: clamped } : m
    );
    return { layout, meters };
  }

  // src/lib/layoutGuide.ts
  var depth = 0;
  var listeners6 = [];
  function notify2() {
    for (let i = 0; i < listeners6.length; i++) {
      listeners6[i]();
    }
  }
  function isLayoutGuideActive() {
    return depth > 0;
  }
  function beginLayoutGuide() {
    depth += 1;
    if (depth === 1) notify2();
  }
  function endLayoutGuide() {
    if (depth <= 0) {
      depth = 0;
      return;
    }
    depth -= 1;
    if (depth === 0) notify2();
  }
  function subscribeLayoutGuide(listener) {
    listeners6.push(listener);
    return () => {
      const idx = listeners6.indexOf(listener);
      if (idx >= 0) listeners6.splice(idx, 1);
    };
  }

  // src/ui/hooks/useCommWindowActions.ts
  var SHOW_WINDOW_IDS_MS = 950;
  function layoutChanged(prev, next) {
    const out = {};
    const ids = Object.keys(next);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      if (JSON.stringify(prev[id] || null) !== JSON.stringify(next[id] || null)) {
        out[id] = next[id];
      }
    }
    return out;
  }
  function metersChanged(prev, next) {
    return JSON.stringify(prev) !== JSON.stringify(next);
  }
  function useCommWindowActions(opts) {
    const React = getReact();
    const stateRef = React.useRef({
      layout: opts.layout,
      meters: opts.meters
    });
    stateRef.current = { layout: opts.layout, meters: opts.meters };
    const [snapDragId, setSnapDragId] = React.useState(null);
    const [snapPeerId, setSnapPeerId] = React.useState(null);
    const [nearPeerId, setNearPeerId] = React.useState(null);
    const [showWindowIds, setShowWindowIds] = React.useState(false);
    const showIdsTimer = React.useRef(null);
    const clearWindowIds = () => {
      if (showIdsTimer.current != null) {
        clearTimeout(showIdsTimer.current);
        showIdsTimer.current = null;
      }
      setShowWindowIds(false);
    };
    React.useEffect(() => {
      return () => {
        if (showIdsTimer.current != null) clearTimeout(showIdsTimer.current);
      };
    }, []);
    const commit = (next) => {
      const prev = stateRef.current;
      const layoutDiff = layoutChanged(prev.layout, next.layout);
      const layoutKeys = Object.keys(layoutDiff);
      if (layoutKeys.length) {
        opts.setLayout(next.layout);
        savePanelPositions(layoutDiff, opts.viewportProfile);
        if (layoutDiff.bag && opts.applyBagPos) opts.applyBagPos(layoutDiff.bag);
      }
      if (metersChanged(prev.meters, next.meters)) {
        opts.setMeters(next.meters);
        patchSettings({ meterInstances: next.meters });
      }
      stateRef.current = next;
    };
    const groupingEnabled = () => {
      const s = getSettings();
      if (s.meterWindowGrouping === false) return false;
      if (getMeterAppearance().disableGrouping) return false;
      return true;
    };
    const moveWindow = (id, pos) => {
      commit(moveCommWindowWithGroup(stateRef.current, id, pos));
    };
    const snapAfterMove = (id) => {
      clearWindowIds();
      setSnapDragId(null);
      setSnapPeerId(null);
      setNearPeerId(null);
      endLayoutGuide();
      if (!groupingEnabled()) return;
      commit(snapCommWindowAfterMove(stateRef.current, id));
    };
    const ungroupWindow = (id) => {
      commit(ungroupCommWindow(stateRef.current, id));
    };
    const onDragStart = (id) => {
      clearWindowIds();
      setSnapDragId(id);
      setSnapPeerId(null);
      setNearPeerId(null);
      beginLayoutGuide();
      showIdsTimer.current = setTimeout(() => {
        showIdsTimer.current = null;
        setShowWindowIds(true);
      }, SHOW_WINDOW_IDS_MS);
      if (!groupingEnabled()) return;
    };
    const onDragMove = (id) => {
      if (!groupingEnabled()) {
        setSnapPeerId(null);
        setNearPeerId(null);
        return;
      }
      const guide = findCommSnapGuideTarget(stateRef.current, id);
      setSnapPeerId(guide && guide.canSnap ? guide.id : null);
      setNearPeerId(guide ? guide.id : null);
    };
    const setWindowScale = (id, scale) => {
      commit(applyScaleToCommWindows(stateRef.current, id, scale));
    };
    const graphState = () => stateRef.current;
    return {
      moveWindow,
      snapAfterMove,
      ungroupWindow,
      onDragStart,
      onDragMove,
      setWindowScale,
      snapDragId,
      snapPeerId,
      nearPeerId,
      showWindowIds,
      graphState
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

  // src/ui/hooks/useSelectionFromXTarget.ts
  function maybeFocusPlayerId(id) {
    if (id == null || id === "") return void 0;
    const ent = findEntityById(id);
    if (!isFocusablePlayer(ent)) return void 0;
    return String(id);
  }
  function useSelectionFromXTarget(snap) {
    const React = getReact();
    const [selectedEntity2, setSelectedEntityState] = React.useState(
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
      selectedEntity: selectedEntity2,
      setSelectedEntity,
      closePaperdoll,
      focusUnitId,
      clearFocus
    };
  }

  // src/lib/commWindowNumbers.ts
  function seedHudWindowNumbers() {
    const out = {};
    for (let i = 0; i < PANEL_IDS.length; i++) {
      out[PANEL_IDS[i]] = i + 1;
    }
    return out;
  }
  function maxAssigned(map) {
    let max = 0;
    const keys = Object.keys(map);
    for (let i = 0; i < keys.length; i++) {
      const n = map[keys[i]];
      if (typeof n === "number" && n > max) max = n;
    }
    return max;
  }
  function ensureWindowNumbers(ids) {
    const s = getSettings();
    const map = {
      ...seedHudWindowNumbers(),
      ...s.windowNumberById || {}
    };
    let next = Math.max(
      typeof s.nextWindowNumber === "number" ? s.nextWindowNumber : 1,
      maxAssigned(map) + 1
    );
    let dirty2 = false;
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      if (map[id] != null) continue;
      map[id] = next;
      next += 1;
      dirty2 = true;
    }
    for (let i = 0; i < PANEL_IDS.length; i++) {
      const id = PANEL_IDS[i];
      if (s.windowNumberById && s.windowNumberById[id] === map[id]) continue;
      dirty2 = true;
    }
    if (dirty2 || !s.windowNumberById || s.nextWindowNumber !== next) {
      patchSettings({ windowNumberById: map, nextWindowNumber: next });
    }
    return map;
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
  function snapPosToFineGrid(x, y, step, widthPx, heightPx) {
    const metrics = squareGridMetrics(step, widthPx, heightPx);
    return {
      x: snapToAxisPercents(x, metrics.xPercents, false),
      y: snapToAxisPercents(y, metrics.yPercents, false)
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
  var listeners7 = [];
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
      if (!raw)
        return { ...DEFAULTS2, chromePos: { ...DEFAULT_LAYOUT_CHROME_POS } };
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
  function notify3() {
    for (let i = 0; i < listeners7.length; i++) {
      listeners7[i]();
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
    notify3();
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
    notify3();
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
    notify3();
    return next;
  }
  function subscribeLayoutEditPrefs(listener) {
    listeners7.push(listener);
    return () => {
      const idx = listeners7.indexOf(listener);
      if (idx >= 0) listeners7.splice(idx, 1);
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
            title: freePlacement ? "Free placement: no grid snap (layout edit + play arrange; peer + screen-edge magnets)" : `Snap to square ${stepLabel} fine grid (layout edit + unlocked/play arrange)`
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
        freePlacement ? "Free drag/resize (edit + play) \xB7 peer + screen-edge \xB7 Ctrl+Shift+L" : `${stepLabel} fine snap (edit + unlocked play) \xB7 Shift=free size \xB7 Ctrl+Shift+L`
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

  // src/meters/meterWindowGroup.ts
  function meterHasSnap(inst) {
    return panelHasSnap(inst);
  }
  function applyGroupFrameSize2(instances, resizedId, size) {
    return applyGroupFrameSize(instances, resizedId, size);
  }
  function getMeterGroup(instances, startId) {
    return getEdgeGroup(instances, startId);
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

  // src/lib/panelDragSnap.ts
  var PEER_SNAP_PCT = 1;
  var VISUAL_EDGE_SNAP_PX = 8;
  function applyPanelDragMove(input) {
    let nextX = input.rawX;
    let nextY = input.rawY;
    let edgeThresholdPx = VISUAL_EDGE_SNAP_PX;
    let useVisualEdge = true;
    const free = input.free;
    if (!free) {
      const metrics = squareGridMetrics(
        input.gridStep,
        input.rootWidth,
        input.rootHeight
      );
      const snapped = snapPosToFineGrid(
        nextX,
        nextY,
        input.gridStep,
        input.rootWidth,
        input.rootHeight
      );
      nextX = snapped.x;
      nextY = snapped.y;
      const cellPctX = metrics.cellPx / Math.max(1, input.rootWidth) * 100;
      const cellPctY = metrics.cellPx / Math.max(1, input.rootHeight) * 100;
      const peerThresh = Math.min(
        PEER_SNAP_PCT,
        Math.max(0.2, Math.min(cellPctX, cellPctY) * 0.4)
      );
      nextX = snapPercent(nextX, peerThresh, input.peerXs);
      nextY = snapPercent(nextY, peerThresh, input.peerYs);
      useVisualEdge = false;
    } else {
      nextX = snapPercent(nextX, PEER_SNAP_PCT, input.peerXs);
      nextY = snapPercent(nextY, PEER_SNAP_PCT, input.peerYs);
      edgeThresholdPx = VISUAL_EDGE_SNAP_PX;
    }
    const visual = input.visual;
    if (useVisualEdge && visual) {
      const edge = snapDragToVisualEdges(
        input.clientX,
        input.clientY,
        input.start,
        visual,
        edgeThresholdPx
      );
      if (edge.snapX) nextX = edge.x;
      if (edge.snapY) nextY = edge.y;
    }
    return { x: nextX, y: nextY };
  }

  // src/ui/chrome/WindowControlChrome.ts
  var chromeBtnStyle = (touchish, lockedBg) => ({
    cursor: "pointer",
    fontSize: touchish ? "14px" : "12px",
    padding: touchish ? "4px 8px" : "1px 6px",
    minHeight: touchish ? "32px" : void 0,
    border: "1px solid #886",
    background: lockedBg ? "rgba(50,40,20,0.95)" : "rgba(30,30,20,0.95)",
    color: "#ffe08a",
    flexShrink: 0
  });
  function WindowControlChrome(props) {
    const React = getReact();
    const [wcOpen, setWcOpen] = React.useState(false);
    const touchish = props.touchish;
    const lockBtn = props.onToggleLock ? e(
      "button",
      {
        type: "button",
        className: "comm-pos-lock",
        title: props.locked ? "Unlock \u2014 allow move and resize" : "Lock \u2014 prevent move and resize",
        "aria-label": props.locked ? "Unlock window" : "Lock window",
        onClick: (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          props.onToggleLock();
        },
        onPointerDown: (ev) => ev.stopPropagation(),
        style: chromeBtnStyle(touchish, !!props.locked)
      },
      props.locked ? "\u{1F512}" : "\u{1F513}"
    ) : null;
    const ungroupBtn = props.onUngroup ? e(
      "button",
      {
        type: "button",
        className: "comm-pos-ungroup",
        title: "Ungroup",
        "aria-label": "Ungroup",
        onClick: (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          props.onUngroup();
        },
        onPointerDown: (ev) => ev.stopPropagation(),
        style: chromeBtnStyle(touchish)
      },
      "\u29C9"
    ) : null;
    const wcItems = [];
    if (props.onToggleLock) {
      wcItems.push(
        e(
          "button",
          {
            key: "lock",
            type: "button",
            className: "comm-pos-wc-item",
            onClick: (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              props.onToggleLock();
              setWcOpen(false);
            }
          },
          props.locked ? "Unlock" : "Lock"
        )
      );
    }
    if (props.onUngroup) {
      wcItems.push(
        e(
          "button",
          {
            key: "ungroup",
            type: "button",
            className: "comm-pos-wc-item",
            onClick: (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              props.onUngroup();
              setWcOpen(false);
            }
          },
          "Ungroup"
        )
      );
    }
    if (props.onCreateWindow) {
      wcItems.push(
        e(
          "button",
          {
            key: "create",
            type: "button",
            className: "comm-pos-wc-item",
            onClick: (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              props.onCreateWindow();
              setWcOpen(false);
            }
          },
          "+ Create window"
        )
      );
    }
    if (props.onClose) {
      wcItems.push(
        e(
          "button",
          {
            key: "close",
            type: "button",
            className: "comm-pos-wc-item",
            onClick: (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              props.onClose();
              setWcOpen(false);
            }
          },
          "Close window"
        )
      );
    }
    const closed = props.closedWindows || [];
    for (let ci = 0; ci < closed.length; ci++) {
      const c = closed[ci];
      wcItems.push(
        e(
          "button",
          {
            key: "reopen-" + c.id,
            type: "button",
            className: "comm-pos-wc-item",
            onClick: (ev) => {
              var _a;
              ev.preventDefault();
              ev.stopPropagation();
              (_a = props.onReopenWindow) == null ? void 0 : _a.call(props, c.id);
              setWcOpen(false);
            }
          },
          "Reopen: " + c.label
        )
      );
    }
    const windowControl = wcItems.length > 0 && props.showMenu ? e(
      "div",
      {
        className: "comm-pos-wc",
        style: { position: "relative", flexShrink: 0 },
        onPointerDown: (ev) => ev.stopPropagation()
      },
      e(
        "button",
        {
          type: "button",
          className: "comm-pos-wc-btn",
          title: "Window Control",
          "aria-label": "Window Control",
          "aria-expanded": wcOpen,
          onClick: (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            setWcOpen(!wcOpen);
          },
          style: chromeBtnStyle(touchish)
        },
        "\u2630"
      ),
      wcOpen ? e(
        "div",
        {
          className: "comm-pos-wc-menu",
          style: {
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 2,
            minWidth: 160,
            zIndex: 40,
            background: "rgba(18,18,14,0.98)",
            border: "1px solid #886",
            padding: 4,
            display: "flex",
            flexDirection: "column",
            gap: 2
          }
        },
        ...wcItems
      ) : null
    ) : null;
    if (!lockBtn && !ungroupBtn && !windowControl) return null;
    return e(
      "div",
      {
        className: "comm-pos-window-chrome",
        style: {
          display: "flex",
          alignItems: "center",
          gap: 4,
          flexShrink: 0
        },
        onPointerDown: (ev) => ev.stopPropagation()
      },
      lockBtn,
      ungroupBtn,
      windowControl
    );
  }

  // src/ui/chrome/PositionedPanelChrome.ts
  function anchorMeta(id) {
    for (let i = 0; i < LAYOUT_ANCHOR_OPTIONS.length; i++) {
      if (LAYOUT_ANCHOR_OPTIONS[i].id === id) return LAYOUT_ANCHOR_OPTIONS[i];
    }
    return { glyph: "\xB7", title: id };
  }
  function PositionedPanelChrome(args) {
    const props = args.props;
    const {
      pos,
      editing,
      hidden,
      hover,
      touchish,
      movable,
      editChrome,
      panelLabel,
      closeSize,
      headerPad,
      headerFont,
      anchorBtn,
      opacity,
      arrangePlacement,
      showArrangeOverlay,
      onClose,
      onShow,
      setPanelHover,
      setAnchor,
      onPointerDown,
      onPointerMove,
      onPointerUp
    } = args;
    const closeAbove = props.closePlacement === "above";
    const showClose = !!onClose && !hidden && (hover || touchish || editing && !props.closeOnHoverOnly);
    const moveGrip = movable && props.showMoveGrip !== false || editing && editChrome === "grip" ? e(
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
          background: "rgba(40,40,20,0.92)",
          border: "1px solid #886",
          cursor: "grab",
          userSelect: "none",
          color: "#ffe08a",
          fontSize: headerFont,
          lineHeight: 1,
          touchAction: "none",
          pointerEvents: "auto",
          // Full-width drag strip in layout-edit grip rows and play-arrange
          // above-frame bar (CSS). Inline flex helps before CSS applies.
          flex: 1
        },
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel: onPointerUp
      },
      e("span", { "aria-hidden": true }, "\u283F")
    ) : null;
    const closeInArrangeOverlay = showClose && closeAbove && showArrangeOverlay;
    const closeBtn = showClose ? e(
      "button",
      {
        type: "button",
        className: "comm-pos-panel-close" + (closeAbove ? " comm-pos-panel-close-above" : "") + (closeInArrangeOverlay ? " comm-pos-panel-close-in-chrome" : ""),
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
        style: closeInArrangeOverlay ? {
          position: "relative",
          top: "auto",
          right: "auto",
          zIndex: 1,
          width: `${closeSize}px`,
          height: `${closeSize}px`,
          padding: 0,
          margin: 0,
          flexShrink: 0,
          border: "1px solid #886",
          background: "rgba(30,30,20,0.95)",
          color: "#ffe08a",
          fontSize: touchish ? "18px" : "14px",
          lineHeight: `${closeSize - 2}px`,
          cursor: "pointer",
          pointerEvents: "auto"
        } : {
          position: "absolute",
          top: closeAbove ? `-${closeSize + 2}px` : editing ? "2px" : "0",
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
    const hasWindowChrome = !!props.onToggleLock || !!props.onUngroup || !!props.onCreateWindow || !!onClose || !!(props.closedWindows && props.closedWindows.length);
    const windowChrome = hasWindowChrome ? e(WindowControlChrome, {
      touchish,
      locked: props.locked,
      onToggleLock: props.onToggleLock,
      onUngroup: props.onUngroup,
      onCreateWindow: props.onCreateWindow,
      onClose: onClose || void 0,
      closedWindows: props.closedWindows,
      onReopenWindow: props.onReopenWindow,
      showMenu: movable || editing || !!props.onToggleLock || !!props.onUngroup || !!onClose || !!(props.closedWindows && props.closedWindows.length)
    }) : null;
    const arrangeOverlay = showArrangeOverlay ? e(
      "div",
      {
        className: "comm-pos-arrange-overlay" + (moveGrip ? " has-grip" : " is-chrome-only") + (arrangePlacement === "inline" ? " is-inline" : " is-above"),
        title: moveGrip ? `Drag to move \xB7 ${panelLabel}` : void 0
      },
      moveGrip,
      props.onToggleLock || props.onUngroup ? windowChrome : null,
      closeInArrangeOverlay ? closeBtn : null
    ) : null;
    const editHeaderStyle = {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: headerPad,
      paddingRight: onClose && !hidden ? `${closeSize + 8}px` : "8px",
      marginBottom: "2px",
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
    const editHeader = !editing ? arrangeOverlay : editChrome === "grip" ? e(
      "div",
      {
        className: "comm-pos-edit-grip-row",
        style: {
          display: "flex",
          alignItems: "stretch",
          gap: 4,
          marginBottom: "2px"
        }
      },
      moveGrip,
      windowChrome
    ) : editChrome === "anchors" ? e(
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
      windowChrome,
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
      windowChrome,
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
    const windowIdOverlay = props.showWindowIds && typeof props.windowNumber === "number" && props.windowNumber > 0 ? e(
      "div",
      {
        className: "comm-pos-window-id",
        "aria-hidden": true
      },
      String(props.windowNumber)
    ) : null;
    const needsChromeHover = !!onClose || showArrangeOverlay || !editing && (!!props.onToggleLock || !!props.onUngroup || movable);
    return {
      editHeader,
      opacityRow,
      closeBtn,
      closeInArrangeOverlay,
      windowIdOverlay,
      needsChromeHover
    };
  }

  // src/ui/chrome/PositionedPanel.ts
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
      }, 280);
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
    const [arrangePlacement, setArrangePlacement] = React.useState(
      "above"
    );
    React.useEffect(
      () => subscribeLayoutEditPrefs(() => {
        setFreePlacement(getLayoutFreePlacement());
        gridStepRef.current = getLayoutGridStep();
      }),
      []
    );
    React.useEffect(() => {
      const onScale = props.onWindowScale;
      if (!onScale) return;
      const el = shellRef.current;
      if (!el) return;
      const canScale = editing || !!props.movable || !props.locked;
      if (!canScale) return;
      const onWheel = (ev) => {
        if (!ev.ctrlKey) return;
        ev.preventDefault();
        const cur = typeof pos.scale === "number" && Number.isFinite(pos.scale) ? pos.scale : 1;
        const delta = ev.deltaY < 0 ? 0.05 : -0.05;
        onScale(clampWindowScale(cur + delta));
      };
      el.addEventListener("wheel", onWheel, { passive: false });
      return () => el.removeEventListener("wheel", onWheel);
    }, [props.onWindowScale, props.locked, props.movable, editing, pos.scale]);
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
      const free = freePlacementRef.current || getLayoutFreePlacement();
      let rootWidth = 0;
      let rootHeight = 0;
      if (!free) {
        const root = layoutDragRoot().getBoundingClientRect();
        rootWidth = root.width;
        rootHeight = root.height;
      }
      const { xs, ys } = peerAxes();
      const snapped = applyPanelDragMove({
        rawX: raw.x,
        rawY: raw.y,
        clientX: ev.clientX,
        clientY: ev.clientY,
        start: start.current,
        visual: visualStart.current,
        free,
        gridStep: gridStepRef.current,
        rootWidth,
        rootHeight,
        peerXs: xs,
        peerYs: ys
      });
      onMove(id, { ...pos, x: snapped.x, y: snapped.y });
      if (props.onDragMove) {
        props.onDragMove(id, { ...pos, x: snapped.x, y: snapped.y });
      }
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
        }
      }
      if (!(freePlacementRef.current || getLayoutFreePlacement())) {
        const root = layoutDragRoot().getBoundingClientRect();
        const snapped = snapPosToFineGrid(
          finalPos.x,
          finalPos.y,
          gridStepRef.current,
          root.width,
          root.height
        );
        if (snapped.x !== finalPos.x || snapped.y !== finalPos.y) {
          finalPos = { ...finalPos, x: snapped.x, y: snapped.y };
        }
      }
      if (finalPos.x !== lastPos.current.x || finalPos.y !== lastPos.current.y) {
        onMove(id, finalPos);
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
    }, [props.extraDragRef, editing, props.movable, id]);
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
    const showArrangeOverlay = !editing && (movable && props.showMoveGrip !== false || !!props.onToggleLock || !!props.onUngroup);
    const ARRANGE_CHROME_H = 34;
    React.useLayoutEffect(() => {
      if (!showArrangeOverlay) {
        setArrangePlacement("above");
        return;
      }
      const el = shellRef.current;
      if (!el) return;
      const measure = () => {
        const root = layoutDragRoot().getBoundingClientRect();
        const panel = el.getBoundingClientRect();
        const fitsAbove = panel.top - ARRANGE_CHROME_H >= root.top + 2;
        setArrangePlacement(fitsAbove ? "above" : "inline");
      };
      measure();
      if (!hover) return;
      const t = window.setTimeout(measure, 0);
      return () => window.clearTimeout(t);
    }, [showArrangeOverlay, hover, pos.x, pos.y, movable, id]);
    const {
      editHeader,
      opacityRow,
      closeBtn,
      closeInArrangeOverlay,
      windowIdOverlay,
      needsChromeHover
    } = PositionedPanelChrome({
      props,
      pos,
      editing,
      hidden: !!hidden,
      hover,
      touchish,
      movable,
      editChrome,
      panelLabel,
      closeSize,
      headerPad,
      headerFont,
      anchorBtn,
      opacity,
      arrangePlacement,
      showArrangeOverlay,
      onClose,
      onShow,
      setPanelHover,
      setAnchor,
      onPointerDown,
      onPointerMove,
      onPointerUp
    });
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
    const onActivateCapture = props.onActivate ? (_ev) => {
      props.onActivate(id);
    } : void 0;
    return e(
      "div",
      {
        ref: shellRef,
        className: `comm-pos-panel comm-pos-${id}${editing ? " comm-pos-editing" : ""}${movable ? " comm-pos-movable" : ""}${hidden ? " comm-pos-hidden" : ""}${hover ? " comm-pos-chrome-open" : ""}${props.className ? ` ${props.className}` : ""}`,
        "data-panel": id,
        style: shellStyle,
        onPointerDownCapture: onActivateCapture,
        onMouseEnter: needsChromeHover ? () => setPanelHover(true) : void 0,
        onMouseLeave: needsChromeHover ? () => setPanelHover(false) : void 0
      },
      editHeader,
      opacityRow,
      closeInArrangeOverlay ? null : closeBtn,
      windowIdOverlay,
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
  height: 16px;
  flex-shrink: 0;
  border-radius: 1px;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.55);
}
.ecu-meter-inspector-portrait {
  flex-shrink: 0;
  margin-right: 2px;
}
.ecu-meter-inspector-portrait .ecu-meter-icon,
.ecu-meter-inspector-portrait .ecu-meter-icon-character {
  width: 40px !important;
  height: 40px !important;
}
.ecu-meter-inspector-ctype {
  font-weight: 400;
  text-transform: lowercase;
}
.ecu-meter-inspector-sub {
  color: var(--meter-muted);
  font-weight: 400;
  font-size: 12px;
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
.ecu-meter-report-layout {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  background: #0e1014;
}
.ecu-meter-report-main {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
}
.ecu-meter-plugin-rail {
  flex: 0 0 128px;
  width: 128px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px 5px;
  background: linear-gradient(180deg, #1a1618 0%, #121014 100%);
  border-right: 1px solid rgba(0, 0, 0, 0.65);
  overflow-y: auto;
  overflow-x: hidden;
}
.ecu-meter-plugin-rail-sec {
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #8a7a5a;
  padding: 8px 6px 3px;
}
.ecu-meter-plugin-rail-item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  text-align: left;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 2px;
  background: transparent;
  color: #c8c2b4;
  font-size: 13px;
  padding: 6px 6px;
  line-height: 1.25;
}
.ecu-meter-plugin-rail-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}
.ecu-meter-plugin-rail-item.is-active {
  background: rgba(201, 162, 39, 0.16);
  border-color: rgba(201, 162, 39, 0.45);
  color: #ffe08a;
}
.ecu-meter-plugin-rail-item.is-muted {
  cursor: default;
  opacity: 0.55;
}
.ecu-meter-plugin-rail-ico {
  flex-shrink: 0;
  width: 16px;
  text-align: center;
  font-size: 12px;
  color: #c9a227;
}
.ecu-meter-plugin-rail-lab {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* Legacy top tabs kept for any external/mock consumers */
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
`;
  var METER_BODY_WHO_CSS = `
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
.ecu-meter-icon-monster {
  flex-shrink: 0;
}
.ecu-meter-icon-monster > * {
  margin: 0 !important;
}
`;

  // src/ui/meter/css/meterReportCss.ts
  var METER_REPORT_CSS = `
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
`;

  // src/ui/meter/css/meterHoverTipCss.ts
  var METER_HOVER_TIP_CSS = `
/* Details GameCooltip-ish hover tip (bars, timeline, Spells/Targets).
 * Shared --meter-tt-* vars: body \u226516px, icons 22px (see METER_TT_ICON). */
.ecu-meter-tt {
  --meter-tt-body: 16px;
  --meter-tt-title: 17px;
  --meter-tt-sec: 15px;
  --meter-tt-kbd: 13px;
  --meter-tt-foot: 13px;
  --meter-tt-icon: 22px;
  --meter-tt-pad-y: 12px;
  --meter-tt-pad-x: 14px;
  --meter-tt-row-pad-y: 4px;
  --meter-tt-row-pad-x: 8px;
  --meter-tt-gap: 8px;
  position: fixed;
  z-index: 10000;
  min-width: 300px;
  max-width: 460px;
  background: rgba(12, 14, 18, 0.94);
  border: 1px solid rgba(210, 210, 220, 0.28);
  border-radius: 2px;
  padding: var(--meter-tt-pad-y) var(--meter-tt-pad-x);
  box-shadow: 0 8px 28px rgba(0,0,0,0.55);
  pointer-events: none;
  font-size: var(--meter-tt-body);
  color: #e8eef7;
  line-height: 1.45;
  font-weight: normal;
  text-shadow: none;
  font-family: "Segoe UI", Tahoma, Arial, sans-serif;
}
.ecu-meter-tt h4 {
  margin: 0 0 8px;
  font-size: var(--meter-tt-title);
  color: #fff;
  font-weight: normal;
  display: flex;
  align-items: center;
  gap: var(--meter-tt-gap);
}
/* Beat global .ecu-meter-icon { 14px !important } \u2014 bar rows stay 14px. */
.ecu-meter-tt .ecu-meter-icon,
.ecu-meter-tt .ecu-meter-icon-clip {
  width: var(--meter-tt-icon) !important;
  height: var(--meter-tt-icon) !important;
}
.ecu-meter-tt .ecu-meter-icon {
  font-size: 13px;
  line-height: var(--meter-tt-icon) !important;
}
.ecu-meter-tt .ecu-meter-icon-class {
  font-size: 12px;
  font-weight: 700;
}
.ecu-meter-tt .line {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  color: #c8d0dc;
  font-size: var(--meter-tt-body);
}
.ecu-meter-tt .line span { color: #ffe08a; }
.ecu-meter-tt .line b { color: #fff; font-weight: normal; }
.ecu-meter-tt .sec {
  margin-top: 10px;
  color: #8b9bb4;
  font-size: var(--meter-tt-sec);
  text-transform: uppercase;
}
.ecu-meter-tt ul { margin: 4px 0 0; padding: 0; list-style: none; }
.ecu-meter-tt li { display: flex; justify-content: space-between; gap: 14px; }
`;

  // src/ui/meter/css/meterTimelineCss.ts
  var METER_TIMELINE_CLUSTER_CSS = `
/* Time Line cooltip: primary = icon under cursor (else bar), + nearby cluster.
   Compact chrome shared by gear + CD/buff/debuff/death. */
.ecu-meter-tt.is-tl-cluster,
.ecu-meter-tt.is-gear-tip,
.ecu-meter-tt.is-tl-ev-tip {
  padding: 10px 12px;
  line-height: 1.3;
}
.ecu-meter-tt.is-gear-tip {
  min-width: 300px;
  max-width: 440px;
}
.ecu-meter-tt.is-tl-ev-tip {
  min-width: 260px;
  max-width: 380px;
}
.ecu-meter-tt-tl-cat {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #c9b878;
  margin-bottom: 2px;
}
.ecu-meter-tt-tl-cat.is-gear {
  color: #e8b84a;
  margin-bottom: 4px;
}
.ecu-meter-tt-cluster-meta,
.ecu-meter-tt-gear-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  font-size: var(--meter-tt-body);
}
.ecu-meter-tt-cluster-who,
.ecu-meter-tt-gear-who {
  color: #fff;
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-meter-tt-cluster-when,
.ecu-meter-tt-gear-when {
  flex: 0 0 auto;
  color: #c8d0dc;
  white-space: nowrap;
  font-size: var(--meter-tt-sec);
}
.ecu-meter-tt-gear {
  --meter-tt-icon: 26px;
}
.ecu-meter-tt-gear-list,
.ecu-meter-tt-evs-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.ecu-meter-tt-gear-row {
  display: grid;
  grid-template-columns: 76px 72px minmax(0, 1fr);
  align-items: center;
  column-gap: 8px;
  row-gap: 2px;
  padding: 5px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}
.ecu-meter-tt-gear-row:first-child {
  border-top: none;
  padding-top: 2px;
}
.ecu-meter-tt-gear-row.is-muted,
.ecu-meter-tt-ev-row.is-muted {
  opacity: 0.78;
}
.ecu-meter-tt-gear-slot {
  font-size: 12px;
  letter-spacing: 0.03em;
  color: #e8b84a;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ecu-meter-tt-gear-icos {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
}
.ecu-meter-tt-gear-icos.is-single {
  min-width: calc(var(--meter-tt-icon) + 4px);
  justify-content: center;
}
.ecu-meter-tt-gear-arrow {
  flex: 0 0 auto;
  color: #e8b84a;
  font-size: 14px;
  line-height: 1;
}
.ecu-meter-tt-gear-arrow-sm {
  flex: 0 0 auto;
  color: #8b9bb4;
  font-size: 11px;
  line-height: 1;
}
.ecu-meter-tt-gear-names {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  color: #fff;
  font-size: var(--meter-tt-sec);
  line-height: 1.2;
}
.ecu-meter-tt-gear-names .is-old,
.ecu-meter-tt-gear-names .is-new {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-meter-tt-gear-verb {
  color: #e8b84a;
  font-weight: 600;
  flex: 0 0 auto;
}
.ecu-meter-tt-gear-row-at {
  grid-column: 1 / -1;
  font-size: 11px;
  color: #8b9bb4;
  padding-left: 0;
}
.ecu-meter-tt-gear-empty {
  display: inline-block;
  box-sizing: border-box;
  border: 1px dashed rgba(255, 255, 255, 0.28);
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.25);
  vertical-align: middle;
}
.ecu-meter-tt-gear-row.is-muted .ecu-meter-tt-gear-slot,
.ecu-meter-tt-gear-row.is-muted .ecu-meter-tt-gear-arrow,
.ecu-meter-tt-gear-row.is-muted .ecu-meter-tt-gear-verb {
  color: #c9b878;
}
/* Dense CD / buff / debuff / death rows \u2014 pill + icon + name, not stacked cards. */
.ecu-meter-tt-ev-row {
  display: grid;
  grid-template-columns: 22px var(--meter-tt-icon) minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 6px;
  padding: 4px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}
.ecu-meter-tt-ev-row:first-child {
  border-top: none;
  padding-top: 2px;
}
.ecu-meter-tt-ev-row.is-primary {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 2px;
  margin: 0 -4px;
  padding-left: 4px;
  padding-right: 4px;
}
.ecu-meter-tt-ev-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 14px;
  border-radius: 2px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.03em;
  line-height: 1;
  text-transform: uppercase;
  flex: 0 0 auto;
}
.ecu-meter-tt-ev-pill.is-cd {
  background: rgba(60, 180, 255, 0.88);
  color: #061018;
}
.ecu-meter-tt-ev-pill.is-buff {
  background: rgba(48, 196, 72, 0.88);
  color: #061008;
}
.ecu-meter-tt-ev-pill.is-debuff {
  background: rgba(230, 72, 72, 0.92);
  color: #140808;
}
.ecu-meter-tt-ev-pill.is-death {
  background: rgba(210, 210, 220, 0.78);
  color: #1a1214;
}
.ecu-meter-tt-ev-pill.is-gear {
  background: rgba(232, 184, 74, 0.9);
  color: #1a1408;
}
.ecu-meter-tt-ev-main {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}
.ecu-meter-tt-ev-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  color: #fff;
  font-size: var(--meter-tt-sec);
}
.ecu-meter-tt-ev-elapsed {
  flex: 0 0 auto;
  color: #8b9bb4;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.ecu-meter-tt-ev-at {
  flex: 0 0 auto;
  color: #8b9bb4;
  font-size: 11px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.ecu-meter-tt-div {
  height: 1px;
  margin: 10px 0;
  background: rgba(255, 255, 255, 0.12);
}
.ecu-meter-tt-sec {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 4px 0 6px;
  padding: var(--meter-tt-row-pad-y) var(--meter-tt-row-pad-x);
  background: rgba(255, 255, 255, 0.04);
  border-radius: 2px;
}
.ecu-meter-tt-sec.is-max {
  background: rgba(201, 162, 39, 0.18);
}
.ecu-meter-tt-sec-l {
  display: inline-flex;
  align-items: center;
  gap: var(--meter-tt-gap);
  min-width: 0;
}
.ecu-meter-tt-sec-ico {
  font-size: var(--meter-tt-sec);
  line-height: 1;
  opacity: 0.9;
}
.ecu-meter-tt-sec-t {
  color: #ffe08a;
  font-size: var(--meter-tt-sec);
  font-weight: normal;
}
.ecu-meter-tt-kbd {
  flex-shrink: 0;
  font-size: var(--meter-tt-kbd);
  color: #a8b0bc;
  background: rgba(80, 88, 100, 0.55);
  border: 1px solid rgba(160, 168, 180, 0.35);
  border-radius: 999px;
  padding: 3px 10px;
  letter-spacing: 0.02em;
}
.ecu-meter-tt-sec.is-max .ecu-meter-tt-kbd {
  color: #1a1a1a;
  background: #ffe08a;
  border-color: #c9a227;
}
.ecu-meter-tt-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: var(--meter-tt-row-pad-y) var(--meter-tt-row-pad-x);
  border-radius: 1px;
  font-size: var(--meter-tt-body);
}
.ecu-meter-tt-row.is-alt {
  background: rgba(255, 255, 255, 0.045);
}
.ecu-meter-tt-row-l {
  display: inline-flex;
  align-items: center;
  gap: var(--meter-tt-gap);
  min-width: 0;
  flex: 1;
}
.ecu-meter-tt-name {
  color: #f2f4f8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ecu-meter-tt-amt {
  flex-shrink: 0;
  color: #ffe08a;
  font-weight: normal;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.ecu-meter-tt-empty {
  padding: var(--meter-tt-row-pad-y) var(--meter-tt-row-pad-x);
  color: #7a8494;
  font-size: var(--meter-tt-sec);
}
.ecu-meter-tt-foot {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: #8b9bb4;
  font-size: var(--meter-tt-foot);
}
`;
  var METER_TIMELINE_TRACK_CSS = `
/* Legacy encounter nested-tab chrome \u2014 Summary panes live in meterViewsCss. */
.ecu-meter-encounter-tabs {
  display: none;
}
.ecu-meter-timeline {
  /* Details CONST_ROW_HEIGHT=18 / icon~14; AL sprites need more room. */
  --tl-row: 36px;
  --tl-icon: 28px;
  /* All multi-lane: ~TL_SUB_ROW (26) minus padding \u2014 keep readable. */
  --tl-icon-sub: 20px;
  --tl-class: 20px;
  --tl-name-w: 132px;
  --tl-ruler-h: 38px;
  --tl-pad: 0px;
  --tl-content-w: 100%;
  --tl-track-w: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  padding: 0;
  font-size: 14px;
  line-height: 1.2;
  background: #101218;
  color: #cfd8dc;
  cursor: default;
}
.ecu-meter-timeline-hd {
  flex-shrink: 0;
  padding: 8px 10px 6px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.55);
  background: linear-gradient(180deg, rgba(36, 30, 28, 0.95) 0%, rgba(18, 16, 18, 0.98) 100%);
}
.ecu-meter-timeline-mark {
  font-size: 14px;
  letter-spacing: 0.03em;
  color: rgb(227, 186, 4);
  margin-bottom: 6px;
  user-select: none;
}
.ecu-meter-timeline-tools {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}
.ecu-meter-tl-mode {
  cursor: pointer;
  border: 1px solid rgba(80, 70, 55, 0.7);
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.35);
  color: #b0a890;
  font-size: 13px;
  padding: 4px 10px;
}
.ecu-meter-tl-mode:hover {
  color: #fff;
  border-color: rgba(201, 162, 39, 0.5);
}
.ecu-meter-tl-mode.is-active {
  color: #ffe08a;
  background: rgba(201, 162, 39, 0.18);
  border-color: rgba(201, 162, 39, 0.65);
}
.ecu-meter-timeline-meta {
  color: #8b9bb4;
  margin-left: 6px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.ecu-meter-timeline-meta [data-tl-wall] {
  color: #6d7a92;
}
.ecu-meter-timeline-meta [data-tl-scale] {
  margin-left: 8px;
  color: #6d7a92;
}
/* Bar color legend \u2014 AL: green=buff, blue=CD, red=debuff. */
.ecu-meter-tl-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  margin-top: 6px;
  font-size: 12px;
  color: #8b9bb4;
  user-select: none;
}
.ecu-meter-tl-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.ecu-meter-tl-legend-swatch {
  width: 14px;
  height: 8px;
  border-radius: 1px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.45);
  flex-shrink: 0;
}
.ecu-meter-tl-legend-item.is-cd .ecu-meter-tl-legend-swatch {
  background: rgba(60, 180, 255, 0.45);
}
.ecu-meter-tl-legend-item.is-buff .ecu-meter-tl-legend-swatch {
  background: rgba(0, 255, 0, 0.35);
}
.ecu-meter-tl-legend-item.is-debuff .ecu-meter-tl-legend-swatch {
  background: rgba(255, 0, 0, 0.35);
}
.ecu-meter-tl-legend-item.is-gear .ecu-meter-tl-legend-swatch {
  background: rgba(255, 176, 32, 0.85);
}
.ecu-meter-tl-legend-item.is-death .ecu-meter-tl-legend-swatch {
  width: 4px;
  height: 10px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(220, 40, 40, 0.85);
  box-shadow: 0 0 3px rgba(229, 57, 53, 0.5);
}
.ecu-meter-tl-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: row;
  align-items: stretch;
}
.ecu-meter-tl-gutter {
  flex: 0 0 var(--tl-name-w);
  width: var(--tl-name-w);
  min-width: var(--tl-name-w);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid #2a3140;
  background: rgba(10, 10, 12, 0.96);
  z-index: 4;
}
.ecu-meter-tl-gutter-ruler {
  flex-shrink: 0;
  height: var(--tl-ruler-h);
  min-height: var(--tl-ruler-h);
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  padding: 0 8px;
  border-bottom: 1px solid #2a3140;
  background: #12141a;
  user-select: none;
}
.ecu-meter-tl-gutter-axis-lab {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  font-size: 9px;
  line-height: 1;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #a8b4c8;
}
.ecu-meter-tl-gutter-axis-lab.is-clock {
  color: #6d7a92;
}
.ecu-meter-tl-gutter-rows {
  flex: 1;
  will-change: transform;
  transform: translateZ(0);
}
.ecu-meter-tl-gutter-lane {
  display: flex;
  align-items: center;
  gap: 6px;
  height: var(--tl-row);
  min-height: var(--tl-row);
  max-height: var(--tl-row);
  padding: 0 8px;
  overflow: hidden;
  border-bottom: 1px solid rgba(42, 49, 64, 0.55);
  cursor: pointer;
  font-size: 13px;
  line-height: 1.15;
  background: rgba(10, 10, 12, 0.92);
}
.ecu-meter-tl-gutter-lane.is-alt {
  background: rgba(16, 18, 24, 0.96);
}
.ecu-meter-tl-gutter-lane:hover {
  background: rgba(36, 38, 44, 0.96);
}
.ecu-meter-tl-gutter-lane.is-selected {
  background: rgba(40, 34, 18, 0.96);
}
.ecu-meter-tl-gutter-empty {
  height: var(--tl-row);
}
.ecu-meter-tl-scroll {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-x: auto;
  overflow-y: auto;
  max-height: none;
  overscroll-behavior-x: contain;
  scroll-behavior: auto;
}
/* Track canvas \u2014 pad + content; follow-now pins \u201Cnow\u201D on the right. */
.ecu-meter-tl-canvas {
  position: relative;
  width: var(--tl-track-w);
  min-width: 100%;
  max-width: none;
  box-sizing: border-box;
}
/* Live-only playhead at content \u201Cnow\u201D (may sit at viewport right while
   following). Not rendered post-combat \u2014 see MeterTimelineView. */
.ecu-meter-tl-now {
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(var(--tl-pad) + var(--tl-content-w));
  width: 2px;
  margin-left: -1px;
  background: rgba(227, 186, 4, 0.9);
  box-shadow: 0 0 6px rgba(227, 186, 4, 0.45);
  pointer-events: none;
  z-index: 5;
}
.ecu-meter-timeline.is-tl-frozen .ecu-meter-tl-now {
  opacity: 0.5;
}
.ecu-meter-tl-ruler {
  display: flex;
  align-items: stretch;
  position: sticky;
  top: 0;
  z-index: 3;
  background: #12141a;
  border-bottom: 1px solid #2a3140;
  min-height: var(--tl-ruler-h);
}
.ecu-meter-tl-ruler-track {
  position: relative;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  width: var(--tl-track-w);
  min-height: var(--tl-ruler-h);
  overflow: hidden;
}
.ecu-meter-tl-axis {
  position: relative;
  margin-left: var(--tl-pad);
  width: var(--tl-content-w);
  min-width: var(--tl-content-w);
  height: 100%;
  min-height: inherit;
  /* Icons + bar hits share this context so later icons beat earlier bars. */
  isolation: isolate;
}
.ecu-meter-tl-ruler .ecu-meter-tl-axis {
  flex: 1 1 0;
  height: auto;
  min-height: 0;
}
.ecu-meter-tl-tick {
  position: absolute;
  top: 50%;
  /* Fixed-width box centered on the tick \u2014 digit changes must not shift X. */
  width: 5ch;
  margin-left: 0;
  transform: translate(-50%, -50%);
  box-sizing: border-box;
  text-align: center;
  font-family: Consolas, Monaco, ui-monospace, monospace;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: #a8b4c8;
  white-space: nowrap;
  pointer-events: none;
}
.ecu-meter-tl-tick.is-wall {
  width: 8ch;
  font-size: 10px;
  color: #6d7a92;
}
/* Only 00:00 / true end marker \u2014 never applied to live step ticks. */
.ecu-meter-tl-tick.is-first {
  transform: translate(0, -50%);
  text-align: left;
}
.ecu-meter-tl-tick.is-last {
  transform: translate(-100%, -50%);
  text-align: right;
}
.ecu-meter-tl-lanes {
  display: flex;
  flex-direction: column;
  width: var(--tl-track-w);
  min-width: var(--tl-track-w);
}
.ecu-meter-tl-lane {
  display: flex;
  align-items: stretch;
  /* Explicit width \u2014 do not shrink-wrap to the scrollport. */
  width: var(--tl-track-w);
  min-width: var(--tl-track-w);
  height: var(--tl-row);
  min-height: var(--tl-row);
  max-height: var(--tl-row);
  /* visible+hidden computes to auto+hidden (CSS overflow), which puts a
     gold h-scrollbar on every player row. clip clips without a scrollport;
     both axes stay clip/visible so neither becomes auto. hidden on this
     wide strip also makes Chromium drop history tiles when the parent
     pane scrolls left \u2014 do not use overflow-x:hidden/auto here. */
  overflow: visible;
  overflow-x: clip;
  scrollbar-width: none !important;
  line-height: 1.15;
  border-bottom: 1px solid rgba(42, 49, 64, 0.55);
  box-shadow: inset 0 1px 0 transparent, inset 0 -1px 0 transparent;
  cursor: pointer;
}
.ecu-meter-tl-lane::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}
.ecu-meter-tl-lane.is-alt {
  background: rgba(255, 255, 255, 0.025);
}
.ecu-meter-tl-lane:hover {
  background: rgba(200, 200, 200, 0.12);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 0 rgba(255, 255, 255, 0.35);
}
.ecu-meter-tl-lane.is-selected {
  background: rgba(201, 162, 39, 0.12);
  box-shadow: inset 0 1px 0 rgba(255, 224, 138, 0.55), inset 0 -1px 0 rgba(255, 224, 138, 0.55);
}
.ecu-meter-tl-lane.is-selected:hover {
  background: rgba(201, 162, 39, 0.18);
}
.ecu-meter-tl-name-txt {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.15;
}
.ecu-meter-tl-track {
  position: relative;
  flex: 0 0 auto;
  width: var(--tl-track-w);
  min-width: var(--tl-track-w);
  height: 100%;
  min-height: 100%;
  /* Same as lane: no per-row scrollport; parent .ecu-meter-tl-scroll is
     the only overflow-x:auto. */
  overflow: visible;
  overflow-x: clip;
  scrollbar-width: none !important;
}
.ecu-meter-tl-track::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}
.ecu-meter-tl-class {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
}
.ecu-meter-tl-gridline {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(80, 90, 110, 0.4);
  pointer-events: none;
  z-index: 0;
}
.ecu-meter-tl-block {
  position: absolute;
  top: 3px;
  bottom: 3px;
  height: auto;
  /* z-index:auto \u2014 do not create a stacking context. Icons and bar-hits
     compete in the axis so a later icon beats an earlier 5\u201320s bar. */
  z-index: auto;
  display: flex;
  align-items: center;
  cursor: pointer;
  min-width: var(--tl-icon);
  /* No translateZ \u2014 promoted layers on a 30k+ px track get culled when scrolling. */
  pointer-events: none;
}
.ecu-meter-tl-block.is-sub {
  /* Stack only present kinds; row height grows with cat count (see laneRowPx). */
  top: calc(var(--tl-sub-i) * 100% / var(--tl-subs) + 1px);
  height: calc(100% / var(--tl-subs) - 2px);
  bottom: auto;
  min-width: var(--tl-icon-sub);
}
.ecu-meter-tl-block.is-no-bar .ecu-meter-tl-block-bar {
  display: none;
}
.ecu-meter-tl-block-ico {
  position: relative;
  /* Icon band (inline z-index adds stackIndex). Beats every bar hit. */
  z-index: 10000;
  flex-shrink: 0;
  display: inline-flex;
  width: var(--tl-icon);
  height: var(--tl-icon);
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.95));
  pointer-events: auto;
  cursor: pointer;
}
/* Global .ecu-meter-icon is 14px !important (meter bars). Timeline must win. */
.ecu-meter-timeline .ecu-meter-tl-block-ico .ecu-meter-icon,
.ecu-meter-timeline .ecu-meter-tl-block-ico .ecu-meter-icon-clip {
  width: var(--tl-icon) !important;
  height: var(--tl-icon) !important;
}
.ecu-meter-tl-block.is-sub .ecu-meter-tl-block-ico {
  width: var(--tl-icon-sub);
  height: var(--tl-icon-sub);
}
.ecu-meter-timeline .ecu-meter-tl-block.is-sub .ecu-meter-tl-block-ico .ecu-meter-icon,
.ecu-meter-timeline .ecu-meter-tl-block.is-sub .ecu-meter-tl-block-ico .ecu-meter-icon-clip {
  width: var(--tl-icon-sub) !important;
  height: var(--tl-icon-sub) !important;
}
.ecu-meter-timeline .ecu-meter-tl-class .ecu-meter-icon {
  width: var(--tl-class) !important;
  height: var(--tl-class) !important;
  font-size: 13px !important;
  line-height: var(--tl-class) !important;
}
.ecu-meter-tl-block-bar {
  position: absolute;
  left: calc(var(--tl-icon) / 2);
  right: 0;
  top: 1px;
  bottom: 1px;
  border-radius: 1px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.4);
  z-index: 1;
  pointer-events: none;
}
.ecu-meter-tl-block.is-sub .ecu-meter-tl-block-bar {
  left: calc(var(--tl-icon-sub) / 2);
}
/* Bar-only hit (below the icon band). Easy bar hover when not on an icon.
   \xB12px x-pad only \u2014 empty row gaps still miss. */
.ecu-meter-tl-block-hit {
  position: absolute;
  left: -2px;
  right: -2px;
  top: 0;
  bottom: 0;
  width: auto;
  height: auto;
  z-index: 1;
  pointer-events: auto;
  cursor: pointer;
}
/* AL Time Line: green = buffs, blue = cooldowns, red = debuffs. */
.ecu-meter-tl-block.is-cast .ecu-meter-tl-block-bar {
  background: rgba(60, 180, 255, 0.35);
  opacity: 0.9;
}
.ecu-meter-tl-block.is-buff .ecu-meter-tl-block-bar {
  background: rgba(0, 255, 0, 0.25);
}
.ecu-meter-tl-block.is-debuff .ecu-meter-tl-block-bar {
  background: rgba(255, 0, 0, 0.25);
}
.ecu-meter-tl-block.is-gear .ecu-meter-tl-block-ico {
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.95))
    drop-shadow(0 0 2px rgba(255, 176, 32, 0.95));
}
.ecu-meter-tl-block.is-gear .ecu-meter-tl-block-ico:hover {
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.95))
    drop-shadow(0 0 2px rgba(255, 176, 32, 0.95))
    drop-shadow(0 0 3px rgba(255, 255, 255, 0.35));
}
.ecu-meter-tl-block.is-no-bar .ecu-meter-tl-block-bar {
  display: none;
}
/* Do not lift the whole block \u2014 that trapped later icons under the first bar. */
.ecu-meter-tl-block:hover .ecu-meter-tl-block-bar {
  filter: brightness(1.25);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25);
}
.ecu-meter-tl-block-ico:hover {
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.95))
    drop-shadow(0 0 3px rgba(255, 255, 255, 0.45));
}
/* Details PlaceDeathPins: 4\xD714 white pin \u2014 keep thin, not a fat death icon. */
.ecu-meter-tl-death {
  position: absolute;
  top: 4px;
  bottom: 4px;
  width: 4px;
  margin-left: -2px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(220, 40, 40, 0.85);
  cursor: pointer;
  box-shadow: 0 0 4px rgba(229, 57, 53, 0.65);
}
.ecu-meter-tl-death:hover {
  box-shadow: 0 0 6px rgba(229, 57, 53, 0.9);
}
.ecu-meter-tl-empty {
  padding: 20px 14px;
  color: #8b9bb4;
  font-size: 13px;
}
/* Back-compat aliases if anything still targets old class names */
.ecu-meter-timeline-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
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
`;

  // src/ui/meter/css/meterInspectorCss.ts
  var METER_INSPECTOR_DRILL_CSS = `
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
`;
  var METER_INSPECTOR_MAIN_CSS = `
.ecu-meter-inspector {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  font-size: 14px;
  color: var(--meter-text);
  background: transparent;
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
}
.ecu-meter-inspector-layout {
  display: flex;
  flex-direction: row;
  min-height: 0;
  height: 100%;
  min-width: 0;
  overflow: hidden;
}
.ecu-meter-bd-side {
  flex: 0 0 168px;
  width: 168px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 5px 8px;
  background: linear-gradient(180deg, #1a1618 0%, #121014 100%);
  border-right: 1px solid rgba(0, 0, 0, 0.65);
  overflow: hidden;
  min-height: 0;
}
.ecu-meter-bd-side-sec {
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #c9a227;
  padding: 8px 6px 3px;
  flex-shrink: 0;
}
.ecu-meter-bd-side-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1 1 auto;
  min-height: 48px;
  max-height: 42%;
}
.ecu-meter-bd-side-list.is-segments {
  max-height: 28%;
  flex: 0 1 auto;
}
.ecu-meter-bd-side-item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  text-align: left;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.03);
  color: #c8c2b4;
  font-size: 12px;
  padding: 4px 6px;
  line-height: 1.25;
}
.ecu-meter-bd-side-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}
.ecu-meter-bd-side-item.is-active {
  background: rgba(255, 220, 80, 0.22);
  border-color: rgba(201, 162, 39, 0.55);
  color: #ffe08a;
}
.ecu-meter-bd-side-item:disabled {
  cursor: default;
  opacity: 0.7;
}
.ecu-meter-bd-side-lab {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-meter-bd-side-amt {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  color: #8b9bb0;
  font-size: 11px;
}
.ecu-meter-bd-side-item.is-active .ecu-meter-bd-side-amt {
  color: #ffe08a;
}
.ecu-meter-bd-side-empty {
  padding: 6px;
  color: #6a7384;
  font-size: 11px;
}
.ecu-meter-bd-side .ecu-game-icon,
.ecu-meter-bd-side .ecu-meter-icon {
  flex-shrink: 0;
}
.ecu-meter-inspector-top {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 8px 0;
  border-bottom: 1px solid var(--meter-border);
  background: rgba(0, 0, 0, 0.18);
}
.ecu-meter-inspector-attr {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
  padding: 4px 0;
}
.ecu-meter-inspector-attr-text {
  color: #e8eef7;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-meter-inspector-tabs {
  flex-shrink: 0;
  border-bottom: none;
  padding: 0;
  gap: 0;
  background: transparent;
}
.ecu-meter-inspector-tabs .ecu-meter-player-tab {
  font-size: 13px;
  padding: 6px 12px;
  border-bottom: 2px solid transparent;
  margin-bottom: 0;
}
.ecu-meter-inspector-tabs .ecu-meter-player-tab.active {
  color: #ffe08a;
  border-bottom-color: #c9a227;
  background: rgba(201, 162, 39, 0.1);
}
.ecu-meter-inspector .ecu-meter-inspector-body {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
/* Details Spells: left = abilities + TARGETS; right = spell blocks (full height) */
.ecu-meter-bd-spells {
  display: flex;
  flex-direction: row;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}
.ecu-meter-bd-left {
  flex: 1.25;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid var(--meter-border);
}
.ecu-meter-bd-main {
  display: none;
}
.ecu-meter-bd-abilities {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
}
.ecu-meter-bd-abilities .ecu-meter-bar-host,
.ecu-meter-bd-targets .ecu-meter-bar-host,
.ecu-meter-bd-auras-players .ecu-meter-bar-host {
  height: 100%;
}
.ecu-meter-bd-abilities .ecu-meter-row.clickable,
.ecu-meter-bd-abilities .ecu-meter-bar-list,
.ecu-meter-bd-auras-players .ecu-meter-row.clickable {
  cursor: pointer;
}
/* Inspector rank bars \u2014 readable density (Details ~20px rows) */
.ecu-meter-bd-abilities .ecu-meter-row,
.ecu-meter-bd-targets .ecu-meter-row,
.ecu-meter-bd-auras-players .ecu-meter-row {
  min-height: 22px;
  height: 22px;
  font-size: 14px;
  text-shadow: none;
  gap: 4px;
  padding: 0 6px 0 3px;
}
.ecu-meter-bd-abilities .ecu-meter-row.has-skill,
.ecu-meter-bd-targets .ecu-meter-row.has-skill,
.ecu-meter-bd-auras-players .ecu-meter-row.has-skill {
  min-height: 24px;
  height: 24px;
}
.ecu-meter-bd-abilities .ecu-meter-row .ecu-meter-who,
.ecu-meter-bd-abilities .ecu-meter-row .ecu-meter-vals,
.ecu-meter-bd-targets .ecu-meter-row .ecu-meter-who,
.ecu-meter-bd-targets .ecu-meter-row .ecu-meter-vals,
.ecu-meter-bd-auras-players .ecu-meter-row .ecu-meter-who,
.ecu-meter-bd-auras-players .ecu-meter-row .ecu-meter-vals {
  font-size: 14px !important;
}
.ecu-meter-bd-abilities .ecu-meter-icon,
.ecu-meter-bd-targets .ecu-meter-icon,
.ecu-meter-bd-auras-players .ecu-meter-icon {
  width: 18px !important;
  height: 18px !important;
}
.ecu-meter-bd-blocks {
  flex: 0.95;
  min-width: 200px;
  max-width: 340px;
  overflow: auto;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(0, 0, 0, 0.14);
}
.ecu-meter-bd-blocks-empty {
  justify-content: center;
  align-items: center;
}
.ecu-meter-bd-block {
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(18, 20, 26, 0.88);
  padding: 0;
  border-radius: 2px;
  overflow: hidden;
  min-height: 52px;
}
.ecu-meter-bd-block.is-summary {
  border-color: rgba(201, 162, 39, 0.4);
}
.ecu-meter-bd-block.is-crit {
  border-color: rgba(229, 115, 115, 0.4);
}
.ecu-meter-bd-block-fill {
  position: absolute;
  inset: 1px auto 1px 1px;
  background: rgba(110, 110, 120, 0.35);
  pointer-events: none;
  z-index: 0;
}
.ecu-meter-bd-block.is-summary .ecu-meter-bd-block-fill {
  background: rgba(201, 162, 39, 0.16);
}
.ecu-meter-bd-block.is-crit .ecu-meter-bd-block-fill {
  background: rgba(229, 115, 115, 0.22);
}
.ecu-meter-bd-block-body {
  position: relative;
  z-index: 1;
  padding: 7px 9px;
}
.ecu-meter-bd-block-title {
  color: #ffd28a;
  font-size: 13px;
  margin-bottom: 5px;
  text-transform: none;
}
.ecu-meter-bd-block-h {
  color: #ffd28a;
  font-size: 13px;
}
.ecu-meter-bd-block-line {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
  color: #c5d0e0;
  padding: 2px 0;
  line-height: 1.35;
}
.ecu-meter-bd-block-left,
.ecu-meter-bd-block-right {
  min-width: 0;
}
.ecu-meter-bd-block-right {
  text-align: right;
  flex-shrink: 0;
}
.ecu-meter-bd-block-line b {
  color: #fff;
  font-weight: normal;
  font-variant-numeric: tabular-nums;
}
.ecu-meter-bd-block-note,
.ecu-meter-bd-muted,
.ecu-meter-bd-stub {
  color: #8b9bb0;
  font-size: 12px;
  padding: 4px 0 0;
  line-height: 1.35;
}
.ecu-meter-bd-stub {
  padding: 12px 10px;
}
.ecu-meter-bd-targets {
  flex: 0 0 36%;
  min-height: 96px;
  max-height: 42%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-top: 1px solid var(--meter-border);
}
.ecu-meter-bd-targets-h {
  flex-shrink: 0;
  padding: 6px 10px 3px;
  color: #ffd28a;
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.ecu-meter-bd-targets .ecu-meter-bar-scroll {
  flex: 1;
  min-height: 0;
}
.ecu-meter-bd-auras {
  display: flex;
  flex-direction: row;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}
.ecu-meter-bd-auras.is-full .ecu-meter-bd-auras-main {
  flex: 1;
  width: 100%;
}
.ecu-meter-bd-auras-players {
  display: none;
}
.ecu-meter-bd-auras-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: row;
  overflow: hidden;
}
.ecu-meter-bd-auras-col {
  flex: 1;
  min-width: 0;
  overflow: auto;
  border-right: 1px solid var(--meter-border);
  padding-bottom: 8px;
}
.ecu-meter-bd-auras-col:last-child {
  border-right: none;
}
.ecu-meter-bd-auras-col-h {
  padding: 8px 10px 4px;
  color: #ffd28a;
  font-size: 13px;
  letter-spacing: 0.03em;
}
.ecu-meter-bd-auras-note {
  padding: 0 10px 6px;
  color: #8b9bb0;
  font-size: 12px;
}
.ecu-meter-bd-auras-table {
  display: flex;
  flex-direction: column;
}
.ecu-meter-bd-auras-head,
.ecu-meter-uptime-row {
  display: grid;
  grid-template-columns: 1fr 64px 40px 28px 28px;
  gap: 4px;
  padding: 4px 10px;
  align-items: center;
  font-size: 13px;
}
.ecu-meter-bd-auras-head {
  color: #ffd28a;
  border-bottom: 1px solid var(--meter-border);
  font-size: 12px;
  letter-spacing: 0.02em;
}
.ecu-meter-uptime-row {
  color: #c5d0e0;
}
.ecu-meter-uptime-row.is-alt {
  background: rgba(255, 255, 255, 0.03);
}
.ecu-meter-uptime-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-meter-uptime-ico {
  flex: 0 0 auto;
}
.ecu-meter-uptime-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-meter-uptime-time {
  color: #ffe08a;
  font-variant-numeric: tabular-nums;
}
.ecu-meter-uptime-pct,
.ecu-meter-uptime-apps,
.ecu-meter-uptime-ref {
  font-variant-numeric: tabular-nums;
  color: #8b9bb0;
  text-align: center;
}
.ecu-meter-uptime-pct {
  color: #e8eef7;
}
.ecu-meter-inspector-compare {
  display: flex;
  gap: 1px;
  min-height: 0;
  height: 100%;
  overflow: auto;
  background: var(--meter-border);
}
.ecu-meter-inspector-compare-col {
  flex: 1;
  min-width: 0;
  background: #12141a;
  padding: 8px 10px;
  overflow: auto;
}
.ecu-meter-inspector-compare-col.is-you {
  background: rgba(201, 162, 39, 0.07);
}
.ecu-meter-inspector-compare-col.is-empty {
  display: flex;
  align-items: center;
  justify-content: center;
}
.ecu-meter-inspector-compare-empty {
  color: #8b9bb0;
  font-size: 12px;
  text-align: center;
  padding: 12px;
  line-height: 1.35;
}
.ecu-meter-inspector-compare-h {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #e8eef7;
  margin-bottom: 6px;
  padding-bottom: 5px;
  border-bottom: 1px solid var(--meter-border);
}
.ecu-meter-inspector-compare-stat {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  padding: 2px 0;
  color: #c5d0e0;
}
.ecu-meter-inspector-compare-stat b {
  color: #ffd28a;
  font-weight: normal;
  font-variant-numeric: tabular-nums;
}
.ecu-meter-inspector-compare-diff {
  font-size: 12px;
  margin: 4px 0 8px;
  font-variant-numeric: tabular-nums;
}
.ecu-meter-inspector-compare-diff.is-up { color: #81c784; }
.ecu-meter-inspector-compare-diff.is-down { color: #e57373; }
.ecu-meter-inspector-compare-diff.is-self { color: #8b9bb0; }
.ecu-meter-inspector-compare-spells-h {
  font-size: 11px;
  color: #ffd28a;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin: 10px 0 4px;
}
.ecu-meter-inspector-compare-spell {
  position: relative;
  display: flex;
  justify-content: space-between;
  gap: 6px;
  align-items: center;
  min-height: 20px;
  padding: 2px 4px;
  margin-bottom: 2px;
  font-size: 12px;
  color: #c5d0e0;
  overflow: hidden;
}
.ecu-meter-inspector-compare-spell.is-missing {
  min-height: 18px;
  opacity: 0.25;
}
.ecu-meter-inspector-compare-spell-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: rgba(140, 140, 150, 0.28);
  pointer-events: none;
}
.ecu-meter-inspector-compare-col.is-you .ecu-meter-inspector-compare-spell-fill {
  background: rgba(201, 162, 39, 0.22);
}
.ecu-meter-inspector-compare-spell-n,
.ecu-meter-inspector-compare-spell-v {
  position: relative;
  z-index: 1;
}
.ecu-meter-inspector-compare-spell-n {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-meter-inspector-compare-spell-v {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  color: #fff;
}
.ecu-meter-inspector-compare-pct.is-up { color: #81c784; }
.ecu-meter-inspector-compare-pct.is-down { color: #e57373; }
.ecu-meter-inspector-compare-pct.is-flat { color: #8b9bb0; }
.ecu-meter-encounter {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  font-size: 12px;
  color: var(--meter-text);
}
`;
  var METER_INSPECTOR_TAIL_CSS = `
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
@media (max-width: 640px) {
  .ecu-meter-bd-spells {
    flex-direction: column;
  }
  .ecu-meter-bd-blocks {
    max-width: none;
    border-top: 1px solid var(--meter-border);
  }
  .ecu-meter-bd-auras {
    flex-direction: column;
  }
  .ecu-meter-bd-auras-players {
    display: none;
  }
  .ecu-meter-inspector-top {
    flex-wrap: wrap;
  }
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
.ecu-meter-icon.ecu-meter-icon-class-sprite {
  line-height: 0;
  font-size: 0;
  text-shadow: none;
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
/* Keep statusbar actions clear of corner resize grips while arranging. */
.ecu-meter-shell.is-layout .ecu-meter-statusbar {
  padding-left: 16px;
  padding-right: 16px;
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
.ecu-meter-enc-deathlist {
  padding: 2px 0;
}
.ecu-meter-enc-deathrow {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 6px;
  align-items: baseline;
  padding: 3px 8px;
  font-size: 11px;
  color: #c5d0e0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.ecu-meter-enc-deathname {
  color: #ef9a9a;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ecu-meter-enc-deathtime {
  color: var(--meter-muted);
  font-variant-numeric: tabular-nums;
}
.ecu-meter-enc-deathnum {
  color: #8b9bb0;
  font-size: 10px;
}
.ecu-meter-enc-empty {
  padding: 8px;
  color: #888;
  font-size: 11px;
}
.ecu-meter-report-tab.is-stub {
  opacity: 0.42;
  cursor: default;
  color: var(--meter-muted);
}
.ecu-meter-report-tab.is-stub:hover {
  color: var(--meter-muted);
  background: transparent;
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
  padding: 5px 0;
  box-shadow: 0 10px 28px rgba(0,0,0,0.65);
  color: #eee;
  font-size: 12px;
  max-height: min(360px, 72vh);
  overflow-x: hidden;
  overflow-y: auto;
  pointer-events: auto;
  z-index: 2147483000;
  scrollbar-width: thin;
  scrollbar-color: #5a5050 #1a1618;
  font-family: "Segoe UI", Tahoma, Arial, sans-serif;
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
  padding: 5px 12px 3px;
  color: rgba(220, 210, 210, 0.78);
  font-size: 11px;
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
  padding: 5px 14px;
  font-size: 13px;
  line-height: 1.4;
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
.ecu-meter-shell.is-report .ecu-meter-report-layout {
  flex: 1 1 auto;
  min-height: 0;
  border: 1px solid var(--meter-border);
  border-top: none;
  border-radius: 0 0 2px 2px;
}
.ecu-meter-shell.is-report .ecu-meter-report-main > .ecu-meter-body {
  flex: 1 1 auto;
  min-height: 0;
  border: none;
  border-radius: 0;
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
.comm-pos-panel.ecu-meter-frame.comm-pos-grouped {
  outline: 1px solid rgba(201, 162, 39, 0.35);
  box-shadow: none;
}
.comm-pos-panel.ecu-meter-frame.comm-pos-dragging {
  outline: 2px solid rgba(120, 200, 255, 0.85);
  box-shadow: 0 6px 20px rgba(0,0,0,0.45);
  z-index: 12;
}
.comm-pos-panel.ecu-meter-frame.comm-pos-snap-target {
  outline: 2px solid rgba(232, 201, 106, 0.9);
  box-shadow:
    0 0 0 1px rgba(0,0,0,0.65),
    inset 0 0 0 1px rgba(232, 201, 106, 0.35);
}
/* Arrange/edit: overflow for cooltips; resize via meter shell grip only (not CSS resize). */
.comm-pos-panel.ecu-meter-frame.comm-pos-editing,
.comm-pos-panel.ecu-meter-frame.comm-pos-arrange,
.comm-pos-panel.ecu-meter-frame.comm-pos-movable {
  overflow: visible;
  resize: none;
  min-width: 0;
  min-height: 0;
}
.comm-pos-panel.ecu-meter-frame.comm-pos-editing > .comm-pos-panel-body,
.comm-pos-panel.ecu-meter-frame.comm-pos-arrange > .comm-pos-panel-body,
.comm-pos-panel.ecu-meter-frame.comm-pos-movable > .comm-pos-panel-body {
  overflow: hidden;
}
/* Hide \xD7 sits above the frame / on arrange chrome \u2014 never on maroon tools. */
.comm-pos-panel.ecu-meter-frame > .comm-pos-panel-close-above:not(.comm-pos-panel-close-in-chrome) {
  top: -24px;
  right: 0;
  border-radius: 3px;
}
/* Layout-edit: park \xD7 on the edit header strip (in-flow chrome). */
.comm-pos-panel.ecu-meter-frame.comm-pos-editing > .comm-pos-panel-close {
  top: 2px;
  right: 2px;
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
  position: relative;
}
.ecu-meter-titlebar.is-draggable { cursor: grab; }
.ecu-meter-titlebar.is-draggable:active { cursor: grabbing; }
/* Details: Mode \xB7 Segment \xB7 Attribute \xB7 Report \xB7 Reset sit right of the title. */
.ecu-meter-tools {
  display: flex;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
  margin-left: 2px;
  transition: opacity 0.12s ease;
}
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
/* Stretch \u2195 (+ layout \u2699/+/Rm on hover) sits after Details tools in flex flow.
 * Stretch is a plain .ecu-meter-tool (always visible) \u2014 no dark plate.
 * Do not absolute-overlay the Mode\xB7\u2026\xB7Reset hit targets.
 * Lock / ungroup / hide \xD7 belong to PositionedPanel Window Control chrome. */
.ecu-meter-actions {
  display: flex;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
  position: relative;
  z-index: 5;
  margin-left: 2px;
}
/* Layout-edit only (\u2699/+/Rm) \u2014 hover chip; stretch lives outside this. */
.ecu-meter-chrome-hover {
  display: flex;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
  padding: 0 2px;
  border-radius: 2px;
  background: rgba(20, 16, 18, 0.92);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.55);
  opacity: 0;
  transition: opacity 0.12s ease;
  pointer-events: none;
}
/* Hover / menu only \u2014 unlocked (is-layout) must not pin chrome open. */
@media (hover: hover) and (pointer: fine) {
  .ecu-meter-shell:hover .ecu-meter-chrome-hover,
  .ecu-meter-shell.is-interacting .ecu-meter-chrome-hover,
  .ecu-meter-shell.is-menu-open .ecu-meter-chrome-hover {
    opacity: 1;
    pointer-events: auto;
  }
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
/* Primary toolbar + stretch \u2195 stay readable; layout chrome is hover-gated. */
.ecu-meter-shell:not(.is-interacting):not(.is-menu-open):not(.is-layout) .ecu-meter-tools,
.ecu-meter-shell:not(.is-interacting):not(.is-menu-open):not(.is-layout) .ecu-meter-tools-left,
.ecu-meter-shell:not(.is-interacting):not(.is-menu-open):not(.is-layout) .ecu-meter-actions > .ecu-meter-tool {
  opacity: 0.9;
}
.ecu-meter-shell.is-interacting .ecu-meter-tools,
.ecu-meter-shell.is-menu-open .ecu-meter-tools,
.ecu-meter-shell.is-layout .ecu-meter-tools,
.ecu-meter-shell.is-interacting .ecu-meter-tools-left,
.ecu-meter-shell.is-menu-open .ecu-meter-tools-left,
.ecu-meter-shell.is-layout .ecu-meter-tools-left,
.ecu-meter-shell.is-interacting .ecu-meter-actions > .ecu-meter-tool,
.ecu-meter-shell.is-menu-open .ecu-meter-actions > .ecu-meter-tool,
.ecu-meter-shell.is-layout .ecu-meter-actions > .ecu-meter-tool {
  opacity: 1;
}
.ecu-meter-ttl-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
/* \u2014\u2014 Details parity: encounter titlebar badges \u2014\u2014 */
.ecu-meter-encounter-badges {
  display: flex;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
  margin-left: 2px;
}
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
  function cssSlice(part) {
    return part.replace(/^\n/, "").replace(/\n$/, "");
  }
  function joinBodyCore(...parts) {
    return `
${parts.map(cssSlice).join("\n")}
`;
  }
  var CSS4 = [
    METER_SHELL_CSS,
    METER_TITLEBAR_CSS,
    METER_COOLTIP_CSS,
    joinBodyCore(
      METER_BODY_CORE_CSS,
      METER_REPORT_CSS,
      METER_INSPECTOR_DRILL_CSS,
      METER_BODY_WHO_CSS,
      METER_HOVER_TIP_CSS,
      METER_TIMELINE_CLUSTER_CSS,
      METER_INSPECTOR_MAIN_CSS,
      METER_TIMELINE_TRACK_CSS,
      METER_INSPECTOR_TAIL_CSS
    ),
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
    const pad3 = 6;
    const estH = Math.min(360, Math.floor(vh * 0.72));
    let left = (opts == null ? void 0 : opts.preferRight) ? anchor.left + anchor.width - minW : anchor.left;
    let top = anchor.top + anchor.height + 4;
    if (top + Math.min(estH, 280) > vh - pad3) {
      top = Math.max(pad3, anchor.top - Math.min(estH, 280) - 4);
    }
    left = Math.max(pad3, Math.min(left, vw - minW - pad3));
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
        barValue: r.barValue,
        primary: r.primary,
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

  // src/ui/meter/MeterPluginRail.ts
  var PLUGINS = [
    {
      kind: "encounter",
      label: "Encounter Details",
      icon: "\u2620",
      title: "Encounter Details"
    },
    {
      kind: "timeline",
      label: "Time Line",
      icon: "\u25B6",
      title: "Time Line"
    },
    {
      kind: "deaths",
      label: "Deaths",
      icon: "\u271D",
      title: "Death Log"
    }
  ];
  function MeterPluginRail(props) {
    getReact();
    return e(
      "aside",
      {
        className: "ecu-meter-plugin-rail",
        style: { ...PIXEL_TEXT },
        "aria-label": "Plugins"
      },
      e("div", { className: "ecu-meter-plugin-rail-sec" }, "Plugins"),
      ...PLUGINS.map(
        (p) => e(
          "button",
          {
            key: p.kind,
            type: "button",
            className: "ecu-meter-plugin-rail-item" + (props.active === p.kind ? " is-active" : ""),
            title: p.title,
            onClick: () => props.onSelect(p.kind)
          },
          e(
            "span",
            { className: "ecu-meter-plugin-rail-ico", "aria-hidden": true },
            p.icon
          ),
          e("span", { className: "ecu-meter-plugin-rail-lab" }, p.label)
        )
      ),
      e("div", { className: "ecu-meter-plugin-rail-sec" }, "Tools"),
      e(
        "div",
        {
          className: "ecu-meter-plugin-rail-item is-muted",
          title: "Options live on the meter Mode menu"
        },
        e(
          "span",
          { className: "ecu-meter-plugin-rail-ico", "aria-hidden": true },
          "\u2699"
        ),
        e("span", { className: "ecu-meter-plugin-rail-lab" }, "Options")
      )
    );
  }

  // src/ui/meter/MeterStatusbar.ts
  function MeterStatusbar(props) {
    const React = getReact();
    const [, tick] = React.useState(0);
    React.useEffect(() => {
      const id = window.setInterval(() => {
        if (typeof document !== "undefined" && document.hidden) return;
        tick((n) => n + 1);
      }, 1e3);
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
        for (let i = 0; i < heal.rows.length; i++)
          totalHeal += heal.rows[i].value;
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
          props.instanceLabel ? e(
            "span",
            { className: "ecu-meter-options-sub" },
            props.instanceLabel
          ) : null,
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
        e(
          "div",
          { className: "ecu-meter-options-body" },
          chk("showStatusbar", "Show statusbar"),
          chk("showTotalBar", "Total bar"),
          chk("animateBars", "Animate bars"),
          chk("showSpecIcons", "Class icons on bars (optional)"),
          chk("showRankNumbers", "Rank numbers"),
          chk("segmentsLocked", "Segments locked (all windows)"),
          chk("disableGrouping", "Disable new grouping"),
          chk("autoHideCombat", "Fade in combat"),
          chk("autoHideOoc", "Fade out of combat"),
          chk("deathLogLifePct", "Death log life %"),
          chk("deathLogInvert", "Invert death log"),
          row(
            "Bar height",
            e("input", {
              type: "range",
              min: 14,
              max: 28,
              value: app.barHeight,
              onChange: (ev) => patch({ barHeight: Number(ev.target.value) })
            })
          ),
          row(
            "Window scale",
            e("input", {
              type: "range",
              min: 80,
              max: 140,
              value: Math.round(app.windowScale * 100),
              onChange: (ev) => patch({ windowScale: Number(ev.target.value) / 100 })
            })
          ),
          row(
            "Idle alpha",
            e("input", {
              type: "range",
              min: 20,
              max: 100,
              value: Math.round(app.idleAlpha * 100),
              onChange: (ev) => patch({ idleAlpha: Number(ev.target.value) / 100 })
            })
          ),
          row(
            "Test bars",
            e(
              "button",
              {
                type: "button",
                className: "ecu-meter-opt-btn",
                onClick: () => patch({ testBars: !app.testBars })
              },
              app.testBars ? "Hide test bars" : "Show test bars"
            )
          ),
          row(
            "",
            e(
              "button",
              {
                type: "button",
                className: "ecu-meter-opt-btn",
                onClick: () => patch({ ...DEFAULT_METER_APPEARANCE })
              },
              "Reset defaults"
            )
          )
        )
      )
    );
  }

  // src/meters/meterBarPool.ts
  var TOTAL_ROW_ID = "__total__";
  function isTotalRow(row2) {
    return row2.id === TOTAL_ROW_ID;
  }
  function splashSuffix(row2) {
    if (!(row2.splashDamage != null && row2.splashDamage > 0)) return "";
    return ` <span class="ecu-meter-splash-hint" title="Explosion splash damage">+${formatCompactNumber(row2.splashDamage)}</span>`;
  }
  function formatRowValue(row2, share, opts) {
    if (opts.metric === "avoidance") {
      return `${(row2.value * 100).toFixed(1)}%`;
    }
    const splash = splashSuffix(row2);
    const rate = row2.rate != null ? row2.rate : null;
    const ratePrimary = row2.primary === "rate" && rate != null;
    const pctStr = opts.pct !== false ? `${share.toFixed(opts.detailsFormat !== false ? 1 : 0)}%` : "";
    if (opts.detailsFormat !== false) {
      if (ratePrimary) {
        const inner = pctStr ? `${formatCompactNumber(row2.value)}, ${pctStr}` : formatCompactNumber(row2.value);
        return `${formatCompactRate(rate)} (${inner})${splash}`;
      }
      if (rate != null) {
        const inner = pctStr ? `${formatCompactRate(rate)}, ${pctStr}` : formatCompactRate(rate);
        return `${formatCompactNumber(row2.value)} (${inner})${splash}`;
      }
      return pctStr ? `${formatCompactNumber(row2.value)} (${pctStr})${splash}` : `${formatCompactNumber(row2.value)}${splash}`;
    }
    if (ratePrimary) {
      const pct2 = pctStr ? `, ${pctStr}` : "";
      return `${formatCompactRate(rate)} (${formatCompactNumber(row2.value)}${pct2})${splash}`;
    }
    if (rate != null) {
      const pct2 = pctStr ? `, ${pctStr}` : "";
      return `${formatCompactNumber(row2.value)} (${formatCompactRate(rate)}${pct2})${splash}`;
    }
    const pct = pctStr ? ` <span class="ecu-meter-pct">${pctStr}</span>` : "";
    return `${formatCompactNumber(row2.value)}${pct}${splash}`;
  }
  function rowColor(row2) {
    return row2.color || classColors[row2.ctype || ""] || "#607d8b";
  }
  function barAmount(row2) {
    return row2.barValue != null ? row2.barValue : row2.value;
  }
  function scaleMax(rows) {
    let fromMeta = 0;
    let fromVisible = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (isTotalRow(r)) continue;
      fromVisible = Math.max(fromVisible, barAmount(r));
      if (r.barMax > 0) fromMeta = Math.max(fromMeta, r.barMax);
    }
    return fromMeta || fromVisible || 1;
  }
  function groupSum(rows) {
    let sum = 0;
    for (let i = 0; i < rows.length; i++) {
      if (isTotalRow(rows[i])) continue;
      sum += rows[i].value;
    }
    return sum || 1;
  }
  function barWidthPct(row2, max) {
    if (isTotalRow(row2)) return 100;
    return max ? barAmount(row2) / max * 100 : 0;
  }
  function isSkillOrTargetRow(row2) {
    return row2.kind === "ability" || row2.kind === "channel" || row2.kind === "target";
  }
  function barRowIconHtml(r, opts) {
    if (isTotalRow(r)) return "";
    if (isSkillOrTargetRow(r)) {
      return rowIconHtml(
        { id: r.id, name: r.name, ctype: r.ctype, mtype: r.mtype, kind: r.kind },
        { icons: opts.icons !== false, iconSize: 14 }
      );
    }
    if (!opts.classIcons || !r.ctype) return "";
    return classIconHtml(r.ctype, 14);
  }
  function iconCacheKey(r, opts) {
    if (isTotalRow(r)) return "";
    if (isSkillOrTargetRow(r)) return `${r.kind}:${r.id}`;
    if (!opts.classIcons || !r.ctype) return "";
    return `class:${r.ctype}`;
  }
  function syncRowIcon(nameHost, r, opts) {
    const want = iconCacheKey(r, opts);
    const existing = nameHost.querySelector(".ecu-meter-icon");
    if (want && nameHost.dataset.iconId === want && existing) return;
    if (!want && !existing) {
      delete nameHost.dataset.iconId;
      return;
    }
    const html = barRowIconHtml(r, opts);
    if (!html) {
      if (existing) existing.remove();
      delete nameHost.dataset.iconId;
      return;
    }
    if (existing) existing.outerHTML = html;
    else nameHost.insertAdjacentHTML("afterbegin", html);
    nameHost.dataset.iconId = want;
  }
  function makeRowEl(r, i, opts, max, total) {
    const el = document.createElement("div");
    const isAbility = r.kind === "ability" || r.kind === "channel";
    el.className = "ecu-meter-row" + (r.you ? " you" : "") + (r.selected ? " is-selected" : "") + (isTotalRow(r) ? " is-total" : "") + (isAbility ? " has-skill" : "") + (opts.onClick || opts.onContextMenu ? " clickable" : "");
    el.dataset.id = r.id || String(i);
    const pct = barWidthPct(r, max);
    const share = total ? r.value / total * 100 : 0;
    const icon = barRowIconHtml(r, opts);
    const anim = opts.animate !== false ? " ecu-meter-fill-anim" : "";
    el.innerHTML = `
    <div class="ecu-meter-fill${anim}" style="width:${pct}%;background:${rowColor(r)}"></div>
    ${opts.rank !== false ? `<span class="ecu-meter-rank">${r.rank != null ? r.rank : i + 1}.</span>` : "<span></span>"}
    <span class="ecu-meter-who">${icon}<span class="ecu-meter-label"></span></span>
    <span class="ecu-meter-vals"></span>`;
    const label = el.querySelector(".ecu-meter-label");
    if (label) label.textContent = r.name;
    const who = el.querySelector(".ecu-meter-who");
    if (who) {
      const key = iconCacheKey(r, opts);
      if (key) who.dataset.iconId = key;
    }
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
  function sortForPaint(rows) {
    if (rows.length && rows[0].rank != null) return rows.slice();
    return rows.slice().sort((a, b) => {
      if (isTotalRow(a)) return 1;
      if (isTotalRow(b)) return -1;
      return barAmount(b) - barAmount(a);
    });
  }
  function renderRankedRows(container, rows, opts = {}) {
    container.innerHTML = "";
    container.classList.add("ecu-meter-bar-list");
    const sorted = sortForPaint(rows);
    const max = scaleMax(sorted);
    const total = groupSum(sorted);
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
    const sorted = sortForPaint(rows);
    const max = scaleMax(sorted);
    const total = groupSum(sorted);
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
      const nextId = r.id || String(i);
      if (el.dataset.id !== nextId) el.dataset.id = nextId;
      const nextClass = "ecu-meter-row" + (r.you ? " you" : "") + (r.selected ? " is-selected" : "") + (isTotalRow(r) ? " is-total" : "") + (r.kind === "ability" || r.kind === "channel" ? " has-skill" : "") + (merged.onClick || merged.onContextMenu ? " clickable" : "");
      if (el.className !== nextClass) el.className = nextClass;
      const fill = el.querySelector(".ecu-meter-fill");
      const pct = barWidthPct(r, max);
      if (fill) {
        const width = pct + "%";
        const bg = rowColor(r);
        if (fill.style.width !== width) fill.style.width = width;
        if (fill.style.background !== bg) fill.style.background = bg;
      }
      const rank = el.querySelector(".ecu-meter-rank");
      const rankText = `${r.rank != null ? r.rank : i + 1}.`;
      if (rank && merged.rank !== false && rank.textContent !== rankText) {
        rank.textContent = rankText;
      }
      const label = el.querySelector(".ecu-meter-label");
      if (label && label.textContent !== r.name) label.textContent = r.name;
      const nameHost = el.querySelector(".ecu-meter-who");
      if (nameHost) syncRowIcon(nameHost, r, merged);
      const vals = el.querySelector(".ecu-meter-vals");
      const share = total ? r.value / total * 100 : 0;
      const nextVals = formatRowValue(r, share, merged);
      if (vals && vals.innerHTML !== nextVals) vals.innerHTML = nextVals;
      bindRow(el, r, merged);
    }
    container._barOpts = merged;
  }

  // src/meters/meterTooltip.ts
  var PAD = 8;
  var CURSOR = 14;
  var METER_TT_ICON = 22;
  var MAX_SPELLS = 6;
  var MAX_TARGETS = 2;
  var MAX_EXPANDED = 99;
  var tipEl = null;
  var lastMods = { shift: false, ctrl: false };
  var hoverRebuild = null;
  var hoverX = 0;
  var hoverY = 0;
  var keysBound = false;
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
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
  function paintTip(html, clientX, clientY) {
    const tip = ensureTip();
    tip.innerHTML = html;
    const isGear = html.indexOf("ecu-meter-tt-gear") !== -1;
    const isEvs = html.indexOf("ecu-meter-tt-evs") !== -1;
    tip.classList.toggle("is-gear-tip", isGear);
    tip.classList.toggle("is-tl-ev-tip", isEvs);
    tip.classList.toggle("is-tl-cluster", isGear || isEvs);
    tip.style.display = "block";
    tip.style.left = "-9999px";
    tip.style.top = "0px";
    placeTip(tip, clientX, clientY);
  }
  function onModKey(ev) {
    if (ev.key !== "Shift" && ev.key !== "Control" && ev.key !== "Meta") return;
    if (!hoverRebuild || !tipEl || tipEl.style.display === "none") return;
    const mods = {
      shift: ev.shiftKey,
      ctrl: ev.ctrlKey || ev.metaKey
    };
    if (mods.shift === lastMods.shift && mods.ctrl === lastMods.ctrl) return;
    lastMods = mods;
    paintTip(hoverRebuild(mods), hoverX, hoverY);
  }
  function bindModKeys() {
    if (keysBound) return;
    keysBound = true;
    window.addEventListener("keydown", onModKey);
    window.addEventListener("keyup", onModKey);
  }
  function unbindModKeys() {
    if (!keysBound) return;
    keysBound = false;
    window.removeEventListener("keydown", onModKey);
    window.removeEventListener("keyup", onModKey);
  }
  function showMeterTooltip(ev, html) {
    hoverRebuild = null;
    lastMods = { shift: ev.shiftKey, ctrl: ev.ctrlKey || ev.metaKey };
    hoverX = ev.clientX;
    hoverY = ev.clientY;
    paintTip(html, ev.clientX, ev.clientY);
  }
  function showMeterTooltipLive(ev, rebuild) {
    const mods = {
      shift: ev.shiftKey,
      ctrl: ev.ctrlKey || ev.metaKey
    };
    hoverRebuild = rebuild;
    lastMods = mods;
    hoverX = ev.clientX;
    hoverY = ev.clientY;
    bindModKeys();
    paintTip(rebuild(mods), ev.clientX, ev.clientY);
  }
  function hideMeterTooltip() {
    hoverRebuild = null;
    unbindModKeys();
    if (!tipEl) return;
    tipEl.style.display = "none";
    tipEl.classList.remove("is-gear-tip", "is-tl-ev-tip", "is-tl-cluster");
  }
  function metricForBreakdown(metric) {
    if (metric === "heal" || metric === "taken" || metric === "healing_required" || metric === "avoidance" || metric === "damage") {
      return metric;
    }
    return "damage";
  }
  function formatAmtPct(value, total, avoidance) {
    if (avoidance) {
      const pct2 = (value * 100).toFixed(1);
      return `${pct2}%`;
    }
    const pct = total > 0 ? value / total * 100 : 0;
    return `${formatCompactNumber(value)} (${pct.toFixed(1)}%)`;
  }
  function sectionHeader(icon, title, hint, maximized) {
    const maxCls = maximized ? " is-max" : "";
    return `<div class="ecu-meter-tt-sec${maxCls}">
    <span class="ecu-meter-tt-sec-l">${icon}<span class="ecu-meter-tt-sec-t">${title}</span></span>
    <span class="ecu-meter-tt-kbd">${hint}</span>
  </div>`;
  }
  function rankRowsHtml(rows, limit, total, iconFor, avoidance) {
    if (!rows.length) {
      return `<div class="ecu-meter-tt-empty">None</div>`;
    }
    const n = Math.min(limit, rows.length);
    let html = "";
    for (let i = 0; i < n; i++) {
      const r = rows[i];
      const alt = i % 2 === 1 ? " is-alt" : "";
      const name = escapeHtml(r.name);
      const amt = formatAmtPct(r.value, total, avoidance);
      html += `<div class="ecu-meter-tt-row${alt}">
      <span class="ecu-meter-tt-row-l">${iconFor(r)}<span class="ecu-meter-tt-name">${name}:</span></span>
      <span class="ecu-meter-tt-amt">${amt}</span>
    </div>`;
    }
    return html;
  }
  function queryRanked(kind, actorId, metric, segmentRef, partyFocus, entities) {
    const result = runMeterQuery(
      kind === "abilities" ? { kind: "abilities", actorId, metric } : { kind: "targets", actorId, metric },
      {
        segmentRef,
        partyFocus,
        entities,
        now: Date.now()
      }
    );
    if (result.kind !== "ranked") return [];
    return result.rows.slice().sort((a, b) => b.value - a.value);
  }
  function playerBarTooltipHtml(ctx, mods) {
    const { row: row2, metric, segmentRef, partyFocus, entities } = ctx;
    const avoidance = metric === "avoidance";
    const rate = row2.rate != null ? `<div class="line"><span>Rate</span><b>${formatCompactRate(row2.rate)}/s</b></div>` : "";
    const abs = avoidance ? `<div class="line"><span>Value</span><b>${(row2.value * 100).toFixed(1)}%</b></div>` : `<div class="line"><span>Total</span><b>${formatCompactNumber(row2.value)}</b></div>${rate}`;
    const isPlayerRow = row2.id !== "__total__" && row2.kind !== "channel" && row2.kind !== "ability" && row2.kind !== "target";
    const headIcon = isPlayerRow ? characterIconHtml(row2.id, {
      size: METER_TT_ICON,
      ctype: row2.ctype,
      name: row2.name,
      title: row2.ctype ? `${row2.name} \xB7 ${row2.ctype}` : row2.name || row2.id
    }) + " " : "";
    const classLine = isPlayerRow && row2.ctype ? `<div class="line"><span>Class</span><b>${escapeHtml(row2.ctype)}</b></div>` : "";
    const head = `<h4>${headIcon}${escapeHtml(row2.name)}</h4>${classLine}${abs}
    <div class="line"><span>Share</span><b>${(row2.pct * 100).toFixed(0)}%</b></div>`;
    if (row2.kind === "target") {
      return targetBarTooltipHtml(row2);
    }
    if (row2.id === "__total__" || row2.kind === "channel" || row2.kind === "ability") {
      return `${head}<div class="ecu-meter-tt-foot">Click row \u2192 Inspector</div>`;
    }
    const m = metricForBreakdown(metric);
    const spells = queryRanked(
      "abilities",
      row2.id,
      m,
      segmentRef,
      partyFocus,
      entities
    );
    const targets = queryRanked(
      "targets",
      row2.id,
      m,
      segmentRef,
      partyFocus,
      entities
    );
    const spellLimit = mods.shift ? MAX_EXPANDED : MAX_SPELLS;
    const targetLimit = mods.ctrl ? MAX_EXPANDED : MAX_TARGETS;
    const spellTotal = spells.reduce((s, r) => s + r.value, 0) || row2.value || 1;
    const targetTotal = targets.reduce((s, r) => s + r.value, 0) || row2.value || 1;
    const spellsSec = sectionHeader(
      `<span class="ecu-meter-tt-sec-ico" aria-hidden="true">\u2694</span>`,
      "Spells",
      "Shift",
      mods.shift
    ) + rankRowsHtml(
      spells,
      spellLimit,
      spellTotal,
      (r) => skillIconHtml(r.id, METER_TT_ICON),
      avoidance
    );
    const targetsSec = sectionHeader(
      `<span class="ecu-meter-tt-sec-ico" aria-hidden="true">\u2713</span>`,
      "Targets",
      "Ctrl",
      mods.ctrl
    ) + rankRowsHtml(
      targets,
      targetLimit,
      targetTotal,
      (r) => targetIconHtml(r, METER_TT_ICON),
      avoidance
    );
    return `${head}
    <div class="ecu-meter-tt-div"></div>
    ${spellsSec}
    <div class="ecu-meter-tt-div"></div>
    ${targetsSec}
    <div class="ecu-meter-tt-foot">Click \u2192 Inspector</div>`;
  }
  function abilityBarTooltipHtml(row2) {
    const splash = row2.splashDamage != null && row2.splashDamage > 0 ? `<div class="line"><span>Explosion</span><b>+${formatCompactNumber(row2.splashDamage)}</b></div>` : "";
    return `<h4>${skillIconHtml(row2.id, METER_TT_ICON)} ${escapeHtml(row2.name)}</h4>
    <div class="line"><span>Total</span><b>${formatCompactNumber(row2.value)}</b></div>
    ${splash}
    ${row2.rate != null ? `<div class="line"><span>Rate</span><b>${formatCompactRate(row2.rate)}/s</b></div>` : ""}
    <div class="line"><span>Share</span><b>${(row2.pct * 100).toFixed(0)}%</b></div>
    <div class="ecu-meter-tt-foot">Click \u2192 targets for spell</div>`;
  }
  function targetBarTooltipHtml(row2) {
    return `<h4>${targetIconHtml(row2, METER_TT_ICON)} ${escapeHtml(row2.name)}</h4>
    <div class="line"><span>Total</span><b>${formatCompactNumber(row2.value)}</b></div>
    ${row2.rate != null ? `<div class="line"><span>Rate</span><b>${formatCompactRate(row2.rate)}/s</b></div>` : ""}
    <div class="line"><span>Share</span><b>${(row2.pct * 100).toFixed(0)}%</b></div>
    <div class="ecu-meter-tt-foot">Click \u2192 Inspector</div>`;
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
      barValue: 12e4,
      primary: "total",
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
      barValue: 9e4,
      primary: "total",
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
      barValue: 6e4,
      primary: "total",
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
      const rankedAmt = (r) => r.barValue != null ? r.barValue : r.value;
      const sorted = result.rows.slice().sort((a, b) => rankedAmt(b) - rankedAmt(a));
      let totalVal = 0;
      let totalRate = 0;
      let ratePrimary = false;
      for (let i = 0; i < sorted.length; i++) {
        totalVal += sorted[i].value;
        if (sorted[i].rate != null) totalRate += sorted[i].rate;
        if (sorted[i].primary === "rate") ratePrimary = true;
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
        const topBarMax = ((_a = sorted[0]) == null ? void 0 : _a.barMax) || (ratePrimary ? totalRate : totalVal) || 1;
        rows.push({
          id: "__total__",
          name: "Total",
          value: totalVal,
          rate: totalRate || null,
          barValue: ratePrimary ? totalRate : totalVal,
          primary: ratePrimary ? "rate" : "total",
          pct: 1,
          barMax: topBarMax,
          label: "Total",
          kind: "player",
          color: "#888"
        });
      }
      const metric = p.metric || (p.query.kind === "players" ? p.query.metric : p.query.kind === "abilities" || p.query.kind === "ability_targets" || p.query.kind === "targets" ? p.query.metric : void 0);
      const wantSkillIcons = p.query.kind === "abilities" || p.query.kind === "ability_targets" || p.query.kind === "targets" || p.query.kind === "taken_by_spell" || p.query.kind === "enemy_damage";
      const opts = {
        rank: app.showRankNumbers,
        pct: true,
        metric,
        // Player ranking (DPS/HPS/etc.) must not inherit always-on icons.
        // Inspector Spells/TARGETS keep ability/monster chips.
        icons: wantSkillIcons,
        classIcons: !!app.showSpecIcons,
        animate: app.animateBars,
        detailsFormat: true,
        onClick: p.onRowClick ? (ev, row2) => p.onRowClick(row2, ev) : void 0,
        onContextMenu: p.onRowContextMenu ? (ev, row2) => p.onRowContextMenu(row2, ev) : void 0,
        tooltipHtml: (ev, row2) => {
          if (row2.kind === "ability") {
            showMeterTooltip(ev, abilityBarTooltipHtml(row2));
            return;
          }
          if (row2.kind === "target") {
            showMeterTooltip(ev, targetBarTooltipHtml(row2));
            return;
          }
          showMeterTooltipLive(
            ev,
            (mods) => playerBarTooltipHtml(
              {
                row: row2,
                metric,
                segmentRef: p.segmentRef,
                partyFocus: p.partyFocus,
                entities: p.entities
              },
              mods
            )
          );
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

  // src/ui/chrome/GameIcon.ts
  function GameIcon(props) {
    const React = getReact();
    const ref = React.useRef(null);
    const {
      id,
      kind = "auto",
      size = 18,
      ctype,
      mtype,
      name,
      title,
      className,
      container
    } = props;
    React.useEffect(() => {
      const el = ref.current;
      if (!el) return;
      paintGameIcon(el, id, { kind, size, ctype, mtype, name, title, container });
      return () => {
        if (el) el.innerHTML = "";
      };
    }, [id, kind, size, ctype, mtype, name, title, container]);
    return e("span", {
      ref,
      className: ["ecu-game-icon", className].filter(Boolean).join(" "),
      style: {
        display: "inline-flex",
        width: size,
        height: size,
        flex: "0 0 auto",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        verticalAlign: "middle"
      },
      title: title || id
    });
  }

  // src/ui/meter/views/MeterDeathView.ts
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
  function DeathSourceBar(props) {
    return e(
      "div",
      { className: "ecu-meter-death-source" },
      e(GameIcon, {
        id: props.ability,
        kind: "auto",
        size: 14,
        className: "ecu-meter-death-source-icon",
        title: skillDisplayName(props.ability)
      }),
      e(
        "span",
        { className: "ecu-meter-death-source-name" },
        skillDisplayName(props.ability)
      ),
      e(
        "span",
        { className: "ecu-meter-death-source-bar" },
        e("span", {
          className: "ecu-meter-death-source-fill",
          style: { width: `${Math.round(props.pct * 100)}%` }
        })
      ),
      e(
        "span",
        { className: "ecu-meter-death-source-amt" },
        formatCompactNumber(props.amount)
      )
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
      ref.current.innerHTML = `${skillIconHtml(h.source || "attack", 14)} ${skillDisplayName(h.source || "attack")}${h.actor ? ` <span class="ecu-meter-death-hit-actor">${h.actor}</span>` : ""}`;
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
    const logHits = filteredHits.slice().sort((a, b) => appearance.deathLogInvert ? b.at - a.at : a.at - b.at);
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

  // src/ui/meter/MeterBreakdownSideRail.ts
  function segmentKey(ref) {
    if (ref === "current" || ref === "total") return ref;
    return `past:${ref.pastId}`;
  }
  function refsEqual(a, b) {
    return segmentKey(a) === segmentKey(b);
  }
  function MeterBreakdownSideRail(props) {
    getReact();
    const metric = props.metric === "heal" || props.metric === "taken" ? props.metric : "damage";
    const playersResult = runMeterQuery(
      { kind: "players", metric, primary: "total" },
      {
        segmentRef: props.segmentRef,
        partyFocus: props.partyFocus,
        now: Date.now()
      }
    );
    const players = playersResult.kind === "ranked" ? playersResult.rows : [];
    const past2 = listPastSegments();
    const segmentOpts = [
      { ref: "current", label: segmentTitle("current") },
      { ref: "total", label: segmentTitle("total") }
    ];
    for (let i = 0; i < past2.length; i++) {
      const p = past2[i];
      segmentOpts.push({
        ref: { pastId: p.id },
        label: p.label || segmentTitle({ pastId: p.id }) || p.id
      });
    }
    return e(
      "aside",
      {
        className: "ecu-meter-bd-side",
        style: { ...PIXEL_TEXT },
        "aria-label": "Breakdown side menu"
      },
      e("div", { className: "ecu-meter-bd-side-sec" }, "Select Player"),
      e(
        "div",
        { className: "ecu-meter-bd-side-list", role: "listbox" },
        players.length ? players.map(
          (row2) => e(
            "button",
            {
              key: row2.id,
              type: "button",
              role: "option",
              "aria-selected": row2.id === props.selectedActorId,
              className: "ecu-meter-bd-side-item" + (row2.id === props.selectedActorId ? " is-active" : ""),
              title: `${row2.name} \u2014 ${formatCompactNumber(row2.value)}`,
              onClick: () => {
                if (row2.id !== props.selectedActorId) {
                  props.onSelectActor(row2.id, row2.name);
                }
              }
            },
            e("span", { className: "ecu-meter-bd-side-lab" }, row2.name),
            e(
              "span",
              { className: "ecu-meter-bd-side-amt" },
              formatCompactNumber(row2.value)
            )
          )
        ) : e(
          "div",
          { className: "ecu-meter-bd-side-empty" },
          "No players in segment"
        )
      ),
      e("div", { className: "ecu-meter-bd-side-sec" }, "Select Segment"),
      e(
        "div",
        { className: "ecu-meter-bd-side-list is-segments", role: "listbox" },
        segmentOpts.map((opt) => {
          const active = refsEqual(opt.ref, props.segmentRef);
          const resolved = opt.ref === "current" ? resolveSegment("current") : null;
          const label = opt.ref === "current" && (resolved == null ? void 0 : resolved.label) ? `${opt.label}` : opt.label;
          return e(
            "button",
            {
              key: segmentKey(opt.ref),
              type: "button",
              role: "option",
              "aria-selected": active,
              className: "ecu-meter-bd-side-item" + (active ? " is-active" : ""),
              title: label,
              disabled: !props.onSelectSegment,
              onClick: () => {
                if (props.onSelectSegment && !active) {
                  props.onSelectSegment(opt.ref);
                }
              }
            },
            e("span", { className: "ecu-meter-bd-side-lab" }, label)
          );
        })
      )
    );
  }

  // src/ui/meter/views/MeterCompareView.ts
  var COMPARE_SPELL_MATCH_PCT = 30;
  var COMPARE_SPELL_ROWS = 12;
  var COMPARE_TARGET_ROWS = 9;
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
  function sharedAbilityPct(primary, other) {
    const keys = Object.keys(primary.abilities);
    if (!keys.length) return 0;
    let same = 0;
    for (let i = 0; i < keys.length; i++) {
      if (other.abilities[keys[i]]) same += 1;
    }
    return same / keys.length * 100;
  }
  function comparePeerActors(segmentRef, actorId, ctype, metric) {
    const all = sameCtypePeers(segmentRef, actorId, ctype);
    const primary = all.find((a) => a.id === actorId) || all[0] || null;
    if (!primary) return { primary: null, peers: [] };
    const scored = [];
    for (let i = 0; i < all.length; i++) {
      const a = all[i];
      if (a.id === primary.id) continue;
      if (sharedAbilityPct(primary, a) <= COMPARE_SPELL_MATCH_PCT) continue;
      scored.push({ a, total: actorMetricTotal(a, metric) });
    }
    scored.sort((x, y) => y.total - x.total);
    const peers = [];
    for (let i = 0; i < scored.length && peers.length < 2; i++) {
      peers.push(scored[i].a);
    }
    return { primary, peers };
  }
  function comparePctLabel(primaryVal, peerVal) {
    if (primaryVal === 0 && peerVal === 0) {
      return { text: "+0%", tone: "flat" };
    }
    if (primaryVal > peerVal) {
      if (!(peerVal > 0)) return { text: "+999%", tone: "up" };
      const up = Math.min(
        999,
        Math.floor((primaryVal - peerVal) / peerVal * 100)
      );
      return { text: `+${up}%`, tone: "up" };
    }
    if (peerVal > primaryVal) {
      if (!(primaryVal > 0)) return { text: "\u2212999%", tone: "down" };
      const down = Math.min(
        999,
        Math.floor((peerVal - primaryVal) / primaryVal * 100)
      );
      return { text: `\u2212${down}%`, tone: "down" };
    }
    return { text: "+0%", tone: "flat" };
  }
  function abilityAmount(actor, abilityId, metric) {
    const ab = actor.abilities[abilityId];
    if (!ab) return 0;
    if (metric === "heal") return ab.heal;
    if (metric === "taken") return ab.taken;
    return ab.damage;
  }
  function actorMetricTotal(actor, metric) {
    if (metric === "heal") return actor.heal;
    if (metric === "taken") return actor.taken;
    return actor.damage;
  }
  function topAbilityIds(actor, metric, n) {
    const keys = Object.keys(actor.abilities);
    const scored = keys.map((k) => ({
      id: k,
      v: abilityAmount(actor, k, metric)
    }));
    scored.sort((a, b) => b.v - a.v);
    const out = [];
    for (let i = 0; i < scored.length && out.length < n; i++) {
      if (scored[i].v > 0) out.push(scored[i].id);
    }
    return out;
  }
  function compareTargetRows(actor, metric) {
    if (metric === "taken") return [];
    const rows = aggregateActorTargets(actor, metric, (tg) => {
      const v = metric === "heal" ? tg.heal : tg.damage;
      return v > 0;
    });
    rows.sort((a, b) => b.value - a.value);
    return rows;
  }
  function CompareTabBody(props) {
    var _a;
    const { primary, peers } = comparePeerActors(
      props.segmentRef,
      props.actorId,
      props.ctype,
      props.metric
    );
    if (!primary) {
      return e(
        "div",
        { className: "ecu-meter-bd-stub", style: { ...PIXEL_TEXT } },
        props.ctype ? `No ${props.ctype} actors in this segment to compare.` : "Compare needs ctype on party members."
      );
    }
    const metric = props.metric;
    const spellIds = topAbilityIds(primary, metric, COMPARE_SPELL_ROWS);
    const primaryTargets = compareTargetRows(primary, metric).slice(
      0,
      COMPARE_TARGET_ROWS
    );
    const primaryTopSpell = spellIds.length ? abilityAmount(primary, spellIds[0], metric) : 1;
    const primaryTopTarget = ((_a = primaryTargets[0]) == null ? void 0 : _a.value) || 1;
    const emptyPeerMsg = "There's no more players to compare (with the same ctype)";
    const columns = [
      { actor: primary, isPrimary: true },
      { actor: peers[0] || null, isPrimary: false },
      { actor: peers[1] || null, isPrimary: false }
    ];
    return e(
      "div",
      {
        className: "ecu-meter-inspector-compare",
        style: { ...PIXEL_TEXT }
      },
      ...columns.map((col, colIdx) => {
        if (!col.actor) {
          return e(
            "div",
            {
              key: `empty-${colIdx}`,
              className: "ecu-meter-inspector-compare-col is-empty"
            },
            e(
              "div",
              { className: "ecu-meter-inspector-compare-empty" },
              emptyPeerMsg
            )
          );
        }
        const actor = col.actor;
        const total = actorMetricTotal(actor, metric);
        const peerTargets = compareTargetRows(actor, metric);
        const peerTargetById = {};
        for (let i = 0; i < peerTargets.length; i++) {
          peerTargetById[peerTargets[i].id] = peerTargets[i];
        }
        const peerSpellRank = {};
        const peerSpellOrder = topAbilityIds(actor, metric, 99);
        for (let i = 0; i < peerSpellOrder.length; i++) {
          peerSpellRank[peerSpellOrder[i]] = i + 1;
        }
        const peerTargetRank = {};
        for (let i = 0; i < peerTargets.length; i++) {
          peerTargetRank[peerTargets[i].id] = i + 1;
        }
        return e(
          "div",
          {
            key: actor.id,
            className: "ecu-meter-inspector-compare-col" + (col.isPrimary ? " is-you" : "")
          },
          e(
            "div",
            { className: "ecu-meter-inspector-compare-h" },
            e(GameIcon, {
              id: actor.id,
              kind: "character",
              ctype: actor.ctype,
              name: actor.name,
              size: 28,
              title: actor.ctype ? `${actor.name} \xB7 ${actor.ctype}` : actor.name
            }),
            e("span", null, actor.name),
            col.isPrimary ? e("span", { className: "ecu-meter-bd-muted" }, " \u2605") : null
          ),
          e(
            "div",
            { className: "ecu-meter-inspector-compare-stat" },
            props.amountLabel,
            e("b", null, formatCompactNumber(total))
          ),
          e(
            "div",
            { className: "ecu-meter-inspector-compare-stat" },
            props.rateLabel,
            e("b", null, formatCompactRate(total / props.sec))
          ),
          e(
            "div",
            { className: "ecu-meter-inspector-compare-spells-h" },
            "Spells"
          ),
          spellIds.length === 0 ? e("div", { className: "ecu-meter-bd-muted" }, "No ability totals") : null,
          ...spellIds.map((abId, idx) => {
            const primaryV = abilityAmount(primary, abId, metric);
            const v = abilityAmount(actor, abId, metric);
            const hasSpell = !!actor.abilities[abId];
            if (!col.isPrimary && !hasSpell) {
              return e("div", {
                key: abId,
                className: "ecu-meter-inspector-compare-spell is-missing"
              });
            }
            const fillPct = col.isPrimary ? Math.min(100, v / Math.max(primaryTopSpell, 1) * 100) : 100;
            const rank = col.isPrimary ? idx + 1 : peerSpellRank[abId] || idx + 1;
            const pct = !col.isPrimary ? comparePctLabel(primaryV, v) : null;
            return e(
              "div",
              {
                key: abId,
                className: "ecu-meter-inspector-compare-spell",
                title: `${skillDisplayName(abId)} \u2014 ${formatCompactNumber(v)}`
              },
              e("div", {
                className: "ecu-meter-inspector-compare-spell-fill",
                style: { width: `${fillPct}%` }
              }),
              e(
                "span",
                { className: "ecu-meter-inspector-compare-spell-n" },
                e(GameIcon, {
                  id: abId,
                  kind: "auto",
                  size: 14,
                  title: skillDisplayName(abId)
                }),
                `${rank}. ${skillDisplayName(abId)}`
              ),
              e(
                "span",
                { className: "ecu-meter-inspector-compare-spell-v" },
                formatCompactNumber(v),
                pct ? e(
                  "span",
                  {
                    className: "ecu-meter-inspector-compare-pct is-" + pct.tone
                  },
                  " ",
                  pct.text
                ) : null
              )
            );
          }),
          e(
            "div",
            { className: "ecu-meter-inspector-compare-spells-h" },
            "Targets"
          ),
          primaryTargets.length === 0 ? e("div", { className: "ecu-meter-bd-muted" }, "No targets") : null,
          ...primaryTargets.map((pt, idx) => {
            const peerT = peerTargetById[pt.id];
            const v = col.isPrimary ? pt.value : peerT ? peerT.value : 0;
            if (!col.isPrimary && !peerT) {
              return e("div", {
                key: pt.id,
                className: "ecu-meter-inspector-compare-spell is-missing"
              });
            }
            const fillPct = col.isPrimary ? Math.min(100, v / Math.max(primaryTopTarget, 1) * 100) : 100;
            const rank = col.isPrimary ? idx + 1 : peerTargetRank[pt.id] || idx + 1;
            const pct = !col.isPrimary ? comparePctLabel(pt.value, v) : null;
            return e(
              "div",
              {
                key: pt.id,
                className: "ecu-meter-inspector-compare-spell is-target",
                title: `${pt.name} \u2014 ${formatCompactNumber(v)}`
              },
              e("div", {
                className: "ecu-meter-inspector-compare-spell-fill",
                style: { width: `${fillPct}%` }
              }),
              e(
                "span",
                { className: "ecu-meter-inspector-compare-spell-n" },
                e(GameIcon, {
                  id: pt.id,
                  kind: "target",
                  size: 14,
                  mtype: pt.mtype,
                  ctype: pt.ctype,
                  name: pt.name,
                  title: pt.name
                }),
                `${rank}. ${pt.name}`
              ),
              e(
                "span",
                { className: "ecu-meter-inspector-compare-spell-v" },
                formatCompactNumber(v),
                pct ? e(
                  "span",
                  {
                    className: "ecu-meter-inspector-compare-pct is-" + pct.tone
                  },
                  " ",
                  pct.text
                ) : null
              )
            );
          })
        );
      })
    );
  }

  // src/ui/meter/views/MeterDetailsView.ts
  function fmtUptimeTimer(ms) {
    const sec = Math.max(0, ms / 1e3);
    if (sec < 60) return `${sec.toFixed(1)}s`;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }
  function SpellBlock(props) {
    const fill = props.fillPct != null ? Math.max(0, Math.min(100, props.fillPct)) : void 0;
    return e(
      "div",
      {
        className: "ecu-meter-bd-block" + (props.className ? ` ${props.className}` : "")
      },
      fill != null ? e("div", {
        className: "ecu-meter-bd-block-fill",
        style: { width: `${fill}%` }
      }) : null,
      e("div", { className: "ecu-meter-bd-block-body" }, props.children)
    );
  }
  function SpellBlockLine(props) {
    return e(
      "div",
      { className: "ecu-meter-bd-block-line" },
      e("span", { className: "ecu-meter-bd-block-left" }, props.left),
      props.right != null ? e(
        "span",
        {
          className: "ecu-meter-bd-block-right" + (props.mutedRight ? " ecu-meter-bd-muted" : "")
        },
        props.right
      ) : null
    );
  }
  function formatAlDamageType(type) {
    if (!type) return "";
    const t = type.toLowerCase();
    if (t === "physical") return "Physical";
    if (t === "magical") return "Magical";
    if (t === "pure") return "Pure";
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
  function hitAmountBlockLines(stats, sec, rateLabel) {
    if (!(stats.count > 0)) {
      return [
        e(
          "div",
          { className: "ecu-meter-bd-block-note" },
          "Min / Max / avg need a new fight (reload after this update)"
        )
      ];
    }
    const avg = stats.total / stats.count;
    const rate = stats.total / Math.max(sec, 1);
    return [
      e(SpellBlockLine, {
        left: e(
          "span",
          null,
          "Min: ",
          e("b", null, formatCompactNumber(stats.min))
        ),
        right: e(
          "span",
          null,
          "Max: ",
          e("b", null, formatCompactNumber(stats.max))
        )
      }),
      e(SpellBlockLine, {
        left: e(
          "span",
          null,
          "Average: ",
          e("b", null, formatCompactNumber(avg))
        ),
        right: e(
          "span",
          null,
          `${rateLabel}: `,
          e("b", null, formatCompactRate(rate))
        )
      })
    ];
  }
  function MeterDetailsView(props) {
    var _a;
    const React = getReact();
    const [tab, setTab] = React.useState("spells");
    React.useEffect(() => {
      injectMeterChromeCss();
    }, []);
    const r = props.result.kind === "details" ? props.result : null;
    const abilityKey = r && (props.selectedAbility || r.ability || ((_a = r.abilityRows[0]) == null ? void 0 : _a.id) || null);
    React.useEffect(() => {
      var _a2;
      if (!r) return;
      if (props.selectedAbility) return;
      const first = r.ability || ((_a2 = r.abilityRows[0]) == null ? void 0 : _a2.id);
      if (first && props.onSelectAbility) props.onSelectAbility(first);
    }, [r && r.actorId, r && r.ability, props.selectedAbility]);
    if (!r) {
      return e(
        "div",
        { style: { padding: "8px", color: "#888", ...PIXEL_TEXT } },
        "Pick a player (or open Inspector after combat)"
      );
    }
    const metric = r.metric === "heal" || r.metric === "taken" ? r.metric : "damage";
    const sec = Math.max(r.durationMs / 1e3, 1);
    const amountLabel = metric === "heal" ? "Heal" : metric === "taken" ? "Taken" : "Damage";
    const rateLabel = metric === "heal" ? "HPS" : "DPS";
    const tabs = [
      { id: "spells", label: "Spells" },
      { id: "auras", label: "Auras" },
      { id: "compare", label: "Compare" }
    ];
    const onSpellClick = (row2) => {
      setTab("spells");
      if (props.onSelectAbility) props.onSelectAbility(row2.id);
    };
    const hits = r.outcomes.hits;
    const crits = r.outcomes.crits;
    const normals = Math.max(0, hits - crits);
    const avg = hits > 0 ? r.abilityTotal / hits : 0;
    const rate = r.abilityTotal / sec;
    const castText = r.abilityCasts > 0 ? String(r.abilityCasts) : hits > 0 ? String(hits) : "\u2014";
    const normalCount = r.hitNormal.count > 0 ? r.hitNormal.count : normals;
    const critCount = r.hitCrit.count > 0 ? r.hitCrit.count : crits;
    const hitDenom = Math.max(hits, normalCount + critCount, 1);
    const normalPct = normalCount / hitDenom * 100;
    const critPct = critCount / hitDenom * 100;
    const defenseHits = r.outcomes.miss + r.outcomes.evade + r.outcomes.avoid;
    const defensePct = hits + defenseHits > 0 ? defenseHits / (hits + defenseHits) * 100 : 0;
    const typeLabel = formatAlDamageType(r.damageType);
    const spellBlocks = abilityKey ? e(
      "div",
      { className: "ecu-meter-bd-blocks", style: { ...PIXEL_TEXT } },
      e(
        SpellBlock,
        { className: "is-summary", fillPct: 100 },
        e(
          "div",
          { className: "ecu-meter-bd-block-title" },
          skillDisplayName(abilityKey)
        ),
        e(SpellBlockLine, {
          left: e("span", null, "Casts: ", e("b", null, castText)),
          right: e("span", null, "Hits: ", e("b", null, String(hits)))
        }),
        e(SpellBlockLine, {
          left: e(
            "span",
            null,
            `${amountLabel}: `,
            e("b", null, formatCompactNumber(r.abilityTotal))
          ),
          right: typeLabel || "\u2014",
          mutedRight: true
        }),
        e(SpellBlockLine, {
          left: e(
            "span",
            null,
            "Average: ",
            e("b", null, formatCompactNumber(avg))
          ),
          right: e(
            "span",
            null,
            `${rateLabel}: `,
            e("b", null, formatCompactRate(rate))
          )
        }),
        r.abilitySplash > 0 ? e(SpellBlockLine, {
          left: e(
            "span",
            null,
            "Explosion splash: ",
            e("b", null, formatCompactNumber(r.abilitySplash))
          )
        }) : null
      ),
      normalCount > 0 ? e(
        SpellBlock,
        { fillPct: normalPct },
        e(SpellBlockLine, {
          left: e(
            "span",
            { className: "ecu-meter-bd-block-h" },
            "Normal Hits"
          ),
          right: e(
            "span",
            null,
            e("b", null, String(normalCount)),
            e(
              "span",
              { className: "ecu-meter-bd-muted" },
              ` [${normalPct.toFixed(1)}%]`
            )
          )
        }),
        ...hitAmountBlockLines(r.hitNormal, sec, rateLabel)
      ) : null,
      critCount > 0 ? e(
        SpellBlock,
        { className: "is-crit", fillPct: critPct },
        e(SpellBlockLine, {
          left: e(
            "span",
            { className: "ecu-meter-bd-block-h" },
            "Critical Hits"
          ),
          right: e(
            "span",
            null,
            e("b", null, String(critCount)),
            e(
              "span",
              { className: "ecu-meter-bd-muted" },
              ` [${critPct.toFixed(1)}%]`
            )
          )
        }),
        ...hitAmountBlockLines(r.hitCrit, sec, rateLabel)
      ) : null,
      defenseHits > 0 ? e(
        SpellBlock,
        { fillPct: defensePct },
        e(SpellBlockLine, {
          left: e(
            "span",
            { className: "ecu-meter-bd-block-h" },
            "Defenses"
          ),
          right: e(
            "span",
            null,
            e("b", null, String(defenseHits)),
            e(
              "span",
              { className: "ecu-meter-bd-muted" },
              ` [${defensePct.toFixed(1)}%]`
            )
          )
        }),
        e(SpellBlockLine, {
          left: r.outcomes.miss > 0 ? `Miss: ${r.outcomes.miss}` : "\xA0",
          right: r.outcomes.evade > 0 ? `Evade: ${r.outcomes.evade}` : r.outcomes.avoid > 0 ? `Avoid: ${r.outcomes.avoid}` : "\xA0"
        }),
        r.outcomes.evade > 0 && r.outcomes.avoid > 0 ? e(SpellBlockLine, {
          left: `Avoid: ${r.outcomes.avoid}`
        }) : null
      ) : null
    ) : e(
      "div",
      {
        className: "ecu-meter-bd-blocks ecu-meter-bd-blocks-empty",
        style: { ...PIXEL_TEXT }
      },
      e(
        "div",
        { className: "ecu-meter-bd-stub" },
        "Select a spell on the left"
      )
    );
    const barsLive = props.segmentRef === "current";
    const spellsBody = e(
      "div",
      { className: "ecu-meter-bd-spells" },
      e(
        "div",
        { className: "ecu-meter-bd-left" },
        e(
          "div",
          { className: "ecu-meter-bd-abilities" },
          e(MeterBarsView, {
            query: {
              kind: "abilities",
              actorId: r.actorId,
              metric
            },
            segmentRef: props.segmentRef,
            partyFocus: props.partyFocus,
            live: barsLive,
            selectedRowId: abilityKey || void 0,
            onRowClick: onSpellClick
          })
        ),
        e(
          "div",
          { className: "ecu-meter-bd-targets" },
          e(
            "div",
            { className: "ecu-meter-bd-targets-h", style: { ...PIXEL_TEXT } },
            "TARGETS:"
          ),
          abilityKey ? e(MeterBarsView, {
            query: {
              kind: "ability_targets",
              actorId: r.actorId,
              ability: abilityKey,
              metric
            },
            segmentRef: props.segmentRef,
            partyFocus: props.partyFocus,
            live: barsLive
          }) : e(
            "div",
            { className: "ecu-meter-bd-stub", style: { ...PIXEL_TEXT } },
            "Select a spell to see its targets"
          )
        )
      ),
      spellBlocks
    );
    const aurasBody = (() => {
      const rows = r.uptimeRows || [];
      const buffs = [];
      const debuffs = [];
      for (let i = 0; i < rows.length; i++) {
        const row2 = rows[i];
        const named = {
          ...row2,
          name: conditionDisplayName(row2.id) || row2.name
        };
        if (conditionKind(row2.id) === "debuff") debuffs.push(named);
        else buffs.push(named);
      }
      return e(
        "div",
        { className: "ecu-meter-bd-auras is-full" },
        e(
          "div",
          { className: "ecu-meter-bd-auras-main", style: { ...PIXEL_TEXT } },
          e(
            "div",
            { className: "ecu-meter-bd-auras-col" },
            e("div", { className: "ecu-meter-bd-auras-col-h" }, "Buffs"),
            buffs.length ? e(UptimeTable, { rows: buffs }) : e(
              "div",
              { className: "ecu-meter-bd-stub" },
              "No buff samples yet (need entity.s while in combat)."
            )
          ),
          e(
            "div",
            { className: "ecu-meter-bd-auras-col" },
            e("div", { className: "ecu-meter-bd-auras-col-h" }, "Debuffs"),
            debuffs.length ? e(UptimeTable, { rows: debuffs }) : e(
              "div",
              { className: "ecu-meter-bd-stub" },
              "No debuff samples yet (need entity.s while in combat)."
            )
          )
        )
      );
    })();
    let body = null;
    if (tab === "spells") {
      body = spellsBody;
    } else if (tab === "auras") {
      body = aurasBody;
    } else {
      body = e(CompareTabBody, {
        segmentRef: props.segmentRef,
        actorId: r.actorId,
        ctype: r.ctype,
        metric,
        amountLabel,
        rateLabel,
        sec
      });
    }
    const attrTitle = detailsWindowTitle(r.actorName, r.metric, r.primary);
    const ctype = r.ctype || "";
    const rateTotal = metric === "heal" ? r.totals.heal : metric === "taken" ? r.totals.taken : r.totals.damage;
    return e(
      "div",
      { className: "ecu-meter-inspector-layout" },
      props.onSelectActor ? e(MeterBreakdownSideRail, {
        segmentRef: props.segmentRef,
        partyFocus: props.partyFocus,
        selectedActorId: r.actorId,
        metric,
        onSelectActor: props.onSelectActor,
        onSelectSegment: props.onSelectSegment
      }) : null,
      e(
        "div",
        { className: "ecu-meter-inspector" },
        e(
          "div",
          { className: "ecu-meter-inspector-top", style: { ...PIXEL_TEXT } },
          e(
            "div",
            { className: "ecu-meter-inspector-attr" },
            e(GameIcon, {
              id: r.actorId,
              kind: "character",
              ctype: ctype || void 0,
              name: r.actorName,
              size: 40,
              title: ctype ? `${r.actorName} \xB7 ${ctype}` : r.actorName,
              className: "ecu-meter-inspector-portrait"
            }),
            e(
              "span",
              { className: "ecu-meter-inspector-attr-text" },
              attrTitle,
              ctype ? e(
                "span",
                {
                  className: "ecu-meter-inspector-ctype",
                  style: { color: classColors[ctype] || "#b0bec5" }
                },
                ` \xB7 ${ctype}`
              ) : null
            ),
            e(
              "span",
              { className: "ecu-meter-inspector-sub" },
              `${formatCompactRate(rateTotal / sec)} \xB7 ${sec.toFixed(0)}s`
            )
          ),
          e(
            "div",
            { className: "ecu-meter-player-tabs ecu-meter-inspector-tabs" },
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
        ),
        e("div", { className: "ecu-meter-inspector-body" }, body)
      )
    );
  }
  function UptimeTable(props) {
    if (!props.rows.length) {
      return e(
        "div",
        { className: "ecu-meter-bd-stub", style: { ...PIXEL_TEXT } },
        "No buff / condition samples yet (need entity.s while in combat)"
      );
    }
    return e(
      "div",
      { className: "ecu-meter-bd-auras-table", style: { ...PIXEL_TEXT } },
      e(
        "div",
        { className: "ecu-meter-bd-auras-head" },
        e("span", null, "Name"),
        e("span", null, "Uptime"),
        e("span", null, "%"),
        e("span", { title: "Applications" }, "A"),
        e("span", { title: "Refreshes (AL: not tracked)" }, "R")
      ),
      ...props.rows.map(
        (row2, i) => e(
          "div",
          {
            key: row2.id,
            className: "ecu-meter-uptime-row" + (i % 2 === 0 ? " is-alt" : ""),
            title: `${row2.name}: ${fmtUptimeTimer(row2.activeMs)} active`
          },
          e(
            "span",
            { className: "ecu-meter-uptime-name" },
            e(GameIcon, {
              id: row2.id,
              kind: "condition",
              size: 16,
              title: row2.name,
              className: "ecu-meter-uptime-ico"
            }),
            e("span", { className: "ecu-meter-uptime-label" }, row2.name)
          ),
          e(
            "span",
            { className: "ecu-meter-uptime-time" },
            fmtUptimeTimer(row2.activeMs)
          ),
          e(
            "span",
            { className: "ecu-meter-uptime-pct" },
            `${(row2.uptime * 100).toFixed(0)}%`
          ),
          e("span", { className: "ecu-meter-uptime-apps" }, String(row2.apps)),
          e("span", { className: "ecu-meter-uptime-ref" }, "\u2014")
        )
      )
    );
  }

  // src/ui/meter/views/MeterEncounterView.ts
  var pad2 = {
    padding: "8px",
    color: "#888",
    fontSize: TYPE.body,
    ...PIXEL_TEXT
  };
  function MeterEncounterView(props) {
    const React = getReact();
    React.useEffect(() => {
      injectMeterChromeCss();
    }, []);
    if (props.result.kind !== "encounter") {
      return e("div", { style: pad2 }, "No encounter");
    }
    const r = props.result;
    const sec = Math.max(r.durationMs / 1e3, 1);
    const seg = resolveSegment(props.segmentRef);
    const fightLabel = (seg == null ? void 0 : seg.label) || "Current fight";
    const openPlayer = props.onOpenPlayer ? (row2) => {
      if (row2.kind === "player" || !row2.kind) {
        props.onOpenPlayer(row2.id, row2.name);
      }
    } : void 0;
    const panes = [
      {
        key: "taken",
        title: "Damage Taken per Player",
        tone: "tone-taken",
        query: { kind: "players", metric: "taken", primary: "total" }
      },
      {
        key: "spell",
        title: "Damage Taken by Spell",
        tone: "tone-spell",
        query: { kind: "taken_by_spell" }
      },
      {
        key: "adds",
        title: "Adds",
        tone: "tone-dmg",
        query: { kind: "enemy_damage" }
      },
      {
        key: "dispels",
        title: "Dispels",
        tone: "tone-heal",
        query: { kind: "misc", metric: "dispels" }
      },
      {
        key: "interrupts",
        title: "Interrupts",
        tone: "tone-av",
        query: { kind: "misc", metric: "interrupts" }
      },
      {
        key: "deaths",
        title: "Death Log",
        tone: "tone-death",
        deathLog: true
      }
    ];
    const deathResult = runMeterQuery(
      { kind: "death_log" },
      {
        segmentRef: props.segmentRef,
        partyFocus: props.partyFocus
      }
    );
    return e(
      "div",
      { className: "ecu-meter-encounter", style: { ...PIXEL_TEXT } },
      e(
        "div",
        { className: "ecu-meter-enc-head" },
        e(
          "div",
          { className: "ecu-meter-enc-title" },
          e("b", null, "Encounter Details"),
          " \xB7 ",
          fightLabel
        ),
        e(
          "div",
          { className: "ecu-meter-enc-stats" },
          e("span", null, e("b", null, `${sec.toFixed(0)}s`)),
          e(
            "span",
            { className: r.deaths > 0 ? "is-bad" : void 0 },
            e("b", null, String(r.deaths)),
            " deaths"
          ),
          e(
            "span",
            null,
            "Dmg ",
            e("b", null, formatCompactNumber(r.totalDamage))
          ),
          e(
            "span",
            null,
            "DPS ",
            e("b", null, `${formatCompactNumber(r.totalDamage / sec)}/s`)
          ),
          e(
            "span",
            null,
            "Heal ",
            e("b", null, formatCompactNumber(r.totalHeal))
          ),
          r.topDps ? e("span", null, "Top ", e("b", null, r.topDps.name)) : null
        )
      ),
      e(
        "div",
        { className: "ecu-meter-enc-grid" },
        ...panes.map(
          (pane) => e(
            "div",
            {
              key: pane.key,
              className: `ecu-meter-enc-widget ${pane.tone}`
            },
            e("div", { className: "ecu-meter-enc-widget-hd" }, pane.title),
            e(
              "div",
              { className: "ecu-meter-enc-widget-body" },
              pane.deathLog ? deathResult.kind === "death_log" && deathResult.deaths.length ? e(
                "div",
                { className: "ecu-meter-enc-deathlist" },
                ...deathResult.deaths.map(
                  (d, i) => e(
                    "div",
                    {
                      key: `${d.id}-${d.at}`,
                      className: "ecu-meter-enc-deathrow"
                    },
                    e(
                      "span",
                      { className: "ecu-meter-enc-deathname" },
                      d.name
                    ),
                    e(
                      "span",
                      { className: "ecu-meter-enc-deathtime" },
                      new Date(d.at).toLocaleTimeString()
                    ),
                    e(
                      "span",
                      { className: "ecu-meter-enc-deathnum" },
                      `#${i + 1}`
                    )
                  )
                )
              ) : e("div", { className: "ecu-meter-enc-empty" }, "No deaths") : e(MeterBarsView, {
                query: pane.query,
                segmentRef: props.segmentRef,
                partyFocus: props.partyFocus,
                live: false,
                onRowContextMenu: openPlayer,
                onRowClick: openPlayer
              })
            )
          )
        )
      )
    );
  }

  // src/ui/meter/views/timeline/timelineModel.ts
  var TL_DEATH_W = 4;
  var TL_ICON = 28;
  var TL_ICON_SUB = 20;
  var TL_ROW = 36;
  var TL_SUB_ROW = 26;
  var TL_PPS_BASE = 88;
  var TL_PPS_MIN = 16;
  var TL_PPS_MAX = 176;
  var TL_ZOOM_STEP = 1.12;
  var TL_BAR_MIN_PX = 4;
  var TL_CAST_BAR_GAP_PX = 4;
  var TL_TICK_MIN_PX = 72;
  var TL_FOLLOW_SLACK = 28;
  var TL_VIEW_BUF_PX = 480;
  var TL_VIEW_SNAP_PX = 64;
  var TL_VIEW_OPEN = { left: -1e9, right: 1e9 };
  var TL_VIEW_ESTIMATE_W = 960;
  var TL_COALESCE_SEC = 0.3;
  var TL_VISUAL_DUR_MIN = 5;
  var TL_VISUAL_DUR_MAX = 20;
  var TL_ICON_Z = 1e4;
  var TL_CAST_EFFECT_SEC = 8;
  var TL_CAT_ORDER = ["cast", "buff", "debuff", "gear"];
  function blockCat(b) {
    if (b.kind === "death") return "death";
    if (b.kind === "cast") return "cast";
    if (b.kind === "gear") return "gear";
    if (b.condKind === "debuff") return "debuff";
    return "buff";
  }
  function laneCatsFromBlocks(blocks) {
    const seen = {
      cast: false,
      buff: false,
      debuff: false,
      gear: false
    };
    for (let i = 0; i < blocks.length; i++) {
      const cat = blockCat(blocks[i]);
      if (cat !== "death") seen[cat] = true;
    }
    const out = [];
    for (let i = 0; i < TL_CAT_ORDER.length; i++) {
      if (seen[TL_CAT_ORDER[i]]) out.push(TL_CAT_ORDER[i]);
    }
    return out;
  }
  function laneRowPx(cats) {
    if (cats.length >= 2) return cats.length * TL_SUB_ROW;
    return TL_ROW;
  }
  function skillKey(b) {
    if (b.kind === "gear") return b.domKey;
    return `${b.kind}:${b.key}`;
  }
  function conditionElapsedSec(b) {
    if (b.kind !== "condition") return b.durationSec;
    if (b.isOpen && b.startedAtMs) {
      return Math.max(0, (Date.now() - b.startedAtMs) / 1e3);
    }
    return b.durationSec;
  }
  function visualDurationSec(b) {
    if (b.kind === "death" || b.kind === "gear") return 0;
    const raw = b.kind === "cast" ? b.durationSec || TL_CAST_EFFECT_SEC : b.isOpen ? TL_CAST_EFFECT_SEC : Math.max(0, b.durationSec);
    return Math.max(
      TL_VISUAL_DUR_MIN,
      Math.min(TL_VISUAL_DUR_MAX, raw || TL_VISUAL_DUR_MIN)
    );
  }

  // src/ui/meter/views/timeline/timelineFormat.ts
  function fmtClock(sec) {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }
  function fmtAt(sec) {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}m ${r}s`;
  }
  function fmtWall(ms) {
    const d = new Date(ms);
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    const s = String(d.getSeconds()).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }
  function wallAtElapsed(originMs, atSec) {
    if (!(originMs > 0)) return "";
    return fmtWall(originMs + Math.max(0, atSec) * 1e3);
  }
  function tipAtLabel(originMs, atSec) {
    const wall = wallAtElapsed(originMs, atSec);
    return wall ? `${fmtAt(atSec)} \xB7 ${wall}` : fmtAt(atSec);
  }
  function prettySlot(slot) {
    const spaced = slot.replace(/([0-9]+)$/, " $1");
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }
  function gearItemLabel(name, level) {
    if (!name) return "(empty)";
    const pretty = itemDisplayName(name);
    if (level != null && level > 0) return `${pretty} +${level}`;
    return pretty;
  }
  function gearItemIconHtml(name, skin, size, title) {
    const resolved = skin || (name ? itemSkin(name) : void 0);
    if (resolved) {
      const sheet = skinSheetHtml(resolved, size, title);
      if (sheet) return sheet;
    }
    if (name) return gameIconHtml(name, { kind: "item", size, title });
    return `<span class="ecu-meter-tt-gear-empty" style="width:${size}px;height:${size}px" title="empty"></span>`;
  }
  function prettyKey(key) {
    if (!key) return "?";
    const cond = conditionDisplayName(key);
    if (cond !== key) return cond;
    const skill = skillDisplayName(key);
    if (skill !== key) return skill;
    return key.replace(/_/g, " ");
  }
  function blockIconHtml(b, size) {
    if (b.kind === "death") {
      return gameIconHtml("death", { kind: "death", size });
    }
    if (b.kind === "condition") {
      return gameIconHtml(b.key, {
        kind: "condition",
        size,
        title: b.label
      });
    }
    if (b.kind === "gear") {
      return gearItemIconHtml(
        b.newName || b.oldName || b.key,
        b.skin,
        size,
        b.label
      );
    }
    return gameIconHtml(b.key, { kind: "auto", size, title: b.label });
  }
  function blockCategoryLabel(b) {
    if (b.kind === "death") return "Death";
    if (b.kind === "cast") return "Cooldown";
    if (b.kind === "gear") return "Gear";
    if (b.condKind === "debuff") return "Debuff";
    return "Buff";
  }

  // src/ui/meter/views/timeline/timelineTips.ts
  var NEARBY_WINDOW_SEC = 8;
  var NEARBY_CLUSTER_SEC = 2;
  var GEAR_TT_ICON = 26;
  function collectClusterBlocks(primary, nearby) {
    const all = [primary];
    for (let i = 0; i < nearby.length; i++) all.push(nearby[i]);
    return all;
  }
  function clusterSameSecond(blocks) {
    if (!blocks.length) return true;
    const sec = Math.floor(blocks[0].atSec);
    for (let i = 0; i < blocks.length; i++) {
      if (Math.floor(blocks[i].atSec) !== sec) return false;
    }
    return true;
  }
  function clusterWhenLabel(blocks, originMs) {
    if (!blocks.length) return "";
    let min = blocks[0].atSec;
    let max = blocks[0].atSec;
    for (let i = 1; i < blocks.length; i++) {
      const t = blocks[i].atSec;
      if (t < min) min = t;
      if (t > max) max = t;
    }
    if (clusterSameSecond(blocks)) return tipAtLabel(originMs, min);
    const wall = wallAtElapsed(originMs, min);
    const span = `${fmtAt(min)} \u2013 ${fmtAt(max)}`;
    return wall ? `${span} \xB7 ${wall}` : span;
  }
  function tipClusterMetaHtml(who, whenLabel) {
    const when = whenLabel ? `<span class="ecu-meter-tt-cluster-when">${escapeHtml(whenLabel)}</span>` : "";
    return `<div class="ecu-meter-tt-cluster-meta">
    <span class="ecu-meter-tt-cluster-who">${escapeHtml(who)}</span>
    ${when}
  </div>`;
  }
  function tipGearRowHtml(b, muted, showAt, originMs) {
    const tone = muted ? " is-muted" : "";
    const slot = b.slot ? prettySlot(b.slot) : "Slot";
    const hasOld = !!b.oldName;
    const hasNew = !!b.newName;
    const oldTitle = hasOld ? gearItemLabel(b.oldName, b.oldLevel) : "(empty)";
    const newTitle = hasNew ? gearItemLabel(b.newName, b.newLevel) : "(empty)";
    const oldIcon = gearItemIconHtml(
      b.oldName,
      b.oldSkin || (!hasNew ? b.skin : void 0),
      GEAR_TT_ICON,
      oldTitle
    );
    const newIcon = gearItemIconHtml(b.newName, b.skin, GEAR_TT_ICON, newTitle);
    let icos;
    let names;
    if (hasOld && hasNew) {
      icos = `<span class="ecu-meter-tt-gear-icos">${oldIcon}<span class="ecu-meter-tt-gear-arrow" aria-hidden="true">\u2192</span>${newIcon}</span>`;
      names = `<span class="ecu-meter-tt-gear-names"><span class="is-old">${escapeHtml(oldTitle)}</span><span class="ecu-meter-tt-gear-arrow-sm" aria-hidden="true">\u2192</span><span class="is-new">${escapeHtml(newTitle)}</span></span>`;
    } else if (hasNew) {
      icos = `<span class="ecu-meter-tt-gear-icos is-single">${newIcon}</span>`;
      names = `<span class="ecu-meter-tt-gear-names"><span class="ecu-meter-tt-gear-verb">Equip</span> ${escapeHtml(newTitle)}</span>`;
    } else if (hasOld) {
      icos = `<span class="ecu-meter-tt-gear-icos is-single">${oldIcon}</span>`;
      names = `<span class="ecu-meter-tt-gear-names"><span class="ecu-meter-tt-gear-verb">Unequip</span> ${escapeHtml(oldTitle)}</span>`;
    } else {
      icos = `<span class="ecu-meter-tt-gear-icos is-single"></span>`;
      names = `<span class="ecu-meter-tt-gear-names">${escapeHtml(b.label || "Gear change")}</span>`;
    }
    let atBit = "";
    if (showAt) {
      atBit = `<span class="ecu-meter-tt-gear-row-at">${escapeHtml(tipAtLabel(originMs, b.atSec))}</span>`;
    }
    return `<div class="ecu-meter-tt-gear-row${tone}">
    <span class="ecu-meter-tt-gear-slot">${escapeHtml(slot)}</span>
    ${icos}
    ${names}
    ${atBit}
  </div>`;
  }
  function tipGearClusterHtml(primary, nearby, actorName, originMs) {
    const all = collectClusterBlocks(primary, nearby);
    all.sort((a, b) => {
      if (a.atSec !== b.atSec) return a.atSec - b.atSec;
      const sa = a.slot || "";
      const sb = b.slot || "";
      if (sa < sb) return -1;
      if (sa > sb) return 1;
      return 0;
    });
    const sameSecond = clusterSameSecond(all);
    const who = primary.source || actorName || "Unknown";
    const whenLabel = clusterWhenLabel(all, originMs);
    let rows = "";
    for (let i = 0; i < all.length; i++) {
      const b = all[i];
      rows += tipGearRowHtml(
        b,
        b.domKey !== primary.domKey,
        !sameSecond,
        originMs
      );
    }
    return `<div class="ecu-meter-tt-gear">
    <div class="ecu-meter-tt-tl-cat is-gear">Gear</div>
    ${tipClusterMetaHtml(who, whenLabel)}
    <div class="ecu-meter-tt-gear-list">${rows}</div>
  </div>`;
  }
  function eventPillHtml(b) {
    const cat = blockCat(b);
    let cls;
    let letter;
    switch (cat) {
      case "cast":
        cls = "is-cd";
        letter = "CD";
        break;
      case "buff":
        cls = "is-buff";
        letter = "Bf";
        break;
      case "debuff":
        cls = "is-debuff";
        letter = "Db";
        break;
      case "death":
        cls = "is-death";
        letter = "Dt";
        break;
      case "gear":
        cls = "is-gear";
        letter = "Gr";
        break;
      default: {
        const _exhaustive = cat;
        return _exhaustive;
      }
    }
    return `<span class="ecu-meter-tt-ev-pill ${cls}" title="${escapeHtml(blockCategoryLabel(b))}">${letter}</span>`;
  }
  function tipEventRowHtml(b, muted, showAt, originMs) {
    const tone = muted ? " is-muted" : " is-primary";
    const icon = blockIconHtml(b, METER_TT_ICON);
    const elapsedSec = conditionElapsedSec(b);
    const elapsed = b.kind === "condition" && elapsedSec > 0 ? `<span class="ecu-meter-tt-ev-elapsed">${elapsedSec.toFixed(1)}s</span>` : "";
    const at = showAt ? `<span class="ecu-meter-tt-ev-at">${escapeHtml(tipAtLabel(originMs, b.atSec))}</span>` : "";
    return `<div class="ecu-meter-tt-ev-row${tone}">
    ${eventPillHtml(b)}
    ${icon}
    <span class="ecu-meter-tt-ev-main"><span class="ecu-meter-tt-ev-name">${escapeHtml(b.label)}</span>${elapsed}</span>
    ${at}
  </div>`;
  }
  function tipEventClusterHtml(primary, nearby, actorName, originMs) {
    const all = collectClusterBlocks(primary, nearby);
    all.sort((a, b) => {
      if (a.atSec !== b.atSec) return a.atSec - b.atSec;
      if (a.label < b.label) return -1;
      if (a.label > b.label) return 1;
      return 0;
    });
    const sameSecond = clusterSameSecond(all);
    const who = primary.source || actorName || "Unknown";
    const whenLabel = clusterWhenLabel(all, originMs);
    let rows = "";
    for (let i = 0; i < all.length; i++) {
      const b = all[i];
      rows += tipEventRowHtml(
        b,
        b.domKey !== primary.domKey,
        !sameSecond,
        originMs
      );
    }
    return `<div class="ecu-meter-tt-evs">
    ${tipClusterMetaHtml(who, whenLabel)}
    <div class="ecu-meter-tt-evs-list">${rows}</div>
  </div>`;
  }
  function blockCanvasBox(b, pps, iconPx, pad3) {
    const x = pad3 + Math.round(Math.max(0, b.atSec * pps));
    if (b.kind === "death") return { x: x - TL_DEATH_W / 2, w: TL_DEATH_W };
    return { x, w: iconPx };
  }
  function blockIconInView(b, view) {
    const box = blockCanvasBox(b, view.pps, view.iconPx, view.pad);
    return box.x + box.w > view.viewLeft && box.x < view.viewRight;
  }
  function nearbyWindowSec(pps, iconPx) {
    const iconSec = iconPx / Math.max(1, pps);
    return Math.min(NEARBY_WINDOW_SEC, Math.max(NEARBY_CLUSTER_SEC, iconSec));
  }
  function timelineScrollView(from) {
    const el = from instanceof Element ? from : null;
    const scroll = el && el.closest(".ecu-meter-tl-scroll");
    if (!(scroll instanceof HTMLElement)) return null;
    const root = scroll.closest(".ecu-meter-timeline");
    let pad3 = 0;
    if (root instanceof HTMLElement) {
      pad3 = parseFloat(root.style.getPropertyValue("--tl-pad")) || 0;
    }
    return {
      viewLeft: scroll.scrollLeft,
      viewRight: scroll.scrollLeft + scroll.clientWidth,
      pad: pad3
    };
  }
  function nearbyBlocks(primary, laneBlocks, view) {
    const primaryKey = skillKey(primary);
    const windowSec = nearbyWindowSec(view.pps, view.iconPx);
    const bestByKey = {};
    for (let i = 0; i < laneBlocks.length; i++) {
      const o = laneBlocks[i];
      if (o.domKey === primary.domKey) continue;
      if (Math.abs(o.atSec - primary.atSec) > windowSec) continue;
      if (!blockIconInView(o, view)) continue;
      if (primary.kind === "gear") {
        if (o.kind !== "gear") continue;
      } else if (o.kind === "gear") {
        continue;
      }
      const k = skillKey(o);
      if (k === primaryKey) continue;
      const prev = bestByKey[k];
      if (!prev || Math.abs(o.atSec - primary.atSec) < Math.abs(prev.atSec - primary.atSec)) {
        bestByKey[k] = o;
      }
    }
    const nearby = [];
    const keys = Object.keys(bestByKey);
    for (let i = 0; i < keys.length; i++) nearby.push(bestByKey[keys[i]]);
    nearby.sort((a, b) => a.atSec - b.atSec);
    return nearby;
  }
  function blockTooltipHtml(b, actorName, laneBlocks, originMs, view) {
    const nearby = nearbyBlocks(b, laneBlocks, view);
    if (b.kind === "gear") {
      return tipGearClusterHtml(b, nearby, actorName, originMs);
    }
    return tipEventClusterHtml(b, nearby, actorName, originMs);
  }
  function IconHost(props) {
    const React = getReact();
    const ref = React.useRef(null);
    const htmlRef = React.useRef("");
    React.useLayoutEffect(() => {
      const el = ref.current;
      if (!el || htmlRef.current === props.html) return;
      htmlRef.current = props.html;
      el.innerHTML = props.html;
    }, [props.html]);
    return e("span", {
      ref,
      className: props.className || void 0,
      style: props.style,
      onMouseEnter: props.onMouseEnter,
      onMouseMove: props.onMouseMove,
      onMouseLeave: props.onMouseLeave
    });
  }
  var tlHoverDomKey = "";
  function isTlHoverTarget(el) {
    if (!(el instanceof Element)) return false;
    return !!(el.closest(".ecu-meter-tl-block") || el.closest(".ecu-meter-tl-death"));
  }
  function showBlockTip(domKey, ev, html) {
    tlHoverDomKey = domKey;
    showMeterTooltip(ev, html);
  }
  function hideBlockTip() {
    tlHoverDomKey = "";
    hideMeterTooltip();
  }

  // src/ui/meter/views/timeline/timelineLanes.ts
  function buildActorMaps(segmentRef) {
    const names = {};
    const ctypes = {};
    const meta = getPlayerMeta();
    const metaIds = Object.keys(meta);
    for (let i = 0; i < metaIds.length; i++) {
      const id = metaIds[i];
      names[id] = meta[id].name;
      ctypes[id] = meta[id].ctype;
    }
    const seg = resolveSegment(segmentRef);
    if (seg) {
      const actorIds = Object.keys(seg.actors);
      for (let i = 0; i < actorIds.length; i++) {
        const a = seg.actors[actorIds[i]];
        names[a.id] = a.name || names[a.id] || a.id;
        ctypes[a.id] = a.ctype || ctypes[a.id] || resolvePlayerCtype(a.id) || void 0;
        if (!a.ctype && ctypes[a.id]) a.ctype = ctypes[a.id];
      }
    }
    return { names, ctypes };
  }
  function fillCastNextSame(blocks) {
    const nextAt = {};
    for (let i = blocks.length - 1; i >= 0; i--) {
      const b = blocks[i];
      if (b.kind !== "cast") continue;
      const k = skillKey(b);
      if (nextAt[k] != null) b.nextSameAtSec = nextAt[k];
      nextAt[k] = b.atSec;
    }
  }
  function eventsInScope(items, idOf, seg, partyFocus) {
    if (!seg) return items;
    const out = [];
    for (let i = 0; i < items.length; i++) {
      if (actorIdInScope(idOf(items[i]), seg, partyFocus)) out.push(items[i]);
    }
    return out;
  }
  function laneIdFor(actorId, names) {
    if (names[actorId]) return actorId;
    const ids = Object.keys(names);
    for (let i = 0; i < ids.length; i++) {
      if (names[ids[i]] === actorId) return ids[i];
    }
    return actorId;
  }
  function seedScopeLanes(byId, ensure, seg, partyFocus) {
    var _a;
    const meta = getPlayerMeta();
    const metaIds = Object.keys(meta);
    for (let i = 0; i < metaIds.length; i++) {
      const id = metaIds[i];
      if (seg && !actorIdInScope(id, seg, partyFocus)) continue;
      ensure(id, (_a = meta[id]) == null ? void 0 : _a.name);
    }
    if (!seg) return;
    const actorIds = Object.keys(seg.actors);
    for (let i = 0; i < actorIds.length; i++) {
      const id = actorIds[i];
      if (!actorIdInScope(id, seg, partyFocus)) continue;
      const a = seg.actors[id];
      ensure(id, a.name);
    }
  }
  function laneDataSig(casts, conditions, gearSwaps, filter, start, rosterSig, deathCount) {
    const c0 = casts.length ? casts[0].at : 0;
    const c1 = casts.length ? casts[casts.length - 1].at : 0;
    const g1 = gearSwaps.length ? gearSwaps[gearSwaps.length - 1].at : 0;
    let ended = 0;
    let lastCond = 0;
    for (let i = 0; i < conditions.length; i++) {
      const c = conditions[i];
      if (c.endedAt) ended++;
      if (c.startedAt > lastCond) lastCond = c.startedAt;
    }
    return `${filter}|${start}|${rosterSig}|${deathCount}|${casts.length}:${c0}:${c1}|${conditions.length}:${ended}:${lastCond}|${gearSwaps.length}:${g1}`;
  }
  function rosterSigNow() {
    const meta = getPlayerMeta();
    const ids = Object.keys(meta);
    ids.sort();
    let s = "";
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      s += `${id}:${meta[id].name}:${meta[id].ctype || ""};`;
    }
    return s;
  }
  function conditionsEndedCount(cs) {
    let n = 0;
    for (let i = 0; i < cs.length; i++) {
      if (cs[i].endedAt) n++;
    }
    return n;
  }
  function timelineFightKey(segmentRef, seg) {
    let refKey = "current";
    if (segmentRef === "total") refKey = "total";
    else if (segmentRef && typeof segmentRef === "object" && segmentRef.pastId) {
      refKey = `past:${segmentRef.pastId}`;
    }
    if (!seg) return `${refKey}:empty`;
    return `${refKey}:${seg.id}:${seg.startedAt}`;
  }
  function timelineOriginMs(seg, casts, conditions, deaths, gearSwaps, now) {
    let start = now;
    if (seg && seg.startedAt) start = seg.startedAt;
    for (let i = 0; i < conditions.length; i++) {
      start = Math.min(start, conditions[i].startedAt);
    }
    for (let i = 0; i < casts.length; i++) {
      start = Math.min(start, casts[i].at);
    }
    for (let i = 0; i < deaths.length; i++) {
      start = Math.min(start, deaths[i].at);
    }
    for (let i = 0; i < gearSwaps.length; i++) {
      start = Math.min(start, gearSwaps[i].at);
    }
    return start;
  }
  function buildLanes(casts, conditions, deaths, gearSwaps, start, filter, names, ctypes, seg, partyFocus) {
    var _a;
    const byId = {};
    const ensure = (id, fallbackName) => {
      const lid = laneIdFor(id, names);
      if (!byId[lid]) {
        byId[lid] = {
          id: lid,
          name: names[lid] || fallbackName || names[id] || id,
          ctype: ctypes[lid] || ctypes[id],
          blocks: [],
          cats: []
        };
      }
      return byId[lid];
    };
    seedScopeLanes(byId, ensure, seg, partyFocus);
    const wantCds = filter === "all" || filter === "cds";
    const wantBuffs = filter === "all" || filter === "buffs";
    const wantDebuffs = filter === "all" || filter === "debuffs";
    const wantGear = filter === "all" || filter === "gear";
    if (wantBuffs || wantDebuffs) {
      for (let i = 0; i < conditions.length; i++) {
        const c = conditions[i];
        const ck = conditionKind(c.key);
        if (ck === "buff" && !wantBuffs) continue;
        if (ck === "debuff" && !wantDebuffs) continue;
        const lane = ensure(c.actorId);
        const t0 = Math.max(0, (c.startedAt - start) / 1e3);
        const t1 = c.endedAt ? Math.max(t0, (c.endedAt - start) / 1e3) : t0;
        lane.blocks.push({
          kind: "condition",
          domKey: `cond:${c.actorId}:${c.startedAt}:${c.key}`,
          key: c.key,
          label: prettyKey(c.key),
          atSec: t0,
          durationSec: t1 - t0,
          startedAtMs: c.startedAt,
          isOpen: !c.endedAt,
          condKind: ck,
          source: lane.name,
          actorId: c.actorId
        });
      }
    }
    if (wantCds) {
      for (let i = 0; i < casts.length; i++) {
        const c = casts[i];
        const lane = ensure(c.actorId);
        const t0 = Math.max(0, (c.at - start) / 1e3);
        const src = c.source || "attack";
        lane.blocks.push({
          kind: "cast",
          domKey: `cast:${c.actorId}:${c.at}:${(_a = c.pid) != null ? _a : ""}:${src}`,
          key: src,
          label: prettyKey(src),
          atSec: t0,
          durationSec: TL_CAST_EFFECT_SEC,
          source: lane.name,
          actorId: c.actorId
        });
      }
    }
    if (wantGear) {
      for (let i = 0; i < gearSwaps.length; i++) {
        const g = gearSwaps[i];
        const itemName = g.newName || g.oldName;
        if (!itemName) continue;
        const lane = ensure(g.actorId);
        const t0 = Math.max(0, (g.at - start) / 1e3);
        const label = gearItemLabel(
          itemName,
          g.newName ? g.newLevel : g.oldLevel
        );
        const oldSkin = g.oldName ? itemSkin(g.oldName) || void 0 : void 0;
        lane.blocks.push({
          kind: "gear",
          domKey: `gear:${g.actorId}:${g.at}:${g.slot}:${itemName}`,
          key: itemName,
          label,
          atSec: t0,
          durationSec: 0,
          source: lane.name,
          actorId: g.actorId,
          slot: g.slot,
          oldName: g.oldName,
          oldLevel: g.oldLevel,
          oldSkin,
          newName: g.newName,
          newLevel: g.newLevel,
          skin: g.skin || oldSkin || itemSkin(itemName)
        });
      }
    }
    for (let i = 0; i < deaths.length; i++) {
      const d = deaths[i];
      const lane = ensure(d.id, d.name);
      const t0 = Math.max(0, (d.at - start) / 1e3);
      lane.blocks.push({
        kind: "death",
        domKey: `death:${d.id}:${d.at}`,
        key: "death",
        label: `${d.name || lane.name} died`,
        atSec: t0,
        durationSec: 0,
        source: lane.name,
        actorId: d.id
      });
    }
    const ids = Object.keys(byId);
    ids.sort((a, b) => {
      const na = byId[a].name.toLowerCase();
      const nb = byId[b].name.toLowerCase();
      if (na < nb) return -1;
      if (na > nb) return 1;
      return 0;
    });
    const lanes = [];
    for (let i = 0; i < ids.length; i++) {
      const lane = byId[ids[i]];
      lane.blocks.sort((x, y) => x.atSec - y.atSec);
      fillCastNextSame(lane.blocks);
      lane.cats = laneCatsFromBlocks(lane.blocks);
      lanes.push(lane);
    }
    return lanes;
  }

  // src/ui/meter/views/timeline/timelineVirtualize.ts
  function firstBlockInView(blocks, viewLeft, pps) {
    const maxBarPx = TL_VISUAL_DUR_MAX * pps;
    const minAt = (viewLeft - maxBarPx) / Math.max(1, pps);
    let lo = 0;
    let hi = blocks.length;
    while (lo < hi) {
      const mid = lo + hi >> 1;
      if (blocks[mid].atSec < minAt) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
  function lastBlockInView(blocks, viewRight, pps, from) {
    const maxAt = viewRight / Math.max(1, pps);
    let lo = from;
    let hi = blocks.length;
    while (lo < hi) {
      const mid = lo + hi >> 1;
      if (blocks[mid].atSec <= maxAt) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
  function blockOverlapsView(b, viewLeft, viewRight, pps, iconPx) {
    const layout = blockLayoutPx(b, pps, iconPx);
    return layout.left + layout.width > viewLeft && layout.left < viewRight;
  }
  function isViewUnmeasured(range) {
    return range.left <= -1e8;
  }
  function estimateViewRange(durSec, pps, follow) {
    const viewW = TL_VIEW_ESTIMATE_W;
    const buf = TL_VIEW_BUF_PX;
    const contentW = Math.max(0, durSec * pps);
    const left = follow ? Math.max(0, contentW - viewW) : 0;
    const right = follow ? Math.max(viewW, contentW) : viewW;
    return { left: left - buf, right: right + buf };
  }
  function tickStepSec(pps) {
    const candidates = [5, 10, 15, 30, 60, 120];
    for (let i = 0; i < candidates.length; i++) {
      if (candidates[i] * pps >= TL_TICK_MIN_PX) return candidates[i];
    }
    return candidates[candidates.length - 1];
  }
  function buildTicks(pps, axisSec, includeEnd) {
    const step = tickStepSec(pps);
    const last = Math.max(0, Math.floor(axisSec + 1e-9));
    const ticks = [{ sec: 0, left: 0 }];
    for (let s = step; s <= last; s += step) {
      ticks.push({ sec: s, left: Math.round(s * pps) });
    }
    if (includeEnd && last > 0) {
      const endLeft = Math.round(last * pps);
      const prev = ticks[ticks.length - 1];
      if (endLeft - prev.left > 24) {
        ticks.push({ sec: last, left: endLeft, isEnd: true });
      }
    }
    return ticks;
  }
  function axisTickNodes(ticks, kind, originMs, viewLeft, viewRight) {
    const slop = 48;
    const nodes = [];
    for (let i = 0; i < ticks.length; i++) {
      const t = ticks[i];
      if (t.left < viewLeft - slop || t.left > viewRight + slop) continue;
      const wall = kind === "wall" ? wallAtElapsed(originMs, t.sec) : "";
      const isFirst = t.sec === 0 && !t.isEnd;
      nodes.push(
        e(
          "span",
          {
            key: `${kind}-${t.isEnd ? "end" : t.sec}`,
            className: "ecu-meter-tl-tick" + (kind === "wall" ? " is-wall" : " is-fight") + (isFirst ? " is-first" : "") + (t.isEnd ? " is-last" : ""),
            style: { left: `${t.left}px` },
            title: kind === "fight" ? "Fight elapsed" : "Wall clock"
          },
          kind === "fight" ? fmtClock(t.sec) : wall || "\u2014"
        )
      );
    }
    return nodes;
  }
  function blockLayoutPx(b, pps, iconPx) {
    const left = Math.round(Math.max(0, b.atSec * pps));
    if (b.kind === "gear") {
      return { left, width: iconPx, showBar: false };
    }
    let visualDur = visualDurationSec(b);
    if (b.kind === "cast" && b.nextSameAtSec != null) {
      const gapSec = TL_CAST_BAR_GAP_PX / Math.max(1, pps);
      visualDur = Math.min(
        visualDur,
        Math.max(0, b.nextSameAtSec - b.atSec - gapSec)
      );
    }
    const barPx = Math.round(visualDur * pps);
    const width = Math.max(iconPx, barPx);
    const barSpan = barPx - Math.round(iconPx / 2);
    const showBar = b.kind !== "death" && barSpan >= TL_BAR_MIN_PX;
    return { left, width, showBar };
  }

  // src/ui/meter/views/timeline/TimelineEvent.ts
  function timelineEventEqual(prev, next) {
    if (prev.pps !== next.pps || prev.stackIndex !== next.stackIndex)
      return false;
    if (prev.laneId !== next.laneId || prev.actorName !== next.actorName) {
      return false;
    }
    if (prev.originMs !== next.originMs) return false;
    if (prev.iconPx !== next.iconPx || prev.subIndex !== next.subIndex || prev.subCount !== next.subCount) {
      return false;
    }
    const pb = prev.block;
    const nb = next.block;
    if (pb.domKey !== nb.domKey || pb.atSec !== nb.atSec || pb.kind !== nb.kind) {
      return false;
    }
    if (pb.isOpen !== nb.isOpen || pb.condKind !== nb.condKind) return false;
    if (pb.nextSameAtSec !== nb.nextSameAtSec) return false;
    if (pb.isOpen && nb.isOpen) return true;
    return pb.durationSec === nb.durationSec;
  }
  function TimelineEventInner(props) {
    const b = props.block;
    const layout = blockLayoutPx(b, props.pps, props.iconPx);
    const tip = (ev) => {
      const laneBlocks = props.laneBlocksRef.current[props.laneId] || [];
      const scroll = timelineScrollView(ev.target);
      const view = {
        pps: props.pps,
        iconPx: props.iconPx,
        viewLeft: scroll ? scroll.viewLeft : 0,
        viewRight: scroll ? scroll.viewRight : Number.POSITIVE_INFINITY,
        pad: scroll ? scroll.pad : 0
      };
      return blockTooltipHtml(
        b,
        props.actorName,
        laneBlocks,
        props.originMs,
        view
      );
    };
    const onEnter = (ev) => {
      showBlockTip(b.domKey, ev, tip(ev));
    };
    const onMove = (ev) => {
      if (tlHoverDomKey !== b.domKey) {
        showBlockTip(b.domKey, ev, tip(ev));
        return;
      }
      showMeterTooltip(ev, tip(ev));
    };
    const onLeave = (ev) => {
      if (isTlHoverTarget(ev.relatedTarget)) return;
      hideBlockTip();
    };
    const iconZ = TL_ICON_Z + props.stackIndex;
    const barZ = props.stackIndex + 1;
    const split = props.subIndex >= 0 && props.subCount >= 2;
    if (b.kind === "death") {
      return e("div", {
        className: "ecu-meter-tl-death",
        style: { left: `${layout.left}px`, zIndex: iconZ },
        onMouseEnter: onEnter,
        onMouseMove: onMove,
        onMouseLeave: onLeave
      });
    }
    return e(
      "div",
      {
        className: "ecu-meter-tl-block" + (b.kind === "cast" ? " is-cast" : "") + (b.kind === "gear" ? " is-gear" : "") + (b.condKind === "buff" ? " is-buff" : "") + (b.condKind === "debuff" ? " is-debuff" : "") + (layout.showBar ? "" : " is-no-bar") + (split ? " is-sub" : ""),
        "data-tl-key": b.domKey,
        style: {
          left: `${layout.left}px`,
          width: `${layout.width}px`,
          ...split ? {
            ["--tl-sub-i"]: String(props.subIndex),
            ["--tl-subs"]: String(props.subCount)
          } : {}
        }
      },
      e(IconHost, {
        html: blockIconHtml(b, props.iconPx),
        className: "ecu-meter-tl-block-ico",
        style: { zIndex: iconZ },
        onMouseEnter: onEnter,
        onMouseMove: onMove,
        onMouseLeave: onLeave
      }),
      layout.showBar ? e("div", { className: "ecu-meter-tl-block-bar" }) : null,
      e("div", {
        className: "ecu-meter-tl-block-hit",
        style: { zIndex: barZ },
        onMouseEnter: onEnter,
        onMouseMove: onMove,
        onMouseLeave: onLeave
      })
    );
  }

  // src/ui/meter/views/timeline/timelineChrome.ts
  var TL_FILTER_TABS = [
    { id: "all", label: "All" },
    { id: "cds", label: "Cooldowns" },
    { id: "debuffs", label: "Debuffs" },
    { id: "buffs", label: "Buffs" },
    { id: "gear", label: "Gear" }
  ];
  function timelineLegendItems(filter) {
    return filter === "cds" ? [{ cls: "is-cd", label: "Cooldown bar" }] : filter === "buffs" ? [{ cls: "is-buff", label: "Buff bar" }] : filter === "debuffs" ? [{ cls: "is-debuff", label: "Debuff bar" }] : filter === "gear" ? [{ cls: "is-gear", label: "Gear swap" }] : [
      { cls: "is-cd", label: "CD" },
      { cls: "is-buff", label: "Buff" },
      { cls: "is-debuff", label: "Debuff" },
      { cls: "is-gear", label: "Gear" },
      { cls: "is-death", label: "Death" }
    ];
  }
  function timelineEmptyMsg(filter) {
    return filter === "all" ? "No cast / condition / gear markers yet." : filter === "cds" ? "No cast / cooldown markers yet." : filter === "debuffs" ? "No debuffs recorded yet." : filter === "gear" ? "No gear swaps recorded yet." : "No buffs recorded yet.";
  }
  function timelineGutterLane(lane, li, selectedId, selectLane) {
    const rowH = laneRowPx(lane.cats);
    const tip = lane.ctype ? `${lane.name} \xB7 ${lane.ctype}` : lane.name;
    return e(
      "div",
      {
        key: lane.id,
        className: "ecu-meter-tl-gutter-lane" + (li % 2 === 1 ? " is-alt" : "") + (selectedId === lane.id ? " is-selected" : "") + (lane.cats.length >= 2 ? " is-split" : ""),
        title: tip,
        style: {
          color: classColors[(lane.ctype || "").toLowerCase()] || "#b0bec5",
          height: `${rowH}px`,
          minHeight: `${rowH}px`,
          maxHeight: `${rowH}px`
        },
        onClick: () => selectLane(lane.id)
      },
      e("span", { className: "ecu-meter-tl-name-txt" }, lane.name)
    );
  }
  function timelineTrackLane(lane, li, opts) {
    const split = lane.cats.length >= 2;
    const rowH = laneRowPx(lane.cats);
    const iconPx = split ? TL_ICON_SUB : TL_ICON;
    const from = firstBlockInView(lane.blocks, opts.renderRange.left, opts.pps);
    const to = lastBlockInView(
      lane.blocks,
      opts.renderRange.right,
      opts.pps,
      from
    );
    const eventNodes = [];
    let lastCastKey = "";
    let lastCastAt = -1e9;
    for (let bi = from; bi < to; bi++) {
      const b = lane.blocks[bi];
      if (!blockOverlapsView(
        b,
        opts.renderRange.left,
        opts.renderRange.right,
        opts.pps,
        iconPx
      )) {
        continue;
      }
      if (b.kind === "cast") {
        if (b.key === lastCastKey && b.atSec - lastCastAt < TL_COALESCE_SEC) {
          continue;
        }
        lastCastKey = b.key;
        lastCastAt = b.atSec;
      }
      const cat = blockCat(b);
      const subIndex = split && cat !== "death" ? lane.cats.indexOf(cat) : -1;
      eventNodes.push(
        e(opts.TimelineEvent, {
          key: b.domKey,
          block: b,
          laneId: lane.id,
          laneBlocksRef: opts.laneBlocksRef,
          originMs: opts.start,
          pps: opts.pps,
          actorName: lane.name,
          stackIndex: bi,
          iconPx,
          subIndex,
          subCount: split ? lane.cats.length : 1
        })
      );
    }
    const gridNodes = [];
    for (let i = 1; i < opts.ticks.length; i++) {
      const t = opts.ticks[i];
      if (t.left < opts.renderRange.left - 8 || t.left > opts.renderRange.right + 8) {
        continue;
      }
      gridNodes.push(
        e("div", {
          key: `g${t.isEnd ? "end" : t.sec}`,
          className: "ecu-meter-tl-gridline",
          style: { left: `${t.left}px` }
        })
      );
    }
    return e(
      "div",
      {
        key: lane.id,
        className: "ecu-meter-tl-lane" + (li % 2 === 1 ? " is-alt" : "") + (opts.selectedId === lane.id ? " is-selected" : "") + (split ? " is-split" : ""),
        style: {
          height: `${rowH}px`,
          minHeight: `${rowH}px`,
          maxHeight: `${rowH}px`
        },
        onClick: () => opts.selectLane(lane.id)
      },
      e(
        "div",
        { className: "ecu-meter-tl-track" },
        e("div", { className: "ecu-meter-tl-axis" }, ...gridNodes, ...eventNodes)
      )
    );
  }
  function timelineLegend(items) {
    return e(
      "div",
      { className: "ecu-meter-tl-legend", "aria-label": "Bar colors" },
      ...items.map(
        (item) => e(
          "span",
          {
            key: item.cls,
            className: "ecu-meter-tl-legend-item " + item.cls
          },
          e("span", {
            className: "ecu-meter-tl-legend-swatch",
            "aria-hidden": true
          }),
          item.label
        )
      )
    );
  }

  // src/ui/meter/views/MeterTimelineView.ts
  function timelineInnerEqual(prev, next) {
    if (prev.fightKey !== next.fightKey) return false;
    if (prev.segmentRef !== next.segmentRef) return false;
    if (prev.partyFocus !== next.partyFocus) return false;
    if (prev.rosterSig !== next.rosterSig) return false;
    if (prev.deathCount !== next.deathCount) return false;
    if (prev.combatLive !== next.combatLive) return false;
    const a = prev.result;
    const b = next.result;
    if (a.kind !== b.kind) return false;
    if (a.kind !== "timeline" || b.kind !== "timeline") return true;
    if (a.casts.length !== b.casts.length) return false;
    if (a.conditions.length !== b.conditions.length) return false;
    const ga = a.gearSwaps || [];
    const gb = b.gearSwaps || [];
    if (ga.length !== gb.length) return false;
    if (a.casts.length) {
      if (a.casts[0].at !== b.casts[0].at) return false;
      if (a.casts[a.casts.length - 1].at !== b.casts[b.casts.length - 1].at) {
        return false;
      }
    }
    if (a.conditions.length) {
      if (a.conditions[0].startedAt !== b.conditions[0].startedAt) return false;
      if (a.conditions[a.conditions.length - 1].startedAt !== b.conditions[b.conditions.length - 1].startedAt) {
        return false;
      }
      if (conditionsEndedCount(a.conditions) !== conditionsEndedCount(b.conditions)) {
        return false;
      }
    }
    if (ga.length && ga[ga.length - 1].at !== gb[gb.length - 1].at) return false;
    return true;
  }
  var TimelineEvent = null;
  var MeterTimelineMemo = null;
  function MeterTimelineViewInner(props) {
    const React = getReact();
    if (!TimelineEvent) {
      TimelineEvent = React.memo(TimelineEventInner, timelineEventEqual);
    }
    const [filter, setFilter] = React.useState("all");
    const [selectedId, setSelectedId] = React.useState(null);
    const [zoom, setZoom] = React.useState(1);
    const [rulerTicks, setRulerTicks] = React.useState([]);
    const [viewRange, setViewRange] = React.useState(TL_VIEW_OPEN);
    const [trackFrozen, setTrackFrozen] = React.useState(false);
    const viewSnapRef = React.useRef("");
    const rootRef = React.useRef(null);
    const scrollRef = React.useRef(null);
    const gutterRef = React.useRef(null);
    const gutterRowsRef = React.useRef(null);
    const followRef = React.useRef(true);
    const freezePadRef = React.useRef(null);
    const freezeResumeRef = React.useRef(false);
    const freezeScrollLeftRef = React.useRef(0);
    const pointerOnTrackRef = React.useRef(false);
    const shiftHeldRef = React.useRef(false);
    const shiftFreezeOkRef = React.useRef(true);
    const applyingScrollRef = React.useRef(false);
    const isLiveRef = React.useRef(false);
    const startRef = React.useRef(0);
    const durSecRef = React.useRef(1);
    const tickSigRef = React.useRef("");
    const layoutCacheRef = React.useRef({
      contentW: -1,
      pad: -1,
      trackW: -1,
      pps: -1,
      clock: null,
      wall: null,
      scale: null,
      clockText: "",
      wallText: "",
      scaleText: ""
    });
    const laneCacheRef = React.useRef({
      sig: "",
      lanes: []
    });
    const laneBlocksRef = React.useRef({});
    const originPinRef = React.useRef(null);
    const fightKeyRef = React.useRef("");
    const pps = TL_PPS_BASE * zoom;
    const ppsRef = React.useRef(pps);
    ppsRef.current = pps;
    const tl = props.result.kind === "timeline" ? props.result : null;
    const isTimeline = !!tl;
    const seg = resolveSegment(props.segmentRef);
    const fightKey = props.fightKey;
    if (fightKeyRef.current !== fightKey) {
      fightKeyRef.current = fightKey;
      originPinRef.current = null;
      followRef.current = true;
      freezePadRef.current = null;
      freezeResumeRef.current = false;
      shiftFreezeOkRef.current = true;
    }
    const isLive = !!(isTimeline && props.combatLive);
    const durationMs = tl ? tl.durationMs : 0;
    const casts = tl ? tl.casts : [];
    const conditions = tl ? tl.conditions : [];
    const deaths = eventsInScope(
      seg ? seg.deaths : [],
      (d) => d.id,
      seg,
      props.partyFocus
    );
    const gearSwaps = tl ? tl.gearSwaps || [] : [];
    const now = seg && seg.endedAt ? seg.endedAt : Date.now();
    const rawStart = !isTimeline ? now : originPinRef.current != null ? originPinRef.current : timelineOriginMs(seg, casts, conditions, deaths, gearSwaps, now);
    if (isTimeline) {
      const hasAnchor = !!(seg && seg.startedAt) || casts.length > 0 || conditions.length > 0 || deaths.length > 0 || gearSwaps.length > 0;
      if (hasAnchor && originPinRef.current == null) {
        originPinRef.current = rawStart;
      }
    }
    const start = isTimeline && originPinRef.current != null ? originPinRef.current : rawStart;
    const durSec = isLive ? Math.max((now - start) / 1e3, 1 / pps) : Math.max(durationMs / 1e3, 1 / pps);
    isLiveRef.current = isLive;
    startRef.current = start;
    durSecRef.current = durSec;
    const syncGutterY = React.useCallback(() => {
      const rows = gutterRowsRef.current;
      const scroll = scrollRef.current;
      if (!rows || !scroll) return;
      const y = Math.round(scroll.scrollTop);
      rows.style.transform = y ? `translate3d(0, ${-y}px, 0)` : "";
    }, []);
    const publishViewRange = React.useCallback(() => {
      const scroll = scrollRef.current;
      if (!scroll || scroll.clientWidth <= 0) return;
      const pad3 = layoutCacheRef.current.pad > 0 ? layoutCacheRef.current.pad : 0;
      const left = scroll.scrollLeft - pad3;
      const right = left + scroll.clientWidth;
      const snap = TL_VIEW_SNAP_PX;
      const buf = TL_VIEW_BUF_PX;
      const qLeft = Math.floor((left - buf) / snap) * snap;
      const qRight = Math.ceil((right + buf) / snap) * snap;
      const sig = `${qLeft}:${qRight}`;
      if (sig === viewSnapRef.current) return;
      viewSnapRef.current = sig;
      setViewRange({ left: qLeft, right: qRight });
    }, []);
    const applyLayout = React.useCallback(() => {
      const root = rootRef.current;
      const scroll = scrollRef.current;
      if (!root || !scroll) return;
      const ppsNow = ppsRef.current;
      const cache3 = layoutCacheRef.current;
      if (cache3.pps !== ppsNow) {
        cache3.pps = ppsNow;
        root.style.setProperty("--tl-pps", String(ppsNow));
      }
      const viewTrackW = Math.max(120, scroll.clientWidth);
      const elapsed = isLiveRef.current ? Math.max((Date.now() - startRef.current) / 1e3, 1 / ppsNow) : Math.max(durSecRef.current, 1 / ppsNow);
      const contentWR = Math.ceil(elapsed * ppsNow);
      const padR = freezePadRef.current != null ? freezePadRef.current : followRef.current ? Math.max(0, viewTrackW - contentWR) : 0;
      const trackWR = padR + contentWR;
      if (cache3.contentW !== contentWR || cache3.pad !== padR || cache3.trackW !== trackWR) {
        cache3.contentW = contentWR;
        cache3.pad = padR;
        cache3.trackW = trackWR;
        root.style.setProperty("--tl-pad", `${padR}px`);
        root.style.setProperty("--tl-content-w", `${contentWR}px`);
        root.style.setProperty("--tl-track-w", `${trackWR}px`);
      }
      if (!cache3.clock || !root.contains(cache3.clock)) {
        cache3.clock = root.querySelector("[data-tl-clock]");
        cache3.wall = root.querySelector("[data-tl-wall]");
        cache3.scale = root.querySelector("[data-tl-scale]");
      }
      const clockText = fmtClock(elapsed);
      if (cache3.clock && cache3.clockText !== clockText) {
        cache3.clockText = clockText;
        cache3.clock.textContent = clockText;
      }
      const wallText = fmtWall(startRef.current + elapsed * 1e3);
      if (cache3.wall && cache3.wallText !== wallText) {
        cache3.wallText = wallText;
        cache3.wall.textContent = wallText;
      }
      const scaleText = `${Math.round(ppsNow)} px/s`;
      if (cache3.scale && cache3.scaleText !== scaleText) {
        cache3.scaleText = scaleText;
        cache3.scale.textContent = scaleText;
      }
      const step = tickStepSec(ppsNow);
      const last = Math.max(0, Math.floor(elapsed + 1e-9));
      const includeEnd = !isLiveRef.current;
      const lastStep = Math.floor(last / step) * step;
      const sig = `${ppsNow}:${step}:${lastStep}:${includeEnd ? last : 0}`;
      if (sig !== tickSigRef.current) {
        tickSigRef.current = sig;
        setRulerTicks(buildTicks(ppsNow, elapsed, includeEnd));
      }
      if (followRef.current) {
        const held = applyingScrollRef.current;
        applyingScrollRef.current = true;
        const target = Math.max(0, scroll.scrollWidth - scroll.clientWidth);
        if (Math.abs(scroll.scrollLeft - target) > 0.5) {
          scroll.scrollLeft = target;
        }
        if (!held) applyingScrollRef.current = false;
      }
      syncGutterY();
      publishViewRange();
    }, [publishViewRange, syncGutterY]);
    const applyLayoutRef = React.useRef(applyLayout);
    applyLayoutRef.current = applyLayout;
    const beginModFreeze = React.useCallback(() => {
      if (!isLiveRef.current) return;
      if (!shiftFreezeOkRef.current) return;
      if (freezePadRef.current != null) return;
      const scroll = scrollRef.current;
      if (!scroll) return;
      freezeScrollLeftRef.current = scroll.scrollLeft;
      freezeResumeRef.current = followRef.current;
      freezePadRef.current = layoutCacheRef.current.pad >= 0 ? layoutCacheRef.current.pad : 0;
      followRef.current = false;
      setTrackFrozen(true);
    }, []);
    const endModFreeze = React.useCallback(() => {
      const scroll = scrollRef.current;
      const hadFreeze = freezePadRef.current != null;
      const wantResume = freezeResumeRef.current;
      const scrolled = !!scroll && Math.abs(scroll.scrollLeft - freezeScrollLeftRef.current) > TL_FOLLOW_SLACK;
      freezePadRef.current = null;
      freezeResumeRef.current = false;
      setTrackFrozen(false);
      if (!hadFreeze && !wantResume) return;
      if (wantResume && !scrolled) {
        followRef.current = true;
      }
      applyLayoutRef.current();
    }, []);
    React.useEffect(() => {
      injectMeterChromeCss();
      return () => hideBlockTip();
    }, []);
    React.useLayoutEffect(() => {
      applyingScrollRef.current = true;
      followRef.current = true;
      freezePadRef.current = null;
      freezeResumeRef.current = false;
      setTrackFrozen(false);
      layoutCacheRef.current = {
        contentW: -1,
        pad: -1,
        trackW: -1,
        pps: -1,
        clock: null,
        wall: null,
        scale: null,
        clockText: "",
        wallText: "",
        scaleText: ""
      };
      tickSigRef.current = "";
      viewSnapRef.current = "";
      applyLayoutRef.current();
      if (shiftHeldRef.current && isLiveRef.current) {
        shiftFreezeOkRef.current = true;
        beginModFreeze();
      }
      applyingScrollRef.current = false;
    }, [beginModFreeze, fightKey]);
    React.useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;
      const onScroll = () => {
        syncGutterY();
        publishViewRange();
        if (applyingScrollRef.current) return;
        if (freezePadRef.current != null) {
          const maxNow = Math.max(0, el.scrollWidth - el.clientWidth);
          if (maxNow > TL_FOLLOW_SLACK && el.scrollLeft < maxNow - TL_FOLLOW_SLACK) {
            freezeResumeRef.current = false;
            freezePadRef.current = null;
            shiftFreezeOkRef.current = false;
            setTrackFrozen(false);
          } else {
            return;
          }
        }
        const max = Math.max(0, el.scrollWidth - el.clientWidth);
        if (max <= TL_FOLLOW_SLACK) {
          followRef.current = true;
          return;
        }
        followRef.current = el.scrollLeft >= max - TL_FOLLOW_SLACK;
      };
      el.addEventListener("scroll", onScroll, { passive: true });
      return () => el.removeEventListener("scroll", onScroll);
    }, [isTimeline, publishViewRange, syncGutterY]);
    React.useEffect(() => {
      const gutter = gutterRef.current;
      const scroll = scrollRef.current;
      if (!gutter || !scroll) return;
      const onWheel = (ev) => {
        scroll.scrollTop += ev.deltaY;
        scroll.scrollLeft += ev.deltaX;
        ev.preventDefault();
      };
      gutter.addEventListener("wheel", onWheel, { passive: false });
      return () => gutter.removeEventListener("wheel", onWheel);
    }, [isTimeline]);
    React.useEffect(() => {
      const scroll = scrollRef.current;
      if (!scroll) return;
      const onWheel = (ev) => {
        if (!ev.ctrlKey) return;
        ev.preventDefault();
        const factor = ev.deltaY < 0 ? TL_ZOOM_STEP : 1 / TL_ZOOM_STEP;
        setZoom((z) => {
          const minZ = TL_PPS_MIN / TL_PPS_BASE;
          const maxZ = TL_PPS_MAX / TL_PPS_BASE;
          return Math.max(minZ, Math.min(maxZ, z * factor));
        });
      };
      scroll.addEventListener("wheel", onWheel, { passive: false });
      return () => scroll.removeEventListener("wheel", onWheel);
    }, [isTimeline]);
    React.useEffect(() => {
      const onKeyDown = (ev) => {
        if (ev.key !== "Shift") return;
        shiftHeldRef.current = true;
        if (ev.ctrlKey || ev.altKey || ev.metaKey) return;
        if (ev.repeat && freezePadRef.current != null) return;
        shiftFreezeOkRef.current = true;
        const scroll = scrollRef.current;
        if (scroll && scroll.matches(":hover")) pointerOnTrackRef.current = true;
        if (!pointerOnTrackRef.current) return;
        beginModFreeze();
      };
      const onKeyUp = (ev) => {
        if (ev.key !== "Shift") return;
        shiftHeldRef.current = false;
        shiftFreezeOkRef.current = true;
        endModFreeze();
      };
      const onBlur = () => {
        shiftHeldRef.current = false;
        endModFreeze();
      };
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      window.addEventListener("blur", onBlur);
      return () => {
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        window.removeEventListener("blur", onBlur);
      };
    }, [beginModFreeze, endModFreeze]);
    React.useEffect(() => {
      const scroll = scrollRef.current;
      if (!scroll) return;
      const onPointerEnter = () => {
        pointerOnTrackRef.current = true;
        if (shiftHeldRef.current) beginModFreeze();
      };
      const onPointerMove = (ev) => {
        pointerOnTrackRef.current = true;
        if (ev.shiftKey) shiftHeldRef.current = true;
        if (ev.shiftKey && !ev.ctrlKey && !ev.altKey && !ev.metaKey) {
          beginModFreeze();
        }
      };
      const onPointerLeave = () => {
        pointerOnTrackRef.current = false;
      };
      scroll.addEventListener("pointerenter", onPointerEnter);
      scroll.addEventListener("pointermove", onPointerMove);
      scroll.addEventListener("pointerleave", onPointerLeave);
      return () => {
        scroll.removeEventListener("pointerenter", onPointerEnter);
        scroll.removeEventListener("pointermove", onPointerMove);
        scroll.removeEventListener("pointerleave", onPointerLeave);
      };
    }, [beginModFreeze, isTimeline]);
    React.useLayoutEffect(() => {
      applyLayout();
      const scroll = scrollRef.current;
      const ro = scroll && typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => applyLayout()) : null;
      if (scroll && ro) ro.observe(scroll);
      if (!isLive) return () => ro && ro.disconnect();
      let raf2 = 0;
      const loop = () => {
        if (!(typeof document !== "undefined" && document.hidden)) {
          applyLayout();
        }
        raf2 = window.requestAnimationFrame(loop);
      };
      raf2 = window.requestAnimationFrame(loop);
      return () => {
        window.cancelAnimationFrame(raf2);
        if (ro) ro.disconnect();
      };
    }, [applyLayout, isLive, isTimeline, start, zoom, fightKey]);
    if (!isTimeline) {
      return e(
        "div",
        { style: { padding: "8px", color: "#888", ...PIXEL_TEXT } },
        "No timeline"
      );
    }
    const { names, ctypes } = buildActorMaps(props.segmentRef);
    const nextLaneSig = isTimeline ? laneDataSig(
      casts,
      conditions,
      gearSwaps,
      filter,
      start,
      props.rosterSig,
      props.deathCount
    ) : "";
    if (isTimeline && laneCacheRef.current.sig !== nextLaneSig) {
      laneCacheRef.current = {
        sig: nextLaneSig,
        lanes: buildLanes(
          casts,
          conditions,
          deaths,
          gearSwaps,
          start,
          filter,
          names,
          ctypes,
          seg,
          props.partyFocus
        )
      };
    }
    const lanes = isTimeline ? laneCacheRef.current.lanes : [];
    const laneBlocksMap = {};
    for (let i = 0; i < lanes.length; i++) {
      laneBlocksMap[lanes[i].id] = lanes[i].blocks;
    }
    laneBlocksRef.current = laneBlocksMap;
    const ticks = rulerTicks.length > 0 ? rulerTicks : buildTicks(pps, durSec, !isLive);
    const renderRange = isViewUnmeasured(viewRange) ? estimateViewRange(durSec, pps, followRef.current) : viewRange;
    const selectLane = (laneId) => {
      setSelectedId(selectedId === laneId ? null : laneId);
    };
    const gutterLane = (lane, li) => timelineGutterLane(lane, li, selectedId, selectLane);
    const trackLane = (lane, li) => timelineTrackLane(lane, li, {
      selectedId,
      selectLane,
      renderRange,
      pps,
      ticks,
      TimelineEvent,
      laneBlocksRef,
      start
    });
    const filterTabs = TL_FILTER_TABS;
    const legendItems = timelineLegendItems(filter);
    const emptyMsg = timelineEmptyMsg(filter);
    return e(
      "div",
      {
        className: "ecu-meter-timeline" + (trackFrozen ? " is-tl-frozen" : ""),
        ref: rootRef,
        style: { ...PIXEL_TEXT }
      },
      e(
        "div",
        { className: "ecu-meter-timeline-hd" },
        e("div", { className: "ecu-meter-timeline-mark" }, "Time Line"),
        e(
          "div",
          { className: "ecu-meter-timeline-tools" },
          ...filterTabs.map(
            (f) => e(
              "button",
              {
                key: f.id,
                type: "button",
                className: "ecu-meter-tl-mode" + (filter === f.id ? " is-active" : ""),
                onClick: () => setFilter(f.id)
              },
              f.label
            )
          ),
          e(
            "span",
            { className: "ecu-meter-timeline-meta" },
            e(
              "span",
              {
                "data-tl-clock": "",
                title: "Fight elapsed (from pull start)"
              },
              fmtClock(durSec)
            ),
            " \xB7 ",
            e(
              "span",
              {
                "data-tl-wall": "",
                title: "Wall-clock time"
              },
              fmtWall(start + durSec * 1e3)
            ),
            e("span", { "data-tl-scale": "" }, `${Math.round(pps)} px/s`),
            isLive ? " \xB7 in combat" : "",
            deaths.length ? ` \xB7 ${deaths.length} deaths` : "",
            ` \xB7 ${lanes.length} players`,
            " \xB7 Ctrl+wheel zoom",
            isLive ? " \xB7 Shift hold freeze" : ""
          )
        ),
        timelineLegend(legendItems)
      ),
      e(
        "div",
        { className: "ecu-meter-tl-body" },
        e(
          "div",
          { className: "ecu-meter-tl-gutter", ref: gutterRef },
          e(
            "div",
            { className: "ecu-meter-tl-gutter-ruler", "aria-hidden": true },
            e(
              "span",
              { className: "ecu-meter-tl-gutter-axis-lab is-fight" },
              "Fight"
            ),
            e(
              "span",
              { className: "ecu-meter-tl-gutter-axis-lab is-clock" },
              "Clock"
            )
          ),
          e(
            "div",
            { className: "ecu-meter-tl-gutter-rows", ref: gutterRowsRef },
            lanes.length === 0 ? e("div", { className: "ecu-meter-tl-gutter-empty" }) : lanes.map(gutterLane)
          )
        ),
        e(
          "div",
          { className: "ecu-meter-tl-scroll", ref: scrollRef },
          e(
            "div",
            { className: "ecu-meter-tl-canvas" },
            // Live playhead at true “now” X (right edge while follow-pinned).
            // Omit post-combat — end-of-content would read as a permanent
            // gold right-edge chrome bar / fake scrollbar.
            isLive ? e("div", { className: "ecu-meter-tl-now", "aria-hidden": true }) : null,
            e(
              "div",
              { className: "ecu-meter-tl-ruler" },
              e(
                "div",
                { className: "ecu-meter-tl-ruler-track" },
                e(
                  "div",
                  { className: "ecu-meter-tl-axis is-fight" },
                  ...axisTickNodes(
                    ticks,
                    "fight",
                    start,
                    renderRange.left,
                    renderRange.right
                  )
                ),
                e(
                  "div",
                  { className: "ecu-meter-tl-axis is-wall" },
                  ...axisTickNodes(
                    ticks,
                    "wall",
                    start,
                    renderRange.left,
                    renderRange.right
                  )
                )
              )
            ),
            lanes.length === 0 ? e("div", { className: "ecu-meter-tl-empty" }, emptyMsg) : e(
              "div",
              { className: "ecu-meter-tl-lanes" },
              ...lanes.map(trackLane)
            )
          )
        )
      )
    );
  }
  function MeterTimelineView(props) {
    const React = getReact();
    if (!MeterTimelineMemo) {
      MeterTimelineMemo = React.memo(MeterTimelineViewInner, timelineInnerEqual);
    }
    const seg = resolveSegment(props.segmentRef);
    return e(MeterTimelineMemo, {
      result: props.result,
      segmentRef: props.segmentRef,
      partyFocus: props.partyFocus,
      rosterSig: rosterSigNow(),
      deathCount: seg ? seg.deaths.length : 0,
      combatLive: !!(seg && seg.endedAt == null),
      fightKey: timelineFightKey(props.segmentRef, seg)
    });
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
            live: selectedset === "current",
            onRowClick: (row2) => {
              onPatchInstance({
                query: {
                  kind: "details",
                  actorId: row2.id,
                  metric: "damage",
                  primary: "total"
                },
                label: detailsWindowTitle(row2.name, "damage", "total")
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
        onSelectAbility: (ability) => patchInspectorAbility(ability),
        onSelectActor: (actorId, name) => {
          const q = instance.query;
          const metric = q.kind === "details" && (q.metric === "heal" || q.metric === "taken") ? q.metric : "damage";
          const primary = q.kind === "details" && q.primary === "rate" ? "rate" : "total";
          onPatchInstance({
            query: {
              kind: "details",
              actorId,
              metric,
              primary
            },
            label: detailsWindowTitle(name, metric, primary)
          });
        },
        onSelectSegment: (next) => {
          onPatchInstance({ selectedset: next });
        }
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
          if (onFocusInspector) {
            onFocusInspector(id, name, {
              metric: "damage",
              primary: "total",
              selectedset,
              partyFocus: instance.partyFocus
            });
          } else {
            onPatchInstance({
              query: {
                kind: "details",
                actorId: id,
                metric: "damage",
                primary: "total"
              },
              presentation: "details",
              label: detailsWindowTitle(name, "damage", "total")
            });
          }
        }
      });
    }
    if (pres === "timeline" || result.kind === "timeline") {
      return e(MeterTimelineView, {
        result,
        segmentRef: selectedset,
        partyFocus: instance.partyFocus
      });
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
      const items = [];
      const eff = effectivePartyFocus(partyFocus, hasObserver);
      for (let i = 0; i < partyMenuOpts.length; i++) {
        const opt = partyMenuOpts[i];
        const selected = partyFocus === opt.id || eff === opt.id;
        items.push({
          label: opt.label,
          selected,
          onSelect: () => {
            onPatchInstance({ partyFocus: opt.id });
            closeTip();
          }
        });
      }
      const alwaysOn = instance.alwaysShowSelf != null ? instance.alwaysShowSelf : getSettings().meterAlwaysShowSelf !== false;
      items.push({
        label: "Always show me",
        selected: alwaysOn,
        onSelect: () => {
          onPatchInstance({ alwaysShowSelf: !alwaysOn });
          closeTip();
        }
      });
      if (onOpenReport) {
        items.push({ label: "\u2014", muted: true, onSelect: () => {
        } });
        items.push({
          label: "Plugins",
          muted: true,
          onSelect: () => closeTip()
        });
        for (let ti = 0; ti < REPORT_TABS.length; ti++) {
          const tab = REPORT_TABS[ti];
          items.push({
            label: tab.label,
            onSelect: () => {
              closeTip();
              onOpenReport(tab.kind);
            }
          });
        }
      }
      items.push({ label: "\u2014", muted: true, onSelect: () => {
      } });
      items.push({
        label: "Options panel\u2026",
        onSelect: () => {
          closeTip();
          setOptionsOpen(true);
        }
      });
      items.push({
        label: "Spell List\u2026",
        onSelect: () => {
          closeTip();
          onFocusInspector == null ? void 0 : onFocusInspector(getYouId() || "", watchedName || "You");
        }
      });
      items.push({
        label: "Statistics\u2026",
        onSelect: () => {
          closeTip();
          openReportDialog();
        }
      });
      items.push({ label: "\u2014", muted: true, onSelect: () => {
      } });
      items.push({
        label: "Window Control",
        muted: true,
        onSelect: () => closeTip()
      });
      items.push({
        label: onDuplicate ? "Create new window" : "Create new window (layout edit)",
        onSelect: () => {
          closeTip();
          if (onDuplicate) onDuplicate();
        }
      });
      if (onClose) {
        items.push({
          label: "Close window",
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
      if (it.muted && it.label === "\u2014") {
        nodes.push(e("div", { key: `div-${i}`, className: "ecu-meter-cooltip-div" }));
        continue;
      }
      if (tip.kind === "gear" && it.muted && (it.label === "Plugins" || it.label === "Window Control" || it.label === "View mode")) {
        nodes.push(
          e("div", { key: `sec-${i}`, className: "ecu-meter-cooltip-sec" }, it.label)
        );
        continue;
      }
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
      cycle,
      onPatchInstance,
      layoutEdit,
      onConfigure,
      onDuplicate,
      onClose,
      onOpenReport
    } = ctx;
    const titleChildren = [];
    if (isInspector) {
      titleChildren.push(e("span", { className: "ecu-meter-ttl-text" }, title));
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
    const showEncounterBadges = !isInspector && !isReport && !!resolved && (resolved.deaths.length > 0 || past2.length > 0);
    const encounterBadges = showEncounterBadges ? e(
      "div",
      { className: "ecu-meter-encounter-badges" },
      e(
        "button",
        {
          type: "button",
          className: "ecu-meter-encounter-badge is-skull",
          title: "Encounter Details",
          onClick: (ev) => {
            ev.stopPropagation();
            onOpenReport == null ? void 0 : onOpenReport("encounter");
          }
        },
        "\u{1F480}"
      ),
      e(
        "button",
        {
          type: "button",
          className: "ecu-meter-encounter-badge is-play",
          title: "Time Line",
          onClick: (ev) => {
            ev.stopPropagation();
            onOpenReport == null ? void 0 : onOpenReport("timeline");
          }
        },
        "\u25B6"
      )
    ) : null;
    const detailsTools = !isInspector ? e(
      "div",
      { className: "ecu-meter-tools" },
      toolBtn({
        title: "Mode \u2014 scope, plugins, window control, options",
        icon: "mode",
        tourId: "meter-gear",
        active: (tip == null ? void 0 : tip.kind) === "gear" || (tip == null ? void 0 : tip.kind) === "party" || optionsOpen,
        onEnter: (el) => openTip("gear", el),
        onLeave: scheduleTipClose,
        onClick: (ev) => openTip("gear", ev.currentTarget, {
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
        title: "Attribute / Display \u2014 hover menu \xB7 right-click all",
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
    ) : null;
    const stretchBtn = !isInspector && !isReport ? toolBtn({
      title: (instance.frameH || METER_FRAME_DEFAULT.h) >= 340 ? "Unstretch window" : "Stretch window (taller)",
      glyph: "\u2195",
      onClick: () => {
        const h = instance.frameH || METER_FRAME_DEFAULT.h;
        onPatchInstance({
          frameH: h >= 340 ? METER_FRAME_DEFAULT.h : 360
        });
      }
    }) : null;
    const layoutCfg = onConfigure && layoutEdit ? toolBtn({
      title: "Add / configure meters",
      glyph: "\u2699",
      onClick: () => onConfigure()
    }) : null;
    const layoutDup = onDuplicate && layoutEdit ? toolBtn({
      title: "Duplicate window",
      glyph: "+",
      onClick: () => onDuplicate()
    }) : null;
    const layoutRm = layoutEdit && onClose ? chromeBtn("Remove meter", "Rm", () => onClose(), false, true) : null;
    const chromeHover = layoutCfg || layoutDup || layoutRm ? e(
      "div",
      { className: "ecu-meter-chrome-hover" },
      layoutCfg,
      layoutDup,
      layoutRm
    ) : null;
    const playerTool = isInspector ? toolBtn({
      title: "Player",
      glyph: "\u{1F464}",
      active: (tip == null ? void 0 : tip.kind) === "actor",
      onEnter: (el) => openTip("actor", el),
      onLeave: scheduleTipClose,
      onClick: (ev) => openTip("actor", ev.currentTarget, {
        pin: true
      })
    }) : null;
    const actions = playerTool || stretchBtn || chromeHover ? e(
      "div",
      { className: "ecu-meter-actions" },
      playerTool,
      stretchBtn,
      chromeHover
    ) : null;
    return e(
      "div",
      {
        className: "ecu-meter-titlebar",
        style: { ...PIXEL_TEXT }
      },
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
      encounterBadges,
      detailsTools,
      actions
    );
  }

  // src/ui/meter/MeterPanelShell.ts
  function MeterPanelShell(props) {
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
    const [tip, setTip] = React.useState(
      null
    );
    const [reportOpen, setReportOpen] = React.useState(false);
    const [optionsOpen, setOptionsOpen] = React.useState(false);
    const [interacting, setInteracting] = React.useState(false);
    const tipCloseTimer = React.useRef(
      null
    );
    const tipPinnedRef = React.useRef(false);
    const shellRef = React.useRef(null);
    const patchInspectorAbility = (ability) => {
      const q = rootQuery(instance);
      if (q.kind !== "details") return;
      const next = {
        kind: "details",
        actorId: q.actorId,
        metric: q.metric,
        primary: q.primary
      };
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
    const inCombat2 = isMeterInCombat();
    const presNow = presentationFor(instance);
    const isToolPanel = presNow === "details" || isReportPresentation(presNow);
    const idle = !isToolPanel && instance.fadeWhenIdle !== false && !inCombat2;
    const rootQ = rootQuery(instance);
    const titleMode = rootQ.kind === "players" || rootQ.kind === "avoidance" || rootQ.kind === "rolling" || rootQ.kind === "snapshot" ? modeLabel(rootQ) : modeLabel(rootQ, instance.label);
    const titleSeg = segmentTitle(selectedset);
    const isCurrentSeg = selectedset === "current";
    const inspectorFocusOpts = () => {
      const q = rootQuery(instance);
      const metricRaw = metricFromModeQuery(q);
      const metric = metricRaw === "heal" || metricRaw === "taken" || metricRaw === "healing_required" || metricRaw === "avoidance" ? metricRaw : "damage";
      const primary = q.kind === "players" && q.primary === "rate" ? "rate" : "total";
      return {
        metric,
        primary,
        selectedset: instance.selectedset,
        partyFocus: instance.partyFocus
      };
    };
    const openInspectorRow = (row2) => {
      const opts = inspectorFocusOpts();
      if (onFocusInspector) {
        onFocusInspector(row2.id, row2.name, opts);
        return;
      }
      if (presentationFor(instance) === "details") {
        onPatchInstance({
          query: {
            kind: "details",
            actorId: row2.id,
            metric: opts.metric,
            primary: opts.primary
          },
          label: detailsWindowTitle(row2.name, opts.metric, opts.primary)
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
      const q = rootQuery(instance);
      const metric = q.kind === "details" && q.metric ? q.metric : "damage";
      const primary = q.kind === "details" && q.primary === "rate" ? "rate" : "total";
      onPatchInstance({
        query: { kind: "details", actorId, metric, primary },
        presentation: "details",
        label: detailsWindowTitle(name, metric, primary)
      });
      closeTip();
    };
    const sizeFrame = (w, h, freeForm) => {
      const root = layoutDragRoot().getBoundingClientRect();
      const maxW = root.width > 0 ? root.width : window.innerWidth;
      const maxH = root.height > 0 ? root.height : window.innerHeight;
      if (freeForm || getLayoutFreePlacement()) {
        return clampMeterFrame(w, h, maxW, maxH);
      }
      const snapped = snapFrameSizeToGrid(
        w,
        h,
        getLayoutGridStep(),
        root.width,
        root.height
      );
      return clampMeterFrame(snapped.w, snapped.h, maxW, maxH);
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
      if (!outer) return;
      const root = layoutDragRoot();
      const rootRect = root.getBoundingClientRect();
      const anchor = instance.pos.anchor || "tl";
      if (shell) shell.classList.add("is-resizing");
      beginLayoutGuide();
      const pointerId = ev.pointerId;
      try {
        target.setPointerCapture(pointerId);
      } catch (e2) {
      }
      let pending = sizeFrame(startW, startH, !!ev.shiftKey);
      const shareH = !!instance.horizontalSnap || !!(instance.snap && (instance.snap[1] || instance.snap[3]));
      const shareW = !!instance.verticalSnap || !!(instance.snap && (instance.snap[2] || instance.snap[4]));
      const peerIds = props.resizeGroupIds || [];
      const liveShiftX = (w) => {
        const dw = startW - w;
        if (corner === "bl") {
          if (anchor === "tr" || anchor === "br") return 0;
          if (anchor === "tc" || anchor === "bc" || anchor === "center") {
            return dw / 2;
          }
          return dw;
        }
        if (anchor === "tl" || anchor === "bl") return 0;
        if (anchor === "tc" || anchor === "bc" || anchor === "center") {
          return -dw / 2;
        }
        return -dw;
      };
      const applyLiveBox = (w, h) => {
        outer.style.width = w + "px";
        outer.style.height = h + "px";
        const sx = liveShiftX(w);
        outer.style.marginLeft = sx ? sx + "px" : "";
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
        applyLiveBox(pending.frameW, pending.frameH);
      };
      const onUp = () => {
        if (shell) shell.classList.remove("is-resizing");
        endLayoutGuide();
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        try {
          target.releasePointerCapture(pointerId);
        } catch (e2) {
        }
        outer.style.marginLeft = "";
        const rw = Math.max(1, rootRect.width);
        const rh = Math.max(1, rootRect.height);
        let nextPos = { ...instance.pos };
        const shiftX = liveShiftX(pending.frameW);
        if (shiftX !== 0) {
          nextPos = nudgePosByPixels(nextPos, shiftX, 0, rw, rh);
        }
        const dh = startH - pending.frameH;
        if (dh !== 0) {
          if (anchor === "bl" || anchor === "br" || anchor === "bc") {
            nextPos = nudgePosByPixels(nextPos, 0, dh, rw, rh);
          } else if (anchor === "center") {
            nextPos = nudgePosByPixels(nextPos, 0, dh / 2, rw, rh);
          }
        }
        onPatchInstance({
          frameW: pending.frameW,
          frameH: pending.frameH,
          pos: nextPos
        });
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
    const title = isInspector ? "Player Breakdown" : isReport ? "Encounter Details" : titleMode;
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
      var _a;
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
        if ((_a = navigator.clipboard) == null ? void 0 : _a.writeText) {
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
        cycle,
        onPatchInstance,
        layoutEdit: props.layoutEdit,
        onConfigure: props.onConfigure,
        onDuplicate: props.onDuplicate,
        onClose: props.onClose,
        onOpenReport: props.onOpenReport
      }),
      isReport ? e(
        "div",
        { className: "ecu-meter-report-layout" },
        e(MeterPluginRail, {
          active: activeReportKind,
          onSelect: setReportTab
        }),
        e(
          "div",
          { className: "ecu-meter-report-main" },
          activeReportKind === "encounter" ? e(
            "div",
            {
              className: "ecu-meter-report-tabs",
              style: { ...PIXEL_TEXT }
            },
            e(
              "button",
              {
                type: "button",
                className: "ecu-meter-report-tab active"
              },
              "Summary"
            ),
            ...REPORT_STUB_TABS.map(
              (tab) => e(
                "button",
                {
                  key: tab.id,
                  type: "button",
                  className: "ecu-meter-report-tab is-stub",
                  title: "Not available \u2014 Adventure Land has no CLEU emotes/phases/raid charts",
                  disabled: true
                },
                tab.label
              )
            )
          ) : null,
          encounterFooter,
          e(
            "div",
            {
              className: "ecu-meter-body"
            },
            body
          )
        )
      ) : e(
        "div",
        {
          className: "ecu-meter-body",
          onContextMenu: (ev) => {
            if (isInspector) return;
            const t = ev.target;
            if (t && t.closest && t.closest("button, a, input, textarea"))
              return;
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
          var _a;
          return (_a = props.onOpenReport) == null ? void 0 : _a.call(props, "encounter");
        }
      }) : null,
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
        title: "Resize from bottom-left (keeps top-right fixed \xB7 Shift = free size)",
        onPointerDown: (ev) => onResizePointerDown(ev, "bl")
      }) : null,
      props.layoutEdit || arrange ? e("div", {
        className: "ecu-meter-resize",
        title: getLayoutFreePlacement() ? "Resize from bottom-right (keeps top-left fixed \xB7 free size)" : "Resize from bottom-right (keeps top-left fixed \xB7 Shift = free size)",
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
      const hasSnap = ctx.windowHasSnap(inst.id);
      const windowNumber = ctx.windowNumberById[inst.id];
      const app = getMeterAppearance();
      let meterOpacity = inst.opacity != null ? inst.opacity : 1;
      const inCombat2 = isMeterInCombat();
      if (inCombat2 && app.autoHideCombat) {
        meterOpacity = Math.min(meterOpacity, app.idleAlpha);
      }
      if (!inCombat2 && app.autoHideOoc) {
        meterOpacity = Math.min(meterOpacity, app.idleAlpha);
      }
      const pos = {
        ...inst.pos,
        scale: inst.scale != null ? inst.scale : inst.pos.scale
      };
      out.push(
        e(
          PositionedPanel,
          {
            key: inst.id,
            id: inst.id,
            label: inst.label || inst.id,
            pos,
            editing: ctx.layoutEdit,
            editChrome: "anchors",
            movable: playArrange,
            softAvoid: false,
            onMove: (_id, nextPos) => ctx.onMove(inst.id, nextPos),
            onDragStart: () => ctx.onDragStart(inst.id),
            onDragMove: () => ctx.onDragMove(inst.id),
            onMoveEnd: () => ctx.onMoveEnd(inst.id),
            onActivate: () => ctx.onActivate(inst.id),
            onWindowScale: (scale) => ctx.onWindowScale(inst.id, scale),
            className: "ecu-meter-frame" + (playArrange ? " comm-pos-arrange" : "") + (hasSnap ? " comm-pos-grouped" : "") + (ctx.snapDragId === inst.id ? " comm-pos-dragging" : "") + (ctx.snapPeerId === inst.id ? " comm-pos-snap-target" : ""),
            style: {
              ...METER_PANEL_STYLE,
              width: frameW + "px",
              height: frameH + "px",
              overflow: "visible",
              ...typeof inst.zIndex === "number" ? { zIndex: inst.zIndex } : {}
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
            locked,
            onToggleLock: () => {
              ctx.patchMeter(inst.id, { locked: !locked });
            },
            onUngroup: hasSnap ? () => ctx.ungroupWindow(inst.id) : void 0,
            closedWindows: ctx.closedWindows,
            onReopenWindow: ctx.onReopenWindow,
            onCreateWindow: () => ctx.duplicateMeter(inst.id),
            onClose: () => ctx.layoutEdit ? ctx.removeMeter(inst.id) : ctx.closeMeterRuntime(inst.id),
            onShow: () => ctx.patchMeter(inst.id, { visible: true }),
            windowNumber,
            showWindowIds: ctx.showWindowIds
          },
          e(
            "div",
            {
              style: {
                position: "relative",
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
              resizeGroupIds: hasSnap ? getMeterGroup(ctx.meterInstances, inst.id).map((g) => g.id).filter((gid) => gid !== inst.id) : void 0,
              onToggleMetersHidden: () => ctx.setMetersHiddenPersist(!ctx.metersHidden),
              metersHidden: ctx.metersHidden,
              closedInstances: ctx.closedMeters,
              onReopenClosed: ctx.reopenClosedMeter,
              onPatchInstance: (partial) => {
                if (partial.frameW != null || partial.frameH != null) {
                  ctx.setMeterInstances((prev) => {
                    let next = applyGroupFrameSize2(prev, inst.id, {
                      frameW: partial.frameW,
                      frameH: partial.frameH
                    });
                    next = next.map(
                      (m) => m.id === inst.id ? { ...m, ...partial } : m
                    );
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
          dashed: true,
          hostPx: 2
        };
      case "medium":
        return {
          dark: "rgba(0, 0, 0, 0.55)",
          light: "rgba(255, 250, 220, 0.7)",
          dashed: true,
          hostPx: 2
        };
      case "coarse":
        return {
          dark: "rgba(0, 0, 0, 0.7)",
          light: "rgba(255, 245, 200, 0.88)",
          dashed: false,
          hostPx: 3
        };
      case "edge":
        return {
          dark: "rgba(0, 0, 0, 0.82)",
          light: "rgba(255, 255, 255, 0.95)",
          dashed: false,
          hostPx: 4
        };
      default: {
        const _exhaustive = tier;
        return _exhaustive;
      }
    }
  }
  function strokeStyle(axis, color, dashed, offsetPx) {
    const dash = axis === "v" ? `repeating-linear-gradient(to bottom, ${color} 0px, ${color} 3px, transparent 3px, transparent 7px)` : `repeating-linear-gradient(to right, ${color} 0px, ${color} 3px, transparent 3px, transparent 7px)`;
    if (axis === "v") {
      return {
        position: "absolute",
        left: `${offsetPx}px`,
        top: 0,
        bottom: 0,
        width: "1px",
        ...dashed ? { backgroundImage: dash } : { backgroundColor: color },
        boxSizing: "border-box",
        pointerEvents: "none"
      };
    }
    return {
      position: "absolute",
      top: `${offsetPx}px`,
      left: 0,
      right: 0,
      height: "1px",
      ...dashed ? { backgroundImage: dash } : { backgroundColor: color },
      boxSizing: "border-box",
      pointerEvents: "none"
    };
  }
  function gridLine(axis, pct, tier, key) {
    const look = tierLook(tier);
    const host2 = axis === "v" ? {
      position: "absolute",
      left: `${pct}%`,
      top: 0,
      bottom: 0,
      width: `${look.hostPx}px`,
      pointerEvents: "none"
    } : {
      position: "absolute",
      top: `${pct}%`,
      left: 0,
      right: 0,
      height: `${look.hostPx}px`,
      pointerEvents: "none"
    };
    return e(
      "div",
      {
        key,
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
      kids.push(gridLine("v", tiers.x[i].pct, tiers.x[i].tier, `vx${i}`));
    }
    for (let j = 0; j < tiers.y.length; j++) {
      kids.push(gridLine("h", tiers.y[j].pct, tiers.y[j].tier, `hy${j}`));
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
  function stopPtr(ev) {
    if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
  }
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
          onPointerDown: stopPtr,
          onClick: (ev) => {
            stopPtr(ev);
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
          onPointerDown: stopPtr,
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
          onPointerDown: stopPtr,
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
          onPointerDown: stopPtr,
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
      paintItemContainerIcon(el, state.skin, iconSize);
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
        const host2 = root.querySelector("div[style*='overflow']") || root;
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
  var EFFECT_CLOCK_MS = 250;
  var effectClockListeners = [];
  var effectClockId = 0;
  var effectClockVisBound = false;
  function notifyEffectClock() {
    if (typeof document !== "undefined" && document.hidden) return;
    for (let i = 0; i < effectClockListeners.length; i++) {
      effectClockListeners[i]();
    }
  }
  function onEffectClockVisibility() {
    if (typeof document !== "undefined" && document.hidden) return;
    notifyEffectClock();
  }
  function subscribeEffectClock(listener) {
    effectClockListeners.push(listener);
    if (!effectClockId) {
      effectClockId = window.setInterval(notifyEffectClock, EFFECT_CLOCK_MS);
      if (!effectClockVisBound && typeof document !== "undefined") {
        document.addEventListener("visibilitychange", onEffectClockVisibility);
        effectClockVisBound = true;
      }
    }
    return () => {
      const idx = effectClockListeners.indexOf(listener);
      if (idx >= 0) effectClockListeners.splice(idx, 1);
      if (effectClockListeners.length === 0 && effectClockId) {
        window.clearInterval(effectClockId);
        effectClockId = 0;
      }
    };
  }
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
    const host2 = wrap.querySelector(
      "div[style*='position: absolute']"
    ) || wrap.querySelector("div[style*='overflow']") || root;
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
    const wrapRef = React.useRef(null);
    const labelRef = React.useRef(null);
    const endsAtRef = React.useRef(0);
    const startedAtRef = React.useRef(0);
    const tintShownRef = React.useRef(false);
    const peakRemainRef = React.useRef(0);
    const lastExtendAtRef = React.useRef(0);
    const lastMsRef = React.useRef(0);
    const paintedRef = React.useRef({
      text: "",
      color: "",
      show: false,
      title: ""
    });
    const { effect, hostClass, entity, iconSize } = props;
    const effectRef = React.useRef(effect);
    effectRef.current = effect;
    const entityId = String(entity.id);
    const rid = loaderId(hostClass);
    const clickable = effect.type !== "skill";
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
    const paintRemainUi = () => {
      const ef = effectRef.current;
      const ends = endsAtRef.current;
      const now = Date.now();
      const remaining = ends > 0 ? Math.max(0, ends - now) : 0;
      const show = shouldShowRemainingLabel(
        ef,
        remaining,
        peakRemainRef.current,
        lastExtendAtRef.current,
        now
      );
      const text = show && remaining > 0 ? formatDurationCompact(remaining / 1e3) : "";
      const color = remaining <= 5e3 ? "#ffcc66" : "#e8e8e8";
      const title = effectTooltip(ef, show ? remaining : void 0);
      const painted = paintedRef.current;
      const label = labelRef.current;
      if (label) {
        if (painted.text !== text) {
          painted.text = text;
          label.textContent = text || "\xA0";
        }
        if (painted.show !== !!text) {
          painted.show = !!text;
          label.style.visibility = text ? "visible" : "hidden";
          label.style.background = text ? "rgba(0,0,0,0.82)" : "transparent";
          label.style.border = text ? "1px solid #444" : "1px solid transparent";
        }
        if (painted.color !== color) {
          painted.color = color;
          label.style.color = color;
        }
      }
      const wrap = wrapRef.current;
      if (wrap && painted.title !== title) {
        painted.title = title;
        wrap.setAttribute("title", title);
      }
    };
    const paintIcon = () => {
      const el = iconRef.current;
      if (!el) return;
      paintItemContainerIcon(el, effect.skin, iconSize);
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
      paintRemainUi();
      if (!(next > now)) {
        startedAtRef.current = 0;
        peakRemainRef.current = 0;
        lastExtendAtRef.current = 0;
        lastMsRef.current = 0;
        hideTint();
        paintRemainUi();
        return;
      }
      if (!prev) {
        noteDurationPeak(remaining, true);
        paintRemainUi();
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
        paintRemainUi();
        if (wantsStackedSoftTint(effect)) {
          hideTint();
          return;
        }
        if (!(startedAtRef.current > 0)) {
          startedAtRef.current = buffStartedAt(effect, next, now, "restart", 0);
        } else {
          const maxSpan = Math.max(SKILL_UI_SPAN_MS, effect.ms || 0, next - now);
          if (next - startedAtRef.current > maxSpan) {
            startedAtRef.current = next - maxSpan;
          }
        }
        pushTint("sync");
        return;
      }
      paintRemainUi();
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
    const onClockRef = React.useRef(() => {
    });
    onClockRef.current = () => {
      const ef = effectRef.current;
      const ends = endsAtRef.current;
      if (!ends) {
        paintRemainUi();
        hideTint();
        return;
      }
      const remaining = Math.max(0, ends - Date.now());
      paintRemainUi();
      if (!shouldShowEffectTint(ef, remaining)) {
        if (tintShownRef.current) hideTint();
        return;
      }
      if (!tintShownRef.current) pushTint("restart");
    };
    React.useEffect(() => {
      const tick = () => onClockRef.current();
      tick();
      return subscribeEffectClock(tick);
    }, [entityId, effect.id]);
    const remainNow = Math.max(0, (endsAtRef.current || 0) - Date.now());
    const showRemainLabel = shouldShowRemainingLabel(
      effect,
      remainNow,
      peakRemainRef.current,
      lastExtendAtRef.current,
      Date.now()
    );
    const remainingMs = remainNow;
    const msLabel = showRemainLabel && remainingMs > 0 ? formatDurationCompact(remainingMs / 1e3) : "";
    const tooltip = effectTooltip(
      effect,
      showRemainLabel ? remainingMs : void 0
    );
    const onClick = clickable ? (ev) => {
      if (ev && typeof ev.stopPropagation === "function")
        ev.stopPropagation();
      if (ev && typeof ev.preventDefault === "function") ev.preventDefault();
      info.openCondition(entity, effect.id);
    } : void 0;
    return e(
      "div",
      {
        ref: wrapRef,
        className: `comm-fx-icon ${hostClass}`,
        "data-condition": effect.id,
        "data-entity": entityId,
        [INFO_SOURCE_ATTR]: clickable ? "" : void 0,
        title: tooltip,
        onClick,
        onMouseDown: clickable ? (ev) => {
          if (ev && typeof ev.stopPropagation === "function")
            ev.stopPropagation();
        } : void 0,
        onPointerDown: clickable ? (ev) => {
          if (ev && typeof ev.stopPropagation === "function")
            ev.stopPropagation();
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
          ref: labelRef,
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
        "data-ecu-tour": "buff-icons",
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
    const buffsButton = e(
      "button",
      {
        type: "button",
        className: "ecu-roster-buffs",
        title: partyBuffModeTitle(buffMode),
        "aria-label": `Party buffs mode: ${partyBuffModeLabel(buffMode)}. Click to cycle.`,
        onClick: cycleBuffMode,
        style: {
          fontSize: TYPE.micro,
          ...PIXEL_TEXT
        }
      },
      e("span", { className: "ecu-roster-buffs-k" }, "Buffs"),
      e("span", { className: "ecu-roster-buffs-sep" }, "\xB7"),
      e(
        "span",
        { className: "ecu-roster-buffs-v" },
        partyBuffModeLabel(buffMode)
      )
    );
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
        (party, partyIdx) => e(
          "div",
          {
            key: party[0] || "solo",
            className: "ecu-roster-party",
            style: { marginBottom: "2px" }
          },
          e(
            "div",
            {
              className: "ecu-roster-party-hd",
              style: {
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "4px",
                flexWrap: "wrap"
              }
            },
            e(
              "div",
              {
                className: "ecu-roster-party-name",
                style: {
                  fontSize: TYPE.secondary,
                  color: "#ccc",
                  background: "rgba(0,0,0,0.55)",
                  display: "inline-block",
                  padding: "2px 6px",
                  ...PIXEL_TEXT
                }
              },
              party[0] || "(no party)"
            ),
            // Mode is global — only on the first party header so it sits with roster chrome.
            partyIdx === 0 ? buffsButton : null
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
      if (ev && typeof ev.stopPropagation === "function")
        ev.stopPropagation();
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
          if (ev && typeof ev.stopPropagation === "function")
            ev.stopPropagation();
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
          "data-ecu-tour": "paperdoll-gear",
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
            "data-ecu-tour": "paperdoll-trade",
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
  function snapshotEntity(ent) {
    const copy = Object.assign({}, ent);
    if (ent.slots) copy.slots = Object.assign({}, ent.slots);
    if (ent.s) copy.s = Object.assign({}, ent.s);
    return copy;
  }
  function EntityInfo(props) {
    var _a, _b, _c;
    const React = getReact();
    const selectedId = props.selectedEntity != null && props.selectedEntity !== "" ? String(props.selectedEntity) : "";
    const live2 = selectedId ? findEntity(props.entities, selectedId) : void 0;
    const cacheRef = React.useRef(null);
    if (!selectedId) {
      cacheRef.current = null;
    } else if (live2) {
      cacheRef.current = snapshotEntity(live2);
    } else if (cacheRef.current && String(cacheRef.current.id) !== selectedId) {
      cacheRef.current = null;
    }
    const entity = live2 || cacheRef.current;
    const stale = !live2 && !!entity;
    if (!entity) {
      if (!props.layoutEdit) return null;
      return e(PaperdollDummy);
    }
    const accent = classColors[entity.ctype || ""] || (entity.type === "monster" ? "#c44" : "#888");
    const isPlayer = !!(entity.player || entity.type === "character");
    const title = `${entity.name || entity.id}` + (entity.mtype ? ` (${entity.mtype})` : "") + ` \xB7 ${(_a = entity.level) != null ? _a : 1}` + (entity.type === "monster" ? ` #${entity.id}` : "");
    const watching = props.observing;
    const compare = !stale && isPlayer && watching && String(watching.id) !== String(entity.id) && !!(watching.player || watching.type === "character");
    const close = () => {
      if (props.onClose) props.onClose();
      else setXTarget(null);
    };
    return e(
      "div",
      {
        className: "comm-paperdoll" + (stale ? " comm-paperdoll-stale" : ""),
        style: Object.assign({}, PAPERDOLL_SHELL, {
          border: stale ? "2px dashed #c9a227" : `2px solid ${accent}`,
          opacity: stale ? 0.92 : 1
        }),
        onClick: (ev) => {
          ev.stopPropagation();
          if (!stale) setXTarget(entity);
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
            background: stale ? "#c9a227" : accent,
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
      stale ? e(
        "div",
        {
          style: {
            padding: "6px 10px",
            background: "rgba(201, 162, 39, 0.14)",
            borderBottom: "1px solid rgba(201, 162, 39, 0.35)",
            color: "#e8c96a",
            fontSize: TYPE.body,
            lineHeight: 1.35,
            ...PIXEL_TEXT
          }
        },
        "Out of vision \u2014 last known data. Updates when they return."
      ) : null,
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
      const isClosablePanel = (opts == null ? void 0 : opts.closable) === true || canCloseWindow(id);
      const isHidden = isClosablePanel && !deps.visible(id);
      if (isHidden && !deps.layoutEdit) return null;
      if ((opts == null ? void 0 : opts.empty) && !deps.layoutEdit) return null;
      const locked = deps.panelIsLocked(id);
      const playArrange = !deps.layoutEdit && (!locked || deps.altHeld) && id !== "toggles";
      const groupable = canGroupWindow(id);
      const grouped = groupable && commWindowHasSnap(
        { layout: deps.layout, meters: deps.meterInstances },
        id
      );
      const classBits = [];
      if (playArrange) classBits.push("comm-pos-arrange");
      if (grouped) classBits.push("comm-pos-grouped");
      if (deps.panelSnapDragId === id) classBits.push("comm-pos-dragging");
      if (deps.panelSnapPeerId === id) classBits.push("comm-pos-snap-target");
      return e(
        PositionedPanel,
        {
          id,
          pos: deps.layout[id],
          editing: deps.layoutEdit,
          movable: playArrange,
          // Play-arrange HUD grip. `grip` chrome (toggles) also needs ⠿ in
          // layout edit — playArrange is false then, so keep the handle on.
          showMoveGrip: playArrange || (opts == null ? void 0 : opts.editChrome) === "grip",
          onMove: deps.onMove,
          onMoveEnd: playArrange || deps.layoutEdit ? deps.onMoveEnd : void 0,
          onDragStart: playArrange || deps.layoutEdit ? deps.onPanelDragStart : void 0,
          onDragMove: playArrange || deps.layoutEdit ? deps.onPanelDragMove : void 0,
          softAvoid: groupable ? false : void 0,
          style: opts == null ? void 0 : opts.style,
          hidden: isHidden,
          hiddenBodyStyle: opts == null ? void 0 : opts.hiddenBodyStyle,
          opacity: deps.opacityFor(id),
          onOpacityChange: (opts == null ? void 0 : opts.editChrome) === "grip" ? void 0 : (value) => deps.setOpacity(id, value),
          peerLayout: deps.peerLayout,
          viewportProfile: deps.viewportProfile,
          interactiveBody: opts == null ? void 0 : opts.interactiveBody,
          editChrome: opts == null ? void 0 : opts.editChrome,
          className: classBits.length ? classBits.join(" ") : void 0,
          locked,
          onToggleLock: id === "toggles" ? void 0 : () => deps.setPanelLocked(id, !locked),
          onUngroup: grouped && deps.ungroupPanel ? () => deps.ungroupPanel(id) : void 0,
          closedWindows: deps.closedWindows,
          onReopenWindow: deps.onReopenWindow,
          onClose: isClosablePanel ? () => deps.setVisible(id, false) : void 0,
          onShow: isClosablePanel ? () => deps.setVisible(id, true) : void 0,
          windowNumber: deps.windowNumberById ? deps.windowNumberById[id] : void 0,
          showWindowIds: deps.showWindowIds,
          onWindowScale: deps.onWindowScale ? (scale) => deps.onWindowScale(id, scale) : void 0
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

  // src/ui/chrome/SnapGuideLine.ts
  var BALL_STEP_PX = 22;
  var BALL_SIZE = 10;
  function readCenter(id) {
    const el = document.querySelector(
      `.comm-pos-panel.comm-pos-${cssEscapePanelId(id)}`
    );
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 };
  }
  function SnapGuideLine(props) {
    const React = getReact();
    const [tick, setTick] = React.useState(0);
    React.useEffect(() => {
      if (!props.dragId || !props.visible) return;
      let raf2 = 0;
      const loop = () => {
        setTick((n) => n + 1);
        raf2 = window.requestAnimationFrame(loop);
      };
      raf2 = window.requestAnimationFrame(loop);
      return () => window.cancelAnimationFrame(raf2);
    }, [props.dragId, props.visible]);
    if (!props.dragId || !props.visible) return null;
    const targetId = props.snapPeerId || props.nearPeerId;
    if (!targetId) return null;
    const from = readCenter(props.dragId);
    const to = readCenter(targetId);
    if (!from || !to) return null;
    const root = layoutDragRoot().getBoundingClientRect();
    const x0 = from.x - root.left;
    const y0 = from.y - root.top;
    const x1 = to.x - root.left;
    const y1 = to.y - root.top;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (!(dist > 8)) return null;
    const canSnap = !!props.snapPeerId;
    const color = canSnap ? "rgba(80, 220, 120, 0.85)" : "rgba(220, 70, 70, 0.75)";
    const count = Math.max(1, Math.floor(dist / BALL_STEP_PX));
    const balls = [];
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1);
      balls.push(
        e("div", {
          key: "b" + i + "-" + tick % 2,
          className: "comm-snap-guide-ball",
          style: {
            position: "absolute",
            left: x0 + dx * t - BALL_SIZE / 2,
            top: y0 + dy * t - BALL_SIZE / 2,
            width: BALL_SIZE,
            height: BALL_SIZE,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 0 1px rgba(0,0,0,0.45)`,
            pointerEvents: "none"
          }
        })
      );
    }
    return e(
      "div",
      {
        className: "comm-snap-guide",
        "aria-hidden": true,
        style: {
          position: "absolute",
          inset: 0,
          zIndex: 50,
          pointerEvents: "none",
          overflow: "hidden"
        }
      },
      ...balls
    );
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
      setLayout,
      viewportProfile,
      layoutProfileMode,
      setLayoutProfileMode,
      panelIsLocked,
      setPanelLocked,
      altHeld,
      resetLayout,
      importLayouts,
      exportLayouts,
      setVisible,
      setOpacity,
      visible,
      opacityFor
    } = layoutState;
    const { bagOpen, bagRefreshing: bagRefreshing2 } = useBagBridge(setPanelVisible);
    const { selectedEntity: selectedEntity2, setSelectedEntity, closePaperdoll, focusUnitId } = useSelectionFromXTarget(snap);
    const meters = useCommMeterInstances(layout);
    const windowActions = useCommWindowActions({
      layout,
      setLayout,
      meters: meters.meterInstances,
      setMeters: meters.setMeterInstances,
      viewportProfile,
      applyBagPos: applyBagLayoutPos
    });
    const closedWindows = [];
    const hudIds = Object.keys(PANEL_LABELS);
    for (let i = 0; i < hudIds.length; i++) {
      const id = hudIds[i];
      if (!canCloseWindow(id)) continue;
      if (visible(id)) continue;
      closedWindows.push({ id, label: PANEL_LABELS[id] || id });
    }
    for (let i = 0; i < meters.closedMeters.length; i++) {
      const m = meters.closedMeters[i];
      closedWindows.push({ id: m.id, label: m.label || m.id });
    }
    const reopenWindow = (id) => {
      if (canCloseWindow(id)) {
        setVisible(id, true);
        return;
      }
      meters.reopenClosedMeter(id);
    };
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
    const [whatsNewEntries, setWhatsNewEntries] = React.useState(() => {
      const s = getSettings();
      if (!s.setupWizardDone) return [];
      return unseenChangelogEntries(s.changelogSeenId);
    });
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
      toursBlocked: setupWizardOpen || whatsNewEntries.length > 0,
      setSetupWizardOpen,
      isObserving: snap.observingId != null && snap.observingId !== "" || !!snap.observing,
      bagOpen,
      commandOpen: visible("command"),
      itemInfoOpen
    });
    const { startIntroTour, toggleLayoutEdit, tourOverlay } = guidedTours;
    React.useEffect(() => {
      updateKillContext(snap.entities);
      updateMeterContext(snap.entities);
    }, [snap.entities]);
    React.useEffect(() => {
      updateCommKeyboardHandlers({
        clearPaperdoll: () => {
          if (!selectedEntity2 && !focusUnitId) return false;
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
    }, [selectedEntity2, focusUnitId, closePaperdoll, toggleLayoutEdit]);
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
    const [layoutGuideActive, setLayoutGuideActive] = React.useState(
      () => isLayoutGuideActive()
    );
    React.useEffect(() => subscribeLayoutGuide(() => {
      setLayoutGuideActive(isLayoutGuideActive());
    }), []);
    const combat = combatSignals(snap.entities);
    const onCrypt = getMapData(snap.entities).map === "crypt";
    useContextualTourTriggers({
      selectedEntity: selectedEntity2,
      buffInfoOpen,
      meterCount: meters.meterInstances.length,
      entities: snap.entities,
      meterInstances: meters.meterInstances
    });
    const meterIdKey = (() => {
      const parts = [];
      for (let i = 0; i < meters.meterInstances.length; i++) {
        parts.push(meters.meterInstances[i].id);
      }
      parts.push("|");
      for (let i = 0; i < meters.closedMeters.length; i++) {
        parts.push(meters.closedMeters[i].id);
      }
      return parts.join(",");
    })();
    const windowNumberById = React.useMemo(() => {
      const ids = PANEL_IDS.slice();
      for (let i = 0; i < meters.meterInstances.length; i++) {
        ids.push(meters.meterInstances[i].id);
      }
      for (let i = 0; i < meters.closedMeters.length; i++) {
        ids.push(meters.closedMeters[i].id);
      }
      return ensureWindowNumbers(ids);
    }, [meterIdKey]);
    const panelDeps = {
      snap,
      layoutEdit,
      layout,
      meterInstances: meters.meterInstances,
      peerLayout: meters.peerLayout,
      viewportProfile,
      visible,
      opacityFor,
      onMove: (id, pos) => windowActions.moveWindow(id, pos),
      onMoveEnd: (id) => windowActions.snapAfterMove(id),
      onPanelDragStart: (id) => windowActions.onDragStart(id),
      onPanelDragMove: (id) => windowActions.onDragMove(id),
      ungroupPanel: (id) => windowActions.ungroupWindow(id),
      panelSnapDragId: windowActions.snapDragId,
      panelSnapPeerId: windowActions.snapPeerId,
      windowNumberById,
      showWindowIds: windowActions.showWindowIds,
      onWindowScale: (id, scale) => windowActions.setWindowScale(id, scale),
      panelIsLocked,
      setPanelLocked,
      altHeld,
      closedWindows,
      onReopenWindow: reopenWindow,
      setVisible,
      setOpacity,
      selectedEntity: selectedEntity2,
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
      altHeld,
      snapDragId: windowActions.snapDragId,
      snapPeerId: windowActions.snapPeerId,
      showWindowIds: windowActions.showWindowIds,
      windowNumberById,
      peerLayout: meters.peerLayout,
      viewportProfile,
      closedMeters: meters.closedMeters,
      closedWindows,
      meterIsLocked: meters.meterIsLocked,
      onMove: (id, pos) => windowActions.moveWindow(id, pos),
      onDragStart: (id) => windowActions.onDragStart(id),
      onDragMove: (id) => windowActions.onDragMove(id),
      onMoveEnd: (id) => windowActions.snapAfterMove(id),
      onActivate: (id) => meters.raiseMeterToFront(id),
      onWindowScale: (id, scale) => windowActions.setWindowScale(id, scale),
      patchMeter: meters.patchMeter,
      setMeterInstances: meters.setMeterInstances,
      setMetersHiddenPersist,
      reopenClosedMeter: meters.reopenClosedMeter,
      onReopenWindow: reopenWindow,
      focusInspector: meters.focusInspector,
      focusReport: meters.focusReport,
      duplicateMeter: meters.duplicateMeter,
      removeMeter: meters.removeMeter,
      closeMeterRuntime: meters.closeMeterRuntime,
      ungroupWindow: (id) => windowActions.ungroupWindow(id),
      windowHasSnap: (id) => commWindowHasSnap(windowActions.graphState(), id),
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
      layoutEdit || layoutGuideActive ? e(LayoutEditGrid) : null,
      e(SnapGuideLine, {
        dragId: windowActions.snapDragId,
        snapPeerId: windowActions.snapPeerId,
        nearPeerId: windowActions.nearPeerId,
        visible: windowActions.showWindowIds
      }),
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
      !setupWizardOpen && whatsNewEntries.length > 0 ? e(CommUIWhatsNew, {
        entries: whatsNewEntries,
        onDone: () => setWhatsNewEntries([])
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
      let lastKey = "";
      const stopTick = startTick((s) => {
        updateMeterContext(s.entities);
        updateKillContext(s.entities);
        const key = `${snapshotUiKey(s)}|${isMeterInCombat() ? 1 : 0}`;
        if (key === lastKey) return;
        lastKey = key;
        setSnap(s);
      });
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
