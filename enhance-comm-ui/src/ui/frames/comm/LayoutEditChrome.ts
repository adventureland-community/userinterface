import { getReact, e } from "../../../host/react";
import { deltaToPercent } from "../../../lib/layout";
import {
  downloadLayoutJson,
  parseLayoutExport,
  stringifyLayoutExport,
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
  type LayoutProfileMode,
  type PanelLayoutsByProfile,
} from "../../../lib/settings";
import {
  profileLabel,
  type ViewportProfile,
} from "../../../lib/viewport";

export type LayoutEditChromeProps = {
  onReset: () => void;
  onDone: () => void;
  viewportProfile: ViewportProfile;
  layoutProfileMode: LayoutProfileMode;
  onProfileMode: (mode: LayoutProfileMode) => void;
  exportLayouts: () => PanelLayoutsByProfile;
  importLayouts: (layouts: PanelLayoutsByProfile) => void;
};

function btnStyle(active?: boolean): Record<string, any> {
  return {
    cursor: "pointer",
    fontSize: "13px",
    padding: "6px 10px",
    minHeight: "36px",
    border: active ? "1px solid #ffe08a" : "1px solid #886",
    background: active ? "#3a3510" : "#222",
    color: active ? "#ffe08a" : "#eee",
    textShadow: "none",
    fontWeight: "normal",
  };
}

