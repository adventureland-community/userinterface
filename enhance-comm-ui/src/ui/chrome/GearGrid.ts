import { getReact, e } from "../../host/react";
import type { EntityLike, SlotLike } from "../../host/globals";
import { info, INFO_SOURCE_ATTR } from "../../host/dialogHost";
import { itemContainer, setXTarget, slotSkin } from "../../host/icons";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";

/** Classic AL `render_slots` body layout (4 cols × 4 rows). */
const GEAR_ROWS: string[][] = [
  ["earring1", "helmet", "earring2", "amulet"],
  ["mainhand", "chest", "offhand", "cape"],
  ["ring1", "pants", "ring2", "orb"],
  ["belt", "shoes", "gloves", "elixir"],
];

/** Host shade skins from `render_slots` in adventureland `js/html.js`. */
const SLOT_SHADE: Record<string, { shade: string; s_op: number }> = {
  earring1: { shade: "shade_earring", s_op: 0.4 },
  helmet: { shade: "shade_helmet", s_op: 0.5 },
  earring2: { shade: "shade_earring", s_op: 0.4 },
  amulet: { shade: "shade_amulet", s_op: 0.4 },
  mainhand: { shade: "shade_mainhand", s_op: 0.36 },
  chest: { shade: "shade_chest", s_op: 0.4 },
  offhand: { shade: "shade_offhand", s_op: 0.4 },
  cape: { shade: "shade20_cape", s_op: 0.4 },
  ring1: { shade: "shade_ring", s_op: 0.4 },
  pants: { shade: "shade_pants", s_op: 0.5 },
  ring2: { shade: "shade_ring", s_op: 0.4 },
  orb: { shade: "shade20_orb", s_op: 0.4 },
  belt: { shade: "shade_belt", s_op: 0.4 },
  shoes: { shade: "shade_shoes", s_op: 0.5 },
  gloves: { shade: "shade_gloves", s_op: 0.4 },
  elixir: { shade: "shade20_elixir", s_op: 0.4 },
};

const TRADE_SHADE = { shade: "shade_gold", s_op: 0.2 };
const SLOT_SIZE = 40;
/** AL empty-slot border when `mode.empty_borders_darker`. */
const EMPTY_BCOLOR = "#292929";

function tradeSlotNames(slots: Record<string, SlotLike | null | undefined>): string[] {
  const names: string[] = [];
  const keys = Object.keys(slots);
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].indexOf("trade") === 0 && slots[keys[i]]) {
      names.push(keys[i]);
    }
  }
  names.sort((a, b) => {
    const na = parseInt(a.replace("trade", ""), 10) || 0;
    const nb = parseInt(b.replace("trade", ""), 10) || 0;
    return na - nb;
  });
  return names;
}

function shadeFor(slotName: string): { shade: string; s_op: number } {
  if (slotName.indexOf("trade") === 0) return TRADE_SHADE;
  return SLOT_SHADE[slotName] || { shade: "placeholder", s_op: 0.4 };
}

function wrapContainerHtml(html: string): any {
  return e("div", {
    style: { display: "inline-block", lineHeight: 0, fontSize: 0 },
    dangerouslySetInnerHTML: { __html: html },
    ref: (node: HTMLElement | null) => {
      if (!node) return;
      const root = node.firstElementChild as HTMLElement | null;
      if (!root) return;
      root.style.margin = "0";
      // React wrapper owns clicks (same pattern as EffectsRow).
      root.removeAttribute("onmousedown");
      root.removeAttribute("ontouchstart");
      root.removeAttribute("onclick");
    },
  });
}

export type GearGridProps = {
  entity: EntityLike;
  /** When set, slots that differ from this entity show a Δ badge. */
  compareTo?: EntityLike | null;
};

function slotKey(slot: SlotLike | null | undefined): string {
  if (!slot || !slot.name) return "";
  return `${slot.name}|${slot.level ?? ""}|${slot.q ?? ""}|${slot.price ?? ""}|${slot.skin ?? ""}`;
}

function slotsFingerprint(
  slots: Record<string, SlotLike | null | undefined> | null | undefined,
): string {
  if (!slots) return "";
  const keys = Object.keys(slots);
  keys.sort();
  const parts: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    parts.push(`${k}:${slotKey(slots[k])}`);
  }
  return parts.join(";");
}

