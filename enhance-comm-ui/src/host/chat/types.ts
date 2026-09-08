/** Chat message shapes for the /comm chat window. */

export type ChatChannel = "say" | "party" | "pm" | "system";

export type ChatMessage = {
  id: string;
  at: number;
  channel: ChatChannel;
  owner: string;
  message: string;
  color?: string;
  /** Cross-server PM marker from stock. */
  xserver?: boolean;
  /** Entity id when known (ambient chat_log). */
  entityId?: string;
  /** Local echo for party/PM (observer socket does not receive those). */
  local?: boolean;
};

export type ChatSendMode = "say" | "party" | "whisper";
