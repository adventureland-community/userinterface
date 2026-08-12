/**
 * Tour spotlight geometry — measure, shade, place card, connector.
 */

export type SpotlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type CardPlacement = "auto" | "above" | "below" | "center";

/** How to measure the spotlight target. */
export type TourTargetKind = "button" | "panel" | "region";

export type ConnectorLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type Box = SpotlightRect;

/** Min spotlight when a parked panel exists but content is still empty (0×0). */
const PANEL_DOCK_FALLBACK: Record<string, { w: number; h: number }> = {
  itemInfo: { w: 240, h: 160 },
  buffInfo: { w: 240, h: 160 },
};

export function measureTarget(
  selector: string,
  kind: TourTargetKind = "region",
): SpotlightRect | null {
  if (typeof document === "undefined") return null;
  const parts = selector.split(",").map((s) => s.trim());
  const pad = kind === "button" ? 10 : 12;

  if (kind === "button") {
    for (let i = 0; i < parts.length; i++) {
      const sel = parts[i];
      if (!sel) continue;
      const el = document.querySelector(sel) as HTMLElement | null;
      const rect = el ? rectForElement(el, pad) : null;
      if (rect) return rect;
    }
    return null;
  }

  // Panel/region: union every match so related chrome (player + target frames,
  // including absolute buff overlays) shares one spotlight.
  let top = Infinity;
  let left = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  let found = false;

  for (let i = 0; i < parts.length; i++) {
    const sel = parts[i];
    if (!sel) continue;
    const nodes = document.querySelectorAll(sel);
    for (let j = 0; j < nodes.length; j++) {
      const el = nodes[j] as HTMLElement;
      const rect =
        kind === "panel" ? rectForPanelShell(el, pad) : rectForElement(el, pad);
      if (!rect) continue;
      found = true;
      top = Math.min(top, rect.top);
      left = Math.min(left, rect.left);
      right = Math.max(right, rect.left + rect.width);
      bottom = Math.max(bottom, rect.top + rect.height);
    }
  }

  if (!found) return null;
  return {
    top,
    left,
    width: right - left,
    height: bottom - top,
  };
}

function rectForElement(el: HTMLElement, pad: number): SpotlightRect | null {
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  let top = r.top;
  let left = r.left;
  let right = r.right;
  let bottom = r.bottom;
  const kids = el.children;
  for (let i = 0; i < kids.length; i++) {
    const kr = (kids[i] as HTMLElement).getBoundingClientRect();
    if (kr.width < 1 || kr.height < 1) continue;
    top = Math.min(top, kr.top);
    left = Math.min(left, kr.left);
    right = Math.max(right, kr.right);
    bottom = Math.max(bottom, kr.bottom);
  }
  return {
    top: Math.max(4, top - pad),
    left: Math.max(4, left - pad),
    width: right - left + pad * 2,
    height: bottom - top + pad * 2,
  };
}

/**
 * Empty parked panels (item/buff info before first open) still have a layout
 * anchor — synthesize a dock footprint so tours can spotlight them.
 */
function rectForEmptyPanelDock(
  el: HTMLElement,
  pad: number,
): SpotlightRect | null {
  const r = el.getBoundingClientRect();
  if (!Number.isFinite(r.top) || !Number.isFinite(r.left)) return null;
  const panelId = el.getAttribute("data-panel") || "";
  const dock =
    PANEL_DOCK_FALLBACK[panelId] ||
    (el.classList.contains("comm-pos-panel") ? { w: 200, h: 120 } : null);
  if (!dock) return null;
  return {
    top: Math.max(4, r.top - pad),
    left: Math.max(4, r.left - pad),
    width: dock.w + pad * 2,
    height: dock.h + pad * 2,
  };
}

/** Panel shell + immediate children + known overflow mounts (no full-tree walk). */
function rectForPanelShell(el: HTMLElement, pad: number): SpotlightRect | null {
  const base = rectForElement(el, pad);
  if (!base) return rectForEmptyPanelDock(el, pad);
  let top = base.top + pad;
  let left = base.left + pad;
  let right = left + base.width - pad * 2;
  let bottom = top + base.height - pad * 2;

  // Absolute/overflow content that sits outside the shell box-sizing footprint.
  const mounts = el.querySelectorAll(
    [
      "#bottomleftcorner",
      ".comm-bag-mount",
      ".CodeMirror",
      ".ecu-command-editor",
      ".comm-fx-overlay",
      ".comm-fx-row",
      ".comm-info-dialog-slot",
    ].join(", "),
  );
  for (let i = 0; i < mounts.length; i++) {
    const r = (mounts[i] as HTMLElement).getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    top = Math.min(top, r.top);
    left = Math.min(left, r.left);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  }
  return {
    top: Math.max(4, top - pad),
    left: Math.max(4, left - pad),
    width: right - left + pad * 2,
    height: bottom - top + pad * 2,
  };
}

function clampCardPos(
  top: number,
  left: number,
  cardW: number,
  cardH: number,
  vw: number,
  vh: number,
): { top: number; left: number } {
  const w = Math.min(cardW, vw - 24);
  const h = Math.min(cardH, vh - 24);
  return {
    top: Math.max(12, Math.min(top, vh - h - 12)),
    left: Math.max(12, Math.min(left, vw - w - 12)),
  };
}

function overlaps(a: Box, b: Box, gap = 12): boolean {
  return !(
    a.left + a.width + gap <= b.left ||
    b.left + b.width + gap <= a.left ||
    a.top + a.height + gap <= b.top ||
    b.top + b.height + gap <= a.top
  );
}

