/**
 * Slim phone dock — Character · Server.
 * Swipe up (including on the bar) opens Apps. Settings lives in the shade cog.
 * Home screens: horizontal swipe between configurable widget pages + dots.
 */

import { e, getReact } from "../../../host/react";
import { openChat } from "../../../host/chat";
import { syncMailBadge } from "../../../host/mail";
import {
  applyPhoneDockChrome,
  clearPhoneDockChrome,
  refreshPhoneHudBottomInset,
} from "../../../lib/phoneChrome";
import {
  formatPhoneCharDockMeta,
  formatPhoneServerDockPlayers,
  readPhoneDockStatus,
  shortPhoneDockLabel,
  type PhoneDockStatus,
} from "../../../lib/phoneDockStatus";
import {
  activePhoneHomeScreen,
  clampPhoneHomePage,
  phoneHomeScreenIndices,
  stepPhoneHomePage,
  storePhoneHomePage,
  type PhoneHomeScreen,
} from "../../../lib/phoneHomePages";
import type { PanelId } from "../../../lib/layout";
import type { PhoneHudPresetId } from "../../../lib/phoneHudPresets";
import type { MeterInstance } from "../../../meters/meterTypes";
import {
  installPhoneEdgeGestures,
  uninstallPhoneEdgeGestures,
} from "../../chrome/phoneEdgeGestures";
import {
  installPhoneHomePageGestures,
  uninstallPhoneHomePageGestures,
} from "../../chrome/phoneHomePageGestures";
import { registerPhoneTourChrome } from "../../../host/phoneTourChrome";
import { ensurePhoneNavCss } from "./phoneNavCss";
import { PhoneObserveSheet } from "./PhoneObserveSheet";
import { PhoneServerSheet } from "./PhoneServerSheet";
import { PhoneShade } from "./PhoneShade";
import { PhoneWindowsSheet } from "./PhoneWindowsSheet";

const EDGE_HINT_KEY = "ecu-phone-edge-swipe-hint";

export type PhoneNavDockProps = {
  layoutEdit: boolean;
  toggleLayoutEdit: () => void;
  metersHidden: boolean;
  setMetersHiddenPersist: (hidden: boolean) => void;
  onAddMeter: () => void;
  settingsOpen: boolean;
  toggleSettings: () => void;
  visible: (id: PanelId) => boolean;
  setVisible: (id: PanelId, visible: boolean) => void;
  meterInstances: MeterInstance[];
  closedMeters: MeterInstance[];
  closeMeterRuntime: (id: string) => void;
  reopenClosedMeter: (id: string) => void;
  phoneHomePage: number;
  setPhoneHomePage: (page: number) => void;
  phoneHomeScreens: PhoneHomeScreen[];
  setPhoneHomeScreens: (screens: PhoneHomeScreen[]) => void;
  applyPhoneHudPreset: (preset: PhoneHudPresetId) => void;
};

function dockStatusBtn(
  key: string,
  eyebrow: string,
  title: string,
  onClick: () => void,
  opts?: {
    on?: boolean;
    muted?: boolean;
    tour?: string;
    meta?: any;
    trailing?: any;
  },
): any {
  const mainKids: any[] = [
    e("span", { className: "ecu-phone-dock__eyebrow", key: "eye" }, eyebrow),
    e("span", { className: "ecu-phone-dock__status-title", key: "title" }, title),
  ];
  if (opts?.meta != null && opts.meta !== "") {
    mainKids.push(
      e(
        "span",
        { className: "ecu-phone-dock__status-meta", key: "meta" },
        opts.meta,
      ),
    );
  }
  const kids: any[] = [
    e(
      "span",
      { className: "ecu-phone-dock__status-main", key: "main" },
      ...mainKids,
    ),
  ];
  if (opts?.trailing != null) {
    kids.push(
      e(
        "span",
        { className: "ecu-phone-dock__status-trail", key: "trail" },
        opts.trailing,
      ),
    );
  }
  return e(
    "button",
    {
      key,
      type: "button",
      className:
        "ecu-phone-dock__status" +
        (opts?.trailing ? " has-trail" : "") +
        (opts?.on ? " is-on" : "") +
        (opts?.muted ? " is-muted" : ""),
      "data-ecu-tour": opts?.tour,
      "aria-pressed": opts?.on ? "true" : "false",
      onClick: (ev: { stopPropagation?: () => void }) => {
        if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
        onClick();
      },
    },
    ...kids,
  );
}

