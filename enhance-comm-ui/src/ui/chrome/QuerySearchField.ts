/**
 * Market-style query search field — ⌕ input, clear, sectioned suggestion menu,
 * arrow/enter keyboard nav. Domain suggestions come from the caller.
 *
 * Enter commits the typed query (closes the menu) unless the user has moved
 * the highlight with arrows or hover — then Enter applies that suggestion.
 */

import { getReact, e } from "../../host/react";
import {
  applyQuerySearchSuggestion,
  trailingFieldContext,
  type QuerySearchMenu,
  type QuerySearchSuggestion,
} from "../../lib/querySearch";
import { ensureQuerySearchFieldCss } from "./querySearchFieldCss";

export type QuerySearchFieldProps = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** Sectioned suggestion menu (Market shape). */
  suggestions: QuerySearchMenu;
  /**
   * Field ops recognized for trailing `op:value` completion when applying a
   * value suggestion. Defaults to a broad set; pass domain-specific lists.
   */
  trailingOps?: readonly string[];
  /** Aliases for trailing ops (e.g. mer → merchant). */
  trailingAliases?: Record<string, string>;
  /** Footer hint under the menu. */
  footer?: string;
  /** Extra clear side-effects (Market clears merchant filter). */
  onClear?: () => void;
  className?: string;
  inputRef?: { current: HTMLInputElement | null };
};

const DEFAULT_FOOTER = "Words AND · OR / | · Quotes · -negate";

const DEFAULT_OPS = [
  "item",
  "merchant",
  "mer",
  "title",
  "stat",
  "attr",
  "has",
  "is",
  "level",
  "price",
  "map",
  "server",
  "type",
  "pack",
] as const;

export function QuerySearchField(props: QuerySearchFieldProps): any {
  const React = getReact();
  ensureQuerySearchFieldCss();

  const [open, setOpen] = React.useState(false);
  const [hi, setHi] = React.useState(0);
  /** True after arrow keys or row hover — Enter then applies the highlight. */
  const navRef = React.useRef(false);
  const localRef = React.useRef(null as HTMLInputElement | null);
  const inputRef = props.inputRef || localRef;

  const ops = props.trailingOps || DEFAULT_OPS;
  const aliases = props.trailingAliases || { mer: "merchant" };
  const footer = props.footer != null ? props.footer : DEFAULT_FOOTER;
  const menu = props.suggestions;
  const flat = menu.flat;

  const pick = (row: QuerySearchSuggestion) => {
    const trailing = trailingFieldContext(props.value, ops, aliases);
    const next = applyQuerySearchSuggestion(props.value, row, trailing);
    props.onChange(next);
    setHi(0);
    navRef.current = false;
    const keepsOpen = !!(row.insert && /:$/.test(row.insert));
    const nextTrailing = trailingFieldContext(next, ops, aliases);
    setOpen(keepsOpen || !!nextTrailing);
    window.setTimeout(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      const len = el.value.length;
      try {
        el.setSelectionRange(len, len);
      } catch {
        /* ignore */
      }
    }, 0);
  };

  const wrapClass =
    "ecu-qsearch" + (props.className ? " " + props.className : "");

  return e(
    "div",
    { className: wrapClass },
    e(
      "div",
      { className: "ecu-qsearch-field" },
      e("span", { className: "ecu-qsearch-ico" }, "⌕"),
      e("input", {
        ref: inputRef,
        type: "search",
        placeholder: props.placeholder || "Search…",
        value: props.value,
        spellCheck: false,
        autoComplete: "off",
        onFocus: () => {
          setOpen(true);
          setHi(0);
          navRef.current = false;
        },
        onBlur: () => {
          window.setTimeout(() => setOpen(false), 120);
        },
        onChange: (ev: any) => {
          props.onChange(String(ev.target.value || ""));
          setOpen(true);
          setHi(0);
          navRef.current = false;
        },
        onKeyDown: (ev: any) => {
          if (ev.key === "Escape") {
            setOpen(false);
            navRef.current = false;
            return;
          }
          if (!open && (ev.key === "ArrowDown" || ev.key === "ArrowUp")) {
            setOpen(true);
            navRef.current = true;
            return;
          }
          if (ev.key === "Enter") {
            ev.preventDefault();
            if (open && navRef.current && flat[hi]) {
              pick(flat[hi]);
            } else {
              // Commit typed query — do not auto-apply the first op (item:).
              setOpen(false);
              navRef.current = false;
            }
            return;
          }
          if (!open || !flat.length) return;
          if (ev.key === "ArrowDown") {
            ev.preventDefault();
            navRef.current = true;
            setHi((h: number) => (h + 1) % flat.length);
          } else if (ev.key === "ArrowUp") {
            ev.preventDefault();
            navRef.current = true;
            setHi((h: number) => (h - 1 + flat.length) % flat.length);
          }
        },
      }),
      props.value
        ? e(
            "button",
            {
              type: "button",
              className: "ecu-qsearch-clear",
              title: "Clear search",
              onMouseDown: (ev: any) => ev.preventDefault(),
              onClick: () => {
                props.onChange("");
                if (typeof props.onClear === "function") props.onClear();
                setOpen(false);
                setHi(0);
                navRef.current = false;
              },
            },
            "×",
          )
        : null,
    ),
    open
      ? e(
          "div",
          {
            className: "ecu-qsearch-menu",
            onMouseDown: (ev: any) => ev.preventDefault(),
          },
          menu.sections.map((sec, si) =>
            e(
              "div",
              { className: "ecu-qsearch-sec", key: "sec-" + si },
              e("div", { className: "ecu-qsearch-h" }, sec.title),
              sec.rows.map((row) => {
                const idx = flat.indexOf(row);
                return e(
                  "button",
                  {
                    type: "button",
                    key: "sug-" + idx + "-" + row.label,
                    className:
                      "ecu-qsearch-row" + (idx === hi ? " is-hi" : ""),
                    onMouseEnter: () => {
                      navRef.current = true;
                      setHi(idx);
                    },
                    onClick: () => pick(row),
                  },
                  e("span", { className: "ecu-qsearch-rowIco" }, row.ico || "·"),
                  row.kind === "op"
                    ? e("span", { className: "ecu-qsearch-op" }, row.label)
                    : e(
                        "span",
                        { className: "ecu-qsearch-label" },
                        row.label,
                      ),
                  e(
                    "span",
                    { className: "ecu-qsearch-hint" },
                    row.hint || "",
                  ),
                );
              }),
            ),
          ),
          e(
            "div",
            { className: "ecu-qsearch-foot" },
            footer,
            e("kbd", null, "↵"),
          ),
        )
      : null,
  );
}
