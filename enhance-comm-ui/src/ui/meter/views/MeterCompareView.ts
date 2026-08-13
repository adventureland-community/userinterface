import { e } from "../../../host/react";
import { formatCompactNumber, formatCompactRate } from "../../../lib/format";
import { skillDisplayName } from "../../../lib/gameIcon";
import { GameIcon } from "../../chrome/GameIcon";
import { PIXEL_TEXT } from "../../../lib/typeScale";
import {
  getPlayerMeta,
  getYouId,
  resolveSegment,
} from "../../../meters/meterEngine";
import {
  aggregateActorTargets,
  type ActorTargetItem,
} from "../../../meters/meterQuery";
import type { ActorAgg, SegmentRef } from "../../../meters/meterTypes";

const COMPARE_SPELL_MATCH_PCT = 30;
const COMPARE_SPELL_ROWS = 12;
const COMPARE_TARGET_ROWS = 9;

function sameCtypePeers(
  segmentRef: SegmentRef,
  actorId: string,
  ctype?: string,
): ActorAgg[] {
  if (!ctype) return [];
  const seg = resolveSegment(segmentRef);
  if (!seg) return [];
  const peers: ActorAgg[] = [];
  const ids = Object.keys(seg.actors);
  for (let i = 0; i < ids.length; i++) {
    const a = seg.actors[ids[i]];
    if (a.ctype !== ctype) continue;
    if (!getPlayerMeta()[a.id] && !a.damage && !a.heal && !a.taken) continue;
    peers.push(a);
  }
  peers.sort((a, b) => b.damage - a.damage);
  if (peers.length <= 1) return peers;
  const you = getYouId();
  const selfIdx = peers.findIndex((p) => p.id === actorId);
  if (selfIdx > 0) {
    const self = peers.splice(selfIdx, 1)[0];
    peers.unshift(self);
  } else if (you) {
    const youIdx = peers.findIndex((p) => p.id === you);
    if (youIdx > 1) {
      const row = peers.splice(youIdx, 1)[0];
      peers.splice(1, 0, row);
    }
  }
  return peers;
}

/** Shared ability overlap % (Details Compare match filter). */
function sharedAbilityPct(primary: ActorAgg, other: ActorAgg): number {
  const keys = Object.keys(primary.abilities);
  if (!keys.length) return 0;
  let same = 0;
  for (let i = 0; i < keys.length; i++) {
    if (other.abilities[keys[i]]) same += 1;
  }
  return (same / keys.length) * 100;
}

/**
 * Details Compare peer pick: same ctype + >30% shared abilities.
 * Returns primary first, then up to 2 peers (by metric total).
 */
function comparePeerActors(
  segmentRef: SegmentRef,
  actorId: string,
  ctype: string | undefined,
  metric: "damage" | "heal" | "taken",
): { primary: ActorAgg | null; peers: ActorAgg[] } {
  const all = sameCtypePeers(segmentRef, actorId, ctype);
  const primary = all.find((a) => a.id === actorId) || all[0] || null;
  if (!primary) return { primary: null, peers: [] };
  const scored: Array<{ a: ActorAgg; total: number }> = [];
  for (let i = 0; i < all.length; i++) {
    const a = all[i];
    if (a.id === primary.id) continue;
    if (sharedAbilityPct(primary, a) <= COMPARE_SPELL_MATCH_PCT) continue;
    scored.push({ a, total: actorMetricTotal(a, metric) });
  }
  scored.sort((x, y) => y.total - x.total);
  const peers: ActorAgg[] = [];
  for (let i = 0; i < scored.length && peers.length < 2; i++) {
    peers.push(scored[i].a);
  }
  return { primary, peers };
}

function comparePctLabel(
  primaryVal: number,
  peerVal: number,
): { text: string; tone: "up" | "down" | "flat" } {
  if (primaryVal === 0 && peerVal === 0) {
    return { text: "+0%", tone: "flat" };
  }
  if (primaryVal > peerVal) {
    if (!(peerVal > 0)) return { text: "+999%", tone: "up" };
    const up = Math.min(
      999,
      Math.floor(((primaryVal - peerVal) / peerVal) * 100),
    );
    return { text: `+${up}%`, tone: "up" };
  }
  if (peerVal > primaryVal) {
    if (!(primaryVal > 0)) return { text: "−999%", tone: "down" };
    const down = Math.min(
      999,
      Math.floor(((peerVal - primaryVal) / primaryVal) * 100),
    );
    return { text: `−${down}%`, tone: "down" };
  }
  return { text: "+0%", tone: "flat" };
}

