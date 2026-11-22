import { useLayoutEffect } from "react";

const STARTUP_SPLASH_MINIMUM_MS = 2000;

export function useStartupReveal(ready: boolean) {
  useLayoutEffect(() => {
    if (!ready) return;
    const splash = document.getElementById("startup-splash");
    if (!splash || splash.hasAttribute("data-leaving")) return;

    const reveal = () => {
      if (!splash.isConnected || splash.hasAttribute("data-leaving")) return;
      splash.setAttribute("data-leaving", "");
      const finish = () => {
        splash.remove();
        document.getElementById("root")?.removeAttribute("inert");
      };
      const fade = splash.getAnimations?.()[0];
      if (fade) void fade.finished.then(finish, finish);
      else finish();
    };
    const readyAt = performance.now();
    let timer: number | undefined;
    const waitForMinimum = () => {
      // A fast auth result can precede the browser's first paint entry.
      const shownAt =
        performance.getEntriesByName("first-contentful-paint", "paint")[0]
          ?.startTime ??
        performance.getEntriesByName("startup-splash-frame", "mark")[0]
          ?.startTime ??
        readyAt;
      const remaining = shownAt + STARTUP_SPLASH_MINIMUM_MS - performance.now();
      if (remaining > 0)
        timer = window.setTimeout(waitForMinimum, Math.ceil(remaining));
      else reveal();
    };
    waitForMinimum();
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [ready]);
}
