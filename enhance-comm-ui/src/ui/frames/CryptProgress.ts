import { e } from "../../host/react";
import { PANEL_SHELL } from "../../crypt/cryptCardStyles";
import {
  buildCryptCardProps,
  formatClearedGlance,
  type CryptProgressProps,
} from "../../crypt/cryptCardModel";
import { getInstanceData, updateFromEntities } from "../../instance/tracker";
import {
  getInstanceConfig,
  isTrackedInstanceMap,
  type InstanceConfig,
} from "../../instance/configs";
import {
  countVisibleOfMtypes,
  formatSectionLabel,
  mapDesignPackCount,
} from "../../instance/sectionCounts";
import { getMapData } from "./MapInfo";
import { CryptCard } from "./crypt/CryptCard";
import { CryptProgressLayoutDummy } from "./crypt/CryptProgressDummy";
import { ensureCryptPanelCss } from "../../crypt/cryptPanelCss";

export type { CryptProgressProps };

function winterPhaseGlance(
  cfg: InstanceConfig,
  mtype: string,
  cardGlance: string,
  currentlySee: Set<string>,
  instanceData: ReturnType<typeof getInstanceData>,
): string {
  const order = cfg.phaseOrder || cfg.bossMtypes;
  const idx = order.indexOf(mtype);
  if (idx < 0) return cardGlance;

  let activeIdx = -1;
  for (let i = 0; i < order.length; i++) {
    if (currentlySee.has(order[i])) activeIdx = i;
  }
  if (activeIdx < 0) {
    let cleared = 0;
    for (let i = 0; i < order.length; i++) {
      const row = instanceData[order[i]];
      if (row && row.deadCount > 0) cleared = i + 1;
    }
    activeIdx = cleared > 0 ? cleared - 1 : -1;
  }

  const row = instanceData[mtype];
  const dead = !!(row && row.deadCount > 0) && !currentlySee.has(mtype);
  if (dead || (activeIdx >= 0 && idx < activeIdx)) {
    const at =
      row && "deathEventTimestamp" in row ? row.deathEventTimestamp : undefined;
    return formatClearedGlance(at);
  }
  if (currentlySee.has(mtype)) return cardGlance;
  if (activeIdx >= 0 && idx === activeIdx + 1) return "Up next";
  if (idx === order.length - 1 && activeIdx < idx) return "Final phase";
  return cardGlance;
}

function renderMobSection(
  label: string,
  mtypes: string[],
  props: CryptProgressProps,
  currentlySeeMtypes: Set<string>,
  aggroedMtypes: Set<string>,
  instanceData: ReturnType<typeof getInstanceData>,
  cfg: InstanceConfig,
  mapKey: string | undefined,
  extras?: Record<string, string | null>,
): any[] {
  const cards: any[] = [];
  const compass = cfg.cardLayout === "compass";

  for (let i = 0; i < mtypes.length; i++) {
    const mt = mtypes[i];
    const built = buildCryptCardProps(
      mt,
      props,
      currentlySeeMtypes,
      aggroedMtypes,
      instanceData,
      extras ? extras[mt] : null,
    );
    if (cfg.accentBorders && cfg.accentBorders[mt]) {
      // Accent wins over default gray; keep aggro/seen highlights when live.
      if (built.borderColor === "gray") {
        built.borderColor = cfg.accentBorders[mt];
      }
    }
    if (cfg.progressMode === "phase") {
      built.glance = winterPhaseGlance(
        cfg,
        mt,
        built.glance,
        currentlySeeMtypes,
        instanceData,
      );
      if (built.glance.indexOf("Cleared") === 0) built.faded = true;
    }
    const card = e(CryptCard, built);
    cards.push(
      cfg.gateBossMtype === mt
        ? e("div", { key: mt, className: "ecu-inst-card-span" }, card)
        : card,
    );
  }

  const gridClass = compass
    ? "ecu-inst-grid ecu-inst-grid--compass"
    : "ecu-inst-grid";

  // Boss grids stay plain "Bosses"; add/minion sections get live pack counts.
  const isBossSection =
    mtypes.length > 0 && mtypes.every((mt) => cfg.bossMtypes.indexOf(mt) >= 0);
  const sectionTitle = isBossSection
    ? label
    : formatSectionLabel(
        label,
        countVisibleOfMtypes(props.entities, mtypes),
        mapDesignPackCount(mapKey, mtypes),
      );

  return [
    e(
      "div",
      { key: `${label}-label`, className: "ecu-inst-sec" },
      sectionTitle,
    ),
    e("div", { key: label, className: gridClass }, ...cards),
  ];
}

/** Instance boss/add cards (crypt + spider + tomb + winter). Panel id: instance. */
export function CryptProgress(props: CryptProgressProps): any {
  ensureCryptPanelCss();
  const mapName = getMapData(props.entities);
  const cfg = getInstanceConfig(mapName.map);
  const onInstance = isTrackedInstanceMap(mapName.map);
  if (!onInstance || !cfg) {
    if (!props.layoutEdit) return null;
    return e(CryptProgressLayoutDummy);
  }
  updateFromEntities(mapName.in, props.entities, {
    trackedMtypes: cfg.trackedMtypes,
    bossMtypes: cfg.bossMtypes,
  });
  const currentlySeeMtypes = new Set<string>();
  const aggroedMtypes = new Set<string>();
  for (let i = 0; i < props.entities.length; i++) {
    const entity = props.entities[i];
    if (!entity) continue;
    if (entity.type !== "monster" || !entity.visible || entity.dead) continue;
    if (!entity.mtype || cfg.trackedMtypes.indexOf(entity.mtype) < 0) {
      continue;
    }
    currentlySeeMtypes.add(entity.mtype);
    if (entity.target) aggroedMtypes.add(entity.mtype);
  }
  const instanceData = getInstanceData(mapName.in);
  const cardProps: CryptProgressProps = {
    ...props,
    bossMtypes: cfg.bossMtypes,
  };

  const extras: Record<string, string | null> = {};
  if (cfg.gateBossMtype && cfg.gateSideMtypes) {
    let sideAlive = false;
    for (let i = 0; i < cfg.gateSideMtypes.length; i++) {
      const mt = cfg.gateSideMtypes[i];
      const row = instanceData[mt];
      const dead = !!(row && row.deadCount > 0) && !currentlySeeMtypes.has(mt);
      if (!dead) sideAlive = true;
    }
    if (sideAlive) extras[cfg.gateBossMtype] = "passage blocked";
  }

  const sections: any[] = [];
  for (let i = 0; i < cfg.sections.length; i++) {
    const sec = cfg.sections[i];
    sections.push(
      ...renderMobSection(
        sec.label,
        sec.mtypes,
        cardProps,
        currentlySeeMtypes,
        aggroedMtypes,
        instanceData,
        cfg,
        mapName.map,
        extras,
      ),
    );
  }

  // Map name lives on the mapInfo chip; run totals live on instanceRun.
  return e(
    "div",
    {
      className: "comm-crypt-progress",
      style: PANEL_SHELL,
    },
    e(
      "div",
      {
        key: "content",
        className: "ecu-inst-body",
      },
      ...sections,
    ),
  );
}

export const InstancePanel = CryptProgress;
