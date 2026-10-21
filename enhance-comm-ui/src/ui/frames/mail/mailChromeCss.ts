/** Mail shell, toolbar, search, banner chrome cards. */
export const MAIL_CHROME_CSS = `
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
.comm-mail__card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.comm-mail__card-title-row .comm-mail__card-title {
  flex: 1 1 auto;
  min-width: 0;
}
.comm-mail__btn--undo {
  flex: 0 0 auto;
  background: #3a3420;
  color: #ffe9a0;
  border: 1px solid #6a5a30;
  font-weight: 700;
}
.comm-mail__btn--undo:hover {
  background: #4a4430;
  color: #fff3c0;
}
.comm-mail__card-sub {
  margin-top: 3px;
  font-size: 12px;
  color: #7a8490;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.comm-mail__card--caps {
  min-width: 190px;
}
.comm-mail__card--caps.is-cap-warn {
  border-color: #5a4a28;
}
.comm-mail__card--caps.is-cap-full {
  border-color: #6a3848;
}
.comm-mail__cap-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 3px;
}
.comm-mail__cap-hd .comm-mail__card-kicker {
  margin-bottom: 0;
}
.comm-mail__cap-details {
  flex: 0 0 auto;
  background: transparent;
  border: none;
  padding: 0;
  color: #8ab4d8;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: rgba(138, 180, 216, 0.35);
}
.comm-mail__cap-details:hover {
  color: #b6d4ee;
}
.comm-mail__card--caps .comm-mail__card-title.is-cap-warn {
  color: #e0b060;
}
.comm-mail__card--caps .comm-mail__card-title.is-cap-full {
  color: #f8a0b4;
}
.comm-mail__cap-primary {
  min-width: 0;
  margin-top: 6px;
}
.comm-mail__cap-primary-top {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}
.comm-mail__cap-name {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: #d8dde4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.comm-mail__cap-frac {
  flex: 0 0 auto;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: #9aa3ad;
}
.comm-mail__cap-frac.is-warn,
.comm-mail__cap-state.is-warn {
  color: #e0b060;
}
.comm-mail__cap-frac.is-full,
.comm-mail__cap-state.is-full {
  color: #f8a0b4;
}
.comm-mail__cap-state {
  flex: 0 0 auto;
  font-size: 10px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #6a7380;
}
.comm-mail__cap-meter {
  margin-top: 5px;
  height: 5px;
  border-radius: 3px;
  background: #1c2026;
  overflow: hidden;
}
.comm-mail__cap-meter-fill {
  height: 100%;
  border-radius: 3px;
  background: #3d6a4a;
}
.comm-mail__cap-meter-fill.is-warn {
  background: #a87830;
}
.comm-mail__cap-meter-fill.is-full {
  background: #a04860;
}
.comm-mail__cap-open {
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 4px 0 0;
  background: transparent;
  border: none;
  border-top: 1px solid #2a2a2a;
  color: #8ab4d8;
  font: inherit;
  font-size: 11px;
  text-align: left;
  cursor: pointer;
}
.comm-mail__cap-open:hover {
  color: #b6d4ee;
}
.comm-mail__caps-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.62);
}
.comm-mail__caps-modal {
  width: min(440px, 96vw);
  max-height: min(720px, 88vh);
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid #3a3a3a;
  border-radius: 8px;
  background: #12151a;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55);
  color: #e8e8e8;
  font-family: "Segoe UI", Tahoma, Arial, sans-serif;
}
.comm-mail__caps-modal-hd {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px 10px;
  border-bottom: 1px solid #2a2a2a;
}
.comm-mail__caps-modal-hd-copy {
  flex: 1 1 auto;
  min-width: 0;
}
.comm-mail__caps-modal-title {
  font-size: 16px;
  font-weight: 700;
  color: #f0f2f5;
}
.comm-mail__caps-modal-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #8a93a0;
  line-height: 1.35;
}
.comm-mail__caps-modal-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 16px;
  border-bottom: 1px solid #222;
}
.comm-mail__caps-filter {
  background: #1a1a1a;
  border: 1px solid #444;
  color: #ccc;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 12px;
  border-radius: 999px;
}
.comm-mail__caps-filter.is-on {
  border-color: #a86;
  color: #ffe08a;
  background: #2a2410;
}
.comm-mail__caps-modal-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 8px 12px 14px;
}
.comm-mail__caps-modal-empty {
  padding: 24px 8px;
  text-align: center;
  color: #7a8490;
  font-size: 13px;
}
.comm-mail__caps-row {
  padding: 10px 8px;
  border-bottom: 1px solid #1c2026;
}
.comm-mail__caps-row:last-child {
  border-bottom: none;
}
.comm-mail__caps-row.is-full {
  background: rgba(160, 72, 96, 0.08);
}
.comm-mail__caps-row.is-warn {
  background: rgba(168, 120, 48, 0.08);
}
.comm-mail__caps-row-top {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}
.comm-mail__caps-row-name {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  color: #d8dde4;
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
`;
