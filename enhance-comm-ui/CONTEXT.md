# enhance-comm-ui

Adventure.land `/comm` observer overlay: combat HUD, meters, mail, and layout chrome over the stock client.

## Language

**Comm**:
The `/comm` observer page and the ECU React overlay mounted on it (`#comm-ui`).
_Avoid_: spectator UI, overlay app

**Comm window**:
A positioned frame on Comm — either a HUD panel or a meter instance — that can move, snap, resize, ungroup, and raise.
_Avoid_: panel (when you mean any window), PositionedPanel, widget

**Comm window graph**:
The module that owns Comm-window geometry and grouping: move, live-drag policy, snap, resize, ungroup, raise, and commit across HUD and meters.
_Avoid_: layout store, window manager, edge-group engine (those are pieces inside it)

**Raise**:
Bringing a Comm window to the front of the stack (Details-style toplevel). Part of the Comm window graph, not a separate shell concern.
_Avoid_: z-order tweak, activate (activate may *trigger* raise)

**Edge group**:
Windows attached along sides via snap links (`snap` sides 1–4), moved and resized together.
_Avoid_: cluster, dock group

**Observe**:
Stock AL watch-target mode that drives party focus, bag, and chrome while on Comm.
_Avoid_: spectate (unless meaning stock-only), focus (too overloaded with party focus)
