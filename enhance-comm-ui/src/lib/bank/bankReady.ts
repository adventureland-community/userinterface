/**
 * Bank “ready” analysis — compound combines + craft batches from vault stock.
 * Mirrors al-data-explorer bankAnalysis: ready vs almost (1-short / partial).
 */

import type { BankAggItem } from "./bankTypes";

export type CombineReadyRow = {
  name: string;
  level: number;
  p?: string | null;
  displayName: string;
  have: number;
  /** Bank stock plus outputs fed from lower-level combines. */
  effectiveHave: number;
  /** Copies at this level coming from the previous combine step. */
  cascadeIn: number;
  combineReadyCount: number;
  potentialCombineCount: number;
  missing: number;
  outputLevel: number;
};

export type CombineAnalysis = {
  ready: CombineReadyRow[];
  potential: CombineReadyRow[];
};

export type CraftIngredientStatus = {
  name: string;
  need: number;
  have: number;
  missing: number;
  level?: number;
  title?: string;
};

export type CraftReadyRow = {
  output: string;
  outputName: string;
  cost: number;
  craftableCount: number;
  /** Batches possible if missing reagents were acquired. */
  potentialCraftCount?: number;
  ingredients: CraftIngredientStatus[];
};

export type CraftAnalysis = {
  ready: CraftReadyRow[];
  potential: CraftReadyRow[];
};

/** @deprecated Prefer CombineReadyRow.combineReadyCount */
export type CompoundReadyRow = CombineReadyRow & { readyCount: number };

function stockQty(
  items: BankAggItem[],
  name: string,
  level?: number,
  title?: string,
): number {
  let q = 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.name !== name) continue;
    if (level != null && (it.level != null ? it.level : 0) !== level) continue;
    if (title != null && String(it.p || "") !== title) continue;
    q += it.q;
  }
  return q;
}

export function computeCombineCounts(have: number): {
  readyCount: number;
  potentialCount: number;
  missing: number;
} {
  const readyCount = Math.floor(have / 3);
  const rem = have % 3;
  const potentialCount = rem === 2 ? readyCount + 1 : readyCount;
  const missing = rem === 2 ? 1 : 0;
  return { readyCount, potentialCount, missing };
}

function combineGroupKey(name: string, p?: string | null): string {
  return name + "\0" + (p || "");
}

function displayNameFor(
  name: string,
  level: number,
  p: string | null,
  G: any,
): string {
  const def = G && G.items && G.items[name];
  let label = def && def.name ? String(def.name) : name;
  if (p) {
    const title =
      G && G.titles && G.titles[p] && G.titles[p].title
        ? String(G.titles[p].title)
        : p.charAt(0).toUpperCase() + p.slice(1);
    label = title + " " + label;
  }
  if (level > 0) label += " +" + level;
  return label;
}

function maxCompoundLevel(def: any): number {
  if (def && typeof def.compound === "object" && def.compound != null) {
    // compound may be a stats object; stock caps at +7 for rings/amulets
  }
  return 7;
}

/** Group per-level combine steps into consecutive chains for one compound line. */
export function groupCombineSteps(steps: CombineReadyRow[]): CombineReadyRow[][] {
  if (!steps.length) return [];
  const byGroup: Record<string, CombineReadyRow[]> = Object.create(null);
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const key = combineGroupKey(step.name, step.p);
    if (!byGroup[key]) byGroup[key] = [];
    byGroup[key].push(step);
  }
  const chains: CombineReadyRow[][] = [];
  const keys = Object.keys(byGroup);
  for (let i = 0; i < keys.length; i++) {
    const groupSteps = byGroup[keys[i]].slice();
    groupSteps.sort((a, b) => a.level - b.level);
    let chain: CombineReadyRow[] = [];
    for (let j = 0; j < groupSteps.length; j++) {
      const step = groupSteps[j];
      if (!chain.length || step.level === chain[chain.length - 1].level + 1) {
        chain.push(step);
      } else {
        chains.push(chain);
        chain = [step];
      }
    }
    if (chain.length) chains.push(chain);
  }
  chains.sort((a, b) => {
    const finalA = a[a.length - 1];
    const finalB = b[b.length - 1];
    const countA =
      finalA.combineReadyCount > 0
        ? finalA.combineReadyCount
        : finalA.potentialCombineCount;
    const countB =
      finalB.combineReadyCount > 0
        ? finalB.combineReadyCount
        : finalB.potentialCombineCount;
    return (
      countB - countA ||
      finalA.displayName.localeCompare(finalB.displayName)
    );
  });
  return chains;
}

