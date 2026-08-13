/**
 * Meter shell group/resize: live DOM paint + frame/pos commit.
 */

import { clampMeterFrame, METER_FRAME_DEFAULT } from "../../lib/frameSizes";
import {
  getLayoutFreePlacement,
  getLayoutGridStep,
} from "../../lib/layoutEditPrefs";
import { beginLayoutGuide, endLayoutGuide } from "../../lib/layoutGuide";
import type { LayoutAnchor, PanelPos } from "../../lib/layout";
import { snapFrameSizeToGrid } from "../../lib/layoutGrid";
import {
  nudgePosByPixels,
  shiftPosKeepTopEdge,
} from "../../lib/panelEdgeGroup";
import { layoutDragRoot } from "../../lib/percentDrag";
import type { MeterInstance } from "../../meters/meterTypes";

type FrameSize = { frameW: number; frameH: number };

function sizeFrame(w: number, h: number, freeForm: boolean): FrameSize {
  const root = layoutDragRoot().getBoundingClientRect();
  const maxW = root.width > 0 ? root.width : window.innerWidth;
  const maxH = root.height > 0 ? root.height : window.innerHeight;
  if (freeForm || getLayoutFreePlacement()) {
    return clampMeterFrame(w, h, maxW, maxH);
  }
  const snapped = snapFrameSizeToGrid(
    w,
    h,
    getLayoutGridStep(),
    root.width,
    root.height,
  );
  return clampMeterFrame(snapped.w, snapped.h, maxW, maxH);
}

export type MeterShellResizeArgs = {
  instance: MeterInstance;
  /** Peer instances in the snap group (ids + anchors for live flush). */
  resizeGroupPeers?: Array<{ id: string; anchor?: LayoutAnchor }>;
  onPatchInstance: (partial: {
    frameW: number;
    frameH: number;
    pos: PanelPos;
  }) => void;
};

/** Screen-px shift so the fixed corner stays put for this anchor + handle. */
function liveShiftX(
  corner: "br" | "bl",
  anchor: LayoutAnchor,
  startW: number,
  w: number,
): number {
  const dw = startW - w; // >0 when shrinking
  if (corner === "bl") {
    // Keep right edge fixed.
    if (anchor === "tr" || anchor === "br") return 0;
    if (anchor === "tc" || anchor === "bc" || anchor === "center") {
      return dw / 2;
    }
    return dw;
  }
  // br: keep left edge fixed.
  if (anchor === "tl" || anchor === "bl") return 0;
  if (anchor === "tc" || anchor === "bc" || anchor === "center") {
    return -dw / 2;
  }
  // tr / br — width change moves left; push back.
  return -dw;
}

/** Live margin shift to keep left edge fixed when width changes. */
function peerShiftX(anchor: LayoutAnchor, oldW: number, newW: number): number {
  const dW = newW - oldW;
  if (!dW) return 0;
  if (anchor === "tl" || anchor === "bl") return 0;
  if (anchor === "tc" || anchor === "bc" || anchor === "center") return dW / 2;
  return dW;
}

/** Live margin shift to keep top edge fixed when height changes. */
function peerShiftY(anchor: LayoutAnchor, oldH: number, newH: number): number {
  const dH = newH - oldH;
  if (!dH) return 0;
  if (anchor === "tl" || anchor === "tr" || anchor === "tc") return 0;
  if (anchor === "center") return dH / 2;
  return dH;
}

function escapePanelId(id: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(id);
  }
  return id.replace(/([^a-zA-Z0-9_-])/g, "\\$1");
}

type PeerLive = {
  id: string;
  el: HTMLElement;
  startW: number;
  startH: number;
  anchor: LayoutAnchor;
};

/**
 * Pointer-down on a meter resize handle. Owns live peer paint + final patch.
 */
