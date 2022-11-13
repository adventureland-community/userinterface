/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it uses a non-standard name for the exports (exports).
(() => {
var exports = __webpack_exports__;
/*!*********************!*\
  !*** ./src/bank.ts ***!
  \*********************/

// npx tsc ./src/ui/inventory-enhancements.ts --target esnext --module amd --outFile "./src/ui/inventory-enhancements.js"
// TODO: a bagnon / all in one inventory for the bank
// TODO: also extend the player inventory
Object.defineProperty(exports, "__esModule", ({ value: true }));
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
function renderBankItems(search = "") {
    var _a, _b, _c;
    console.log(search);
    const bankItemsContainer = $("#bank-items-container");
    if (bankItemsContainer) {
        // reset modal margin
        bankItemsContainer.parent().parent().css({
            marginTop: "5px",
        });
        // clear contents
        bankItemsContainer.html("");
        let totalBankSlots = 0;
        let totalUsedBankSlots = 0;
        let totalUnusedBankSlots = 0;
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
                if (search) {
                    const itemKeyMatches = itemInfo.name.indexOf(search) > -1;
                    const itemNameMatches = gItem && gItem.name.indexOf(search) > -1;
                    if (!itemKeyMatches && !itemNameMatches) {
                        continue;
                    }
                }
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
        console.log("bank slots", totalBankSlots, totalUsedBankSlots, totalUnusedBankSlots);
        console.log(groups);
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
            for (const itemKey in itemsByType.items) {
                const gItem = G.items[itemKey];
                const { amount, levels, } = itemsByType.items[itemKey];
                // TODO: iterate backwards?
                for (let level in levels) {
                    const data = levels[level];
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
                    const prettyCount = abbreviateNumber(count);
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
function renderEnhancedBankUI() {
    const isInBank = !!character.bank;
    const container = $("<div>", {
        style: "border: 5px solid gray; background-color: black; padding: 10px; width: 98%",
    });
    const title = $("<div style='color: #f1c054; border-bottom: 2px dashed #C7CACA; margin-bottom: 3px; margin-left: 3px; margin-right: 3px' class='cbold'>");
    container.append(title);
    title.append("Bank");
    // TODO: the search button should trigger a cleaing of bankItemsContainer and re-render the new data
    const searchButton = $(`<input placeholder='press enter to search' onchange='renderBankItems(this.value)' value='${""}' />`);
    title.append(searchButton);
    const bankItemsContainer = $("<div>", { id: "bank-items-container" });
    container.append(bankItemsContainer);
    // TODO: should not be rendered as a modal, we want to be able to utilize our player inventory as well :thinking:
    parent.show_modal(container.wrap("<div/>").parent().html(), {
        wrap: !1,
        hideinbackground: !0,
        url: "/docs/guide/all/items",
    });
    // trigger render after elements exist in the dom
    renderBankItems();
}
// TODO: group items by name then by level, utilize classes / namespaces ?
// class InventoryEnhancements {
//   /**
//    *
//    */
//   constructor() {
//     // super();
//     // TODO: load setting from local storage
//     // TODO: cache bank inventory at an interval, based on settings
//   }
//   public showBankUI() {
//     const isInBank = !!character.bank;
//     const bankContainer = $(
//       "<div style='background-color: black; border: 5px solid gray; padding: 2px; font-size: 24px; display: inline-block' class='dcontain'>"
//     );
//     bankContainer.append("<div>test</div>");
//     // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
//     (<any>parent).show_modal(bankContainer, {
//       wrap: !1,
//       hideinbackground: !0,
//       url: "/docs/guide/all/items",
//     });
//   }
// }
// export const inventoryEnhancements = new InventoryEnhancements();
// // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
// (<any>parent).inventoryEnhancements = inventoryEnhancements;
// this seems nice to show a modal
//     parent.show_modal(b, {
//       wrap: !1,
//       hideinbackground: !0,
//       url: "/docs/guide/all/items",
//     });
// function npc_right_click(event){ seems interesting
// UI seems to just be added to body.
// container
// var html="<div style='background-color: black; border: 5px solid gray; padding: 2px; font-size: 24px; display: inline-block' class='dcontain'>";
// html+="</div><div id='storage-item' class='rendercontainer' style='display: inline-block; vertical-align: top; margin-left: 5px'></div>";
// 	$("#topleftcornerui").html(html);
// function render_inventory(reset) renders the player inventory
// for(var i=0;i<Math.ceil(max(character.isize,character.items.length)/columns);i++)
// {
//     html+="<div>"
//     for(var j=0;j<columns;j++)
//     {
//         var current=null,id='citem'+last,cc_id='c'+id;
//         if(last<character.items.length) current=character.items[last];
//         if(current)
//         {
//             var item=G.items[current.name]||{"skin":"test","name":"Unrecognized Item"},skin=current.skin||item.skin;
//             if(current.expires) skin=item.skin_a;
//             if(current.name=="placeholder")
//             {
//                 var rid=randomStr(8);
//                 var name=current.p && current.p.name || "placeholder_m";
//                 html+=item_container({shade:G.items[name].skin,onclick:"inventory_click("+last+",event)",onmousedown:"inventory_middle("+last+",event)",def:item,id:id,cid:cc_id,draggable:false,num:last,cnum:last,s_op:0.5,bcolor:"gray ",loader:"qplc"+rid,level:current.p&&current.p.level||undefined,iname:name});
//                 rids[last]=rid;
//             }
//             else
//             {
//                 html+=item_container({skin:skin,onclick:"inventory_click("+last+",event)",onmousedown:"inventory_middle("+last+",event)",def:item,id:id,cid:cc_id,draggable:true,num:last,cnum:last},current);
//             }
//         }
//         else
//         {
//             html+=item_container({size:40,draggable:true,cnum:last,cid:cc_id});
//         }
//         last++;
//     }
//     html+="</div>";
// }
// this seems responsible for rendering the bank tellers / other npcs
// function render_items_npc(pack)
// var character_slots=["ring1","ring2","earring1","earring2","belt","mainhand","offhand","helmet","chest","pants","shoes","gloves","amulet","orb","elixir","cape"];
// var attire_slots=["helmet","chest","pants","shoes","gloves","cape"];
// var riches_slots=["ring1","ring2","earring1","earring2","amulet"];
// var booster_items=["xpbooster","luckbooster","goldbooster"];
// var doublehand_types=["axe","basher","great_staff"];
// var offhand_types={
// 	"quiver":"Quiver",
// 	"shield":"Shield",
// 	"misc_offhand":"Misc Offhand",
// 	"source":"Source"
// };
// var weapon_types={
// 	"sword":"Sword",
// 	"short_sword":"Short Sword",
// 	"great_sword":"Great Sword",
// 	"axe":"Axe",
// 	"wblade":"Magical Sword",
// 	"basher":"Basher",
// 	"dartgun":"Dart Gun",
// 	"bow":"Bow",
// 	"crossbow":"Crossbow",
// 	"rapier":"Rapier",
// 	"spear":"Spear",
// 	"fist":"Fist Weapon",
// 	"dagger":"Dagger",
// 	"stars":"Throwing Stars",
// 	"mace":"Mace",
// 	"pmace":"Priest Mace",
// 	"staff":"Staff",
// 	"wand":"Wand",
// };
// /**
//  * Originally shared by drippy on discord https://discord.com/channels/238332476743745536/243707345887166465/1041087432055066744
//  * we do not know who originally made it.
//  * modified by thmsn to use more with and float item categories
//  * usage: load theese functions into your parent window and execute the following command while in the bank
//  * `parent.render_bank_items()`
//  */
//  function render_bank_items() {
//     if (!character.bank) return game_log("Not inside the bank");
//     function itm_cmp(a, b) {
//       return (
//         (a == null) - (b == null) ||
//         (a && (a.name < b.name ? -1 : +(a.name > b.name))) ||
//         (a && b.level - a.level)
//       );
//     }
//     var a = [
//         ["Helmets", []],
//         ["Armors", []],
//         ["Underarmors", []],
//         ["Gloves", []],
//         ["Shoes", []],
//         ["Capes", []],
//         ["Rings", []],
//         ["Earrings", []],
//         ["Amulets", []],
//         ["Belts", []],
//         ["Orbs", []],
//         ["Weapons", []],
//         ["Shields", []],
//         ["Offhands", []],
//         ["Elixirs", []],
//         ["Potions", []],
//         ["Scrolls", []],
//         ["Crafting and Collecting", []],
//         ["Exchangeables", []],
//         ["Others", []],
//       ],
//       b =
//         "<div style='border: 5px solid gray; background-color: black; padding: 10px; width: 90%'>";
//     let slot_ids = [
//       "helmet",
//       "chest",
//       "pants",
//       "gloves",
//       "shoes",
//       "cape",
//       "ring",
//       "earring",
//       "amulet",
//       "belt",
//       "orb",
//       "weapon",
//       "shield",
//       "offhand",
//       "elixir",
//       "pot",
//       "scroll",
//       "material",
//       "exchange",
//       "",
//     ];
//     object_sort(G.items, "gold_value").forEach(function (b) {
//       if (!b[1].ignore)
//         for (var c = 0; c < a.length; c++)
//           if (
//             !slot_ids[c] ||
//             b[1].type == slot_ids[c] ||
//             ("offhand" == slot_ids[c] &&
//               in_arr(b[1].type, ["source", "quiver", "misc_offhand"])) ||
//             ("scroll" == slot_ids[c] &&
//               in_arr(b[1].type, ["cscroll", "uscroll", "pscroll", "offering"])) ||
//             ("exchange" == slot_ids[c] && G.items[b[0]].e)
//           ) {
//             //a[c][1].push({name:b[1].id});
//             const dest_type = b[1].id;
//             let type_in_bank = [];
//             for (let bank_pock in character.bank) {
//               const bank_pack = character.bank[bank_pock];
//               for (let bonk_item in bank_pack) {
//                 const bank_item = bank_pack[bonk_item];
//                 if (bank_item && bank_item.name == dest_type)
//                   type_in_bank.push(bank_item);
//               }
//             }
//             type_in_bank.sort(itm_cmp);
//             //sucessive merge, flatten
//             for (let io = type_in_bank.length - 1; io >= 1; io--) {
//               if (itm_cmp(type_in_bank[io], type_in_bank[io - 1]) == 0) {
//                 type_in_bank[io - 1].q =
//                   (type_in_bank[io - 1].q || 1) + (type_in_bank[io].q || 1);
//                 type_in_bank.splice(io, 1);
//               }
//             }
//             a[c][1].push(type_in_bank);
//             break;
//           }
//     });
//     for (var c = 0; c < a.length; c++) {
//       a[c][1] = a[c][1].flat();
//     }
//     //show_json(a);
//     render_items(a);
//   }
//   function render_items(a) {
//     if (a.length > 0 && !Array.isArray(a[0])) {
//       a = [["Items", a]];
//     }
//     let b =
//       "<div style='border: 5px solid gray; background-color: black; padding: 10px; width: 90%, height:90%'>";
//     a.forEach(function (a) {
//       b +=
//         "<div style='float:left; margin-left:5px;'><div class='gamebutton gamebutton-small' style='margin-bottom: 5px'>" +
//         a[0] +
//         "</div>";
//       b += "<div style='margin-bottom: 10px'>";
//       a[1].forEach(function (a) {
//         b += parent.item_container(
//           {
//             skin: G.items[a.name].skin,
//             onclick: "render_item_info('" + a.name + "')",
//           },
//           a
//         );
//       });
//       b += "</div></div>";
//     });
//     b += "<div style='clear:both;'></div></div>";
//     parent.show_modal(b, {
//       wrap: !1,
//       hideinbackground: !0,
//       url: "/docs/guide/all/items",
//     });
//   }
// function inventory_click(num,event)
// {
// 	console.log(event);
// 	if(is_comm && event) return stpr(event);
// 	if(event && (event.which==2 || event.button==4))
// 	{
// 		inventory_middle(num,event)
// 	}
// 	else
// 	{
// 		var iname="";
// 		if(character.items[num]) iname=character.items[num].name+character.items[num].level;
// 		if(last_invclick && last_invclick==num+iname && $(".inventory-item").html().length)
// 			$(".inventory-item").html("");
// 		else if(character.items[num])
// 		{
// 			if(character.items[num].name=="placeholder") return;
// 			if(character.items[num].name=="computer") // gameplay=="hardcore" &&
// 			{
// 				return render_computer_network(".inventory-item");
// 			}
// 			render_item(".inventory-item",{id:"citem"+num,item:G.items[character.items[num].name],name:character.items[num].name,actual:character.items[num],num:num,inventory_ui:num});
// 			last_invclick=num+iname;
// 		}
// 	}
// }
// function inventory_middle(num,event)
// {
// 	if(event && (event.which==2 || event.button==4))
// 	{
// 		if(character.items[num] && character.items[num].q && character.items[num].q>1)
// 		{
// 			if(character.items[num].q==2) split(num,1);
// 			else
// 			{
// 				get_input([
// 					{title:"(1-"+min(G.items[character.items[num].name].s||1,character.items[num].q-1)+")"},
// 					{input:"qt",placeholder:"Quantity",style:"width: 320px; text-align: left !important;"},
// 					{button:"Split",small:true,onclick:function(){
// 						pcs();
// 						split(num,$(".qt").val());
// 						hide_modal(1);
// 					}}
// 				]);
// 			}
// 		}
// 	}
// }

})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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Q0EsOENBQThDLHlCQUF5QixlQUFlO0FBQ3RGO0FBQ0E7QUFDQSxvQ0FBb0MsZ0JBQWdCO0FBQ3BEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxjQUFjO0FBQ2Q7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBLFFBQVE7QUFDUixvQ0FBb0M7QUFDcEM7QUFDQTtBQUNBO0FBQ0E7QUFDQSxRQUFRO0FBQ1I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxQ0FBcUMsMklBQTJJO0FBQ2hMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTLHNGQUFzRjtBQUMvRixTQUFTLHVEQUF1RCw0QkFBNEIsRUFBRTtBQUM5RixTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vaW52ZW50b3J5LWVuaGFuY2VtZW50cy8uL3NyYy9iYW5rLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xyXG4vLyBucHggdHNjIC4vc3JjL3VpL2ludmVudG9yeS1lbmhhbmNlbWVudHMudHMgLS10YXJnZXQgZXNuZXh0IC0tbW9kdWxlIGFtZCAtLW91dEZpbGUgXCIuL3NyYy91aS9pbnZlbnRvcnktZW5oYW5jZW1lbnRzLmpzXCJcclxuLy8gVE9ETzogYSBiYWdub24gLyBhbGwgaW4gb25lIGludmVudG9yeSBmb3IgdGhlIGJhbmtcclxuLy8gVE9ETzogYWxzbyBleHRlbmQgdGhlIHBsYXllciBpbnZlbnRvcnlcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG4vLyBUT0RPOiByZW5kZXIgQUxMIGl0ZW1zIGZyb20gdGhlIGJhbmsgd2hlbiBpbiB0aGUgYmFua1xyXG4vLyBUT0RPOiBhIHRvZ2dsZSBidXR0b24gdG8gY29tYmluZSBpdGVtIHNsb3RzIG9yIG5vdC5cclxuLy8gVE9ETzogYSB0b2dnbGUgYnV0dG9uIHRvIGNvbWJpbmUgZW1wdHkgaXRlbSBzbG90cyBvciBub3QuXHJcbi8vIFRPRE86IHNob3VsZCBiZSBzZWFyY2hhYmxlIChhbHBoYSBibGVuZCBub24gdmFsaWQgcmVzdWx0cyB0byBzZWV0cm91Z2guKVxyXG4vLyBUT0RPOiBhbiBleHRyYSBmaWVsZCBzaG93aW5nIGFsbCB0aGUgdGVsbGVycyB3aXRoIHRoZSBhYmlsaXR5IG9mIHByZXNzaW5nIFwiZ290b1wiIHRoZSB0ZWxsZXJzIHBvc2l0aW9uLlxyXG4vLyBUT0RPOiBzb21laG93IHZhbGlkYXRlIGlmIHlvdSBoYXZlIHVubG9ja2VkIHRoZSBhZGRpdGlvbmFsIGJhbmsgbGV2ZWxzLlxyXG4vLyBUT0RPOiBhIHRvZ2dsZSB0byBncm91cCBpdGVtcyBieSB0aGVpciBncm91cC5cclxuLy8gVE9ETzogY2FjaGUgdGhlIGJhbmsgaXRlbXMgc28geW91IGNhbiB2aWV3IHRoZW0gd2hlbiBhd2F5LlxyXG4vLyBUT0RPOiBhIGJ1dHRvbiB0byBzb3J0XHJcbi8vIFRPRE86IGNvbmZpZ3VyYWJsZSBzb3J0aW5nIHJ1bGVzLlxyXG4vLyBUT0RPOiBkZXNpZ25hdGUgY2VydGFpbiBpdGVtcyB0byBjZXJ0YWluIHRlbGxlcnMuXHJcbi8vVE9ETzogY2xpY2sgdG8gdHJhbnNmZXIgaXRlbXMgdG8gY2hhcmFjdGVyXHJcbi8vVE9ETzogYSBzZWFyY2ggZmllbGQgcmVkdWNpbmcgdGhlIHZpZXdcclxuLy9UT0RPOiBzaG93aW5nIGFtb3VudCBvZiBlbXB0eSBzbG90cyBsZWZ0XHJcbi8vVE9ETzogYSBidXR0b24gdG8gb3BlbiB0aGUgb3ZlcnZpZXcgdmlzaWJsZSB3aGVuIGluc2lkZSB0aGUgYmFua1xyXG4vL1RPRE86IHBlcmhhcHMgYW4gYWJpbGl0eSB0byBncm91cCBpdCBieSBucGMgdGVsbGVyIGluc3RlYWQgb2YgaXRlbSB0eXBlc1xyXG4vLyBUT0RPOiBkaWZmZXJudCBtb2Rlc1xyXG4vLyAgYWxsIGluIG9uZSBpbnZlbnRvcnksIHNob3cgZWFjaCBiYW5rIHNsb3Qgd2l0aCB0aGUgYWJpbGl0eSB0byBkcmFnIGFuZCBkcm9wIGFyb3VuZFxyXG4vLyBncm91cCBpdGVtcyBieSB0eXBlLCBjb2xsYXBzZSBzYW1lIGtpbmRcclxuLy8gZ3JvdXAgaXRlbXMgYnkgYmFuayBwYWNrLCBjb2xsYXBzZSBzYW1lIGtpbmRcclxuLy8gdHlwZSBJbnZlbnRvcnlMb29rdXAgPSB7XHJcbi8vICAgICBbVCBpbiBJdGVtTmFtZV0/OiB7XHJcbi8vICAgICAgIGFtb3VudDogbnVtYmVyO1xyXG4vLyAgICAgICBsZXZlbHM6IHsgW1Q6IG51bWJlcl06IHsgYW1vdW50OiBudW1iZXI7IGluZGV4ZXM6IG51bWJlcltdIH0gfTtcclxuLy8gICAgIH07XHJcbi8vICAgfTtcclxuLy8gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9hLzQwNzI0MzU0LzI4MTQ1XHJcbmZ1bmN0aW9uIGFiYnJldmlhdGVOdW1iZXIobnVtYmVyKSB7XHJcbiAgICBjb25zdCBTSV9TWU1CT0wgPSBbXCJcIiwgXCJrXCIsIFwiTVwiLCBcIkdcIiwgXCJUXCIsIFwiUFwiLCBcIkVcIl07XHJcbiAgICBpZiAoIW51bWJlcikge1xyXG4gICAgICAgIHJldHVybiBudW1iZXI7XHJcbiAgICB9XHJcbiAgICAvLyB3aGF0IHRpZXI/IChkZXRlcm1pbmVzIFNJIHN5bWJvbClcclxuICAgIGNvbnN0IHRpZXIgPSAoTWF0aC5sb2cxMChNYXRoLmFicyhudW1iZXIpKSAvIDMpIHwgMDtcclxuICAgIC8vIGlmIHplcm8sIHdlIGRvbid0IG5lZWQgYSBzdWZmaXhcclxuICAgIGlmICh0aWVyID09PSAwKVxyXG4gICAgICAgIHJldHVybiBudW1iZXI7XHJcbiAgICAvLyBnZXQgc3VmZml4IGFuZCBkZXRlcm1pbmUgc2NhbGVcclxuICAgIGNvbnN0IHN1ZmZpeCA9IFNJX1NZTUJPTFt0aWVyXTtcclxuICAgIGNvbnN0IHNjYWxlID0gTWF0aC5wb3coMTAsIHRpZXIgKiAzKTtcclxuICAgIC8vIHNjYWxlIHRoZSBudW1iZXJcclxuICAgIGNvbnN0IHNjYWxlZCA9IG51bWJlciAvIHNjYWxlO1xyXG4gICAgLy8gZm9ybWF0IG51bWJlciBhbmQgYWRkIHN1ZmZpeFxyXG4gICAgLy8gICByZXR1cm4gc2NhbGVkLnRvRml4ZWQoMSkgKyBzdWZmaXg7XHJcbiAgICByZXR1cm4gKHNjYWxlZC50b0xvY2FsZVN0cmluZyh1bmRlZmluZWQsIHtcclxuICAgICAgICBtaW5pbXVtRnJhY3Rpb25EaWdpdHM6IDEsXHJcbiAgICAgICAgbWF4aW11bUZyYWN0aW9uRGlnaXRzOiAxLFxyXG4gICAgfSkgKyBzdWZmaXgpO1xyXG59XHJcbmZ1bmN0aW9uIHJlbmRlckJhbmtJdGVtcyhzZWFyY2ggPSBcIlwiKSB7XHJcbiAgICB2YXIgX2EsIF9iLCBfYztcclxuICAgIGNvbnNvbGUubG9nKHNlYXJjaCk7XHJcbiAgICBjb25zdCBiYW5rSXRlbXNDb250YWluZXIgPSAkKFwiI2JhbmstaXRlbXMtY29udGFpbmVyXCIpO1xyXG4gICAgaWYgKGJhbmtJdGVtc0NvbnRhaW5lcikge1xyXG4gICAgICAgIC8vIHJlc2V0IG1vZGFsIG1hcmdpblxyXG4gICAgICAgIGJhbmtJdGVtc0NvbnRhaW5lci5wYXJlbnQoKS5wYXJlbnQoKS5jc3Moe1xyXG4gICAgICAgICAgICBtYXJnaW5Ub3A6IFwiNXB4XCIsXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgLy8gY2xlYXIgY29udGVudHNcclxuICAgICAgICBiYW5rSXRlbXNDb250YWluZXIuaHRtbChcIlwiKTtcclxuICAgICAgICBsZXQgdG90YWxCYW5rU2xvdHMgPSAwO1xyXG4gICAgICAgIGxldCB0b3RhbFVzZWRCYW5rU2xvdHMgPSAwO1xyXG4gICAgICAgIGxldCB0b3RhbFVudXNlZEJhbmtTbG90cyA9IDA7XHJcbiAgICAgICAgY29uc3QgdHlwZXMgPSB7XHJcbiAgICAgICAgICAgIGhlbG1ldDogXCJIZWxtZXRzXCIsXHJcbiAgICAgICAgICAgIGNoZXN0OiBcIkFybW9yc1wiLFxyXG4gICAgICAgICAgICBwYW50czogXCJQYW50c1wiLFxyXG4gICAgICAgICAgICBnbG92ZXM6IFwiR2xvdmVzXCIsXHJcbiAgICAgICAgICAgIHNob2VzOiBcIlNob2VzXCIsXHJcbiAgICAgICAgICAgIGNhcGU6IFwiQ2FwZXNcIixcclxuICAgICAgICAgICAgcmluZzogXCJSaW5nc1wiLFxyXG4gICAgICAgICAgICBlYXJyaW5nOiBcIkVhcnJpbmdzXCIsXHJcbiAgICAgICAgICAgIGFtdWxldDogXCJBbXVsZXRzXCIsXHJcbiAgICAgICAgICAgIGJlbHQ6IFwiQmVsdHNcIixcclxuICAgICAgICAgICAgb3JiOiBcIk9yYnNcIixcclxuICAgICAgICAgICAgd2VhcG9uOiBcIldlYXBvbnNcIixcclxuICAgICAgICAgICAgc2hpZWxkOiBcIlNoaWVsZHNcIixcclxuICAgICAgICAgICAgc291cmNlOiBcIk9mZmhhbmRzXCIsXHJcbiAgICAgICAgICAgIHF1aXZlcjogXCJPZmZoYW5kc1wiLFxyXG4gICAgICAgICAgICBtaXNjX29mZmhhbmQ6IFwiT2ZmaGFuZHNcIixcclxuICAgICAgICAgICAgZWxpeGlyOiBcIkVsaXhpcnNcIixcclxuICAgICAgICAgICAgcG90OiBcIlBvdGlvbnNcIixcclxuICAgICAgICAgICAgY3Njcm9sbDogXCJTY3JvbGxzXCIsXHJcbiAgICAgICAgICAgIHVzY3JvbGw6IFwiU2Nyb2xsc1wiLFxyXG4gICAgICAgICAgICBwc2Nyb2xsOiBcIlNjcm9sbHNcIixcclxuICAgICAgICAgICAgb2ZmZXJpbmc6IFwiU2Nyb2xsc1wiLFxyXG4gICAgICAgICAgICBtYXRlcmlhbDogXCJDcmFmdGluZyBhbmQgQ29sbGVjdGluZ1wiLFxyXG4gICAgICAgICAgICBleGNoYW5nZTogXCJFeGNoYW5nZWFibGVzXCIsXHJcbiAgICAgICAgfTtcclxuICAgICAgICAvLyBUT0RPOiB0eXBlIHRoaXNcclxuICAgICAgICBjb25zdCBncm91cHMgPSB7fTtcclxuICAgICAgICBsZXQgcGFja05hbWU7XHJcbiAgICAgICAgZm9yIChwYWNrTmFtZSBpbiBjaGFyYWN0ZXIuYmFuaykge1xyXG4gICAgICAgICAgICBjb25zdCBwYWNrSXRlbXMgPSBjaGFyYWN0ZXIuYmFua1twYWNrTmFtZV07XHJcbiAgICAgICAgICAgIHRvdGFsQmFua1Nsb3RzICs9IHBhY2tJdGVtcy5sZW5ndGg7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBwYWNrSXRlbXMubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtSW5mbyA9IHBhY2tJdGVtc1tpbmRleF07XHJcbiAgICAgICAgICAgICAgICBpZiAoIWl0ZW1JbmZvKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxVbnVzZWRCYW5rU2xvdHMrKztcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNvbnN0IGdJdGVtID0gRy5pdGVtc1tpdGVtSW5mby5uYW1lXTtcclxuICAgICAgICAgICAgICAgIGlmIChzZWFyY2gpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpdGVtS2V5TWF0Y2hlcyA9IGl0ZW1JbmZvLm5hbWUuaW5kZXhPZihzZWFyY2gpID4gLTE7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbU5hbWVNYXRjaGVzID0gZ0l0ZW0gJiYgZ0l0ZW0ubmFtZS5pbmRleE9mKHNlYXJjaCkgPiAtMTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWl0ZW1LZXlNYXRjaGVzICYmICFpdGVtTmFtZU1hdGNoZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY29uc3QgbGV2ZWwgPSAoX2EgPSBpdGVtSW5mby5sZXZlbCkgIT09IG51bGwgJiYgX2EgIT09IHZvaWQgMCA/IF9hIDogMDtcclxuICAgICAgICAgICAgICAgIC8vIFRPRE86IHRyYW5zbGF0ZSB0eXBlIHRvIHJlYWRhYmxlIC8gY29tbW9uIG5hbWUgLyBvdGhlcnNcclxuICAgICAgICAgICAgICAgIC8vIFRPRE86IGdyb3VwIHdlYXBvbnMgYnkgc3VidHlwZT9cclxuICAgICAgICAgICAgICAgIGxldCB0eXBlID0gKF9iID0gdHlwZXNbZ0l0ZW0udHlwZV0pICE9PSBudWxsICYmIF9iICE9PSB2b2lkIDAgPyBfYiA6IFwiT3RoZXJzXCI7XHJcbiAgICAgICAgICAgICAgICBpZiAoZ0l0ZW0uZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPSAoX2MgPSB0eXBlc1tcImV4Y2hhbmdlXCJdKSAhPT0gbnVsbCAmJiBfYyAhPT0gdm9pZCAwID8gX2MgOiBcIk90aGVyc1wiO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbGV0IGl0ZW1CeVR5cGUgPSBncm91cHNbdHlwZV07XHJcbiAgICAgICAgICAgICAgICBpZiAoIWl0ZW1CeVR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtQnlUeXBlID0geyBhbW91bnQ6IDAsIGl0ZW1zOiB7fSB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGdyb3Vwc1t0eXBlXSA9IGl0ZW1CeVR5cGU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBsZXQgaXRlbURhdGEgPSBpdGVtQnlUeXBlLml0ZW1zW2l0ZW1JbmZvLm5hbWVdO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFpdGVtRGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1EYXRhID0geyBhbW91bnQ6IDAsIGxldmVsczoge30gfTtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtQnlUeXBlLml0ZW1zW2l0ZW1JbmZvLm5hbWVdID0gaXRlbURhdGE7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBsZXQgbGV2ZWxzID0gaXRlbURhdGEubGV2ZWxzW2xldmVsXTtcclxuICAgICAgICAgICAgICAgIGlmICghbGV2ZWxzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV2ZWxzID0geyBhbW91bnQ6IGl0ZW1JbmZvLnEgfHwgMSwgaW5kZXhlczogW1twYWNrTmFtZSwgaW5kZXhdXSB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1EYXRhLmxldmVsc1tsZXZlbF0gPSBsZXZlbHM7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtRGF0YS5hbW91bnQgKz0gaXRlbUluZm8ucSB8fCAxO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldmVscy5hbW91bnQgKz0gaXRlbUluZm8ucSB8fCAxO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldmVscy5pbmRleGVzLnB1c2goW3BhY2tOYW1lLCBpbmRleF0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdG90YWxVc2VkQmFua1Nsb3RzKys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJiYW5rIHNsb3RzXCIsIHRvdGFsQmFua1Nsb3RzLCB0b3RhbFVzZWRCYW5rU2xvdHMsIHRvdGFsVW51c2VkQmFua1Nsb3RzKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhncm91cHMpO1xyXG4gICAgICAgIGNvbnN0IHNvcnRlZEdyb3VwS2V5cyA9IFsuLi5uZXcgU2V0KE9iamVjdC52YWx1ZXModHlwZXMpKV07IC8vLnNvcnQoKGEsIGIpID0+IGEubG9jYWxlQ29tcGFyZShiKSk7XHJcbiAgICAgICAgZm9yIChjb25zdCBpdGVtVHlwZSBvZiBzb3J0ZWRHcm91cEtleXMpIHtcclxuICAgICAgICAgICAgY29uc3QgaXRlbXNCeVR5cGUgPSBncm91cHNbaXRlbVR5cGVdO1xyXG4gICAgICAgICAgICBpZiAoIWl0ZW1zQnlUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBpdGVtVHlwZUNvbnRhaW5lciA9ICQoXCI8ZGl2IHN0eWxlPSdmbG9hdDpsZWZ0OyBtYXJnaW4tbGVmdDo1cHg7Jz5cIik7XHJcbiAgICAgICAgICAgIGl0ZW1UeXBlQ29udGFpbmVyLmFwcGVuZChgPGRpdiBjbGFzcz0nZ2FtZWJ1dHRvbiBnYW1lYnV0dG9uLXNtYWxsJyBzdHlsZT0nbWFyZ2luLWJvdHRvbTogNXB4Jz4ke2l0ZW1UeXBlfTwvZGl2PmApO1xyXG4gICAgICAgICAgICBiYW5rSXRlbXNDb250YWluZXIuYXBwZW5kKGl0ZW1UeXBlQ29udGFpbmVyKTtcclxuICAgICAgICAgICAgY29uc3QgaXRlbXNDb250YWluZXIgPSAkKFwiPGRpdiBzdHlsZT0nbWFyZ2luLWJvdHRvbTogMTBweCc+XCIpO1xyXG4gICAgICAgICAgICBpdGVtVHlwZUNvbnRhaW5lci5hcHBlbmQoaXRlbXNDb250YWluZXIpO1xyXG4gICAgICAgICAgICAvLyBsb29wIGl0ZW1zXHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbUtleSBpbiBpdGVtc0J5VHlwZS5pdGVtcykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZ0l0ZW0gPSBHLml0ZW1zW2l0ZW1LZXldO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgeyBhbW91bnQsIGxldmVscywgfSA9IGl0ZW1zQnlUeXBlLml0ZW1zW2l0ZW1LZXldO1xyXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogaXRlcmF0ZSBiYWNrd2FyZHM/XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBsZXZlbCBpbiBsZXZlbHMpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gbGV2ZWxzW2xldmVsXTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmYWtlSXRlbUluZm8gPSB7IG5hbWU6IGl0ZW1LZXkgfTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoTnVtYmVyKGxldmVsKSA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmFrZUl0ZW1JbmZvLmxldmVsID0gTnVtYmVyKGxldmVsKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuYW1vdW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZha2VJdGVtSW5mby5xID0gZGF0YS5hbW91bnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRPRE86IGFkZCBpdGVtX2NvbnRhaW5lciB0byB0eXBlc1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW1Db250YWluZXIgPSAkKHBhcmVudC5pdGVtX2NvbnRhaW5lcih7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNraW46IGdJdGVtLnNraW4sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uY2xpY2s6IFwicmVuZGVyX2l0ZW1faW5mbygnXCIgKyBpdGVtS2V5ICsgXCInKVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sIGZha2VJdGVtSW5mbykpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGZpbmQgcXVhbnRpdHkgaW4gaXRlbSBjb250YWluZXIgYW5kIG1ha2UgaXQgcHJldHR5XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY291bnRFbGVtZW50ID0gaXRlbUNvbnRhaW5lci5maW5kKFwiLmlxdWlcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY291bnQgPSBOdW1iZXIoY291bnRFbGVtZW50LnRleHQoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJldHR5Q291bnQgPSBhYmJyZXZpYXRlTnVtYmVyKGNvdW50KTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocHJldHR5Q291bnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY291bnRFbGVtZW50Lmh0bWwocHJldHR5Q291bnQudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zQ29udGFpbmVyLmFwcGVuZChpdGVtQ29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBiYW5rSXRlbXNDb250YWluZXIuYXBwZW5kKFwiPGRpdiBzdHlsZT0nY2xlYXI6Ym90aDsnPlwiKTtcclxuICAgIH1cclxufVxyXG5mdW5jdGlvbiByZW5kZXJFbmhhbmNlZEJhbmtVSSgpIHtcclxuICAgIGNvbnN0IGlzSW5CYW5rID0gISFjaGFyYWN0ZXIuYmFuaztcclxuICAgIGNvbnN0IGNvbnRhaW5lciA9ICQoXCI8ZGl2PlwiLCB7XHJcbiAgICAgICAgc3R5bGU6IFwiYm9yZGVyOiA1cHggc29saWQgZ3JheTsgYmFja2dyb3VuZC1jb2xvcjogYmxhY2s7IHBhZGRpbmc6IDEwcHg7IHdpZHRoOiA5OCVcIixcclxuICAgIH0pO1xyXG4gICAgY29uc3QgdGl0bGUgPSAkKFwiPGRpdiBzdHlsZT0nY29sb3I6ICNmMWMwNTQ7IGJvcmRlci1ib3R0b206IDJweCBkYXNoZWQgI0M3Q0FDQTsgbWFyZ2luLWJvdHRvbTogM3B4OyBtYXJnaW4tbGVmdDogM3B4OyBtYXJnaW4tcmlnaHQ6IDNweCcgY2xhc3M9J2Nib2xkJz5cIik7XHJcbiAgICBjb250YWluZXIuYXBwZW5kKHRpdGxlKTtcclxuICAgIHRpdGxlLmFwcGVuZChcIkJhbmtcIik7XHJcbiAgICAvLyBUT0RPOiB0aGUgc2VhcmNoIGJ1dHRvbiBzaG91bGQgdHJpZ2dlciBhIGNsZWFpbmcgb2YgYmFua0l0ZW1zQ29udGFpbmVyIGFuZCByZS1yZW5kZXIgdGhlIG5ldyBkYXRhXHJcbiAgICBjb25zdCBzZWFyY2hCdXR0b24gPSAkKGA8aW5wdXQgcGxhY2Vob2xkZXI9J3ByZXNzIGVudGVyIHRvIHNlYXJjaCcgb25jaGFuZ2U9J3JlbmRlckJhbmtJdGVtcyh0aGlzLnZhbHVlKScgdmFsdWU9JyR7XCJcIn0nIC8+YCk7XHJcbiAgICB0aXRsZS5hcHBlbmQoc2VhcmNoQnV0dG9uKTtcclxuICAgIGNvbnN0IGJhbmtJdGVtc0NvbnRhaW5lciA9ICQoXCI8ZGl2PlwiLCB7IGlkOiBcImJhbmstaXRlbXMtY29udGFpbmVyXCIgfSk7XHJcbiAgICBjb250YWluZXIuYXBwZW5kKGJhbmtJdGVtc0NvbnRhaW5lcik7XHJcbiAgICAvLyBUT0RPOiBzaG91bGQgbm90IGJlIHJlbmRlcmVkIGFzIGEgbW9kYWwsIHdlIHdhbnQgdG8gYmUgYWJsZSB0byB1dGlsaXplIG91ciBwbGF5ZXIgaW52ZW50b3J5IGFzIHdlbGwgOnRoaW5raW5nOlxyXG4gICAgcGFyZW50LnNob3dfbW9kYWwoY29udGFpbmVyLndyYXAoXCI8ZGl2Lz5cIikucGFyZW50KCkuaHRtbCgpLCB7XHJcbiAgICAgICAgd3JhcDogITEsXHJcbiAgICAgICAgaGlkZWluYmFja2dyb3VuZDogITAsXHJcbiAgICAgICAgdXJsOiBcIi9kb2NzL2d1aWRlL2FsbC9pdGVtc1wiLFxyXG4gICAgfSk7XHJcbiAgICAvLyB0cmlnZ2VyIHJlbmRlciBhZnRlciBlbGVtZW50cyBleGlzdCBpbiB0aGUgZG9tXHJcbiAgICByZW5kZXJCYW5rSXRlbXMoKTtcclxufVxyXG4vLyBUT0RPOiBncm91cCBpdGVtcyBieSBuYW1lIHRoZW4gYnkgbGV2ZWwsIHV0aWxpemUgY2xhc3NlcyAvIG5hbWVzcGFjZXMgP1xyXG4vLyBjbGFzcyBJbnZlbnRvcnlFbmhhbmNlbWVudHMge1xyXG4vLyAgIC8qKlxyXG4vLyAgICAqXHJcbi8vICAgICovXHJcbi8vICAgY29uc3RydWN0b3IoKSB7XHJcbi8vICAgICAvLyBzdXBlcigpO1xyXG4vLyAgICAgLy8gVE9ETzogbG9hZCBzZXR0aW5nIGZyb20gbG9jYWwgc3RvcmFnZVxyXG4vLyAgICAgLy8gVE9ETzogY2FjaGUgYmFuayBpbnZlbnRvcnkgYXQgYW4gaW50ZXJ2YWwsIGJhc2VkIG9uIHNldHRpbmdzXHJcbi8vICAgfVxyXG4vLyAgIHB1YmxpYyBzaG93QmFua1VJKCkge1xyXG4vLyAgICAgY29uc3QgaXNJbkJhbmsgPSAhIWNoYXJhY3Rlci5iYW5rO1xyXG4vLyAgICAgY29uc3QgYmFua0NvbnRhaW5lciA9ICQoXHJcbi8vICAgICAgIFwiPGRpdiBzdHlsZT0nYmFja2dyb3VuZC1jb2xvcjogYmxhY2s7IGJvcmRlcjogNXB4IHNvbGlkIGdyYXk7IHBhZGRpbmc6IDJweDsgZm9udC1zaXplOiAyNHB4OyBkaXNwbGF5OiBpbmxpbmUtYmxvY2snIGNsYXNzPSdkY29udGFpbic+XCJcclxuLy8gICAgICk7XHJcbi8vICAgICBiYW5rQ29udGFpbmVyLmFwcGVuZChcIjxkaXY+dGVzdDwvZGl2PlwiKTtcclxuLy8gICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLW1lbWJlci1hY2Nlc3MsIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtY2FsbFxyXG4vLyAgICAgKDxhbnk+cGFyZW50KS5zaG93X21vZGFsKGJhbmtDb250YWluZXIsIHtcclxuLy8gICAgICAgd3JhcDogITEsXHJcbi8vICAgICAgIGhpZGVpbmJhY2tncm91bmQ6ICEwLFxyXG4vLyAgICAgICB1cmw6IFwiL2RvY3MvZ3VpZGUvYWxsL2l0ZW1zXCIsXHJcbi8vICAgICB9KTtcclxuLy8gICB9XHJcbi8vIH1cclxuLy8gZXhwb3J0IGNvbnN0IGludmVudG9yeUVuaGFuY2VtZW50cyA9IG5ldyBJbnZlbnRvcnlFbmhhbmNlbWVudHMoKTtcclxuLy8gLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2Vzc1xyXG4vLyAoPGFueT5wYXJlbnQpLmludmVudG9yeUVuaGFuY2VtZW50cyA9IGludmVudG9yeUVuaGFuY2VtZW50cztcclxuLy8gdGhpcyBzZWVtcyBuaWNlIHRvIHNob3cgYSBtb2RhbFxyXG4vLyAgICAgcGFyZW50LnNob3dfbW9kYWwoYiwge1xyXG4vLyAgICAgICB3cmFwOiAhMSxcclxuLy8gICAgICAgaGlkZWluYmFja2dyb3VuZDogITAsXHJcbi8vICAgICAgIHVybDogXCIvZG9jcy9ndWlkZS9hbGwvaXRlbXNcIixcclxuLy8gICAgIH0pO1xyXG4vLyBmdW5jdGlvbiBucGNfcmlnaHRfY2xpY2soZXZlbnQpeyBzZWVtcyBpbnRlcmVzdGluZ1xyXG4vLyBVSSBzZWVtcyB0byBqdXN0IGJlIGFkZGVkIHRvIGJvZHkuXHJcbi8vIGNvbnRhaW5lclxyXG4vLyB2YXIgaHRtbD1cIjxkaXYgc3R5bGU9J2JhY2tncm91bmQtY29sb3I6IGJsYWNrOyBib3JkZXI6IDVweCBzb2xpZCBncmF5OyBwYWRkaW5nOiAycHg7IGZvbnQtc2l6ZTogMjRweDsgZGlzcGxheTogaW5saW5lLWJsb2NrJyBjbGFzcz0nZGNvbnRhaW4nPlwiO1xyXG4vLyBodG1sKz1cIjwvZGl2PjxkaXYgaWQ9J3N0b3JhZ2UtaXRlbScgY2xhc3M9J3JlbmRlcmNvbnRhaW5lcicgc3R5bGU9J2Rpc3BsYXk6IGlubGluZS1ibG9jazsgdmVydGljYWwtYWxpZ246IHRvcDsgbWFyZ2luLWxlZnQ6IDVweCc+PC9kaXY+XCI7XHJcbi8vIFx0JChcIiN0b3BsZWZ0Y29ybmVydWlcIikuaHRtbChodG1sKTtcclxuLy8gZnVuY3Rpb24gcmVuZGVyX2ludmVudG9yeShyZXNldCkgcmVuZGVycyB0aGUgcGxheWVyIGludmVudG9yeVxyXG4vLyBmb3IodmFyIGk9MDtpPE1hdGguY2VpbChtYXgoY2hhcmFjdGVyLmlzaXplLGNoYXJhY3Rlci5pdGVtcy5sZW5ndGgpL2NvbHVtbnMpO2krKylcclxuLy8ge1xyXG4vLyAgICAgaHRtbCs9XCI8ZGl2PlwiXHJcbi8vICAgICBmb3IodmFyIGo9MDtqPGNvbHVtbnM7aisrKVxyXG4vLyAgICAge1xyXG4vLyAgICAgICAgIHZhciBjdXJyZW50PW51bGwsaWQ9J2NpdGVtJytsYXN0LGNjX2lkPSdjJytpZDtcclxuLy8gICAgICAgICBpZihsYXN0PGNoYXJhY3Rlci5pdGVtcy5sZW5ndGgpIGN1cnJlbnQ9Y2hhcmFjdGVyLml0ZW1zW2xhc3RdO1xyXG4vLyAgICAgICAgIGlmKGN1cnJlbnQpXHJcbi8vICAgICAgICAge1xyXG4vLyAgICAgICAgICAgICB2YXIgaXRlbT1HLml0ZW1zW2N1cnJlbnQubmFtZV18fHtcInNraW5cIjpcInRlc3RcIixcIm5hbWVcIjpcIlVucmVjb2duaXplZCBJdGVtXCJ9LHNraW49Y3VycmVudC5za2lufHxpdGVtLnNraW47XHJcbi8vICAgICAgICAgICAgIGlmKGN1cnJlbnQuZXhwaXJlcykgc2tpbj1pdGVtLnNraW5fYTtcclxuLy8gICAgICAgICAgICAgaWYoY3VycmVudC5uYW1lPT1cInBsYWNlaG9sZGVyXCIpXHJcbi8vICAgICAgICAgICAgIHtcclxuLy8gICAgICAgICAgICAgICAgIHZhciByaWQ9cmFuZG9tU3RyKDgpO1xyXG4vLyAgICAgICAgICAgICAgICAgdmFyIG5hbWU9Y3VycmVudC5wICYmIGN1cnJlbnQucC5uYW1lIHx8IFwicGxhY2Vob2xkZXJfbVwiO1xyXG4vLyAgICAgICAgICAgICAgICAgaHRtbCs9aXRlbV9jb250YWluZXIoe3NoYWRlOkcuaXRlbXNbbmFtZV0uc2tpbixvbmNsaWNrOlwiaW52ZW50b3J5X2NsaWNrKFwiK2xhc3QrXCIsZXZlbnQpXCIsb25tb3VzZWRvd246XCJpbnZlbnRvcnlfbWlkZGxlKFwiK2xhc3QrXCIsZXZlbnQpXCIsZGVmOml0ZW0saWQ6aWQsY2lkOmNjX2lkLGRyYWdnYWJsZTpmYWxzZSxudW06bGFzdCxjbnVtOmxhc3Qsc19vcDowLjUsYmNvbG9yOlwiZ3JheSBcIixsb2FkZXI6XCJxcGxjXCIrcmlkLGxldmVsOmN1cnJlbnQucCYmY3VycmVudC5wLmxldmVsfHx1bmRlZmluZWQsaW5hbWU6bmFtZX0pO1xyXG4vLyAgICAgICAgICAgICAgICAgcmlkc1tsYXN0XT1yaWQ7XHJcbi8vICAgICAgICAgICAgIH1cclxuLy8gICAgICAgICAgICAgZWxzZVxyXG4vLyAgICAgICAgICAgICB7XHJcbi8vICAgICAgICAgICAgICAgICBodG1sKz1pdGVtX2NvbnRhaW5lcih7c2tpbjpza2luLG9uY2xpY2s6XCJpbnZlbnRvcnlfY2xpY2soXCIrbGFzdCtcIixldmVudClcIixvbm1vdXNlZG93bjpcImludmVudG9yeV9taWRkbGUoXCIrbGFzdCtcIixldmVudClcIixkZWY6aXRlbSxpZDppZCxjaWQ6Y2NfaWQsZHJhZ2dhYmxlOnRydWUsbnVtOmxhc3QsY251bTpsYXN0fSxjdXJyZW50KTtcclxuLy8gICAgICAgICAgICAgfVxyXG4vLyAgICAgICAgIH1cclxuLy8gICAgICAgICBlbHNlXHJcbi8vICAgICAgICAge1xyXG4vLyAgICAgICAgICAgICBodG1sKz1pdGVtX2NvbnRhaW5lcih7c2l6ZTo0MCxkcmFnZ2FibGU6dHJ1ZSxjbnVtOmxhc3QsY2lkOmNjX2lkfSk7XHJcbi8vICAgICAgICAgfVxyXG4vLyAgICAgICAgIGxhc3QrKztcclxuLy8gICAgIH1cclxuLy8gICAgIGh0bWwrPVwiPC9kaXY+XCI7XHJcbi8vIH1cclxuLy8gdGhpcyBzZWVtcyByZXNwb25zaWJsZSBmb3IgcmVuZGVyaW5nIHRoZSBiYW5rIHRlbGxlcnMgLyBvdGhlciBucGNzXHJcbi8vIGZ1bmN0aW9uIHJlbmRlcl9pdGVtc19ucGMocGFjaylcclxuLy8gdmFyIGNoYXJhY3Rlcl9zbG90cz1bXCJyaW5nMVwiLFwicmluZzJcIixcImVhcnJpbmcxXCIsXCJlYXJyaW5nMlwiLFwiYmVsdFwiLFwibWFpbmhhbmRcIixcIm9mZmhhbmRcIixcImhlbG1ldFwiLFwiY2hlc3RcIixcInBhbnRzXCIsXCJzaG9lc1wiLFwiZ2xvdmVzXCIsXCJhbXVsZXRcIixcIm9yYlwiLFwiZWxpeGlyXCIsXCJjYXBlXCJdO1xyXG4vLyB2YXIgYXR0aXJlX3Nsb3RzPVtcImhlbG1ldFwiLFwiY2hlc3RcIixcInBhbnRzXCIsXCJzaG9lc1wiLFwiZ2xvdmVzXCIsXCJjYXBlXCJdO1xyXG4vLyB2YXIgcmljaGVzX3Nsb3RzPVtcInJpbmcxXCIsXCJyaW5nMlwiLFwiZWFycmluZzFcIixcImVhcnJpbmcyXCIsXCJhbXVsZXRcIl07XHJcbi8vIHZhciBib29zdGVyX2l0ZW1zPVtcInhwYm9vc3RlclwiLFwibHVja2Jvb3N0ZXJcIixcImdvbGRib29zdGVyXCJdO1xyXG4vLyB2YXIgZG91YmxlaGFuZF90eXBlcz1bXCJheGVcIixcImJhc2hlclwiLFwiZ3JlYXRfc3RhZmZcIl07XHJcbi8vIHZhciBvZmZoYW5kX3R5cGVzPXtcclxuLy8gXHRcInF1aXZlclwiOlwiUXVpdmVyXCIsXHJcbi8vIFx0XCJzaGllbGRcIjpcIlNoaWVsZFwiLFxyXG4vLyBcdFwibWlzY19vZmZoYW5kXCI6XCJNaXNjIE9mZmhhbmRcIixcclxuLy8gXHRcInNvdXJjZVwiOlwiU291cmNlXCJcclxuLy8gfTtcclxuLy8gdmFyIHdlYXBvbl90eXBlcz17XHJcbi8vIFx0XCJzd29yZFwiOlwiU3dvcmRcIixcclxuLy8gXHRcInNob3J0X3N3b3JkXCI6XCJTaG9ydCBTd29yZFwiLFxyXG4vLyBcdFwiZ3JlYXRfc3dvcmRcIjpcIkdyZWF0IFN3b3JkXCIsXHJcbi8vIFx0XCJheGVcIjpcIkF4ZVwiLFxyXG4vLyBcdFwid2JsYWRlXCI6XCJNYWdpY2FsIFN3b3JkXCIsXHJcbi8vIFx0XCJiYXNoZXJcIjpcIkJhc2hlclwiLFxyXG4vLyBcdFwiZGFydGd1blwiOlwiRGFydCBHdW5cIixcclxuLy8gXHRcImJvd1wiOlwiQm93XCIsXHJcbi8vIFx0XCJjcm9zc2Jvd1wiOlwiQ3Jvc3Nib3dcIixcclxuLy8gXHRcInJhcGllclwiOlwiUmFwaWVyXCIsXHJcbi8vIFx0XCJzcGVhclwiOlwiU3BlYXJcIixcclxuLy8gXHRcImZpc3RcIjpcIkZpc3QgV2VhcG9uXCIsXHJcbi8vIFx0XCJkYWdnZXJcIjpcIkRhZ2dlclwiLFxyXG4vLyBcdFwic3RhcnNcIjpcIlRocm93aW5nIFN0YXJzXCIsXHJcbi8vIFx0XCJtYWNlXCI6XCJNYWNlXCIsXHJcbi8vIFx0XCJwbWFjZVwiOlwiUHJpZXN0IE1hY2VcIixcclxuLy8gXHRcInN0YWZmXCI6XCJTdGFmZlwiLFxyXG4vLyBcdFwid2FuZFwiOlwiV2FuZFwiLFxyXG4vLyB9O1xyXG4vLyAvKipcclxuLy8gICogT3JpZ2luYWxseSBzaGFyZWQgYnkgZHJpcHB5IG9uIGRpc2NvcmQgaHR0cHM6Ly9kaXNjb3JkLmNvbS9jaGFubmVscy8yMzgzMzI0NzY3NDM3NDU1MzYvMjQzNzA3MzQ1ODg3MTY2NDY1LzEwNDEwODc0MzIwNTUwNjY3NDRcclxuLy8gICogd2UgZG8gbm90IGtub3cgd2hvIG9yaWdpbmFsbHkgbWFkZSBpdC5cclxuLy8gICogbW9kaWZpZWQgYnkgdGhtc24gdG8gdXNlIG1vcmUgd2l0aCBhbmQgZmxvYXQgaXRlbSBjYXRlZ29yaWVzXHJcbi8vICAqIHVzYWdlOiBsb2FkIHRoZWVzZSBmdW5jdGlvbnMgaW50byB5b3VyIHBhcmVudCB3aW5kb3cgYW5kIGV4ZWN1dGUgdGhlIGZvbGxvd2luZyBjb21tYW5kIHdoaWxlIGluIHRoZSBiYW5rXHJcbi8vICAqIGBwYXJlbnQucmVuZGVyX2JhbmtfaXRlbXMoKWBcclxuLy8gICovXHJcbi8vICBmdW5jdGlvbiByZW5kZXJfYmFua19pdGVtcygpIHtcclxuLy8gICAgIGlmICghY2hhcmFjdGVyLmJhbmspIHJldHVybiBnYW1lX2xvZyhcIk5vdCBpbnNpZGUgdGhlIGJhbmtcIik7XHJcbi8vICAgICBmdW5jdGlvbiBpdG1fY21wKGEsIGIpIHtcclxuLy8gICAgICAgcmV0dXJuIChcclxuLy8gICAgICAgICAoYSA9PSBudWxsKSAtIChiID09IG51bGwpIHx8XHJcbi8vICAgICAgICAgKGEgJiYgKGEubmFtZSA8IGIubmFtZSA/IC0xIDogKyhhLm5hbWUgPiBiLm5hbWUpKSkgfHxcclxuLy8gICAgICAgICAoYSAmJiBiLmxldmVsIC0gYS5sZXZlbClcclxuLy8gICAgICAgKTtcclxuLy8gICAgIH1cclxuLy8gICAgIHZhciBhID0gW1xyXG4vLyAgICAgICAgIFtcIkhlbG1ldHNcIiwgW11dLFxyXG4vLyAgICAgICAgIFtcIkFybW9yc1wiLCBbXV0sXHJcbi8vICAgICAgICAgW1wiVW5kZXJhcm1vcnNcIiwgW11dLFxyXG4vLyAgICAgICAgIFtcIkdsb3Zlc1wiLCBbXV0sXHJcbi8vICAgICAgICAgW1wiU2hvZXNcIiwgW11dLFxyXG4vLyAgICAgICAgIFtcIkNhcGVzXCIsIFtdXSxcclxuLy8gICAgICAgICBbXCJSaW5nc1wiLCBbXV0sXHJcbi8vICAgICAgICAgW1wiRWFycmluZ3NcIiwgW11dLFxyXG4vLyAgICAgICAgIFtcIkFtdWxldHNcIiwgW11dLFxyXG4vLyAgICAgICAgIFtcIkJlbHRzXCIsIFtdXSxcclxuLy8gICAgICAgICBbXCJPcmJzXCIsIFtdXSxcclxuLy8gICAgICAgICBbXCJXZWFwb25zXCIsIFtdXSxcclxuLy8gICAgICAgICBbXCJTaGllbGRzXCIsIFtdXSxcclxuLy8gICAgICAgICBbXCJPZmZoYW5kc1wiLCBbXV0sXHJcbi8vICAgICAgICAgW1wiRWxpeGlyc1wiLCBbXV0sXHJcbi8vICAgICAgICAgW1wiUG90aW9uc1wiLCBbXV0sXHJcbi8vICAgICAgICAgW1wiU2Nyb2xsc1wiLCBbXV0sXHJcbi8vICAgICAgICAgW1wiQ3JhZnRpbmcgYW5kIENvbGxlY3RpbmdcIiwgW11dLFxyXG4vLyAgICAgICAgIFtcIkV4Y2hhbmdlYWJsZXNcIiwgW11dLFxyXG4vLyAgICAgICAgIFtcIk90aGVyc1wiLCBbXV0sXHJcbi8vICAgICAgIF0sXHJcbi8vICAgICAgIGIgPVxyXG4vLyAgICAgICAgIFwiPGRpdiBzdHlsZT0nYm9yZGVyOiA1cHggc29saWQgZ3JheTsgYmFja2dyb3VuZC1jb2xvcjogYmxhY2s7IHBhZGRpbmc6IDEwcHg7IHdpZHRoOiA5MCUnPlwiO1xyXG4vLyAgICAgbGV0IHNsb3RfaWRzID0gW1xyXG4vLyAgICAgICBcImhlbG1ldFwiLFxyXG4vLyAgICAgICBcImNoZXN0XCIsXHJcbi8vICAgICAgIFwicGFudHNcIixcclxuLy8gICAgICAgXCJnbG92ZXNcIixcclxuLy8gICAgICAgXCJzaG9lc1wiLFxyXG4vLyAgICAgICBcImNhcGVcIixcclxuLy8gICAgICAgXCJyaW5nXCIsXHJcbi8vICAgICAgIFwiZWFycmluZ1wiLFxyXG4vLyAgICAgICBcImFtdWxldFwiLFxyXG4vLyAgICAgICBcImJlbHRcIixcclxuLy8gICAgICAgXCJvcmJcIixcclxuLy8gICAgICAgXCJ3ZWFwb25cIixcclxuLy8gICAgICAgXCJzaGllbGRcIixcclxuLy8gICAgICAgXCJvZmZoYW5kXCIsXHJcbi8vICAgICAgIFwiZWxpeGlyXCIsXHJcbi8vICAgICAgIFwicG90XCIsXHJcbi8vICAgICAgIFwic2Nyb2xsXCIsXHJcbi8vICAgICAgIFwibWF0ZXJpYWxcIixcclxuLy8gICAgICAgXCJleGNoYW5nZVwiLFxyXG4vLyAgICAgICBcIlwiLFxyXG4vLyAgICAgXTtcclxuLy8gICAgIG9iamVjdF9zb3J0KEcuaXRlbXMsIFwiZ29sZF92YWx1ZVwiKS5mb3JFYWNoKGZ1bmN0aW9uIChiKSB7XHJcbi8vICAgICAgIGlmICghYlsxXS5pZ25vcmUpXHJcbi8vICAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBhLmxlbmd0aDsgYysrKVxyXG4vLyAgICAgICAgICAgaWYgKFxyXG4vLyAgICAgICAgICAgICAhc2xvdF9pZHNbY10gfHxcclxuLy8gICAgICAgICAgICAgYlsxXS50eXBlID09IHNsb3RfaWRzW2NdIHx8XHJcbi8vICAgICAgICAgICAgIChcIm9mZmhhbmRcIiA9PSBzbG90X2lkc1tjXSAmJlxyXG4vLyAgICAgICAgICAgICAgIGluX2FycihiWzFdLnR5cGUsIFtcInNvdXJjZVwiLCBcInF1aXZlclwiLCBcIm1pc2Nfb2ZmaGFuZFwiXSkpIHx8XHJcbi8vICAgICAgICAgICAgIChcInNjcm9sbFwiID09IHNsb3RfaWRzW2NdICYmXHJcbi8vICAgICAgICAgICAgICAgaW5fYXJyKGJbMV0udHlwZSwgW1wiY3Njcm9sbFwiLCBcInVzY3JvbGxcIiwgXCJwc2Nyb2xsXCIsIFwib2ZmZXJpbmdcIl0pKSB8fFxyXG4vLyAgICAgICAgICAgICAoXCJleGNoYW5nZVwiID09IHNsb3RfaWRzW2NdICYmIEcuaXRlbXNbYlswXV0uZSlcclxuLy8gICAgICAgICAgICkge1xyXG4vLyAgICAgICAgICAgICAvL2FbY11bMV0ucHVzaCh7bmFtZTpiWzFdLmlkfSk7XHJcbi8vICAgICAgICAgICAgIGNvbnN0IGRlc3RfdHlwZSA9IGJbMV0uaWQ7XHJcbi8vICAgICAgICAgICAgIGxldCB0eXBlX2luX2JhbmsgPSBbXTtcclxuLy8gICAgICAgICAgICAgZm9yIChsZXQgYmFua19wb2NrIGluIGNoYXJhY3Rlci5iYW5rKSB7XHJcbi8vICAgICAgICAgICAgICAgY29uc3QgYmFua19wYWNrID0gY2hhcmFjdGVyLmJhbmtbYmFua19wb2NrXTtcclxuLy8gICAgICAgICAgICAgICBmb3IgKGxldCBib25rX2l0ZW0gaW4gYmFua19wYWNrKSB7XHJcbi8vICAgICAgICAgICAgICAgICBjb25zdCBiYW5rX2l0ZW0gPSBiYW5rX3BhY2tbYm9ua19pdGVtXTtcclxuLy8gICAgICAgICAgICAgICAgIGlmIChiYW5rX2l0ZW0gJiYgYmFua19pdGVtLm5hbWUgPT0gZGVzdF90eXBlKVxyXG4vLyAgICAgICAgICAgICAgICAgICB0eXBlX2luX2JhbmsucHVzaChiYW5rX2l0ZW0pO1xyXG4vLyAgICAgICAgICAgICAgIH1cclxuLy8gICAgICAgICAgICAgfVxyXG4vLyAgICAgICAgICAgICB0eXBlX2luX2Jhbmsuc29ydChpdG1fY21wKTtcclxuLy8gICAgICAgICAgICAgLy9zdWNlc3NpdmUgbWVyZ2UsIGZsYXR0ZW5cclxuLy8gICAgICAgICAgICAgZm9yIChsZXQgaW8gPSB0eXBlX2luX2JhbmsubGVuZ3RoIC0gMTsgaW8gPj0gMTsgaW8tLSkge1xyXG4vLyAgICAgICAgICAgICAgIGlmIChpdG1fY21wKHR5cGVfaW5fYmFua1tpb10sIHR5cGVfaW5fYmFua1tpbyAtIDFdKSA9PSAwKSB7XHJcbi8vICAgICAgICAgICAgICAgICB0eXBlX2luX2JhbmtbaW8gLSAxXS5xID1cclxuLy8gICAgICAgICAgICAgICAgICAgKHR5cGVfaW5fYmFua1tpbyAtIDFdLnEgfHwgMSkgKyAodHlwZV9pbl9iYW5rW2lvXS5xIHx8IDEpO1xyXG4vLyAgICAgICAgICAgICAgICAgdHlwZV9pbl9iYW5rLnNwbGljZShpbywgMSk7XHJcbi8vICAgICAgICAgICAgICAgfVxyXG4vLyAgICAgICAgICAgICB9XHJcbi8vICAgICAgICAgICAgIGFbY11bMV0ucHVzaCh0eXBlX2luX2JhbmspO1xyXG4vLyAgICAgICAgICAgICBicmVhaztcclxuLy8gICAgICAgICAgIH1cclxuLy8gICAgIH0pO1xyXG4vLyAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBhLmxlbmd0aDsgYysrKSB7XHJcbi8vICAgICAgIGFbY11bMV0gPSBhW2NdWzFdLmZsYXQoKTtcclxuLy8gICAgIH1cclxuLy8gICAgIC8vc2hvd19qc29uKGEpO1xyXG4vLyAgICAgcmVuZGVyX2l0ZW1zKGEpO1xyXG4vLyAgIH1cclxuLy8gICBmdW5jdGlvbiByZW5kZXJfaXRlbXMoYSkge1xyXG4vLyAgICAgaWYgKGEubGVuZ3RoID4gMCAmJiAhQXJyYXkuaXNBcnJheShhWzBdKSkge1xyXG4vLyAgICAgICBhID0gW1tcIkl0ZW1zXCIsIGFdXTtcclxuLy8gICAgIH1cclxuLy8gICAgIGxldCBiID1cclxuLy8gICAgICAgXCI8ZGl2IHN0eWxlPSdib3JkZXI6IDVweCBzb2xpZCBncmF5OyBiYWNrZ3JvdW5kLWNvbG9yOiBibGFjazsgcGFkZGluZzogMTBweDsgd2lkdGg6IDkwJSwgaGVpZ2h0OjkwJSc+XCI7XHJcbi8vICAgICBhLmZvckVhY2goZnVuY3Rpb24gKGEpIHtcclxuLy8gICAgICAgYiArPVxyXG4vLyAgICAgICAgIFwiPGRpdiBzdHlsZT0nZmxvYXQ6bGVmdDsgbWFyZ2luLWxlZnQ6NXB4Oyc+PGRpdiBjbGFzcz0nZ2FtZWJ1dHRvbiBnYW1lYnV0dG9uLXNtYWxsJyBzdHlsZT0nbWFyZ2luLWJvdHRvbTogNXB4Jz5cIiArXHJcbi8vICAgICAgICAgYVswXSArXHJcbi8vICAgICAgICAgXCI8L2Rpdj5cIjtcclxuLy8gICAgICAgYiArPSBcIjxkaXYgc3R5bGU9J21hcmdpbi1ib3R0b206IDEwcHgnPlwiO1xyXG4vLyAgICAgICBhWzFdLmZvckVhY2goZnVuY3Rpb24gKGEpIHtcclxuLy8gICAgICAgICBiICs9IHBhcmVudC5pdGVtX2NvbnRhaW5lcihcclxuLy8gICAgICAgICAgIHtcclxuLy8gICAgICAgICAgICAgc2tpbjogRy5pdGVtc1thLm5hbWVdLnNraW4sXHJcbi8vICAgICAgICAgICAgIG9uY2xpY2s6IFwicmVuZGVyX2l0ZW1faW5mbygnXCIgKyBhLm5hbWUgKyBcIicpXCIsXHJcbi8vICAgICAgICAgICB9LFxyXG4vLyAgICAgICAgICAgYVxyXG4vLyAgICAgICAgICk7XHJcbi8vICAgICAgIH0pO1xyXG4vLyAgICAgICBiICs9IFwiPC9kaXY+PC9kaXY+XCI7XHJcbi8vICAgICB9KTtcclxuLy8gICAgIGIgKz0gXCI8ZGl2IHN0eWxlPSdjbGVhcjpib3RoOyc+PC9kaXY+PC9kaXY+XCI7XHJcbi8vICAgICBwYXJlbnQuc2hvd19tb2RhbChiLCB7XHJcbi8vICAgICAgIHdyYXA6ICExLFxyXG4vLyAgICAgICBoaWRlaW5iYWNrZ3JvdW5kOiAhMCxcclxuLy8gICAgICAgdXJsOiBcIi9kb2NzL2d1aWRlL2FsbC9pdGVtc1wiLFxyXG4vLyAgICAgfSk7XHJcbi8vICAgfVxyXG4vLyBmdW5jdGlvbiBpbnZlbnRvcnlfY2xpY2sobnVtLGV2ZW50KVxyXG4vLyB7XHJcbi8vIFx0Y29uc29sZS5sb2coZXZlbnQpO1xyXG4vLyBcdGlmKGlzX2NvbW0gJiYgZXZlbnQpIHJldHVybiBzdHByKGV2ZW50KTtcclxuLy8gXHRpZihldmVudCAmJiAoZXZlbnQud2hpY2g9PTIgfHwgZXZlbnQuYnV0dG9uPT00KSlcclxuLy8gXHR7XHJcbi8vIFx0XHRpbnZlbnRvcnlfbWlkZGxlKG51bSxldmVudClcclxuLy8gXHR9XHJcbi8vIFx0ZWxzZVxyXG4vLyBcdHtcclxuLy8gXHRcdHZhciBpbmFtZT1cIlwiO1xyXG4vLyBcdFx0aWYoY2hhcmFjdGVyLml0ZW1zW251bV0pIGluYW1lPWNoYXJhY3Rlci5pdGVtc1tudW1dLm5hbWUrY2hhcmFjdGVyLml0ZW1zW251bV0ubGV2ZWw7XHJcbi8vIFx0XHRpZihsYXN0X2ludmNsaWNrICYmIGxhc3RfaW52Y2xpY2s9PW51bStpbmFtZSAmJiAkKFwiLmludmVudG9yeS1pdGVtXCIpLmh0bWwoKS5sZW5ndGgpXHJcbi8vIFx0XHRcdCQoXCIuaW52ZW50b3J5LWl0ZW1cIikuaHRtbChcIlwiKTtcclxuLy8gXHRcdGVsc2UgaWYoY2hhcmFjdGVyLml0ZW1zW251bV0pXHJcbi8vIFx0XHR7XHJcbi8vIFx0XHRcdGlmKGNoYXJhY3Rlci5pdGVtc1tudW1dLm5hbWU9PVwicGxhY2Vob2xkZXJcIikgcmV0dXJuO1xyXG4vLyBcdFx0XHRpZihjaGFyYWN0ZXIuaXRlbXNbbnVtXS5uYW1lPT1cImNvbXB1dGVyXCIpIC8vIGdhbWVwbGF5PT1cImhhcmRjb3JlXCIgJiZcclxuLy8gXHRcdFx0e1xyXG4vLyBcdFx0XHRcdHJldHVybiByZW5kZXJfY29tcHV0ZXJfbmV0d29yayhcIi5pbnZlbnRvcnktaXRlbVwiKTtcclxuLy8gXHRcdFx0fVxyXG4vLyBcdFx0XHRyZW5kZXJfaXRlbShcIi5pbnZlbnRvcnktaXRlbVwiLHtpZDpcImNpdGVtXCIrbnVtLGl0ZW06Ry5pdGVtc1tjaGFyYWN0ZXIuaXRlbXNbbnVtXS5uYW1lXSxuYW1lOmNoYXJhY3Rlci5pdGVtc1tudW1dLm5hbWUsYWN0dWFsOmNoYXJhY3Rlci5pdGVtc1tudW1dLG51bTpudW0saW52ZW50b3J5X3VpOm51bX0pO1xyXG4vLyBcdFx0XHRsYXN0X2ludmNsaWNrPW51bStpbmFtZTtcclxuLy8gXHRcdH1cclxuLy8gXHR9XHJcbi8vIH1cclxuLy8gZnVuY3Rpb24gaW52ZW50b3J5X21pZGRsZShudW0sZXZlbnQpXHJcbi8vIHtcclxuLy8gXHRpZihldmVudCAmJiAoZXZlbnQud2hpY2g9PTIgfHwgZXZlbnQuYnV0dG9uPT00KSlcclxuLy8gXHR7XHJcbi8vIFx0XHRpZihjaGFyYWN0ZXIuaXRlbXNbbnVtXSAmJiBjaGFyYWN0ZXIuaXRlbXNbbnVtXS5xICYmIGNoYXJhY3Rlci5pdGVtc1tudW1dLnE+MSlcclxuLy8gXHRcdHtcclxuLy8gXHRcdFx0aWYoY2hhcmFjdGVyLml0ZW1zW251bV0ucT09Mikgc3BsaXQobnVtLDEpO1xyXG4vLyBcdFx0XHRlbHNlXHJcbi8vIFx0XHRcdHtcclxuLy8gXHRcdFx0XHRnZXRfaW5wdXQoW1xyXG4vLyBcdFx0XHRcdFx0e3RpdGxlOlwiKDEtXCIrbWluKEcuaXRlbXNbY2hhcmFjdGVyLml0ZW1zW251bV0ubmFtZV0uc3x8MSxjaGFyYWN0ZXIuaXRlbXNbbnVtXS5xLTEpK1wiKVwifSxcclxuLy8gXHRcdFx0XHRcdHtpbnB1dDpcInF0XCIscGxhY2Vob2xkZXI6XCJRdWFudGl0eVwiLHN0eWxlOlwid2lkdGg6IDMyMHB4OyB0ZXh0LWFsaWduOiBsZWZ0ICFpbXBvcnRhbnQ7XCJ9LFxyXG4vLyBcdFx0XHRcdFx0e2J1dHRvbjpcIlNwbGl0XCIsc21hbGw6dHJ1ZSxvbmNsaWNrOmZ1bmN0aW9uKCl7XHJcbi8vIFx0XHRcdFx0XHRcdHBjcygpO1xyXG4vLyBcdFx0XHRcdFx0XHRzcGxpdChudW0sJChcIi5xdFwiKS52YWwoKSk7XHJcbi8vIFx0XHRcdFx0XHRcdGhpZGVfbW9kYWwoMSk7XHJcbi8vIFx0XHRcdFx0XHR9fVxyXG4vLyBcdFx0XHRcdF0pO1xyXG4vLyBcdFx0XHR9XHJcbi8vIFx0XHR9XHJcbi8vIFx0fVxyXG4vLyB9XHJcbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==