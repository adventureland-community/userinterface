/** Open/close pub-sub for the Chat panel (mirrors mail session). */

export type ChatOpenPayload = {
  /** When true and panel already open, close it. */
  toggle?: boolean;
  /** Prefill the compose input. */
  draft?: string;
  /** Prefill whisper target. */
  whisperTo?: string;
};

type OpenListener = (payload: ChatOpenPayload) => void;
const openListeners: OpenListener[] = [];

export function subscribeChatOpen(fn: OpenListener): () => void {
  openListeners.push(fn);
  return () => {
    const idx = openListeners.indexOf(fn);
    if (idx >= 0) openListeners.splice(idx, 1);
  };
}

export function openChat(payload: ChatOpenPayload = {}): void {
  for (let i = 0; i < openListeners.length; i++) {
    openListeners[i](payload);
  }
}
