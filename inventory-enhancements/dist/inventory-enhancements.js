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
        var _a, _b, _c;
        let totalBankSlots = 0;
        let totalUsedBankSlots = 0;
        let totalUnusedBankSlots = 0;
        // TODO: type this
        const groups = {};
        let packName;
        for (packName in character.bank) {
            const packItems = character.bank[packName];
            totalBankSlots += packItems.length;
            for (let index = 0; index < packItems.length; index++) {
                const itemInfo = packItems[index];
                if (!itemInfo) {
                    totalUnusedBankSlots++;
                    continue;
                }
                const gItem = G.items[itemInfo.name];
                const level = (_a = itemInfo.level) !== null && _a !== void 0 ? _a : 0;
                // TODO: translate type to readable / common name / others
                // TODO: group weapons by subtype?
                let type = (_b = types[gItem.type]) !== null && _b !== void 0 ? _b : "Others";
                if (gItem.e) {
                    type = (_c = types["exchange"]) !== null && _c !== void 0 ? _c : "Others";
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
                            fontSize: '16px'
                        });
                        // find quantity in item container and make it pretty
                        const countElement = itemContainer.find(".iqui");
                        countElement.css({
                            fontSize: '16px'
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUNBLHlCQUF5QjtBQUN6QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLHlCQUF5QjtBQUN6QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw4REFBOEQ7QUFDOUQ7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9pbnZlbnRvcnktZW5oYW5jZW1lbnRzLy4vc3JjL3V0aWxzLnRzIiwid2VicGFjazovL2ludmVudG9yeS1lbmhhbmNlbWVudHMvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vaW52ZW50b3J5LWVuaGFuY2VtZW50cy8uL3NyYy9iYW5rLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmV4cG9ydHMuYWJicmV2aWF0ZU51bWJlciA9IHZvaWQgMDtcclxuLy8gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9hLzQwNzI0MzU0LzI4MTQ1XHJcbmZ1bmN0aW9uIGFiYnJldmlhdGVOdW1iZXIobnVtYmVyKSB7XHJcbiAgICBjb25zdCBTSV9TWU1CT0wgPSBbXCJcIiwgXCJrXCIsIFwiTVwiLCBcIkdcIiwgXCJUXCIsIFwiUFwiLCBcIkVcIl07XHJcbiAgICBpZiAoIW51bWJlcikge1xyXG4gICAgICAgIHJldHVybiBudW1iZXI7XHJcbiAgICB9XHJcbiAgICAvLyB3aGF0IHRpZXI/IChkZXRlcm1pbmVzIFNJIHN5bWJvbClcclxuICAgIGNvbnN0IHRpZXIgPSAoTWF0aC5sb2cxMChNYXRoLmFicyhudW1iZXIpKSAvIDMpIHwgMDtcclxuICAgIC8vIGlmIHplcm8sIHdlIGRvbid0IG5lZWQgYSBzdWZmaXhcclxuICAgIGlmICh0aWVyID09PSAwKVxyXG4gICAgICAgIHJldHVybiBudW1iZXI7XHJcbiAgICAvLyBnZXQgc3VmZml4IGFuZCBkZXRlcm1pbmUgc2NhbGVcclxuICAgIGNvbnN0IHN1ZmZpeCA9IFNJX1NZTUJPTFt0aWVyXTtcclxuICAgIGNvbnN0IHNjYWxlID0gTWF0aC5wb3coMTAsIHRpZXIgKiAzKTtcclxuICAgIC8vIHNjYWxlIHRoZSBudW1iZXJcclxuICAgIGNvbnN0IHNjYWxlZCA9IG51bWJlciAvIHNjYWxlO1xyXG4gICAgLy8gZm9ybWF0IG51bWJlciBhbmQgYWRkIHN1ZmZpeFxyXG4gICAgLy8gICByZXR1cm4gc2NhbGVkLnRvRml4ZWQoMSkgKyBzdWZmaXg7XHJcbiAgICByZXR1cm4gKHNjYWxlZC50b0xvY2FsZVN0cmluZyh1bmRlZmluZWQsIHtcclxuICAgICAgICBtaW5pbXVtRnJhY3Rpb25EaWdpdHM6IDEsXHJcbiAgICAgICAgbWF4aW11bUZyYWN0aW9uRGlnaXRzOiAxLFxyXG4gICAgfSkgKyBzdWZmaXgpO1xyXG59XHJcbmV4cG9ydHMuYWJicmV2aWF0ZU51bWJlciA9IGFiYnJldmlhdGVOdW1iZXI7XHJcbiIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0obW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuLy8gbnB4IHRzYyAuL3NyYy91aS9pbnZlbnRvcnktZW5oYW5jZW1lbnRzLnRzIC0tdGFyZ2V0IGVzbmV4dCAtLW1vZHVsZSBhbWQgLS1vdXRGaWxlIFwiLi9zcmMvdWkvaW52ZW50b3J5LWVuaGFuY2VtZW50cy5qc1wiXHJcbi8vIHBhcmVudC5lbmhhbmNlZF9iYW5rX3VpLnNob3coKVxyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmNvbnN0IHV0aWxzXzEgPSByZXF1aXJlKFwiLi91dGlsc1wiKTtcclxuLy8gVE9ETzogcmVuZGVyIEFMTCBpdGVtcyBmcm9tIHRoZSBiYW5rIHdoZW4gaW4gdGhlIGJhbmtcclxuLy8gVE9ETzogYSB0b2dnbGUgYnV0dG9uIHRvIGNvbWJpbmUgaXRlbSBzbG90cyBvciBub3QuXHJcbi8vIFRPRE86IGEgdG9nZ2xlIGJ1dHRvbiB0byBjb21iaW5lIGVtcHR5IGl0ZW0gc2xvdHMgb3Igbm90LlxyXG4vLyBUT0RPOiBzaG91bGQgYmUgc2VhcmNoYWJsZSAoYWxwaGEgYmxlbmQgbm9uIHZhbGlkIHJlc3VsdHMgdG8gc2VldHJvdWdoLilcclxuLy8gVE9ETzogYW4gZXh0cmEgZmllbGQgc2hvd2luZyBhbGwgdGhlIHRlbGxlcnMgd2l0aCB0aGUgYWJpbGl0eSBvZiBwcmVzc2luZyBcImdvdG9cIiB0aGUgdGVsbGVycyBwb3NpdGlvbi5cclxuLy8gVE9ETzogc29tZWhvdyB2YWxpZGF0ZSBpZiB5b3UgaGF2ZSB1bmxvY2tlZCB0aGUgYWRkaXRpb25hbCBiYW5rIGxldmVscy5cclxuLy8gVE9ETzogYSB0b2dnbGUgdG8gZ3JvdXAgaXRlbXMgYnkgdGhlaXIgZ3JvdXAuXHJcbi8vIFRPRE86IGNhY2hlIHRoZSBiYW5rIGl0ZW1zIHNvIHlvdSBjYW4gdmlldyB0aGVtIHdoZW4gYXdheS5cclxuLy8gVE9ETzogYSBidXR0b24gdG8gc29ydFxyXG4vLyBUT0RPOiBjb25maWd1cmFibGUgc29ydGluZyBydWxlcy5cclxuLy8gVE9ETzogZGVzaWduYXRlIGNlcnRhaW4gaXRlbXMgdG8gY2VydGFpbiB0ZWxsZXJzLlxyXG4vL1RPRE86IGNsaWNrIHRvIHRyYW5zZmVyIGl0ZW1zIHRvIGNoYXJhY3RlclxyXG4vL1RPRE86IGEgc2VhcmNoIGZpZWxkIHJlZHVjaW5nIHRoZSB2aWV3XHJcbi8vVE9ETzogc2hvd2luZyBhbW91bnQgb2YgZW1wdHkgc2xvdHMgbGVmdFxyXG4vL1RPRE86IGEgYnV0dG9uIHRvIG9wZW4gdGhlIG92ZXJ2aWV3IHZpc2libGUgd2hlbiBpbnNpZGUgdGhlIGJhbmtcclxuLy9UT0RPOiBwZXJoYXBzIGFuIGFiaWxpdHkgdG8gZ3JvdXAgaXQgYnkgbnBjIHRlbGxlciBpbnN0ZWFkIG9mIGl0ZW0gdHlwZXNcclxuLy8gVE9ETzogZGlmZmVybnQgbW9kZXNcclxuLy8gIGFsbCBpbiBvbmUgaW52ZW50b3J5LCBzaG93IGVhY2ggYmFuayBzbG90IHdpdGggdGhlIGFiaWxpdHkgdG8gZHJhZyBhbmQgZHJvcCBhcm91bmRcclxuLy8gZ3JvdXAgaXRlbXMgYnkgdHlwZSwgY29sbGFwc2Ugc2FtZSBraW5kXHJcbi8vIGdyb3VwIGl0ZW1zIGJ5IGJhbmsgcGFjaywgY29sbGFwc2Ugc2FtZSBraW5kXHJcbi8vIHR5cGUgSW52ZW50b3J5TG9va3VwID0ge1xyXG4vLyAgICAgW1QgaW4gSXRlbU5hbWVdPzoge1xyXG4vLyAgICAgICBhbW91bnQ6IG51bWJlcjtcclxuLy8gICAgICAgbGV2ZWxzOiB7IFtUOiBudW1iZXJdOiB7IGFtb3VudDogbnVtYmVyOyBpbmRleGVzOiBudW1iZXJbXSB9IH07XHJcbi8vICAgICB9O1xyXG4vLyAgIH07XHJcbmNvbnN0IHR5cGVzID0ge1xyXG4gICAgaGVsbWV0OiBcIkhlbG1ldHNcIixcclxuICAgIGNoZXN0OiBcIkFybW9yc1wiLFxyXG4gICAgcGFudHM6IFwiUGFudHNcIixcclxuICAgIGdsb3ZlczogXCJHbG92ZXNcIixcclxuICAgIHNob2VzOiBcIlNob2VzXCIsXHJcbiAgICBjYXBlOiBcIkNhcGVzXCIsXHJcbiAgICByaW5nOiBcIlJpbmdzXCIsXHJcbiAgICBlYXJyaW5nOiBcIkVhcnJpbmdzXCIsXHJcbiAgICBhbXVsZXQ6IFwiQW11bGV0c1wiLFxyXG4gICAgYmVsdDogXCJCZWx0c1wiLFxyXG4gICAgb3JiOiBcIk9yYnNcIixcclxuICAgIHdlYXBvbjogXCJXZWFwb25zXCIsXHJcbiAgICBzaGllbGQ6IFwiU2hpZWxkc1wiLFxyXG4gICAgc291cmNlOiBcIk9mZmhhbmRzXCIsXHJcbiAgICBxdWl2ZXI6IFwiT2ZmaGFuZHNcIixcclxuICAgIG1pc2Nfb2ZmaGFuZDogXCJPZmZoYW5kc1wiLFxyXG4gICAgZWxpeGlyOiBcIkVsaXhpcnNcIixcclxuICAgIHBvdDogXCJQb3Rpb25zXCIsXHJcbiAgICBjc2Nyb2xsOiBcIlNjcm9sbHNcIixcclxuICAgIHVzY3JvbGw6IFwiU2Nyb2xsc1wiLFxyXG4gICAgcHNjcm9sbDogXCJTY3JvbGxzXCIsXHJcbiAgICBvZmZlcmluZzogXCJTY3JvbGxzXCIsXHJcbiAgICBtYXRlcmlhbDogXCJDcmFmdGluZyBhbmQgQ29sbGVjdGluZ1wiLFxyXG4gICAgZXhjaGFuZ2U6IFwiRXhjaGFuZ2VhYmxlc1wiLFxyXG59O1xyXG5jbGFzcyBFbmhhbmNlZEJhbmtVSSB7XHJcbiAgICAvKipcclxuICAgICAqXHJcbiAgICAgKi9cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIC8vIHN1cGVyKCk7XHJcbiAgICAgICAgLy8gVE9ETzogbG9hZCBzZXR0aW5nIGZyb20gbG9jYWwgc3RvcmFnZVxyXG4gICAgICAgIC8vIFRPRE86IGNhY2hlIGJhbmsgaW52ZW50b3J5IGF0IGFuIGludGVydmFsLCBiYXNlZCBvbiBzZXR0aW5nc1xyXG4gICAgICAgIC8vIFRPRE86IHN0YXJ0IGluc2lkZSAvIG91dHNpZGUgYmFuayBjaGVjayB0byBlbmFibGUgLyBkaXNhYmxlIGJ1dHRvblxyXG4gICAgICAgIC8vIFRPRE86IGNhY2hlIGJhbmsgd2hlbiB3ZSBlbnRlciBpdC5cclxuICAgICAgICB0aGlzLmdyb3VwcyA9IHt9O1xyXG4gICAgfVxyXG4gICAgc2hvdygpIHtcclxuICAgICAgICBjb25zdCBpc0luQmFuayA9ICEhY2hhcmFjdGVyLmJhbms7XHJcbiAgICAgICAgY29uc3QgeyB0b3RhbEJhbmtTbG90cywgdG90YWxVc2VkQmFua1Nsb3RzLCB0b3RhbFVudXNlZEJhbmtTbG90cywgZ3JvdXBzIH0gPSB0aGlzLmdyb3VwQmFua0J5SXRlbSgpO1xyXG4gICAgICAgIHRoaXMuZ3JvdXBzID0gZ3JvdXBzO1xyXG4gICAgICAgIGNvbnN0IGNvbnRhaW5lciA9ICQoXCI8ZGl2PlwiLCB7XHJcbiAgICAgICAgICAgIHN0eWxlOiBcImJvcmRlcjogNXB4IHNvbGlkIGdyYXk7IGJhY2tncm91bmQtY29sb3I6IGJsYWNrOyBwYWRkaW5nOiAxMHB4OyB3aWR0aDogOTglXCIsXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY29uc3QgdGl0bGUgPSAkKFwiPGRpdiBzdHlsZT0nY29sb3I6ICNmMWMwNTQ7IGJvcmRlci1ib3R0b206IDJweCBkYXNoZWQgI0M3Q0FDQTsgbWFyZ2luLWJvdHRvbTogM3B4OyBtYXJnaW4tbGVmdDogM3B4OyBtYXJnaW4tcmlnaHQ6IDNweCcgY2xhc3M9J2Nib2xkJz5cIik7XHJcbiAgICAgICAgY29udGFpbmVyLmFwcGVuZCh0aXRsZSk7XHJcbiAgICAgICAgdGl0bGUuYXBwZW5kKFwiQmFua1wiKTtcclxuICAgICAgICAvLyBUT0RPOiB0aGUgc2VhcmNoIGJ1dHRvbiBzaG91bGQgdHJpZ2dlciBhIGNsZWFpbmcgb2YgYmFua0l0ZW1zQ29udGFpbmVyIGFuZCByZS1yZW5kZXIgdGhlIG5ldyBkYXRhXHJcbiAgICAgICAgY29uc3Qgc2VhcmNoQnV0dG9uID0gJChgPGlucHV0IHBsYWNlaG9sZGVyPSdwcmVzcyBlbnRlciB0byBzZWFyY2gnIG9uY2hhbmdlPSdlbmhhbmNlZF9iYW5rX3VpLnJlbmRlckJhbmtJdGVtcyh0aGlzLnZhbHVlKScgdmFsdWU9JyR7XCJcIn0nIC8+YCk7XHJcbiAgICAgICAgdGl0bGUuYXBwZW5kKHNlYXJjaEJ1dHRvbik7XHJcbiAgICAgICAgY29uc3QgYmFua0l0ZW1zQ29udGFpbmVyID0gJChcIjxkaXY+XCIsIHsgaWQ6IFwiYmFuay1pdGVtcy1jb250YWluZXJcIiB9KTtcclxuICAgICAgICBjb250YWluZXIuYXBwZW5kKGJhbmtJdGVtc0NvbnRhaW5lcik7XHJcbiAgICAgICAgLy8gdHJpZ2dlciByZW5kZXIgYWZ0ZXIgZWxlbWVudHMgZXhpc3QgaW4gdGhlIGRvbVxyXG4gICAgICAgIHRoaXMucmVuZGVyQmFua0l0ZW1zKHVuZGVmaW5lZCwgYmFua0l0ZW1zQ29udGFpbmVyKTtcclxuICAgICAgICAvLyBUT0RPOiBzaG91bGQgbm90IGJlIHJlbmRlcmVkIGFzIGEgbW9kYWwsIHdlIHdhbnQgdG8gYmUgYWJsZSB0byB1dGlsaXplIG91ciBwbGF5ZXIgaW52ZW50b3J5IGFzIHdlbGwgOnRoaW5raW5nOlxyXG4gICAgICAgIHBhcmVudC5zaG93X21vZGFsKGNvbnRhaW5lci53cmFwKFwiPGRpdi8+XCIpLnBhcmVudCgpLmh0bWwoKSwge1xyXG4gICAgICAgICAgICB3cmFwOiAhMSxcclxuICAgICAgICAgICAgaGlkZWluYmFja2dyb3VuZDogITAsXHJcbiAgICAgICAgICAgIHVybDogXCIvZG9jcy9ndWlkZS9hbGwvaXRlbXNcIixcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGZpbHRlcihzZWFyY2gpIHtcclxuICAgICAgICBjb25zdCByZXN1bHQgPSB7fTtcclxuICAgICAgICBmb3IgKGNvbnN0IGdyb3VwTmFtZSBpbiB0aGlzLmdyb3Vwcykge1xyXG4gICAgICAgICAgICBjb25zdCBncm91cCA9IHRoaXMuZ3JvdXBzW2dyb3VwTmFtZV07XHJcbiAgICAgICAgICAgIGxldCBpdGVtS2V5O1xyXG4gICAgICAgICAgICBmb3IgKGl0ZW1LZXkgaW4gZ3JvdXAuaXRlbXMpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGdJdGVtID0gRy5pdGVtc1tpdGVtS2V5XTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBncm91cC5pdGVtc1tpdGVtS2V5XTtcclxuICAgICAgICAgICAgICAgIGxldCBzaG91bGRBZGQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGlmIChzZWFyY2gpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpdGVtS2V5TWF0Y2hlcyA9IGl0ZW1LZXkuaW5kZXhPZihzZWFyY2gpID4gLTE7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbU5hbWVNYXRjaGVzID0gZ0l0ZW0gJiYgZ0l0ZW0ubmFtZS5pbmRleE9mKHNlYXJjaCkgPiAtMTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbUtleU1hdGNoZXMgfHwgaXRlbU5hbWVNYXRjaGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3VsZEFkZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2hvdWxkQWRkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChzaG91bGRBZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdFtncm91cE5hbWVdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdFtncm91cE5hbWVdID0geyBhbW91bnQ6IDAsIGl0ZW1zOiB7fSB9O1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICByZXN1bHRbZ3JvdXBOYW1lXS5pdGVtc1tpdGVtS2V5XSA9IGl0ZW07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuICAgIGdyb3VwQmFua0J5SXRlbSgpIHtcclxuICAgICAgICB2YXIgX2EsIF9iLCBfYztcclxuICAgICAgICBsZXQgdG90YWxCYW5rU2xvdHMgPSAwO1xyXG4gICAgICAgIGxldCB0b3RhbFVzZWRCYW5rU2xvdHMgPSAwO1xyXG4gICAgICAgIGxldCB0b3RhbFVudXNlZEJhbmtTbG90cyA9IDA7XHJcbiAgICAgICAgLy8gVE9ETzogdHlwZSB0aGlzXHJcbiAgICAgICAgY29uc3QgZ3JvdXBzID0ge307XHJcbiAgICAgICAgbGV0IHBhY2tOYW1lO1xyXG4gICAgICAgIGZvciAocGFja05hbWUgaW4gY2hhcmFjdGVyLmJhbmspIHtcclxuICAgICAgICAgICAgY29uc3QgcGFja0l0ZW1zID0gY2hhcmFjdGVyLmJhbmtbcGFja05hbWVdO1xyXG4gICAgICAgICAgICB0b3RhbEJhbmtTbG90cyArPSBwYWNrSXRlbXMubGVuZ3RoO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgcGFja0l0ZW1zLmxlbmd0aDsgaW5kZXgrKykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbUluZm8gPSBwYWNrSXRlbXNbaW5kZXhdO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFpdGVtSW5mbykge1xyXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsVW51c2VkQmFua1Nsb3RzKys7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjb25zdCBnSXRlbSA9IEcuaXRlbXNbaXRlbUluZm8ubmFtZV07XHJcbiAgICAgICAgICAgICAgICBjb25zdCBsZXZlbCA9IChfYSA9IGl0ZW1JbmZvLmxldmVsKSAhPT0gbnVsbCAmJiBfYSAhPT0gdm9pZCAwID8gX2EgOiAwO1xyXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogdHJhbnNsYXRlIHR5cGUgdG8gcmVhZGFibGUgLyBjb21tb24gbmFtZSAvIG90aGVyc1xyXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogZ3JvdXAgd2VhcG9ucyBieSBzdWJ0eXBlP1xyXG4gICAgICAgICAgICAgICAgbGV0IHR5cGUgPSAoX2IgPSB0eXBlc1tnSXRlbS50eXBlXSkgIT09IG51bGwgJiYgX2IgIT09IHZvaWQgMCA/IF9iIDogXCJPdGhlcnNcIjtcclxuICAgICAgICAgICAgICAgIGlmIChnSXRlbS5lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9IChfYyA9IHR5cGVzW1wiZXhjaGFuZ2VcIl0pICE9PSBudWxsICYmIF9jICE9PSB2b2lkIDAgPyBfYyA6IFwiT3RoZXJzXCI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBsZXQgaXRlbUJ5VHlwZSA9IGdyb3Vwc1t0eXBlXTtcclxuICAgICAgICAgICAgICAgIGlmICghaXRlbUJ5VHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1CeVR5cGUgPSB7IGFtb3VudDogMCwgaXRlbXM6IHt9IH07XHJcbiAgICAgICAgICAgICAgICAgICAgZ3JvdXBzW3R5cGVdID0gaXRlbUJ5VHlwZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGxldCBpdGVtRGF0YSA9IGl0ZW1CeVR5cGUuaXRlbXNbaXRlbUluZm8ubmFtZV07XHJcbiAgICAgICAgICAgICAgICBpZiAoIWl0ZW1EYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbURhdGEgPSB7IGFtb3VudDogMCwgbGV2ZWxzOiB7fSB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1CeVR5cGUuaXRlbXNbaXRlbUluZm8ubmFtZV0gPSBpdGVtRGF0YTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGxldCBsZXZlbHMgPSBpdGVtRGF0YS5sZXZlbHNbbGV2ZWxdO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFsZXZlbHMpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXZlbHMgPSB7IGFtb3VudDogaXRlbUluZm8ucSB8fCAxLCBpbmRleGVzOiBbW3BhY2tOYW1lLCBpbmRleF1dIH07XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbURhdGEubGV2ZWxzW2xldmVsXSA9IGxldmVscztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1EYXRhLmFtb3VudCArPSBpdGVtSW5mby5xIHx8IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV2ZWxzLmFtb3VudCArPSBpdGVtSW5mby5xIHx8IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV2ZWxzLmluZGV4ZXMucHVzaChbcGFja05hbWUsIGluZGV4XSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0b3RhbFVzZWRCYW5rU2xvdHMrKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4geyB0b3RhbEJhbmtTbG90cywgdG90YWxVc2VkQmFua1Nsb3RzLCB0b3RhbFVudXNlZEJhbmtTbG90cywgZ3JvdXBzIH07XHJcbiAgICB9XHJcbiAgICByZW5kZXJCYW5rSXRlbXMoc2VhcmNoID0gXCJcIiwgYmFua0l0ZW1zQ29udGFpbmVyKSB7XHJcbiAgICAgICAgdmFyIF9hO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKHNlYXJjaCk7XHJcbiAgICAgICAgYmFua0l0ZW1zQ29udGFpbmVyID0gYmFua0l0ZW1zQ29udGFpbmVyICE9PSBudWxsICYmIGJhbmtJdGVtc0NvbnRhaW5lciAhPT0gdm9pZCAwID8gYmFua0l0ZW1zQ29udGFpbmVyIDogJChcIiNiYW5rLWl0ZW1zLWNvbnRhaW5lclwiKTtcclxuICAgICAgICBpZiAoYmFua0l0ZW1zQ29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIC8vIC8vIHJlc2V0IG1vZGFsIG1hcmdpblxyXG4gICAgICAgICAgICAvLyBiYW5rSXRlbXNDb250YWluZXIucGFyZW50KCkucGFyZW50KCkuY3NzKHtcclxuICAgICAgICAgICAgLy8gICBtYXJnaW5Ub3A6IFwiNXB4XCIsXHJcbiAgICAgICAgICAgIC8vIH0pO1xyXG4gICAgICAgICAgICAvLyBjbGVhciBjb250ZW50c1xyXG4gICAgICAgICAgICBiYW5rSXRlbXNDb250YWluZXIuaHRtbChcIlwiKTtcclxuICAgICAgICAgICAgY29uc3QgZ3JvdXBzID0gdGhpcy5maWx0ZXIoc2VhcmNoKTtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXHJcbiAgICAgICAgICAgIC8vICAgXCJiYW5rIHNsb3RzXCIsXHJcbiAgICAgICAgICAgIC8vICAgdG90YWxCYW5rU2xvdHMsXHJcbiAgICAgICAgICAgIC8vICAgdG90YWxVc2VkQmFua1Nsb3RzLFxyXG4gICAgICAgICAgICAvLyAgIHRvdGFsVW51c2VkQmFua1Nsb3RzXHJcbiAgICAgICAgICAgIC8vICk7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGdyb3Vwcyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHNvcnRlZEdyb3VwS2V5cyA9IFsuLi5uZXcgU2V0KE9iamVjdC52YWx1ZXModHlwZXMpKV07IC8vLnNvcnQoKGEsIGIpID0+IGEubG9jYWxlQ29tcGFyZShiKSk7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbVR5cGUgb2Ygc29ydGVkR3JvdXBLZXlzKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtc0J5VHlwZSA9IGdyb3Vwc1tpdGVtVHlwZV07XHJcbiAgICAgICAgICAgICAgICBpZiAoIWl0ZW1zQnlUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtVHlwZUNvbnRhaW5lciA9ICQoXCI8ZGl2IHN0eWxlPSdmbG9hdDpsZWZ0OyBtYXJnaW4tbGVmdDo1cHg7Jz5cIik7XHJcbiAgICAgICAgICAgICAgICBpdGVtVHlwZUNvbnRhaW5lci5hcHBlbmQoYDxkaXYgY2xhc3M9J2dhbWVidXR0b24gZ2FtZWJ1dHRvbi1zbWFsbCcgc3R5bGU9J21hcmdpbi1ib3R0b206IDVweCc+JHtpdGVtVHlwZX08L2Rpdj5gKTtcclxuICAgICAgICAgICAgICAgIGJhbmtJdGVtc0NvbnRhaW5lci5hcHBlbmQoaXRlbVR5cGVDb250YWluZXIpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbXNDb250YWluZXIgPSAkKFwiPGRpdiBzdHlsZT0nbWFyZ2luLWJvdHRvbTogMTBweCc+XCIpO1xyXG4gICAgICAgICAgICAgICAgaXRlbVR5cGVDb250YWluZXIuYXBwZW5kKGl0ZW1zQ29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgIC8vIGxvb3AgaXRlbXNcclxuICAgICAgICAgICAgICAgIGxldCBpdGVtS2V5O1xyXG4gICAgICAgICAgICAgICAgZm9yIChpdGVtS2V5IGluIGl0ZW1zQnlUeXBlLml0ZW1zKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZ0l0ZW0gPSBHLml0ZW1zW2l0ZW1LZXldO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgYW1vdW50LCBsZXZlbHMgfSA9IChfYSA9IGl0ZW1zQnlUeXBlLml0ZW1zW2l0ZW1LZXldKSAhPT0gbnVsbCAmJiBfYSAhPT0gdm9pZCAwID8gX2EgOiB7fTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBUT0RPOiBpdGVyYXRlIGJhY2t3YXJkcz9cclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGxldmVsIGluIGxldmVscykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gbGV2ZWxzW051bWJlcihsZXZlbCldO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmYWtlSXRlbUluZm8gPSB7IG5hbWU6IGl0ZW1LZXkgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKE51bWJlcihsZXZlbCkgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmYWtlSXRlbUluZm8ubGV2ZWwgPSBOdW1iZXIobGV2ZWwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLmFtb3VudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmFrZUl0ZW1JbmZvLnEgPSBkYXRhLmFtb3VudDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUT0RPOiBhZGQgaXRlbV9jb250YWluZXIgdG8gdHlwZXNcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbUNvbnRhaW5lciA9ICQocGFyZW50Lml0ZW1fY29udGFpbmVyKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNraW46IGdJdGVtLnNraW4sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbmNsaWNrOiBcInJlbmRlcl9pdGVtX2luZm8oJ1wiICsgaXRlbUtleSArIFwiJylcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgZmFrZUl0ZW1JbmZvKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxldmVsIGNvbnRhaW5lciBcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbGV2ZWxFbGVtZW50ID0gaXRlbUNvbnRhaW5lci5maW5kKFwiLml1dWlcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldmVsRWxlbWVudC5jc3Moe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9udFNpemU6ICcxNnB4J1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZmluZCBxdWFudGl0eSBpbiBpdGVtIGNvbnRhaW5lciBhbmQgbWFrZSBpdCBwcmV0dHlcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY291bnRFbGVtZW50ID0gaXRlbUNvbnRhaW5lci5maW5kKFwiLmlxdWlcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50RWxlbWVudC5jc3Moe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9udFNpemU6ICcxNnB4J1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY291bnQgPSBOdW1iZXIoY291bnRFbGVtZW50LnRleHQoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXR0eUNvdW50ID0gKDAsIHV0aWxzXzEuYWJicmV2aWF0ZU51bWJlcikoY291bnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJldHR5Q291bnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50RWxlbWVudC5odG1sKHByZXR0eUNvdW50LnRvU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zQ29udGFpbmVyLmFwcGVuZChpdGVtQ29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYmFua0l0ZW1zQ29udGFpbmVyLmFwcGVuZChcIjxkaXYgc3R5bGU9J2NsZWFyOmJvdGg7Jz5cIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbnBhcmVudC5lbmhhbmNlZF9iYW5rX3VpID0gbmV3IEVuaGFuY2VkQmFua1VJKCk7XHJcbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==