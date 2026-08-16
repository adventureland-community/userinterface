/**
 * Minimal G.* subset for mockups — names/skins/positions from design/*.js.
 * Icons load from adventure.land CDN (same paths as live game).
 */
(function () {
  "use strict";

  const ASSET_ORIGIN = "https://adventure.land";

  /** @type {Record<string, { name: string; skin?: string }>} */
  const skills = {
    anger: { name: "Anger" },
    warpstomp: { name: "Warpstomp" },
    zap: { name: "Zap" },
    dampening_aura: { name: "Dampening", skin: "condition_neutral" },
    weakness_aura: { name: "Weakness", skin: "condition_bad" },
    mlight: { name: "Light", skin: "skill_light" },
    healing: { name: "Healing" },
  };

  /** @type {Record<string, { name: string; skin?: string; explosion?: number }>} */
  const monsters = {
    gpurplepro: { name: "Protector of Darkness" },
    gredpro: { name: "Protector of Fire" },
    ggreenpro: { name: "Protector of Nature" },
    gbluepro: { name: "Protector of Frost" },
    a1: { name: "Spike", explosion: 20 },
    a3: { name: "Lestat", explosion: 20 },
    a4: { name: "Orlok" },
    a5: { name: "Elena" },
    a7: { name: "Lucinda" },
    zapper0: { name: "Zapper" },
    nerfedbat: { name: "Bat", skin: "bat" },
  };

  /**
   * Subset of G.positions from design/dimensions.js
   * @type {Record<string, [string, number, number]>}
   */
  const positions = {
    skill_agitate: ["skills", 7, 1],
    skill_stomp: ["skills", 3, 1],
    condition_neutral: ["skills", 12, 9],
    condition_bad: ["skills", 13, 9],
    skill_light: ["skills", 0, 0],
    placeholder: ["custom", 3, 1],
  };

  /** @type {Record<string, { file: string; size: number; columns: number; rows: number }>} */
  const imagesets = {
    skills: {
      file: "/images/tiles/items/skills_20v6.png",
      size: 20,
      columns: 16,
      rows: 13,
    },
    custom: {
      file: "/images/tiles/items/custom.png?v=12",
      size: 20,
      columns: 7,
      rows: 9,
    },
  };

  /**
   * Monster sprite sheets from design/sprites.js (matrix cell → mtype)
   * @type {Record<string, { file: string; columns: number; rows: number; col: number; row: number; cellW: number; cellH: number }>}
   */
  const monsterSprites = {
    gpurplepro: {
      file: "/images/tiles/monsters/goblinos.png",
      columns: 4,
      rows: 2,
      col: 2,
      row: 1,
      sheetW: 312,
      sheetH: 144,
    },
    a4: {
      file: "/images/tiles/characters/chara3.png",
      columns: 6,
      rows: 8,
      col: 0,
      row: 0,
      cellW: 48,
      cellH: 72,
    },
    zapper0: {
      file: "/images/tiles/monsters/robots.png",
      columns: 4,
      rows: 2,
      col: 2,
      row: 0,
      sheetW: 312,
      sheetH: 144,
    },
  };

  window.MockGameData = {
    ASSET_ORIGIN,
    skills,
    monsters,
    positions,
    imagesets,
    monsterSprites,
    skillName(id) {
      return skills[id]?.name || id;
    },
    monsterName(mtype) {
      return monsters[mtype]?.name || mtype;
    },
    skillSkin(id) {
      const s = skills[id];
      if (s?.skin) return s.skin;
      return undefined;
    },
  };
})();
