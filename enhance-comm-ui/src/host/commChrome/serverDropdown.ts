import { ensureChromeShell } from "./chromeActions";
import { pingBlockHtml, readPingSamples, syncServerPingHud } from "./pingHud";
import { esc } from "./types";

const DOC_BOUND = "__ecuCommServerDdDocBound";

let slCache = "-1";
let slListCache = "-1";

export function closeServerDd(): void {
  const nodes = document.querySelectorAll(".ecu-server-dd");
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].classList.remove("is-open");
    nodes[i].setAttribute("aria-expanded", "false");
  }
}

export function isServerDdOpen(): boolean {
  return !!document.querySelector(".ecu-server-dd.is-open");
}

export function toggleServerDd(event?: any): void {
  if (event) {
    if (event.preventDefault) event.preventDefault();
    if (event.stopPropagation) event.stopPropagation();
    if (typeof window.btc === "function") window.btc(event);
  }
  const root =
    (event &&
      event.currentTarget &&
      event.currentTarget.closest &&
      event.currentTarget.closest(".ecu-server-dd")) ||
    document.querySelector(".ecu-server-dd");
  if (!root) return;
  const open = root.classList.contains("is-open");
  closeServerDd();
  if (!open) {
    root.classList.add("is-open");
    root.setAttribute("aria-expanded", "true");
  }
}

/**
 * Match stock /comm: set bare globals then init_socket().
 * window.server_address assignment is required so init_socket sees the value.
 */
export function selectServer(index: number | string): void {
  closeServerDd();
  const i = parseInt(String(index), 10);
  const servers = (window.X && window.X.servers) || [];
  if (!(i >= 0) || i >= servers.length) return;
  const server = servers[i];
  if (!server || !server.address) return;

  // Stock onclick: server_address="…"; server_path="…"; init_socket();
  (window as any).server_address = server.address;
  (window as any).server_path = server.path;
  if (typeof window.init_socket === "function") {
    window.init_socket();
  }
}

/**
 * Outside-click closes the menu. Esc is owned by the shared keyboard policy
 * (`host/keyboardPolicy.ts`) so we do not register a duplicate Escape handler.
 */
export function bindServerDdDoc(): void {
  if ((window as any)[DOC_BOUND]) return;
  (window as any)[DOC_BOUND] = true;
  // Bubble phase — avoid fighting option click in capture.
  document.addEventListener("click", (event) => {
    let t: any = event.target;
    if (t && t.nodeType === 3) t = t.parentNode;
    if (t && t.closest && t.closest(".ecu-server-dd")) return;
    closeServerDd();
  });
}

function onServerOptionClick(ev: Event): void {
  ev.preventDefault();
  ev.stopPropagation();
  const btn = ev.currentTarget as HTMLElement | null;
  if (!btn) return;
  const idx = btn.getAttribute("data-server-index");
  if (idx == null) return;
  selectServer(idx);
}

function onServerTriggerClick(ev: Event): void {
  toggleServerDd(ev);
}

function wireServerDdHandlers(root: Element): void {
  const trigger = root.querySelector(".ecu-server-dd-trigger");
  if (trigger) {
    trigger.addEventListener("click", onServerTriggerClick);
  }
  const opts = root.querySelectorAll(".ecu-server-dd-option");
  for (let i = 0; i < opts.length; i++) {
    opts[i].addEventListener("click", onServerOptionClick);
  }
}

