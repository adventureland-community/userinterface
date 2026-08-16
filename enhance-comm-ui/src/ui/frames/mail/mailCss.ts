/** Inject once for Comm mail panel. */

import { ITEM_INSTANCE_BADGE_CSS } from "../../chrome/ItemInstance";

let injected = false;

const CSS =
  `
.comm-mail {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  max-height: 100%;
  overflow: hidden;
  background: #0e0e0e;
  color: #e8e8e8;
  /* Readable UI font — game pixel face is too small for an inbox. */
  font-family: "Segoe UI", Tahoma, Arial, sans-serif;
  font-size: 16px;
  line-height: 1.4;
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
}
.comm-mail * { box-sizing: border-box; font-family: inherit; }
/* Stock item_container qty/level use Pixel; hide via ItemInstance overlays. */
.comm-mail .ecu-item-instance-host,
.comm-mail .ecu-item-instance-host * {
  font-family: "Segoe UI", Tahoma, Arial, sans-serif;
}
.comm-mail .ecu-item-instance-host .iqui,
.comm-mail .ecu-item-instance-host .iuui {
  display: none !important;
}
.comm-mail__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-start;
  padding: 10px 12px;
  border-bottom: 1px solid #2a2a2a;
  flex-shrink: 0;
}
.comm-mail__search-wrap {
  position: relative;
  flex: 1 1 220px;
  min-width: 180px;
  max-width: 520px;
  z-index: 5;
}
.comm-mail__search-shell {
  display: flex;
  align-items: center;
  gap: 2px;
  background: #161616;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 0 4px 0 0;
}
.comm-mail__search-wrap.is-open .comm-mail__search-shell {
  border-color: #6af;
  box-shadow: 0 0 0 1px rgba(102, 170, 255, 0.35);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}
.comm-mail__search {
  flex: 1 1 auto;
  min-width: 0;
  background: transparent;
  border: none;
  color: #eee;
  padding: 8px 10px;
  font-size: 15px;
  outline: none;
}
.comm-mail__search::-webkit-search-cancel-button {
  -webkit-appearance: none;
  appearance: none;
}
.comm-mail__search-clear,
.comm-mail__search-opts-btn {
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: #aaa;
  cursor: pointer;
  font-size: 18px;
  line-height: 28px;
  border-radius: 4px;
}
.comm-mail__search-clear:hover,
.comm-mail__search-opts-btn:hover,
.comm-mail__search-opts-btn.is-on {
  color: #fff;
  background: #2a2a2a;
}
.comm-mail__ico-tune {
  display: inline-block;
  width: 14px;
  height: 12px;
  vertical-align: middle;
  background:
    linear-gradient(#aaa, #aaa) 0 1px / 14px 2px no-repeat,
    linear-gradient(#aaa, #aaa) 0 5px / 14px 2px no-repeat,
    linear-gradient(#aaa, #aaa) 0 9px / 14px 2px no-repeat,
    radial-gradient(circle at center, #161616 0 2px, #aaa 2.5px 3.5px, transparent 4px) 9px 0 / 7px 4px no-repeat,
    radial-gradient(circle at center, #161616 0 2px, #aaa 2.5px 3.5px, transparent 4px) 2px 4px / 7px 4px no-repeat,
    radial-gradient(circle at center, #161616 0 2px, #aaa 2.5px 3.5px, transparent 4px) 7px 8px / 7px 4px no-repeat;
}
.comm-mail__search-opts-btn:hover .comm-mail__ico-tune,
.comm-mail__search-opts-btn.is-on .comm-mail__ico-tune {
  background:
    linear-gradient(#fff, #fff) 0 1px / 14px 2px no-repeat,
    linear-gradient(#fff, #fff) 0 5px / 14px 2px no-repeat,
    linear-gradient(#fff, #fff) 0 9px / 14px 2px no-repeat,
    radial-gradient(circle at center, #2a2a2a 0 2px, #fff 2.5px 3.5px, transparent 4px) 9px 0 / 7px 4px no-repeat,
    radial-gradient(circle at center, #2a2a2a 0 2px, #fff 2.5px 3.5px, transparent 4px) 2px 4px / 7px 4px no-repeat,
    radial-gradient(circle at center, #2a2a2a 0 2px, #fff 2.5px 3.5px, transparent 4px) 7px 8px / 7px 4px no-repeat;
}
.comm-mail__search-opts {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  margin: 0;
  padding: 12px 14px 12px;
  background: #141820;
  border: 1px solid #6af;
  border-top: none;
  border-radius: 0 0 6px 6px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.55);
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: min(70vh, 480px);
  overflow: auto;
}
.comm-mail__opts-row {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 8px;
  align-items: center;
  margin: 0;
  font-size: 13px;
  color: #bbb;
}
.comm-mail__opts-label {
  text-align: right;
  color: #9ab;
  font-size: 12px;
}
.comm-mail__opts-input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  background: #0e0e0e;
  border: 1px solid #333;
  color: #eee;
  padding: 6px 8px;
  font-size: 14px;
  border-radius: 3px;
}
.comm-mail__opts-input:focus {
  outline: none;
  border-color: #6af;
}
.comm-mail__opts-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 18px;
  padding: 4px 0 2px 118px;
}
.comm-mail__opts-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #ccc;
  cursor: pointer;
}
.comm-mail__opts-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px solid #222;
  margin-top: 4px;
}
.comm-mail__toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  flex: 1 1 auto;
}
.comm-mail__pills { display: flex; flex-wrap: wrap; gap: 6px; }
.comm-mail__pill {
  background: #1a1a1a;
  border: 1px solid #444;
  color: #ccc;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 14px;
}
.comm-mail__pill.is-on {
  border-color: #a86;
  color: #ffe08a;
  background: #2a2410;
}
.comm-mail__btn {
  background: #1a1a1a;
  border: 1px solid #555;
  color: #ddd;
  padding: 6px 14px;
  cursor: pointer;
  font-size: 14px;
}
.comm-mail__btn:disabled { opacity: 0.45; cursor: not-allowed; }
.comm-mail__btn--gold {
  border-color: #a86;
  color: #ffe08a;
  background: #2a2410;
}
.comm-mail__banner {
  padding: 8px 12px;
  font-size: 14px;
  color: #9ab;
  border-bottom: 1px solid #222;
  cursor: pointer;
}
.comm-mail__banner.is-new {
  color: #8cf;
  background: linear-gradient(90deg, #122030, #0e0e0e 70%);
}
.comm-mail__chrome {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid #222;
  background: #101214;
}
.comm-mail__card {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  background: #15171a;
  box-sizing: border-box;
}
.comm-mail__card-body {
  min-width: 0;
  flex: 1 1 auto;
}
.comm-mail__card-kicker {
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #6a7380;
  margin-bottom: 3px;
}
.comm-mail__card-title {
  font-size: 14px;
  font-weight: 600;
  color: #d8dde4;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
}
.comm-mail__card-sub {
  margin-top: 3px;
  font-size: 12px;
  color: #7a8490;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.comm-mail__card--activity {
  color: #888;
}
.comm-mail__card--activity.is-on {
  border-color: #3a4a58;
  background: #182028;
}
.comm-mail__card--activity.is-warm {
  border-color: #5a4a28;
  background: #221c10;
}
.comm-mail__card--activity.is-warm .comm-mail__card-title {
  color: #ffe4a8;
}
.comm-mail__card--activity.is-pull {
  border-color: #2a4a68;
  background: #121c28;
}
.comm-mail__card--activity.is-pull .comm-mail__card-title {
  color: #9fd0ff;
}
.comm-mail__card--activity.is-command {
  border-color: #3a5a30;
  background: #142014;
}
.comm-mail__card--activity.is-command .comm-mail__card-title {
  color: #b7f0a8;
}
.comm-mail__card--activity.is-delete {
  border-color: #5a3a28;
  background: #221410;
}
.comm-mail__card--activity.is-delete .comm-mail__card-title {
  color: #ffc8a0;
}
.comm-mail__card--observe.is-off .comm-mail__card-title {
  color: #777;
}
.comm-mail__card--status.is-info {
  border-color: #2a4038;
  background: #121a16;
}
.comm-mail__card--status.is-info .comm-mail__card-title {
  color: #8a9;
}
.comm-mail__card--status.is-warn {
  border-color: #5a4a28;
  background: #1a1810;
}
.comm-mail__card--status.is-warn .comm-mail__card-title {
  color: #db8;
}
.comm-mail__card--status.is-err {
  border-color: #5a3030;
  background: #1a1212;
}
.comm-mail__card--status.is-err .comm-mail__card-title {
  color: #e88;
}
.comm-mail__delete-track {
  margin-top: 6px;
  height: 6px;
  border-radius: 3px;
  background: #1a1410;
  border: 1px solid #5a4030;
  overflow: hidden;
}
.comm-mail__delete-fill {
  height: 100%;
  background: linear-gradient(90deg, #c47840, #e8b060);
  transition: width 0.08s linear;
}
.comm-mail__pulse {
  width: 10px;
  height: 10px;
  margin-top: 4px;
  border-radius: 50%;
  flex: 0 0 auto;
  background: #444;
  box-shadow: 0 0 0 0 rgba(120, 120, 120, 0.35);
}
.comm-mail__card--activity.is-on .comm-mail__pulse {
  animation: ecu-mail-pulse 1.25s ease-out infinite;
}
.comm-mail__card--activity.is-warm .comm-mail__pulse {
  background: #f0c060;
  box-shadow: 0 0 0 0 rgba(240, 192, 96, 0.45);
}
.comm-mail__card--activity.is-pull .comm-mail__pulse {
  background: #5ab0ff;
  box-shadow: 0 0 0 0 rgba(90, 176, 255, 0.45);
}
.comm-mail__card--activity.is-command .comm-mail__pulse {
  background: #7ad86a;
  box-shadow: 0 0 0 0 rgba(122, 216, 106, 0.45);
}
@keyframes ecu-mail-pulse {
  0% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.35); }
  70% { transform: scale(1.15); opacity: 0.85; box-shadow: 0 0 0 8px rgba(255, 255, 255, 0); }
  100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
}
/* Foot warm pulse only — chrome activity lives on .comm-mail__card. */
.comm-mail__chrome-main,
.comm-mail__observe,
.comm-mail__stats,
.comm-mail__activity-label { display: none; }
.comm-mail__row.is-check { background: #1a2220; }
.comm-mail__lead {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding-top: 10px;
}
.comm-mail__check {
  margin: 0;
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  accent-color: #6af;
}
.comm-mail__status {
  padding: 0;
  font-size: 13px;
  color: #8a8;
  min-height: 0;
}
.comm-mail__status.is-info { color: #8a9; }
.comm-mail__status.is-warn { color: #db8; }
.comm-mail__status.is-err { color: #e88; }
.comm-mail__foot {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  text-align: center;
  color: #888;
  font-size: 12px;
}
.comm-mail__foot-pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #f0c060;
  animation: ecu-mail-pulse 1.25s ease-out infinite;
  flex: 0 0 auto;
}
.comm-mail__foot-warm {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #c9b07a;
  font-weight: 600;
}
.comm-mail__body {
  flex: 1 1 auto;
  display: flex;
  min-height: 0;
  position: relative;
}
.comm-mail__list {
  flex: 1 1 46%;
  max-width: 520px;
  overflow: auto;
  border-right: 1px solid #2a2a2a;
  min-width: 260px;
}
.comm-mail.is-narrow .comm-mail__list { flex: 1 1 auto; max-width: none; border-right: none; }
.comm-mail.is-narrow.is-reading .comm-mail__list,
.comm-mail.is-narrow.is-compose .comm-mail__list { display: none; }
.comm-mail__row {
  display: flex;
  gap: 10px;
  padding: 9px 12px;
  border-bottom: 1px solid #1c1c1c;
  cursor: pointer;
  align-items: flex-start;
  min-height: 0;
}
.comm-mail__row:hover { background: #161616; }
.comm-mail__row.is-sel { background: #1c2430; }
.comm-mail__row.is-unread .comm-mail__title { color: #fff; font-weight: 600; }
.comm-mail__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: transparent;
  flex-shrink: 0;
}
.comm-mail__row.is-unread .comm-mail__dot { background: #6af; }
.comm-mail__main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-top: 1px;
}
.comm-mail__sub {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px 6px;
  min-width: 0;
  color: #bbb;
  font-size: 14px;
  line-height: 1.25;
}
.comm-mail__title {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.comm-mail__chips {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}
.comm-mail__row .comm-mail__chips {
  flex: 1 1 auto;
  min-width: 0;
}
.comm-mail__aside {
  display: none;
}
.comm-mail__meta {
  font-size: 11px;
  color: #777;
}
.comm-mail__row .comm-mail__meta {
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.comm-mail__row.is-stack .comm-mail__title { color: #ddd; }
.comm-mail__twist {
  display: none;
}
.comm-mail__stack-n,
.comm-mail__stack-q,
.comm-mail__stack-u {
  display: inline-block;
  padding: 0 5px;
  border-radius: 7px;
  font-size: 11px;
  font-weight: 700;
  line-height: 16px;
  border: none;
  cursor: inherit;
  font-family: inherit;
}
button.comm-mail__stack-n,
button.comm-mail__stack-u {
  cursor: pointer;
}
.comm-mail__stack-n {
  background: #2a3340;
  color: #9cf;
}
.comm-mail__stack-n.is-open {
  background: #3a4455;
  color: #cde;
}
.comm-mail__stack-q {
  background: #3d3420;
  color: #ffe9a0;
}
.comm-mail__stack-u {
  background: #1a3048;
  color: #9cf;
  font-weight: 600;
}
.comm-mail__row.is-nested {
  padding-left: 28px;
  background: #101418;
}
.comm-mail__row.is-nested:hover { background: #161c22; }
.comm-mail__row.is-nested.is-sel { background: #1c2430; }
.comm-mail__item {
  position: relative;
  flex-shrink: 0;
  margin-left: 2px;
  line-height: 0;
  align-self: center;
}
.comm-mail__item.is-taken {
  opacity: 0.22;
  filter: grayscale(1);
}
.comm-mail__item-stamp {
  position: absolute;
  right: -3px;
  bottom: -3px;
  z-index: 3;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 7px;
  border: 1px solid #222;
  font-size: 10px;
  font-weight: 700;
  line-height: 12px;
  text-align: center;
  pointer-events: none;
  box-sizing: border-box;
}
.comm-mail__item-stamp.is-takeable {
  background: #1a3a18;
  color: #8fd67a;
  border-color: #3a6a32;
}
.comm-mail__item-stamp.is-taken {
  background: #2a2a2a;
  color: #bbb;
  border-color: #555;
}
.comm-mail__attach-pill {
  display: inline-block;
  padding: 0 5px;
  border-radius: 7px;
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  letter-spacing: 0.02em;
}
.comm-mail__attach-pill.is-takeable {
  background: #1a3020;
  color: #b8f0a0;
}
.comm-mail__attach-pill.is-taken {
  background: #2a2a2a;
  color: #bbb;
}
.comm-mail__item .ecu-meter-icon-clip {
  display: block;
  overflow: hidden;
}
.comm-mail__item .ecu-meter-icon-clip img,
.comm-mail__attach .ecu-meter-icon-clip img,
.comm-mail__item img,
.comm-mail__attach img {
  max-width: none;
  image-rendering: pixelated;
}
.comm-mail__row.has-item { border-left: 2px solid transparent; }
.comm-mail__row.item-taken { border-left: 2px solid #555; }
.comm-mail__pane {
  flex: 1 1 54%;
  overflow: auto;
  padding: 14px 16px;
  min-width: 260px;
  font-size: 16px;
}
.comm-mail.is-narrow .comm-mail__pane { display: none; }
.comm-mail.is-narrow.is-reading .comm-mail__pane,
.comm-mail.is-narrow.is-compose .comm-mail__pane { display: block; flex: 1 1 auto; }
.comm-mail__empty { color: #777; padding: 32px 12px; text-align: center; font-size: 16px; }
.comm-mail__compose label {
  display: block; font-size: 13px; color: #999; margin: 10px 0 4px;
}
.comm-mail__compose input,
.comm-mail__compose textarea {
  width: 100%;
  background: #161616;
  border: 1px solid #333;
  color: #eee;
  padding: 9px 12px;
  font-size: 15px;
}
.comm-mail__compose textarea { min-height: 140px; resize: vertical; }
.comm-mail__chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 4px; }
.comm-mail__chip {
  background: #222;
  border: 1px solid #444;
  color: #eee;
  padding: 4px 10px;
  font-size: 14px;
  cursor: pointer;
}
.comm-mail__chip:hover {
  background: #2a2a2a;
  border-color: #666;
  color: #fff;
}
.comm-mail__suggest {
  position: absolute; z-index: 5; background: #151515;
  border: 1px solid #444; max-height: 200px; overflow: auto;
  width: min(320px, 90%);
}
.comm-mail__suggest button {
  display: block; width: 100%; text-align: left;
  background: transparent; border: 0; color: #ddd;
  padding: 8px 12px; cursor: pointer; font-size: 15px;
}
.comm-mail__suggest button:hover { background: #222; }
.comm-mail__suggest-g {
  font-size: 12px; color: #888; padding: 6px 12px 0; text-transform: uppercase;
}
.comm-mail__attach {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  padding: 10px 12px;
  background: #151a14;
  border: 1px solid #3a5a32;
}
.comm-mail__attach.is-takeable {
  box-shadow: inset 3px 0 0 #6DAD47;
}
.comm-mail__attach.is-taken {
  background: #161616;
  border-color: #3a3a3a;
  box-shadow: inset 3px 0 0 #666;
  opacity: 1;
}
.comm-mail__attach.is-taken .comm-mail__attach-meta strong {
  color: #aaa;
  text-decoration: line-through;
  text-decoration-thickness: 1px;
}
.comm-mail__attach-meta { font-size: 15px; color: #ccc; }
.comm-mail__attach-state {
  margin-top: 4px;
  font-size: 13px;
  font-weight: 700;
}
.comm-mail__attach-state.is-takeable { color: #8fd67a; }
.comm-mail__attach-state.is-taken { color: #9a9a9a; }
.comm-mail__takeable { color: #6DAD47; margin-left: 6px; }
.comm-mail__taken { color: #888; margin-left: 6px; }
.comm-mail__attach-list .comm-mail__attach {
  margin-top: 6px;
  background: #151515;
  border-color: #333;
  box-shadow: none;
}
.comm-mail__attach-list .comm-mail__attach:first-child { margin-top: 8px; }
.comm-mail__attach-to {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-size: 13px;
  color: #aaa;
}
.comm-mail__attach-to select {
  flex: 1;
  min-width: 0;
  max-width: 220px;
  background: #121212;
  border: 1px solid #444;
  color: #eee;
  padding: 4px 8px;
  font-size: 14px;
}
.comm-mail__acts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.ecu-btn[data-ecu-mail] {
  position: relative;
  overflow: visible;
}
.ecu-btn[data-ecu-mail] .ecu-mail-badge {
  position: absolute;
  top: -7px;
  right: -8px;
  min-width: 22px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  /* room for "100+" when server unread cap is hit */
  background: #d33;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  font-family: Consolas, "Segoe UI", Tahoma, sans-serif;
  letter-spacing: 0;
  line-height: 18px;
  text-align: center;
  box-shadow: 0 0 0 1px #1a1a1a;
  pointer-events: none;
}
.ecu-mail-toast {
  position: fixed;
  bottom: 72px;
  left: 50%;
  transform: translateX(-50%) translateY(12px);
  background: #1a1a1a;
  border: 1px solid #666;
  color: #eee;
  padding: 10px 16px;
  font-size: 15px;
  font-family: "Segoe UI", Tahoma, Arial, sans-serif;
  z-index: 100000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s, transform 0.2s;
}
.ecu-mail-toast.is-on {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
.comm-mail-ctx {
  position: fixed; z-index: 99999;
  background: #151515; border: 1px solid #555;
  min-width: 200px; padding: 4px 0;
  box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  font-family: "Segoe UI", Tahoma, Arial, sans-serif;
}
.comm-mail-ctx__sep {
  height: 1px;
  margin: 4px 0;
  background: #333;
}
.comm-mail-ctx button,
.comm-mail-ctx__item {
  display: block; width: 100%; text-align: left;
  background: transparent; border: 0; color: #ddd;
  padding: 9px 14px; cursor: pointer; font-size: 15px;
}
.comm-mail-ctx button:hover,
.comm-mail-ctx__item:hover { background: #222; }
` + ITEM_INSTANCE_BADGE_CSS;

export function ensureMailCss(): void {
  const existing = document.querySelector(
    "style[data-ecu-mail-css]",
  ) as HTMLStyleElement | null;
  if (existing) {
    existing.textContent = CSS;
    injected = true;
    return;
  }
  if (injected) return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-ecu-mail-css", "1");
  el.textContent = CSS;
  document.head.appendChild(el);
}
