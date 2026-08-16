import { e } from "../../host/react";

/**
 * Inject stock / sheet icon HTML into React.
 * Always assign via ref.innerHTML — Adventure Land’s React build sometimes
 * ignores dangerouslySetInnerHTML on createElement wrappers.
 */
export function wrapIconHtml(html: string): any {
  return e("div", {
    className: "ecu-icon-html",
    style: {
      display: "inline-block",
      lineHeight: 0,
      fontSize: 0,
      flexShrink: 0,
    },
    // Keep for React builds that honor it; ref is the source of truth.
    dangerouslySetInnerHTML: { __html: html || "" },
    ref: (node: HTMLElement | null) => {
      if (!node) return;
      if (html && node.innerHTML !== html) {
        node.innerHTML = html;
      }
      const root = node.firstElementChild as HTMLElement | null;
      if (!root) return;
      root.style.margin = "0";
      root.removeAttribute("onmousedown");
      root.removeAttribute("ontouchstart");
      root.removeAttribute("onclick");
    },
  });
}
