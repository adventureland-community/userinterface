/**
 * Smoke: bundle must evaluate without window.React (Tampermonkey inject).
 * Exits 0 if getReact does not throw at module load.
 */
const fs = require("fs");
const path = require("path");

const code = fs.readFileSync(
  path.join(__dirname, "../dist/enhance-comm-ui.js"),
  "utf8",
);

const scripts = [];
function el() {
  return {
    id: "",
    src: "",
    crossOrigin: "",
    style: {},
    textContent: "",
    innerText: "",
    setAttribute() {},
    addEventListener(ev, fn) {
      scripts.push({ ev, fn, src: this.src });
    },
    remove() {},
  };
}
const doc = {
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => el(),
  head: {
    append(n) {
      scripts.push({ append: n && n.src });
    },
    appendChild() {},
  },
  body: { append() {}, appendChild() {} },
  documentElement: { appendChild() {} },
};
global.window = {
  React: undefined,
  ReactDOM: undefined,
  document: doc,
  setInterval: () => 1,
  clearInterval: () => {},
  setTimeout: () => 1,
  clearTimeout: () => {},
  requestAnimationFrame: () => 1,
  cancelAnimationFrame: () => {},
  addEventListener() {},
  location: { href: "https://adventure.land/comm" },
};
global.document = doc;

try {
  // eslint-disable-next-line no-eval
  eval(code);
  console.log("INJECT_OK no window.React throw");
  console.log("ensureReact script tags:", scripts.length);
} catch (e) {
  console.log("INJECT_FAIL", e.message);
  console.log(String(e.stack).split("\n").slice(0, 8).join("\n"));
  process.exit(1);
}
