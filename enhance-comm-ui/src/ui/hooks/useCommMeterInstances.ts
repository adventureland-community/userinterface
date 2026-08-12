/**
 * Meter instance state and CRUD — extracted from CommUI.
 */

import { getReact } from "../../host/react";
import {
  getSettings,
  patchSettings,
  resetMeterInstances,
} from "../../lib/settings";
import type { PartyFocus } from "../../lib/settingsFocus";
import type { PanelPos } from "../../lib/layout";
import { getMeterAppearance } from "../../meters/meterAppearance";
import {
  instanceFromPreset,
  isReportPresentation,
  presetById,
  reportTabByKind,
  type ReportKind,
} from "../../meters/meterCatalog";
import type { MeterInstance, SegmentRef } from "../../meters/meterTypes";
import {
  findMeterSnapPreviewTarget,
  moveMeterGroup,
  trySnapMeterOnDrop,
  ungroupMeter,
} from "../../meters/meterWindowGroup";
import { REPORT_FRAME_DEFAULT } from "../../lib/frameSizes";

export type CommMeterInstancesApi = {
  meterInstances: MeterInstance[];
  meterInstancesRef: { current: MeterInstance[] };
  closedMeters: MeterInstance[];
  metersLocked: boolean;
  altHeld: boolean;
  meterSnapDragId: string | null;
  meterSnapPeerId: string | null;
  peerLayout: Record<string, PanelPos>;
  meterIsLocked: (inst: MeterInstance) => boolean;
  dragRefFor: (id: string) => { current: HTMLElement | null };
  patchMeter: (id: string, partial: Partial<MeterInstance>) => void;
  closeMeterRuntime: (id: string) => void;
  reopenClosedMeter: (id: string) => void;
  moveMeterWithGroup: (id: string, pos: any) => void;
  snapMeterAfterMove: (id: string) => void;
  onMeterDragStart: (id: string) => void;
  onMeterDragMove: (id: string) => void;
  ungroupMeterPanel: (id: string) => void;
  focusInspector: (actorId: string, name: string) => void;
  focusReport: (
    kind: ReportKind,
    from?: { selectedset?: SegmentRef; partyFocus?: PartyFocus },
  ) => void;
  addMeterFromPreset: (presetId: string) => void;
  duplicateMeter: (id: string) => void;
  removeMeter: (id: string) => void;
  applyAllSegments: (ref: SegmentRef) => void;
  setMeterInstances: (
    value: MeterInstance[] | ((prev: MeterInstance[]) => MeterInstance[]),
  ) => void;
  setMetersLockedPersist: (locked: boolean) => void;
  resetMetersFromSettings: () => void;
};

