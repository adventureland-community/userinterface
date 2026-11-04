/** Injected at build time via tsup `define`. */
declare const __ECU_VERSION__: string;
declare const __ECU_BUILD_TIME__: string;
/** True when built via `npm run watch` / `npm run dev` (`ECU_DEV=1`). */
declare const __ECU_DEV__: boolean;
/**
 * Baked preferred LAN (or loopback) `/enhance-comm-ui.user.js` URL for Settings.
 * Empty string on production builds.
 */
declare const __ECU_DEV_INSTALL_URL__: string;
/** Ranked LAN `.user.js` candidates (Wi‑Fi first). Empty on production. */
declare const __ECU_DEV_INSTALL_URLS__: string[];
