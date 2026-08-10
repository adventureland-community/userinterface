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
  target?: string;
  party?: string;
  pdps?: number;
  range?: number;
  x?: number;
  y?: number;
  real_x?: number;
  real_y?: number;
  visible?: boolean;
  dead?: boolean;
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
    map?: { map_name?: string };
    xtarget?: EntityLike | null;
    item_container?: (item: any, actual?: any) => string;
    add_tint?: (selector: string, args?: any) => void;
    simple_distance?: (a: any, b: any) => number;
    calculate_difficulty?: (monster: any) => number;
  }
}

export {};
