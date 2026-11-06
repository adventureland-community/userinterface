import { e, getReact } from "../../../host/react";
import { confirmAndFactoryResetCommUi } from "../../../lib/factoryReset";
import {
  GAME_FPS_CAPS,
  formatGameFpsReadout,
  gameFpsCapLabel,
  type GameFpsCap,
} from "../../../lib/gameFpsCap";
import {
  GAME_RENDER_SCALES,
  gameRenderScaleLabel,
  type GameRenderScale,
} from "../../../lib/gameRenderScale";
import { isPhoneViewport } from "../../../lib/perfPrefs";
import { getSettings, patchSettings } from "../../../lib/settings";
import type { GameFpsCapStats } from "../../../host/gameFpsCap";
import { TAMPERMONKEY_QR_CARDS } from "../../../lib/tampermonkeyQr";
import {
  listGuidedTours,
  type GuidedTourListItem,
} from "../comm/guidedTour/tourCatalog";
import { InstallScriptQrCard } from "./InstallScriptQrCard";
import {
  settingsCheckboxRow,
  settingsSection,
  settingsSectionId,
  type SettingsSubsection,
} from "./settingsPaneChrome";

export type CommUiSettingsPaneProps = {
  query?: string;
  onReplayTour: (id: string) => void;
  onResetTour: (id: string) => void;
  onOpenChangelog: () => void;
  onOpenServerUpdateNotes: () => void;
};

type CommUiActionDef = {
  id: "changelog" | "serverNotes";
  label: string;
  help: string;
  buttonLabel: string;
  extra: string;
  onClick: (props: CommUiSettingsPaneProps) => void;
};

const COMM_UI_ACTIONS: readonly CommUiActionDef[] = [
  {
    id: "changelog",
    label: "Changelog",
    help: "Open the full What's New and release history.",
    buttonLabel: "Open changelog",
    extra: "changelog whats new release notes updates history",
    onClick: (props) => props.onOpenChangelog(),
  },
  {
    id: "serverNotes",
    label: "Server update notes",
    help: "Adventure.land release notes from the page / welcome (not Comm UI).",
    buttonLabel: "Open server notes",
    extra:
      "server update notes last deploy adventure.land gamelog welcome patch notes",
    onClick: (props) => props.onOpenServerUpdateNotes(),
  },
];

/** Left-nav fold-out — Guided tours last so install/data stay near the top. */
export const COMM_UI_SUBSECTIONS: readonly SettingsSubsection[] = [
  { id: settingsSectionId("Updates"), label: "Updates" },
  {
    id: settingsSectionId("Controls"),
    label: "Controls",
  },
  {
    id: settingsSectionId("Experimental"),
    label: "Experimental",
  },
  {
    id: settingsSectionId("Mobile install"),
    label: "Mobile install",
    // Desktop → phone handoff; useless once ECU is already running on the phone.
    visible: () => !isPhoneViewport(),
  },
  { id: settingsSectionId("Data"), label: "Data" },
  { id: settingsSectionId("Guided tours"), label: "Guided tours" },
];

function actionMatchesQuery(action: CommUiActionDef, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return `${action.label} ${action.help} ${action.extra}`
    .toLowerCase()
    .includes(q);
}

function tourMatchesQuery(tour: GuidedTourListItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return `${tour.label} ${tour.id} tour guide tutorial replay reset`
    .toLowerCase()
    .includes(q);
}

function dataSectionMatches(query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay =
    "factory default reset wipe clear local storage indexeddb cache data nuke";
  return hay.includes(q);
}

function controlsSectionMatches(query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const phone =
    "joystick side left right thumb camera stick pan phone hand controls";
  const desktop =
    "wheel zoom trackpad scroll camera fov middle accidental laptop desktop controls";
  if (isPhoneViewport()) return phone.includes(q) || "controls".includes(q);
  return (phone + " " + desktop).includes(q);
}

function wheelZoomRowMatches(query: string): boolean {
  // Wheel/trackpad FOV zoom is a desktop input; phones use pinch / Map out·in.
  if (isPhoneViewport()) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return "wheel zoom trackpad scroll camera fov middle accidental laptop desktop".includes(
    q,
  );
}

