/**
 * /comm keyboard shortcut resolution (I / C / Enter / M + Esc / layout).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isEditableKeyboardTarget,
  notifyObserveRequired,
  resolveCommUiShortcut,
} from "../src/host/keyboardPolicy";

describe("resolveCommUiShortcut", () => {
  it("maps stock UI keys", () => {
    assert.equal(resolveCommUiShortcut({ key: "i" }), "toggle_inventory");
    assert.equal(resolveCommUiShortcut({ key: "I" }), "toggle_inventory");
    assert.equal(resolveCommUiShortcut({ key: "c" }), "toggle_character");
    assert.equal(resolveCommUiShortcut({ key: "Enter" }), "focus_chat");
    assert.equal(resolveCommUiShortcut({ key: "m" }), "toggle_mail");
    assert.equal(resolveCommUiShortcut({ key: "Escape" }), "escape");
  });

  it("maps Ctrl+Shift+L for layout edit", () => {
    assert.equal(
      resolveCommUiShortcut({ key: "l", ctrlKey: true, shiftKey: true }),
      "toggle_layout_edit",
    );
  });

  it("ignores chorded letter shortcuts", () => {
    assert.equal(resolveCommUiShortcut({ key: "i", ctrlKey: true }), null);
    assert.equal(resolveCommUiShortcut({ key: "c", altKey: true }), null);
    assert.equal(resolveCommUiShortcut({ key: "m", metaKey: true }), null);
  });

  it("ignores unrelated keys", () => {
    assert.equal(resolveCommUiShortcut({ key: "t" }), null);
    assert.equal(resolveCommUiShortcut({ key: "a" }), null);
  });
});

describe("notifyObserveRequired", () => {
  it("is exported for observe-gated shortcuts", () => {
    assert.equal(typeof notifyObserveRequired, "function");
  });
});

describe("isEditableKeyboardTarget", () => {
  it("detects common editable hosts", () => {
    assert.equal(isEditableKeyboardTarget({ tagName: "INPUT" } as any), true);
    assert.equal(
      isEditableKeyboardTarget({ tagName: "TEXTAREA" } as any),
      true,
    );
    assert.equal(
      isEditableKeyboardTarget({
        tagName: "DIV",
        isContentEditable: true,
      } as any),
      true,
    );
    assert.equal(isEditableKeyboardTarget({ tagName: "DIV" } as any), false);
    assert.equal(isEditableKeyboardTarget(null), false);
  });
});
