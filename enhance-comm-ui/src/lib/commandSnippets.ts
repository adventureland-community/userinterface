/**
 * Command snippet tree helpers + {{placeholder}} expansion for observer CODE.
 */

import {
  getCurrentMap,
  getObserving,
  getServerIdentifier,
  getServerRegion,
} from "../host/al";
import type { CommandSnippet } from "./settings";

export type CommandTemplateCtx = {
  name: string;
  map: string;
  server: string;
  region: string;
  id: string;
  x: string;
  y: string;
  target: string;
};

export type CommandFolderBucket = {
  key: string;
  label: string;
  items: CommandSnippet[];
};

export function readCommandTemplateCtx(): CommandTemplateCtx {
  const obs = getObserving();
  const region = String(getServerRegion() || "");
  const ident = String(getServerIdentifier() || "");
  const server =
    region && ident ? region + ident : region || ident || "";
  const map = String(
    (obs && obs.map) || getCurrentMap() || "",
  );
  const targetRaw =
    obs && obs.target != null && String(obs.target) !== ""
      ? String(obs.target)
      : "";
  const x =
    obs && (obs.real_x != null || obs.x != null)
      ? String(Math.round(Number(obs.real_x ?? obs.x) || 0))
      : "";
  const y =
    obs && (obs.real_y != null || obs.y != null)
      ? String(Math.round(Number(obs.real_y ?? obs.y) || 0))
      : "";
  return {
    name: obs && obs.name ? String(obs.name) : "",
    map,
    server,
    region,
    id: obs && obs.id != null ? String(obs.id) : "",
    x,
    y,
    target: targetRaw,
  };
}

/** Replace {{name}}, {{map}}, {{server}}, {{region}}, {{id}}, {{x}}, {{y}}, {{target}}. */
export function expandCommandTemplate(
  code: string,
  ctx?: CommandTemplateCtx | null,
): string {
  const c = ctx || readCommandTemplateCtx();
  return String(code || "").replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (_m, key) => {
    const k = String(key || "").toLowerCase();
    if (k === "name") return c.name;
    if (k === "map") return c.map;
    if (k === "server") return c.server;
    if (k === "region") return c.region;
    if (k === "id") return c.id;
    if (k === "x") return c.x;
    if (k === "y") return c.y;
    if (k === "target") return c.target;
    return "";
  });
}

function sortSnips(list: CommandSnippet[]): CommandSnippet[] {
  const out = list.slice();
  out.sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return out;
}

/**
 * Folder tree for the side panel. Pinned snippets get a top "Pinned" bucket
 * (also still appear under their folder when they have one? — only top to avoid dup).
 */
export function buildSnippetTree(
  snippets: CommandSnippet[],
  query: string,
): CommandFolderBucket[] {
  const q = query.trim().toLowerCase();
  const byFolder: Record<string, CommandSnippet[]> = Object.create(null);
  const root: CommandSnippet[] = [];
  const pinned: CommandSnippet[] = [];

  for (let i = 0; i < snippets.length; i++) {
    const snip = snippets[i];
    if (q) {
      const hay =
        `${snip.name} ${snip.code} ${snip.folder || ""}`.toLowerCase();
      if (hay.indexOf(q) < 0) continue;
    }
    if (snip.pinned) {
      pinned.push(snip);
      continue;
    }
    const folder = String(snip.folder || "").trim();
    if (!folder) {
      root.push(snip);
      continue;
    }
    if (!byFolder[folder]) byFolder[folder] = [];
    byFolder[folder].push(snip);
  }

  const keys = Object.keys(byFolder);
  keys.sort((a, b) => a.localeCompare(b));
  const out: CommandFolderBucket[] = [];
  if (pinned.length) {
    out.push({ key: "__pinned__", label: "Pinned", items: sortSnips(pinned) });
  }
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    out.push({ key, label: key, items: sortSnips(byFolder[key]) });
  }
  if (root.length) {
    out.push({
      key: "__none__",
      label: keys.length || pinned.length ? "Ungrouped" : "Snippets",
      items: sortSnips(root),
    });
  }
  return out;
}

/** Visible snippet rows in tree order (skips collapsed folders unless searching). */
export function flattenVisibleSnippets(
  tree: CommandFolderBucket[],
  collapsed: Record<string, boolean>,
  searching: boolean,
): CommandSnippet[] {
  const out: CommandSnippet[] = [];
  for (let f = 0; f < tree.length; f++) {
    const bucket = tree[f];
    const isOpen = searching ? true : !collapsed[bucket.key];
    if (!isOpen) continue;
    for (let i = 0; i < bucket.items.length; i++) {
      out.push(bucket.items[i]);
    }
  }
  return out;
}

export function findSnippetById(
  snippets: CommandSnippet[],
  id: string | null | undefined,
): CommandSnippet | null {
  if (!id) return null;
  for (let i = 0; i < snippets.length; i++) {
    if (snippets[i].id === id) return snippets[i];
  }
  return null;
}
