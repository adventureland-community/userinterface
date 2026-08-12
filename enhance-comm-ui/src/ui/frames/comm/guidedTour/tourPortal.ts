/**
 * Render tour overlay on document.body — above #comm-ui stacking context.
 */

import { getReact, getReactDOM } from "../../../../host/react";

export function TourPortal(props: { children: any }): any {
  const React = getReact();
  const ReactDOM = getReactDOM();
  const [host, setHost] = React.useState(null as HTMLDivElement | null);

  React.useEffect(() => {
    // Drop orphan portals from prior hot reloads / aborted mounts.
    const orphans = document.querySelectorAll("[data-ecu-tour-portal]");
    for (let i = 0; i < orphans.length; i++) {
      const node = orphans[i];
      if (node.parentNode) node.parentNode.removeChild(node);
    }
    const el = document.createElement("div");
    el.setAttribute("data-ecu-tour-portal", "1");
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
