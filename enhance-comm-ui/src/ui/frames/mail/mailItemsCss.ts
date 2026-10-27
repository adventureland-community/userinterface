/** Mail Items mode — bank-style agg grid + recipient sections. */
export const MAIL_ITEMS_CSS = `.comm-mail__items {
  flex: 1 1 46%;
  max-width: 560px;
  overflow: auto;
  border-right: 1px solid #2a2a2a;
  min-width: 260px;
  padding: 8px 10px 12px;
  contain: layout style;
}
.comm-mail.is-narrow .comm-mail__items { flex: 1 1 auto; max-width: none; border-right: none; }
.comm-mail.is-narrow.is-reading .comm-mail__items,
.comm-mail.is-narrow.is-compose .comm-mail__items { display: none; }
.comm-mail__items-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}
.comm-mail__items-seg {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  background: #141414;
  border: 1px solid #2a2a2a;
}
.comm-mail__items-seg-btn {
  appearance: none;
  border: none;
  background: transparent;
  color: #aaa;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 9px;
  border-radius: 6px;
  cursor: pointer;
}
.comm-mail__items-seg-btn.is-on {
  background: #2a3340;
  color: #cde;
}
.comm-mail__items-incomplete {
  flex: 1 1 100%;
  font-size: 11px;
  color: #c9a66b;
  line-height: 1.35;
  padding: 4px 6px;
  border-radius: 6px;
  background: rgba(120, 80, 20, 0.18);
  border: 1px solid rgba(180, 120, 40, 0.35);
}
.comm-mail__items-empty {
  color: #777;
  font-size: 13px;
  padding: 18px 8px;
  text-align: center;
}
.comm-mail__items-section {
  margin-bottom: 14px;
  border-radius: 8px;
  transition: box-shadow 0.35s ease, background 0.35s ease;
}
.comm-mail__items-section.is-focus {
  background: rgba(40, 70, 110, 0.28);
  box-shadow: 0 0 0 1px rgba(102, 170, 255, 0.45);
  padding: 6px 6px 8px;
  margin-left: -6px;
  margin-right: -6px;
}
.comm-mail__items-section-hd {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin: 0 0 8px;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #9a9a9a;
}
.comm-mail__items-section-hd.is-cap-warn { color: #e0b060; }
.comm-mail__items-section-hd.is-cap-full { color: #ff7aa2; }
.comm-mail__items-section-name {
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: none;
  font-size: 13px;
  color: #ddd;
}
.comm-mail__items-section-hd.is-cap-warn .comm-mail__items-section-name { color: #f0c878; }
.comm-mail__items-section-hd.is-cap-full .comm-mail__items-section-name { color: #ff9ab8; }
.comm-mail__items-section-meta {
  font-size: 11px;
  letter-spacing: 0;
  text-transform: none;
  color: #888;
}
.comm-mail__items-section-hd.is-cap-full .comm-mail__items-section-meta { color: #ff9ab8; }
.comm-mail__items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(52px, 1fr));
  gap: 6px;
}
.comm-mail__items-cell {
  appearance: none;
  border: 1px solid #2e2e2e;
  background: #101010;
  padding: 4px 3px 5px;
  cursor: pointer;
  min-height: 56px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  color: inherit;
  font: inherit;
}
.comm-mail__items-cell:hover { border-color: #4a5a70; background: #161a20; }
.comm-mail__items-cell.is-sel {
  border-color: #6af;
  background: #1c2430;
  box-shadow: 0 0 0 1px rgba(102, 170, 255, 0.35);
}
.comm-mail__items-cell.is-cap-full {
  border-color: rgba(255, 122, 162, 0.55);
}
.comm-mail__items-cell.is-cap-full.is-sel {
  border-color: #ff7aa2;
  box-shadow: 0 0 0 1px rgba(255, 122, 162, 0.4);
}
.comm-mail__items-cell-meta {
  font-size: 10px;
  color: #888;
  line-height: 1.15;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.comm-mail__items-cell.is-sel .comm-mail__items-cell-meta { color: #b8c8dc; }
.comm-mail__item-mails {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1 1 auto;
  height: 100%;
}
.comm-mail__pane.is-item-mails {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.comm-mail__item-mails-hd {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px 12px 8px;
  border-bottom: 1px solid #222;
}
.comm-mail__item-mails-title {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  color: #eee;
}
.comm-mail__item-mails-sub {
  flex: 1 1 100%;
  font-size: 12px;
  color: #888;
}
.comm-mail__item-mails-list {
  overflow: auto;
  flex: 1 1 auto;
  min-height: 0;
}
.comm-mail__item-mails-list .comm-mail__row-take {
  flex: 0 0 auto;
  align-self: center;
  margin-right: 4px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
}
`;
