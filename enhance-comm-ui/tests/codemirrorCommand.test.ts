import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COMMAND_CM_HEIGHT_PX,
  mountCommandCodeMirror,
  syncCommandCodeMirrorSize,
} from "../src/host/codemirror";
import {
  buildSnippetTree,
  expandCommandTemplate,
  flattenVisibleSnippets,
} from "../src/lib/commandSnippets";

describe("command CodeMirror sizing", () => {
  it("keeps a usable floor height", () => {
    assert.ok(COMMAND_CM_HEIGHT_PX >= 280);
    assert.ok(COMMAND_CM_HEIGHT_PX <= 480);
  });

  it("mounts with setSize 100% × host/floor height", () => {
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
      const host = {
        firstChild: null,
        removeChild: () => {},
        clientHeight: 0,
      } as any;
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

  it("syncCommandCodeMirrorSize grows with the host box", () => {
    const calls: Array<{ width: unknown; height: unknown }> = [];
    const cm = {
      setSize: (width: unknown, height: unknown) => {
        calls.push({ width, height });
      },
      refresh: () => {},
    } as any;
    syncCommandCodeMirrorSize(cm, { clientHeight: 480 } as any);
    assert.equal(calls[0].width, "100%");
    assert.equal(calls[0].height, 480);
    syncCommandCodeMirrorSize(cm, { clientHeight: 100 } as any);
    assert.equal(calls[1].height, COMMAND_CM_HEIGHT_PX);
  });
});

describe("command snippet tree", () => {
  it("groups by folder and keeps ungrouped at the end", () => {
    const tree = buildSnippetTree(
      [
        { id: "1", name: "A", code: "a()", folder: "combat" },
        { id: "2", name: "B", code: "b()" },
        { id: "3", name: "C", code: "c()", folder: "utils" },
        { id: "4", name: "D", code: "d()", folder: "combat" },
      ],
      "",
    );
    assert.equal(tree.length, 3);
    assert.equal(tree[0].key, "combat");
    assert.equal(tree[0].items.length, 2);
    assert.equal(tree[1].key, "utils");
    assert.equal(tree[2].key, "__none__");
    assert.equal(tree[2].label, "Ungrouped");
    assert.equal(tree[2].items[0].name, "B");
  });

  it("puts pinned snippets in a top Pinned bucket", () => {
    const tree = buildSnippetTree(
      [
        { id: "1", name: "A", code: "a()", folder: "combat", pinned: true },
        { id: "2", name: "B", code: "b()", folder: "combat" },
      ],
      "",
    );
    assert.equal(tree[0].key, "__pinned__");
    assert.equal(tree[0].items[0].id, "1");
    assert.equal(tree[1].key, "combat");
    assert.equal(tree[1].items[0].id, "2");
  });

  it("filters across name, code, and folder", () => {
    const tree = buildSnippetTree(
      [
        { id: "1", name: "Stop move", code: "stop('move')" },
        { id: "2", name: "Loot", code: "loot()", folder: "farm" },
      ],
      "farm",
    );
    assert.equal(tree.length, 1);
    assert.equal(tree[0].items[0].name, "Loot");
  });

  it("flattenVisibleSnippets skips collapsed folders", () => {
    const tree = buildSnippetTree(
      [
        { id: "1", name: "A", code: "a()", folder: "combat" },
        { id: "2", name: "B", code: "b()" },
      ],
      "",
    );
    const flat = flattenVisibleSnippets(tree, { combat: true }, false);
    assert.equal(flat.length, 1);
    assert.equal(flat[0].id, "2");
    const searching = flattenVisibleSnippets(tree, { combat: true }, true);
    assert.equal(searching.length, 2);
  });
});

describe("command templates", () => {
  it("expands known placeholders from ctx", () => {
    const out = expandCommandTemplate(
      "say('{{name}} @ {{map}} {{x}},{{y}} on {{server}}') // {{target}} {{region}} {{id}}",
      {
        name: "Alice",
        map: "main",
        server: "EU I",
        region: "EU",
        id: "42",
        x: "10",
        y: "-20",
        target: "mob1",
      },
    );
    assert.equal(out, "say('Alice @ main 10,-20 on EU I') // mob1 EU 42");
  });

  it("drops unknown placeholders", () => {
    assert.equal(
      expandCommandTemplate("{{nope}}()", {
        name: "",
        map: "",
        server: "",
        region: "",
        id: "",
        x: "",
        y: "",
        target: "",
      }),
      "()",
    );
  });
});
