/**
 * Closable / movable Comm minimap — /comm only.
 *
 * Load / map change / ◎: center on observer + zoom-fit all drawable entities
 * (not G.geometry). After that the camera stays put — no continuous observer
 * tracking while walking. Manual pan / zoom still work.
 * Never auto-fit on walk Δ, observe flicker, or every paint.
 */

import { getReact, e } from "../../host/react";
import { getEntitiesList, getG, getObservingId } from "../../host/al";
import { setXTarget } from "../../host/icons";
import { subscribeTick } from "../../tick";
import { getSettings, patchSettings } from "../../lib/settings";
import { PIXEL_TEXT } from "../../lib/typeScale";
import {
  cameraExtentFromWorldCoords,
  clampMinimapZoom,
  MINIMAP_ZOOM_DEFAULT,
  type MapExtent,
} from "../minimap/mapExtent";
import {
  hitTestMinimap,
  makeProjector,
  paintMinimap,
} from "../minimap/paintMinimap";
import { injectMinimapCss } from "../minimap/minimapCss";
import { readMinimapScene } from "../minimap/minimapScene";
import {
  cycleMinimapBgMode,
  minimapBgModeLabel,
  minimapBgModeTitle,
  normalizeMinimapBgMode,
} from "../minimap/minimapAppearance";

const DEFAULT_SIZE = 200;

const LEGEND: Array<{ color: string; label: string; title: string }> = [
  { color: "#ffe66d", label: "You", title: "You / observed" },
  { color: "#7dffb3", label: "P", title: "Party" },
  { color: "#5ec8ff", label: "I", title: "Other players" },
  { color: "#e85d5d", label: "M", title: "Monsters" },
  { color: "#c77dff", label: "B", title: "Boss / cooperative" },
];

export type MinimapProps = {
  layoutEdit?: boolean;
  setSelectedEntity?: (id: string | undefined) => void;
  selectedEntity?: string;
};

type FocusXY = { x: number; y: number };

function mapDisplayName(mapKey: string | undefined): string {
  if (!mapKey) return "…";
  const named = getG()?.maps?.[mapKey]?.name;
  if (typeof named === "string" && named) return named;
  return mapKey;
}

