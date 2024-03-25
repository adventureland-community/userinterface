// npx tsc ./src/ui/inventory-enhancements.ts --target esnext --module amd --outFile "./src/ui/inventory-enhancements.js"
// parent.enhanced_bank_ui.show()

// TODO: a bagnon / all in one inventory for the bank
// TODO: also extend the player inventory

import {
  AchievementKey,
  BankPackType,
  ItemInfo,
  ItemKey,
  ItemType,
  TitleKey,
} from "adventureland";
import { abbreviateNumber } from "./utils";

// TODO: render ALL items from the bank when in the bank
// TODO: a toggle button to combine item slots or not.
// TODO: a toggle button to combine empty item slots or not.

// TODO: should be searchable (alpha blend non valid results to seetrough.)
// TODO: an extra field showing all the tellers with the ability of pressing "goto" the tellers position.
// TODO: somehow validate if you have unlocked the additional bank levels.
// TODO: a toggle to group items by their group.
// TODO: cache the bank items so you can view them when away.

// TODO: a button to sort
// TODO: configurable sorting rules.
// TODO: designate certain items to certain tellers.

//TODO: click to transfer items to character
//TODO: a search field reducing the view
//TODO: showing amount of empty slots left
//TODO: a button to open the overview visible when inside the bank
//TODO: perhaps an ability to group it by npc teller instead of item types

// TODO: render shiny / glitched differently
// https://blog.bitsrc.io/pure-css-to-make-a-button-shine-and-gently-change-colors-over-time-5b685d9c6a7e
// https://codepen.io/kieranfivestars/pen/MwmWQb

// TODO: differnt modes
//  all in one inventory, show each bank slot with the ability to drag and drop around
// group items by type, collapse same kind
// group items by bank pack, collapse same kind

// type InventoryLookup = {
//     [T in ItemName]?: {
//       amount: number;
//       levels: { [T: number]: { amount: number; indexes: number[] } };
//     };
//   };

const tshirtNames: { [key in ItemKey]?: string } = {
  tshirt88: "Lucky", // Luck and all
  tshirt9: "Manasteal", // Manasteal
  tshirt3: "XP", // XP
  tshirt8: "Attack MP", // Attack MP cost
  tshirt7: "Armor piercing", // Armor piercing
  tshirt6: "Res. piercing", // Res. piercing
  tshirt4: "Speed", // Speed
};

const types: { [key in ItemType | "exchange" | "other"]?: string } = {
  helmet: "Helmets",
  chest: "Armors",
  pants: "Pants",
  gloves: "Gloves",
  shoes: "Shoes",
  cape: "Capes",
  ring: "Rings",
  earring: "Earrings",
  amulet: "Amulets",
  belt: "Belts",
  orb: "Orbs",
  weapon: "Weapons",
  shield: "Shields",
  source: "Offhands",
  quiver: "Offhands",
  misc_offhand: "Offhands",
  elixir: "Elixirs",
  pot: "Potions",
  cscroll: "Scrolls",
  uscroll: "Scrolls",
  pscroll: "Scrolls",
  offering: "Scrolls",
  material: "Crafting and Collecting",
  exchange: "Exchangeables",
  dungeon_key: "Keys",
  token: "Tokens",
  other: "Others",
};

type GroupedItems = {
  [groupName: string]: {
    amount: number;
    items: {
      [itemKey in ItemKey]?: {
        [title in TitleKey]?: {
          amount: number;
          // TODO: how do we group items by .p seperating out shiny for example `items` as a subgroup, this could work for weapons as well?
          levels: {
            [level: number]: {
              amount: number;
              indexes: [[BankPackType, number]];
            };
          };
        };
      };
    };
  };
};
class EnhancedBankUI {
  groups: GroupedItems;
  search?: string;
  /**
   *
   */
  constructor() {
    // super();
    // TODO: load setting from local storage
    // TODO: cache bank inventory at an interval, based on settings
    // TODO: start inside / outside bank check to enable / disable button
    // TODO: cache bank when we enter it.
    this.groups = {};

    setInterval(() => {
      const $ = (<any>parent).$;
      const trc = $("#toprightcorner");

      const id = "bankbutton";
      const button = trc.find("#" + id);
      if (character.bank) {
        // inside bank
        if (!button || button.length === 0) {
          trc.prepend(
            `<div id='${id}' class='gamebutton' onclick='parent.enhanced_bank_ui.show()' title='open enhanced bank overview'>BANK</div>`
          );
        }
      } else {
        // outside bank
        if (button && button.length > 0) {
          button.remove();
        }
      }
    }, 1000);
  }

