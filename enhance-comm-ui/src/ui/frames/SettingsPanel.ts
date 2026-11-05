/**
 * Settings hub — searchable two-pane shell backed by a small registry.
 * Keeps the live pane model while avoiding the old module aggregation path.
 */

import { e, getReact } from "../../host/react";
import type { PanelId, PanelPos } from "../../lib/layout";
import { PositionedPanel } from "../chrome/PositionedPanel";
import {
  bindSwipeDownClose,
  syncPhoneSheetOpenClass,
} from "../chrome/phoneShell";
import { ensureSettingsPanelCss } from "./settingsPanelCss";
import {
  defaultSettingsPaneId,
  getSettingsPane,
  SETTINGS_PANES,
  settingsPaneMatchCounts,
  visibleSettingsSubsections,
  type SettingsPaneId,
} from "./settings/settingsRegistry";

/** Phone top pills — map to existing panes (not new settings). */
const PHONE_SETTINGS_PILLS: readonly {
  id: SettingsPaneId;
  label: string;
}[] = [
  { id: "commUi", label: "Phone" },
  { id: "bag", label: "Bag" },
  { id: "commHud", label: "Display" },
];
import type { HudDensity } from "../../lib/perfPrefs";
import { detectViewportProfile } from "../../lib/viewport";

export type SettingsPanelProps = {
  onClose: () => void;
  visible: (id: PanelId) => boolean;
  setVisible: (id: PanelId, visible: boolean) => void;
  setPanelPos: (id: PanelId, pos: PanelPos) => void;
  windowPos: PanelPos;
  onMoveWindow: (pos: PanelPos) => void;
  onReplayTour: (id: string) => void;
  onResetTour: (id: string) => void;
  onOpenChangelog: () => void;
  onOpenServerUpdateNotes: () => void;
  hudDensity?: HudDensity;
  setHudDensity?: (mode: HudDensity) => void;
};

function scrollPaneToSection(secId: string): void {
  const el = document.getElementById(secId);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

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
  const phone = detectViewportProfile() === "phone";
  // Phone opens on Display — toggles + (phone) drawing switches fill the sheet.
  const [cat, setCat] = React.useState(
    () => (phone ? "commHud" : defaultSettingsPaneId()) as SettingsPaneId,
  );
  const [query, setQuery] = React.useState("");
  const [activeSec, setActiveSec] = React.useState("");
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

  React.useEffect(() => {
    setActiveSec("");
  }, [cat]);

  const navKids = React.useMemo(() => {
    if (phone && !trimmedQuery) {
      const kids: any[] = [];
      for (let i = 0; i < PHONE_SETTINGS_PILLS.length; i++) {
        const pill = PHONE_SETTINGS_PILLS[i];
        kids.push(
          e(
            "button",
            {
              type: "button",
              key: pill.id,
              className:
                "ecu-settings-phone-pill" + (cat === pill.id ? " is-on" : ""),
              "aria-pressed": cat === pill.id ? "true" : "false",
              onClick: () => setCat(pill.id),
            },
            pill.label,
          ),
        );
      }
      return kids;
    }
    const kids: any[] = [];
    for (let i = 0; i < SETTINGS_PANES.length; i++) {
      const pane = SETTINGS_PANES[i];
      const selected = cat === pane.id;
      const groupKids: any[] = [
        navBtn(
          pane.id,
          pane.label,
          cat,
          counts[pane.id],
          trimmedQuery.length > 0 && counts[pane.id] === 0,
          setCat,
        ),
      ];
      if (selected) {
        const subs = visibleSettingsSubsections(pane);
        if (subs.length) {
          const subKids: any[] = [];
          for (let s = 0; s < subs.length; s++) {
            const sub = subs[s];
            subKids.push(
              e(
                "button",
                {
                  type: "button",
                  key: sub.id,
                  className:
                    "ecu-settings-nav-sub" +
                    (activeSec === sub.id ? " is-active" : ""),
                  onClick: () => {
                    setActiveSec(sub.id);
                    // Pane content may mount on the same tick as category switch.
                    window.requestAnimationFrame(() => {
                      scrollPaneToSection(sub.id);
                    });
                  },
                },
                sub.label,
              ),
            );
          }
          groupKids.push(
            e(
              "div",
              { key: "subs-" + pane.id, className: "ecu-settings-nav-subs" },
              ...subKids,
            ),
          );
        }
      }
      kids.push(
        e(
          "div",
          {
            key: pane.id,
            className:
              "ecu-settings-nav-group" + (selected ? " is-open" : ""),
          },
          ...groupKids,
        ),
      );
    }
    return kids;
  }, [cat, counts, trimmedQuery, setCat, activeSec, phone]);

  const headRef = React.useRef(null as HTMLElement | null);

  React.useEffect(() => {
    if (!phone) return;
    return bindSwipeDownClose(headRef.current, onClose);
  }, [phone, onClose]);

  React.useEffect(() => {
    if (!phone) return;
    syncPhoneSheetOpenClass();
    return () => syncPhoneSheetOpenClass();
  }, [phone]);

  const modalBody = e(
    "div",
    {
      className: "ecu-settings-modal" + (phone ? " is-phone" : ""),
      onMouseDown: (ev: { stopPropagation: () => void }) =>
        ev.stopPropagation(),
    },
    e(
      "div",
      {
        className: "ecu-settings-hd",
        ref: headRef,
      },
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
      e(
        "div",
        { className: "ecu-settings-nav" + (phone ? " ecu-settings-nav--foot" : "") },
        ...navKids,
        phone
          ? e(
              "button",
              {
                type: "button",
                key: "phone-done",
                className: "ecu-settings-phone-done",
                onClick: onClose,
              },
              "Done",
            )
          : null,
      ),
      e(
        "div",
        { className: "ecu-settings-pane" },
        e("div", { className: "ecu-settings-pane-title" }, active.label),
        // Phone: skip the long pane blurb — rows + foot pills need the height.
        phone
          ? null
          : e("p", { className: "ecu-settings-pane-desc" }, active.description),
        active.render({
          query: trimmedQuery,
          visible: props.visible,
          setVisible,
          setPanelPos,
          onReplayTour: props.onReplayTour,
          onResetTour: props.onResetTour,
          onOpenChangelog: props.onOpenChangelog,
          onOpenServerUpdateNotes: props.onOpenServerUpdateNotes,
          hudDensity: props.hudDensity,
          setHudDensity: props.setHudDensity,
        }),
      ),
    ),
  );

  if (phone) {
    return e(
      "div",
      {
        className: "ecu-settings-backdrop is-phone",
        onMouseDown: (ev: { target: unknown; currentTarget: unknown }) => {
          if (ev.target === ev.currentTarget) onClose();
        },
      },
      modalBody,
    );
  }

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
      modalBody,
    ),
  );
}
