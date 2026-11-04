import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ECU_LAN_INSTALL_PATH,
  hostFromBase,
  isInstallQrHost,
  lanIpv4Rank,
  pickDevInstallUrlFromBases,
  rankedDevInstallUrlsFromBases,
} from "../src/lib/lanIpv4";

describe("lanIpv4", () => {
  it("ranks home LAN ahead of Tailscale CGNAT and Hyper-V", () => {
    assert.ok(
      lanIpv4Rank("192.168.1.192", "Ethernet") <
        lanIpv4Rank("100.103.193.67", "Tailscale"),
    );
    assert.ok(
      lanIpv4Rank("192.168.1.192") <
        lanIpv4Rank("172.29.192.1", "vEthernet (Default Switch)"),
    );
    assert.equal(lanIpv4Rank("100.64.1.2"), 900);
  });

  it("allows loopback and RFC1918 for install QR, not Tailscale CGNAT", () => {
    assert.equal(isInstallQrHost("127.0.0.1"), true);
    assert.equal(isInstallQrHost("192.168.1.192"), true);
    assert.equal(isInstallQrHost("10.0.0.5"), true);
    assert.equal(isInstallQrHost("172.16.0.2"), true);
    assert.equal(isInstallQrHost("100.103.193.67"), false);
    assert.equal(isInstallQrHost("169.254.1.1"), false);
  });

  it("picks Ethernet over Tailscale and uses the full .user.js path", () => {
    assert.equal(ECU_LAN_INSTALL_PATH, "/enhance-comm-ui.user.js");
    assert.equal(
      pickDevInstallUrlFromBases(
        [
          "http://127.0.0.1:3927",
          "http://100.103.193.67:3927",
          "http://192.168.1.192:3927",
          "http://172.29.192.1:3927",
        ],
        "fallback",
      ),
      "http://192.168.1.192:3927/enhance-comm-ui.user.js",
    );
    const urls = rankedDevInstallUrlsFromBases([
      "http://100.103.193.67:3927",
      "http://127.0.0.1:3927",
      "http://192.168.1.192:3927",
    ]);
    assert.equal(urls[0], "http://192.168.1.192:3927/enhance-comm-ui.user.js");
    assert.ok(
      urls.indexOf("http://100.103.193.67:3927/enhance-comm-ui.user.js") < 0,
    );
    assert.ok(
      urls.indexOf("http://127.0.0.1:3927/enhance-comm-ui.user.js") >= 0,
    );
  });

  it("parses hosts from bases", () => {
    assert.equal(hostFromBase("http://192.168.1.192:3927"), "192.168.1.192");
  });
});
