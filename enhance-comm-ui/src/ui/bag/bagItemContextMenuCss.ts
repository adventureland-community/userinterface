/** Styles for the inventory bag right-click context menu. */

export const BAG_ITEM_CONTEXT_MENU_CSS = `
.comm-bag-ctx {
  position: fixed; z-index: 99999;
  background: #151515; border: 1px solid #555;
  min-width: 200px; padding: 4px 0;
  box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  font-family: "Segoe UI", Tahoma, Arial, sans-serif;
}
.comm-bag-ctx--flyout {
  display: none;
  position: fixed;
  z-index: 100000;
  max-height: 280px;
  overflow-y: auto;
  overflow-x: hidden;
}
.comm-bag-ctx__subwrap.is-open > .comm-bag-ctx__item {
  background: #222;
}
.comm-bag-ctx__subwrap {
  position: relative;
}
.comm-bag-ctx__sep {
  height: 1px;
  margin: 4px 0;
  background: #333;
}
.comm-bag-ctx button,
.comm-bag-ctx__item {
  display: block; width: 100%; text-align: left;
  background: transparent; border: 0; color: #ddd;
  padding: 9px 14px; cursor: pointer; font-size: 15px;
  box-sizing: border-box;
}
.comm-bag-ctx__item.has-submenu {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-right: 10px;
}
.comm-bag-ctx__arrow {
  color: #888;
  font-size: 14px;
  line-height: 1;
  flex: 0 0 auto;
}
.comm-bag-ctx button:hover,
.comm-bag-ctx__item:hover { background: #222; }
.comm-bag-ctx__item.is-disabled,
.comm-bag-ctx__item:disabled {
  color: #777;
  cursor: default;
}
.comm-bag-ctx__item.is-disabled:hover,
.comm-bag-ctx__item:disabled:hover { background: transparent; }
`;

let injected = false;

export function ensureBagItemContextMenuCss(): void {
  if (injected) return;
  injected = true;
  const existing = document.querySelector(
    "style[data-ecu-bag-ctx-css]",
  ) as HTMLStyleElement | null;
  if (existing) {
    existing.textContent = BAG_ITEM_CONTEXT_MENU_CSS;
    return;
  }
  const el = document.createElement("style");
  el.setAttribute("data-ecu-bag-ctx-css", "1");
  el.textContent = BAG_ITEM_CONTEXT_MENU_CSS;
  document.head.appendChild(el);
}
