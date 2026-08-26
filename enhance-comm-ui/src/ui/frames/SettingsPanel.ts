/**
 * Settings hub — searchable two-pane shell backed by a small registry.
 * Keeps the live pane model while avoiding the old module aggregation path.
 */

import { e, getReact } from "../../host/react";
import type { PanelId, PanelPos } from "../../lib/layout";
import { PositionedPanel } from "../chrome/PositionedPanel";
import { ensureSettingsPanelCss } from "./settingsPanelCss";
import {
  defaultSettingsPaneId,
  getSettingsPane,
  SETTINGS_PANES,
  settingsPaneMatchCounts,
  type SettingsPaneId,
} from "./settings/settingsRegistry";

export type SettingsPanelProps = {
  onClose: () => void;
  visible: (id: PanelId) => boolean;
  setVisible: (id: PanelId, visible: boolean) => void;
  setPanelPos: (id: PanelId, pos: PanelPos) => void;
  windowPos: PanelPos;
  onMoveWindow: (pos: PanelPos) => void;
  onReplayIntroTour: () => void;
  onOpenChangelog: () => void;
  onOpenServerUpdateNotes: () => void;
};

function navBtn(
  id: SettingsPaneId,
  label: string,
  cat: SettingsPaneId,
  count: number,
  dim: boolean,
  setCat: (next: SettingsPaneId) => void,
): any {
  return e(
    "button",
    {
      type: "button",
      className: `ecu-settings-nav-btn${dim ? " is-dim" : ""}`,
      "aria-pressed": cat === id ? "true" : "false",
      onClick: () => setCat(id),
    },
    e("span", null, label),
    e("span", { className: "ecu-settings-nav-count" }, String(count)),
  );
}

export function SettingsPanel(props: SettingsPanelProps): any {
  const React = getReact();
  ensureSettingsPanelCss();
  const [cat, setCat] = React.useState(defaultSettingsPaneId);
  const [query, setQuery] = React.useState("");
  const propsRef = React.useRef(props);
  propsRef.current = props;
  const onClose = React.useCallback(() => propsRef.current.onClose(), []);
  const setVisible = React.useCallback(
    (id: PanelId, visible: boolean) => propsRef.current.setVisible(id, visible),
    [],
  );
  const setPanelPos = React.useCallback(
    (id: PanelId, pos: PanelPos) => propsRef.current.setPanelPos(id, pos),
    [],
  );
  const deferredQuery = React.useDeferredValue
    ? React.useDeferredValue(query)
    : query;
  const active = React.useMemo(() => getSettingsPane(cat), [cat]);
  const trimmedQuery = React.useMemo(
    () => deferredQuery.trim(),
    [deferredQuery],
  );
  const counts = React.useMemo(
    () => settingsPaneMatchCounts(trimmedQuery),
    [trimmedQuery],
  );
  const navKids = React.useMemo(() => {
    const kids: any[] = [];
    for (let i = 0; i < SETTINGS_PANES.length; i++) {
      const pane = SETTINGS_PANES[i];
      kids.push(
        navBtn(
          pane.id,
          pane.label,
          cat,
          counts[pane.id],
          trimmedQuery.length > 0 && counts[pane.id] === 0,
          setCat,
        ),
      );
    }
    return kids;
  }, [cat, counts, trimmedQuery, setCat]);

  return e(
    "div",
    {
      className: "ecu-settings-backdrop",
      onMouseDown: (ev: { target: unknown; currentTarget: unknown }) => {
        if (ev.target === ev.currentTarget) onClose();
      },
    },
    e(
      PositionedPanel,
      {
        id: "settings-panel",
        pos: props.windowPos,
        editing: false,
        movable: true,
        onMove: (_id: string, next: PanelPos) => props.onMoveWindow(next),
        onClose,
        label: "Settings",
        showMoveGrip: true,
        closePlacement: "above",
        style: {
          width: "min(980px, 96vw)",
          height: "min(760px, 92vh)",
          pointerEvents: "auto",
        },
      },
      e(
        "div",
        {
          className: "ecu-settings-modal",
          onMouseDown: (ev: { stopPropagation: () => void }) =>
            ev.stopPropagation(),
        },
        e(
          "div",
          { className: "ecu-settings-hd" },
          e(
            "div",
            { className: "ecu-settings-hd-copy" },
            e("input", {
              type: "search",
              className: "ecu-settings-search",
              placeholder: "Search settings…",
              value: query,
              onChange: (ev: { target: { value: string } }) =>
                setQuery(ev.target.value || ""),
            }),
          ),
        ),
        e(
          "div",
          { className: "ecu-settings-split" },
          e("div", { className: "ecu-settings-nav" }, ...navKids),
          e(
            "div",
            { className: "ecu-settings-pane" },
            e("div", { className: "ecu-settings-pane-title" }, active.label),
            e("p", { className: "ecu-settings-pane-desc" }, active.description),
            active.render({
              query: trimmedQuery,
              visible: props.visible,
              setVisible,
              setPanelPos,
              onReplayIntroTour: props.onReplayIntroTour,
              onOpenChangelog: props.onOpenChangelog,
              onOpenServerUpdateNotes: props.onOpenServerUpdateNotes,
            }),
          ),
        ),
      ),
    ),
  );
}
