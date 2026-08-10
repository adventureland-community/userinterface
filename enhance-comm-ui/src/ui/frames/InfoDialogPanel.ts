import {
  adoptInfoDialog,
  isBuffDialogOpen,
  isItemDialogOpen,
  type InfoDialogKind,
} from "../../host/dialogHost";
import { getReact, e } from "../../host/react";
import { PanelShellDummy } from "../chrome/PanelShellDummy";

export type StockInfoPanelProps = {
  kind: InfoDialogKind;
  /** When true, show a footprint dummy if the stock dialog is empty. */
  layoutEdit?: boolean;
  /** Notify parent so PositionedPanel can release pointer-events when idle. */
  onOpenChange?: (open: boolean) => void;
};

function isOpen(kind: InfoDialogKind): boolean {
  return kind === "buff" ? isBuffDialogOpen() : isItemDialogOpen();
}

const LABELS: Record<InfoDialogKind, { label: string; hint: string }> = {
  buff: { label: "Buff info", hint: "Click a buff / condition" },
  item: { label: "Item info", hint: "Click a gear slot" },
};

/**
 * Host for one stock info dialog (`buff` or `item`).
 * Always keeps the dialog node mounted so stock clicks can write; shows a
 * layout dummy when empty in edit mode.
 */
export function StockInfoPanel(props: StockInfoPanelProps): any {
  const React = getReact();
  const kind = props.kind;
  const slotRef = React.useRef(null as HTMLElement | null);
  const [open, setOpen] = React.useState(isOpen(kind));
  const onOpenChange = props.onOpenChange;

  React.useEffect(() => {
    if (onOpenChange) onOpenChange(open);
  }, [open, onOpenChange]);

  React.useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    const dialog = adoptInfoDialog(kind, slot);
    setOpen(isOpen(kind));

    if (typeof MutationObserver !== "function") return;
    const obs = new MutationObserver(() => {
      setOpen(isOpen(kind));
    });
    obs.observe(dialog, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => obs.disconnect();
  }, [kind]);

  const meta = LABELS[kind];
  const showDummy = !!props.layoutEdit && !open;
  const visible = open || !!props.layoutEdit;

  return e(
    "div",
    {
      className: `comm-info-dialog-panel comm-${kind}-info-panel`,
      style: {
        width: "fit-content",
        maxWidth: "min(96vw, 520px)",
        boxSizing: "border-box",
        minWidth: showDummy ? "200px" : undefined,
        minHeight: showDummy ? "120px" : undefined,
        pointerEvents: visible ? "auto" : "none",
      },
    },
    showDummy
      ? e(PanelShellDummy, {
          label: meta.label,
          hint: meta.hint,
          accent: kind === "buff" ? "#5a7a5a" : "#5a6a8a",
          rows: 4,
          style: {
            minWidth: "200px",
            minHeight: "120px",
            boxSizing: "border-box",
          },
        })
      : null,
    e("div", {
      ref: slotRef,
      className: `comm-info-dialog-slot comm-${kind}-info-slot`,
      // Always mounted so stock writers can target the adopted host.
      style: {
        display: "block",
        height: open || props.layoutEdit ? undefined : 0,
        overflow: open ? "visible" : "hidden",
        minHeight: 0,
      },
    }),
  );
}

/** @deprecated use StockInfoPanel with kind="buff" | "item" */
export function InfoDialogPanel(props: {
  layoutEdit?: boolean;
  onOpenChange?: (open: boolean) => void;
}): any {
  return StockInfoPanel({
    kind: "buff",
    layoutEdit: props.layoutEdit,
    onOpenChange: props.onOpenChange,
  });
}
