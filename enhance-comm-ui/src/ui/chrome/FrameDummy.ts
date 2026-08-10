import { e } from "../../host/react";

export type FrameDummyProps = {
  /** Short role label (e.g. "Target", "Player"). */
  label: string;
  /** Fake name shown on the bar; defaults to label. */
  sampleName?: string;
  /** Muted fill color for the dummy HP bar. */
  hpColor?: string;
};

/**
 * Layout-edit placeholder that mimics ObservedUnit chrome so empty
 * frames stay visible and equal-sized for dragging.
 * (Paperdoll uses LayoutPlaceholder + PaperdollDummy; bag has BagDummy.)
 */
export function FrameDummy(props: FrameDummyProps): any {
  const name = props.sampleName || props.label;
  const hpColor = props.hpColor || "#555";

  return e(
    "div",
    {
      className: "comm-unit comm-unit-dummy",
      style: {
        display: "flex",
        width: "100%",
        flexDirection: "column",
        minWidth: 0,
        gap: "6px",
        opacity: 0.72,
      },
    },
    e(
      "div",
      {
        style: {
          display: "flex",
          width: "100%",
          flexDirection: "column",
          minWidth: 0,
        },
      },
      e(
        "div",
        {
          style: {
            background: "black",
            position: "relative",
            width: "100%",
            minHeight: "30px",
            boxSizing: "border-box",
          },
        },
        e("div", {
          style: {
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: "62%",
            background: hpColor,
          },
        }),
        e(
          "div",
          {
            style: {
              padding: "5px 10px",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              overflow: "hidden",
              position: "relative",
              fontSize: "21px",
              fontWeight: "normal",
              width: "100%",
              boxSizing: "border-box",
              lineHeight: "1.25",
              color: "#ccc",
            },
          },
          e(
            "span",
            {
              style: {
                display: "flex",
                justifyContent: "space-between",
                gap: "10px",
                width: "100%",
                alignItems: "center",
              },
            },
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
              `1 ${name}`,
            ),
            e(
              "span",
              {
                style: {
                  fontSize: "14px",
                  opacity: 0.75,
                  flexShrink: 0,
                  color: "#aaa",
                },
              },
              props.label,
            ),
          ),
        ),
      ),
      e(
        "div",
        {
          style: {
            background: "black",
            width: "100%",
            height: "5px",
            boxSizing: "border-box",
          },
        },
        e("div", {
          style: {
            background: "#2a3a6a",
            height: "100%",
            width: "40%",
          },
        }),
      ),
    ),
  );
}
