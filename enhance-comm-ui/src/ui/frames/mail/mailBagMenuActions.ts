import { openMail } from "../../../host/mail";
import {
  registerBagMenuProvider,
  type BagMenuAction,
  type BagMenuContext,
} from "../../bag/bagItemContextMenu";

function buildMailBagMenuActions(ctx: BagMenuContext): BagMenuAction[] {
  return [
    {
      id: "send-mail",
      label: "Send mail / queue attach",
      title:
        "Opens compose and queues this item. Right-click more items to batch (one mail each).",
      run: () => {
        openMail({ compose: true, attach: ctx.fp });
      },
    },
  ];
}

registerBagMenuProvider(buildMailBagMenuActions);
