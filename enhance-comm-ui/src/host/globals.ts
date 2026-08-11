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
   * Full character packets only (observe welcome / self) — stranger soft-sync
   * omits it. getObserving() re-resolves from courage + aggro for /comm.
   * Tiers: 1 scared, 2–3 terrified, 4+ petrified (stock client logs).
   */
  fear?: number;
  courage?: number;
  mcourage?: number;
  pcourage?: number;
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

export type GLike = {
  conditions?: Record<string, { skin?: string; ui?: boolean; [key: string]: any }>;
  skills?: Record<string, { skin?: string; ui?: boolean; [key: string]: any }>;
  items?: Record<string, { skin?: string; [key: string]: any }>;
  monsters?: Record<string, any>;
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
    S?: ServerInfoLike;
    socket?: SocketLike;
    server_region?: string;
    server_identifier?: string;
    server_address?: string;
    server_path?: string;
    map?: { map_name?: string };
    xtarget?: EntityLike | null;
    item_container?: (item: any, actual?: any) => string;
    condition_click?: (name: string) => void;
    slot_click?: (name: string) => void;
    add_tint?: (selector: string, args?: any) => void;
    get_tint?: (selector: string) => { added?: boolean; [key: string]: any } | null;
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
