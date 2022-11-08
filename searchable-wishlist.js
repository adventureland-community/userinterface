/**
 * Changes the wish list to be searchable by overriding the render_wishlist function
 * Load the following code to override the original render_wishlist function
 * @param num
 * @param page
 * @param search
 */
parent.render_wishlist = function render_wishlist(num, page, search) {
  if (!search) {
    search = "";
  }

  let html =
    "<div style='background-color: black; border: 5px solid gray; padding: 12px 20px 20px 20px; font-size: 24px; display: inline-block'>";
  html += `<div style='color: #f1c054; border-bottom: 2px dashed #C7CACA; margin-bottom: 3px; margin-left: 3px; margin-right: 3px' class='cbold'>Wishlist <input placeholder='press enter to search' onchange='render_wishlist(${num},${page},this.value)' value='${search}' /></div>`;
  const items = [];
  let last = 0;
  for (const name in G.items) {
    const gItem = G.items[name];
    if (!gItem.ignore) {
      if (search) {
        if (name.indexOf(search) > -1 || (gItem && gItem.name.indexOf(search) > -1)) {
          items.push([name, gItem, gItem.g || 0]);
        }
      } else {
        items.push([name, gItem, gItem.g || 0]);
      }
    }
  }
  items.sort(function (a, b) {
    // sort by gold cost descending.
    return b[2] - a[2];
  });

  if (page >= 1) last += 19 + (page - 1) * 18;
  for (let i = 0; i < 4; i++) {
    html += "<div>";
    for (let j = 0; j < 5; j++) {
      if (i == 3 && j == 0 && page != 0)
        html += item_container(
          { skin: "left", onclick: `render_wishlist(${num},${page - 1},${search});` },
          { q: page, left: true }
        );
      else if (i == 3 && j == 4 && last < items.length - 1)
        html += item_container(
          { skin: "right", onclick: `render_wishlist(${num},${page + 1},${search});` },
          { q: page + 2, left: true }
        );
      else if (last < items.length && items[last++]) {
        const id = "wishlist" + (last - 1),
          item = items[last - 1][1],
          name = items[last - 1][0];
        html += item_container(
          {
            skin: item.skin,
            onclick: `wishlist_item_click('${name}',${num})`,
            def: item,
            id: id,
            draggable: false,
            droppable: false,
          },
          null
        );
      } else {
        html += item_container({ size: 40, draggable: false, droppable: false });
      }
    }
    html += "</div>";
  }
  html += "</div>";
  $("#topleftcornerdialog").html(html);
  dialogs_target = character;
};
