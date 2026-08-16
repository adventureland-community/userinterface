import { CRYPT_PANEL_STYLE } from "../lib/frameSizes";
import { PIXEL_TEXT, TYPE } from "../lib/typeScale";

export const CARD_ICON_SIZE = 20;

export const CARD_STYLE_BASE: Record<string, any> = {
  background: "black",
  padding: "4px 6px",
  minWidth: "72px",
  boxSizing: "border-box",
  fontSize: TYPE.chrome,
  lineHeight: 1.25,
  color: "#eee",
  ...PIXEL_TEXT,
};

export const META_STYLE: Record<string, any> = {
  fontSize: TYPE.secondary,
  color: "#ccc",
  ...PIXEL_TEXT,
};

export const SECTION_LABEL_STYLE: Record<string, any> = {
  fontSize: TYPE.secondary,
  color: "#888",
  padding: "2px 4px 0",
  ...PIXEL_TEXT,
};

export const PANEL_SHELL: Record<string, any> = {
  display: "flex",
  flexDirection: "column",
  margin: "4px",
  border: "2px double gray",
  gap: "4px",
  fontSize: TYPE.chrome,
  ...PIXEL_TEXT,
  ...CRYPT_PANEL_STYLE,
};
