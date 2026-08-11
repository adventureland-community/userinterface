import { e, getReact } from "../../host/react";
import { monsterSprite, setXTarget } from "../../host/icons";
import { formatTime } from "../../lib/format";
import { CRYPT_PANEL_STYLE } from "../../lib/frameSizes";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";
import { getCryptMobLabel } from "../../crypt/labels";
import {
  CRYPT_BOSSES_MTYPES,
  CRYPT_IMPORTANT_MOBS_MTYPES,
  getInstanceData,
  resolveFocusMtype,
  updateFromEntities,
  type CryptBossState,
} from "../../crypt/tracker";
import type { EntityLike } from "../../host/globals";
import { getMapData } from "./MapInfo";

export type CryptProgressProps = {
  entities: EntityLike[];
  layoutEdit?: boolean;
  setSelectedEntity?: (id: string) => void;
};

const CRYPT_BAT_MTYPES = CRYPT_IMPORTANT_MOBS_MTYPES.filter(
  (mtype) => CRYPT_BOSSES_MTYPES.indexOf(mtype) < 0,
);

const CARD_ICON_SIZE = 20;

function findVisibleMob(
  entities: EntityLike[],
  mtype: string,
): EntityLike | undefined {
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    if (!entity) continue;
    if (entity.type !== "monster" || !entity.visible || entity.dead) continue;
    if (entity.mtype === mtype) return entity;
  }
  return undefined;
}

function wrapIconHtml(html: string): any {
  return e("div", {
    style: { display: "inline-block", lineHeight: 0, fontSize: 0, flexShrink: 0 },
    dangerouslySetInnerHTML: { __html: html },
    ref: (node: HTMLElement | null) => {
      if (!node) return;
      const root = node.firstElementChild as HTMLElement | null;
      if (!root) return;
      root.style.margin = "0";
      root.removeAttribute("onmousedown");
      root.removeAttribute("ontouchstart");
      root.removeAttribute("onclick");
    },
  });
}

const CARD_STYLE_BASE: Record<string, any> = {
  background: "black",
  padding: "4px 6px",
  minWidth: "72px",
  boxSizing: "border-box",
  fontSize: TYPE.chrome,
  lineHeight: 1.25,
  color: "#eee",
  ...PIXEL_TEXT,
};

const META_STYLE: Record<string, any> = {
  fontSize: TYPE.secondary,
  color: "#ccc",
  ...PIXEL_TEXT,
};

const SECTION_LABEL_STYLE: Record<string, any> = {
  fontSize: TYPE.secondary,
  color: "#888",
  padding: "2px 4px 0",
  ...PIXEL_TEXT,
};

const PANEL_SHELL: Record<string, any> = {
  display: "flex",
  flexDirection: "column",
  margin: "4px",
  border: "2px double gray",
  background: "black",
  gap: "4px",
  fontSize: TYPE.chrome,
  opacity: 0.78,
  ...PIXEL_TEXT,
  ...CRYPT_PANEL_STYLE,
};

function formatBossDeathStatus(boss: CryptBossState): string {
  const ago =
    boss.deathEventTimestamp != null
      ? formatTime((Date.now() - boss.deathEventTimestamp) / 1000)
      : "?";
  if (boss.deadCount > 1) {
    return `Died · #${boss.deadCount} · ${ago} ago`;
  }
  return `Died ${ago} ago`;
}

