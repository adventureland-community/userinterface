import { e } from "../../../host/react";
import type { MailCollapseGroup, MailRow } from "../../../host/mail";
import { ItemInstance } from "../../chrome/ItemInstance";
import { formatMailRelative } from "./mailFormat";

export function rowMeta(m: MailRow): string {
  const bits = [m.fro + " → " + m.to, formatMailRelative(m.sent)];
  if (m.item && typeof m.item.q === "number" && m.item.q > 1) {
    bits.push("×" + m.item.q);
  }
  return bits.join(" · ");
}

export function stackMeta(g: MailCollapseGroup): string {
  return (
    g.head.fro + " → " + g.head.to + " · " + formatMailRelative(g.head.sent)
  );
}

export function mailItemIcon(
  m: MailRow,
  size = 32,
  qtyOverride?: number,
): any {
  if (!m.item || !m.item.name) return null;
  const q =
    qtyOverride != null
      ? qtyOverride
      : typeof m.item.q === "number"
        ? m.item.q
        : undefined;
  const taken = !!m.taken;
  return e(
    "div",
    {
      className: "comm-mail__item" + (taken ? " is-taken" : ""),
      title: taken ? "Attachment already taken" : "Attachment ready to take",
      onClick: (ev: any) => ev.stopPropagation(),
    },
    e(ItemInstance, {
      name: String(m.item.name),
      skin: typeof m.item.skin === "string" ? m.item.skin : undefined,
      level: typeof m.item.level === "number" ? m.item.level : undefined,
      q,
      p: typeof m.item.p === "string" ? m.item.p : undefined,
      size,
    }),
  );
}
