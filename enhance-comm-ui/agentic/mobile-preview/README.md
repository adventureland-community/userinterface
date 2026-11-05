# Phone harness (real ECU)

Phone UI verification loads the **same** `enhance-comm-ui.js` IIFE as Tampermonkey, via the overlay preview host — not hand-drawn HTML mocks.

## Prerequisites

```bash
npm run dev
```

Serves `http://127.0.0.1:3927/overlay` (LAN: use the host printed by `/health`).

## Drivers

| Script | Purpose |
|--------|---------|
| `npm run phone:flows` | Open real panels (dock / Apps) at 390×844 and write PNGs under `flows/shots/` |
| `node agentic/mobile-preview/drive-overlay-phone.mjs` | Dock / Chat / Cmd / Settings smoke |
| `node agentic/mobile-preview/drive-tours-phone.mjs` | Guided-tour walkthrough |

Override URL: `ECU_OVERLAY_URL=http://192.168.x.x:3927/overlay`.

## Do not

Do not reintroduce `render-flows.mjs`-style `page.setContent` HTML mock scoring. Blind rates and polish must use shots from these drivers (real `#comm-ui`).
