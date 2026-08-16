import { resolveMailBody, resolveMailSubject } from "./mailSubject";
import { normalizeComposeTos } from "./composeDraft";
import {
  MAIL_ATTACH_EXTRA,
  MAIL_SEND_COST,
  type ComposeAttach,
  type ItemFingerprint,
} from "./types";

function lit(value: string): string {
  return JSON.stringify(String(value));
}

function fingerprintCheckJs(fp: ItemFingerprint, varName: string): string {
  const parts = [`!${varName}`, `${varName}.name!==${lit(fp.name)}`];
  if (fp.level != null) parts.push(`${varName}.level!==${fp.level}`);
  if (fp.q != null) parts.push(`${varName}.q!==${fp.q}`);
  if (fp.p != null) parts.push(`${varName}.p!==${lit(fp.p)}`);
  return parts.join("||");
}

/** CODE pause between mail_take emits (no stock deferred for take). */
function sleepJs(ms: number): string {
  return `await new Promise(function(r){setTimeout(r,${ms | 0});});`;
}

/**
 * Stock `send_mail` awaits the deferred, which resolves on `mail_sending`
 * (`{success:true,in_progress:true}` — server typo `sucess`) before the DB
 * write finishes. Real outcome is `mail_sent` / `mail_failed` character events.
 * Early rejects (gold / locked) throw from await.
 * @param onFailJs CODE run before each failure `return` (e.g. restore swap).
 */
function awaitSendMailJs(
  callExpr: string,
  failLog: string,
  onFailJs = "",
): string {
  const beforeReturn = onFailJs || "";
  return [
    `var __mr=null;`,
    `try{__mr=await ${callExpr};}catch(__e){__mr=__e&&typeof __e==="object"?__e:{failed:true};}`,
    `if(__mr&&__mr.failed&&!__mr.in_progress){`,
    `game_log(${lit(failLog)});`,
    beforeReturn,
    `return;`,
    `}`,
    `if(__mr&&__mr.in_progress){`,
    `var __md=null;`,
    `character.once("mail_sent",function(){__md={ok:1};});`,
    `character.once("mail_failed",function(d){__md={ok:0,d:d};});`,
    `for(var __mi=0;__mi<20000;__mi++){if(__md)break;await sleep(1);}`,
    `if(!__md){game_log(${lit("Mail send timeout")});${beforeReturn}return;}`,
    `if(!__md.ok){`,
    `game_log(${lit(failLog)}+(__md.d&&__md.d.reason?(" · "+__md.d.reason):""));`,
    beforeReturn,
    `return;`,
    `}`,
    `}`,
  ].join("");
}

export type BuildSendOpts = {
  /**
   * Plain mail: one copy per To.
   * With attaches: unused for routing (each attach has its own `to`).
   */
  to: string | string[];
  subject: string;
  body: string;
  /** One physical item mail each; recipient is required `attach.to`. */
  attaches?: ComposeAttach[];
};

function goldGuardJs(need: number, label: string): string {
  return [
    `if(character.gold<${need | 0}){`,
    `game_log(${lit(label)});`,
    `return;`,
    `}`,
  ].join("");
}

