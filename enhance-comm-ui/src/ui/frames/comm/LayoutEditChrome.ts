import { getReact, e } from "../../../host/react";
import {
  downloadLayoutJson,
  parseLayoutExport,
  stringifyLayoutExport,
} from "../../../lib/layoutExport";
import {
  getLayoutFreePlacement,
  getLayoutGridStep,
  setLayoutFreePlacement,
  setLayoutGridStep,
  subscribeLayoutEditPrefs,
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

export function LayoutEditChrome(props: LayoutEditChromeProps): any {
  const React = getReact();
  const [status, setStatus] = React.useState("");
  const [pasteOpen, setPasteOpen] = React.useState(false);
  const [pasteText, setPasteText] = React.useState("");
  const [freePlacement, setFreePlacement] = React.useState(() =>
    getLayoutFreePlacement(),
  );
  const [gridStep, setGridStep] = React.useState(() => getLayoutGridStep());
  const fileRef = React.useRef(null as HTMLInputElement | null);

  React.useEffect(
    () =>
      subscribeLayoutEditPrefs(() => {
        setFreePlacement(getLayoutFreePlacement());
        setGridStep(getLayoutGridStep());
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

  const modes: LayoutProfileMode[] = ["auto", "desktop", "tablet", "phone"];
  const stepLabel = `${gridStep}%`;

  return e(
    "div",
    {
      style: {
        position: "absolute",
        left: "50%",
        top: "8px",
        transform: "translateX(-50%)",
        zIndex: 50,
        pointerEvents: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        alignItems: "stretch",
        padding: "8px 12px",
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
        style: {
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          alignItems: "center",
        },
      },
      `Layout edit · ${profileLabel(props.viewportProfile)}` +
        (props.layoutProfileMode === "auto" ? " (auto)" : " (forced)"),
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
            title: freePlacement
              ? `Grid lines every ${step}% (snap off while Free is on)`
              : `Grid + snap every ${step}%`,
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
          ? "Free drag · peer snap 0/50/100 · soft avoid · Ctrl+Shift+L"
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
