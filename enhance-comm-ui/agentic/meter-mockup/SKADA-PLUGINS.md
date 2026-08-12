# Skada plugins relevant to AL meters

CurseForge links the user flagged:

| Plugin | URL | Keep for AL? |
| ------ | --- | ------------ |
| **Skada for Tanks** | https://www.curseforge.com/wow/addons/skada-for-tanks | Yes — tank-oriented **modes**, not a separate engine |
| **Skada Graphs** | https://www.curseforge.com/wow/addons/skada-graphs | Yes — **display systems** (presentation), not new data |

Related (often installed with tanks): [Skada Avoidance and Mitigation](https://www.wowace.com/projects/skadaavoidancemitigation).

## Skada for Tanks

Adds:

1. **Healing Required** mode — healing taken from *other* players (= Healing Taken − self-healing). Lower is better (easier to heal). Damage Taken alone is a bad tank score when self-heal/lifesteal is high.
2. **Damage Taken extras** — for each damaging ability on the tank, count which mitigation buffs were up (Barkskin, SI, …).

### AL mapping

| WoW | AL |
| --- | --- |
| Healing Required | `healTakenFromOthers = healTaken − selfHeal − (optional lifesteal)` → meter query `players` metric `healing_required` or `kind: "tank"` |
| Damage Taken | Already `players` metric `taken` |
| Buffs-on-hit | Optional later: sample entity conditions (`s.*`) at hit time for known mitigation skills; **v1 skip** full cooldown matrix |
| Threat | Keep existing **ThreatTable** (not part of Skada for Tanks) |

Caveats from the addon author still apply: more boss-uptime ⇒ more Healing Required; don’t rank tanks blindly across fights.

## Skada Avoidance & Mitigation (related)

Top-level: % of attacks avoided or mitigated. Drill: Miss / Dodge / Parry / Block / Absorb…

### AL mapping (stronger than WoW CLEU)

| WoW | AL hit flags |
| --- | --- |
| Miss / Dodge / Parry | `miss` / `evade` / `avoid` (native on wire) |
| Absorb | `mp_damage` (mana shield) — partial analogue |
| Reflect | `reflect` announce + rebound |
| Armor / CD DR | Not on hit packet (same CLEU gap) |

Query: `kind: "avoidance"` — rates from incoming hits; ignore burn ticks for avoidance % (plugin ignores DoTs).

## Skada Graphs

Adds **display systems** to any Skada window (not new modes):

1. **Historic line** ≈ Recount Realtime — last ~30 samples **per row** of the *current mode*; transient (no permanent store beyond display). RealTime vs Total toggle.
2. **Pie** — simple pie of current mode totals.

Key design lesson: **presentation ≠ query**. Same `MeterQuery` (`players` damage) can render as bars, multi-line realtime, or pie.

### AL mapping

| Skada Graphs | AL |
| ------------ | --- |
| Historic line per row | `presentation: "realtime"` on any ranked query — multi-series area/line for visible actors (not only single-actor Realtime panel) |
| Pie display | `presentation: "pie"` on players/abilities/channel queries |
| No permanent graph store | Rolling sample buffer only while panel visible / in combat (match plugin) |

Recount **Compare Graph** (stack/integrate over full fight) stays a separate heavier panel; Skada Graphs is the lightweight “live spark for current mode.”
