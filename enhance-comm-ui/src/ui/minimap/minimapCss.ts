/**
 * Minimap shell chrome — lean idle; tools/legend on hover / unlock / touch.
 * Arrange strip (lock/×) stays on PositionedPanel — do not duplicate here.
 */

const STYLE_ID = "ecu-minimap-chrome-css";

const CSS = `
.comm-minimap {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: 200px;
  min-height: 200px;
  background: transparent;
  box-shadow: none;
  box-sizing: border-box;
  overflow: hidden;
}
.comm-minimap-titlebar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-bottom: 1px solid #333;
  flex-shrink: 0;
  min-height: 22px;
  box-sizing: border-box;
}
.comm-minimap-title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #ccc;
  font-size: 13px;
}
.comm-minimap-tools {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  transition: opacity 0.12s ease;
}
.comm-minimap-tools button {
  background: #1a1a1a;
  border: 1px solid #555;
  color: #eee;
  font-size: 13px;
  padding: 1px 6px;
  cursor: pointer;
  line-height: 1.2;
}
.comm-minimap-tools button:hover {
  border-color: #888;
  background: #252525;
}
.comm-minimap-stage {
  flex: 1;
  min-height: 0;
  position: relative;
  width: 100%;
  cursor: crosshair;
  touch-action: none;
}
.comm-minimap-stage canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.comm-minimap-legend {
  position: absolute;
  left: 4px;
  right: 4px;
  bottom: 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  align-items: center;
  justify-content: flex-end;
  padding: 3px 6px;
  background: rgba(0,0,0,0.72);
  border: 1px solid #333;
  box-sizing: border-box;
  pointer-events: none;
  transition: opacity 0.12s ease;
}
.comm-minimap-leg {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #aaa;
  font-size: 13px;
}
.comm-minimap-swatch {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.55);
}
/* Idle: hide tools + legend on fine pointers. */
@media (hover: hover) and (pointer: fine) {
  .comm-minimap:not(:hover) .comm-minimap-hover {
    opacity: 0;
    pointer-events: none;
  }
  /* Panel hover / unlocked arrange keeps chrome usable without fighting the strip. */
  .comm-pos-panel.comm-pos-chrome-open .comm-minimap .comm-minimap-hover,
  .comm-pos-panel.comm-pos-movable .comm-minimap .comm-minimap-hover,
  .comm-pos-panel.comm-pos-editing .comm-minimap .comm-minimap-hover,
  .comm-minimap.is-layout-edit .comm-minimap-hover {
    opacity: 1;
    pointer-events: auto;
  }
  .comm-pos-panel.comm-pos-chrome-open .comm-minimap .comm-minimap-legend,
  .comm-pos-panel.comm-pos-movable .comm-minimap .comm-minimap-legend,
  .comm-pos-panel.comm-pos-editing .comm-minimap .comm-minimap-legend,
  .comm-minimap.is-layout-edit .comm-minimap-legend {
    pointer-events: none;
  }
}
.comm-minimap:hover .comm-minimap-hover {
  opacity: 1;
  pointer-events: auto;
}
.comm-minimap:hover .comm-minimap-legend {
  pointer-events: none;
}

.comm-minimap[data-bg="opaque"] {
  background: rgba(0, 0, 0, 0.94);
  box-shadow: 0 0 0 1px #111, 4px 4px 0 rgba(0, 0, 0, 0.45);
}

.comm-minimap[data-bg="faint"] {
  background: rgba(0, 0, 0, 0.22);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.07);
}
.comm-minimap[data-bg="faint"] .comm-minimap-titlebar {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}
.comm-minimap[data-bg="faint"] .comm-minimap-legend {
  background: rgba(0, 0, 0, 0.45);
  border-color: rgba(255, 255, 255, 0.1);
}

.comm-minimap[data-bg="transparent"] {
  background: transparent;
  box-shadow: none;
}
.comm-minimap[data-bg="transparent"] .comm-minimap-titlebar {
  border-bottom-color: transparent;
  background: transparent;
}
.comm-minimap[data-bg="transparent"] .comm-minimap-legend {
  background: rgba(0, 0, 0, 0.5);
  border-color: rgba(255, 255, 255, 0.12);
}
`;

let injected = false;

export function injectMinimapCss(): void {
  if (typeof document === "undefined") return;
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  if (!injected || el.textContent !== CSS) {
    el.textContent = CSS;
  }
  injected = true;
}