  public show() {
    const isInBank = !!character.bank;

    const { totalBankSlots, totalUsedBankSlots, totalUnusedBankSlots, groups } =
      this.groupBankByItem();

    this.groups = groups;

    const container = $("<div>", {
      style:
        "border: 5px solid gray; background-color: black; padding: 10px; width: 98%",
    });

    const title = $(
      "<div style='color: #f1c054; border-bottom: 2px dashed #C7CACA; margin-bottom: 3px; margin-left: 3px; margin-right: 3px' class='cbold'>"
    );
    container.append(title);
    title.append("Bank");

    // TODO: the search button should trigger a cleaing of bankItemsContainer and re-render the new data
    const searchButton = $(
      `<input placeholder='press enter to search' onchange='enhanced_bank_ui.renderBankItems(this.value)' value='${""}' />`
    );
    title.append(searchButton);

    title.append(
      `<span>${totalUnusedBankSlots} / ${totalBankSlots} free slots</span>`
    );

    const bankItemsContainer = $("<div>", { id: "bank-items-container" });
    container.append(bankItemsContainer);

    // trigger render after elements exist in the dom
    this.renderBankItems(undefined, bankItemsContainer);

    // TODO: should not be rendered as a modal, we want to be able to utilize our player inventory as well :thinking:
    parent.show_modal(container.wrap("<div/>").parent().html(), {
      wrap: !1,
      hideinbackground: !0,
      url: "/docs/guide/all/items",
    });
  }

  filter(search?: string) {
    const result: GroupedItems = {};

    for (const groupName in this.groups) {
      const group = this.groups[groupName];

      let itemKey: ItemKey;
      for (itemKey in group.items) {
        const gItem = G.items[itemKey];
        const item = group.items[itemKey];
        let shouldAdd = false;
        if (search) {
          const itemKeyMatches = itemKey.indexOf(search) > -1;
          const itemNameMatches = gItem && gItem.name.indexOf(search) > -1;
          if (itemKeyMatches || itemNameMatches) {
            shouldAdd = true;
          }
        } else {
          shouldAdd = true;
        }

        if (shouldAdd) {
          if (!result[groupName]) {
            result[groupName] = { amount: 0, items: {} };
          }

          result[groupName].items[itemKey] = item;
        }
      }
    }

    return result;
  }

  groupBankByItem() {
    let totalBankSlots = 0;
    let totalUsedBankSlots = 0;
    let totalUnusedBankSlots = 0;

    // TODO: type this
    const groups: GroupedItems = {};
    let packName: BankPackType;
    for (packName in character.bank) {
      const packItems = character.bank[packName];
      totalBankSlots += packItems.length ?? 0;

      for (let index = 0; index < packItems.length; index++) {
        const itemInfo = packItems[index];

        if (!itemInfo) {
          totalUnusedBankSlots++;
          continue;
        }

        const gItem = G.items[itemInfo.name];

        const level = itemInfo.level ?? 0;

        // TODO: translate type to readable / common name / others
        // TODO: group weapons by subtype?

        let type = types[gItem.type] ?? "Others";

        if (gItem.e) {
          type = types["exchange"] ?? "Others";
        }

        let itemByType = groups[type];
        if (!itemByType) {
          itemByType = { amount: 0, items: {} };
          groups[type] = itemByType;
        }

        let itemData = itemByType.items[itemInfo.name];
        if (!itemData) {
          itemData = {};
          itemByType.items[itemInfo.name] = itemData;
        }

        let itemTitleData = itemData[(itemInfo.p as TitleKey) ?? ""];
        if (!itemTitleData) {
          itemTitleData = { amount: 0, levels: {} };
          itemData[(itemInfo.p as TitleKey) ?? ""] = itemTitleData;
        } else {
          itemTitleData.amount += itemInfo.q || 1;
        }

        let levels = itemTitleData.levels[level];
        if (!levels) {
          levels = { amount: itemInfo.q || 1, indexes: [[packName, index]] };
          itemTitleData.levels[level] = levels;
        } else {
          itemTitleData.amount += itemInfo.q || 1;
          levels.amount += itemInfo.q || 1;
          levels.indexes.push([packName, index]);
        }

        totalUsedBankSlots++;
      }
    }
    return { totalBankSlots, totalUsedBankSlots, totalUnusedBankSlots, groups };
  }

