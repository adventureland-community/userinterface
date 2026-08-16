/**
 * In-game icon rendering for mockups — mirrors comm gameIcon sheet crop + letter fallback.
 */
(function () {
  "use strict";

  const DATA = window.MockGameData;
  if (!DATA) return;

  function assetUrl(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    return DATA.ASSET_ORIGIN + path;
  }

  function escapeAttr(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  /**
   * @param {string} skin
   * @param {number} size
   * @param {string} [title]
   */
  function skinSheetHtml(skin, size, title) {
    const pos = DATA.positions[skin];
    if (!pos) return "";
    const setName = pos[0] || "pack_20";
    const pack = DATA.imagesets[setName];
    if (!pack) return "";
    const scale = size / pack.size;
    const sx = pos[1];
    const sy = pos[2];
    const w = pack.columns * pack.size * scale;
    const h = pack.rows * pack.size * scale;
    const tip = title ? ` title="${escapeAttr(title)}"` : "";
    return (
      `<span class="ecu-game-icon-sheet"${tip} style="width:${size}px;height:${size}px">` +
      `<img draggable="false" alt="" style="width:${w}px;height:${h}px;margin-top:-${sy * size}px;margin-left:-${sx * size}px" src="${assetUrl(pack.file)}" />` +
      `</span>`
    );
  }

  /**
   * @param {string} skillId
   * @param {number} [size]
   */
  function skillIconHtml(skillId, size) {
    const px = size || 20;
    const name = DATA.skillName(skillId);
    const skin = DATA.skillSkin(skillId);
    if (skin) {
      const sheet = skinSheetHtml(skin, px, name);
      if (sheet) return sheet;
    }
    const letter = (name || skillId).slice(0, 1).toUpperCase();
    return (
      `<span class="ecu-game-icon-letter" title="${escapeAttr(name)}" style="width:${px}px;height:${px}px;line-height:${px}px">` +
      `${escapeAttr(letter)}</span>`
    );
  }

  /**
   * @param {string} mtype
   * @param {number} [width]
   * @param {number} [height]
   */
  function monsterSpriteHtml(mtype, width, height) {
    const def = DATA.monsterSprites[mtype];
    const cellW = (def && (def.cellW || (def.sheetW && def.columns ? def.sheetW / def.columns : 0))) || 48;
    const cellH = (def && (def.cellH || (def.sheetH && def.rows ? def.sheetH / def.rows : 0))) || 72;
    const w = width || Math.round(cellW * 0.58);
    const h = height || Math.round(cellH * 0.58);
    const name = DATA.monsterName(mtype);
    if (!def) {
      return `<span class="ecu-game-icon-letter" style="width:${w}px;height:${h}px;line-height:${h}px" title="${escapeAttr(name)}">?</span>`;
    }
    const mx = def.col * cellW;
    const my = def.row * cellH;
    const sheetW = def.sheetW || def.columns * cellW;
    const sheetH = def.sheetH || def.rows * cellH;
    return (
      `<span class="ecu-game-icon-mob" title="${escapeAttr(name)}" style="width:${w}px;height:${h}px">` +
      `<img draggable="false" alt="" style="width:${sheetW}px;height:${sheetH}px;margin-left:-${mx}px;margin-top:-${my}px" src="${assetUrl(def.file)}" />` +
      `</span>`
    );
  }

  /** Upgrade static aura/mechanic chips with data-ability-id */
  function hydrateMechChips(root) {
    const scope = root || document;
    scope.querySelectorAll(".ecu-mech[data-ability-id]:not([data-live-ability])").forEach((el) => {
      const id = el.getAttribute("data-ability-id");
      if (!id) return;
      const suffix = el.getAttribute("data-mech-suffix") || "";
      const name = DATA.skillName(id);
      const icon = `<span class="ecu-mech__icon">${skillIconHtml(id, 14)}</span>`;
      el.innerHTML = `${icon}${name}${suffix ? ` · ${suffix}` : ""}`;
      el.title = name;
    });
  }

  /** Upgrade .ecu-abil-icon elements that declare data-skill-id */
  function hydrateAbilityIcons(root) {
    const scope = root || document;
    scope.querySelectorAll(".ecu-abil-icon[data-skill-id]").forEach((el) => {
      const id = el.getAttribute("data-skill-id");
      if (!id) return;
      el.innerHTML = skillIconHtml(id, Number(el.dataset.iconSize) || 20);
      el.title = `${DATA.skillName(id)} · ${el.title || ""}`.replace(/ · $/, "");
    });
    scope.querySelectorAll("[data-monster-sprite]").forEach((el) => {
      const mtype = el.getAttribute("data-monster-sprite");
      if (!mtype) return;
      const w = Number(el.dataset.spriteW) || undefined;
      const h = Number(el.dataset.spriteH) || undefined;
      if (w) el.style.width = `${w}px`;
      if (h) el.style.height = `${h}px`;
      el.innerHTML = monsterSpriteHtml(mtype, w, h);
    });
    hydrateMechChips(scope);
  }

  window.MockGameIcons = {
    skillIconHtml,
    monsterSpriteHtml,
    skinSheetHtml,
    hydrateAbilityIcons,
    hydrateMechChips,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => hydrateAbilityIcons(document));
  } else {
    hydrateAbilityIcons(document);
  }
})();
