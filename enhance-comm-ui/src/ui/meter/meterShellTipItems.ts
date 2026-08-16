/**
 * Data-driven cooltip menus for MeterPanelShell (party / seg / gear / …).
 */

import { effectivePartyFocus } from "../../lib/settingsFocus";
import { getSettings, patchSettings } from "../../lib/settings";
import {
  applyViewMode,
  barModeIndex,
  BAR_MODE_CYCLE,
  DISPLAY_TREE,
  REPORT_TABS,
  supportsViewModes,
  VIEW_MODES,
  type ReportKind,
} from "../../meters/meterCatalog";
import {
  getYouId,
  resetAllMeters,
  resetCurrentMeterSegment,
  resetOverallMeterSegments,
} from "../../meters/meterEngine";
import {
  listSegmentChoices,
  setSegmentFavorite,
} from "../../meters/meterSession";
import type { PartyFocus, PartyFocusOption } from "../../lib/settingsFocus";
import type {
  MeterInstance,
  RankedRow,
  SegmentRef,
} from "../../meters/meterTypes";
import { refsEqual, segmentRefKey } from "../../meters/meterSegmentRef";
import { segmentOutcomeClass } from "../../meters/meterSegmentMeta";
import type { FocusInspectorOpts } from "../hooks/useCommMeterInstances";
import type {
  MeterCooltipItem,
  MeterCooltipKind,
  MeterCooltipMenu,
  MeterCooltipSection,
} from "./meterCooltipMenu";
import { presentationFor, rootQuery } from "./meterShellHelpers";

/** Callbacks the shell owns — tip builders only invoke these. */
export type MeterShellTipActions = {
  closeTip: () => void;
  onPatchInstance: (partial: Partial<MeterInstance>) => void;
  applySegment: (next: SegmentRef) => void;
  setInspectorActor: (actorId: string, name: string) => void;
  copyReport: () => void;
  openReportDialog: () => void;
  setOptionsOpen: (open: boolean) => void;
  onOpenReport?: (kind: ReportKind) => void;
  onToggleMetersHidden?: () => void;
  onFocusInspector?: (
    actorId: string,
    name: string,
    opts?: FocusInspectorOpts,
  ) => void;
  onDuplicate?: () => void;
  onClose?: () => void;
  onReopenClosed?: (id: string) => void;
};

export type MeterShellTipItemsCtx = {
  tip: { kind: MeterCooltipKind } | null;
  instance: MeterInstance;
  partyMenuOpts: PartyFocusOption[];
  partyFocus: PartyFocus;
  hasObserver: boolean;
  partyLabel: string;
  watchedName?: string;
  selectedset: SegmentRef;
  resolved: { outcome?: string } | null;
  isCurrentSeg: boolean;
  titleSeg: string;
  durSec: number;
  actorPickerRows: RankedRow[];
  metersHidden?: boolean;
  closedInstances?: MeterInstance[];
  actions: MeterShellTipActions;
};

function asMenu(items: MeterCooltipItem[]): MeterCooltipMenu {
  return { sections: [{ items }] };
}

function emptyMenu(): MeterCooltipMenu {
  return { sections: [] };
}

function partyRows(ctx: MeterShellTipItemsCtx): MeterCooltipItem[] {
  const { actions } = ctx;
  const items: MeterCooltipItem[] = [];
  const eff = effectivePartyFocus(ctx.partyFocus, ctx.hasObserver);
  for (let i = 0; i < ctx.partyMenuOpts.length; i++) {
    const opt = ctx.partyMenuOpts[i];
    const selected = ctx.partyFocus === opt.id || eff === opt.id;
    items.push({
      label: opt.label,
      selected,
      onSelect: () => {
        actions.onPatchInstance({ partyFocus: opt.id });
        actions.closeTip();
      },
    });
  }
  const alwaysOn =
    ctx.instance.alwaysShowSelf != null
      ? ctx.instance.alwaysShowSelf
      : getSettings().meterAlwaysShowSelf !== false;
  items.push({
    label: "Always show me",
    selected: alwaysOn,
    onSelect: () => {
      actions.onPatchInstance({ alwaysShowSelf: !alwaysOn });
      actions.closeTip();
    },
  });
  return items;
}

