// npx tsc ./src/ui/inventory-enhancements.ts --target esnext --module amd --outFile "./src/ui/inventory-enhancements.js"
// TODO: a bagnon / all in one inventory for the bank
// TODO: also extend the player inventory

import { BankPackType, ItemInfo, ItemKey, ItemType } from "adventureland";

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
function abbreviateNumber(number: number) {
  const SI_SYMBOL = ["", "k", "M", "G", "T", "P", "E"];
  if (!number) {
    return number;
  }

  // what tier? (determines SI symbol)
  const tier = (Math.log10(Math.abs(number)) / 3) | 0;

  // if zero, we don't need a suffix
  if (tier === 0) return number;

  // get suffix and determine scale
  const suffix = SI_SYMBOL[tier];
  const scale = Math.pow(10, tier * 3);

  // scale the number
  const scaled = number / scale;

  // format number and add suffix
  //   return scaled.toFixed(1) + suffix;
  return (
    scaled.toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }) + suffix
  );
}

function renderBankItems(search = "") {
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

    const types: { [key in ItemType | "exchange"]?: string } = {
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
    const groups: { [key: string]: any } = {};
    let packName: BankPackType;
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
          itemData = { amount: 0, levels: {} };
          itemByType.items[itemInfo.name] = itemData;
        }

        let levels = itemData.levels[level];
        if (!levels) {
          levels = { amount: itemInfo.q || 1, indexes: [[packName, index]] };
          itemData.levels[level] = levels;
        } else {
          itemData.amount += itemInfo.q || 1;
          levels.amount += itemInfo.q || 1;
          levels.indexes.push([packName, index]);
        }

        totalUsedBankSlots++;
      }
    }

    console.log(
      "bank slots",
      totalBankSlots,
      totalUsedBankSlots,
      totalUnusedBankSlots
    );
    console.log(groups);

    const sortedGroupKeys = [...new Set(Object.values(types))]; //.sort((a, b) => a.localeCompare(b));

    for (const itemType of sortedGroupKeys) {
      const itemsByType = groups[itemType];
      if (!itemsByType) {
        continue;
      }

      const itemTypeContainer = $("<div style='float:left; margin-left:5px;'>");
      itemTypeContainer.append(
        `<div class='gamebutton gamebutton-small' style='margin-bottom: 5px'>${itemType}</div>`
      );
      bankItemsContainer.append(itemTypeContainer);

      const itemsContainer = $("<div style='margin-bottom: 10px'>");
      itemTypeContainer.append(itemsContainer);

      // loop items
      for (const itemKey in itemsByType.items) {
        const gItem = G.items[itemKey as ItemKey];
        const {
          amount,
          levels,
        }: { amount: number; levels: { [level: number]: any } } =
          itemsByType.items[itemKey];

        // TODO: iterate backwards?

        for (let level in levels) {
          const data = levels[level];

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
                onclick: "render_item_info('" + itemKey + "')",
              },
              fakeItemInfo
            )
          );

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
    `<input placeholder='press enter to search' onchange='renderBankItems(this.value)' value='${""}' />`
  );
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
