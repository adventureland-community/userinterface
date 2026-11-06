/**
 * Open a visibility panel, remounting when settings say open but the shell
 * is missing/empty (setVisible(true) alone is a React no-op).
 */

import { panelActuallyOpen } from "./panelActuallyOpen";
import type { PanelId } from "./layout";

export function ensurePanelShellOpen(
  id: PanelId,
  stateOpen: boolean,
  setVisible: (id: PanelId, visible: boolean) => void,
  onOpen: () => void,
): void {
  if (stateOpen && !panelActuallyOpen(id)) {
    setVisible(id, false);
    window.setTimeout(() => {
      setVisible(id, true);
      onOpen();
    }, 0);
    return;
  }
  setVisible(id, true);
  onOpen();
}
