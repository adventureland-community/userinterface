/**
 * Reusable AL game icon — skills / conditions / items / class / character sprites.
 * Compact meters use G.positions sheet crop; `container` uses stock item_container.
 */

import { getReact, e } from "../../host/react";
import { paintGameIcon, type GameIconKind } from "../../lib/gameIcon";

export type GameIconProps = {
  /** Skill / condition / item id, class key, or actor id when kind="character". */
  id: string;
  kind?: GameIconKind;
  size?: number;
  /** For kind="class" | "character" (or auto player rows). */
  ctype?: string;
  /** For kind="monster" | "target" — G.monsters key / entity.mtype. */
  mtype?: string;
  /** Display name hint for tooltips / character look resolve. */
  name?: string;
  title?: string;
  /** Instance / event skin override (gear swaps, slot.skin). */
  skin?: string;
  className?: string;
  /**
   * true → stock item_container (party buffs / badges).
   * false/omit → compact meter sheet crop.
   */
  container?: boolean;
};

export function GameIcon(props: GameIconProps): any {
  const React = getReact();
  const ref = React.useRef(null as HTMLSpanElement | null);
  const {
    id,
    kind = "auto",
    size = 18,
    ctype,
    mtype,
    name,
    title,
    skin,
    className,
    container,
  } = props;

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    paintGameIcon(el, id, {
      kind,
      size,
      ctype,
      mtype,
      name,
      title,
      skin,
      container,
    });
    return () => {
      if (el) el.innerHTML = "";
    };
  }, [id, kind, size, ctype, mtype, name, title, skin, container]);

  return e("span", {
    ref,
    className: ["ecu-game-icon", className].filter(Boolean).join(" "),
    style: {
      display: "inline-flex",
      width: size,
      height: size,
      flex: "0 0 auto",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      verticalAlign: "middle",
    },
    title: title || id,
  });
}
