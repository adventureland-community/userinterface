import type { MailRow } from "./types";

export type MailToSuggestion = {
  name: string;
  group: "own" | "mail" | "nearby";
};

export type SuggestMailToOpts = {
  selfNames: string[];
  mails: MailRow[];
  visiblePlayers: string[];
};

/**
 * Ranked To suggestions: own chars → prior mail parties → visible players.
 */
export function suggestMailTo(
  query: string,
  opts: SuggestMailToOpts,
  exclude: string[] = [],
): MailToSuggestion[] {
  const q = String(query || "")
    .trim()
    .toLowerCase();
  const used = new Set<string>();
  for (let i = 0; i < exclude.length; i++) {
    used.add(String(exclude[i] || "").toLowerCase());
  }
  const out: MailToSuggestion[] = [];

  const push = (name: string, group: MailToSuggestion["group"]) => {
    const n = String(name || "").trim();
    if (!n) return;
    const key = n.toLowerCase();
    if (used.has(key)) return;
    if (q && !key.includes(q)) return;
    used.add(key);
    out.push({ name: n, group });
  };

  for (let i = 0; i < opts.selfNames.length; i++) {
    push(opts.selfNames[i], "own");
  }

  const mailSeen = new Map<string, string>();
  for (let i = 0; i < opts.mails.length; i++) {
    const m = opts.mails[i];
    for (const raw of [m.fro, m.to]) {
      const n = String(raw || "").trim();
      if (!n) continue;
      const key = n.toLowerCase();
      if (mailSeen.has(key)) continue;
      mailSeen.set(key, n);
    }
  }
  const selfLower = new Set(
    opts.selfNames.map((n) => String(n || "").toLowerCase()),
  );
  for (const [key, n] of mailSeen) {
    if (selfLower.has(key)) continue;
    push(n, "mail");
  }

  for (let i = 0; i < opts.visiblePlayers.length; i++) {
    push(opts.visiblePlayers[i], "nearby");
  }

  return out;
}
