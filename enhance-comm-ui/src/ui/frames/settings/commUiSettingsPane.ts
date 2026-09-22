import { e, getReact } from "../../../host/react";
import {
  listGuidedTours,
  type GuidedTourListItem,
} from "../comm/guidedTour/tourCatalog";
import { settingsSection } from "./settingsPaneChrome";

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

export function countCommUiSettingsMatches(query: string): number {
  let total = 0;
  const tours = listGuidedTours();
  for (let i = 0; i < tours.length; i++) {
    if (tourMatchesQuery(tours[i], query)) total += 1;
  }
  for (let i = 0; i < COMM_UI_ACTIONS.length; i++) {
    if (actionMatchesQuery(COMM_UI_ACTIONS[i], query)) total += 1;
  }
  return total;
}

export function CommUiSettingsPane(props: CommUiSettingsPaneProps): any {
  const React = getReact();
  const [tourTick, setTourTick] = React.useState(0);
  const query = String(props.query || "").trim();
  const tours = listGuidedTours();
  void tourTick;
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

  if (tourRows === 0 && updateRows === 0) {
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
