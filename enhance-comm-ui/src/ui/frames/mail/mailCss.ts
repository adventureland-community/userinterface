/** Inject once for Comm mail panel. */

import { ITEM_INSTANCE_BADGE_CSS } from "../../chrome/ItemInstance";
import { MAIL_CHROME_CSS } from "./mailChromeCss";
import { MAIL_LIST_CSS } from "./mailListCss";
import { MAIL_COMPOSE_CSS } from "./mailComposeCss";

let injected = false;

const CSS =
  MAIL_CHROME_CSS + MAIL_LIST_CSS + MAIL_COMPOSE_CSS + ITEM_INSTANCE_BADGE_CSS;

export function ensureMailCss(): void {
  if (injected) return;
  injected = true;
  const existing = document.querySelector(
    "style[data-ecu-mail-css]",
  ) as HTMLStyleElement | null;
  if (existing) {
    existing.textContent = CSS;
    return;
  }
  const el = document.createElement("style");
  el.setAttribute("data-ecu-mail-css", "1");
  el.textContent = CSS;
  document.head.appendChild(el);
}
