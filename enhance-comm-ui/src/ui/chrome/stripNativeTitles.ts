/**
 * Drop browser `title` tooltips so Comm cooltips do not stack with them.
 */

export function stripNativeTitles(
  root: HTMLElement | null | undefined,
): void {
  if (!root) return;
  root.removeAttribute("title");
  const titled = root.querySelectorAll("[title]");
  for (let i = 0; i < titled.length; i++) {
    (titled[i] as HTMLElement).removeAttribute("title");
  }
}
