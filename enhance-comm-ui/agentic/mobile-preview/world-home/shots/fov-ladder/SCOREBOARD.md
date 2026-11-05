# Nameplate FOV ladder (independent raters, no target shared)

Product: `nameplateScreenScale = clamp(FOV × phoneBoost, 1/3, 8)` with phoneBoost 2.25.
Text resolution denseness capped at 6.

| Shot | Score | Notes |
|------|------:|-------|
| fov-0p5-before | 2 | Old bug: no phone boost on zoom-in |
| fov-0p5 | 9 | AFTER — boost kept |
| fov-0p75 | 9 | |
| fov-1 | 9 | |
| fov-1p5 | 8 | Mild overlap |
| fov-2 | 6 | Size OK; stacked fighters clip |
| fov-3 | 3 | Cluster mush (world crowding) |
| fov-4 | 2 | Same — plates sized, positions collide |

AFTER avg ~6.6. Zoom-in 0.5: **2 → 9**. Extreme zoom-out scores are mostly plate-overlap when entities share a few pixels of screen, not under-sized glyphs.
