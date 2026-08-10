import {
  currentServerKey,
  ensureChromeShell,
  isCharOnCurrentServer,
  syncActionsEnabled,
} from "./chromeActions";
import { esc } from "./types";

let rcCache = "-1";
let rcListCache = "-1";

/** Invalidate chip render cache (e.g. when observing changes). */
export function invalidateCharacterCache(): void {
  rcCache = "-1";
}

export function renderCharactersHud(): void {
  ensureChromeShell();
  const chars = (window.X && window.X.characters) || [];
  const curKey = currentServerKey();
  let key = "cur:" + curKey + "|";
  let listKey = "cur:" + curKey + "|";
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    key +=
      c.name +
      " " +
      c.level +
      " " +
      c.server +
      " " +
      c.rip +
      " " +
      c.skin +
      " " +
      c.online +
      "|";
    listKey += c.name + " " + c.online + " " + c.server + "|";
  }
  const obsName = window.observing && window.observing.name;
  if (obsName) key += "obs:" + obsName;
  if (key === rcCache) {
    syncActionsEnabled();
    return;
  }

  const root = document.querySelector(".charactersuic") as HTMLElement | null;
  if (
    root &&
    listKey === rcListCache &&
    root.querySelectorAll(".ecu-char").length
  ) {
    rcCache = key;
    const nodes = root.querySelectorAll(".ecu-char");
    for (let i = 0; i < nodes.length; i++) {
      const onclick = nodes[i].getAttribute("onclick") || "";
      const m =
        onclick.match(/__ecuToggleObserve\("([^"]+)"\)/) ||
        onclick.match(/observe_character\("([^"]+)"\)/);
      const fullName = m ? m[1] : "";
      const active = !!(obsName && obsName === fullName);
      nodes[i].classList.toggle("is-active", active);
      const prevTitle = nodes[i].getAttribute("title") || "";
      const baseTitle = prevTitle.replace(
        /\s*·\s*Click again to stop observing$/,
        "",
      );
      nodes[i].setAttribute(
        "title",
        active ? baseTitle + " · Click again to stop observing" : baseTitle,
      );
    }
    syncActionsEnabled();
    return;
  }

  rcCache = key;
  rcListCache = listKey;

  let html = "";
  const spriteFn = window.sprite;
  const serverUi = window.server_to_ui;
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    if (!char.online) continue;
    const active = !!(obsName && obsName === char.name);
    const serverLabel =
      typeof serverUi === "function"
        ? serverUi(char.server)
        : String(char.server || "");
    const offServer = !isCharOnCurrentServer(char) && !!serverLabel;
    // Show fuller names; chip max-width handles overflow.
    const shortName =
      char.name.length <= 16 ? char.name : char.name.substr(0, 15) + "…";
    const spriteHtml =
      typeof spriteFn === "function"
        ? spriteFn(char.skin || "", { cx: char.cx, rip: char.rip })
        : "";
    const title =
      esc(char.name) +
      " · Lv." +
      esc(String(char.level ?? "")) +
      " · " +
      esc(serverLabel) +
      (active ? " · Click again to stop observing" : "") +
      (offServer && !active ? " · Click to switch server & observe" : "");
    html +=
      "<button type='button' class='ecu-char" +
      (active ? " is-active" : "") +
      (offServer ? " is-off-server" : "") +
      "' title='" +
      title +
      "' onclick='if(window.bc&&bc(this)) return; (window.__ecuToggleObserve||observe_character)(\"" +
      esc(char.name) +
      "\");'>";
    html += "<span class='ecu-char-sprite'>" + spriteHtml + "</span>";
    html += "<span class='ecu-char-meta'>";
    html += "<span class='ecu-char-name'>" + esc(shortName) + "</span>";
    html += "<span class='ecu-char-sub'>";
    html += "Lv." + esc(String(char.level ?? ""));
    if (offServer) {
      html +=
        "<span class='ecu-char-server'>" + esc(serverLabel) + "</span>";
    }
    html += "</span>";
    html += "</span></button>";
  }
  if (!html) html = "<div class='ecu-empty'>No characters online</div>";

  const targets = document.querySelectorAll(".charactersuic");
  for (let i = 0; i < targets.length; i++) {
    targets[i].innerHTML = html;
  }
  syncActionsEnabled();
}
