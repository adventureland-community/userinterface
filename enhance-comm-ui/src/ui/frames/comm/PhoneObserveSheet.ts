/**
 * Phone character / observe picker — pick who to watch, or stop observing.
 * Parity with desktop `.ecu-char` chips: sprite, level, class, realm, RIP.
 */

import { e, getReact } from "../../../host/react";
import {
  clearObserve,
  formatServerKeyLabel,
  isCharOnCurrentServer,
  toggleObserve,
} from "../../../host/commChrome/chromeActions";
import { ensurePhoneNavCss } from "./phoneNavCss";

export type PhoneObserveSheetProps = {
  open: boolean;
  onClose: () => void;
};

type CharRow = {
  name: string;
  level: string;
  ctype: string;
  rip: boolean;
  serverLabel: string;
  offServer: boolean;
  active: boolean;
  skinHtml: string;
};

function readOnlineChars(): CharRow[] {
  const chars = (window.X && window.X.characters) || [];
  const obsName =
    window.observing && window.observing.name
      ? String(window.observing.name)
      : "";
  const spriteFn = window.sprite;
  const out: CharRow[] = [];
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    if (!char.online) continue;
    const name = String(char.name || "");
    if (!name) continue;
    const serverLabel = formatServerKeyLabel(String(char.server || ""));
    const offServer = !isCharOnCurrentServer(char) && !!serverLabel;
    const skinHtml =
      typeof spriteFn === "function"
        ? String(spriteFn(char.skin || "", { cx: char.cx, rip: char.rip }) || "")
        : "";
    out.push({
      name,
      level: String(char.level ?? ""),
      ctype: char.type != null ? String(char.type) : "",
      rip: !!char.rip,
      serverLabel,
      offServer,
      active: obsName === name,
      skinHtml,
    });
  }
  return out;
}

function charMetaLine(row: CharRow): string {
  const parts: string[] = [];
  if (row.level) parts.push("Lv." + row.level);
  if (row.ctype) parts.push(row.ctype);
  if (row.rip) parts.push("RIP");
  if (row.offServer && row.serverLabel) {
    parts.push(row.serverLabel);
    parts.push("switch server");
  } else if (row.serverLabel && !row.offServer) {
    // Same realm — still show for clarity when multiple chars share a list.
    parts.push(row.serverLabel);
  }
  return parts.join(" · ");
}

export function PhoneObserveSheet(props: PhoneObserveSheetProps): any {
  const React = getReact();
  ensurePhoneNavCss();
  const sheetRef = React.useRef(null as HTMLDivElement | null);
  const dragStartY = React.useRef(0);
  const dragDy = React.useRef(0);
  const dragging = React.useRef(false);
  const [rows, setRows] = React.useState([] as CharRow[]);
  const [obsName, setObsName] = React.useState("");

  const onClose = props.onClose;

  React.useEffect(() => {
    if (!props.open) return;
    const tick = () => {
      setRows(readOnlineChars());
      const n =
        window.observing && window.observing.name
          ? String(window.observing.name)
          : "";
      setObsName(n);
    };
    tick();
    const id = window.setInterval(tick, 500);
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("keydown", onKey);
    };
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

  const kids: any[] = [];
  if (obsName) {
    kids.push(
      e(
        "button",
        {
          key: "stop",
          type: "button",
          className: "ecu-phone-pick__row ecu-phone-pick__row--stop",
          onClick: () => {
            clearObserve();
            props.onClose();
          },
        },
        e(
          "span",
          { className: "ecu-phone-pick__text" },
          e("span", { className: "ecu-phone-pick__title" }, "Stop observing"),
          e(
            "span",
            { className: "ecu-phone-pick__meta" },
            "Leave " + obsName + " · spectate this realm",
          ),
        ),
      ),
    );
  } else {
    kids.push(
      e(
        "div",
        {
          key: "empty",
          className: "ecu-phone-pick__banner",
          role: "status",
        },
        e(
          "div",
          { className: "ecu-phone-pick__banner-main" },
          e("strong", null, "Not observing anyone"),
          e(
            "span",
            { className: "ecu-phone-pick__banner-meta" },
            "Pick a character below to watch them on their server.",
          ),
        ),
      ),
    );
  }

  kids.push(
    e("div", { key: "sec", className: "ecu-phone-sheet__sec" }, "Online"),
  );

  if (!rows.length) {
    kids.push(
      e(
        "div",
        { key: "none", className: "ecu-phone-pick__empty" },
        "No characters online",
      ),
    );
  } else {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const titleBits = row.name + (row.active ? " · watching" : "");
      kids.push(
        e(
          "button",
          {
            key: "c-" + row.name,
            type: "button",
            className:
              "ecu-phone-pick__row" +
              (row.active ? " is-on" : "") +
              (row.offServer ? " is-off-server" : "") +
              (row.rip ? " is-rip" : ""),
            title:
              row.name +
              " · Lv." +
              row.level +
              (row.ctype ? " · " + row.ctype : "") +
              (row.serverLabel ? " · " + row.serverLabel : "") +
              (row.active ? " · Tap again via Stop observing" : "") +
              (row.offServer ? " · Tap to switch server & observe" : ""),
            onClick: () => {
              toggleObserve(row.name);
              props.onClose();
            },
          },
          row.skinHtml
            ? e("span", {
                className: "ecu-phone-pick__sprite",
                dangerouslySetInnerHTML: { __html: row.skinHtml },
              })
            : e("span", { className: "ecu-phone-pick__sprite is-empty" }, "·"),
          e(
            "span",
            { className: "ecu-phone-pick__text" },
            e("span", { className: "ecu-phone-pick__title" }, titleBits),
            e(
              "span",
              { className: "ecu-phone-pick__meta" },
              charMetaLine(row),
            ),
          ),
        ),
      );
    }
  }

  return e(
    React.Fragment,
    null,
    e("button", {
      type: "button",
      className: "ecu-phone-sheet-scrim",
      "aria-label": "Dismiss",
      onClick: props.onClose,
    }),
    e(
      "div",
      {
        ref: sheetRef,
        className: "ecu-phone-sheet",
        role: "dialog",
        "aria-label": "Observe character",
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
        e("h2", { className: "ecu-phone-sheet__title" }, "Character"),
        e(
          "button",
          {
            type: "button",
            className: "ecu-phone-sheet__done",
            onClick: props.onClose,
          },
          "Done",
        ),
      ),
      e(
        "div",
        {
          className: "ecu-phone-sheet__body",
          "data-ecu-tour": "phone-observe-list",
        },
        ...kids,
      ),
    ),
  );
}
