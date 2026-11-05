/**
 * Per-character lucky inventory slot for upgrade.
 * Community practice: swap the upgrade target into a preferred bag index first.
 */

const STORAGE_KEY = "al-comm-ui-lucky-upgrade-v1";

/** Default bag size when character.items is unavailable. */
export const LUCKY_SLOT_MAX_DEFAULT = 41;

export type LuckyUpgradePref = {
  /** Swap the upgrade target into `slot` before upgrade. */
  enabled: boolean;
  /** Inventory index (0-based). */
  slot: number;
};

export type LuckyUpgradeStore = Record<string, LuckyUpgradePref>;

export function normalizeLuckySlot(
  raw: unknown,
  maxSlot: number = LUCKY_SLOT_MAX_DEFAULT,
): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 0;
  const slot = Math.floor(n);
  if (slot < 0) return 0;
  const max = Math.max(0, maxSlot | 0);
  return slot > max ? max : slot;
}

export function normalizeLuckyUpgradePref(raw: unknown): LuckyUpgradePref {
  if (!raw || typeof raw !== "object") {
    return { enabled: false, slot: 0 };
  }
  const o = raw as Record<string, unknown>;
  return {
    enabled: !!o.enabled,
    slot: normalizeLuckySlot(o.slot),
  };
}

/** Character key for prefs — observing name, else local character name. */
export function luckyUpgradeCharKey(): string | null {
  try {
    const obs = window.observing as { name?: unknown } | null | undefined;
    const obsName =
      obs && obs.name != null ? String(obs.name).trim() : "";
    if (obsName) return obsName;
    const ch = window.character as { name?: unknown } | null | undefined;
    const chName = ch && ch.name != null ? String(ch.name).trim() : "";
    return chName || null;
  } catch {
    return null;
  }
}

function readStore(): LuckyUpgradeStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return Object.create(null);
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return Object.create(null);
    }
    const out: LuckyUpgradeStore = Object.create(null);
    const keys = Object.keys(parsed as Record<string, unknown>);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      out[k] = normalizeLuckyUpgradePref(
        (parsed as Record<string, unknown>)[k],
      );
    }
    return out;
  } catch {
    return Object.create(null);
  }
}

function writeStore(store: LuckyUpgradeStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota / private mode */
  }
}

export function getLuckyUpgradePref(
  charKey?: string | null,
): LuckyUpgradePref {
  const key =
    charKey != null && String(charKey).trim()
      ? String(charKey).trim()
      : luckyUpgradeCharKey();
  if (!key) return { enabled: false, slot: 0 };
  const store = readStore();
  return store[key]
    ? normalizeLuckyUpgradePref(store[key])
    : { enabled: false, slot: 0 };
}

export function setLuckyUpgradePref(
  partial: Partial<LuckyUpgradePref>,
  charKey?: string | null,
): LuckyUpgradePref {
  const key =
    charKey != null && String(charKey).trim()
      ? String(charKey).trim()
      : luckyUpgradeCharKey();
  if (!key) {
    return normalizeLuckyUpgradePref({
      enabled: !!partial.enabled,
      slot: partial.slot,
    });
  }
  const prev = getLuckyUpgradePref(key);
  const next = normalizeLuckyUpgradePref({
    enabled: partial.enabled != null ? partial.enabled : prev.enabled,
    slot: partial.slot != null ? partial.slot : prev.slot,
  });
  const store = readStore();
  store[key] = next;
  writeStore(store);
  return next;
}

/**
 * Slot to swap into for upgrade scripts, or null when lucky upgrade is off.
 */
export function resolveLuckySlotForShrine(
  charKey?: string | null,
): number | null {
  const pref = getLuckyUpgradePref(charKey);
  if (!pref.enabled) return null;
  return normalizeLuckySlot(pref.slot);
}
