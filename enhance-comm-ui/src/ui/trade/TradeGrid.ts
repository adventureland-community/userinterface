import { getReact, e } from "../../host/react";
import type { EntityLike } from "../../host/globals";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";
import {
  merchantCloseCommand,
  merchantOpenCommand,
} from "../../host/tradeCommands";
import {
  compactTradeSlotNames,
  merchantStandCapacity,
  merchantStandSlotNames,
  personalTradeSlotNames,
  standGridColumns,
} from "../../lib/tradeSlots";
import { tradeSlotGridRows } from "../../lib/tradeHelpers";
import { TRADE_PANEL_MIN_HEIGHT, TRADE_PANEL_WIDTH } from "../../lib/frameSizes";
import {
  mergeStandTradeSlotsForUi,
  standTradeMemoryEpoch,
} from "../../lib/standTradeSlotMemory";
import {
  formatFreeInventorySpace,
  formatTradeSlotSpace,
} from "../../lib/inventorySpace";
import { slotsFingerprint } from "../chrome/gearSlotCell";
import { TradeSlotCell } from "./TradeSlotCell";
import { isInTradeRange } from "../../lib/tradeHelpers";

/** Persisted slot grid density — independent of merchant stand open/closed. */
const TRADE_SLOTS_COMPACT_KEY = "ecu-trade-slots-compact";

export type TradeGridProps = {
  entity: EntityLike;
  observing?: EntityLike | null;
  gearEditable?: boolean;
};

function readSlotsCompact(): boolean {
  try {
    const v = localStorage.getItem(TRADE_SLOTS_COMPACT_KEY);
    if (v === "0" || v === "false") return false;
  } catch (_e) {
    /* ignore */
  }
  return true;
}

function writeSlotsCompact(compact: boolean): void {
  try {
    localStorage.setItem(TRADE_SLOTS_COMPACT_KEY, compact ? "1" : "0");
  } catch (_e) {
    /* ignore */
  }
}

function sectionLabel(text: string, detail?: string | null): any {
  return e(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: "6px",
        marginBottom: "2px",
      },
    },
    e(
      "div",
      {
        style: {
          fontSize: TYPE.microMin,
          color: "#a99a5b",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          ...PIXEL_TEXT,
        },
      },
      text,
    ),
    detail
      ? e(
          "div",
          {
            style: {
              fontSize: TYPE.microMin,
              color: "#777",
              ...PIXEL_TEXT,
            },
          },
          detail,
        )
      : null,
  );
}

function renderSlotRows(
  slotNames: string[],
  columns: number,
  slots: Record<string, any>,
  props: TradeGridProps,
): any {
  const rows = tradeSlotGridRows(slotNames, columns);
  if (!rows.length) return null;
  return e(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: "2px",
      },
    },
    ...rows.map((row, ri) =>
      e(
        "div",
        {
          key: `trow${ri}`,
          style: {
            display: "flex",
            flexDirection: "row",
            gap: "2px",
          },
        },
        ...row.map((name) =>
          e(TradeSlotCell, {
            key: name,
            entity: props.entity,
            observing: props.observing,
            slotName: name,
            slot: slots[name],
            gearEditable: props.gearEditable,
            allSlots: slots,
          }),
        ),
      ),
    ),
  );
}

function toolbarButton(
  label: string,
  title: string,
  onClick: () => void,
  active?: boolean,
): any {
  return e(
    "button",
    {
      type: "button",
      className: "comm-gear-trade-btn" + (active ? " is-active" : ""),
      title,
      onClick,
      style: {
        fontSize: TYPE.microMin,
        padding: "1px 5px",
        cursor: "pointer",
        background: active ? "#3a3a3a" : "transparent",
        border: active ? "1px solid #888" : "1px solid #555",
        color: active ? "#eee" : "#aaa",
        ...PIXEL_TEXT,
      },
    },
    label,
  );
}