export function PhoneNavDock(props: PhoneNavDockProps): any {
  const React = getReact();
  ensurePhoneNavCss();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [shadeOpen, setShadeOpen] = React.useState(false);
  const [observeOpen, setObserveOpen] = React.useState(false);
  const [serverOpen, setServerOpen] = React.useState(false);
  const [status, setStatus] = React.useState(
    () => readPhoneDockStatus() as PhoneDockStatus,
  );
  const dockRef = React.useRef(null as HTMLElement | null);

  React.useEffect(() => {
    const measure = () => {
      const el = dockRef.current;
      const h = el ? el.offsetHeight : 0;
      applyPhoneDockChrome(h > 0 ? h : 48);
      window.requestAnimationFrame(() => refreshPhoneHudBottomInset());
    };
    measure();
    const id = window.requestAnimationFrame(measure);
    const t = window.setTimeout(measure, 80);
    window.addEventListener("resize", measure);
    return () => {
      window.cancelAnimationFrame(id);
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
      clearPhoneDockChrome();
    };
  }, []);

  React.useEffect(() => {
    const tick = () => setStatus(readPhoneDockStatus());
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, []);

  // Chrome mail actions are hidden on phone — keep Apps badge painted.
  React.useEffect(() => {
    syncMailBadge();
    const id = window.setInterval(() => syncMailBadge(), 2000);
    return () => window.clearInterval(id);
  }, []);

  const pages = phoneHomeScreenIndices(props.phoneHomeScreens);
  const activePage = clampPhoneHomePage(props.phoneHomePage, pages);

  React.useEffect(() => {
    if (activePage !== props.phoneHomePage) {
      props.setPhoneHomePage(activePage);
    }
  }, [activePage, props.phoneHomePage, props.setPhoneHomePage]);

  const chatOn = props.visible("chat");
  const commandOn = props.visible("command");
  const mailOn = props.visible("mail");
  const bagOn = props.visible("bag");
  const bankOn = props.visible("bank");

  const dismissSheets = () => {
    if (sheetOpen) setSheetOpen(false);
    if (shadeOpen) setShadeOpen(false);
    if (observeOpen) setObserveOpen(false);
    if (serverOpen) setServerOpen(false);
    if (props.settingsOpen) props.toggleSettings();
  };

  const hidePeerPanels = (
    keep: "chat" | "command" | "mail" | "bag" | "bank" | "market" | "none",
  ) => {
    const ids: Array<
      "chat" | "command" | "mail" | "bag" | "bank" | "market"
    > = ["chat", "command", "mail", "bag", "bank", "market"];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      if (id !== keep && props.visible(id)) props.setVisible(id, false);
    }
  };

  const openApps = () => {
    if (shadeOpen) setShadeOpen(false);
    if (observeOpen) setObserveOpen(false);
    if (serverOpen) setServerOpen(false);
    if (props.settingsOpen) props.toggleSettings();
    hidePeerPanels("none");
    setSheetOpen(true);
  };

  const openObserve = () => {
    dismissSheets();
    hidePeerPanels("none");
    setObserveOpen(true);
  };

  const openServer = () => {
    dismissSheets();
    hidePeerPanels("none");
    setServerOpen(true);
  };

  const openShade = () => {
    if (sheetOpen) setSheetOpen(false);
    if (observeOpen) setObserveOpen(false);
    if (serverOpen) setServerOpen(false);
    if (props.settingsOpen) props.toggleSettings();
    hidePeerPanels("none");
    setShadeOpen(true);
  };

  const tourChromeRef = React.useRef({
    openObserve,
    openServer,
    openApps,
    openShade,
    closeAll: dismissSheets,
  });
  tourChromeRef.current = {
    openObserve,
    openServer,
    openApps,
    openShade,
    closeAll: dismissSheets,
  };
  React.useEffect(() => {
    registerPhoneTourChrome({
      openObserve: () => tourChromeRef.current.openObserve(),
      openServer: () => tourChromeRef.current.openServer(),
      openApps: () => tourChromeRef.current.openApps(),
      openShade: () => tourChromeRef.current.openShade(),
      closeAll: () => tourChromeRef.current.closeAll(),
    });
    return () => registerPhoneTourChrome(null);
  }, []);

  const toggleSettings = () => {
    if (sheetOpen) setSheetOpen(false);
    if (shadeOpen) setShadeOpen(false);
    if (observeOpen) setObserveOpen(false);
    if (serverOpen) setServerOpen(false);
    if (!props.settingsOpen) hidePeerPanels("none");
    props.toggleSettings();
  };

  const dismissTop = () => {
    if (shadeOpen) {
      setShadeOpen(false);
      return true;
    }
    if (observeOpen) {
      setObserveOpen(false);
      return true;
    }
    if (serverOpen) {
      setServerOpen(false);
      return true;
    }
    if (sheetOpen) {
      setSheetOpen(false);
      return true;
    }
    if (props.settingsOpen) {
      props.toggleSettings();
      return true;
    }
    const closable: PanelId[] = [
      "chat",
      "command",
      "mail",
      "bank",
      "market",
      "bag",
    ];
    for (let i = 0; i < closable.length; i++) {
      const id = closable[i];
      if (props.visible(id)) {
        props.setVisible(id, false);
        return true;
      }
    }
    return false;
  };

  const onTopEdge = () => {
    if (
      sheetOpen ||
      observeOpen ||
      serverOpen ||
      props.settingsOpen ||
      chatOn ||
      commandOn ||
      mailOn ||
      bagOn ||
      bankOn
    ) {
      dismissTop();
      return;
    }
    setShadeOpen(true);
  };

  const onBottomEdge = () => {
    if (shadeOpen) {
      setShadeOpen(false);
      return;
    }
    if (observeOpen) {
      setObserveOpen(false);
      return;
    }
    if (serverOpen) {
      setServerOpen(false);
      return;
    }
    if (sheetOpen) {
      setSheetOpen(false);
      return;
    }
    openApps();
  };

  const edgeApiRef = React.useRef({ dismissTop, onTopEdge, onBottomEdge });
  edgeApiRef.current = { dismissTop, onTopEdge, onBottomEdge };

  const pageApiRef = React.useRef({
    pages,
    activePage,
    setPage: props.setPhoneHomePage,
    blocked: () => false,
  });
  pageApiRef.current = {
    pages,
    activePage,
    setPage: props.setPhoneHomePage,
    blocked: () =>
      shadeOpen ||
      sheetOpen ||
      observeOpen ||
      serverOpen ||
      props.settingsOpen ||
      props.visible("chat") ||
      props.visible("command") ||
      props.visible("mail") ||
      props.visible("bank") ||
      props.visible("market") ||
      props.visible("bag") ||
      pages.length < 2,
  };

  React.useEffect(() => {
    const maybeHint = () => {
      try {
        if (window.localStorage.getItem(EDGE_HINT_KEY)) return;
        window.localStorage.setItem(EDGE_HINT_KEY, "1");
      } catch {
        return;
      }
      const el = document.createElement("div");
      el.className = "ecu-phone-edge-hint";
      el.setAttribute("role", "status");
      el.textContent = "Swipe: back · shade · apps · home pages";
      document.body.appendChild(el);
      window.setTimeout(() => {
        el.classList.add("is-out");
        window.setTimeout(() => el.remove(), 280);
      }, 2400);
    };
    const stopEdge = installPhoneEdgeGestures({
      onLeft: () => {
        edgeApiRef.current.dismissTop();
        maybeHint();
      },
      onRight: () => {
        edgeApiRef.current.dismissTop();
        maybeHint();
      },
      onBottom: () => {
        edgeApiRef.current.onBottomEdge();
        maybeHint();
      },
      onTop: () => {
        edgeApiRef.current.onTopEdge();
        maybeHint();
      },
    });
    const stopHome = installPhoneHomePageGestures({
      isBlocked: () => pageApiRef.current.blocked(),
      onPageSwipe: (dir) => {
        const next = stepPhoneHomePage(
          pageApiRef.current.activePage,
          pageApiRef.current.pages,
          dir,
        );
        if (next !== pageApiRef.current.activePage) {
          pageApiRef.current.setPage(next);
          storePhoneHomePage(next);
        }
      },
    });
    return () => {
      stopEdge();
      stopHome();
      uninstallPhoneEdgeGestures();
      uninstallPhoneHomePageGestures();
    };
  }, []);

  const screen = activePhoneHomeScreen(props.phoneHomeScreens, activePage);
  const homeLabel =
    screen?.label ||
    props.phoneHomeScreens[activePage]?.label ||
    "Page " + (activePage + 1);
  const homePos = pages.indexOf(activePage);
  const homePrevIdx = homePos > 0 ? pages[homePos - 1] : -1;
  const homeNextIdx =
    homePos >= 0 && homePos < pages.length - 1 ? pages[homePos + 1] : -1;
  const homePrevLabel =
    homePrevIdx >= 0
      ? props.phoneHomeScreens[homePrevIdx]?.label ||
        "Page " + (homePrevIdx + 1)
      : "";
  const homeNextLabel =
    homeNextIdx >= 0
      ? props.phoneHomeScreens[homeNextIdx]?.label ||
        "Page " + (homeNextIdx + 1)
      : "";
  const dotKids: any[] = [];
  if (pages.length > 1) {
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const label =
        props.phoneHomeScreens[page]?.label || "Page " + (page + 1);
      dotKids.push(
        e("span", {
          key: "p-" + page,
          role: "button",
          tabIndex: 0,
          className:
            "ecu-phone-home-dots__dot" +
            (page === activePage ? " is-on" : ""),
          "aria-label": label,
          "aria-current": page === activePage ? "true" : undefined,
          title: label,
          onClick: () => {
            props.setPhoneHomePage(page);
            storePhoneHomePage(page);
          },
          onKeyDown: (ev: { key: string; preventDefault: () => void }) => {
            if (ev.key === "Enter" || ev.key === " ") {
              ev.preventDefault();
              props.setPhoneHomePage(page);
              storePhoneHomePage(page);
            }
          },
        }),
      );
    }
  }

  const charTitle = status.observing
    ? shortPhoneDockLabel(status.observingName, 14)
    : "Not observing";
  const serverTitle = status.serverLabel
    ? shortPhoneDockLabel(status.serverLabel, 14)
    : status.connected
      ? "—"
      : "Select…";
  const charMeta = formatPhoneCharDockMeta(status);
  const playersMeta = formatPhoneServerDockPlayers(status);
  const serverMeta =
    playersMeta ||
    (!status.serverLabel
      ? null
      : status.pingMs == null
        ? "…"
        : null);
  let serverTrail: any = null;
  if (status.pingBars.length || status.pingMs != null) {
    const barKids: any[] = [];
    for (let i = 0; i < status.pingBars.length; i++) {
      const bar = status.pingBars[i];
      barKids.push(
        e("span", {
          key: "b" + i,
          className: "ecu-phone-dock__ping-bar",
          style: {
            height: bar.pct + "%",
            background: bar.color,
          },
        }),
      );
    }
    serverTrail = e(
      "span",
      {
        className: "ecu-phone-dock__ping",
        title:
          status.pingMs != null
            ? "Avg ping " + status.pingMs + "ms"
            : "Ping unavailable",
      },
      barKids.length
        ? e(
            "span",
            { className: "ecu-phone-dock__ping-bars", "aria-hidden": "true" },
            ...barKids,
          )
        : null,
      e(
        "span",
        {
          className: "ecu-phone-dock__ping-ms",
          style: { color: status.pingColor },
        },
        status.pingMs != null ? String(status.pingMs) + "ms" : "—",
      ),
    );
  }

  return e(
    "div",
    {
      className: "ecu-phone-dock",
      "data-ecu-phone-dock": "1",
      ref: dockRef,
    },
    // Pager chrome removed from Home — swipe still changes pages; Apps owns
    // screen editing. Keeps the dock as the only bottom-center CTA.
    null,
    e(
      "nav",
      {
        className: "ecu-phone-dock__bar",
        role: "navigation",
        "aria-label": "ECU phone",
      },
      e("div", {
        className: "ecu-phone-dock__nub",
        "aria-hidden": "true",
        title: "Swipe up for Apps",
      }),
      dockStatusBtn("character", "Character", charTitle, openObserve, {
        on: status.observing,
        muted: !status.observing,
        tour: "character-ui",
        meta: charMeta,
      }),
      e(
        "button",
        {
          key: "apps",
          type: "button",
          className: "ecu-phone-dock__apps" + (sheetOpen ? " is-on" : ""),
          "aria-label": "Apps",
          title: "Apps",
          "data-ecu-tour": "btn-apps",
          onClick: (ev: { stopPropagation?: () => void }) => {
            if (ev && typeof ev.stopPropagation === "function")
              ev.stopPropagation();
            if (sheetOpen) setSheetOpen(false);
            else openApps();
          },
        },
        e("span", { className: "ecu-phone-dock__apps-glyph" }, "▦"),
        e("span", null, "Apps"),
        e("span", {
          className: "ecu-mail-badge ecu-phone-dock__mail-badge",
          "data-ecu-mail-badge": "1",
          hidden: true,
        }),
      ),
      dockStatusBtn("server", "Server", serverTitle, openServer, {
        on: !!status.serverLabel,
        muted: !status.serverLabel,
        tour: "server-picker",
        meta: serverMeta,
        trailing: serverTrail,
      }),
    ),
    e(PhoneWindowsSheet, {
      open: sheetOpen,
      onClose: () => setSheetOpen(false),
      visible: props.visible,
      setVisible: props.setVisible,
      metersHidden: props.metersHidden,
      setMetersHiddenPersist: props.setMetersHiddenPersist,
      meterInstances: props.meterInstances,
      closedMeters: props.closedMeters,
      closeMeterRuntime: props.closeMeterRuntime,
      reopenClosedMeter: props.reopenClosedMeter,
      onAddMeter: props.onAddMeter,
      onOpenSettings: () => {
        setSheetOpen(false);
        if (!props.settingsOpen) props.toggleSettings();
      },
      layoutEdit: props.layoutEdit,
      toggleLayoutEdit: props.toggleLayoutEdit,
      phoneHomeScreens: props.phoneHomeScreens,
      setPhoneHomeScreens: props.setPhoneHomeScreens,
      phoneHomePage: activePage,
      setPhoneHomePage: (page: number) => {
        props.setPhoneHomePage(page);
        storePhoneHomePage(page);
      },
      applyPhoneHudPreset: props.applyPhoneHudPreset,
    }),
    e(PhoneObserveSheet, {
      open: observeOpen,
      onClose: () => setObserveOpen(false),
    }),
    e(PhoneServerSheet, {
      open: serverOpen,
      onClose: () => setServerOpen(false),
    }),
    e(PhoneShade, {
      open: shadeOpen,
      onClose: () => setShadeOpen(false),
      metersHidden: props.metersHidden,
      setMetersHiddenPersist: props.setMetersHiddenPersist,
      layoutEdit: props.layoutEdit,
      toggleLayoutEdit: props.toggleLayoutEdit,
      onOpenSettings: toggleSettings,
      onOpenMail: () => {
        hidePeerPanels("mail");
        props.setVisible("mail", true);
      },
      onOpenChat: () => {
        hidePeerPanels("chat");
        openChat({ toggle: true });
      },
      visible: props.visible,
    }),
    screen
      ? e(
          "span",
          {
            className: "ecu-phone-home-screen-label",
            "aria-live": "polite",
          },
          screen.label,
        )
      : null,
  );
}
