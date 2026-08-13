/**
 * Unified Comm window move / snap / ungroup across HUD + meters.
 * Also owns Details-style window-number overlay while dragging.
 */

import { getReact } from "../../host/react";
import type { PanelId, PanelPos } from "../../lib/layout";
import {
  findCommSnapGuideTarget,
  moveCommWindowWithGroup,
  snapCommWindowAfterMove,
  ungroupCommWindow,
  applyScaleToCommWindows,
  applyFrameSizeToCommWindows,
  type CommWindowGraphState,
} from "../../lib/commWindowGroup";
import type { PanelGroupDragOpts } from "../../lib/panelGroupDrag";
import {
  getSettings,
  patchSettings,
  savePanelPositions,
} from "../../lib/settings";
import { beginLayoutGuide, endLayoutGuide } from "../../lib/layoutGuide";
import { getMeterAppearance } from "../../meters/meterAppearance";
import type { MeterInstance } from "../../meters/meterTypes";
import type { ViewportProfile } from "../../lib/viewport";

/** Details `movement_onupdate` gate before showing instance ids (~0.95s). */
const SHOW_WINDOW_IDS_MS = 950;

export type UseCommWindowActionsOpts = {
  layout: Record<PanelId, PanelPos>;
  setLayout: (
    value:
      | Record<PanelId, PanelPos>
      | ((prev: Record<PanelId, PanelPos>) => Record<PanelId, PanelPos>),
  ) => void;
  meters: MeterInstance[];
  setMeters: (
    value: MeterInstance[] | ((prev: MeterInstance[]) => MeterInstance[]),
  ) => void;
  viewportProfile: ViewportProfile;
  applyBagPos?: (pos: PanelPos) => void;
};

function layoutChanged(
  prev: Record<PanelId, PanelPos>,
  next: Record<PanelId, PanelPos>,
): Partial<Record<PanelId, PanelPos>> {
  const out: Partial<Record<PanelId, PanelPos>> = {};
  const ids = Object.keys(next) as PanelId[];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (JSON.stringify(prev[id] || null) !== JSON.stringify(next[id] || null)) {
      out[id] = next[id];
    }
  }
  return out;
}

function metersChanged(prev: MeterInstance[], next: MeterInstance[]): boolean {
  return JSON.stringify(prev) !== JSON.stringify(next);
}

export function useCommWindowActions(opts: UseCommWindowActionsOpts) {
  const React = getReact();
  const stateRef = React.useRef({
    layout: opts.layout,
    meters: opts.meters,
  } as CommWindowGraphState);
  stateRef.current = { layout: opts.layout, meters: opts.meters };

  const [snapDragId, setSnapDragId] = React.useState(null as string | null);
  const [snapPeerId, setSnapPeerId] = React.useState(null as string | null);
  const [nearPeerId, setNearPeerId] = React.useState(null as string | null);
  const [showWindowIds, setShowWindowIds] = React.useState(false);
  const showIdsTimer = React.useRef(
    null as ReturnType<typeof setTimeout> | null,
  );

  const clearWindowIds = () => {
    if (showIdsTimer.current != null) {
      clearTimeout(showIdsTimer.current);
      showIdsTimer.current = null;
    }
    setShowWindowIds(false);
  };

  React.useEffect(() => {
    return () => {
      if (showIdsTimer.current != null) clearTimeout(showIdsTimer.current);
    };
  }, []);

  const commit = (next: CommWindowGraphState) => {
    const prev = stateRef.current;
    const layoutDiff = layoutChanged(prev.layout, next.layout);
    const layoutKeys = Object.keys(layoutDiff) as PanelId[];
    if (layoutKeys.length) {
      opts.setLayout(next.layout);
      savePanelPositions(layoutDiff, opts.viewportProfile);
      if (layoutDiff.bag && opts.applyBagPos) opts.applyBagPos(layoutDiff.bag);
    }
    if (metersChanged(prev.meters, next.meters)) {
      opts.setMeters(next.meters);
      patchSettings({ meterInstances: next.meters });
    }
    stateRef.current = next;
  };

  const groupingEnabled = () => {
    const s = getSettings();
    if (s.meterWindowGrouping === false) return false;
    if (getMeterAppearance().disableGrouping) return false;
    return true;
  };

  const moveWindow = (id: string, pos: PanelPos) => {
    commit(moveCommWindowWithGroup(stateRef.current, id, pos));
  };

  const snapAfterMove = (id: string, opts?: PanelGroupDragOpts) => {
    clearWindowIds();
    setSnapDragId(null);
    setSnapPeerId(null);
    setNearPeerId(null);
    endLayoutGuide();
    if (!groupingEnabled()) return;
    commit(snapCommWindowAfterMove(stateRef.current, id, opts));
  };

  const ungroupWindow = (id: string) => {
    commit(ungroupCommWindow(stateRef.current, id));
  };

  const onDragStart = (id: string) => {
    clearWindowIds();
    setSnapDragId(id);
    setSnapPeerId(null);
    setNearPeerId(null);
    beginLayoutGuide();
    showIdsTimer.current = setTimeout(() => {
      showIdsTimer.current = null;
      setShowWindowIds(true);
    }, SHOW_WINDOW_IDS_MS);
    if (!groupingEnabled()) return;
  };

  const onDragMove = (id: string, opts?: PanelGroupDragOpts) => {
    if (!groupingEnabled() || opts?.skipGroupJoin) {
      setSnapPeerId(null);
      setNearPeerId(null);
      return;
    }
    const guide = findCommSnapGuideTarget(stateRef.current, id, opts);
    setSnapPeerId(guide && guide.canSnap ? guide.id : null);
    setNearPeerId(guide ? guide.id : null);
  };

  const setWindowScale = (id: string, scale: number) => {
    commit(applyScaleToCommWindows(stateRef.current, id, scale));
  };

  const resizeWindowFrame = (
    id: string,
    size: { frameW?: number; frameH?: number },
  ) => {
    commit(applyFrameSizeToCommWindows(stateRef.current, id, size));
  };

  const graphState = (): CommWindowGraphState => stateRef.current;

  return {
    moveWindow,
    snapAfterMove,
    ungroupWindow,
    onDragStart,
    onDragMove,
    setWindowScale,
    resizeWindowFrame,
    snapDragId,
    snapPeerId,
    nearPeerId,
    showWindowIds,
    graphState,
  };
}
