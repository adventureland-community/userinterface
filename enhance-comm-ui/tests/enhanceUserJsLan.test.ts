import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rewriteEnhanceUserJsForLanInstall } from "../scripts/dev-user-js.mjs";

describe("rewriteEnhanceUserJsForLanInstall", () => {
  it("keeps a baked -dev. @version and stamps updateURL", () => {
    const src = `// ==UserScript==
// @name         Test
// @version      0.18.0-dev.20261104195600
// @match        https://adventure.land/hub*
// @grant        none
// ==/UserScript==
(function(){})();
`;
    const out = rewriteEnhanceUserJsForLanInstall(
      src,
      "http://192.168.1.192:3927/enhance-comm-ui.user.js",
      1793817547917,
      "0.18.0",
    );
    assert.ok(out.indexOf("// @version      0.18.0-dev.20261104195600") >= 0);
    assert.ok(
      out.indexOf(
        "// @downloadURL  http://192.168.1.192:3927/enhance-comm-ui.user.js",
      ) >= 0,
    );
    assert.ok(
      out.indexOf(
        "// @updateURL    http://192.168.1.192:3927/enhance-comm-ui.user.js",
      ) >= 0,
    );
  });

  it("adds a mtime -dev. version when the banner has none", () => {
    const src = `// ==UserScript==
// @name         Test
// @version      0.18.0
// @grant        none
// ==/UserScript==
`;
    const out = rewriteEnhanceUserJsForLanInstall(
      src,
      "http://192.168.1.192:3927/enhance-comm-ui.user.js",
      1793817547917,
      "0.18.0",
    );
    assert.ok(out.indexOf("// @version      0.18.0-dev.1793817547917") >= 0);
  });
});
