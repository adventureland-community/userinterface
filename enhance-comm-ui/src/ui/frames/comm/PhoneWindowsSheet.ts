/**
 * Phone Apps drawer — Samsung-style icon grid for overlay apps.
 * "Edit home" reveals per-page widget assignment.
 */

import { e, getReact } from "../../../host/react";
import { getObservingId } from "../../../host/al";
import { gateObservedBagOpen } from "../../../host/bagOpenGate";
import { openChat } from "../../../host/chat";
import { openCommander } from "../../../host/commander";
import { syncMailBadge } from "../../../host/mail";
import {
  isPageFullscreen,
  isPageFullscreenSupported,
  togglePageFullscreen,
  subscribePageFullscreen,
} from "../../../host/pageFullscreen";
import {
  CLOSABLE_PANEL_IDS,
  PANEL_CATALOG,
  PANEL_IDS,
  PANEL_LABELS,
  type ClosablePanelId,
  type PanelId,
} from "../../../lib/panelCatalog";
import {
  addPhoneHomeScreen,
  isPhoneHomeWidget,
  removePhoneHomeScreen,
  toggleMeterOnScreen,
  togglePanelOnScreen,
  type PhoneHomeScreen,
} from "../../../lib/phoneHomePages";
import type { MeterInstance } from "../../../meters/meterTypes";
import { ensurePhoneNavCss } from "./phoneNavCss";
import {
  PHONE_HUD_PRESET_IDS,
  PHONE_HUD_PRESET_LABELS,
  type PhoneHudPresetId,
} from "../../../lib/phoneHudPresets";

export type PhoneWindowsSheetProps = {
  open: boolean;
  onClose: () => void;
  visible: (id: PanelId) => boolean;
  setVisible: (id: PanelId, visible: boolean) => void;
  metersHidden: boolean;
  setMetersHiddenPersist: (hidden: boolean) => void;
  meterInstances: MeterInstance[];
  closedMeters: MeterInstance[];
  closeMeterRuntime: (id: string) => void;
  reopenClosedMeter: (id: string) => void;
  onAddMeter: () => void;
  onOpenSettings: () => void;
  layoutEdit?: boolean;
  toggleLayoutEdit?: () => void;
  phoneHomeScreens: PhoneHomeScreen[];
  setPhoneHomeScreens: (screens: PhoneHomeScreen[]) => void;
  phoneHomePage: number;
  setPhoneHomePage: (page: number) => void;
  applyPhoneHudPreset: (preset: PhoneHudPresetId) => void;
};

type AppTile = {
  id: string;
  label: string;
  glyph: string;
  tone: string;
  on: boolean;
  /** Dimmed — still tappable (e.g. Bag when not observing). */
  muted?: boolean;
  /** Show the shared mail unread badge on this tile icon. */
  mailBadge?: boolean;
  onClick: () => void;
};

function switchRow(
  key: string,
  label: string,
  checked: boolean,
  onChange: (next: boolean) => void,
  meta?: string,
): any {
  return e(
    "div",
    { key, className: "ecu-phone-sheet__row" },
    e(
      "div",
      { className: "ecu-phone-sheet__row-label" },
      label,
      meta ? e("span", { className: "ecu-phone-sheet__row-meta" }, meta) : null,
    ),
    e(
      "label",
      { className: "ecu-phone-switch", "aria-label": label },
      e("input", {
        type: "checkbox",
        checked,
        onChange: (ev: { target: { checked: boolean } }) =>
          onChange(!!ev.target.checked),
      }),
      e(
        "span",
        { className: "ecu-phone-switch__track" },
        e("span", { className: "ecu-phone-switch__thumb" }),
      ),
    ),
  );
}

function meterLabel(m: MeterInstance): string {
  const label = typeof m.label === "string" ? m.label.trim() : "";
  if (label) return label;
  return m.id;
}

const HOME_WIDGET_PRIORITY: PanelId[] = [
  "players",
  "bossBar",
  "playerFrame",
  "targetFrame",
  "minimap",
  "serverInfo",
  "mapInfo",
  "kills",
  "threat",
  "enemies",
  "abilityTimeline",
  "abilityTimelineBigIcon",
  "abilityTimelineHighlight",
  "events",
  "eventScore",
  "eventRoster",
  "instance",
  "instanceRun",
];

function orderedHomeWidgetIds(): PanelId[] {
  const seen = new Set<string>();
  const out: PanelId[] = [];
  for (let i = 0; i < HOME_WIDGET_PRIORITY.length; i++) {
    const id = HOME_WIDGET_PRIORITY[i];
    if (!isPhoneHomeWidget(id)) continue;
    seen.add(id);
    out.push(id);
  }
  for (let i = 0; i < PANEL_IDS.length; i++) {
    const id = PANEL_IDS[i];
    if (seen.has(id) || !isPhoneHomeWidget(id)) continue;
    if (id === "buffInfo" || id === "itemInfo") continue;
    out.push(id);
  }
  return out;
}