export function Minimap(props: MinimapProps): any {
  const React = getReact();
  injectMinimapCss();
  const wrapRef = React.useRef(null as HTMLDivElement | null);
  const canvasRef = React.useRef(null as HTMLCanvasElement | null);
  const sizeRef = React.useRef({ w: DEFAULT_SIZE, h: DEFAULT_SIZE });
  const extentRef = React.useRef(null as MapExtent | null);
  const panRef = React.useRef({ x: 0, y: 0 });
  const lastFocusRef = React.useRef(null as FocusXY | null);
  const lastPointsRef = React.useRef([] as FocusXY[]);
  /**
   * Fixed pan center from last entity-fit snap (map load / ◎).
   * Not updated while the observer walks.
   */
  const camFocusRef = React.useRef(null as FocusXY | null);
  /** Auto-fit gate: primed after first focus; then only map/`in` changes. */
  const trackRef = React.useRef({
    primed: false,
    mapKey: "",
    inKey: "",
  });
  const dragRef = React.useRef(
    null as {
      sx: number;
      sy: number;
      panX: number;
      panY: number;
      scale: number;
      moved: boolean;
    } | null,
  );

  const initial = getSettings();
  const [zoom, setZoom] = React.useState(() =>
    clampMinimapZoom(
      typeof initial.minimapZoom === "number"
        ? initial.minimapZoom
        : MINIMAP_ZOOM_DEFAULT,
    ),
  );
  const [bgMode, setBgMode] = React.useState(() =>
    normalizeMinimapBgMode(initial.minimapBg),
  );
  const [meta, setMeta] = React.useState({
    label: "",
    hasGeo: false,
  });

  const zoomRef = React.useRef(zoom);
  zoomRef.current = zoom;
  const bgModeRef = React.useRef(bgMode);
  bgModeRef.current = bgMode;

  /** Manual wheel / buttons — full zoom range; never char-fit clamped. */
  const persistZoom = (next: number) => {
    const z = clampMinimapZoom(next);
    zoomRef.current = z;
    setZoom(z);
    patchSettings({ minimapZoom: z });
  };

  const cycleBgMode = () => {
    const next = cycleMinimapBgMode(bgModeRef.current);
    bgModeRef.current = next;
    setBgMode(next);
    patchSettings({ minimapBg: next });
    paint();
  };

  /**
   * Hard snap: clear pan, center on observer, zoom from entity bbox
   * (players + monsters — not G.geometry).
   * Only: first mount focus, map/`in` change, ◎.
   */
  const snapCameraToFocus = (
    focus: FocusXY,
    points: FocusXY[],
    canvasW: number,
    canvasH: number,
  ) => {
    panRef.current = { x: 0, y: 0 };
    camFocusRef.current = { x: Math.round(focus.x), y: Math.round(focus.y) };
    const camFocus = camFocusRef.current;
    const { halfSpan } = cameraExtentFromWorldCoords(
      camFocus,
      points.length > 0 ? points : [camFocus],
      canvasW,
      canvasH,
      { x: 0, y: 0 },
    );
    zoomRef.current = halfSpan;
    setZoom(halfSpan);
    patchSettings({ minimapZoom: halfSpan });
  };

  const paint = React.useCallback(() => {
    const canvas = canvasRef.current as HTMLCanvasElement | null;
    if (!canvas) return;

    const scene = readMinimapScene();
    let focus = scene.resolved.focus;
    let points = scene.resolved.points;
    if (focus) {
      lastFocusRef.current = focus;
      lastPointsRef.current = points;
    } else if (lastFocusRef.current) {
      focus = lastFocusRef.current;
      points =
        lastPointsRef.current.length > 0
          ? lastPointsRef.current
          : [lastFocusRef.current];
    }

    const { w, h } = sizeRef.current;
    const track = trackRef.current;
    const mapStr = scene.mapKey || "";
    if (focus) {
      // Ignore blank flicker: only treat real map/`in` values as changes.
      const needInitial = !track.primed;
      const mapChanged =
        track.primed && mapStr !== "" && mapStr !== track.mapKey;
      const inChanged =
        track.primed && scene.inKey !== "" && scene.inKey !== track.inKey;
      if (needInitial || mapChanged || inChanged) {
        snapCameraToFocus(focus, points, w, h);
      }
      track.primed = true;
      if (mapStr !== "") track.mapKey = mapStr;
      if (scene.inKey !== "") track.inKey = scene.inKey;
    }

    const pan = panRef.current;
    let extent: MapExtent;
    const camFocus = camFocusRef.current || focus;
    if (camFocus) {
      // Sticky zoom + fixed snap center + drag pan — never re-center on walk.
      const cam = cameraExtentFromWorldCoords(
        camFocus,
        points.length > 0 ? points : [camFocus],
        w,
        h,
        pan,
        zoomRef.current,
      );
      extent = cam.extent;
    } else {
      extent =
        extentRef.current ||
        cameraExtentFromWorldCoords(
          { x: 0, y: 0 },
          [{ x: 0, y: 0 }],
          w,
          h,
          pan,
          zoomRef.current,
        ).extent;
    }
    extentRef.current = extent;

    let targetId: string | undefined;
    if (scene.observing?.target != null && scene.observing.target !== "") {
      targetId = String(scene.observing.target);
    } else {
      const xt = window.xtarget;
      if (xt && xt.id != null) targetId = String(xt.id);
    }

    const partyKey =
      (scene.observing && scene.observing.party) ||
      (scene.resolved.primary && scene.resolved.primary.party) ||
      (scene.character && scene.character.party) ||
      "";

    paintMinimap(canvas, {
      width: w,
      height: h,
      extent,
      xLines: scene.geo.xLines,
      yLines: scene.geo.yLines,
      entities: scene.entities as any[],
      observingId: scene.observingId || undefined,
      targetId,
      selectedId: props.selectedEntity,
      partyKey,
      focusX: focus?.x,
      focusY: focus?.y,
      bgMode: bgModeRef.current,
    });

    const nextMeta = {
      label: mapDisplayName(scene.geo.mapKey || scene.mapKey),
      hasGeo: scene.geo.hasGeo,
    };
    setMeta((prev: typeof nextMeta) => {
      if (prev.label === nextMeta.label && prev.hasGeo === nextMeta.hasGeo) {
        return prev;
      }
      return nextMeta;
    });
  }, [props.selectedEntity, bgMode]);

  React.useEffect(() => {
    trackRef.current.primed = false;
    const stop = subscribeTick(() => paint());
    paint();
    return () => stop();
  }, [paint]);

  React.useEffect(() => {
    const el = wrapRef.current as HTMLDivElement | null;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const box = entry.contentRect;
      const w = Math.max(120, Math.floor(box.width));
      const h = Math.max(120, Math.floor(box.height));
      if (w === sizeRef.current.w && h === sizeRef.current.h) return;
      sizeRef.current = { w, h };
      paint();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [paint]);

  const onWheel = (ev: any) => {
    ev.preventDefault();
    ev.stopPropagation();
    const dir = ev.deltaY > 0 ? 1 : -1;
    const factor = dir > 0 ? 1.12 : 1 / 1.12;
    persistZoom(zoomRef.current * factor);
    paint();
  };

  const onPointerDown = (ev: any) => {
    if (ev.button !== 0) return;
    const canvas = canvasRef.current as HTMLCanvasElement | null;
    const extent = extentRef.current;
    if (!canvas || !extent) return;
    canvas.setPointerCapture?.(ev.pointerId);
    const rect = canvas.getBoundingClientRect();
    const { scale } = makeProjector(
      extent,
      sizeRef.current.w,
      sizeRef.current.h,
    );
    dragRef.current = {
      sx: ev.clientX - rect.left,
      sy: ev.clientY - rect.top,
      panX: panRef.current.x,
      panY: panRef.current.y,
      scale,
      moved: false,
    };
  };

  const onPointerMove = (ev: any) => {
    const drag = dragRef.current;
    if (!drag) return;
    const canvas = canvasRef.current as HTMLCanvasElement | null;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = ev.clientX - rect.left;
    const sy = ev.clientY - rect.top;
    const dxPx = sx - drag.sx;
    const dyPx = sy - drag.sy;
    if (Math.abs(dxPx) + Math.abs(dyPx) > 3) drag.moved = true;
    const scale = Math.max(0.0001, drag.scale);
    // World pan: drag right → content moves right → camera left (−dx/scale).
    panRef.current = {
      x: drag.panX - dxPx / scale,
      y: drag.panY - dyPx / scale,
    };
    paint();
  };

  const onPointerUp = (ev: any) => {
    const drag = dragRef.current;
    dragRef.current = null;
    const canvas = canvasRef.current as HTMLCanvasElement | null;
    if (canvas) canvas.releasePointerCapture?.(ev.pointerId);
    if (!drag || drag.moved) return;

    const extent = extentRef.current;
    if (!extent) return;
    const hit = hitTestMinimap({
      extent,
      width: sizeRef.current.w,
      height: sizeRef.current.h,
      entities: getEntitiesList(),
      observingId: getObservingId(),
      sx: drag.sx,
      sy: drag.sy,
    });
    if (!hit) return;
    setXTarget(hit.entity);
    if (props.setSelectedEntity) props.setSelectedEntity(hit.id);
  };

  const recenter = () => {
    const scene = readMinimapScene();
    const focus = scene.resolved.focus || lastFocusRef.current;
    const points =
      scene.resolved.points.length > 0
        ? scene.resolved.points
        : lastPointsRef.current.length > 0
          ? lastPointsRef.current
          : focus
            ? [focus]
            : [];
    if (focus) {
      snapCameraToFocus(focus, points, sizeRef.current.w, sizeRef.current.h);
    } else {
      panRef.current = { x: 0, y: 0 };
    }
    paint();
  };

  return e(
    "div",
    {
      className: "comm-minimap" + (props.layoutEdit ? " is-layout-edit" : ""),
      "data-bg": bgMode,
      style: { ...PIXEL_TEXT },
    },
    e(
      "div",
      { className: "comm-minimap-titlebar" },
      e(
        "span",
        {
          className: "comm-minimap-title",
          title: meta.hasGeo
            ? `${meta.label} — walls from G.geometry (no floor tiles on /comm)`
            : `${meta.label} — no G.geometry; camera uses entity positions`,
        },
        meta.label || "Minimap",
      ),
      e(
        "div",
        { className: "comm-minimap-tools comm-minimap-hover" },
        e(
          "button",
          {
            type: "button",
            onClick: cycleBgMode,
            title: minimapBgModeTitle(bgMode),
            "aria-pressed": bgMode !== "opaque" ? "true" : "false",
            style: PIXEL_TEXT,
          },
          minimapBgModeLabel(bgMode),
        ),
        e(
          "button",
          {
            type: "button",
            onClick: () => {
              persistZoom(zoomRef.current / 1.2);
              paint();
            },
            title: "Zoom in (wheel also works)",
            style: PIXEL_TEXT,
          },
          "+",
        ),
        e(
          "button",
          {
            type: "button",
            onClick: () => {
              persistZoom(zoomRef.current * 1.2);
              paint();
            },
            title: "Zoom out",
            style: PIXEL_TEXT,
          },
          "−",
        ),
        e(
          "button",
          {
            type: "button",
            onClick: recenter,
            title: "Recenter on observer + zoom to fit all visible entities",
            style: PIXEL_TEXT,
          },
          "◎",
        ),
      ),
    ),
    e(
      "div",
      {
        ref: wrapRef,
        className: "comm-minimap-stage",
        onWheel,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel: onPointerUp,
      },
      e("canvas", { ref: canvasRef }),
      e(
        "div",
        {
          className: "comm-minimap-legend comm-minimap-hover",
          "aria-hidden": true,
        },
        ...LEGEND.map((it) =>
          e(
            "span",
            { key: it.label, className: "comm-minimap-leg", title: it.title },
            e("span", {
              className: "comm-minimap-swatch",
              style: { background: it.color },
            }),
            it.label,
          ),
        ),
      ),
    ),
  );
}
