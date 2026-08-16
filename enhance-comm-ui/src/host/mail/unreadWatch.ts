/**
 * Watch stock X.unread updates after servers_and_characters / unread infs.
 * Does not invent a second poll — mirrors values already written by the game.
 */

import {
  applyXUnread,
  bootMailUnreadWatch,
  getXUnread,
} from "./mailUnread";

let installed = false;
let timer = 0;

export function installMailUnreadWatch(): void {
  if (installed) return;
  installed = true;
  bootMailUnreadWatch();
  // SAC runs ~every 4s on Comm; sample a bit faster so badge/list react promptly.
  timer = window.setInterval(() => {
    applyXUnread(getXUnread());
  }, 2000);
}

export function uninstallMailUnreadWatch(): void {
  if (timer) {
    window.clearInterval(timer);
    timer = 0;
  }
  installed = false;
}
