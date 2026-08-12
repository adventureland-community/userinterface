# AL combat event research → meter schema

Primary source: `adventureland_mongodb` server (`node/server.js`). Client remap in `adventureland/js/game.js`. Comm UI: `hub.ts` / `partyCombat.ts`. Full explore notes folded from combat-event research (2026-08).

## Wire events (vision-scoped)

`xy_emit` delivers only to players/observers in vision of the emit point (attacker force-included). **Off-screen party hits never arrive** — unlike WoW raid-wide CLEU.

| Event | When | Key fields | Meter use |
| ----- | ---- | ---------- | --------- |
| `action` | `commence_attack` — cast / projectile start | `attacker`, `target`, `type`/`source`, `pid`, `eta`, `projectile`, intended `damage`/`heal` | Cast timeline; join to hit via `pid`. **hub ignores today** |
| `hit` | `complete_attack` + burn DoT ticks + miss/evade/reflect-announce | see below | Primary DPS/HPS feed |
| `death` | `remove_monster` | `id`, `luckm`, `points?` (coop) | Kill list / loot luck — not DPS |

## `hit` fields (ability = `source`)

| Field | Meaning | Notes |
| ----- | ------- | ----- |
| `hid` / `id` | Attacker / target | Remapped to `actor`/`target` on client + hub |
| **`source`** | Skill id (`G.skills` key) or `"burn"` | **AbilityKey** |
| `damage` / `heal` | Final amounts | |
| `damage_type` | `physical` \| `magical` \| `pure` | Parsed in hub, unused in partyCombat agg |
| `splash` | Secondary target of **explosion** (phys) / **blast** (magic) only | **Not** cleave. Primary blast/explosion target is NOT splash |
| `aoe` | Skill was `cleave` / `shadowstrike` | Cleave channel uses `source === "cleave"`, not splash |
| `unintentional` | Non-primary target (splash **or** stacked) | Prefer `splash` vs `stacked` for AoE tables |
| `stacked` / `mobbing` | Same-tile multi / intensity | |
| `crit` | **Multiplier** (e.g. `2`, `2.5`) — not boolean | Count as crit when present/truthy |
| `kill` | Target HP ≤ 0 after this hit | |
| `lifesteal` / `manasteal` / `dreturn` | Steal / thorns amounts | |
| `reflect` | **Announce-only** (`damage: 0`) before rebound `action` | Separate from landed reflect damage |
| `evade` / `miss` / `avoid` | Fail paths (`damage: 0`) | |
| `mp_damage` | Mana shield absorb | |
| `pid` / `projectile` | Join to prior `action` | |

### Burn DoT

Periodic `hit` with `source: "burn"`. Attribution inconsistency:
- Monster ticks: `hid: ref.f` (**name**)
- Player ticks: `hid: ref.fid` (**id**)

Normalize via entity index in meterEngine.

### Common `source` values

`attack`, `heal`, `cleave`, `shadowstrike`, `3shot`, `5shot`, `supershot`, `piercingshot`, `burst`, `cburst`, `partyheal`, `selfheal`, `curse`, `taunt`, `quickpunch`, `quickstab`, `smash`, `mentalburst`, `poisonarrow`, `fireball`, `frostball`, `purify`, … + `"burn"`.

## Ability identity

```ts
type AbilityKey = string; // hit.source normalized

function abilityKey(ev): AbilityKey {
  if (ev.heal && (!ev.source || ev.source === "attack")) return "heal";
  if (!ev.source || ev.source === "attack") return "attack";
  return ev.source; // cleave | burn | 3shot | …
}
// splash: SAME AbilityKey as parent; add to splashDamage
// Blast channel = sum(splashDamage), NOT a fake ability named "blast"
```

## Store shape (Skada-like + AL channels)

```
Segment (12s idle break like partyCombat; observeId / partyKey / visible scope)
  └─ Actor
       ├─ totals (damage, heal, taken, LS, MPS, DR, reflectAnnounce)
       ├─ abilities[AbilityKey] → hits, crits, misses/evades/avoids, kills,
       │                          damage, heal, splashDamage, byDamageType,
       │                          targets[]
       └─ targets[id] → damage, hits
```

| Channel (derived) | Rule |
| ----------------- | ---- |
| Base | damage − burn − splash − cleave (or non-tagged ability sum) |
| Blast | `splashDamage` totals (explosion/blast secondaries only) |
| Burn | `abilities.get("burn")` |
| Cleave | `abilities.get("cleave")` (and optionally `shadowstrike`) |
| DR / Reflect | defender-side when attacker not player (partyCombat semantics) |

Channels remain first-class **query modes**; primary drill UI is still players → abilities → targets.

## Hub gaps to close

| Keep / count | Why |
| ------------ | --- |
| `crit` (as multiplier) | Crit % / crit damage |
| `kill`, `aoe`, `stacked`, `unintentional` | KB, cleave UX, AoE tables |
| `miss` / `evade` / `avoid` counts | Miss rates |
| `pid` + optional `onAction` | Cast→land latency |
| Normalize burn `hid` | Name vs id |
| Separate reflect announce vs landed | Already partially in partyCombat |
| Death `points` / `luckm` | Coop / luck — not DPS |
| Shadow HP for overkill | Not on wire |

## AL improvements vs WoW Details

1. Ability id on wire (`source`) — no CLEU parse
2. Explicit `damage_type`, `splash` vs `aoe`
3. Observe + partyKey + visible scopes
4. Native channel rollups (blast ≠ cleave)
5. Optional `action.pid` → `hit.pid` latency
6. PDPS / coop snapshots alongside segment data

## Gaps / caveats

1. No guaranteed overkill on packet (shadow HP)
2. Docs list poison/freeze/stun on hit — **server rarely sets them on `def`**
3. Vision gate — incomplete party meters when members leave vision
4. `crit` is multiplier, easy to mishandle as bool
5. Monster numeric ids vs player names

## Key file refs

| Path | Topic |
| ---- | ----- |
| `adventureland_mongodb/node/server.js` | commence/`action` ~2905; complete/`hit` ~3291; burn mon ~12535; burn ply ~13147; death ~11863 |
| `…/node/server_functions.js` | `xy_emit` ~3127 |
| `…/design/skills.js` | Skill id catalog |
| `…/js/game.js` | `action` ~2791; `hit` ~2832; `death` ~2936 |
| `enhance-comm-ui/src/sockets/hub.ts` | DamageEvent / KillEvent |
| `…/src/meters/partyCombat.ts` | Current channel session |
| `…/src/meters/combatMeter.ts` | Rolling 10s Hit DPS |
| `…/src/kpi/sessionKills.ts` | Death attribution |
