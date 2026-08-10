import {
  adoptTopLeftDialog,
  isTopLeftDialogOpen,
} from "../../host/dialogHost";
import { getReact, e } from "../../host/react";
import { PanelShellDummy } from "../chrome/PanelShellDummy";

export type InfoDialogPanelProps = {
  /** When true, show a footprint dummy if the stock dialog is empty. */
  layoutEdit?: boolean;
  /** Notify parent so PositionedPanel can release pointer-events when idle. */
  onOpenChange?: (open: boolean) => void;
};

/**
 * Host for stock `#topleftcornerdialog` (condition / item info).
 * Always keeps the dialog node mounted so `condition_click` works; shows a
 * layout dummy when empty in edit mode.
 */
export function InfoDialogPanel(props: InfoDialogPanelProps): any {
  const React = getReact();
  const slotRef = React.useRef(null as HTMLElement | null);
  const [open, setOpen] = React.useState(isTopLeftDialogOpen());
  const onOpenChange = props.onOpenChange;

  React.useEffect(() => {
    if (onOpenChange) onOpenChange(open);
  }, [open, onOpenChange]);

  React.useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    const dialog = adoptTopLeftDialog(slot);
    setOpen(isTopLeftDialogOpen());

    if (typeof MutationObserver !== "function") return;
    const obs = new MutationObserver(() => {
      setOpen(isTopLeftDialogOpen());
    });
    obs.observe(dialog, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => obs.disconnect();
  }, []);

  const showDummy = !!props.layoutEdit && !open;
  const visible = open || !!props.layoutEdit;

  return e(
    "div",
    {
      className: "comm-info-dialog-panel",
      style: {
        width: "fit-content",
        maxWidth: "min(96vw, 520px)",
        boxSizing: "border-box",
        // Collapse completely when idle in play mode.
        minWidth: showDummy ? "200px" : undefined,
        minHeight: showDummy ? "120px" : undefined,
        pointerEvents: visible ? "auto" : "none",
      },
    },
    showDummy
      ? e(PanelShellDummy, {
          label: "Buff / item info",
          hint: "Click a buff or gear slot",
          accent: "#5a7a5a",
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
      className: "comm-info-dialog-slot",
      // Always mounted so stock `condition_click` / `slot_click` can write.
      style: {
        display: "block",
        height: open || props.layoutEdit ? undefined : 0,
        overflow: open ? "visible" : "hidden",
        minHeight: 0,
      },
    }),
  );
}
