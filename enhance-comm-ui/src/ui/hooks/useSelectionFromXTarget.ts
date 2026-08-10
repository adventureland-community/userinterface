import { getReact } from "../../host/react";
import { setXTarget } from "../../host/icons";
import { findEntityById } from "../../host/al";
import { isFocusablePlayer } from "../../queries/entities";
import type { GameSnapshot } from "../../tick";

export type SelectionState = {
  selectedEntity: string | undefined;
  setSelectedEntity: (id: string | undefined) => void;
  closePaperdoll: () => void;
  /**
   * Spectator focus unit id (party chip / xtarget player).
   * Used for playerFrame + targetFrame only when not observing.
   * Cleared / ignored while `snap.observingId` is set.
   */
  focusUnitId: string | undefined;
  clearFocus: () => void;
};

function maybeFocusPlayerId(id: string | undefined): string | undefined {
  if (id == null || id === "") return undefined;
  const ent = findEntityById(id);
  if (!isFocusablePlayer(ent)) return undefined;
  return String(id);
}

/** Sync window.xtarget (player_click) into paperdoll selection + spectator focus. */
export function useSelectionFromXTarget(snap: GameSnapshot): SelectionState {
  const React = getReact();
  const [selectedEntity, setSelectedEntityState] = React.useState(
    undefined as string | undefined,
  );
  const [focusUnitId, setFocusUnitId] = React.useState(
    undefined as string | undefined,
  );
  const lastXTargetId = React.useRef(undefined as string | undefined);

  // Characterui observe owns player/target frames — never bind spectator focus then.
  const isObserving =
    snap.observingId != null && snap.observingId !== "";

  const setSelectedEntity = (id: string | undefined) => {
    setSelectedEntityState(id);
    if (id == null || id === "") {
      // Explicit deselect (party chip toggle / Esc) clears spectator focus.
      setFocusUnitId(undefined);
      return;
    }
    // Paperdoll/xtarget still update while observing; frames stay on observing.
    if (isObserving) return;
    const focusId = maybeFocusPlayerId(id);
    if (focusId) setFocusUnitId(focusId);
  };

  React.useEffect(() => {
    if (!isObserving) return;
    setFocusUnitId(undefined);
  }, [isObserving]);

  React.useEffect(() => {
    // Buff/condition info sets xtarget for stock `render_condition` but must
    // not open the CommUI paperdoll (see setXTarget(..., { dialogOnly: true })).
    if ((window as any).__ecuDialogOnlyXTarget) return;

    const xt = (window as any).xtarget;
    const id = xt && xt.id != null ? String(xt.id) : undefined;
    if (id && id !== lastXTargetId.current) {
      lastXTargetId.current = id;
      setSelectedEntityState(id);
      if (!isObserving) {
        const focusId = maybeFocusPlayerId(id);
        if (focusId) setFocusUnitId(focusId);
      }
    } else if (!id && lastXTargetId.current) {
      lastXTargetId.current = undefined;
      // Keep local selection unless Esc/clear handled elsewhere.
    }
  }, [snap.now, snap.entities, isObserving]);

  const clearFocus = () => {
    setFocusUnitId(undefined);
  };

  const closePaperdoll = () => {
    setSelectedEntityState(undefined);
    lastXTargetId.current = undefined;
    setFocusUnitId(undefined);
    setXTarget(null);
  };

  return {
    selectedEntity,
    setSelectedEntity,
    closePaperdoll,
    focusUnitId,
    clearFocus,
  };
}
