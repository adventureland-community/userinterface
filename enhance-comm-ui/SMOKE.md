# Smoke checklist (enhance-comm-ui)

Quick manual checks after a build / Tampermonkey refresh on `/comm`.

## Core stability

- [ ] **Bag open/close** — open Bag while observing; close via × or stock Bag; entity snapshot / paperdoll still works (no wipe).
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
- [ ] Drag snap hits 0 / 50 / 100 and nearby peer panel edges; soft nudge on near-overlap drop.
- [ ] Layout edit **Grid** presets (1 / 2.5 / 5 / 10 / 25%) redraw guides and change snap step; Free still disables snap only.
- [ ] Empty panels in Layout edit show footprint dummies (combat/threat/meters/boss/bag/paperdoll/buff info/item info).
- [ ] Buff info and item info are separate frames; buff click does not open paperdoll; × / Esc / click-outside closes.
- [ ] **Buff info panel** — Layout edit shows “Buff info”; drag persists; play mode: buff click opens info without paperdoll; × / Esc / click-outside closes.
- [ ] **Item info panel** — paperdoll gear *and trade* clicks open item details in Item info (works even if Bag modal left `modal_count > 0`); content stays in `#ecu-item-dialog`; × / Esc / click-outside / same-slot toggle closes.
- [ ] **Item info switch slots** — with Item info already open, click a *different* filled gear/trade slot; details replace (do not stay stuck on the first item / empty).

- [ ] **Party buff modes** — cycle **Buffs:** on Party panel through Auto / All / Obs / Compact / Shared / Off; persists across reload; Auto hides non-observed under-chip buffs when roster > 8 (Franky-sized).
- [ ] Threat ×counts / aggro badges readable (~14–15px); topCenter map/server not cramped.

## Nice-to-haves

- [ ] Paperdoll VS watched shows gear Δ badges on differing slots.
- [ ] Command snippets: search + folder filter; optional folder on save.
