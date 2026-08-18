/**
 * Minimal window.G for overlay preview — names, CDs, and skill skins
 * from adventureland/design (crypt / tomb / spider / winter).
 */

const ASSET_ORIGIN = "https://adventure.land";

const MAP_EXTENT = {
  min_x: -400,
  min_y: -400,
  max_x: 400,
  max_y: 400,
  x_lines: [] as Array<[number, number, number]>,
  y_lines: [] as Array<[number, number, number]>,
};

function instanceMap(name: string) {
  return { name, instance: true, data: { ...MAP_EXTENT } };
}

export function buildPreviewG(): Record<string, unknown> {
  return {
    skills: {
      anger: { name: "Anger", skin: "skill_agitate" },
      warpstomp: { name: "Warpstomp", skin: "skill_stomp" },
      zap: { name: "Zap" },
      dampening_aura: { name: "Dampening", skin: "condition_neutral" },
      weakness_aura: { name: "Weakness", skin: "condition_bad" },
      mlight: { name: "Light", skin: "skill_light" },
      healing: { name: "Healing" },
      multi_burn: { name: "Multi Burn" },
      curse_aura: { name: "Curse" },
    },
    conditions: {
      weakness: { name: "Weakness", skin: "condition_bad", debuff: true },
      dampened: { name: "Dampened", skin: "condition_neutral", debuff: true },
      cursed: { name: "Cursed", skin: "condition_bad", debuff: true },
    },
    monsters: {
      a1: { name: "Spike", explosion: 20 },
      a2: {
        name: "Bill",
        abilities: { anger: { cooldown: 8000, radius: 300 } },
      },
      a3: {
        name: "Lestat",
        explosion: 20,
        abilities: { anger: { cooldown: 8000, radius: 300 } },
      },
      a4: { name: "Orlok" },
      a5: {
        name: "Elena",
        abilities: { healing: { heal: 66000, cooldown: 800 } },
      },
      a6: {
        name: "Marceline",
        abilities: {
          weakness_aura: {
            aura: true,
            condition: "weakness",
            radius: 100,
            cooldown: 4000,
          },
        },
      },
      a7: {
        name: "Lucinda",
        abilities: {
          dampening_aura: {
            radius: 300,
            cooldown: 180,
            aura: true,
            condition: "dampened",
          },
          mlight: { cooldown: 3000 },
        },
      },
      a8: {
        name: "Angel",
        abilities: {
          curse_aura: {
            radius: 300,
            cooldown: 4000,
            aura: true,
            condition: "cursed",
          },
        },
      },
      vbat: { name: "Vampireling" },
      nerfedbat: { name: "Bat", skin: "bat" },
      zapper0: { name: "Zapper" },
      gpurplepro: {
        name: "Protector of Darkness",
        abilities: {
          anger: { cooldown: 12000, radius: 300 },
          warpstomp: { cooldown: 8000, radius: 100, stun: 1000 },
        },
      },
      gredpro: { name: "Protector of Fire" },
      ggreenpro: { name: "Protector of Nature" },
      gbluepro: { name: "Protector of Frost" },
      spiderbl: { name: "Black Spider Queen" },
      spiderbr: { name: "Brown Spider Queen" },
      spiderr: { name: "Red Spider Queen" },
      spider: { name: "Spider" },
      xmagefz: {
        name: "Mage",
        abilities: { deepfreeze: { cooldown: 6000, radius: 300 } },
      },
      xmagefi: {
        name: "Mage",
        abilities: {
          anger: { cooldown: 8000, radius: 300 },
          multi_burn: { cooldown: 4000, damage: 4000 },
        },
      },
      xmagen: { name: "Mage" },
      xmagex: { name: "Dark Mage" },
    },
    maps: {
      main: { name: "Mainland", data: { ...MAP_EXTENT } },
      crypt: instanceMap("The Crypt"),
      tomb: instanceMap("The Tomb"),
      spider_instance: instanceMap("The Spider Den"),
      winter_instance: instanceMap("Lair of the Dark Mage"),
    },
    classes: {
      priest: { looks: [["fpriest"]] },
      warrior: { looks: [["mwarrior"]] },
      mage: { looks: [["wmage"]] },
    },
    levels: { "80": 12000000 },
    positions: {
      skill_agitate: ["skills", 7, 1],
      skill_stomp: ["skills", 3, 1],
      condition_neutral: ["skills", 12, 9],
      condition_bad: ["skills", 13, 9],
      skill_light: ["skills", 0, 0],
      placeholder: ["custom", 3, 1],
    },
    imagesets: {
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
    },
    dimensions: {},
    geometry: {},
  };
}

export { ASSET_ORIGIN };
