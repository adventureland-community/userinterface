/**
 * /comm Chat window — history via pull_messages, live via chat_log, send via o:command.
 */

import { getReact, e } from "../../../host/react";
import { getObserving } from "../../../host/al";
import {
  clearChatMessages,
  getChatHistoryState,
  getChatMessages,
  loadChatHistory,
  pushLocalPartyChat,
  pushPmChat,
  pushSystemChat,
  sendChatViaObserver,
  subscribeChat,
  type ChatHistoryState,
  type ChatMessage,
  type ChatSendMode,
} from "../../../host/chat";
import { ensureChatCss } from "./chatCss";

function rowClassName(msg: ChatMessage): string {
  const parts = ["ecu-chat-row"];
  if (msg.local) parts.push("ecu-chat-local");
  if (msg.channel === "party") parts.push("ecu-chat-row--party");
  else if (msg.channel === "pm") parts.push("ecu-chat-row--pm");
  else if (msg.channel === "system") parts.push("ecu-chat-row--system");
  return parts.join(" ");
}

/** Compact clock; includes month/day when not today. */
export function formatChatTimestamp(at: number): string {
  if (!(at > 0)) return "";
  const d = new Date(at);
  if (!Number.isFinite(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return hh + ":" + mm;
  const mon = d.toLocaleString(undefined, { month: "short" });
  return mon + " " + d.getDate() + " " + hh + ":" + mm;
}

/** Drop stock "gray" etc. so CSS contrast wins over grey-on-grey. */
export function resolveChatInlineColor(
  channel: ChatMessage["channel"],
  color?: string,
): string | undefined {
  if (!color) return undefined;
  if (channel !== "say" && channel !== "system") return undefined;
  const c = String(color).trim().toLowerCase();
  if (
    c === "gray" ||
    c === "grey" ||
    c === "#808080" ||
    c === "#888" ||
    c === "#888888" ||
    c === "#999" ||
    c === "#999999"
  ) {
    return undefined;
  }
  return color;
}

function ChatRow(props: { msg: ChatMessage }): any {
  const msg = props.msg;
  const time = formatChatTimestamp(msg.at);
  const owner =
    msg.owner && msg.owner !== "^"
      ? e("span", { className: "ecu-chat-owner" }, msg.owner + ":")
      : null;
  const inline = resolveChatInlineColor(msg.channel, msg.color);
  const style = inline ? { color: inline } : undefined;
  return e(
    "div",
    {
      className: rowClassName(msg),
      style,
      title: msg.at ? new Date(msg.at).toLocaleString() : undefined,
    },
    time ? e("span", { className: "ecu-chat-time" }, time) : null,
    owner,
    e("span", { className: "ecu-chat-body" }, msg.message),
    msg.xserver ? e("span", { className: "ecu-chat-x" }, "[X]") : null,
  );
}

export type ChatPanelProps = {
  seedDraft?: string | null;
  seedWhisperTo?: string | null;
  openSeq?: number;
};

export function ChatPanel(props: ChatPanelProps = {}): any {
  const React = getReact();
  ensureChatCss();

  const [lines, setLines] = React.useState(() => getChatMessages().slice());
  const [hist, setHist] = React.useState(
    () => getChatHistoryState() as ChatHistoryState,
  );
  const [mode, setMode] = React.useState("say" as ChatSendMode);
  const [whisperTo, setWhisperTo] = React.useState("");
  const [draft, setDraft] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [statusErr, setStatusErr] = React.useState(false);
  const logRef = React.useRef(null as HTMLDivElement | null);
  const stickBottomRef = React.useRef(true);
  const inputRef = React.useRef(null as HTMLInputElement | null);
  const loadingOlderRef = React.useRef(false);

  React.useEffect(() => {
    return subscribeChat(() => {
      setLines(getChatMessages().slice());
      setHist(getChatHistoryState());
    });
  }, []);

  const fetchHistory = React.useCallback(async (opts?: {
    reset?: boolean;
  }) => {
    const res = await loadChatHistory(opts);
    if (!res.ok && res.reason && res.reason !== "busy" && res.reason !== "end") {
      setStatusErr(true);
      setStatus("History: " + res.reason);
    }
    return res;
  }, []);

  React.useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  React.useEffect(() => {
    if (props.openSeq == null) return;
    if (typeof props.seedDraft === "string") setDraft(props.seedDraft);
    if (typeof props.seedWhisperTo === "string") {
      setWhisperTo(props.seedWhisperTo);
      setMode("whisper");
    }
    if (!getChatHistoryState().loaded) {
      void fetchHistory({ reset: true });
    }
    window.setTimeout(() => {
      const el = inputRef.current;
      if (el && typeof el.focus === "function") el.focus();
    }, 30);
  }, [props.openSeq, fetchHistory]);

  React.useEffect(() => {
    const el = logRef.current;
    if (!el || !stickBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [lines]);

  const loadOlder = async () => {
    if (loadingOlderRef.current) return;
    const state = getChatHistoryState();
    if (state.loading || !state.more) return;
    const el = logRef.current;
    const prevHeight = el ? el.scrollHeight : 0;
    const prevTop = el ? el.scrollTop : 0;
    loadingOlderRef.current = true;
    stickBottomRef.current = false;
    try {
      await fetchHistory();
      window.requestAnimationFrame(() => {
        const node = logRef.current;
        if (!node) return;
        node.scrollTop = node.scrollHeight - prevHeight + prevTop;
      });
    } finally {
      loadingOlderRef.current = false;
    }
  };

  const onLogScroll = () => {
    const el = logRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickBottomRef.current = dist < 40;
    if (el.scrollTop < 48) {
      void loadOlder();
    }
  };

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const obs = getObserving();
    if (!obs || !obs.name) {
      setStatusErr(true);
      setStatus("Observe a character to send chat");
      return;
    }
    const result = sendChatViaObserver(mode, text, whisperTo);
    if (!result.ok) {
      setStatusErr(true);
      setStatus(result.reason || "send failed");
      return;
    }
    setStatusErr(false);
    setStatus(
      mode === "whisper"
        ? `Whisper → ${whisperTo.trim()} via ${obs.name}`
        : `Sent as ${obs.name} (${mode})`,
    );
    setDraft("");
    stickBottomRef.current = true;

    if (text.charAt(0) !== "/") {
      if (mode === "party") {
        pushLocalPartyChat(String(obs.name), text);
      } else if (mode === "whisper") {
        pushPmChat(String(obs.name), text, { local: true });
      }
    }
  };

  const modes: Array<{ id: ChatSendMode; label: string }> = [
    { id: "say", label: "Say" },
    { id: "party", label: "Party" },
    { id: "whisper", label: "Whisper" },
  ];

  const statusLine = hist.loading
    ? "Loading history…"
    : hist.error
      ? "History failed · " + hist.error
      : statusErr
        ? status
        : status;

  return e(
    "div",
    { className: "ecu-chat", "data-ecu-chat": "1" },
    e(
      "div",
      { className: "ecu-chat-toolbar" },
      e(
        "div",
        { className: "ecu-chat-mode", role: "group", "aria-label": "Chat mode" },
        modes.map((m) =>
          e(
            "button",
            {
              key: m.id,
              type: "button",
              className: mode === m.id ? "is-on" : undefined,
              onClick: () => setMode(m.id),
            },
            m.label,
          ),
        ),
      ),
      mode === "whisper"
        ? e("input", {
            className: "ecu-chat-whisper",
            type: "text",
            placeholder: "To…",
            value: whisperTo,
            onChange: (ev: any) => setWhisperTo(ev.target.value),
            spellCheck: false,
          })
        : null,
      e(
        "button",
        {
          type: "button",
          title: "Clear live log and reload history",
          style: {
            cursor: "pointer",
            marginLeft: "auto",
            padding: "4px 10px",
            border: "1px solid #666",
            background: "#22252c",
            color: "#ddd",
            fontSize: "13px",
          },
          onClick: () => {
            clearChatMessages();
            pushSystemChat("Chat cleared", "#b8b8b8");
            void fetchHistory({ reset: true });
          },
        },
        "Clear",
      ),
    ),
    e(
      "div",
      {
        className: "ecu-chat-log",
        ref: logRef,
        onScroll: onLogScroll,
      },
      hist.more || hist.loading
        ? e(
            "div",
            { className: "ecu-chat-history-top" },
            e(
              "button",
              {
                type: "button",
                className: "ecu-chat-load-older",
                disabled: hist.loading || !hist.more,
                onClick: () => {
                  void loadOlder();
                },
              },
              hist.loading ? "Loading…" : "Load older messages",
            ),
          )
        : hist.loaded
          ? e("div", { className: "ecu-chat-history-end" }, "— beginning —")
          : null,
      lines.length
        ? lines.map((msg: ChatMessage) => e(ChatRow, { key: msg.id, msg }))
        : e(
            "div",
            { className: "ecu-chat-empty" },
            hist.loading
              ? "Loading chat history…"
              : "No messages yet. Live server chat appears here.",
          ),
    ),
    statusLine
      ? e(
          "div",
          {
            className:
              "ecu-chat-status" +
              (hist.error || statusErr ? " is-err" : ""),
          },
          statusLine,
        )
      : null,
    e(
      "div",
      { className: "ecu-chat-compose" },
      e("input", {
        className: "ecu-chat-input",
        ref: inputRef,
        type: "text",
        placeholder:
          mode === "party"
            ? "Party message… (/ commands still work)"
            : mode === "whisper"
              ? "Whisper message…"
              : "Say something… (/p /w /list …)",
        value: draft,
        onChange: (ev: any) => setDraft(ev.target.value),
        onKeyDown: (ev: any) => {
          if (ev.key === "Enter") {
            ev.preventDefault();
            send();
          }
        },
        spellCheck: false,
        maxLength: 1200,
      }),
      e(
        "button",
        {
          type: "button",
          className: "ecu-chat-send",
          disabled: !draft.trim(),
          onClick: send,
        },
        "Send",
      ),
    ),
  );
}
