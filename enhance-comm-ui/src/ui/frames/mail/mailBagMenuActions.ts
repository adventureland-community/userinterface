import {
  getMailSnapshot,
  listBagFingerprintsMatchingIdentity,
  mailMatchingToFreeOwn,
  openMail,
  queueMailAttaches,
} from "../../../host/mail";
import {
  registerBagMenuProvider,
  type BagMenuAction,
  type BagMenuContext,
} from "../../bag/bagItemContextMenu";
import { itemInstanceLabel } from "../../../lib/gameIcon";
import { selfCharacterNames } from "./mailFormat";

function liveBagItems(): any[] | null {
  const obs = window.observing;
  return obs && Array.isArray(obs.items) ? obs.items : null;
}

function matchingFingerprints(ctx: BagMenuContext) {
  return listBagFingerprintsMatchingIdentity(liveBagItems(), ctx.fp);
}

function buildMailBagMenuActions(ctx: BagMenuContext): BagMenuAction[] {
  const matching = matchingFingerprints(ctx);
  const label = itemInstanceLabel(ctx.fp.name, {
    p: ctx.fp.p,
    level: ctx.fp.level,
  });
  const selfNames = selfCharacterNames();

  const actions: BagMenuAction[] = [
    {
      id: "send-mail",
      label: "Mail this",
      title: "Open compose and queue this bag slot (one mail).",
      run: () => {
        openMail({ compose: true, attach: ctx.fp });
      },
    },
  ];

  if (matching.length > 1) {
    actions.push({
      id: "send-mail-all-matching",
      label: "Mail all matching (" + matching.length + ")",
      title:
        "Queue every bag slot that matches " +
        label +
        " — same item key, title, and level (qty ignored).",
      run: () => {
        openMail({ compose: true });
        const fps = matchingFingerprints(ctx);
        queueMailAttaches(fps.length ? fps : matching);
      },
    });
  }

  if (selfNames.length) {
    actions.push({
      id: "send-mail-matching-free-own",
      label:
        matching.length > 1
          ? "Mail matching → free own"
          : "Mail this → free own",
      title:
        "Queue matching slots, add own characters with attach room, and distribute To. Leftovers stay unassigned if there are more items than free alts.",
      run: () => {
        openMail({ compose: true });
        const fps =
          matching.length > 1
            ? matchingFingerprints(ctx)
            : matching.length
              ? matching
              : [ctx.fp];
        const snap = getMailSnapshot();
        mailMatchingToFreeOwn({
          fingerprints: fps.length ? fps : [ctx.fp],
          mails: snap.mails,
          selfNames,
          incomplete: snap.hasMore,
        });
      },
    });
  }

  return actions;
}

registerBagMenuProvider(buildMailBagMenuActions);
