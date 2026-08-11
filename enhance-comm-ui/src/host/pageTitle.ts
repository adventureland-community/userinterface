/**
 * Keep the browser tab title useful on /comm (stock stays "Adventure Land").
 * Prefer observe target first so multi-tab setups are scannable.
 */
import {
  getMapName,
  getObserving,
  getServerIdentifier,
  getServerRegion,
} from "./al";
import { subscribeTick } from "../tick";

const BRAND = "Adventure Land";

let installed = false;
let lastTitle: string | null = null;

function serverLabel(): string {
  const region = getServerRegion() || "";
  const ident = getServerIdentifier() || "";
  return `${region} ${ident}`.trim();
}

/** Build tab title from current observe / realm state. */
export function formatCommPageTitle(): string {
  const parts: string[] = [];
  const obs = getObserving();
  const name = obs && obs.name != null ? String(obs.name) : "";

  if (name) {
    const dead = !!(obs && obs.dead);
    parts.push(dead ? `${name} (RIP)` : name);
  } else {
    parts.push("Comm");
  }

  const map = getMapName();
  if (map) parts.push(map);

  const server = serverLabel();
  if (server) parts.push(server);

  return `${parts.join(" · ")} | ${BRAND}`;
}

function applyPageTitle(): void {
  const next = formatCommPageTitle();
  if (next === lastTitle) return;
  lastTitle = next;
  if (document.title !== next) document.title = next;
}

/** Start updating document.title from the shared game tick. */
export function installPageTitle(): void {
  if (installed) return;
  installed = true;
  applyPageTitle();
  subscribeTick(() => applyPageTitle());
}
