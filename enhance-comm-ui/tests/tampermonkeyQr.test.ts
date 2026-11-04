import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TAMPERMONKEY_QR_CARDS } from "../src/lib/tampermonkeyQr";

describe("tampermonkeyQr", () => {
  it("exposes official Q406 landings for iOS, Edge, and Firefox", () => {
    assert.equal(TAMPERMONKEY_QR_CARDS.length, 3);
    const urls = TAMPERMONKEY_QR_CARDS.map((c) => c.url);
    assert.deepEqual(urls, [
      "https://www.tampermonkey.net/qr/s",
      "https://www.tampermonkey.net/qr/e",
      "https://www.tampermonkey.net/qr/f",
    ]);
  });

  it("embeds SVG matrices for each card", () => {
    for (let i = 0; i < TAMPERMONKEY_QR_CARDS.length; i++) {
      const card = TAMPERMONKEY_QR_CARDS[i];
      assert.ok(card.label.length > 0);
      assert.ok(card.help.length > 0);
      assert.ok(card.svg.indexOf("<svg") === 0);
      assert.ok(card.svg.indexOf("</svg>") > 0);
    }
  });
});