function joystickSideRowMatches(query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return "joystick side left right thumb camera stick pan phone hand".includes(
    q,
  );
}

function experimentalSectionMatches(query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return "fps frame rate cap limit 30 60 performance experimental gpu cpu battery youtube farm draw background tab hidden blur covered scale resolution".includes(
    q,
  );
}

function readLiveFpsStats(): GameFpsCapStats | null {
  const w = window as Window & {
    __ecuGameFpsCapStats?: () => GameFpsCapStats;
  };
  if (typeof w.__ecuGameFpsCapStats !== "function") return null;
  try {
    return w.__ecuGameFpsCapStats();
  } catch {
    return null;
  }
}

/** Game FPS cap + independent background toggles + live readout. */
export function GameFpsCapSettingsBlock(): any {
  const React = getReact();
  const [, bump] = React.useState(0);
  const [stats, setStats] = React.useState(null as GameFpsCapStats | null);
  React.useEffect(() => {
    setStats(readLiveFpsStats());
    const id = window.setInterval(() => setStats(readLiveFpsStats()), 400);
    return () => window.clearInterval(id);
  }, []);
  const refresh = () => {
    bump((n: number) => n + 1);
    setStats(readLiveFpsStats());
  };
  const settings = getSettings();
  const raw = settings.gameFpsCap;
  const cap: GameFpsCap = raw === 30 || raw === 60 ? raw : 0;
  const buttons: any[] = [];
  for (let i = 0; i < GAME_FPS_CAPS.length; i++) {
    const value = GAME_FPS_CAPS[i] as GameFpsCap;
    buttons.push(
      e(
        "button",
        {
          key: "fps-" + value,
          type: "button",
          className: cap === value ? "is-on" : "",
          "aria-pressed": cap === value ? "true" : "false",
          onClick: () => {
            patchSettings({ gameFpsCap: value });
            refresh();
          },
        },
        gameFpsCapLabel(value),
      ),
    );
  }
  const readout = stats
    ? formatGameFpsReadout({
        fps: stats.fps,
        policy: {
          rate: stats.rate,
          paused: stats.paused,
          reason: stats.reason,
        },
        foreignRaf: stats.foreignRaf,
      })
    : "—";
  const kids: any[] = [
    e(
      "div",
      { key: "game-fps-cap", className: "ecu-settings-row" },
      e(
        "div",
        { className: "ecu-settings-row-copy" },
        e(
          "span",
          { className: "ecu-settings-row-label" },
          "Game FPS cap (while focused)",
        ),
        e(
          "span",
          { className: "ecu-settings-help" },
          "Experimental. Limits the stock map draw loop only (not Comm UI). Off keeps the display rate while you are focused. Expect quirks with other FPS scripts.",
        ),
      ),
      e(
        "div",
        {
          className: "ecu-settings-seg",
          role: "group",
          "aria-label": "Game FPS cap",
        },
        ...buttons,
      ),
    ),
    settingsCheckboxRow(
      "fps-when-hidden",
      "Cap at 60 when tab is hidden",
      !!settings.gameFpsCapWhenHidden,
      (next) => {
        patchSettings({ gameFpsCapWhenHidden: next });
        refresh();
      },
      {
        help: "Other tab or minimized. Works even if the focused cap is Off.",
      },
    ),
    settingsCheckboxRow(
      "fps-when-blurred",
      "Cap at 60 when window is blurred",
      !!settings.gameFpsCapWhenBlurred,
      (next) => {
        patchSettings({ gameFpsCapWhenBlurred: next });
        refresh();
      },
      {
        help: "Multi-monitor / clicked away but the tab may still be visible.",
      },
    ),
    settingsCheckboxRow(
      "fps-pause-covered",
      "Pause draws when map is off-screen",
      !!settings.gameFpsPauseWhenCovered,
      (next) => {
        patchSettings({ gameFpsPauseWhenCovered: next });
        refresh();
      },
      {
        help: "Skips stock paints when the game canvas is scrolled away or fully covered. Keeps the loop alive.",
      },
    ),
    e(
      "div",
      {
        key: "game-fps-readout",
        className: "ecu-settings-row",
        "data-ecu-fps-readout": "1",
      },
      e(
        "div",
        { className: "ecu-settings-row-copy" },
        e("span", { className: "ecu-settings-row-label" }, "Live draw rate"),
        e(
          "span",
          {
            className: "ecu-settings-help",
            "data-ecu-fps-readout-text": readout,
          },
          readout,
        ),
      ),
    ),
  ];
  if (stats && stats.foreignRaf && stats.foreignRafHint) {
    kids.push(
      e(
        "p",
        {
          key: "fps-foreign",
          className: "ecu-settings-help",
          "data-ecu-fps-foreign": "1",
        },
        stats.foreignRafHint,
      ),
    );
  }
  void bump;
  return e(React.Fragment, null, ...kids);
}

