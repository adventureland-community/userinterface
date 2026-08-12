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
import type { PartyFocus } from "../../lib/settingsFocus";
import type { MeterInstance, RankedRow, SegmentRef, CombatSegment } from "../../meters/meterTypes";
import { segmentOutcomeClass } from "../../meters/meterSegmentMeta";
import type { MeterCooltipItem, MeterCooltipKind } from "./meterCooltipMenu";
import { presentationFor, rootQuery } from "./meterShellHelpers";

export type MeterShellTipItemsCtx = {
  tip: {
    kind: MeterCooltipKind;
  } | null;
  partyMenuOpts: { id: PartyFocus; label: string }[];
  partyFocus: PartyFocus;
  hasObserver: boolean;
  instance: MeterInstance;
  onPatchInstance: (partial: Partial<MeterInstance>) => void;
  closeTip: () => void;
  resolved: { outcome?: string } | null;
  isCurrentSeg: boolean;
  titleSeg: string;
  durSec: number;
  partyLabel: string;
  selectedset: SegmentRef;
  applySegment: (next: SegmentRef) => void;
  past: CombatSegment[];
  actorPickerRows: RankedRow[];
  setInspectorActor: (actorId: string, name: string) => void;
  onOpenReport?: (kind: ReportKind) => void;
  copyReport: () => void;
  openReportDialog: () => void;
  setOptionsOpen: (open: boolean) => void;
  watchedName?: string;
  metersHidden?: boolean;
  onToggleMetersHidden?: () => void;
  onFocusInspector?: (actorId: string, name: string) => void;
  onDuplicate?: () => void;
  onClose?: () => void;
  closedInstances?: MeterInstance[];
  onReopenClosed?: (id: string) => void;
};