function abilityAmount(
  actor: ActorAgg,
  abilityId: string,
  metric: "damage" | "heal" | "taken",
): number {
  const ab = actor.abilities[abilityId];
  if (!ab) return 0;
  if (metric === "heal") return ab.heal;
  if (metric === "taken") return ab.taken;
  return ab.damage;
}

function actorMetricTotal(
  actor: ActorAgg,
  metric: "damage" | "heal" | "taken",
): number {
  if (metric === "heal") return actor.heal;
  if (metric === "taken") return actor.taken;
  return actor.damage;
}

function topAbilityIds(
  actor: ActorAgg,
  metric: "damage" | "heal" | "taken",
  n: number,
): string[] {
  const keys = Object.keys(actor.abilities);
  const scored = keys.map((k) => ({
    id: k,
    v: abilityAmount(actor, k, metric),
  }));
  scored.sort((a, b) => b.v - a.v);
  const out: string[] = [];
  for (let i = 0; i < scored.length && out.length < n; i++) {
    if (scored[i].v > 0) out.push(scored[i].id);
  }
  return out;
}

function compareTargetRows(
  actor: ActorAgg,
  metric: "damage" | "heal" | "taken",
): ActorTargetItem[] {
  if (metric === "taken") return [];
  const rows = aggregateActorTargets(actor, metric, (tg) => {
    const v = metric === "heal" ? tg.heal : tg.damage;
    return v > 0;
  });
  rows.sort((a, b) => b.value - a.value);
  return rows;
}

