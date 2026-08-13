/**
 * Fear / courage simulation — locks the pre-merge path: courage pools + typed
 * aggro for self, party, and soft sync. Packet `fear` is never trusted.
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  aggroByDamageFromMobs,
  estimateFearFromAggro,
  estimatePlayerFear,
} from "../src/lib/fear";
import { estimateCouragePools } from "../src/lib/courage";
import {
  fearLevelFromValue,
  getControlStates,
  getFearState,
} from "../src/lib/controlState";
import type { EntityLike } from "../src/host/globals";

type Win = typeof globalThis & {
  window: Record<string, unknown>;
};

function installHost(opts?: {
  character?: EntityLike | null;
  G?: Record<string, unknown>;
}) {
  const g = globalThis as Win;
  g.window = {
    G: opts?.G ?? {
      classes: {
        rogue: { courage: 2, mcourage: 2, pcourage: 2, stats: {}, lstats: {} },
        warrior: {
          courage: 5,
          mcourage: 2,
          pcourage: 2,
          stats: { str: 20 },
          lstats: { str: 1 },
        },
      },
      items: {},
      monsters: {
        goo: { damage_type: "physical" },
        bee: { damage_type: "physical" },
        boar: { damage_type: "physical" },
        franky: { damage_type: "magical" },
      },
      conditions: {},
      sets: {},
    },
    character: opts?.character === undefined ? null : opts.character,
    calculate_item_properties: () => ({}),
    map: { map_name: "main" },
  };
}

function softPlayer(partial: Partial<EntityLike> & { id: string }): EntityLike {
  return {
    player: true,
    type: "character",
    ctype: "rogue",
    level: 1,
    name: partial.id,
    ...partial,
  };
}

function mob(
  id: string,
  target: string,
  opts?: { mtype?: string; damage_type?: string },
): EntityLike {
  return {
    id,
    type: "monster",
    mtype: opts?.mtype || "goo",
    target,
    damage_type: opts?.damage_type,
  };
}

describe("estimateFearFromAggro", () => {
  it("returns raw overflow max(0, typed_targets - pool) like server player.fear", () => {
    // These are numeric fear values, not label tiers.
    // courage 2 + 4 physical → fear 2; warrior courage 5 → 0; 5 magical → 3.
    assert.equal(
      estimateFearFromAggro(
        { courage: 2, mcourage: 2, pcourage: 2 },
        { physical: 4, magical: 0, pure: 0 },
      ),
      2,
    );
    assert.equal(
      estimateFearFromAggro(
        { courage: 5, mcourage: 2, pcourage: 2 },
        { physical: 4, magical: 0, pure: 0 },
      ),
      0,
    );
    assert.equal(
      estimateFearFromAggro(
        { courage: 2, mcourage: 2, pcourage: 2 },
        { physical: 0, magical: 5, pure: 0 },
      ),
      3,
    );
  });
});

describe("aggroByDamageFromMobs", () => {
  beforeEach(() => installHost());
  afterEach(() => {
    delete (globalThis as Win).window;
  });

  it("splits by live damage_type, else G.monsters, else physical", () => {
    const counts = aggroByDamageFromMobs([
      mob("1", "test", { damage_type: "physical" }),
      mob("2", "test", { mtype: "franky" }),
      mob("3", "test", { mtype: "unknown_mtype" }),
      mob("4", "test", { damage_type: "pure" }),
    ]);
    assert.deepEqual(counts, { physical: 2, magical: 1, pure: 1 });
  });
});

describe("fearLevelFromValue", () => {
  it("maps server combat tiers (attack ×0.6 / ×0.4 / ×0.2)", () => {
    assert.equal(fearLevelFromValue(0), null);
    assert.equal(fearLevelFromValue(1), "scared");
    assert.equal(fearLevelFromValue(2), "terrified");
    assert.equal(fearLevelFromValue(3), "petrified");
    assert.equal(fearLevelFromValue(4), "petrified");
  });
});

describe("estimateCouragePools (soft sync)", () => {
  beforeEach(() => installHost());
  afterEach(() => {
    delete (globalThis as Win).window;
  });

  it("returns class base courage with empty slots (pre-merge /comm path)", () => {
    const pools = estimateCouragePools(softPlayer({ id: "test" }));
    assert.ok(pools);
    assert.equal(pools!.courage, 2);
    assert.equal(pools!.mcourage, 2);
    assert.equal(pools!.pcourage, 2);
  });

  it("returns null without ctype or calculate_item_properties", () => {
    assert.equal(
      estimateCouragePools(softPlayer({ id: "x", ctype: undefined })),
      null,
    );
    (globalThis as Win).window.calculate_item_properties = undefined;
    assert.equal(estimateCouragePools(softPlayer({ id: "test" })), null);
  });
});

describe("estimatePlayerFear (pre-merge soft-sync simulation)", () => {
  beforeEach(() => installHost());
  afterEach(() => {
    delete (globalThis as Win).window;
  });

  it("simulates terrified for rogue with 4 physical goos (no packet fear)", () => {
    const player = softPlayer({ id: "test" });
    // Soft stranger sync omits fear — must not rely on this.
    delete (player as { fear?: number }).fear;
    const goos = [
      mob("a", "test"),
      mob("b", "test"),
      mob("c", "test"),
      mob("d", "test"),
    ];
    assert.equal(estimatePlayerFear(player, goos), 2);
  });

  it("returns 0 when aggro is within courage", () => {
    const player = softPlayer({ id: "tank", ctype: "warrior" });
    assert.equal(
      estimatePlayerFear(player, [mob("a", "tank"), mob("b", "tank")]),
      0,
    );
  });

  it("ignores stale / connect-time fear on entities (always simulate)", () => {
    const player = softPlayer({ id: "stranger", fear: 9 });
    assert.equal(
      estimatePlayerFear(player, [mob("a", "stranger"), mob("b", "stranger")]),
      0,
    );
  });
});

describe("estimatePlayerFear (self + party — same sim as soft)", () => {
  afterEach(() => {
    delete (globalThis as Win).window;
  });

  it("simulates self from courage+aggro, ignores character.fear", () => {
    const self = softPlayer({
      id: "test",
      fear: 9,
      courage: 99,
      mcourage: 99,
      pcourage: 99,
    });
    installHost({ character: self });
    const goos = [
      mob("a", "test"),
      mob("b", "test"),
      mob("c", "test"),
      mob("d", "test"),
    ];
    // Class base courage 2 → overflow 2; packet fear and live pools unused.
    assert.equal(estimatePlayerFear(self, goos), 2);
    assert.equal(estimatePlayerFear(self, []), 0);
  });

  it("simulates a party mate the same way", () => {
    const self = softPlayer({ id: "leader", ctype: "warrior", me: true });
    const mate = softPlayer({ id: "mate", ctype: "rogue", player: true });
    installHost({ character: self });
    const goos = [
      mob("a", "mate"),
      mob("b", "mate"),
      mob("c", "mate"),
      mob("d", "mate"),
    ];
    assert.equal(estimatePlayerFear(mate, goos), 2);
  });

  it("simulates local me character (no player:true flag)", () => {
    const self = softPlayer({
      id: "test",
      me: true,
      player: undefined,
    });
    delete (self as { player?: boolean }).player;
    installHost({ character: self });
    const goos = [
      mob("a", "test"),
      mob("b", "test"),
      mob("c", "test"),
      mob("d", "test"),
    ];
    assert.equal(estimatePlayerFear(self, goos), 2);
    const fear = getFearState(self, goos);
    assert.ok(fear);
    assert.equal(fear!.level, "terrified");
  });
});

describe("getFearState / getControlStates", () => {
  beforeEach(() => installHost());
  afterEach(() => {
    delete (globalThis as Win).window;
  });

  it("emits Terrified badge state for soft-sync + goos", () => {
    const player = softPlayer({ id: "test" });
    const goos = [
      mob("a", "test"),
      mob("b", "test"),
      mob("c", "test"),
      mob("d", "test"),
    ];
    const fear = getFearState(player, goos);
    assert.ok(fear);
    assert.equal(fear!.kind, "fear");
    assert.equal(fear!.level, "terrified");
    assert.equal(fear!.label, "Terrified");
    assert.equal(fear!.fear, 2);

    const states = getControlStates(player, goos);
    assert.equal(states.length, 1);
    assert.equal(states[0].kind, "fear");
  });

  it("emits Petrified at fear 3 (server worst attack tier)", () => {
    const player = softPlayer({ id: "test" });
    // courage 2 + 5 physical → overflow 3 → petrified (not old client >3 gate)
    const goos = [
      mob("a", "test"),
      mob("b", "test"),
      mob("c", "test"),
      mob("d", "test"),
      mob("e", "test"),
    ];
    const fear = getFearState(player, goos);
    assert.ok(fear);
    assert.equal(fear!.fear, 3);
    assert.equal(fear!.level, "petrified");
    assert.equal(fear!.label, "Petrified");
  });

  it("returns null without focusable player or without overflow", () => {
    assert.equal(getFearState(null, []), null);
    assert.equal(
      getFearState({ id: "m", type: "monster" } as EntityLike, []),
      null,
    );
    const player = softPlayer({ id: "test" });
    assert.equal(getFearState(player, [mob("a", "test")]), null);
  });
});
