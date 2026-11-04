import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import { showActionsMenu, hideActionsMenu } from "../src/ui/chrome/showActionsMenu";

function installDom(): {
  body: { children: unknown[]; appendChild: (n: unknown) => void };
} {
  const bodyChildren: unknown[] = [];
  const body = {
    children: bodyChildren,
    appendChild(n: unknown) {
      bodyChildren.push(n);
    },
  };
  const headChildren: unknown[] = [];
  const head = {
    children: headChildren,
    appendChild(n: unknown) {
      headChildren.push(n);
    },
    append(n: unknown) {
      headChildren.push(n);
    },
  };
  (globalThis as { document?: unknown }).document = {
    body,
    head,
    getElementById() {
      return null;
    },
    querySelector() {
      return null;
    },
    createElement(tag: string) {
      const el: Record<string, unknown> = {
        tagName: tag,
        style: {},
        classList: {
          add() {},
          remove() {},
          toggle() {},
          contains() {
            return false;
          },
        },
        children: [] as unknown[],
        setAttribute() {},
        addEventListener() {},
        removeEventListener() {},
        appendChild(child: unknown) {
          (el.children as unknown[]).push(child);
        },
        remove() {
          const i = bodyChildren.indexOf(el);
          if (i >= 0) bodyChildren.splice(i, 1);
        },
        querySelector() {
          return null;
        },
        querySelectorAll() {
          return [];
        },
        offsetWidth: 200,
        offsetHeight: 80,
        contains() {
          return false;
        },
        closest() {
          return null;
        },
      };
      return el;
    },
    addEventListener() {},
    removeEventListener() {},
  };
  (globalThis as { window?: unknown }).window = {
    innerWidth: 390,
    innerHeight: 844,
    setTimeout(fn: () => void) {
      fn();
      return 1;
    },
    clearTimeout() {},
  };
  return { body };
}

describe("showActionsMenu", () => {
  afterEach(() => {
    hideActionsMenu();
    delete (globalThis as { document?: unknown }).document;
    delete (globalThis as { window?: unknown }).window;
  });

  it("opens a phone action sheet when forced", () => {
    const { body } = installDom();
    let ran = false;
    showActionsMenu({
      clientX: 10,
      clientY: 10,
      force: "sheet",
      title: "Bag",
      actions: [
        {
          id: "equip",
          label: "Equip",
          run: () => {
            ran = true;
          },
        },
      ],
    });
    assert.ok(body.children.length >= 1);
    const root = body.children[0] as { className?: string };
    assert.equal(root.className, "ecu-phone-action-sheet-root");
    void ran;
  });

  it("opens floating menu when forced", () => {
    const { body } = installDom();
    showActionsMenu({
      clientX: 40,
      clientY: 40,
      force: "floating",
      actions: [{ id: "x", label: "Inspect", run: () => {} }],
    });
    assert.ok(body.children.length >= 1);
    const root = body.children[0] as { className?: string };
    assert.equal(root.className, "comm-bag-ctx");
  });
});