/** @deprecated use GameFpsCapSettingsBlock */
export function pushGameFpsCapRow(kids: any[], bump: () => void): void {
  kids.push(e(GameFpsCapSettingsBlock, { key: "fps-block" }));
  void bump;
}

/** Experimental PIXI resolution scale. */
export function GameRenderScaleSettingsBlock(): any {
  const React = getReact();
  const [, bump] = React.useState(0);
  const settings = getSettings();
  const scale = normalizeScale(settings.gameRenderScale);
  const buttons: any[] = [];
  for (let i = 0; i < GAME_RENDER_SCALES.length; i++) {
    const value = GAME_RENDER_SCALES[i] as GameRenderScale;
    buttons.push(
      e(
        "button",
        {
          key: "scale-" + value,
          type: "button",
          className: scale === value ? "is-on" : "",
          "aria-pressed": scale === value ? "true" : "false",
          onClick: () => {
            patchSettings({ gameRenderScale: value });
            bump((n: number) => n + 1);
          },
        },
        gameRenderScaleLabel(value),
      ),
    );
  }
  void bump;
  return e(
    "div",
    { key: "game-render-scale", className: "ecu-settings-row" },
    e(
      "div",
      { className: "ecu-settings-row-copy" },
      e("span", { className: "ecu-settings-row-label" }, "Map render scale"),
      e(
        "span",
        { className: "ecu-settings-help" },
        "Experimental. Lowers PIXI resolution to cut GPU fill. 1× is stock. Try ½ if an FPS cap is not enough — zoom/FOV may look softer. Turn back to 1× if the map looks wrong.",
      ),
    ),
    e(
      "div",
      {
        className: "ecu-settings-seg",
        role: "group",
        "aria-label": "Map render scale",
      },
      ...buttons,
    ),
  );
}

function normalizeScale(raw: unknown): GameRenderScale {
  if (raw === 0.75 || raw === 0.5) return raw;
  return 1;
}

/** Shared camera joystick row (Comm UI Controls + phone Display pane). */
export function pushCameraJoystickSideRow(
  kids: any[],
  bump: () => void,
): void {
  const settings = getSettings();
  const side = settings.cameraJoystickSide === "left" ? "left" : "right";
  kids.push(
    e(
      "div",
      { key: "joystick-side", className: "ecu-settings-row" },
      e(
        "div",
        { className: "ecu-settings-row-copy" },
        e(
          "span",
          { className: "ecu-settings-row-label" },
          "Camera joystick side",
        ),
        e(
          "span",
          { className: "ecu-settings-help" },
          "Default right for one-handed right-thumb pan. Also flip with ← side / side → above the stick.",
        ),
      ),
      e(
        "div",
        {
          className: "ecu-settings-seg",
          role: "group",
          "aria-label": "Joystick side",
        },
        e(
          "button",
          {
            type: "button",
            className: side === "left" ? "is-on" : "",
            "aria-pressed": side === "left" ? "true" : "false",
            onClick: () => {
              patchSettings({ cameraJoystickSide: "left" });
              bump();
            },
          },
          "Left",
        ),
        e(
          "button",
          {
            type: "button",
            className: side === "right" ? "is-on" : "",
            "aria-pressed": side === "right" ? "true" : "false",
            onClick: () => {
              patchSettings({ cameraJoystickSide: "right" });
              bump();
            },
          },
          "Right",
        ),
      ),
    ),
  );
}

const TAMPERMONKEY_MOBILE_FAQ =
  "https://www.tampermonkey.net/faq.php?locale=en&q=Q406";

