import { e, getReact } from "../../../host/react";

export type SettingsColorInputProps = {
  value: string;
  placeholder?: string;
  fallbackColor?: string;
  clearLabel?: string;
  onCommit: (value: string) => void;
  onClear?: () => void;
  allowTransparent?: boolean;
};

function normalizeHex(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  const body = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (!/^[0-9a-f]{6}$/.test(body)) return null;
  return `#${body}`;
}

function normalizeColorValue(
  raw: string,
  allowTransparent: boolean,
): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return "";
  if (allowTransparent && trimmed === "transparent") return "transparent";
  return normalizeHex(trimmed);
}

export function SettingsColorInput(props: SettingsColorInputProps): any {
  const React = getReact();
  const [draft, setDraft] = React.useState(props.value);

  React.useEffect(() => {
    setDraft(props.value);
  }, [props.value]);

  const commitDraft = React.useCallback(() => {
    const next = normalizeColorValue(draft, !!props.allowTransparent);
    if (next == null) {
      setDraft(props.value);
      return;
    }
    if (next === "" && props.onClear) {
      props.onClear();
      return;
    }
    props.onCommit(next);
  }, [draft, props]);

  const swatchValue =
    normalizeHex(draft) ||
    normalizeHex(props.value) ||
    props.fallbackColor ||
    "#888888";

  return e(
    "span",
    { className: "ecu-settings-color" },
    e("input", {
      type: "color",
      className: "ecu-settings-color-swatch",
      value: swatchValue,
      onChange: (ev: { target: { value: string } }) =>
        props.onCommit(ev.target.value),
      title: "Pick color",
    }),
    e("input", {
      type: "text",
      className: "ecu-settings-color-text",
      value: draft,
      placeholder: props.placeholder || "#rrggbb",
      onChange: (ev: { target: { value: string } }) =>
        setDraft(ev.target.value),
      onBlur: commitDraft,
      onKeyDown: (ev: { key: string; currentTarget: { blur: () => void } }) => {
        if (ev.key === "Enter") ev.currentTarget.blur();
      },
    }),
    props.onClear
      ? e(
          "button",
          {
            type: "button",
            className: "ecu-settings-color-clear",
            onClick: () => props.onClear?.(),
            title: props.clearLabel || "Clear color override",
          },
          "×",
        )
      : null,
  );
}
