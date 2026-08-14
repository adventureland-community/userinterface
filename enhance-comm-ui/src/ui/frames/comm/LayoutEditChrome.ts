import { getReact, e } from "../../../host/react";
import {
  downloadLayoutJson,
  parseLayoutExport,
  stringifyLayoutExport,
  type LayoutExportInput,
} from "../../../lib/layoutExport";
import {
  getLayoutChromePos,
  getLayoutFreePlacement,
  getLayoutGridStep,
  setLayoutChromePos,
  setLayoutFreePlacement,
  setLayoutGridStep,
  subscribeLayoutEditPrefs,
  type LayoutChromePos,
} from "../../../lib/layoutEditPrefs";
import { LAYOUT_GRID_STEP_PRESETS } from "../../../lib/layoutGrid";
import {
  layoutDragRoot,
  percentFromPointerDrag,
  tryReleasePointerCapture,
  trySetPointerCapture,
  type PercentDragStart,
} from "../../../lib/percentDrag";
import { type LayoutProfileMode } from "../../../lib/settings";
import { profileLabel, type ViewportProfile } from "../../../lib/viewport";
import { TYPE, PIXEL_TEXT } from "../../../lib/typeScale";
import type { LayoutImportPackage } from "../../hooks/usePanelLayoutState";
import type { MeterInstance } from "../../../meters/meterTypes";

/** Drag-grip / layout-chrome tooltip fragment. */
const PLACE_WITHOUT_GROUP_HINT = "Ctrl = place without grouping";

export type LayoutEditChromeProps = {
  onReset: () => void;
  onDone: () => void;
  viewportProfile: ViewportProfile;
  layoutProfileMode: LayoutProfileMode;
  onProfileMode: (mode: LayoutProfileMode) => void;
  exportLayouts: () => LayoutExportInput;
  importLayouts: (pkg: LayoutImportPackage) => MeterInstance[] | undefined;
  /** When import restores meters, sync React meter state. */
  onMetersImported?: (meters: MeterInstance[]) => void;
  onApplyAllCurrent?: () => void;
  onApplyAllTotal?: () => void;
  onAddMeter?: () => void;
  /** Replace meter windows with DPS / HPS defaults. */
  onResetMeters?: () => void;
};

const PANEL_W = 420;

function btnStyle(active?: boolean, compact?: boolean): Record<string, any> {
  return {
    ...PIXEL_TEXT,
    cursor: "pointer",
    fontSize: compact ? TYPE.secondary : TYPE.body,
    padding: compact ? "6px 9px" : "7px 11px",
    minHeight: compact ? "32px" : "36px",
    border: active ? "1px solid #ffe08a" : "1px solid #665",
    background: active ? "#3a3510" : "#1c1c18",
    color: active ? "#ffe08a" : "#ddd",
    borderRadius: "3px",
    flex: "0 0 auto",
  };
}

function rowStyle(wrap?: boolean): Record<string, any> {
  return {
    display: "flex",
    flexWrap: wrap ? "wrap" : "nowrap",
    gap: "6px",
    alignItems: "center",
    minWidth: 0,
  };
}

function labelStyle(): Record<string, any> {
  return {
    color: "#c4b48a",
    fontSize: TYPE.secondary,
    letterSpacing: "0.03em",
    textTransform: "uppercase",
    flex: "0 0 58px",
    textAlign: "right",
  };
}

function segStyle(): Record<string, any> {
  return {
    display: "flex",
    flexWrap: "nowrap",
    gap: "0",
    alignItems: "center",
    border: "1px solid #554",
    borderRadius: "3px",
    overflow: "hidden",
    flex: "0 0 auto",
  };
}

function segBtnStyle(active?: boolean): Record<string, any> {
  return {
    ...btnStyle(active, true),
    border: "none",
    borderRadius: 0,
    borderRight: "1px solid #443",
    minWidth: "44px",
    padding: "6px 8px",
  };
}

/** Keep centered-at-(x,y%) panel fully inside the drag root. */
function clampChromePos(
  pos: LayoutChromePos,
  panelW: number,
  panelH: number,
): LayoutChromePos {
  const root = layoutDragRoot().getBoundingClientRect();
  const rw = Math.max(1, root.width);
  const rh = Math.max(1, root.height);
  const halfW = Math.min(panelW, rw - 16) / 2;
  const minX = (halfW / rw) * 100;
  const maxX = 100 - minX;
  const maxY = Math.max(0, ((rh - panelH - 8) / rh) * 100);
  return {
    x: Math.max(minX, Math.min(maxX, pos.x)),
    y: Math.max(0, Math.min(maxY, pos.y)),
  };
}

