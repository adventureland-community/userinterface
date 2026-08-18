import { e } from "../../../host/react";
import { settingsSection } from "./settingsPaneChrome";

export type CommUiSettingsPaneProps = {
  query?: string;
  onReplayIntroTour: () => void;
  onOpenChangelog: () => void;
};

type CommUiActionDef = {
  id: "intro" | "changelog";
  label: string;
  help: string;
  buttonLabel: string;
  extra: string;
  onClick: (props: CommUiSettingsPaneProps) => void;
};

const COMM_UI_ACTIONS: readonly CommUiActionDef[] = [
  {
    id: "intro",
    label: "Intro tour",
    help: "Replay the guided Comm UI spotlight tour.",
    buttonLabel: "Replay intro",
    extra: "intro tour tutorial guide walkthrough spotlight onboarding",
    onClick: (props) => props.onReplayIntroTour(),
  },
  {
    id: "changelog",
    label: "Changelog",
    help: "Open the full What's New and release history.",
    buttonLabel: "Open changelog",
    extra: "changelog whats new release notes updates history",
    onClick: (props) => props.onOpenChangelog(),
  },
];

function actionMatchesQuery(action: CommUiActionDef, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return `${action.label} ${action.help} ${action.extra}`
    .toLowerCase()
    .includes(q);
}

export function countCommUiSettingsMatches(query: string): number {
  let total = 0;
  for (let i = 0; i < COMM_UI_ACTIONS.length; i++) {
    if (actionMatchesQuery(COMM_UI_ACTIONS[i], query)) total += 1;
  }
  return total;
}

export function CommUiSettingsPane(props: CommUiSettingsPaneProps): any {
  const query = String(props.query || "").trim();
  const kids: any[] = [
    e(
      "p",
      { key: "lead", className: "ecu-settings-lead" },
      "Guides, onboarding, and release notes for the Comm UI shell.",
    ),
    settingsSection("Guides & updates"),
  ];
  for (let i = 0; i < COMM_UI_ACTIONS.length; i++) {
    const action = COMM_UI_ACTIONS[i];
    if (!actionMatchesQuery(action, query)) continue;
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
  if (kids.length === 2) {
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
