/**
 * observeCharacter must force a realm hop when roster says off-server —
 * stock observe_character(same name) only emits o:home.
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  observeCharacter,
  formatServerKeyLabel,
} from "../src/host/commChrome/chromeActions";

afterEach(() => {
  delete (globalThis as any).window;
});

describe("observeCharacter cross-server follow", () => {
  it("skips stock observe_character when roster server differs (force init_socket)", () => {
    let stockCalls = 0;
    let initArgs: unknown = null;
    (globalThis as any).window = {
      server_region: "US",
      server_identifier: "II",
      observing: { name: "thmsn", id: "1" },
      observe_character() {
        stockCalls += 1;
        return true; // would be o:home — must not be trusted for hops
      },
      init_socket(args?: { secret?: string }) {
        initArgs = args || {};
      },
      X: {
        characters: [
          {
            name: "thmsn",
            online: true,
            server: "SR_EUI",
            secret: "sec-thmsn",
          },
        ],
        servers: [
          { region: "US", name: "II", key: "SR_USII", address: "us", path: "/us" },
          {
            region: "EU",
            name: "I",
            key: "SR_EUI",
            address: "eu.example",
            path: "/eu",
          },
        ],
      },
    };

    const ok = observeCharacter("thmsn");
    assert.equal(ok, true);
    assert.equal(stockCalls, 0, "must not call stock same-name observe");
    assert.deepEqual(initArgs, { secret: "sec-thmsn" });
    assert.equal((globalThis as any).window.server_address, "eu.example");
    assert.equal((globalThis as any).window.server_path, "/eu");
  });

  it("uses stock observe_character when already on the character's realm", () => {
    let stockCalls = 0;
    let initCalls = 0;
    (globalThis as any).window = {
      server_region: "EU",
      server_identifier: "I",
      observing: null,
      observe_character() {
        stockCalls += 1;
        return true;
      },
      init_socket() {
        initCalls += 1;
      },
      X: {
        characters: [
          {
            name: "thmsn",
            online: true,
            server: "SR_EUI",
            secret: "sec",
          },
        ],
        servers: [
          { region: "EU", name: "I", key: "SR_EUI", address: "eu", path: "/" },
        ],
      },
    };

    assert.equal(observeCharacter("thmsn"), true);
    assert.equal(stockCalls, 1);
    assert.equal(initCalls, 0);
  });
});

describe("formatServerKeyLabel", () => {
  it("prefers server_to_ui then region+name from X.servers", () => {
    (globalThis as any).window = {
      server_to_ui: (k: string) => (k === "SR_EUI" ? "EU I" : ""),
      X: { servers: [] },
    };
    assert.equal(formatServerKeyLabel("SR_EUI"), "EU I");

    (globalThis as any).window = {
      X: {
        servers: [
          { region: "US", name: "II", key: "SR_USII" },
        ],
      },
    };
    assert.equal(formatServerKeyLabel("SR_USII"), "US II");
  });
});
