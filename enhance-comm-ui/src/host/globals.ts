/** Narrow Window extensions for /comm host APIs. */

export type EntityLike = {
  id: string;
  name?: string;
  type?: string;
  player?: boolean;
  /** Local self from `add_character(data, 1)` — not set on soft-synced others. */
  me?: boolean;
  ctype?: string;
  level?: number;
  hp?: number;
  max_hp?: number;
  mp?: number;
  max_mp?: number;
  /** Current XP — `player_to_client` sends this even for strangers. */
  xp?: number;
  /** XP to next level. Full sync only; otherwise use `G.levels[level]`. */
  max_xp?: number;
  mtype?: string;
  cooperative?: boolean;
  /** Player combat target id (monster id / player id); may be number from server. */
  target?: string | number | null;
  party?: string;
  pdps?: number;
  range?: number;
  x?: number;
  y?: number;
  real_x?: number;
  real_y?: number;
  /** Movement goal while pathing (map space). */
  going_x?: number;
  going_y?: number;
  visible?: boolean;
  dead?: boolean | string;
  /** G map key while observing (not observer chrome `window.map`). */
  map?: string;
  in?: string;
  focus?: string;
  attack?: number;
  frequency?: number;
  armor?: number;
  resistance?: number;
  evasion?: number;
  reflection?: number;
  speed?: number;
  heal?: number;
  damage_type?: string;
  age?: number;
  stand?: boolean | string;
  slots?: Record<string, SlotLike | null | undefined>;
  s?: Record<string, StatusLike | undefined>;
  q?: Record<string, any>;
  /**
   * Courage overflow. Soft stranger sync omits fear/courage; /comm estimates
   * from G + gear + conditions + live aggro.
   * Tiers (server combat): 1 scared, 2 terrified, 3+ petrified.
   */
  fear?: number;
  courage?: number;
  mcourage?: number;
  pcourage?: number;
  /** Base body/armor skin for `sprite(skin, { cx })`. */
  skin?: string;
  /** Cosmetic map (head/hair/hat/…) for `sprite()`. */
  cx?: Record<string, string> | any;
  /** Dead / rip — `sprite` draws gravestone when set. */
  rip?: boolean;
  /** Inventory slots while observing (bag panel). */
  items?: any[];
  /** Inventory size (slot count) while observing. */
  isize?: number;
  /** Empty inventory slots — full sync / party / friends only. */
  esize?: number;
  /** Wallet gold. Full sync / welcome only — stranger packets omit it. */
  gold?: number;
  /** Trade sales tax rate (0–1). Full sync on self / observed character. */
  tax?: number;
  /** Drop luck multiplier (`1 + xluck/100`). Full sync / welcome only. */
  luckm?: number;
  /** Gold-find multiplier (`1 + xgold/100`). Full sync / welcome only. */
  goldm?: number;
  /** A/B Testing team assignment (`A` / `B`) when on abtesting map. */
  team?: string;
};

export type SlotLike = {
  name?: string;
  level?: number;
  q?: number;
  price?: number;
  b?: boolean;
  giveaway?: boolean;
  /** Giveaway entrant registry — id → name. */
  registry?: Record<string, string>;
  rid?: string;
  skin?: string;
  /** Title / shiny / etc. — used by calculate_item_properties. */
  p?: string;
  stat_type?: string;
};

export type StatusLike = {
  ms?: number;
  s?: number;
  id?: string;
  p?: number;
  skin?: string;
  [key: string]: any;
};

export type GConditionDef = {
  name?: string;
  skin?: string;
  ui?: boolean;
  buff?: boolean;
  debuff?: boolean;
  [key: string]: any;
};

export type GLike = {
  conditions?: Record<string, GConditionDef>;
  skills?: Record<
    string,
    { name?: string; skin?: string; ui?: boolean; [key: string]: any }
  >;
  items?: Record<
    string,
    {
      name?: string;
      skin?: string;
      wtype?: string;
      type?: string;
      [key: string]: any;
    }
  >;
  /** Class defs — `looks[0]` is the default character-select sprite. */
  classes?: Record<
    string,
    { looks?: Array<[string, Record<string, string>?]>; [key: string]: any }
  >;
  monsters?: Record<string, any>;
  /** XP required per level — `G.levels[level]`. */
  levels?: Record<string, number>;
  maps?: Record<
    string,
    {
      name?: string;
      instance?: boolean;
      event?: string;
      pvp?: boolean;
      quirks?: any[];
      monsters?: Array<{ type?: string; [key: string]: any }>;
      data?: {
        min_x?: number;
        min_y?: number;
        max_x?: number;
        max_y?: number;
        x_lines?: Array<[number, number, number]>;
        y_lines?: Array<[number, number, number]>;
        [key: string]: any;
      };
      [key: string]: any;
    }
  >;
  /** Collision / map extent — same object as `maps[name].data` after process_game_data. */
  geometry?: Record<
    string,
    {
      min_x?: number;
      min_y?: number;
      max_x?: number;
      max_y?: number;
      x_lines?: Array<[number, number, number]>;
      y_lines?: Array<[number, number, number]>;
      [key: string]: any;
    }
  >;
  events?: Record<
    string,
    {
      name?: string;
      join?: boolean;
      sprite?: string;
      type?: string;
      duration?: number;
      [key: string]: any;
    }
  >;
  positions?: Record<string, [string, number, number] | any>;
  imagesets?: Record<
    string,
    { file: string; size: number; columns: number; rows: number }
  >;
  sets?: Record<string, Record<string | number, any>>;
};

