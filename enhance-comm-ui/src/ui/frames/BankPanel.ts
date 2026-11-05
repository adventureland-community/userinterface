/**
 * Account Bank panel — load_bank snapshot with market-style search.
 * Packs view mirrors al-data-explorer: all packs as 7×N slot boards.
 * Ready view mirrors explorer insights: Combine / Craft × Ready / Almost.
 */

import { getReact, e } from "../../host/react";
import {
  ensureBankSnapshot,
  hydrateBankCacheFromIdb,
  subscribeBankViewCue,
  type BankViewMode,
} from "../../host/bank";
import { scalePollMs } from "../../lib/perfPrefs";
import { detectViewportProfile } from "../../lib/viewport";
import { canEditObservedBag } from "../../host/gearObserved";
import {
  BANK_SLOT_ATTR,
  installBankTouchMenus,
} from "../chrome/bankTouchMenus";
import { showBankSlotContextMenu } from "./bankSlotContextMenu";
import {
  changeBadgeQuantity,
  changeCaption,
  changeQuantityColor,
  changeToneClass,
  compareBankSnapshots,
  filterBankChanges,
  formatBankChangeTip,
  formatBankSlotUsage,
  formatRefreshSummaryLine,
  type BankChangeFilter,
  type BankRefreshSummary,
} from "../../lib/bank/bankDiff";
import {
  aggregateBankItems,
  flattenBankSlots,
  groupBankByCategory,
  isOfficialBankPack,
  listBankPackKeys,
  packDisplayLabel,
  sortBankItems,
  SLOTS_PER_BANK_PACK,
  type BankSortMode,
} from "../../lib/bank/bankBrowse";
import {
  bankItemMatchesQuery,
  buildBankSearchSuggestions,
  filterBankItems,
  BANK_TRAILING_OPS,
} from "../../lib/bank/bankQuery";
import { itemStackIdentityKey } from "../../lib/itemInstanceData";
import {
  analyzeCompoundCombines,
  analyzeCraftRecipes,
  groupCombineSteps,
  type CombineReadyRow,
  type CraftReadyRow,
} from "../../lib/bank/bankReady";
import type {
  BankAggItem,
  BankItem,
  BankSnapshot,
} from "../../lib/bank/bankTypes";
import { formatRelativeAge } from "../../lib/format";
import { formatTradeGold } from "../../lib/tradeHelpers";
import { ItemInstance } from "../chrome/ItemInstance";
import { PanelExpandButton } from "../chrome/panelExpandControl";
import { installPeerPageGestures } from "../chrome/peerPageGestures";
import { usePhoneShellExpand } from "../chrome/usePhoneShellExpand";
import { QuerySearchField } from "../chrome/QuerySearchField";
import { stepPeerPage } from "../../lib/peerPages";
import { ensureBankPanelCss } from "./bankPanelCss";

export type BankPanelProps = {
  layoutEdit?: boolean;
  /** Restore saved frame size after leaving expand mode. */
  onFrameSizeRestore?: (size: { w: number; h: number }) => void;
  /** Phone swipe-down closes the bank panel. */
  onRequestClose?: () => void;
};

type ReadyKind = "combine" | "craft";
type ReadySection = "ready" | "almost";

const SORT_OPTIONS: Array<{ id: BankSortMode; label: string }> = [
  { id: "category", label: "Category" },
  { id: "quantity", label: "Quantity" },
  { id: "stack", label: "Stack" },
];

const BANK_VIEW_PAGES: Array<{ key: BankViewMode; label: string }> = [
  { key: "all", label: "All" },
  { key: "packs", label: "Packs" },
  { key: "types", label: "Types" },
  { key: "ready", label: "Ready" },
];
const BANK_VIEW_KEYS = BANK_VIEW_PAGES.map((p) => p.key);

type BankPhoneTab = "items" | "ready" | "almost";
const BANK_PHONE_TABS: Array<{ key: BankPhoneTab; label: string }> = [
  { key: "items", label: "Items" },
  { key: "ready", label: "Ready" },
  { key: "almost", label: "Almost" },
];
const BANK_PHONE_TAB_KEYS = BANK_PHONE_TABS.map((p) => p.key);

function bankPhoneTab(
  view: BankViewMode,
  readySection: ReadySection,
): BankPhoneTab {
  if (view !== "ready") return "items";
  return readySection === "almost" ? "almost" : "ready";
}

const MISSING_Q = "#ff6b5a";

function gItems(): Record<string, { type?: string; e?: unknown }> {
  const G = (window as any).G;
  return (G && G.items) || {};
}

function itemTypeOf(name: string): string {
  const def = gItems()[name];
  return def && def.type != null ? String(def.type) : "";
}

function matchCtx(): { itemType: (n: string) => string; G: any } {
  return { itemType: itemTypeOf, G: (window as any).G };
}

