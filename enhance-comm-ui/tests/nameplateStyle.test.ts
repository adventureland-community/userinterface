import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classColors } from "../src/lib/colors";
import {
  applySoftTextStyle,
  beautifyNameTag,
  fitNameTextInGhostBand,
  ghostAlphaForLuminanceBand,
  ghostPlateForClassColor,
  ghostPlateRimForClassColor,
  hexLuminance,
  isNameBandShape,
  luminanceToNameplateBand,
  mixHexTowardBlack,
  nameBandGrowUp,
  nameBandTextY,
  NAMEPLATE_BAND_PAD,
  NAMEPLATE_FONT_FAMILIES,
  NAMEPLATE_FONT_FAMILY,
  NAMEPLATE_GHOST_ALPHA_BASE,
  resolveNameplateFontFamily,
  nameplateFillForClass,
  nameplatePlateClassColor,
  setNameBandFillAlpha,
  softenNameBandGraphics,
  softPlateFill,
  softTextStylePatch,
  srgbLuminance,
  STOCK_NAME_BORDER,
  STOCK_NAME_FILL,
} from "../src/host/nameplateStyle";

describe("softPlateFill", () => {
  it("uses a thin darker-class rim and a denser class fill", () => {
    const border = softPlateFill(STOCK_NAME_BORDER, classColors.mage);
    const fill = softPlateFill(STOCK_NAME_FILL, classColors.mage);
    const rim = ghostPlateRimForClassColor(classColors.mage);
    assert.ok(border);
    assert.ok(fill);
    assert.equal(border!.color, rim.color);
    assert.ok(border!.alpha >= 0.45 && border!.alpha <= 0.7);
    assert.ok(fill!.alpha >= 0.45 && fill!.alpha <= 0.6);
    assert.ok(
      hexLuminance("#" + border!.color.toString(16).padStart(6, "0")) <
        hexLuminance("#" + fill!.color.toString(16).padStart(6, "0")),
    );
    assert.equal(softPlateFill(0xb12727), null);
    assert.equal(softPlateFill(0x6ec344), null);
  });
});

describe("ghostPlateForClassColor", () => {
  it("tints the plate from class color and darkens light hues", () => {
    const mage = ghostPlateForClassColor(classColors.mage);
    const ranger = ghostPlateForClassColor(classColors.ranger);
    const merchant = ghostPlateForClassColor(classColors.merchant);
    const paladin = ghostPlateForClassColor(classColors.paladin);
    const npc = ghostPlateForClassColor("#ffffff");
    assert.ok(mage.alpha >= 0.45 && mage.alpha <= 0.6);
    assert.ok(ranger.alpha >= 0.45 && ranger.alpha <= 0.6);
    assert.ok(merchant.alpha >= 0.45 && merchant.alpha <= 0.6);
    assert.equal(npc.color, 0x080a10);
    // Paladin plate must be darker than raw so white text reads.
    assert.ok(
      hexLuminance(
        "#" + paladin.color.toString(16).padStart(6, "0"),
      ) < hexLuminance(classColors.paladin),
    );
  });
});

describe("mixHexTowardBlack", () => {
  it("shades toward black", () => {
    assert.equal(mixHexTowardBlack("#ffffff", 1), "#000000");
    assert.equal(mixHexTowardBlack("#808080", 0), "#808080");
  });
});

describe("hexLuminance", () => {
  it("ranks white above merchant gray", () => {
    assert.ok(hexLuminance("#ffffff") > hexLuminance(classColors.merchant));
    assert.ok(hexLuminance(classColors.priest) > hexLuminance(classColors.ranger));
  });
});