function appTile(tile: AppTile & { tour?: string }): any {
  const iconKids: any[] = [tile.glyph];
  if (tile.mailBadge) {
    iconKids.push(
      e("span", {
        key: "mail-badge",
        className: "ecu-mail-badge ecu-phone-apps__mail-badge",
        "data-ecu-mail-badge": "1",
        hidden: true,
      }),
    );
  }
  return e(
    "button",
    {
      key: tile.id,
      type: "button",
      className:
        "ecu-phone-apps__tile" +
        (tile.on ? " is-on" : "") +
        (tile.muted ? " is-muted" : ""),
      "data-ecu-tour": tile.tour || undefined,
      title: tile.muted ? "Observe a character first" : undefined,
      onClick: tile.onClick,
    },
    e(
      "span",
      {
        className:
          "ecu-phone-apps__icon" + (tile.mailBadge ? " has-badge" : ""),
        style: { background: tile.tone },
      },
      ...iconKids,
    ),
    e("span", { className: "ecu-phone-apps__label" }, tile.label),
    tile.muted
      ? e("span", { className: "ecu-phone-apps__hint" }, "Observe first")
      : null,
  );
}

export function PhoneWindowsSheet(props: PhoneWindowsSheetProps): any {
  const React = getReact();
  ensurePhoneNavCss();
  const sheetRef = React.useRef(null as HTMLDivElement | null);
  const dragStartY = React.useRef(0);
  const dragDy = React.useRef(0);
  const dragging = React.useRef(false);
  const [editHome, setEditHome] = React.useState(false);
  const [fullscreenOn, setFullscreenOn] = React.useState(() =>
    isPageFullscreen(),
  );
  React.useEffect(() => {
    return subscribePageFullscreen(() => setFullscreenOn(isPageFullscreen()));
  }, []);

  const onClose = props.onClose;
  const screens = props.phoneHomeScreens;
  const screenIdx =
    props.phoneHomePage >= 0 && props.phoneHomePage < screens.length
      ? props.phoneHomePage
      : 0;
  const screen = screens[screenIdx] || screens[0];

  React.useEffect(() => {
    if (!props.open) {
      setEditHome(false);
      return;
    }
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props.open, onClose]);

  React.useEffect(() => {
    if (!props.open || editHome) return;
    syncMailBadge();
  }, [props.open, editHome]);

  if (!props.open) return null;

  const resetDrag = () => {
    dragging.current = false;
    dragDy.current = 0;
    const el = sheetRef.current;
    if (el) {
      el.style.transform = "";
      el.style.transition = "";
    }
  };

  const onHandleTouchStart = (ev: TouchEvent) => {
    if (!ev.touches.length) return;
    dragging.current = true;
    dragStartY.current = ev.touches[0].clientY;
    dragDy.current = 0;
    const el = sheetRef.current;
    if (el) el.style.transition = "none";
  };

  const onHandleTouchMove = (ev: TouchEvent) => {
    if (!dragging.current || !ev.touches.length) return;
    const dy = Math.max(0, ev.touches[0].clientY - dragStartY.current);
    dragDy.current = dy;
    const el = sheetRef.current;
    if (el) el.style.transform = "translateY(" + dy + "px)";
    if (dy > 8) ev.preventDefault();
  };

  const onHandleTouchEnd = () => {
    if (!dragging.current) return;
    const dy = dragDy.current;
    if (dy > 90) {
      resetDrag();
      props.onClose();
      return;
    }
    const el = sheetRef.current;
    if (el) {
      el.style.transition = "transform 0.18s ease";
      el.style.transform = "translateY(0)";
    }
    dragging.current = false;
    dragDy.current = 0;
  };

  const openOverlay = (id: PanelId, openFn?: () => void) => {
    props.onClose();
    // Mutual dismiss — same peer set as the dock shade path (incl. market).
    const peers: PanelId[] = [
      "chat",
      "command",
      "mail",
      "bag",
      "bank",
      "market",
    ];
    for (let i = 0; i < peers.length; i++) {
      const peer = peers[i];
      if (peer !== id && props.visible(peer)) props.setVisible(peer, false);
    }
    if (openFn) openFn();
    else props.setVisible(id, true);
  };

  const tiles: Array<AppTile & { tour?: string }> = [
    {
      id: "chat",
      label: "Chat",
      glyph: "C",
      tone: "#2e7d6f",
      on: props.visible("chat"),
      tour: "btn-chat",
      onClick: () => openOverlay("chat", () => openChat({ toggle: true })),
    },
    {
      id: "command",
      label: "Cmd",
      glyph: "</>",
      tone: "#5b4b8a",
      on: props.visible("command"),
      tour: "btn-command",
      onClick: () => openOverlay("command", () => openCommander()),
    },
    {
      id: "mail",
      label: "Mail",
      glyph: "M",
      tone: "#3d6b9a",
      on: props.visible("mail"),
      mailBadge: true,
      tour: "btn-mail",
      onClick: () => openOverlay("mail"),
    },
    {
      id: "bag",
      label: "Bag",
      glyph: "B",
      tone: "#8a6a3d",
      on: props.visible("bag"),
      muted: !getObservingId(),
      tour: "btn-bag",
      onClick: () => {
        if (!gateObservedBagOpen()) {
          props.onClose();
          return;
        }
        openOverlay("bag");
      },
    },
    {
      id: "bank",
      label: "Bank",
      glyph: "$",
      tone: "#3d8a55",
      on: props.visible("bank"),
      tour: "btn-bank",
      onClick: () => openOverlay("bank"),
    },
    {
      id: "market",
      label: "Market",
      glyph: "S",
      tone: "#8a3d5c",
      on: props.visible("market"),
      tour: "btn-market",
      onClick: () => openOverlay("market"),
    },
    {
      id: "settings",
      label: "Settings",
      glyph: "⚙",
      tone: "#4a5568",
      on: false,
      tour: "btn-settings",
      onClick: () => {
        props.onClose();
        props.onOpenSettings();
      },
    },
    {
      id: "add-meter",
      label: "Add meter",
      glyph: "+",
      tone: "#2b6cb0",
      on: false,
      tour: "btn-add-meter",
      onClick: () => {
        props.onClose();
        props.onAddMeter();
      },
    },
  ];

  // Edge/Chrome Android — hide address + tab chrome. Skip when unsupported.
  if (isPageFullscreenSupported()) {
    tiles.splice(tiles.length - 1, 0, {
      id: "fullscreen",
      label: fullscreenOn ? "Exit FS" : "Full",
      glyph: fullscreenOn ? "⊡" : "⛶",
      tone: "#1e3a5f",
      on: fullscreenOn,
      tour: "btn-fullscreen",
      onClick: () => {
        // Start fullscreen in the same tap turn (user activation), then close Apps.
        void togglePageFullscreen();
        props.onClose();
      },
    });
  }

  const patchScreens = (next: PhoneHomeScreen[]) => {
    props.setPhoneHomeScreens(next);
  };

  const screenTabs: any[] = [];
  for (let i = 0; i < screens.length; i++) {
    const s = screens[i];
    screenTabs.push(
      e(
        "button",
        {
          key: "tab-" + s.id,
          type: "button",
          className:
            "ecu-phone-sheet__chip" + (i === screenIdx ? " is-on" : ""),
          onClick: () => props.setPhoneHomePage(i),
        },
        s.label,
      ),
    );
  }

  const widgetRows: any[] = [];
  const widgets = orderedHomeWidgetIds();
  for (let i = 0; i < widgets.length; i++) {
    const id = widgets[i];
    const onScreen = !!(screen && screen.panels.indexOf(id) >= 0);
    const closable = CLOSABLE_PANEL_IDS.indexOf(id as ClosablePanelId) >= 0;
    widgetRows.push(
      switchRow(
        "w-" + id,
        PANEL_LABELS[id] || PANEL_CATALOG[id]?.label || id,
        onScreen,
        (next) => {
          patchScreens(togglePanelOnScreen(screens, screenIdx, id, next));
          if (closable && next) props.setVisible(id, true);
        },
        onScreen ? "On this page" : "Off this page",
      ),
    );
  }

  const meterRows: any[] = [];
  const allMeters = props.meterInstances.concat(props.closedMeters);
  for (let i = 0; i < allMeters.length; i++) {
    const m = allMeters[i];
    const open = props.meterInstances.some((x) => x.id === m.id);
    const onScreen = !!(screen && screen.meters.indexOf(m.id) >= 0);
    meterRows.push(
      switchRow(
        "m-" + m.id,
        meterLabel(m),
        onScreen,
        (next) => {
          patchScreens(toggleMeterOnScreen(screens, screenIdx, m.id, next));
          if (next && !open) props.reopenClosedMeter(m.id);
        },
        open ? "Meter" : "Closed",
      ),
    );
  }

  const body = editHome
    ? e(
        "div",
        { className: "ecu-phone-sheet__body" },
        e("div", { className: "ecu-phone-sheet__sec" }, "Home screens"),
        e("div", { className: "ecu-phone-sheet__actions" }, ...screenTabs),
        e("div", { className: "ecu-phone-sheet__sec" }, "HUD preset"),
        e(
          "div",
          { className: "ecu-phone-sheet__actions", "data-ecu-tour": "phone-hud-presets" },
          ...PHONE_HUD_PRESET_IDS.map((pid) =>
            e(
              "button",
              {
                key: "preset-" + pid,
                type: "button",
                className: "ecu-phone-sheet__chip",
                onClick: () => props.applyPhoneHudPreset(pid),
              },
              PHONE_HUD_PRESET_LABELS[pid],
            ),
          ),
        ),
        e(
          "div",
          { className: "ecu-phone-sheet__actions" },
          e(
            "button",
            {
              type: "button",
              className: "ecu-phone-sheet__chip",
              onClick: () => {
                const next = addPhoneHomeScreen(screens);
                patchScreens(next);
                props.setPhoneHomePage(next.length - 1);
              },
            },
            "Add page",
          ),
          screens.length > 1
            ? e(
                "button",
                {
                  type: "button",
                  className: "ecu-phone-sheet__chip",
                  onClick: () => {
                    const next = removePhoneHomeScreen(screens, screenIdx);
                    patchScreens(next);
                    props.setPhoneHomePage(
                      Math.min(screenIdx, next.length - 1),
                    );
                  },
                },
                "Remove page",
              )
            : null,
          e(
            "button",
            {
              type: "button",
              className:
                "ecu-phone-sheet__chip" +
                (props.metersHidden ? "" : " is-on"),
              onClick: () =>
                props.setMetersHiddenPersist(!props.metersHidden),
            },
            props.metersHidden ? "Meters hidden" : "Meters shown",
          ),
          props.toggleLayoutEdit
            ? e(
                "button",
                {
                  type: "button",
                  className:
                    "ecu-phone-sheet__chip" +
                    (props.layoutEdit ? " is-on" : ""),
                  onClick: () => props.toggleLayoutEdit!(),
                },
                props.layoutEdit ? "Layout on" : "Layout",
              )
            : null,
        ),
        e(
          "div",
          { className: "ecu-phone-sheet__sec" },
          "Widgets on " + (screen ? screen.label : "page"),
        ),
        widgetRows,
        e("div", { className: "ecu-phone-sheet__sec" }, "Meters on this page"),
        meterRows.length
          ? meterRows
          : e(
              "div",
              {
                key: "no-meters",
                className: "ecu-phone-sheet__row",
                style: { color: "#938f99" },
              },
              "No meters yet — use Add meter from Apps.",
            ),
      )
    : e(
        "div",
        {
          className: "ecu-phone-sheet__body ecu-phone-apps",
          "data-ecu-tour": "phone-apps-grid",
        },
        e("div", { className: "ecu-phone-apps__grid" }, ...tiles.map(appTile)),
        e(
          "button",
          {
            type: "button",
            className: "ecu-phone-apps__edit",
            onClick: () => setEditHome(true),
          },
          "Edit home screens",
        ),
      );

  return e(
    React.Fragment,
    null,
    e("button", {
      type: "button",
      className: "ecu-phone-sheet-scrim",
      "aria-label": "Close apps",
      onClick: () => props.onClose(),
    }),
    e(
      "div",
      {
        ref: sheetRef,
        className: "ecu-phone-sheet",
        role: "dialog",
        "aria-modal": "true",
        "aria-label": "Apps",
        onClick: (ev: { stopPropagation: () => void }) => ev.stopPropagation(),
      },
      e("div", {
        className: "ecu-phone-sheet__handle",
        onTouchStart: onHandleTouchStart,
        onTouchMove: onHandleTouchMove,
        onTouchEnd: onHandleTouchEnd,
        onTouchCancel: onHandleTouchEnd,
      }),
      e(
        "div",
        {
          className: "ecu-phone-sheet__hd",
          onTouchStart: onHandleTouchStart,
          onTouchMove: onHandleTouchMove,
          onTouchEnd: onHandleTouchEnd,
          onTouchCancel: onHandleTouchEnd,
        },
        e(
          "h2",
          { className: "ecu-phone-sheet__title" },
          editHome ? "Home screens" : "Apps",
        ),
        editHome
          ? e(
              "button",
              {
                type: "button",
                className: "ecu-phone-sheet__done",
                onClick: () => setEditHome(false),
              },
              "Apps",
            )
          : null,
      ),
      body,
      !editHome
        ? e(
            "div",
            { className: "ecu-phone-sheet__foot" },
            e(
              "button",
              {
                type: "button",
                className: "ecu-phone-sheet__done ecu-phone-sheet__done--foot",
                onClick: () => props.onClose(),
              },
              "Done",
            ),
          )
        : null,
    ),
  );
}
