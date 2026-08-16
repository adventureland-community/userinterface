import { e } from "../../host/react";

export function wrapIconHtml(html: string): any {
  return e("div", {
    style: {
      display: "inline-block",
      lineHeight: 0,
      fontSize: 0,
      flexShrink: 0,
    },
    dangerouslySetInnerHTML: { __html: html },
    ref: (node: HTMLElement | null) => {
      if (!node) return;
      const root = node.firstElementChild as HTMLElement | null;
      if (!root) return;
      root.style.margin = "0";
      root.removeAttribute("onmousedown");
      root.removeAttribute("ontouchstart");
      root.removeAttribute("onclick");
    },
  });
}