describe("nameplate luminance bands", () => {
  it("maps luminance to dark/mid/bright and alphas", () => {
    assert.equal(luminanceToNameplateBand(0.1), "dark");
    assert.equal(luminanceToNameplateBand(0.3), "mid");
    assert.equal(luminanceToNameplateBand(0.45), "bright");
    assert.equal(luminanceToNameplateBand(0.7), "bright");
    assert.ok(
      ghostAlphaForLuminanceBand("bright") >
        ghostAlphaForLuminanceBand("mid"),
    );
    assert.ok(
      ghostAlphaForLuminanceBand("mid") >
        ghostAlphaForLuminanceBand("dark"),
    );
    assert.equal(
      ghostAlphaForLuminanceBand("mid"),
      NAMEPLATE_GHOST_ALPHA_BASE,
    );
    assert.ok(ghostAlphaForLuminanceBand("bright") >= 0.7);
    assert.ok(srgbLuminance(255, 255, 255) > srgbLuminance(40, 120, 40));
  });

  it("setNameBandFillAlpha only dirties when alpha changes", () => {
    const gfx = {
      dirty: 0,
      graphicsData: [
        {
          fillColor: STOCK_NAME_FILL,
          fillAlpha: NAMEPLATE_GHOST_ALPHA_BASE,
          shape: { x: 0, y: 0, width: 40, height: 9 },
        },
      ],
    };
    assert.equal(setNameBandFillAlpha(gfx, NAMEPLATE_GHOST_ALPHA_BASE), 0);
    assert.equal(gfx.dirty, 0);
    assert.equal(setNameBandFillAlpha(gfx, 0.48), 1);
    assert.equal(gfx.graphicsData[0].fillAlpha, 0.48);
    assert.ok(gfx.dirty > 0);
  });
});

describe("nameplateFillForClass", () => {
  it("keeps name text white; class goes on the plate", () => {
    assert.equal(nameplateFillForClass("mage"), "#ffffff");
    assert.equal(nameplateFillForClass("ranger"), "#ffffff");
    assert.equal(nameplateFillForClass(null), "#ffffff");
    assert.equal(nameplatePlateClassColor("mage"), classColors.mage);
    assert.equal(nameplatePlateClassColor("fullstatic"), "#ffffff");
  });
});

describe("isNameBandShape", () => {
  it("keeps HP / MP / stand out of the name band", () => {
    assert.equal(isNameBandShape(0, 9), true);
    assert.equal(isNameBandShape(1, 7), true);
    assert.equal(isNameBandShape(-5, 6), false);
    assert.equal(isNameBandShape(8, 6), false);
    assert.equal(isNameBandShape(-13, 14), false);
  });
});

describe("softenNameBandGraphics", () => {
  it("paints a class-tinted plate for mage", () => {
    const gfx = {
      dirty: 0,
      graphicsData: [
        {
          fillColor: STOCK_NAME_BORDER,
          fillAlpha: 1,
          shape: { x: 0, y: 0, width: 40, height: 9 },
        },
        {
          fillColor: STOCK_NAME_FILL,
          fillAlpha: 1,
          shape: { x: 1, y: 1, width: 38, height: 7 },
        },
        {
          fillColor: STOCK_NAME_BORDER,
          fillAlpha: 1,
          shape: { x: 4, y: -5, width: 32, height: 6 },
        },
      ],
    };
    const expected = ghostPlateForClassColor(classColors.mage);
    const n = softenNameBandGraphics(gfx, classColors.mage);
    assert.equal(n, 2);
    assert.ok(gfx.graphicsData[0].fillAlpha! >= 0.3);
    assert.equal(gfx.graphicsData[1].fillColor, expected.color);
    assert.equal(gfx.graphicsData[1].fillAlpha, expected.alpha);
    assert.equal(gfx.graphicsData[2].fillAlpha, 1);
    assert.ok(gfx.dirty > 0);
  });
});

describe("softTextStylePatch", () => {
  it("uses heavy Consolas stroke on desktop and stock pixel face on phone", () => {
    const desk = softTextStylePatch("#ffffff", "desktop");
    const phone = softTextStylePatch("#ffffff", "phone");
    assert.equal(desk.strokeThickness, 7);
    assert.equal(desk.dropShadow, true);
    assert.equal(phone.strokeThickness, 0);
    assert.equal(phone.dropShadow, false);
    assert.equal(phone.fontFamily, "pixel");
  });
});

