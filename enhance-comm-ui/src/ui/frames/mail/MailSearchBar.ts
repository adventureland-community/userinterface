import { getReact, e } from "../../../host/react";
import {
  EMPTY_MAIL_SEARCH_FORM,
  MAIL_SEARCH_SCOPES,
  mailSearchFormToQuery,
  queryToMailSearchForm,
  type MailPill,
  type MailSearchFormState,
} from "../../../host/mail";

export type MailSearchBarProps = {
  query: string;
  setQuery: (q: string) => void;
  pill: MailPill;
  setPillPersist: (p: MailPill) => void;
  /** Phone — scope pills stay behind Filters until opened. */
  compact?: boolean;
  /** Phone — full-panel filters screen covers the mail body. */
  onFiltersScreenChange?: (open: boolean) => void;
};

function fieldRow(label: string, input: any): any {
  return e(
    "label",
    { className: "comm-mail__opts-row" },
    e("span", { className: "comm-mail__opts-label" }, label),
    input,
  );
}

function textInput(
  value: string,
  onChange: (v: string) => void,
  placeholder?: string,
): any {
  return e("input", {
    className: "comm-mail__opts-input",
    type: "text",
    value,
    placeholder: placeholder || "",
    onChange: (ev: any) => onChange(String(ev.target.value || "")),
  });
}

