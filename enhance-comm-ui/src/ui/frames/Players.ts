import { getReact, e } from "../../host/react";
import { classColors } from "../../lib/colors";
import { aggroOn, partyGroups, playersList } from "../../queries/entities";
import type { EntityLike } from "../../host/globals";
import { setXTarget } from "../../host/icons";
import { InspectButton } from "../chrome/InspectButton";
import { NameWithControl } from "../chrome/NameWithControl";
import { AggroSpark } from "../chrome/AggroSpark";
import { EffectsRow } from "../chrome/EffectsRow";
import { SharedPartyEffects } from "../chrome/SharedPartyEffects";
import { controlBorderTint, getControlStates } from "../../lib/controlState";
import { chipOutline } from "../../lib/chipOutline";
import {
  getSettings,
  patchSettings,
  type PartyBuffMode,
  type PartyRosterShow,
} from "../../lib/settings";
import {
  nextPartyBuffMode,
  partyBuffModeLabel,
  partyBuffModeTitle,
  showUnderChipBuffs,
  underChipBuffMaxVisible,
} from "../../lib/partyBuffMode";
import {
  filterPartiesForShow,
  nextPartyRosterShow,
  partitionPartyGroups,
  partyRosterShowLabel,
  partyRosterShowTitle,
  type PartyGroup,
} from "../../lib/partyRosterShow";
import { isActuallyDead } from "../../lib/stickyPresence";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";
import {
  PARTY_CHIP_GAP,
  PARTY_CHIP_WIDTH,
  PARTY_MAX_COLS,
  PARTY_ROSTER_PAD,
  partyChipRowWidth,
  partyRosterMaxWidth,
} from "../../lib/frameSizes";

export type PlayersProps = {
  entities: EntityLike[];
  /** Shared aggro index for this tick (from combatSignals). */
  byTarget: Record<string, EntityLike[]>;
  setSelectedEntity: (id: string | undefined) => void;
  selectedEntity?: string;
  /** Watched /comm character id — pink observe chrome, not paperdoll select. */
  observingId?: string;
  /**
   * Layout-edit marker on the roster root (panel chrome owns lock/WC above).
   */
  layoutEdit?: boolean;
};

function hpPct(entity: EntityLike): number {
  const max = entity.max_hp || 1;
  return Math.max(0, Math.min(100, Math.round(((entity.hp || 0) / max) * 100)));
}

function mpPct(entity: EntityLike): number {
  const max = entity.max_mp || 1;
  return Math.max(0, Math.min(100, Math.round(((entity.mp || 0) / max) * 100)));
}

/** Soft dim for RIP only — no attack-range dimming (skill ranges differ). */
function chipOpacity(dead: boolean): number {
  if (dead) return 0.42;
  return 1;
}

function findObserving(
  entities: EntityLike[],
  observingId: string | undefined,
): EntityLike | undefined {
  if (observingId == null || observingId === "") return undefined;
  const want = String(observingId);
  for (let i = 0; i < entities.length; i++) {
    if (String(entities[i].id) === want) return entities[i];
  }
  return undefined;
}

function countMembers(parties: PartyGroup[]): number {
  let n = 0;
  for (let i = 0; i < parties.length; i++) n += parties[i][1].length;
  return n;
}

type ChipCtx = {
  byTarget: Record<string, EntityLike[]>;
  selectedEntity?: string;
  observingId?: string;
  setSelectedEntity: (id: string | undefined) => void;
  buffMode: PartyBuffMode;
  visibleChipCount: number;
};