describe("applySoftTextStyle", () => {
  it("forces Consolas (or first installed mono) over stock pixel", () => {
    assert.equal(NAMEPLATE_FONT_FAMILIES[0], "Consolas");
    assert.equal(NAMEPLATE_FONT_FAMILY, "Consolas");
    const face = resolveNameplateFontFamily();
    assert.ok(NAMEPLATE_FONT_FAMILIES.indexOf(face) >= 0);

    const style: Record<string, unknown> = { fill: "red", fontFamily: "pixel" };
    const node = { style, text: "Hero", updateText() {} };
    assert.equal(applySoftTextStyle(node, "#ffffff"), true);
    assert.equal(style.fontFamily, face);
    assert.equal(style.fill, "#ffffff");
    assert.equal(style.stroke, "#000000");
    // Default profile in node tests is desktop-sized (or no window → desktop).
    assert.equal(style.strokeThickness, softTextStylePatch("#ffffff").strokeThickness);
    assert.equal(style.dropShadow, softTextStylePatch("#ffffff").dropShadow);
    assert.equal(applySoftTextStyle(node, "#ffffff"), false);

    // Re-assert if somehow still on pixel after a soft pass.
    style.fontFamily = "pixel";
    assert.equal(applySoftTextStyle(node, "#ffffff"), true);
    assert.equal(style.fontFamily, face);
  });
});

describe("nameBand padding", () => {
  it("scales local text bounds and never towers the plate", () => {
    assert.equal(nameBandGrowUp(7, 7), Math.ceil(2 * NAMEPLATE_BAND_PAD));
    assert.equal(nameBandGrowUp(10, 7), 0);
    // Unscaled 64px glyph box must not trigger a giant grow.
    assert.equal(nameBandGrowUp(7, 64), 0);
    assert.equal(nameBandTextY(1, 9, 7), 2);

    const name = {
      text: "Ahnaki",
      style: { fill: "#fff" },
      y: 1.5,
      // Unscaled local bounds (what PIXI getLocalBounds returns for 64px Text)
      // with stock 0.125 scale → visual 8px.
      scale: { x: 0.125, y: 0.125 },
      getLocalBounds() {
        return { height: 64 };
      },
      updateText() {},
    };
    const plate = {
      dirty: 0,
      graphicsData: [
        {
          fillColor: STOCK_NAME_BORDER,
          fillAlpha: 1,
          shape: { x: 0, y: 0, width: 40, height: 9 },
        },
        {
          fillColor: STOCK_NAME_FILL,
          fillAlpha: 1,
          shape: { x: 1, y: 1, width: 38, height: 7 },
        },
      ],
      children: [name],
    };
    const grow = nameBandGrowUp(7, 8);
    assert.equal(grow, 4);
    assert.equal(fitNameTextInGhostBand(plate), true);
    assert.ok(plate.graphicsData[0].shape.height <= 9 + 4);
    assert.equal(plate.graphicsData[0].shape.y, -grow);
    assert.equal(plate.graphicsData[1].shape.height, 7 + grow);
    assert.equal(
      name.y,
      nameBandTextY(
        plate.graphicsData[1].shape.y,
        plate.graphicsData[1].shape.height,
        8,
      ),
    );
    assert.equal(fitNameTextInGhostBand(plate), false);
  });
});

describe("beautifyNameTag", () => {
  it("is idempotent: white text + class-tinted plate + rim", () => {
    const style: Record<string, unknown> = { fill: "#fff" };
    const root = {
      children: [
        {
          graphicsData: [
            {
              fillColor: STOCK_NAME_BORDER,
              fillAlpha: 1,
              shape: { x: 0, y: 0, width: 20, height: 9 },
            },
            {
              fillColor: STOCK_NAME_FILL,
              fillAlpha: 1,
              shape: { x: 1, y: 1, width: 18, height: 7 },
            },
          ],
          children: [{ text: "A", style, updateText() {} }],
        },
      ],
    };
    const expected = ghostPlateForClassColor(classColors.ranger);
    beautifyNameTag(root, { ctype: "ranger" });
    assert.equal(root.__ecuNameplateStyled, true);
    assert.equal(style.fill, "#ffffff");
    assert.equal(style.stroke, "#000000");
    assert.ok(root.children[0].graphicsData[0].fillAlpha! >= 0.3);
    assert.equal(root.children[0].graphicsData[1].fillColor, expected.color);
    assert.equal(root.children[0].graphicsData[1].fillAlpha, expected.alpha);
    const alpha = root.children[0].graphicsData[1].fillAlpha;
    beautifyNameTag(root, { ctype: "mage" });
    assert.equal(root.children[0].graphicsData[1].fillAlpha, alpha);
    assert.equal(style.fill, "#ffffff");
  });
});