export function TradeGrid(props: TradeGridProps): any {
  const React = getReact();
  const liveSlots = props.entity.slots;
  if (!liveSlots) return null;

  const [slotsCompact, setSlotsCompact] = React.useState(readSlotsCompact);

  const entityId = props.entity.id != null ? String(props.entity.id) : "";
  const standOpen = !!props.entity.stand;
  const slots =
    props.gearEditable && entityId
      ? mergeStandTradeSlotsForUi(entityId, liveSlots, standOpen) || liveSlots
      : liveSlots;
  const memEpoch = props.gearEditable ? standTradeMemoryEpoch() : 0;
  const fp =
    entityId +
    "|" +
    slotsFingerprint(slots) +
    "|" +
    (props.gearEditable ? "edit" : "view") +
    "|" +
    (standOpen ? "stand" : "row") +
    "|" +
    (slotsCompact ? "c" : "f") +
    "|" +
    memEpoch;

  return React.useMemo(() => {
    const entityLabel =
      props.entity.name != null ? String(props.entity.name) : entityId;
    const foreign = !props.gearEditable;
    const inRange =
      !foreign || isInTradeRange(props.entity, props.observing || window.observing);

    const personalAll = personalTradeSlotNames(slots, props.entity, props.gearEditable);
    const personalNames = compactTradeSlotNames(personalAll, slots, slotsCompact);
    const showPersonal = personalAll.length > 0;
    const standCapacity = merchantStandCapacity(props.entity);
    const standCols = standGridColumns(standCapacity);
    const showStandSection = props.gearEditable || standOpen;
    const standNames = showStandSection
      ? merchantStandSlotNames(slots, props.entity, slotsCompact, true)
      : [];
    const personalSpace = formatTradeSlotSpace(personalAll, slots);
    const standAllNames = showStandSection
      ? merchantStandSlotNames(slots, props.entity, false, true)
      : [];
    const standSpace = formatTradeSlotSpace(standAllNames, slots);
    const obsBagSpace = formatFreeInventorySpace(props.observing || window.observing);
    const merchantBagSpace = foreign
      ? formatFreeInventorySpace(props.entity)
      : null;

    const toggleSlotsCompact = () => {
      setSlotsCompact((prev) => {
        const next = !prev;
        writeSlotsCompact(next);
        return next;
      });
    };

    const showSlotToolbar = showPersonal || standOpen || props.gearEditable;

    return e(
      "div",
      {
        className: "comm-trade-grid",
        "data-ecu-tour": "trade-panel",
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          pointerEvents: "auto",
          width: `${TRADE_PANEL_WIDTH}px`,
          minHeight: `${TRADE_PANEL_MIN_HEIGHT}px`,
          boxSizing: "border-box",
        },
      },
      e(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "6px",
            flexWrap: "wrap",
          },
        },
        e(
          "div",
          {
            style: {
              fontSize: TYPE.micro,
              color: "#ccc",
              ...PIXEL_TEXT,
            },
          },
          props.gearEditable ? "Your trades" : `${entityLabel} · trade`,
        ),
        showSlotToolbar
          ? e(
              "div",
              {
                style: { display: "flex", gap: "4px", flexWrap: "wrap" },
                title: "Merchant stand vs slot grid display",
              },
              props.gearEditable
                ? standOpen
                  ? toolbarButton(
                      "Close stand",
                      "Close merchant stand in game",
                      () => merchantCloseCommand(),
                    )
                  : toolbarButton(
                      "Open stand",
                      "Open merchant stand — auto-finds stand in bag",
                      () => merchantOpenCommand(),
                    )
                : null,
              toolbarButton(
                slotsCompact ? "Compact slots" : "All slots",
                slotsCompact
                  ? "Show filled listings plus one empty slot per row"
                  : "Show every empty slot in the grid",
                toggleSlotsCompact,
                slotsCompact,
              ),
            )
          : null,
      ),
      foreign && !inRange
        ? e(
            "div",
            {
              style: {
                fontSize: TYPE.microMin,
                color: "#c9a227",
                ...PIXEL_TEXT,
              },
            },
            "Too far — move closer to trade.",
          )
        : null,
      showPersonal
        ? e(
            "div",
            { className: "comm-trade-section comm-trade-section--personal" },
            sectionLabel("Trade slots", personalSpace),
            renderSlotRows(personalNames, 4, slots, props),
          )
        : null,
      showStandSection
        ? e(
            "div",
            { className: "comm-trade-section comm-trade-section--stand" },
            sectionLabel(
              standOpen ? "Merchant stand" : "Merchant stand (closed)",
              standSpace,
            ),
            renderSlotRows(standNames, standCols, slots, props),
          )
        : null,
      props.gearEditable
        ? e(
            "div",
            {
              style: {
                fontSize: TYPE.microMin,
                color: "#666",
                marginTop: "auto",
                ...PIXEL_TEXT,
              },
            },
            standOpen
              ? "Drag bag item to list · Shift+drag for giveaway" +
                (obsBagSpace ? ` · Your bag ${obsBagSpace}` : "")
              : "Stand closed — trade5+ listings stay visible from last open · Open stand to list or reprice" +
                (obsBagSpace ? ` · Your bag ${obsBagSpace}` : ""),
          )
        : foreign
          ? e(
              "div",
              {
                style: {
                  fontSize: TYPE.microMin,
                  color: "#666",
                  marginTop: "auto",
                  ...PIXEL_TEXT,
                },
              },
              "Click buy/fulfill · Shift+click info · Bag B badge = also sellable" +
                (merchantBagSpace ? ` · Their bag ${merchantBagSpace}` : "") +
                (obsBagSpace ? ` · Your bag ${obsBagSpace}` : ""),
            )
          : null,
    );
  }, [fp]);
}
