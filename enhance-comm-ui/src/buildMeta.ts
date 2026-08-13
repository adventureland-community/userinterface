/**
 * Build fingerprint for verifying Tampermonkey picked up the latest `npm run dev` bundle.
 * Values are string-replaced by tsup at compile time.
 */

export type EcuBuildInfo = {
  version: string;
  builtAt: string;
  /** Epoch ms when this bundle was compiled (from builtAt). */
  builtAtMs: number;
};

export function getEcuBuildInfo(): EcuBuildInfo {
  const version =
    typeof __ECU_VERSION__ === "string" ? __ECU_VERSION__ : "unknown";
  const builtAt =
    typeof __ECU_BUILD_TIME__ === "string"
      ? __ECU_BUILD_TIME__
      : "unknown";
  const builtAtMs = Date.parse(builtAt);
  return {
    version,
    builtAt,
    builtAtMs: Number.isFinite(builtAtMs) ? builtAtMs : 0,
  };
}

/** Publish on window + one clear console line so DEV reload is obvious. */
export function publishEcuBuildInfo(): EcuBuildInfo {
  const info = getEcuBuildInfo();
  const w = window as Window & { __ECU_BUILD__?: EcuBuildInfo };
  w.__ECU_BUILD__ = info;
  // Loud on purpose — confirms which bundle Tampermonkey actually injected.
  console.info(
    `[ecu] enhance-comm-ui v${info.version} built ${info.builtAt}`,
    info,
  );
  return info;
}
