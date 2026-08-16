import { e } from "../../../host/react";
import {
  distributeMailAttaches,
  getMailCapabilities,
  attachesHaveRecipients,
  patchComposeDraft,
  removeMailAttachAt,
  sendMailCommand,
  setMailAttachTo,
  setMailView,
  subjectPlaceholder,
  suggestMailTo,
  MAIL_SUBJECT_ITEM_TOKEN,
  type MailStoreSnapshot,
} from "../../../host/mail";
import { ItemInstance } from "../../chrome/ItemInstance";
import { visiblePlayerNames } from "./mailFormat";

export type MailComposePaneProps = {
  snap: MailStoreSnapshot;
  wide: boolean;
  selfNames: string[];
  toInput: string;
  setToInput: (v: string) => void;
  suggestOpen: boolean;
  setSuggestOpen: (v: boolean) => void;
};

function hasToName(list: string[], name: string): boolean {
  const key = String(name || "")
    .trim()
    .toLowerCase();
  if (!key) return false;
  for (let i = 0; i < list.length; i++) {
    if (String(list[i] || "").toLowerCase() === key) return true;
  }
  return false;
}

export function MailComposePane(props: MailComposePaneProps): any {
  const {
    snap,
    wide,
    selfNames,
    toInput,
    setToInput,
    suggestOpen,
    setSuggestOpen,
  } = props;
  if (snap.view.kind !== "compose") return null;
  const draft = snap.view.draft;
  const draftAttachesList = draft.attaches.slice();
  const caps = getMailCapabilities(
    draftAttachesList,
    Math.max(1, draft.to.length),
  );

  const suggestions = suggestOpen
    ? suggestMailTo(
        toInput,
        {
          selfNames,
          mails: snap.mails,
          visiblePlayers: visiblePlayerNames(),
        },
        draft.to,
      )
    : [];

  const chipEls: any[] = [];
  for (let i = 0; i < draft.to.length; i++) {
    const name = draft.to[i];
    chipEls.push(
      e(
        "button",
        {
          key: name,
          type: "button",
          className: "comm-mail__chip",
          title: "Remove from To pool",
          onClick: () => {
            const nextTo: string[] = [];
            for (let j = 0; j < draft.to.length; j++) {
              if (draft.to[j] !== name) nextTo.push(draft.to[j]);
            }
            patchComposeDraft({ to: nextTo });
          },
        },
        name + " ×",
      ),
    );
  }

  const suggestEls: any[] = [];
  let lastGroup = "";
  for (let i = 0; i < suggestions.length; i++) {
    const s = suggestions[i];
    if (s.group !== lastGroup) {
      lastGroup = s.group;
      suggestEls.push(
        e(
          "div",
          { key: "g-" + s.group, className: "comm-mail__suggest-g" },
          s.group,
        ),
      );
    }
    suggestEls.push(
      e(
        "button",
        {
          key: s.group + s.name,
          type: "button",
          onClick: () => {
            if (!hasToName(draft.to, s.name)) {
              patchComposeDraft({ to: draft.to.concat([s.name]) });
            }
            setToInput("");
            setSuggestOpen(false);
          },
        },
        s.name,
      ),
    );
  }

  const toOptionEls = (selected: string): any[] => {
    const opts: any[] = [];
    const seen = new Set<string>();
    const push = (name: string) => {
      const n = String(name || "").trim();
      if (!n) return;
      const key = n.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      opts.push(e("option", { key: key, value: n }, n));
    };
    for (let i = 0; i < draft.to.length; i++) push(draft.to[i]);
    push(selected);
    return opts;
  };

  const attachEls: any[] = [];
  for (let i = 0; i < draftAttachesList.length; i++) {
    const fp = draftAttachesList[i];
    const idx = i;
    const toVal = String(fp.to || "").trim();
    attachEls.push(
      e(
        "div",
        { className: "comm-mail__attach", key: fp.slot + ":" + fp.name },
        e(ItemInstance, {
          name: String(fp.name),
          level: typeof fp.level === "number" ? fp.level : undefined,
          q: typeof fp.q === "number" ? fp.q : undefined,
          p: typeof fp.p === "string" ? fp.p : undefined,
          size: 40,
        }),
        e(
          "div",
          { className: "comm-mail__attach-meta" },
          e("strong", null, fp.name),
          fp.level != null ? " +" + fp.level : null,
          typeof fp.q === "number" && fp.q > 1 ? " ×" + fp.q : null,
          e(
            "div",
            { className: "comm-mail__meta" },
            "Slot " +
              fp.slot +
              (draftAttachesList.length > 1
                ? " · mail " + (idx + 1) + "/" + draftAttachesList.length
                : ""),
          ),
          e(
            "label",
            { className: "comm-mail__attach-to" },
            e("span", null, "To"),
            e(
              "select",
              {
                value: toVal,
                onChange: (ev: any) =>
                  setMailAttachTo(idx, String(ev.target.value || "")),
              },
              e(
                "option",
                { value: "" },
                draft.to.length ? "Pick recipient…" : "Add a To below…",
              ),
              ...toOptionEls(toVal),
            ),
          ),
        ),
        e(
          "button",
          {
            type: "button",
            className: "comm-mail__btn",
            onClick: () => removeMailAttachAt(idx),
          },
          "Remove",
        ),
      ),
    );
  }

  const attachesReady = attachesHaveRecipients(draftAttachesList);
  const canSend =
    caps.canSend &&
    !snap.commandBusy &&
    caps.goldEnough !== false &&
    (draftAttachesList.length
      ? attachesReady
      : draft.to.length > 0);

  return e(
    "div",
    { className: "comm-mail__compose" },
    e(
      "button",
      {
        type: "button",
        className: "comm-mail__btn",
        onClick: () => setMailView({ kind: "list" }),
      },
      wide ? "Close compose" : "← Back",
    ),
    e("label", null, "To"),
    e("div", { className: "comm-mail__chips" }, ...chipEls),
    e("input", {
      value: toInput,
      placeholder: "Add recipient…",
      onChange: (ev: any) => {
        setToInput(ev.target.value);
        setSuggestOpen(true);
      },
      onFocus: () => setSuggestOpen(true),
      onKeyDown: (ev: any) => {
        if (ev.key === "Enter") {
          ev.preventDefault();
          const v = String(toInput || "").trim();
          if (v && !hasToName(draft.to, v)) {
            patchComposeDraft({ to: draft.to.concat([v]) });
          }
          setToInput("");
          setSuggestOpen(false);
        }
      },
    }),
    suggestOpen && suggestions.length
      ? e("div", { className: "comm-mail__suggest" }, ...suggestEls)
      : null,
    e(
      "div",
      {
        className: "comm-mail__meta",
        style: { marginTop: 2, marginBottom: 4 },
      },
      draftAttachesList.length
        ? "Queue items anytime. Assign each attach a To (or add To chips — unassigned items auto-bind)."
        : draft.to.length > 1
          ? "Plain mail: one copy per To"
          : null,
    ),
    e("label", null, "Subject"),
    e(
      "div",
      { className: "comm-mail__acts", style: { marginTop: 0, marginBottom: 4 } },
      e("input", {
        style: { flex: 1, minWidth: 120 },
        value: draft.subject,
        placeholder: subjectPlaceholder(draftAttachesList),
        onChange: (ev: any) =>
          patchComposeDraft({ subject: ev.target.value }),
      }),
      draftAttachesList.length
        ? e(
            "button",
            {
              type: "button",
              className: "comm-mail__btn",
              title: "Insert " + MAIL_SUBJECT_ITEM_TOKEN,
              onClick: () =>
                patchComposeDraft({
                  subject: (draft.subject || "") + MAIL_SUBJECT_ITEM_TOKEN,
                }),
            },
            MAIL_SUBJECT_ITEM_TOKEN,
          )
        : null,
    ),
    e(
      "div",
      {
        className: "comm-mail__meta",
        style: { marginTop: 2, marginBottom: 4 },
      },
      draftAttachesList.length
        ? MAIL_SUBJECT_ITEM_TOKEN +
            " works in subject and message" +
            (draftAttachesList.length > 1 ? " (each mail)" : "")
        : null,
    ),
    e("label", null, "Message"),
    e(
      "div",
      { className: "comm-mail__acts", style: { marginTop: 0 } },
      e("textarea", {
        style: { flex: 1, minWidth: 120 },
        value: draft.body,
        onChange: (ev: any) => patchComposeDraft({ body: ev.target.value }),
      }),
      draftAttachesList.length
        ? e(
            "button",
            {
              type: "button",
              className: "comm-mail__btn",
              title: "Insert " + MAIL_SUBJECT_ITEM_TOKEN + " in message",
              onClick: () =>
                patchComposeDraft({
                  body: (draft.body || "") + MAIL_SUBJECT_ITEM_TOKEN,
                }),
            },
            MAIL_SUBJECT_ITEM_TOKEN,
          )
        : null,
    ),
    draftAttachesList.length
      ? e(
          "div",
          { className: "comm-mail__attach-list" },
          e(
            "div",
            {
              className: "comm-mail__acts",
              style: { marginTop: 8, marginBottom: 0 },
            },
            e(
              "span",
              { className: "comm-mail__meta", style: { margin: 0 } },
              "Attachments (" + draftAttachesList.length + ")",
            ),
            draft.to.length > 1
              ? e(
                  "button",
                  {
                    type: "button",
                    className: "comm-mail__btn",
                    title:
                      "Assign items across To in order (item 1→To1, item 2→To2, …)",
                    onClick: () => distributeMailAttaches(),
                  },
                  "Distribute across To",
                )
              : null,
          ),
          ...attachEls,
          e(
            "div",
            { className: "comm-mail__meta", style: { marginTop: 4 } },
            draftAttachesList.length > 1
              ? "Batch: one command · one mail per item to its To · " +
                  MAIL_SUBJECT_ITEM_TOKEN +
                  " expands per item"
              : "Will swap to slot 0, send to the chosen To, then swap back",
          ),
        )
      : e(
          "div",
          { className: "comm-mail__meta", style: { marginTop: 8 } },
          "Attach via bag → right-click → Send mail (queue first, add To later; same slot replaces)",
        ),
    e(
      "div",
      { className: "comm-mail__meta", style: { marginTop: 8 } },
      "Cost " +
        (caps.sendCost / 1000).toFixed(0) +
        "k" +
        (draftAttachesList.length > 1
          ? " (" + draftAttachesList.length + "× attach)"
          : draftAttachesList.length === 0 && draft.to.length > 1
            ? " (" + draft.to.length + "× plain)"
            : "") +
        (caps.gold != null
          ? " · observed gold " + Math.floor(caps.gold / 1000) + "k"
          : "") +
        (caps.goldEnough === false ? " — not enough gold" : ""),
    ),
    e(
      "div",
      { className: "comm-mail__acts" },
      e(
        "button",
        {
          type: "button",
          className: "comm-mail__btn comm-mail__btn--gold",
          disabled: !canSend,
          onClick: () => {
            if (draftAttachesList.length) {
              sendMailCommand({
                to: draft.to.slice(),
                subject: draft.subject,
                body: draft.body,
                attaches: draftAttachesList,
              });
              return;
            }
            const to = draft.to.slice();
            if (!to.length) return;
            sendMailCommand({
              to,
              subject: draft.subject,
              body: draft.body,
            });
          },
        },
        snap.commandBusy
          ? "Sending…"
          : draftAttachesList.length > 1 ||
              (draftAttachesList.length === 0 && draft.to.length > 1)
            ? "Send " +
              (draftAttachesList.length > 0
                ? draftAttachesList.length
                : draft.to.length) +
              " (" +
              (caps.sendCost / 1000).toFixed(0) +
              "k)"
            : "Send (" + (caps.sendCost / 1000).toFixed(0) + "k)",
      ),
      e(
        "button",
        {
          type: "button",
          className: "comm-mail__btn",
          onClick: () => setMailView({ kind: "list" }),
        },
        "Cancel",
      ),
    ),
  );
}
