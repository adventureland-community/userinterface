export function formatMailRelative(sent: string, now = Date.now()): string {
  const t = Date.parse(sent);
  if (!Number.isFinite(t)) return String(sent || "");
  const sec = Math.max(0, Math.floor((now - t) / 1000));
  if (sec < 60) return "just now";
  if (sec < 3600) return Math.floor(sec / 60) + "m ago";
  if (sec < 86400) return Math.floor(sec / 3600) + "h ago";
  if (sec < 86400 * 14) return Math.floor(sec / 86400) + "d ago";
  try {
    return new Date(t).toLocaleDateString();
  } catch {
    return String(sent);
  }
}

export function selfCharacterNames(): string[] {
  const out: string[] = [];
  const chars = (window.X && window.X.characters) || [];
  for (let i = 0; i < chars.length; i++) {
    const n = chars[i] && chars[i].name;
    if (n) out.push(String(n));
  }
  return out;
}

export function visiblePlayerNames(): string[] {
  const out: string[] = [];
  const raw = window.entities;
  if (!raw) return out;
  const list = Array.isArray(raw) ? raw : Object.values(raw);
  for (let i = 0; i < list.length; i++) {
    const ent = list[i] as { name?: string; player?: boolean; type?: string; npc?: boolean };
    if (!ent || !ent.name) continue;
    if (ent.npc) continue;
    if (ent.player || ent.type === "character") out.push(String(ent.name));
  }
  return out;
}