/** Four dim panels around spotlight — hole stays click-through. */
export function shadePanels(
  spot: SpotlightRect | null,
  vw: number,
  vh: number,
): Box[] {
  if (!spot) {
    return [{ top: 0, left: 0, width: vw, height: vh }];
  }
  const out: Box[] = [];
  if (spot.top > 0) {
    out.push({ top: 0, left: 0, width: vw, height: spot.top });
  }
  const bottomY = spot.top + spot.height;
  if (bottomY < vh) {
    out.push({ top: bottomY, left: 0, width: vw, height: vh - bottomY });
  }
  if (spot.left > 0) {
    out.push({
      top: spot.top,
      left: 0,
      width: spot.left,
      height: spot.height,
    });
  }
  const rightX = spot.left + spot.width;
  if (rightX < vw) {
    out.push({
      top: spot.top,
      left: rightX,
      width: vw - rightX,
      height: spot.height,
    });
  }
  return out;
}

/** Place callout near spotlight without covering it. */
export function cardPosition(
  spot: SpotlightRect | null,
  cardW = 460,
  cardH = 240,
  placement: CardPlacement = "auto",
): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const gap = 18;
  const effectiveW = Math.min(cardW, vw - 24);

  if (!spot || placement === "center") {
    return clampCardPos(
      Math.max(20, vh * 0.06),
      (vw - effectiveW) / 2,
      effectiveW,
      cardH,
      vw,
      vh,
    );
  }

  const spotRight = spot.left + spot.width;
  const spotBottom = spot.top + spot.height;
  const spotCx = spot.left + spot.width / 2;
  const spotCy = spot.top + spot.height / 2;

  const candidates: Array<{ top: number; left: number }> = [];

  if (placement === "above" || placement === "auto") {
    candidates.push(
      clampCardPos(
        spot.top - cardH - gap,
        spotRight - effectiveW,
        effectiveW,
        cardH,
        vw,
        vh,
      ),
      clampCardPos(
        spot.top - cardH - gap,
        spot.left,
        effectiveW,
        cardH,
        vw,
        vh,
      ),
      clampCardPos(
        spot.top - cardH - gap,
        spotCx - effectiveW / 2,
        effectiveW,
        cardH,
        vw,
        vh,
      ),
    );
  }
  if (placement === "below" || placement === "auto") {
    candidates.push(
      clampCardPos(
        spotBottom + gap,
        spotCx - effectiveW / 2,
        effectiveW,
        cardH,
        vw,
        vh,
      ),
    );
  }
  if (placement === "auto") {
    candidates.push(
      clampCardPos(
        spotCy - cardH / 2,
        spot.left - effectiveW - gap,
        effectiveW,
        cardH,
        vw,
        vh,
      ),
      clampCardPos(
        spotCy - cardH / 2,
        spotRight + gap,
        effectiveW,
        cardH,
        vw,
        vh,
      ),
    );
  }

  candidates.push(
    clampCardPos(
      Math.max(16, vh * 0.05),
      (vw - effectiveW) / 2,
      effectiveW,
      cardH,
      vw,
      vh,
    ),
  );

  const cardBox = (c: { top: number; left: number }): Box => ({
    top: c.top,
    left: c.left,
    width: effectiveW,
    height: cardH,
  });

  let best: { top: number; left: number } | null = null;
  let bestScore = Infinity;
  for (let i = 0; i < candidates.length; i++) {
    const box = cardBox(candidates[i]);
    if (overlaps(box, spot)) continue;
    const cardCx = box.left + box.width / 2;
    const cardCy = box.top + box.height / 2;
    let score = Math.hypot(cardCx - spotCx, cardCy - spotCy);
    if (spotCy > vh * 0.62 && box.top + box.height <= spot.top + 4) {
      score *= 0.55;
    }
    if (spotCy < vh * 0.38 && box.top >= spotBottom - 4) {
      score *= 0.55;
    }
    if (score < bestScore) {
      bestScore = score;
      best = candidates[i];
    }
  }
  return best || candidates[candidates.length - 1];
}

/** Dashed arrow from callout to spotlight when they are far apart. */
export function tourConnector(
  cardPos: { top: number; left: number },
  cardW: number,
  cardH: number,
  spot: SpotlightRect,
): ConnectorLine | null {
  const cardCx = cardPos.left + cardW / 2;
  const cardCy = cardPos.top + cardH / 2;
  const spotCx = spot.left + spot.width / 2;
  const spotCy = spot.top + spot.height / 2;
  const dist = Math.hypot(cardCx - spotCx, cardCy - spotCy);
  if (dist < 130) return null;

  const cardTop = cardPos.top;
  const cardBottom = cardPos.top + cardH;
  const cardLeft = cardPos.left;
  const cardRight = cardPos.left + cardW;
  const spotTop = spot.top;
  const spotBottom = spot.top + spot.height;
  const spotLeft = spot.left;
  const spotRight = spot.left + spot.width;

  if (cardBottom <= spotTop + 6) {
    return { x1: cardCx, y1: cardBottom, x2: spotCx, y2: spotTop };
  }
  if (cardTop >= spotBottom - 6) {
    return { x1: cardCx, y1: cardTop, x2: spotCx, y2: spotBottom };
  }
  if (cardRight <= spotLeft + 6) {
    return { x1: cardRight, y1: cardCy, x2: spotLeft, y2: spotCy };
  }
  if (cardLeft >= spotRight - 6) {
    return { x1: cardLeft, y1: cardCy, x2: spotRight, y2: spotCy };
  }
  return { x1: cardCx, y1: cardBottom, x2: spotCx, y2: spotTop };
}
