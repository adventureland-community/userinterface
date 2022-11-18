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
                            // if (itemByLevel.indexes.length <= 0) {
                            //   delete item.levels[level];
                            // }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esd0VBQXdFO0FBQ3hFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxRUFBcUUsZ0JBQWdCO0FBQ3JGLGdIQUFnSCxTQUFTO0FBQ3pIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsNEJBQTRCLGlCQUFpQjtBQUM3QztBQUNBO0FBQ0E7QUFDQSwrQ0FBK0M7QUFDL0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx5QkFBeUI7QUFDekI7QUFDQSwwR0FBMEcsUUFBUSxLQUFLLE1BQU07QUFDN0g7QUFDQTtBQUNBO0FBQ0E7QUFDQSx5QkFBeUI7QUFDekI7QUFDQTtBQUNBO0FBQ0E7QUFDQSx5QkFBeUI7QUFDekI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsOERBQThEO0FBQzlEO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7OztBQ3pVYTtBQUNiLDhDQUE2QyxFQUFFLGFBQWEsRUFBQztBQUM3RCx3QkFBd0I7QUFDeEI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0Esd0JBQXdCOzs7Ozs7O1VDMUJ4QjtVQUNBOztVQUVBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBOztVQUVBO1VBQ0E7O1VBRUE7VUFDQTtVQUNBOzs7O1VFdEJBO1VBQ0E7VUFDQTtVQUNBIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vaW52ZW50b3J5LWVuaGFuY2VtZW50cy8uL3NyYy9iYW5rLnRzIiwid2VicGFjazovL2ludmVudG9yeS1lbmhhbmNlbWVudHMvLi9zcmMvdXRpbHMudHMiLCJ3ZWJwYWNrOi8vaW52ZW50b3J5LWVuaGFuY2VtZW50cy93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly9pbnZlbnRvcnktZW5oYW5jZW1lbnRzL3dlYnBhY2svYmVmb3JlLXN0YXJ0dXAiLCJ3ZWJwYWNrOi8vaW52ZW50b3J5LWVuaGFuY2VtZW50cy93ZWJwYWNrL3N0YXJ0dXAiLCJ3ZWJwYWNrOi8vaW52ZW50b3J5LWVuaGFuY2VtZW50cy93ZWJwYWNrL2FmdGVyLXN0YXJ0dXAiXSwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XHJcbi8vIG5weCB0c2MgLi9zcmMvdWkvaW52ZW50b3J5LWVuaGFuY2VtZW50cy50cyAtLXRhcmdldCBlc25leHQgLS1tb2R1bGUgYW1kIC0tb3V0RmlsZSBcIi4vc3JjL3VpL2ludmVudG9yeS1lbmhhbmNlbWVudHMuanNcIlxyXG4vLyBwYXJlbnQuZW5oYW5jZWRfYmFua191aS5zaG93KClcclxudmFyIF9fYXdhaXRlciA9ICh0aGlzICYmIHRoaXMuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XHJcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cclxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxyXG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcclxuICAgIH0pO1xyXG59O1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmNvbnN0IHV0aWxzXzEgPSByZXF1aXJlKFwiLi91dGlsc1wiKTtcclxuLy8gVE9ETzogcmVuZGVyIEFMTCBpdGVtcyBmcm9tIHRoZSBiYW5rIHdoZW4gaW4gdGhlIGJhbmtcclxuLy8gVE9ETzogYSB0b2dnbGUgYnV0dG9uIHRvIGNvbWJpbmUgaXRlbSBzbG90cyBvciBub3QuXHJcbi8vIFRPRE86IGEgdG9nZ2xlIGJ1dHRvbiB0byBjb21iaW5lIGVtcHR5IGl0ZW0gc2xvdHMgb3Igbm90LlxyXG4vLyBUT0RPOiBzaG91bGQgYmUgc2VhcmNoYWJsZSAoYWxwaGEgYmxlbmQgbm9uIHZhbGlkIHJlc3VsdHMgdG8gc2VldHJvdWdoLilcclxuLy8gVE9ETzogYW4gZXh0cmEgZmllbGQgc2hvd2luZyBhbGwgdGhlIHRlbGxlcnMgd2l0aCB0aGUgYWJpbGl0eSBvZiBwcmVzc2luZyBcImdvdG9cIiB0aGUgdGVsbGVycyBwb3NpdGlvbi5cclxuLy8gVE9ETzogc29tZWhvdyB2YWxpZGF0ZSBpZiB5b3UgaGF2ZSB1bmxvY2tlZCB0aGUgYWRkaXRpb25hbCBiYW5rIGxldmVscy5cclxuLy8gVE9ETzogYSB0b2dnbGUgdG8gZ3JvdXAgaXRlbXMgYnkgdGhlaXIgZ3JvdXAuXHJcbi8vIFRPRE86IGNhY2hlIHRoZSBiYW5rIGl0ZW1zIHNvIHlvdSBjYW4gdmlldyB0aGVtIHdoZW4gYXdheS5cclxuLy8gVE9ETzogYSBidXR0b24gdG8gc29ydFxyXG4vLyBUT0RPOiBjb25maWd1cmFibGUgc29ydGluZyBydWxlcy5cclxuLy8gVE9ETzogZGVzaWduYXRlIGNlcnRhaW4gaXRlbXMgdG8gY2VydGFpbiB0ZWxsZXJzLlxyXG4vL1RPRE86IGNsaWNrIHRvIHRyYW5zZmVyIGl0ZW1zIHRvIGNoYXJhY3RlclxyXG4vL1RPRE86IGEgc2VhcmNoIGZpZWxkIHJlZHVjaW5nIHRoZSB2aWV3XHJcbi8vVE9ETzogc2hvd2luZyBhbW91bnQgb2YgZW1wdHkgc2xvdHMgbGVmdFxyXG4vL1RPRE86IGEgYnV0dG9uIHRvIG9wZW4gdGhlIG92ZXJ2aWV3IHZpc2libGUgd2hlbiBpbnNpZGUgdGhlIGJhbmtcclxuLy9UT0RPOiBwZXJoYXBzIGFuIGFiaWxpdHkgdG8gZ3JvdXAgaXQgYnkgbnBjIHRlbGxlciBpbnN0ZWFkIG9mIGl0ZW0gdHlwZXNcclxuLy8gVE9ETzogcmVuZGVyIHNoaW55IC8gZ2xpdGNoZWQgZGlmZmVyZW50bHlcclxuLy8gaHR0cHM6Ly9ibG9nLmJpdHNyYy5pby9wdXJlLWNzcy10by1tYWtlLWEtYnV0dG9uLXNoaW5lLWFuZC1nZW50bHktY2hhbmdlLWNvbG9ycy1vdmVyLXRpbWUtNWI2ODVkOWM2YTdlXHJcbi8vIGh0dHBzOi8vY29kZXBlbi5pby9raWVyYW5maXZlc3RhcnMvcGVuL013bVdRYlxyXG4vLyBUT0RPOiBkaWZmZXJudCBtb2Rlc1xyXG4vLyAgYWxsIGluIG9uZSBpbnZlbnRvcnksIHNob3cgZWFjaCBiYW5rIHNsb3Qgd2l0aCB0aGUgYWJpbGl0eSB0byBkcmFnIGFuZCBkcm9wIGFyb3VuZFxyXG4vLyBncm91cCBpdGVtcyBieSB0eXBlLCBjb2xsYXBzZSBzYW1lIGtpbmRcclxuLy8gZ3JvdXAgaXRlbXMgYnkgYmFuayBwYWNrLCBjb2xsYXBzZSBzYW1lIGtpbmRcclxuLy8gdHlwZSBJbnZlbnRvcnlMb29rdXAgPSB7XHJcbi8vICAgICBbVCBpbiBJdGVtTmFtZV0/OiB7XHJcbi8vICAgICAgIGFtb3VudDogbnVtYmVyO1xyXG4vLyAgICAgICBsZXZlbHM6IHsgW1Q6IG51bWJlcl06IHsgYW1vdW50OiBudW1iZXI7IGluZGV4ZXM6IG51bWJlcltdIH0gfTtcclxuLy8gICAgIH07XHJcbi8vICAgfTtcclxuY29uc3QgdHlwZXMgPSB7XHJcbiAgICBoZWxtZXQ6IFwiSGVsbWV0c1wiLFxyXG4gICAgY2hlc3Q6IFwiQXJtb3JzXCIsXHJcbiAgICBwYW50czogXCJQYW50c1wiLFxyXG4gICAgZ2xvdmVzOiBcIkdsb3Zlc1wiLFxyXG4gICAgc2hvZXM6IFwiU2hvZXNcIixcclxuICAgIGNhcGU6IFwiQ2FwZXNcIixcclxuICAgIHJpbmc6IFwiUmluZ3NcIixcclxuICAgIGVhcnJpbmc6IFwiRWFycmluZ3NcIixcclxuICAgIGFtdWxldDogXCJBbXVsZXRzXCIsXHJcbiAgICBiZWx0OiBcIkJlbHRzXCIsXHJcbiAgICBvcmI6IFwiT3Jic1wiLFxyXG4gICAgd2VhcG9uOiBcIldlYXBvbnNcIixcclxuICAgIHNoaWVsZDogXCJTaGllbGRzXCIsXHJcbiAgICBzb3VyY2U6IFwiT2ZmaGFuZHNcIixcclxuICAgIHF1aXZlcjogXCJPZmZoYW5kc1wiLFxyXG4gICAgbWlzY19vZmZoYW5kOiBcIk9mZmhhbmRzXCIsXHJcbiAgICBlbGl4aXI6IFwiRWxpeGlyc1wiLFxyXG4gICAgcG90OiBcIlBvdGlvbnNcIixcclxuICAgIGNzY3JvbGw6IFwiU2Nyb2xsc1wiLFxyXG4gICAgdXNjcm9sbDogXCJTY3JvbGxzXCIsXHJcbiAgICBwc2Nyb2xsOiBcIlNjcm9sbHNcIixcclxuICAgIG9mZmVyaW5nOiBcIlNjcm9sbHNcIixcclxuICAgIG1hdGVyaWFsOiBcIkNyYWZ0aW5nIGFuZCBDb2xsZWN0aW5nXCIsXHJcbiAgICBleGNoYW5nZTogXCJFeGNoYW5nZWFibGVzXCIsXHJcbn07XHJcbmNsYXNzIEVuaGFuY2VkQmFua1VJIHtcclxuICAgIC8qKlxyXG4gICAgICpcclxuICAgICAqL1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgLy8gc3VwZXIoKTtcclxuICAgICAgICAvLyBUT0RPOiBsb2FkIHNldHRpbmcgZnJvbSBsb2NhbCBzdG9yYWdlXHJcbiAgICAgICAgLy8gVE9ETzogY2FjaGUgYmFuayBpbnZlbnRvcnkgYXQgYW4gaW50ZXJ2YWwsIGJhc2VkIG9uIHNldHRpbmdzXHJcbiAgICAgICAgLy8gVE9ETzogc3RhcnQgaW5zaWRlIC8gb3V0c2lkZSBiYW5rIGNoZWNrIHRvIGVuYWJsZSAvIGRpc2FibGUgYnV0dG9uXHJcbiAgICAgICAgLy8gVE9ETzogY2FjaGUgYmFuayB3aGVuIHdlIGVudGVyIGl0LlxyXG4gICAgICAgIHRoaXMuZ3JvdXBzID0ge307XHJcbiAgICAgICAgc2V0SW50ZXJ2YWwoKCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCAkID0gcGFyZW50LiQ7XHJcbiAgICAgICAgICAgIGNvbnN0IHRyYyA9ICQoXCIjdG9wcmlnaHRjb3JuZXJcIik7XHJcbiAgICAgICAgICAgIGNvbnN0IGlkID0gXCJiYW5rYnV0dG9uXCI7XHJcbiAgICAgICAgICAgIGNvbnN0IGJ1dHRvbiA9IHRyYy5maW5kKFwiI1wiICsgaWQpO1xyXG4gICAgICAgICAgICBpZiAoY2hhcmFjdGVyLmJhbmspIHtcclxuICAgICAgICAgICAgICAgIC8vIGluc2lkZSBiYW5rXHJcbiAgICAgICAgICAgICAgICBpZiAoIWJ1dHRvbiB8fCBidXR0b24ubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJjLnByZXBlbmQoYDxkaXYgaWQ9JyR7aWR9JyBjbGFzcz0nZ2FtZWJ1dHRvbicgb25jbGljaz0ncGFyZW50LmVuaGFuY2VkX2JhbmtfdWkuc2hvdygpJyB0aXRsZT0nb3BlbiBlbmhhbmNlZCBiYW5rIG92ZXJ2aWV3Jz5CQU5LPC9kaXY+YCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBvdXRzaWRlIGJhbmtcclxuICAgICAgICAgICAgICAgIGlmIChidXR0b24gJiYgYnV0dG9uLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBidXR0b24ucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LCAxMDAwKTtcclxuICAgIH1cclxuICAgIHNob3coKSB7XHJcbiAgICAgICAgY29uc3QgaXNJbkJhbmsgPSAhIWNoYXJhY3Rlci5iYW5rO1xyXG4gICAgICAgIGNvbnN0IHsgdG90YWxCYW5rU2xvdHMsIHRvdGFsVXNlZEJhbmtTbG90cywgdG90YWxVbnVzZWRCYW5rU2xvdHMsIGdyb3VwcyB9ID0gdGhpcy5ncm91cEJhbmtCeUl0ZW0oKTtcclxuICAgICAgICB0aGlzLmdyb3VwcyA9IGdyb3VwcztcclxuICAgICAgICBjb25zdCBjb250YWluZXIgPSAkKFwiPGRpdj5cIiwge1xyXG4gICAgICAgICAgICBzdHlsZTogXCJib3JkZXI6IDVweCBzb2xpZCBncmF5OyBiYWNrZ3JvdW5kLWNvbG9yOiBibGFjazsgcGFkZGluZzogMTBweDsgd2lkdGg6IDk4JVwiLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGNvbnN0IHRpdGxlID0gJChcIjxkaXYgc3R5bGU9J2NvbG9yOiAjZjFjMDU0OyBib3JkZXItYm90dG9tOiAycHggZGFzaGVkICNDN0NBQ0E7IG1hcmdpbi1ib3R0b206IDNweDsgbWFyZ2luLWxlZnQ6IDNweDsgbWFyZ2luLXJpZ2h0OiAzcHgnIGNsYXNzPSdjYm9sZCc+XCIpO1xyXG4gICAgICAgIGNvbnRhaW5lci5hcHBlbmQodGl0bGUpO1xyXG4gICAgICAgIHRpdGxlLmFwcGVuZChcIkJhbmtcIik7XHJcbiAgICAgICAgLy8gVE9ETzogdGhlIHNlYXJjaCBidXR0b24gc2hvdWxkIHRyaWdnZXIgYSBjbGVhaW5nIG9mIGJhbmtJdGVtc0NvbnRhaW5lciBhbmQgcmUtcmVuZGVyIHRoZSBuZXcgZGF0YVxyXG4gICAgICAgIGNvbnN0IHNlYXJjaEJ1dHRvbiA9ICQoYDxpbnB1dCBwbGFjZWhvbGRlcj0ncHJlc3MgZW50ZXIgdG8gc2VhcmNoJyBvbmNoYW5nZT0nZW5oYW5jZWRfYmFua191aS5yZW5kZXJCYW5rSXRlbXModGhpcy52YWx1ZSknIHZhbHVlPScke1wiXCJ9JyAvPmApO1xyXG4gICAgICAgIHRpdGxlLmFwcGVuZChzZWFyY2hCdXR0b24pO1xyXG4gICAgICAgIHRpdGxlLmFwcGVuZChgPHNwYW4+JHt0b3RhbFVudXNlZEJhbmtTbG90c30gLyAke3RvdGFsQmFua1Nsb3RzfSBmcmVlIHNsb3RzPC9zcGFuPmApO1xyXG4gICAgICAgIGNvbnN0IGJhbmtJdGVtc0NvbnRhaW5lciA9ICQoXCI8ZGl2PlwiLCB7IGlkOiBcImJhbmstaXRlbXMtY29udGFpbmVyXCIgfSk7XHJcbiAgICAgICAgY29udGFpbmVyLmFwcGVuZChiYW5rSXRlbXNDb250YWluZXIpO1xyXG4gICAgICAgIC8vIHRyaWdnZXIgcmVuZGVyIGFmdGVyIGVsZW1lbnRzIGV4aXN0IGluIHRoZSBkb21cclxuICAgICAgICB0aGlzLnJlbmRlckJhbmtJdGVtcyh1bmRlZmluZWQsIGJhbmtJdGVtc0NvbnRhaW5lcik7XHJcbiAgICAgICAgLy8gVE9ETzogc2hvdWxkIG5vdCBiZSByZW5kZXJlZCBhcyBhIG1vZGFsLCB3ZSB3YW50IHRvIGJlIGFibGUgdG8gdXRpbGl6ZSBvdXIgcGxheWVyIGludmVudG9yeSBhcyB3ZWxsIDp0aGlua2luZzpcclxuICAgICAgICBwYXJlbnQuc2hvd19tb2RhbChjb250YWluZXIud3JhcChcIjxkaXYvPlwiKS5wYXJlbnQoKS5odG1sKCksIHtcclxuICAgICAgICAgICAgd3JhcDogITEsXHJcbiAgICAgICAgICAgIGhpZGVpbmJhY2tncm91bmQ6ICEwLFxyXG4gICAgICAgICAgICB1cmw6IFwiL2RvY3MvZ3VpZGUvYWxsL2l0ZW1zXCIsXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBmaWx0ZXIoc2VhcmNoKSB7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0ID0ge307XHJcbiAgICAgICAgZm9yIChjb25zdCBncm91cE5hbWUgaW4gdGhpcy5ncm91cHMpIHtcclxuICAgICAgICAgICAgY29uc3QgZ3JvdXAgPSB0aGlzLmdyb3Vwc1tncm91cE5hbWVdO1xyXG4gICAgICAgICAgICBsZXQgaXRlbUtleTtcclxuICAgICAgICAgICAgZm9yIChpdGVtS2V5IGluIGdyb3VwLml0ZW1zKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBnSXRlbSA9IEcuaXRlbXNbaXRlbUtleV07XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtID0gZ3JvdXAuaXRlbXNbaXRlbUtleV07XHJcbiAgICAgICAgICAgICAgICBsZXQgc2hvdWxkQWRkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBpZiAoc2VhcmNoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbUtleU1hdGNoZXMgPSBpdGVtS2V5LmluZGV4T2Yoc2VhcmNoKSA+IC0xO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW1OYW1lTWF0Y2hlcyA9IGdJdGVtICYmIGdJdGVtLm5hbWUuaW5kZXhPZihzZWFyY2gpID4gLTE7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW1LZXlNYXRjaGVzIHx8IGl0ZW1OYW1lTWF0Y2hlcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzaG91bGRBZGQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHNob3VsZEFkZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoc2hvdWxkQWRkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXN1bHRbZ3JvdXBOYW1lXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRbZ3JvdXBOYW1lXSA9IHsgYW1vdW50OiAwLCBpdGVtczoge30gfTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0W2dyb3VwTmFtZV0uaXRlbXNbaXRlbUtleV0gPSBpdGVtO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcbiAgICBncm91cEJhbmtCeUl0ZW0oKSB7XHJcbiAgICAgICAgdmFyIF9hLCBfYiwgX2MsIF9kO1xyXG4gICAgICAgIGxldCB0b3RhbEJhbmtTbG90cyA9IDA7XHJcbiAgICAgICAgbGV0IHRvdGFsVXNlZEJhbmtTbG90cyA9IDA7XHJcbiAgICAgICAgbGV0IHRvdGFsVW51c2VkQmFua1Nsb3RzID0gMDtcclxuICAgICAgICAvLyBUT0RPOiB0eXBlIHRoaXNcclxuICAgICAgICBjb25zdCBncm91cHMgPSB7fTtcclxuICAgICAgICBsZXQgcGFja05hbWU7XHJcbiAgICAgICAgZm9yIChwYWNrTmFtZSBpbiBjaGFyYWN0ZXIuYmFuaykge1xyXG4gICAgICAgICAgICBjb25zdCBwYWNrSXRlbXMgPSBjaGFyYWN0ZXIuYmFua1twYWNrTmFtZV07XHJcbiAgICAgICAgICAgIHRvdGFsQmFua1Nsb3RzICs9IChfYSA9IHBhY2tJdGVtcy5sZW5ndGgpICE9PSBudWxsICYmIF9hICE9PSB2b2lkIDAgPyBfYSA6IDA7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBwYWNrSXRlbXMubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtSW5mbyA9IHBhY2tJdGVtc1tpbmRleF07XHJcbiAgICAgICAgICAgICAgICBpZiAoIWl0ZW1JbmZvKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxVbnVzZWRCYW5rU2xvdHMrKztcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNvbnN0IGdJdGVtID0gRy5pdGVtc1tpdGVtSW5mby5uYW1lXTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGxldmVsID0gKF9iID0gaXRlbUluZm8ubGV2ZWwpICE9PSBudWxsICYmIF9iICE9PSB2b2lkIDAgPyBfYiA6IDA7XHJcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiB0cmFuc2xhdGUgdHlwZSB0byByZWFkYWJsZSAvIGNvbW1vbiBuYW1lIC8gb3RoZXJzXHJcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiBncm91cCB3ZWFwb25zIGJ5IHN1YnR5cGU/XHJcbiAgICAgICAgICAgICAgICBsZXQgdHlwZSA9IChfYyA9IHR5cGVzW2dJdGVtLnR5cGVdKSAhPT0gbnVsbCAmJiBfYyAhPT0gdm9pZCAwID8gX2MgOiBcIk90aGVyc1wiO1xyXG4gICAgICAgICAgICAgICAgaWYgKGdJdGVtLmUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlID0gKF9kID0gdHlwZXNbXCJleGNoYW5nZVwiXSkgIT09IG51bGwgJiYgX2QgIT09IHZvaWQgMCA/IF9kIDogXCJPdGhlcnNcIjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGxldCBpdGVtQnlUeXBlID0gZ3JvdXBzW3R5cGVdO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFpdGVtQnlUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbUJ5VHlwZSA9IHsgYW1vdW50OiAwLCBpdGVtczoge30gfTtcclxuICAgICAgICAgICAgICAgICAgICBncm91cHNbdHlwZV0gPSBpdGVtQnlUeXBlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbGV0IGl0ZW1EYXRhID0gaXRlbUJ5VHlwZS5pdGVtc1tpdGVtSW5mby5uYW1lXTtcclxuICAgICAgICAgICAgICAgIGlmICghaXRlbURhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtRGF0YSA9IHsgYW1vdW50OiAwLCBsZXZlbHM6IHt9IH07XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbUJ5VHlwZS5pdGVtc1tpdGVtSW5mby5uYW1lXSA9IGl0ZW1EYXRhO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbGV0IGxldmVscyA9IGl0ZW1EYXRhLmxldmVsc1tsZXZlbF07XHJcbiAgICAgICAgICAgICAgICBpZiAoIWxldmVscykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldmVscyA9IHsgYW1vdW50OiBpdGVtSW5mby5xIHx8IDEsIGluZGV4ZXM6IFtbcGFja05hbWUsIGluZGV4XV0gfTtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtRGF0YS5sZXZlbHNbbGV2ZWxdID0gbGV2ZWxzO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbURhdGEuYW1vdW50ICs9IGl0ZW1JbmZvLnEgfHwgMTtcclxuICAgICAgICAgICAgICAgICAgICBsZXZlbHMuYW1vdW50ICs9IGl0ZW1JbmZvLnEgfHwgMTtcclxuICAgICAgICAgICAgICAgICAgICBsZXZlbHMuaW5kZXhlcy5wdXNoKFtwYWNrTmFtZSwgaW5kZXhdKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRvdGFsVXNlZEJhbmtTbG90cysrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB7IHRvdGFsQmFua1Nsb3RzLCB0b3RhbFVzZWRCYW5rU2xvdHMsIHRvdGFsVW51c2VkQmFua1Nsb3RzLCBncm91cHMgfTtcclxuICAgIH1cclxuICAgIG9uTW91c2VEb3duQmFua0l0ZW0oZSwgaXRlbUtleSwgbGV2ZWwpIHtcclxuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIHN3aXRjaCAoZS53aGljaCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAzOiAvLyByaWdodCBjbGlja1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IGluIHRoaXMuZ3JvdXBzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGdyb3VwID0gdGhpcy5ncm91cHNba2V5XTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbSA9IGdyb3VwLml0ZW1zW2l0ZW1LZXldO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWl0ZW0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbUJ5TGV2ZWwgPSBpdGVtLmxldmVsc1tsZXZlbF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtQnlMZXZlbCAmJiBpdGVtQnlMZXZlbC5pbmRleGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IFtwYWNrLCBpbmRleF0gPSBpdGVtQnlMZXZlbC5pbmRleGVzLnNwbGljZSgwLCAxKVswXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRPRE86IGxvb2sgdXAgaXRlbSBhbmQgZGV0ZXJtaW5lIGlmIGl0IGhhcyBhIHF1YW50aXR5IHRvIHN1YnN0cmFjdCBpbnN0ZWFkIG9mIDFcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1CeUxldmVsLmFtb3VudCAtPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaWYgKGl0ZW1CeUxldmVsLmluZGV4ZXMubGVuZ3RoIDw9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgZGVsZXRlIGl0ZW0ubGV2ZWxzW2xldmVsXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChiYW5rX3JldHJpZXZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeWllbGQgYmFua19yZXRyaWV2ZShwYWNrLCBpbmRleCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBiYW5rX3JldHJpZXZlIGlzIG5vdCBkZWZpbmVkLCBzZWVtcyBsaWtlIHdlIGRvbid0IGhhdmUgYWNjZXNzIHRvIHRoZSBjb2RlIGZ1bmN0aW9ucyB3aGVuIHdlIHBhc3RlIHRoZSBjb2RlIGludG8gZGV2IGNvbnNvbGVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQuc29ja2V0LmVtaXQoXCJiYW5rXCIsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlcmF0aW9uOiBcInN3YXBcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFjazogcGFjayxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyOiBpbmRleCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW52OiAtMSwgLy8gdGhlIHNlcnZlciBpbnRlcnByZXRzIC0xIGFzIGZpcnN0IHNsb3QgYXZhaWxhYmxlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAvLyBUT0RPOiBncm91cEJhbmtCeUl0ZW0gc2hvdWxkIGJlIGNhbGxlZCAvIHVwZGF0ZWRcclxuICAgICAgICAgICAgICAgICAgICAvLyBUT0RPOiB0aXRsZSBzaG91bGQgYmUgdXBkYXRlZCB3aXRoIGZyZWUgc2xvdCBjb3VudFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiZ3JvdXBCYW5rQnlJdGVtIHRpbWVvdXQgd2l0aCByZW5kZXIgc3RhcnRlZFwiKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyAvLyBkZWxheSB0byBsZXQgdGhlIGVtaXQgZmluaXNoXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc3Qge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vICAgdG90YWxCYW5rU2xvdHMsXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gICB0b3RhbFVzZWRCYW5rU2xvdHMsXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gICB0b3RhbFVudXNlZEJhbmtTbG90cyxcclxuICAgICAgICAgICAgICAgICAgICAvLyAgIGdyb3VwcyxcclxuICAgICAgICAgICAgICAgICAgICAvLyB9ID0gdGhpcy5ncm91cEJhbmtCeUl0ZW0oKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyB0aGlzLmdyb3VwcyA9IGdyb3VwcztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlckJhbmtJdGVtcyh0aGlzLnNlYXJjaCk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gICBcImdyb3VwQmFua0J5SXRlbSB0aW1lb3V0IHdpdGggcmVuZGVyIGZpbmlzaGVkXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gICB0aGlzLmdyb3Vwc1xyXG4gICAgICAgICAgICAgICAgICAgIC8vICk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gfSwgMjUwKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50LnJlbmRlcl9pdGVtX2luZm8oaXRlbUtleSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHJlbmRlckJhbmtJdGVtcyhzZWFyY2ggPSBcIlwiLCBiYW5rSXRlbXNDb250YWluZXIpIHtcclxuICAgICAgICB2YXIgX2E7XHJcbiAgICAgICAgdGhpcy5zZWFyY2ggPSBzZWFyY2g7XHJcbiAgICAgICAgYmFua0l0ZW1zQ29udGFpbmVyID1cclxuICAgICAgICAgICAgYmFua0l0ZW1zQ29udGFpbmVyICE9PSBudWxsICYmIGJhbmtJdGVtc0NvbnRhaW5lciAhPT0gdm9pZCAwID8gYmFua0l0ZW1zQ29udGFpbmVyIDogcGFyZW50LiQoXCIjYmFuay1pdGVtcy1jb250YWluZXJcIik7XHJcbiAgICAgICAgaWYgKGJhbmtJdGVtc0NvbnRhaW5lciAmJiBiYW5rSXRlbXNDb250YWluZXIubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihcIiNiYW5rLWl0ZW1zLWNvbnRhaW5lciBjb3VsZCBub3QgYmUgZm91bmQsIGNhbid0IHJlcmVuZGVyIGRhdGFcIik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChiYW5rSXRlbXNDb250YWluZXIgJiYgYmFua0l0ZW1zQ29udGFpbmVyLmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICAgICAgICAvLyBjbGVhciBjb250ZW50c1xyXG4gICAgICAgICAgICBiYW5rSXRlbXNDb250YWluZXIuaHRtbChcIlwiKTtcclxuICAgICAgICAgICAgY29uc3QgZ3JvdXBzID0gdGhpcy5maWx0ZXIoc2VhcmNoKTtcclxuICAgICAgICAgICAgY29uc3Qgc29ydGVkR3JvdXBLZXlzID0gWy4uLm5ldyBTZXQoT2JqZWN0LnZhbHVlcyh0eXBlcykpXTsgLy8uc29ydCgoYSwgYikgPT4gYS5sb2NhbGVDb21wYXJlKGIpKTtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtVHlwZSBvZiBzb3J0ZWRHcm91cEtleXMpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW1zQnlUeXBlID0gZ3JvdXBzW2l0ZW1UeXBlXTtcclxuICAgICAgICAgICAgICAgIGlmICghaXRlbXNCeVR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW1UeXBlQ29udGFpbmVyID0gJChcIjxkaXYgc3R5bGU9J2Zsb2F0OmxlZnQ7IG1hcmdpbi1sZWZ0OjVweDsnPlwiKTtcclxuICAgICAgICAgICAgICAgIGl0ZW1UeXBlQ29udGFpbmVyLmFwcGVuZChgPGRpdiBjbGFzcz0nZ2FtZWJ1dHRvbiBnYW1lYnV0dG9uLXNtYWxsJyBzdHlsZT0nbWFyZ2luLWJvdHRvbTogNXB4Jz4ke2l0ZW1UeXBlfTwvZGl2PmApO1xyXG4gICAgICAgICAgICAgICAgYmFua0l0ZW1zQ29udGFpbmVyLmFwcGVuZChpdGVtVHlwZUNvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtc0NvbnRhaW5lciA9ICQoXCI8ZGl2IHN0eWxlPSdtYXJnaW4tYm90dG9tOiAxMHB4Jz5cIik7XHJcbiAgICAgICAgICAgICAgICBpdGVtVHlwZUNvbnRhaW5lci5hcHBlbmQoaXRlbXNDb250YWluZXIpO1xyXG4gICAgICAgICAgICAgICAgLy8gbG9vcCBpdGVtc1xyXG4gICAgICAgICAgICAgICAgbGV0IGl0ZW1LZXk7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGl0ZW1LZXkgaW4gaXRlbXNCeVR5cGUuaXRlbXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBnSXRlbSA9IEcuaXRlbXNbaXRlbUtleV07XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBhbW91bnQsIGxldmVscyB9ID0gKF9hID0gaXRlbXNCeVR5cGUuaXRlbXNbaXRlbUtleV0pICE9PSBudWxsICYmIF9hICE9PSB2b2lkIDAgPyBfYSA6IHt9O1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRPRE86IGl0ZXJhdGUgYmFja3dhcmRzP1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgbGV2ZWwgaW4gbGV2ZWxzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBsZXZlbHNbTnVtYmVyKGxldmVsKV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZha2VJdGVtSW5mbyA9IHsgbmFtZTogaXRlbUtleSB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoTnVtYmVyKGxldmVsKSA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZha2VJdGVtSW5mby5sZXZlbCA9IE51bWJlcihsZXZlbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuYW1vdW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmYWtlSXRlbUluZm8ucSA9IGRhdGEuYW1vdW50O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRPRE86IGFkZCBpdGVtX2NvbnRhaW5lciB0byB0eXBlc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpdGVtQ29udGFpbmVyID0gJChwYXJlbnQuaXRlbV9jb250YWluZXIoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2tpbjogZ0l0ZW0uc2tpbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9uY2xpY2s6IFwicmVuZGVyX2l0ZW1faW5mbygnXCIgKyBpdGVtS2V5ICsgXCInKVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LCBmYWtlSXRlbUluZm8pKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaGFuZGxlIGxlZnQgYW5kIHJpZ2h0IGNsaWNrXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1Db250YWluZXIuYXR0cihcIm9ubW91c2Vkb3duXCIsIGBlbmhhbmNlZF9iYW5rX3VpLm9uTW91c2VEb3duQmFua0l0ZW0oZXZlbnQsICcke2l0ZW1LZXl9JywgJHtsZXZlbH0pYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxldmVsIGNvbnRhaW5lclxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBsZXZlbEVsZW1lbnQgPSBpdGVtQ29udGFpbmVyLmZpbmQoXCIuaXV1aVwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV2ZWxFbGVtZW50LmNzcyh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb250U2l6ZTogXCIxNnB4XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBmaW5kIHF1YW50aXR5IGluIGl0ZW0gY29udGFpbmVyIGFuZCBtYWtlIGl0IHByZXR0eVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb3VudEVsZW1lbnQgPSBpdGVtQ29udGFpbmVyLmZpbmQoXCIuaXF1aVwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY291bnRFbGVtZW50LmNzcyh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb250U2l6ZTogXCIxNnB4XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb3VudCA9IE51bWJlcihjb3VudEVsZW1lbnQudGV4dCgpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJldHR5Q291bnQgPSAoMCwgdXRpbHNfMS5hYmJyZXZpYXRlTnVtYmVyKShjb3VudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcmV0dHlDb3VudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY291bnRFbGVtZW50Lmh0bWwocHJldHR5Q291bnQudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXNDb250YWluZXIuYXBwZW5kKGl0ZW1Db250YWluZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBiYW5rSXRlbXNDb250YWluZXIuYXBwZW5kKFwiPGRpdiBzdHlsZT0nY2xlYXI6Ym90aDsnPlwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxucGFyZW50LmVuaGFuY2VkX2JhbmtfdWkgPSBuZXcgRW5oYW5jZWRCYW5rVUkoKTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuZXhwb3J0cy5hYmJyZXZpYXRlTnVtYmVyID0gdm9pZCAwO1xyXG4vLyBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL2EvNDA3MjQzNTQvMjgxNDVcclxuZnVuY3Rpb24gYWJicmV2aWF0ZU51bWJlcihudW1iZXIpIHtcclxuICAgIGNvbnN0IFNJX1NZTUJPTCA9IFtcIlwiLCBcImtcIiwgXCJNXCIsIFwiR1wiLCBcIlRcIiwgXCJQXCIsIFwiRVwiXTtcclxuICAgIGlmICghbnVtYmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bWJlcjtcclxuICAgIH1cclxuICAgIC8vIHdoYXQgdGllcj8gKGRldGVybWluZXMgU0kgc3ltYm9sKVxyXG4gICAgY29uc3QgdGllciA9IChNYXRoLmxvZzEwKE1hdGguYWJzKG51bWJlcikpIC8gMykgfCAwO1xyXG4gICAgLy8gaWYgemVybywgd2UgZG9uJ3QgbmVlZCBhIHN1ZmZpeFxyXG4gICAgaWYgKHRpZXIgPT09IDApXHJcbiAgICAgICAgcmV0dXJuIG51bWJlcjtcclxuICAgIC8vIGdldCBzdWZmaXggYW5kIGRldGVybWluZSBzY2FsZVxyXG4gICAgY29uc3Qgc3VmZml4ID0gU0lfU1lNQk9MW3RpZXJdO1xyXG4gICAgY29uc3Qgc2NhbGUgPSBNYXRoLnBvdygxMCwgdGllciAqIDMpO1xyXG4gICAgLy8gc2NhbGUgdGhlIG51bWJlclxyXG4gICAgY29uc3Qgc2NhbGVkID0gbnVtYmVyIC8gc2NhbGU7XHJcbiAgICAvLyBmb3JtYXQgbnVtYmVyIGFuZCBhZGQgc3VmZml4XHJcbiAgICAvLyAgIHJldHVybiBzY2FsZWQudG9GaXhlZCgxKSArIHN1ZmZpeDtcclxuICAgIHJldHVybiAoc2NhbGVkLnRvTG9jYWxlU3RyaW5nKHVuZGVmaW5lZCwge1xyXG4gICAgICAgIG1pbmltdW1GcmFjdGlvbkRpZ2l0czogMSxcclxuICAgICAgICBtYXhpbXVtRnJhY3Rpb25EaWdpdHM6IDEsXHJcbiAgICB9KSArIHN1ZmZpeCk7XHJcbn1cclxuZXhwb3J0cy5hYmJyZXZpYXRlTnVtYmVyID0gYWJicmV2aWF0ZU51bWJlcjtcclxuIiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIiIsIi8vIHN0YXJ0dXBcbi8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuLy8gVGhpcyBlbnRyeSBtb2R1bGUgaXMgcmVmZXJlbmNlZCBieSBvdGhlciBtb2R1bGVzIHNvIGl0IGNhbid0IGJlIGlubGluZWRcbnZhciBfX3dlYnBhY2tfZXhwb3J0c19fID0gX193ZWJwYWNrX3JlcXVpcmVfXyhcIi4vc3JjL2JhbmsudHNcIik7XG4iLCIiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=