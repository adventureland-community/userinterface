/**
 * Rank host IPs for phone / LAN install URLs (mirrors scripts/lan-ipv4.mjs).
 * Prefer 192.168 / 10.x over Tailscale CGNAT and Hyper-V ranges.
 */

/** Lower = better for same-Wi‑Fi phone install. */
export function lanIpv4Rank(address: string, ifaceName?: string): number {
  const name = String(ifaceName || "").toLowerCase();
  if (
    /tailscale|wsl|hyper-v|vethernet|docker|vbox|vmware|virtualbox|tun\b|tap\b|zerotier|wireguard|hamachi|nordlynx|mullvad/.test(
      name,
    )
  ) {
    return 1000;
  }
  const parts = String(address || "")
    .split(".")
    .map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return 999;
  const a = parts[0];
  const b = parts[1];
  if (a === 100 && b >= 64 && b <= 127) return 900;
  if (a === 169 && b === 254) return 950;
  if (a === 192 && b === 168) return 10;
  if (a === 10) return 20;
  if (a === 172 && b >= 16 && b <= 31) return 60;
  return 80;
}

/**
 * Hosts safe to show / bake for phone install QR.
 * Loopback + RFC1918 only — never Tailscale CGNAT (100.64/10) or link-local.
 */
export function isInstallQrHost(host: string): boolean {
  const h = String(host || "").trim().toLowerCase();
  if (h === "127.0.0.1" || h === "localhost") return true;
  const parts = h.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return false;
  const a = parts[0];
  const b = parts[1];
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 192 && b === 168) return true;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

/** Extract host from `http://host:port` or bare IP. */
export function hostFromBase(base: string): string {
  const raw = String(base || "").replace(/\/$/, "");
  const m = /^https?:\/\/([^/:]+)/i.exec(raw);
  if (m) return m[1];
  return raw;
}

/** Phone DEV install path — full userscript (not the thin GM.xhr loader). */
export const ECU_LAN_INSTALL_PATH = "/enhance-comm-ui.user.js";

/**
 * Prefer the best phone-reachable base for LAN install.
 */
export function pickDevInstallUrlFromBases(
  bases: readonly string[],
  fallback: string,
): string {
  const urls = rankedDevInstallUrlsFromBases(bases);
  if (urls.length) return urls[0];
  return fallback;
}

/** Ranked install URLs for QR cards (RFC1918 + loopback; no Tailscale). */
export function rankedDevInstallUrlsFromBases(
  bases: readonly string[],
): string[] {
  type Cand = { url: string; rank: number };
  const cands: Cand[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < bases.length; i++) {
    const raw = String(bases[i] || "").replace(/\/$/, "");
    if (!raw) continue;
    const host = hostFromBase(raw);
    if (!isInstallQrHost(host)) continue;
    const url = `${raw}${ECU_LAN_INSTALL_PATH}`;
    if (seen.has(url)) continue;
    seen.add(url);
    const rank =
      host === "127.0.0.1" || host === "localhost"
        ? 500
        : lanIpv4Rank(host);
    // Drop virtual-adapter ranks when we somehow got them without iface name.
    if (rank >= 900) continue;
    cands.push({ url, rank });
  }
  cands.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.url.localeCompare(b.url);
  });
  const out: string[] = [];
  for (let i = 0; i < cands.length; i++) out.push(cands[i].url);
  return out;
}