function CryptCard(props: {
  mtype: string;
  borderColor: string;
  levelComponent: string;
  status: string;
  lastSeenComponent: any;
  focusComponent: any;
  luckmComponent: any;
  onClick?: () => void;
  dummy?: boolean;
}): any {
  const React = getReact();
  const displayName = getCryptMobLabel(props.mtype);
  const clickable = !!props.onClick;
  const iconHtml = React.useMemo(
    () => (props.dummy ? "" : monsterSprite(props.mtype, { size: CARD_ICON_SIZE })),
    [props.mtype, props.dummy],
  );
  const icon = iconHtml ? wrapIconHtml(iconHtml) : null;

  return e(
    "div",
    {
      key: props.mtype,
      style: Object.assign({}, CARD_STYLE_BASE, {
        border: `2px double ${props.borderColor}`,
        cursor: clickable ? "pointer" : undefined,
        opacity: props.dummy ? 0.85 : undefined,
      }),
      title: clickable ? "Click to target" : props.mtype,
      onClick: props.onClick,
    },
    e(
      "div",
      {
        key: "nameRow",
        style: {
          display: "flex",
          alignItems: "center",
          gap: "4px",
          minWidth: 0,
        },
      },
      icon,
      e(
        "span",
        {
          style: {
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          },
        },
        `${displayName}${props.levelComponent}`,
      ),
    ),
    e("div", { key: "state", style: META_STYLE }, props.status),
    props.lastSeenComponent
      ? e("div", { key: "lastSeen", style: META_STYLE }, props.lastSeenComponent)
      : undefined,
    props.focusComponent
      ? e("div", { key: "focus", style: META_STYLE }, props.focusComponent)
      : undefined,
    props.luckmComponent
      ? e("div", { key: "luckm", style: META_STYLE }, props.luckmComponent)
      : undefined,
  );
}

function CryptProgressLayoutDummy(): any {
  return e(
    "div",
    {
      className: "comm-crypt-progress comm-crypt-progress-dummy",
      style: PANEL_SHELL,
    },
    e(
      "div",
      {
        style: {
          padding: "5px 8px 0",
          whiteSpace: "nowrap",
          fontSize: TYPE.title,
          color: "#ccc",
          ...PIXEL_TEXT,
        },
      },
      "Crypt",
    ),
    e(
      "div",
      {
        key: "content",
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          padding: "0 4px 4px",
        },
      },
      e("div", { key: "bosses-label", style: SECTION_LABEL_STYLE }, "Bosses"),
      e(
        "div",
        {
          key: "bosses",
          style: { display: "flex", flexWrap: "wrap", gap: "4px" },
        },
        e(CryptCard, {
          key: "a1",
          mtype: "a1",
          borderColor: "yellow",
          levelComponent: " (10 lvl)",
          status: "Alive",
          lastSeenComponent: "We see!",
          focusComponent: null,
          luckmComponent: null,
          dummy: true,
        }),
        e(CryptCard, {
          key: "a2",
          mtype: "a2",
          borderColor: "gray",
          levelComponent: "",
          status: "Died · #2 · 3m ago",
          lastSeenComponent: null,
          focusComponent: null,
          luckmComponent: "luckm: 0.125",
          dummy: true,
        }),
      ),
      e("div", { key: "bats-label", style: SECTION_LABEL_STYLE }, "Bats"),
      e(
        "div",
        {
          key: "bats",
          style: { display: "flex", flexWrap: "wrap", gap: "4px" },
        },
        e(CryptCard, {
          key: "vbat",
          mtype: "vbat",
          borderColor: "red",
          levelComponent: "",
          status: "Died: 1",
          lastSeenComponent: null,
          focusComponent: null,
          luckmComponent: null,
          dummy: true,
        }),
        e(CryptCard, {
          key: "nerfedbat",
          mtype: "nerfedbat",
          borderColor: "gray",
          levelComponent: "",
          status: "Died: 0",
          lastSeenComponent: null,
          focusComponent: null,
          luckmComponent: null,
          dummy: true,
        }),
      ),
    ),
  );
}

