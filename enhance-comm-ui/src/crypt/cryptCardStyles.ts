/**
 * Instance card constants. Visual chrome lives in cryptPanelCss.
 */

export const CARD_ICON_SIZE = 40;

/** Fill the PositionedPanel body without painting a second framed box. */
export const PANEL_SHELL: Record<string, any> = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  minHeight: "100%",
  height: "100%",
  boxSizing: "border-box",
};