export function meterShellTipItems(ctx: MeterShellTipItemsCtx): MeterCooltipItem[] {
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
    partyLabel,
    selectedset,
    applySegment,
    past,
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
    onReopenClosed,
  } = ctx;
  if (!tip) return [];
  if (tip.kind === "party") {
    const items: MeterCooltipItem[] = partyMenuOpts.map((opt) => {
      const eff = effectivePartyFocus(partyFocus, hasObserver);
      const selected = partyFocus === opt.id || eff === opt.id;
      return {
        label: opt.label,
        selected,
        onSelect: () => {
          onPatchInstance({ partyFocus: opt.id });
          closeTip();
        },
      };
    });
    const alwaysOn =
      instance.alwaysShowSelf != null
        ? instance.alwaysShowSelf
        : getSettings().meterAlwaysShowSelf !== false;
    items.push({
      label: "Always show me",
      selected: alwaysOn,
      onSelect: () => {
        onPatchInstance({ alwaysShowSelf: !alwaysOn });
        closeTip();
      },
    });
    return items;
  }
  if (tip.kind === "seg") {
    const items: MeterCooltipItem[] = [];
    if (resolved) {
      items.push({
        label: `${isCurrentSeg ? "Current" : titleSeg} · ${durSec.toFixed(0)}s · ${partyLabel}`,
        muted: true,
        onSelect: () => closeTip(),
      });
    }
    items.push(
      {
        label: "Current",
        selected: selectedset === "current",
        onSelect: () => {
          applySegment("current");
          closeTip();
        },
      },
      {
        label: "Overall",
        selected: selectedset === "total",
        onSelect: () => {
          applySegment("total");
          closeTip();
        },
      },
    );
    for (let i = 0; i < past.length; i++) {
      const p = past[i];
      const sel =
        typeof selectedset === "object" &&
        selectedset &&
        (selectedset as { pastId: string }).pastId === p.id;
      items.push({
        label: p.label || p.id,
        selected: !!sel,
        className: segmentOutcomeClass(p.outcome),
        onSelect: () => {
          applySegment({ pastId: p.id });
          closeTip();
        },
      });
    }
    return items;
  }
  if (tip.kind === "display") {
    const curIdx = barModeIndex(rootQuery(instance));
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
            onPatchInstance({
              query: { ...d.query },
              label: d.label,
              presentation: "bars",
            });
            closeTip();
          },
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
        },
      },
      {
        label: "Reset Overall",
        onSelect: () => {
          resetOverallMeterSegments();
          closeTip();
        },
      },
      {
        label: "Reset All → Current",
        onSelect: () => {
          resetAllMeters();
          onPatchInstance({ selectedset: "current" });
          closeTip();
        },
      },
      {
        label: metersHidden ? "Show all meters" : "Hide all meters",
        onSelect: () => {
          if (onToggleMetersHidden) onToggleMetersHidden();
          else patchSettings({ metersHidden: !getSettings().metersHidden });
          closeTip();
        },
      },
    ];
  }
  if (tip.kind === "actor") {
    if (!actorPickerRows.length) {
      return [
        {
          label: "(no players in segment)",
          muted: true,
          onSelect: () => closeTip(),
        },
      ];
    }
    return actorPickerRows.map((r) => ({
      label: r.name,
      onSelect: () => setInspectorActor(r.id, r.name),
    }));
  }
  if (tip.kind === "tools") {
    return REPORT_TABS.map((tab) => ({
      label: tab.label,
      onSelect: () => {
        if (onOpenReport) onOpenReport(tab.kind);
        closeTip();
      },
    }));
  }
  if (tip.kind === "report") {
    const items: MeterCooltipItem[] = [];
    const recent = getSettings().meterRecentReports || [];
    for (let i = 0; i < Math.min(3, recent.length); i++) {
      const r = recent[i];
      items.push({
        label: `Recent: ${r.label}`,
        onSelect: () => {
          if (navigator.clipboard?.writeText) {
            void navigator.clipboard.writeText(r.text);
          }
          closeTip();
        },
      });
    }
    items.push({
      label: "Copy report",
      onSelect: () => {
        copyReport();
        closeTip();
      },
    });
    items.push({
      label: "Open report dialog…",
      onSelect: () => {
        openReportDialog();
      },
    });
    return items;
  }
  if (tip.kind === "gear") {
    const items: MeterCooltipItem[] = [
      {
        label: "Standard (Visible party)",
        onSelect: () => {
          onPatchInstance({ partyFocus: "visible" });
          closeTip();
        },
      },
      {
        label: "Everything (All players)",
        onSelect: () => {
          onPatchInstance({ partyFocus: "all" });
          closeTip();
        },
      },
      { label: "—", muted: true, onSelect: () => {} },
      {
        label: "Plugins — Encounter / Deaths / Timeline",
        onSelect: () => {
          closeTip();
          onOpenReport?.("encounter");
        },
      },
      { label: "—", muted: true, onSelect: () => {} },
      {
        label: "Options panel…",
        onSelect: () => {
          closeTip();
          setOptionsOpen(true);
        },
      },
      {
        label: "Spell List…",
        muted: true,
        onSelect: () => {
          closeTip();
          onFocusInspector?.(getYouId() || "", watchedName || "You");
        },
      },
      {
        label: "Statistics…",
        onSelect: () => {
          closeTip();
          openReportDialog();
        },
      },
      { label: "—", muted: true, onSelect: () => {} },
      {
        label: onDuplicate
          ? "Window Control — Create new"
          : "Create new window (layout edit)",
        onSelect: () => {
          closeTip();
          if (onDuplicate) onDuplicate();
        },
      },
    ];
    if (onClose) {
      items.push({
        label: "Window Control — Close window",
        onSelect: () => {
          closeTip();
          onClose!();
        },
      });
    }
    const closed = closedInstances || [];
    for (let ci = 0; ci < closed.length; ci++) {
      const c = closed[ci];
      items.push({
        label: `Reopen: ${c.label || c.id}`,
        onSelect: () => {
          closeTip();
          onReopenClosed?.(c.id);
        },
      });
    }
    if (supportsViewModes(rootQuery(instance))) {
      items.push({ label: "—", muted: true, onSelect: () => {} });
      items.push({
        label: "View mode",
        muted: true,
        onSelect: () => closeTip(),
      });
      for (let vi = 0; vi < VIEW_MODES.length; vi++) {
        const vm = VIEW_MODES[vi];
        items.push({
          label: vm.label,
          selected: presentationFor(instance) === vm.id,
          onSelect: () => {
            onPatchInstance(applyViewMode(vm.id));
            closeTip();
          },
        });
      }
    }
    items.push({
      label: onToggleMetersHidden
        ? metersHidden
          ? "Show all meters"
          : "Hide all meters"
        : "Hide all meters",
      onSelect: () => {
        closeTip();
        onToggleMetersHidden?.();
      },
    });
    return items;
  }
  return [];
}
