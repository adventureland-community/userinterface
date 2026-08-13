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
  var fetchedAt = new Date().toISOString();
  var url = BASE + "?t=" + Date.now();

  function fail(msg) {
    console.error("[ecu-dev]", msg);
  }

  function headerValue(headers, name) {
    if (!headers) return null;
    var re = new RegExp("^" + name + ":\\s*(\\S+)", "im");
    var m = re.exec(headers);
    return m ? m[1] : null;
  }

  function inject(code, meta) {
    var s = document.createElement("script");
    s.textContent = code;
    (document.documentElement || document.head).appendChild(s);
    s.remove();
    // Runtime fingerprint is window.__ECU_BUILD__ / [ecu] from the bundle.
    console.info("[ecu-dev] injected", Object.assign({}, meta || {}, {
      fetchedAt: fetchedAt,
    }));
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
        var mtime = headerValue(res.responseHeaders, "X-ECU-Mtime");
        inject(res.responseText, {
          url: url,
          bytes: (res.responseText && res.responseText.length) || 0,
          serverMtimeMs: mtime ? Number(mtime) : null,
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
