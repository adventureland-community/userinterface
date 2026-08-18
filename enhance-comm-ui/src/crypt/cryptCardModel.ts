import { setXTarget } from "../host/icons";
import { getCharacter, getEntitiesList } from "../host/al";
import { formatRelativeAge, formatTime } from "../lib/format";
import { getInstanceMobLabel } from "../instance/labels";
import { countVisibleOfMtypes } from "../instance/sectionCounts";
import { pickVisibleCryptMob } from "./pickVisibleMob";
import {
  CRYPT_BOSSES_MTYPES,
  CRYPT_IMPORTANT_MOBS_MTYPES,
  getInstanceData,
  resolveFocusMtype,
  type CryptBossState,
} from "../instance/tracker";
import type { EntityLike } from "../host/globals";

export type CryptProgressProps = {
  entities: EntityLike[];
  layoutEdit?: boolean;
  setSelectedEntity?: (id: string) => void;
  /** When set, boss/add card logic uses this list instead of crypt defaults. */
  bossMtypes?: string[];
};

export type CryptCardProps = {
  mtype: string;
  borderColor: string;
  /** Fight-changing one-liner. Empty when the idle card is enough. */
  glance: string;
  /** Identify / after-action lines. Shown in the card on hover. */
  hoverLines: string[];
  /** Last seen / live level — top-right corner. */
  level?: number;
  /** Add kill count — top-right under level. Bosses keep Died on glance. */
  kills?: number;
  /** Dim when dead/cleared and out of vision. Not the panel shell. */
  faded?: boolean;
  onClick?: () => void;
  dummy?: boolean;
};

export const CRYPT_BAT_MTYPES = CRYPT_IMPORTANT_MOBS_MTYPES.filter(
  (mtype) => CRYPT_BOSSES_MTYPES.indexOf(mtype) < 0,
);

function findVisibleMob(
  entities: EntityLike[],
  mtype: string,
): EntityLike | undefined {
  const self = getCharacter();
  const selfId = self && self.id != null ? String(self.id) : undefined;
  return pickVisibleCryptMob(entities, mtype, selfId);
}

export function formatBossDeathGlance(boss: CryptBossState): string {
  if (boss.deadCount > 1) return `Died · #${boss.deadCount}`;
  return "Died";
}

export function formatBossDeathHover(boss: CryptBossState): string {
  const ago =
    boss.deathEventTimestamp != null
      ? formatTime((Date.now() - boss.deathEventTimestamp) / 1000)
      : "?";
  if (boss.deadCount > 1) {
    return `Died · #${boss.deadCount} · ${ago} ago`;
  }
  return `Died ${ago} ago`;
}

/** Winter / phase cards: Cleared plus how long ago when we have a kill time. */
export function formatClearedGlance(clearedAt?: number): string {
  if (clearedAt == null || !(clearedAt > 0)) return "Cleared";
  const ago = formatRelativeAge(clearedAt);
  return ago ? `Cleared · ${ago}` : "Cleared";
}

/** @deprecated use formatBossDeathHover — kept for existing call sites. */
export function formatBossDeathStatus(boss: CryptBossState): string {
  return formatBossDeathHover(boss);
}

function pushHover(lines: string[], line: string | null | undefined): void {
  if (line) lines.push(line);
}

function rememberedLevel(
  row: CryptBossState | { lastSeenLevel?: number } | undefined,
): number | undefined {
  if (!row || typeof row.lastSeenLevel !== "number") return undefined;
  return row.lastSeenLevel;
}

/** Card field bag for CryptCard (orchestrator calls e(CryptCard, props)). */
export function buildCryptCardProps(
  mtype: string,
  props: CryptProgressProps,
  currentlySeeMtypes: Set<string>,
  aggroedMtypes: Set<string>,
  instanceData: ReturnType<typeof getInstanceData>,
  statusExtra?: string | null,
): CryptCardProps & { key: string } {
  const bossList = props.bossMtypes || CRYPT_BOSSES_MTYPES;
  const isBoss = bossList.indexOf(mtype) >= 0;
  const mobRichData = instanceData[mtype];
  const inVision = currentlySeeMtypes.has(mtype);
  const aggroed = aggroedMtypes.has(mtype);
  const live = pickVisibleCryptMob(props.entities, mtype);
  let level: number | undefined;
  if (live && typeof live.level === "number") level = live.level;
  else level = rememberedLevel(mobRichData);
  let kills: number | undefined;
  if (!isBoss && mobRichData && mobRichData.deadCount > 0) {
    kills = mobRichData.deadCount;
  }
  let borderColor = "gray";
  if (aggroed) borderColor = "red";
  else if (inVision) borderColor = "yellow";
  let glance = "";
  let faded = false;
  const hoverLines: string[] = [mtype];
  if (mobRichData) {
    if (isBoss) {
      const boss = mobRichData as CryptBossState;
      if (inVision || aggroed) {
        glance = aggroed ? "Aggroed!" : "We see!";
        if (statusExtra) glance = `${glance} · ${statusExtra}`;
      } else if (boss.deadCount > 0) {
        glance = formatBossDeathGlance(boss);
        faded = true;
        pushHover(hoverLines, formatBossDeathHover(boss));
        if (boss.luckm != null) {
          pushHover(hoverLines, `luckm ${boss.luckm.toFixed(3)}`);
        }
      } else if (boss.lastSeen != null) {
        pushHover(
          hoverLines,
          `Seen ${formatTime((Date.now() - boss.lastSeen) / 1000)} ago`,
        );
      }
      if (boss.lastSeenFocus) {
        const focusMtype = resolveFocusMtype(boss.lastSeenFocus);
        if (focusMtype) {
          pushHover(hoverLines, `Focus: ${getInstanceMobLabel(focusMtype)}`);
        }
      }
    } else {
      const n = countVisibleOfMtypes(props.entities, [mtype]);
      if (inVision || aggroed) {
        glance = aggroed ? "Aggroed!" : "We see!";
        if (n > 1) glance = `${glance} · ×${n}`;
      } else if (kills != null && kills > 0) {
        faded = true;
      }
    }
  }
  let onClick: (() => void) | undefined;
  if (props.setSelectedEntity && currentlySeeMtypes.has(mtype)) {
    onClick = () => {
      const visibleMob = findVisibleMob(getEntitiesList(), mtype);
      if (!visibleMob) return;
      setXTarget(visibleMob);
      props.setSelectedEntity!(String(visibleMob.id));
    };
  }
  return {
    key: mtype,
    mtype,
    borderColor,
    glance,
    hoverLines,
    level,
    kills,
    faded,
    onClick,
  };
}
