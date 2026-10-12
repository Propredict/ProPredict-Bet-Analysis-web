import { useEffect } from "react";

/**
 * Buy Me a Coffee floating widget (dashboard only).
 * Injects the official BMC widget script on mount and cleans it up on unmount.
 */
export function BuyMeACoffeeWidget() {
  useEffect(() => {
    const script = document.createElement("script");
    script.dataset.name = "BMC-Widget";
    script.setAttribute("data-cfasync", "false");
    script.async = true;
    script.src = "https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js";
    script.dataset.id = "propredict";
    script.dataset.description = "Support me on Buy me a coffee!";
    script.dataset.message =
      "Support ProPredict with a coffee! ☕💙 / Podrži ProPredict kafom! ⚽💙";
    script.dataset.color = "#5F7FFF";
    script.dataset.position = "Right";
    script.dataset.xMargin = "18";
    script.dataset.yMargin = "18";
    document.body.appendChild(script);

    // The BMC widget registers a DOMContentLoaded listener on load. In an SPA
    // that event has already fired, so re-dispatch it once the script loads.
    script.onload = () => {
      if (document.readyState !== "loading") {
        window.dispatchEvent(new Event("DOMContentLoaded"));
      }
    };

    return () => {
      script.remove();
      // Remove any leftover BMC widget nodes from the SPA DOM
      document.getElementById("bmc-wbtn")?.remove();
      document.querySelectorAll("[class*='bmc-btn'], [class*='BMC']").forEach((el) => el.remove());
    };
  }, []);

  return null;
}

export default BuyMeACoffeeWidget;
