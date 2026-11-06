---
name: verify-ecu
description: >-
  Verify Enhance Comm UI (ECU) the way a user sees it: doctor which bundle is
  injected, drive overlay/Playwright probes, prove Follow/mail/chrome with
  coverage∧cost. Use when proving an ECU fix, after a perf change, when
  Follow/mail/desktop panels look wrong, or when a rebuild-count probe went
  green but the live map/UI still fails.
---

# Verify ECU

Project-local verification for `enhance-comm-ui`. Prefer this over inventing a one-off probe.

## Doctor (run first)

Answer: **which bundle is the live page running?**

- Page stamp `[ecu-dev]` / version `*-dev*` → Tampermonkey (or similar) is on the **watch/DEV** inject. Fixes must land via `npm run watch` / DEV server, not only root prod sync.
- Production stamp / `isEcuDevBuild → false` → root `enhance-comm-ui.js` after `Remove-Item Env:ECU_DEV; npm run build` (Windows) or unset `ECU_DEV` then `npm run build`.
- Never claim a UI fix from the wrong loader. Workspace rule: never ship an `ECU_DEV` root artifact.

Quick checks:

```powershell
cd enhance-comm-ui; npm run typecheck; npm test
Select-String -Path ..\enhance-comm-ui.js -Pattern "isEcuDevBuild" | Select-Object -First 5
```

## Launch / harness layout

**Do not put new probes under `agentic/`.** That name is AdventureLand-mongodb bleed. Preferred home for new work:

- Scripts: `enhance-comm-ui/scripts/verify/` (or `scripts/probes/`)
- Shots / JSON: `enhance-comm-ui/scripts/verify/shots/`

**Legacy (read-only until migrated):** some existing Playwright probes still live under `enhance-comm-ui/agentic/overlay-shot/` (`probe-*.mjs`, shots beside them). Drive those when they already cover the symptom; when you extend or rewrite a probe, move it to `scripts/verify/` and update this skill.

Typical overlay frame URL:

`http://127.0.0.1:3927/overlay/frame?embed=1&view=desktop|phone&engine_mode=canvas`

Ensure the overlay/dev server the probe expects is up before driving.

## Drive

Match the user’s mode: **desktop vs phone**, **Follow vs free-cam**, panel open vs closed. Prefer existing retile/visibility probes; extend or relocate them when the symptom is new.

## Evidence — dual metric for retile / Follow

A retile/perf claim is not done on rebuild-count or ms alone. Require:

1. **Cost** — rebuilds / thrash bounded.
2. **Coverage** — no large black void / late tiles on the Follow recenter (or pan) path. Add a void assert before declaring a perf fix green if none exists.

Mail chrome: INBOX cache counts are live; STATUS must not contradict them after warm.

## Cleanup

Stop processes you started. Keep shot JSON/PNG as evidence; do not delete proof artifacts.
