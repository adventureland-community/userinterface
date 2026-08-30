/**
 * Bag context menu: quick split presets + custom dialog.
 */

import {
  registerBagMenuProvider,
  type BagMenuAction,
  type BagMenuContext,
} from "../ui/bag/bagItemContextMenu";
import {
  splitPresetQuantity,
  type SplitPreset,
} from "../lib/bagSplitMath";
import { canEditObservedBag } from "./gearObserved";
import {
  maxSplitQuantity,
  splitBagCommand,
} from "./bagSplitCommands";
import { showBagSplitDialog } from "../ui/bag/bagSplitDialog";

function presetLabel(
  preset: SplitPreset,
  totalQ: number,
  maxPeel: number,
): string {
  const q = splitPresetQuantity(preset, totalQ, maxPeel);
  switch (preset) {
    case "one":
      return "Split 1";
    case "half":
      return `Split half (${q})`;
    case "max":
      return `Split max (${q})`;
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}

function presetTitle(preset: SplitPreset): string {
  switch (preset) {
    case "one":
      return "Peel 1 · Ctrl+middle-click";
    case "half":
      return "Split roughly in half · Shift+middle-click";
    case "max":
      return "Peel as much as allowed · Alt+middle-click";
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}

function runPresetSplit(ctx: BagMenuContext, preset: SplitPreset): void {
  const maxPeel = maxSplitQuantity(ctx.fp);
  const totalQ =
    ctx.fp.q != null && Number(ctx.fp.q) > 1 ? Number(ctx.fp.q) | 0 : 0;
  const q = splitPresetQuantity(preset, totalQ, maxPeel);
  splitBagCommand(ctx.fp, q);
}

function buildBagSplitActions(ctx: BagMenuContext): BagMenuAction[] {
  if (!canEditObservedBag()) return [];
  const maxPeel = maxSplitQuantity(ctx.fp);
  if (maxPeel <= 0) return [];

  const totalQ =
    ctx.fp.q != null && Number(ctx.fp.q) > 1 ? Number(ctx.fp.q) | 0 : 0;
  const presets: SplitPreset[] = ["one", "half", "max"];

  const children: BagMenuAction[] = presets.map((preset) => ({
    id: `split-${preset}`,
    label: presetLabel(preset, totalQ, maxPeel),
    title: presetTitle(preset),
    run: () => runPresetSplit(ctx, preset),
  }));

  children.push({
    id: "split-custom",
    label: "Custom…",
    title: "Middle-click (no modifier)",
    separatorBefore: true,
    run: () => {
      void showBagSplitDialog(ctx.fp).then((q) => {
        if (q == null) return;
        splitBagCommand(ctx.fp, q);
      });
    },
  });

  return [
    {
      id: "split-submenu",
      label: "Split",
      title: "Quick presets or custom amount",
      separatorBefore: true,
      children,
    },
  ];
}

registerBagMenuProvider(buildBagSplitActions);
