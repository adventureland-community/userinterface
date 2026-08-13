/**
 * Meter instance state and CRUD — extracted from CommUI.
 * Move / snap / ungroup live in useCommWindowActions (unified Comm graph).
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
import {
  bringMeterToFront,
  nextMeterStackZ,
  prepareNewMeterWindow,
} from "../../meters/meterWindowStack";
import type {
  MeterInstance,
  PlayersMetric,
  PlayersPrimary,
  SegmentRef,
} from "../../meters/meterTypes";
import { REPORT_FRAME_DEFAULT } from "../../lib/frameSizes";
import { detailsWindowTitle } from "../meter/meterShellHelpers";

export type FocusInspectorOpts = {
  metric?: PlayersMetric;
  primary?: PlayersPrimary;
  selectedset?: SegmentRef;
  partyFocus?: PartyFocus;
};

export type CommMeterInstancesApi = {
  meterInstances: MeterInstance[];
  meterInstancesRef: { current: MeterInstance[] };
  closedMeters: MeterInstance[];
  peerLayout: Record<string, PanelPos>;
  meterIsLocked: (inst: MeterInstance) => boolean;
  patchMeter: (id: string, partial: Partial<MeterInstance>) => void;
  /** Details SetToplevel — raise on interact (click / drag). */
  raiseMeterToFront: (id: string) => void;
  closeMeterRuntime: (id: string) => void;
  reopenClosedMeter: (id: string) => void;
  focusInspector: (
    actorId: string,
    name: string,
    opts?: FocusInspectorOpts,
  ) => void;
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
  resetMetersFromSettings: () => void;
};

export function useCommMeterInstances(
  layout: Record<string, PanelPos>,
): CommMeterInstancesApi {
  const React = getReact();

  const [meterInstances, setMeterInstances] = React.useState(
    () => getSettings().meterInstances as MeterInstance[],
  );
  const [closedMeters, setClosedMeters] = React.useState(
    () => (getSettings().meterClosedInstances || []) as MeterInstance[],
  );

  const meterInstancesRef = React.useRef(meterInstances);
  meterInstancesRef.current = meterInstances;

  const peerLayout: Record<string, PanelPos> = { ...layout };
  for (let i = 0; i < meterInstances.length; i++) {
    peerLayout[meterInstances[i].id] = meterInstances[i].pos;
  }

  const meterIsLocked = (inst: MeterInstance): boolean => {
    if (typeof inst.locked === "boolean") return inst.locked;
    return getSettings().windowsLocked !== false;
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

  const raiseMeterToFront = (id: string) => {
    setMeterInstances((prev: MeterInstance[]) => {
      const next = bringMeterToFront(prev, id);
      if (next === prev) return prev;
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
      // Keep prior lock; only raise stack so the window paints on top.
      const { zIndex, peers } = nextMeterStackZ(prev);
      const next = peers.concat([{ ...inst!, visible: true, zIndex }]);
      patchSettings({ meterInstances: next, meterClosedInstances: closed });
      return next;
    });
  };

  /** Open Inspector for a player — reuses same-actor window, else spawns another. */
  const focusInspector = (
    actorId: string,
    name: string,
    opts?: FocusInspectorOpts,
  ) => {
    if (!actorId) return;
    const metric = opts?.metric || "damage";
    const primary: PlayersPrimary = opts?.primary === "rate" ? "rate" : "total";
    const label = detailsWindowTitle(name, metric, primary);
    setMeterInstances((prev: MeterInstance[]) => {
      for (let i = 0; i < prev.length; i++) {
        const m = prev[i];
        if (
          m.query.kind === "details" &&
          m.query.actorId === actorId &&
          m.visible !== false
        ) {
          const patched = prev.map((row, j) => {
            if (j !== i) return row;
            return {
              ...row,
              query: {
                kind: "details" as const,
                actorId,
                metric,
                primary,
                ability: undefined,
              },
              presentation: "details" as const,
              label,
              visible: true,
              selectedset:
                opts?.selectedset != null ? opts.selectedset : row.selectedset,
              partyFocus:
                opts?.partyFocus != null ? opts.partyFocus : row.partyFocus,
            };
          });
          const next = bringMeterToFront(patched, m.id);
          patchSettings({ meterInstances: next });
          return next;
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
      const raw = instanceFromPreset(preset, {
        id: `meter-inspector-${Date.now().toString(36)}`,
        pos: {
          x: Math.min(92, 42 + (n % 6) * 5),
          y: Math.min(82, 48 + (n % 5) * 5),
          anchor: "bc",
        },
        query: { kind: "details", actorId, metric, primary },
        presentation: "details",
        label,
        visible: true,
        frameW: preset.defaultFrame?.w || 640,
        frameH: preset.defaultFrame?.h || 440,
        selectedset: opts?.selectedset,
        partyFocus: opts?.partyFocus,
      });
      const opened = prepareNewMeterWindow(raw, prev);
      const next = opened.peers.concat([opened.inst]);
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
        const patched = prev.map((m, j) => {
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
        const next = bringMeterToFront(patched, prev[i].id);
        patchSettings({ meterInstances: next });
        return next;
      }
      const preset = presetById(tab.presetId);
      if (!preset) return prev;
      const raw = instanceFromPreset(preset, {
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
      const opened = prepareNewMeterWindow(raw, prev);
      const next = opened.peers.concat([opened.inst]);
      patchSettings({ meterInstances: next });
      return next;
    });
  };

  const addMeterFromPreset = (presetId: string) => {
    const preset = presetById(presetId);
    if (!preset) return;
    setMeterInstances((prev: MeterInstance[]) => {
      const raw = instanceFromPreset(preset, {
        pos: {
          x: 40 + Math.random() * 20,
          y: 40 + Math.random() * 20,
          anchor: "center",
        },
      });
      const opened = prepareNewMeterWindow(raw, prev);
      const next = opened.peers.concat([opened.inst]);
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
      const raw: MeterInstance = {
        ...src,
        id: `meter-dup-${Date.now().toString(36)}`,
        pos: {
          ...src.pos,
          x: Math.min(98, src.pos.x + 3),
          y: Math.min(98, src.pos.y + 3),
        },
        // New window — do not inherit source lock / stack rank.
        locked: false,
        zIndex: undefined,
      };
      const opened = prepareNewMeterWindow(raw, prev);
      const next = opened.peers.concat([opened.inst]);
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
    setClosedMeters((next.meterClosedInstances || []) as MeterInstance[]);
  };

  return {
    meterInstances,
    meterInstancesRef,
    closedMeters,
    peerLayout,
    meterIsLocked,
    patchMeter,
    raiseMeterToFront,
    closeMeterRuntime,
    reopenClosedMeter,
    focusInspector,
    focusReport,
    addMeterFromPreset,
    duplicateMeter,
    removeMeter,
    applyAllSegments,
    setMeterInstances,
    resetMetersFromSettings,
  };
}
