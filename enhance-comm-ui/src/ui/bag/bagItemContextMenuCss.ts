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
.comm-bag-ctx__craft {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1 1 auto;
}
.comm-bag-ctx__craft-out {
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  overflow: hidden;
}
.comm-bag-ctx__craft-out .item,
.comm-bag-ctx__craft-out .item-container,
.comm-bag-ctx__craft-ing .item,
.comm-bag-ctx__craft-ing .item-container {
  transform-origin: center center;
}
.comm-bag-ctx__craft-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1 1 auto;
}
.comm-bag-ctx__craft-name {
  font-size: 14px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.comm-bag-ctx__craft-ings {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.comm-bag-ctx__craft-ing {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  overflow: hidden;
  opacity: 0.92;
  border-radius: 2px;
  outline: 1px solid rgba(90, 90, 90, 0.7);
}
.comm-bag-ctx__craft-ing.is-need {
  opacity: 0.38;
  outline-color: rgba(180, 80, 80, 0.55);
}
.comm-bag-ctx__craft-ing.is-have {
  outline-color: rgba(90, 150, 100, 0.7);
}
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
