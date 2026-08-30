import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ECU_COMM_TAG,
  commLogText,
  injectCommLog,
  wrapCommandScript,
} from "../src/host/commandScript";
import { buildSendScript, buildTakeScript } from "../src/host/mail/commands";
import { buildSendItemScript } from "../src/host/sendItem";

const WRAPPED = /\(async function\(\)\{/;

describe("commandScript", () => {
  it("wrapCommandScript allows return inside code_eval", () => {
    const s = wrapCommandScript(`if(1){return;}game_log("ok");`);
    assert.match(s, WRAPPED);
    assert.match(s, /return;/);
  });

  it("commLogText prefixes docker-grep tag", () => {
    assert.equal(commLogText("trade-list trade1 hpot0"), "[ECU/comm] trade-list trade1 hpot0");
  });

  it("injectCommLog prepends start marker to wrapped scripts", () => {
    const wrapped = wrapCommandScript(`await trade(0,"trade1",100,1);`);
    const tagged = injectCommLog(wrapped, "trade-list trade1 hpot0");
    assert.match(tagged, new RegExp(ECU_COMM_TAG.replace(/[[\]]/g, "\\$&")));
    assert.match(tagged, /trade-list trade1 hpot0/);
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
