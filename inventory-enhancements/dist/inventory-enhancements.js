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
                        // find quantity in item container and make it pretty
                        const countElement = itemContainer.find(".iqui");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsOERBQThEO0FBQzlEO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vaW52ZW50b3J5LWVuaGFuY2VtZW50cy8uL3NyYy91dGlscy50cyIsIndlYnBhY2s6Ly9pbnZlbnRvcnktZW5oYW5jZW1lbnRzL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL2ludmVudG9yeS1lbmhhbmNlbWVudHMvLi9zcmMvYmFuay50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5leHBvcnRzLmFiYnJldmlhdGVOdW1iZXIgPSB2b2lkIDA7XHJcbi8vIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vYS80MDcyNDM1NC8yODE0NVxyXG5mdW5jdGlvbiBhYmJyZXZpYXRlTnVtYmVyKG51bWJlcikge1xyXG4gICAgY29uc3QgU0lfU1lNQk9MID0gW1wiXCIsIFwia1wiLCBcIk1cIiwgXCJHXCIsIFwiVFwiLCBcIlBcIiwgXCJFXCJdO1xyXG4gICAgaWYgKCFudW1iZXIpIHtcclxuICAgICAgICByZXR1cm4gbnVtYmVyO1xyXG4gICAgfVxyXG4gICAgLy8gd2hhdCB0aWVyPyAoZGV0ZXJtaW5lcyBTSSBzeW1ib2wpXHJcbiAgICBjb25zdCB0aWVyID0gKE1hdGgubG9nMTAoTWF0aC5hYnMobnVtYmVyKSkgLyAzKSB8IDA7XHJcbiAgICAvLyBpZiB6ZXJvLCB3ZSBkb24ndCBuZWVkIGEgc3VmZml4XHJcbiAgICBpZiAodGllciA9PT0gMClcclxuICAgICAgICByZXR1cm4gbnVtYmVyO1xyXG4gICAgLy8gZ2V0IHN1ZmZpeCBhbmQgZGV0ZXJtaW5lIHNjYWxlXHJcbiAgICBjb25zdCBzdWZmaXggPSBTSV9TWU1CT0xbdGllcl07XHJcbiAgICBjb25zdCBzY2FsZSA9IE1hdGgucG93KDEwLCB0aWVyICogMyk7XHJcbiAgICAvLyBzY2FsZSB0aGUgbnVtYmVyXHJcbiAgICBjb25zdCBzY2FsZWQgPSBudW1iZXIgLyBzY2FsZTtcclxuICAgIC8vIGZvcm1hdCBudW1iZXIgYW5kIGFkZCBzdWZmaXhcclxuICAgIC8vICAgcmV0dXJuIHNjYWxlZC50b0ZpeGVkKDEpICsgc3VmZml4O1xyXG4gICAgcmV0dXJuIChzY2FsZWQudG9Mb2NhbGVTdHJpbmcodW5kZWZpbmVkLCB7XHJcbiAgICAgICAgbWluaW11bUZyYWN0aW9uRGlnaXRzOiAxLFxyXG4gICAgICAgIG1heGltdW1GcmFjdGlvbkRpZ2l0czogMSxcclxuICAgIH0pICsgc3VmZml4KTtcclxufVxyXG5leHBvcnRzLmFiYnJldmlhdGVOdW1iZXIgPSBhYmJyZXZpYXRlTnVtYmVyO1xyXG4iLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbi8vIG5weCB0c2MgLi9zcmMvdWkvaW52ZW50b3J5LWVuaGFuY2VtZW50cy50cyAtLXRhcmdldCBlc25leHQgLS1tb2R1bGUgYW1kIC0tb3V0RmlsZSBcIi4vc3JjL3VpL2ludmVudG9yeS1lbmhhbmNlbWVudHMuanNcIlxyXG4vLyBwYXJlbnQuZW5oYW5jZWRfYmFua191aS5zaG93KClcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCB1dGlsc18xID0gcmVxdWlyZShcIi4vdXRpbHNcIik7XHJcbi8vIFRPRE86IHJlbmRlciBBTEwgaXRlbXMgZnJvbSB0aGUgYmFuayB3aGVuIGluIHRoZSBiYW5rXHJcbi8vIFRPRE86IGEgdG9nZ2xlIGJ1dHRvbiB0byBjb21iaW5lIGl0ZW0gc2xvdHMgb3Igbm90LlxyXG4vLyBUT0RPOiBhIHRvZ2dsZSBidXR0b24gdG8gY29tYmluZSBlbXB0eSBpdGVtIHNsb3RzIG9yIG5vdC5cclxuLy8gVE9ETzogc2hvdWxkIGJlIHNlYXJjaGFibGUgKGFscGhhIGJsZW5kIG5vbiB2YWxpZCByZXN1bHRzIHRvIHNlZXRyb3VnaC4pXHJcbi8vIFRPRE86IGFuIGV4dHJhIGZpZWxkIHNob3dpbmcgYWxsIHRoZSB0ZWxsZXJzIHdpdGggdGhlIGFiaWxpdHkgb2YgcHJlc3NpbmcgXCJnb3RvXCIgdGhlIHRlbGxlcnMgcG9zaXRpb24uXHJcbi8vIFRPRE86IHNvbWVob3cgdmFsaWRhdGUgaWYgeW91IGhhdmUgdW5sb2NrZWQgdGhlIGFkZGl0aW9uYWwgYmFuayBsZXZlbHMuXHJcbi8vIFRPRE86IGEgdG9nZ2xlIHRvIGdyb3VwIGl0ZW1zIGJ5IHRoZWlyIGdyb3VwLlxyXG4vLyBUT0RPOiBjYWNoZSB0aGUgYmFuayBpdGVtcyBzbyB5b3UgY2FuIHZpZXcgdGhlbSB3aGVuIGF3YXkuXHJcbi8vIFRPRE86IGEgYnV0dG9uIHRvIHNvcnRcclxuLy8gVE9ETzogY29uZmlndXJhYmxlIHNvcnRpbmcgcnVsZXMuXHJcbi8vIFRPRE86IGRlc2lnbmF0ZSBjZXJ0YWluIGl0ZW1zIHRvIGNlcnRhaW4gdGVsbGVycy5cclxuLy9UT0RPOiBjbGljayB0byB0cmFuc2ZlciBpdGVtcyB0byBjaGFyYWN0ZXJcclxuLy9UT0RPOiBhIHNlYXJjaCBmaWVsZCByZWR1Y2luZyB0aGUgdmlld1xyXG4vL1RPRE86IHNob3dpbmcgYW1vdW50IG9mIGVtcHR5IHNsb3RzIGxlZnRcclxuLy9UT0RPOiBhIGJ1dHRvbiB0byBvcGVuIHRoZSBvdmVydmlldyB2aXNpYmxlIHdoZW4gaW5zaWRlIHRoZSBiYW5rXHJcbi8vVE9ETzogcGVyaGFwcyBhbiBhYmlsaXR5IHRvIGdyb3VwIGl0IGJ5IG5wYyB0ZWxsZXIgaW5zdGVhZCBvZiBpdGVtIHR5cGVzXHJcbi8vIFRPRE86IGRpZmZlcm50IG1vZGVzXHJcbi8vICBhbGwgaW4gb25lIGludmVudG9yeSwgc2hvdyBlYWNoIGJhbmsgc2xvdCB3aXRoIHRoZSBhYmlsaXR5IHRvIGRyYWcgYW5kIGRyb3AgYXJvdW5kXHJcbi8vIGdyb3VwIGl0ZW1zIGJ5IHR5cGUsIGNvbGxhcHNlIHNhbWUga2luZFxyXG4vLyBncm91cCBpdGVtcyBieSBiYW5rIHBhY2ssIGNvbGxhcHNlIHNhbWUga2luZFxyXG4vLyB0eXBlIEludmVudG9yeUxvb2t1cCA9IHtcclxuLy8gICAgIFtUIGluIEl0ZW1OYW1lXT86IHtcclxuLy8gICAgICAgYW1vdW50OiBudW1iZXI7XHJcbi8vICAgICAgIGxldmVsczogeyBbVDogbnVtYmVyXTogeyBhbW91bnQ6IG51bWJlcjsgaW5kZXhlczogbnVtYmVyW10gfSB9O1xyXG4vLyAgICAgfTtcclxuLy8gICB9O1xyXG5jb25zdCB0eXBlcyA9IHtcclxuICAgIGhlbG1ldDogXCJIZWxtZXRzXCIsXHJcbiAgICBjaGVzdDogXCJBcm1vcnNcIixcclxuICAgIHBhbnRzOiBcIlBhbnRzXCIsXHJcbiAgICBnbG92ZXM6IFwiR2xvdmVzXCIsXHJcbiAgICBzaG9lczogXCJTaG9lc1wiLFxyXG4gICAgY2FwZTogXCJDYXBlc1wiLFxyXG4gICAgcmluZzogXCJSaW5nc1wiLFxyXG4gICAgZWFycmluZzogXCJFYXJyaW5nc1wiLFxyXG4gICAgYW11bGV0OiBcIkFtdWxldHNcIixcclxuICAgIGJlbHQ6IFwiQmVsdHNcIixcclxuICAgIG9yYjogXCJPcmJzXCIsXHJcbiAgICB3ZWFwb246IFwiV2VhcG9uc1wiLFxyXG4gICAgc2hpZWxkOiBcIlNoaWVsZHNcIixcclxuICAgIHNvdXJjZTogXCJPZmZoYW5kc1wiLFxyXG4gICAgcXVpdmVyOiBcIk9mZmhhbmRzXCIsXHJcbiAgICBtaXNjX29mZmhhbmQ6IFwiT2ZmaGFuZHNcIixcclxuICAgIGVsaXhpcjogXCJFbGl4aXJzXCIsXHJcbiAgICBwb3Q6IFwiUG90aW9uc1wiLFxyXG4gICAgY3Njcm9sbDogXCJTY3JvbGxzXCIsXHJcbiAgICB1c2Nyb2xsOiBcIlNjcm9sbHNcIixcclxuICAgIHBzY3JvbGw6IFwiU2Nyb2xsc1wiLFxyXG4gICAgb2ZmZXJpbmc6IFwiU2Nyb2xsc1wiLFxyXG4gICAgbWF0ZXJpYWw6IFwiQ3JhZnRpbmcgYW5kIENvbGxlY3RpbmdcIixcclxuICAgIGV4Y2hhbmdlOiBcIkV4Y2hhbmdlYWJsZXNcIixcclxufTtcclxuY2xhc3MgRW5oYW5jZWRCYW5rVUkge1xyXG4gICAgLyoqXHJcbiAgICAgKlxyXG4gICAgICovXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICAvLyBzdXBlcigpO1xyXG4gICAgICAgIC8vIFRPRE86IGxvYWQgc2V0dGluZyBmcm9tIGxvY2FsIHN0b3JhZ2VcclxuICAgICAgICAvLyBUT0RPOiBjYWNoZSBiYW5rIGludmVudG9yeSBhdCBhbiBpbnRlcnZhbCwgYmFzZWQgb24gc2V0dGluZ3NcclxuICAgICAgICAvLyBUT0RPOiBzdGFydCBpbnNpZGUgLyBvdXRzaWRlIGJhbmsgY2hlY2sgdG8gZW5hYmxlIC8gZGlzYWJsZSBidXR0b25cclxuICAgICAgICAvLyBUT0RPOiBjYWNoZSBiYW5rIHdoZW4gd2UgZW50ZXIgaXQuXHJcbiAgICAgICAgdGhpcy5ncm91cHMgPSB7fTtcclxuICAgIH1cclxuICAgIHNob3coKSB7XHJcbiAgICAgICAgY29uc3QgaXNJbkJhbmsgPSAhIWNoYXJhY3Rlci5iYW5rO1xyXG4gICAgICAgIGNvbnN0IHsgdG90YWxCYW5rU2xvdHMsIHRvdGFsVXNlZEJhbmtTbG90cywgdG90YWxVbnVzZWRCYW5rU2xvdHMsIGdyb3VwcyB9ID0gdGhpcy5ncm91cEJhbmtCeUl0ZW0oKTtcclxuICAgICAgICB0aGlzLmdyb3VwcyA9IGdyb3VwcztcclxuICAgICAgICBjb25zdCBjb250YWluZXIgPSAkKFwiPGRpdj5cIiwge1xyXG4gICAgICAgICAgICBzdHlsZTogXCJib3JkZXI6IDVweCBzb2xpZCBncmF5OyBiYWNrZ3JvdW5kLWNvbG9yOiBibGFjazsgcGFkZGluZzogMTBweDsgd2lkdGg6IDk4JVwiLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGNvbnN0IHRpdGxlID0gJChcIjxkaXYgc3R5bGU9J2NvbG9yOiAjZjFjMDU0OyBib3JkZXItYm90dG9tOiAycHggZGFzaGVkICNDN0NBQ0E7IG1hcmdpbi1ib3R0b206IDNweDsgbWFyZ2luLWxlZnQ6IDNweDsgbWFyZ2luLXJpZ2h0OiAzcHgnIGNsYXNzPSdjYm9sZCc+XCIpO1xyXG4gICAgICAgIGNvbnRhaW5lci5hcHBlbmQodGl0bGUpO1xyXG4gICAgICAgIHRpdGxlLmFwcGVuZChcIkJhbmtcIik7XHJcbiAgICAgICAgLy8gVE9ETzogdGhlIHNlYXJjaCBidXR0b24gc2hvdWxkIHRyaWdnZXIgYSBjbGVhaW5nIG9mIGJhbmtJdGVtc0NvbnRhaW5lciBhbmQgcmUtcmVuZGVyIHRoZSBuZXcgZGF0YVxyXG4gICAgICAgIGNvbnN0IHNlYXJjaEJ1dHRvbiA9ICQoYDxpbnB1dCBwbGFjZWhvbGRlcj0ncHJlc3MgZW50ZXIgdG8gc2VhcmNoJyBvbmNoYW5nZT0nZW5oYW5jZWRfYmFua191aS5yZW5kZXJCYW5rSXRlbXModGhpcy52YWx1ZSknIHZhbHVlPScke1wiXCJ9JyAvPmApO1xyXG4gICAgICAgIHRpdGxlLmFwcGVuZChzZWFyY2hCdXR0b24pO1xyXG4gICAgICAgIGNvbnN0IGJhbmtJdGVtc0NvbnRhaW5lciA9ICQoXCI8ZGl2PlwiLCB7IGlkOiBcImJhbmstaXRlbXMtY29udGFpbmVyXCIgfSk7XHJcbiAgICAgICAgY29udGFpbmVyLmFwcGVuZChiYW5rSXRlbXNDb250YWluZXIpO1xyXG4gICAgICAgIC8vIHRyaWdnZXIgcmVuZGVyIGFmdGVyIGVsZW1lbnRzIGV4aXN0IGluIHRoZSBkb21cclxuICAgICAgICB0aGlzLnJlbmRlckJhbmtJdGVtcyh1bmRlZmluZWQsIGJhbmtJdGVtc0NvbnRhaW5lcik7XHJcbiAgICAgICAgLy8gVE9ETzogc2hvdWxkIG5vdCBiZSByZW5kZXJlZCBhcyBhIG1vZGFsLCB3ZSB3YW50IHRvIGJlIGFibGUgdG8gdXRpbGl6ZSBvdXIgcGxheWVyIGludmVudG9yeSBhcyB3ZWxsIDp0aGlua2luZzpcclxuICAgICAgICBwYXJlbnQuc2hvd19tb2RhbChjb250YWluZXIud3JhcChcIjxkaXYvPlwiKS5wYXJlbnQoKS5odG1sKCksIHtcclxuICAgICAgICAgICAgd3JhcDogITEsXHJcbiAgICAgICAgICAgIGhpZGVpbmJhY2tncm91bmQ6ICEwLFxyXG4gICAgICAgICAgICB1cmw6IFwiL2RvY3MvZ3VpZGUvYWxsL2l0ZW1zXCIsXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBmaWx0ZXIoc2VhcmNoKSB7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0ID0ge307XHJcbiAgICAgICAgZm9yIChjb25zdCBncm91cE5hbWUgaW4gdGhpcy5ncm91cHMpIHtcclxuICAgICAgICAgICAgY29uc3QgZ3JvdXAgPSB0aGlzLmdyb3Vwc1tncm91cE5hbWVdO1xyXG4gICAgICAgICAgICBsZXQgaXRlbUtleTtcclxuICAgICAgICAgICAgZm9yIChpdGVtS2V5IGluIGdyb3VwLml0ZW1zKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBnSXRlbSA9IEcuaXRlbXNbaXRlbUtleV07XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtID0gZ3JvdXAuaXRlbXNbaXRlbUtleV07XHJcbiAgICAgICAgICAgICAgICBsZXQgc2hvdWxkQWRkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBpZiAoc2VhcmNoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbUtleU1hdGNoZXMgPSBpdGVtS2V5LmluZGV4T2Yoc2VhcmNoKSA+IC0xO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW1OYW1lTWF0Y2hlcyA9IGdJdGVtICYmIGdJdGVtLm5hbWUuaW5kZXhPZihzZWFyY2gpID4gLTE7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW1LZXlNYXRjaGVzIHx8IGl0ZW1OYW1lTWF0Y2hlcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzaG91bGRBZGQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHNob3VsZEFkZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoc2hvdWxkQWRkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXN1bHRbZ3JvdXBOYW1lXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRbZ3JvdXBOYW1lXSA9IHsgYW1vdW50OiAwLCBpdGVtczoge30gfTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0W2dyb3VwTmFtZV0uaXRlbXNbaXRlbUtleV0gPSBpdGVtO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcbiAgICBncm91cEJhbmtCeUl0ZW0oKSB7XHJcbiAgICAgICAgdmFyIF9hLCBfYiwgX2M7XHJcbiAgICAgICAgbGV0IHRvdGFsQmFua1Nsb3RzID0gMDtcclxuICAgICAgICBsZXQgdG90YWxVc2VkQmFua1Nsb3RzID0gMDtcclxuICAgICAgICBsZXQgdG90YWxVbnVzZWRCYW5rU2xvdHMgPSAwO1xyXG4gICAgICAgIC8vIFRPRE86IHR5cGUgdGhpc1xyXG4gICAgICAgIGNvbnN0IGdyb3VwcyA9IHt9O1xyXG4gICAgICAgIGxldCBwYWNrTmFtZTtcclxuICAgICAgICBmb3IgKHBhY2tOYW1lIGluIGNoYXJhY3Rlci5iYW5rKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHBhY2tJdGVtcyA9IGNoYXJhY3Rlci5iYW5rW3BhY2tOYW1lXTtcclxuICAgICAgICAgICAgdG90YWxCYW5rU2xvdHMgKz0gcGFja0l0ZW1zLmxlbmd0aDtcclxuICAgICAgICAgICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IHBhY2tJdGVtcy5sZW5ndGg7IGluZGV4KyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW1JbmZvID0gcGFja0l0ZW1zW2luZGV4XTtcclxuICAgICAgICAgICAgICAgIGlmICghaXRlbUluZm8pIHtcclxuICAgICAgICAgICAgICAgICAgICB0b3RhbFVudXNlZEJhbmtTbG90cysrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY29uc3QgZ0l0ZW0gPSBHLml0ZW1zW2l0ZW1JbmZvLm5hbWVdO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbGV2ZWwgPSAoX2EgPSBpdGVtSW5mby5sZXZlbCkgIT09IG51bGwgJiYgX2EgIT09IHZvaWQgMCA/IF9hIDogMDtcclxuICAgICAgICAgICAgICAgIC8vIFRPRE86IHRyYW5zbGF0ZSB0eXBlIHRvIHJlYWRhYmxlIC8gY29tbW9uIG5hbWUgLyBvdGhlcnNcclxuICAgICAgICAgICAgICAgIC8vIFRPRE86IGdyb3VwIHdlYXBvbnMgYnkgc3VidHlwZT9cclxuICAgICAgICAgICAgICAgIGxldCB0eXBlID0gKF9iID0gdHlwZXNbZ0l0ZW0udHlwZV0pICE9PSBudWxsICYmIF9iICE9PSB2b2lkIDAgPyBfYiA6IFwiT3RoZXJzXCI7XHJcbiAgICAgICAgICAgICAgICBpZiAoZ0l0ZW0uZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPSAoX2MgPSB0eXBlc1tcImV4Y2hhbmdlXCJdKSAhPT0gbnVsbCAmJiBfYyAhPT0gdm9pZCAwID8gX2MgOiBcIk90aGVyc1wiO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbGV0IGl0ZW1CeVR5cGUgPSBncm91cHNbdHlwZV07XHJcbiAgICAgICAgICAgICAgICBpZiAoIWl0ZW1CeVR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtQnlUeXBlID0geyBhbW91bnQ6IDAsIGl0ZW1zOiB7fSB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGdyb3Vwc1t0eXBlXSA9IGl0ZW1CeVR5cGU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBsZXQgaXRlbURhdGEgPSBpdGVtQnlUeXBlLml0ZW1zW2l0ZW1JbmZvLm5hbWVdO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFpdGVtRGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1EYXRhID0geyBhbW91bnQ6IDAsIGxldmVsczoge30gfTtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtQnlUeXBlLml0ZW1zW2l0ZW1JbmZvLm5hbWVdID0gaXRlbURhdGE7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBsZXQgbGV2ZWxzID0gaXRlbURhdGEubGV2ZWxzW2xldmVsXTtcclxuICAgICAgICAgICAgICAgIGlmICghbGV2ZWxzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV2ZWxzID0geyBhbW91bnQ6IGl0ZW1JbmZvLnEgfHwgMSwgaW5kZXhlczogW1twYWNrTmFtZSwgaW5kZXhdXSB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1EYXRhLmxldmVsc1tsZXZlbF0gPSBsZXZlbHM7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtRGF0YS5hbW91bnQgKz0gaXRlbUluZm8ucSB8fCAxO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldmVscy5hbW91bnQgKz0gaXRlbUluZm8ucSB8fCAxO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldmVscy5pbmRleGVzLnB1c2goW3BhY2tOYW1lLCBpbmRleF0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdG90YWxVc2VkQmFua1Nsb3RzKys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHsgdG90YWxCYW5rU2xvdHMsIHRvdGFsVXNlZEJhbmtTbG90cywgdG90YWxVbnVzZWRCYW5rU2xvdHMsIGdyb3VwcyB9O1xyXG4gICAgfVxyXG4gICAgcmVuZGVyQmFua0l0ZW1zKHNlYXJjaCA9IFwiXCIsIGJhbmtJdGVtc0NvbnRhaW5lcikge1xyXG4gICAgICAgIHZhciBfYTtcclxuICAgICAgICBjb25zb2xlLmxvZyhzZWFyY2gpO1xyXG4gICAgICAgIGJhbmtJdGVtc0NvbnRhaW5lciA9IGJhbmtJdGVtc0NvbnRhaW5lciAhPT0gbnVsbCAmJiBiYW5rSXRlbXNDb250YWluZXIgIT09IHZvaWQgMCA/IGJhbmtJdGVtc0NvbnRhaW5lciA6ICQoXCIjYmFuay1pdGVtcy1jb250YWluZXJcIik7XHJcbiAgICAgICAgaWYgKGJhbmtJdGVtc0NvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAvLyAvLyByZXNldCBtb2RhbCBtYXJnaW5cclxuICAgICAgICAgICAgLy8gYmFua0l0ZW1zQ29udGFpbmVyLnBhcmVudCgpLnBhcmVudCgpLmNzcyh7XHJcbiAgICAgICAgICAgIC8vICAgbWFyZ2luVG9wOiBcIjVweFwiLFxyXG4gICAgICAgICAgICAvLyB9KTtcclxuICAgICAgICAgICAgLy8gY2xlYXIgY29udGVudHNcclxuICAgICAgICAgICAgYmFua0l0ZW1zQ29udGFpbmVyLmh0bWwoXCJcIik7XHJcbiAgICAgICAgICAgIGNvbnN0IGdyb3VwcyA9IHRoaXMuZmlsdGVyKHNlYXJjaCk7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFxyXG4gICAgICAgICAgICAvLyAgIFwiYmFuayBzbG90c1wiLFxyXG4gICAgICAgICAgICAvLyAgIHRvdGFsQmFua1Nsb3RzLFxyXG4gICAgICAgICAgICAvLyAgIHRvdGFsVXNlZEJhbmtTbG90cyxcclxuICAgICAgICAgICAgLy8gICB0b3RhbFVudXNlZEJhbmtTbG90c1xyXG4gICAgICAgICAgICAvLyApO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhncm91cHMpO1xyXG4gICAgICAgICAgICBjb25zdCBzb3J0ZWRHcm91cEtleXMgPSBbLi4ubmV3IFNldChPYmplY3QudmFsdWVzKHR5cGVzKSldOyAvLy5zb3J0KChhLCBiKSA9PiBhLmxvY2FsZUNvbXBhcmUoYikpO1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW1UeXBlIG9mIHNvcnRlZEdyb3VwS2V5cykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbXNCeVR5cGUgPSBncm91cHNbaXRlbVR5cGVdO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFpdGVtc0J5VHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbVR5cGVDb250YWluZXIgPSAkKFwiPGRpdiBzdHlsZT0nZmxvYXQ6bGVmdDsgbWFyZ2luLWxlZnQ6NXB4Oyc+XCIpO1xyXG4gICAgICAgICAgICAgICAgaXRlbVR5cGVDb250YWluZXIuYXBwZW5kKGA8ZGl2IGNsYXNzPSdnYW1lYnV0dG9uIGdhbWVidXR0b24tc21hbGwnIHN0eWxlPSdtYXJnaW4tYm90dG9tOiA1cHgnPiR7aXRlbVR5cGV9PC9kaXY+YCk7XHJcbiAgICAgICAgICAgICAgICBiYW5rSXRlbXNDb250YWluZXIuYXBwZW5kKGl0ZW1UeXBlQ29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW1zQ29udGFpbmVyID0gJChcIjxkaXYgc3R5bGU9J21hcmdpbi1ib3R0b206IDEwcHgnPlwiKTtcclxuICAgICAgICAgICAgICAgIGl0ZW1UeXBlQ29udGFpbmVyLmFwcGVuZChpdGVtc0NvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICAvLyBsb29wIGl0ZW1zXHJcbiAgICAgICAgICAgICAgICBsZXQgaXRlbUtleTtcclxuICAgICAgICAgICAgICAgIGZvciAoaXRlbUtleSBpbiBpdGVtc0J5VHlwZS5pdGVtcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGdJdGVtID0gRy5pdGVtc1tpdGVtS2V5XTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGFtb3VudCwgbGV2ZWxzIH0gPSAoX2EgPSBpdGVtc0J5VHlwZS5pdGVtc1tpdGVtS2V5XSkgIT09IG51bGwgJiYgX2EgIT09IHZvaWQgMCA/IF9hIDoge307XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gVE9ETzogaXRlcmF0ZSBiYWNrd2FyZHM/XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBsZXZlbCBpbiBsZXZlbHMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IGxldmVsc1tOdW1iZXIobGV2ZWwpXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmFrZUl0ZW1JbmZvID0geyBuYW1lOiBpdGVtS2V5IH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChOdW1iZXIobGV2ZWwpID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmFrZUl0ZW1JbmZvLmxldmVsID0gTnVtYmVyKGxldmVsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5hbW91bnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZha2VJdGVtSW5mby5xID0gZGF0YS5hbW91bnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVE9ETzogYWRkIGl0ZW1fY29udGFpbmVyIHRvIHR5cGVzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW1Db250YWluZXIgPSAkKHBhcmVudC5pdGVtX2NvbnRhaW5lcih7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBza2luOiBnSXRlbS5za2luLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25jbGljazogXCJyZW5kZXJfaXRlbV9pbmZvKCdcIiArIGl0ZW1LZXkgKyBcIicpXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIGZha2VJdGVtSW5mbykpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBmaW5kIHF1YW50aXR5IGluIGl0ZW0gY29udGFpbmVyIGFuZCBtYWtlIGl0IHByZXR0eVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb3VudEVsZW1lbnQgPSBpdGVtQ29udGFpbmVyLmZpbmQoXCIuaXF1aVwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY291bnQgPSBOdW1iZXIoY291bnRFbGVtZW50LnRleHQoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXR0eUNvdW50ID0gKDAsIHV0aWxzXzEuYWJicmV2aWF0ZU51bWJlcikoY291bnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJldHR5Q291bnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50RWxlbWVudC5odG1sKHByZXR0eUNvdW50LnRvU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zQ29udGFpbmVyLmFwcGVuZChpdGVtQ29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYmFua0l0ZW1zQ29udGFpbmVyLmFwcGVuZChcIjxkaXYgc3R5bGU9J2NsZWFyOmJvdGg7Jz5cIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbnBhcmVudC5lbmhhbmNlZF9iYW5rX3VpID0gbmV3IEVuaGFuY2VkQmFua1VJKCk7XHJcbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==