export function CompareTabBody(props: {
  segmentRef: SegmentRef;
  actorId: string;
  ctype?: string;
  metric: "damage" | "heal" | "taken";
  amountLabel: string;
  rateLabel: string;
  sec: number;
}): any {
  const { primary, peers } = comparePeerActors(
    props.segmentRef,
    props.actorId,
    props.ctype,
    props.metric,
  );

  if (!primary) {
    return e(
      "div",
      { className: "ecu-meter-bd-stub", style: { ...PIXEL_TEXT } },
      props.ctype
        ? `No ${props.ctype} actors in this segment to compare.`
        : "Compare needs ctype on party members.",
    );
  }

  const metric = props.metric;
  const spellIds = topAbilityIds(primary, metric, COMPARE_SPELL_ROWS);
  const primaryTargets = compareTargetRows(primary, metric).slice(
    0,
    COMPARE_TARGET_ROWS,
  );
  const primaryTopSpell = spellIds.length
    ? abilityAmount(primary, spellIds[0], metric)
    : 1;
  const primaryTopTarget = primaryTargets[0]?.value || 1;

  const emptyPeerMsg =
    "There's no more players to compare (with the same ctype)";

  const columns: Array<{ actor: ActorAgg | null; isPrimary: boolean }> = [
    { actor: primary, isPrimary: true },
    { actor: peers[0] || null, isPrimary: false },
    { actor: peers[1] || null, isPrimary: false },
  ];

  return e(
    "div",
    {
      className: "ecu-meter-inspector-compare",
      style: { ...PIXEL_TEXT },
    },
    ...columns.map((col, colIdx) => {
      if (!col.actor) {
        return e(
          "div",
          {
            key: `empty-${colIdx}`,
            className: "ecu-meter-inspector-compare-col is-empty",
          },
          e(
            "div",
            { className: "ecu-meter-inspector-compare-empty" },
            emptyPeerMsg,
          ),
        );
      }
      const actor = col.actor;
      const total = actorMetricTotal(actor, metric);
      const peerTargets = compareTargetRows(actor, metric);
      const peerTargetById: Record<
        string,
        { id: string; name: string; value: number }
      > = {};
      for (let i = 0; i < peerTargets.length; i++) {
        peerTargetById[peerTargets[i].id] = peerTargets[i];
      }
      const peerSpellRank: Record<string, number> = {};
      const peerSpellOrder = topAbilityIds(actor, metric, 99);
      for (let i = 0; i < peerSpellOrder.length; i++) {
        peerSpellRank[peerSpellOrder[i]] = i + 1;
      }
      const peerTargetRank: Record<string, number> = {};
      for (let i = 0; i < peerTargets.length; i++) {
        peerTargetRank[peerTargets[i].id] = i + 1;
      }

      return e(
        "div",
        {
          key: actor.id,
          className:
            "ecu-meter-inspector-compare-col" +
            (col.isPrimary ? " is-you" : ""),
        },
        e(
          "div",
          { className: "ecu-meter-inspector-compare-h" },
          e(GameIcon, {
            id: actor.id,
            kind: "character",
            ctype: actor.ctype,
            name: actor.name,
            size: 28,
            title: actor.ctype ? `${actor.name} · ${actor.ctype}` : actor.name,
          }),
          e("span", null, actor.name),
          col.isPrimary
            ? e("span", { className: "ecu-meter-bd-muted" }, " ★")
            : null,
        ),
        e(
          "div",
          { className: "ecu-meter-inspector-compare-stat" },
          props.amountLabel,
          e("b", null, formatCompactNumber(total)),
        ),
        e(
          "div",
          { className: "ecu-meter-inspector-compare-stat" },
          props.rateLabel,
          e("b", null, formatCompactRate(total / props.sec)),
        ),
        e(
          "div",
          { className: "ecu-meter-inspector-compare-spells-h" },
          "Spells",
        ),
        spellIds.length === 0
          ? e("div", { className: "ecu-meter-bd-muted" }, "No ability totals")
          : null,
        ...spellIds.map((abId, idx) => {
          const primaryV = abilityAmount(primary, abId, metric);
          const v = abilityAmount(actor, abId, metric);
          const hasSpell = !!actor.abilities[abId];
          if (!col.isPrimary && !hasSpell) {
            return e("div", {
              key: abId,
              className: "ecu-meter-inspector-compare-spell is-missing",
            });
          }
          const fillPct = col.isPrimary
            ? Math.min(100, (v / Math.max(primaryTopSpell, 1)) * 100)
            : 100;
          const rank = col.isPrimary ? idx + 1 : peerSpellRank[abId] || idx + 1;
          const pct = !col.isPrimary ? comparePctLabel(primaryV, v) : null;
          return e(
            "div",
            {
              key: abId,
              className: "ecu-meter-inspector-compare-spell",
              title: `${skillDisplayName(abId)} — ${formatCompactNumber(v)}`,
            },
            e("div", {
              className: "ecu-meter-inspector-compare-spell-fill",
              style: { width: `${fillPct}%` },
            }),
            e(
              "span",
              { className: "ecu-meter-inspector-compare-spell-n" },
              e(GameIcon, {
                id: abId,
                kind: "auto",
                size: 14,
                title: skillDisplayName(abId),
              }),
              `${rank}. ${skillDisplayName(abId)}`,
            ),
            e(
              "span",
              { className: "ecu-meter-inspector-compare-spell-v" },
              formatCompactNumber(v),
              pct
                ? e(
                    "span",
                    {
                      className:
                        "ecu-meter-inspector-compare-pct is-" + pct.tone,
                    },
                    " ",
                    pct.text,
                  )
                : null,
            ),
          );
        }),
        e(
          "div",
          { className: "ecu-meter-inspector-compare-spells-h" },
          "Targets",
        ),
        primaryTargets.length === 0
          ? e("div", { className: "ecu-meter-bd-muted" }, "No targets")
          : null,
        ...primaryTargets.map((pt, idx) => {
          const peerT = peerTargetById[pt.id];
          const v = col.isPrimary ? pt.value : peerT ? peerT.value : 0;
          if (!col.isPrimary && !peerT) {
            return e("div", {
              key: pt.id,
              className: "ecu-meter-inspector-compare-spell is-missing",
            });
          }
          const fillPct = col.isPrimary
            ? Math.min(100, (v / Math.max(primaryTopTarget, 1)) * 100)
            : 100;
          const rank = col.isPrimary
            ? idx + 1
            : peerTargetRank[pt.id] || idx + 1;
          const pct = !col.isPrimary ? comparePctLabel(pt.value, v) : null;
          return e(
            "div",
            {
              key: pt.id,
              className: "ecu-meter-inspector-compare-spell is-target",
              title: `${pt.name} — ${formatCompactNumber(v)}`,
            },
            e("div", {
              className: "ecu-meter-inspector-compare-spell-fill",
              style: { width: `${fillPct}%` },
            }),
            e(
              "span",
              { className: "ecu-meter-inspector-compare-spell-n" },
              e(GameIcon, {
                id: pt.id,
                kind: "target",
                size: 14,
                mtype: pt.mtype,
                ctype: pt.ctype,
                name: pt.name,
                title: pt.name,
              }),
              `${rank}. ${pt.name}`,
            ),
            e(
              "span",
              { className: "ecu-meter-inspector-compare-spell-v" },
              formatCompactNumber(v),
              pct
                ? e(
                    "span",
                    {
                      className:
                        "ecu-meter-inspector-compare-pct is-" + pct.tone,
                    },
                    " ",
                    pct.text,
                  )
                : null,
            ),
          );
        }),
      );
    }),
  );
}
