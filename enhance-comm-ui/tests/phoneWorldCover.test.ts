import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import {
  applyPhoneWorldCover,
  phoneWorldCoverForFov,
  PHONE_WORLD_COVER,
  PHONE_WORLD_COVER_ZOOMED_OUT,
} from "../src/lib/worldFov";

describe("phoneWorldCoverForFov", () => {
  it("stays on integer cover 2 across FOV 1–2", () => {
    assert.equal(phoneWorldCoverForFov(1), PHONE_WORLD_COVER);
    assert.equal(phoneWorldCoverForFov(2), PHONE_WORLD_COVER);
    assert.equal(PHONE_WORLD_COVER_ZOOMED_OUT, PHONE_WORLD_COVER);
  });
});

describe("applyPhoneWorldCover desktop safety", () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { document?: unknown }).document;
  });

  it("does not leave fixed+scale on the view when Comm UI is desktop", () => {
    const view = {
      style: {
        position: "",
        left: "",
        top: "",
        transform: "",
        transformOrigin: "",
        width: "",
        height: "",
        maxWidth: "",
        maxHeight: "",
        marginLeft: "",
        marginTop: "",
        display: "",
        imageRendering: "",
      } as Record<string, string>,
      getAttribute(name: string) {
        return (this as { _attrs?: Record<string, string> })._attrs?.[name] || null;
      },
      setAttribute(name: string, value: string) {
        const self = this as { _attrs?: Record<string, string> };
        if (!self._attrs) self._attrs = {};
        self._attrs[name] = value;
      },
      removeAttribute(name: string) {
        const self = this as { _attrs?: Record<string, string> };
        if (self._attrs) delete self._attrs[name];
      },
    };
    const html = {
      style: {
        setProperty() {},
      },
      classList: {
        _c: new Set<string>(["ecu-phone-dock-on"]),
        contains(c: string) {
          return this._c.has(c);
        },
        remove(c: string) {
          this._c.delete(c);
        },
        add(c: string) {
          this._c.add(c);
        },
      },
    };
    const comm = {
      getAttribute(name: string) {
        return name === "data-viewport" ? "desktop" : null;
      },
    };
    (globalThis as { window?: unknown }).window = {
      renderer: { view, backgroundColor: 0x123456 },
      innerWidth: 1440,
      innerHeight: 900,
    };
    (globalThis as { document?: unknown }).document = {
      documentElement: html,
      body: html,
      getElementById(id: string) {
        return id === "comm-ui" ? comm : null;
      },
    };

    // Mark as covered first (simulates a leaked phone cover).
    view.setAttribute("data-ecu-phone-cover", "1");
    view.style.position = "fixed";
    view.style.transform = "scale(2.3)";

    applyPhoneWorldCover(1440, 900);

    assert.equal(view.style.position, "");
    assert.equal(view.style.transform, "");
    assert.equal(view.getAttribute("data-ecu-phone-cover"), null);
    // Dock class alone hides .ecu-actions — must scrub with cover.
    assert.equal(html.classList.contains("ecu-phone-dock-on"), false);
  });

  it("scrubs leaked fixed+scale even when cover attr is already gone", () => {
    const view = {
      style: {
        position: "fixed",
        left: "0",
        top: "0",
        transform: "scale(2.65)",
        transformOrigin: "50% 32%",
        width: "1440px",
        height: "900px",
        maxWidth: "none",
        maxHeight: "none",
        marginLeft: "0",
        marginTop: "0",
        display: "block",
        imageRendering: "",
      } as Record<string, string>,
      getAttribute() {
        return null;
      },
      setAttribute() {},
      removeAttribute() {},
    };
    const html = {
      style: {
        setProperty() {},
      },
      classList: {
        contains() {
          return false;
        },
        remove() {},
      },
    };
    const comm = {
      getAttribute(name: string) {
        return name === "data-viewport" ? "desktop" : null;
      },
    };
    (globalThis as { window?: unknown }).window = {
      renderer: { view, backgroundColor: 0x123456 },
      innerWidth: 1440,
      innerHeight: 900,
    };
    (globalThis as { document?: unknown }).document = {
      documentElement: html,
      body: html,
      getElementById(id: string) {
        return id === "comm-ui" ? comm : null;
      },
    };

    applyPhoneWorldCover(1440, 900);

    assert.equal(view.style.position, "");
    assert.equal(view.style.transform, "");
    assert.equal(view.style.left, "");
    // Width stays for FOV fit — cover scrub must not wipe zoom size.
    assert.equal(view.style.width, "1440px");
  });
});
