/**
 * Sheet-crop item icons for market mockups (same math as gameIcon / item_container).
 * Expects window.MarketItemAssets from data/market-item-assets.json.
 */
(function () {
  "use strict";

  function assets() {
    return window.MarketItemAssets || null;
  }

  function assetUrl(path) {
    const a = assets();
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    return (a && a.ASSET_ORIGIN ? a.ASSET_ORIGIN : "https://adventure.land") + path;
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function itemDef(name) {
    const a = assets();
    return (a && a.items && a.items[name]) || null;
  }

  function titlePrefix(opts) {
    const p = opts && opts.p != null && opts.p !== "" ? String(opts.p) : "";
    if (!p) return "";
    const a = assets();
    const titled = a && a.titles && a.titles[p];
    if (titled && titled.title) return String(titled.title) + " ";
    return p.charAt(0).toUpperCase() + p.slice(1) + " ";
  }

  function itemLabel(name, opts) {
    const def = itemDef(name);
    let label = titlePrefix(opts) + ((def && def.name) || name);
    const level = opts && opts.level;
    if (level != null && level > 0) label += " +" + level;
    const st = opts && opts.stat_type ? String(opts.stat_type) : "";
    if (st) label += " (" + st + ")";
    return label;
  }

  function itemTitleKey(opts) {
    return opts && opts.p != null && opts.p !== "" ? String(opts.p) : "";
  }

  function itemTitleLabel(opts) {
    return titlePrefix(opts).trim();
  }

  function resolvePos(name, skin) {
    const a = assets();
    if (!a || !a.positions) return null;
    const key = skin || (itemDef(name) && itemDef(name).skin) || name;
    return a.positions[key] || a.positions[name] || null;
  }

  /**
   * @param {string} name item key
   * @param {{ size?: number, skin?: string, level?: number, q?: number, title?: string }} [opts]
   */
  function itemIconHtml(name, opts) {
    const size = (opts && opts.size) || 40;
    const tip = (opts && opts.title) || itemLabel(name, opts);
    const pos = resolvePos(name, opts && opts.skin);
    const a = assets();
    if (!pos || !a || !a.imagesets) {
      const letter = String(name || "?").slice(0, 1).toUpperCase();
      return (
        `<span class="ecu-game-icon-letter" title="${esc(tip)}" ` +
        `style="width:${size}px;height:${size}px;line-height:${size}px">${esc(letter)}</span>`
      );
    }
    const setName = pos[0] || "pack_20";
    const pack = a.imagesets[setName] || a.imagesets.pack_20;
    if (!pack) {
      return (
        `<span class="ecu-game-icon-letter" title="${esc(tip)}" ` +
        `style="width:${size}px;height:${size}px;line-height:${size}px">?</span>`
      );
    }
    const scale = size / pack.size;
    const sx = pos[1];
    const sy = pos[2];
    const w = pack.columns * pack.size * scale;
    const h = pack.rows * pack.size * scale;
    return (
      `<span class="ecu-item-icon" title="${esc(tip)}" ` +
      `style="width:${size}px;height:${size}px">` +
      `<span class="ecu-item-icon__frame" style="width:${size}px;height:${size}px">` +
      `<img draggable="false" alt="" src="${assetUrl(pack.file)}" ` +
      `style="width:${w}px;height:${h}px;margin-top:-${sy * size}px;margin-left:-${sx * size}px" />` +
      `</span></span>`
    );
  }

  window.MarketItemIcons = {
    itemIconHtml,
    itemLabel,
    itemTitleKey,
    itemTitleLabel,
    titlePrefix,
    itemDef,
  };
})();