function menuSeg(ctx: MeterShellTipItemsCtx): MeterCooltipMenu {
  const { actions } = ctx;
  const choices = listSegmentChoices();
  let header: MeterCooltipItem | undefined;
  if (ctx.resolved) {
    let headerTip: string | undefined;
    for (let i = 0; i < choices.length; i++) {
      if (refsEqual(choices[i].ref, ctx.selectedset)) {
        headerTip = choices[i].tip;
        break;
      }
    }
    header = {
      itemKey: "seg-header",
      label: `${ctx.isCurrentSeg ? "Current" : ctx.titleSeg} · ${ctx.durSec.toFixed(0)}s · ${ctx.partyLabel}`,
      detail: headerTip,
      muted: true,
      onSelect: () => actions.closeTip(),
    };
  }
  const items: MeterCooltipItem[] = [];
  for (let i = 0; i < choices.length; i++) {
    const c = choices[i];
    const pastId =
      typeof c.ref === "object" && "pastId" in c.ref ? c.ref.pastId : "";
    const item: MeterCooltipItem = {
      itemKey: segmentRefKey(c.ref),
      label: c.title,
      detail: c.tip,
      selected: refsEqual(c.ref, ctx.selectedset),
      className: c.outcome ? segmentOutcomeClass(c.outcome) : undefined,
      onSelect: () => {
        actions.applySegment(c.ref);
        actions.closeTip();
      },
    };
    if (pastId) {
      const fav = !!c.favorite;
      item.trailing = {
        label: fav ? "★" : "☆",
        title: fav
          ? "Unfavorite — allow archive cleanup"
          : "Favorite — never auto-delete",
        className: fav ? "is-fav" : "",
        onSelect: () => {
          setSegmentFavorite(pastId, !fav);
        },
      };
    }
    items.push(item);
  }
  return { header, sections: [{ items }] };
}

function menuDisplay(ctx: MeterShellTipItemsCtx): MeterCooltipMenu {
  const { actions } = ctx;
  const curIdx = barModeIndex(rootQuery(ctx.instance));
  const curId = curIdx >= 0 ? BAR_MODE_CYCLE[curIdx].id : "";
  const items: MeterCooltipItem[] = [];
  for (let g = 0; g < DISPLAY_TREE.length; g++) {
    const group = DISPLAY_TREE[g];
    for (let c = 0; c < group.children.length; c++) {
      const d = group.children[c];
      items.push({
        label: `${group.label} › ${d.label}`,
        selected: d.id === curId,
        onSelect: () => {
          actions.onPatchInstance({
            query: { ...d.query },
            label: d.label,
            presentation: "bars",
          });
          actions.closeTip();
        },
      });
    }
  }
  return asMenu(items);
}

/** Bars / Pie / Graph — presentation, not Attribute. */
function menuView(ctx: MeterShellTipItemsCtx): MeterCooltipMenu {
  if (!supportsViewModes(rootQuery(ctx.instance))) return emptyMenu();
  const { actions } = ctx;
  const cur = presentationFor(ctx.instance);
  const items: MeterCooltipItem[] = [];
  for (let i = 0; i < VIEW_MODES.length; i++) {
    const vm = VIEW_MODES[i];
    items.push({
      label: vm.label,
      selected: cur === vm.id,
      onSelect: () => {
        actions.onPatchInstance(applyViewMode(vm.id));
        actions.closeTip();
      },
    });
  }
  return { sections: [{ title: "View", items }] };
}

function menuReset(ctx: MeterShellTipItemsCtx): MeterCooltipMenu {
  const { actions } = ctx;
  return asMenu([
    {
      label: "Reset Current fight",
      onSelect: () => {
        resetCurrentMeterSegment();
        actions.onPatchInstance({ selectedset: "current" });
        actions.closeTip();
      },
    },
    {
      label: "Reset Overall",
      onSelect: () => {
        resetOverallMeterSegments();
        actions.closeTip();
      },
    },
    {
      label: "Reset All → Current",
      onSelect: () => {
        resetAllMeters();
        actions.onPatchInstance({ selectedset: "current" });
        actions.closeTip();
      },
    },
    {
      label: ctx.metersHidden ? "Show all meters" : "Hide all meters",
      onSelect: () => {
        if (actions.onToggleMetersHidden) actions.onToggleMetersHidden();
        else patchSettings({ metersHidden: !getSettings().metersHidden });
        actions.closeTip();
      },
    },
  ]);
}

function menuActor(ctx: MeterShellTipItemsCtx): MeterCooltipMenu {
  const { actions } = ctx;
  if (!ctx.actorPickerRows.length) {
    return asMenu([
      {
        label: "(no players in segment)",
        muted: true,
        onSelect: () => actions.closeTip(),
      },
    ]);
  }
  const items: MeterCooltipItem[] = [];
  for (let i = 0; i < ctx.actorPickerRows.length; i++) {
    const r = ctx.actorPickerRows[i];
    items.push({
      label: r.name,
      onSelect: () => actions.setInspectorActor(r.id, r.name),
    });
  }
  return asMenu(items);
}

