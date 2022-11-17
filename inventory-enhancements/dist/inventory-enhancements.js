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
    onMouseDownBankItem(e, itemKey, level) {
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
                        // if (itemByLevel.indexes.length <= 0) {
                        //   delete item.levels[level];
                        // }
                        // bank_retrieve is not defined for some reason? seems like we don't have access to the code functions when we paste the code into dev console
                        // bank_retrieve(pack, index);
                        parent.socket.emit("bank", {
                            operation: "swap",
                            pack: pack,
                            str: index,
                            inv: -1, // the server interprets -1 as first slot available
                        });
                        break;
                    }
                }
                // TODO: if the item is a quantity item, we can't just reduce the count by one.. we gotta loop everything again or keep that data available.
                // TODO: groupBankByItem should be called / updated
                // TODO: title should be updated with free slot count
                setTimeout(() => {
                    // delay to let the emit finish
                    const { totalBankSlots, totalUsedBankSlots, totalUnusedBankSlots, groups, } = this.groupBankByItem();
                    this.groups = groups;
                    this.renderBankItems(this.search);
                }, 250);
                break;
            default:
                parent.render_item_info(itemKey);
                break;
        }
    }
    renderBankItems(search = "", bankItemsContainer) {
        var _a;
        this.search = search;
        bankItemsContainer = bankItemsContainer !== null && bankItemsContainer !== void 0 ? bankItemsContainer : $("#bank-items-container");
        if (bankItemsContainer) {
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

})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUFDQTtBQUNBO0FBQ0E7QUFDQSxxRUFBcUUsZ0JBQWdCO0FBQ3JGLGdIQUFnSCxTQUFTO0FBQ3pIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsNEJBQTRCLGlCQUFpQjtBQUM3QztBQUNBO0FBQ0E7QUFDQSwrQ0FBK0M7QUFDL0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx5QkFBeUI7QUFDekI7QUFDQSwwR0FBMEcsUUFBUSxLQUFLLE1BQU07QUFDN0g7QUFDQTtBQUNBO0FBQ0E7QUFDQSx5QkFBeUI7QUFDekI7QUFDQTtBQUNBO0FBQ0E7QUFDQSx5QkFBeUI7QUFDekI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsOERBQThEO0FBQzlEO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vaW52ZW50b3J5LWVuaGFuY2VtZW50cy8uL3NyYy91dGlscy50cyIsIndlYnBhY2s6Ly9pbnZlbnRvcnktZW5oYW5jZW1lbnRzL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL2ludmVudG9yeS1lbmhhbmNlbWVudHMvLi9zcmMvYmFuay50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5leHBvcnRzLmFiYnJldmlhdGVOdW1iZXIgPSB2b2lkIDA7XHJcbi8vIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vYS80MDcyNDM1NC8yODE0NVxyXG5mdW5jdGlvbiBhYmJyZXZpYXRlTnVtYmVyKG51bWJlcikge1xyXG4gICAgY29uc3QgU0lfU1lNQk9MID0gW1wiXCIsIFwia1wiLCBcIk1cIiwgXCJHXCIsIFwiVFwiLCBcIlBcIiwgXCJFXCJdO1xyXG4gICAgaWYgKCFudW1iZXIpIHtcclxuICAgICAgICByZXR1cm4gbnVtYmVyO1xyXG4gICAgfVxyXG4gICAgLy8gd2hhdCB0aWVyPyAoZGV0ZXJtaW5lcyBTSSBzeW1ib2wpXHJcbiAgICBjb25zdCB0aWVyID0gKE1hdGgubG9nMTAoTWF0aC5hYnMobnVtYmVyKSkgLyAzKSB8IDA7XHJcbiAgICAvLyBpZiB6ZXJvLCB3ZSBkb24ndCBuZWVkIGEgc3VmZml4XHJcbiAgICBpZiAodGllciA9PT0gMClcclxuICAgICAgICByZXR1cm4gbnVtYmVyO1xyXG4gICAgLy8gZ2V0IHN1ZmZpeCBhbmQgZGV0ZXJtaW5lIHNjYWxlXHJcbiAgICBjb25zdCBzdWZmaXggPSBTSV9TWU1CT0xbdGllcl07XHJcbiAgICBjb25zdCBzY2FsZSA9IE1hdGgucG93KDEwLCB0aWVyICogMyk7XHJcbiAgICAvLyBzY2FsZSB0aGUgbnVtYmVyXHJcbiAgICBjb25zdCBzY2FsZWQgPSBudW1iZXIgLyBzY2FsZTtcclxuICAgIC8vIGZvcm1hdCBudW1iZXIgYW5kIGFkZCBzdWZmaXhcclxuICAgIC8vICAgcmV0dXJuIHNjYWxlZC50b0ZpeGVkKDEpICsgc3VmZml4O1xyXG4gICAgcmV0dXJuIChzY2FsZWQudG9Mb2NhbGVTdHJpbmcodW5kZWZpbmVkLCB7XHJcbiAgICAgICAgbWluaW11bUZyYWN0aW9uRGlnaXRzOiAxLFxyXG4gICAgICAgIG1heGltdW1GcmFjdGlvbkRpZ2l0czogMSxcclxuICAgIH0pICsgc3VmZml4KTtcclxufVxyXG5leHBvcnRzLmFiYnJldmlhdGVOdW1iZXIgPSBhYmJyZXZpYXRlTnVtYmVyO1xyXG4iLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbi8vIG5weCB0c2MgLi9zcmMvdWkvaW52ZW50b3J5LWVuaGFuY2VtZW50cy50cyAtLXRhcmdldCBlc25leHQgLS1tb2R1bGUgYW1kIC0tb3V0RmlsZSBcIi4vc3JjL3VpL2ludmVudG9yeS1lbmhhbmNlbWVudHMuanNcIlxyXG4vLyBwYXJlbnQuZW5oYW5jZWRfYmFua191aS5zaG93KClcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCB1dGlsc18xID0gcmVxdWlyZShcIi4vdXRpbHNcIik7XHJcbi8vIFRPRE86IHJlbmRlciBBTEwgaXRlbXMgZnJvbSB0aGUgYmFuayB3aGVuIGluIHRoZSBiYW5rXHJcbi8vIFRPRE86IGEgdG9nZ2xlIGJ1dHRvbiB0byBjb21iaW5lIGl0ZW0gc2xvdHMgb3Igbm90LlxyXG4vLyBUT0RPOiBhIHRvZ2dsZSBidXR0b24gdG8gY29tYmluZSBlbXB0eSBpdGVtIHNsb3RzIG9yIG5vdC5cclxuLy8gVE9ETzogc2hvdWxkIGJlIHNlYXJjaGFibGUgKGFscGhhIGJsZW5kIG5vbiB2YWxpZCByZXN1bHRzIHRvIHNlZXRyb3VnaC4pXHJcbi8vIFRPRE86IGFuIGV4dHJhIGZpZWxkIHNob3dpbmcgYWxsIHRoZSB0ZWxsZXJzIHdpdGggdGhlIGFiaWxpdHkgb2YgcHJlc3NpbmcgXCJnb3RvXCIgdGhlIHRlbGxlcnMgcG9zaXRpb24uXHJcbi8vIFRPRE86IHNvbWVob3cgdmFsaWRhdGUgaWYgeW91IGhhdmUgdW5sb2NrZWQgdGhlIGFkZGl0aW9uYWwgYmFuayBsZXZlbHMuXHJcbi8vIFRPRE86IGEgdG9nZ2xlIHRvIGdyb3VwIGl0ZW1zIGJ5IHRoZWlyIGdyb3VwLlxyXG4vLyBUT0RPOiBjYWNoZSB0aGUgYmFuayBpdGVtcyBzbyB5b3UgY2FuIHZpZXcgdGhlbSB3aGVuIGF3YXkuXHJcbi8vIFRPRE86IGEgYnV0dG9uIHRvIHNvcnRcclxuLy8gVE9ETzogY29uZmlndXJhYmxlIHNvcnRpbmcgcnVsZXMuXHJcbi8vIFRPRE86IGRlc2lnbmF0ZSBjZXJ0YWluIGl0ZW1zIHRvIGNlcnRhaW4gdGVsbGVycy5cclxuLy9UT0RPOiBjbGljayB0byB0cmFuc2ZlciBpdGVtcyB0byBjaGFyYWN0ZXJcclxuLy9UT0RPOiBhIHNlYXJjaCBmaWVsZCByZWR1Y2luZyB0aGUgdmlld1xyXG4vL1RPRE86IHNob3dpbmcgYW1vdW50IG9mIGVtcHR5IHNsb3RzIGxlZnRcclxuLy9UT0RPOiBhIGJ1dHRvbiB0byBvcGVuIHRoZSBvdmVydmlldyB2aXNpYmxlIHdoZW4gaW5zaWRlIHRoZSBiYW5rXHJcbi8vVE9ETzogcGVyaGFwcyBhbiBhYmlsaXR5IHRvIGdyb3VwIGl0IGJ5IG5wYyB0ZWxsZXIgaW5zdGVhZCBvZiBpdGVtIHR5cGVzXHJcbi8vIFRPRE86IHJlbmRlciBzaGlueSAvIGdsaXRjaGVkIGRpZmZlcmVudGx5XHJcbi8vIGh0dHBzOi8vYmxvZy5iaXRzcmMuaW8vcHVyZS1jc3MtdG8tbWFrZS1hLWJ1dHRvbi1zaGluZS1hbmQtZ2VudGx5LWNoYW5nZS1jb2xvcnMtb3Zlci10aW1lLTViNjg1ZDljNmE3ZVxyXG4vLyBodHRwczovL2NvZGVwZW4uaW8va2llcmFuZml2ZXN0YXJzL3Blbi9Nd21XUWJcclxuLy8gVE9ETzogZGlmZmVybnQgbW9kZXNcclxuLy8gIGFsbCBpbiBvbmUgaW52ZW50b3J5LCBzaG93IGVhY2ggYmFuayBzbG90IHdpdGggdGhlIGFiaWxpdHkgdG8gZHJhZyBhbmQgZHJvcCBhcm91bmRcclxuLy8gZ3JvdXAgaXRlbXMgYnkgdHlwZSwgY29sbGFwc2Ugc2FtZSBraW5kXHJcbi8vIGdyb3VwIGl0ZW1zIGJ5IGJhbmsgcGFjaywgY29sbGFwc2Ugc2FtZSBraW5kXHJcbi8vIHR5cGUgSW52ZW50b3J5TG9va3VwID0ge1xyXG4vLyAgICAgW1QgaW4gSXRlbU5hbWVdPzoge1xyXG4vLyAgICAgICBhbW91bnQ6IG51bWJlcjtcclxuLy8gICAgICAgbGV2ZWxzOiB7IFtUOiBudW1iZXJdOiB7IGFtb3VudDogbnVtYmVyOyBpbmRleGVzOiBudW1iZXJbXSB9IH07XHJcbi8vICAgICB9O1xyXG4vLyAgIH07XHJcbmNvbnN0IHR5cGVzID0ge1xyXG4gICAgaGVsbWV0OiBcIkhlbG1ldHNcIixcclxuICAgIGNoZXN0OiBcIkFybW9yc1wiLFxyXG4gICAgcGFudHM6IFwiUGFudHNcIixcclxuICAgIGdsb3ZlczogXCJHbG92ZXNcIixcclxuICAgIHNob2VzOiBcIlNob2VzXCIsXHJcbiAgICBjYXBlOiBcIkNhcGVzXCIsXHJcbiAgICByaW5nOiBcIlJpbmdzXCIsXHJcbiAgICBlYXJyaW5nOiBcIkVhcnJpbmdzXCIsXHJcbiAgICBhbXVsZXQ6IFwiQW11bGV0c1wiLFxyXG4gICAgYmVsdDogXCJCZWx0c1wiLFxyXG4gICAgb3JiOiBcIk9yYnNcIixcclxuICAgIHdlYXBvbjogXCJXZWFwb25zXCIsXHJcbiAgICBzaGllbGQ6IFwiU2hpZWxkc1wiLFxyXG4gICAgc291cmNlOiBcIk9mZmhhbmRzXCIsXHJcbiAgICBxdWl2ZXI6IFwiT2ZmaGFuZHNcIixcclxuICAgIG1pc2Nfb2ZmaGFuZDogXCJPZmZoYW5kc1wiLFxyXG4gICAgZWxpeGlyOiBcIkVsaXhpcnNcIixcclxuICAgIHBvdDogXCJQb3Rpb25zXCIsXHJcbiAgICBjc2Nyb2xsOiBcIlNjcm9sbHNcIixcclxuICAgIHVzY3JvbGw6IFwiU2Nyb2xsc1wiLFxyXG4gICAgcHNjcm9sbDogXCJTY3JvbGxzXCIsXHJcbiAgICBvZmZlcmluZzogXCJTY3JvbGxzXCIsXHJcbiAgICBtYXRlcmlhbDogXCJDcmFmdGluZyBhbmQgQ29sbGVjdGluZ1wiLFxyXG4gICAgZXhjaGFuZ2U6IFwiRXhjaGFuZ2VhYmxlc1wiLFxyXG59O1xyXG5jbGFzcyBFbmhhbmNlZEJhbmtVSSB7XHJcbiAgICAvKipcclxuICAgICAqXHJcbiAgICAgKi9cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIC8vIHN1cGVyKCk7XHJcbiAgICAgICAgLy8gVE9ETzogbG9hZCBzZXR0aW5nIGZyb20gbG9jYWwgc3RvcmFnZVxyXG4gICAgICAgIC8vIFRPRE86IGNhY2hlIGJhbmsgaW52ZW50b3J5IGF0IGFuIGludGVydmFsLCBiYXNlZCBvbiBzZXR0aW5nc1xyXG4gICAgICAgIC8vIFRPRE86IHN0YXJ0IGluc2lkZSAvIG91dHNpZGUgYmFuayBjaGVjayB0byBlbmFibGUgLyBkaXNhYmxlIGJ1dHRvblxyXG4gICAgICAgIC8vIFRPRE86IGNhY2hlIGJhbmsgd2hlbiB3ZSBlbnRlciBpdC5cclxuICAgICAgICB0aGlzLmdyb3VwcyA9IHt9O1xyXG4gICAgfVxyXG4gICAgc2hvdygpIHtcclxuICAgICAgICBjb25zdCBpc0luQmFuayA9ICEhY2hhcmFjdGVyLmJhbms7XHJcbiAgICAgICAgY29uc3QgeyB0b3RhbEJhbmtTbG90cywgdG90YWxVc2VkQmFua1Nsb3RzLCB0b3RhbFVudXNlZEJhbmtTbG90cywgZ3JvdXBzIH0gPSB0aGlzLmdyb3VwQmFua0J5SXRlbSgpO1xyXG4gICAgICAgIHRoaXMuZ3JvdXBzID0gZ3JvdXBzO1xyXG4gICAgICAgIGNvbnN0IGNvbnRhaW5lciA9ICQoXCI8ZGl2PlwiLCB7XHJcbiAgICAgICAgICAgIHN0eWxlOiBcImJvcmRlcjogNXB4IHNvbGlkIGdyYXk7IGJhY2tncm91bmQtY29sb3I6IGJsYWNrOyBwYWRkaW5nOiAxMHB4OyB3aWR0aDogOTglXCIsXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY29uc3QgdGl0bGUgPSAkKFwiPGRpdiBzdHlsZT0nY29sb3I6ICNmMWMwNTQ7IGJvcmRlci1ib3R0b206IDJweCBkYXNoZWQgI0M3Q0FDQTsgbWFyZ2luLWJvdHRvbTogM3B4OyBtYXJnaW4tbGVmdDogM3B4OyBtYXJnaW4tcmlnaHQ6IDNweCcgY2xhc3M9J2Nib2xkJz5cIik7XHJcbiAgICAgICAgY29udGFpbmVyLmFwcGVuZCh0aXRsZSk7XHJcbiAgICAgICAgdGl0bGUuYXBwZW5kKFwiQmFua1wiKTtcclxuICAgICAgICAvLyBUT0RPOiB0aGUgc2VhcmNoIGJ1dHRvbiBzaG91bGQgdHJpZ2dlciBhIGNsZWFpbmcgb2YgYmFua0l0ZW1zQ29udGFpbmVyIGFuZCByZS1yZW5kZXIgdGhlIG5ldyBkYXRhXHJcbiAgICAgICAgY29uc3Qgc2VhcmNoQnV0dG9uID0gJChgPGlucHV0IHBsYWNlaG9sZGVyPSdwcmVzcyBlbnRlciB0byBzZWFyY2gnIG9uY2hhbmdlPSdlbmhhbmNlZF9iYW5rX3VpLnJlbmRlckJhbmtJdGVtcyh0aGlzLnZhbHVlKScgdmFsdWU9JyR7XCJcIn0nIC8+YCk7XHJcbiAgICAgICAgdGl0bGUuYXBwZW5kKHNlYXJjaEJ1dHRvbik7XHJcbiAgICAgICAgdGl0bGUuYXBwZW5kKGA8c3Bhbj4ke3RvdGFsVW51c2VkQmFua1Nsb3RzfSAvICR7dG90YWxCYW5rU2xvdHN9IGZyZWUgc2xvdHM8L3NwYW4+YCk7XHJcbiAgICAgICAgY29uc3QgYmFua0l0ZW1zQ29udGFpbmVyID0gJChcIjxkaXY+XCIsIHsgaWQ6IFwiYmFuay1pdGVtcy1jb250YWluZXJcIiB9KTtcclxuICAgICAgICBjb250YWluZXIuYXBwZW5kKGJhbmtJdGVtc0NvbnRhaW5lcik7XHJcbiAgICAgICAgLy8gdHJpZ2dlciByZW5kZXIgYWZ0ZXIgZWxlbWVudHMgZXhpc3QgaW4gdGhlIGRvbVxyXG4gICAgICAgIHRoaXMucmVuZGVyQmFua0l0ZW1zKHVuZGVmaW5lZCwgYmFua0l0ZW1zQ29udGFpbmVyKTtcclxuICAgICAgICAvLyBUT0RPOiBzaG91bGQgbm90IGJlIHJlbmRlcmVkIGFzIGEgbW9kYWwsIHdlIHdhbnQgdG8gYmUgYWJsZSB0byB1dGlsaXplIG91ciBwbGF5ZXIgaW52ZW50b3J5IGFzIHdlbGwgOnRoaW5raW5nOlxyXG4gICAgICAgIHBhcmVudC5zaG93X21vZGFsKGNvbnRhaW5lci53cmFwKFwiPGRpdi8+XCIpLnBhcmVudCgpLmh0bWwoKSwge1xyXG4gICAgICAgICAgICB3cmFwOiAhMSxcclxuICAgICAgICAgICAgaGlkZWluYmFja2dyb3VuZDogITAsXHJcbiAgICAgICAgICAgIHVybDogXCIvZG9jcy9ndWlkZS9hbGwvaXRlbXNcIixcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGZpbHRlcihzZWFyY2gpIHtcclxuICAgICAgICBjb25zdCByZXN1bHQgPSB7fTtcclxuICAgICAgICBmb3IgKGNvbnN0IGdyb3VwTmFtZSBpbiB0aGlzLmdyb3Vwcykge1xyXG4gICAgICAgICAgICBjb25zdCBncm91cCA9IHRoaXMuZ3JvdXBzW2dyb3VwTmFtZV07XHJcbiAgICAgICAgICAgIGxldCBpdGVtS2V5O1xyXG4gICAgICAgICAgICBmb3IgKGl0ZW1LZXkgaW4gZ3JvdXAuaXRlbXMpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGdJdGVtID0gRy5pdGVtc1tpdGVtS2V5XTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBncm91cC5pdGVtc1tpdGVtS2V5XTtcclxuICAgICAgICAgICAgICAgIGxldCBzaG91bGRBZGQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGlmIChzZWFyY2gpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpdGVtS2V5TWF0Y2hlcyA9IGl0ZW1LZXkuaW5kZXhPZihzZWFyY2gpID4gLTE7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbU5hbWVNYXRjaGVzID0gZ0l0ZW0gJiYgZ0l0ZW0ubmFtZS5pbmRleE9mKHNlYXJjaCkgPiAtMTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbUtleU1hdGNoZXMgfHwgaXRlbU5hbWVNYXRjaGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3VsZEFkZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2hvdWxkQWRkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChzaG91bGRBZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdFtncm91cE5hbWVdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdFtncm91cE5hbWVdID0geyBhbW91bnQ6IDAsIGl0ZW1zOiB7fSB9O1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICByZXN1bHRbZ3JvdXBOYW1lXS5pdGVtc1tpdGVtS2V5XSA9IGl0ZW07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuICAgIGdyb3VwQmFua0J5SXRlbSgpIHtcclxuICAgICAgICB2YXIgX2EsIF9iLCBfYywgX2Q7XHJcbiAgICAgICAgbGV0IHRvdGFsQmFua1Nsb3RzID0gMDtcclxuICAgICAgICBsZXQgdG90YWxVc2VkQmFua1Nsb3RzID0gMDtcclxuICAgICAgICBsZXQgdG90YWxVbnVzZWRCYW5rU2xvdHMgPSAwO1xyXG4gICAgICAgIC8vIFRPRE86IHR5cGUgdGhpc1xyXG4gICAgICAgIGNvbnN0IGdyb3VwcyA9IHt9O1xyXG4gICAgICAgIGxldCBwYWNrTmFtZTtcclxuICAgICAgICBmb3IgKHBhY2tOYW1lIGluIGNoYXJhY3Rlci5iYW5rKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHBhY2tJdGVtcyA9IGNoYXJhY3Rlci5iYW5rW3BhY2tOYW1lXTtcclxuICAgICAgICAgICAgdG90YWxCYW5rU2xvdHMgKz0gKF9hID0gcGFja0l0ZW1zLmxlbmd0aCkgIT09IG51bGwgJiYgX2EgIT09IHZvaWQgMCA/IF9hIDogMDtcclxuICAgICAgICAgICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IHBhY2tJdGVtcy5sZW5ndGg7IGluZGV4KyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW1JbmZvID0gcGFja0l0ZW1zW2luZGV4XTtcclxuICAgICAgICAgICAgICAgIGlmICghaXRlbUluZm8pIHtcclxuICAgICAgICAgICAgICAgICAgICB0b3RhbFVudXNlZEJhbmtTbG90cysrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY29uc3QgZ0l0ZW0gPSBHLml0ZW1zW2l0ZW1JbmZvLm5hbWVdO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbGV2ZWwgPSAoX2IgPSBpdGVtSW5mby5sZXZlbCkgIT09IG51bGwgJiYgX2IgIT09IHZvaWQgMCA/IF9iIDogMDtcclxuICAgICAgICAgICAgICAgIC8vIFRPRE86IHRyYW5zbGF0ZSB0eXBlIHRvIHJlYWRhYmxlIC8gY29tbW9uIG5hbWUgLyBvdGhlcnNcclxuICAgICAgICAgICAgICAgIC8vIFRPRE86IGdyb3VwIHdlYXBvbnMgYnkgc3VidHlwZT9cclxuICAgICAgICAgICAgICAgIGxldCB0eXBlID0gKF9jID0gdHlwZXNbZ0l0ZW0udHlwZV0pICE9PSBudWxsICYmIF9jICE9PSB2b2lkIDAgPyBfYyA6IFwiT3RoZXJzXCI7XHJcbiAgICAgICAgICAgICAgICBpZiAoZ0l0ZW0uZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPSAoX2QgPSB0eXBlc1tcImV4Y2hhbmdlXCJdKSAhPT0gbnVsbCAmJiBfZCAhPT0gdm9pZCAwID8gX2QgOiBcIk90aGVyc1wiO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbGV0IGl0ZW1CeVR5cGUgPSBncm91cHNbdHlwZV07XHJcbiAgICAgICAgICAgICAgICBpZiAoIWl0ZW1CeVR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtQnlUeXBlID0geyBhbW91bnQ6IDAsIGl0ZW1zOiB7fSB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGdyb3Vwc1t0eXBlXSA9IGl0ZW1CeVR5cGU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBsZXQgaXRlbURhdGEgPSBpdGVtQnlUeXBlLml0ZW1zW2l0ZW1JbmZvLm5hbWVdO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFpdGVtRGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1EYXRhID0geyBhbW91bnQ6IDAsIGxldmVsczoge30gfTtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtQnlUeXBlLml0ZW1zW2l0ZW1JbmZvLm5hbWVdID0gaXRlbURhdGE7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBsZXQgbGV2ZWxzID0gaXRlbURhdGEubGV2ZWxzW2xldmVsXTtcclxuICAgICAgICAgICAgICAgIGlmICghbGV2ZWxzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV2ZWxzID0geyBhbW91bnQ6IGl0ZW1JbmZvLnEgfHwgMSwgaW5kZXhlczogW1twYWNrTmFtZSwgaW5kZXhdXSB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1EYXRhLmxldmVsc1tsZXZlbF0gPSBsZXZlbHM7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtRGF0YS5hbW91bnQgKz0gaXRlbUluZm8ucSB8fCAxO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldmVscy5hbW91bnQgKz0gaXRlbUluZm8ucSB8fCAxO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldmVscy5pbmRleGVzLnB1c2goW3BhY2tOYW1lLCBpbmRleF0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdG90YWxVc2VkQmFua1Nsb3RzKys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHsgdG90YWxCYW5rU2xvdHMsIHRvdGFsVXNlZEJhbmtTbG90cywgdG90YWxVbnVzZWRCYW5rU2xvdHMsIGdyb3VwcyB9O1xyXG4gICAgfVxyXG4gICAgb25Nb3VzZURvd25CYW5rSXRlbShlLCBpdGVtS2V5LCBsZXZlbCkge1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICBzd2l0Y2ggKGUud2hpY2gpIHtcclxuICAgICAgICAgICAgY2FzZSAzOiAvLyByaWdodCBjbGlja1xyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gdGhpcy5ncm91cHMpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBncm91cCA9IHRoaXMuZ3JvdXBzW2tleV07XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbSA9IGdyb3VwLml0ZW1zW2l0ZW1LZXldO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghaXRlbSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbUJ5TGV2ZWwgPSBpdGVtLmxldmVsc1tsZXZlbF07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW1CeUxldmVsICYmIGl0ZW1CeUxldmVsLmluZGV4ZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBbcGFjaywgaW5kZXhdID0gaXRlbUJ5TGV2ZWwuaW5kZXhlcy5zcGxpY2UoMCwgMSlbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlmIChpdGVtQnlMZXZlbC5pbmRleGVzLmxlbmd0aCA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgZGVsZXRlIGl0ZW0ubGV2ZWxzW2xldmVsXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBiYW5rX3JldHJpZXZlIGlzIG5vdCBkZWZpbmVkIGZvciBzb21lIHJlYXNvbj8gc2VlbXMgbGlrZSB3ZSBkb24ndCBoYXZlIGFjY2VzcyB0byB0aGUgY29kZSBmdW5jdGlvbnMgd2hlbiB3ZSBwYXN0ZSB0aGUgY29kZSBpbnRvIGRldiBjb25zb2xlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGJhbmtfcmV0cmlldmUocGFjaywgaW5kZXgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQuc29ja2V0LmVtaXQoXCJiYW5rXCIsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZXJhdGlvbjogXCJzd2FwXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWNrOiBwYWNrLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyOiBpbmRleCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludjogLTEsIC8vIHRoZSBzZXJ2ZXIgaW50ZXJwcmV0cyAtMSBhcyBmaXJzdCBzbG90IGF2YWlsYWJsZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogaWYgdGhlIGl0ZW0gaXMgYSBxdWFudGl0eSBpdGVtLCB3ZSBjYW4ndCBqdXN0IHJlZHVjZSB0aGUgY291bnQgYnkgb25lLi4gd2UgZ290dGEgbG9vcCBldmVyeXRoaW5nIGFnYWluIG9yIGtlZXAgdGhhdCBkYXRhIGF2YWlsYWJsZS5cclxuICAgICAgICAgICAgICAgIC8vIFRPRE86IGdyb3VwQmFua0J5SXRlbSBzaG91bGQgYmUgY2FsbGVkIC8gdXBkYXRlZFxyXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogdGl0bGUgc2hvdWxkIGJlIHVwZGF0ZWQgd2l0aCBmcmVlIHNsb3QgY291bnRcclxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGRlbGF5IHRvIGxldCB0aGUgZW1pdCBmaW5pc2hcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHRvdGFsQmFua1Nsb3RzLCB0b3RhbFVzZWRCYW5rU2xvdHMsIHRvdGFsVW51c2VkQmFua1Nsb3RzLCBncm91cHMsIH0gPSB0aGlzLmdyb3VwQmFua0J5SXRlbSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ3JvdXBzID0gZ3JvdXBzO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyQmFua0l0ZW1zKHRoaXMuc2VhcmNoKTtcclxuICAgICAgICAgICAgICAgIH0sIDI1MCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHBhcmVudC5yZW5kZXJfaXRlbV9pbmZvKGl0ZW1LZXkpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmVuZGVyQmFua0l0ZW1zKHNlYXJjaCA9IFwiXCIsIGJhbmtJdGVtc0NvbnRhaW5lcikge1xyXG4gICAgICAgIHZhciBfYTtcclxuICAgICAgICB0aGlzLnNlYXJjaCA9IHNlYXJjaDtcclxuICAgICAgICBiYW5rSXRlbXNDb250YWluZXIgPSBiYW5rSXRlbXNDb250YWluZXIgIT09IG51bGwgJiYgYmFua0l0ZW1zQ29udGFpbmVyICE9PSB2b2lkIDAgPyBiYW5rSXRlbXNDb250YWluZXIgOiAkKFwiI2JhbmstaXRlbXMtY29udGFpbmVyXCIpO1xyXG4gICAgICAgIGlmIChiYW5rSXRlbXNDb250YWluZXIpIHtcclxuICAgICAgICAgICAgLy8gY2xlYXIgY29udGVudHNcclxuICAgICAgICAgICAgYmFua0l0ZW1zQ29udGFpbmVyLmh0bWwoXCJcIik7XHJcbiAgICAgICAgICAgIGNvbnN0IGdyb3VwcyA9IHRoaXMuZmlsdGVyKHNlYXJjaCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHNvcnRlZEdyb3VwS2V5cyA9IFsuLi5uZXcgU2V0KE9iamVjdC52YWx1ZXModHlwZXMpKV07IC8vLnNvcnQoKGEsIGIpID0+IGEubG9jYWxlQ29tcGFyZShiKSk7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbVR5cGUgb2Ygc29ydGVkR3JvdXBLZXlzKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtc0J5VHlwZSA9IGdyb3Vwc1tpdGVtVHlwZV07XHJcbiAgICAgICAgICAgICAgICBpZiAoIWl0ZW1zQnlUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtVHlwZUNvbnRhaW5lciA9ICQoXCI8ZGl2IHN0eWxlPSdmbG9hdDpsZWZ0OyBtYXJnaW4tbGVmdDo1cHg7Jz5cIik7XHJcbiAgICAgICAgICAgICAgICBpdGVtVHlwZUNvbnRhaW5lci5hcHBlbmQoYDxkaXYgY2xhc3M9J2dhbWVidXR0b24gZ2FtZWJ1dHRvbi1zbWFsbCcgc3R5bGU9J21hcmdpbi1ib3R0b206IDVweCc+JHtpdGVtVHlwZX08L2Rpdj5gKTtcclxuICAgICAgICAgICAgICAgIGJhbmtJdGVtc0NvbnRhaW5lci5hcHBlbmQoaXRlbVR5cGVDb250YWluZXIpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbXNDb250YWluZXIgPSAkKFwiPGRpdiBzdHlsZT0nbWFyZ2luLWJvdHRvbTogMTBweCc+XCIpO1xyXG4gICAgICAgICAgICAgICAgaXRlbVR5cGVDb250YWluZXIuYXBwZW5kKGl0ZW1zQ29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgIC8vIGxvb3AgaXRlbXNcclxuICAgICAgICAgICAgICAgIGxldCBpdGVtS2V5O1xyXG4gICAgICAgICAgICAgICAgZm9yIChpdGVtS2V5IGluIGl0ZW1zQnlUeXBlLml0ZW1zKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZ0l0ZW0gPSBHLml0ZW1zW2l0ZW1LZXldO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgYW1vdW50LCBsZXZlbHMgfSA9IChfYSA9IGl0ZW1zQnlUeXBlLml0ZW1zW2l0ZW1LZXldKSAhPT0gbnVsbCAmJiBfYSAhPT0gdm9pZCAwID8gX2EgOiB7fTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBUT0RPOiBpdGVyYXRlIGJhY2t3YXJkcz9cclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGxldmVsIGluIGxldmVscykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gbGV2ZWxzW051bWJlcihsZXZlbCldO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmYWtlSXRlbUluZm8gPSB7IG5hbWU6IGl0ZW1LZXkgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKE51bWJlcihsZXZlbCkgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmYWtlSXRlbUluZm8ubGV2ZWwgPSBOdW1iZXIobGV2ZWwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLmFtb3VudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmFrZUl0ZW1JbmZvLnEgPSBkYXRhLmFtb3VudDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUT0RPOiBhZGQgaXRlbV9jb250YWluZXIgdG8gdHlwZXNcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbUNvbnRhaW5lciA9ICQocGFyZW50Lml0ZW1fY29udGFpbmVyKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNraW46IGdJdGVtLnNraW4sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBvbmNsaWNrOiBcInJlbmRlcl9pdGVtX2luZm8oJ1wiICsgaXRlbUtleSArIFwiJylcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgZmFrZUl0ZW1JbmZvKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGhhbmRsZSBsZWZ0IGFuZCByaWdodCBjbGlja1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtQ29udGFpbmVyLmF0dHIoXCJvbm1vdXNlZG93blwiLCBgZW5oYW5jZWRfYmFua191aS5vbk1vdXNlRG93bkJhbmtJdGVtKGV2ZW50LCAnJHtpdGVtS2V5fScsICR7bGV2ZWx9KWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBsZXZlbCBjb250YWluZXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbGV2ZWxFbGVtZW50ID0gaXRlbUNvbnRhaW5lci5maW5kKFwiLml1dWlcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldmVsRWxlbWVudC5jc3Moe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9udFNpemU6IFwiMTZweFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZmluZCBxdWFudGl0eSBpbiBpdGVtIGNvbnRhaW5lciBhbmQgbWFrZSBpdCBwcmV0dHlcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY291bnRFbGVtZW50ID0gaXRlbUNvbnRhaW5lci5maW5kKFwiLmlxdWlcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50RWxlbWVudC5jc3Moe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9udFNpemU6IFwiMTZweFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY291bnQgPSBOdW1iZXIoY291bnRFbGVtZW50LnRleHQoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXR0eUNvdW50ID0gKDAsIHV0aWxzXzEuYWJicmV2aWF0ZU51bWJlcikoY291bnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJldHR5Q291bnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50RWxlbWVudC5odG1sKHByZXR0eUNvdW50LnRvU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zQ29udGFpbmVyLmFwcGVuZChpdGVtQ29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYmFua0l0ZW1zQ29udGFpbmVyLmFwcGVuZChcIjxkaXYgc3R5bGU9J2NsZWFyOmJvdGg7Jz5cIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbnBhcmVudC5lbmhhbmNlZF9iYW5rX3VpID0gbmV3IEVuaGFuY2VkQmFua1VJKCk7XHJcbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==