function renderPlayerChip(player: EntityLike, ctx: ChipCtx): any {
  const pid = String(player.id);
  const selected =
    ctx.selectedEntity != null && String(ctx.selectedEntity) === pid;
  const observed =
    ctx.observingId != null && String(ctx.observingId) === pid;
  const aggroMobs = aggroOn(ctx.byTarget, pid);
  const hasAggro = aggroMobs.length > 0;
  const color = classColors[player.ctype || ""] || "#888";
  const dead = isActuallyDead(player);
  const aggroTitle = hasAggro
    ? `Aggro: ${aggroMobs.length} mob${aggroMobs.length === 1 ? "" : "s"}`
    : "";
  const controlStates = getControlStates(player, aggroMobs);
  const controlTint = controlBorderTint(controlStates);
  const controlTitle = controlStates
    .map((s) =>
      s.kind === "fear" ? `${s.label} (fear ${s.fear})` : s.label,
    )
    .join(" · ");
  const nameTitle = [
    `${player.name || player.id}`,
    observed ? "Observing" : "",
    dead ? "Dead" : "",
    controlTitle,
    aggroTitle,
  ]
    .filter(Boolean)
    .join(" · ");

  const outline = chipOutline({
    hasAggro,
    controlTint,
    observed,
    selected,
  });

  const showBuffs = showUnderChipBuffs(
    ctx.buffMode,
    ctx.visibleChipCount,
    observed,
  );
  const maxVisible = underChipBuffMaxVisible(ctx.buffMode);

  return e(
    "div",
    {
      key: pid,
      className:
        "ecu-chip" +
        (selected ? " is-selected" : "") +
        (observed ? " is-observed" : "") +
        (hasAggro ? " has-aggro" : "") +
        (controlStates.length ? " has-control" : "") +
        (dead ? " is-rip" : ""),
      title: nameTitle,
      style: {
        position: "relative",
        flex: "0 0 auto",
        width: PARTY_CHIP_WIDTH + "px",
        background: "transparent",
        cursor: "pointer",
        overflow: "visible",
        boxSizing: "border-box",
        opacity: chipOpacity(dead),
      },
      onClick: () => {
        if (selected) {
          setXTarget(null);
          ctx.setSelectedEntity(undefined);
          return;
        }
        setXTarget(player);
        ctx.setSelectedEntity(player.id);
      },
    },
    e(
      "div",
      {
        style: {
          position: "relative",
          minHeight: "26px",
          height: "26px",
          overflow: "visible",
          background: "rgba(0,0,0,0.45)",
          outline,
          boxShadow: hasAggro
            ? "inset 0 0 0 1px rgba(224,85,85,0.55)"
            : observed
              ? "inset 0 -2px 0 #e13758"
              : undefined,
        },
      },
      e("div", {
        style: {
          display: "block",
          height: "100%",
          width: `${hpPct(player)}%`,
          background: color,
        },
      }),
      e(
        "div",
        {
          style: {
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            padding: "0 7px",
            minWidth: 0,
            overflow: "visible",
            fontSize: TYPE.name,
            letterSpacing: "0.04em",
            lineHeight: 1,
            color: "#fff",
            pointerEvents: "none",
            ...PIXEL_TEXT,
          },
        },
        e(InspectButton, { entity: player, compact: true }),
        e(NameWithControl, {
          className: "ecu-chip-namecluster",
          name: `${player.level ?? ""} ${player.id}`,
          states: controlStates,
          compact: true,
          iconSize: 16,
        }),
      ),
    ),
    e(AggroSpark, {
      count: aggroMobs.length,
      className: "ecu-chip-aggro",
    }),
    e(
      "div",
      {
        style: {
          marginTop: "2px",
          height: "5px",
          overflow: "hidden",
          background: "rgba(0,0,0,0.45)",
        },
      },
      e("div", {
        style: {
          display: "block",
          height: "100%",
          width: `${mpPct(player)}%`,
          background: "#3a6fd8",
        },
      }),
    ),
    showBuffs
      ? e(EffectsRow, {
          key: `fx-${pid}`,
          entity: player,
          iconSize: 22,
          compact: true,
          maxVisible,
        })
      : null,
  );
}

function renderPartyBlock(opts: {
  party: PartyGroup;
  sharedMode: boolean;
  chipCtx: ChipCtx;
  solo?: boolean;
}): any {
  const { party, sharedMode, chipCtx, solo } = opts;
  const key = party[0] || "solo";
  const members = party[1];
  return e(
    "div",
    {
      key,
      className: "ecu-roster-party" + (solo ? " is-solo" : ""),
      style: solo
        ? { flex: "0 0 auto", marginBottom: 0 }
        : { marginBottom: "2px" },
    },
    e(
      "div",
      {
        className: "ecu-roster-party-hd",
        style: {
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "4px",
          flexWrap: "wrap",
        },
      },
      e(
        "div",
        {
          className: "ecu-roster-party-name",
          style: {
            fontSize: TYPE.secondary,
            color: "#ccc",
            background: "rgba(0,0,0,0.55)",
            display: "inline-block",
            padding: "2px 6px",
            ...PIXEL_TEXT,
          },
        },
        party[0] || "(no party)",
      ),
    ),
    sharedMode
      ? e(SharedPartyEffects, {
          key: `shared-${key}`,
          members,
          iconSize: 22,
          maxVisible: 8,
        })
      : null,
    e(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: PARTY_CHIP_GAP + "px",
          maxWidth: solo
            ? PARTY_CHIP_WIDTH + "px"
            : partyChipRowWidth(PARTY_MAX_COLS) + "px",
        },
      },
      ...members.map((player) => renderPlayerChip(player, chipCtx)),
    ),
  );
}

