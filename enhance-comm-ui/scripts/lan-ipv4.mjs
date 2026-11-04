/**
 * Rank local IPv4s for phone / LAN install URLs.
 * Prefer home Wi‑Fi/Ethernet (192.168/10) over Tailscale CGNAT, Hyper-V, WSL.
 * Install QR only bakes loopback + RFC1918 — never Tailscale CGNAT.
 */

import { networkInterfaces } from "node:os";

/**
 * @param {string} address
 * @param {string} [ifaceName]
 * @returns {number} lower = better for same-Wi‑Fi phone install
 */
export function lanIpv4Rank(address, ifaceName) {
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
  // CGNAT (Tailscale default, carrier-grade)
  if (a === 100 && b >= 64 && b <= 127) return 900;
  // Link-local
  if (a === 169 && b === 254) return 950;
  // Typical home / office LAN — phones on Wi‑Fi can reach these
  if (a === 192 && b === 168) return 10;
  if (a === 10) return 20;
  // 172.16–31 often Hyper-V Default Switch even when name is odd
  if (a === 172 && b >= 16 && b <= 31) return 60;
  return 80;
}

/**
 * @param {string} host
 * @returns {boolean}
 */
export function isInstallQrHost(host) {
  const h = String(host || "")
    .trim()
    .toLowerCase();
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

/**
 * @returns {{ address: string, iface: string, rank: number }[]}
 */
export function listLanIpv4Candidates() {
  const nets = networkInterfaces();
  const out = [];
  for (const name of Object.keys(nets)) {
    const list = nets[name] || [];
    for (let i = 0; i < list.length; i++) {
      const net = list[i];
      if (!net) continue;
      const family = net.family;
      const v4 = family === "IPv4" || family === 4;
      if (!v4 || net.internal) continue;
      if (!net.address) continue;
      out.push({
        address: net.address,
        iface: name,
        rank: lanIpv4Rank(net.address, name),
      });
    }
  }
  out.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.address.localeCompare(b.address);
  });
  return out;
}

/** Best non-loopback IPv4 for phone install, or null. */
export function preferredLanIpv4() {
  const list = phoneInstallIpv4AddressesDetailed();
  return list.length ? list[0].address : null;
}

/**
 * RFC1918 hosts suitable for install QR (excludes Tailscale / virtual adapters).
 * @returns {{ address: string, iface: string, rank: number }[]}
 */
export function phoneInstallIpv4AddressesDetailed() {
  const list = listLanIpv4Candidates();
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (!isInstallQrHost(c.address)) continue;
    if (c.rank >= 100) continue;
    out.push(c);
  }
  return out;
}

/** @returns {string[]} */
export function phoneInstallIpv4Addresses() {
  const list = phoneInstallIpv4AddressesDetailed();
  const out = [];
  for (let i = 0; i < list.length; i++) out.push(list[i].address);
  return out;
}

/** All candidates (including VPN) — for server listen logs only. */
export function lanIpv4Addresses() {
  const list = listLanIpv4Candidates();
  const out = [];
  for (let i = 0; i < list.length; i++) out.push(list[i].address);
  return out;
}
