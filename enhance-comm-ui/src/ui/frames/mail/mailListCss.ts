/** Mail list rows, when column, stack chips, item icons. */
export const MAIL_LIST_CSS = `.comm-mail__body {
  flex: 1 1 auto;
  display: flex;
  min-height: 0;
  position: relative;
}
.comm-mail__list {
  flex: 1 1 46%;
  max-width: 560px;
  overflow: auto;
  border-right: 1px solid #2a2a2a;
  min-width: 260px;
  /* Isolate list layout/paint from chrome without size containment (flex needs height). */
  contain: layout style;
}
.comm-mail.is-narrow .comm-mail__list { flex: 1 1 auto; max-width: none; border-right: none; }
.comm-mail.is-narrow.is-reading .comm-mail__list,
.comm-mail.is-narrow.is-compose .comm-mail__list { display: none; }
.comm-mail__row {
  display: flex;
  gap: 10px;
  padding: 9px 12px;
  border-bottom: 1px solid #1c1c1c;
  cursor: pointer;
  align-items: flex-start;
  min-height: 0;
  /* Skip layout/paint for off-screen rows while scrolling. */
  content-visibility: auto;
  contain-intrinsic-size: auto 56px;
  contain: layout style;
}
.comm-mail__row:hover { background: #161616; }
.comm-mail__row.is-sel { background: #1c2430; }
.comm-mail__row.is-unread .comm-mail__title { color: #fff; font-weight: 600; }
.comm-mail__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: transparent;
  flex-shrink: 0;
}
.comm-mail__row.is-unread .comm-mail__dot { background: #6af; }
.comm-mail__main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-top: 1px;
}
.comm-mail__sub {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px 6px;
  min-width: 0;
  color: #bbb;
  font-size: 14px;
  line-height: 1.25;
}
.comm-mail__title {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.comm-mail__chips {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}
.comm-mail__row .comm-mail__chips {
  flex: 1 1 auto;
  min-width: 0;
}
.comm-mail__aside {
  display: none;
}
.comm-mail__when {
  flex: 0 0 4.75em;
  width: 4.75em;
  margin-left: 4px;
  text-align: right;
  align-self: center;
  line-height: 1.25;
  font-variant-numeric: tabular-nums;
}
.comm-mail__when-date {
  font-size: 11px;
  color: #9a9a9a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.comm-mail__when-ago {
  font-size: 10px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.comm-mail__meta {
  font-size: 11px;
  color: #777;
}
.comm-mail__row .comm-mail__meta {
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.comm-mail__row.is-stack .comm-mail__title { color: #ddd; }
.comm-mail__twist {
  display: none;
}
.comm-mail__stack-n,
.comm-mail__stack-q,
.comm-mail__stack-u {
  display: inline-block;
  padding: 0 5px;
  border-radius: 7px;
  font-size: 11px;
  font-weight: 700;
  line-height: 16px;
  border: none;
  cursor: inherit;
  font-family: inherit;
}
button.comm-mail__stack-n,
button.comm-mail__stack-u {
  cursor: pointer;
}
.comm-mail__stack-n {
  background: #2a3340;
  color: #9cf;
}
.comm-mail__stack-n.is-open {
  background: #3a4455;
  color: #cde;
}
.comm-mail__stack-q {
  background: #3d3420;
  color: #ffe9a0;
}
.comm-mail__stack-u {
  background: #1a3048;
  color: #9cf;
  font-weight: 600;
}
.comm-mail__row.is-nested {
  padding-left: 28px;
  background: #101418;
}
.comm-mail__row.is-nested:hover { background: #161c22; }
.comm-mail__row.is-nested.is-sel { background: #1c2430; }
.comm-mail__item {
  position: relative;
  flex: 0 0 auto;
  flex-shrink: 0;
  margin-left: 2px;
  line-height: 0;
  align-self: center;
  box-sizing: border-box;
}
.comm-mail__item.is-empty {
  visibility: hidden;
  pointer-events: none;
}
.comm-mail__item.is-taken {
  opacity: 0.22;
  filter: grayscale(1);
}
.comm-mail__item-stamp {
  position: absolute;
  right: -3px;
  bottom: -3px;
  z-index: 3;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 7px;
  border: 1px solid #222;
  font-size: 10px;
  font-weight: 700;
  line-height: 12px;
  text-align: center;
  pointer-events: none;
  box-sizing: border-box;
}
.comm-mail__item-stamp.is-takeable {
  background: #1a3a18;
  color: #8fd67a;
  border-color: #3a6a32;
}
.comm-mail__item-stamp.is-taken {
  background: #2a2a2a;
  color: #bbb;
  border-color: #555;
}
.comm-mail__attach-pill {
  display: inline-block;
  padding: 0 5px;
  border-radius: 7px;
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  letter-spacing: 0.02em;
}
.comm-mail__attach-pill.is-takeable {
  background: #1a3020;
  color: #b8f0a0;
}
.comm-mail__attach-pill.is-taken {
  background: #2a2a2a;
  color: #bbb;
}
.comm-mail__item .ecu-meter-icon-clip {
  display: block;
  overflow: hidden;
}
.comm-mail__item .ecu-meter-icon-clip img,
.comm-mail__attach .ecu-meter-icon-clip img,
.comm-mail__item img,
.comm-mail__attach img {
  max-width: none;
  image-rendering: pixelated;
}
.comm-mail__row.has-item { border-left: 2px solid transparent; }
.comm-mail__row.item-taken { border-left: 2px solid #555; }
`;
