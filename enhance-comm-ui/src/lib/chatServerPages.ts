/**
 * Phone chat server “pages” — ordered server conversation keys + step helpers.
 * Swipe language matches home pages (dir &lt; 0 previous, &gt; 0 next; clamp at ends).
 */

export type ServerChatLike = {
  key: string;
  type: string;
  server?: string;
};

/**
 * Ordered server chat keys. Prefer `serverOrderKeys` (e.g. `X.servers[].key`),
 * then append any leftover server conversations by key.
 */
export function listServerChatKeys(
  conversations: ReadonlyArray<ServerChatLike>,
  serverOrderKeys?: ReadonlyArray<string> | null,
): string[] {
  const byServer = new Map<string, string>();
  const orphans: string[] = [];
  for (let i = 0; i < conversations.length; i++) {
    const chat = conversations[i];
    if (!chat || chat.type !== "server") continue;
    const server = chat.server ? String(chat.server) : "";
    if (server) byServer.set(server, chat.key);
    else orphans.push(chat.key);
  }
  const out: string[] = [];
  const seen = new Set<string>();
  if (serverOrderKeys && serverOrderKeys.length) {
    for (let i = 0; i < serverOrderKeys.length; i++) {
      const server = String(serverOrderKeys[i] || "");
      if (!server) continue;
      const key = byServer.get(server);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(key);
    }
  }
  const remaining: string[] = [];
  byServer.forEach((key) => {
    if (!seen.has(key)) remaining.push(key);
  });
  for (let i = 0; i < orphans.length; i++) {
    if (!seen.has(orphans[i])) remaining.push(orphans[i]);
  }
  remaining.sort((a, b) => a.localeCompare(b));
  for (let i = 0; i < remaining.length; i++) out.push(remaining[i]);
  return out;
}

/** Index of active server key, or -1 when not on a server page. */
export function serverPageIndex(
  keys: ReadonlyArray<string>,
  activeKey: string | null | undefined,
): number {
  if (!activeKey) return -1;
  return keys.indexOf(activeKey);
}

/**
 * Next server chat key for swipe dir. When not on a server page, jump to
 * `fallbackKey` if present in keys, else the first key. Clamp at ends.
 */
export function stepServerPage(
  keys: ReadonlyArray<string>,
  activeKey: string | null | undefined,
  dir: number,
  fallbackKey?: string | null,
): string | null {
  if (!keys.length) return null;
  let idx = serverPageIndex(keys, activeKey);
  if (idx < 0) {
    if (fallbackKey) {
      const fb = keys.indexOf(fallbackKey);
      if (fb >= 0) return keys[fb];
    }
    return keys[0];
  }
  if (dir < 0) return idx > 0 ? keys[idx - 1] : keys[idx];
  if (dir > 0) return idx < keys.length - 1 ? keys[idx + 1] : keys[idx];
  return keys[idx];
}
