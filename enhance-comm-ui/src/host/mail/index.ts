/**
 * Public mail host API — single barrel (no store.ts facade).
 */

export type {
  ComposeAttach,
  ComposeDraft,
  ItemFingerprint,
  MailCapabilities,
  MailItem,
  MailPill,
  MailRow,
  MailView,
  PullMailPage,
} from "./types";
export {
  MAIL_ATTACH_EXTRA,
  MAIL_COMMAND_HEAD_DELAY_MS,
  MAIL_HEAD_TTL_MS,
  MAIL_PREFETCH_GAP_MS,
  MAIL_SEND_COST,
} from "./types";
export {
  fingerprintFromSlot,
  itemMatchesFingerprint,
  findFingerprintSlot,
} from "./itemFingerprint";
export { filterMails, MAIL_SEARCH_HINT, parseMailSearch } from "./filter";
export type { MailSearchClause, ParsedMailSearch } from "./filter";
export {
  EMPTY_MAIL_SEARCH_FORM,
  MAIL_SEARCH_SCOPES,
  mailSearchFormToQuery,
  queryToMailSearchForm,
} from "./mailSearchForm";
export type { MailSearchFormState } from "./mailSearchForm";
export {
  collapseMailRows,
  mailCollapseKey,
  mailStackItemQuantity,
} from "./collapse";
export type { MailCollapseGroup } from "./collapse";
export { suggestMailTo } from "./toSuggest";
export type { MailToSuggestion, SuggestMailToOpts } from "./toSuggest";
export { buildSendScript, buildTakeScript } from "./commands";
export {
  resolveMailSubject,
  resolveMailBody,
  formatAttachSubject,
  subjectPlaceholder,
  MAIL_SUBJECT_ITEM_TOKEN,
} from "./mailSubject";
export {
  getMailCapabilities,
  getMailObservingSnap,
  mailBatchSendCost,
  mailSendCost,
} from "./capabilities";
export type { MailObservingSnap } from "./capabilities";
export {
  appendCursorPage,
  mergeHeadPage,
  normalizeMailPage,
  parseMailItem,
} from "./merge";
export {
  canKeepOlderAfterHead,
  findHeadOverlap,
  headFingerprint,
  reconcileAfterHeadPull,
  stitchHeadOntoCache,
} from "./mailPersistLogic";
export {
  hydrateMailCacheFromIdb,
  schedulePersistMailCache,
} from "./mailPersist";
export {
  extractInfs,
  deleteMail,
  pullMailPage,
  readMail,
  readMailMany,
} from "./api";
export {
  attachesHaveRecipients,
  canonicalizeDraft,
  distributeAttachesAcrossTos,
  distributeMailAttaches,
  emptyDraft,
  forwardMail,
  getSessionMailDraft,
  makeComposeAttach,
  normalizeComposeTos,
  openCompose,
  patchComposeDraft,
  pickToForNewAttach,
  queueMailAttach,
  removeMailAttachAt,
  replyToMail,
  resolveComposeOpen,
  setMailAttachTo,
} from "./mailCompose";
export {
  applyXUnread,
  bootMailUnreadWatch,
  findNewestUnreadId,
  formatUnreadBadgeLabel,
  getXUnread,
  installMailUnreadWatch,
  markAllUnreadRead,
  markVisibleRead,
  openMailRow,
  openNewestUnread,
  SERVER_UNREAD_CAP,
  syncMailBadge,
  syncUnreadFromX,
} from "./mailUnread";
export { sendMailCommand, takeMailCommand } from "./mailOutcomes";
export {
  clearNewMailBanner,
  loadOlderMail,
  requestMailHead,
} from "./mailCache";
export {
  deleteMailRow,
  deleteMailRows,
  undoDeleteMail,
  undoSecondsLeft,
} from "./mailDelete";
export {
  estimateDeleteEtaMs,
  estimateDeleteRemainingMs,
  formatDeleteEta,
  formatDeleteProgressLabel,
} from "./mailDeleteEstimate";
export {
  clearMailSession,
  openMail,
  setMailPanelOpen,
  subscribeMailOpen,
} from "./mailSession";
export type { MailOpenPayload } from "./mailSession";
export {
  getMailSnapshot,
  setMailView,
  subscribeMailStore,
  subscribeMailToast,
} from "./mailState";
export type { MailStoreSnapshot } from "./mailState";
export { assignLocalReadFlags, resolveCommandOutcome } from "./mailUnreadLogic";
export type { CommandOutcome, CommandOutcomeCode } from "./mailUnreadLogic";
