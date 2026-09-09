/**
 * Hide stock Hub `#comm-chat` panel / toggle and route CHAT → ECU Chat.
 */

import { openChat } from "./session";

const STYLE_ID = "ecu-suppress-stock-hub-chat";

function injectSuppressCss(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
#comm-chat,
#comm-chat-toggle {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}
`;
  document.head.appendChild(el);
}

/**
 * Mark stock chat nodes hidden. Prefer class + CSS over inline style so we
 * do not fight stock layout code or re-enter a MutationObserver.
 */
function hideStockNodes(): void {
  const chat = document.getElementById("comm-chat");
  if (chat && !chat.classList.contains("hidden")) {
    chat.classList.add("hidden");
  }
  const toggle = document.getElementById("comm-chat-toggle");
  if (toggle && !toggle.classList.contains("hidden")) {
    toggle.classList.add("hidden");
    if (toggle.getAttribute("aria-hidden") !== "true") {
      toggle.setAttribute("aria-hidden", "true");
    }
  }
}

/**
 * Stock Hub ships its own chat UI. ECU takes it over: hide stock DOM and
 * make toggle_comm_chat / CHAT button open our Chat panel instead.
 */
export function installStockHubChatTakeover(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & {
    __ecuStockHubChatTaken?: boolean;
    toggle_comm_chat?: () => void;
    comm_chat_new?: (to?: string) => void;
  };
  if (w.__ecuStockHubChatTaken) return;
  w.__ecuStockHubChatTaken = true;

  injectSuppressCss();
  hideStockNodes();

  // Only watch for nodes being (re)inserted — never attributeFilter on
  // style/class. Writing those from the callback re-fires the observer and
  // can freeze the Hub tab.
  if (typeof MutationObserver === "function") {
    const mo = new MutationObserver(() => hideStockNodes());
    const root = document.getElementById("bottom") || document.body;
    if (root) {
      mo.observe(root, { childList: true, subtree: true });
    }
  }

  w.toggle_comm_chat = function ecuToggleCommChat() {
    openChat({ toggle: true });
  };

  // Author clicks in stock messages called comm_chat_new — keep a bridge.
  w.comm_chat_new = function ecuCommChatNew(to?: string) {
    openChat({
      whisperTo: typeof to === "string" ? to : undefined,
      draft: "",
    });
  };
}