/**
 * Floating Layout-edit toolbar. Draggable via the grab row so it can be moved
 * off topCenter (server/map); position persists in layout-edit prefs.
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
  const [chromePos, setChromePos] = React.useState(
    (): LayoutChromePos => getLayoutChromePos(),
  );
  const fileRef = React.useRef(null as HTMLInputElement | null);
  const dragging = React.useRef(false);
  const dragStart = React.useRef({
    x: 0,
    y: 0,
    posX: 0,
    posY: 0,
  });
  const chromePosRef = React.useRef(chromePos);
  chromePosRef.current = chromePos;

  React.useEffect(
    () =>
      subscribeLayoutEditPrefs(() => {
        setFreePlacement(getLayoutFreePlacement());
        setGridStep(getLayoutGridStep());
        // Avoid fighting an in-progress drag with a prefs echo from ourselves.
        if (!dragging.current) {
          setChromePos(getLayoutChromePos());
        }
      }),
    [],
  );

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
    props.importLayouts(parsed.layoutsByProfile);
    setStatus("Layout imported");
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
    ev.preventDefault();
    ev.stopPropagation();
    dragging.current = true;
    dragStart.current = {
      x: ev.clientX,
      y: ev.clientY,
      posX: chromePosRef.current.x,
      posY: chromePosRef.current.y,
    };
    try {
      ev.currentTarget.setPointerCapture(ev.pointerId);
    } catch {
      // ignore
    }
  };

  const onChromePointerMove = (ev: any) => {
    if (!dragging.current) return;
    const root =
      (document.getElementById("comm-ui") as HTMLElement | null) ||
      document.documentElement;
    const rect = root.getBoundingClientRect();
    const { dxPct, dyPct } = deltaToPercent(
      ev.clientX - dragStart.current.x,
      ev.clientY - dragStart.current.y,
      rect.width,
      rect.height,
    );
    const next: LayoutChromePos = {
      x: Math.max(0, Math.min(100, dragStart.current.posX + dxPct)),
      y: Math.max(0, Math.min(100, dragStart.current.posY + dyPct)),
    };
    chromePosRef.current = next;
    setChromePos(next);
  };

  const onChromePointerUp = (ev: any) => {
    if (!dragging.current) return;
    dragging.current = false;
    try {
      ev.currentTarget.releasePointerCapture(ev.pointerId);
    } catch {
      // ignore
    }
    const next = setLayoutChromePos(chromePosRef.current);
    setChromePos(next.chromePos);
  };

  const modes: LayoutProfileMode[] = ["auto", "desktop", "tablet", "phone"];
  const stepLabel = `${gridStep}%`;

  return e(
    "div",
    {
      className: "comm-layout-edit-chrome",
      style: {
        position: "absolute",
        left: `${chromePos.x}%`,
        top: `${chromePos.y}%`,
        transform: "translateX(-50%)",
        zIndex: 50,
        pointerEvents: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        alignItems: "stretch",
        padding: "6px 12px 8px",
        background: "rgba(30,28,10,0.95)",
        border: "1px solid #aa8",
        color: "#ffe08a",
        fontSize: "14px",
        maxWidth: "min(960px, 96vw)",
        textShadow: "none",
        fontWeight: "normal",
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
          padding: "4px 2px 2px",
          margin: "0 -4px 2px",
          cursor: "grab",
          userSelect: "none",
          touchAction: "none",
          color: "#ffe08a",
          fontSize: "13px",
          minHeight: "28px",
        },
        onPointerDown: onChromePointerDown,
        onPointerMove: onChromePointerMove,
        onPointerUp: onChromePointerUp,
        onPointerCancel: onChromePointerUp,
      },
      e("span", { "aria-hidden": true }, "⠿"),
      e(
        "span",
        { style: { flex: "1 1 auto", whiteSpace: "nowrap" } },
        `Layout edit · ${profileLabel(props.viewportProfile)}` +
          (props.layoutProfileMode === "auto" ? " (auto)" : " (forced)"),
      ),
      e(
        "span",
        { style: { color: "#886", fontSize: "11px", whiteSpace: "nowrap" } },
        "drag to move",
      ),
    ),
    e(
      "div",
      {
        style: {
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          alignItems: "center",
        },
      },
      e(
        "button",
        { type: "button", onClick: props.onReset, style: btnStyle() },
        "Reset positions",
      ),
      e(
        "button",
        {
          type: "button",
          onClick: toggleFree,
          style: btnStyle(freePlacement),
          title: freePlacement
            ? "Free placement: no grid snap (peer edges still magnetize)"
            : `Snap to ${stepLabel} grid while dragging (peer edges still magnetize)`,
        },
        freePlacement ? "Free: ON" : "Free",
      ),
      e("span", { style: { color: "#aa8", fontSize: "12px" } }, "Grid"),
      ...LAYOUT_GRID_STEP_PRESETS.map((step) =>
        e(
          "button",
          {
            key: `grid-${step}`,
            type: "button",
            onClick: () => onGridStep(step),
            style: btnStyle(Math.abs(gridStep - step) < 1e-6),
            title: `Grid + snap every ${step}% (ignored while Free is on)`,
          },
          `${step}%`,
        ),
      ),
      e(
        "button",
        { type: "button", onClick: onExport, style: btnStyle() },
        "Copy layout",
      ),
      e(
        "button",
        { type: "button", onClick: onDownload, style: btnStyle() },
        "Download",
      ),
      e(
        "button",
        {
          type: "button",
          onClick: () => setPasteOpen((v: boolean) => !v),
          style: btnStyle(pasteOpen),
        },
        pasteOpen ? "Cancel paste" : "Paste / import",
      ),
      e(
        "button",
        {
          type: "button",
          onClick: () => fileRef.current && fileRef.current.click(),
          style: btnStyle(),
        },
        "Upload JSON",
      ),
      e("input", {
        ref: fileRef,
        type: "file",
        accept: "application/json,.json",
        style: { display: "none" },
        onChange: onFile,
      }),
      e(
        "button",
        {
          type: "button",
          onClick: props.onDone,
          style: btnStyle(true),
        },
        "Done",
      ),
    ),
    e(
      "div",
      {
        style: {
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          alignItems: "center",
          fontSize: "13px",
          color: "#ddd",
        },
      },
      e("span", { style: { color: "#aa8" } }, "Profile"),
      ...modes.map((mode) =>
        e(
          "button",
          {
            key: mode,
            type: "button",
            onClick: () => props.onProfileMode(mode),
            style: btnStyle(props.layoutProfileMode === mode),
          },
          mode === "auto" ? "Auto" : profileLabel(mode),
        ),
      ),
      e(
        "span",
        { style: { color: "#888", fontSize: "12px" } },
        freePlacement
          ? `Free drag · peer snap 0/50/100 · soft avoid · Ctrl+Shift+L (grid ${stepLabel} hidden snap)`
          : `${stepLabel} grid snap · peer snap · soft avoid · Ctrl+Shift+L`,
      ),
    ),
    status
      ? e("div", { style: { fontSize: "13px", color: "#9a9" } }, status)
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
            rows: 5,
            placeholder: "Paste enhance-comm-ui layout JSON…",
            onChange: (ev: any) => setPasteText(ev.target.value),
            style: {
              width: "100%",
              minHeight: "100px",
              background: "#141410",
              color: "#eee",
              border: "1px solid #665",
              fontSize: "12px",
              fontFamily: "Consolas, Monaco, monospace",
              textShadow: "none",
              fontWeight: "normal",
              boxSizing: "border-box",
            },
          }),
          e(
            "button",
            {
              type: "button",
              onClick: () => applyImportText(pasteText),
              style: btnStyle(true),
            },
            "Apply import",
          ),
        )
      : null,
  );
}