export function beginMeterShellResize(
  ev: any,
  corner: "br" | "bl",
  args: MeterShellResizeArgs,
): void {
  ev.preventDefault();
  ev.stopPropagation();
  const { instance, onPatchInstance } = args;
  const startX = ev.clientX;
  const startY = ev.clientY;
  const startW = instance.frameW || METER_FRAME_DEFAULT.w;
  const startH = instance.frameH || METER_FRAME_DEFAULT.h;
  const target = ev.currentTarget as HTMLElement;
  const shell = target.closest(".ecu-meter-shell") as HTMLElement | null;
  const outer = shell
    ? (shell.closest(".comm-pos-panel") as HTMLElement | null)
    : null;
  if (!outer) return;
  const root = layoutDragRoot();
  const rootRect = root.getBoundingClientRect();
  const anchor = (instance.pos.anchor || "tl") as LayoutAnchor;
  // Details StartSizing(bottomleft|bottomright): keep opposite top corner fixed.
  // Do not clear transform (scale/anchor) — that caused the release jump.
  if (shell) shell.classList.add("is-resizing");
  beginLayoutGuide();
  const pointerId = ev.pointerId;
  try {
    target.setPointerCapture(pointerId);
  } catch {
    /* ignore */
  }
  let pending = sizeFrame(startW, startH, !!ev.shiftKey);
  const shareH =
    !!instance.horizontalSnap ||
    !!(instance.snap && (instance.snap[1] || instance.snap[3]));
  const shareW =
    !!instance.verticalSnap ||
    !!(instance.snap && (instance.snap[2] || instance.snap[4]));
  const peerMeta = args.resizeGroupPeers || [];
  const peers: PeerLive[] = [];
  for (let i = 0; i < peerMeta.length; i++) {
    const meta = peerMeta[i];
    const pel = document.querySelector(
      `.comm-pos-panel.comm-pos-${escapePanelId(meta.id)}`,
    ) as HTMLElement | null;
    if (!pel) continue;
    peers.push({
      id: meta.id,
      el: pel,
      startW: Math.round(pel.offsetWidth) || startW,
      startH: Math.round(pel.offsetHeight) || startH,
      anchor: (meta.anchor || "tl") as LayoutAnchor,
    });
  }

  const clearPeerLive = () => {
    for (let i = 0; i < peers.length; i++) {
      peers[i].el.style.width = "";
      peers[i].el.style.height = "";
      peers[i].el.style.marginLeft = "";
      peers[i].el.style.marginTop = "";
    }
  };

  const applyLiveBox = (w: number, h: number) => {
    outer.style.width = w + "px";
    outer.style.height = h + "px";
    const sx = liveShiftX(corner, anchor, startW, w);
    outer.style.marginLeft = sx ? sx + "px" : "";
    for (let i = 0; i < peers.length; i++) {
      const peer = peers[i];
      if (shareW) {
        peer.el.style.width = w + "px";
        const peerSx = peerShiftX(peer.anchor, peer.startW, w);
        peer.el.style.marginLeft = peerSx ? peerSx + "px" : "";
      }
      if (shareH) {
        peer.el.style.height = h + "px";
        const peerSy = peerShiftY(peer.anchor, peer.startH, h);
        peer.el.style.marginTop = peerSy ? peerSy + "px" : "";
      }
    }
  };
  const onMove = (e: PointerEvent) => {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const w = corner === "br" ? startW + dx : startW - dx;
    pending = sizeFrame(w, startH + dy, !!e.shiftKey);
    applyLiveBox(pending.frameW, pending.frameH);
  };
  const onUp = () => {
    if (shell) shell.classList.remove("is-resizing");
    endLayoutGuide();
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    try {
      target.releasePointerCapture(pointerId);
    } catch {
      /* ignore */
    }
    outer.style.marginLeft = "";
    clearPeerLive();
    const rw = Math.max(1, rootRect.width);
    const rh = Math.max(1, rootRect.height);
    let nextPos = { ...instance.pos };
    const shiftX = liveShiftX(corner, anchor, startW, pending.frameW);
    if (shiftX !== 0) {
      nextPos = nudgePosByPixels(nextPos, shiftX, 0, rw, rh);
    }
    if (pending.frameH !== startH) {
      nextPos = shiftPosKeepTopEdge(nextPos, startH, pending.frameH, rw, rh);
    }
    onPatchInstance({
      frameW: pending.frameW,
      frameH: pending.frameH,
      pos: nextPos,
    });
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
}
