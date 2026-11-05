/**
 * Boot stock Adventure Land /comm host (PIXI + game.js) for overlay preview.
 * ECU loads after this and wraps real add_name_tag / FOV / camera like live.
 */

type StockWindow = Window & {
  __ecuOverlayPreview?: boolean;
  __ecuStockHost?: boolean;
  __ecuStockHostReady?: boolean;
  __ecuDrawPatch?: boolean;
  __ecuRenderPump?: boolean;
  is_comm?: boolean;
  inside?: string;
  scale?: number | string;
  cached_map?: boolean;
  force_webgl?: boolean;
  socket?: { emit: (...a: unknown[]) => void; on: (...a: unknown[]) => void };
  socket_ready?: boolean;
  resources_loaded?: boolean;
  game_loaded?: boolean;
  renderer?: {
    view?: HTMLElement;
    resize?: (w: number, h: number) => void;
    render?: (stage: unknown) => void;
  };
  stage?: unknown;
  draw?: (...args: unknown[]) => void;
  retile_the_map?: () => void;
  init_socket?: () => void;
  the_game?: (demo?: unknown) => void;
  launch_game?: () => void;
  load_game?: () => void;
  on_resize?: () => void;
  init_sounds?: () => void;
  drag_logic?: () => void;
  code_logic?: () => void;
  set_status?: (s: string) => void;
  G?: unknown;
  PIXI?: unknown;
  current_map?: string;
  current_in?: string;
  M?: unknown;
  GEO?: { tiles?: unknown[]; default?: number };
  observing?: unknown;
  character?: unknown;
  entities?: Record<string, unknown>;
  tile_sprites?: Record<string, unknown[]>;
  tile_textures?: Record<string, unknown[]>;
  sprite_last?: Record<string, unknown[]>;
  last_draw?: Date;
  paused?: boolean;
};

function prepareMapGeometry(w: StockWindow, mapName: string): boolean {
  const G = w.G as {
    maps?: Record<string, { data?: unknown }>;
    geometry?: Record<string, { tiles?: unknown[] }>;
  };
  if (!G || !G.maps || !G.maps[mapName] || !G.geometry || !G.geometry[mapName]) {
    console.error("[ecu] missing G.maps/geometry for", mapName);
    return false;
  }
  w.current_map = mapName;
  w.current_in = mapName;
  w.M = G.maps[mapName].data;
  w.GEO = G.geometry[mapName];
  return true;
}

function installOverlaySocketStub(w: StockWindow): void {
  w.init_socket = function ecuOverlayInitSocket() {
    w.socket = {
      emit: function () {},
      on: function () {},
    };
    w.socket_ready = true;
    if (w.resources_loaded && typeof w.launch_game === "function") {
      try {
        if (!prepareMapGeometry(w, w.current_map || "main")) return;
        w.launch_game();
      } catch (err) {
        console.warn("[ecu] launch_game failed", err);
      }
    }
  };
}

/**
 * Retile does `sprite_last[current_map][i] = 0` — only ensure that array exists.
 * Never pre-seed tile_sprites/tile_textures slots: create_map treats a truthy
 * empty `[]` as "already built" and skips real PIXI textures (black ground).
 */
function healTilePools(w: StockWindow): void {
  const map = w.current_map;
  if (!map) return;
  if (!w.sprite_last) w.sprite_last = {};
  if (!Array.isArray(w.sprite_last[map])) w.sprite_last[map] = [];
}

/**
 * Stock draw() dies if retile throws — rAF chain stops and the canvas goes black.
 * Wrap before the_game so requestAnimationFrame(draw) picks up the patch.
 */
function patchDrawResilience(w: StockWindow): void {
  if (w.__ecuDrawPatch) return;
  w.__ecuDrawPatch = true;
  const origDraw = w.draw;
  if (typeof origDraw !== "function") return;
  w.draw = function ecuPatchedDraw(this: unknown, ...args: unknown[]) {
    try {
      healTilePools(w);
      return origDraw.apply(this, args);
    } catch (err) {
      console.warn("[ecu] draw error (continuing)", err);
      try {
        if (w.renderer && typeof w.renderer.render === "function" && w.stage) {
          w.renderer.render(w.stage);
        }
      } catch {
        /* ignore */
      }
      const manual = args[1];
      if (!manual && typeof requestAnimationFrame === "function") {
        requestAnimationFrame(function () {
          if (typeof w.draw === "function") w.draw();
        });
      }
    }
  };
}

