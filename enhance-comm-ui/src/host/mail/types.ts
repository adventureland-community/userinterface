/** Account mail types for Comm mail panel. */

export type MailItem = {
  name: string;
  level?: number;
  q?: number;
  p?: string;
  [key: string]: unknown;
};

export type MailRow = {
  id: string;
  fro: string;
  to: string;
  subject: string;
  message: string;
  sent: string;
  /**
   * Local session only — stock `pull_mail` does not include `read`.
   * `false` = treat as unread in the UI; `true`/omit = read.
   */
  read?: boolean;
  item?: MailItem;
  taken?: boolean;
  system?: boolean;
};

/** Snapshot fields embedded in commanded scripts for live checks. */
export type ItemFingerprint = {
  slot: number;
  name: string;
  level?: number;
  q?: number;
  p?: string;
};

/** Queued bag item; `to` may be "" until a recipient is chosen. */
export type ComposeAttach = ItemFingerprint & {
  /** Who receives this item mail (empty = unassigned). */
  to: string;
};

export type ComposeDraft = {
  /** Recipient pool (plain send targets; also options for attach routing). */
  to: string[];
  subject: string;
  body: string;
  /**
   * One physical item → one mail to `attach.to`.
   * Same bag slot cannot appear twice (game: item leaves inventory once).
   */
  attaches: ComposeAttach[];
};

export type MailView =
  | { kind: "list" }
  | { kind: "read"; id: string }
  | { kind: "compose"; draft: ComposeDraft };

export type MailCapabilities = {
  canSend: boolean;
  canTake: boolean;
  sendCost: number;
  observeName?: string;
  reason?: string;
  gold?: number;
  goldEnough: boolean;
  attachCount: number;
  toCount: number;
};

export type MailPill = "all" | "unread" | "item" | "tome" | "fromme";

export type PullMailPage = {
  mail: MailRow[];
  more: boolean;
  cursor: string | null;
  cursored: boolean;
};

export const MAIL_SEND_COST = 48000;
export const MAIL_ATTACH_EXTRA = 312000;
export const MAIL_HEAD_TTL_MS = 20000;
/** Base delay between background older-page pulls. */
export const MAIL_PREFETCH_GAP_MS = 1800;
/** Extra ms added per successive prefetch page (ramps toward max). */
export const MAIL_PREFETCH_GAP_STEP_MS = 350;
export const MAIL_PREFETCH_GAP_MAX_MS = 5000;
export const MAIL_COMMAND_HEAD_DELAY_MS = 1500;
/** Soft-delete undo only for small batches; larger deletes finalize immediately. */
export const MAIL_DELETE_UNDO_MAX = 25;
export const MAIL_DELETE_UNDO_MS = 5000;
/** Pause between server delete_mail calls (be kind to AL). */
export const MAIL_DELETE_GAP_MS = 280;
/** Extra ms per successive delete, capped (large cleanups ramp gently). */
export const MAIL_DELETE_GAP_STEP_MS = 4;
export const MAIL_DELETE_GAP_MAX_MS = 750;
