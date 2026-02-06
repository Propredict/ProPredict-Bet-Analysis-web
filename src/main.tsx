import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

import { getIsAndroidApp } from "@/hooks/usePlatform";

// Suppress PWA install prompt on web only (not Android app)
if (!getIsAndroidApp()) {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
  });
}

createRoot(document.getElementById("root")!).render(
  <App />,
);
