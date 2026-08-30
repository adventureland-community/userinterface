/**
 * Trade row / merchant stand panel — separate from paperdoll gear.
 */

import { getReact, e } from "../../host/react";
import type { EntityLike } from "../../host/globals";
import { findEntity } from "../../queries/entities";
import { canEditObservedGear, isObservedSelf } from "../../host/gearObserved";
import { tradeRowVisible } from "../../lib/tradeSlots";
import { entityHasTradeSlots } from "./comm/guidedTour/paperdollTrade";
import { TradeGrid } from "../trade/TradeGrid";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";

export type TradeViewMode = "yours" | "inspected";

export type TradePanelProps = {
  entities: EntityLike[];
  selectedEntity?: string;
  observing?: EntityLike | null;
  layoutEdit?: boolean;
};

function snapshotEntity(ent: EntityLike): EntityLike {
  const copy: EntityLike = Object.assign({}, ent);
  if (ent.slots) copy.slots = Object.assign({}, ent.slots);
  return copy;
}

export function resolveInspectedEntity(
  entities: EntityLike[],
  selectedEntity: string | undefined,
  observing: EntityLike | null | undefined,
  cached: EntityLike | null,
): { entity: EntityLike | null; stale: boolean; cache: EntityLike | null } {
  const obsId =
    observing && observing.id != null ? String(observing.id) : "";
  const selectedId =
    selectedEntity != null && selectedEntity !== ""
      ? String(selectedEntity)
      : "";

  if (!selectedId || selectedId === obsId) {
    return { entity: null, stale: false, cache: null };
  }

  const live = findEntity(entities, selectedId);
  if (live) {
    return {
      entity: snapshotEntity(live),
      stale: false,
      cache: snapshotEntity(live),
    };
  }
  if (cached && String(cached.id) === selectedId) {
    return { entity: cached, stale: true, cache: cached };
  }
  return { entity: null, stale: false, cache: null };
}

export function resolveOwnTradeEntity(
  entities: EntityLike[],
  observing: EntityLike | null | undefined,
): EntityLike | null {
  if (!observing || observing.id == null) return null;
  const obsId = String(observing.id);
  return findEntity(entities, obsId) || observing;
}

/** @deprecated use resolveOwnTradeEntity / resolveInspectedEntity */
export function resolveTradePanelEntity(
  entities: EntityLike[],
  selectedEntity: string | undefined,
  observing: EntityLike | null | undefined,
  cached: EntityLike | null,
): { entity: EntityLike | null; stale: boolean; cache: EntityLike | null } {
  const obsId =
    observing && observing.id != null ? String(observing.id) : "";
  const selectedId =
    selectedEntity != null && selectedEntity !== ""
      ? String(selectedEntity)
      : "";

  if (selectedId && selectedId !== obsId) {
    return resolveInspectedEntity(entities, selectedEntity, observing, cached);
  }
  const own = resolveOwnTradeEntity(entities, observing);
  return { entity: own, stale: false, cache: null };
}

export function tradePanelHasContent(
  entity: EntityLike | null,
  gearEditable: boolean,
): boolean {
  if (!entity || !entity.slots) return false;
  if (gearEditable) return true;
  return tradeRowVisible(entity.slots, entity);
}

function modeButton(
  label: string,
  active: boolean,
  onClick: () => void,
): any {
  return e(
    "button",
    {
      type: "button",
      className: "comm-trade-mode-btn" + (active ? " is-active" : ""),
      onClick,
      style: {
        fontSize: TYPE.microMin,
        padding: "2px 8px",
        cursor: "pointer",
        background: active ? "#3a3a3a" : "transparent",
        border: active ? "1px solid #888" : "1px solid #444",
        color: active ? "#eee" : "#888",
        ...PIXEL_TEXT,
      },
    },
    label,
  );
}

export function TradePanel(props: TradePanelProps): any {
  const React = getReact();
  const inspectCacheRef = React.useRef(null as EntityLike | null);
  const [viewMode, setViewMode] = React.useState("yours" as TradeViewMode);

  const ownEntity = resolveOwnTradeEntity(props.entities, props.observing);
  const inspected = resolveInspectedEntity(
    props.entities,
    props.selectedEntity,
    props.observing,
    inspectCacheRef.current,
  );
  if (inspected.cache) inspectCacheRef.current = inspected.cache;

  const hasInspected =
    !!(inspected.entity && !isObservedSelf(inspected.entity)) &&
    tradePanelHasContent(inspected.entity, false);

  React.useEffect(() => {
    if (
      props.selectedEntity &&
      inspected.entity &&
      !isObservedSelf(inspected.entity) &&
      entityHasTradeSlots(inspected.entity)
    ) {
      setViewMode("inspected");
    }
  }, [props.selectedEntity, inspected.entity?.id]);

  if (!ownEntity && !hasInspected) {
    if (!props.layoutEdit) return null;
    return e(
      "div",
      {
        className: "comm-trade-panel comm-trade-panel--placeholder",
        style: {
          padding: "8px",
          color: "#666",
          fontSize: TYPE.micro,
          ...PIXEL_TEXT,
        },
      },
      "Trade — layout preview",
    );
  }

  const showInspected = viewMode === "inspected" && hasInspected;
  const displayEntity = showInspected ? inspected.entity : ownEntity;
  const stale = showInspected && inspected.stale;
  const gearEditable =
    !showInspected && canEditObservedGear(displayEntity, false);

  if (!displayEntity) return null;
  if (!props.layoutEdit && !tradePanelHasContent(displayEntity, gearEditable)) {
    return null;
  }

  const inspectedLabel =
    inspected.entity?.name != null
      ? String(inspected.entity.name)
      : inspected.entity?.id != null
        ? String(inspected.entity.id)
        : "Player";

  return e(
    "div",
    {
      className:
        "comm-trade-panel" + (stale ? " comm-trade-panel--stale" : ""),
      style: {
        padding: "6px 8px",
        boxSizing: "border-box",
        opacity: stale ? 0.92 : 1,
        border: stale ? "1px dashed #c9a227" : undefined,
        pointerEvents: "none",
        background: "rgba(0,0,0,0.94)",
        minHeight: "100%",
      },
    },
    e(
      "div",
      { style: { pointerEvents: "auto" } },
      hasInspected
      ? e(
          "div",
          {
            style: {
              display: "flex",
              gap: "4px",
              marginBottom: "6px",
            },
          },
          modeButton("Yours", viewMode === "yours", () => setViewMode("yours")),
          modeButton(
            inspectedLabel,
            viewMode === "inspected",
            () => setViewMode("inspected"),
          ),
        )
      : null,
    e(TradeGrid, {
      entity: displayEntity,
      observing: props.observing,
      gearEditable,
    }),
    ),
  );
}
