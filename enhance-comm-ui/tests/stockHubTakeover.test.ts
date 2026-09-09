/**
 * Stock Hub chat takeover must not hang the page via MutationObserver loops.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { installStockHubChatTakeover } from "../src/host/chat/stockHubTakeover";

type MoCallback = (records: unknown[], observer: { disconnect: () => void }) => void;

class FakeMutationObserver {
  static instances: FakeMutationObserver[] = [];
  static deliveryCount = 0;
  cb: MoCallback;
  disconnected = false;

  constructor(cb: MoCallback) {
    this.cb = cb;
    FakeMutationObserver.instances.push(this);
  }

  observe(): void {}

  disconnect(): void {
    this.disconnected = true;
  }

  /** Simulate a mutation delivery (as browsers do after attribute/child changes). */
  deliver(): void {
    if (this.disconnected) return;
    FakeMutationObserver.deliveryCount += 1;
    this.cb([], this);
  }
}

function makeDom(): {
  document: Document;
  window: Window & { __ecuStockHubChatTaken?: boolean };
  chat: HTMLElement;
  toggle: HTMLElement;
  bottom: HTMLElement;
} {
  const doc = {
    _byId: {} as Record<string, HTMLElement>,
    getElementById(id: string) {
      return this._byId[id] || null;
    },
    createElement(tag: string) {
      const el = {
        id: "",
        tagName: tag.toUpperCase(),
        textContent: "",
        style: {} as Record<string, string>,
        classList: {
          _set: new Set<string>(),
          add(c: string) {
            this._set.add(c);
          },
          contains(c: string) {
            return this._set.has(c);
          },
        },
        setAttribute() {},
        appendChild() {},
      } as unknown as HTMLElement;
      return el;
    },
    head: { appendChild() {} },
    body: {} as HTMLElement,
  } as unknown as Document & {
    _byId: Record<string, HTMLElement>;
  };

  function el(id: string): HTMLElement {
    const attrs: Record<string, string> = {};
    const node = {
      id,
      style: { display: "" } as CSSStyleDeclaration,
      classList: {
        _set: new Set<string>(),
        add(c: string) {
          this._set.add(c);
          // Mimic browsers: class changes notify observers that watch attributes.
          for (let i = 0; i < FakeMutationObserver.instances.length; i++) {
            FakeMutationObserver.instances[i].deliver();
          }
        },
        contains(c: string) {
          return this._set.has(c);
        },
      },
      getAttribute(name: string) {
        return attrs[name] != null ? attrs[name] : null;
      },
      setAttribute(name: string, value: string) {
        attrs[name] = value;
        for (let i = 0; i < FakeMutationObserver.instances.length; i++) {
          FakeMutationObserver.instances[i].deliver();
        }
      },
    } as unknown as HTMLElement & {
      style: { display: string };
    };
    // style.display assignment also notifies (attributeFilter: style).
    Object.defineProperty(node.style, "display", {
      get() {
        return (this as { _display?: string })._display || "";
      },
      set(v: string) {
        const prev = (this as { _display?: string })._display;
        (this as { _display?: string })._display = v;
        if (prev !== v) {
          for (let i = 0; i < FakeMutationObserver.instances.length; i++) {
            FakeMutationObserver.instances[i].deliver();
          }
        }
      },
      configurable: true,
    });
    doc._byId[id] = node;
    return node;
  }

  const chat = el("comm-chat");
  const toggle = el("comm-chat-toggle");
  const bottom = el("bottom");

  const win = {
    __ecuStockHubChatTaken: undefined,
  } as Window & { __ecuStockHubChatTaken?: boolean };

  return { document: doc, window: win, chat, toggle, bottom };
}

describe("installStockHubChatTakeover", () => {
  it("does not recurse forever when hide mutates observed attributes", () => {
    FakeMutationObserver.instances = [];
    FakeMutationObserver.deliveryCount = 0;

    const { document: doc, window: win } = makeDom();
    const prevDoc = globalThis.document;
    const prevWin = globalThis.window;
    const prevMo = globalThis.MutationObserver;

    (globalThis as { document: Document }).document = doc;
    (globalThis as { window: Window }).window = win;
    (globalThis as { MutationObserver: typeof MutationObserver }).MutationObserver =
      FakeMutationObserver as unknown as typeof MutationObserver;

    try {
      assert.doesNotThrow(() => installStockHubChatTakeover());
      // One intentional hide + at most a few attribute follow-ups — not hundreds.
      assert.ok(
        FakeMutationObserver.deliveryCount < 20,
        "expected bounded observer deliveries, got " +
          FakeMutationObserver.deliveryCount,
      );
    } finally {
      (globalThis as { document: typeof prevDoc }).document = prevDoc;
      (globalThis as { window: typeof prevWin }).window = prevWin;
      (globalThis as { MutationObserver: typeof prevMo }).MutationObserver =
        prevMo;
    }
  });
});
