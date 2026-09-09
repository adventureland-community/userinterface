/**
 * /comm Chat window — Hub pull_chats / pull_chat / send_message.
 */

import { getReact, e } from "../../../host/react";
import { getObserving } from "../../../host/al";
import {
  applyPullChatResult,
  applyPullChatsResult,
  baselineHubChatSeen,
  countHubChatUnread,
  ensurePartyConversation,
  formatHubUnreadBadge,
  getChatMessages,
  getHubActiveConversation,
  getHubActiveKey,
  getHubCharacters,
  hubChatKey,
  hubChatSince,
  listHubConversations,
  pullChatPage,
  pullChatsPage,
  rememberHubChat,
  selectHubChat,
  sendChatViaObserver,
  sendHubMessage,
  setHubActiveNew,
  subscribeChat,
  subscribeHubChat,
  type ChatMessage,
  type HubChatMessageRow,
  type HubConversation,
} from "../../../host/chat";
import { ensureChatCss } from "./chatCss";

const POLL_MS = 5000;
/** Below this panel width, sidebar becomes a drawer (matches small saved layouts). */
const NARROW_PX = 440;

type SidebarFilter = "all" | "server" | "private" | "party";

const SIDEBAR_FILTERS: { id: SidebarFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "server", label: "Server" },
  { id: "private", label: "PM" },
  { id: "party", label: "Party" },
];


function isLoggedIn(): boolean {
  const id = (window as Window & { user_id?: string | number }).user_id;
  return id != null && String(id) !== "";
}

function serverUiLabel(serverKey: string | undefined): string {
  if (!serverKey) return "Server";
  const fn = (
    window as Window & { server_to_ui?: (key: string) => string }
  ).server_to_ui;
  if (typeof fn === "function") {
    try {
      const label = fn(serverKey);
      if (label) return String(label);
    } catch {
      /* fall through */
    }
  }
  // Trim stock keys like SR_EUII → EU I when server_to_ui missing.
  const raw = String(serverKey);
  if (raw.indexOf("SR_") === 0) return raw.slice(3);
  return raw;
}

function conversationTitle(chat: HubConversation): string {
  if (chat.type === "server") return serverUiLabel(chat.server);
  if (chat.type === "party") return "Party";
  if (chat.type === "new") return "New whisper";
  return chat.to || "Private";
}

function resolveCurrentServerKey(): string {
  const region =
    typeof window.server_region === "string" ? window.server_region : "";
  const ident =
    typeof window.server_identifier === "string"
      ? window.server_identifier
      : "";
  const servers =
    window.X && Array.isArray(window.X.servers) ? window.X.servers : [];
  if (region && ident) {
    for (let i = 0; i < servers.length; i++) {
      const s = servers[i] as {
        region?: string;
        name?: string;
        key?: string;
      };
      if (!s) continue;
      if (s.region === region && s.name === ident && s.key) {
        return String(s.key);
      }
    }
  }
  return "";
}

function seedServerChats(): void {
  const servers =
    window.X && Array.isArray(window.X.servers) ? window.X.servers : [];
  for (let i = 0; i < servers.length; i++) {
    const server = servers[i] as { key?: string };
    if (!server || !server.key) continue;
    rememberHubChat({ type: "server", server: String(server.key) });
  }
}

function selectInitialServerChat(): void {
  if (getHubActiveKey()) return;
  const want = resolveCurrentServerKey();
  const list = listHubConversations();
  if (want) {
    const key = hubChatKey({ type: "server", server: want });
    if (selectHubChat(key)) return;
  }
  for (let i = 0; i < list.length; i++) {
    if (list[i].type === "server") {
      selectHubChat(list[i].key);
      return;
    }
  }
  if (list.length) selectHubChat(list[0].key);
}

function hubRowToChatMessage(
  row: HubChatMessageRow,
  chat: HubConversation,
): ChatMessage {
  const at = row.date ? Date.parse(row.date) : 0;
  return {
    id: row.id,
    at: Number.isFinite(at) ? at : 0,
    channel: chat.type === "private" || chat.type === "new" ? "pm" : "say",
    owner: row.fro || "",
    message: row.message || "",
  };
}

function sortedMessages(chat: HubConversation): HubChatMessageRow[] {
  const rows = chat.messages.slice();
  rows.sort((a, b) => {
    const ad = a.date || "";
    const bd = b.date || "";
    if (ad !== bd) return ad.localeCompare(bd);
    return String(a.id).localeCompare(String(b.id));
  });
  return rows;
}

