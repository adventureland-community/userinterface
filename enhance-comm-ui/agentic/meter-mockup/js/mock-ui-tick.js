/**
 * One coalesce clock for the mock — ingest noise once, then notify paint listeners.
 * Mirrors plan: dirty drain / single timer (not dual 400ms + 450ms clocks).
 */
window.MockUiTick = (() => {
  const listeners = new Set();
  let timer = null;
  let gen = 0;
  const INTERVAL_MS = 400;

  function notify() {
    gen += 1;
    for (const fn of listeners) {
      try {
        fn(gen);
      } catch (err) {
        console.error("[MockUiTick]", err);
      }
    }
  }

  function pump() {
    const D = window.MockData;
    if (!D) return;
    if (D.isCombatLive?.()) {
      D.tickCombatNoise?.();
      D.tickSeries?.();
    }
    notify();
  }

  function ensureTimer() {
    if (timer || listeners.size === 0) return;
    timer = setInterval(pump, INTERVAL_MS);
  }

  function stopTimer() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  }

  function subscribe(fn) {
    listeners.add(fn);
    ensureTimer();
    return () => unsubscribe(fn);
  }

  function unsubscribe(fn) {
    listeners.delete(fn);
    if (listeners.size === 0) stopTimer();
  }

  function generation() {
    return gen;
  }

  return { subscribe, unsubscribe, generation, INTERVAL_MS };
})();
