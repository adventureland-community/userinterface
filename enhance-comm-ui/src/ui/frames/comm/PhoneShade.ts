/**
 * Samsung-style notification shade for phone combat home.
 * Top-right settings cog; Quick HUD band + notifications feed.
 */

import { e, getReact } from "../../../host/react";
import { getXUnread } from "../../../host/mail";
import type { PanelId } from "../../../lib/layout";
import { ensurePhoneNavCss } from "./phoneNavCss";

export type PhoneShadeProps = {
  open: boolean;
  onClose: () => void;
  metersHidden: boolean;
  setMetersHiddenPersist: (hidden: boolean) => void;
  layoutEdit: boolean;
  toggleLayoutEdit: () => void;
  onOpenSettings: () => void;
  onOpenMail: () => void;
  onOpenChat: () => void;
  visible: (id: PanelId) => boolean;
};

export function PhoneShade(props: PhoneShadeProps): any {
  const React = getReact();
  ensurePhoneNavCss();
  const [qsExpanded, setQsExpanded] = React.useState(false);
  const [mailUnread, setMailUnread] = React.useState(() => getXUnread());
  const sheetRef = React.useRef(null as HTMLDivElement | null);
  const dragStartY = React.useRef(0);
  const dragDy = React.useRef(0);
  const dragging = React.useRef(false);
  const dragMode = React.useRef("dismiss" as "dismiss" | "expand");

  const onClose = props.onClose;

  React.useEffect(() => {
    if (!props.open) {
      setQsExpanded(false);
      return;
    }
    setMailUnread(getXUnread());
    const id = window.setInterval(() => setMailUnread(getXUnread()), 2000);
    return () => window.clearInterval(id);
  }, [props.open]);

  React.useEffect(() => {
    if (!props.open) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props.open, onClose]);

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

  const onHandleTouchStart = (ev: TouchEvent, mode: "dismiss" | "expand") => {
    if (!ev.touches.length) return;
    dragging.current = true;
    dragMode.current = mode;
    dragStartY.current = ev.touches[0].clientY;
    dragDy.current = 0;
    const el = sheetRef.current;
    if (el && mode === "dismiss") el.style.transition = "none";
  };

  const onHandleTouchMove = (ev: TouchEvent) => {
    if (!dragging.current || !ev.touches.length) return;
    const raw = ev.touches[0].clientY - dragStartY.current;
    if (dragMode.current === "expand") {
      dragDy.current = raw;
      if (raw > 28) setQsExpanded(true);
      if (raw > 8) ev.preventDefault();
      return;
    }
    const dy = Math.max(0, -raw);
    dragDy.current = dy;
    const el = sheetRef.current;
    if (el) el.style.transform = "translateY(" + -dy + "px)";
    if (dy > 8) ev.preventDefault();
  };

  const onHandleTouchEnd = () => {
    if (!dragging.current) return;
    const mode = dragMode.current;
    const dy = dragDy.current;
    dragging.current = false;
    if (mode === "expand") {
      dragDy.current = 0;
      return;
    }
    if (dy > 90) {
      resetDrag();
      onClose();
      return;
    }
    const el = sheetRef.current;
    if (el) {
      el.style.transition = "transform 0.18s ease";
      el.style.transform = "translateY(0)";
    }
    dragDy.current = 0;
  };

  const openSettings = () => {
    props.onOpenSettings();
    onClose();
  };

  const qsChips: any[] = [
    e(
      "button",
      {
        key: "meters",
        type: "button",
        className:
          "ecu-phone-sheet__chip" + (props.metersHidden ? "" : " is-on"),
        onClick: () => props.setMetersHiddenPersist(!props.metersHidden),
      },
      props.metersHidden ? "Meters off" : "Meters on",
    ),
    e(
      "button",
      {
        key: "layout",
        type: "button",
        className:
          "ecu-phone-sheet__chip" + (props.layoutEdit ? " is-on" : ""),
        "data-ecu-tour": "btn-layout",
        onClick: () => props.toggleLayoutEdit(),
      },
      props.layoutEdit ? "Layout on" : "Layout",
    ),
  ];

  if (qsExpanded) {
    qsChips.push(
      e(
        "button",
        {
          key: "mail",
          type: "button",
          className:
            "ecu-phone-sheet__chip" + (props.visible("mail") ? " is-on" : ""),
          onClick: () => {
            props.onOpenMail();
            onClose();
          },
        },
        "Mail",
      ),
      e(
        "button",
        {
          key: "chat",
          type: "button",
          className:
            "ecu-phone-sheet__chip" + (props.visible("chat") ? " is-on" : ""),
          onClick: () => {
            props.onOpenChat();
            onClose();
          },
        },
        "Chat",
      ),
    );
  }

  const notifRows: any[] = [
    e(
      "button",
      {
        key: "mail-n",
        type: "button",
        className: "ecu-phone-shade__notif",
        onClick: () => {
          props.onOpenMail();
          onClose();
        },
      },
      e("span", { className: "ecu-phone-shade__notif-title" }, "Mail"),
      e(
        "span",
        { className: "ecu-phone-shade__notif-meta" },
        mailUnread > 0 ? mailUnread + " unread" : "No unread",
      ),
    ),
    e(
      "button",
      {
        key: "chat-n",
        type: "button",
        className: "ecu-phone-shade__notif",
        onClick: () => {
          props.onOpenChat();
          onClose();
        },
      },
      e("span", { className: "ecu-phone-shade__notif-title" }, "Chat"),
      e(
        "span",
        { className: "ecu-phone-shade__notif-meta" },
        "Open conversations",
      ),
    ),
  ];

  return e(
    React.Fragment,
    null,
    e("button", {
      type: "button",
      className: "ecu-phone-shade-scrim",
      "aria-label": "Close shade",
      onClick: () => onClose(),
    }),
    e(
      "div",
      {
        ref: sheetRef,
        className: "ecu-phone-shade" + (qsExpanded ? " is-qs-expanded" : ""),
        role: "dialog",
        "aria-modal": "true",
        "aria-label": "Quick HUD and notifications",
      },
      e(
        "div",
        { className: "ecu-phone-shade__top" },
        e("div", {
          className: "ecu-phone-sheet__handle",
          onTouchStart: (ev: TouchEvent) => onHandleTouchStart(ev, "dismiss"),
          onTouchMove: onHandleTouchMove,
          onTouchEnd: onHandleTouchEnd,
          onTouchCancel: onHandleTouchEnd,
        }),
        e(
          "button",
          {
            type: "button",
            className: "ecu-phone-shade__cog",
            "aria-label": "Settings",
            title: "Settings",
            onClick: openSettings,
          },
          "⚙",
        ),
      ),
      e(
        "div",
        {
          className: "ecu-phone-shade__qs",
          "data-ecu-tour": "phone-shade-qs",
          onTouchStart: (ev: TouchEvent) => onHandleTouchStart(ev, "expand"),
          onTouchMove: onHandleTouchMove,
          onTouchEnd: onHandleTouchEnd,
          onTouchCancel: onHandleTouchEnd,
        },
        e(
          "div",
          { className: "ecu-phone-shade__qs-hd" },
          e("span", { className: "ecu-phone-shade__sec" }, "Quick HUD"),
          e(
            "button",
            {
              type: "button",
              className: "ecu-phone-shade__expand",
              "aria-expanded": qsExpanded ? "true" : "false",
              onClick: () => setQsExpanded(!qsExpanded),
            },
            qsExpanded ? "Less" : "More",
          ),
        ),
        e("div", { className: "ecu-phone-sheet__actions" }, ...qsChips),
      ),
      qsExpanded
        ? null
        : e(
            "div",
            { className: "ecu-phone-shade__notifs" },
            e("div", { className: "ecu-phone-shade__sec" }, "Notifications"),
            ...notifRows,
          ),
    ),
  );
}
