import { getReact } from "../../host/react";
import { setXTarget } from "../../host/icons";
import type { GameSnapshot } from "../../tick";

export type SelectionState = {
  selectedEntity: string | undefined;
  setSelectedEntity: (id: string | undefined) => void;
  closePaperdoll: () => void;
};

/** Sync window.xtarget (player_click) into paperdoll selection. */
export function useSelectionFromXTarget(snap: GameSnapshot): SelectionState {
  const React = getReact();
  const [selectedEntity, setSelectedEntity] = React.useState(
    undefined as string | undefined,
  );
  const lastXTargetId = React.useRef(undefined as string | undefined);

  React.useEffect(() => {
    // Buff/condition info sets xtarget for stock `render_condition` but must
    // not open the CommUI paperdoll (see setXTarget(..., { dialogOnly: true })).
    if ((window as any).__ecuDialogOnlyXTarget) return;

    const xt = (window as any).xtarget;
    const id = xt && xt.id != null ? String(xt.id) : undefined;
    if (id && id !== lastXTargetId.current) {
      lastXTargetId.current = id;
      setSelectedEntity(id);
    } else if (!id && lastXTargetId.current) {
      lastXTargetId.current = undefined;
      // Keep local selection unless Esc/clear handled elsewhere.
    }
  }, [snap.now, snap.entities]);

  const closePaperdoll = () => {
    setSelectedEntity(undefined);
    lastXTargetId.current = undefined;
    setXTarget(null);
  };

  return { selectedEntity, setSelectedEntity, closePaperdoll };
}
