# Recount UI references (ForgeCDN)

Local copies in [`refs/`](./refs/). Source gallery attachments:

| View | File | Pattern to keep for AL |
| ---- | ---- | ---------------------- |
| [MainWindow](https://media.forgecdn.net/attachments/107/881/MainWindow.jpg) | `refs/MainWindow.jpg` | Ranked bars: `#. Name` + class color fill + `total (rate, %)` + class icon; header ←→ mode cycle, reset, config |
| [DetailsView](https://media.forgecdn.net/attachments/107/882/DetailsView.jpg) | `refs/DetailsView.jpg` | **Split pane:** top = ability pie + ranked ability table; select row → bottom = Hit/Crit/Tick **min/avg/max/count/%** |
| [SummaryView](https://media.forgecdn.net/attachments/107/883/SummaryView.jpg) | `refs/SummaryView.jpg` | Per-player report: Damage / Healing columns + outcome×school matrix; toggle Incoming ↔ Outgoing |
| [DeathView](https://media.forgecdn.net/attachments/107/884/DeathView.jpg) | `refs/DeathView.jpg` | Death picker (time, killed by) + relative-time log with **(Health: n %)** per line + filters + separate HP graph with event markers |
| [RealtimeView](https://media.forgecdn.net/attachments/107/885/RealtimeView.jpg) | `refs/RealtimeView.jpg` | Live area chart for one actor’s DPS; title shows current rate |
| [GraphWindow](https://media.forgecdn.net/attachments/107/886/GraphWindow.jpg) | `refs/GraphWindow.jpg` | Multi-actor damage-over-time: stacked area, Integrate (cumulative), Normalize, legend toggles, time grid |

## Hybrid product decision

| Layer | Primary inspiration |
| ----- | ------------------- |
| Shell / multi-window / fade | **Skada** |
| Default bar row numbers | **Recount Main** + Details! (`total (rate, %)`) |
| Ability drill analytics | **Recount Details** (pie + table + outcome stats) |
| Death forensics | **Recount Death** (list + HP-in-log + graph) |
| Live / fight graphs | **Recount Realtime + Graph** |

Skip Recount chrome (bird watermark, school columns beyond AL’s `physical|magical|pure`, pet columns unless AL pets matter later).
