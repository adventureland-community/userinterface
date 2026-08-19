import { syncMailBadge } from "../mail/mailUnread";
import { openMail } from "../mail/mailSession";

/**
 * Leave observe mode: reconnect as pure spectator on the current server.
 * Stock observe_character(same name) only emits o:home — it does not clear watching.
 * Never assign window.character (Bag borrow must stay sync-only).
 */
export function clearObserve(): void {
  if (typeof window.init_socket !== "function") return;
  // Destroy+reconnect without secret → welcome has no data.character → observing stays null.
  window.init_socket({});
}

/**
 * Current realm key (`SR_EUI`, …) from `X.servers` + `server_region` /
 * `server_identifier`. Empty when not connected / unknown.
 */
export function currentServerKey(): string {
  const region = window.server_region;
  const ident = window.server_identifier;
  if (!region || !ident) return "";
  const servers = (window.X && window.X.servers) || [];
  for (let i = 0; i < servers.length; i++) {
    const s = servers[i];
    if (s.region === region && s.name === ident) {
      return s.key != null ? String(s.key) : "";
    }
  }
  return "";
}

/** True when `char.server` matches the realm we're currently on. */
export function isCharOnCurrentServer(char: { server?: string }): boolean {
  const key = currentServerKey();
  if (!key || char.server == null || char.server === "") return true;
  return String(char.server) === key;
}

/**
 * Switch to the character's realm (if needed) then observe — mirrors stock
 * `observe_character` (`server_address`/`path` + `init_socket({secret})`).
 * Clicking the active chip again clears watch (deselect).
 */
export function toggleObserve(name: string): void {
  const n = String(name || "");
  if (!n) return;
  const obs = window.observing;
  if (obs && obs.name === n) {
    clearObserve();
    return;
  }

  const chars = (window.X && window.X.characters) || [];
  let ch: (typeof chars)[number] | null = null;
  for (let i = 0; i < chars.length; i++) {
    if (chars[i].name === n) {
      ch = chars[i];
      break;
    }
  }

  // Stock path: finds server by key, sets address/path, init_socket({secret}).
  if (typeof window.observe_character === "function") {
    const ok = window.observe_character(n);
    if (ok !== false) return;
  }

  // Fallback when stock is missing or returned false (no secret / no server).
  if (!ch || !ch.secret || ch.server == null) return;
  const servers = (window.X && window.X.servers) || [];
  for (let j = 0; j < servers.length; j++) {
    const server = servers[j];
    if (server.key != null && String(server.key) === String(ch.server)) {
      if (!server.address) return;
      (window as any).server_address = server.address;
      (window as any).server_path = server.path;
      if (typeof window.init_socket === "function") {
        window.init_socket({ secret: ch.secret });
      }
      return;
    }
  }
}

function onFollowClick(ev: Event): void {
  ev.preventDefault();
  ev.stopPropagation();
  const sock = window.socket as { emit?: (e: string) => void } | undefined;
  if (sock && typeof sock.emit === "function") sock.emit("o:home");
}

function onBagClick(ev: Event): void {
  ev.preventDefault();
  ev.stopPropagation();
  const render = window.render_inventory;
  if (typeof render !== "function") return;
  if (typeof window.draw_trigger === "function") {
    window.draw_trigger(() => render());
  } else {
    render();
  }
}

function onCommandClick(ev: Event): void {
  ev.preventDefault();
  ev.stopPropagation();
  if (typeof window.show_commander === "function") {
    window.show_commander();
  }
}

function onMailClick(ev: Event): void {
  ev.preventDefault();
  ev.stopPropagation();
  const t = ev.target as HTMLElement | null;
  const onBadge = !!(t && t.closest && t.closest("[data-ecu-mail-badge]"));
  if (onBadge) {
    openMail({ focusNewestUnread: true });
    return;
  }
  openMail({ toggle: true });
}

/** Compact SVG icons for Follow / Bag / Command / Mail. */
const ACTION_ICONS: Record<"follow" | "bag" | "command" | "mail", string> = {
  follow:
    '<svg class="ecu-btn-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg>',
  bag: '<svg class="ecu-btn-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 8h12l1 12H5L6 8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter"/><path d="M9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  command:
    '<svg class="ecu-btn-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="4" width="18" height="16" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 9l3 3-3 3M12 15h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"/></svg>',
  mail: '<svg class="ecu-btn-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="5" width="18" height="14" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 7l9 7 9-7" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
};

export function buildActionsEl(): HTMLElement {
  const actions = document.createElement("div");
  actions.className = "ecu-actions";
  actions.setAttribute("data-ecu-actions", "1");
  actions.setAttribute("data-ecu-tour", "chrome-actions");

  const mk = (
    kind: "follow" | "bag" | "command" | "mail",
    label: string,
    title: string,
    onClick: (ev: Event) => void,
  ) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ecu-btn ecu-btn-icon-only";
    btn.title = title;
    btn.setAttribute("aria-label", label);
    btn.setAttribute("data-ecu-tour", "btn-" + kind);
    if (kind === "mail") btn.setAttribute("data-ecu-mail", "1");
    btn.innerHTML = ACTION_ICONS[kind];
    if (kind === "mail") {
      const badge = document.createElement("span");
      badge.className = "ecu-mail-badge";
      badge.hidden = true;
      badge.setAttribute("data-ecu-mail-badge", "1");
      btn.appendChild(badge);
    }
    btn.addEventListener("click", onClick);
    return btn;
  };

  actions.append(
    mk("follow", "Follow", "Center on observed character", onFollowClick),
    mk("bag", "Bag", "Observed inventory", onBagClick),
    mk("mail", "Mail", "Account mail", onMailClick),
    mk(
      "command",
      "Command",
      "Send a command to the observed character",
      onCommandClick,
    ),
  );
  return actions;
}