export function renderServersHud(): void {
  ensureChromeShell();
  const servers = (window.X && window.X.servers) || [];
  let key = "";
  let listKey = "";
  let currentIndex = -1;
  for (let i = 0; i < servers.length; i++) {
    const server = servers[i];
    key += server.region + " " + server.name + " " + server.players + "|";
    listKey += server.region + " " + server.name + "|";
    if (
      window.server_region === server.region &&
      window.server_identifier === server.name
    ) {
      currentIndex = i;
    }
  }
  if (window.socket && currentIndex < 0) {
    key += "conn:" + window.server_region + " " + window.server_identifier;
  } else {
    key += "cur:" + currentIndex;
  }
  if (key === slCache) return;

  let triggerName = "Select server…";
  let triggerPlayers = "";
  let triggerPlayersTitle = "Players online";
  if (currentIndex >= 0 && servers[currentIndex]) {
    triggerName =
      servers[currentIndex].region + " " + servers[currentIndex].name;
    triggerPlayers = String(servers[currentIndex].players);
    triggerPlayersTitle =
      triggerPlayers +
      " player" +
      (servers[currentIndex].players === 1 ? "" : "s") +
      " online";
  } else if (window.socket && window.server_region) {
    triggerName =
      window.server_region + " " + (window.server_identifier || "");
  }

  const pingSamples = readPingSamples();
  const existing = document.querySelector(".ecu-server-dd") as HTMLElement | null;
  if (
    existing &&
    listKey === slListCache &&
    existing.querySelectorAll(".ecu-server-dd-option").length === servers.length
  ) {
    slCache = key;
    const nameEl = existing.querySelector(".ecu-server-dd-name");
    const subEl = existing.querySelector(".ecu-server-dd-sub");
    if (nameEl) nameEl.textContent = triggerName;
    if (subEl) {
      subEl.textContent = triggerPlayers !== "" ? triggerPlayers : "—";
      subEl.setAttribute("title", triggerPlayersTitle);
    }
    const opts = existing.querySelectorAll(".ecu-server-dd-option");
    for (let i = 0; i < opts.length && i < servers.length; i++) {
      opts[i].classList.toggle("is-active", i === currentIndex);
      const p = opts[i].querySelector(".ecu-server-dd-option-players");
      if (p) {
        p.textContent = String(servers[i].players);
        p.setAttribute(
          "title",
          String(servers[i].players) +
            " player" +
            (servers[i].players === 1 ? "" : "s") +
            " online",
        );
      }
    }
    syncServerPingHud();
    return;
  }

  slCache = key;
  slListCache = listKey;
  const wasOpen = !!document.querySelector(".ecu-server-dd.is-open");

  let menuHtml = "";
  if (!servers.length) {
    menuHtml = "<div class='ecu-server-dd-empty'>No servers online</div>";
  } else {
    for (let i = 0; i < servers.length; i++) {
      const server = servers[i];
      const playersTitle =
        String(server.players) +
        " player" +
        (server.players === 1 ? "" : "s") +
        " online";
      menuHtml +=
        "<button type='button' class='ecu-server-dd-option" +
        (i === currentIndex ? " is-active" : "") +
        "' data-server-index='" +
        i +
        "'>";
      menuHtml +=
        "<span class='ecu-server-dd-option-name'>" +
        esc(server.region + " " + server.name) +
        "</span>";
      menuHtml +=
        "<span class='ecu-server-dd-option-players' title='" +
        esc(playersTitle) +
        "'>" +
        esc(String(server.players)) +
        "</span>";
      menuHtml += "</button>";
    }
  }

  const html =
    "<div class='ecu-server-dd" +
    (wasOpen ? " is-open" : "") +
    "' aria-expanded='" +
    (wasOpen ? "true" : "false") +
    "'>" +
    "<button type='button' class='ecu-server-dd-trigger' aria-haspopup='listbox'>" +
    "<span class='ecu-server-dd-meta'>" +
    "<span class='ecu-server-dd-name'>" +
    esc(triggerName) +
    "</span>" +
    "<span class='ecu-server-dd-sub' title='" +
    esc(triggerPlayersTitle) +
    "'>" +
    esc(triggerPlayers !== "" ? triggerPlayers : "—") +
    "</span>" +
    "</span>" +
    pingBlockHtml(pingSamples) +
    "<span class='ecu-server-dd-chevron' aria-hidden='true'></span>" +
    "</button>" +
    "<div class='ecu-server-dd-menu' role='listbox'>" +
    menuHtml +
    "</div>" +
    "</div>";

  const targets = document.querySelectorAll(
    ".serversuic, .serversui.serversuic",
  );
  const applyTo = targets.length
    ? targets
    : document.querySelectorAll(".serversui");
  for (let i = 0; i < applyTo.length; i++) {
    applyTo[i].innerHTML = html;
    (applyTo[i] as HTMLElement).style.display = "flex";
    applyTo[i].classList.remove("hidden");
    const dd = applyTo[i].querySelector(".ecu-server-dd");
    if (dd) wireServerDdHandlers(dd);
  }
}
