import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findEnclosingCall,
  inspectCompletionContext,
  kindForParam,
  listCommandCompletions,
  parseObjectArgKeys,
  parseRunnerApiIndex,
  parseRunnerFunctionNames,
  snapshotCommandCatalogs,
  type CommandCatalogSnapshot,
  type RunnerApiIndex,
} from "../src/lib/commandCompletions";

const sampleRunner = `
function proxy(p) {}
function loot() {}
async function transport(map, spawn) {}
function use_skill(name, target, extra_arg, timeout_ms) {}
function smart_move(destination, on_done) {}
function buy(name, quantity) {}
function sell(num, quantity) {}
function find_npc(npc_id) {}
function join(event) {}
function stop(action, second) {}
function is_on_cooldown(skill) {}
function get_nearest_monster(args) {
	//args:
	// max_att - max attack
	// min_xp - min XP
	// target: Only return monsters that target this name
	// type: Type of the monsters
	if (args.type && current.mtype != args.type) continue;
	if (args.min_xp && current.xp < args.min_xp) continue;
	if (args.target && current.target != args.target) continue;
}
`;

function fakeCatalog(): CommandCatalogSnapshot {
  const G = {
    skills: { town: { name: "Town" }, attack: { name: "Attack" } },
    items: { hpot0: { name: "HP Potion" }, mpot0: { name: "MP Potion" } },
    monsters: { goo: { name: "Goo" }, bee: { name: "Bee" } },
    npcs: { fancypots: { name: "Potion Lady" } },
    maps: { main: { name: "Main" }, winterland: { name: "Winterland" } },
    events: { snowman: { name: "Snowman" } },
  };
  return snapshotCommandCatalogs(G as any);
}

function sampleIndex(): RunnerApiIndex {
  return parseRunnerApiIndex(sampleRunner);
}

describe("parseRunnerFunctionNames", () => {
  it("scrapes top-level function names from runner source", () => {
    const names = parseRunnerFunctionNames(sampleRunner);
    assert.ok(names.indexOf("loot") >= 0);
    assert.ok(names.indexOf("buy") >= 0);
    assert.ok(names.indexOf("get_nearest_monster") >= 0);
  });
});

describe("parseRunnerApiIndex", () => {
  it("captures params and //args object keys", () => {
    const index = sampleIndex();
    assert.deepEqual(index.sigs.buy.params, ["name", "quantity"]);
    assert.deepEqual(index.sigs.use_skill.params, [
      "name",
      "target",
      "extra_arg",
      "timeout_ms",
    ]);
    assert.deepEqual(index.sigs.smart_move.params, [
      "destination",
      "on_done",
    ]);
    const keys = index.sigs.get_nearest_monster.objectKeys.map((k) => k.key);
    assert.ok(keys.indexOf("type") >= 0);
    assert.ok(keys.indexOf("max_att") >= 0);
    assert.ok(keys.indexOf("min_xp") >= 0);
  });
});

describe("parseObjectArgKeys", () => {
  it("reads //args comment lines", () => {
    const keys = parseObjectArgKeys(
      "//args:\n// max_att - max attack\n// type: monsters\n",
    );
    assert.equal(keys[0]?.key, "max_att");
    assert.equal(keys[0]?.detail, "max attack");
    assert.equal(keys[1]?.key, "type");
  });
});

describe("kindForParam", () => {
  it("maps buy name → item and use_skill name → skill", () => {
    assert.equal(kindForParam("buy", "name"), "item");
    assert.equal(kindForParam("use_skill", "name"), "skill");
    assert.equal(kindForParam("buy", "quantity"), "none");
    assert.equal(kindForParam("smart_move", "destination"), "mapish");
    assert.equal(kindForParam("find_npc", "npc_id"), "npc");
    assert.equal(kindForParam("is_on_cooldown", "skill"), "skill");
    assert.equal(kindForParam("pm", "name"), "none");
  });
});

describe("findEnclosingCall", () => {
  it("tracks argument index across commas", () => {
    const src = "buy('hpot0', ";
    const site = findEnclosingCall(src, src.length);
    assert.equal(site?.name, "buy");
    assert.equal(site?.argIndex, 1);
  });

  it("ignores commas inside objects", () => {
    const src = "get_nearest_monster({ type: 'goo', ";
    const site = findEnclosingCall(src, src.length);
    assert.equal(site?.name, "get_nearest_monster");
    assert.equal(site?.argIndex, 0);
  });
});