function attachStepJs(
  fp: ItemFingerprint,
  toLit: string,
  subjectLit: string,
  bodyLit: string,
  index: number,
  total: number,
  stepCost: number,
): string {
  const preferSlot = Number(fp.slot) | 0;
  const mismatch = fingerprintCheckJs(fp, "it");
  const mismatch0 = fingerprintCheckJs(fp, "it0");
  const candMismatch = fingerprintCheckJs(fp, "__cand");
  const abortMsg = lit(
    total > 1
      ? "Mail attach mismatch — aborted " + index + "/" + total
      : "Mail attach mismatch — aborted",
  );
  const swapAbort = lit(
    total > 1
      ? "Mail swap failed — aborted " + index + "/" + total
      : "Mail swap failed — aborted",
  );
  const goldAbort =
    total > 1
      ? "Mail aborted — not enough gold " + index + "/" + total
      : "Mail aborted — not enough gold";
  const failLog =
    total > 1
      ? "Mail send failed " + index + "/" + total
      : "Mail send failed";
  // Prefer queued slot; if bag reshuffled after a prior send, scan for the item.
  return [
    goldGuardJs(stepCost, goldAbort),
    `var __slot=${preferSlot};`,
    `var it=character.items[__slot];`,
    `if(${mismatch}){`,
    `__slot=-1;`,
    `for(var __si=0;__si<character.items.length;__si++){`,
    `var __cand=character.items[__si];`,
    `if(!(${candMismatch})){__slot=__si;break;}`,
    `}`,
    `if(__slot<0){game_log(${abortMsg});return;}`,
    `it=character.items[__slot];`,
    `}`,
    `await swap(__slot,0);`,
    `var it0=character.items[0];`,
    `if(${mismatch0}){`,
    `game_log(${swapAbort});`,
    `await swap(0,__slot);`,
    `return;`,
    `}`,
    // Restore displacee only after mail_sent; early fail keeps item in slot 0.
    awaitSendMailJs(
      `send_mail(${toLit},${subjectLit},${bodyLit},true)`,
      failLog,
      `await swap(0,__slot);`,
    ),
    `await swap(0,__slot);`,
  ].join("");
}

/**
 * Self-contained CODE for o:command → code_eval.
 * Plain: one awaited send_mail per To.
 * Attaches: one mail per item to that item's `to`.
 */
export function buildSendScript(opts: BuildSendOpts): string {
  const tos = normalizeComposeTos(opts.to);
  const list =
    opts.attaches && opts.attaches.length ? opts.attaches.slice() : [];

  if (!list.length) {
    if (!tos.length) {
      return `game_log("Mail aborted — no recipient");`;
    }
    const subject = lit(String(opts.subject || "").trim());
    const body = lit(String(opts.body || ""));
    const parts: string[] = [
      goldGuardJs(
        MAIL_SEND_COST * tos.length,
        tos.length > 1
          ? "Mail aborted — not enough gold for " + tos.length + " recipients"
          : "Mail aborted — not enough gold",
      ),
    ];
    for (let i = 0; i < tos.length; i++) {
      parts.push(
        awaitSendMailJs(
          `send_mail(${lit(tos[i])},${subject},${body})`,
          "Mail send failed → " + tos[i],
        ),
      );
    }
    return parts.join("");
  }

  for (let i = 0; i < list.length; i++) {
    if (!String(list[i].to || "").trim()) {
      return `game_log("Mail aborted — attach missing recipient");`;
    }
  }

  const stepCost = MAIL_SEND_COST + MAIL_ATTACH_EXTRA;
  const total = list.length;
  const parts: string[] = [
    goldGuardJs(
      stepCost * total,
      "Mail aborted — not enough gold for batch (" + total + "× attach)",
    ),
  ];
  for (let i = 0; i < list.length; i++) {
    const fp = list[i];
    const subject = lit(
      resolveMailSubject(opts.subject, fp, i + 1, total),
    );
    const body = lit(resolveMailBody(opts.body, fp));
    parts.push(
      attachStepJs(fp, lit(fp.to), subject, body, i + 1, total, stepCost),
    );
  }
  return parts.join("");
}

/** One or many takes in a single awaited script (esize check + pause between). */
export function buildTakeScript(mailIds: string | string[]): string {
  const ids = Array.isArray(mailIds) ? mailIds : [mailIds];
  if (!ids.length) return `game_log("Mail take aborted — no ids");`;
  const parts: string[] = [];
  for (let i = 0; i < ids.length; i++) {
    const id = lit(ids[i]);
    const n = i + 1;
    const total = ids.length;
    const spaceMsg = lit(
      total > 1
        ? "Mail take aborted — no inventory space " + n + "/" + total
        : "Mail take aborted — no inventory space",
    );
    parts.push(
      `if(character.esize<1){game_log(${spaceMsg});return;}`,
      `parent.socket.emit("mail_take_item",{id:${id}});`,
    );
    if (i < ids.length - 1) {
      parts.push(sleepJs(500));
    }
  }
  return parts.join("");
}

export { normalizeComposeTos as normalizeTos };
