/**
 * Side-effect imports: each module registers its bag context menu actions.
 * Mail and send-item stay in their own modules; the bag menu is the shell.
 */
import "../frames/mail/mailBagMenuActions";
import "../../host/sendItemBagMenuActions";
import "../../host/gearBagMenuActions";
import "../../host/bagSwapMenuActions";
import "../../host/tradeBagMenuActions";
import "../../host/tradeBagFulfillMenuActions";
import "./bagItemInfoActions";