describe("inspectCompletionContext", () => {
  const index = sampleIndex();

  it("detects api identifier prefix", () => {
    const ctx = inspectCompletionContext("loo", 3, index);
    assert.equal(ctx.kind, "api");
    assert.equal(ctx.prefix, "loo");
  });

  it("detects use_skill string args via signature", () => {
    const src = "use_skill('to";
    const ctx = inspectCompletionContext(src, src.length, index);
    assert.equal(ctx.kind, "skill");
    assert.equal(ctx.inString, true);
    assert.equal(ctx.paramName, "name");
  });

  it("detects buy after open paren", () => {
    const src = "buy(";
    const ctx = inspectCompletionContext(src, src.length, index);
    assert.equal(ctx.kind, "item");
    assert.equal(ctx.wantQuoted, true);
  });

  it("skips buy quantity arg", () => {
    const src = "buy('hpot0', ";
    const ctx = inspectCompletionContext(src, src.length, index);
    assert.equal(ctx.kind, "none");
  });

  it("detects smart_move destinations", () => {
    const src = "smart_move('";
    const ctx = inspectCompletionContext(src, src.length, index);
    assert.equal(ctx.kind, "mapish");
    assert.equal(ctx.inString, true);
  });

  it("offers object props inside get_nearest_monster", () => {
    const src = "get_nearest_monster({ ";
    const ctx = inspectCompletionContext(src, src.length, index);
    assert.equal(ctx.kind, "prop");
    assert.equal(ctx.wantColon, true);
  });

  it("detects type: value as monster", () => {
    const src = "get_nearest_monster({ type: ";
    const ctx = inspectCompletionContext(src, src.length, index);
    assert.equal(ctx.kind, "monster");
    assert.equal(ctx.wantQuoted, true);
  });
});

describe("listCommandCompletions", () => {
  const catalog = fakeCatalog();
  const index = sampleIndex();

  it("completes runner APIs from scraped names", () => {
    const list = listCommandCompletions(
      { value: "loo", cursor: 3 },
      { catalog, apiIndex: index },
    );
    assert.ok(list.some((x) => x.label === "loot" && x.kind === "api"));
  });

  it("completes skills inside use_skill", () => {
    const src = "use_skill('to";
    const list = listCommandCompletions(
      { value: src, cursor: src.length },
      { catalog, apiIndex: index },
    );
    assert.equal(list[0]?.label, "town");
    assert.equal(list[0]?.text, "town");
  });

  it("quotes item keys when inserting after buy(", () => {
    const src = "buy(";
    const list = listCommandCompletions(
      { value: src, cursor: src.length },
      { catalog, apiIndex: index },
    );
    const hit = list.find((x) => x.label === "hpot0");
    assert.ok(hit);
    assert.equal(hit!.text, "'hpot0'");
    assert.equal(hit!.kind, "item");
  });

  it("returns nothing for quantity arg", () => {
    const src = "buy('hpot0', ";
    const list = listCommandCompletions(
      { value: src, cursor: src.length },
      { catalog, apiIndex: index },
    );
    assert.equal(list.length, 0);
  });

  it("offers maps/monsters/npcs for smart_move", () => {
    const src = "smart_move('";
    const list = listCommandCompletions(
      { value: src, cursor: src.length },
      { catalog, apiIndex: index },
    );
    const kinds = new Set(list.map((x) => x.kind));
    assert.ok(kinds.has("shortcut"));
    assert.ok(kinds.has("map") || kinds.has("monster") || kinds.has("npc"));
  });

  it("ranks shorter prefix hits first (type over target for t)", () => {
    const list = listCommandCompletions(
      {
        value: "get_nearest_monster({ t",
        cursor: "get_nearest_monster({ t".length,
      },
      { catalog, apiIndex: index },
    );
    assert.ok(list.length >= 2);
    assert.equal(list[0]?.label, "type");
    assert.ok(list.some((x) => x.label === "target"));
  });

  it("completes object props then monster type values", () => {
    const props = listCommandCompletions(
      {
        value: "get_nearest_monster({ t",
        cursor: "get_nearest_monster({ t".length,
      },
      { catalog, apiIndex: index },
    );
    assert.ok(props.some((x) => x.label === "type" && x.text === "type: "));

    const monsters = listCommandCompletions(
      {
        value: "get_nearest_monster({ type: '",
        cursor: "get_nearest_monster({ type: '".length,
      },
      { catalog, apiIndex: index },
    );
    assert.ok(monsters.some((x) => x.label === "goo"));
  });
});
