/**
 * AdventureLand skill / ability icons via official sprite sheets.
 * Positions from design/dimensions.js (skills + pack_1a).
 */
window.MockIcons = (() => {
  const CDN = "https://adventure.land";

  const SETS = {
    skills: {
      file: CDN + "/images/tiles/items/skills_20v6.png",
      size: 20,
      cols: 16,
      rows: 13,
    },
    pack_1a: {
      file: CDN + "/images/tiles/items/pack_1a.png?v=11",
      size: 16,
      cols: 16,
      rows: 128,
    },
  };

  /** abilityKey → [imageset, x, y] — real AL skins where known. */
  const BY_KEY = {
    // player skills
    attack: ["skills", 1, 6],
    cleave: ["skills", 2, 1],
    agitate: ["skills", 7, 1],
    taunt: ["pack_1a", 8, 85],
    partyheal: ["skills", 1, 4],
    heal: ["skills", 1, 11],
    curse: ["pack_1a", 11, 83],
    "3shot": ["skills", 1, 2],
    "5shot": ["skills", 2, 2],
    cburst: ["skills", 2, 0],
    burn: ["pack_1a", 10, 78], // skill_burst stand-in (mock DoT)
    supershot: ["pack_1a", 8, 88],
    quickstab: ["skills", 3, 3],
    quickpunch: ["skills", 4, 3],
    piercingshot: ["skills", 7, 2],
    huntersmark: ["skills", 6, 2],
    dash: ["skills", 9, 1],
    stomp: ["skills", 3, 1],
    warcry: ["skills", 6, 1],
    // monster / incoming abilities (mapped to closest AL skill tiles)
    tomb_slam: ["skills", 3, 11], // smash
    spike_bite: ["skills", 3, 3], // quickstab-ish bite
    swarm: ["skills", 2, 2], // 5shot / multi-hit feel
    cryptling_swarm: ["skills", 2, 2],
  };

  /** Human labels from death logs / killers → key */
  const BY_LABEL = {
    Attack: "attack",
    Cleave: "cleave",
    Burn: "burn",
    Agitate: "agitate",
    Taunt: "taunt",
    "Party Heal": "partyheal",
    Heal: "heal",
    Curse: "curse",
    "3shot": "3shot",
    "5shot": "5shot",
    Cburst: "cburst",
    Supershot: "supershot",
    Quickstab: "quickstab",
    "Tomb Slam": "tomb_slam",
    "Spike Bite": "spike_bite",
    "Cryptling Swarm": "swarm",
  };

  function resolveKey(rowOrKey) {
    if (!rowOrKey) return null;
    if (typeof rowOrKey === "string") {
      return BY_KEY[rowOrKey] ? rowOrKey : BY_LABEL[rowOrKey] || null;
    }
    if (rowOrKey.abilityKey && BY_KEY[rowOrKey.abilityKey]) return rowOrKey.abilityKey;
    if (rowOrKey.iconKey && BY_KEY[rowOrKey.iconKey]) return rowOrKey.iconKey;
    if (rowOrKey.key && BY_KEY[rowOrKey.key]) return rowOrKey.key;
    if (rowOrKey.id && BY_KEY[rowOrKey.id]) return rowOrKey.id;
    if (rowOrKey.name && BY_LABEL[rowOrKey.name]) return BY_LABEL[rowOrKey.name];
    if (rowOrKey.label && BY_LABEL[rowOrKey.label]) return BY_LABEL[rowOrKey.label];
    return null;
  }

  function spriteSpec(key) {
    const pos = BY_KEY[key];
    if (!pos) return null;
    const [setName, x, y] = pos;
    const set = SETS[setName];
    if (!set) return null;
    return { set, x, y, key };
  }

  /**
   * AL-style cropped sprite tile (displaySize px).
   * Uses <img> margin crop like item_container.
   */
  function skillIconHtml(key, displaySize = 18) {
    const spec = spriteSpec(key);
    if (!spec) return "";
    const { set, x, y } = spec;
    const scale = displaySize / set.size;
    const sheetW = set.cols * set.size * scale;
    const sheetH = set.rows * set.size * scale;
    return `<span class="icon skill" title="${key}" style="width:${displaySize}px;height:${displaySize}px">
      <span class="icon-clip" style="width:${displaySize}px;height:${displaySize}px">
        <img alt="" draggable="false"
          style="width:${sheetW}px;height:${sheetH}px;margin-top:-${y * displaySize}px;margin-left:-${x * displaySize}px"
          src="${set.file}" />
      </span>
    </span>`;
  }

  function classIconHtml(ctype) {
    if (!ctype) return "";
    return `<span class="icon ctype ctype-${ctype}" title="${ctype}"></span>`;
  }

  /** Row icon: skill sprite > letter fallback > class color. */
  function iconHtml(row, opts = {}) {
    if (opts.icons === false) return "";
    const size = opts.iconSize || 18;
    const key = resolveKey(row);
    if (key) return skillIconHtml(key, size);
    if (row?.letter) {
      return `<span class="icon ab" style="width:${size}px;height:${size}px;line-height:${size}px;background:${row.color || "#445"}">${row.letter}</span>`;
    }
    if (row?.ctype) return classIconHtml(row.ctype);
    return "";
  }

  return { SETS, BY_KEY, BY_LABEL, resolveKey, skillIconHtml, iconHtml, classIconHtml };
})();
