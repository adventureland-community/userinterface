import { e, getReact } from "../../../host/react";
import { monsterSprite } from "../../../host/icons";
import { getInstanceMobLabel } from "../../../instance/labels";
import { CARD_ICON_SIZE } from "../../../crypt/cryptCardStyles";
import type { CryptCardProps } from "../../../crypt/cryptCardModel";
import { wrapIconHtml } from "../../chrome/wrapIconHtml";

export type { CryptCardProps };

function cardTone(props: CryptCardProps): "aggro" | "seen" | "dead" | "idle" {
  if (props.borderColor === "red") return "aggro";
  if (props.borderColor === "yellow") return "seen";
  if (
    props.glance.indexOf("Died") === 0 ||
    props.glance.indexOf("Cleared") === 0
  ) {
    return "dead";
  }
  if (props.kills != null && props.kills > 0) return "dead";
  return "idle";
}

export function CryptCard(props: CryptCardProps): any {
  const React = getReact();
  const displayName = getInstanceMobLabel(props.mtype);
  const clickable = !!props.onClick;
  const iconHtml = React.useMemo(
    () =>
      props.dummy ? "" : monsterSprite(props.mtype, { size: CARD_ICON_SIZE }),
    [props.mtype, props.dummy],
  );
  const icon = iconHtml ? wrapIconHtml(iconHtml) : null;
  const tone = cardTone(props);
  const accent =
    props.borderColor.charAt(0) === "#" ? props.borderColor : undefined;
  const hoverLines = props.hoverLines || [];
  const hoverLineKids: any[] = [];
  for (let i = 0; i < hoverLines.length; i++) {
    const line = hoverLines[i];
    hoverLineKids.push(
      e(
        "div",
        {
          key: "h" + i,
          className:
            line === props.mtype
              ? "ecu-inst-card__detail-line ecu-inst-card__detail-id"
              : "ecu-inst-card__detail-line",
        },
        line,
      ),
    );
  }
  const hasCorner =
    props.level != null || (props.kills != null && props.kills > 0);
  return e(
    "div",
    {
      key: props.mtype,
      className: [
        "ecu-inst-card",
        `ecu-inst-card--${tone}`,
        hasCorner ? "ecu-inst-card--meta" : "",
      ]
        .filter(Boolean)
        .join(" "),
      style: {
        cursor: clickable ? "pointer" : undefined,
        opacity: props.dummy ? 0.85 : props.faded ? 0.45 : 1,
        borderColor: accent,
      },
      onClick: props.onClick,
    },
    hasCorner
      ? e(
          "div",
          { key: "corner", className: "ecu-inst-card__corner" },
          props.level != null
            ? e(
                "div",
                { key: "lv", className: "ecu-inst-card__level" },
                "Lv " + props.level,
              )
            : undefined,
          props.kills != null && props.kills > 0
            ? e(
                "div",
                { key: "kills", className: "ecu-inst-card__kills" },
                "Died ×" + props.kills,
              )
            : undefined,
        )
      : undefined,
    e(
      "div",
      { key: "head", className: "ecu-inst-card__head" },
      icon
        ? e("div", { key: "icon", className: "ecu-inst-card__icon" }, icon)
        : undefined,
      e(
        "div",
        { key: "id", className: "ecu-inst-card__id" },
        e("span", { className: "ecu-inst-card__name" }, displayName),
        props.glance
          ? e("div", { className: "ecu-inst-card__glance" }, props.glance)
          : undefined,
        hoverLineKids.length
          ? e(
              "div",
              { key: "detail", className: "ecu-inst-card__detail" },
              ...hoverLineKids,
            )
          : undefined,
      ),
    ),
  );
}