/** Compound items with enough copies (incl. cascade) — ready + almost. */
export function analyzeCompoundCombines(
  items: BankAggItem[],
  G: any,
): CombineAnalysis {
  const gItems = (G && G.items) || {};
  const groups: Record<
    string,
    {
      name: string;
      p: string | null;
      maxLevel: number;
      byLevel: Record<number, number>;
    }
  > = Object.create(null);

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const def = gItems[it.name];
    if (!def || !def.compound) continue;
    const level = it.level != null ? Number(it.level) : 0;
    const maxLevel = maxCompoundLevel(def);
    if (level >= maxLevel) continue;
    const p = it.p != null ? String(it.p) : null;
    const key = combineGroupKey(it.name, p);
    if (!groups[key]) {
      groups[key] = { name: it.name, p, maxLevel, byLevel: Object.create(null) };
    }
    groups[key].byLevel[level] = (groups[key].byLevel[level] || 0) + it.q;
  }

  const ready: CombineReadyRow[] = [];
  const potential: CombineReadyRow[] = [];
  const keys = Object.keys(groups);
  for (let i = 0; i < keys.length; i++) {
    const g = groups[keys[i]];
    let carryReady = 0;
    let carryPotential = 0;
    for (let level = 0; level < g.maxLevel; level++) {
      const bankHave = g.byLevel[level] || 0;
      const effectiveReady = bankHave + carryReady;
      const effectivePotential = bankHave + carryPotential;
      if (effectiveReady < 2 && effectivePotential < 2) {
        carryReady = 0;
        carryPotential = 0;
        continue;
      }
      const readyStats = computeCombineCounts(effectiveReady);
      const potentialStats = computeCombineCounts(effectivePotential);
      const displayName = displayNameFor(g.name, level, g.p, G);
      const base = {
        name: g.name,
        level,
        p: g.p,
        displayName,
        have: bankHave,
        outputLevel: level + 1,
      };
      if (readyStats.readyCount > 0) {
        ready.push({
          ...base,
          effectiveHave: effectiveReady,
          cascadeIn: carryReady,
          combineReadyCount: readyStats.readyCount,
          potentialCombineCount: readyStats.potentialCount,
          missing: readyStats.missing,
        });
      }
      if (potentialStats.potentialCount > readyStats.readyCount) {
        potential.push({
          ...base,
          effectiveHave: effectivePotential,
          cascadeIn: carryPotential,
          combineReadyCount: readyStats.readyCount,
          potentialCombineCount: potentialStats.potentialCount,
          missing: potentialStats.missing,
        });
      }
      carryReady = readyStats.readyCount;
      carryPotential = potentialStats.potentialCount;
    }
  }

  const byCombineCount = (a: CombineReadyRow, b: CombineReadyRow) =>
    b.combineReadyCount - a.combineReadyCount ||
    b.potentialCombineCount - a.potentialCombineCount ||
    a.level - b.level ||
    a.displayName.localeCompare(b.displayName);

  ready.sort(byCombineCount);
  potential.sort((a, b) => {
    if (b.potentialCombineCount !== a.potentialCombineCount) {
      return b.potentialCombineCount - a.potentialCombineCount;
    }
    if (a.missing !== b.missing) return a.missing - b.missing;
    return a.level - b.level || a.displayName.localeCompare(b.displayName);
  });

  return { ready, potential };
}

/** Ready-only combine rows (legacy shape with readyCount alias). */
export function analyzeCompoundReady(
  items: BankAggItem[],
  G: any,
): CompoundReadyRow[] {
  const { ready } = analyzeCompoundCombines(items, G);
  const out: CompoundReadyRow[] = [];
  for (let i = 0; i < ready.length; i++) {
    const r = ready[i];
    out.push({ ...r, readyCount: r.combineReadyCount });
  }
  return out;
}

type CraftRow = [number, string, (number | string)?];

function parseCraftRow(row: unknown): {
  need: number;
  name: string;
  level?: number;
  title?: string;
} | null {
  if (!Array.isArray(row) || row.length < 2) return null;
  const need = Number(row[0]);
  const name = String(row[1] || "");
  if (!(need > 0) || !name) return null;
  const third = row[2];
  if (typeof third === "number") return { need, name, level: third };
  if (typeof third === "string") return { need, name, title: third };
  return { need, name };
}

export function computePotentialCraftCount(
  ingredients: Array<{ need: number; have: number }>,
): number {
  if (!ingredients.length) return 0;
  let max = 0;
  for (let i = 0; i < ingredients.length; i++) {
    const n = Math.floor(ingredients[i].have / ingredients[i].need);
    if (n > max) max = n;
  }
  return max;
}