  public async onMouseDownBankItem(
    e: JQuery.Event<HTMLElement, null>,
    itemKey: ItemKey,
    level: number,
    title: TitleKey
  ) {
    e.preventDefault();

    switch (e.which) {
      // TODO: middle click to show quantity selector ?
      case 3: // right click
        for (const key in this.groups) {
          const group = this.groups[key];
          const item = group.items[itemKey];

          if (!item) continue;
          const itemByTitle = item[title];

          if (!itemByTitle) continue;
          const itemByLevel = itemByTitle.levels[level];

          if (itemByLevel && itemByLevel.indexes.length > 0) {
            const [pack, index] = itemByLevel.indexes.splice(0, 1)[0];
            // TODO: look up item and determine if it has a quantity to substract instead of 1
            itemByTitle.amount -= 1;
            itemByLevel.amount -= 1;
            if (itemByLevel.indexes.length <= 0) {
              delete itemByTitle.levels[level];
            }

            if (bank_retrieve) {
              const [packMap] = bank_packs[pack];
              if (character.map !== packMap) {
                game_log(`Moving to ${packMap} from ${character.map} `);
                await smart_move(packMap);
              }

              await bank_retrieve(pack, index);
            } else {
              // bank_retrieve is not defined, seems like we don't have access to the code functions when we paste the code into dev console
              (<any>parent).socket.emit("bank", {
                operation: "swap",
                pack: pack,
                str: index,
                inv: -1, // the server interprets -1 as first slot available
              });
            }
            break;
          }
        }

        // TODO: groupBankByItem should be called / updated
        // TODO: title should be updated with free slot count
        // setTimeout(() => {
        // console.log("groupBankByItem timeout with render started");
        // // delay to let the emit finish
        // const {
        //   totalBankSlots,
        //   totalUsedBankSlots,
        //   totalUnusedBankSlots,
        //   groups,
        // } = this.groupBankByItem();

        // this.groups = groups;
        this.renderBankItems(this.search);
        // console.log(
        //   "groupBankByItem timeout with render finished",
        //   this.groups
        // );
        // }, 250);

        break;

      default:
        (<any>parent).render_item_info(itemKey);
        break;
    }
  }

