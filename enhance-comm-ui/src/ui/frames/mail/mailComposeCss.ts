/** Mail read/compose panes and context menu. */
export const MAIL_COMPOSE_CSS = `.comm-mail__pane {
  flex: 1 1 54%;
  overflow: auto;
  padding: 14px 16px;
  min-width: 260px;
  font-size: 16px;
}
.comm-mail.is-narrow .comm-mail__pane { display: none; }
.comm-mail.is-narrow.is-reading .comm-mail__pane,
.comm-mail.is-narrow.is-compose .comm-mail__pane { display: block; flex: 1 1 auto; }
.comm-mail__empty { color: #777; padding: 32px 12px; text-align: center; font-size: 16px; }
.comm-mail__compose label {
  display: block; font-size: 13px; color: #999; margin: 10px 0 4px;
}
.comm-mail__compose input,
.comm-mail__compose textarea {
  width: 100%;
  background: #161616;
  border: 1px solid #333;
  color: #eee;
  padding: 9px 12px;
  font-size: 15px;
}
.comm-mail__compose textarea { min-height: 140px; resize: vertical; }
.comm-mail__chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 4px; }
.comm-mail__chip {
  background: #222;
  border: 1px solid #444;
  color: #eee;
  padding: 4px 10px;
  font-size: 14px;
  cursor: pointer;
}
.comm-mail__chip:hover {
  background: #2a2a2a;
  border-color: #666;
  color: #fff;
}
.comm-mail__suggest {
  position: absolute; z-index: 5; background: #151515;
  border: 1px solid #444; max-height: 200px; overflow: auto;
  width: min(320px, 90%);
}
.comm-mail__suggest button {
  display: block; width: 100%; text-align: left;
  background: transparent; border: 0; color: #ddd;
  padding: 8px 12px; cursor: pointer; font-size: 15px;
}
.comm-mail__suggest button:hover { background: #222; }
.comm-mail__suggest-g {
  font-size: 12px; color: #888; padding: 6px 12px 0; text-transform: uppercase;
}
.comm-mail__attach {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  padding: 10px 12px;
  background: #151a14;
  border: 1px solid #3a5a32;
}
.comm-mail__attach.is-takeable {
  box-shadow: inset 3px 0 0 #6DAD47;
}
.comm-mail__attach.is-taken {
  background: #161616;
  border-color: #3a3a3a;
  box-shadow: inset 3px 0 0 #666;
  opacity: 1;
}
.comm-mail__attach.is-taken .comm-mail__attach-meta strong {
  color: #aaa;
  text-decoration: line-through;
  text-decoration-thickness: 1px;
}
.comm-mail__attach-meta { font-size: 15px; color: #ccc; }
.comm-mail__attach-state {
  margin-top: 4px;
  font-size: 13px;
  font-weight: 700;
}
.comm-mail__attach-state.is-takeable { color: #8fd67a; }
.comm-mail__attach-state.is-taken { color: #9a9a9a; }
.comm-mail__takeable { color: #6DAD47; margin-left: 6px; }
.comm-mail__taken { color: #888; margin-left: 6px; }
.comm-mail__attach-list .comm-mail__attach {
  margin-top: 6px;
  background: #151515;
  border-color: #333;
  box-shadow: none;
}
.comm-mail__attach-list .comm-mail__attach:first-child { margin-top: 8px; }
.comm-mail__attach-to {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-size: 13px;
  color: #aaa;
}
.comm-mail__attach-to select {
  flex: 1;
  min-width: 0;
  max-width: 220px;
  background: #121212;
  border: 1px solid #444;
  color: #eee;
  padding: 4px 8px;
  font-size: 14px;
}
.comm-mail__acts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.ecu-btn[data-ecu-mail] {
  position: relative;
  overflow: visible;
}
.ecu-btn[data-ecu-mail] .ecu-mail-badge {
  position: absolute;
  top: -7px;
  right: -8px;
  min-width: 22px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  /* room for "100+" when server unread cap is hit */
  background: #d33;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  font-family: Consolas, "Segoe UI", Tahoma, sans-serif;
  letter-spacing: 0;
  line-height: 18px;
  text-align: center;
  box-shadow: 0 0 0 1px #1a1a1a;
  pointer-events: none;
}
.ecu-mail-toast {
  position: fixed;
  bottom: 72px;
  left: 50%;
  transform: translateX(-50%) translateY(12px);
  background: #1a1a1a;
  border: 1px solid #666;
  color: #eee;
  padding: 10px 16px;
  font-size: 15px;
  font-family: "Segoe UI", Tahoma, Arial, sans-serif;
  z-index: 100000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s, transform 0.2s;
}
.ecu-mail-toast.is-on {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
.comm-mail-ctx {
  position: fixed; z-index: 99999;
  background: #151515; border: 1px solid #555;
  min-width: 200px; padding: 4px 0;
  box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  font-family: "Segoe UI", Tahoma, Arial, sans-serif;
}
.comm-mail-ctx__sep {
  height: 1px;
  margin: 4px 0;
  background: #333;
}
.comm-mail-ctx button,
.comm-mail-ctx__item {
  display: block; width: 100%; text-align: left;
  background: transparent; border: 0; color: #ddd;
  padding: 9px 14px; cursor: pointer; font-size: 15px;
}
.comm-mail-ctx button:hover,
.comm-mail-ctx__item:hover { background: #222; }
`;