function showBankItem(item: {
  name: string;
  level?: number;
  q?: number;
  p?: string | null;
  data?: string;
}): void {
  const G = (window as any).G;
  const def = G && G.items && G.items[item.name];
  if (!def || typeof (window as any).render_item !== "function") return;
  const actual: Record<string, unknown> = {
    name: item.name,
    level: item.level,
    q: item.q,
    p: item.p,
  };
  if (item.data) actual.data = item.data;
  const html = (window as any).render_item("html", {
    item: def,
    actual,
    readonly: true,
  });
  if (typeof (window as any).show_modal === "function") {
    (window as any).show_modal(html, { wrap: false, hideinbackground: true });
  }
}

/** Left-click: inspect. Right-click: Withdraw / Inspect menu. */
function onBankSlotClick(
  _ev: unknown,
  _pack: string,
  _index: number,
  item: {
    name: string;
    level?: number;
    q?: number;
    p?: string | null;
    data?: string;
  },
): void {
  showBankItem(item);
}

function onBankSlotContextMenu(
  ev: {
    preventDefault?: () => void;
    stopPropagation?: () => void;
    clientX?: number;
    clientY?: number;
  },
  pack: string,
  index: number,
  item: {
    name: string;
    level?: number;
    q?: number;
    p?: string | null;
    data?: string;
  },
): void {
  if (ev.preventDefault) ev.preventDefault();
  if (ev.stopPropagation) ev.stopPropagation();
  showBankSlotContextMenu({
    clientX: ev.clientX != null ? ev.clientX : 40,
    clientY: ev.clientY != null ? ev.clientY : 40,
    pack,
    index,
    item,
    showItem: showBankItem,
  });
}

/** Accessible label — not a native `title` (ItemInstance cooltip owns hover). */
function bankSlotAria(
  itemName: string,
  packLabel: string,
  editable: boolean,
): string {
  if (!editable) {
    return itemName + " · " + packLabel + " · click to inspect";
  }
  return (
    itemName +
    " · " +
    packLabel +
    " · Right-click: Withdraw to bag · Click: inspect"
  );
}

function asAgg(
  item: BankItem,
  pack: string,
  index: number,
): BankAggItem {
  const q = item.q != null && Number.isFinite(item.q) ? Number(item.q) : 1;
  const data =
    typeof item.data === "string" && item.data.trim()
      ? item.data.trim()
      : undefined;
  return {
    key: itemStackIdentityKey({
      name: String(item.name),
      level: item.level,
      p: item.p,
      data,
    }),
    name: String(item.name),
    level: item.level,
    p: item.p != null ? String(item.p) : null,
    ...(data ? { data } : {}),
    q,
    locs: [{ pack, index, q }],
  };
}

function slotMatchesQuery(
  item: BankItem | null | undefined,
  pack: string,
  index: number,
  query: string,
): boolean {
  if (!item || !item.name || item.name === "placeholder") return false;
  if (!String(query || "").trim()) return true;
  return bankItemMatchesQuery(asAgg(item, pack, index), query, matchCtx());
}

