import { getReact, e } from "../../../host/react";
import {
  aggregateMailItems,
  countAttachmentsByRecipient,
  fillCapLabel,
  formatCapFraction,
  groupMailItemsByRecipient,
  MAIL_ATTACH_CAP,
  mailAggTouchesFullCap,
  type CharMailboxFill,
  type MailAggItem,
  type MailRow,
  type MailStoreSnapshot,
} from "../../../host/mail";
import { itemInstanceLabel } from "../../../lib/gameIcon";
import { ItemInstance } from "../../chrome/ItemInstance";
import { selfCharacterNames } from "./mailFormat";

export type MailItemsGroup = "all" | "recipient";

function sameIdSet(a: string[], b: string[] | null | undefined): boolean {
  if (!b || a.length !== b.length) return false;
  const want = new Set(b);
  for (let i = 0; i < a.length; i++) {
    if (!want.has(a[i])) return false;
  }
  return true;
}

export type MailItemsPaneProps = {
  snap: MailStoreSnapshot;
  filtered: MailRow[];
  itemsGroup: MailItemsGroup;
  setItemsGroup: (g: MailItemsGroup) => void;
  selectedItemKey: string | null;
  /** Exact mail ids for the selected tile (recipient sections are subsets). */
  selectedItemMailIds: string[] | null;
  onSelectItem: (agg: MailAggItem) => void;
  /** Caps cue — scroll/highlight this recipient section (By recipient). */
  focusRecipient: string | null;
  focusToken: number;
};

function cellTitle(it: MailAggItem): string {
  const label = itemInstanceLabel(it.name, {
    p: it.p != null ? it.p : undefined,
    level: it.level,
  });
  const bits = [
    label || it.name,
    "×" + it.q,
    it.mailIds.length +
      (it.mailIds.length === 1 ? " mail" : " mails"),
  ];
  if (it.recipients.length) {
    bits.push(
      it.recipients.length <= 3
        ? it.recipients.join(", ")
        : it.recipients.slice(0, 2).join(", ") +
            " +" +
            (it.recipients.length - 2),
    );
  }
  return bits.join(" · ");
}

function renderGrid(
  items: MailAggItem[],
  fills: CharMailboxFill[],
  selectedItemKey: string | null,
  selectedItemMailIds: string[] | null,
  onSelectItem: (agg: MailAggItem) => void,
): any {
  if (!items.length) {
    return e(
      "div",
      { className: "comm-mail__items-empty" },
      "No untaken attachments in this filter.",
    );
  }
  return e(
    "div",
    { className: "comm-mail__items-grid" },
    items.map((it: MailAggItem) => {
      const over = mailAggTouchesFullCap(it, fills);
      const sel =
        selectedItemKey === it.key &&
        sameIdSet(it.mailIds, selectedItemMailIds);
      return e(
        "button",
        {
          type: "button",
          key: it.key + ":" + it.mailIds.join(","),
          className:
            "comm-mail__items-cell" +
            (sel ? " is-sel" : "") +
            (over ? " is-cap-full" : ""),
          title: cellTitle(it),
          onClick: () => onSelectItem(it),
        },
        e(ItemInstance, {
          name: it.name,
          level: it.level,
          q: it.q,
          p: it.p != null ? String(it.p) : undefined,
          size: 40,
        }),
        e(
          "div",
          { className: "comm-mail__items-cell-meta" },
          it.mailIds.length > 1 ? it.mailIds.length + " mails" : "1 mail",
        ),
      );
    }),
  );
}

export function MailItemsPane(props: MailItemsPaneProps): any {
  const React = getReact();
  const {
    snap,
    filtered,
    itemsGroup,
    setItemsGroup,
    selectedItemKey,
    selectedItemMailIds,
    onSelectItem,
    focusRecipient,
    focusToken,
  } = props;
  const rootRef = React.useRef(null as HTMLDivElement | null);

  const owned = selfCharacterNames();
  const fills = countAttachmentsByRecipient(
    snap.mails,
    owned.length ? owned : undefined,
  );
  const allItems = aggregateMailItems(filtered);
  const focusKey = focusRecipient
    ? focusRecipient.trim().toLowerCase()
    : "";

  React.useEffect(() => {
    if (!focusKey || !focusToken || itemsGroup !== "recipient") return;
    const root = rootRef.current;
    if (!root) return;
    const el = root.querySelector(
      '[data-mail-recipient="' + focusKey.replace(/"/g, "") + '"]',
    ) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    el.classList.add("is-focus");
    const t = window.setTimeout(() => el.classList.remove("is-focus"), 1600);
    return () => window.clearTimeout(t);
  }, [focusKey, focusToken, itemsGroup, filtered.length]);

  const body =
    itemsGroup === "recipient"
      ? (() => {
          const sections = groupMailItemsByRecipient(filtered, fills);
          if (!sections.length) {
            return e(
              "div",
              { className: "comm-mail__items-empty" },
              "No untaken attachments in this filter.",
            );
          }
          return sections.map((sec) => {
            const pressure = sec.fill ? sec.fill.pressure : "";
            const frac = sec.fill
              ? formatCapFraction(sec.fill.count, MAIL_ATTACH_CAP, snap.hasMore)
              : "";
            const label = sec.fill ? fillCapLabel(sec.fill) : "";
            const secKey = sec.name.toLowerCase();
            return e(
              "div",
              {
                key: secKey,
                className:
                  "comm-mail__items-section" +
                  (focusKey && secKey === focusKey ? " is-focus" : ""),
                "data-mail-recipient": secKey,
              },
              e(
                "div",
                {
                  className:
                    "comm-mail__items-section-hd" +
                    (pressure === "full"
                      ? " is-cap-full"
                      : pressure === "warn"
                        ? " is-cap-warn"
                        : ""),
                },
                e(
                  "span",
                  { className: "comm-mail__items-section-name" },
                  sec.name,
                ),
                frac
                  ? e(
                      "span",
                      { className: "comm-mail__items-section-meta" },
                      frac + (label ? " · " + label : ""),
                    )
                  : null,
              ),
              renderGrid(
                sec.items,
                fills,
                selectedItemKey,
                selectedItemMailIds,
                onSelectItem,
              ),
            );
          });
        })()
      : renderGrid(
          allItems,
          fills,
          selectedItemKey,
          selectedItemMailIds,
          onSelectItem,
        );

  return e(
    "div",
    { className: "comm-mail__items", ref: rootRef },
    e(
      "div",
      { className: "comm-mail__items-bar" },
      e(
        "div",
        { className: "comm-mail__items-seg", role: "group" },
        e(
          "button",
          {
            type: "button",
            className:
              "comm-mail__items-seg-btn" +
              (itemsGroup === "all" ? " is-on" : ""),
            onClick: () => setItemsGroup("all"),
          },
          "All",
        ),
        e(
          "button",
          {
            type: "button",
            className:
              "comm-mail__items-seg-btn" +
              (itemsGroup === "recipient" ? " is-on" : ""),
            title: "Group by destination character (attach-cap unit)",
            onClick: () => setItemsGroup("recipient"),
          },
          "By recipient",
        ),
      ),
      snap.hasMore
        ? e(
            "div",
            { className: "comm-mail__items-incomplete" },
            "Inventory is cache-only — older pages may hold more (" +
              snap.mails.length +
              "+ loaded).",
          )
        : null,
    ),
    body,
  );
}
