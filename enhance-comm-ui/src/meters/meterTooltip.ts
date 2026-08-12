/**
 * Floating HTML tooltip — port of mock .tt host.
 * Positioned in viewport; flips / clamps so it never clips off-screen.
 */

const PAD = 8;
const CURSOR = 14;

let tipEl: HTMLDivElement | null = null;

function ensureTip(): HTMLDivElement {
  if (tipEl && tipEl.isConnected) return tipEl;
  tipEl = document.createElement("div");
  tipEl.className = "ecu-meter-tt";
  tipEl.style.display = "none";
  document.body.appendChild(tipEl);
  return tipEl;
}

function placeTip(tip: HTMLDivElement, clientX: number, clientY: number): void {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const rect = tip.getBoundingClientRect();
  const tw = Math.max(1, rect.width);
  const th = Math.max(1, rect.height);

  let x = clientX + CURSOR;
  let y = clientY + CURSOR;

  // Prefer below/right of cursor; flip if that would clip.
  if (x + tw > vw - PAD) x = clientX - tw - CURSOR;
  if (y + th > vh - PAD) y = clientY - th - CURSOR;

  x = Math.max(PAD, Math.min(vw - tw - PAD, x));
  y = Math.max(PAD, Math.min(vh - th - PAD, y));

  tip.style.left = Math.round(x) + "px";
  tip.style.top = Math.round(y) + "px";
}

export function showMeterTooltip(ev: MouseEvent, html: string): void {
  const tip = ensureTip();
  tip.innerHTML = html;
  tip.style.display = "block";
  // Measure off-screen first so width/height are real, then clamp.
  tip.style.left = "-9999px";
  tip.style.top = "0px";
  placeTip(tip, ev.clientX, ev.clientY);
}

export function hideMeterTooltip(): void {
  if (!tipEl) return;
  tipEl.style.display = "none";
}
