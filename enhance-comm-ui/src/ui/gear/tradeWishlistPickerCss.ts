/** Catalog picker for trade-slot wishlist (empty slots). */

export const TRADE_WISHLIST_PICKER_CSS = `
.comm-wishlist-picker {
  position: fixed;
  z-index: 100001;
  background: #151515;
  border: 1px solid #555;
  box-shadow: 0 8px 24px rgba(0,0,0,0.55);
  width: min(420px, calc(100vw - 24px));
  max-height: min(520px, calc(100vh - 24px));
  display: flex;
  flex-direction: column;
  font-family: "Segoe UI", Tahoma, Arial, sans-serif;
}
.comm-wishlist-picker__head {
  padding: 8px 10px;
  border-bottom: 1px solid #333;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.comm-wishlist-picker__title {
  font-size: 14px;
  color: #f1c054;
  letter-spacing: 0.04em;
}
.comm-wishlist-picker__search {
  width: 100%;
  box-sizing: border-box;
  background: #0d0d0d;
  border: 1px solid #444;
  color: #eee;
  padding: 6px 8px;
  font-size: 14px;
}
.comm-wishlist-picker__grid {
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-content: flex-start;
}
.comm-wishlist-picker__item {
  background: #1a1a1a;
  border: 1px solid #333;
  padding: 4px;
  cursor: pointer;
  line-height: 0;
}
.comm-wishlist-picker__item:hover {
  border-color: #888;
  background: #222;
}
.comm-wishlist-picker__foot {
  border-top: 1px solid #333;
  padding: 6px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.comm-wishlist-picker__foot button {
  background: #222;
  border: 1px solid #555;
  color: #ddd;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 13px;
}
.comm-wishlist-picker__foot button:disabled {
  opacity: 0.4;
  cursor: default;
}
.comm-wishlist-picker__page {
  font-size: 12px;
  color: #888;
}
`;

let injected = false;

export function ensureTradeWishlistPickerCss(): void {
  if (injected) return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-ecu-wishlist-picker-css", "1");
  el.textContent = TRADE_WISHLIST_PICKER_CSS;
  document.head.appendChild(el);
}
