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
  itemMatchesQueueIdentity,
  findFingerprintSlot,
  listBagFingerprintsMatchingIdentity,
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
export {
  aggregateMailItems,
  findMailAggByKey,
  groupMailItemsByRecipient,
  mailAggTouchesFullCap,
  mailIdsAllChecked,
  mailIdsForItemsSelectAll,
  mailIdsForItemsTake,
  mailItemAggKey,
  mailsForAgg,
} from "./mailItemsOverview";
export type {
  MailAggItem,
  MailItemsSelectTarget,
  MailRecipientItemSection,
} from "./mailItemsOverview";
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
  normalizeMailSent,
  parseMailItem,
} from "./merge";
export {
  addMailPageIdsToSeen,
  canKeepOlderAfterHead,
  findHeadOverlap,
  headFingerprint,
  mailPagesExhaustInbox,
  patchMailsById,
  reconcileAfterHeadPull,
  retainMailsSeenDuringRefresh,
  stitchHeadOntoCache,
} from "./mailPersistLogic";
export {
  hydrateMailCacheFromIdb,
  schedulePersistMailCache,
} from "./mailPersist";
export {
  extractInfs,
  apiResponseFailed,
  deleteMail,
  pullMailPage,
  readMail,
  readMailMany,
} from "./api";
export {
  addOwnCharsWithFreeMailSpace,
  attachesHaveRecipients,
  canonicalizeDraft,
  clearComposeAndClose,
  clearComposeDraft,
  distributeAttachesAcrossTos,
  distributeMailAttaches,
  emptyDraft,
  forwardMail,
  getSessionMailDraft,
  mailMatchingToFreeOwn,
  makeComposeAttach,
  normalizeComposeTos,
  openCompose,
  patchComposeDraft,
  pickToForNewAttach,
  queueMailAttach,
  queueMailAttaches,
  removeMailAttachAt,
  replyToMail,
  resolveComposeOpen,
  setMailAttachTo,
} from "./mailCompose";
export {
  buildComposeSummary,
  buildMailMatchingToFreeOwnDraft,
  composeSendBlockReason,
} from "./composeExperience";
export type { ComposeSendBlock, ComposeSummary } from "./composeExperience";
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
  MAIL_ATTACH_CAP,
  MAIL_ATTACH_SENDER_CAP,
  buildComposeCapNotices,
  buildMailboxCapsView,
  buildOwnToCapFills,
  canOwnCharReceiveAttach,
  countAttachmentsByRecipient,
  countMailboxAttachments,
  countSenderAttachmentsTo,
  fillCapLabel,
  fillCapPct,
  formatCapFraction,
  formatMailboxCapsLine,
  formatOwnToCapFraction,
  mailboxCapPressure,
  mailboxCapsTitle,
  mailboxCapTitle,
  mergeOwnedMailboxFills,
  ownCharsWithFreeMailSpace,
  ownToCapTitle,
  senderCapPressure,
  summarizeMailboxCaps,
} from "./mailCaps";
export type {
  CharMailboxFill,
  ComposeCapNotice,
  MailboxCapsView,
  MailCapPressure,
  OwnToCapFill,
} from "./mailCaps";
export {
  clearNewMailBanner,
  clearWarmThrash,
  loadOlderMail,
  prefetchRemainingMs,
  refreshMailIds,
  requestMailCacheRefresh,
  requestMailHead,
  schedulePrefetch,
  setMailSearchBurst,
  stopPrefetch,
} from "./mailCache";
export { formatLiveMailLoadedStatus } from "./mailStatusFormat";
export {
  mailSearchEmptyHint,
  mailSearchWantsBurst,
} from "./mailSearchCoverage";
export {
  deleteMailRow,
  deleteMailRows,
  flushPendingMailDeletes,
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
  chunkRefreshCursors,
  estimateRefreshEtaMs,
  formatRefreshProgressLabel,
  refreshPageCount,
  refreshPageCursors,
} from "./mailRefreshEstimate";
export type { MailRefreshProgress } from "./mailRefreshEstimate";
export {
  clearMailSession,
  cueMailItemsRecipient,
  openMail,
  setMailPanelOpen,
  subscribeMailItemsCue,
  subscribeMailOpen,
} from "./mailSession";
export type { MailItemsCue, MailOpenPayload } from "./mailSession";
export {
  getMailSnapshot,
  setMailView,
  subscribeMailStore,
  subscribeMailToast,
} from "./mailState";
export type { MailStoreSnapshot } from "./mailState";
export {
  assignLocalReadFlags,
  mailBlocksHardDelete,
  resolveCommandOutcome,
  shouldHoldUnreadUntilVerified,
} from "./mailUnreadLogic";
export type { CommandOutcome, CommandOutcomeCode } from "./mailUnreadLogic";
export {
  buildNewMailToast,
  formatMailRoute,
  formatMailWhat,
  formatNewMailPlainLine,
  pickNewMailRows,
} from "./mailNewNotify";
export type { NewMailToastPayload } from "./mailNewNotify";