export function computeMissingForCraftCount(
  ingredients: CraftIngredientStatus[],
  craftCount: number,
): CraftIngredientStatus[] {
  const out: CraftIngredientStatus[] = [];
  for (let i = 0; i < ingredients.length; i++) {
    const ing = ingredients[i];
    out.push({
      ...ing,
      missing: Math.max(0, craftCount * ing.need - ing.have),
    });
  }
  return out;
}

/** Craft recipes — ready + almost (partial stock / one short). */
export function analyzeCraftRecipes(
  items: BankAggItem[],
  G: any,
): CraftAnalysis {
  const craftMap = G && G.craft;
  if (!craftMap || typeof craftMap !== "object") {
    return { ready: [], potential: [] };
  }
  const gItems = (G && G.items) || {};
  const ready: CraftReadyRow[] = [];
  const potential: CraftReadyRow[] = [];
  const outputs = Object.keys(craftMap);
  for (let i = 0; i < outputs.length; i++) {
    const output = outputs[i];
    const recipe = craftMap[output];
    if (!recipe || !Array.isArray(recipe.items) || !recipe.items.length) continue;
    const ingredients: CraftIngredientStatus[] = [];
    let ok = true;
    for (let j = 0; j < recipe.items.length; j++) {
      const parsed = parseCraftRow(recipe.items[j] as CraftRow);
      if (!parsed) {
        ok = false;
        break;
      }
      const have = stockQty(items, parsed.name, parsed.level, parsed.title);
      ingredients.push({
        name: parsed.name,
        need: parsed.need,
        have,
        missing: Math.max(0, parsed.need - have),
        level: parsed.level,
        title: parsed.title,
      });
    }
    if (!ok || !ingredients.length) continue;

    let craftable = Infinity;
    for (let j = 0; j < ingredients.length; j++) {
      craftable = Math.min(
        craftable,
        Math.floor(ingredients[j].have / ingredients[j].need),
      );
    }
    if (!Number.isFinite(craftable)) craftable = 0;

    const potentialCraftCount = computePotentialCraftCount(ingredients);
    let hasPartial = false;
    for (let j = 0; j < ingredients.length; j++) {
      if (ingredients[j].have > 0) {
        hasPartial = true;
        break;
      }
    }
    const def = gItems[output];
    const outputName = def && def.name ? String(def.name) : output;
    const cost = typeof recipe.cost === "number" ? recipe.cost : 0;

    if (craftable > 0) {
      ready.push({
        output,
        outputName,
        cost,
        craftableCount: craftable,
        ingredients,
      });
    }
    if (potentialCraftCount > craftable && hasPartial) {
      potential.push({
        output,
        outputName,
        cost,
        craftableCount: craftable,
        potentialCraftCount,
        ingredients: computeMissingForCraftCount(
          ingredients,
          potentialCraftCount,
        ),
      });
    }
  }

  ready.sort(
    (a, b) =>
      b.craftableCount - a.craftableCount ||
      a.outputName.localeCompare(b.outputName),
  );
  potential.sort((a, b) => {
    const readyBoostA = a.craftableCount > 0 ? 1 : 0;
    const readyBoostB = b.craftableCount > 0 ? 1 : 0;
    if (readyBoostA !== readyBoostB) return readyBoostB - readyBoostA;
    const potentialA = a.potentialCraftCount ?? 0;
    const potentialB = b.potentialCraftCount ?? 0;
    if (potentialA !== potentialB) return potentialB - potentialA;
    let missingTypesA = 0;
    let missingTypesB = 0;
    let totalMissingA = 0;
    let totalMissingB = 0;
    for (let i = 0; i < a.ingredients.length; i++) {
      if (a.ingredients[i].missing > 0) missingTypesA += 1;
      totalMissingA += a.ingredients[i].missing;
    }
    for (let i = 0; i < b.ingredients.length; i++) {
      if (b.ingredients[i].missing > 0) missingTypesB += 1;
      totalMissingB += b.ingredients[i].missing;
    }
    if (missingTypesA !== missingTypesB) return missingTypesA - missingTypesB;
    if (totalMissingA !== totalMissingB) return totalMissingA - totalMissingB;
    return a.outputName.localeCompare(b.outputName);
  });

  return { ready, potential };
}

/** Ready-only craft rows (legacy). */
export function analyzeCraftReady(items: BankAggItem[], G: any): CraftReadyRow[] {
  return analyzeCraftRecipes(items, G).ready;
}