/**
 * Floating Layout-edit toolbar. Fixed-width sectioned panel so position
 * never reflows into a tall skinny stack; drag handle moves it (clamped).
 */
export function LayoutEditChrome(props: LayoutEditChromeProps): any {
  const React = getReact();
  const [status, setStatus] = React.useState("");
  const [pasteOpen, setPasteOpen] = React.useState(false);
  const [pasteText, setPasteText] = React.useState("");
  const [freePlacement, setFreePlacement] = React.useState(() =>
    getLayoutFreePlacement(),
  );
  const [gridStep, setGridStep] = React.useState(() => getLayoutGridStep());
  const [chromePos, setChromePos] = React.useState((): LayoutChromePos =>
    getLayoutChromePos(),
  );
  const fileRef = React.useRef(null as HTMLInputElement | null);
  const shellRef = React.useRef(null as HTMLDivElement | null);
  const dragging = React.useRef(false);
  const dragStart = React.useRef({
    clientX: 0,
    clientY: 0,
    posX: 0,
    posY: 0,
  } as PercentDragStart);
  const chromePosRef = React.useRef(chromePos);
  chromePosRef.current = chromePos;

  React.useEffect(
    () =>
      subscribeLayoutEditPrefs(() => {
        setFreePlacement(getLayoutFreePlacement());
        setGridStep(getLayoutGridStep());
        if (!dragging.current) {
          setChromePos(getLayoutChromePos());
        }
      }),
    [],
  );

  const measure = () => {
    const el = shellRef.current;
    if (!el) return { w: PANEL_W, h: 200 };
    return { w: el.offsetWidth || PANEL_W, h: el.offsetHeight || 200 };
  };

  const onExport = async () => {
    const json = stringifyLayoutExport(props.exportLayouts());
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(json);
        setStatus("Layout JSON copied");
      } else {
        downloadLayoutJson(json);
        setStatus("Layout JSON downloaded");
      }
    } catch {
      downloadLayoutJson(json);
      setStatus("Layout JSON downloaded");
    }
  };

  const onDownload = () => {
    downloadLayoutJson(stringifyLayoutExport(props.exportLayouts()));
    setStatus("Layout JSON downloaded");
  };

  const applyImportText = (raw: string) => {
    const parsed = parseLayoutExport(raw);
    if (parsed.ok === false) {
      setStatus(parsed.error);
      return;
    }
    const importedMeters = props.importLayouts({
      layoutsByProfile: parsed.layoutsByProfile,
      meterInstances: parsed.meterInstances,
      layoutEditPrefs: parsed.layoutEditPrefs,
    });
    if (importedMeters && props.onMetersImported) {
      props.onMetersImported(importedMeters);
    }
    const bits = ["Layout imported"];
    if (parsed.meterInstances) bits.push("meters");
    if (parsed.layoutEditPrefs) bits.push("snap prefs");
    setStatus(
      bits.length > 1
        ? `Layout imported (${bits.slice(1).join(" + ")})`
        : bits[0],
    );
    setPasteOpen(false);
    setPasteText("");
  };

  const onFile = (ev: any) => {
    const file = ev.target && ev.target.files && ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      applyImportText(String(reader.result || ""));
    };
    reader.onerror = () => setStatus("Failed to read file");
    reader.readAsText(file);
    ev.target.value = "";
  };

  const toggleFree = () => {
    const next = setLayoutFreePlacement(!freePlacement);
    setFreePlacement(next.freePlacement);
  };

  const onGridStep = (step: number) => {
    const next = setLayoutGridStep(step);
    setGridStep(next.gridStep);
  };

  const onChromePointerDown = (ev: any) => {
    // Done / other controls live in the drag handle — don't steal their clicks.
    const t = ev.target as Element | null;
    if (
      t &&
      typeof t.closest === "function" &&
      t.closest("button, input, a, select, textarea, label")
    ) {
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();
    dragging.current = true;
    dragStart.current = {
      clientX: ev.clientX,
      clientY: ev.clientY,
      posX: chromePosRef.current.x,
      posY: chromePosRef.current.y,
    };
    trySetPointerCapture(ev.currentTarget, ev.pointerId);
  };

  const onChromePointerMove = (ev: any) => {
    if (!dragging.current) return;
    const raw = percentFromPointerDrag(
      ev.clientX,
      ev.clientY,
      dragStart.current,
    ) as LayoutChromePos;
    const size = measure();
    const next = clampChromePos(raw, size.w, size.h);
    chromePosRef.current = next;
    setChromePos(next);
  };

  const onChromePointerUp = (ev: any) => {
    if (!dragging.current) return;
    dragging.current = false;
    tryReleasePointerCapture(ev.currentTarget, ev.pointerId);
    const size = measure();
    const clamped = clampChromePos(chromePosRef.current, size.w, size.h);
    const next = setLayoutChromePos(clamped);
    setChromePos(next.chromePos);
  };

  const modes: LayoutProfileMode[] = ["auto", "desktop", "tablet", "phone"];
  const stepLabel = `${gridStep}%`;

  const gridSeg = e(
    "div",
    { style: segStyle(), role: "group", "aria-label": "Grid step" },
    ...LAYOUT_GRID_STEP_PRESETS.map((step, i) =>
      e(
        "button",
        {
          key: `grid-${step}`,
          type: "button",
          onClick: () => onGridStep(step),
          style: {
            ...segBtnStyle(Math.abs(gridStep - step) < 1e-6),
            borderRight:
              i === LAYOUT_GRID_STEP_PRESETS.length - 1
                ? "none"
                : "1px solid #443",
          },
          title: `Snap every ${step}% of the shorter side`,
        },
        `${step}%`,
      ),
    ),
  );

  const profileSeg = e(
    "div",
    { style: segStyle(), role: "group", "aria-label": "Layout profile" },
    ...modes.map((mode, i) =>
      e(
        "button",
        {
          key: mode,
          type: "button",
          onClick: () => props.onProfileMode(mode),
          style: {
            ...segBtnStyle(props.layoutProfileMode === mode),
            borderRight: i === modes.length - 1 ? "none" : "1px solid #443",
            minWidth: "52px",
          },
        },
        mode === "auto" ? "Auto" : profileLabel(mode),
      ),
    ),
  );

  return e(
    "div",
    {
      ref: shellRef,
      className: "comm-layout-edit-chrome",
      style: {
        position: "absolute",
        left: `${chromePos.x}%`,
        top: `${chromePos.y}%`,
        transform: "translateX(-50%)",
        zIndex: 80,
        pointerEvents: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        width: `min(${PANEL_W}px, calc(100vw - 24px))`,
        boxSizing: "border-box",
        padding: "8px 10px 10px",
        background: "rgba(22,20,14,0.96)",
        border: "1px solid #aa8",
        borderRadius: "4px",
        color: "#ffe08a",
        fontSize: TYPE.body,
        boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
        ...PIXEL_TEXT,
      },
    },
    e(
      "div",
      {
        className: "comm-layout-edit-chrome-handle",
        title: "Drag to move this toolbar",
        "aria-label": "Drag Layout edit toolbar",
        style: {
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "2px 0 6px",
          cursor: "grab",
          userSelect: "none",
          touchAction: "none",
          color: "#ffe08a",
          fontSize: TYPE.title,
          borderBottom: "1px solid rgba(170,136,80,0.35)",
          marginBottom: "2px",
        },
        onPointerDown: onChromePointerDown,
        onPointerMove: onChromePointerMove,
        onPointerUp: onChromePointerUp,
        onPointerCancel: onChromePointerUp,
      },
      e("span", { "aria-hidden": true }, "⠿"),
      e(
        "span",
        {
          style: {
            flex: "1 1 auto",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          },
        },
        `Layout edit · ${profileLabel(props.viewportProfile)}` +
          (props.layoutProfileMode === "auto" ? " (auto)" : ""),
      ),
      e(
        "button",
        {
          type: "button",
          onClick: props.onDone,
          onPointerDown: (ev: any) => {
            ev.stopPropagation();
          },
          style: {
            ...btnStyle(true, false),
            marginLeft: "auto",
            minWidth: "72px",
            fontSize: TYPE.body,
          },
        },
        "Done",
      ),
    ),

    e(
      "div",
      { style: rowStyle(true) },
      e("span", { style: labelStyle() }, "Meters"),
      e(
        "button",
        {
          type: "button",
          onClick: props.onReset,
          style: btnStyle(false, true),
          title: "Reset HUD panel positions for this profile",
        },
        "Positions",
      ),
      props.onResetMeters
        ? e(
            "button",
            {
              type: "button",
              onClick: props.onResetMeters,
              style: btnStyle(false, true),
              title: "Replace meter windows with defaults: DPS ‖ HPS",
            },
            "Meters",
          )
        : null,
      props.onAddMeter
        ? e(
            "button",
            {
              type: "button",
              onClick: props.onAddMeter,
              style: btnStyle(false, true),
              title: "Add a meter panel from the catalog",
            },
            "+ Add",
          )
        : null,
      props.onApplyAllCurrent
        ? e(
            "button",
            {
              type: "button",
              onClick: props.onApplyAllCurrent,
              style: btnStyle(false, true),
              title: "Set every meter segment to Current",
            },
            "→ Cur",
          )
        : null,
      props.onApplyAllTotal
        ? e(
            "button",
            {
              type: "button",
              onClick: props.onApplyAllTotal,
              style: btnStyle(false, true),
              title: "Set every meter segment to Total",
            },
            "→ Tot",
          )
        : null,
    ),

    e(
      "div",
      { style: rowStyle() },
      e("span", { style: labelStyle() }, "Snap"),
      e(
        "button",
        {
          type: "button",
          onClick: toggleFree,
          style: btnStyle(freePlacement, true),
          title: freePlacement
            ? "Free placement: no grid snap (layout edit + play arrange; peer + screen-edge magnets)"
            : `Snap to square ${stepLabel} fine grid (layout edit + unlocked/play arrange)`,
        },
        freePlacement ? "Free" : "Grid",
      ),
      gridSeg,
    ),

    e(
      "div",
      { style: rowStyle() },
      e("span", { style: labelStyle() }, "File"),
      e(
        "button",
        {
          type: "button",
          onClick: onExport,
          style: btnStyle(false, true),
        },
        "Copy",
      ),
      e(
        "button",
        {
          type: "button",
          onClick: onDownload,
          style: btnStyle(false, true),
        },
        "Save",
      ),
      e(
        "button",
        {
          type: "button",
          onClick: () => setPasteOpen((v: boolean) => !v),
          style: btnStyle(pasteOpen, true),
        },
        pasteOpen ? "Cancel" : "Paste",
      ),
      e(
        "button",
        {
          type: "button",
          onClick: () => fileRef.current && fileRef.current.click(),
          style: btnStyle(false, true),
        },
        "Upload",
      ),
      e("input", {
        ref: fileRef,
        type: "file",
        accept: "application/json,.json",
        style: { display: "none" },
        onChange: onFile,
      }),
    ),

    e(
      "div",
      { style: rowStyle() },
      e("span", { style: labelStyle() }, "Profile"),
      profileSeg,
    ),

    e(
      "div",
      {
        style: {
          color: "#a89878",
          fontSize: TYPE.secondary,
          lineHeight: 1.4,
          paddingTop: "2px",
        },
      },
      freePlacement
        ? `Free drag/resize (edit + play) · peer + screen-edge · ${PLACE_WITHOUT_GROUP_HINT} · Ctrl+Shift+L`
        : `${stepLabel} fine snap (edit + unlocked play) · Shift=free size · ${PLACE_WITHOUT_GROUP_HINT} · Ctrl+Shift+L`,
    ),

    status
      ? e("div", { style: { fontSize: TYPE.secondary, color: "#9a9" } }, status)
      : null,

    pasteOpen
      ? e(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            },
          },
          e("textarea", {
            value: pasteText,
            rows: 4,
            placeholder: "Paste enhance-comm-ui layout JSON…",
            onChange: (ev: any) => setPasteText(ev.target.value),
            style: {
              width: "100%",
              minHeight: "88px",
              background: "#141410",
              color: "#eee",
              border: "1px solid #665",
              borderRadius: "3px",
              fontSize: TYPE.secondary,
              boxSizing: "border-box",
              ...PIXEL_TEXT,
            },
          }),
          e(
            "button",
            {
              type: "button",
              onClick: () => applyImportText(pasteText),
              style: btnStyle(true, true),
            },
            "Apply import",
          ),
        )
      : null,
  );
}