function persistActiveDraft(
  draft: string,
  fromName: string,
  whisperTo: string,
): void {
  const active = getHubActiveConversation();
  if (!active) return;
  active.draft = draft;
  active.sender = fromName;
  if (active.type === "new") active.to = whisperTo;
}

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

function ChatRow(props: {
  msg: ChatMessage;
  onAuthorClick?: (name: string) => void;
}): any {
  const msg = props.msg;
  const time = formatChatTimestamp(msg.at);
  // Keep time + author + body as one flowing paragraph (no flex-shrink wrap).
  const ownerName = msg.owner && msg.owner !== "^" ? msg.owner : "";
  const owner = ownerName
    ? e(
        "button",
        {
          type: "button",
          className: "ecu-chat-owner",
          onClick: () => {
            if (props.onAuthorClick) props.onAuthorClick(ownerName);
          },
        },
        ownerName + ":",
      )
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
  /** Restore saved frame size after leaving FULL mode. */
  onFrameSizeRestore?: (size: { w: number; h: number }) => void;
};

export function ChatPanel(props: ChatPanelProps = {}): any {
  const React = getReact();
  ensureChatCss();

  const [, setRev] = React.useState(0);
  const bump = React.useCallback(() => {
    setRev((n: number) => n + 1);
  }, []);

  const [draft, setDraft] = React.useState("");
  const [fromName, setFromName] = React.useState("");
  const [whisperTo, setWhisperTo] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [statusErr, setStatusErr] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [listCursor, setListCursor] = React.useState(
    null as string | null,
  );
  const [listAfter, setListAfter] = React.useState(null as string | null);
  const [listCatchupAfter, setListCatchupAfter] = React.useState(
    null as string | null,
  );
  const [listLoading, setListLoading] = React.useState(false);
  const [listLoaded, setListLoaded] = React.useState(false);
  const [narrow, setNarrow] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [expanded, setExpanded] = React.useState(false);
  const [listFilter, setListFilter] = React.useState("all" as SidebarFilter);

  const rootRef = React.useRef(null as HTMLDivElement | null);
  const logRef = React.useRef(null as HTMLDivElement | null);
  const stickBottomRef = React.useRef(true);
  const inputRef = React.useRef(null as HTMLInputElement | null);
  const loadingOlderRef = React.useRef(false);
  const catchupInFlightRef = React.useRef(false);
  const listLoadingRef = React.useRef(false);
  const listLoadedRef = React.useRef(false);
  const preExpandSizeRef = React.useRef(null as { w: number; h: number } | null);
  const listAfterRef = React.useRef(listAfter);
  const listCatchupRef = React.useRef(listCatchupAfter);
  const listCursorRef = React.useRef(listCursor);
  const draftRef = React.useRef(draft);
  const fromRef = React.useRef(fromName);
  const whisperRef = React.useRef(whisperTo);

  listAfterRef.current = listAfter;
  listCatchupRef.current = listCatchupAfter;
  listCursorRef.current = listCursor;
  draftRef.current = draft;
  fromRef.current = fromName;
  whisperRef.current = whisperTo;

  React.useEffect(() => {
    return subscribeHubChat(bump);
  }, [bump]);

  React.useEffect(() => {
    ensurePartyConversation();
    return subscribeChat(() => {
      const party = ensurePartyConversation();
      const msgs = getChatMessages();
      let latest: ChatMessage | null = null;
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].channel === "party") {
          latest = msgs[i];
          break;
        }
      }
      if (latest) {
        const date = new Date(latest.at).toISOString();
        party.latest = {
          id: String(latest.id),
          date,
          fro: latest.owner || "",
          message: latest.message || "",
        };
        if (getHubActiveKey() === "party") party.seen = date;
      }
      bump();
    });
  }, [bump]);

  const pullActiveChat = React.useCallback(
    async (older?: boolean) => {
      const chat = getHubActiveConversation();
      if (!chat || chat.type === "new" || chat.type === "party") return;
      if (chat.loading) return;
      if (older && !chat.cursor) return;

      // Initial / older loads show busy UI. Background catchup must stay quiet
      // so the status strip and Load-older button do not jump every poll.
      const showBusy = !!older || !chat.loaded;
      if (!showBusy) {
        if (catchupInFlightRef.current) return;
        catchupInFlightRef.current = true;
      } else {
        chat.loading = true;
        bump();
      }

      const args: {
        server?: string;
        character?: string;
        to?: string;
        cursor?: string | null;
        after?: string | null;
      } =
        chat.type === "server"
          ? { server: chat.server }
          : { character: chat.character, to: chat.to };

      let afterUsed: string | null = null;
      if (older) {
        args.cursor = chat.cursor;
      } else if (chat.after) {
        afterUsed = chat.catchup_after || hubChatSince(chat.after);
        args.after = afterUsed;
      }

      try {
        const res = await pullChatPage(args);
        if (!res.ok || !res.data) {
          chat.loading = false;
          if (showBusy) {
            setStatusErr(true);
            setStatus("Messages: " + (res.reason || "failed"));
          }
          bump();
          return;
        }

        applyPullChatResult(chat.key, res.data, !!older);
        const updated = getHubActiveConversation();
        if (updated && updated.key === chat.key && !older) {
          updated.catchup_after =
            afterUsed && res.data.more ? res.data.after : null;
        }
        if (showBusy) setStatusErr(false);
        bump();
      } finally {
        if (!showBusy) catchupInFlightRef.current = false;
      }
    },
    [bump],
  );

  const pullList = React.useCallback(
    async (older?: boolean) => {
      if (!isLoggedIn()) {
        setStatusErr(true);
        setStatus("Log in to load Hub chats");
        return;
      }
      if (listLoadingRef.current) return;
      if (older && !listCursorRef.current) return;

      const showListBusy = !!older || !listLoadedRef.current;
      listLoadingRef.current = true;
      if (showListBusy) setListLoading(true);
      const opts: { cursor?: string | null; after?: string | null } = {};
      if (older) {
        opts.cursor = listCursorRef.current;
      } else if (listAfterRef.current) {
        opts.after =
          listCatchupRef.current || hubChatSince(listAfterRef.current);
      }

      const res = await pullChatsPage(opts);
      listLoadingRef.current = false;
      if (showListBusy) setListLoading(false);
      if (!res.ok || !res.data) {
        setStatusErr(true);
        setStatus("Conversations: " + (res.reason || "failed"));
        bump();
        return;
      }

      applyPullChatsResult(res.data);
      if (!older) {
        setListCatchupAfter(
          listAfterRef.current && res.data.more ? res.data.after : null,
        );
        if (
          !listAfterRef.current ||
          (res.data.after || "") > (listAfterRef.current || "")
        ) {
          setListAfter(res.data.after);
        }
      }
      if (older || !listLoadedRef.current) {
        setListCursor(res.data.cursor);
      }
      listLoadedRef.current = true;
      setListLoaded(true);
      setStatusErr(false);
      bump();
    },
    [bump],
  );

  React.useEffect(() => {
    ensurePartyConversation();
    seedServerChats();
    selectInitialServerChat();
    const active = getHubActiveConversation();
    if (active) {
      setDraft(active.draft || "");
      setFromName(active.sender || "");
      setWhisperTo(active.to || "");
    }
    void (async () => {
      await pullList(false);
      selectInitialServerChat();
      const chat = getHubActiveConversation();
      if (chat && chat.type !== "new" && chat.type !== "party") {
        await pullActiveChat(false);
      }
      bump();
    })();

    const timer = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      void pullActiveChat(false);
      void pullList(false);
    }, POLL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  React.useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const next = entry.contentRect.width < NARROW_PX;
      setNarrow((prev) => (prev === next ? prev : next));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    if (narrow && !expanded) setSidebarOpen(false);
    else setSidebarOpen(true);
  }, [narrow, expanded]);

  React.useEffect(() => {
    let shell: HTMLElement | null = rootRef.current;
    while (shell) {
      if (shell.getAttribute && shell.getAttribute("data-panel") === "chat") {
        break;
      }
      shell = shell.parentElement;
    }
    if (!shell) return;

    if (expanded) {
      if (!preExpandSizeRef.current) {
        preExpandSizeRef.current = {
          w: Math.round(shell.offsetWidth),
          h: Math.round(shell.offsetHeight),
        };
      }
      shell.setAttribute("data-ecu-suspend-frame-resize", "1");
      shell.classList.add("ecu-chat-shell-expanded");
      return () => {
        shell!.classList.remove("ecu-chat-shell-expanded");
        shell!.removeAttribute("data-ecu-suspend-frame-resize");
      };
    }

    shell.classList.remove("ecu-chat-shell-expanded");
    shell.removeAttribute("data-ecu-suspend-frame-resize");
    const saved = preExpandSizeRef.current;
    preExpandSizeRef.current = null;
    if (
      saved &&
      saved.w >= 80 &&
      saved.h >= 80 &&
      typeof props.onFrameSizeRestore === "function"
    ) {
      // After CSS fullscreen drops, put the persisted frame back.
      window.requestAnimationFrame(() => {
        props.onFrameSizeRestore!({ w: saved.w, h: saved.h });
      });
    }
  }, [expanded, props.onFrameSizeRestore]);

  React.useEffect(() => {
    if (props.openSeq == null) return;
    if (typeof props.seedDraft === "string") setDraft(props.seedDraft);
    if (typeof props.seedWhisperTo === "string") {
      persistActiveDraft(draftRef.current, fromRef.current, whisperRef.current);
      const chat = setHubActiveNew(props.seedWhisperTo);
      setDraft(chat.draft || "");
      setFromName(chat.sender || "");
      setWhisperTo(chat.to || props.seedWhisperTo);
      bump();
    }
    window.setTimeout(() => {
      const el = inputRef.current;
      if (el && typeof el.focus === "function") el.focus();
    }, 30);
  }, [props.openSeq, props.seedDraft, props.seedWhisperTo, bump]);

  const active = getHubActiveConversation();
  const conversations = listHubConversations();
  const characters = getHubCharacters();

  React.useEffect(() => {
    const el = logRef.current;
    if (!el || !stickBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [active?.messages.length, active?.key]);

  // Keep From selection valid when characters / active chat change.
  React.useEffect(() => {
    if (!active) return;
    if (fromName) {
      let ok = false;
      for (let i = 0; i < characters.length; i++) {
        if (characters[i].name === fromName) {
          ok = true;
          break;
        }
      }
      if (ok) return;
    }
    if (active.sender) {
      setFromName(active.sender);
      return;
    }
    if (characters.length) {
      let pick = characters[0].name;
      if (active.type === "server" && active.server) {
        for (let i = 0; i < characters.length; i++) {
          const c = characters[i];
          if (c.online && c.server === active.server) {
            pick = c.name;
            break;
          }
        }
      }
      setFromName(pick);
    }
  }, [active?.key, characters, fromName, active]);

  const selectConversation = (key: string) => {
    persistActiveDraft(draft, fromName, whisperTo);
    const chat = selectHubChat(key);
    if (!chat) return;
    setDraft(chat.draft || "");
    setFromName(chat.sender || "");
    setWhisperTo(chat.to || "");
    stickBottomRef.current = true;
    if (narrow && !expanded) setSidebarOpen(false);
    bump();
    if (chat.type !== "new" && chat.type !== "party") void pullActiveChat(false);
  };

  const startNewWhisper = (to?: string) => {
    persistActiveDraft(draft, fromName, whisperTo);
    const chat = setHubActiveNew(to);
    setDraft(chat.draft || "");
    setFromName(chat.sender || "");
    setWhisperTo(chat.to || to || "");
    stickBottomRef.current = true;
    if (narrow && !expanded) setSidebarOpen(false);
    bump();
    window.setTimeout(() => {
      const el = inputRef.current;
      if (el && typeof el.focus === "function") el.focus();
    }, 30);
  };

  const loadOlder = async () => {
    if (loadingOlderRef.current) return;
    const chat = getHubActiveConversation();
    if (!chat || chat.loading || !chat.cursor) return;
    const el = logRef.current;
    const prevHeight = el ? el.scrollHeight : 0;
    const prevTop = el ? el.scrollTop : 0;
    loadingOlderRef.current = true;
    stickBottomRef.current = false;
    try {
      await pullActiveChat(true);
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
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    const chat = getHubActiveConversation();
    if (!chat) {
      setStatusErr(true);
      setStatus("No conversation selected");
      return;
    }

    if (chat.type === "party") {
      const obs = getObserving();
      if (!obs || !obs.name) {
        setStatusErr(true);
        setStatus("Observe a character for party chat");
        return;
      }
      setSending(true);
      const result = sendChatViaObserver("party", text);
      setSending(false);
      if (!result.ok) {
        setStatusErr(true);
        setStatus(result.reason || "party send failed");
        return;
      }
      setStatusErr(false);
      setStatus(`Party via ${obs.name}`);
      setDraft("");
      stickBottomRef.current = true;
      return;
    }

    if (!isLoggedIn()) {
      setStatusErr(true);
      setStatus("Log in to send Hub chat");
      return;
    }
    if (!fromName) {
      setStatusErr(true);
      setStatus("Pick a From character");
      return;
    }
    const to =
      chat.type === "new"
        ? whisperTo.trim()
        : chat.type === "private"
          ? String(chat.to || "").trim()
          : "";
    if (chat.type !== "server" && !to) {
      setStatusErr(true);
      setStatus("Enter a recipient");
      return;
    }

    setSending(true);
    setStatusErr(false);
    setStatus("Sending…");

    const res = await sendHubMessage({
      character: fromName,
      message: text,
      server: chat.type === "server" ? chat.server : undefined,
      to: chat.type === "server" ? undefined : to,
    });

    setSending(false);
    if (!res.ok) {
      setStatusErr(true);
      setStatus("Send failed: " + (res.reason || "error"));
      return;
    }

    setDraft("");
    stickBottomRef.current = true;
    setStatusErr(false);
    setStatus(
      chat.type === "server"
        ? `Sent as ${fromName}`
        : `Whisper → ${to} as ${fromName}`,
    );

    if (chat.type === "new") {
      const saved = rememberHubChat({
        type: "private",
        character: fromName,
        to,
      });
      chat.to = "";
      selectHubChat(saved.key);
      setWhisperTo(saved.to || to);
      bump();
      window.setTimeout(() => {
        void pullActiveChat(false);
        void pullList(false);
      }, 250);
      return;
    }

    window.setTimeout(() => {
      void pullActiveChat(false);
      void pullList(false);
    }, 250);
  };

  const observing = getObserving();
  const canParty = !!(observing && observing.name);
  const isParty = !!(active && active.type === "party");
  const partyMessages = isParty
    ? getChatMessages().filter((m) => m.channel === "party")
    : [];
  const messages = active && !isParty ? sortedMessages(active) : [];
  const title = active ? conversationTitle(active) : "Chat";

  const statusLine = !isLoggedIn() && !isParty
    ? "Log in to use Hub chat"
    : isParty && !canParty
      ? "Observe a character to use party chat"
      : statusErr
        ? status
        : status;
  const titleBusy = !!(active && active.loading && !active.loaded && !isParty);

  const fromOptions: any[] = [];
  for (let i = 0; i < characters.length; i++) {
    const c = characters[i];
    const label =
      c.name +
      (c.online && c.server ? " · " + serverUiLabel(c.server) : "");
    fromOptions.push(
      e("option", { key: c.name, value: c.name }, label),
    );
  }
  if (!fromOptions.length) {
    fromOptions.push(
      e("option", { key: "", value: "" }, "No characters"),
    );
  }

  const sidebarRows: any[] = [];
  for (let i = 0; i < conversations.length; i++) {
    const chat = conversations[i];
    if (listFilter === "server" && chat.type !== "server") continue;
    if (listFilter === "private" && chat.type !== "private") continue;
    if (listFilter === "party" && chat.type !== "party") continue;
    baselineHubChatSeen(chat);
    const latest = chat.latest;
    const preview = latest
      ? (latest.fro || "") + ": " + (latest.message || "")
      : chat.type === "party"
        ? canParty
          ? "Live party chat while observing"
          : "Observe a character to use"
        : "No messages yet";
    const when = latest?.date ? formatChatTimestamp(Date.parse(latest.date)) : "";
    const selected = !!(active && active.key === chat.key);
    let unreadCount = countHubChatUnread(chat, selected);
    if (chat.type === "party" && !selected && chat.seen) {
      const seenMs = Date.parse(chat.seen);
      if (Number.isFinite(seenMs)) {
        const partyMsgs = getChatMessages();
        let partyUnread = 0;
        for (let j = 0; j < partyMsgs.length; j++) {
          const m = partyMsgs[j];
          if (m.channel !== "party" || m.local) continue;
          if (m.at > seenMs) partyUnread += 1;
        }
        if (partyUnread > unreadCount) unreadCount = partyUnread;
      }
    }
    const unreadBadge = formatHubUnreadBadge(unreadCount);
    sidebarRows.push(
      e(
        "button",
        {
          key: chat.key,
          type: "button",
          className:
            "ecu-chat-conv" +
            (selected ? " is-active" : "") +
            (unreadCount > 0 ? " is-unread" : "") +
            (chat.type === "server"
              ? " is-server"
              : chat.type === "party"
                ? " is-party"
                : " is-private"),
          onClick: () => selectConversation(chat.key),
        },
        e(
          "span",
          { className: "ecu-chat-conv-top" },
          e(
            "span",
            { className: "ecu-chat-conv-label" },
            conversationTitle(chat),
            unreadBadge
              ? e(
                  "span",
                  {
                    className: "ecu-chat-unread-badge",
                    "aria-label": unreadCount + " unread",
                  },
                  unreadBadge,
                )
              : null,
          ),
          when
            ? e("span", { className: "ecu-chat-conv-time" }, when)
            : null,
        ),
        e("span", { className: "ecu-chat-conv-preview" }, preview),
      ),
    );
  }
  if (!sidebarRows.length) {
    sidebarRows.push(
      e(
        "div",
        { key: "empty-filter", className: "ecu-chat-sidebar-empty" },
        listFilter === "all"
          ? "No conversations yet."
          : "No " + listFilter + " chats.",
      ),
    );
  }

  const filterButtons: any[] = [];
  for (let i = 0; i < SIDEBAR_FILTERS.length; i++) {
    const f = SIDEBAR_FILTERS[i];
    filterButtons.push(
      e(
        "button",
        {
          key: f.id,
          type: "button",
          className:
            "ecu-chat-filter-btn" + (listFilter === f.id ? " is-active" : ""),
          "aria-pressed": listFilter === f.id,
          onClick: () => setListFilter(f.id),
        },
        f.label,
      ),
    );
  }

  const logChildren: any[] = [];
  if (isParty) {
    if (partyMessages.length) {
      for (let i = 0; i < partyMessages.length; i++) {
        const msg = partyMessages[i];
        logChildren.push(
          e(ChatRow, {
            key: msg.id,
            msg,
            onAuthorClick: (name: string) => startNewWhisper(name),
          }),
        );
      }
    } else {
      logChildren.push(
        e(
          "div",
          { key: "empty", className: "ecu-chat-empty" },
          canParty
            ? "No party messages yet. Send below — uses the observed character."
            : "Observe a character to send and receive party chat.",
        ),
      );
    }
  } else {
    if (active && active.cursor) {
      logChildren.push(
        e(
          "div",
          { key: "older", className: "ecu-chat-history-top" },
          e(
            "button",
            {
              type: "button",
              className: "ecu-chat-load-older",
              disabled: !!active.loading,
              onClick: () => {
                void loadOlder();
              },
            },
            active.loading ? "Loading…" : "Load older",
          ),
        ),
      );
    } else if (active && active.loaded) {
      logChildren.push(
        e(
          "div",
          { key: "end", className: "ecu-chat-history-end" },
          "— beginning —",
        ),
      );
    }

    if (messages.length) {
      for (let i = 0; i < messages.length; i++) {
        const row = messages[i];
        const msg = hubRowToChatMessage(row, active!);
        logChildren.push(
          e(ChatRow, {
            key: msg.id,
            msg,
            onAuthorClick: (name: string) => startNewWhisper(name),
          }),
        );
      }
    } else {
      logChildren.push(
        e(
          "div",
          { key: "empty", className: "ecu-chat-empty" },
          active?.type === "new"
            ? "Start a private message."
            : active?.loading
              ? "Loading messages…"
              : "No messages yet.",
        ),
      );
    }
  }

  return e(
    "div",
    {
      className:
        "ecu-chat" +
        (narrow && !expanded ? " is-narrow" : "") +
        (narrow && !expanded && sidebarOpen ? " is-sidebar-open" : "") +
        (expanded ? " is-expanded" : ""),
      "data-ecu-chat": "1",
      ref: rootRef,
    },
    e(
      "div",
      { className: "ecu-chat-layout" },
      narrow && !expanded && sidebarOpen
        ? e("button", {
            key: "backdrop",
            type: "button",
            className: "ecu-chat-backdrop",
            "aria-label": "Close conversations",
            onClick: () => setSidebarOpen(false),
          })
        : null,
      e(
        "aside",
        {
          className: "ecu-chat-sidebar",
          "aria-label": "Conversations",
          "aria-hidden":
            narrow && !expanded && !sidebarOpen ? "true" : undefined,
        },
        e(
          "div",
          { className: "ecu-chat-sidebar-actions" },
          e(
            "div",
            {
              className: "ecu-chat-filter",
              role: "group",
              "aria-label": "Filter conversations",
            },
            filterButtons,
          ),
          e(
            "button",
            {
              type: "button",
              className: "ecu-chat-sidebar-btn",
              onClick: () => startNewWhisper(),
            },
            "New whisper",
          ),
          listCursor
            ? e(
                "button",
                {
                  type: "button",
                  className: "ecu-chat-sidebar-btn",
                  disabled: listLoading,
                  onClick: () => {
                    void pullList(true);
                  },
                },
                listLoading ? "Loading…" : "More chats",
              )
            : null,
        ),
        e("div", { className: "ecu-chat-conv-list" }, sidebarRows),
      ),
      e(
        "div",
        { className: "ecu-chat-main" },
        e(
          "div",
          {
            className: "ecu-chat-title" + (titleBusy ? " is-busy" : ""),
          },
          narrow && !expanded
            ? e(
                "button",
                {
                  type: "button",
                  className:
                    "ecu-chat-title-toggle" +
                    (sidebarOpen ? " is-open" : ""),
                  onClick: () => setSidebarOpen(!sidebarOpen),
                  "aria-expanded": sidebarOpen,
                },
                sidebarOpen ? "Hide" : "Chats",
              )
            : null,
          e("span", { className: "ecu-chat-title-label" }, title),
          !isParty
            ? e(
                "label",
                {
                  className: "ecu-chat-title-from",
                  title: "Send as",
                },
                e("span", { className: "ecu-chat-title-from-sep" }, "·"),
                e(
                  "select",
                  {
                    className: "ecu-chat-from",
                    value: fromName,
                    disabled: sending || !characters.length,
                    onChange: (ev: any) => setFromName(ev.target.value),
                    "aria-label": "Send as character",
                  },
                  fromOptions,
                ),
              )
            : canParty
              ? e(
                  "span",
                  {
                    className: "ecu-chat-title-from ecu-chat-title-from--party",
                    title: "Party via observed character",
                  },
                  "· " + (observing && observing.name ? observing.name : "party"),
                )
              : null,
          e(
            "button",
            {
              type: "button",
              className:
                "ecu-chat-expand" + (expanded ? " is-expanded" : ""),
              title: expanded ? "Restore chat size" : "Expand chat",
              "aria-pressed": expanded,
              onClick: () => setExpanded(!expanded),
            },
            expanded ? "MIN" : "FULL",
          ),
        ),
        e(
          "div",
          {
            className: "ecu-chat-log",
            ref: logRef,
            onScroll: onLogScroll,
          },
          logChildren,
        ),
        statusLine
          ? e(
              "div",
              {
                className:
                  "ecu-chat-status is-visible" +
                  (statusErr ||
                  (!isLoggedIn() && !isParty) ||
                  (isParty && !canParty)
                    ? " is-err"
                    : ""),
              },
              statusLine,
            )
          : null,
        e(
          "div",
          { className: "ecu-chat-compose" },
          e(
            "div",
            { className: "ecu-chat-compose-row" },
            active && active.type === "new"
              ? e("input", {
                  className: "ecu-chat-to",
                  type: "text",
                  placeholder: "To…",
                  value: whisperTo,
                  maxLength: 12,
                  disabled: sending,
                  onChange: (ev: any) => setWhisperTo(ev.target.value),
                  spellCheck: false,
                  "aria-label": "Whisper to",
                  title: "Whisper to",
                })
              : null,
            e("input", {
              className: "ecu-chat-input",
              ref: inputRef,
              type: "text",
              placeholder: isParty
                ? canParty
                  ? "Party message…"
                  : "Observe to party chat…"
                : active?.type === "new" || active?.type === "private"
                  ? "Private message…"
                  : "Message…",
              value: draft,
              disabled:
                sending ||
                (isParty ? !canParty : !isLoggedIn()),
              onChange: (ev: any) => setDraft(ev.target.value),
              onKeyDown: (ev: any) => {
                if (ev.key === "Enter") {
                  ev.preventDefault();
                  void send();
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
                disabled:
                  sending ||
                  !draft.trim() ||
                  (isParty
                    ? !canParty
                    : !isLoggedIn() ||
                      !fromName ||
                      (active?.type === "new" && !whisperTo.trim())),
                onClick: () => {
                  void send();
                },
              },
              sending ? "…" : "Send",
            ),
          ),
        ),
      ),
    ),
  );
}
