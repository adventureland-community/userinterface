/**
 * Cue phone Character / Server / Apps / Shade for guided tours.
 * No-op when PhoneNavDock is not mounted (desktop).
 */

export type PhoneTourChromeApi = {
  openObserve: () => void;
  openServer: () => void;
  openApps: () => void;
  openShade: () => void;
  closeAll: () => void;
};

let api: PhoneTourChromeApi | null = null;

export function registerPhoneTourChrome(next: PhoneTourChromeApi | null): void {
  api = next;
}

export function openPhoneObserve(): void {
  if (api) api.openObserve();
}

export function openPhoneServer(): void {
  if (api) api.openServer();
}

export function openPhoneApps(): void {
  if (api) api.openApps();
}

export function openPhoneShade(): void {
  if (api) api.openShade();
}

export function closePhoneTourChrome(): void {
  if (api) api.closeAll();
}