function installSectionMatches(query: string): boolean {
  if (isPhoneViewport()) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return "tampermonkey mobile phone android ios edge firefox safari q406 install qr scan userscript script github raw copy url lan dev.user.js".includes(
    q,
  );
}

export function countCommUiSettingsMatches(query: string): number {
  let total = 0;
  const tours = listGuidedTours();
  for (let i = 0; i < tours.length; i++) {
    if (tourMatchesQuery(tours[i], query)) total += 1;
  }
  for (let i = 0; i < COMM_UI_ACTIONS.length; i++) {
    if (actionMatchesQuery(COMM_UI_ACTIONS[i], query)) total += 1;
  }
  if (wheelZoomRowMatches(query) || joystickSideRowMatches(query)) total += 1;
  if (experimentalSectionMatches(query)) total += 1;
  if (installSectionMatches(query)) total += 1;
  if (dataSectionMatches(query)) total += 1;
  return total;
}

export function CommUiSettingsPane(props: CommUiSettingsPaneProps): any {
  const React = getReact();
  const [tourTick, setTourTick] = React.useState(0);
  const [ctrlTick, setCtrlTick] = React.useState(0);
  const query = String(props.query || "").trim();
  const tours = listGuidedTours();
  void tourTick;
  void ctrlTick;
  const kids: any[] = [
    e(
      "p",
      { key: "lead", className: "ecu-settings-lead" },
      "Guides, onboarding, Comm UI changelog, and Adventure.land server notes.",
    ),
    settingsSection("Updates"),
  ];

  let updateRows = 0;
  for (let i = 0; i < COMM_UI_ACTIONS.length; i++) {
    const action = COMM_UI_ACTIONS[i];
    if (!actionMatchesQuery(action, query)) continue;
    updateRows += 1;
    kids.push(
      e(
        "div",
        { key: action.id, className: "ecu-settings-row" },
        e(
          "div",
          { className: "ecu-settings-row-copy" },
          e("span", { className: "ecu-settings-row-label" }, action.label),
          e("span", { className: "ecu-settings-help" }, action.help),
        ),
        e(
          "button",
          {
            type: "button",
            className: "ecu-settings-reset",
            onClick: () => action.onClick(props),
          },
          action.buttonLabel,
        ),
      ),
    );
  }

  if (controlsSectionMatches(query)) {
    const settings = getSettings();
    const showWheel = wheelZoomRowMatches(query);
    const showStick = joystickSideRowMatches(query);
    if (showWheel || showStick) {
      kids.push(settingsSection("Controls"));
    }
    if (showStick) {
      pushCameraJoystickSideRow(kids, () => setCtrlTick((n: number) => n + 1));
    }
    if (showWheel) {
      kids.push(
        settingsCheckboxRow(
          "wheel-zoom",
          "Mouse wheel / trackpad zoom",
          settings.worldWheelZoomEnabled !== false,
          (next) => {
            patchSettings({ worldWheelZoomEnabled: next });
            setCtrlTick((n: number) => n + 1);
          },
          {
            help: "Desktop only. Scroll over the map changes camera FOV. Turn off if a laptop trackpad zooms by accident. Pinch and Map out·in still work.",
          },
        ),
      );
    }
  }

  if (experimentalSectionMatches(query)) {
    kids.push(settingsSection("Experimental"));
    kids.push(
      e(
        "p",
        { key: "exp-lead", className: "ecu-settings-help" },
        "Host hooks for farm machines. Defaults stay Off / 1×. Turn these on only if you are okay debugging odd timing or softer zoom.",
      ),
    );
    kids.push(e(GameFpsCapSettingsBlock, { key: "fps-block" }));
    kids.push(e(GameRenderScaleSettingsBlock, { key: "render-scale" }));
  }

  if (installSectionMatches(query)) {
    kids.push(settingsSection("Mobile install"));
    kids.push(
      e(
        "p",
        { key: "tm-help", className: "ecu-settings-help" },
        "ECU runs as a Tampermonkey userscript inside Adventure.land. On phone use Edge (Android), Firefox (Android), or Safari (iOS) with the matching Tampermonkey build.",
      ),
    );
    kids.push(e(InstallScriptQrCard, { key: "script-qr" }));
    // QR handoff is for desktop → phone; useless while already on the phone.
    if (!isPhoneViewport()) {
      kids.push(
        e(
          "p",
          { key: "tm-qr-help", className: "ecu-settings-help" },
          "Scan a code with your phone to open Tampermonkey’s official install landing (same destinations as FAQ Q406).",
        ),
      );
      const qrKids: any[] = [];
      for (let i = 0; i < TAMPERMONKEY_QR_CARDS.length; i++) {
        const card = TAMPERMONKEY_QR_CARDS[i];
        qrKids.push(
          e(
            "a",
            {
              key: card.id,
              href: card.url,
              target: "_blank",
              rel: "noopener noreferrer",
              className: "ecu-settings-qr-card",
              title: card.help,
            },
            e("span", {
              className: "ecu-settings-qr-card__img",
              dangerouslySetInnerHTML: { __html: card.svg },
            }),
            e("span", { className: "ecu-settings-qr-card__label" }, card.label),
            e("span", { className: "ecu-settings-qr-card__help" }, card.help),
          ),
        );
      }
      kids.push(
        e("div", { key: "tm-qr", className: "ecu-settings-qr-row" }, qrKids),
      );
    }
    kids.push(
      e(
        "p",
        { key: "tm-link", className: "ecu-settings-help" },
        e(
          "a",
          {
            href: TAMPERMONKEY_MOBILE_FAQ,
            target: "_blank",
            rel: "noopener noreferrer",
            style: { color: "#8ec8e8" },
          },
          "Tampermonkey FAQ · official mobile versions (Q406)",
        ),
      ),
    );
  }

  if (dataSectionMatches(query)) {
    kids.push(settingsSection("Data"));
    kids.push(
      e(
        "div",
        { key: "factory-reset", className: "ecu-settings-row" },
        e(
          "div",
          { className: "ecu-settings-row-copy" },
          e(
            "span",
            { className: "ecu-settings-row-label" },
            "Factory defaults",
          ),
          e(
            "span",
            { className: "ecu-settings-help" },
            "Wipe Comm UI layouts, meters, overlay toggles, caches, and tour progress in this browser, then reload. Does not touch your adventure.land account.",
          ),
        ),
        e(
          "button",
          {
            type: "button",
            className: "ecu-settings-reset is-danger",
            onClick: () => {
              void confirmAndFactoryResetCommUi();
            },
          },
          "Reset everything…",
        ),
      ),
    );
  }

  kids.push(settingsSection("Guided tours"));
  let tourRows = 0;
  for (let i = 0; i < tours.length; i++) {
    const tour = tours[i];
    if (!tourMatchesQuery(tour, query)) continue;
    tourRows += 1;
    kids.push(
      e(
        "div",
        { key: "tour-" + tour.id, className: "ecu-settings-row" },
        e(
          "div",
          { className: "ecu-settings-row-copy" },
          e("span", { className: "ecu-settings-row-label" }, tour.label),
          e(
            "span",
            { className: "ecu-settings-help" },
            tour.completed
              ? "Completed — Replay runs it now; Reset clears the flag so the next open can trigger it again."
              : "Not completed yet — Replay starts it now.",
          ),
        ),
        e(
          "div",
          { className: "ecu-settings-row-actions" },
          e(
            "button",
            {
              type: "button",
              className: "ecu-settings-reset",
              onClick: () => props.onReplayTour(tour.id),
            },
            "Replay",
          ),
          e(
            "button",
            {
              type: "button",
              className: "ecu-settings-reset is-ghost",
              disabled: !tour.completed,
              title: tour.completed
                ? "Clear completion so the contextual trigger can fire again"
                : "Already unset",
              onClick: () => {
                props.onResetTour(tour.id);
                setTourTick((n: number) => n + 1);
              },
            },
            "Reset",
          ),
        ),
      ),
    );
  }

  if (
    tourRows === 0 &&
    updateRows === 0 &&
    !controlsSectionMatches(query) &&
    !installSectionMatches(query) &&
    !dataSectionMatches(query)
  ) {
    kids.push(
      e(
        "p",
        { key: "empty", className: "ecu-settings-help" },
        "No Comm UI guide items match this search.",
      ),
    );
  }

  return e("div", null, ...kids);
}
