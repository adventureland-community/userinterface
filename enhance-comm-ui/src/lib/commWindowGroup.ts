/**
 * Unified Comm edge-group graph across HUD panels + meter windows.
 */

import type { PanelId, PanelPos } from "./layout";
import { softAvoidOverlap } from "./layout";
import { snapPosToFineGrid } from "./layoutGrid";
import {
  applyPanelDragMove,
  type PanelDragSnapInput,
} from "./panelDragSnap";
import { maxRecordStackZ, nextWindowFrontZ } from "./windowStack";
import { bringMeterToFront } from "../meters/meterWindowStack";
import { windowKind } from "./commWindow";
import {
  applyGroupFrameSize,
  moveEdgeGroup,
  panelHasSnap,
  ungroupPanel,
  getEdgeGroup,
  DEFAULT_EDGE_SNAP_PX,
  type EdgeGroupPanel,
} from "./panelEdgeGroup";
import { findSnapTarget, trySnapOnDrop } from "./panelEdgeSnapDom";
import type { PanelGroupDragOpts } from "./panelGroupDrag";
import { canGroupWindow, hudWindowIds } from "./commWindow";
import {
  filterPersistedFrameSize,
  applyWindowFramePersist,
} from "./panelCatalog";
import { layoutDragRoot } from "./percentDrag";
import type { MeterInstance } from "../meters/meterTypes";

export type CommWindowGraphState = {
  layout: Record<PanelId, PanelPos>;
  meters: MeterInstance[];
  /** Ephemeral HUD raise z — not persisted (Details-style toplevel). */
  hudZs?: Partial<Record<PanelId, number>>;
};

export type CommWindowPeerVisible = (id: string) => boolean;

/** All Comm window positions for peer magnets / soft-avoid. */
export function commWindowPeerLayout(
  state: CommWindowGraphState,
): Record<string, PanelPos> {
  const out: Record<string, PanelPos> = { ...(state.layout || {}) };
  const meters = state.meters || [];
  for (let i = 0; i < meters.length; i++) {
    out[meters[i].id] = meters[i].pos;
  }
  return out;
}

/** Peer anchor % axes for live drag magnets (visibility from measure adapter). */
export function commWindowPeerSnapAxes(
  state: CommWindowGraphState,
  selfId: string,
  isPeerVisible: CommWindowPeerVisible,
): { xs: number[]; ys: number[] } {
  const peers = commWindowPeerLayout(state);
  const ids = Object.keys(peers);
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < ids.length; i++) {
    const pid = ids[i];
    if (pid === selfId) continue;
    const p = peers[pid];
    if (!p || !isPeerVisible(pid)) continue;
    xs.push(p.x);
    ys.push(p.y);
  }
  return { xs, ys };
}

export type CommWindowDragMoveInput = PanelDragSnapInput;

/** Live drag % policy (grid / peer / visual-edge). */
export function commWindowDragMove(
  input: CommWindowDragMoveInput,
): { x: number; y: number } {
  return applyPanelDragMove(input);
}

export type CommWindowDragFinishInput = {
  id: string;
  pos: PanelPos;
  state: CommWindowGraphState;
  softAvoid: boolean;
  freePlacement: boolean;
  gridStep: number;
  rootWidth: number;
  rootHeight: number;
};

/** Drop nudge + fine-grid finish after a drag session. */
export function finishCommWindowDragDrop(
  input: CommWindowDragFinishInput,
): PanelPos {
  let finalPos = input.pos;
  if (input.softAvoid) {
    const peers = commWindowPeerLayout(input.state);
    const nudged = softAvoidOverlap(input.id, finalPos, peers);
    if (nudged.x !== finalPos.x || nudged.y !== finalPos.y) {
      finalPos = nudged;
    }
  }
  if (
    !input.freePlacement &&
    input.rootWidth > 0 &&
    input.rootHeight > 0
  ) {
    const snapped = snapPosToFineGrid(
      finalPos.x,
      finalPos.y,
      input.gridStep,
      input.rootWidth,
      input.rootHeight,
    );
    if (snapped.x !== finalPos.x || snapped.y !== finalPos.y) {
      finalPos = { ...finalPos, x: snapped.x, y: snapped.y };
    }
  }
  return finalPos;
}

export type RaiseCommWindowResult = {
  state: CommWindowGraphState;
  /** When false, meter z renormalize is ephemeral (HUD raise). */
  persistMeters: boolean;
};

