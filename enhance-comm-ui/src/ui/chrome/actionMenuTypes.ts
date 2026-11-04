/** Shared action-menu row — bag / gear / bank / phone sheet. */
export type ActionMenuAction = {
  id: string;
  label: string;
  title?: string;
  /** Visual divider above this row. */
  separatorBefore?: boolean;
  /** Non-interactive row (e.g. empty nearby list). */
  disabled?: boolean;
  run?: () => void;
  /** Nested items — desktop flyout / phone tap-to-expand. */
  children?: ActionMenuAction[];
  /**
   * Optional rich label (icons / recipe chips). `label` stays the accessible name.
   * Host is the menu button; clear it before appending.
   */
  mountLabel?: (host: HTMLElement) => void;
};
