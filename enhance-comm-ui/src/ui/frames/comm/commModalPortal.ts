/**
 * Render full-screen Comm modals on document.body — above #comm-ui (220) and
 * #bottom chrome so footers like "Got it" stay clickable when they overlap
 * the character strip.
 */

import { getReact, getReactDOM } from "../../../host/react";

export function CommModalPortal(props: { children: any }): any {
  const React = getReact();
  const ReactDOM = getReactDOM();
  const [host, setHost] = React.useState(null as HTMLDivElement | null);

  React.useEffect(() => {
    const orphans = document.querySelectorAll("[data-ecu-comm-modal-portal]");
    for (let i = 0; i < orphans.length; i++) {
      const node = orphans[i];
      if (node.parentNode) node.parentNode.removeChild(node);
    }
    const el = document.createElement("div");
    el.setAttribute("data-ecu-comm-modal-portal", "1");
    document.body.appendChild(el);
    setHost(el);
    return () => {
      if (el.parentNode) el.parentNode.removeChild(el);
      setHost(null);
    };
  }, []);

  if (!host) return null;
  return ReactDOM.createPortal(props.children, host);
}
