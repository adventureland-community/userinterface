# Follow / retile

## Sub-features

- Idle Follow dead zone (no thrash)
- Smooth recenter toward subject
- Off-screen snap
- Free-cam pan (wide border OK; separate from Follow)

## How to get to it (user POV)

Open /comm (or overlay frame), enable Follow, move or teleport the observed character so the camera recenters across map tiles.

## Driving it

Prefer probes under `enhance-comm-ui/scripts/verify/`. Legacy copies may still be under `agentic/overlay-shot/probe-retile-*.mjs` — drive those until migrated; new work goes to `scripts/verify/`. Assert **both** bounded rebuilds and no large black void during recenter.

## Gotchas

- Wider `mdraw_border` cuts rebuild count and can paint voids under a moving Follow lock.
- Stock retile is one camera-centered window — destination-only retile while the lock lags blanks the current view.
- Pin DEV vs prod inject before claiming a live fix.
