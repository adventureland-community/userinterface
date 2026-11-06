import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MailRow } from "../../src/host/mail/types";
import {
  mailRowTitle,
  mailRowTitleTip,
} from "../../src/ui/frames/mail/mailRowShared";

function row(extra?: Partial<MailRow>): MailRow {
  return Object.assign(
    {
      id: "1",
      fro: "A",
      to: "B",
      subject: "[overflow] ringsj",
      message: "",
      sent: "1",
      read: true,
    },
    extra || {},
  );
}

describe("mailRowTitle", () => {
  it("prefers item id + level over noisy subject", () => {
    assert.equal(
      mailRowTitle(
        row({ item: { name: "ringsj", level: 1 } }),
      ),
      "ringsj +1",
    );
    assert.equal(
      mailRowTitleTip(row({ item: { name: "ringsj", level: 1 } })),
      "[overflow] ringsj",
    );
  });

  it("falls back to subject when there is no attachment", () => {
    assert.equal(mailRowTitle(row()), "[overflow] ringsj");
    assert.equal(mailRowTitleTip(row()), undefined);
  });
});