/** Details SetToplevel — unified raise for HUD + meter Comm windows. */
export function raiseCommWindow(
  state: CommWindowGraphState,
  id: string,
): RaiseCommWindowResult {
  if (windowKind(id) === "hud") {
    const hid = id as PanelId;
    const prev = state.hudZs || {};
    const { zIndex, peers } = nextWindowFrontZ(state.meters, {
      hudZs: prev as Record<string, number | undefined>,
    });
    if (typeof prev[hid] === "number" && prev[hid] === zIndex) {
      return { state, persistMeters: false };
    }
    return {
      state: {
        ...state,
        hudZs: { ...prev, [hid]: zIndex },
        meters: peers,
      },
      persistMeters: false,
    };
  }
  const floorZ = maxRecordStackZ(
    state.hudZs as Record<string, number | undefined>,
  );
  const nextMeters = bringMeterToFront(state.meters, id, floorZ);
  if (nextMeters === state.meters) {
    return { state, persistMeters: false };
  }
  return {
    state: { ...state, meters: nextMeters },
    persistMeters: true,
  };
}

function posToEdge(id: string, pos: PanelPos): EdgeGroupPanel {
  return {
    id,
    pos: { x: pos.x, y: pos.y, anchor: pos.anchor },
    snap: pos.snap,
    horizontalSnap: pos.horizontalSnap,
    verticalSnap: pos.verticalSnap,
    frameW: pos.frameW,
    frameH: pos.frameH,
  };
}

function meterToEdge(m: MeterInstance): EdgeGroupPanel {
  return {
    id: m.id,
    pos: { x: m.pos.x, y: m.pos.y, anchor: m.pos.anchor },
    snap: m.snap,
    frameW: m.frameW,
    frameH: m.frameH,
    horizontalSnap: m.horizontalSnap,
    verticalSnap: m.verticalSnap,
  };
}

function applySnapFields(base: PanelPos, panel: EdgeGroupPanel): PanelPos {
  const next: PanelPos = {
    ...base,
    x: panel.pos.x,
    y: panel.pos.y,
    anchor: panel.pos.anchor || base.anchor,
  };
  if (
    panel.snap &&
    (panel.snap[1] || panel.snap[2] || panel.snap[3] || panel.snap[4])
  ) {
    next.snap = panel.snap;
  } else {
    delete next.snap;
  }
  if (panel.horizontalSnap) next.horizontalSnap = true;
  else delete next.horizontalSnap;
  if (panel.verticalSnap) next.verticalSnap = true;
  else delete next.verticalSnap;
  return next;
}

/** Meter presentations that should not join edge groups. */
function meterCanGroup(m: MeterInstance): boolean {
  if (m.visible === false) return false;
  if (!canGroupWindow(m.id)) return false;
  if (
    m.presentation === "details" ||
    m.presentation === "death_log" ||
    m.presentation === "encounter" ||
    m.presentation === "timeline"
  ) {
    return false;
  }
  return true;
}

export function windowsToEdgePanels(
  state: CommWindowGraphState,
): EdgeGroupPanel[] {
  const out: EdgeGroupPanel[] = [];
  const hudIds = hudWindowIds();
  for (let i = 0; i < hudIds.length; i++) {
    const id = hudIds[i];
    const pos = state.layout[id];
    if (!pos) continue;
    out.push(posToEdge(id, pos));
  }
  for (let i = 0; i < state.meters.length; i++) {
    const m = state.meters[i];
    if (!meterCanGroup(m)) continue;
    out.push(meterToEdge(m));
  }
  return out;
}

export function applyEdgePanelsToState(
  state: CommWindowGraphState,
  panels: EdgeGroupPanel[],
): CommWindowGraphState {
  const byId: Record<string, EdgeGroupPanel> = {};
  for (let i = 0; i < panels.length; i++) byId[panels[i].id] = panels[i];

  const layout = { ...state.layout };
  const hudIds = hudWindowIds();
  for (let i = 0; i < hudIds.length; i++) {
    const id = hudIds[i];
    const p = byId[id];
    if (!p || !layout[id]) continue;
    layout[id] = applySnapFields(layout[id], p);
    if (p.frameW != null) layout[id] = { ...layout[id], frameW: p.frameW };
    if (p.frameH != null) layout[id] = { ...layout[id], frameH: p.frameH };
    layout[id] = applyWindowFramePersist(layout[id], id);
  }

  const meters = state.meters.map((m) => {
    const p = byId[m.id];
    if (!p) return m;
    const pos = applySnapFields(m.pos, p);
    return {
      ...m,
      pos: { x: pos.x, y: pos.y, anchor: pos.anchor },
      snap: pos.snap,
      horizontalSnap: pos.horizontalSnap,
      verticalSnap: pos.verticalSnap,
      frameW: p.frameW != null ? p.frameW : m.frameW,
      frameH: p.frameH != null ? p.frameH : m.frameH,
    };
  });

  return { ...state, layout, meters };
}

