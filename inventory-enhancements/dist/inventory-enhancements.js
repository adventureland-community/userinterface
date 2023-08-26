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
        var _a, _b, _c, _d;
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
                    itemData = { amount: 0, levels: {} };
                    itemByType.items[itemInfo.name] = itemData;
                }
                let levels = itemData.levels[level];
                if (!levels) {
                    levels = { amount: itemInfo.q || 1, indexes: [[packName, index]] };
                    itemData.levels[level] = levels;
                }
                else {
                    itemData.amount += itemInfo.q || 1;
                    levels.amount += itemInfo.q || 1;
                    levels.indexes.push([packName, index]);
                }
                totalUsedBankSlots++;
            }
        }
        return { totalBankSlots, totalUsedBankSlots, totalUnusedBankSlots, groups };
    }
    onMouseDownBankItem(e, itemKey, level) {
        return __awaiter(this, void 0, void 0, function* () {
            e.preventDefault();
            switch (e.which) {
                case 3: // right click
                    for (const key in this.groups) {
                        const group = this.groups[key];
                        const item = group.items[itemKey];
                        if (!item)
                            continue;
                        const itemByLevel = item.levels[level];
                        if (itemByLevel && itemByLevel.indexes.length > 0) {
                            const [pack, index] = itemByLevel.indexes.splice(0, 1)[0];
                            // TODO: look up item and determine if it has a quantity to substract instead of 1
                            itemByLevel.amount -= 1;
                            if (itemByLevel.indexes.length <= 0) {
                                delete item.levels[level];
                            }
                            if (bank_retrieve) {
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
        var _a;
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
                    const { amount, levels } = (_a = itemsByType.items[itemKey]) !== null && _a !== void 0 ? _a : {};
                    // TODO: iterate backwards?
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
                        const optimalStackCount = data.amount / stackSize;
                        const optimaStackCountMessage = stackCount > optimalStackCount ? `⚠️${optimalStackCount}` : "";
                        itemContainer.attr("title", `${stackCount} stacks ${optimaStackCountMessage}`);
                        // handle left and right click
                        itemContainer.attr("onmousedown", `enhanced_bank_ui.onMouseDownBankItem(event, '${itemKey}', ${level})`);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esd0VBQXdFO0FBQ3hFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxRUFBcUUsZ0JBQWdCO0FBQ3JGLGdIQUFnSCxTQUFTO0FBQ3pIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsNEJBQTRCLGlCQUFpQjtBQUM3QztBQUNBO0FBQ0E7QUFDQSwrQ0FBK0M7QUFDL0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx5QkFBeUI7QUFDekI7QUFDQTtBQUNBO0FBQ0EsOEZBQThGLGtCQUFrQjtBQUNoSCx1REFBdUQsWUFBWSxTQUFTLHdCQUF3QjtBQUNwRztBQUNBLDBHQUEwRyxRQUFRLEtBQUssTUFBTTtBQUM3SDtBQUNBO0FBQ0E7QUFDQTtBQUNBLHlCQUF5QjtBQUN6QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLHlCQUF5QjtBQUN6QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw4REFBOEQ7QUFDOUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7QUNsVmE7QUFDYiw4Q0FBNkMsRUFBRSxhQUFhLEVBQUM7QUFDN0Qsd0JBQXdCO0FBQ3hCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBLHdCQUF3Qjs7Ozs7OztVQzFCeEI7VUFDQTs7VUFFQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTs7VUFFQTtVQUNBOztVQUVBO1VBQ0E7VUFDQTs7OztVRXRCQTtVQUNBO1VBQ0E7VUFDQSIsInNvdXJjZXMiOlsid2VicGFjazovL2ludmVudG9yeS1lbmhhbmNlbWVudHMvLi9zcmMvYmFuay50cyIsIndlYnBhY2s6Ly9pbnZlbnRvcnktZW5oYW5jZW1lbnRzLy4vc3JjL3V0aWxzLnRzIiwid2VicGFjazovL2ludmVudG9yeS1lbmhhbmNlbWVudHMvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vaW52ZW50b3J5LWVuaGFuY2VtZW50cy93ZWJwYWNrL2JlZm9yZS1zdGFydHVwIiwid2VicGFjazovL2ludmVudG9yeS1lbmhhbmNlbWVudHMvd2VicGFjay9zdGFydHVwIiwid2VicGFjazovL2ludmVudG9yeS1lbmhhbmNlbWVudHMvd2VicGFjay9hZnRlci1zdGFydHVwIl0sInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xyXG4vLyBucHggdHNjIC4vc3JjL3VpL2ludmVudG9yeS1lbmhhbmNlbWVudHMudHMgLS10YXJnZXQgZXNuZXh0IC0tbW9kdWxlIGFtZCAtLW91dEZpbGUgXCIuL3NyYy91aS9pbnZlbnRvcnktZW5oYW5jZW1lbnRzLmpzXCJcclxuLy8gcGFyZW50LmVuaGFuY2VkX2JhbmtfdWkuc2hvdygpXHJcbnZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xyXG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XHJcbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cclxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XHJcbiAgICB9KTtcclxufTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCB1dGlsc18xID0gcmVxdWlyZShcIi4vdXRpbHNcIik7XHJcbi8vIFRPRE86IHJlbmRlciBBTEwgaXRlbXMgZnJvbSB0aGUgYmFuayB3aGVuIGluIHRoZSBiYW5rXHJcbi8vIFRPRE86IGEgdG9nZ2xlIGJ1dHRvbiB0byBjb21iaW5lIGl0ZW0gc2xvdHMgb3Igbm90LlxyXG4vLyBUT0RPOiBhIHRvZ2dsZSBidXR0b24gdG8gY29tYmluZSBlbXB0eSBpdGVtIHNsb3RzIG9yIG5vdC5cclxuLy8gVE9ETzogc2hvdWxkIGJlIHNlYXJjaGFibGUgKGFscGhhIGJsZW5kIG5vbiB2YWxpZCByZXN1bHRzIHRvIHNlZXRyb3VnaC4pXHJcbi8vIFRPRE86IGFuIGV4dHJhIGZpZWxkIHNob3dpbmcgYWxsIHRoZSB0ZWxsZXJzIHdpdGggdGhlIGFiaWxpdHkgb2YgcHJlc3NpbmcgXCJnb3RvXCIgdGhlIHRlbGxlcnMgcG9zaXRpb24uXHJcbi8vIFRPRE86IHNvbWVob3cgdmFsaWRhdGUgaWYgeW91IGhhdmUgdW5sb2NrZWQgdGhlIGFkZGl0aW9uYWwgYmFuayBsZXZlbHMuXHJcbi8vIFRPRE86IGEgdG9nZ2xlIHRvIGdyb3VwIGl0ZW1zIGJ5IHRoZWlyIGdyb3VwLlxyXG4vLyBUT0RPOiBjYWNoZSB0aGUgYmFuayBpdGVtcyBzbyB5b3UgY2FuIHZpZXcgdGhlbSB3aGVuIGF3YXkuXHJcbi8vIFRPRE86IGEgYnV0dG9uIHRvIHNvcnRcclxuLy8gVE9ETzogY29uZmlndXJhYmxlIHNvcnRpbmcgcnVsZXMuXHJcbi8vIFRPRE86IGRlc2lnbmF0ZSBjZXJ0YWluIGl0ZW1zIHRvIGNlcnRhaW4gdGVsbGVycy5cclxuLy9UT0RPOiBjbGljayB0byB0cmFuc2ZlciBpdGVtcyB0byBjaGFyYWN0ZXJcclxuLy9UT0RPOiBhIHNlYXJjaCBmaWVsZCByZWR1Y2luZyB0aGUgdmlld1xyXG4vL1RPRE86IHNob3dpbmcgYW1vdW50IG9mIGVtcHR5IHNsb3RzIGxlZnRcclxuLy9UT0RPOiBhIGJ1dHRvbiB0byBvcGVuIHRoZSBvdmVydmlldyB2aXNpYmxlIHdoZW4gaW5zaWRlIHRoZSBiYW5rXHJcbi8vVE9ETzogcGVyaGFwcyBhbiBhYmlsaXR5IHRvIGdyb3VwIGl0IGJ5IG5wYyB0ZWxsZXIgaW5zdGVhZCBvZiBpdGVtIHR5cGVzXHJcbi8vIFRPRE86IHJlbmRlciBzaGlueSAvIGdsaXRjaGVkIGRpZmZlcmVudGx5XHJcbi8vIGh0dHBzOi8vYmxvZy5iaXRzcmMuaW8vcHVyZS1jc3MtdG8tbWFrZS1hLWJ1dHRvbi1zaGluZS1hbmQtZ2VudGx5LWNoYW5nZS1jb2xvcnMtb3Zlci10aW1lLTViNjg1ZDljNmE3ZVxyXG4vLyBodHRwczovL2NvZGVwZW4uaW8va2llcmFuZml2ZXN0YXJzL3Blbi9Nd21XUWJcclxuLy8gVE9ETzogZGlmZmVybnQgbW9kZXNcclxuLy8gIGFsbCBpbiBvbmUgaW52ZW50b3J5LCBzaG93IGVhY2ggYmFuayBzbG90IHdpdGggdGhlIGFiaWxpdHkgdG8gZHJhZyBhbmQgZHJvcCBhcm91bmRcclxuLy8gZ3JvdXAgaXRlbXMgYnkgdHlwZSwgY29sbGFwc2Ugc2FtZSBraW5kXHJcbi8vIGdyb3VwIGl0ZW1zIGJ5IGJhbmsgcGFjaywgY29sbGFwc2Ugc2FtZSBraW5kXHJcbi8vIHR5cGUgSW52ZW50b3J5TG9va3VwID0ge1xyXG4vLyAgICAgW1QgaW4gSXRlbU5hbWVdPzoge1xyXG4vLyAgICAgICBhbW91bnQ6IG51bWJlcjtcclxuLy8gICAgICAgbGV2ZWxzOiB7IFtUOiBudW1iZXJdOiB7IGFtb3VudDogbnVtYmVyOyBpbmRleGVzOiBudW1iZXJbXSB9IH07XHJcbi8vICAgICB9O1xyXG4vLyAgIH07XHJcbmNvbnN0IHR5cGVzID0ge1xyXG4gICAgaGVsbWV0OiBcIkhlbG1ldHNcIixcclxuICAgIGNoZXN0OiBcIkFybW9yc1wiLFxyXG4gICAgcGFudHM6IFwiUGFudHNcIixcclxuICAgIGdsb3ZlczogXCJHbG92ZXNcIixcclxuICAgIHNob2VzOiBcIlNob2VzXCIsXHJcbiAgICBjYXBlOiBcIkNhcGVzXCIsXHJcbiAgICByaW5nOiBcIlJpbmdzXCIsXHJcbiAgICBlYXJyaW5nOiBcIkVhcnJpbmdzXCIsXHJcbiAgICBhbXVsZXQ6IFwiQW11bGV0c1wiLFxyXG4gICAgYmVsdDogXCJCZWx0c1wiLFxyXG4gICAgb3JiOiBcIk9yYnNcIixcclxuICAgIHdlYXBvbjogXCJXZWFwb25zXCIsXHJcbiAgICBzaGllbGQ6IFwiU2hpZWxkc1wiLFxyXG4gICAgc291cmNlOiBcIk9mZmhhbmRzXCIsXHJcbiAgICBxdWl2ZXI6IFwiT2ZmaGFuZHNcIixcclxuICAgIG1pc2Nfb2ZmaGFuZDogXCJPZmZoYW5kc1wiLFxyXG4gICAgZWxpeGlyOiBcIkVsaXhpcnNcIixcclxuICAgIHBvdDogXCJQb3Rpb25zXCIsXHJcbiAgICBjc2Nyb2xsOiBcIlNjcm9sbHNcIixcclxuICAgIHVzY3JvbGw6IFwiU2Nyb2xsc1wiLFxyXG4gICAgcHNjcm9sbDogXCJTY3JvbGxzXCIsXHJcbiAgICBvZmZlcmluZzogXCJTY3JvbGxzXCIsXHJcbiAgICBtYXRlcmlhbDogXCJDcmFmdGluZyBhbmQgQ29sbGVjdGluZ1wiLFxyXG4gICAgZXhjaGFuZ2U6IFwiRXhjaGFuZ2VhYmxlc1wiLFxyXG4gICAgZHVuZ2Vvbl9rZXk6IFwiS2V5c1wiLFxyXG4gICAgdG9rZW46IFwiVG9rZW5zXCIsXHJcbiAgICBvdGhlcjogXCJPdGhlcnNcIixcclxufTtcclxuY2xhc3MgRW5oYW5jZWRCYW5rVUkge1xyXG4gICAgLyoqXHJcbiAgICAgKlxyXG4gICAgICovXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICAvLyBzdXBlcigpO1xyXG4gICAgICAgIC8vIFRPRE86IGxvYWQgc2V0dGluZyBmcm9tIGxvY2FsIHN0b3JhZ2VcclxuICAgICAgICAvLyBUT0RPOiBjYWNoZSBiYW5rIGludmVudG9yeSBhdCBhbiBpbnRlcnZhbCwgYmFzZWQgb24gc2V0dGluZ3NcclxuICAgICAgICAvLyBUT0RPOiBzdGFydCBpbnNpZGUgLyBvdXRzaWRlIGJhbmsgY2hlY2sgdG8gZW5hYmxlIC8gZGlzYWJsZSBidXR0b25cclxuICAgICAgICAvLyBUT0RPOiBjYWNoZSBiYW5rIHdoZW4gd2UgZW50ZXIgaXQuXHJcbiAgICAgICAgdGhpcy5ncm91cHMgPSB7fTtcclxuICAgICAgICBzZXRJbnRlcnZhbCgoKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0ICQgPSBwYXJlbnQuJDtcclxuICAgICAgICAgICAgY29uc3QgdHJjID0gJChcIiN0b3ByaWdodGNvcm5lclwiKTtcclxuICAgICAgICAgICAgY29uc3QgaWQgPSBcImJhbmtidXR0b25cIjtcclxuICAgICAgICAgICAgY29uc3QgYnV0dG9uID0gdHJjLmZpbmQoXCIjXCIgKyBpZCk7XHJcbiAgICAgICAgICAgIGlmIChjaGFyYWN0ZXIuYmFuaykge1xyXG4gICAgICAgICAgICAgICAgLy8gaW5zaWRlIGJhbmtcclxuICAgICAgICAgICAgICAgIGlmICghYnV0dG9uIHx8IGJ1dHRvbi5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0cmMucHJlcGVuZChgPGRpdiBpZD0nJHtpZH0nIGNsYXNzPSdnYW1lYnV0dG9uJyBvbmNsaWNrPSdwYXJlbnQuZW5oYW5jZWRfYmFua191aS5zaG93KCknIHRpdGxlPSdvcGVuIGVuaGFuY2VkIGJhbmsgb3ZlcnZpZXcnPkJBTks8L2Rpdj5gKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIG91dHNpZGUgYmFua1xyXG4gICAgICAgICAgICAgICAgaWYgKGJ1dHRvbiAmJiBidXR0b24ubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGJ1dHRvbi5yZW1vdmUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sIDEwMDApO1xyXG4gICAgfVxyXG4gICAgc2hvdygpIHtcclxuICAgICAgICBjb25zdCBpc0luQmFuayA9ICEhY2hhcmFjdGVyLmJhbms7XHJcbiAgICAgICAgY29uc3QgeyB0b3RhbEJhbmtTbG90cywgdG90YWxVc2VkQmFua1Nsb3RzLCB0b3RhbFVudXNlZEJhbmtTbG90cywgZ3JvdXBzIH0gPSB0aGlzLmdyb3VwQmFua0J5SXRlbSgpO1xyXG4gICAgICAgIHRoaXMuZ3JvdXBzID0gZ3JvdXBzO1xyXG4gICAgICAgIGNvbnN0IGNvbnRhaW5lciA9ICQoXCI8ZGl2PlwiLCB7XHJcbiAgICAgICAgICAgIHN0eWxlOiBcImJvcmRlcjogNXB4IHNvbGlkIGdyYXk7IGJhY2tncm91bmQtY29sb3I6IGJsYWNrOyBwYWRkaW5nOiAxMHB4OyB3aWR0aDogOTglXCIsXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY29uc3QgdGl0bGUgPSAkKFwiPGRpdiBzdHlsZT0nY29sb3I6ICNmMWMwNTQ7IGJvcmRlci1ib3R0b206IDJweCBkYXNoZWQgI0M3Q0FDQTsgbWFyZ2luLWJvdHRvbTogM3B4OyBtYXJnaW4tbGVmdDogM3B4OyBtYXJnaW4tcmlnaHQ6IDNweCcgY2xhc3M9J2Nib2xkJz5cIik7XHJcbiAgICAgICAgY29udGFpbmVyLmFwcGVuZCh0aXRsZSk7XHJcbiAgICAgICAgdGl0bGUuYXBwZW5kKFwiQmFua1wiKTtcclxuICAgICAgICAvLyBUT0RPOiB0aGUgc2VhcmNoIGJ1dHRvbiBzaG91bGQgdHJpZ2dlciBhIGNsZWFpbmcgb2YgYmFua0l0ZW1zQ29udGFpbmVyIGFuZCByZS1yZW5kZXIgdGhlIG5ldyBkYXRhXHJcbiAgICAgICAgY29uc3Qgc2VhcmNoQnV0dG9uID0gJChgPGlucHV0IHBsYWNlaG9sZGVyPSdwcmVzcyBlbnRlciB0byBzZWFyY2gnIG9uY2hhbmdlPSdlbmhhbmNlZF9iYW5rX3VpLnJlbmRlckJhbmtJdGVtcyh0aGlzLnZhbHVlKScgdmFsdWU9JyR7XCJcIn0nIC8+YCk7XHJcbiAgICAgICAgdGl0bGUuYXBwZW5kKHNlYXJjaEJ1dHRvbik7XHJcbiAgICAgICAgdGl0bGUuYXBwZW5kKGA8c3Bhbj4ke3RvdGFsVW51c2VkQmFua1Nsb3RzfSAvICR7dG90YWxCYW5rU2xvdHN9IGZyZWUgc2xvdHM8L3NwYW4+YCk7XHJcbiAgICAgICAgY29uc3QgYmFua0l0ZW1zQ29udGFpbmVyID0gJChcIjxkaXY+XCIsIHsgaWQ6IFwiYmFuay1pdGVtcy1jb250YWluZXJcIiB9KTtcclxuICAgICAgICBjb250YWluZXIuYXBwZW5kKGJhbmtJdGVtc0NvbnRhaW5lcik7XHJcbiAgICAgICAgLy8gdHJpZ2dlciByZW5kZXIgYWZ0ZXIgZWxlbWVudHMgZXhpc3QgaW4gdGhlIGRvbVxyXG4gICAgICAgIHRoaXMucmVuZGVyQmFua0l0ZW1zKHVuZGVmaW5lZCwgYmFua0l0ZW1zQ29udGFpbmVyKTtcclxuICAgICAgICAvLyBUT0RPOiBzaG91bGQgbm90IGJlIHJlbmRlcmVkIGFzIGEgbW9kYWwsIHdlIHdhbnQgdG8gYmUgYWJsZSB0byB1dGlsaXplIG91ciBwbGF5ZXIgaW52ZW50b3J5IGFzIHdlbGwgOnRoaW5raW5nOlxyXG4gICAgICAgIHBhcmVudC5zaG93X21vZGFsKGNvbnRhaW5lci53cmFwKFwiPGRpdi8+XCIpLnBhcmVudCgpLmh0bWwoKSwge1xyXG4gICAgICAgICAgICB3cmFwOiAhMSxcclxuICAgICAgICAgICAgaGlkZWluYmFja2dyb3VuZDogITAsXHJcbiAgICAgICAgICAgIHVybDogXCIvZG9jcy9ndWlkZS9hbGwvaXRlbXNcIixcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGZpbHRlcihzZWFyY2gpIHtcclxuICAgICAgICBjb25zdCByZXN1bHQgPSB7fTtcclxuICAgICAgICBmb3IgKGNvbnN0IGdyb3VwTmFtZSBpbiB0aGlzLmdyb3Vwcykge1xyXG4gICAgICAgICAgICBjb25zdCBncm91cCA9IHRoaXMuZ3JvdXBzW2dyb3VwTmFtZV07XHJcbiAgICAgICAgICAgIGxldCBpdGVtS2V5O1xyXG4gICAgICAgICAgICBmb3IgKGl0ZW1LZXkgaW4gZ3JvdXAuaXRlbXMpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGdJdGVtID0gRy5pdGVtc1tpdGVtS2V5XTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBncm91cC5pdGVtc1tpdGVtS2V5XTtcclxuICAgICAgICAgICAgICAgIGxldCBzaG91bGRBZGQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGlmIChzZWFyY2gpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpdGVtS2V5TWF0Y2hlcyA9IGl0ZW1LZXkuaW5kZXhPZihzZWFyY2gpID4gLTE7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbU5hbWVNYXRjaGVzID0gZ0l0ZW0gJiYgZ0l0ZW0ubmFtZS5pbmRleE9mKHNlYXJjaCkgPiAtMTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbUtleU1hdGNoZXMgfHwgaXRlbU5hbWVNYXRjaGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3VsZEFkZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2hvdWxkQWRkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChzaG91bGRBZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdFtncm91cE5hbWVdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdFtncm91cE5hbWVdID0geyBhbW91bnQ6IDAsIGl0ZW1zOiB7fSB9O1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICByZXN1bHRbZ3JvdXBOYW1lXS5pdGVtc1tpdGVtS2V5XSA9IGl0ZW07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuICAgIGdyb3VwQmFua0J5SXRlbSgpIHtcclxuICAgICAgICB2YXIgX2EsIF9iLCBfYywgX2Q7XHJcbiAgICAgICAgbGV0IHRvdGFsQmFua1Nsb3RzID0gMDtcclxuICAgICAgICBsZXQgdG90YWxVc2VkQmFua1Nsb3RzID0gMDtcclxuICAgICAgICBsZXQgdG90YWxVbnVzZWRCYW5rU2xvdHMgPSAwO1xyXG4gICAgICAgIC8vIFRPRE86IHR5cGUgdGhpc1xyXG4gICAgICAgIGNvbnN0IGdyb3VwcyA9IHt9O1xyXG4gICAgICAgIGxldCBwYWNrTmFtZTtcclxuICAgICAgICBmb3IgKHBhY2tOYW1lIGluIGNoYXJhY3Rlci5iYW5rKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHBhY2tJdGVtcyA9IGNoYXJhY3Rlci5iYW5rW3BhY2tOYW1lXTtcclxuICAgICAgICAgICAgdG90YWxCYW5rU2xvdHMgKz0gKF9hID0gcGFja0l0ZW1zLmxlbmd0aCkgIT09IG51bGwgJiYgX2EgIT09IHZvaWQgMCA/IF9hIDogMDtcclxuICAgICAgICAgICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IHBhY2tJdGVtcy5sZW5ndGg7IGluZGV4KyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW1JbmZvID0gcGFja0l0ZW1zW2luZGV4XTtcclxuICAgICAgICAgICAgICAgIGlmICghaXRlbUluZm8pIHtcclxuICAgICAgICAgICAgICAgICAgICB0b3RhbFVudXNlZEJhbmtTbG90cysrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY29uc3QgZ0l0ZW0gPSBHLml0ZW1zW2l0ZW1JbmZvLm5hbWVdO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbGV2ZWwgPSAoX2IgPSBpdGVtSW5mby5sZXZlbCkgIT09IG51bGwgJiYgX2IgIT09IHZvaWQgMCA/IF9iIDogMDtcclxuICAgICAgICAgICAgICAgIC8vIFRPRE86IHRyYW5zbGF0ZSB0eXBlIHRvIHJlYWRhYmxlIC8gY29tbW9uIG5hbWUgLyBvdGhlcnNcclxuICAgICAgICAgICAgICAgIC8vIFRPRE86IGdyb3VwIHdlYXBvbnMgYnkgc3VidHlwZT9cclxuICAgICAgICAgICAgICAgIGxldCB0eXBlID0gKF9jID0gdHlwZXNbZ0l0ZW0udHlwZV0pICE9PSBudWxsICYmIF9jICE9PSB2b2lkIDAgPyBfYyA6IFwiT3RoZXJzXCI7XHJcbiAgICAgICAgICAgICAgICBpZiAoZ0l0ZW0uZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPSAoX2QgPSB0eXBlc1tcImV4Y2hhbmdlXCJdKSAhPT0gbnVsbCAmJiBfZCAhPT0gdm9pZCAwID8gX2QgOiBcIk90aGVyc1wiO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbGV0IGl0ZW1CeVR5cGUgPSBncm91cHNbdHlwZV07XHJcbiAgICAgICAgICAgICAgICBpZiAoIWl0ZW1CeVR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtQnlUeXBlID0geyBhbW91bnQ6IDAsIGl0ZW1zOiB7fSB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGdyb3Vwc1t0eXBlXSA9IGl0ZW1CeVR5cGU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBsZXQgaXRlbURhdGEgPSBpdGVtQnlUeXBlLml0ZW1zW2l0ZW1JbmZvLm5hbWVdO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFpdGVtRGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1EYXRhID0geyBhbW91bnQ6IDAsIGxldmVsczoge30gfTtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtQnlUeXBlLml0ZW1zW2l0ZW1JbmZvLm5hbWVdID0gaXRlbURhdGE7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBsZXQgbGV2ZWxzID0gaXRlbURhdGEubGV2ZWxzW2xldmVsXTtcclxuICAgICAgICAgICAgICAgIGlmICghbGV2ZWxzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV2ZWxzID0geyBhbW91bnQ6IGl0ZW1JbmZvLnEgfHwgMSwgaW5kZXhlczogW1twYWNrTmFtZSwgaW5kZXhdXSB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1EYXRhLmxldmVsc1tsZXZlbF0gPSBsZXZlbHM7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtRGF0YS5hbW91bnQgKz0gaXRlbUluZm8ucSB8fCAxO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldmVscy5hbW91bnQgKz0gaXRlbUluZm8ucSB8fCAxO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldmVscy5pbmRleGVzLnB1c2goW3BhY2tOYW1lLCBpbmRleF0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdG90YWxVc2VkQmFua1Nsb3RzKys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHsgdG90YWxCYW5rU2xvdHMsIHRvdGFsVXNlZEJhbmtTbG90cywgdG90YWxVbnVzZWRCYW5rU2xvdHMsIGdyb3VwcyB9O1xyXG4gICAgfVxyXG4gICAgb25Nb3VzZURvd25CYW5rSXRlbShlLCBpdGVtS2V5LCBsZXZlbCkge1xyXG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgc3dpdGNoIChlLndoaWNoKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDM6IC8vIHJpZ2h0IGNsaWNrXHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gdGhpcy5ncm91cHMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZ3JvdXAgPSB0aGlzLmdyb3Vwc1trZXldO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpdGVtID0gZ3JvdXAuaXRlbXNbaXRlbUtleV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXRlbSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpdGVtQnlMZXZlbCA9IGl0ZW0ubGV2ZWxzW2xldmVsXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW1CeUxldmVsICYmIGl0ZW1CeUxldmVsLmluZGV4ZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgW3BhY2ssIGluZGV4XSA9IGl0ZW1CeUxldmVsLmluZGV4ZXMuc3BsaWNlKDAsIDEpWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVE9ETzogbG9vayB1cCBpdGVtIGFuZCBkZXRlcm1pbmUgaWYgaXQgaGFzIGEgcXVhbnRpdHkgdG8gc3Vic3RyYWN0IGluc3RlYWQgb2YgMVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbUJ5TGV2ZWwuYW1vdW50IC09IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbUJ5TGV2ZWwuaW5kZXhlcy5sZW5ndGggPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBpdGVtLmxldmVsc1tsZXZlbF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYmFua19yZXRyaWV2ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHlpZWxkIGJhbmtfcmV0cmlldmUocGFjaywgaW5kZXgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYmFua19yZXRyaWV2ZSBpcyBub3QgZGVmaW5lZCwgc2VlbXMgbGlrZSB3ZSBkb24ndCBoYXZlIGFjY2VzcyB0byB0aGUgY29kZSBmdW5jdGlvbnMgd2hlbiB3ZSBwYXN0ZSB0aGUgY29kZSBpbnRvIGRldiBjb25zb2xlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50LnNvY2tldC5lbWl0KFwiYmFua1wiLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZXJhdGlvbjogXCJzd2FwXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhY2s6IHBhY2ssXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0cjogaW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludjogLTEsIC8vIHRoZSBzZXJ2ZXIgaW50ZXJwcmV0cyAtMSBhcyBmaXJzdCBzbG90IGF2YWlsYWJsZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gVE9ETzogZ3JvdXBCYW5rQnlJdGVtIHNob3VsZCBiZSBjYWxsZWQgLyB1cGRhdGVkXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gVE9ETzogdGl0bGUgc2hvdWxkIGJlIHVwZGF0ZWQgd2l0aCBmcmVlIHNsb3QgY291bnRcclxuICAgICAgICAgICAgICAgICAgICAvLyBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcImdyb3VwQmFua0J5SXRlbSB0aW1lb3V0IHdpdGggcmVuZGVyIHN0YXJ0ZWRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gLy8gZGVsYXkgdG8gbGV0IHRoZSBlbWl0IGZpbmlzaFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnN0IHtcclxuICAgICAgICAgICAgICAgICAgICAvLyAgIHRvdGFsQmFua1Nsb3RzLFxyXG4gICAgICAgICAgICAgICAgICAgIC8vICAgdG90YWxVc2VkQmFua1Nsb3RzLFxyXG4gICAgICAgICAgICAgICAgICAgIC8vICAgdG90YWxVbnVzZWRCYW5rU2xvdHMsXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gICBncm91cHMsXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gfSA9IHRoaXMuZ3JvdXBCYW5rQnlJdGVtKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhpcy5ncm91cHMgPSBncm91cHM7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJCYW5rSXRlbXModGhpcy5zZWFyY2gpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFxyXG4gICAgICAgICAgICAgICAgICAgIC8vICAgXCJncm91cEJhbmtCeUl0ZW0gdGltZW91dCB3aXRoIHJlbmRlciBmaW5pc2hlZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIC8vICAgdGhpcy5ncm91cHNcclxuICAgICAgICAgICAgICAgICAgICAvLyApO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIH0sIDI1MCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudC5yZW5kZXJfaXRlbV9pbmZvKGl0ZW1LZXkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICByZW5kZXJCYW5rSXRlbXMoc2VhcmNoID0gXCJcIiwgYmFua0l0ZW1zQ29udGFpbmVyKSB7XHJcbiAgICAgICAgdmFyIF9hO1xyXG4gICAgICAgIHRoaXMuc2VhcmNoID0gc2VhcmNoO1xyXG4gICAgICAgIGJhbmtJdGVtc0NvbnRhaW5lciA9XHJcbiAgICAgICAgICAgIGJhbmtJdGVtc0NvbnRhaW5lciAhPT0gbnVsbCAmJiBiYW5rSXRlbXNDb250YWluZXIgIT09IHZvaWQgMCA/IGJhbmtJdGVtc0NvbnRhaW5lciA6IHBhcmVudC4kKFwiI2JhbmstaXRlbXMtY29udGFpbmVyXCIpO1xyXG4gICAgICAgIGlmIChiYW5rSXRlbXNDb250YWluZXIgJiYgYmFua0l0ZW1zQ29udGFpbmVyLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICBjb25zb2xlLndhcm4oXCIjYmFuay1pdGVtcy1jb250YWluZXIgY291bGQgbm90IGJlIGZvdW5kLCBjYW4ndCByZXJlbmRlciBkYXRhXCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoYmFua0l0ZW1zQ29udGFpbmVyICYmIGJhbmtJdGVtc0NvbnRhaW5lci5sZW5ndGggPT09IDEpIHtcclxuICAgICAgICAgICAgLy8gY2xlYXIgY29udGVudHNcclxuICAgICAgICAgICAgYmFua0l0ZW1zQ29udGFpbmVyLmh0bWwoXCJcIik7XHJcbiAgICAgICAgICAgIGNvbnN0IGdyb3VwcyA9IHRoaXMuZmlsdGVyKHNlYXJjaCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHNvcnRlZEdyb3VwS2V5cyA9IFsuLi5uZXcgU2V0KE9iamVjdC52YWx1ZXModHlwZXMpKV07IC8vLnNvcnQoKGEsIGIpID0+IGEubG9jYWxlQ29tcGFyZShiKSk7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbVR5cGUgb2Ygc29ydGVkR3JvdXBLZXlzKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtc0J5VHlwZSA9IGdyb3Vwc1tpdGVtVHlwZV07XHJcbiAgICAgICAgICAgICAgICBpZiAoIWl0ZW1zQnlUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtVHlwZUNvbnRhaW5lciA9ICQoXCI8ZGl2IHN0eWxlPSdmbG9hdDpsZWZ0OyBtYXJnaW4tbGVmdDo1cHg7Jz5cIik7XHJcbiAgICAgICAgICAgICAgICBpdGVtVHlwZUNvbnRhaW5lci5hcHBlbmQoYDxkaXYgY2xhc3M9J2dhbWVidXR0b24gZ2FtZWJ1dHRvbi1zbWFsbCcgc3R5bGU9J21hcmdpbi1ib3R0b206IDVweCc+JHtpdGVtVHlwZX08L2Rpdj5gKTtcclxuICAgICAgICAgICAgICAgIGJhbmtJdGVtc0NvbnRhaW5lci5hcHBlbmQoaXRlbVR5cGVDb250YWluZXIpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbXNDb250YWluZXIgPSAkKFwiPGRpdiBzdHlsZT0nbWFyZ2luLWJvdHRvbTogMTBweCc+XCIpO1xyXG4gICAgICAgICAgICAgICAgaXRlbVR5cGVDb250YWluZXIuYXBwZW5kKGl0ZW1zQ29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgIC8vIGxvb3AgaXRlbXNcclxuICAgICAgICAgICAgICAgIGxldCBpdGVtS2V5O1xyXG4gICAgICAgICAgICAgICAgZm9yIChpdGVtS2V5IGluIGl0ZW1zQnlUeXBlLml0ZW1zKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZ0l0ZW0gPSBHLml0ZW1zW2l0ZW1LZXldO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgYW1vdW50LCBsZXZlbHMgfSA9IChfYSA9IGl0ZW1zQnlUeXBlLml0ZW1zW2l0ZW1LZXldKSAhPT0gbnVsbCAmJiBfYSAhPT0gdm9pZCAwID8gX2EgOiB7fTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBUT0RPOiBpdGVyYXRlIGJhY2t3YXJkcz9cclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGxldmVsIGluIGxldmVscykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gbGV2ZWxzW051bWJlcihsZXZlbCldO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmYWtlSXRlbUluZm8gPSB7IG5hbWU6IGl0ZW1LZXkgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKE51bWJlcihsZXZlbCkgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmYWtlSXRlbUluZm8ubGV2ZWwgPSBOdW1iZXIobGV2ZWwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLmFtb3VudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmFrZUl0ZW1JbmZvLnEgPSBkYXRhLmFtb3VudDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUT0RPOiBhZGQgaXRlbV9jb250YWluZXIgdG8gdHlwZXNcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbUNvbnRhaW5lciA9ICQocGFyZW50Lml0ZW1fY29udGFpbmVyKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNraW46IGdJdGVtLnNraW4sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBvbmNsaWNrOiBcInJlbmRlcl9pdGVtX2luZm8oJ1wiICsgaXRlbUtleSArIFwiJylcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgZmFrZUl0ZW1JbmZvKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YWNrU2l6ZSA9IE51bWJlcihnSXRlbS5zKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhY2tDb3VudCA9IGRhdGEuaW5kZXhlcy5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG9wdGltYWxTdGFja0NvdW50ID0gZGF0YS5hbW91bnQgLyBzdGFja1NpemU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG9wdGltYVN0YWNrQ291bnRNZXNzYWdlID0gc3RhY2tDb3VudCA+IG9wdGltYWxTdGFja0NvdW50ID8gYOKaoO+4jyR7b3B0aW1hbFN0YWNrQ291bnR9YCA6IFwiXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1Db250YWluZXIuYXR0cihcInRpdGxlXCIsIGAke3N0YWNrQ291bnR9IHN0YWNrcyAke29wdGltYVN0YWNrQ291bnRNZXNzYWdlfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBoYW5kbGUgbGVmdCBhbmQgcmlnaHQgY2xpY2tcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbUNvbnRhaW5lci5hdHRyKFwib25tb3VzZWRvd25cIiwgYGVuaGFuY2VkX2JhbmtfdWkub25Nb3VzZURvd25CYW5rSXRlbShldmVudCwgJyR7aXRlbUtleX0nLCAke2xldmVsfSlgKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbGV2ZWwgY29udGFpbmVyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGxldmVsRWxlbWVudCA9IGl0ZW1Db250YWluZXIuZmluZChcIi5pdXVpXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXZlbEVsZW1lbnQuY3NzKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvbnRTaXplOiBcIjE2cHhcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZpbmQgcXVhbnRpdHkgaW4gaXRlbSBjb250YWluZXIgYW5kIG1ha2UgaXQgcHJldHR5XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvdW50RWxlbWVudCA9IGl0ZW1Db250YWluZXIuZmluZChcIi5pcXVpXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudEVsZW1lbnQuY3NzKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvbnRTaXplOiBcIjE2cHhcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvdW50ID0gTnVtYmVyKGNvdW50RWxlbWVudC50ZXh0KCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcmV0dHlDb3VudCA9ICgwLCB1dGlsc18xLmFiYnJldmlhdGVOdW1iZXIpKGNvdW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByZXR0eUNvdW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3VudEVsZW1lbnQuaHRtbChwcmV0dHlDb3VudC50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtc0NvbnRhaW5lci5hcHBlbmQoaXRlbUNvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJhbmtJdGVtc0NvbnRhaW5lci5hcHBlbmQoXCI8ZGl2IHN0eWxlPSdjbGVhcjpib3RoOyc+XCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG4vLyBUT0RPOiBoYW5kbGUgcmVsb2FkaW5nIGNvZGUsIHdlIG1pZ2h0IG5lZWQgdG8gZGVzdHJveSB0aGUgcHJldmlvdXMgVUlcclxucGFyZW50LmVuaGFuY2VkX2JhbmtfdWkgPSBuZXcgRW5oYW5jZWRCYW5rVUkoKTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuZXhwb3J0cy5hYmJyZXZpYXRlTnVtYmVyID0gdm9pZCAwO1xyXG4vLyBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL2EvNDA3MjQzNTQvMjgxNDVcclxuZnVuY3Rpb24gYWJicmV2aWF0ZU51bWJlcihudW1iZXIpIHtcclxuICAgIGNvbnN0IFNJX1NZTUJPTCA9IFtcIlwiLCBcImtcIiwgXCJNXCIsIFwiR1wiLCBcIlRcIiwgXCJQXCIsIFwiRVwiXTtcclxuICAgIGlmICghbnVtYmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bWJlcjtcclxuICAgIH1cclxuICAgIC8vIHdoYXQgdGllcj8gKGRldGVybWluZXMgU0kgc3ltYm9sKVxyXG4gICAgY29uc3QgdGllciA9IChNYXRoLmxvZzEwKE1hdGguYWJzKG51bWJlcikpIC8gMykgfCAwO1xyXG4gICAgLy8gaWYgemVybywgd2UgZG9uJ3QgbmVlZCBhIHN1ZmZpeFxyXG4gICAgaWYgKHRpZXIgPT09IDApXHJcbiAgICAgICAgcmV0dXJuIG51bWJlcjtcclxuICAgIC8vIGdldCBzdWZmaXggYW5kIGRldGVybWluZSBzY2FsZVxyXG4gICAgY29uc3Qgc3VmZml4ID0gU0lfU1lNQk9MW3RpZXJdO1xyXG4gICAgY29uc3Qgc2NhbGUgPSBNYXRoLnBvdygxMCwgdGllciAqIDMpO1xyXG4gICAgLy8gc2NhbGUgdGhlIG51bWJlclxyXG4gICAgY29uc3Qgc2NhbGVkID0gbnVtYmVyIC8gc2NhbGU7XHJcbiAgICAvLyBmb3JtYXQgbnVtYmVyIGFuZCBhZGQgc3VmZml4XHJcbiAgICAvLyAgIHJldHVybiBzY2FsZWQudG9GaXhlZCgxKSArIHN1ZmZpeDtcclxuICAgIHJldHVybiAoc2NhbGVkLnRvTG9jYWxlU3RyaW5nKHVuZGVmaW5lZCwge1xyXG4gICAgICAgIG1pbmltdW1GcmFjdGlvbkRpZ2l0czogMSxcclxuICAgICAgICBtYXhpbXVtRnJhY3Rpb25EaWdpdHM6IDEsXHJcbiAgICB9KSArIHN1ZmZpeCk7XHJcbn1cclxuZXhwb3J0cy5hYmJyZXZpYXRlTnVtYmVyID0gYWJicmV2aWF0ZU51bWJlcjtcclxuIiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIiIsIi8vIHN0YXJ0dXBcbi8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuLy8gVGhpcyBlbnRyeSBtb2R1bGUgaXMgcmVmZXJlbmNlZCBieSBvdGhlciBtb2R1bGVzIHNvIGl0IGNhbid0IGJlIGlubGluZWRcbnZhciBfX3dlYnBhY2tfZXhwb3J0c19fID0gX193ZWJwYWNrX3JlcXVpcmVfXyhcIi4vc3JjL2JhbmsudHNcIik7XG4iLCIiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=