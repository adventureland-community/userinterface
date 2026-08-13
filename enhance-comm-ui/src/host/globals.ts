/** Narrow Window extensions for /comm host APIs. */

export type EntityLike = {
  id: string;
  name?: string;
  type?: string;
  player?: boolean;
  ctype?: string;
  level?: number;
  hp?: number;
  max_hp?: number;
  mp?: number;
  max_mp?: number;
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
   * Courage overflow (targets beyond courage / mcourage / pcourage).
   * Only on full player packets (observing / self) — not stranger entities.
   * Tiers: 1 scared, 2–3 terrified, 4+ petrified (stock client logs).
   */
  fear?: number;
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
};

export type SlotLike = {
  name?: string;
  level?: number;
  q?: number;
  price?: number;
  b?: boolean;
  giveaway?: boolean;
  rid?: string;
  skin?: string;
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
  items?: Record<string, { name?: string; skin?: string; [key: string]: any }>;
  /** Class defs — `looks[0]` is the default character-select sprite. */
  classes?: Record<
    string,
    { looks?: Array<[string, Record<string, string>?]>; [key: string]: any }
  >;
  monsters?: Record<string, any>;
  maps?: Record<
    string,
    {
      name?: string;
      instance?: boolean;
      event?: string;
      pvp?: boolean;
      monsters?: Array<{ type?: string; [key: string]: any }>;
      [key: string]: any;
    }
  >;
  events?: Record<
    string,
    {
      name?: string;
      join?: boolean;
      sprite?: string;
      [key: string]: any;
    }
  >;
  positions?: Record<string, [string, number, number] | any>;
  imagesets?: Record<
    string,
    { file: string; size: number; columns: number; rows: number }
  >;
};

export type ServerInfoLike = {
  schedule?: { time_offset?: number | string; night?: boolean };
  [key: string]: any;
};

export type SocketLike = {
  id?: string;
  on: (event: string, cb: (...args: any[]) => void) => void;
  off?: (event: string, cb?: (...args: any[]) => void) => void;
  /** Socket.IO client emit (observer commands use `o:command`). */
  emit?: (event: string, ...args: any[]) => void;
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
      [key: string]: any;
    };
    S?: ServerInfoLike;
    socket?: SocketLike;
    server_region?: string;
    server_identifier?: string;
    server_address?: string;
    server_path?: string;
    /** Observer/player camera map key — updated on welcome + new_map. */
    current_map?: string;
    /** Observer/player instance id (`in`) — updated on welcome + new_map. */
    current_in?: string;
    map?: { map_name?: string };
    xtarget?: EntityLike | null;
    sprite?: (skin: string, opts?: any) => string;
    item_container?: (item: any, actual?: any) => string;
    condition_click?: (name: string) => void;
    slot_click?: (name: string) => void;
    add_tint?: (selector: string, args?: any) => void;
    get_tint?: (
      selector: string,
    ) => { added?: boolean; [key: string]: any } | null;
    simple_distance?: (a: any, b: any) => number;
    calculate_difficulty?: (monster: any) => number;
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
