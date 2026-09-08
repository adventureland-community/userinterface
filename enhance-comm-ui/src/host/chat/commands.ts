/**
 * Build o:command scripts that call stock say / party_say / private_say
 * on the observed character (observer sockets cannot emit "say" themselves).
 */

import { emitObserverCommand } from "../al";
import { wrapCommandScript, injectCommLog } from "../commandScript";
import type { ChatSendMode } from "./types";

const MAX_LEN = 1200;

function lit(value: string): string {
  return JSON.stringify(String(value));
}

export function truncateChatMessage(message: string): string {
  const raw = String(message || "");
  if (raw.length <= MAX_LEN) return raw;
  return raw.slice(0, MAX_LEN);
}

/**
 * Prefer stock helpers so /slash commands and deferreds work on the character.
 * Messages starting with `/` always go through `say` (party/whisper selectors ignored).
 */
export function buildChatSendScript(
  mode: ChatSendMode,
  message: string,
  whisperTo?: string,
): string | null {
  const text = truncateChatMessage(message).trim();
  if (!text) return null;

  if (text.charAt(0) === "/") {
    return wrapCommandScript(
      `if(typeof say!=="function"){game_log("chat · say missing");return;}` +
        `say(${lit(text)});`,
    );
  }

  if (mode === "party") {
    return wrapCommandScript(
      `if(typeof party_say!=="function"){game_log("chat · party_say missing");return;}` +
        `party_say(${lit(text)});`,
    );
  }

  if (mode === "whisper") {
    const to = String(whisperTo || "").trim();
    if (!to) return null;
    return wrapCommandScript(
      `if(typeof private_say!=="function"){game_log("chat · private_say missing");return;}` +
        `private_say(${lit(to)},${lit(text)});`,
    );
  }

  return wrapCommandScript(
    `if(typeof say!=="function"){game_log("chat · say missing");return;}` +
      `say(${lit(text)});`,
  );
}

export function sendChatViaObserver(
  mode: ChatSendMode,
  message: string,
  whisperTo?: string,
): { ok: boolean; reason?: string; script?: string } {
  const script = buildChatSendScript(mode, message, whisperTo);
  if (!script) {
    if (mode === "whisper" && !String(whisperTo || "").trim()) {
      return { ok: false, reason: "whisper needs a name" };
    }
    return { ok: false, reason: "empty" };
  }
  const labeled = injectCommLog(
    script,
    mode === "whisper"
      ? `chat · w ${String(whisperTo || "").trim()}`
      : `chat · ${mode}`,
  );
  const ok = emitObserverCommand(labeled, `chat-${mode}`);
  if (!ok) return { ok: false, reason: "no socket", script: labeled };
  return { ok: true, script: labeled };
}
