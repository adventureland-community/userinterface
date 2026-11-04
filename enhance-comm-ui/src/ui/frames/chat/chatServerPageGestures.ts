/**
 * Horizontal swipe on phone chat main → step server conversation pages.
 * Axis gates match home-page swipes; start must be inside `.ecu-chat-main`
 * and outside the composer / form controls.
 */

import {
  classifyPeerPageSwipe,
  installPeerPageGestures,
  type PeerPageSwipeHandlers,
  type PeerPageSwipeSample,
} from "../../chrome/peerPageGestures";

export type ChatServerPageSwipeHandlers = PeerPageSwipeHandlers;
export type ChatServerPageSwipeSample = PeerPageSwipeSample;

/** Pure — horizontal page swipe classification (home-page thresholds). */
export const classifyChatServerPageSwipe = classifyPeerPageSwipe;

function isIgnoredStartTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("input, textarea, select, [contenteditable='true']")) {
    return true;
  }
  if (target.closest(".ecu-chat-compose, .ecu-chat-to, .ecu-chat-input")) {
    return true;
  }
  return false;
}

function startAllowsServerPageSwipe(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (isIgnoredStartTarget(target)) return false;
  if (!target.closest(".ecu-chat-main")) return false;
  if (target.closest(".ecu-chat-compose")) return false;
  return true;
}

/**
 * Attach capture-phase touch listeners to a chat main node.
 * Returns an uninstall function.
 */
export function installChatServerPageGestures(
  root: HTMLElement,
  handlers: ChatServerPageSwipeHandlers,
): () => void {
  return installPeerPageGestures(root, {
    onPageSwipe: handlers.onPageSwipe,
    isBlocked: handlers.isBlocked,
    allowStart: startAllowsServerPageSwipe,
  });
}
