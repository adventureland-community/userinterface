import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ensureDevConnectHosts,
  parseDevRequestHost,
  rewriteDevUserJsBase,
} from "../scripts/dev-user-js.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

describe("dev.user.js LAN @connect", () => {
  it("injects an explicit LAN @connect ahead of *", () => {
    const src = readFileSync(resolve(ROOT, "dev.user.js"), "utf8");
    const out = ensureDevConnectHosts(src, "192.168.1.192");
    const lan = /\/\/ @connect\s+192\.168\.1\.192\r?\n/.exec(out);
    const star = /\/\/ @connect\s+\*\r?\n/.exec(out);
    assert.ok(lan, "expected LAN @connect");
    assert.ok(star, "expected wildcard @connect");
    assert.ok(
      (lan.index || 0) < (star.index || 0),
      "LAN @connect should appear before *",
    );
  });

  it("leaves loopback installs without an extra connect line", () => {
    const src = readFileSync(resolve(ROOT, "dev.user.js"), "utf8");
    const out = ensureDevConnectHosts(src, "127.0.0.1");
    assert.equal(out, src);
  });

  it("rewrites BASE and parses Host:port", () => {
    const src = readFileSync(resolve(ROOT, "dev.user.js"), "utf8");
    const parsed = parseDevRequestHost("192.168.1.192:3927", 3927);
    assert.equal(parsed.hostname, "192.168.1.192");
    assert.equal(parsed.hostPort, "192.168.1.192:3927");
    const out = rewriteDevUserJsBase(
      src,
      `http://${parsed.hostPort}/enhance-comm-ui.js`,
    );
    assert.ok(
      out.indexOf(
        'var BASE = "http://192.168.1.192:3927/enhance-comm-ui.js";',
      ) >= 0,
    );
  });
});
