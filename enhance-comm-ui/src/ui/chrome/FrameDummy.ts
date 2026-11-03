import { e } from "../../host/react";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";

export type FrameDummyProps = {
  /** Short role label (e.g. "Target", "Player"). */
  label: string;
  /** Fake name shown on the bar; defaults to label. */
  sampleName?: string;
  /** Muted fill color for the dummy HP bar. */
  hpColor?: string;
  /** When false, omit the dummy MP strip (boss bars). Default true. */
  showMp?: boolean;
  /** Compact fake effect chips for layout sizing (boss bars). */
  showEffectsPlaceholder?: boolean;
  /** In-bar aggro chip placeholder (boss bars). */
  showAggroInBar?: boolean;
};

const DUMMY_FX_COLORS = ["#4a7a4a", "#7a4a4a", "#4a5a7a", "#7a6a3a"];

function fxStrip(opts: { inBar: boolean }): any {
  const size = opts.inBar ? 26 : 22;
  const count = opts.inBar ? 3 : 4;
  return e(
    "div",
    {
      className:
        "comm-fx-row is-compact" + (opts.inBar ? " is-inline" : ""),
      style: {
        display: "flex",
        flexDirection: "row",
        flexWrap: "nowrap",
        alignItems: "center",
        gap: "3px",
        marginTop: opts.inBar ? "0" : "3px",
        width: opts.inBar ? "auto" : "100%",
        flex: "0 0 auto",
        minHeight: opts.inBar ? "26px" : "30px",
        paddingBottom: opts.inBar ? "0" : "2px",
        boxSizing: "border-box",
        overflow: "hidden",
      },
    },
    ...DUMMY_FX_COLORS.slice(0, count).map((bg, i) =>
      e("div", {
        key: `dummy-fx-${i}`,
        style: {
          flex: "0 0 auto",
          width: `${size}px`,
          height: `${size}px`,
          background: bg,
          border: opts.inBar ? "none" : "1px solid #555",
          boxSizing: "border-box",
        },
      }),
    ),
    e(
      "div",
      {
        className: "comm-fx-overflow",
        style: {
          flex: "0 0 auto",
          minWidth: opts.inBar ? "14px" : "18px",
          height: `${size}px`,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(20,20,20,0.9)",
          border: opts.inBar ? "none" : "1px solid #555",
          color: "#ccc",
          fontSize: TYPE.badge,
          lineHeight: 1,
          ...PIXEL_TEXT,
          boxSizing: "border-box",
        },
      },
      "+2",
    ),
  );
}

/**
 * Layout-edit placeholder that mimics ObservedUnit chrome so empty
 * frames stay visible and equal-sized for dragging.
 * (Paperdoll uses LayoutPlaceholder + PaperdollDummy; bag has BagDummy.)
 */
export function FrameDummy(props: FrameDummyProps): any {
  const name = props.sampleName || props.label;
  const hpColor = props.hpColor || "#555";
  const inBarMeta = !!props.showEffectsPlaceholder && props.showMp === false;

  return e(
    "div",
    {
      className:
        "comm-unit comm-unit-dummy" + (inBarMeta ? " has-fx-inbar" : ""),
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
              padding: inBarMeta ? "5px 4px 5px 8px" : "5px 10px",
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
                gap: inBarMeta ? "6px" : "10px",
                width: "100%",
                alignItems: "center",
                minWidth: 0,
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
                  flex: "0 1 auto",
                },
              },
              `1 ${name}`,
            ),
            e("span", { style: { flex: "1 1 auto", minWidth: 4 } }),
            inBarMeta && props.showEffectsPlaceholder
              ? fxStrip({ inBar: true })
              : null,
            inBarMeta && props.showAggroInBar
              ? e(
                  "span",
                  {
                    className: "comm-boss-aggro",
                    style: {
                      flex: "0 1 auto",
                      minWidth: 0,
                      maxWidth: "8em",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "#bbb",
                      fontSize: TYPE.secondary,
                      lineHeight: "1.2",
                      textShadow: "1px 1px 0 #000",
                      ...PIXEL_TEXT,
                    },
                  },
                  "Tank",
                )
              : null,
            e(
              "span",
              {
                style: {
                  fontSize: inBarMeta ? TYPE.body : TYPE.body,
                  opacity: inBarMeta ? 0.95 : 0.75,
                  flexShrink: 0,
                  color: inBarMeta ? "#ccc" : "#aaa",
                  textShadow: inBarMeta ? "1px 1px 0 #000" : undefined,
                  ...PIXEL_TEXT,
                },
              },
              inBarMeta ? "62.0%" : props.label,
            ),
          ),
        ),
      ),
      props.showMp !== false
        ? e(
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
          )
        : null,
    ),
    !inBarMeta && props.showEffectsPlaceholder
      ? fxStrip({ inBar: false })
      : null,
  );
}
