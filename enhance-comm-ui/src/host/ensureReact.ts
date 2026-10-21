/**
 * Load React 18 onto window when the host page does not already provide it.
 * Tries several CDNs (production UMD) — unpkg alone often times out.
 */

const REACT_URLS = [
  "https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js",
  "https://unpkg.com/react@18.3.1/umd/react.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js",
];

const REACT_DOM_URLS = [
  "https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js",
  "https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js",
];

const SCRIPT_TIMEOUT_MS = 12000;

function loadScript(id: string, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector("#" + id) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.ecuLoaded === "1") {
        resolve();
        return;
      }
      const onLoad = () => {
        existing.dataset.ecuLoaded = "1";
        resolve();
      };
      const onErr = () => reject(new Error("script error: " + src));
      existing.addEventListener("load", onLoad);
      existing.addEventListener("error", onErr);
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.crossOrigin = "anonymous";
    script.async = true;

    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      script.remove();
      reject(new Error("timeout: " + src));
    }, SCRIPT_TIMEOUT_MS);

    script.addEventListener("load", () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      script.dataset.ecuLoaded = "1";
      resolve();
    });
    script.addEventListener("error", () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      script.remove();
      reject(new Error("script error: " + src));
    });

    (document.head || document.documentElement).append(script);
  });
}

async function loadFirstAvailable(
  id: string,
  urls: readonly string[],
): Promise<string> {
  let lastErr: unknown = null;
  for (let i = 0; i < urls.length; i++) {
    const src = urls[i];
    try {
      // Fresh id per attempt so a failed partial tag does not block retries.
      const attemptId = i === 0 ? id : id + "-r" + i;
      await loadScript(attemptId, src);
      return src;
    } catch (err) {
      lastErr = err;
      console.warn("[ecu] React CDN failed, trying next", src, err);
    }
  }
  throw lastErr || new Error("all React CDNs failed for " + id);
}

/**
 * Ensure window.React + window.ReactDOM, then run onReady (body may still be pending).
 */
export function ensureReact(onReady: () => void): void {
  if (window.React && window.ReactDOM) {
    onReady();
    return;
  }

  void (async () => {
    try {
      if (!window.React) {
        await loadFirstAvailable("ecu-react", REACT_URLS);
      }
      if (!window.ReactDOM) {
        await loadFirstAvailable("ecu-react-dom", REACT_DOM_URLS);
      }
      if (!window.React || !window.ReactDOM) {
        throw new Error("React globals missing after CDN load");
      }
      onReady();
    } catch (err) {
      console.error(
        "[ecu] Could not load React — Comm UI will not mount. Check CDN / network.",
        err,
      );
    }
  })();
}
