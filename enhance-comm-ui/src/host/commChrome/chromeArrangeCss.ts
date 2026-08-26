/** Play-arrange / group / Window Control overlay styles (injected with chromeCss). */

export const CHROME_ARRANGE_CSS = `
/* Edge-snap group affordances (layout edit + play-arrange). */
#comm-ui .comm-pos-panel.comm-pos-grouped.comm-pos-editing,
#comm-ui .comm-pos-panel.comm-pos-grouped.comm-pos-arrange {
  box-shadow: 0 0 0 1px rgba(120, 200, 255, 0.35);
}
/* Alt hold: same arrange outline on every already-visible movable window. */
#comm-ui .comm-pos-panel.comm-pos-arrange:not(.comm-pos-editing) {
  outline: 1px solid rgba(120, 200, 255, 0.55);
  outline-offset: 0;
}
#comm-ui .comm-pos-panel.comm-pos-snap-target {
  box-shadow:
    0 0 0 2px rgba(120, 220, 255, 0.85),
    0 0 16px rgba(80, 180, 255, 0.25) !important;
}
#comm-ui .comm-pos-panel.comm-pos-dragging {
  opacity: 0.92;
}
/* Window Control menu */
#comm-ui .comm-pos-wc-item {
  display: block;
  width: 100%;
  text-align: left;
  cursor: pointer;
  font-size: 12px;
  padding: 4px 8px;
  border: none;
  background: transparent;
  color: #ffe08a;
}
#comm-ui .comm-pos-wc-item:hover {
  background: rgba(80, 70, 30, 0.9);
}
#comm-ui .comm-pos-edit-grip-row {
  pointer-events: auto;
  cursor: grab;
}
#comm-ui .comm-pos-edit-grip-row .comm-pos-edit-grip {
  flex: 1 1 auto;
  min-width: 48px;
}
/* Play-arrange lock / WC / grip: above the frame when space allows; otherwise
 * in-flow (is-inline) so chrome is not clipped and content shifts down. */
#comm-ui .comm-pos-arrange-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 100%;
  top: auto;
  z-index: 6;
  display: flex;
  align-items: stretch;
  justify-content: flex-end;
  gap: 4px;
  margin-bottom: 0;
  padding: 0 0 4px;
  box-sizing: border-box;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.12s ease;
  background: transparent;
  height: auto;
  overflow: visible;
}
/* Hit bridge into the panel so moving onto the bar does not fire mouseleave. */
#comm-ui .comm-pos-arrange-overlay.is-above::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  height: 6px;
}
#comm-ui .comm-pos-arrange-overlay.is-inline {
  position: relative;
  left: auto;
  right: auto;
  bottom: auto;
  top: auto;
  margin-bottom: 2px;
  padding-bottom: 0;
  /* Idle inline chrome must not reserve height — only when open. */
  max-height: 0;
  opacity: 0;
  overflow: hidden;
}
#comm-ui .comm-pos-arrange-overlay.is-chrome-only {
  justify-content: stretch;
}
#comm-ui .comm-pos-arrange-overlay.has-grip {
  justify-content: stretch;
}
/* Mini drag header — same role as layout-edit header, but hover-only. */
#comm-ui .comm-pos-arrange-overlay .comm-pos-edit-grip {
  position: static;
  left: auto;
  top: auto;
  transform: none;
  flex: 1 1 auto;
  min-width: 48px;
  z-index: 0;
  justify-content: flex-start;
}
/* Locked hover title: same chip as the drag grip, no grab handle. */
#comm-ui .comm-pos-arrange-overlay .comm-pos-arrange-title {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1 1 auto;
  padding: 2px 8px;
  background: rgba(40, 40, 20, 0.92);
  border: 1px solid #886;
  color: #ffe08a;
  box-sizing: border-box;
  user-select: none;
  pointer-events: none;
}
#comm-ui .comm-pos-arrange-overlay .comm-pos-arrange-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  text-align: left;
}
#comm-ui .comm-pos-arrange-overlay .comm-pos-window-chrome {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
}
#comm-ui .comm-pos-arrange-overlay .comm-pos-panel-close-in-chrome {
  position: relative;
  top: auto;
  right: auto;
  flex: 0 0 auto;
  align-self: center;
  z-index: 1;
}
#comm-ui .comm-pos-arrange-overlay > * {
  pointer-events: none;
}
/* JS hover class (delayed leave) — survives the gap to above-frame controls.
 * Do NOT use :focus-within here: clicking lock/WC leaves focus on the button
 * and would pin chrome visible after the pointer leaves (stuck after re-lock).
 * Unlocked (.comm-pos-movable): keep the whole arrange strip open so hide ×
 * and lock sit in the same row (no detached floating ×). */
@media (hover: hover) and (pointer: fine) {
  #comm-ui .comm-pos-panel.comm-pos-chrome-open > .comm-pos-arrange-overlay,
  #comm-ui .comm-pos-panel.comm-pos-movable > .comm-pos-arrange-overlay {
    opacity: 1;
    pointer-events: auto;
  }
  #comm-ui .comm-pos-panel.comm-pos-chrome-open > .comm-pos-arrange-overlay.is-inline,
  #comm-ui .comm-pos-panel.comm-pos-movable > .comm-pos-arrange-overlay.is-inline {
    max-height: 48px;
    overflow: visible;
  }
  #comm-ui .comm-pos-panel.comm-pos-chrome-open > .comm-pos-arrange-overlay > *,
  #comm-ui .comm-pos-panel.comm-pos-movable > .comm-pos-arrange-overlay > * {
    pointer-events: auto;
  }
}
/* Touch / coarse: always show so lock/WC remain reachable. */
@media (hover: none), (pointer: coarse) {
  #comm-ui .comm-pos-arrange-overlay {
    opacity: 1;
    pointer-events: auto;
  }
  #comm-ui .comm-pos-arrange-overlay.is-inline {
    max-height: 48px;
    overflow: visible;
  }
  #comm-ui .comm-pos-arrange-overlay > * {
    pointer-events: auto;
  }
}
`;
