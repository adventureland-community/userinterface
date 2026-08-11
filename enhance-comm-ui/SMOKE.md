# Smoke checklist (enhance-comm-ui)

Quick manual checks after a build / Tampermonkey refresh on `/comm`.

## Core stability

- [ ] **Bag open/close** — open Bag while observing; close via × or stock Bag; entity snapshot / paperdoll still works (no wipe).
- [ ] **Bag sync chrome** — age is observe/connect welcome time (not bag-open); opening Bag later shows e.g. `Synced 2m ago` and keeps ticking; Refresh reconnects for a fresh welcome stamp; 7-col grid stays uniform; bag item clicks open item info.
- [ ] **Party chip dimming** — RIP chips are soft-dimmed; living chips stay full opacity (no attack-range dim — skill ranges differ).
- [ ] **Layout edge snap** — flush sticks when the painted box is ~8px from the edge; does not jump back up/in after snapping to bottom or left.
- [ ] **Panel stretch / anchor** — in Layout edit, each panel header has a 3×3 pad (⌜ ⌃ ⌝ / ◆ / ⌞ ⌄ ⌟); picking bottom anchors grows up (Threat-style), top grows down; panel stays put when switching.
- [ ] Layout edit **Grid** presets (1 / 2.5 / 5 / 10 / 25%) draw **square** cells with nested fine / 2× / 4× guides (brighter on coarser + center/edges); snap uses the selected fine step. Free still disables snap only.
- [ ] **Observe deselect** — click active party chip again, or Esc (paperdoll clears first, then observe).
- [ ] **Layout reset** — Layout edit → Reset positions; active profile returns to built-in defaults.
- [ ] **Boss bar show/hide** — hide via ×; restore via Layout edit → Show on Boss bar.
- [ ] **Visible parties default** — in spectator mode (no observe), Combat/Kills default focus behaves as visible parties without clobbering a saved preference.

## Layout profiles

- [ ] Resize / rotate: Auto profile flips among Desktop / Tablet / Phone (`#comm-ui[data-viewport]`).
- [ ] Forced profile (Layout edit → Profile buttons) sticks until set back to Auto.
- [ ] Phone defaults place Combat / Bag / Command as bottom/center sheets.
- [ ] Export: Copy layout / Download JSON; Import: Paste or Upload on another device.

## Combat / boss

- [ ] Compact ↔ Full persists across reload; channel columns persist in Full.
- [ ] **My party** one-click sets party focus to watched (when observing).
- [ ] Boss bars sort “on me” first, then lowest HP%; HP% text visible; click targets; Aggro chip shows who has aggro.

## Touch / layout edit

- [ ] On tablet/phone: Layout drag handles, Close, Compact, party chips are comfortably tappable.
- [ ] **Layout edit toolbar** — drag the ⠿ / “drag to move” row to relocate the bar (clears topCenter); position persists across reload.
- [ ] Drag snap hits mid / peer anchors; soft nudge on near-overlap drop.
- [ ] Layout edit **Grid** presets redraw nested fine/2×/4× square guides and change snap step; Free still disables snap only.
- [ ] Empty panels in Layout edit show footprint dummies (combat/threat/meters/boss/crypt/bag/paperdoll/buff info/item info).
- [ ] **Crypt panel** — off crypt map panel hides in play; Layout edit shows crypt-shaped dummy (Bosses + Bats rows, sample cards with icons); on crypt map shows **Bosses** (Spike…Angel) and **Bats** (Vampireling, Bat) sections; dead boss shows `Died · #N · … ago` when killed more than once; drag / × hide / opacity persist; click visible boss card targets mob.
- [ ] **Layout edit overlap** — with Boss bar overlapping Crypt progress, click through boss bar *content* to grab Crypt progress drag header underneath; boss bar header/× still draggable; play mode content stays fully clickable.
- [ ] **Layout edit hover** — in Layout edit only, hovering a panel drag header (or × / anchor pad) shows a subtle gold glow on the panel shell; play mode has no hover highlight.
- [ ] **topCenter** — server + map only (crypt moved to Crypt panel).
- [ ] Buff info and item info are separate frames; buff click does not open paperdoll; × / Esc / click-outside closes.
- [ ] **Buff info panel** — Layout edit shows “Buff info”; drag persists; play mode: buff click opens info without paperdoll; × / Esc / click-outside closes.
- [ ] **Item info panel** — paperdoll gear *and trade* clicks open item details in Item info (works even if Bag modal left `modal_count > 0`); content stays in `#ecu-item-dialog`; × / Esc / click-outside / same-slot toggle closes.
- [ ] **Item info switch slots** — with Item info already open, click a *different* filled gear/trade slot; details replace (do not stay stuck on the first item / empty).

- [ ] **Party buff modes** — cycle **Buffs:** on Party panel through Auto / All / Obs / Compact / Shared / Off; persists across reload; Auto hides non-observed under-chip buffs when roster > 8 (Franky-sized).
- [ ] **Buff remaining times** — party / unit / shared buff icons keep the yellow skidloader tint *and* a `45s`/`3m` overlay; tint must not restart every few seconds on observe ms rebroadcasts; orange→green bar must not hit "done" while the overlay still shows time (especially after a shorten or icon repaint).
- [ ] Threat ×counts / aggro badges readable (~14–15px); topCenter map/server not cramped.

## Nice-to-haves

- [ ] Paperdoll VS watched shows gear Δ badges on differing slots.
- [ ] Command snippets: search + folder filter; optional folder on save.
