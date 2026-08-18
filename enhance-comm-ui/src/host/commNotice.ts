/**
 * /comm has no #gamelog. Signs, notes, and similar world text render here.
 */

export type CommNotice = {
  title: string;
  body: string;
};

const CSS = `
.ecu-comm-hover {
  position: fixed;
  z-index: 100001;
  max-width: 280px;
  padding: 8px 10px;
  background: #161616;
  border: 1px solid #888;
  color: #f2e6c4;
  font-size: 16px;
  line-height: 1.35;
  font-family: "Segoe UI", Tahoma, Arial, sans-serif;
  pointer-events: none;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
}
.ecu-comm-notice {
  position: fixed;
  inset: 0;
  z-index: 100002;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 16px 88px;
  background: rgba(0, 0, 0, 0.25);
}
.ecu-comm-notice-card {
  max-width: 420px;
  width: 100%;
  background: #1a1712;
  border: 1px solid #c4a574;
  color: #f4ead2;
  padding: 16px 18px 14px;
  font-family: "Segoe UI", Tahoma, Arial, sans-serif;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.55);
}
.ecu-comm-notice-title {
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #c4a574;
  margin-bottom: 8px;
}
.ecu-comm-notice-body {
  font-size: 18px;
  line-height: 1.4;
  white-space: pre-wrap;
}
`;

let cssInjected = false;
let hoverEl: HTMLElement | null = null;
let noticeEl: HTMLElement | null = null;

function canUseDom(): boolean {
  return typeof document !== "undefined" && !!document.body;
}

function ensureCss(): void {
  if (cssInjected || !canUseDom()) return;
  cssInjected = true;
  const existing = document.querySelector(
    "style[data-ecu-comm-notice-css]",
  ) as HTMLStyleElement | null;
  if (existing) {
    existing.textContent = CSS;
    return;
  }
  const el = document.createElement("style");
  el.setAttribute("data-ecu-comm-notice-css", "1");
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function hideCommHover(): void {
  if (!hoverEl) return;
  hoverEl.remove();
  hoverEl = null;
}

export function showCommHover(
  text: string,
  clientX: number,
  clientY: number,
): void {
  if (!canUseDom() || !text) {
    hideCommHover();
    return;
  }
  ensureCss();
  if (!hoverEl) {
    hoverEl = document.createElement("div");
    hoverEl.className = "ecu-comm-hover";
    document.body.appendChild(hoverEl);
  }
  hoverEl.textContent = text;
  const left = Math.min(clientX + 14, window.innerWidth - 300);
  const top = Math.max(8, clientY - 36);
  hoverEl.style.left = `${Math.max(8, left)}px`;
  hoverEl.style.top = `${top}px`;
}

export function hideCommNotice(): void {
  if (!noticeEl) return;
  noticeEl.remove();
  noticeEl = null;
}

export function showCommNotice(notice: CommNotice): void {
  if (!canUseDom()) return;
  ensureCss();
  hideCommHover();
  hideCommNotice();
  noticeEl = document.createElement("div");
  noticeEl.className = "ecu-comm-notice";
  noticeEl.addEventListener("click", (ev) => {
    if (ev.target === noticeEl) hideCommNotice();
  });
  const card = document.createElement("div");
  card.className = "ecu-comm-notice-card";
  const title = document.createElement("div");
  title.className = "ecu-comm-notice-title";
  title.textContent = notice.title;
  const body = document.createElement("div");
  body.className = "ecu-comm-notice-body";
  body.textContent = notice.body;
  card.appendChild(title);
  card.appendChild(body);
  noticeEl.appendChild(card);
  document.body.appendChild(noticeEl);
}

/** Test helper. */
export function resetCommNoticeDom(): void {
  hideCommHover();
  hideCommNotice();
}
