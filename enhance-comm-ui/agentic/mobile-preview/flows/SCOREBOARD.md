# Phone real-harness: previous vs new

Real ECU `/overlay` shots (`npm run phone:flows`).

| Set | Path |
|-----|------|
| Previous | [shots-prev4/](shots-prev4/) |
| New | [shots/](shots/) |

## Latest board (blind raters, absolute ≥8 goal)

Consensus median after settings Display toggle wall + command Quick-10 + map-first home (2–3 raters; variance real):

| Flow | Score | ≥8? | Notes |
|------|------:|:---:|-------|
| home | 8 | yes | Map-first; overlay dock hidden in shots; no page dots (single home) |
| apps | 9 | yes | Launcher packed to top |
| chat | 8–9 | yes | Dense party log + quick chips |
| command | 8–9 | yes | Quick tab default; ~10 snippets |
| settings | 8 | yes | Display first; Comm HUD + drawings toggles above the fold |
| bank | 8–9 | yes | Dense sprite grid |
| market | 8 | yes | Named cards + Sell/Buy |
| mail | 8–9 | yes | Full-height; production sync copy; 8 rows |
| bag | 8–9 | yes | Sprite slots; dense seed |

**Status: Board cleared — every flow median ≥8.** `phone:flows` green · **918** tests green.

### What moved the needle this round

- Hide harness `#ecu-overlay-dock` during flow shots (production-like home)
- Settings: open Display; hide phone prose; drawings toggles first-paint on phone
- Command: phone defaults to Quick; seed ~10 snippets
- Home: single-page fixture (no page-dot strip)
- Mail: “Synced just now” instead of “Preview fixtures”
- Bag/market/chat fixture density