function uniqueItemNames(items: BankAggItem[]): string[] {
  const seen: Record<string, boolean> = Object.create(null);
  const out: string[] = [];
  for (let i = 0; i < items.length; i++) {
    const n = items[i].name;
    if (seen[n]) continue;
    seen[n] = true;
    out.push(n);
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

function uniqueTypes(items: BankAggItem[]): string[] {
  const seen: Record<string, boolean> = Object.create(null);
  const out: string[] = [];
  for (let i = 0; i < items.length; i++) {
    const t = itemTypeOf(items[i].name);
    if (!t || seen[t]) continue;
    seen[t] = true;
    out.push(t);
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

function packFillClass(used: number, total: number): string {
  if (!(total > 0)) return "";
  const r = used / total;
  if (r >= 1) return " is-full";
  if (r >= 0.85) return " is-tight";
  return "";
}

function combineMatchesQuery(row: CombineReadyRow, query: string): boolean {
  if (!String(query || "").trim()) return true;
  const synth: BankAggItem = {
    key: row.name + "\0" + row.level + "\0" + (row.p || ""),
    name: row.name,
    level: row.level,
    p: row.p != null ? String(row.p) : null,
    q: row.have,
    locs: [{ pack: "items0", index: 0, q: row.have }],
  };
  return bankItemMatchesQuery(synth, query, matchCtx());
}

function craftMatchesQuery(row: CraftReadyRow, query: string): boolean {
  if (!String(query || "").trim()) return true;
  const ctx = matchCtx();
  const outItem: BankAggItem = {
    key: row.output,
    name: row.output,
    q: row.craftableCount,
    locs: [{ pack: "items0", index: 0, q: row.craftableCount }],
  };
  if (bankItemMatchesQuery(outItem, query, ctx)) return true;
  for (let i = 0; i < row.ingredients.length; i++) {
    const ing = row.ingredients[i];
    const synth: BankAggItem = {
      key: ing.name + "\0" + (ing.level ?? "") + "\0" + (ing.title || ""),
      name: ing.name,
      level: ing.level,
      p: ing.title != null ? String(ing.title) : null,
      q: ing.have,
      locs: [{ pack: "items0", index: 0, q: ing.have }],
    };
    if (bankItemMatchesQuery(synth, query, ctx)) return true;
  }
  return false;
}

function filterCombineList(
  rows: CombineReadyRow[],
  query: string,
): CombineReadyRow[] {
  if (!String(query || "").trim()) return rows;
  const out: CombineReadyRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (combineMatchesQuery(rows[i], query)) out.push(rows[i]);
  }
  return out;
}

function filterCraftList(rows: CraftReadyRow[], query: string): CraftReadyRow[] {
  if (!String(query || "").trim()) return rows;
  const out: CraftReadyRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (craftMatchesQuery(rows[i], query)) out.push(rows[i]);
  }
  return out;
}

function combineStepCount(
  combine: CombineReadyRow,
  mode: "ready" | "almost",
): number {
  return mode === "ready"
    ? combine.combineReadyCount
    : combine.potentialCombineCount;
}

function combineChainKey(chain: CombineReadyRow[]): string {
  const head = chain[0];
  const levels: string[] = [];
  for (let i = 0; i < chain.length; i++) levels.push(String(chain[i].level));
  return head.name + "-" + (head.p || "") + "-" + levels.join("-");
}

export function BankPanel(props: BankPanelProps): any {
  const React = getReact();
  ensureBankPanelCss();

  const [snap, setSnap] = React.useState(null as BankSnapshot | null);
  const [error, setError] = React.useState(null as string | null);
  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [view, setView] = React.useState("all" as BankViewMode);
  const [sort, setSort] = React.useState("category" as BankSortMode);
  const [readyKind, setReadyKind] = React.useState("combine" as ReadyKind);
  const [readySection, setReadySection] = React.useState(
    "ready" as ReadySection,
  );
  const [tick, setTick] = React.useState(0);
  const phoneUi = detectViewportProfile() === "phone";
  const [expanded, setExpanded] = React.useState(() => phoneUi);
  const [refreshSummary, setRefreshSummary] = React.useState(
    null as BankRefreshSummary | null,
  );
  const [changeFilter, setChangeFilter] = React.useState(
    "all" as BankChangeFilter,
  );
  const rootRef = React.useRef(null as HTMLDivElement | null);
  const headRef = React.useRef(null as HTMLDivElement | null);
  const bodyRef = React.useRef(null as HTMLDivElement | null);
  const snapRef = React.useRef(null as BankSnapshot | null);
  snapRef.current = snap;
  const viewRef = React.useRef(view);
  viewRef.current = view;
  const readySectionRef = React.useRef(readySection);
  readySectionRef.current = readySection;
  const setViewRef = React.useRef(setView);
  setViewRef.current = setView;
  const setReadySectionRef = React.useRef(setReadySection);
  setReadySectionRef.current = setReadySection;

  usePhoneShellExpand({
    panelId: "bank",
    shellClass: "ecu-bank-shell-expanded",
    rootRef,
    headRef,
    expanded,
    setExpanded,
    onFrameSizeRestore: props.onFrameSizeRestore,
    onRequestClose: props.onRequestClose,
  });

  React.useEffect(() => {
    if (detectViewportProfile() !== "phone") return;
    const panelEl = rootRef.current;
    if (!panelEl) return;
    return installPeerPageGestures(panelEl, {
      onPageSwipe: (dir) => {
        const tab = bankPhoneTab(viewRef.current, readySectionRef.current);
        const nextTab = stepPeerPage(BANK_PHONE_TAB_KEYS, tab, dir);
        if (!nextTab || nextTab === tab) return;
        if (nextTab === "items") {
          setViewRef.current("all");
          return;
        }
        setViewRef.current("ready");
        setReadySectionRef.current(
          nextTab === "almost" ? "almost" : "ready",
        );
      },
      allowStart: (target) => {
        if (!(target instanceof Element)) return false;
        if (target.closest("input, textarea, select, [contenteditable='true']")) {
          return false;
        }
        // Head / search / view+sort segs stay tappable; slots are buttons but
        // must still allow horizontal All↔Packs↔Types↔Ready swipes.
        if (target.closest(".BankPanel-head, .BankPanel-tools")) return false;
        if (target.closest(".BankPanel-seg")) return false;
        return !!(
          target.closest(".BankPanel-body") ||
          target.closest(".BankPanel-slots") ||
          target.closest(".BankPanel-grid") ||
          target.closest(".ecu-peer-page-dots")
        );
      },
    });
  }, [expanded]);

  const refresh = React.useCallback(
    (opts?: { force?: boolean; baseline?: BankSnapshot | null }) => {
      const force = !(opts && opts.force === false);
      setLoading(true);
      setError(null);
      const prev =
        opts && opts.baseline !== undefined
          ? opts.baseline
          : snapRef.current;
      ensureBankSnapshot({ force }).then((res) => {
        setLoading(false);
        if (res.ok === false) {
          setError(res.reason);
          return;
        }
        if (force && prev) {
          const summary = compareBankSnapshots(prev, res.snapshot);
          setRefreshSummary(summary.hasChanges ? summary : null);
        }
        setSnap(res.snapshot);
      });
    },
    [],
  );

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const fromIdb = await hydrateBankCacheFromIdb();
      if (cancelled) return;
      if (fromIdb) setSnap(fromIdb);
      // Overlay fixtures live in memory — soft refresh first so seeded packs
      // show even when hub login / load_bank is unavailable.
      const soft =
        !!(window as { __ecuOverlayPreview?: boolean }).__ecuOverlayPreview;
      refresh({
        force: !soft,
        baseline: fromIdb,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  React.useEffect(() => {
    const id = window.setInterval(
      () => setTick((n: number) => n + 1),
      scalePollMs(15000, "data"),
    );
    return () => window.clearInterval(id);
  }, []);

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return installBankTouchMenus(root, showBankItem);
  }, []);

  React.useEffect(() => {
    return subscribeBankViewCue((next: BankViewMode) => {
      setView(next);
    });
  }, []);

  const allAgg = React.useMemo(() => {
    if (!snap) return [] as BankAggItem[];
    return aggregateBankItems(flattenBankSlots(snap.packs));
  }, [snap]);

  const filtered = React.useMemo(() => {
    const list = filterBankItems(allAgg, query, matchCtx());
    return sortBankItems(list, sort, (window as any).G);
  }, [allAgg, query, sort]);

  const suggestions = React.useMemo(() => {
    const titles: string[] = [];
    const seen: Record<string, boolean> = Object.create(null);
    for (let i = 0; i < allAgg.length; i++) {
      const p = allAgg[i].p;
      if (!p || seen[p]) continue;
      seen[p] = true;
      titles.push(p);
    }
    titles.sort((a, b) => a.localeCompare(b));
    return buildBankSearchSuggestions(query, {
      itemNames: uniqueItemNames(allAgg),
      packKeys: snap ? listBankPackKeys(snap.packs) : [],
      types: uniqueTypes(allAgg),
      titles,
    });
  }, [query, allAgg, snap]);

  const packKeys = snap ? listBankPackKeys(snap.packs) : [];

  const typeGroups = React.useMemo(() => {
    if (view !== "types") return [];
    return groupBankByCategory(filtered, (window as any).G);
  }, [view, filtered]);

  const combineAnalysis = React.useMemo(() => {
    if (!snap) return { ready: [] as CombineReadyRow[], potential: [] as CombineReadyRow[] };
    const raw = analyzeCompoundCombines(allAgg, (window as any).G);
    return {
      ready: filterCombineList(raw.ready, query),
      potential: filterCombineList(raw.potential, query),
    };
  }, [snap, allAgg, query]);

  const craftAnalysis = React.useMemo(() => {
    if (!snap) return { ready: [] as CraftReadyRow[], potential: [] as CraftReadyRow[] };
    const raw = analyzeCraftRecipes(allAgg, (window as any).G);
    return {
      ready: filterCraftList(raw.ready, query),
      potential: filterCraftList(raw.potential, query),
    };
  }, [snap, allAgg, query]);

  const ageLabel =
    snap && snap.loadedAt ? formatRelativeAge(snap.loadedAt, Date.now()) : "";
  const slotUsage = snap ? formatBankSlotUsage(snap.packs) : null;
  void tick;

  const visibleChanges = React.useMemo(() => {
    if (!refreshSummary) return [] as BankRefreshSummary["changes"];
    return filterBankChanges(
      refreshSummary.changes,
      changeFilter,
      (window as any).G,
    );
  }, [refreshSummary, changeFilter]);

  const renderAggGrid = (items: BankAggItem[]) => {
    if (!items.length) {
      return e("div", { className: "BankPanel-empty" }, "No items match.");
    }
    const editable = canEditObservedBag();
    return e(
      "div",
      { className: "BankPanel-grid" },
      items.map((it: BankAggItem) => {
        const loc = it.locs[0];
        const packHint =
          it.locs.length > 1
            ? it.locs.length + " stacks"
            : packDisplayLabel(loc.pack);
        return e(
          "button",
          {
            type: "button",
            key: it.key + ":" + it.locs.map((l) => l.pack + l.index).join(","),
            className: "BankPanel-cell",
            [BANK_SLOT_ATTR]: "1",
            "data-pack": loc.pack,
            "data-index": String(loc.index),
            "data-name": it.name,
            "data-level": it.level != null ? String(it.level) : "",
            "data-q": it.q != null ? String(it.q) : "",
            "data-p": it.p != null ? String(it.p) : "",
            "data-data": it.data != null ? String(it.data) : "",
            "aria-label": bankSlotAria(it.name, packHint, editable),
            onClick: (ev: any) => {
              onBankSlotClick(ev, loc.pack, loc.index, it);
            },
            onContextMenu: (ev: any) => {
              onBankSlotContextMenu(ev, loc.pack, loc.index, it);
            },
          },
          e(ItemInstance, {
            name: it.name,
            level: it.level,
            q: it.q,
            p: it.p != null ? String(it.p) : undefined,
            data: it.data,
            actual: {
              name: it.name,
              level: it.level,
              q: it.q,
              p: it.p,
              ...(it.data ? { data: it.data } : {}),
            },
            size: 40,
          }),
        );
      }),
    );
  };

  const renderPacksBoard = () => {
    if (!snap) return null;
    const q = String(query || "").trim();
    const editable = canEditObservedBag();
    const boards: any[] = [];
    for (let i = 0; i < packKeys.length; i++) {
      const pack = packKeys[i];
      const raw = snap.packs[pack];
      const slots = Array.isArray(raw) ? raw : [];
      const official = isOfficialBankPack(pack);
      const total = official ? SLOTS_PER_BANK_PACK : Math.max(slots.length, 1);
      const padded: Array<BankItem | null> = [];
      for (let s = 0; s < total; s++) {
        const it = slots[s];
        padded.push(it && it.name && it.name !== "placeholder" ? it : null);
      }
      let used = 0;
      let anyMatch = !q;
      for (let s = 0; s < padded.length; s++) {
        if (padded[s]) used += 1;
        if (q && slotMatchesQuery(padded[s], pack, s, q)) anyMatch = true;
      }
      if (q && !anyMatch) continue;

      boards.push(
        e(
          "div",
          { key: pack, className: "BankPanel-pack" },
          e(
            "div",
            {
              className:
                "BankPanel-packTitle" + packFillClass(used, total),
            },
            packDisplayLabel(pack) +
              " · " +
              (official ? used + "/" + total : used + " items"),
          ),
          e(
            "div",
            { className: "BankPanel-packGrid" },
            padded.map((it, index) => {
              const match = slotMatchesQuery(it, pack, index, q);
              const dim = !!(q && it && !match);
              if (!it) {
                return e("div", {
                  key: pack + ":" + index,
                  className: "BankPanel-slot is-empty",
                });
              }
              return e(
                "button",
                {
                  type: "button",
                  key: pack + ":" + index,
                  className:
                    "BankPanel-slot" + (dim ? " is-dim" : ""),
                  [BANK_SLOT_ATTR]: "1",
                  "data-pack": pack,
                  "data-index": String(index),
                  "data-name": it.name,
                  "data-level": it.level != null ? String(it.level) : "",
                  "data-q": it.q != null ? String(it.q) : "",
                  "data-p": it.p != null ? String(it.p) : "",
                  "data-data": it.data != null ? String(it.data) : "",
                  "aria-label": bankSlotAria(
                    it.name,
                    packDisplayLabel(pack) + " · slot " + (index + 1),
                    editable,
                  ),
                  onClick: (ev: any) => {
                    onBankSlotClick(ev, pack, index, it);
                  },
                  onContextMenu: (ev: any) => {
                    onBankSlotContextMenu(ev, pack, index, it);
                  },
                },
                e(ItemInstance, {
                  name: it.name,
                  level: it.level,
                  q: it.q,
                  p: it.p != null ? String(it.p) : undefined,
                  data:
                    typeof it.data === "string" && it.data.trim()
                      ? it.data.trim()
                      : undefined,
                  actual: {
                    name: it.name,
                    level: it.level,
                    q: it.q,
                    p: it.p,
                    ...(typeof it.data === "string" && it.data.trim()
                      ? { data: it.data.trim() }
                      : {}),
                  },
                  size: 40,
                }),
              );
            }),
          ),
        ),
      );
    }
    if (!boards.length) {
      return e("div", { className: "BankPanel-empty" }, "No packs match.");
    }
    return e("div", { className: "BankPanel-packs" }, boards);
  };

  const renderCombineCard = (
    chain: CombineReadyRow[],
    mode: ReadySection,
  ) => {
    const sorted = chain.slice().sort((a, b) => a.level - b.level);
    const finalStep = sorted[sorted.length - 1];
    const finalCount = combineStepCount(finalStep, mode);
    const almost = mode === "almost";

    const tiles: any[] = [
      e(
        "button",
        {
          type: "button",
          key: "out",
          className: "BankPanel-recipeTile",
          onClick: () =>
            showBankItem({
              name: finalStep.name,
              level: finalStep.outputLevel,
              q: finalCount,
              p: finalStep.p,
            }),
        },
        e(ItemInstance, {
          name: finalStep.name,
          level: finalStep.outputLevel,
          q: finalCount,
          p: finalStep.p != null ? String(finalStep.p) : undefined,
          size: 40,
          forceShowQ: true,
        }),
      ),
    ];

    for (let i = sorted.length - 1; i >= 0; i--) {
      const step = sorted[i];
      const isShort = almost && step.missing > 0;
      const badgeQ = isShort ? step.missing : step.effectiveHave;
      tiles.push(
        e("span", { key: "arr" + i, className: "BankPanel-recipeArrow" }, "←"),
        e(
          "button",
          {
            type: "button",
            key: "in" + step.level,
            className: "BankPanel-recipeTile",
            title:
              step.displayName +
              " · bank " +
              step.have +
              (step.cascadeIn
                ? " · cascade +" + step.cascadeIn
                : "") +
              (step.missing ? " · missing " + step.missing : ""),
            onClick: () =>
              showBankItem({
                name: step.name,
                level: step.level,
                q: step.have,
                p: step.p,
              }),
          },
          e(ItemInstance, {
            name: step.name,
            level: step.level,
            q: badgeQ,
            p: step.p != null ? String(step.p) : undefined,
            size: 40,
            forceShowQ: true,
            qtyColor: isShort ? MISSING_Q : undefined,
          }),
        ),
      );
    }

    return e(
      "div",
      {
        key: combineChainKey(chain),
        className: "BankPanel-recipeCard",
      },
      almost && finalStep.combineReadyCount > 0
        ? e(
            "div",
            { className: "BankPanel-recipeHint is-ok" },
            finalStep.combineReadyCount +
              " ready now · " +
              (finalCount - finalStep.combineReadyCount) +
              " more if restocked",
          )
        : null,
      e(
        "div",
        { className: "BankPanel-recipeResult" },
        "Result: " + finalCount + " × +" + finalStep.outputLevel,
      ),
      e("div", { className: "BankPanel-recipeRow" }, tiles),
      e(
        "div",
        { className: "BankPanel-recipeFoot" },
        "3 copies per output · +1 level · compound scroll",
      ),
    );
  };

  const renderCraftCard = (recipe: CraftReadyRow, mode: ReadySection) => {
    const craftCount =
      mode === "ready"
        ? recipe.craftableCount
        : recipe.potentialCraftCount != null
          ? recipe.potentialCraftCount
          : 0;
    const almost = mode === "almost";

    const ings: any[] = [];
    for (let i = 0; i < recipe.ingredients.length; i++) {
      const ing = recipe.ingredients[i];
      const usageQty = ing.need * craftCount;
      const isShort = almost && ing.missing > 0;
      const badgeQ = almost ? (isShort ? ing.missing : usageQty) : usageQty;
      ings.push(
        e(
          "button",
          {
            type: "button",
            key: ing.name + ":" + i,
            className: "BankPanel-recipeTile",
            title:
              ing.name +
              " · need " +
              ing.need +
              " · have " +
              ing.have +
              (ing.missing ? " · missing " + ing.missing : ""),
            onClick: () =>
              showBankItem({
                name: ing.name,
                level: ing.level,
                q: ing.have,
                p: ing.title,
              }),
          },
          e(ItemInstance, {
            name: ing.name,
            level: ing.level,
            q: badgeQ,
            p: ing.title,
            size: 40,
            forceShowQ: true,
            qtyColor: isShort ? MISSING_Q : undefined,
          }),
        ),
      );
    }

    return e(
      "div",
      { key: recipe.output, className: "BankPanel-recipeCard" },
      almost && recipe.craftableCount > 0
        ? e(
            "div",
            { className: "BankPanel-recipeHint is-ok" },
            recipe.craftableCount +
              " ready now · " +
              (craftCount - recipe.craftableCount) +
              " more if restocked",
          )
        : null,
      e(
        "div",
        { className: "BankPanel-recipeRow" },
        e(
          "button",
          {
            type: "button",
            className: "BankPanel-recipeTile",
            onClick: () =>
              showBankItem({ name: recipe.output, q: craftCount }),
          },
          e(ItemInstance, {
            name: recipe.output,
            q: craftCount,
            size: 40,
            forceShowQ: true,
          }),
        ),
        e("span", { className: "BankPanel-recipeArrow" }, "←"),
        ings,
      ),
      e(
        "div",
        { className: "BankPanel-recipeFoot" },
        recipe.cost
          ? formatTradeGold(recipe.cost) +
              " gold each" +
              (craftCount > 1
                ? " · " + formatTradeGold(recipe.cost * craftCount) + " total"
                : "")
          : "No gold cost",
      ),
    );
  };

  const renderReady = () => {
    const hasCombine =
      combineAnalysis.ready.length > 0 || combineAnalysis.potential.length > 0;
    const hasCraft =
      craftAnalysis.ready.length > 0 || craftAnalysis.potential.length > 0;
    if (!hasCombine && !hasCraft) {
      return e(
        "div",
        { className: "BankPanel-empty" },
        "Nothing ready or almost ready to compound or craft.",
      );
    }

    let kind: ReadyKind = readyKind;
    if (kind === "combine" && !hasCombine && hasCraft) kind = "craft";
    if (kind === "craft" && !hasCraft && hasCombine) kind = "combine";

    const combineReady = combineAnalysis.ready.length > 0;
    const combineAlmost = combineAnalysis.potential.length > 0;
    const craftReady = craftAnalysis.ready.length > 0;
    const craftAlmost = craftAnalysis.potential.length > 0;

    let section: ReadySection = readySection;
    if (kind === "combine") {
      if (section === "ready" && !combineReady && combineAlmost) section = "almost";
      if (section === "almost" && !combineAlmost && combineReady) section = "ready";
    } else {
      if (section === "ready" && !craftReady && craftAlmost) section = "almost";
      if (section === "almost" && !craftAlmost && craftReady) section = "ready";
    }

    let cards: any = null;
    if (kind === "combine") {
      const steps =
        section === "ready" ? combineAnalysis.ready : combineAnalysis.potential;
      const chains = groupCombineSteps(steps);
      cards = chains.length
        ? e(
            "div",
            { className: "BankPanel-recipeGrid" },
            chains.map((chain) => renderCombineCard(chain, section)),
          )
        : e("div", { className: "BankPanel-empty" }, "No combines in this section.");
    } else {
      const recipes =
        section === "ready" ? craftAnalysis.ready : craftAnalysis.potential;
      cards = recipes.length
        ? e(
            "div",
            { className: "BankPanel-recipeGrid" },
            recipes.map((r) => renderCraftCard(r, section)),
          )
        : e("div", { className: "BankPanel-empty" }, "No crafts in this section.");
    }

    return e(
      "div",
      { className: "BankPanel-ready" },
      e(
        "div",
        { className: "BankPanel-readyTabs" },
        hasCombine
          ? e(
              "button",
              {
                type: "button",
                className: kind === "combine" ? "is-on" : "",
                onClick: () => setReadyKind("combine"),
              },
              "Combine (" + combineAnalysis.ready.length + ")",
            )
          : null,
        hasCraft
          ? e(
              "button",
              {
                type: "button",
                className: kind === "craft" ? "is-on" : "",
                onClick: () => setReadyKind("craft"),
              },
              "Craft (" + craftAnalysis.ready.length + ")",
            )
          : null,
      ),
      e(
        "div",
        { className: "BankPanel-readySub" },
        e(
          "button",
          {
            type: "button",
            className: section === "ready" ? "is-on" : "",
            disabled:
              kind === "combine" ? !combineReady : !craftReady,
            onClick: () => setReadySection("ready"),
          },
          "Ready (" +
            (kind === "combine"
              ? combineAnalysis.ready.length
              : craftAnalysis.ready.length) +
            ")",
        ),
        e(
          "button",
          {
            type: "button",
            className: section === "almost" ? "is-on" : "",
            disabled:
              kind === "combine" ? !combineAlmost : !craftAlmost,
            onClick: () => setReadySection("almost"),
          },
          "Almost (" +
            (kind === "combine"
              ? combineAnalysis.potential.length
              : craftAnalysis.potential.length) +
            ")",
        ),
      ),
      cards,
    );
  };

  let body: any;
  if (error) {
    body = e("div", { className: "BankPanel-empty" }, error);
  } else if (!snap && loading) {
    body = e("div", { className: "BankPanel-empty" }, "Loading bank…");
  } else if (!snap) {
    body = e("div", { className: "BankPanel-empty" }, "No bank loaded.");
  } else if (view === "packs") {
    body = renderPacksBoard();
  } else if (view === "ready") {
    body = renderReady();
  } else if (view === "types") {
    body = typeGroups.length
      ? typeGroups.map(
          (g: {
            id: string;
            label: string;
            items: BankAggItem[];
          }) =>
            e(
              "div",
              { key: g.id, className: "BankPanel-section" },
              e(
                "div",
                { className: "BankPanel-sectionTitle" },
                g.label + " · " + g.items.length,
              ),
              renderAggGrid(g.items),
            ),
        )
      : e("div", { className: "BankPanel-empty" }, "No items match.");
  } else {
    body = renderAggGrid(filtered);
  }

  return e(
    "div",
    {
      className:
        "BankPanel" +
        (phoneUi ? " is-phone" : "") +
        (expanded ? " is-expanded" : ""),
      "data-ecu-panel": "bank",
      "data-ecu-tour": "bank-panel",
      ref: rootRef,
    },
    e(
      "div",
      { className: "BankPanel-head", ref: headRef },
      e("span", { className: "BankPanel-title" }, "Bank"),
      snap
        ? e(
            "span",
            { className: "BankPanel-gold" },
            formatTradeGold(snap.gold) + " gold",
          )
        : null,
      slotUsage
        ? e(
            "span",
            {
              className: "BankPanel-slots",
              title: slotUsage.title,
              "data-ecu-tour": "bank-slots",
            },
            slotUsage.label,
          )
        : null,
      ageLabel
        ? e("span", { className: "BankPanel-meta" }, "Loaded " + ageLabel)
        : null,
      e("span", { className: "BankPanel-headGrow" }),
      e(PanelExpandButton, {
        expanded,
        onToggle: () => setExpanded(!expanded),
        expandTitle: "Expand bank",
        restoreTitle: "Restore bank size",
        className: "BankPanel-expand",
      }),
      phoneUi
        ? null
        : e(
            "button",
            {
              type: "button",
              className: "BankPanel-btn",
              disabled: loading,
              onClick: () => refresh(),
              "data-ecu-tour": "bank-refresh",
            },
            loading ? "Loading…" : "Refresh",
          ),
    ),
    refreshSummary
      ? e(
          "div",
          {
            className: "BankPanel-changes",
            role: "status",
          },
          e(
            "div",
            { className: "BankPanel-changesHead" },
            e(
              "span",
              { className: "BankPanel-changesTitle" },
              formatRefreshSummaryLine(
                refreshSummary,
                visibleChanges.length,
              ),
            ),
            e(
              "button",
              {
                type: "button",
                className: "BankPanel-btn BankPanel-changesDismiss",
                onClick: () => setRefreshSummary(null),
              },
              "Dismiss",
            ),
          ),
          e(
            "div",
            {
              className: "BankPanel-seg BankPanel-changesFilter",
              role: "group",
              "aria-label": "Change filter",
            },
            (["all", "gear", "quantity"] as BankChangeFilter[]).map(
              (mode) =>
                e(
                  "button",
                  {
                    type: "button",
                    key: mode,
                    className: changeFilter === mode ? "is-on" : "",
                    onClick: () => setChangeFilter(mode),
                  },
                  mode === "all"
                    ? "All"
                    : mode === "gear"
                      ? "Gear"
                      : "Quantity",
                ),
            ),
          ),
          visibleChanges.length === 0
            ? e(
                "div",
                { className: "BankPanel-changesEmpty" },
                refreshSummary.changes.length
                  ? "No changes match this filter."
                  : "No item changes (gold/slots only).",
              )
            : e(
                "div",
                { className: "BankPanel-changesGrid" },
                visibleChanges.map(
                  (
                    change: BankRefreshSummary["changes"][number],
                    i: number,
                  ) => {
                    const tone = changeToneClass(
                      change.kind,
                      change.deltaQ,
                    );
                    return e(
                      "div",
                      {
                        key:
                          change.kind +
                          ":" +
                          change.item.key +
                          ":" +
                          i,
                        className: "BankPanel-changeTile " + tone,
                      },
                      e(ItemInstance, {
                        name: change.item.name,
                        level: change.item.level,
                        q: changeBadgeQuantity(change),
                        p:
                          change.item.p != null
                            ? String(change.item.p)
                            : undefined,
                        data: change.item.data,
                        actual: {
                          name: change.item.name,
                          level: change.item.level,
                          q: changeBadgeQuantity(change),
                          p: change.item.p,
                          ...(change.item.data
                            ? { data: change.item.data }
                            : {}),
                        },
                        size: 40,
                        forceShowQ: true,
                        qtyColor: changeQuantityColor(
                          change.kind,
                          change.deltaQ,
                        ),
                        title: formatBankChangeTip(change),
                      }),
                      e(
                        "span",
                        { className: "BankPanel-changeCap" },
                        changeCaption(change),
                      ),
                    );
                  },
                ),
              ),
        )
      : null,
    e(
      "div",
      {
        className: "BankPanel-tools",
        "data-ecu-tour": "bank-tools",
      },
      e(
        "div",
        { "data-ecu-tour": "bank-search" },
        e(QuerySearchField, {
          value: query,
          onChange: (next: string) => setQuery(next),
          placeholder: "Search · item: · type: · pack: · is:compound · OR…",
          suggestions,
          trailingOps: BANK_TRAILING_OPS,
        }),
      ),
      !phoneUi
        ? e(
            "div",
            {
              className: "BankPanel-seg",
              "data-ecu-tour": "bank-views",
              role: "group",
              "aria-label": "Bank view mode",
            },
            BANK_VIEW_PAGES.map((p) =>
              e(
                "button",
                {
                  type: "button",
                  key: p.key,
                  className: view === p.key ? "is-on" : "",
                  onClick: () => setView(p.key),
                },
                p.label,
              ),
            ),
          )
        : null,
      view === "all" || view === "types"
        ? e(
            "div",
            {
              className: "BankPanel-seg BankPanel-sortSeg",
              role: "group",
              "aria-label": "Bank sort mode",
              "data-ecu-tour": "bank-sort",
            },
            SORT_OPTIONS.map((opt) =>
              e(
                "button",
                {
                  type: "button",
                  key: opt.id,
                  className: sort === opt.id ? "is-on" : "",
                  title: "Sort by " + opt.label.toLowerCase(),
                  onClick: () => setSort(opt.id),
                },
                opt.label,
              ),
            ),
          )
        : null,
    ),
    e(
      "div",
      {
        className: "BankPanel-body",
        "data-ecu-tour": "bank-body",
        ref: bodyRef,
      },
      body,
    ),
    phoneUi
      ? e(
          "div",
          {
            className: "BankPanel-phoneFoot",
            "data-ecu-tour": "bank-views",
          },
          e(
            "div",
            {
              className: "BankPanel-seg BankPanel-phoneTabs BankPanel-phoneTabs--foot",
              role: "group",
              "aria-label": "Bank view",
            },
            BANK_PHONE_TABS.map((p) => {
              const active = bankPhoneTab(view, readySection) === p.key;
              return e(
                "button",
                {
                  type: "button",
                  key: p.key,
                  className: active ? "is-on" : "",
                  onClick: () => {
                    if (p.key === "items") {
                      if (view === "ready") setView("all");
                      return;
                    }
                    setView("ready");
                    setReadySection(p.key === "almost" ? "almost" : "ready");
                  },
                },
                p.label,
              );
            }),
          ),
          e(
            "div",
            { className: "BankPanel-phoneFootActs" },
            e(
              "button",
              {
                type: "button",
                className: "BankPanel-phoneAct",
                disabled: loading,
                onClick: () =>
                  refresh({
                    force: !(window as { __ecuOverlayPreview?: boolean })
                      .__ecuOverlayPreview,
                  }),
                "data-ecu-tour": "bank-refresh",
              },
              loading ? "Loading…" : "Refresh",
            ),
            props.onRequestClose
              ? e(
                  "button",
                  {
                    type: "button",
                    className: "BankPanel-phoneDone",
                    onClick: () =>
                      props.onRequestClose && props.onRequestClose(),
                  },
                  "Done",
                )
              : null,
          ),
        )
      : null
  );
}
