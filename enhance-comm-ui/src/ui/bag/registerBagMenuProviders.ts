/**
 * Side-effect imports: each module registers its bag context menu actions.
 * Mail and send-item stay in their own modules; the bag menu is the shell.
 */
import "../frames/mail/mailBagMenuActions";
import "../../host/sendItemBagMenuActions";
import "./bagItemInfoActions";