export type ServerInfoLike = {
  schedule?: { time_offset?: number | string; night?: boolean };
  [key: string]: any;
};

export type SocketLike = {
  id?: string;
  /** Socket.IO client flag; false after a drop. */
  connected?: boolean;
  on: (event: string, cb: (...args: any[]) => void) => void;
  off?: (event: string, cb?: (...args: any[]) => void) => void;
  /** Socket.IO client emit (observer commands use `o:command`). */
  emit?: (event: string, ...args: any[]) => void;
};

export type PixiRectLike = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PixiDisplayObjectLike = {
  x?: number;
  y?: number;
  interactive?: boolean;
  interactiveChildren?: boolean;
  buttonMode?: boolean;
  cursor?: string;
  hitArea?: unknown;
  parent?: unknown;
  anchor?: { set: (x: number, y?: number) => void };
  on?: (event: string, cb: (...args: any[]) => void) => unknown;
  destroy?: (opts?: { children?: boolean }) => void;
};

declare global {
  interface Window {
    React?: any;
    ReactDOM?: any;
    G?: GLike;
    entities?: Record<string, EntityLike> | EntityLike[];
    observing?: EntityLike | null;
    /** Active self while playing; null on /comm except bag borrow. */
    character?: EntityLike | null;
    X?: {
      characters?: Array<{
        name?: string;
        id?: string;
        type?: string;
        skin?: string;
        level?: number;
        online?: boolean;
        server?: string;
        rip?: boolean;
        cx?: any;
        secret?: string;
      }>;
      servers?: any[];
      /** Unread mail count (`user_data.info.mail`). */
      unread?: number;
      [key: string]: any;
    };
    S?: ServerInfoLike;
    socket?: SocketLike;
    /** Stock /comm + /game: tears down the socket and shows DISCONNECTED. */
    disconnect?: () => void;
    refresh_page?: () => void;
    disconnect_reason?: string;
    __ecuDisconnectOverlayPatched?: boolean;
    server_region?: string;
    server_identifier?: string;
    server_address?: string;
    server_path?: string;
    /** Observer/player camera map key — updated on welcome + new_map. */
    current_map?: string;
    /** Observer/player instance id (`in`) — updated on welcome + new_map. */
    current_in?: string;
    map?: {
      map_name?: string;
      addChild?: (...c: unknown[]) => void;
      removeChild?: (...c: unknown[]) => void;
      children?: unknown[];
    };
    /** PIXI layers plugin group used by stock quirks / entities. */
    player_layer?: unknown;
    PIXI?: {
      Graphics: new () => unknown;
      Container?: new () => unknown;
      Text?: new (text: string, style?: Record<string, unknown>) => unknown;
      Sprite?: new () => PixiDisplayObjectLike;
      Rectangle?: new (
        x: number,
        y: number,
        width: number,
        height: number,
      ) => PixiRectLike;
    };
    no_graphics?: boolean;
    xtarget?: EntityLike | null;
    sprite?: (skin: string, opts?: any) => string;
    item_container?: (item: any, actual?: any) => string;
    condition_click?: (name: string) => void;
    slot_click?: (name: string) => void;
    add_log?: (message: string, color?: string) => void;
    render_mainframe?: () => void;
    render_none_shrine?: () => void;
    render_upgrade_shrine?: (explicit?: number) => void;
    render_compound_shrine?: (explicit?: number) => void;
    the_lever?: () => void;
    add_tint?: (selector: string, args?: any) => void;
    get_tint?: (
      selector: string,
    ) => { added?: boolean; [key: string]: any } | null;
    simple_distance?: (a: any, b: any) => number;
    calculate_difficulty?: (monster: any) => number;
    /** Stock item stat calc from `/js/old_common_functions.js` on `/comm`. */
    calculate_item_properties?: (
      item: SlotLike & { name: string },
      args?: { class?: string; map?: string; def?: unknown },
    ) => Record<string, unknown>;
    /** Stock /comm COMMAND modal; hooked by enhance-comm-ui. */
    show_commander?: (fvalue?: string) => void;
    /**
     * CodeMirror 5 from `/js/codemirror/...` on `/comm`
     * (javascript mode + pixel theme CSS already loaded).
     */
    CodeMirror?: (
      place: HTMLElement | ((el: HTMLElement) => void),
      options?: Record<string, any>,
    ) => {
      getValue: () => string;
      setValue: (value: string) => void;
      focus: () => void;
      refresh: () => void;
      on: (event: string, handler: (...args: any[]) => void) => void;
      off?: (event: string, handler: (...args: any[]) => void) => void;
      getWrapperElement: () => HTMLElement;
      setSize: (
        width: string | number | null,
        height: string | number | null,
      ) => void;
    };
  }
}

export {};
