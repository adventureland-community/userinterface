import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ECU_PRODUCTION_SCRIPT_URL,
  getBakedDevInstallUrl,
  getProductionInstallUrl,
  isEcuDevBuild,
  pickDevInstallUrlFromBases,
  resolveDevLanInstallUrl,
  resolveInstallScriptUrl,
} from "../src/lib/installScriptUrl";
import { encodeQrSvg } from "../src/lib/qrSvg";

describe("installScriptUrl", () => {
  it("prefers LAN and omits Tailscale CGNAT from install URLs", () => {
    assert.equal(
      pickDevInstallUrlFromBases(
        [
          "http://127.0.0.1:3927",
          "http://100.103.193.67:3927",
          "http://192.168.1.20:3927",
        ],
        "http://127.0.0.1:3927/enhance-comm-ui.user.js",
      ),
      "http://192.168.1.20:3927/enhance-comm-ui.user.js",
    );
  });

  it("falls back to loopback when no LAN base exists", () => {
    assert.equal(
      pickDevInstallUrlFromBases(["http://127.0.0.1:3927"], "fallback"),
      "http://127.0.0.1:3927/enhance-comm-ui.user.js",
    );
  });

  it("keeps the primary install URL on GitHub raw", async () => {
    assert.equal(getProductionInstallUrl(), ECU_PRODUCTION_SCRIPT_URL);
    const info = await resolveInstallScriptUrl();
    assert.equal(info.mode, "prod");
    assert.equal(info.url, ECU_PRODUCTION_SCRIPT_URL);
    assert.ok(info.url.indexOf("raw.githubusercontent.com") > 0);
    assert.ok(info.url.endsWith("enhance-comm-ui.js"));
  });

  it("hides LAN install outside ECU_DEV builds", async () => {
    assert.equal(isEcuDevBuild(), false);
    assert.equal(await resolveDevLanInstallUrl(), null);
  });

  it("exposes a loopback baked default when no define is injected", () => {
    assert.equal(
      getBakedDevInstallUrl(),
      "http://127.0.0.1:3927/enhance-comm-ui.user.js",
    );
  });
});

describe("encodeQrSvg", () => {
  it("renders an SVG matrix for a script URL", () => {
    const svg = encodeQrSvg(
      "https://raw.githubusercontent.com/adventureland-community/userinterface/feature/enhance-comm-ui/enhance-comm-ui.js",
    );
    assert.ok(svg.indexOf("<svg") === 0);
    assert.ok(svg.indexOf("</svg>") > 0);
  });
});
