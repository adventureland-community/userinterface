/** Compact stack-digit (`.iqui`) scaling for HUD effect icons. */

export const EFFECTS_ICON_CSS = `
.comm-fx-icon .iqui.is-compact {
  --comm-fx-iqui-scale: 0.55;
  font-size: max(11px, calc(24px * var(--comm-fx-iqui-scale)));
  line-height: max(10px, calc(16px * var(--comm-fx-iqui-scale)));
  height: auto;
  min-height: max(10px, calc(16px * var(--comm-fx-iqui-scale)));
  padding: 0 2px;
  border-width: 1px;
  right: 0;
  bottom: 0;
  white-space: nowrap;
  z-index: 3;
  box-sizing: border-box;
}
`;
