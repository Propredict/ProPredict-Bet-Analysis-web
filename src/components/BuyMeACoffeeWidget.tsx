import { useEffect } from "react";

/**
 * Buy Me a Coffee floating widget (dashboard only).
 * Injects the official BMC widget script on mount and cleans it up on unmount.
 * NOTE: BMC reads underscore attribute names (data-x_margin), so we use
 * setAttribute with the exact names rather than dataset properties.
 */
export function BuyMeACoffeeWidget() {
  useEffect(() => {
    const script = document.createElement("script");
    script.setAttribute("data-name", "BMC-Widget");
    script.setAttribute("data-cfasync", "false");
    script.async = true;
    script.src = "https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js";
    script.setAttribute("data-id", "propredict");
    script.setAttribute("data-description", "Support me on Buy me a coffee!");
    script.setAttribute(
      "data-message",
      "Support ProPredict with a coffee! ☕💙 / Podrži ProPredict kafom! ⚽💙",
    );
    script.setAttribute("data-color", "#5F7FFF");
    script.setAttribute("data-position", "Right");
    script.setAttribute("data-x_margin", "18");
    script.setAttribute("data-y_margin", "18");
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
