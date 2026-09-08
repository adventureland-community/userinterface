/**
 * Unread count for the Chat chrome button — increments on live inbound
 * while the panel is closed; clears when Chat opens.
 */

import { getObserving } from "../al";
import type { ChatMessage } from "./types";

let panelOpen = false;
let unread = 0;

export function getChatUnread(): number {
  return unread;
}

export function isChatPanelOpen(): boolean {
  return panelOpen;
}

export function setChatPanelOpen(open: boolean): void {
  panelOpen = !!open;
  if (panelOpen) {
    unread = 0;
  }
  syncChatBadge();
}

/** Format badge label; caps display at 99+. */
export function formatChatUnreadBadge(n: number): string {
  const c = Math.max(0, Math.floor(Number(n) || 0));
  if (c > 99) return "99+";
  return String(c);
}

export function syncChatBadge(): void {
  if (typeof document === "undefined") return;
  const badge = document.querySelector(
    "[data-ecu-chat-badge]",
  ) as HTMLElement | null;
  if (!badge) return;
  const n = unread;
  badge.textContent = formatChatUnreadBadge(n);
  badge.hidden = n === 0;
  badge.title = n ? n + " unread chat" : "";
}

/**
 * Count a newly arrived live line when Chat is closed.
 * Skips history rows, local echoes, and messages from the observed self.
 */
export function noteChatUnread(msg: ChatMessage): void {
  if (panelOpen) return;
  if (msg.local) return;
  if (String(msg.id).indexOf("hist-") === 0) return;
  let me: string | undefined;
  if (typeof window !== "undefined") {
    me = getObserving()?.name;
  }
  if (me && msg.owner && String(msg.owner) === String(me)) return;
  unread += 1;
  syncChatBadge();
}

/** Test helper. */
export function resetChatUnread(): void {
  panelOpen = false;
  unread = 0;
}
