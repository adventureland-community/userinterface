import { renderSVG } from "uqr";

/** QR matrix as SVG markup (Settings install / copy cards). */
export function encodeQrSvg(text: string): string {
  return renderSVG(text);
}
