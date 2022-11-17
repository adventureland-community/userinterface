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

// function on_rclick(current)
// {
// 	var $current=$(current),inum=$current.data("inum"),snum=$current.data("snum"),sname=$current.data("sname"),on=$current.data("onrclick");
// 	if(on) smart_eval(on);
// 	else if(sname!==undefined) { socket.emit('unequip',{slot:sname}); push_deferred("unequip"); }
// 	else if(snum!==undefined) { socket.emit('bank',{operation:"swap",inv:-1,str:snum,pack:last_rendered_items,reopen:false}); push_deferred("bank"); }
// 	else if(inum!==undefined)
// 	{
// 		if(topleft_npc=="items")
// 		{
// 			tut("store");
// 			socket.emit('bank',{operation:"swap",inv:inum,str:-1,pack:last_rendered_items,reopen:false});
// 			push_deferred("bank");
// 		}