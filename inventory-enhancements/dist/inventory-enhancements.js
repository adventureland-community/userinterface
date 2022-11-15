/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

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
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;
/*!*********************!*\
  !*** ./src/bank.ts ***!
  \*********************/

// npx tsc ./src/ui/inventory-enhancements.ts --target esnext --module amd --outFile "./src/ui/inventory-enhancements.js"
// parent.enhanced_bank_ui.show()
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
    renderBankItems(search = "", bankItemsContainer) {
        var _a;
        console.log(search);
        bankItemsContainer = bankItemsContainer !== null && bankItemsContainer !== void 0 ? bankItemsContainer : $("#bank-items-container");
        if (bankItemsContainer) {
            // // reset modal margin
            // bankItemsContainer.parent().parent().css({
            //   marginTop: "5px",
            // });
            // clear contents
            bankItemsContainer.html("");
            const groups = this.filter(search);
            // console.log(
            //   "bank slots",
            //   totalBankSlots,
            //   totalUsedBankSlots,
            //   totalUnusedBankSlots
            // );
            // console.log(groups);
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
                            onclick: "render_item_info('" + itemKey + "')",
                        }, fakeItemInfo));
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

})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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Q0E7QUFDQTtBQUNBO0FBQ0EseUJBQXlCO0FBQ3pCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EseUJBQXlCO0FBQ3pCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EseUJBQXlCO0FBQ3pCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDhEQUE4RDtBQUM5RDtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXMiOlsid2VicGFjazovL2ludmVudG9yeS1lbmhhbmNlbWVudHMvLi9zcmMvdXRpbHMudHMiLCJ3ZWJwYWNrOi8vaW52ZW50b3J5LWVuaGFuY2VtZW50cy93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly9pbnZlbnRvcnktZW5oYW5jZW1lbnRzLy4vc3JjL2JhbmsudHMiXSwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuZXhwb3J0cy5hYmJyZXZpYXRlTnVtYmVyID0gdm9pZCAwO1xyXG4vLyBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL2EvNDA3MjQzNTQvMjgxNDVcclxuZnVuY3Rpb24gYWJicmV2aWF0ZU51bWJlcihudW1iZXIpIHtcclxuICAgIGNvbnN0IFNJX1NZTUJPTCA9IFtcIlwiLCBcImtcIiwgXCJNXCIsIFwiR1wiLCBcIlRcIiwgXCJQXCIsIFwiRVwiXTtcclxuICAgIGlmICghbnVtYmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bWJlcjtcclxuICAgIH1cclxuICAgIC8vIHdoYXQgdGllcj8gKGRldGVybWluZXMgU0kgc3ltYm9sKVxyXG4gICAgY29uc3QgdGllciA9IChNYXRoLmxvZzEwKE1hdGguYWJzKG51bWJlcikpIC8gMykgfCAwO1xyXG4gICAgLy8gaWYgemVybywgd2UgZG9uJ3QgbmVlZCBhIHN1ZmZpeFxyXG4gICAgaWYgKHRpZXIgPT09IDApXHJcbiAgICAgICAgcmV0dXJuIG51bWJlcjtcclxuICAgIC8vIGdldCBzdWZmaXggYW5kIGRldGVybWluZSBzY2FsZVxyXG4gICAgY29uc3Qgc3VmZml4ID0gU0lfU1lNQk9MW3RpZXJdO1xyXG4gICAgY29uc3Qgc2NhbGUgPSBNYXRoLnBvdygxMCwgdGllciAqIDMpO1xyXG4gICAgLy8gc2NhbGUgdGhlIG51bWJlclxyXG4gICAgY29uc3Qgc2NhbGVkID0gbnVtYmVyIC8gc2NhbGU7XHJcbiAgICAvLyBmb3JtYXQgbnVtYmVyIGFuZCBhZGQgc3VmZml4XHJcbiAgICAvLyAgIHJldHVybiBzY2FsZWQudG9GaXhlZCgxKSArIHN1ZmZpeDtcclxuICAgIHJldHVybiAoc2NhbGVkLnRvTG9jYWxlU3RyaW5nKHVuZGVmaW5lZCwge1xyXG4gICAgICAgIG1pbmltdW1GcmFjdGlvbkRpZ2l0czogMSxcclxuICAgICAgICBtYXhpbXVtRnJhY3Rpb25EaWdpdHM6IDEsXHJcbiAgICB9KSArIHN1ZmZpeCk7XHJcbn1cclxuZXhwb3J0cy5hYmJyZXZpYXRlTnVtYmVyID0gYWJicmV2aWF0ZU51bWJlcjtcclxuIiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXShtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIlwidXNlIHN0cmljdFwiO1xyXG4vLyBucHggdHNjIC4vc3JjL3VpL2ludmVudG9yeS1lbmhhbmNlbWVudHMudHMgLS10YXJnZXQgZXNuZXh0IC0tbW9kdWxlIGFtZCAtLW91dEZpbGUgXCIuL3NyYy91aS9pbnZlbnRvcnktZW5oYW5jZW1lbnRzLmpzXCJcclxuLy8gcGFyZW50LmVuaGFuY2VkX2JhbmtfdWkuc2hvdygpXHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgdXRpbHNfMSA9IHJlcXVpcmUoXCIuL3V0aWxzXCIpO1xyXG4vLyBUT0RPOiByZW5kZXIgQUxMIGl0ZW1zIGZyb20gdGhlIGJhbmsgd2hlbiBpbiB0aGUgYmFua1xyXG4vLyBUT0RPOiBhIHRvZ2dsZSBidXR0b24gdG8gY29tYmluZSBpdGVtIHNsb3RzIG9yIG5vdC5cclxuLy8gVE9ETzogYSB0b2dnbGUgYnV0dG9uIHRvIGNvbWJpbmUgZW1wdHkgaXRlbSBzbG90cyBvciBub3QuXHJcbi8vIFRPRE86IHNob3VsZCBiZSBzZWFyY2hhYmxlIChhbHBoYSBibGVuZCBub24gdmFsaWQgcmVzdWx0cyB0byBzZWV0cm91Z2guKVxyXG4vLyBUT0RPOiBhbiBleHRyYSBmaWVsZCBzaG93aW5nIGFsbCB0aGUgdGVsbGVycyB3aXRoIHRoZSBhYmlsaXR5IG9mIHByZXNzaW5nIFwiZ290b1wiIHRoZSB0ZWxsZXJzIHBvc2l0aW9uLlxyXG4vLyBUT0RPOiBzb21laG93IHZhbGlkYXRlIGlmIHlvdSBoYXZlIHVubG9ja2VkIHRoZSBhZGRpdGlvbmFsIGJhbmsgbGV2ZWxzLlxyXG4vLyBUT0RPOiBhIHRvZ2dsZSB0byBncm91cCBpdGVtcyBieSB0aGVpciBncm91cC5cclxuLy8gVE9ETzogY2FjaGUgdGhlIGJhbmsgaXRlbXMgc28geW91IGNhbiB2aWV3IHRoZW0gd2hlbiBhd2F5LlxyXG4vLyBUT0RPOiBhIGJ1dHRvbiB0byBzb3J0XHJcbi8vIFRPRE86IGNvbmZpZ3VyYWJsZSBzb3J0aW5nIHJ1bGVzLlxyXG4vLyBUT0RPOiBkZXNpZ25hdGUgY2VydGFpbiBpdGVtcyB0byBjZXJ0YWluIHRlbGxlcnMuXHJcbi8vVE9ETzogY2xpY2sgdG8gdHJhbnNmZXIgaXRlbXMgdG8gY2hhcmFjdGVyXHJcbi8vVE9ETzogYSBzZWFyY2ggZmllbGQgcmVkdWNpbmcgdGhlIHZpZXdcclxuLy9UT0RPOiBzaG93aW5nIGFtb3VudCBvZiBlbXB0eSBzbG90cyBsZWZ0XHJcbi8vVE9ETzogYSBidXR0b24gdG8gb3BlbiB0aGUgb3ZlcnZpZXcgdmlzaWJsZSB3aGVuIGluc2lkZSB0aGUgYmFua1xyXG4vL1RPRE86IHBlcmhhcHMgYW4gYWJpbGl0eSB0byBncm91cCBpdCBieSBucGMgdGVsbGVyIGluc3RlYWQgb2YgaXRlbSB0eXBlc1xyXG4vLyBUT0RPOiByZW5kZXIgc2hpbnkgLyBnbGl0Y2hlZCBkaWZmZXJlbnRseVxyXG4vLyBodHRwczovL2Jsb2cuYml0c3JjLmlvL3B1cmUtY3NzLXRvLW1ha2UtYS1idXR0b24tc2hpbmUtYW5kLWdlbnRseS1jaGFuZ2UtY29sb3JzLW92ZXItdGltZS01YjY4NWQ5YzZhN2VcclxuLy8gaHR0cHM6Ly9jb2RlcGVuLmlvL2tpZXJhbmZpdmVzdGFycy9wZW4vTXdtV1FiXHJcbi8vIFRPRE86IGRpZmZlcm50IG1vZGVzXHJcbi8vICBhbGwgaW4gb25lIGludmVudG9yeSwgc2hvdyBlYWNoIGJhbmsgc2xvdCB3aXRoIHRoZSBhYmlsaXR5IHRvIGRyYWcgYW5kIGRyb3AgYXJvdW5kXHJcbi8vIGdyb3VwIGl0ZW1zIGJ5IHR5cGUsIGNvbGxhcHNlIHNhbWUga2luZFxyXG4vLyBncm91cCBpdGVtcyBieSBiYW5rIHBhY2ssIGNvbGxhcHNlIHNhbWUga2luZFxyXG4vLyB0eXBlIEludmVudG9yeUxvb2t1cCA9IHtcclxuLy8gICAgIFtUIGluIEl0ZW1OYW1lXT86IHtcclxuLy8gICAgICAgYW1vdW50OiBudW1iZXI7XHJcbi8vICAgICAgIGxldmVsczogeyBbVDogbnVtYmVyXTogeyBhbW91bnQ6IG51bWJlcjsgaW5kZXhlczogbnVtYmVyW10gfSB9O1xyXG4vLyAgICAgfTtcclxuLy8gICB9O1xyXG5jb25zdCB0eXBlcyA9IHtcclxuICAgIGhlbG1ldDogXCJIZWxtZXRzXCIsXHJcbiAgICBjaGVzdDogXCJBcm1vcnNcIixcclxuICAgIHBhbnRzOiBcIlBhbnRzXCIsXHJcbiAgICBnbG92ZXM6IFwiR2xvdmVzXCIsXHJcbiAgICBzaG9lczogXCJTaG9lc1wiLFxyXG4gICAgY2FwZTogXCJDYXBlc1wiLFxyXG4gICAgcmluZzogXCJSaW5nc1wiLFxyXG4gICAgZWFycmluZzogXCJFYXJyaW5nc1wiLFxyXG4gICAgYW11bGV0OiBcIkFtdWxldHNcIixcclxuICAgIGJlbHQ6IFwiQmVsdHNcIixcclxuICAgIG9yYjogXCJPcmJzXCIsXHJcbiAgICB3ZWFwb246IFwiV2VhcG9uc1wiLFxyXG4gICAgc2hpZWxkOiBcIlNoaWVsZHNcIixcclxuICAgIHNvdXJjZTogXCJPZmZoYW5kc1wiLFxyXG4gICAgcXVpdmVyOiBcIk9mZmhhbmRzXCIsXHJcbiAgICBtaXNjX29mZmhhbmQ6IFwiT2ZmaGFuZHNcIixcclxuICAgIGVsaXhpcjogXCJFbGl4aXJzXCIsXHJcbiAgICBwb3Q6IFwiUG90aW9uc1wiLFxyXG4gICAgY3Njcm9sbDogXCJTY3JvbGxzXCIsXHJcbiAgICB1c2Nyb2xsOiBcIlNjcm9sbHNcIixcclxuICAgIHBzY3JvbGw6IFwiU2Nyb2xsc1wiLFxyXG4gICAgb2ZmZXJpbmc6IFwiU2Nyb2xsc1wiLFxyXG4gICAgbWF0ZXJpYWw6IFwiQ3JhZnRpbmcgYW5kIENvbGxlY3RpbmdcIixcclxuICAgIGV4Y2hhbmdlOiBcIkV4Y2hhbmdlYWJsZXNcIixcclxufTtcclxuY2xhc3MgRW5oYW5jZWRCYW5rVUkge1xyXG4gICAgLyoqXHJcbiAgICAgKlxyXG4gICAgICovXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICAvLyBzdXBlcigpO1xyXG4gICAgICAgIC8vIFRPRE86IGxvYWQgc2V0dGluZyBmcm9tIGxvY2FsIHN0b3JhZ2VcclxuICAgICAgICAvLyBUT0RPOiBjYWNoZSBiYW5rIGludmVudG9yeSBhdCBhbiBpbnRlcnZhbCwgYmFzZWQgb24gc2V0dGluZ3NcclxuICAgICAgICAvLyBUT0RPOiBzdGFydCBpbnNpZGUgLyBvdXRzaWRlIGJhbmsgY2hlY2sgdG8gZW5hYmxlIC8gZGlzYWJsZSBidXR0b25cclxuICAgICAgICAvLyBUT0RPOiBjYWNoZSBiYW5rIHdoZW4gd2UgZW50ZXIgaXQuXHJcbiAgICAgICAgdGhpcy5ncm91cHMgPSB7fTtcclxuICAgIH1cclxuICAgIHNob3coKSB7XHJcbiAgICAgICAgY29uc3QgaXNJbkJhbmsgPSAhIWNoYXJhY3Rlci5iYW5rO1xyXG4gICAgICAgIGNvbnN0IHsgdG90YWxCYW5rU2xvdHMsIHRvdGFsVXNlZEJhbmtTbG90cywgdG90YWxVbnVzZWRCYW5rU2xvdHMsIGdyb3VwcyB9ID0gdGhpcy5ncm91cEJhbmtCeUl0ZW0oKTtcclxuICAgICAgICB0aGlzLmdyb3VwcyA9IGdyb3VwcztcclxuICAgICAgICBjb25zdCBjb250YWluZXIgPSAkKFwiPGRpdj5cIiwge1xyXG4gICAgICAgICAgICBzdHlsZTogXCJib3JkZXI6IDVweCBzb2xpZCBncmF5OyBiYWNrZ3JvdW5kLWNvbG9yOiBibGFjazsgcGFkZGluZzogMTBweDsgd2lkdGg6IDk4JVwiLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGNvbnN0IHRpdGxlID0gJChcIjxkaXYgc3R5bGU9J2NvbG9yOiAjZjFjMDU0OyBib3JkZXItYm90dG9tOiAycHggZGFzaGVkICNDN0NBQ0E7IG1hcmdpbi1ib3R0b206IDNweDsgbWFyZ2luLWxlZnQ6IDNweDsgbWFyZ2luLXJpZ2h0OiAzcHgnIGNsYXNzPSdjYm9sZCc+XCIpO1xyXG4gICAgICAgIGNvbnRhaW5lci5hcHBlbmQodGl0bGUpO1xyXG4gICAgICAgIHRpdGxlLmFwcGVuZChcIkJhbmtcIik7XHJcbiAgICAgICAgLy8gVE9ETzogdGhlIHNlYXJjaCBidXR0b24gc2hvdWxkIHRyaWdnZXIgYSBjbGVhaW5nIG9mIGJhbmtJdGVtc0NvbnRhaW5lciBhbmQgcmUtcmVuZGVyIHRoZSBuZXcgZGF0YVxyXG4gICAgICAgIGNvbnN0IHNlYXJjaEJ1dHRvbiA9ICQoYDxpbnB1dCBwbGFjZWhvbGRlcj0ncHJlc3MgZW50ZXIgdG8gc2VhcmNoJyBvbmNoYW5nZT0nZW5oYW5jZWRfYmFua191aS5yZW5kZXJCYW5rSXRlbXModGhpcy52YWx1ZSknIHZhbHVlPScke1wiXCJ9JyAvPmApO1xyXG4gICAgICAgIHRpdGxlLmFwcGVuZChzZWFyY2hCdXR0b24pO1xyXG4gICAgICAgIHRpdGxlLmFwcGVuZChgPHNwYW4+JHt0b3RhbFVudXNlZEJhbmtTbG90c30gLyAke3RvdGFsQmFua1Nsb3RzfSBmcmVlIHNsb3RzPC9zcGFuPmApO1xyXG4gICAgICAgIGNvbnN0IGJhbmtJdGVtc0NvbnRhaW5lciA9ICQoXCI8ZGl2PlwiLCB7IGlkOiBcImJhbmstaXRlbXMtY29udGFpbmVyXCIgfSk7XHJcbiAgICAgICAgY29udGFpbmVyLmFwcGVuZChiYW5rSXRlbXNDb250YWluZXIpO1xyXG4gICAgICAgIC8vIHRyaWdnZXIgcmVuZGVyIGFmdGVyIGVsZW1lbnRzIGV4aXN0IGluIHRoZSBkb21cclxuICAgICAgICB0aGlzLnJlbmRlckJhbmtJdGVtcyh1bmRlZmluZWQsIGJhbmtJdGVtc0NvbnRhaW5lcik7XHJcbiAgICAgICAgLy8gVE9ETzogc2hvdWxkIG5vdCBiZSByZW5kZXJlZCBhcyBhIG1vZGFsLCB3ZSB3YW50IHRvIGJlIGFibGUgdG8gdXRpbGl6ZSBvdXIgcGxheWVyIGludmVudG9yeSBhcyB3ZWxsIDp0aGlua2luZzpcclxuICAgICAgICBwYXJlbnQuc2hvd19tb2RhbChjb250YWluZXIud3JhcChcIjxkaXYvPlwiKS5wYXJlbnQoKS5odG1sKCksIHtcclxuICAgICAgICAgICAgd3JhcDogITEsXHJcbiAgICAgICAgICAgIGhpZGVpbmJhY2tncm91bmQ6ICEwLFxyXG4gICAgICAgICAgICB1cmw6IFwiL2RvY3MvZ3VpZGUvYWxsL2l0ZW1zXCIsXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBmaWx0ZXIoc2VhcmNoKSB7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0ID0ge307XHJcbiAgICAgICAgZm9yIChjb25zdCBncm91cE5hbWUgaW4gdGhpcy5ncm91cHMpIHtcclxuICAgICAgICAgICAgY29uc3QgZ3JvdXAgPSB0aGlzLmdyb3Vwc1tncm91cE5hbWVdO1xyXG4gICAgICAgICAgICBsZXQgaXRlbUtleTtcclxuICAgICAgICAgICAgZm9yIChpdGVtS2V5IGluIGdyb3VwLml0ZW1zKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBnSXRlbSA9IEcuaXRlbXNbaXRlbUtleV07XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtID0gZ3JvdXAuaXRlbXNbaXRlbUtleV07XHJcbiAgICAgICAgICAgICAgICBsZXQgc2hvdWxkQWRkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBpZiAoc2VhcmNoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbUtleU1hdGNoZXMgPSBpdGVtS2V5LmluZGV4T2Yoc2VhcmNoKSA+IC0xO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW1OYW1lTWF0Y2hlcyA9IGdJdGVtICYmIGdJdGVtLm5hbWUuaW5kZXhPZihzZWFyY2gpID4gLTE7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW1LZXlNYXRjaGVzIHx8IGl0ZW1OYW1lTWF0Y2hlcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzaG91bGRBZGQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHNob3VsZEFkZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoc2hvdWxkQWRkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXN1bHRbZ3JvdXBOYW1lXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRbZ3JvdXBOYW1lXSA9IHsgYW1vdW50OiAwLCBpdGVtczoge30gfTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0W2dyb3VwTmFtZV0uaXRlbXNbaXRlbUtleV0gPSBpdGVtO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcbiAgICBncm91cEJhbmtCeUl0ZW0oKSB7XHJcbiAgICAgICAgdmFyIF9hLCBfYiwgX2MsIF9kO1xyXG4gICAgICAgIGxldCB0b3RhbEJhbmtTbG90cyA9IDA7XHJcbiAgICAgICAgbGV0IHRvdGFsVXNlZEJhbmtTbG90cyA9IDA7XHJcbiAgICAgICAgbGV0IHRvdGFsVW51c2VkQmFua1Nsb3RzID0gMDtcclxuICAgICAgICAvLyBUT0RPOiB0eXBlIHRoaXNcclxuICAgICAgICBjb25zdCBncm91cHMgPSB7fTtcclxuICAgICAgICBsZXQgcGFja05hbWU7XHJcbiAgICAgICAgZm9yIChwYWNrTmFtZSBpbiBjaGFyYWN0ZXIuYmFuaykge1xyXG4gICAgICAgICAgICBjb25zdCBwYWNrSXRlbXMgPSBjaGFyYWN0ZXIuYmFua1twYWNrTmFtZV07XHJcbiAgICAgICAgICAgIHRvdGFsQmFua1Nsb3RzICs9IChfYSA9IHBhY2tJdGVtcy5sZW5ndGgpICE9PSBudWxsICYmIF9hICE9PSB2b2lkIDAgPyBfYSA6IDA7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBwYWNrSXRlbXMubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtSW5mbyA9IHBhY2tJdGVtc1tpbmRleF07XHJcbiAgICAgICAgICAgICAgICBpZiAoIWl0ZW1JbmZvKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxVbnVzZWRCYW5rU2xvdHMrKztcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNvbnN0IGdJdGVtID0gRy5pdGVtc1tpdGVtSW5mby5uYW1lXTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGxldmVsID0gKF9iID0gaXRlbUluZm8ubGV2ZWwpICE9PSBudWxsICYmIF9iICE9PSB2b2lkIDAgPyBfYiA6IDA7XHJcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiB0cmFuc2xhdGUgdHlwZSB0byByZWFkYWJsZSAvIGNvbW1vbiBuYW1lIC8gb3RoZXJzXHJcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiBncm91cCB3ZWFwb25zIGJ5IHN1YnR5cGU/XHJcbiAgICAgICAgICAgICAgICBsZXQgdHlwZSA9IChfYyA9IHR5cGVzW2dJdGVtLnR5cGVdKSAhPT0gbnVsbCAmJiBfYyAhPT0gdm9pZCAwID8gX2MgOiBcIk90aGVyc1wiO1xyXG4gICAgICAgICAgICAgICAgaWYgKGdJdGVtLmUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlID0gKF9kID0gdHlwZXNbXCJleGNoYW5nZVwiXSkgIT09IG51bGwgJiYgX2QgIT09IHZvaWQgMCA/IF9kIDogXCJPdGhlcnNcIjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGxldCBpdGVtQnlUeXBlID0gZ3JvdXBzW3R5cGVdO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFpdGVtQnlUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbUJ5VHlwZSA9IHsgYW1vdW50OiAwLCBpdGVtczoge30gfTtcclxuICAgICAgICAgICAgICAgICAgICBncm91cHNbdHlwZV0gPSBpdGVtQnlUeXBlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbGV0IGl0ZW1EYXRhID0gaXRlbUJ5VHlwZS5pdGVtc1tpdGVtSW5mby5uYW1lXTtcclxuICAgICAgICAgICAgICAgIGlmICghaXRlbURhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtRGF0YSA9IHsgYW1vdW50OiAwLCBsZXZlbHM6IHt9IH07XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbUJ5VHlwZS5pdGVtc1tpdGVtSW5mby5uYW1lXSA9IGl0ZW1EYXRhO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbGV0IGxldmVscyA9IGl0ZW1EYXRhLmxldmVsc1tsZXZlbF07XHJcbiAgICAgICAgICAgICAgICBpZiAoIWxldmVscykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldmVscyA9IHsgYW1vdW50OiBpdGVtSW5mby5xIHx8IDEsIGluZGV4ZXM6IFtbcGFja05hbWUsIGluZGV4XV0gfTtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtRGF0YS5sZXZlbHNbbGV2ZWxdID0gbGV2ZWxzO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbURhdGEuYW1vdW50ICs9IGl0ZW1JbmZvLnEgfHwgMTtcclxuICAgICAgICAgICAgICAgICAgICBsZXZlbHMuYW1vdW50ICs9IGl0ZW1JbmZvLnEgfHwgMTtcclxuICAgICAgICAgICAgICAgICAgICBsZXZlbHMuaW5kZXhlcy5wdXNoKFtwYWNrTmFtZSwgaW5kZXhdKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRvdGFsVXNlZEJhbmtTbG90cysrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB7IHRvdGFsQmFua1Nsb3RzLCB0b3RhbFVzZWRCYW5rU2xvdHMsIHRvdGFsVW51c2VkQmFua1Nsb3RzLCBncm91cHMgfTtcclxuICAgIH1cclxuICAgIHJlbmRlckJhbmtJdGVtcyhzZWFyY2ggPSBcIlwiLCBiYW5rSXRlbXNDb250YWluZXIpIHtcclxuICAgICAgICB2YXIgX2E7XHJcbiAgICAgICAgY29uc29sZS5sb2coc2VhcmNoKTtcclxuICAgICAgICBiYW5rSXRlbXNDb250YWluZXIgPSBiYW5rSXRlbXNDb250YWluZXIgIT09IG51bGwgJiYgYmFua0l0ZW1zQ29udGFpbmVyICE9PSB2b2lkIDAgPyBiYW5rSXRlbXNDb250YWluZXIgOiAkKFwiI2JhbmstaXRlbXMtY29udGFpbmVyXCIpO1xyXG4gICAgICAgIGlmIChiYW5rSXRlbXNDb250YWluZXIpIHtcclxuICAgICAgICAgICAgLy8gLy8gcmVzZXQgbW9kYWwgbWFyZ2luXHJcbiAgICAgICAgICAgIC8vIGJhbmtJdGVtc0NvbnRhaW5lci5wYXJlbnQoKS5wYXJlbnQoKS5jc3Moe1xyXG4gICAgICAgICAgICAvLyAgIG1hcmdpblRvcDogXCI1cHhcIixcclxuICAgICAgICAgICAgLy8gfSk7XHJcbiAgICAgICAgICAgIC8vIGNsZWFyIGNvbnRlbnRzXHJcbiAgICAgICAgICAgIGJhbmtJdGVtc0NvbnRhaW5lci5odG1sKFwiXCIpO1xyXG4gICAgICAgICAgICBjb25zdCBncm91cHMgPSB0aGlzLmZpbHRlcihzZWFyY2gpO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcclxuICAgICAgICAgICAgLy8gICBcImJhbmsgc2xvdHNcIixcclxuICAgICAgICAgICAgLy8gICB0b3RhbEJhbmtTbG90cyxcclxuICAgICAgICAgICAgLy8gICB0b3RhbFVzZWRCYW5rU2xvdHMsXHJcbiAgICAgICAgICAgIC8vICAgdG90YWxVbnVzZWRCYW5rU2xvdHNcclxuICAgICAgICAgICAgLy8gKTtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZ3JvdXBzKTtcclxuICAgICAgICAgICAgY29uc3Qgc29ydGVkR3JvdXBLZXlzID0gWy4uLm5ldyBTZXQoT2JqZWN0LnZhbHVlcyh0eXBlcykpXTsgLy8uc29ydCgoYSwgYikgPT4gYS5sb2NhbGVDb21wYXJlKGIpKTtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtVHlwZSBvZiBzb3J0ZWRHcm91cEtleXMpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW1zQnlUeXBlID0gZ3JvdXBzW2l0ZW1UeXBlXTtcclxuICAgICAgICAgICAgICAgIGlmICghaXRlbXNCeVR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW1UeXBlQ29udGFpbmVyID0gJChcIjxkaXYgc3R5bGU9J2Zsb2F0OmxlZnQ7IG1hcmdpbi1sZWZ0OjVweDsnPlwiKTtcclxuICAgICAgICAgICAgICAgIGl0ZW1UeXBlQ29udGFpbmVyLmFwcGVuZChgPGRpdiBjbGFzcz0nZ2FtZWJ1dHRvbiBnYW1lYnV0dG9uLXNtYWxsJyBzdHlsZT0nbWFyZ2luLWJvdHRvbTogNXB4Jz4ke2l0ZW1UeXBlfTwvZGl2PmApO1xyXG4gICAgICAgICAgICAgICAgYmFua0l0ZW1zQ29udGFpbmVyLmFwcGVuZChpdGVtVHlwZUNvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtc0NvbnRhaW5lciA9ICQoXCI8ZGl2IHN0eWxlPSdtYXJnaW4tYm90dG9tOiAxMHB4Jz5cIik7XHJcbiAgICAgICAgICAgICAgICBpdGVtVHlwZUNvbnRhaW5lci5hcHBlbmQoaXRlbXNDb250YWluZXIpO1xyXG4gICAgICAgICAgICAgICAgLy8gbG9vcCBpdGVtc1xyXG4gICAgICAgICAgICAgICAgbGV0IGl0ZW1LZXk7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGl0ZW1LZXkgaW4gaXRlbXNCeVR5cGUuaXRlbXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBnSXRlbSA9IEcuaXRlbXNbaXRlbUtleV07XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBhbW91bnQsIGxldmVscyB9ID0gKF9hID0gaXRlbXNCeVR5cGUuaXRlbXNbaXRlbUtleV0pICE9PSBudWxsICYmIF9hICE9PSB2b2lkIDAgPyBfYSA6IHt9O1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRPRE86IGl0ZXJhdGUgYmFja3dhcmRzP1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgbGV2ZWwgaW4gbGV2ZWxzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBsZXZlbHNbTnVtYmVyKGxldmVsKV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZha2VJdGVtSW5mbyA9IHsgbmFtZTogaXRlbUtleSB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoTnVtYmVyKGxldmVsKSA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZha2VJdGVtSW5mby5sZXZlbCA9IE51bWJlcihsZXZlbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuYW1vdW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmYWtlSXRlbUluZm8ucSA9IGRhdGEuYW1vdW50O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRPRE86IGFkZCBpdGVtX2NvbnRhaW5lciB0byB0eXBlc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpdGVtQ29udGFpbmVyID0gJChwYXJlbnQuaXRlbV9jb250YWluZXIoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2tpbjogZ0l0ZW0uc2tpbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uY2xpY2s6IFwicmVuZGVyX2l0ZW1faW5mbygnXCIgKyBpdGVtS2V5ICsgXCInKVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LCBmYWtlSXRlbUluZm8pKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbGV2ZWwgY29udGFpbmVyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGxldmVsRWxlbWVudCA9IGl0ZW1Db250YWluZXIuZmluZChcIi5pdXVpXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXZlbEVsZW1lbnQuY3NzKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvbnRTaXplOiBcIjE2cHhcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZpbmQgcXVhbnRpdHkgaW4gaXRlbSBjb250YWluZXIgYW5kIG1ha2UgaXQgcHJldHR5XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvdW50RWxlbWVudCA9IGl0ZW1Db250YWluZXIuZmluZChcIi5pcXVpXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudEVsZW1lbnQuY3NzKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvbnRTaXplOiBcIjE2cHhcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvdW50ID0gTnVtYmVyKGNvdW50RWxlbWVudC50ZXh0KCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcmV0dHlDb3VudCA9ICgwLCB1dGlsc18xLmFiYnJldmlhdGVOdW1iZXIpKGNvdW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByZXR0eUNvdW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3VudEVsZW1lbnQuaHRtbChwcmV0dHlDb3VudC50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtc0NvbnRhaW5lci5hcHBlbmQoaXRlbUNvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJhbmtJdGVtc0NvbnRhaW5lci5hcHBlbmQoXCI8ZGl2IHN0eWxlPSdjbGVhcjpib3RoOyc+XCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5wYXJlbnQuZW5oYW5jZWRfYmFua191aSA9IG5ldyBFbmhhbmNlZEJhbmtVSSgpO1xyXG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=