/**
 * React tree for the closed-panel new-mail toast — uses ItemInstance via mailItemIcon.
 */

import { e } from "../../../host/react";
import type { MailRow } from "../../../host/mail";
import {
  formatMailRoute,
  formatMailWhat,
} from "../../../host/mail/mailNewNotify";
import { mailItemIcon } from "./mailRowShared";

export function buildNewMailToastNode(
  rows: MailRow[],
  head: string,
): unknown {
  return e(
    "div",
    { className: "ecu-mail-toast__body" },
    e("div", { className: "ecu-mail-toast__head" }, head),
    rows.length
      ? e(
          "div",
          { className: "ecu-mail-toast__list" },
          ...rows.map((m) =>
            e(
              "div",
              { key: m.id, className: "ecu-mail-toast__row" },
              mailItemIcon(m, 28),
              e(
                "div",
                { className: "ecu-mail-toast__meta" },
                e(
                  "div",
                  { className: "ecu-mail-toast__route" },
                  formatMailRoute(m),
                ),
                e(
                  "div",
                  { className: "ecu-mail-toast__what" },
                  formatMailWhat(m),
                ),
              ),
            ),
          ),
        )
      : null,
  );
}
