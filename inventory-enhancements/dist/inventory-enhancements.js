/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/bank.ts":
/*!*********************!*\
  !*** ./src/bank.ts ***!
  \*********************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


// npx tsc ./src/ui/inventory-enhancements.ts --target esnext --module amd --outFile "./src/ui/inventory-enhancements.js"
// parent.enhanced_bank_ui.show()
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const utils_1 = __webpack_require__(/*! ./utils */ "./src/utils.ts");
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
const types = {
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
class EnhancedBankUI {
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
            const $ = parent.$;
            const trc = $("#toprightcorner");
            const id = "bankbutton";
            const button = trc.find("#" + id);
            if (character.bank) {
                // inside bank
                if (!button || button.length === 0) {
                    trc.prepend(`<div id='${id}' class='gamebutton' onclick='parent.enhanced_bank_ui.show()' title='open enhanced bank overview'>BANK</div>`);
                }
            }
            else {
                // outside bank
                if (button && button.length > 0) {
                    button.remove();
                }
            }
        }, 1000);
    }
    show() {
        const isInBank = !!character.bank;
        const { totalBankSlots, totalUsedBankSlots, totalUnusedBankSlots, groups } = this.groupBankByItem();
        this.groups = groups;
        const container = $("<div>", {
            style: "border: 5px solid gray; background-color: black; padding: 10px; width: 98%",
        });
        const title = $("<div style='color: #f1c054; border-bottom: 2px dashed #C7CACA; margin-bottom: 3px; margin-left: 3px; margin-right: 3px' class='cbold'>");
        container.append(title);
        title.append("Bank");
        // TODO: the search button should trigger a cleaing of bankItemsContainer and re-render the new data
        const searchButton = $(`<input placeholder='press enter to search' onchange='enhanced_bank_ui.renderBankItems(this.value)' value='${""}' />`);
        title.append(searchButton);
        title.append(`<span>${totalUnusedBankSlots} / ${totalBankSlots} free slots</span>`);
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
    filter(search) {
        const result = {};
        for (const groupName in this.groups) {
            const group = this.groups[groupName];
            let itemKey;
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
                }
                else {
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
        var _a, _b, _c, _d, _e, _f;
        let totalBankSlots = 0;
        let totalUsedBankSlots = 0;
        let totalUnusedBankSlots = 0;
        // TODO: type this
        const groups = {};
        let packName;
        for (packName in character.bank) {
            const packItems = character.bank[packName];
            totalBankSlots += (_a = packItems.length) !== null && _a !== void 0 ? _a : 0;
            for (let index = 0; index < packItems.length; index++) {
                const itemInfo = packItems[index];
                if (!itemInfo) {
                    totalUnusedBankSlots++;
                    continue;
                }
                const gItem = G.items[itemInfo.name];
                const level = (_b = itemInfo.level) !== null && _b !== void 0 ? _b : 0;
                // TODO: translate type to readable / common name / others
                // TODO: group weapons by subtype?
                let type = (_c = types[gItem.type]) !== null && _c !== void 0 ? _c : "Others";
                if (gItem.e) {
                    type = (_d = types["exchange"]) !== null && _d !== void 0 ? _d : "Others";
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
                let itemTitleData = itemData[(_e = itemInfo.p) !== null && _e !== void 0 ? _e : ""];
                if (!itemTitleData) {
                    itemTitleData = { amount: 0, levels: {} };
                    itemData[(_f = itemInfo.p) !== null && _f !== void 0 ? _f : ""] = itemTitleData;
                }
                else {
                    itemTitleData.amount += itemInfo.q || 1;
                }
                let levels = itemTitleData.levels[level];
                if (!levels) {
                    levels = { amount: itemInfo.q || 1, indexes: [[packName, index]] };
                    itemTitleData.levels[level] = levels;
                }
                else {
                    itemTitleData.amount += itemInfo.q || 1;
                    levels.amount += itemInfo.q || 1;
                    levels.indexes.push([packName, index]);
                }
                totalUsedBankSlots++;
            }
        }
        return { totalBankSlots, totalUsedBankSlots, totalUnusedBankSlots, groups };
    }
    onMouseDownBankItem(e, itemKey, level, title) {
        return __awaiter(this, void 0, void 0, function* () {
            e.preventDefault();
            switch (e.which) {
                case 3: // right click
                    for (const key in this.groups) {
                        const group = this.groups[key];
                        const item = group.items[itemKey];
                        if (!item)
                            continue;
                        const itemByTitle = item[title];
                        if (!itemByTitle)
                            continue;
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
                                    yield smart_move(packMap);
                                }
                                yield bank_retrieve(pack, index);
                            }
                            else {
                                // bank_retrieve is not defined, seems like we don't have access to the code functions when we paste the code into dev console
                                parent.socket.emit("bank", {
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
                    parent.render_item_info(itemKey);
                    break;
            }
        });
    }
    renderBankItems(search = "", bankItemsContainer) {
        var _a, _b;
        this.search = search;
        bankItemsContainer =
            bankItemsContainer !== null && bankItemsContainer !== void 0 ? bankItemsContainer : parent.$("#bank-items-container");
        if (bankItemsContainer && bankItemsContainer.length === 0) {
            console.warn("#bank-items-container could not be found, can't rerender data");
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
                const itemTypeContainer = $("<div style='float:left; margin-left:5px;'>");
                itemTypeContainer.append(`<div class='gamebutton gamebutton-small' style='margin-bottom: 5px'>${itemType}</div>`);
                bankItemsContainer.append(itemTypeContainer);
                const itemsContainer = $("<div style='margin-bottom: 10px'>");
                itemTypeContainer.append(itemsContainer);
                // loop items
                let itemKey;
                for (itemKey in itemsByType.items) {
                    const gItem = G.items[itemKey];
                    const itemsByTitle = (_a = itemsByType.items[itemKey]) !== null && _a !== void 0 ? _a : {};
                    // TODO: iterate backwards?
                    let titleKey;
                    for (titleKey in itemsByTitle) {
                        const { amount, levels } = (_b = itemsByTitle[titleKey]) !== null && _b !== void 0 ? _b : {};
                        for (const level in levels) {
                            const data = levels[Number(level)];
                            const fakeItemInfo = { name: itemKey };
                            if (Number(level) > 0) {
                                fakeItemInfo.level = Number(level);
                            }
                            if (data.amount) {
                                fakeItemInfo.q = data.amount;
                            }
                            // TODO: add item_container to types
                            const itemContainer = $(parent.item_container({
                                skin: gItem.skin,
                                // onclick: "render_item_info('" + itemKey + "')",
                            }, fakeItemInfo));
                            const stackSize = Number(gItem.s);
                            const stackCount = data.indexes.length;
                            const optimalStackCount = Math.ceil(data.amount / stackSize);
                            const optimalStackCountMessage = stackCount > optimalStackCount ? `⚠️${optimalStackCount}` : "";
                            const titleName = titleKey && G.titles[titleKey]
                                ? `${G.titles[titleKey].title} `
                                : "";
                            itemContainer.attr("title", `${titleName}${gItem.name}${Number(level) > 0 ? `+${level}` : ""}\n${stackCount} stacks ${optimalStackCountMessage}`);
                            // style depending on titleKey
                            let titleBorderColor;
                            switch (titleKey) {
                                case "festive":
                                    titleBorderColor = "#79ff7e";
                                    break;
                                case "firehazard":
                                    titleBorderColor = "#f79b11";
                                case "glitched":
                                    titleBorderColor = "grey";
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
                            itemContainer.attr("onmousedown", `enhanced_bank_ui.onMouseDownBankItem(event, '${itemKey}', ${level}, '${titleKey}')`);
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
                            const prettyCount = (0, utils_1.abbreviateNumber)(count);
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
parent.enhanced_bank_ui = new EnhancedBankUI();


/***/ }),

/***/ "./src/utils.ts":
/*!**********************!*\
  !*** ./src/utils.ts ***!
  \**********************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.abbreviateNumber = void 0;
// https://stackoverflow.com/a/40724354/28145
function abbreviateNumber(number) {
    const SI_SYMBOL = ["", "k", "M", "G", "T", "P", "E"];
    if (!number) {
        return number;
    }
    // what tier? (determines SI symbol)
    const tier = (Math.log10(Math.abs(number)) / 3) | 0;
    // if zero, we don't need a suffix
    if (tier === 0)
        return number;
    // get suffix and determine scale
    const suffix = SI_SYMBOL[tier];
    const scale = Math.pow(10, tier * 3);
    // scale the number
    const scaled = number / scale;
    // format number and add suffix
    //   return scaled.toFixed(1) + suffix;
    return (scaled.toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    }) + suffix);
}
exports.abbreviateNumber = abbreviateNumber;


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/bank.ts");
/******/ 	
/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW52ZW50b3J5LWVuaGFuY2VtZW50cy5qcyIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQSw0QkFBNEIsK0RBQStELGlCQUFpQjtBQUM1RztBQUNBLG9DQUFvQyxNQUFNLCtCQUErQixZQUFZO0FBQ3JGLG1DQUFtQyxNQUFNLG1DQUFtQyxZQUFZO0FBQ3hGLGdDQUFnQztBQUNoQztBQUNBLEtBQUs7QUFDTDtBQUNBLDhDQUE2QyxFQUFFLGFBQWEsRUFBQztBQUM3RCxnQkFBZ0IsbUJBQU8sQ0FBQywrQkFBUztBQUNqQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsbUJBQW1CLGVBQWUsZ0JBQWdCO0FBQ2xEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw0Q0FBNEMsR0FBRztBQUMvQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBLGdCQUFnQixtRUFBbUU7QUFDbkY7QUFDQTtBQUNBLDRDQUE0Qyx5QkFBeUIsZUFBZTtBQUNwRixTQUFTO0FBQ1QscURBQXFELG1DQUFtQyxvQkFBb0Isa0JBQWtCO0FBQzlIO0FBQ0E7QUFDQTtBQUNBLDRJQUE0SSxHQUFHO0FBQy9JO0FBQ0EsOEJBQThCLHNCQUFzQixJQUFJLGdCQUFnQjtBQUN4RSxnREFBZ0QsNEJBQTRCO0FBQzVFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw4Q0FBOEM7QUFDOUM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZ0NBQWdDLDBCQUEwQjtBQUMxRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxtQ0FBbUM7QUFDbkM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esc0NBQXNDO0FBQ3RDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsK0JBQStCO0FBQy9CO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwwREFBMEQsU0FBUyxPQUFPLGVBQWU7QUFDekY7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlDQUFpQztBQUNqQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EseUJBQXlCO0FBQ3pCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHdCQUF3QjtBQUN4QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esd0VBQXdFO0FBQ3hFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxRUFBcUUsZ0JBQWdCO0FBQ3JGLGdIQUFnSCxTQUFTO0FBQ3pIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxnQ0FBZ0MsaUJBQWlCO0FBQ2pEO0FBQ0E7QUFDQSxtREFBbUQ7QUFDbkQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw2QkFBNkI7QUFDN0I7QUFDQTtBQUNBO0FBQ0EsbUdBQW1HLGtCQUFrQjtBQUNySDtBQUNBLHFDQUFxQywwQkFBMEI7QUFDL0Q7QUFDQSwyREFBMkQsVUFBVSxFQUFFLFdBQVcsRUFBRSx3QkFBd0IsTUFBTSxPQUFPLElBQUksWUFBWSxTQUFTLHlCQUF5QjtBQUMzSztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUNBQWlDO0FBQ2pDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQ0FBaUM7QUFDakM7QUFDQTtBQUNBLDhHQUE4RyxRQUFRLEtBQUssTUFBTSxLQUFLLFNBQVM7QUFDL0k7QUFDQTtBQUNBO0FBQ0E7QUFDQSw2QkFBNkI7QUFDN0I7QUFDQTtBQUNBO0FBQ0E7QUFDQSw2QkFBNkI7QUFDN0I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw4REFBOEQ7QUFDOUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7QUMvWWE7QUFDYiw4Q0FBNkMsRUFBRSxhQUFhLEVBQUM7QUFDN0Qsd0JBQXdCO0FBQ3hCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBLHdCQUF3Qjs7Ozs7OztVQzFCeEI7VUFDQTs7VUFFQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTs7VUFFQTtVQUNBOztVQUVBO1VBQ0E7VUFDQTs7OztVRXRCQTtVQUNBO1VBQ0E7VUFDQSIsInNvdXJjZXMiOlsid2VicGFjazovL2ludmVudG9yeS1lbmhhbmNlbWVudHMvLi9zcmMvYmFuay50cyIsIndlYnBhY2s6Ly9pbnZlbnRvcnktZW5oYW5jZW1lbnRzLy4vc3JjL3V0aWxzLnRzIiwid2VicGFjazovL2ludmVudG9yeS1lbmhhbmNlbWVudHMvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vaW52ZW50b3J5LWVuaGFuY2VtZW50cy93ZWJwYWNrL2JlZm9yZS1zdGFydHVwIiwid2VicGFjazovL2ludmVudG9yeS1lbmhhbmNlbWVudHMvd2VicGFjay9zdGFydHVwIiwid2VicGFjazovL2ludmVudG9yeS1lbmhhbmNlbWVudHMvd2VicGFjay9hZnRlci1zdGFydHVwIl0sInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xyXG4vLyBucHggdHNjIC4vc3JjL3VpL2ludmVudG9yeS1lbmhhbmNlbWVudHMudHMgLS10YXJnZXQgZXNuZXh0IC0tbW9kdWxlIGFtZCAtLW91dEZpbGUgXCIuL3NyYy91aS9pbnZlbnRvcnktZW5oYW5jZW1lbnRzLmpzXCJcclxuLy8gcGFyZW50LmVuaGFuY2VkX2JhbmtfdWkuc2hvdygpXHJcbnZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xyXG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XHJcbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cclxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XHJcbiAgICB9KTtcclxufTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCB1dGlsc18xID0gcmVxdWlyZShcIi4vdXRpbHNcIik7XHJcbi8vIFRPRE86IHJlbmRlciBBTEwgaXRlbXMgZnJvbSB0aGUgYmFuayB3aGVuIGluIHRoZSBiYW5rXHJcbi8vIFRPRE86IGEgdG9nZ2xlIGJ1dHRvbiB0byBjb21iaW5lIGl0ZW0gc2xvdHMgb3Igbm90LlxyXG4vLyBUT0RPOiBhIHRvZ2dsZSBidXR0b24gdG8gY29tYmluZSBlbXB0eSBpdGVtIHNsb3RzIG9yIG5vdC5cclxuLy8gVE9ETzogc2hvdWxkIGJlIHNlYXJjaGFibGUgKGFscGhhIGJsZW5kIG5vbiB2YWxpZCByZXN1bHRzIHRvIHNlZXRyb3VnaC4pXHJcbi8vIFRPRE86IGFuIGV4dHJhIGZpZWxkIHNob3dpbmcgYWxsIHRoZSB0ZWxsZXJzIHdpdGggdGhlIGFiaWxpdHkgb2YgcHJlc3NpbmcgXCJnb3RvXCIgdGhlIHRlbGxlcnMgcG9zaXRpb24uXHJcbi8vIFRPRE86IHNvbWVob3cgdmFsaWRhdGUgaWYgeW91IGhhdmUgdW5sb2NrZWQgdGhlIGFkZGl0aW9uYWwgYmFuayBsZXZlbHMuXHJcbi8vIFRPRE86IGEgdG9nZ2xlIHRvIGdyb3VwIGl0ZW1zIGJ5IHRoZWlyIGdyb3VwLlxyXG4vLyBUT0RPOiBjYWNoZSB0aGUgYmFuayBpdGVtcyBzbyB5b3UgY2FuIHZpZXcgdGhlbSB3aGVuIGF3YXkuXHJcbi8vIFRPRE86IGEgYnV0dG9uIHRvIHNvcnRcclxuLy8gVE9ETzogY29uZmlndXJhYmxlIHNvcnRpbmcgcnVsZXMuXHJcbi8vIFRPRE86IGRlc2lnbmF0ZSBjZXJ0YWluIGl0ZW1zIHRvIGNlcnRhaW4gdGVsbGVycy5cclxuLy9UT0RPOiBjbGljayB0byB0cmFuc2ZlciBpdGVtcyB0byBjaGFyYWN0ZXJcclxuLy9UT0RPOiBhIHNlYXJjaCBmaWVsZCByZWR1Y2luZyB0aGUgdmlld1xyXG4vL1RPRE86IHNob3dpbmcgYW1vdW50IG9mIGVtcHR5IHNsb3RzIGxlZnRcclxuLy9UT0RPOiBhIGJ1dHRvbiB0byBvcGVuIHRoZSBvdmVydmlldyB2aXNpYmxlIHdoZW4gaW5zaWRlIHRoZSBiYW5rXHJcbi8vVE9ETzogcGVyaGFwcyBhbiBhYmlsaXR5IHRvIGdyb3VwIGl0IGJ5IG5wYyB0ZWxsZXIgaW5zdGVhZCBvZiBpdGVtIHR5cGVzXHJcbi8vIFRPRE86IHJlbmRlciBzaGlueSAvIGdsaXRjaGVkIGRpZmZlcmVudGx5XHJcbi8vIGh0dHBzOi8vYmxvZy5iaXRzcmMuaW8vcHVyZS1jc3MtdG8tbWFrZS1hLWJ1dHRvbi1zaGluZS1hbmQtZ2VudGx5LWNoYW5nZS1jb2xvcnMtb3Zlci10aW1lLTViNjg1ZDljNmE3ZVxyXG4vLyBodHRwczovL2NvZGVwZW4uaW8va2llcmFuZml2ZXN0YXJzL3Blbi9Nd21XUWJcclxuLy8gVE9ETzogZGlmZmVybnQgbW9kZXNcclxuLy8gIGFsbCBpbiBvbmUgaW52ZW50b3J5LCBzaG93IGVhY2ggYmFuayBzbG90IHdpdGggdGhlIGFiaWxpdHkgdG8gZHJhZyBhbmQgZHJvcCBhcm91bmRcclxuLy8gZ3JvdXAgaXRlbXMgYnkgdHlwZSwgY29sbGFwc2Ugc2FtZSBraW5kXHJcbi8vIGdyb3VwIGl0ZW1zIGJ5IGJhbmsgcGFjaywgY29sbGFwc2Ugc2FtZSBraW5kXHJcbi8vIHR5cGUgSW52ZW50b3J5TG9va3VwID0ge1xyXG4vLyAgICAgW1QgaW4gSXRlbU5hbWVdPzoge1xyXG4vLyAgICAgICBhbW91bnQ6IG51bWJlcjtcclxuLy8gICAgICAgbGV2ZWxzOiB7IFtUOiBudW1iZXJdOiB7IGFtb3VudDogbnVtYmVyOyBpbmRleGVzOiBudW1iZXJbXSB9IH07XHJcbi8vICAgICB9O1xyXG4vLyAgIH07XHJcbmNvbnN0IHR5cGVzID0ge1xyXG4gICAgaGVsbWV0OiBcIkhlbG1ldHNcIixcclxuICAgIGNoZXN0OiBcIkFybW9yc1wiLFxyXG4gICAgcGFudHM6IFwiUGFudHNcIixcclxuICAgIGdsb3ZlczogXCJHbG92ZXNcIixcclxuICAgIHNob2VzOiBcIlNob2VzXCIsXHJcbiAgICBjYXBlOiBcIkNhcGVzXCIsXHJcbiAgICByaW5nOiBcIlJpbmdzXCIsXHJcbiAgICBlYXJyaW5nOiBcIkVhcnJpbmdzXCIsXHJcbiAgICBhbXVsZXQ6IFwiQW11bGV0c1wiLFxyXG4gICAgYmVsdDogXCJCZWx0c1wiLFxyXG4gICAgb3JiOiBcIk9yYnNcIixcclxuICAgIHdlYXBvbjogXCJXZWFwb25zXCIsXHJcbiAgICBzaGllbGQ6IFwiU2hpZWxkc1wiLFxyXG4gICAgc291cmNlOiBcIk9mZmhhbmRzXCIsXHJcbiAgICBxdWl2ZXI6IFwiT2ZmaGFuZHNcIixcclxuICAgIG1pc2Nfb2ZmaGFuZDogXCJPZmZoYW5kc1wiLFxyXG4gICAgZWxpeGlyOiBcIkVsaXhpcnNcIixcclxuICAgIHBvdDogXCJQb3Rpb25zXCIsXHJcbiAgICBjc2Nyb2xsOiBcIlNjcm9sbHNcIixcclxuICAgIHVzY3JvbGw6IFwiU2Nyb2xsc1wiLFxyXG4gICAgcHNjcm9sbDogXCJTY3JvbGxzXCIsXHJcbiAgICBvZmZlcmluZzogXCJTY3JvbGxzXCIsXHJcbiAgICBtYXRlcmlhbDogXCJDcmFmdGluZyBhbmQgQ29sbGVjdGluZ1wiLFxyXG4gICAgZXhjaGFuZ2U6IFwiRXhjaGFuZ2VhYmxlc1wiLFxyXG4gICAgZHVuZ2Vvbl9rZXk6IFwiS2V5c1wiLFxyXG4gICAgdG9rZW46IFwiVG9rZW5zXCIsXHJcbiAgICBvdGhlcjogXCJPdGhlcnNcIixcclxufTtcclxuY2xhc3MgRW5oYW5jZWRCYW5rVUkge1xyXG4gICAgLyoqXHJcbiAgICAgKlxyXG4gICAgICovXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICAvLyBzdXBlcigpO1xyXG4gICAgICAgIC8vIFRPRE86IGxvYWQgc2V0dGluZyBmcm9tIGxvY2FsIHN0b3JhZ2VcclxuICAgICAgICAvLyBUT0RPOiBjYWNoZSBiYW5rIGludmVudG9yeSBhdCBhbiBpbnRlcnZhbCwgYmFzZWQgb24gc2V0dGluZ3NcclxuICAgICAgICAvLyBUT0RPOiBzdGFydCBpbnNpZGUgLyBvdXRzaWRlIGJhbmsgY2hlY2sgdG8gZW5hYmxlIC8gZGlzYWJsZSBidXR0b25cclxuICAgICAgICAvLyBUT0RPOiBjYWNoZSBiYW5rIHdoZW4gd2UgZW50ZXIgaXQuXHJcbiAgICAgICAgdGhpcy5ncm91cHMgPSB7fTtcclxuICAgICAgICBzZXRJbnRlcnZhbCgoKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0ICQgPSBwYXJlbnQuJDtcclxuICAgICAgICAgICAgY29uc3QgdHJjID0gJChcIiN0b3ByaWdodGNvcm5lclwiKTtcclxuICAgICAgICAgICAgY29uc3QgaWQgPSBcImJhbmtidXR0b25cIjtcclxuICAgICAgICAgICAgY29uc3QgYnV0dG9uID0gdHJjLmZpbmQoXCIjXCIgKyBpZCk7XHJcbiAgICAgICAgICAgIGlmIChjaGFyYWN0ZXIuYmFuaykge1xyXG4gICAgICAgICAgICAgICAgLy8gaW5zaWRlIGJhbmtcclxuICAgICAgICAgICAgICAgIGlmICghYnV0dG9uIHx8IGJ1dHRvbi5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0cmMucHJlcGVuZChgPGRpdiBpZD0nJHtpZH0nIGNsYXNzPSdnYW1lYnV0dG9uJyBvbmNsaWNrPSdwYXJlbnQuZW5oYW5jZWRfYmFua191aS5zaG93KCknIHRpdGxlPSdvcGVuIGVuaGFuY2VkIGJhbmsgb3ZlcnZpZXcnPkJBTks8L2Rpdj5gKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIG91dHNpZGUgYmFua1xyXG4gICAgICAgICAgICAgICAgaWYgKGJ1dHRvbiAmJiBidXR0b24ubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGJ1dHRvbi5yZW1vdmUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sIDEwMDApO1xyXG4gICAgfVxyXG4gICAgc2hvdygpIHtcclxuICAgICAgICBjb25zdCBpc0luQmFuayA9ICEhY2hhcmFjdGVyLmJhbms7XHJcbiAgICAgICAgY29uc3QgeyB0b3RhbEJhbmtTbG90cywgdG90YWxVc2VkQmFua1Nsb3RzLCB0b3RhbFVudXNlZEJhbmtTbG90cywgZ3JvdXBzIH0gPSB0aGlzLmdyb3VwQmFua0J5SXRlbSgpO1xyXG4gICAgICAgIHRoaXMuZ3JvdXBzID0gZ3JvdXBzO1xyXG4gICAgICAgIGNvbnN0IGNvbnRhaW5lciA9ICQoXCI8ZGl2PlwiLCB7XHJcbiAgICAgICAgICAgIHN0eWxlOiBcImJvcmRlcjogNXB4IHNvbGlkIGdyYXk7IGJhY2tncm91bmQtY29sb3I6IGJsYWNrOyBwYWRkaW5nOiAxMHB4OyB3aWR0aDogOTglXCIsXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY29uc3QgdGl0bGUgPSAkKFwiPGRpdiBzdHlsZT0nY29sb3I6ICNmMWMwNTQ7IGJvcmRlci1ib3R0b206IDJweCBkYXNoZWQgI0M3Q0FDQTsgbWFyZ2luLWJvdHRvbTogM3B4OyBtYXJnaW4tbGVmdDogM3B4OyBtYXJnaW4tcmlnaHQ6IDNweCcgY2xhc3M9J2Nib2xkJz5cIik7XHJcbiAgICAgICAgY29udGFpbmVyLmFwcGVuZCh0aXRsZSk7XHJcbiAgICAgICAgdGl0bGUuYXBwZW5kKFwiQmFua1wiKTtcclxuICAgICAgICAvLyBUT0RPOiB0aGUgc2VhcmNoIGJ1dHRvbiBzaG91bGQgdHJpZ2dlciBhIGNsZWFpbmcgb2YgYmFua0l0ZW1zQ29udGFpbmVyIGFuZCByZS1yZW5kZXIgdGhlIG5ldyBkYXRhXHJcbiAgICAgICAgY29uc3Qgc2VhcmNoQnV0dG9uID0gJChgPGlucHV0IHBsYWNlaG9sZGVyPSdwcmVzcyBlbnRlciB0byBzZWFyY2gnIG9uY2hhbmdlPSdlbmhhbmNlZF9iYW5rX3VpLnJlbmRlckJhbmtJdGVtcyh0aGlzLnZhbHVlKScgdmFsdWU9JyR7XCJcIn0nIC8+YCk7XHJcbiAgICAgICAgdGl0bGUuYXBwZW5kKHNlYXJjaEJ1dHRvbik7XHJcbiAgICAgICAgdGl0bGUuYXBwZW5kKGA8c3Bhbj4ke3RvdGFsVW51c2VkQmFua1Nsb3RzfSAvICR7dG90YWxCYW5rU2xvdHN9IGZyZWUgc2xvdHM8L3NwYW4+YCk7XHJcbiAgICAgICAgY29uc3QgYmFua0l0ZW1zQ29udGFpbmVyID0gJChcIjxkaXY+XCIsIHsgaWQ6IFwiYmFuay1pdGVtcy1jb250YWluZXJcIiB9KTtcclxuICAgICAgICBjb250YWluZXIuYXBwZW5kKGJhbmtJdGVtc0NvbnRhaW5lcik7XHJcbiAgICAgICAgLy8gdHJpZ2dlciByZW5kZXIgYWZ0ZXIgZWxlbWVudHMgZXhpc3QgaW4gdGhlIGRvbVxyXG4gICAgICAgIHRoaXMucmVuZGVyQmFua0l0ZW1zKHVuZGVmaW5lZCwgYmFua0l0ZW1zQ29udGFpbmVyKTtcclxuICAgICAgICAvLyBUT0RPOiBzaG91bGQgbm90IGJlIHJlbmRlcmVkIGFzIGEgbW9kYWwsIHdlIHdhbnQgdG8gYmUgYWJsZSB0byB1dGlsaXplIG91ciBwbGF5ZXIgaW52ZW50b3J5IGFzIHdlbGwgOnRoaW5raW5nOlxyXG4gICAgICAgIHBhcmVudC5zaG93X21vZGFsKGNvbnRhaW5lci53cmFwKFwiPGRpdi8+XCIpLnBhcmVudCgpLmh0bWwoKSwge1xyXG4gICAgICAgICAgICB3cmFwOiAhMSxcclxuICAgICAgICAgICAgaGlkZWluYmFja2dyb3VuZDogITAsXHJcbiAgICAgICAgICAgIHVybDogXCIvZG9jcy9ndWlkZS9hbGwvaXRlbXNcIixcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGZpbHRlcihzZWFyY2gpIHtcclxuICAgICAgICBjb25zdCByZXN1bHQgPSB7fTtcclxuICAgICAgICBmb3IgKGNvbnN0IGdyb3VwTmFtZSBpbiB0aGlzLmdyb3Vwcykge1xyXG4gICAgICAgICAgICBjb25zdCBncm91cCA9IHRoaXMuZ3JvdXBzW2dyb3VwTmFtZV07XHJcbiAgICAgICAgICAgIGxldCBpdGVtS2V5O1xyXG4gICAgICAgICAgICBmb3IgKGl0ZW1LZXkgaW4gZ3JvdXAuaXRlbXMpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGdJdGVtID0gRy5pdGVtc1tpdGVtS2V5XTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBncm91cC5pdGVtc1tpdGVtS2V5XTtcclxuICAgICAgICAgICAgICAgIGxldCBzaG91bGRBZGQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGlmIChzZWFyY2gpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpdGVtS2V5TWF0Y2hlcyA9IGl0ZW1LZXkuaW5kZXhPZihzZWFyY2gpID4gLTE7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbU5hbWVNYXRjaGVzID0gZ0l0ZW0gJiYgZ0l0ZW0ubmFtZS5pbmRleE9mKHNlYXJjaCkgPiAtMTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbUtleU1hdGNoZXMgfHwgaXRlbU5hbWVNYXRjaGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3VsZEFkZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2hvdWxkQWRkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChzaG91bGRBZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdFtncm91cE5hbWVdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdFtncm91cE5hbWVdID0geyBhbW91bnQ6IDAsIGl0ZW1zOiB7fSB9O1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICByZXN1bHRbZ3JvdXBOYW1lXS5pdGVtc1tpdGVtS2V5XSA9IGl0ZW07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuICAgIGdyb3VwQmFua0J5SXRlbSgpIHtcclxuICAgICAgICB2YXIgX2EsIF9iLCBfYywgX2QsIF9lLCBfZjtcclxuICAgICAgICBsZXQgdG90YWxCYW5rU2xvdHMgPSAwO1xyXG4gICAgICAgIGxldCB0b3RhbFVzZWRCYW5rU2xvdHMgPSAwO1xyXG4gICAgICAgIGxldCB0b3RhbFVudXNlZEJhbmtTbG90cyA9IDA7XHJcbiAgICAgICAgLy8gVE9ETzogdHlwZSB0aGlzXHJcbiAgICAgICAgY29uc3QgZ3JvdXBzID0ge307XHJcbiAgICAgICAgbGV0IHBhY2tOYW1lO1xyXG4gICAgICAgIGZvciAocGFja05hbWUgaW4gY2hhcmFjdGVyLmJhbmspIHtcclxuICAgICAgICAgICAgY29uc3QgcGFja0l0ZW1zID0gY2hhcmFjdGVyLmJhbmtbcGFja05hbWVdO1xyXG4gICAgICAgICAgICB0b3RhbEJhbmtTbG90cyArPSAoX2EgPSBwYWNrSXRlbXMubGVuZ3RoKSAhPT0gbnVsbCAmJiBfYSAhPT0gdm9pZCAwID8gX2EgOiAwO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgcGFja0l0ZW1zLmxlbmd0aDsgaW5kZXgrKykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbUluZm8gPSBwYWNrSXRlbXNbaW5kZXhdO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFpdGVtSW5mbykge1xyXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsVW51c2VkQmFua1Nsb3RzKys7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjb25zdCBnSXRlbSA9IEcuaXRlbXNbaXRlbUluZm8ubmFtZV07XHJcbiAgICAgICAgICAgICAgICBjb25zdCBsZXZlbCA9IChfYiA9IGl0ZW1JbmZvLmxldmVsKSAhPT0gbnVsbCAmJiBfYiAhPT0gdm9pZCAwID8gX2IgOiAwO1xyXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogdHJhbnNsYXRlIHR5cGUgdG8gcmVhZGFibGUgLyBjb21tb24gbmFtZSAvIG90aGVyc1xyXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogZ3JvdXAgd2VhcG9ucyBieSBzdWJ0eXBlP1xyXG4gICAgICAgICAgICAgICAgbGV0IHR5cGUgPSAoX2MgPSB0eXBlc1tnSXRlbS50eXBlXSkgIT09IG51bGwgJiYgX2MgIT09IHZvaWQgMCA/IF9jIDogXCJPdGhlcnNcIjtcclxuICAgICAgICAgICAgICAgIGlmIChnSXRlbS5lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9IChfZCA9IHR5cGVzW1wiZXhjaGFuZ2VcIl0pICE9PSBudWxsICYmIF9kICE9PSB2b2lkIDAgPyBfZCA6IFwiT3RoZXJzXCI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBsZXQgaXRlbUJ5VHlwZSA9IGdyb3Vwc1t0eXBlXTtcclxuICAgICAgICAgICAgICAgIGlmICghaXRlbUJ5VHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1CeVR5cGUgPSB7IGFtb3VudDogMCwgaXRlbXM6IHt9IH07XHJcbiAgICAgICAgICAgICAgICAgICAgZ3JvdXBzW3R5cGVdID0gaXRlbUJ5VHlwZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGxldCBpdGVtRGF0YSA9IGl0ZW1CeVR5cGUuaXRlbXNbaXRlbUluZm8ubmFtZV07XHJcbiAgICAgICAgICAgICAgICBpZiAoIWl0ZW1EYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbURhdGEgPSB7fTtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtQnlUeXBlLml0ZW1zW2l0ZW1JbmZvLm5hbWVdID0gaXRlbURhdGE7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBsZXQgaXRlbVRpdGxlRGF0YSA9IGl0ZW1EYXRhWyhfZSA9IGl0ZW1JbmZvLnApICE9PSBudWxsICYmIF9lICE9PSB2b2lkIDAgPyBfZSA6IFwiXCJdO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFpdGVtVGl0bGVEYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbVRpdGxlRGF0YSA9IHsgYW1vdW50OiAwLCBsZXZlbHM6IHt9IH07XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbURhdGFbKF9mID0gaXRlbUluZm8ucCkgIT09IG51bGwgJiYgX2YgIT09IHZvaWQgMCA/IF9mIDogXCJcIl0gPSBpdGVtVGl0bGVEYXRhO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbVRpdGxlRGF0YS5hbW91bnQgKz0gaXRlbUluZm8ucSB8fCAxO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbGV0IGxldmVscyA9IGl0ZW1UaXRsZURhdGEubGV2ZWxzW2xldmVsXTtcclxuICAgICAgICAgICAgICAgIGlmICghbGV2ZWxzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV2ZWxzID0geyBhbW91bnQ6IGl0ZW1JbmZvLnEgfHwgMSwgaW5kZXhlczogW1twYWNrTmFtZSwgaW5kZXhdXSB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1UaXRsZURhdGEubGV2ZWxzW2xldmVsXSA9IGxldmVscztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1UaXRsZURhdGEuYW1vdW50ICs9IGl0ZW1JbmZvLnEgfHwgMTtcclxuICAgICAgICAgICAgICAgICAgICBsZXZlbHMuYW1vdW50ICs9IGl0ZW1JbmZvLnEgfHwgMTtcclxuICAgICAgICAgICAgICAgICAgICBsZXZlbHMuaW5kZXhlcy5wdXNoKFtwYWNrTmFtZSwgaW5kZXhdKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRvdGFsVXNlZEJhbmtTbG90cysrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB7IHRvdGFsQmFua1Nsb3RzLCB0b3RhbFVzZWRCYW5rU2xvdHMsIHRvdGFsVW51c2VkQmFua1Nsb3RzLCBncm91cHMgfTtcclxuICAgIH1cclxuICAgIG9uTW91c2VEb3duQmFua0l0ZW0oZSwgaXRlbUtleSwgbGV2ZWwsIHRpdGxlKSB7XHJcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKGUud2hpY2gpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgMzogLy8gcmlnaHQgY2xpY2tcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiB0aGlzLmdyb3Vwcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBncm91cCA9IHRoaXMuZ3JvdXBzW2tleV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBncm91cC5pdGVtc1tpdGVtS2V5XTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpdGVtKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW1CeVRpdGxlID0gaXRlbVt0aXRsZV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXRlbUJ5VGl0bGUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbUJ5TGV2ZWwgPSBpdGVtQnlUaXRsZS5sZXZlbHNbbGV2ZWxdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbUJ5TGV2ZWwgJiYgaXRlbUJ5TGV2ZWwuaW5kZXhlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBbcGFjaywgaW5kZXhdID0gaXRlbUJ5TGV2ZWwuaW5kZXhlcy5zcGxpY2UoMCwgMSlbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUT0RPOiBsb29rIHVwIGl0ZW0gYW5kIGRldGVybWluZSBpZiBpdCBoYXMgYSBxdWFudGl0eSB0byBzdWJzdHJhY3QgaW5zdGVhZCBvZiAxXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtQnlUaXRsZS5hbW91bnQgLT0gMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1CeUxldmVsLmFtb3VudCAtPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW1CeUxldmVsLmluZGV4ZXMubGVuZ3RoIDw9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgaXRlbUJ5VGl0bGUubGV2ZWxzW2xldmVsXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChiYW5rX3JldHJpZXZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgW3BhY2tNYXBdID0gYmFua19wYWNrc1twYWNrXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2hhcmFjdGVyLm1hcCAhPT0gcGFja01hcCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnYW1lX2xvZyhgTW92aW5nIHRvICR7cGFja01hcH0gZnJvbSAke2NoYXJhY3Rlci5tYXB9IGApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5aWVsZCBzbWFydF9tb3ZlKHBhY2tNYXApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5aWVsZCBiYW5rX3JldHJpZXZlKHBhY2ssIGluZGV4KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGJhbmtfcmV0cmlldmUgaXMgbm90IGRlZmluZWQsIHNlZW1zIGxpa2Ugd2UgZG9uJ3QgaGF2ZSBhY2Nlc3MgdG8gdGhlIGNvZGUgZnVuY3Rpb25zIHdoZW4gd2UgcGFzdGUgdGhlIGNvZGUgaW50byBkZXYgY29uc29sZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudC5zb2NrZXQuZW1pdChcImJhbmtcIiwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVyYXRpb246IFwic3dhcFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWNrOiBwYWNrLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHI6IGluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnY6IC0xLCAvLyB0aGUgc2VydmVyIGludGVycHJldHMgLTEgYXMgZmlyc3Qgc2xvdCBhdmFpbGFibGVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRPRE86IGdyb3VwQmFua0J5SXRlbSBzaG91bGQgYmUgY2FsbGVkIC8gdXBkYXRlZFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRPRE86IHRpdGxlIHNob3VsZCBiZSB1cGRhdGVkIHdpdGggZnJlZSBzbG90IGNvdW50XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJncm91cEJhbmtCeUl0ZW0gdGltZW91dCB3aXRoIHJlbmRlciBzdGFydGVkXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIC8vIGRlbGF5IHRvIGxldCB0aGUgZW1pdCBmaW5pc2hcclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zdCB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gICB0b3RhbEJhbmtTbG90cyxcclxuICAgICAgICAgICAgICAgICAgICAvLyAgIHRvdGFsVXNlZEJhbmtTbG90cyxcclxuICAgICAgICAgICAgICAgICAgICAvLyAgIHRvdGFsVW51c2VkQmFua1Nsb3RzLFxyXG4gICAgICAgICAgICAgICAgICAgIC8vICAgZ3JvdXBzLFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIH0gPSB0aGlzLmdyb3VwQmFua0J5SXRlbSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHRoaXMuZ3JvdXBzID0gZ3JvdXBzO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyQmFua0l0ZW1zKHRoaXMuc2VhcmNoKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcclxuICAgICAgICAgICAgICAgICAgICAvLyAgIFwiZ3JvdXBCYW5rQnlJdGVtIHRpbWVvdXQgd2l0aCByZW5kZXIgZmluaXNoZWRcIixcclxuICAgICAgICAgICAgICAgICAgICAvLyAgIHRoaXMuZ3JvdXBzXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyB9LCAyNTApO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBwYXJlbnQucmVuZGVyX2l0ZW1faW5mbyhpdGVtS2V5KTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgcmVuZGVyQmFua0l0ZW1zKHNlYXJjaCA9IFwiXCIsIGJhbmtJdGVtc0NvbnRhaW5lcikge1xyXG4gICAgICAgIHZhciBfYSwgX2I7XHJcbiAgICAgICAgdGhpcy5zZWFyY2ggPSBzZWFyY2g7XHJcbiAgICAgICAgYmFua0l0ZW1zQ29udGFpbmVyID1cclxuICAgICAgICAgICAgYmFua0l0ZW1zQ29udGFpbmVyICE9PSBudWxsICYmIGJhbmtJdGVtc0NvbnRhaW5lciAhPT0gdm9pZCAwID8gYmFua0l0ZW1zQ29udGFpbmVyIDogcGFyZW50LiQoXCIjYmFuay1pdGVtcy1jb250YWluZXJcIik7XHJcbiAgICAgICAgaWYgKGJhbmtJdGVtc0NvbnRhaW5lciAmJiBiYW5rSXRlbXNDb250YWluZXIubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihcIiNiYW5rLWl0ZW1zLWNvbnRhaW5lciBjb3VsZCBub3QgYmUgZm91bmQsIGNhbid0IHJlcmVuZGVyIGRhdGFcIik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChiYW5rSXRlbXNDb250YWluZXIgJiYgYmFua0l0ZW1zQ29udGFpbmVyLmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICAgICAgICAvLyBjbGVhciBjb250ZW50c1xyXG4gICAgICAgICAgICBiYW5rSXRlbXNDb250YWluZXIuaHRtbChcIlwiKTtcclxuICAgICAgICAgICAgY29uc3QgZ3JvdXBzID0gdGhpcy5maWx0ZXIoc2VhcmNoKTtcclxuICAgICAgICAgICAgY29uc3Qgc29ydGVkR3JvdXBLZXlzID0gWy4uLm5ldyBTZXQoT2JqZWN0LnZhbHVlcyh0eXBlcykpXTsgLy8uc29ydCgoYSwgYikgPT4gYS5sb2NhbGVDb21wYXJlKGIpKTtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtVHlwZSBvZiBzb3J0ZWRHcm91cEtleXMpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW1zQnlUeXBlID0gZ3JvdXBzW2l0ZW1UeXBlXTtcclxuICAgICAgICAgICAgICAgIGlmICghaXRlbXNCeVR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW1UeXBlQ29udGFpbmVyID0gJChcIjxkaXYgc3R5bGU9J2Zsb2F0OmxlZnQ7IG1hcmdpbi1sZWZ0OjVweDsnPlwiKTtcclxuICAgICAgICAgICAgICAgIGl0ZW1UeXBlQ29udGFpbmVyLmFwcGVuZChgPGRpdiBjbGFzcz0nZ2FtZWJ1dHRvbiBnYW1lYnV0dG9uLXNtYWxsJyBzdHlsZT0nbWFyZ2luLWJvdHRvbTogNXB4Jz4ke2l0ZW1UeXBlfTwvZGl2PmApO1xyXG4gICAgICAgICAgICAgICAgYmFua0l0ZW1zQ29udGFpbmVyLmFwcGVuZChpdGVtVHlwZUNvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtc0NvbnRhaW5lciA9ICQoXCI8ZGl2IHN0eWxlPSdtYXJnaW4tYm90dG9tOiAxMHB4Jz5cIik7XHJcbiAgICAgICAgICAgICAgICBpdGVtVHlwZUNvbnRhaW5lci5hcHBlbmQoaXRlbXNDb250YWluZXIpO1xyXG4gICAgICAgICAgICAgICAgLy8gbG9vcCBpdGVtc1xyXG4gICAgICAgICAgICAgICAgbGV0IGl0ZW1LZXk7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGl0ZW1LZXkgaW4gaXRlbXNCeVR5cGUuaXRlbXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBnSXRlbSA9IEcuaXRlbXNbaXRlbUtleV07XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbXNCeVRpdGxlID0gKF9hID0gaXRlbXNCeVR5cGUuaXRlbXNbaXRlbUtleV0pICE9PSBudWxsICYmIF9hICE9PSB2b2lkIDAgPyBfYSA6IHt9O1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRPRE86IGl0ZXJhdGUgYmFja3dhcmRzP1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCB0aXRsZUtleTtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKHRpdGxlS2V5IGluIGl0ZW1zQnlUaXRsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGFtb3VudCwgbGV2ZWxzIH0gPSAoX2IgPSBpdGVtc0J5VGl0bGVbdGl0bGVLZXldKSAhPT0gbnVsbCAmJiBfYiAhPT0gdm9pZCAwID8gX2IgOiB7fTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBsZXZlbCBpbiBsZXZlbHMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBsZXZlbHNbTnVtYmVyKGxldmVsKV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmYWtlSXRlbUluZm8gPSB7IG5hbWU6IGl0ZW1LZXkgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChOdW1iZXIobGV2ZWwpID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZha2VJdGVtSW5mby5sZXZlbCA9IE51bWJlcihsZXZlbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5hbW91bnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmYWtlSXRlbUluZm8ucSA9IGRhdGEuYW1vdW50O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVE9ETzogYWRkIGl0ZW1fY29udGFpbmVyIHRvIHR5cGVzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpdGVtQ29udGFpbmVyID0gJChwYXJlbnQuaXRlbV9jb250YWluZXIoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNraW46IGdJdGVtLnNraW4sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gb25jbGljazogXCJyZW5kZXJfaXRlbV9pbmZvKCdcIiArIGl0ZW1LZXkgKyBcIicpXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCBmYWtlSXRlbUluZm8pKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YWNrU2l6ZSA9IE51bWJlcihnSXRlbS5zKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YWNrQ291bnQgPSBkYXRhLmluZGV4ZXMubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3B0aW1hbFN0YWNrQ291bnQgPSBNYXRoLmNlaWwoZGF0YS5hbW91bnQgLyBzdGFja1NpemUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3B0aW1hbFN0YWNrQ291bnRNZXNzYWdlID0gc3RhY2tDb3VudCA+IG9wdGltYWxTdGFja0NvdW50ID8gYOKaoO+4jyR7b3B0aW1hbFN0YWNrQ291bnR9YCA6IFwiXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0aXRsZU5hbWUgPSB0aXRsZUtleSAmJiBHLnRpdGxlc1t0aXRsZUtleV1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IGAke0cudGl0bGVzW3RpdGxlS2V5XS50aXRsZX0gYFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogXCJcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1Db250YWluZXIuYXR0cihcInRpdGxlXCIsIGAke3RpdGxlTmFtZX0ke2dJdGVtLm5hbWV9JHtOdW1iZXIobGV2ZWwpID4gMCA/IGArJHtsZXZlbH1gIDogXCJcIn1cXG4ke3N0YWNrQ291bnR9IHN0YWNrcyAke29wdGltYWxTdGFja0NvdW50TWVzc2FnZX1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHN0eWxlIGRlcGVuZGluZyBvbiB0aXRsZUtleVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRpdGxlQm9yZGVyQ29sb3I7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHRpdGxlS2V5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImZlc3RpdmVcIjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGVCb3JkZXJDb2xvciA9IFwiIzc5ZmY3ZVwiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiZmlyZWhhemFyZFwiOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZUJvcmRlckNvbG9yID0gXCIjZjc5YjExXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImdsaXRjaGVkXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlQm9yZGVyQ29sb3IgPSBcImdyZXlcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiZ29vcGVkXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlQm9yZGVyQ29sb3IgPSBcIiM2NEI4NjdcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImxlZ2FjeVwiOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZUJvcmRlckNvbG9yID0gXCJ3aGl0ZVwiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwibHVja3lcIjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGVCb3JkZXJDb2xvciA9IFwiIzAwZjNmZlwiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwic2hpbnlcIjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGVCb3JkZXJDb2xvciA9IFwiIzk5YjJkOFwiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwic3VwZXJmYXN0XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlQm9yZGVyQ29sb3IgPSBcIiNjNjgxZGNcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGl0bGVCb3JkZXJDb2xvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1Db250YWluZXIuY3NzKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9yZGVyQ29sb3I6IHRpdGxlQm9yZGVyQ29sb3IsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbVN1YkNvbnRhaW5lciA9IGl0ZW1Db250YWluZXIuZmluZChcImRpdjpmaXJzdC1jaGlsZFwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtU3ViQ29udGFpbmVyLmNzcyh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvcmRlcjogXCJOb25lXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxlZnQ6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvdHRvbTogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGhhbmRsZSBsZWZ0IGFuZCByaWdodCBjbGlja1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbUNvbnRhaW5lci5hdHRyKFwib25tb3VzZWRvd25cIiwgYGVuaGFuY2VkX2JhbmtfdWkub25Nb3VzZURvd25CYW5rSXRlbShldmVudCwgJyR7aXRlbUtleX0nLCAke2xldmVsfSwgJyR7dGl0bGVLZXl9JylgKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxldmVsIGNvbnRhaW5lclxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbGV2ZWxFbGVtZW50ID0gaXRlbUNvbnRhaW5lci5maW5kKFwiLml1dWlcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXZlbEVsZW1lbnQuY3NzKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb250U2l6ZTogXCIxNnB4XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZpbmQgcXVhbnRpdHkgaW4gaXRlbSBjb250YWluZXIgYW5kIG1ha2UgaXQgcHJldHR5XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb3VudEVsZW1lbnQgPSBpdGVtQ29udGFpbmVyLmZpbmQoXCIuaXF1aVwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50RWxlbWVudC5jc3Moe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvbnRTaXplOiBcIjE2cHhcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY291bnQgPSBOdW1iZXIoY291bnRFbGVtZW50LnRleHQoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcmV0dHlDb3VudCA9ICgwLCB1dGlsc18xLmFiYnJldmlhdGVOdW1iZXIpKGNvdW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcmV0dHlDb3VudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50RWxlbWVudC5odG1sKHByZXR0eUNvdW50LnRvU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXNDb250YWluZXIuYXBwZW5kKGl0ZW1Db250YWluZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJhbmtJdGVtc0NvbnRhaW5lci5hcHBlbmQoXCI8ZGl2IHN0eWxlPSdjbGVhcjpib3RoOyc+XCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG4vLyBUT0RPOiBoYW5kbGUgcmVsb2FkaW5nIGNvZGUsIHdlIG1pZ2h0IG5lZWQgdG8gZGVzdHJveSB0aGUgcHJldmlvdXMgVUlcclxucGFyZW50LmVuaGFuY2VkX2JhbmtfdWkgPSBuZXcgRW5oYW5jZWRCYW5rVUkoKTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuZXhwb3J0cy5hYmJyZXZpYXRlTnVtYmVyID0gdm9pZCAwO1xyXG4vLyBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL2EvNDA3MjQzNTQvMjgxNDVcclxuZnVuY3Rpb24gYWJicmV2aWF0ZU51bWJlcihudW1iZXIpIHtcclxuICAgIGNvbnN0IFNJX1NZTUJPTCA9IFtcIlwiLCBcImtcIiwgXCJNXCIsIFwiR1wiLCBcIlRcIiwgXCJQXCIsIFwiRVwiXTtcclxuICAgIGlmICghbnVtYmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bWJlcjtcclxuICAgIH1cclxuICAgIC8vIHdoYXQgdGllcj8gKGRldGVybWluZXMgU0kgc3ltYm9sKVxyXG4gICAgY29uc3QgdGllciA9IChNYXRoLmxvZzEwKE1hdGguYWJzKG51bWJlcikpIC8gMykgfCAwO1xyXG4gICAgLy8gaWYgemVybywgd2UgZG9uJ3QgbmVlZCBhIHN1ZmZpeFxyXG4gICAgaWYgKHRpZXIgPT09IDApXHJcbiAgICAgICAgcmV0dXJuIG51bWJlcjtcclxuICAgIC8vIGdldCBzdWZmaXggYW5kIGRldGVybWluZSBzY2FsZVxyXG4gICAgY29uc3Qgc3VmZml4ID0gU0lfU1lNQk9MW3RpZXJdO1xyXG4gICAgY29uc3Qgc2NhbGUgPSBNYXRoLnBvdygxMCwgdGllciAqIDMpO1xyXG4gICAgLy8gc2NhbGUgdGhlIG51bWJlclxyXG4gICAgY29uc3Qgc2NhbGVkID0gbnVtYmVyIC8gc2NhbGU7XHJcbiAgICAvLyBmb3JtYXQgbnVtYmVyIGFuZCBhZGQgc3VmZml4XHJcbiAgICAvLyAgIHJldHVybiBzY2FsZWQudG9GaXhlZCgxKSArIHN1ZmZpeDtcclxuICAgIHJldHVybiAoc2NhbGVkLnRvTG9jYWxlU3RyaW5nKHVuZGVmaW5lZCwge1xyXG4gICAgICAgIG1pbmltdW1GcmFjdGlvbkRpZ2l0czogMSxcclxuICAgICAgICBtYXhpbXVtRnJhY3Rpb25EaWdpdHM6IDEsXHJcbiAgICB9KSArIHN1ZmZpeCk7XHJcbn1cclxuZXhwb3J0cy5hYmJyZXZpYXRlTnVtYmVyID0gYWJicmV2aWF0ZU51bWJlcjtcclxuIiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIiIsIi8vIHN0YXJ0dXBcbi8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuLy8gVGhpcyBlbnRyeSBtb2R1bGUgaXMgcmVmZXJlbmNlZCBieSBvdGhlciBtb2R1bGVzIHNvIGl0IGNhbid0IGJlIGlubGluZWRcbnZhciBfX3dlYnBhY2tfZXhwb3J0c19fID0gX193ZWJwYWNrX3JlcXVpcmVfXyhcIi4vc3JjL2JhbmsudHNcIik7XG4iLCIiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=