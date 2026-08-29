import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasContent } from "../src/host/infoDialog/hosts";
import { CLOSE_CLASS } from "../src/host/infoDialog/types";

function el(
  tag: string,
  opts?: { className?: string; text?: string; children?: any[] },
): any {
  const kids = (opts && opts.children) || [];
  const node: any = {
    nodeType: 1,
    tagName: tag.toUpperCase(),
    className: (opts && opts.className) || "",
    classList: {
      contains(name: string) {
        return ((" " + node.className + " ").indexOf(" " + name + " ") >= 0);
      },
    },
    textContent: opts && opts.text != null ? opts.text : "",
    childNodes: kids,
    querySelector(sel: string) {
      const want = sel.split(",")[0].trim().replace(/^\./, "");
      if (node.classList.contains(want)) return node;
      for (let i = 0; i < kids.length; i++) {
        const hit = kids[i].querySelector && kids[i].querySelector(sel);
        if (hit) return hit;
        if (kids[i].classList && kids[i].classList.contains(want)) {
          return kids[i];
        }
      }
      return null;
    },
  };
  return node;
}

function text(s: string): any {
  return { nodeType: 3, textContent: s };
}

describe("info dialog hasContent", () => {
  it("treats empty hosts as closed", () => {
    assert.equal(hasContent(el("div")), false);
  });

  it("treats close-button-only hosts as closed", () => {
    const host = el("div", {
      children: [
        el("button", { className: CLOSE_CLASS, text: "×", children: [text("×")] }),
      ],
    });
    assert.equal(hasContent(host), false);
  });

  it("treats stock tip chrome as open", () => {
    const host = el("div", {
      children: [
        el("div", {
          className: "buyitem",
          children: [text("Gold Ingot")],
        }),
      ],
    });
    assert.equal(hasContent(host), true);
  });

  it("treats plain tip text as open", () => {
    const host = el("div", {
      children: [text("  Slowed  ")],
    });
    assert.equal(hasContent(host), true);
  });
});