/** Gmail-style search field + “Show search options” panel. */
export function MailSearchBar(props: MailSearchBarProps): any {
  const React = getReact();
  const { query, setQuery, pill, setPillPersist, compact, onFiltersScreenChange } =
    props;
  const [open, setOpen] = React.useState(false);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [form, setForm] = React.useState(
    () => queryToMailSearchForm(query, pill) as MailSearchFormState,
  );
  const wrapRef = React.useRef(null as HTMLElement | null);
  const showPills = !compact;
  const filtersActive = pill !== "all";

  React.useEffect(() => {
    if (!compact) return;
    onFiltersScreenChange?.(filtersOpen);
  }, [compact, filtersOpen, onFiltersScreenChange]);

  React.useEffect(() => {
    if (!compact || !filtersOpen) return;
    setForm(queryToMailSearchForm(query, pill));
  }, [compact, filtersOpen]);

  React.useEffect(() => {
    if (!open) return;
    setForm(queryToMailSearchForm(query, pill));
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (ev: MouseEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      if (ev.target instanceof Node && !el.contains(ev.target)) {
        setOpen(false);
      }
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const patchForm = (partial: Partial<MailSearchFormState>) => {
    setForm((prev: MailSearchFormState) => {
      const next = { ...prev, ...partial };
      setQuery(mailSearchFormToQuery(next));
      if (partial.scope != null) setPillPersist(partial.scope);
      return next;
    });
  };

  const applyAndClose = () => {
    setQuery(mailSearchFormToQuery(form));
    setPillPersist(form.scope);
    setOpen(false);
  };

  const applyFiltersScreen = () => {
    setQuery(mailSearchFormToQuery(form));
    setPillPersist(form.scope);
    setFiltersOpen(false);
  };

  const closeFiltersScreen = () => setFiltersOpen(false);

  const clearAll = () => {
    setQuery("");
    setForm({ ...EMPTY_MAIL_SEARCH_FORM, scope: pill });
  };

  const scopeOpts: any[] = [];
  for (let i = 0; i < MAIL_SEARCH_SCOPES.length; i++) {
    const s = MAIL_SEARCH_SCOPES[i];
    scopeOpts.push(e("option", { key: s.id, value: s.id }, s.label));
  }

  const scopePills: any[] = [];
  for (let i = 0; i < MAIL_SEARCH_SCOPES.length; i++) {
    const s = MAIL_SEARCH_SCOPES[i];
    const title =
      s.id === "fromothers"
        ? "Mail to your characters from other players (not self-mail)"
        : s.id === "tome"
          ? "Mail addressed to any of your characters"
          : s.id === "fromme"
            ? "Mail you sent from any of your characters"
            : s.label;
    scopePills.push(
      e(
        "button",
        {
          key: s.id,
          type: "button",
          className: "comm-mail__pill" + (pill === s.id ? " is-on" : ""),
          title,
          onClick: () => setPillPersist(s.id),
        },
        s.short || s.label,
      ),
    );
  }

  const scopeRows: any[] = [];
  for (let i = 0; i < MAIL_SEARCH_SCOPES.length; i++) {
    const s = MAIL_SEARCH_SCOPES[i];
    scopeRows.push(
      e(
        "button",
        {
          key: s.id,
          type: "button",
          className:
            "comm-mail__filters-row" +
            (form.scope === s.id ? " is-on" : ""),
          onClick: () => patchForm({ scope: s.id }),
        },
        e("span", { className: "comm-mail__filters-row-label" }, s.label),
        form.scope === s.id
          ? e("span", { className: "comm-mail__filters-row-check", "aria-hidden": "true" }, "✓")
          : null,
      ),
    );
  }

  const filtersScreen =
    compact && filtersOpen
      ? e(
          "div",
          {
            className: "comm-mail__filters-screen",
            role: "dialog",
            "aria-label": "Mail filters",
          },
          e(
            "div",
            { className: "comm-mail__filters-head" },
            e(
              "button",
              {
                type: "button",
                className: "comm-mail__filters-back",
                "aria-label": "Back",
                onClick: closeFiltersScreen,
              },
              "←",
            ),
            e("span", { className: "comm-mail__filters-title" }, "Filters"),
          ),
          e(
            "div",
            { className: "comm-mail__filters-body" },
            e(
              "div",
              { className: "comm-mail__filters-section" },
              e(
                "div",
                { className: "comm-mail__filters-section-title" },
                "Scope",
              ),
              ...scopeRows,
            ),
            e(
              "div",
              { className: "comm-mail__filters-section" },
              e(
                "div",
                { className: "comm-mail__filters-section-title" },
                "Attachment",
              ),
              e(
                "label",
                { className: "comm-mail__filters-toggle" },
                e("input", {
                  type: "checkbox",
                  checked: form.hasAttachment,
                  onChange: (ev: any) =>
                    patchForm({ hasAttachment: !!ev.target.checked }),
                }),
                "Has attachment",
              ),
              e(
                "label",
                {
                  className: "comm-mail__filters-toggle",
                  title: "Attachment still in the mail — ready to take",
                },
                e("input", {
                  type: "checkbox",
                  checked: form.untakenOnly,
                  onChange: (ev: any) => {
                    const on = !!ev.target.checked;
                    patchForm({
                      untakenOnly: on,
                      takenOnly: on ? false : form.takenOnly,
                    });
                  },
                }),
                "Untaken only",
              ),
              e(
                "label",
                {
                  className: "comm-mail__filters-toggle",
                  title:
                    "Attachment already taken — useful for cleanup / batch delete",
                },
                e("input", {
                  type: "checkbox",
                  checked: form.takenOnly,
                  onChange: (ev: any) => {
                    const on = !!ev.target.checked;
                    patchForm({
                      takenOnly: on,
                      untakenOnly: on ? false : form.untakenOnly,
                    });
                  },
                }),
                "Taken only",
              ),
            ),
          ),
          e(
            "div",
            { className: "comm-mail__filters-foot" },
            e(
              "button",
              {
                type: "button",
                className: "comm-mail__btn comm-mail__btn--gold comm-mail__filters-apply",
                onClick: applyFiltersScreen,
              },
              "Apply filters",
            ),
          ),
        )
      : null;

  return e(
    "div",
    {
      className:
        "comm-mail__search-wrap" +
        (open ? " is-open" : "") +
        (compact ? " is-compact" : ""),
      ref: wrapRef,
    },
    e(
      "div",
      { className: "comm-mail__search-shell" },
      e("input", {
        className: "comm-mail__search",
        type: "search",
        placeholder: "Search mail",
        value: query,
        "aria-label": "Search mail",
        onChange: (ev: any) => setQuery(ev.target.value),
        onKeyDown: (ev: any) => {
          if (ev.key === "Enter") {
            ev.preventDefault();
            setOpen(false);
          }
        },
      }),
      query
        ? e(
            "button",
            {
              type: "button",
              className: "comm-mail__search-clear",
              title: "Clear search",
              "aria-label": "Clear search",
              onClick: clearAll,
            },
            "×",
          )
        : null,
      e(
        "button",
        {
          type: "button",
          className: "comm-mail__search-opts-btn" + (open ? " is-on" : ""),
          title: "Show search options",
          "aria-label": "Show search options",
          "aria-expanded": open ? "true" : "false",
          onClick: () => setOpen(!open),
        },
        e("span", {
          className: "comm-mail__ico-tune",
          "aria-hidden": "true",
        }),
      ),
      compact
        ? e(
            "button",
            {
              type: "button",
              className:
                "comm-mail__search-filters-btn" +
                (filtersOpen || filtersActive ? " is-on" : ""),
              title: "Scope filters",
              "aria-label": "Scope filters",
              "aria-expanded": filtersOpen ? "true" : "false",
              onClick: () => setFiltersOpen(!filtersOpen),
            },
            filtersActive ? "●" : "Filters",
          )
        : null,
    ),
    showPills
      ? e("div", { className: "comm-mail__pills" }, ...scopePills)
      : null,
    open
      ? e(
          "div",
          {
            className: "comm-mail__search-opts",
            role: "dialog",
            "aria-label": "Search options",
          },
          fieldRow(
            "From",
            textInput(form.from, (v) => patchForm({ from: v }), "name"),
          ),
          fieldRow(
            "To",
            textInput(form.to, (v) => patchForm({ to: v }), "name"),
          ),
          fieldRow(
            "Subject",
            textInput(
              form.subject,
              (v) => patchForm({ subject: v }),
              "words in subject",
            ),
          ),
          fieldRow(
            "Has the words",
            textInput(
              form.hasWords,
              (v) => patchForm({ hasWords: v }),
              "any of these words",
            ),
          ),
          fieldRow(
            "Doesn't have",
            textInput(
              form.doesntHave,
              (v) => patchForm({ doesntHave: v }),
              "none of these words",
            ),
          ),
          fieldRow(
            "Item",
            textInput(form.item, (v) => patchForm({ item: v }), "item name"),
          ),
          fieldRow(
            "Date within",
            e(
              "select",
              {
                className: "comm-mail__opts-input",
                value: form.newerThan,
                onChange: (ev: any) =>
                  patchForm({
                    newerThan: ev.target
                      .value as MailSearchFormState["newerThan"],
                  }),
              },
              e("option", { value: "" }, "Anytime"),
              e("option", { value: "1d" }, "1 day"),
              e("option", { value: "7d" }, "1 week"),
              e("option", { value: "30d" }, "1 month"),
              e("option", { value: "1y" }, "1 year"),
            ),
          ),
          fieldRow(
            "Search",
            e(
              "select",
              {
                className: "comm-mail__opts-input",
                value: form.scope,
                onChange: (ev: any) =>
                  patchForm({ scope: ev.target.value as MailPill }),
              },
              ...scopeOpts,
            ),
          ),
          e(
            "div",
            { className: "comm-mail__opts-checks" },
            e(
              "label",
              { className: "comm-mail__opts-check" },
              e("input", {
                type: "checkbox",
                checked: form.hasAttachment,
                onChange: (ev: any) =>
                  patchForm({ hasAttachment: !!ev.target.checked }),
              }),
              "Has attachment",
            ),
            e(
              "label",
              {
                className: "comm-mail__opts-check",
                title: "Attachment still in the mail — ready to take",
              },
              e("input", {
                type: "checkbox",
                checked: form.untakenOnly,
                onChange: (ev: any) => {
                  const on = !!ev.target.checked;
                  patchForm({
                    untakenOnly: on,
                    takenOnly: on ? false : form.takenOnly,
                  });
                },
              }),
              "Untaken only",
            ),
            e(
              "label",
              {
                className: "comm-mail__opts-check",
                title:
                  "Attachment already taken — useful for cleanup / batch delete",
              },
              e("input", {
                type: "checkbox",
                checked: form.takenOnly,
                onChange: (ev: any) => {
                  const on = !!ev.target.checked;
                  patchForm({
                    takenOnly: on,
                    untakenOnly: on ? false : form.untakenOnly,
                  });
                },
              }),
              "Taken only",
            ),
          ),
          e(
            "div",
            { className: "comm-mail__opts-foot" },
            e(
              "button",
              {
                type: "button",
                className: "comm-mail__btn",
                onClick: clearAll,
              },
              "Clear",
            ),
            e(
              "button",
              {
                type: "button",
                className: "comm-mail__btn comm-mail__btn--gold",
                onClick: applyAndClose,
              },
              "Search",
            ),
          ),
        )
      : null,
    filtersScreen,
  );
}
