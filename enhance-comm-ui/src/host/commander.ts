/** Bridge stock `/comm` COMMAND (`show_commander`) into enhance-comm-ui. */

export type CommanderOpenPayload = {
  /** Prefill for the command editor (stock `show_commander(fvalue)`). */
  draft?: string;
};

type Listener = (payload: CommanderOpenPayload) => void;

const listeners: Listener[] = [];

export function subscribeCommanderOpen(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export function openCommander(draft?: string): void {
  const payload: CommanderOpenPayload = {};
  if (typeof draft === "string") payload.draft = draft;
  for (let i = 0; i < listeners.length; i++) {
    listeners[i](payload);
  }
}

function ourShowCommander(fvalue?: string): void {
  openCommander(typeof fvalue === "string" ? fvalue : undefined);
}

/**
 * Replace stock CodeMirror COMMAND modal with our panel.
 * Re-applies for a short window in case game scripts define `show_commander` after us.
 */
export function installCommanderHook(): void {
  const w = window as Window & {
    show_commander?: (fvalue?: string) => void;
    __alCommShowCommander?: (fvalue?: string) => void;
  };

  const apply = () => {
    if (w.show_commander === ourShowCommander) return;
    if (
      typeof w.show_commander === "function" &&
      w.show_commander !== ourShowCommander &&
      !w.__alCommShowCommander
    ) {
      w.__alCommShowCommander = w.show_commander;
    }
    w.show_commander = ourShowCommander;
  };

  apply();
  let ticks = 0;
  const timer = window.setInterval(() => {
    apply();
    ticks += 1;
    if (ticks >= 40) window.clearInterval(timer);
  }, 500);
}