export function moveCommWindowWithGroup(
  state: CommWindowGraphState,
  id: string,
  pos: PanelPos,
): CommWindowGraphState {
  const panels = windowsToEdgePanels(state);
  const has = panels.some((p) => p.id === id);
  if (!has) {
    // Non-groupable HUD (e.g. toggles) — local move only.
    if (state.layout[id as PanelId]) {
      return {
        ...state,
        layout: {
          ...state.layout,
          [id as PanelId]: {
            ...state.layout[id as PanelId],
            x: pos.x,
            y: pos.y,
            anchor: pos.anchor || state.layout[id as PanelId].anchor,
          },
        },
      };
    }
    return {
      ...state,
      meters: state.meters.map((m) =>
        m.id === id
          ? {
              ...m,
              pos: {
                ...m.pos,
                x: pos.x,
                y: pos.y,
                anchor: pos.anchor || m.pos.anchor,
              },
            }
          : m,
      ),
    };
  }
  const moved = moveEdgeGroup(
    panels,
    id,
    {
      x: pos.x,
      y: pos.y,
      anchor: pos.anchor || "tl",
    },
    (() => {
      try {
        const r = layoutDragRoot().getBoundingClientRect();
        return r.width > 0 && r.height > 0
          ? { w: r.width, h: r.height }
          : undefined;
      } catch {
        return undefined;
      }
    })(),
  );
  return applyEdgePanelsToState(state, moved);
}

export function snapCommWindowAfterMove(
  state: CommWindowGraphState,
  id: string,
  opts?: PanelGroupDragOpts,
): CommWindowGraphState {
  const panels = windowsToEdgePanels(state);
  if (!panels.some((p) => p.id === id)) return state;
  const next = trySnapOnDrop(panels, id, (p) => canGroupWindow(p.id), opts);
  return applyEdgePanelsToState(state, next);
}

export function ungroupCommWindow(
  state: CommWindowGraphState,
  id: string,
): CommWindowGraphState {
  const panels = windowsToEdgePanels(state);
  if (!panels.some((p) => p.id === id)) return state;
  const next = ungroupPanel(panels, id);
  return applyEdgePanelsToState(state, next);
}

export function commWindowHasSnap(
  state: CommWindowGraphState,
  id: string,
): boolean {
  const panels = windowsToEdgePanels(state);
  for (let i = 0; i < panels.length; i++) {
    if (panels[i].id === id) return panelHasSnap(panels[i]);
  }
  return false;
}

export function findCommSnapPreviewTarget(
  state: CommWindowGraphState,
  selfId: string,
  opts?: PanelGroupDragOpts,
): string | null {
  const result = findSnapTarget(selfId, windowsToEdgePanels(state), {
    thresholdPx: DEFAULT_EDGE_SNAP_PX,
    skipGroupJoin: opts?.skipGroupJoin,
    peerFilter: (p) => canGroupWindow(p.id),
  });
  return result?.tight ? result.tight.otherId : null;
}

export function findCommSnapGuideTarget(
  state: CommWindowGraphState,
  selfId: string,
  opts?: PanelGroupDragOpts,
): { id: string; canSnap: boolean } | null {
  const panels = windowsToEdgePanels(state);
  const canSnapPeer = (p: { id: string }) => canGroupWindow(p.id);

  // Prefer a new join target (excludes own group — drop uses the same rule).
  const join = findSnapTarget(selfId, panels, {
    thresholdPx: DEFAULT_EDGE_SNAP_PX,
    nearPx: 140,
    skipGroupJoin: opts?.skipGroupJoin,
    peerFilter: canSnapPeer,
    excludeOwnGroup: true,
  });
  if (join?.tight) return { id: join.tight.otherId, canSnap: true };
  if (join?.loose) return { id: join.loose.otherId, canSnap: false };

  // Already linked: green connect line to nearest group mate while dragging.
  const own = getEdgeGroup(panels, selfId);
  if (own.length < 2) return null;
  const ownIds = new Set(own.map((g) => g.id));
  const linked = findSnapTarget(selfId, panels, {
    thresholdPx: 140,
    nearPx: 240,
    skipGroupJoin: opts?.skipGroupJoin,
    peerFilter: (p) => ownIds.has(p.id) && p.id !== selfId,
    excludeOwnGroup: false,
  });
  const peer = linked?.tight || linked?.loose;
  if (!peer) return null;
  return { id: peer.otherId, canSnap: true };
}