function SlotCell(props: {
  entity: EntityLike;
  slotName: string;
  slot: SlotLike | null | undefined;
  showPrice?: boolean;
  diff?: boolean;
}): any {
  const { entity, slotName, slot, showPrice, diff } = props;
  const skin = slotSkin(slot);
  const { shade, s_op } = shadeFor(slotName);
  let content: any = null;
  const clickable = !!(slot && slot.name);

  if (slot && skin) {
    const html = itemContainer(
      {
        skin,
        size: SLOT_SIZE,
        slot: slotName,
        shade,
        s_op,
        draggable: false,
      },
      slot,
    );
    if (html) {
      content = wrapContainerHtml(html);
    } else {
      content = e(
        "div",
        {
          style: {
            width: `${SLOT_SIZE}px`,
            height: `${SLOT_SIZE}px`,
            background: "#333",
            border: "1px solid #666",
            fontSize: TYPE.microMin,
            padding: "2px",
            ...PIXEL_TEXT,
          },
          title: slot.name,
        },
        slot.name,
        slot.level != null ? ` +${slot.level}` : "",
      );
    }
  } else {
    // Empty: AL shade silhouette via item_container (no skin).
    const html = itemContainer({
      size: SLOT_SIZE,
      shade,
      s_op,
      slot: slotName,
      bcolor: EMPTY_BCOLOR,
      draggable: false,
    });
    if (html) {
      content = wrapContainerHtml(html);
    } else {
      content = e("div", {
        style: {
          width: `${SLOT_SIZE + 6}px`,
          height: `${SLOT_SIZE + 6}px`,
          background: "#000",
          border: `2px solid ${EMPTY_BCOLOR}`,
          boxSizing: "border-box",
        },
        title: slotName,
      });
    }
  }

  // Stock AL uses onmousedown for non-draggable slots. Open on pointerdown
  // (before document outside-dismiss) and pass the rendered slot object so we
  // never re-read a mismatched entity.slots key.
  const onSlotPress = clickable
    ? (ev: any) => {
        if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
        if (ev && typeof ev.preventDefault === "function") ev.preventDefault();
        setXTarget(entity);
        info.openItem(entity, slotName, slot);
      }
    : undefined;

  return e(
    "div",
    {
      key: slotName,
      className: "comm-gear-slot" + (clickable ? " is-clickable" : ""),
      "data-slot": slotName,
      [INFO_SOURCE_ATTR]: clickable ? "" : undefined,
      title: clickable ? slot!.name : slotName,
      onPointerDown: onSlotPress,
      onMouseDown: clickable
        ? (ev: any) => {
            // Keep bubble from reaching document dismiss if pointer events differ.
            if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
          }
        : undefined,
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "2px",
        position: "relative",
        cursor: clickable ? "pointer" : "default",
        pointerEvents: "auto",
      },
    },
    content,
    diff
      ? e(
          "div",
          {
            title: "Equip differs from watched",
            style: {
              position: "absolute",
              top: "-2px",
              right: "-2px",
              minWidth: "18px",
              height: "18px",
              padding: "0 4px",
              boxSizing: "border-box",
              background: "#3a2a10",
              border: "1px solid #c9a227",
              color: "#ffe08a",
              fontSize: TYPE.microMin,
              lineHeight: "16px",
              textAlign: "center",
              ...PIXEL_TEXT,
              pointerEvents: "none",
            },
          },
          "Δ",
        )
      : null,
    showPrice && slot?.price != null
      ? e(
          "div",
          { style: { fontSize: TYPE.micro, color: "#ffd700", ...PIXEL_TEXT } },
          String(slot.price),
        )
      : null,
  );
}

export function GearGrid(props: GearGridProps): any {
  const React = getReact();
  const slots = props.entity.slots;
  if (!slots) return null;

  const entityId =
    props.entity.id != null ? String(props.entity.id) : "";
  const compareId =
    props.compareTo && props.compareTo.id != null
      ? String(props.compareTo.id)
      : "";
  const fp =
    entityId +
    "|" +
    compareId +
    "|" +
    slotsFingerprint(slots) +
    "|" +
    slotsFingerprint(props.compareTo && props.compareTo.slots);

  // Vitals/tick updates rewrite entity objects every frame — skip gear DOM
  // rebuild when equipped/trade slots are unchanged.
  return React.useMemo(() => {
    const compareSlots = props.compareTo && props.compareTo.slots;
    const tradeNames = tradeSlotNames(slots);

    const isDiff = (name: string): boolean => {
      if (!compareSlots) return false;
      return slotKey(slots[name]) !== slotKey(compareSlots[name]);
    };

    return e(
      "div",
      {
        className: "comm-gear-grid",
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          pointerEvents: "auto",
        },
      },
      e(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            width: "fit-content",
          },
        },
        ...GEAR_ROWS.map((row, ri) =>
          e(
            "div",
            {
              key: `row${ri}`,
              style: {
                display: "flex",
                flexDirection: "row",
                flexWrap: "nowrap",
                gap: "2px",
              },
            },
            ...row.map((name) =>
              e(SlotCell, {
                key: name,
                entity: props.entity,
                slotName: name,
                slot: slots[name],
                diff: isDiff(name),
              }),
            ),
          ),
        ),
      ),
      tradeNames.length
        ? e(
            "div",
            {
              style: {
                display: "flex",
                flexWrap: "wrap",
                gap: "2px",
                borderTop: "1px solid #333",
                paddingTop: "4px",
                marginTop: "4px",
              },
            },
            e(
              "div",
              {
                style: {
                  flex: "0 0 100%",
                  fontSize: TYPE.micro,
                  color: "#888",
                  marginBottom: "2px",
                  letterSpacing: "0.04em",
                  ...PIXEL_TEXT,
                },
              },
              "TRADE",
            ),
            ...tradeNames.map((name) =>
              e(SlotCell, {
                key: name,
                entity: props.entity,
                slotName: name,
                slot: slots[name],
                showPrice: true,
                diff: isDiff(name),
              }),
            ),
          )
        : null,
    );
  }, [fp]);
}