function menuTools(ctx: MeterShellTipItemsCtx): MeterCooltipMenu {
  const { actions } = ctx;
  const items: MeterCooltipItem[] = [];
  for (let i = 0; i < REPORT_TABS.length; i++) {
    const tab = REPORT_TABS[i];
    items.push({
      label: tab.label,
      onSelect: () => {
        if (actions.onOpenReport) actions.onOpenReport(tab.kind);
        actions.closeTip();
      },
    });
  }
  return asMenu(items);
}

function menuReport(ctx: MeterShellTipItemsCtx): MeterCooltipMenu {
  const { actions } = ctx;
  const sections: MeterCooltipSection[] = [];
  const recent = getSettings().meterRecentReports || [];
  const recentItems: MeterCooltipItem[] = [];
  for (let i = 0; i < Math.min(3, recent.length); i++) {
    const r = recent[i];
    recentItems.push({
      label: r.label,
      onSelect: () => {
        if (navigator.clipboard?.writeText) {
          void navigator.clipboard.writeText(r.text);
        }
        actions.closeTip();
      },
    });
  }
  if (recentItems.length) {
    sections.push({ title: "Recent", items: recentItems });
  }
  sections.push({
    items: [
      {
        label: "Copy report",
        onSelect: () => {
          actions.copyReport();
          actions.closeTip();
        },
      },
      {
        label: "Open report dialog…",
        onSelect: () => {
          actions.openReportDialog();
        },
      },
    ],
  });
  return { sections };
}

function menuGear(ctx: MeterShellTipItemsCtx): MeterCooltipMenu {
  const { actions } = ctx;
  const sections: MeterCooltipSection[] = [{ items: partyRows(ctx) }];
  const onOpenReport = actions.onOpenReport;
  if (onOpenReport) {
    const pluginItems: MeterCooltipItem[] = [];
    for (let ti = 0; ti < REPORT_TABS.length; ti++) {
      const tab = REPORT_TABS[ti];
      pluginItems.push({
        label: tab.label,
        onSelect: () => {
          actions.closeTip();
          onOpenReport(tab.kind);
        },
      });
    }
    sections.push({ title: "Plugins", items: pluginItems });
  }
  sections.push({
    items: [
      {
        label: "Options panel…",
        onSelect: () => {
          actions.closeTip();
          actions.setOptionsOpen(true);
        },
      },
      {
        label: "Spell List…",
        onSelect: () => {
          actions.closeTip();
          actions.onFocusInspector?.(
            getYouId() || "",
            ctx.watchedName || "You",
          );
        },
      },
      {
        label: "Statistics…",
        onSelect: () => {
          actions.closeTip();
          actions.openReportDialog();
        },
      },
    ],
  });
  const windowItems: MeterCooltipItem[] = [
    {
      label: actions.onDuplicate
        ? "Create new window"
        : "Create new window (layout edit)",
      onSelect: () => {
        actions.closeTip();
        if (actions.onDuplicate) actions.onDuplicate();
      },
    },
  ];
  const onClose = actions.onClose;
  if (onClose) {
    windowItems.push({
      label: "Close window",
      onSelect: () => {
        actions.closeTip();
        onClose();
      },
    });
  }
  const closed = ctx.closedInstances || [];
  for (let ci = 0; ci < closed.length; ci++) {
    const c = closed[ci];
    windowItems.push({
      itemKey: `reopen-${c.id}`,
      label: `Reopen: ${c.label || c.id}`,
      onSelect: () => {
        actions.closeTip();
        actions.onReopenClosed?.(c.id);
      },
    });
  }
  sections.push({ title: "Window Control", items: windowItems });
  sections.push({
    items: [
      {
        label: actions.onToggleMetersHidden
          ? ctx.metersHidden
            ? "Show all meters"
            : "Hide all meters"
          : "Hide all meters",
        onSelect: () => {
          actions.closeTip();
          actions.onToggleMetersHidden?.();
        },
      },
    ],
  });
  return { sections };
}

export function meterShellTipItems(
  ctx: MeterShellTipItemsCtx,
): MeterCooltipMenu {
  const tip = ctx.tip;
  if (!tip) return emptyMenu();
  switch (tip.kind) {
    case "party":
      return asMenu(partyRows(ctx));
    case "seg":
      return menuSeg(ctx);
    case "display":
      return menuDisplay(ctx);
    case "view":
      return menuView(ctx);
    case "reset":
      return menuReset(ctx);
    case "actor":
      return menuActor(ctx);
    case "tools":
      return menuTools(ctx);
    case "report":
      return menuReport(ctx);
    case "gear":
      return menuGear(ctx);
    case "allDisplays":
    case "bookmarks":
    case "bookmarkPick":
      return emptyMenu();
    default: {
      const _never: never = tip.kind;
      return _never;
    }
  }
}
