// ==UserScript==
// @name         Adventure.land COMM UI Enhancement (DEV)
// @namespace    http://tampermonkey.net/
// @version      0.8.0-alpha.1-dev
// @description  Dev loader — fetches local npm run dev build on every page load (cache-busted).
// @author       kevinsandow
// @contributors vett0, thmsn
// @match        https://adventure.land/comm
// @match        https://adventure.land/comm?borders=1
// @match        https://thmsn.adventureland.community/comm
// @match        https://thmsn.adventureland.community/comm?borders=1
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM.xmlHttpRequest
// @connect      127.0.0.1
// @connect      localhost
// @run-at       document-start
// ==/UserScript==

(function ecuDevLoader() {
  "use strict";
  var BASE = "http://127.0.0.1:3927/enhance-comm-ui.js";
  var url = BASE + "?t=" + Date.now();

  function fail(msg) {
    console.error("[ecu-dev]", msg);
  }

  function inject(code, meta) {
    // Page context so window.React / game globals resolve.
    var s = document.createElement("script");
    s.textContent = code;
    (document.documentElement || document.head).appendChild(s);
    s.remove();
    console.info("[ecu-dev] injected", meta || url);
  }

  if (typeof GM !== "undefined" && GM.xmlHttpRequest) {
    GM.xmlHttpRequest({
      method: "GET",
      url: url,
      anonymous: true,
      onload: function (res) {
        if (res.status < 200 || res.status >= 300) {
          fail("HTTP " + res.status + " from " + url);
          return;
        }
        inject(res.responseText, {
          url: url,
          bytes: (res.responseText && res.responseText.length) || 0,
        });
      },
      onerror: function () {
        fail("request failed — is npm run dev running? " + BASE);
      },
    });
    return;
  }

  fail("GM.xmlHttpRequest missing — reinstall dev.user.js / allow grants");
})();
