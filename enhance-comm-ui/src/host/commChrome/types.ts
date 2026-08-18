export type CommChar = {
  name: string;
  level?: number;
  /** Server key, e.g. `SR_EUI` — matches `CommServer.key`. */
  server?: string;
  /** Observer secret used by stock `observe_character` / `init_socket`. */
  secret?: string;
  rip?: boolean;
  skin?: string;
  cx?: any;
  online?: boolean;
  type?: string;
};

export type CommServer = {
  region: string;
  name: string;
  players: number;
  /** Stable id matching `CommChar.server` (e.g. `SR_EUI`). */
  key?: string;
  address?: string;
  path?: string;
};

declare global {
  interface Window {
    /** Rolling RTT samples (ms), capped ~40 by stock `push_ping`. */
    pings?: number[];
    sprite?: (skin: string, opts?: any) => string;
    server_to_ui?: (server: any) => string;
    observe_character?: (name: string) => boolean | void;
    /** Connect spectator/observer socket; omit secret to leave observe mode. */
    init_socket?: (args?: { secret?: string }) => void;
    /** Toggle observe: same chip again clears watch (spectator reconnect). */
    __ecuToggleObserve?: (name: string) => void;
    /** Leave observe without picking another character. */
    __ecuClearObserve?: () => void;
    btc?: (event: Event, type?: string) => void;
    /** Stock entity JSON modal (`show_json(game_stringify(e))`). */
    ui_inspect?: (entity: unknown) => void;
    bc?: (el: any) => boolean;
    render_characters?: () => void;
    render_servers?: () => void;
    hide_nav?: () => void;
    toggle_ui?: () => void;
    show_commander?: (fvalue?: string) => void;
    draw_trigger?: (fn: () => void) => void;
    render_inventory?: (reset?: any) => void;
    select_comm_server?: (index: number | string) => void;
    toggle_comm_server_dd?: (event?: any) => void;
    close_comm_server_dd?: () => void;
    __ecuCommChromePatched?: boolean;
  }
}

export function esc(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
