/**
 * Market hub CSS — ported from agentic/mockups/multimerchant-market.html.
 */

import { ITEM_INSTANCE_BADGE_CSS } from "../chrome/ItemInstance";

export const MARKET_PANEL_CSS = `
.MarketPanel {
  --mk-line: #2a2a2a;
  --mk-line-soft: #1e1e1e;
  --mk-panel: #0b0b0b;
  --mk-muted: #777;
  --mk-accent: #e8c96a;
  --mk-gold: #e8c96a;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-height: 420px;
  overflow: hidden;
  background: #0b0b0b;
  border: 2px solid #555;
  color: #eee;
  font-family: Consolas, "Segoe UI", Tahoma, sans-serif;
  font-size: 13px;
}
.MarketPanel-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px 8px;
  border-bottom: 1px solid var(--mk-line);
  background: #0d0d0d;
  flex: 0 0 auto;
}
.MarketPanel-title {
  margin: 0;
  font-size: 15px;
  color: var(--mk-accent);
  letter-spacing: .04em;
  font-weight: 700;
}
.MarketPanel-pill {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  color: #aaa;
}
.MarketPanel-tools {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--mk-line);
  background: #0c0c0c;
  flex-wrap: wrap;
  flex: 0 0 auto;
}
.MarketPanel-searchWrap {
  position: relative;
  flex: 1 1 220px;
  min-width: 160px;
}
.MarketPanel-search {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid #3a3a3a;
  background: #080808;
}
.MarketPanel-search:focus-within {
  border-color: rgba(232, 201, 106, .55);
}
.MarketPanel-search .ico { color: #555; font-size: 13px; line-height: 1; }
.MarketPanel-search input {
  flex: 1;
  border: 0;
  background: transparent;
  color: #eee;
  font: inherit;
  font-size: 13px;
  outline: none;
  min-width: 0;
}
.MarketPanel-search .clear {
  appearance: none;
  border: 0;
  background: transparent;
  color: #666;
  font: inherit;
  font-size: 14px;
  padding: 0 2px;
  cursor: pointer;
}
.MarketPanel-search .clear:hover { color: #ccc; }
.MarketPanel-searchMenu {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 4px);
  z-index: 40;
  max-height: min(360px, 55vh);
  overflow: auto;
  border: 1px solid #3a3a3a;
  background: #121212;
  box-shadow: 0 12px 28px rgba(0,0,0,.55);
}
.MarketPanel-searchMenuSec { padding: 8px 0 4px; }
.MarketPanel-searchMenuSec + .MarketPanel-searchMenuSec {
  border-top: 1px solid #242424;
}
.MarketPanel-searchMenuH {
  padding: 2px 12px 6px;
  color: #666;
  font-size: 10px;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.MarketPanel-searchMenuRow {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  border: 0;
  background: transparent;
  color: #ddd;
  font: inherit;
  font-size: 12px;
  text-align: left;
  padding: 7px 12px;
  cursor: pointer;
}
.MarketPanel-searchMenuRow:hover,
.MarketPanel-searchMenuRow.is-hi { background: #1c1c1c; }
.MarketPanel-searchMenuOp {
  flex: 0 0 auto;
  color: #e8c96a;
  font-family: Consolas, "Segoe UI", monospace;
  font-weight: 600;
}
.MarketPanel-searchMenuLabel {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.MarketPanel-searchMenuHint {
  flex: 0 1 auto;
  color: #666;
  font-size: 11px;
  text-align: right;
  max-width: 46%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.MarketPanel-searchMenuIco {
  flex: 0 0 auto;
  color: #555;
  width: 14px;
  text-align: center;
}
.MarketPanel-searchMenuFoot {
  border-top: 1px solid #242424;
  padding: 6px 12px 8px;
  color: #666;
  font-size: 11px;
}
.MarketPanel-searchMenuFoot kbd {
  float: right;
  color: #888;
  border: 1px solid #333;
  padding: 0 4px;
  font-size: 10px;
}
.MarketPanel-seg {
  display: inline-flex;
  border: 1px solid #3a3a3a;
  height: 30px;
  background: #080808;
}
.MarketPanel-seg button {
  border: 0;
  background: transparent;
  color: #888;
  font: inherit;
  font-size: 12px;
  padding: 0 11px;
  cursor: pointer;
  height: 100%;
}
.MarketPanel-seg button + button { border-left: 1px solid #2a2a2a; }
.MarketPanel-seg button.is-on {
  color: var(--mk-accent);
  background: #1a1810;
}
.MarketPanel-seg button:hover:not(.is-on) { color: #ccc; background: #121212; }
.MarketPanel-togs {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}
.MarketPanel-tog {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #888;
  font-size: 12px;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}
.MarketPanel-tog:hover { color: #bbb; }
.MarketPanel-tog input { accent-color: var(--mk-accent); margin: 0; }
.MarketPanel-body {
  display: grid;
  grid-template-columns: minmax(200px, 256px) minmax(0, 1fr) minmax(280px, 420px);
  min-height: 0;
  flex: 1;
  overflow: hidden;
}
.MarketPanel-you {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: #090909;
  border-right: 1px solid var(--mk-line);
}
.MarketPanel-youBag {
  /* Fixed share of the You column — header + acts pinned; items scroll. */
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.MarketPanel-youBagScroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}
.MarketPanel-youStand {
  /* Always 46% of You — Pack/All and listing churn must not resize Bag. */
  flex: 0 0 46%;
  min-height: 0;
  border-top: 1px solid var(--mk-line);
  background: #0c0c0c;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.MarketPanel-youStand > .MarketPanel-ph,
.MarketPanel-youStand > .MarketPanel-standBar {
  flex: 0 0 auto;
}
.MarketPanel-col {
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--mk-panel);
  border-right: 1px solid var(--mk-line);
}
.MarketPanel-col:last-child { border-right: 0; }
.MarketPanel-ph {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  font-size: 11px;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: #b5a56a;
  background: #121212;
  border-bottom: 1px solid var(--mk-line);
  flex: 0 0 auto;
}
.MarketPanel-ph em {
  font-style: normal;
  color: var(--mk-muted);
  letter-spacing: 0;
  text-transform: none;
  font-size: 11px;
}
.MarketPanel-phTools {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  margin-left: auto;
}
.MarketPanel-sort {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-transform: none;
  letter-spacing: 0;
  color: #888;
  font-size: 11px;
}
.MarketPanel-sort select {
  appearance: none;
  border: 1px solid #3a3a3a;
  background: #080808;
  color: #ddd;
  font: inherit;
  font-size: 12px;
  height: 24px;
  padding: 0 8px;
  cursor: pointer;
}
.MarketPanel-sort select:hover,
.MarketPanel-sort select:focus {
  border-color: rgba(232, 201, 106, .45);
  outline: none;
}
.MarketPanel-phTools .MarketPanel-seg { height: 24px; }
.MarketPanel-phTools .MarketPanel-seg button {
  font-size: 11px;
  padding: 0 8px;
}
.MarketPanel-btn {
  appearance: none;
  border: 1px solid #444;
  background: #1a1a1a;
  color: #eee;
  font: inherit;
  font-size: 12px;
  padding: 7px 8px;
  cursor: pointer;
  text-align: center;
  line-height: 1.2;
}
.MarketPanel-btn:hover:not(:disabled) { border-color: #777; background: #202020; }
.MarketPanel-btn:disabled { opacity: .35; cursor: default; }
.MarketPanel-btn--gold {
  border-color: rgba(232, 201, 106, .5);
  color: var(--mk-accent);
  background: #18150e;
}
.MarketPanel-btn--sell {
  border-color: #6a4030;
  color: #e0a080;
  background: #181210;
}
.MarketPanel-btn--ghost {
  background: transparent;
  color: #888;
  padding: 3px 8px;
  font-size: 11px;
  height: 24px;
}
.MarketPanel-youActs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 8px 10px 10px;
  flex: 0 0 auto;
  border-top: 1px solid var(--mk-line);
  background: #0c0c0c;
}
.MarketPanel-slotGrid {
  display: grid;
  grid-template-columns: repeat(4, 52px);
  justify-content: start;
  gap: 6px;
  padding: 10px;
}
.MarketPanel-bagSlot {
  appearance: none;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  padding: 0;
  cursor: pointer;
  width: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.MarketPanel-bagSlot.is-on .ecu-item-instance-host,
.MarketPanel-bagSlot.is-on .MarketPanel-slotEmpty {
  box-shadow: 0 0 0 2px rgba(232, 201, 106, .75);
}
.MarketPanel-bagSlot:hover .ecu-item-instance-host {
  filter: brightness(1.08);
}
.MarketPanel-slotEmpty {
  width: 46px;
  height: 46px;
  box-sizing: border-box;
  background: #000;
  border: 2px solid #292929;
}
.MarketPanel-standBar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px 0;
  font-size: 11px;
  color: var(--mk-muted);
  flex: 0 0 auto;
}
.MarketPanel-standBar .st {
  color: #7aaf6e;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .04em;
  font-size: 10px;
}
.MarketPanel-standBar .st.off { color: #c66; }
.MarketPanel-standSlots {
  /* Pack + All: identical fixed cells so icon gaps match. */
  --mk-stand-cell: 46px;
  display: grid;
  grid-template-columns: repeat(4, var(--mk-stand-cell));
  justify-content: start;
  align-content: start;
  justify-items: stretch;
  gap: 4px;
  padding: 6px 8px 8px;
  width: 100%;
  box-sizing: border-box;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  overflow-x: hidden;
  overflow-y: auto;
}
.MarketPanel-standSlots.is-dense {
  grid-template-columns: repeat(6, var(--mk-stand-cell));
}
.MarketPanel-standSlots .comm-trade-slot {
  width: var(--mk-stand-cell) !important;
  max-width: var(--mk-stand-cell) !important;
  min-width: var(--mk-stand-cell);
  flex: none !important;
}
.MarketPanel-standSlots .comm-trade-slot-art {
  margin: 0 auto;
  width: var(--mk-stand-cell);
  height: var(--mk-stand-cell);
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
.MarketPanel-standSlots .comm-trade-slot-emptyWrap {
  margin: 0 auto;
  line-height: 0;
  width: var(--mk-stand-cell);
  height: var(--mk-stand-cell);
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
.MarketPanel-standSlots .comm-trade-slot-emptyPlus {
  font-family: Consolas, "Segoe UI", Tahoma, sans-serif;
  font-weight: 600;
}
.MarketPanel-standSlots .comm-trade-slot-price {
  max-width: var(--mk-stand-cell);
  width: 100%;
  box-sizing: border-box;
}
.MarketPanel-standSlots.is-dense .comm-trade-slot-price {
  font-size: 10px;
}
.MarketPanel-standSlots .comm-trade-slot.is-on .ecu-item-icon__frame,
.MarketPanel-standSlots .comm-trade-slot.is-on .itemcontainer,
.MarketPanel-standSlots .comm-trade-slot.is-on .comm-trade-slot-empty {
  box-shadow: 0 0 0 2px rgba(232, 201, 106, .75);
}
.MarketPanel-standSlots .comm-trade-slot:hover .ecu-item-icon__frame,
.MarketPanel-standSlots .comm-trade-slot:hover .itemcontainer,
.MarketPanel-standSlots .comm-trade-slot:hover .comm-trade-slot-empty {
  border-color: #777;
}
.MarketPanel-itemGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  /* Tall enough for icon + 2-line name + price footer with air. */
  grid-auto-rows: minmax(168px, auto);
  gap: 8px;
  padding: 10px;
  align-content: start;
  align-items: stretch;
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}
.MarketPanel-itemCard {
  position: relative;
  border: 1px solid #2c2c2c;
  background: linear-gradient(180deg, #151515 0%, #0d0d0d 100%);
  color: inherit;
  font: inherit;
  padding: 0;
  text-align: left;
  display: flex;
  flex-direction: column;
  min-height: 168px;
  height: auto;
  align-self: stretch;
  width: 100%;
  box-sizing: border-box;
  transition: border-color .12s, background .12s, box-shadow .12s;
}
.MarketPanel-itemCard__hit {
  appearance: none;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  padding: 0;
  margin: 0;
  cursor: pointer;
  text-align: left;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
}
.MarketPanel-itemCard__fav {
  appearance: none;
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 2;
  border: 0;
  background: rgba(0, 0, 0, .45);
  color: #6a6a6a;
  font: inherit;
  font-size: 13px;
  line-height: 1;
  width: 22px;
  height: 22px;
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.MarketPanel-itemCard__fav:hover { color: #c9a84a; }
.MarketPanel-itemCard__fav.is-on { color: var(--mk-accent); }
.MarketPanel-itemCard:hover {
  border-color: #5a5a5a;
  background: linear-gradient(180deg, #1b1b1b 0%, #121212 100%);
}
.MarketPanel-itemCard.is-dual {
  border-color: #3a3830;
  background:
    linear-gradient(135deg, rgba(201, 122, 90, .08) 0%, transparent 46%),
    linear-gradient(315deg, rgba(106, 171, 142, .08) 0%, transparent 46%),
    linear-gradient(180deg, #151515 0%, #0d0d0d 100%);
}
.MarketPanel-itemCard.is-dual:hover {
  border-color: #5a5440;
}
.MarketPanel-itemCard.is-arb {
  border-color: #6a9a72;
  box-shadow: inset 0 0 0 1px rgba(106, 154, 114, .35);
}
.MarketPanel-itemCard.is-arb:hover {
  border-color: #84b88c;
}
.MarketPanel-itemCard.is-arb.is-on,
.MarketPanel-itemCard.is-on {
  border-color: var(--mk-accent);
  box-shadow: inset 0 0 0 1px rgba(232, 201, 106, .28);
  background: linear-gradient(180deg, #1c1910 0%, #14120c 100%);
}
.MarketPanel-itemCard.is-arb.is-on {
  box-shadow:
    inset 0 0 0 1px rgba(232, 201, 106, .28),
    0 0 0 1px rgba(106, 154, 114, .45);
}
.MarketPanel-itemCard__top {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 28px 0 10px;
  min-height: 48px;
}
.MarketPanel-itemCard__top .ecu-item-icon,
.MarketPanel-itemCard__top .market-ico {
  flex: 0 0 auto;
  filter: drop-shadow(0 1px 0 rgba(0,0,0,.45));
}
.MarketPanel-itemCard__counts {
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: flex-end;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}
.MarketPanel-itemCard__counts .s,
.MarketPanel-itemCard__counts .b,
.MarketPanel-itemCard__counts .g {
  padding: 2px 5px;
  min-width: 30px;
  text-align: center;
  border-radius: 2px;
  letter-spacing: .02em;
}
.MarketPanel-itemCard__counts .s {
  color: #e0a088;
  border: 1px solid #4a3028;
  background: #181210;
}
.MarketPanel-itemCard__counts .b {
  color: #8ec4a8;
  border: 1px solid #2a4034;
  background: #101812;
}
.MarketPanel-itemCard__counts .g {
  color: #c4b48e;
  border: 1px solid #4a4430;
  background: #16140e;
}
.MarketPanel-itemCard__counts .dim { opacity: .28; }
.MarketPanel-itemCard .nm {
  flex: 0 0 auto;
  /* Always reserve two lines so wrap grows the slot, not the price gap. */
  min-height: calc(1.35em * 2);
  padding: 8px 10px 6px;
  font-size: 12px;
  font-weight: 600;
  color: #f0f0f0;
  line-height: 1.35;
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: normal;
}
.MarketPanel-itemCard__prices {
  flex: 0 0 auto;
  margin-top: auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  border-top: 1px solid #222;
  background: rgba(0,0,0,.28);
}
.MarketPanel-itemCard__prices .row-p {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 7px 9px 8px;
  min-width: 0;
}
.MarketPanel-itemCard__prices .row-p + .row-p {
  border-left: 1px solid #222;
}
.MarketPanel-itemCard__prices .lbl {
  color: #777;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: .06em;
}
.MarketPanel-itemCard__prices .val {
  font-weight: 700;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.MarketPanel-itemCard__prices .val.sell { color: var(--mk-gold); }
.MarketPanel-itemCard__prices .val.buy { color: #8ec4a8; }
.MarketPanel-itemCard__prices .val.give { color: #c4b48e; }
.MarketPanel-itemCard__prices .val.none { color: #3f3f3f; font-weight: 400; }
.MarketPanel-offer {
  padding: 7px 9px 8px;
  border-bottom: 1px solid var(--mk-line-soft);
}
.MarketPanel-offer:hover { background: #101010; }
.MarketPanel-offer.is-blocked { opacity: .55; }
.MarketPanel-offerTop {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}
.MarketPanel-offerMeta {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  column-gap: 8px;
  row-gap: 1px;
  margin-top: 3px;
  min-width: 0;
}
.MarketPanel-offerMetaCell {
  min-width: 0;
  font-size: 10px;
  color: #6a6a6a;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.MarketPanel-offerMetaCell.is-empty { visibility: hidden; }
.MarketPanel-offerMetaCell.is-place { color: #7a7a7a; }
.MarketPanel-offerMetaCell.is-qty {
  color: #8a8a8a;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.MarketPanel-offerFoot {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  min-width: 0;
}
.MarketPanel-offerCache {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 10px;
  color: #5a5040;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.MarketPanel-offerCache.is-empty { visibility: hidden; }
.MarketPanel-who {
  display: flex;
  align-items: baseline;
  gap: 5px;
  min-width: 0;
  flex: 1 1 auto;
}
.MarketPanel-whoName {
  font-weight: 600;
  font-size: 12px;
  color: #e8e8e8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.MarketPanel-whoDist {
  flex: 0 1 auto;
  min-width: 0;
  font-size: 10px;
  font-weight: 400;
  color: #6a6a6a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.MarketPanel-chips {
  display: inline-flex;
  gap: 3px;
  flex: 0 0 auto;
}
.MarketPanel-chip {
  font-size: 9px;
  padding: 0 4px;
  border: 1px solid #3a3a3a;
  color: #777;
  letter-spacing: .02em;
  text-transform: lowercase;
}
.MarketPanel-chip.near { color: #7aaf6e; border-color: #3a5534; }
.MarketPanel-chip.party { color: #7aa2d4; border-color: #3a5068; }
.MarketPanel-price {
  flex: 0 0 auto;
  font-variant-numeric: tabular-nums;
  color: var(--mk-gold);
  font-size: 14px;
  text-align: right;
  white-space: nowrap;
  font-weight: 700;
  letter-spacing: .01em;
}
.MarketPanel-offer.is-want .MarketPanel-price { color: #8ec4a8; }
.MarketPanel-offer.is-give .MarketPanel-price { color: #c4b48e; }
.MarketPanel-rowAct {
  appearance: none;
  border: 1px solid #555;
  background: #1a1a1a;
  color: #eee;
  font: inherit;
  font-size: 11px;
  height: 24px;
  padding: 0 9px;
  cursor: pointer;
  white-space: nowrap;
  flex: 0 0 auto;
  margin-left: auto;
}
.MarketPanel-rowAct:disabled { opacity: .35; cursor: default; }
.MarketPanel-rowAct.is-buy {
  border-color: rgba(232, 201, 106, .5);
  color: var(--mk-accent);
  background: #18150e;
}
.MarketPanel-rowAct.is-sell {
  border-color: #6a4030;
  color: #e0a080;
  background: #181210;
}
.MarketPanel-rowAct.is-give {
  border-color: #5a5040;
  color: #c4b48e;
  background: #16140e;
}
.MarketPanel-empty {
  padding: 36px 16px;
  text-align: center;
  color: var(--mk-muted);
  font-size: 13px;
  line-height: 1.55;
}
.MarketPanel-empty strong {
  display: block;
  color: #bbb;
  font-weight: 600;
  margin-bottom: 4px;
}
.MarketPanel-focusTop {
  padding: 10px 12px 12px;
  background: #0c0c0c;
  flex: 0 0 auto;
}
.MarketPanel-focusHead {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  min-width: 0;
}
.MarketPanel-focusHeadText {
  min-width: 0;
  flex: 1 1 auto;
}
.MarketPanel-focusTitleRow {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.MarketPanel-focusHead h2 {
  margin: 0 0 3px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.MarketPanel-focusHead .sub { color: #888; font-size: 11px; line-height: 1.35; }
.MarketPanel-favBtn {
  appearance: none;
  flex: 0 0 auto;
  border: 0;
  background: transparent;
  color: #6a6a6a;
  font: inherit;
  font-size: 14px;
  line-height: 1;
  padding: 0 2px;
  cursor: pointer;
}
.MarketPanel-favBtn:hover { color: #c9a84a; }
.MarketPanel-favBtn.is-on { color: var(--mk-accent); }
.MarketPanel-dealBar {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-top: 10px;
}
.MarketPanel-dealBar .MarketPanel-btn { width: 100%; padding: 8px; }
.MarketPanel-dealBar .hint {
  grid-column: 1 / -1;
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--mk-muted);
  line-height: 1.35;
}
.MarketPanel-focusOffers {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  border-top: 1px solid var(--mk-line);
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: start;
}
.MarketPanel-focusOffers.has-gives {
  grid-template-columns: 1fr 1fr 1fr;
}
.MarketPanel-focusCol { min-width: 0; }
.MarketPanel-focusCol--sells { border-right: 1px solid var(--mk-line); }
.MarketPanel-focusCol--mid { border-right: 1px solid var(--mk-line); }
.MarketPanel-focusColH {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
  padding: 7px 9px;
  font-size: 10px;
  letter-spacing: .07em;
  text-transform: uppercase;
  border-bottom: 1px solid var(--mk-line-soft);
  background: #101010;
}
.MarketPanel-focusColH .sells { color: #c97a5a; font-weight: 700; }
.MarketPanel-focusColH .wants { color: #6aab8e; font-weight: 700; }
.MarketPanel-focusColH .gives { color: #c4b48e; font-weight: 700; }
.MarketPanel-focusColH em {
  font-style: normal;
  color: var(--mk-muted);
  letter-spacing: 0;
  text-transform: none;
  font-size: 11px;
}
.MarketPanel-focusColEmpty {
  padding: 14px 10px;
  font-size: 11px;
  color: #555;
  line-height: 1.35;
}
@media (max-width: 900px) {
  .MarketPanel-body {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(200px, 1fr) minmax(200px, 1fr);
    overflow: auto;
  }
  .MarketPanel-you { max-height: 280px; border-right: 0; border-bottom: 1px solid var(--mk-line); }
  .MarketPanel-col { border-right: 0; border-bottom: 1px solid var(--mk-line); }
}
`;

export function ensureMarketPanelCss(): void {
  if (typeof document === "undefined") return;
  const css = MARKET_PANEL_CSS + "\n" + ITEM_INSTANCE_BADGE_CSS;
  const existing = document.getElementById("ecu-market-panel-css");
  if (existing) {
    existing.textContent = css;
    return;
  }
  const el = document.createElement("style");
  el.id = "ecu-market-panel-css";
  el.textContent = css;
  document.head.appendChild(el);
}