export function useCommMeterInstances(
  layout: Record<string, PanelPos>,
): CommMeterInstancesApi {
  const React = getReact();

  const [meterInstances, setMeterInstances] = React.useState(
    () => getSettings().meterInstances as MeterInstance[],
  );
  const [meterSnapDragId, setMeterSnapDragId] = React.useState(
    null as string | null,
  );
  const [meterSnapPeerId, setMeterSnapPeerId] = React.useState(
    null as string | null,
  );
  const [metersLocked, setMetersLocked] = React.useState(
    () => getSettings().metersLocked !== false,
  );
  const [closedMeters, setClosedMeters] = React.useState(
    () => (getSettings().meterClosedInstances || []) as MeterInstance[],
  );
  const [altHeld, setAltHeld] = React.useState(false);

  const meterInstancesRef = React.useRef(meterInstances);
  meterInstancesRef.current = meterInstances;

  const setMetersLockedPersist = (locked: boolean) => {
    setMetersLocked(locked);
    patchSettings({ metersLocked: locked });
  };

  React.useEffect(() => {
    const onDown = (ev: KeyboardEvent) => {
      if (ev.key === "Alt") setAltHeld(true);
    };
    const onUp = (ev: KeyboardEvent) => {
      if (ev.key === "Alt") setAltHeld(false);
    };
    const onBlur = () => setAltHeld(false);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const peerLayout: Record<string, PanelPos> = { ...layout };
  for (let i = 0; i < meterInstances.length; i++) {
    peerLayout[meterInstances[i].id] = meterInstances[i].pos;
  }

  const meterIsLocked = (inst: MeterInstance): boolean => {
    if (typeof inst.locked === "boolean") return inst.locked;
    return metersLocked;
  };

  const patchMeter = (id: string, partial: Partial<MeterInstance>) => {
    setMeterInstances((prev: MeterInstance[]) => {
      let next = prev.map((m) => (m.id === id ? { ...m, ...partial } : m));
      if (partial.selectedset != null && getMeterAppearance().segmentsLocked) {
        next = next.map((m) => ({ ...m, selectedset: partial.selectedset }));
      }
      patchSettings({ meterInstances: next });
      return next;
    });
  };

  const closeMeterRuntime = (id: string) => {
    setMeterInstances((prev: MeterInstance[]) => {
      const inst = prev.find((m) => m.id === id);
      if (!inst) return prev;
      const next = prev.filter((m) => m.id !== id);
      const closed = (getSettings().meterClosedInstances || []).concat([inst]);
      patchSettings({ meterInstances: next, meterClosedInstances: closed });
      setClosedMeters(closed);
      return next;
    });
  };

  const reopenClosedMeter = (id: string) => {
    const closed = (getSettings().meterClosedInstances || []).slice();
    let inst: MeterInstance | null = null;
    for (let i = 0; i < closed.length; i++) {
      if (closed[i].id === id) {
        inst = closed[i];
        closed.splice(i, 1);
        break;
      }
    }
    if (!inst) return;
    setClosedMeters(closed);
    setMeterInstances((prev: MeterInstance[]) => {
      const next = prev.concat([{ ...inst!, visible: true }]);
      patchSettings({ meterInstances: next, meterClosedInstances: closed });
      return next;
    });
  };

  const moveMeterWithGroup = (id: string, pos: any) => {
    setMeterInstances((prev: MeterInstance[]) => {
      const next = moveMeterGroup(prev, id, pos);
      patchSettings({ meterInstances: next });
      return next;
    });
  };

  /** After drag ends: try Details-style edge attach + align. */
  const snapMeterAfterMove = (id: string) => {
    setMeterSnapDragId(null);
    setMeterSnapPeerId(null);
    if (getSettings().meterWindowGrouping === false) return;
    if (getMeterAppearance().disableGrouping) return;
    setMeterInstances((prev: MeterInstance[]) => {
      const next = trySnapMeterOnDrop(prev, id);
      if (next === prev) return prev;
      // Reference equality may not hold — compare snap/pos of moved id.
      const a = prev.find((m) => m.id === id);
      const b = next.find((m) => m.id === id);
      if (
        a &&
        b &&
        a.pos.x === b.pos.x &&
        a.pos.y === b.pos.y &&
        JSON.stringify(a.snap || {}) === JSON.stringify(b.snap || {})
      ) {
        return prev;
      }
      patchSettings({ meterInstances: next });
      return next;
    });
  };

  const onMeterDragStart = (id: string) => {
    setMeterSnapDragId(id);
    setMeterSnapPeerId(null);
  };

  const onMeterDragMove = (id: string) => {
    if (getSettings().meterWindowGrouping === false) {
      setMeterSnapPeerId(null);
      return;
    }
    setMeterSnapPeerId(findMeterSnapPreviewTarget(meterInstances, id));
  };

  const ungroupMeterPanel = (id: string) => {
    setMeterInstances((prev: MeterInstance[]) => {
      const next = ungroupMeter(prev, id);
      patchSettings({ meterInstances: next });
      return next;
    });
  };

  /** Stable drag refs so meter titlebars can move the PositionedPanel (Details-style). */
  const meterDragRefs = React.useRef(
    {} as Record<string, { current: HTMLElement | null }>,
  );
  const dragRefFor = (id: string) => {
    if (!meterDragRefs.current[id]) {
      meterDragRefs.current[id] = { current: null };
    }
    return meterDragRefs.current[id];
  };

  /** Open Inspector for a player — reuses same-actor window, else spawns another. */
  const focusInspector = (actorId: string, name: string) => {
    if (!actorId) return;
    setMeterInstances((prev: MeterInstance[]) => {
      for (let i = 0; i < prev.length; i++) {
        const m = prev[i];
        if (
          m.query.kind === "details" &&
          m.query.actorId === actorId &&
          m.visible !== false
        ) {
          return prev;
        }
      }
      const preset = presetById("inspector");
      if (!preset) return prev;
      let n = 0;
      for (let i = 0; i < prev.length; i++) {
        if (
          prev[i].presentation === "details" ||
          prev[i].query.kind === "details"
        ) {
          n += 1;
        }
      }
      const inst = instanceFromPreset(preset, {
        id: `meter-inspector-${Date.now().toString(36)}`,
        pos: {
          x: Math.min(92, 42 + (n % 6) * 5),
          y: Math.min(82, 48 + (n % 5) * 5),
          anchor: "bc",
        },
        query: { kind: "details", actorId },
        presentation: "details",
        label: `Inspector · ${name}`,
        visible: true,
        frameW: preset.defaultFrame?.w || 560,
        frameH: preset.defaultFrame?.h || 400,
      });
      const next = prev.concat([inst]);
      patchSettings({ meterInstances: next });
      return next;
    });
  };

  /** Shared Encounter / Deaths / Timeline report — one window, switch tabs. */
  const focusReport = (
    kind: ReportKind,
    from?: { selectedset?: SegmentRef; partyFocus?: PartyFocus },
  ) => {
    const tab = reportTabByKind(kind);
    setMeterInstances((prev: MeterInstance[]) => {
      for (let i = 0; i < prev.length; i++) {
        if (!isReportPresentation(prev[i].presentation)) continue;
        const next = prev.map((m, j) => {
          if (j !== i) return m;
          return {
            ...m,
            presentation: tab.presentation,
            query: { ...tab.query },
            label: tab.label,
            visible: true,
            selectedset:
              from?.selectedset != null ? from.selectedset : m.selectedset,
            partyFocus:
              from?.partyFocus != null ? from.partyFocus : m.partyFocus,
          };
        });
        patchSettings({ meterInstances: next });
        return next;
      }
      const preset = presetById(tab.presetId);
      if (!preset) return prev;
      const inst = instanceFromPreset(preset, {
        id: `meter-report-${Date.now().toString(36)}`,
        pos: { x: 50, y: 88, anchor: "bc" },
        query: { ...tab.query },
        presentation: tab.presentation,
        label: tab.label,
        visible: true,
        selectedset: from?.selectedset || "current",
        partyFocus: from?.partyFocus || "watched",
        frameW: preset.defaultFrame?.w || REPORT_FRAME_DEFAULT.w,
        frameH: preset.defaultFrame?.h || REPORT_FRAME_DEFAULT.h,
      });
      const next = prev.concat([inst]);
      patchSettings({ meterInstances: next });
      return next;
    });
  };

  const addMeterFromPreset = (presetId: string) => {
    const preset = presetById(presetId);
    if (!preset) return;
    const inst = instanceFromPreset(preset, {
      pos: {
        x: 40 + Math.random() * 20,
        y: 40 + Math.random() * 20,
        anchor: "center",
      },
    });
    setMeterInstances((prev: MeterInstance[]) => {
      const next = prev.concat([inst]);
      patchSettings({ meterInstances: next });
      return next;
    });
  };

  const duplicateMeter = (id: string) => {
    setMeterInstances((prev: MeterInstance[]) => {
      let src: MeterInstance | null = null;
      for (let i = 0; i < prev.length; i++) {
        if (prev[i].id === id) {
          src = prev[i];
          break;
        }
      }
      if (!src) return prev;
      const copy: MeterInstance = {
        ...src,
        id: `meter-dup-${Date.now().toString(36)}`,
        pos: {
          ...src.pos,
          x: Math.min(98, src.pos.x + 3),
          y: Math.min(98, src.pos.y + 3),
        },
      };
      const next = prev.concat([copy]);
      patchSettings({ meterInstances: next });
      return next;
    });
  };

  const removeMeter = (id: string) => {
    setMeterInstances((prev: MeterInstance[]) => {
      const next = prev.filter((m) => m.id !== id);
      patchSettings({ meterInstances: next });
      return next;
    });
  };

  const applyAllSegments = (ref: SegmentRef) => {
    setMeterInstances((prev: MeterInstance[]) => {
      const next = prev.map((m) => ({ ...m, selectedset: ref }));
      patchSettings({ meterInstances: next });
      return next;
    });
  };

  const resetMetersFromSettings = () => {
    const next = resetMeterInstances();
    setMeterInstances(next.meterInstances);
    setMetersLockedPersist(next.metersLocked !== false);
  };

  return {
    meterInstances,
    meterInstancesRef,
    closedMeters,
    metersLocked,
    altHeld,
    meterSnapDragId,
    meterSnapPeerId,
    peerLayout,
    meterIsLocked,
    dragRefFor,
    patchMeter,
    closeMeterRuntime,
    reopenClosedMeter,
    moveMeterWithGroup,
    snapMeterAfterMove,
    onMeterDragStart,
    onMeterDragMove,
    ungroupMeterPanel,
    focusInspector,
    focusReport,
    addMeterFromPreset,
    duplicateMeter,
    removeMeter,
    applyAllSegments,
    setMeterInstances,
    setMetersLockedPersist,
    resetMetersFromSettings,
  };
}
