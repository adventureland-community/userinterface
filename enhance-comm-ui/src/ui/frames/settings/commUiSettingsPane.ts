import { e, getReact } from "../../../host/react";
import { confirmAndFactoryResetCommUi } from "../../../lib/factoryReset";
import { isPhoneViewport } from "../../../lib/perfPrefs";
import { getSettings, patchSettings } from "../../../lib/settings";
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
    visible: () => !isPhoneViewport(),
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
  // Wheel/trackpad FOV zoom is a desktop input; phones use pinch / Map out·in.
  if (isPhoneViewport()) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return "wheel zoom trackpad scroll camera fov middle accidental laptop desktop controls".includes(
    q,
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
  if (controlsSectionMatches(query)) total += 1;
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
    kids.push(settingsSection("Controls"));
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
