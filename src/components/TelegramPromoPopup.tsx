import { useEffect, useState } from "react";
import { Send, X, Check } from "lucide-react";
import { getIsAndroidApp } from "@/hooks/usePlatform";
import { canShowPopup, markPopupShown, msUntilNextPopup } from "@/lib/popupCooldown";

const STORAGE_KEY = "propredict:telegram_popup_shown_date";
const CLICK_COUNT_KEY = "propredict:telegram_popup_click_count";
const CLICK_LAST_KEY = "propredict:telegram_popup_last_click_at";
const TELEGRAM_URL = "https://t.me/propredictxx";

function logTelegramClick() {
  try {
    const next = (parseInt(localStorage.getItem(CLICK_COUNT_KEY) || "0", 10) || 0) + 1;
    localStorage.setItem(CLICK_COUNT_KEY, String(next));
    localStorage.setItem(CLICK_LAST_KEY, new Date().toISOString());
  } catch { /* ignore */ }

  // Forward to any analytics pipelines present on the page.
  try {
    const w = window as unknown as {
      gtag?: (...args: unknown[]) => void;
      dataLayer?: unknown[];
      fbq?: (...args: unknown[]) => void;
    };
    w.gtag?.("event", "telegram_popup_click", {
      event_category: "engagement",
      event_label: "free_premium_tips_popup",
    });
    w.dataLayer?.push({ event: "telegram_popup_click", source: "free_premium_tips_popup" });
    w.fbq?.("trackCustom", "TelegramPopupClick");
  } catch { /* ignore */ }

  // eslint-disable-next-line no-console
  console.info("[telegram-popup] join clicked", { url: TELEGRAM_URL });
}

function wasShownToday(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === new Date().toDateString();
  } catch {
    return false;
  }
}

function markShownToday() {
  try {
    localStorage.setItem(STORAGE_KEY, new Date().toDateString());
  } catch {
    /* ignore */
  }
}

export function TelegramPromoPopup() {
  const [open, setOpen] = useState(false);
  const isAndroid = getIsAndroidApp();

  useEffect(() => {
    if (isAndroid) return; // web only
    if (wasShownToday()) return;

    let timer: ReturnType<typeof setTimeout>;
    const schedule = (delay: number) => {
      timer = setTimeout(() => {
        if (!canShowPopup(45_000)) {
          schedule(Math.max(5_000, msUntilNextPopup(45_000) + 1_000));
          return;
        }
        setOpen(true);
        markPopupShown();
        markShownToday();
      }, delay);
    };

    // Show ~45s after page load, after the earlier popups have had their moment.
    schedule(45_000);
    return () => clearTimeout(timer);
  }, [isAndroid]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden animate-scale-in"
        style={{
          background: "linear-gradient(160deg, #1c92d2 0%, #0c5d9e 55%, #062f4e 100%)",
          boxShadow: "0 30px 60px -15px rgba(12,93,158,0.55), 0 0 0 1px rgba(255,255,255,0.08)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute top-3 right-3 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
        >
          <X className="h-4 w-4 text-white" />
        </button>

        {/* Specular highlight */}
        <div className="pointer-events-none absolute -top-16 -left-10 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-10 w-64 h-64 rounded-full bg-cyan-300/20 blur-3xl" />

        <div className="relative p-6 text-center text-white">
          <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-white/15 backdrop-blur flex items-center justify-center shadow-inner">
            <Send className="h-10 w-10 text-white" strokeWidth={2.2} />
          </div>

          <h3 className="text-2xl font-black tracking-tight leading-tight">
            FREE PREMIUM TIPS
          </h3>
          <p className="mt-1 text-sm font-medium text-white/85">
            Join our Telegram channel — exclusive picks every day
          </p>

          <ul className="mt-5 space-y-2 text-left text-sm">
            {["Daily premium picks", "Early access to value bets", "100% free — no signup"].map((t) => (
              <li key={t} className="flex items-center gap-2 text-white/95">
                <Check className="h-4 w-4 text-emerald-300 shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>

          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              logTelegramClick();
              setOpen(false);
            }}
            className="mt-6 flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-white text-[#0c5d9e] font-extrabold text-base hover:bg-white/95 transition-all shadow-lg hover:scale-[1.02] active:scale-[0.99]"
          >
            <Send className="h-4 w-4" />
            JOIN NOW
          </a>

          <button
            onClick={() => setOpen(false)}
            className="mt-3 text-xs text-white/70 hover:text-white transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}