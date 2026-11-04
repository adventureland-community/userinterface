/**
 * Rewrite helpers for serving enhance-comm-ui/dev.user.js over LAN.
 * Mobile Tampermonkey often ignores `@connect *` — inject the LAN IP explicitly.
 */

/**
 * @param {string} reqHost
 * @param {number} port
 * @returns {{ hostname: string, hostPort: string }}
 */
export function parseDevRequestHost(reqHost, port) {
  let host = String(reqHost || "").split(",")[0].trim();
  if (!host) host = `127.0.0.1:${port}`;
  if (host.charAt(0) === "[") {
    const end = host.indexOf("]");
    if (end > 0) {
      const name = host.slice(1, end);
      const rest = host.slice(end + 1);
      return {
        hostname: name,
        hostPort: rest.charAt(0) === ":" ? `${name}${rest}` : `${name}:${port}`,
      };
    }
  }
  if (host.indexOf(":") < 0) {
    return { hostname: host, hostPort: `${host}:${port}` };
  }
  const colon = host.lastIndexOf(":");
  return {
    hostname: host.slice(0, colon),
    hostPort: host,
  };
}

/**
 * @param {string} body
 * @param {string} hostname
 * @returns {string}
 */
export function ensureDevConnectHosts(body, hostname) {
  // Windows checkouts use CRLF; keep whatever newline the file already has.
  const nl = body.indexOf("\r\n") >= 0 ? "\r\n" : "\n";
  let next = body;
  if (!/\/\/ @connect\s+\*/.test(next)) {
    next = next.replace(
      /\/\/ @connect\s+localhost\r?\n/,
      `// @connect      localhost${nl}// @connect      *${nl}`,
    );
  }
  const name = String(hostname || "").trim();
  if (
    !name ||
    name === "127.0.0.1" ||
    name === "localhost" ||
    name === "*"
  ) {
    return next;
  }
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`// @connect\\s+${escaped}\\r?\\n`).test(next)) {
    return next;
  }
  const line = `// @connect      ${name}${nl}`;
  if (/\/\/ @connect\s+\*\r?\n/.test(next)) {
    return next.replace(
      /\/\/ @connect\s+\*\r?\n/,
      `${line}// @connect      *${nl}`,
    );
  }
  return next.replace(/\/\/ @run-at/, `${line}// @run-at`);
}

/**
 * @param {string} body
 * @param {string} baseUrl enhance-comm-ui.js URL including host:port
 * @returns {string}
 */
export function rewriteDevUserJsBase(body, baseUrl) {
  return body.replace(
    /var BASE = "http:\/\/[^"]+\/enhance-comm-ui\.js";/,
    `var BASE = ${JSON.stringify(baseUrl)};`,
  );
}

/**
 * Phone-friendly install: stamp @downloadURL/@updateURL.
 * Keep the baked `@version` when it already has a `-dev.` build part (from
 * `ECU_DEV=1` tsup); otherwise fall back to mtime so updates still bump.
 *
 * @param {string} body
 * @param {string} installUrl e.g. http://192.168.1.192:3927/enhance-comm-ui.user.js
 * @param {number} mtimeMs
 * @param {string} [baseVersion]
 * @returns {string}
 */
export function rewriteEnhanceUserJsForLanInstall(
  body,
  installUrl,
  mtimeMs,
  baseVersion,
) {
  const nl = body.indexOf("\r\n") >= 0 ? "\r\n" : "\n";
  let next = body;
  const versionMatch = /^\/\/ @version\s+(\S+)/m.exec(next);
  const current = versionMatch ? versionMatch[1] : "";
  if (!/-dev\.\d/.test(current)) {
    const verBase = String(current || baseVersion || "0.0.0").replace(
      /-dev\..*$/,
      "",
    );
    const ver = `${verBase}-dev.${Math.floor(Number(mtimeMs) || Date.now())}`;
    next = next.replace(/^\/\/ @version\s+.+$/m, `// @version      ${ver}`);
  }
  next = next.replace(/^\/\/ @downloadURL\s+.+\r?\n/gm, "");
  next = next.replace(/^\/\/ @updateURL\s+.+\r?\n/gm, "");
  const insert =
    `// @downloadURL  ${installUrl}${nl}` +
    `// @updateURL    ${installUrl}${nl}`;
  if (/\/\/ @grant\b/.test(next)) {
    next = next.replace(/\/\/ @grant\b/, `${insert}// @grant`);
  } else {
    next = next.replace(
      /\/\/ ==\/UserScript==/,
      `${insert}// ==/UserScript==`,
    );
  }
  return next;
}