function syncActionTourAttrs(actions: HTMLElement): void {
  const map: Record<string, string> = {
    Follow: "btn-follow",
    Bag: "btn-bag",
    Mail: "btn-mail",
    Command: "btn-command",
  };
  const buttons = actions.querySelectorAll(".ecu-btn");
  for (let i = 0; i < buttons.length; i++) {
    const btn = buttons[i] as HTMLElement;
    const label = (btn.getAttribute("aria-label") || "").trim();
    const tourId = map[label];
    if (tourId) btn.setAttribute("data-ecu-tour", tourId);
  }
}

export { syncMailBadge } from "../mail/mailUnread";

export function syncActionsEnabled(): void {
  const watching = !!(window.observing && window.observing.name);
  const actions = document.querySelector(".ecu-actions") as HTMLElement | null;
  if (!actions) return;
  syncActionTourAttrs(actions);
  syncMailBadge();
  const buttons = actions.querySelectorAll(".ecu-btn");
  for (let i = 0; i < buttons.length; i++) {
    const btn = buttons[i] as HTMLButtonElement;
    const label = (
      btn.getAttribute("aria-label") ||
      btn.textContent ||
      ""
    ).trim();
    // Bag/Command/Follow need an observed character; Mail works logged-in.
    const needsObs =
      label === "Follow" || label === "Bag" || label === "Command";
    if (needsObs) {
      btn.disabled = !watching;
      btn.classList.toggle("is-disabled", !watching);
    }
  }
}

export function ensureChromeShell(): void {
  const bottom = document.getElementById("bottom");
  if (!bottom) return;

  // Always keep stock observeui out of the way (game may .show() it).
  const observe = document.getElementById("observeui");
  if (observe) {
    observe.classList.add("hidden");
    observe.style.display = "none";
  }

  // Already on the stacked layout: [actions] over [chips | server].
  const existingStack = bottom.querySelector(
    ".ecu-chrome-stack",
  ) as HTMLElement | null;
  if (existingStack) {
    const chromeEl = existingStack.querySelector(
      ".ecu-chrome",
    ) as HTMLElement | null;
    const charsEl = bottom.querySelector(
      ".charactersuic",
    ) as HTMLElement | null;
    const serversEl =
      (bottom.querySelector(".serversuic") as HTMLElement | null) ||
      (bottom.querySelector(".serversui") as HTMLElement | null);
    if (chromeEl && charsEl && !chromeEl.contains(charsEl)) {
      chromeEl.insertBefore(charsEl, chromeEl.firstChild);
    }
    if (chromeEl && serversEl && !chromeEl.contains(serversEl)) {
      chromeEl.append(serversEl);
    }
    if (charsEl) charsEl.setAttribute("data-ecu-tour", "character-ui");
    if (serversEl) serversEl.setAttribute("data-ecu-tour", "server-picker");
    // Actions must sit above the strip, never inside it.
    let actionsEl: HTMLElement | null = null;
    for (let i = 0; i < existingStack.children.length; i++) {
      const child = existingStack.children[i] as HTMLElement;
      if (child.classList && child.classList.contains("ecu-actions")) {
        actionsEl = child;
        break;
      }
    }
    const nestedActions = chromeEl
      ? (chromeEl.querySelector(".ecu-actions") as HTMLElement | null)
      : null;
    if (nestedActions) nestedActions.remove();
    if (!actionsEl) {
      actionsEl = buildActionsEl();
      existingStack.insertBefore(actionsEl, existingStack.firstChild);
    } else if (!actionsEl.querySelector(".ecu-btn-icon-only")) {
      const next = buildActionsEl();
      actionsEl.replaceWith(next);
      actionsEl = next;
    }
    syncActionsEnabled();
    return;
  }

  const chars = bottom.querySelector(".charactersuic") as HTMLElement | null;
  const servers =
    (bottom.querySelector(".serversuic") as HTMLElement | null) ||
    (bottom.querySelector(".serversui") as HTMLElement | null);

  // Tear down legacy single-row chrome (actions were inlined in the strip).
  const legacyChrome = bottom.querySelector(".ecu-chrome");
  const legacyActions = bottom.querySelector(".ecu-actions");

  const stack = document.createElement("div");
  stack.className = "ecu-chrome-stack";

  const chrome = document.createElement("div");
  chrome.className = "ecu-chrome";

  // Primary strip: character chips | server▾ (actions live in the bar above).
  if (chars) {
    chars.classList.remove("hidden");
    chars.style.display = "flex";
    chars.setAttribute("data-ecu-tour", "character-ui");
    chrome.append(chars);
  }

  if (servers) {
    servers.classList.remove("hidden");
    servers.style.display = "flex";
    servers.setAttribute("data-ecu-tour", "server-picker");
    if (chars) {
      const sep = document.createElement("div");
      sep.className = "ecu-strip-sep";
      sep.setAttribute("aria-hidden", "true");
      chrome.append(sep);
    }
    chrome.append(servers);
  }

  if (legacyChrome) legacyChrome.remove();
  if (legacyActions) legacyActions.remove();

  stack.append(buildActionsEl(), chrome);
  bottom.insertBefore(stack, bottom.firstChild);
  syncActionsEnabled();
}