const SCALE_MIN = 0.5;
const SCALE_MAX = 1.5;

export function clampWindowScale(scale: number): number {
  if (!Number.isFinite(scale)) return 1;
  return Math.max(
    SCALE_MIN,
    Math.min(SCALE_MAX, Math.round(scale * 100) / 100),
  );
}

/** Details SetWindowScale(..., fromOptions) — apply to the whole snap group. */
export function applyScaleToCommWindows(
  state: CommWindowGraphState,
  id: string,
  scale: number,
): CommWindowGraphState {
  const clamped = clampWindowScale(scale);
  const panels = windowsToEdgePanels(state);
  let group = getEdgeGroup(panels, id);
  if (!group.length) {
    // Ungrouped / non-edge panel — still scale itself.
    group = panels.filter((p) => p.id === id);
  }
  const ids = new Set(group.map((g) => g.id));
  ids.add(id);

  const layout = { ...state.layout };
  const hudIds = hudWindowIds();
  for (let i = 0; i < hudIds.length; i++) {
    const hid = hudIds[i];
    if (!ids.has(hid) || !layout[hid]) continue;
    layout[hid] = { ...layout[hid], scale: clamped };
  }

  const meters = state.meters.map((m) =>
    ids.has(m.id) ? { ...m, scale: clamped } : m,
  );
  return { ...state, layout, meters };
}

export type CommWindowFrameSizeOptions = {
  rootW?: number;
  rootH?: number;
  /** Corner resize may pass pos after group nudge (meters). */
  meterPatch?: Partial<MeterInstance>;
  /** Pass root dims into applyGroupFrameSize for peer anchor nudge. */
  alignGroup?: boolean;
};

/** Propagate frameW/H within a snap group (Details shared height/width). */
export function applyFrameSizeToCommWindows(
  state: CommWindowGraphState,
  id: string,
  size: { frameW?: number; frameH?: number },
  options?: CommWindowFrameSizeOptions,
): CommWindowGraphState {
  size = filterPersistedFrameSize(id, size);
  if (size.frameW == null && size.frameH == null) return state;
  const withManualOff = (pos: PanelPos): PanelPos =>
    pos.autoSize === false ? pos : { ...pos, autoSize: false };
  const panels = windowsToEdgePanels(state);
  if (!panels.some((p) => p.id === id)) {
    if (state.layout[id as PanelId]) {
      const cur = state.layout[id as PanelId];
      return {
        ...state,
        layout: {
          ...state.layout,
          [id as PanelId]: applyWindowFramePersist(
            withManualOff({
              ...cur,
              ...(size.frameW != null ? { frameW: size.frameW } : {}),
              ...(size.frameH != null ? { frameH: size.frameH } : {}),
            }),
            id,
          ),
        },
      };
    }
    return {
      ...state,
      meters: state.meters.map((m) => {
        if (m.id !== id) return m;
        const patch = options?.meterPatch;
        return {
          ...m,
          ...(size.frameW != null ? { frameW: size.frameW } : {}),
          ...(size.frameH != null ? { frameH: size.frameH } : {}),
          ...(patch || {}),
        };
      }),
    };
  }
  let rootW = options?.rootW;
  let rootH = options?.rootH;
  if (rootW == null || rootH == null) {
    const root = layoutDragRoot().getBoundingClientRect();
    rootW = root.width;
    rootH = root.height;
  }
  const groupOpts =
    options?.alignGroup === false
      ? undefined
      : rootW != null && rootH != null
        ? { rootW, rootH }
        : undefined;
  let next = applyEdgePanelsToState(
    state,
    applyGroupFrameSize(panels, id, size, groupOpts),
  );
  const hid = id as PanelId;
  if (next.layout[hid]) {
    next = {
      ...next,
      layout: {
        ...next.layout,
        [hid]: withManualOff(next.layout[hid]),
      },
    };
  }
  const patch = options?.meterPatch;
  if (patch && Object.keys(patch).length) {
    next = {
      ...next,
      meters: next.meters.map((m) =>
        m.id === id ? { ...m, ...patch } : m,
      ),
    };
  }
  return next;
}
