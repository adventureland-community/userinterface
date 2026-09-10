/**
 * Command (and other interactiveBody fill windows) must keep pointer-events
 * after panelStyle merge — otherwise the shell stays click-through and the
 * editor / Run button never receive hits.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyInteractiveShellHits,
  panelStyle,
} from "../src/lib/layout";
import { COMMAND_PANEL_STYLE } from "../src/lib/frameSizes";

describe("command shell pointer-events", () => {
  it("COMMAND_PANEL_STYLE opts into hits", () => {
    assert.equal(COMMAND_PANEL_STYLE.pointerEvents, "auto");
  });

  it("panelStyle alone is click-through (idle HUD default)", () => {
    const style = panelStyle({ x: 10, y: 10, anchor: "tl" }, false);
    assert.equal(style.pointerEvents, "none");
  });

  it("Object.assign(panelStyle) would wipe COMMAND_PANEL_STYLE without restore", () => {
    const merged = Object.assign(
      {},
      COMMAND_PANEL_STYLE,
      panelStyle({ x: 40, y: 20, anchor: "tl" }, false),
    );
    assert.equal(
      merged.pointerEvents,
      "none",
      "documents the merge trap PositionedPanel must undo",
    );
  });

  it("applyInteractiveShellHits restores auto for interactiveBody", () => {
    const shell = Object.assign(
      {},
      COMMAND_PANEL_STYLE,
      panelStyle({ x: 40, y: 20, anchor: "tl" }, false),
    );
    applyInteractiveShellHits(shell, {
      interactiveBody: true,
      propsStyle: COMMAND_PANEL_STYLE,
    });
    assert.equal(shell.pointerEvents, "auto");
  });

  it("applyInteractiveShellHits restores auto from props.style alone", () => {
    const shell = Object.assign(
      {},
      COMMAND_PANEL_STYLE,
      panelStyle({ x: 40, y: 20, anchor: "tl" }, false),
    );
    applyInteractiveShellHits(shell, {
      interactiveBody: false,
      propsStyle: COMMAND_PANEL_STYLE,
    });
    assert.equal(shell.pointerEvents, "auto");
  });

  it("idle HUD shells stay click-through", () => {
    const shell = Object.assign(
      {},
      panelStyle({ x: 10, y: 10, anchor: "bc" }, false),
    );
    applyInteractiveShellHits(shell, {
      interactiveBody: false,
      propsStyle: { width: "200px" },
    });
    assert.equal(shell.pointerEvents, "none");
  });
});