function buildCryptCard(
  mtype: string,
  props: CryptProgressProps,
  currentlySeeMtypes: Set<string>,
  aggroedMtypes: Set<string>,
  instanceData: ReturnType<typeof getInstanceData>,
): any {
  const mobRichData = instanceData[mtype];
  let borderColor = "gray";
  if (aggroedMtypes.has(mtype)) borderColor = "red";
  else if (currentlySeeMtypes.has(mtype)) borderColor = "yellow";

  let status = "??";
  let lastSeenComponent: any = null;
  let levelComponent = "";
  let focusComponent: any = null;
  let luckmComponent: any = null;

  if (mobRichData) {
    if (CRYPT_BOSSES_MTYPES.indexOf(mtype) >= 0) {
      const boss = mobRichData as CryptBossState;
      if (boss.deadCount > 0) {
        status = formatBossDeathStatus(boss);
        if (boss.luckm != null) {
          luckmComponent = `luckm: ${boss.luckm.toFixed(3)}`;
        }
      } else {
        status = "Alive";
        if (aggroedMtypes.has(mtype)) lastSeenComponent = "Aggroed!";
        else if (currentlySeeMtypes.has(mtype)) lastSeenComponent = "We see!";
        else if (boss.lastSeen != null) {
          lastSeenComponent = `Seen ${formatTime((Date.now() - boss.lastSeen) / 1000)} ago`;
        }
        if (boss.lastSeenFocus) {
          const focusMtype = resolveFocusMtype(boss.lastSeenFocus);
          if (focusMtype) {
            focusComponent = `Focus: ${getCryptMobLabel(focusMtype)}`;
          }
        }
      }
      if (boss.lastSeenLevel != null) {
        levelComponent = ` (${boss.lastSeenLevel} lvl)`;
      }
    } else {
      status = `Died: ${mobRichData.deadCount}`;
    }
  }

  let onClick: (() => void) | undefined;
  if (props.setSelectedEntity && currentlySeeMtypes.has(mtype)) {
    const visibleMob = findVisibleMob(props.entities, mtype);
    if (visibleMob) {
      onClick = () => {
        setXTarget(visibleMob);
        props.setSelectedEntity!(String(visibleMob.id));
      };
    }
  }

  return e(CryptCard, {
    key: mtype,
    mtype,
    borderColor,
    levelComponent,
    status,
    lastSeenComponent,
    focusComponent,
    luckmComponent,
    onClick,
  });
}

function renderMobSection(
  label: string,
  mtypes: string[],
  props: CryptProgressProps,
  currentlySeeMtypes: Set<string>,
  aggroedMtypes: Set<string>,
  instanceData: ReturnType<typeof getInstanceData>,
): any[] {
  const cards: any[] = [];
  for (let i = 0; i < mtypes.length; i++) {
    cards.push(
      buildCryptCard(
        mtypes[i],
        props,
        currentlySeeMtypes,
        aggroedMtypes,
        instanceData,
      ),
    );
  }
  return [
    e("div", { key: `${label}-label`, style: SECTION_LABEL_STYLE }, label),
    e(
      "div",
      {
        key: label,
        style: { display: "flex", flexWrap: "wrap", gap: "4px" },
      },
      ...cards,
    ),
  ];
}

export function CryptProgress(props: CryptProgressProps): any {
  const mapName = getMapData(props.entities);
  const onCrypt = !!(mapName && mapName.map === "crypt");

  if (!onCrypt) {
    if (!props.layoutEdit) return null;
    return e(CryptProgressLayoutDummy);
  }

  updateFromEntities(mapName.in, props.entities);

  const currentlySeeMtypes = new Set<string>();
  const aggroedMtypes = new Set<string>();

  for (let i = 0; i < props.entities.length; i++) {
    const entity = props.entities[i];
    if (!entity) continue;
    if (entity.type !== "monster" || !entity.visible || entity.dead) continue;
    if (!entity.mtype || CRYPT_IMPORTANT_MOBS_MTYPES.indexOf(entity.mtype) < 0) {
      continue;
    }
    currentlySeeMtypes.add(entity.mtype);
    if (entity.target) aggroedMtypes.add(entity.mtype);
  }

  const instanceData = getInstanceData(mapName.in);

  return e(
    "div",
    {
      className: "comm-crypt-progress",
      style: {
        display: "flex",
        flexDirection: "column",
        margin: "4px",
        border: "2px double gray",
        background: "black",
        gap: "4px",
        fontSize: TYPE.chrome,
        ...PIXEL_TEXT,
      },
    },
    e(
      "div",
      {
        style: {
          padding: "5px 8px 0",
          whiteSpace: "nowrap",
          fontSize: TYPE.title,
          color: "#ccc",
          ...PIXEL_TEXT,
        },
      },
      "Crypt",
    ),
    e(
      "div",
      {
        key: "content",
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          padding: "0 4px 4px",
        },
      },
      ...renderMobSection(
        "Bosses",
        CRYPT_BOSSES_MTYPES,
        props,
        currentlySeeMtypes,
        aggroedMtypes,
        instanceData,
      ),
      ...renderMobSection(
        "Bats",
        CRYPT_BAT_MTYPES,
        props,
        currentlySeeMtypes,
        aggroedMtypes,
        instanceData,
      ),
    ),
  );
}
