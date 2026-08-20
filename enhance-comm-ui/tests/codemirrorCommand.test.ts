import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COMMAND_CM_HEIGHT_PX,
  mountCommandCodeMirror,
} from "../src/host/codemirror";

describe("command CodeMirror sizing", () => {
  it("uses a fixed tall typing height (not height:auto)", () => {
    assert.ok(COMMAND_CM_HEIGHT_PX >= 280);
    assert.ok(COMMAND_CM_HEIGHT_PX <= 480);
  });

  it("mounts with setSize 100% × fixed height", () => {
    const calls: Array<{ width: unknown; height: unknown }> = [];
    const optionsSeen: Record<string, unknown>[] = [];
    const prev = (globalThis as any).CodeMirror;
    (globalThis as any).CodeMirror = (
      _host: HTMLElement,
      options: Record<string, unknown>,
    ) => {
      optionsSeen.push(options);
      return {
        getValue: () => "",
        setValue: () => {},
        focus: () => {},
        refresh: () => {},
        on: () => {},
        getWrapperElement: () => ({ style: {} }) as any,
        setSize: (width: unknown, height: unknown) => {
          calls.push({ width, height });
        },
      };
    };
    try {
      const host = { firstChild: null, removeChild: () => {} } as any;
      const cm = mountCommandCodeMirror(host, {
        value: "loot()",
        onChange: () => {},
        onCtrlEnter: () => {},
      });
      assert.ok(cm);
      assert.equal(optionsSeen[0].viewportMargin, undefined);
      assert.equal(calls[0].width, "100%");
      assert.equal(calls[0].height, COMMAND_CM_HEIGHT_PX);
    } finally {
      if (prev === undefined) delete (globalThis as any).CodeMirror;
      else (globalThis as any).CodeMirror = prev;
    }
  });
});
