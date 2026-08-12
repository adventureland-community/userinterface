/**
 * AL meter mockup — static fixtures + pure helpers (DATA-MODEL aligned).
 */
window.MockFixtures = (() => {
  const CLASS_COLORS = {
    warrior: "#f07f2f",
    mage: "#3e6eed",
    priest: "#eb4d82",
    ranger: "#8a512b",
    rogue: "#44b75c",
    paladin: "#a3b4b9",
  };

  /** Bar mode cycle order (single source of truth). */
  const METRIC_ORDER = [
    "damage",
    "heal",
    "taken",
    "healing_required",
    "avoidance",
    "base",
    "blast",
    "burn",
    "cleave",
    "pdps",
    "rolling",
    "coop",
  ];

  const CHANNELS = [
    { id: "damage", label: "Damage Done", color: "#E53935" },
    { id: "heal", label: "Healing Done", color: "#43A047" },
    { id: "taken", label: "Damage Taken", color: "#FB8C00" },
    { id: "healing_required", label: "Healing Required", color: "#8E24AA" },
    { id: "avoidance", label: "Avoidance", color: "#78909C" },
    { id: "base", label: "Base", color: "#6D1B7B" },
    { id: "blast", label: "Blast", color: "#FB8C00" },
    { id: "burn", label: "Burn", color: "#FDD835" },
    { id: "cleave", label: "Cleave", color: "#8D6E63" },
    { id: "pdps", label: "PDPS", color: "#29B6F6" },
    { id: "rolling", label: "Hit DPS (10s)", color: "#EF5350" },
    { id: "coop", label: "Coop V1", color: "#26A69A" },
  ];

  const ABSOLUTE_METRICS = new Set(["pdps", "rolling", "coop", "avoidance"]);
  const SEG_SEC = 134;

  function outcome(hit, crit, tick, miss, evade, avoid, splash) {
    const mk = (count, avg, spread = 0.15) => {
      if (!count) return { min: 0, max: 0, sum: 0, count: 0, avg: 0 };
      return {
        min: Math.round(avg * (1 - spread)),
        max: Math.round(avg * (1 + spread)),
        sum: count * avg,
        count,
        avg,
      };
    };
    return {
      hit: mk(hit.n, hit.avg),
      crit: mk(crit.n, crit.avg, 0.2),
      tick: mk(tick.n, tick.avg, 0.05),
      miss: mk(miss, 0, 0),
      evade: mk(evade, 0, 0),
      avoid: mk(avoid, 0, 0),
      splash: mk(splash.n, splash.avg),
    };
  }

  /** Magical ability keys (rest physical; taunt → pure). */
  const MAGICAL_KEYS = new Set(["burn", "cburst", "curse", "3shot", "partyheal", "heal"]);
  const PURE_KEYS = new Set(["taunt"]);

  function schoolOf(key) {
    if (PURE_KEYS.has(key)) return "pure";
    if (MAGICAL_KEYS.has(key)) return "magical";
    return "physical";
  }

  const PLAYERS = [
    {
      id: "p1",
      name: "Thmsn",
      ctype: "warrior",
      you: true,
      activity: 0.92,
      damage: 5_120_000,
      heal: 96_000,
      taken: 2_840_000,
      selfHeal: 210_000,
      healTaken: 1_920_000,
      pdps: 51000,
      rolling: 38800,
      coop: 0.82,
      deaths: 1,
      avoidance: { miss: 12, evade: 48, avoid: 9, hits: 220, mpAbsorb: 180000 },
      abilities: [
        { key: "cleave", label: "Cleave", letter: "C", color: "#8D6E63", damage: 1_040_000, heal: 0, splash: 0,
          outcomes: outcome({ n: 86, avg: 9800 }, { n: 14, avg: 19600 }, { n: 0, avg: 0 }, 3, 2, 0, { n: 0, avg: 0 }),
          targets: [{ id: "m1", name: "Spike", amount: 420000 }, { id: "m2", name: "Billie", amount: 310000 }, { id: "m3", name: "Tomb", amount: 310000 }] },
        { key: "attack", label: "Attack", letter: "A", color: "#90a4ae", damage: 1_520_000, heal: 0, splash: 0,
          outcomes: outcome({ n: 210, avg: 6200 }, { n: 28, avg: 12400 }, { n: 0, avg: 0 }, 8, 5, 1, { n: 0, avg: 0 }),
          targets: [{ id: "m1", name: "Spike", amount: 900000 }, { id: "m2", name: "Billie", amount: 620000 }] },
        { key: "burn", label: "Burn", letter: "B", color: "#FDD835", damage: 1_140_000, heal: 0, splash: 0,
          outcomes: outcome({ n: 0, avg: 0 }, { n: 0, avg: 0 }, { n: 190, avg: 6000 }, 0, 0, 0, { n: 0, avg: 0 }),
          targets: [{ id: "m1", name: "Spike", amount: 700000 }, { id: "m3", name: "Tomb", amount: 440000 }] },
        { key: "agitate", label: "Agitate", letter: "G", color: "#ef6c00", damage: 680000, heal: 0, splash: 420000,
          outcomes: outcome({ n: 22, avg: 12000 }, { n: 4, avg: 24000 }, { n: 0, avg: 0 }, 1, 0, 0, { n: 40, avg: 10500 }),
          targets: [{ id: "m1", name: "Spike", amount: 280000 }, { id: "m2", name: "Billie", amount: 200000 }, { id: "m4", name: "Cryptling", amount: 200000 }] },
        { key: "taunt", label: "Taunt", letter: "T", color: "#78909c", damage: 0, heal: 0, splash: 0,
          outcomes: outcome({ n: 12, avg: 0 }, { n: 0, avg: 0 }, { n: 0, avg: 0 }, 0, 0, 0, { n: 0, avg: 0 }),
          targets: [] },
      ],
      targetsAll: [
        { id: "m1", name: "Spike", amount: 2_100_000 },
        { id: "m2", name: "Billie", amount: 1_400_000 },
        { id: "m3", name: "Tomb", amount: 980_000 },
        { id: "m4", name: "Cryptling", amount: 640_000 },
      ],
    },
    {
      id: "p2",
      name: "Vett",
      ctype: "priest",
      you: false,
      activity: 0.88,
      damage: 1_180_000,
      heal: 4_960_000,
      taken: 1_120_000,
      selfHeal: 420_000,
      healTaken: 980_000,
      pdps: 9000,
      rolling: 7200,
      coop: 0.91,
      deaths: 0,
      avoidance: { miss: 4, evade: 11, avoid: 2, hits: 90, mpAbsorb: 40000 },
      abilities: [
        { key: "partyheal", label: "Party Heal", letter: "P", color: "#43A047", damage: 0, heal: 2_800_000, splash: 0,
          outcomes: outcome({ n: 48, avg: 52000 }, { n: 6, avg: 90000 }, { n: 0, avg: 0 }, 0, 0, 0, { n: 0, avg: 0 }),
          targets: [{ id: "p1", name: "Thmsn", amount: 1_200_000 }, { id: "p3", name: "Ash", amount: 900000 }, { id: "p4", name: "Kite", amount: 700000 }] },
        { key: "heal", label: "Heal", letter: "H", color: "#66bb6a", damage: 0, heal: 1_400_000, splash: 0,
          outcomes: outcome({ n: 62, avg: 20000 }, { n: 8, avg: 38000 }, { n: 0, avg: 0 }, 0, 0, 0, { n: 0, avg: 0 }),
          targets: [{ id: "p1", name: "Thmsn", amount: 900000 }, { id: "p5", name: "Sneak", amount: 500000 }] },
        { key: "curse", label: "Curse", letter: "U", color: "#ab47bc", damage: 520000, heal: 0, splash: 0,
          outcomes: outcome({ n: 18, avg: 24000 }, { n: 3, avg: 42000 }, { n: 0, avg: 0 }, 1, 0, 0, { n: 0, avg: 0 }),
          targets: [{ id: "m1", name: "Spike", amount: 520000 }] },
        { key: "attack", label: "Attack", letter: "A", color: "#90a4ae", damage: 660000, heal: 0, splash: 0,
          outcomes: outcome({ n: 95, avg: 6200 }, { n: 10, avg: 11000 }, { n: 0, avg: 0 }, 4, 2, 0, { n: 0, avg: 0 }),
          targets: [{ id: "m2", name: "Billie", amount: 660000 }] },
      ],
      targetsAll: [
        { id: "p1", name: "Thmsn", amount: 2_100_000 },
        { id: "p3", name: "Ash", amount: 1_200_000 },
        { id: "p4", name: "Kite", amount: 900000 },
        { id: "m1", name: "Spike", amount: 760000 },
      ],
    },
    {
      id: "p3",
      name: "Ash",
      ctype: "mage",
      you: false,
      activity: 0.95,
      damage: 3_760_000,
      heal: 0,
      taken: 1_560_000,
      selfHeal: 0,
      healTaken: 1_450_000,
      pdps: 44000,
      rolling: 29500,
      coop: 0.77,
      deaths: 1,
      avoidance: { miss: 6, evade: 8, avoid: 14, hits: 140, mpAbsorb: 220000 },
      abilities: [
        { key: "3shot", label: "3shot", letter: "3", color: "#42a5f5", damage: 980000, heal: 0, splash: 0,
          outcomes: outcome({ n: 40, avg: 21000 }, { n: 7, avg: 40000 }, { n: 0, avg: 0 }, 2, 1, 0, { n: 0, avg: 0 }),
          targets: [{ id: "m1", name: "Spike", amount: 500000 }, { id: "m2", name: "Billie", amount: 480000 }] },
        { key: "cburst", label: "Cburst", letter: "X", color: "#7e57c2", damage: 860000, heal: 0, splash: 0,
          outcomes: outcome({ n: 28, avg: 26000 }, { n: 5, avg: 50000 }, { n: 0, avg: 0 }, 1, 0, 1, { n: 0, avg: 0 }),
          targets: [{ id: "m1", name: "Spike", amount: 860000 }] },
        { key: "burn", label: "Burn", letter: "B", color: "#FDD835", damage: 980000, heal: 0, splash: 0,
          outcomes: outcome({ n: 0, avg: 0 }, { n: 0, avg: 0 }, { n: 160, avg: 6125 }, 0, 0, 0, { n: 0, avg: 0 }),
          targets: [{ id: "m1", name: "Spike", amount: 600000 }, { id: "m3", name: "Tomb", amount: 380000 }] },
        { key: "attack", label: "Attack", letter: "A", color: "#90a4ae", damage: 540000, heal: 0, splash: 400000,
          outcomes: outcome({ n: 70, avg: 5500 }, { n: 9, avg: 11000 }, { n: 0, avg: 0 }, 3, 2, 0, { n: 36, avg: 11100 }),
          targets: [{ id: "m2", name: "Billie", amount: 540000 }] },
      ],
      targetsAll: [
        { id: "m1", name: "Spike", amount: 1_960_000 },
        { id: "m2", name: "Billie", amount: 1_020_000 },
        { id: "m3", name: "Tomb", amount: 780_000 },
      ],
    },
    {
      id: "p4",
      name: "Kite",
      ctype: "ranger",
      you: false,
      activity: 0.8,
      damage: 2_220_000,
      heal: 72_000,
      taken: 980_000,
      selfHeal: 40_000,
      healTaken: 720_000,
      pdps: 22000,
      rolling: 20100,
      coop: 0.7,
      deaths: 0,
      avoidance: { miss: 9, evade: 15, avoid: 6, hits: 110, mpAbsorb: 0 },
      abilities: [
        { key: "supershot", label: "Supershot", letter: "S", color: "#8d6e63", damage: 720000, heal: 0, splash: 0,
          outcomes: outcome({ n: 24, avg: 26000 }, { n: 4, avg: 48000 }, { n: 0, avg: 0 }, 1, 0, 0, { n: 0, avg: 0 }),
          targets: [{ id: "m1", name: "Spike", amount: 720000 }] },
        { key: "5shot", label: "5shot", letter: "5", color: "#a1887f", damage: 640000, heal: 0, splash: 0,
          outcomes: outcome({ n: 18, avg: 30000 }, { n: 3, avg: 56000 }, { n: 0, avg: 0 }, 0, 1, 0, { n: 0, avg: 0 }),
          targets: [{ id: "m2", name: "Billie", amount: 400000 }, { id: "m4", name: "Cryptling", amount: 240000 }] },
        { key: "attack", label: "Attack", letter: "A", color: "#90a4ae", damage: 860000, heal: 0, splash: 0,
          outcomes: outcome({ n: 140, avg: 5400 }, { n: 16, avg: 10000 }, { n: 0, avg: 0 }, 5, 3, 0, { n: 0, avg: 0 }),
          targets: [{ id: "m1", name: "Spike", amount: 500000 }, { id: "m2", name: "Billie", amount: 360000 }] },
      ],
      targetsAll: [
        { id: "m1", name: "Spike", amount: 1_220_000 },
        { id: "m2", name: "Billie", amount: 760_000 },
        { id: "m4", name: "Cryptling", amount: 240_000 },
      ],
    },
    {
      id: "p5",
      name: "Sneak",
      ctype: "rogue",
      you: false,
      activity: 0.86,
      damage: 1_840_000,
      heal: 0,
      taken: 1_340_000,
      selfHeal: 0,
      healTaken: 890_000,
      pdps: 19000,
      rolling: 14100,
      coop: 0.65,
      deaths: 1,
      avoidance: { miss: 18, evade: 52, avoid: 22, hits: 160, mpAbsorb: 0 },
      abilities: [
        { key: "quickstab", label: "Quickstab", letter: "Q", color: "#66bb6a", damage: 520000, heal: 0, splash: 0,
          outcomes: outcome({ n: 55, avg: 8000 }, { n: 12, avg: 15000 }, { n: 0, avg: 0 }, 2, 4, 1, { n: 0, avg: 0 }),
          targets: [{ id: "m1", name: "Spike", amount: 520000 }] },
        { key: "cleave", label: "Cleave", letter: "C", color: "#8D6E63", damage: 450000, heal: 0, splash: 0,
          outcomes: outcome({ n: 40, avg: 9000 }, { n: 8, avg: 17000 }, { n: 0, avg: 0 }, 1, 2, 0, { n: 0, avg: 0 }),
          targets: [{ id: "m2", name: "Billie", amount: 250000 }, { id: "m4", name: "Cryptling", amount: 200000 }] },
        { key: "attack", label: "Attack", letter: "A", color: "#90a4ae", damage: 870000, heal: 0, splash: 0,
          outcomes: outcome({ n: 160, avg: 4800 }, { n: 20, avg: 9000 }, { n: 0, avg: 0 }, 6, 8, 2, { n: 0, avg: 0 }),
          targets: [{ id: "m1", name: "Spike", amount: 500000 }, { id: "m2", name: "Billie", amount: 370000 }] },
      ],
      targetsAll: [
        { id: "m1", name: "Spike", amount: 1_020_000 },
        { id: "m2", name: "Billie", amount: 620_000 },
        { id: "m4", name: "Cryptling", amount: 200_000 },
      ],
    },
  ];

  function makeSeries(seed, peak) {
    const pts = [];
    for (let i = 0; i < 30; i++) {
      const wave = Math.sin((i + seed) / 3.2) * 0.25 + 1;
      const noise = ((seed * 17 + i * 13) % 10) / 40;
      pts.push(Math.max(0, Math.round(peak * (0.35 + 0.45 * wave + noise))));
    }
    return pts;
  }

  /** Derive channels from abilities (blast = splashDamage, burn/cleave by key). */
  function deriveChannels(p) {
    let burn = 0;
    let cleave = 0;
    let blast = 0;
    for (const a of p.abilities) {
      if (a.key === "burn") burn += a.damage;
      if (a.key === "cleave") cleave += a.damage;
      blast += a.splash || 0;
    }
    const base = Math.max(0, p.damage - burn - cleave - blast);
    return { base, blast, burn, cleave };
  }

  for (const [i, p] of PLAYERS.entries()) {
    p.series = {
      dps: makeSeries(i + 1, p.damage / SEG_SEC),
      hps: makeSeries(i + 3, (p.heal || 1) / SEG_SEC),
      taken: makeSeries(i + 5, p.taken / SEG_SEC),
    };
    p.healingRequired = Math.max(0, p.healTaken - p.selfHeal);
    p.channels = deriveChannels(p);
    for (const a of p.abilities) a.school = schoolOf(a.key);
  }

  // Party affiliation + vision (mock of partyKey / visible from partyCombat).
  // Thmsn/Vett/Ash/Kite = your party; Sneak = outsider. Kite off-screen.
  const PARTY_META = {
    p1: { partyKey: "party:us", visible: true },
    p2: { partyKey: "party:us", visible: true },
    p3: { partyKey: "party:us", visible: true },
    p4: { partyKey: "party:us", visible: false },
    p5: { partyKey: "party:other", visible: true },
  };
  for (const p of PLAYERS) {
    const m = PARTY_META[p.id] || { partyKey: `solo:${p.id}`, visible: true };
    p.partyKey = m.partyKey;
    p.visible = m.visible;
  }

  const DEATHS = [
    {
      id: "d1",
      playerId: "p1",
      name: "Thmsn",
      ctype: "warrior",
      atFightSec: 51,
      killers: [
        { key: "tomb_slam", label: "Tomb Slam", amount: 420000 },
        { key: "attack", label: "Attack", amount: 180000 },
      ],
      hpSeries: [100, 92, 88, 70, 55, 40, 22, 8, 0],
      events: [
        { t: -8.2, kind: "heal", amount: 42000, ability: "Party Heal", abilityKey: "partyheal", source: "Vett", hp: 88 },
        { t: -7.1, kind: "dmg", amount: 28000, ability: "Attack", abilityKey: "attack", source: "Spike", hp: 82 },
        { t: -5.4, kind: "dmg", amount: 61000, ability: "Cleave", abilityKey: "cleave", source: "Billie", hp: 70 },
        { t: -4.0, kind: "heal", amount: 18000, ability: "Heal", abilityKey: "heal", source: "Vett", hp: 74 },
        { t: -3.1, kind: "dmg", amount: 95000, ability: "Burn", abilityKey: "burn", source: "Tomb", hp: 55 },
        { t: -2.0, kind: "dmg", amount: 120000, ability: "Tomb Slam", abilityKey: "tomb_slam", source: "Tomb", hp: 40 },
        { t: -1.2, kind: "dmg", amount: 88000, ability: "Tomb Slam", abilityKey: "tomb_slam", source: "Tomb", hp: 22 },
        { t: -0.6, kind: "heal", amount: 12000, ability: "Party Heal", abilityKey: "partyheal", source: "Vett", hp: 25 },
        { t: -0.3, kind: "dmg", amount: 210000, ability: "Tomb Slam", abilityKey: "tomb_slam", source: "Tomb", hp: 8 },
        { t: -0.0, kind: "dmg", amount: 95000, ability: "Attack", abilityKey: "attack", source: "Spike", hp: 0 },
      ],
    },
    {
      id: "d2",
      playerId: "p3",
      name: "Ash",
      ctype: "mage",
      atFightSec: 98,
      killers: [
        { key: "spike_bite", label: "Spike Bite", amount: 310000 },
        { key: "burn", label: "Burn", amount: 90000 },
      ],
      hpSeries: [100, 95, 80, 60, 35, 15, 0],
      events: [
        { t: -5.9, kind: "dmg", amount: 44000, ability: "Attack", abilityKey: "attack", source: "Spike", hp: 90 },
        { t: -4.2, kind: "dmg", amount: 72000, ability: "Spike Bite", abilityKey: "spike_bite", source: "Spike", hp: 72 },
        { t: -3.0, kind: "heal", amount: 35000, ability: "Party Heal", abilityKey: "partyheal", source: "Vett", hp: 80 },
        { t: -2.1, kind: "dmg", amount: 110000, ability: "Spike Bite", abilityKey: "spike_bite", source: "Spike", hp: 52 },
        { t: -1.0, kind: "dmg", amount: 98000, ability: "Burn", abilityKey: "burn", source: "Tomb", hp: 28 },
        { t: -0.4, kind: "dmg", amount: 140000, ability: "Spike Bite", abilityKey: "spike_bite", source: "Spike", hp: 8 },
        { t: -0.0, kind: "dmg", amount: 60000, ability: "Attack", abilityKey: "attack", source: "Spike", hp: 0 },
      ],
    },
    {
      id: "d3",
      playerId: "p5",
      name: "Sneak",
      ctype: "rogue",
      atFightSec: 121,
      killers: [{ key: "swarm", label: "Cryptling Swarm", amount: 260000 }],
      hpSeries: [100, 70, 40, 10, 0],
      events: [
        { t: -3.5, kind: "dmg", amount: 80000, ability: "Attack", abilityKey: "attack", source: "Cryptling", hp: 70 },
        { t: -2.0, kind: "dmg", amount: 95000, ability: "Cryptling Swarm", abilityKey: "swarm", source: "Cryptling", hp: 40 },
        { t: -0.8, kind: "dmg", amount: 120000, ability: "Cryptling Swarm", abilityKey: "swarm", source: "Cryptling", hp: 10 },
        { t: -0.0, kind: "dmg", amount: 90000, ability: "Attack", abilityKey: "attack", source: "Cryptling", hp: 0 },
      ],
    },
  ];

  const INCOMING_SPELLS = [
    { key: "tomb_slam", label: "Tomb Slam", amount: 2_100_000, color: "#c62828", iconKey: "tomb_slam" },
    { key: "attack", label: "Attack", amount: 1_800_000, color: "#90a4ae", iconKey: "attack" },
    { key: "spike_bite", label: "Spike Bite", amount: 980_000, color: "#ef6c00", iconKey: "spike_bite" },
    { key: "burn", label: "Burn", amount: 740_000, color: "#FDD835", iconKey: "burn" },
    { key: "swarm", label: "Cryptling Swarm", amount: 520_000, color: "#8d6e63", iconKey: "swarm" },
  ];

  /** Incoming outcome×school matrix (fixture — would come from taken hits in real engine). */
  const INCOMING_MATRIX = {
    p1: { Hit: [90, 40, 4], Crit: [22, 12, 0], Miss: [8, 2, 0], Evade: [48, 0, 0], Splash: [10, 6, 0] },
    p2: { Hit: [40, 20, 2], Crit: [8, 6, 0], Miss: [2, 1, 0], Evade: [11, 0, 0], Splash: [2, 4, 0] },
    p3: { Hit: [55, 50, 0], Crit: [14, 18, 0], Miss: [4, 3, 0], Evade: [8, 0, 0], Splash: [6, 10, 0] },
    p4: { Hit: [48, 22, 0], Crit: [10, 8, 0], Miss: [5, 2, 0], Evade: [15, 0, 0], Splash: [3, 2, 0] },
    p5: { Hit: [60, 18, 0], Crit: [16, 6, 0], Miss: [10, 2, 0], Evade: [52, 0, 0], Splash: [4, 1, 0] },
  };

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function scalePlayers(src, scale, durationSec) {
    const out = clone(src);
    for (const [i, p] of out.entries()) {
      p.damage = Math.round(p.damage * scale);
      p.heal = Math.round(p.heal * scale);
      p.taken = Math.round(p.taken * scale);
      p.selfHeal = Math.round(p.selfHeal * scale);
      p.healTaken = Math.round(p.healTaken * scale);
      p.pdps = Math.round(p.pdps * scale);
      p.rolling = Math.round(p.rolling * scale);
      p.healingRequired = Math.max(0, p.healTaken - p.selfHeal);
      for (const a of p.abilities) {
        a.damage = Math.round(a.damage * scale);
        a.heal = Math.round((a.heal || 0) * scale);
        a.splash = Math.round((a.splash || 0) * scale);
        for (const t of a.targets || []) t.amount = Math.round(t.amount * scale);
      }
      for (const t of p.targetsAll || []) t.amount = Math.round(t.amount * scale);
      p.channels = deriveChannels(p);
      p.series = {
        dps: makeSeries(i + 1, p.damage / durationSec),
        hps: makeSeries(i + 3, (p.heal || 1) / durationSec),
        taken: makeSeries(i + 5, p.taken / durationSec),
      };
    }
    return out;
  }

  function scaleIncoming(src, scale) {
    return clone(src).map((s) => ({ ...s, amount: Math.round(s.amount * scale) }));
  }

  /** Condition / CD intervals for Time Line (mock of sampled entity.s + action casts). */
  function buildTimeline(players, durationSec, seed) {
    const COND = {
      cursed: { label: "Cursed", kind: "debuff", color: "#ab47bc" },
      burned: { label: "Burned", kind: "debuff", color: "#ef6c00" },
      poisoned: { label: "Poisoned", kind: "debuff", color: "#66bb6a" },
      weakness: { label: "Weakness", kind: "debuff", color: "#78909c" },
      mluck: { label: "Mass Luck", kind: "buff", color: "#42a5f5" },
      hardshell: { label: "Hard Shell", kind: "buff", color: "#8d6e63" },
      warcry: { label: "War Cry", kind: "cd", color: "#f07f2f" },
      partyheal: { label: "Party Heal", kind: "cd", color: "#eb4d82" },
      cburst: { label: "Cburst", kind: "cd", color: "#3e6eed" },
      "5shot": { label: "5shot", kind: "cd", color: "#8a512b" },
      invis: { label: "Invis", kind: "cd", color: "#44b75c" },
    };
    const lanes = [];
    for (const [pi, p] of players.entries()) {
      const intervals = [];
      const push = (key, t0, t1) => {
        const meta = COND[key];
        if (!meta) return;
        intervals.push({
          key,
          label: meta.label,
          kind: meta.kind,
          color: meta.color,
          t0: Math.max(0, t0),
          t1: Math.min(durationSec, t1),
        });
      };
      push("cursed", 8 + pi * 3 + seed, 28 + pi * 4 + seed);
      push("burned", 20 + pi * 5, 55 + pi * 2);
      if (pi % 2 === 0) push("poisoned", 40, Math.min(durationSec, 70));
      if (pi === 0) push("weakness", 12, 45);
      push("mluck", 0, Math.min(durationSec, 90));
      if (p.ctype === "warrior") {
        push("hardshell", 30, 48);
        push("warcry", 15, 18);
        push("warcry", 75, 78);
      }
      if (p.ctype === "priest") {
        push("partyheal", 10, 12);
        push("partyheal", 50, 52);
        push("partyheal", 95, 97);
      }
      if (p.ctype === "mage") {
        push("cburst", 22, 24);
        push("cburst", 60, 62);
      }
      if (p.ctype === "ranger") push("5shot", 18, 20);
      if (p.ctype === "rogue") push("invis", 5, 8);
      lanes.push({
        actorId: p.id,
        name: p.name,
        ctype: p.ctype,
        color: CLASS_COLORS[p.ctype],
        intervals,
      });
    }
    return lanes;
  }

  function conditionUptime(lanes, durationSec, actorId) {
    const lane = lanes.find((l) => l.actorId === actorId);
    if (!lane) return [];
    const byKey = {};
    for (const iv of lane.intervals) {
      if (!byKey[iv.key]) byKey[iv.key] = { ...iv, ms: 0, apps: 0 };
      byKey[iv.key].ms += Math.max(0, iv.t1 - iv.t0);
      byKey[iv.key].apps += 1;
    }
    return Object.values(byKey)
      .map((r) => ({
        key: r.key,
        label: r.label,
        kind: r.kind,
        color: r.color,
        apps: r.apps,
        uptime: durationSec ? r.ms / durationSec : 0,
      }))
      .sort((a, b) => b.uptime - a.uptime);
  }

  function deathConditionStrip(lanes, death, windowSec = 15) {
    if (!death) return [];
    const tEnd = death.atFightSec;
    const t0 = Math.max(0, tEnd - windowSec);
    const lane = lanes.find((l) => l.actorId === death.playerId);
    if (!lane) return [];
    return lane.intervals
      .filter((iv) => iv.t1 >= t0 && iv.t0 <= tEnd)
      .map((iv) => ({
        ...iv,
        t0: Math.max(iv.t0, t0) - tEnd,
        t1: Math.min(iv.t1, tEnd) - tEnd,
      }));
  }

  return {
    CLASS_COLORS,
    METRIC_ORDER,
    CHANNELS,
    ABSOLUTE_METRICS,
    SEG_SEC,
    outcome,
    schoolOf,
    MAGICAL_KEYS,
    PURE_KEYS,
    PLAYERS,
    DEATHS,
    INCOMING_SPELLS,
    INCOMING_MATRIX,
    makeSeries,
    deriveChannels,
    clone,
    scalePlayers,
    scaleIncoming,
    buildTimeline,
    conditionUptime,
    deathConditionStrip,
  };
})();