  public renderBankItems(
    search = "",
    bankItemsContainer?: JQuery<HTMLElement>
  ) {
    this.search = search;

    bankItemsContainer =
      bankItemsContainer ?? (<any>parent).$("#bank-items-container");

    if (bankItemsContainer && bankItemsContainer.length === 0) {
      console.warn(
        "#bank-items-container could not be found, can't rerender data"
      );
    }

    if (bankItemsContainer && bankItemsContainer.length === 1) {
      // clear contents
      bankItemsContainer.html("");

      const groups = this.filter(search);

      const sortedGroupKeys = [...new Set(Object.values(types))]; //.sort((a, b) => a.localeCompare(b));

      for (const itemType of sortedGroupKeys) {
        const itemsByType = groups[itemType];
        if (!itemsByType) {
          continue;
        }

        const itemTypeContainer = $(
          "<div style='float:left; margin-left:5px;'>"
        );

        itemTypeContainer.append(
          `<div class='gamebutton gamebutton-small' style='margin-bottom: 5px'>${itemType}</div>`
        );

        bankItemsContainer.append(itemTypeContainer);

        const itemsContainer = $("<div style='margin-bottom: 10px'>");
        itemTypeContainer.append(itemsContainer);

        // loop items
        let itemKey: ItemKey;
        for (itemKey in itemsByType.items) {
          const gItem = G.items[itemKey as ItemKey];
          const itemsByTitle = itemsByType.items[itemKey] ?? {};

          // TODO: iterate backwards?
          let titleKey: TitleKey;
          for (titleKey in itemsByTitle) {
            const { amount, levels } = itemsByTitle[titleKey] ?? {};
            for (const level in levels) {
              const data = levels[Number(level)];

              const fakeItemInfo: ItemInfo = { name: itemKey as ItemKey };

              if (Number(level) > 0) {
                fakeItemInfo.level = Number(level);
              }

              if (data.amount) {
                fakeItemInfo.q = data.amount;
              }

              // TODO: add item_container to types
              const itemContainer = $(
                (<any>parent).item_container(
                  {
                    skin: gItem.skin,
                    // onclick: "render_item_info('" + itemKey + "')",
                  },
                  fakeItemInfo
                )
              );

              const stackSize = Number(gItem.s);
              const stackCount = data.indexes.length;
              const optimalStackCount = Math.ceil(data.amount / stackSize);
              const optimalStackCountMessage =
                stackCount > optimalStackCount ? `⚠️${optimalStackCount}` : "";

              const titleName =
                titleKey && G.titles[titleKey]
                  ? `${G.titles[titleKey].title} `
                  : "";

              const itemName =
                itemKey in tshirtNames ? tshirtNames[itemKey] : gItem.name;

              itemContainer.attr(
                "title",
                `${titleName}${itemName}${
                  Number(level) > 0 ? `+${level}` : ""
                }\n${itemKey}\n${stackCount} stacks ${optimalStackCountMessage}`
              );

              // style depending on titleKey

              let titleBorderColor;
              switch (titleKey) {
                case "festive":
                  titleBorderColor = "#79ff7e";
                  break;
                case "firehazard":
                  titleBorderColor = "#f79b11";
                  break;
                case "glitched":
                  titleBorderColor = "grey";
                  break;
                case "gooped":
                  titleBorderColor = "#64B867";
                  break;
                case "legacy":
                  titleBorderColor = "white";
                  break;
                case "lucky":
                  titleBorderColor = "#00f3ff";
                  break;
                case "shiny":
                  titleBorderColor = "#99b2d8";
                  break;
                case "superfast":
                  titleBorderColor = "#c681dc";
                  break;
              }

              if (titleBorderColor) {
                itemContainer.css({
                  borderColor: titleBorderColor,
                });

                const itemSubContainer = itemContainer.find("div:first-child");

                itemSubContainer.css({
                  border: "None",
                  left: "",
                  bottom: "",
                });
              }

              // handle left and right click
              itemContainer.attr(
                "onmousedown",
                `enhanced_bank_ui.onMouseDownBankItem(event, '${itemKey}', ${level}, '${titleKey}')`
              );

              // level container
              const levelElement = itemContainer.find(".iuui");
              levelElement.css({
                fontSize: "16px",
              });

              // find quantity in item container and make it pretty
              const countElement = itemContainer.find(".iqui");
              countElement.css({
                fontSize: "16px",
              });
              const count = Number(countElement.text());
              const prettyCount = abbreviateNumber(count);
              if (prettyCount) {
                countElement.html(prettyCount.toString());
              }

              itemsContainer.append(itemContainer);
            }
          }
        }
      }

      bankItemsContainer.append("<div style='clear:both;'>");
    }
  }
}
// TODO: handle reloading code, we might need to destroy the previous UI
(<any>parent).enhanced_bank_ui = new EnhancedBankUI();
