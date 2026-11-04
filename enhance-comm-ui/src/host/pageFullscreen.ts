/**
 * Document Fullscreen API helpers — hide mobile browser chrome (Edge/Chrome
 * address + tab bars). Needs a user gesture; no-op when unsupported (iOS Safari).
 */

type DocFs = Document & {
  fullscreenEnabled?: boolean;
  webkitFullscreenEnabled?: boolean;
  fullscreenElement?: Element | null;
  webkitFullscreenElement?: Element | null;
  exitFullscreen?: () => Promise<void>;
  webkitExitFullscreen?: () => void;
};

type ElFs = HTMLElement & {
  requestFullscreen?: (opts?: { navigationUI?: string }) => Promise<void>;
  webkitRequestFullscreen?: () => void;
};

export function isPageFullscreenSupported(): boolean {
  if (typeof document === "undefined") return false;
  const doc = document as DocFs;
  return !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
}

export function isPageFullscreen(): boolean {
  if (typeof document === "undefined") return false;
  const doc = document as DocFs;
  return !!(doc.fullscreenElement || doc.webkitFullscreenElement);
}

/** Enter fullscreen; hides navigation UI when the browser allows. */
export function enterPageFullscreen(): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  const el = document.documentElement as ElFs;
  if (typeof el.requestFullscreen === "function") {
    return el
      .requestFullscreen({ navigationUI: "hide" })
      .then(() => true)
      .catch(() => false);
  }
  if (typeof el.webkitRequestFullscreen === "function") {
    try {
      el.webkitRequestFullscreen();
      return Promise.resolve(true);
    } catch {
      return Promise.resolve(false);
    }
  }
  return Promise.resolve(false);
}

export function exitPageFullscreen(): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  const doc = document as DocFs;
  if (typeof doc.exitFullscreen === "function") {
    return doc
      .exitFullscreen()
      .then(() => true)
      .catch(() => false);
  }
  if (typeof doc.webkitExitFullscreen === "function") {
    try {
      doc.webkitExitFullscreen();
      return Promise.resolve(true);
    } catch {
      return Promise.resolve(false);
    }
  }
  return Promise.resolve(false);
}

/** Toggle; call from a tap/click so user activation is still live. */
export function togglePageFullscreen(): Promise<boolean> {
  if (isPageFullscreen()) return exitPageFullscreen();
  return enterPageFullscreen();
}

export function subscribePageFullscreen(listener: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  document.addEventListener("fullscreenchange", listener);
  document.addEventListener("webkitfullscreenchange", listener);
  return () => {
    document.removeEventListener("fullscreenchange", listener);
    document.removeEventListener("webkitfullscreenchange", listener);
  };
}
