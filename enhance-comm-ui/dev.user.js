// ==UserScript==
// @name         Adventure.land Hub UI Enhancement (DEV)
// @namespace    http://tampermonkey.net/
// @version      0.8.0-alpha.4-dev
// @description  Dev loader — fetches local npm run dev build on every page load (cache-busted).
// @author       kevinsandow
// @contributors vett0, thmsn
// @match        https://adventure.land/hub*
// @match        https://adventure.land/comm*
// @match        https://thmsn.adventureland.community/hub*
// @match        https://thmsn.adventureland.community/comm*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM.xmlHttpRequest
// @connect      127.0.0.1
// @connect      localhost
// @connect      *
// @run-at       document-start
// ==/UserScript==

(function ecuDevLoader() {
  "use strict";
  // Default desktop BASE. LAN installs are rewritten by ecu-dev /dev.user.js
  // (BASE + //@connect <lan-ip>). Optional override: localStorage.ecuDevBase.
  var BASE = "http://127.0.0.1:3927/enhance-comm-ui.js";
  try {
    var override =
      typeof localStorage !== "undefined" &&
      localStorage.getItem("ecuDevBase");
    if (override && /^https?:\/\//i.test(override)) {
      BASE = override.indexOf("enhance-comm-ui.js") >= 0
        ? override
        : override.replace(/\/?$/, "/") + "enhance-comm-ui.js";
    }
  } catch (e) {
    /* ignore */
  }

  var url = BASE + "?t=" + Date.now();

  function badge(kind, msg) {
    try {
      var id = "ecu-dev-badge";
      var el = document.getElementById(id);
      if (!el) {
        el = document.createElement("div");
        el.id = id;
        el.setAttribute(
          "style",
          "position:fixed;z-index:2147483647;left:8px;right:8px;bottom:8px;" +
            "max-width:520px;margin:0 auto;padding:10px 12px;border-radius:8px;" +
            "font:14px/1.35 system-ui,sans-serif;white-space:pre-wrap;" +
            "box-shadow:0 8px 24px rgba(0,0,0,.45);pointer-events:auto;",
        );
        (document.documentElement || document.body).appendChild(el);
      }
      var bg =
        kind === "ok"
          ? "#1b3d2f"
          : kind === "wait"
            ? "#3a3420"
            : "#4a1f1f";
      var fg =
        kind === "ok" ? "#b6f0c8" : kind === "wait" ? "#ffe08a" : "#ffb4b4";
      el.style.background = bg;
      el.style.color = fg;
      el.style.border = "1px solid " + fg;
      el.textContent = "[ecu-dev] " + msg;
      if (kind === "ok") {
        window.setTimeout(function () {
          if (el && el.parentNode) el.parentNode.removeChild(el);
        }, 8000);
      }
    } catch (err) {
      /* ignore */
    }
    if (kind === "err") console.error("[ecu-dev]", msg);
    else console.info("[ecu-dev]", msg);
  }

  function fail(msg) {
    badge("err", msg);
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
    var bits = [
      "injected " + ((meta && meta.bytes) || 0) + "b",
      "from " + BASE,
    ];
    if (meta && meta.serverMtimeMs) {
      bits.push("mtime " + new Date(meta.serverMtimeMs).toISOString());
    }
    badge("ok", bits.join(" · "));
  }

  badge("wait", "fetching " + BASE + " …");

  if (typeof GM === "undefined" || !GM.xmlHttpRequest) {
    fail("GM.xmlHttpRequest missing — reinstall DEV userscript / allow grants");
    return;
  }

  GM.xmlHttpRequest({
    method: "GET",
    url: url,
    timeout: 120000,
    onload: function (res) {
      if (res.status < 200 || res.status >= 300) {
        fail("HTTP " + res.status + " from " + url);
        return;
      }
      var text = res.responseText || "";
      if (
        text.indexOf("==UserScript==") < 0 &&
        text.indexOf("EnhanceCommUI") < 0
      ) {
        fail(
          "unexpected body (" +
            text.length +
            "b) — is ecu-dev serving enhance-comm-ui.js?",
        );
        return;
      }
      var mtime = headerValue(res.responseHeaders, "X-ECU-Mtime");
      try {
        inject(text, {
          url: url,
          bytes: text.length,
          serverMtimeMs: mtime ? Number(mtime) : null,
        });
      } catch (err) {
        fail(
          "inject threw: " +
            (err && err.message ? err.message : String(err)),
        );
      }
    },
    onerror: function (res) {
      var extra =
        res && typeof res.status === "number" ? " status=" + res.status : "";
      fail(
        "GM.xmlHttpRequest failed" +
          extra +
          " — TM @connect allowed for this host? same Wi‑Fi?\n" +
          BASE,
      );
    },
    ontimeout: function () {
      fail("timeout (120s) fetching " + BASE);
    },
  });
})();