/** Fallback paint if stock draw stalls (Playwright / phone:flows). */
function startOverlayRenderPump(w: StockWindow): void {
  if (w.__ecuRenderPump) return;
  w.__ecuRenderPump = true;
  const tick = () => {
    try {
      if (
        w.renderer &&
        typeof w.renderer.render === "function" &&
        w.stage &&
        !w.paused
      ) {
        const last = w.last_draw ? Date.now() - w.last_draw.getTime() : 9999;
        if (last > 250) w.renderer.render(w.stage);
      }
    } catch {
      /* ignore */
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** PIXI v4 loader throws if the same URL is added twice (shared tileset files). */
function patchLoaderAllowDuplicates(w: StockWindow): void {
  const PIXI = w.PIXI as {
    loader?: {
      add: (...args: unknown[]) => unknown;
      resources?: Record<string, unknown>;
    };
  };
  const loader = PIXI && PIXI.loader;
  if (!loader || typeof loader.add !== "function") return;
  if ((loader as { __ecuDupPatch?: boolean }).__ecuDupPatch) return;
  (loader as { __ecuDupPatch?: boolean }).__ecuDupPatch = true;
  const orig = loader.add.bind(loader);
  loader.add = function patchedAdd(this: unknown, ...args: unknown[]) {
    try {
      return orig(...args);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already exists")) return loader;
      throw err;
    }
  };
}

/**
 * Start stock the_game(). Resolves when game_loaded is true (or times out).
 */
export function bootStockHost(): Promise<boolean> {
  const w = window as StockWindow;
  if (w.__ecuStockHostReady && w.game_loaded) {
    return Promise.resolve(true);
  }
  if (w.__ecuStockHost) {
    return waitForGameLoaded(w);
  }
  w.__ecuStockHost = true;
  w.__ecuOverlayPreview = true;
  w.is_comm = true;
  w.inside = "com";
  if (w.scale == null || (typeof w.scale === "string" && !w.scale)) {
    w.scale = 2;
  }
  w.cached_map = false;
  // Canvas engine — WebGL backbuffer can't be preserved (PIXI getters are sealed).
  (w as { engine_mode?: string }).engine_mode = "canvas";
  w.force_webgl = false;
  w.character = null;
  // Stock lighting multiply blacks out the preview if the light layer isn't fed.
  const mode = (w as { mode?: { ltbl?: number } }).mode;
  if (mode) mode.ltbl = 0;

  if (!w.PIXI) {
    console.error("[ecu] stock PIXI missing — run npm run overlay:sync");
    return Promise.resolve(false);
  }
  if (typeof w.the_game !== "function") {
    console.error("[ecu] stock game.js missing — run npm run overlay:sync");
    return Promise.resolve(false);
  }
  if (!w.G) {
    console.error("[ecu] window.G missing — data.js failed to load");
    return Promise.resolve(false);
  }

  if (!prepareMapGeometry(w, "main")) {
    return Promise.resolve(false);
  }

  installOverlaySocketStub(w);
  patchLoaderAllowDuplicates(w);
  patchDrawResilience(w);

  // Keep game_loaded even if draw()/fps chrome throws (missing optional globals).
  if (typeof w.launch_game === "function" && !(w as { __ecuLaunchPatch?: boolean }).__ecuLaunchPatch) {
    (w as { __ecuLaunchPatch?: boolean }).__ecuLaunchPatch = true;
    const origLaunch = w.launch_game.bind(w);
    w.launch_game = function patchedLaunchGame() {
      try {
        origLaunch();
      } catch (err) {
        console.warn("[ecu] launch_game error (continuing)", err);
      }
      if (!w.game_loaded) w.game_loaded = true;
    };
  }

  // cosmetics_logic assumes sprite.cx — tolerate incomplete preview payloads.
  const gw = w as StockWindow & {
    cosmetics_logic?: (sprite: { cx?: Record<string, unknown> }) => void;
  };
  if (typeof gw.cosmetics_logic === "function" && !(gw as { __ecuCxPatch?: boolean }).__ecuCxPatch) {
    (gw as { __ecuCxPatch?: boolean }).__ecuCxPatch = true;
    const origCx = gw.cosmetics_logic.bind(gw);
    gw.cosmetics_logic = function patchedCosmetics(sprite) {
      if (!sprite.cx) sprite.cx = {};
      try {
        origCx(sprite);
      } catch (err) {
        console.warn("[ecu] cosmetics_logic skipped", err);
      }
    };
  }

  try {
    if (typeof w.init_sounds === "function") w.init_sounds();
  } catch {
    /* sounds optional */
  }

  try {
    w.the_game();
  } catch (err) {
    console.error("[ecu] the_game() threw", err);
    // Renderer may already exist; still wait in case load_game was started.
    if (!w.renderer) return Promise.resolve(false);
  }

  try {
    if (typeof w.drag_logic === "function") w.drag_logic();
    if (typeof w.on_resize === "function") {
      window.onresize = w.on_resize;
      w.on_resize();
    }
    // Skip code_logic — needs Monaco create_editor (not loaded in overlay).
    if (typeof w.set_status === "function") w.set_status("50%");
  } catch (err) {
    console.warn("[ecu] stock post-boot hooks", err);
  }

  return waitForGameLoaded(w);
}

function waitForGameLoaded(w: StockWindow): Promise<boolean> {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      if (w.game_loaded) {
        w.__ecuStockHostReady = true;
        startOverlayRenderPump(w);
        resolve(true);
        return;
      }
      if (Date.now() - started > 120000) {
        console.error("[ecu] stock host timed out waiting for game_loaded");
        resolve(false);
        return;
      }
      window.setTimeout(tick, 100);
    };
    tick();
  });
}

export function isStockHostReady(): boolean {
  const w = window as StockWindow;
  return !!(w.__ecuStockHostReady && w.game_loaded && w.renderer);
}
