import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { formatLiveMailLoadedStatus } from "../../src/host/mail/mailStatusFormat";
import { resolveMailActivity } from "../../src/ui/frames/mail/mailActivity";
import type { MailStoreSnapshot } from "../../src/host/mail/mailState";
import {
  commit,
  getMailSnapshot,
} from "../../src/host/mail/mailState";
import {
  prefetchRemainingMs,
  resetPrefetchPages,
  schedulePrefetch,
  stopPrefetch,
} from "../../src/host/mail/mailCache";

function baseSnap(
  extra?: Partial<MailStoreSnapshot>,
): MailStoreSnapshot {
  return {
    mails: [],
    nextCursor: null,
    hasMore: false,
    lastHeadAt: 0,
    lastHeadReason: "—",
    status: "",
    statusKind: "",
    loading: false,
    loadingMore: false,
    prefetchArmed: false,
    warmThrash: false,
    panelOpen: false,
    view: { kind: "list" },
    lastScript: "",
    lastSeenUnread: -1,
    newMailCount: 0,
    commandBusy: false,
    unreadStuckHint: "",
    undoCount: 0,
    undoEndsAt: 0,
    deleteProgress: null,
    refreshProgress: null,
    ...extra,
  };
}

describe("formatLiveMailLoadedStatus", () => {
  it("rewrites stale Loaded 40+ to the live cache size", () => {
    assert.equal(
      formatLiveMailLoadedStatus(
        "Loaded 40+ · cache ok · X.unread↓ (verify)",
        910,
        true,
      ),
      "Loaded 910+ · cache ok · X.unread↓ (verify)",
    );
  });

  it("prefixes strategy-only head status with live Loaded count", () => {
    assert.equal(
      formatLiveMailLoadedStatus("cache ok · X.unread↓ (verify)", 910, true),
      "Loaded 910+ · cache ok · X.unread↓ (verify)",
    );
  });
});

describe("resolveMailActivity thrash", () => {
  it("shows inbox-busy while prefetch is armed under thrash", () => {
    const act = resolveMailActivity(
      baseSnap({ prefetchArmed: true, warmThrash: true, hasMore: true }),
    );
    assert.equal(act.mode, "warm");
    assert.equal(act.label, "Inbox busy · still warming");
  });

  it("keeps next-page label without thrash", () => {
    const act = resolveMailActivity(baseSnap({ prefetchArmed: true }));
    assert.equal(act.label, "Warming cache · next page…");
  });
});

describe("schedulePrefetch timer preserve", () => {
  afterEach(() => {
    stopPrefetch();
    resetPrefetchPages();
    commit({
      panelOpen: false,
      hasMore: false,
      loadingMore: false,
      refreshProgress: null,
    });
  });

  it("does not full-restart an armed timer without forceRestart", () => {
    (globalThis as { window?: typeof globalThis }).window = globalThis as any;
    commit({
      panelOpen: true,
      hasMore: true,
      nextCursor: "40",
      mails: [{ id: "1" } as any],
      loadingMore: false,
      refreshProgress: null,
    });
    schedulePrefetch({ forceRestart: true });
    const first = prefetchRemainingMs();
    assert.ok(first > 1000, "armed with base gap");
    schedulePrefetch({ forceRestart: false });
    const second = prefetchRemainingMs();
    assert.ok(
      Math.abs(first - second) < 80,
      "quiet reschedule keeps the same deadline",
    );
    schedulePrefetch({ forceRestart: true });
    const third = prefetchRemainingMs();
    assert.ok(third > second - 20, "forceRestart renews a full gap");
    void getMailSnapshot();
  });
});
