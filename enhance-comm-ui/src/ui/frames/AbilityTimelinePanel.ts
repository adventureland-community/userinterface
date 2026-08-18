import { e, getReact } from "../../host/react";
import type { EntityLike } from "../../host/globals";
import {
  useAbilityTimelineLive,
  useAbilityTimelineMotion,
} from "../hooks/useAbilityTimelineLive";
import { renderAbilityTimelineShell } from "./abilityTimelineRender";

export type AbilityTimelinePanelProps = {
  entities: EntityLike[];
  selectedEntity?: string;
  observing?: EntityLike | null;
  layoutEdit?: boolean;
};

/**
 * Forward CD timeline for visible monsters with trackable cooldown abilities.
 * Prefs: vertical / horizontal — entity.s + G.monsters.
 */
export function AbilityTimelinePanel(props: AbilityTimelinePanelProps): any {
  const React = getReact();
  const { prefs, model, hasActive, tickKey } = useAbilityTimelineLive(props);
  const hostRef = React.useRef(null as HTMLDivElement | null);
  const [chrome, setChrome] = React.useState("inward" as "inward" | "outward");
  useAbilityTimelineMotion(hostRef, hasActive, tickKey);
  React.useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const mid = r.left + r.width / 2;
      setChrome(mid > window.innerWidth * 0.55 ? "inward" : "outward");
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [prefs.orient, hasActive]);

  if (!model) return null;
  return e(
    "div",
    { ref: hostRef, style: { height: "100%", width: "100%" } },
    renderAbilityTimelineShell(model, prefs, !!props.layoutEdit, chrome),
  );
}
