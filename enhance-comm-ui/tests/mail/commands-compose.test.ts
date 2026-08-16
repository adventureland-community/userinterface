import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSendScript, buildTakeScript } from "../../src/host/mail/commands";
import {
  attachesHaveRecipients,
  distributeAttachesAcrossTos,
  pickToForNewAttach,
  rebindAttachesToPool,
} from "../../src/host/mail/composeDraft";
import { filterMails } from "../../src/host/mail/filter";
import {
  EMPTY_MAIL_SEARCH_FORM,
  mailSearchFormToQuery,
  queryToMailSearchForm,
} from "../../src/host/mail/mailSearchForm";
import { itemMatchesFingerprint, findFingerprintSlot } from "../../src/host/mail/itemFingerprint";
import {
  appendCursorPage,
  mergeHeadPage,
  normalizeMailPage,
} from "../../src/host/mail/merge";
import { extractInfs } from "../../src/host/mail/api";
import { suggestMailTo } from "../../src/host/mail/toSuggest";
import {
  resolveMailBody,
  resolveMailSubject,
} from "../../src/host/mail/mailSubject";
import { mailBatchSendCost, mailSendCost } from "../../src/host/mail/capabilities";
import {
  assignLocalReadFlags,
  resolveCommandOutcome,
} from "../../src/host/mail/mailUnreadLogic";
import {
  formatUnreadBadgeLabel,
  SERVER_UNREAD_CAP,
} from "../../src/host/mail/mailUnread";
import {
  collapseMailRows,
  mailCollapseKey,
  mailStackItemQuantity,
} from "../../src/host/mail/collapse";
import {
  canKeepOlderAfterHead,
  findHeadOverlap,
  headFingerprint,
  reconcileAfterHeadPull,
  stitchHeadOntoCache,
} from "../../src/host/mail/mailPersistLogic";
import {
  MAIL_ATTACH_EXTRA,
  MAIL_SEND_COST,
  type MailRow,
} from "../../src/host/mail/types";

describe("mail command scripts", () => {
  it("embeds fingerprint guards for attach", () => {
    const s = buildSendScript({
      to: "Kael",
      subject: "Hi",
      body: "body",
      attaches: [{ slot: 4, name: "gloves", level: 8, to: "Kael" }],
    });
    assert.match(s, /Mail attach mismatch/);
    assert.match(s, /var __slot=4/);
    assert.match(s, /await swap\(__slot,0\)/);
    assert.match(s, /await send_mail\("Kael"/);
    assert.match(s, /mail_sent/);
    assert.match(s, /mail_failed/);
    assert.match(s, /await swap\(0,__slot\)/);
    assert.match(s, /Mail swap failed/);
  });

  it("batches attaches into one awaited script", () => {
    const s = buildSendScript({
      to: "Kael",
      subject: "loot",
      body: "",
      attaches: [
        { slot: 2, name: "gloves", level: 8, to: "Kael" },
        { slot: 5, name: "helmet", level: 1, to: "Kael" },
      ],
    });
    assert.match(s, /await send_mail\("Kael","loot · gloves \+8"/);
    assert.match(s, /await send_mail\("Kael","loot · helmet \+1"/);
    assert.match(s, /aborted 1\/2/);
    assert.equal((s.match(/await send_mail/g) || []).length, 2);
  });

  it("routes each attach to its own To", () => {
    const s = buildSendScript({
      to: ["Kael", "Mule"],
      subject: "loot",
      body: "",
      attaches: [
        { slot: 2, name: "gloves", level: 8, to: "Kael" },
        { slot: 5, name: "helmet", level: 1, to: "Mule" },
      ],
    });
    assert.match(s, /await send_mail\("Kael","loot · gloves \+8"/);
    assert.match(s, /await send_mail\("Mule","loot · helmet \+1"/);
    assert.doesNotMatch(s, /extra To ignored/);
    assert.equal((s.match(/await send_mail/g) || []).length, 2);
  });

  it("aborts when an attach has no recipient", () => {
    const s = buildSendScript({
      to: [],
      subject: "x",
      body: "",
      attaches: [{ slot: 1, name: "gloves", level: 1, to: "" }],
    });
    assert.match(s, /attach missing recipient/);
    assert.doesNotMatch(s, /await send_mail/);
  });

  it("sends one plain mail per To", () => {
    const s = buildSendScript({
      to: ["Kael", "Mule"],
      subject: "hi",
      body: "yo",
    });
    assert.equal((s.match(/await send_mail/g) || []).length, 2);
    assert.match(s, /send_mail\("Kael"/);
    assert.match(s, /send_mail\("Mule"/);
    assert.match(s, /character\.gold</);
  });

  it("guards take with esize", () => {
    const s = buildTakeScript("mid1");
    assert.match(s, /esize<1/);
    assert.match(s, /mail_take_item/);
  });

  it("batches takes with pause between", () => {
    const s = buildTakeScript(["a", "b", "c"]);
    assert.equal((s.match(/mail_take_item/g) || []).length, 3);
    assert.match(s, /setTimeout/);
    assert.match(s, /no inventory space 2\/3/);
  });

  it("guards send gold before attach", () => {
    const s = buildSendScript({
      to: "Kael",
      subject: "{item}",
      body: "",
      attaches: [{ slot: 1, name: "gloves", level: 1, to: "Kael" }],
    });
    assert.match(s, /character\.gold</);
    assert.match(s, /not enough gold/);
  });
});

describe("compose attach routing", () => {
  it("round-robins new attaches and can distribute across To", () => {
    const draft = {
      to: ["Kael", "Mule"],
      subject: "",
      body: "",
      attaches: [
        { slot: 1, name: "a", to: "Kael" },
        { slot: 2, name: "b", to: "Kael" },
      ],
    };
    assert.equal(pickToForNewAttach(draft), "Mule");
    const dist = distributeAttachesAcrossTos(draft);
    assert.equal(dist.attaches[0].to, "Kael");
    assert.equal(dist.attaches[1].to, "Mule");
  });

  it("keeps unassigned attaches and binds them when To is added", () => {
    const pending = [
      { slot: 1, name: "a", to: "" },
      { slot: 2, name: "b", to: "" },
    ];
    assert.equal(attachesHaveRecipients(pending), false);
    assert.equal(
      pickToForNewAttach({ to: [], subject: "", body: "", attaches: pending }),
      "",
    );
    const bound = rebindAttachesToPool(pending, ["Kael", "Mule"]);
    assert.equal(bound[0].to, "Kael");
    assert.equal(bound[1].to, "Mule");
    assert.equal(attachesHaveRecipients(bound), true);
  });
});

