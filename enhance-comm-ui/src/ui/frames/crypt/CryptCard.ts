import { e, getReact } from "../../../host/react";
import { monsterSprite } from "../../../host/icons";
import { getCryptMobLabel } from "../../../crypt/labels";
import {
  CARD_ICON_SIZE,
  CARD_STYLE_BASE,
  META_STYLE,
} from "../../../crypt/cryptCardStyles";
import type { CryptCardProps } from "../../../crypt/cryptCardModel";
import { wrapIconHtml } from "../../chrome/wrapIconHtml";

export type { CryptCardProps };

export function CryptCard(props: CryptCardProps): any {
  const React = getReact();
  const displayName = getCryptMobLabel(props.mtype);
  const clickable = !!props.onClick;
  const iconHtml = React.useMemo(
    () =>
      props.dummy ? "" : monsterSprite(props.mtype, { size: CARD_ICON_SIZE }),
    [props.mtype, props.dummy],
  );
  const icon = iconHtml ? wrapIconHtml(iconHtml) : null;
  return e(
    "div",
    {
      key: props.mtype,
      style: Object.assign({}, CARD_STYLE_BASE, {
        border: `2px double ${props.borderColor}`,
        cursor: clickable ? "pointer" : undefined,
        opacity: props.dummy ? 0.85 : undefined,
      }),
      title: clickable ? "Click to target" : props.mtype,
      onClick: props.onClick,
    },
    e(
      "div",
      {
        key: "nameRow",
        style: {
          display: "flex",
          alignItems: "center",
          gap: "4px",
          minWidth: 0,
        },
      },
      icon,
      e(
        "span",
        {
          style: {
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          },
        },
        `${displayName}${props.levelComponent}`,
      ),
    ),
    e("div", { key: "state", style: META_STYLE }, props.status),
    props.lastSeenComponent
      ? e(
          "div",
          { key: "lastSeen", style: META_STYLE },
          props.lastSeenComponent,
        )
      : undefined,
    props.focusComponent
      ? e("div", { key: "focus", style: META_STYLE }, props.focusComponent)
      : undefined,
    props.luckmComponent
      ? e("div", { key: "luckm", style: META_STYLE }, props.luckmComponent)
      : undefined,
  );
}