function rosterModeButton(opts: {
  className: string;
  kicker: string;
  value: string;
  title: string;
  ariaLabel: string;
  onClick: () => void;
}): any {
  return e(
    "button",
    {
      type: "button",
      className: opts.className,
      title: opts.title,
      "aria-label": opts.ariaLabel,
      onClick: opts.onClick,
      style: {
        fontSize: TYPE.micro,
        ...PIXEL_TEXT,
      },
    },
    e("span", { className: "ecu-roster-buffs-k" }, opts.kicker),
    e("span", { className: "ecu-roster-buffs-sep" }, "·"),
    e("span", { className: "ecu-roster-buffs-v" }, opts.value),
  );
}

/** observe-hud style party chips: name inside HP bar, thin MP underlay, effects + aggro. */
export function Players(props: PlayersProps): any {
  const React = getReact();
  const [buffMode, setBuffMode] = React.useState(
    () => (getSettings().partyBuffMode || "auto") as PartyBuffMode,
  );
  const [rosterShow, setRosterShow] = React.useState(
    () => (getSettings().partyRosterShow || "all") as PartyRosterShow,
  );

  const observing = findObserving(props.entities, props.observingId);
  const allParties = partyGroups(props.entities);
  const parties = filterPartiesForShow({
    parties: allParties,
    show: rosterShow,
    observing,
  });
  const { multi, singles } = partitionPartyGroups(parties);
  const visibleChipCount = countMembers(parties);
  const sharedMode = buffMode === "shared";

  const chipCtx: ChipCtx = {
    byTarget: props.byTarget,
    selectedEntity: props.selectedEntity,
    observingId: props.observingId,
    setSelectedEntity: props.setSelectedEntity,
    buffMode,
    visibleChipCount,
  };

  const cycleBuffMode = () => {
    const next = nextPartyBuffMode(buffMode);
    setBuffMode(patchSettings({ partyBuffMode: next }).partyBuffMode);
  };

  const cycleRosterShow = () => {
    const next = nextPartyRosterShow(rosterShow);
    setRosterShow(patchSettings({ partyRosterShow: next }).partyRosterShow);
  };

  const showButton = rosterModeButton({
    className: "ecu-roster-buffs ecu-roster-show",
    kicker: "Show",
    value: partyRosterShowLabel(rosterShow),
    title: partyRosterShowTitle(rosterShow),
    ariaLabel: `Roster show: ${partyRosterShowLabel(rosterShow)}. Click to cycle.`,
    onClick: cycleRosterShow,
  });

  const buffsButton = rosterModeButton({
    className: "ecu-roster-buffs",
    kicker: "Buffs",
    value: partyBuffModeLabel(buffMode),
    title: partyBuffModeTitle(buffMode),
    ariaLabel: `Party buffs mode: ${partyBuffModeLabel(buffMode)}. Click to cycle.`,
    onClick: cycleBuffMode,
  });

  const emptyLabel =
    rosterShow === "party"
      ? playersList(props.entities).length
        ? "No party in vision"
        : "No parties in vision"
      : "No parties in vision";

  return e(
    "div",
    {
      className: "ecu-roster" + (props.layoutEdit ? " is-layout-edit" : ""),
      style: {
        padding: PARTY_ROSTER_PAD + "px",
        display: "flex",
        gap: "6px",
        flexDirection: "column",
        width: "fit-content",
        maxWidth: partyRosterMaxWidth(PARTY_MAX_COLS) + "px",
        boxSizing: "border-box",
        position: "relative",
      },
    },
    e(
      "div",
      {
        className: "ecu-roster-toolbar",
      },
      showButton,
      buffsButton,
    ),
    !parties.length
      ? e(
          "div",
          {
            className: "ecu-roster-empty",
            style: {
              color: "#aaa",
              fontSize: TYPE.secondary,
              ...PIXEL_TEXT,
            },
          },
          emptyLabel,
        )
      : null,
    ...multi.map((party) =>
      renderPartyBlock({ party, sharedMode, chipCtx, solo: false }),
    ),
    singles.length
      ? e(
          "div",
          {
            className: "ecu-roster-singles",
            style: {
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "flex-start",
              gap: "6px " + PARTY_CHIP_GAP + "px",
              maxWidth: partyChipRowWidth(PARTY_MAX_COLS) + "px",
            },
          },
          ...singles.map((party) =>
            renderPartyBlock({ party, sharedMode, chipCtx, solo: true }),
          ),
        )
      : null,
  );
}
