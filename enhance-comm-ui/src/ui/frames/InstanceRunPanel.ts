import { e } from "../../host/react";
import { PIXEL_TEXT } from "../../lib/typeScale";
import {
  getInstanceConfig,
  isTrackedInstanceMap,
} from "../../instance/configs";
import {
  buildInstanceRunModel,
  type InstanceRunModel,
} from "../../instance/runModel";
import { updateFromEntities } from "../../instance/tracker";
import type { EntityLike } from "../../host/globals";
import { getMapData } from "./MapInfo";
import { ensureCryptPanelCss } from "../../crypt/cryptPanelCss";

export type InstanceRunPanelProps = {
  entities: EntityLike[];
  layoutEdit?: boolean;
};

const DUMMY_MODEL: InstanceRunModel = {
  title: "The Crypt",
  progressLabel: "Bosses cleared",
  progressCurrent: 5,
  progressTotal: 8,
  phaseLabel: null,
  luckmLabel: "luckm 0.125",
  hint: null,
};

function renderInstanceRun(
  model: InstanceRunModel,
  isPhase: boolean,
  dummy?: boolean,
): any {
  const pct =
    model.progressTotal > 0
      ? Math.min(
          100,
          Math.round((model.progressCurrent / model.progressTotal) * 100),
        )
      : 0;
  const metaLeft = isPhase
    ? model.hint || ""
    : model.phaseLabel || model.hint || "";
  const showMeta = !!(metaLeft || model.luckmLabel);
  return e(
    "div",
    {
      className: dummy
        ? "comm-instance-run comm-instance-run-dummy"
        : "comm-instance-run",
      style: PIXEL_TEXT,
    },
    isPhase && model.phaseLabel
      ? e("span", { className: "ecu-inst-run__pill" }, model.phaseLabel)
      : null,
    e(
      "div",
      { className: "ecu-inst-run__label" },
      e("span", null, model.progressLabel),
      e(
        "span",
        { className: "ecu-inst-run__count" },
        `${model.progressCurrent} / ${model.progressTotal}`,
      ),
    ),
    !isPhase
      ? e(
          "div",
          { className: "ecu-inst-run__bar" },
          e("div", {
            className: "ecu-inst-run__fill",
            style: { width: pct + "%" },
          }),
        )
      : null,
    showMeta
      ? e(
          "div",
          { className: "ecu-inst-run__meta" },
          e("span", null, metaLeft),
          model.luckmLabel ? e("span", null, model.luckmLabel) : null,
        )
      : null,
  );
}

/** Progress / phase / luckm strip — separate movable panel (mockup instanceRun). */
export function InstanceRunPanel(props: InstanceRunPanelProps): any {
  ensureCryptPanelCss();
  const mapName = getMapData(props.entities);
  const cfg = getInstanceConfig(mapName.map);
  if (!isTrackedInstanceMap(mapName.map) || !cfg) {
    if (!props.layoutEdit) return null;
    return renderInstanceRun(DUMMY_MODEL, false, true);
  }

  updateFromEntities(mapName.in, props.entities, {
    trackedMtypes: cfg.trackedMtypes,
    bossMtypes: cfg.bossMtypes,
  });

  const currentlySeeMtypes = new Set<string>();
  for (let i = 0; i < props.entities.length; i++) {
    const entity = props.entities[i];
    if (!entity) continue;
    if (entity.type !== "monster" || !entity.visible || entity.dead) continue;
    if (entity.mtype && cfg.trackedMtypes.indexOf(entity.mtype) >= 0) {
      currentlySeeMtypes.add(entity.mtype);
    }
  }

  const model = buildInstanceRunModel(
    cfg,
    mapName.in,
    props.entities,
    currentlySeeMtypes,
  );
  return renderInstanceRun(model, cfg.progressMode === "phase");
}
