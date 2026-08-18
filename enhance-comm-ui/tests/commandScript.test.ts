import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { wrapCommandScript } from "../src/host/commandScript";
import { buildSendScript, buildTakeScript } from "../src/host/mail/commands";
import { buildSendItemScript } from "../src/host/sendItem";

const WRAPPED = /\(async function\(\)\{/;

describe("commandScript", () => {
  it("wrapCommandScript allows return inside code_eval", () => {
    const s = wrapCommandScript(`if(1){return;}game_log("ok");`);
    assert.match(s, WRAPPED);
    assert.match(s, /return;/);
  });
});

describe("command script wrappers", () => {
  it("wraps mail send scripts", () => {
    const s = buildSendScript({ to: "Kael", subject: "hi", body: "yo" });
    assert.match(s, WRAPPED);
    assert.match(s, /await send_mail/);
  });

  it("wraps mail send abort scripts", () => {
    const s = buildSendScript({ to: [], subject: "", body: "" });
    assert.match(s, WRAPPED);
    assert.match(s, /no recipient/);
  });

  it("wraps mail take scripts", () => {
    assert.match(buildTakeScript("mid1"), WRAPPED);
    assert.match(buildTakeScript(["a", "b"]), WRAPPED);
  });

  it("wraps send-item scripts", () => {
    assert.match(
      buildSendItemScript({ slot: 1, name: "gloves" }, "Buddy"),
      WRAPPED,
    );
    assert.match(buildSendItemScript({ slot: 0, name: "x" }, ""), WRAPPED);
  });
});
