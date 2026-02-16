import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Fallback deep-link handler for Android push notifications.
 *
 * When the Kotlin WebView bridge dispatches pushState + popstate,
 * BrowserRouter picks up the new URL. This component acts as a
 * safety net: it also listens for a custom "android-navigate" event
 * so we can guarantee React Router processes the navigation even
 * on cold starts where popstate might fire before Router mounts.
 */
export function DeepLinkHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const processed = useRef(false);

  // 1️⃣ On initial mount — if URL already has deep-link params
  //    (e.g. Kotlin set the URL before React mounted), force-navigate
  //    so React Router processes it cleanly.
  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const { pathname, search } = window.location;
    const params = new URLSearchParams(search);

    const hasDeepLink =
      params.has("match") ||
      params.has("highlight") ||
      params.has("from") ||
      params.has("plan_required") ||
      params.has("result");

    if (hasDeepLink && pathname !== "/") {
      // React Router may already be on this path, but re-navigate
      // to ensure the target page's useEffect picks up the params
      console.log("[DeepLink] Initial mount deep-link detected:", pathname + search);
      navigate(pathname + search, { replace: true });
    }
  }, [navigate]);

  // 2️⃣ Listen for custom event from Android Kotlin bridge
  //    (alternative to pushState+popstate for maximum reliability)
  useEffect(() => {
    const handler = (e: Event) => {
      const path = (e as CustomEvent).detail?.path;
      if (path && typeof path === "string") {
        console.log("[DeepLink] android-navigate event:", path);
        navigate(path, { replace: true });
      }
    };

    window.addEventListener("android-navigate", handler);
    return () => window.removeEventListener("android-navigate", handler);
  }, [navigate]);

  // 3️⃣ Fallback: listen for popstate to catch Kotlin pushState calls
  //    that might fire after React mounts but before BrowserRouter updates
  useEffect(() => {
    const handler = () => {
      const newPath = window.location.pathname + window.location.search;
      const current = location.pathname + location.search;

      if (newPath !== current) {
        console.log("[DeepLink] popstate fallback:", newPath);
        navigate(newPath, { replace: true });
      }
    };

    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [navigate, location]);

  return null;
}
