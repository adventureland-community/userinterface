import { getCurrentIn, getCurrentMap, getG, getMapName } from "../../host/al";
import { e, getReact } from "../../host/react";
import type { EntityLike } from "../../host/globals";
import {
  setWorldFov,
  subscribeWorldFov,
  zoomFovIn,
  zoomFovOut,
} from "../../host/worldFov";
import {
  WORLD_FOV_DEFAULT,
  WORLD_FOV_MAX,
  WORLD_FOV_MIN,
  formatWorldFov,
  readAppliedWorldFov,
} from "../../lib/worldFov";
import { PIXEL_TEXT, TYPE } from "../../lib/typeScale";
import {
  detectViewportProfile,
  isTouchishProfile,
} from "../../lib/viewport";

export function getMapData(entities: EntityLike[]): {
  map?: string;
  in?: string;
} {
  const mapData: { map?: string; in?: string } = {
    map: getMapName() || getCurrentMap(),
  };
  const cameraIn = getCurrentIn();
  if (cameraIn) {
    mapData.in = cameraIn;
  } else if (entities.length > 0) {
    mapData.in = entities[0].in;
  }
  return mapData;
}

function mapDisplayName(mapKey: string | undefined): string {
  if (!mapKey) return "loading";
  const named = getG()?.maps?.[mapKey]?.name;
  if (typeof named === "string" && named) return named;
  return mapKey;
}

function copyOnClick(text: string, popupId: string) {
  return function () {
    const showPopup = function (id: string, message: string) {
      const popup = document.getElementById(id);
      if (!popup) return;
      popup.innerHTML = message;
      popup.classList.toggle("show");
      setTimeout(function () {
        popup.classList.toggle("show");
      }, 1000);
    };

    navigator.clipboard.writeText(text).then(
      function () {
        showPopup(popupId, "Copied instance ID!");
      },
      function (err) {
        console.error("Could not copy instance ID:", err);
        showPopup(popupId, "Copy failure, look into console.");
      },
    );
  };
}

const copyInstanceIdPopupId = "copyInstanceIdPopup";

export type MapInfoProps = {
  entities: EntityLike[];
};

const zoomLinkStyle: Record<string, any> = {
  background: "transparent",
  border: "none",
  color: "rgba(200, 220, 230, 0.75)",
  padding: "0 2px",
  cursor: "pointer",
  font: "inherit",
  fontSize: TYPE.chromeMeta,
  pointerEvents: "auto",
  textDecoration: "underline",
  textDecorationColor: "rgba(255,255,255,0.2)",
  ...PIXEL_TEXT,
};

export function MapInfo(props: MapInfoProps): any {
  const React = getReact();
  const mapNameData = getMapData(props.entities);
  const [fov, setFov] = React.useState(() => readAppliedWorldFov());
  const touchish = isTouchishProfile(detectViewportProfile());
  const zoomBtnStyle: Record<string, any> = touchish
    ? {
        ...zoomLinkStyle,
        minWidth: "44px",
        minHeight: "44px",
        padding: "8px 10px",
        fontSize: TYPE.body,
        textDecoration: "none",
      }
    : zoomLinkStyle;

  React.useEffect(() => {
    setFov(readAppliedWorldFov());
    return subscribeWorldFov((next: number) => setFov(next));
  }, []);

  let instanceIdElement: any = undefined;
  if (mapNameData && mapNameData.map && mapNameData.map !== mapNameData.in) {
    if (mapNameData.in) {
      const firstAndLastSymbolsCount = 5;
      let instanceIdToShow: string;
      if (firstAndLastSymbolsCount < mapNameData.in.length / 2) {
        instanceIdToShow =
          `${mapNameData.in.slice(0, firstAndLastSymbolsCount)}` +
          "*".repeat(mapNameData.in.length - 2 * firstAndLastSymbolsCount) +
          `${mapNameData.in.slice(mapNameData.in.length - firstAndLastSymbolsCount)}`;
      } else {
        instanceIdToShow = mapNameData.in;
      }

      instanceIdElement = e(
        "div",
        {},
        e(
          "div",
          { onClick: copyOnClick(mapNameData.in, copyInstanceIdPopupId) },
          `in : ${instanceIdToShow}`,
        ),
        e(
          "div",
          { className: "popup" },
          e("span", { id: copyInstanceIdPopupId, className: "popuptext" }),
        ),
      );
    } else {
      instanceIdElement = "in: unknown";
    }
  }

  return e(
    "div",
    {
      key: "mapName",
      className: "ecu-map-info",
      style: {
        background: "rgba(0, 0, 0, 0.82)",
        border: "1px solid #555",
        padding: "4px 8px",
        fontSize: TYPE.chrome,
        lineHeight: 1.25,
        color: "#eee",
        pointerEvents: "auto",
        ...PIXEL_TEXT,
      },
    },
    e(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
        },
      },
      e(
        "span",
        null,
        `Map: ${mapDisplayName(mapNameData && mapNameData.map)}`,
      ),
      e(
        "span",
        {
          style: {
            display: "inline-flex",
            alignItems: "baseline",
            gap: "5px",
            color: "rgba(255,255,255,0.55)",
            fontSize: TYPE.chromeMeta,
          },
          title: touchish
            ? "Camera FOV — tap out/in or pinch the map. Does not change sprite scale. Outside the vision window the server does not send entities."
            : "Camera FOV (wheel on the map). Does not change sprite scale. Outside the vision window the server does not send entities.",
        },
        e(
          "button",
          {
            type: "button",
            style: {
              ...zoomBtnStyle,
              opacity: fov >= WORLD_FOV_MAX ? 0.35 : 1,
              cursor: fov >= WORLD_FOV_MAX ? "default" : "pointer",
            },
            disabled: fov >= WORLD_FOV_MAX,
            title: "Widen FOV (see more)",
            onClick: () => setFov(zoomFovOut()),
          },
          "out",
        ),
        e(
          "button",
          {
            type: "button",
            style: {
              ...zoomBtnStyle,
              color: "#cfe8f2",
              fontVariantNumeric: "tabular-nums",
              textDecoration: "none",
              opacity: fov === WORLD_FOV_DEFAULT ? 0.55 : 1,
              cursor: fov === WORLD_FOV_DEFAULT ? "default" : "pointer",
            },
            disabled: fov === WORLD_FOV_DEFAULT,
            title: "Reset FOV to 1×",
            onClick: () => setFov(setWorldFov(WORLD_FOV_DEFAULT)),
          },
          formatWorldFov(fov) + "×",
        ),
        e(
          "button",
          {
            type: "button",
            style: {
              ...zoomBtnStyle,
              opacity: fov <= WORLD_FOV_MIN ? 0.35 : 1,
              cursor: fov <= WORLD_FOV_MIN ? "default" : "pointer",
            },
            disabled: fov <= WORLD_FOV_MIN,
            title: "Tighten FOV (see less)",
            onClick: () => setFov(zoomFovIn()),
          },
          "in",
        ),
      ),
    ),
    instanceIdElement,
  );
}
