import { getMapName } from "../../host/al";
import { e } from "../../host/react";
import type { EntityLike } from "../../host/globals";

function getMapData(entities: EntityLike[]): { map?: string; in?: string } {
  const mapData: { map?: string; in?: string } = { map: getMapName() };
  if (entities.length > 0) {
    mapData.in = entities[0].in;
  }
  return mapData;
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

export function MapInfo(props: MapInfoProps): any {
  const mapNameData = getMapData(props.entities);

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
      style: {
        background: "black",
        border: "2px double gray",
        padding: "4px",
      },
    },
    e(
      "div",
      {
        style: {
          display: "flex",
          gap: "4px",
        },
      },
      `Map: ${mapNameData && mapNameData.map ? mapNameData.map : "loading"}`,
    ),
    instanceIdElement,
  );
}

export { getMapData };
