import { forwardRef } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  FileText,
  ScrollText,
  Trash2,
  Mail,
  Globe,
  Cookie,
  Info,
  Brain,
  Gift,
  Zap,
  Users,
  Star,
  ChevronRight,
} from "lucide-react";
import { usePlatform } from "@/hooks/usePlatform";
import melbetCard from "@/assets/footer-melbet.jpg";
import oneXbetCard from "@/assets/footer-1xbet.jpg";

const MELBET_URL =
  "https://refpa3665.com/L?tag=d_5761363m_45415c_&site=5761363&ad=45415&r=Registration";
const ONEXBET_URL = "https://propredict.s.gy/1xbet-register";
const TELEGRAM_URL = "https://t.me/propredictxx";

const openExternal = (url: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
  const w = window as unknown as { Android?: { openExternal?: (url: string) => void } };
  if (w.Android?.openExternal) {
    e.preventDefault();
    w.Android.openExternal(url);
  }
};

export const Footer = forwardRef<HTMLElement>((_, ref) => {
  const { isAndroidApp } = usePlatform();

  const legalLinks = [
    { label: "About Us", path: "/about-us", icon: Info },
    { label: "How AI Works", path: "/how-ai-works", icon: Brain },
    { label: "Disclaimer", path: "/disclaimer", icon: Shield },
    { label: "Privacy Policy", path: "/privacy-policy", icon: FileText },
    { label: "Cookie Policy", path: "/cookie-policy", icon: Cookie },
    { label: "Terms of Service", path: "/terms-of-service", icon: ScrollText },
    { label: "Data Deletion", path: "/data-deletion", icon: Trash2 },
  ];

  return (
    <footer ref={ref} className="mt-auto border-t border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="mx-auto w-full max-w-[1400px] px-3 py-6 sm:px-6 sm:py-8">
        {/* Telegram hero banner */}
        <a
          href={TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={openExternal(TELEGRAM_URL)}
          aria-label="FREE PREMIUM TIPS — Join us on Telegram"
          className="group relative block overflow-hidden rounded-2xl border border-[#1E5AA8]/60 bg-gradient-to-r from-[#0A2A5E] via-[#0D3B8C] to-[#0A2A5E] shadow-xl shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-2xl"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent" />
          <div className="absolute -top-16 right-10 h-40 w-40 rounded-full bg-[#2AABEE]/20 blur-3xl" />
          <div className="relative flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#229ED9] shadow-lg shadow-[#229ED9]/50 transition-transform duration-300 group-hover:scale-110 sm:h-16 sm:w-16">
                <svg viewBox="0 0 24 24" className="h-7 w-7 text-white sm:h-8 sm:w-8" fill="currentColor" aria-hidden="true">
                  <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-xl font-black uppercase leading-none tracking-tight text-white sm:text-3xl">
                  Free <span className="text-[#4FC3F7]">Premium Tips</span>
                </p>
                <p className="mt-1.5 text-[11px] font-semibold text-white/85 sm:text-sm">
                  Join us on Telegram — exclusive tips &amp; bonuses / Pridruži se na Telegramu — ekskluzivni tipovi i bonusi
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#9FD8F5] sm:text-xs">
                    <Gift className="h-3 w-3" /> Daily Picks
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#9FD8F5] sm:text-xs">
                    <Zap className="h-3 w-3" /> VIP Insights
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#9FD8F5] sm:text-xs">
                    <Star className="h-3 w-3" /> Exclusive Bonuses
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#9FD8F5] sm:text-xs">
                    <Users className="h-3 w-3" /> 1000+ Members
                  </span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#229ED9] px-5 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-[#229ED9]/40 transition-all group-hover:bg-[#2AABEE] sm:text-sm">
                Join Now / Pridruži se
                <ChevronRight className="h-4 w-4" />
              </span>
              <span className="hidden text-[10px] font-black uppercase italic tracking-widest text-white/50 sm:block">
                Win Together!
              </span>
            </div>
          </div>
        </a>

        {/* Affiliate cards — Melbet & 1xBet */}
        {!isAndroidApp && (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Melbet */}
            <a
              href={MELBET_URL}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={openExternal(MELBET_URL)}
              aria-label="Melbet exclusive bonus — Play now (sponsored)"
              className="group relative block overflow-hidden rounded-2xl border border-[#C9A227]/50 shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-[#C9A227]/25"
            >
              <img
                src={melbetCard}
                alt="Melbet — Exclusive Bonus, welcome offer for new players"
                className="block h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transform-none"
                loading="lazy"
                width={1408}
                height={576}
              />
              <span className="absolute right-2 top-2 z-10 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/85 backdrop-blur">
                Sponsored
              </span>
              <span className="absolute bottom-1.5 right-2 z-10 text-[9px] font-semibold text-white/80">
                18+ · Play responsibly
              </span>
            </a>

            {/* 1xBet */}
            <a
              href={ONEXBET_URL}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={openExternal(ONEXBET_URL)}
              aria-label="1xBet exclusive bonus — Play now (sponsored)"
              className="group relative block overflow-hidden rounded-2xl border border-[#2AABEE]/50 shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-[#2AABEE]/25"
            >
              <img
                src={oneXbetCard}
                alt="1xBet — Exclusive Bonus, welcome offer for new players"
                className="block h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transform-none"
                loading="lazy"
                width={1408}
                height={576}
              />
              <span className="absolute right-2 top-2 z-10 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/85 backdrop-blur">
                Sponsored
              </span>
              <span className="absolute bottom-1.5 right-2 z-10 text-[9px] font-semibold text-white/80">
                18+ · Play responsibly
              </span>
            </a>
          </div>
        )}

        {/* Follow us divider */}
        <div className="mt-7 flex items-center gap-4">
          <span className="h-px flex-1 bg-white/25" />
          <p className="text-sm font-black uppercase tracking-widest text-white sm:text-base">
            Follow us for daily picks &amp; updates
          </p>
          <span className="h-px flex-1 bg-white/25" />
        </div>

        {/* Social Links */}
        <div className="mt-4 mb-5 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={openExternal(TELEGRAM_URL)}
            aria-label="Join us on Telegram"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#229ED9] px-4 py-2 text-[10px] font-bold text-white shadow-md shadow-[#229ED9]/30 transition-all hover:scale-105 hover:brightness-110 sm:text-xs"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
              <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
            </svg>
            <span>Join on Telegram</span>
          </a>
          <a
            href="https://www.facebook.com/profile.php?id=61586935684859"
            target="_blank"
            rel="noopener noreferrer"
            onClick={openExternal("https://www.facebook.com/profile.php?id=61586935684859")}
            aria-label="Join us on Facebook"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#1877F2] px-4 py-2 text-[10px] font-bold text-white shadow-md shadow-[#1877F2]/30 transition-all hover:scale-105 hover:brightness-110 sm:text-xs"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            <span>Follow on Facebook</span>
          </a>
          <a
            href="https://www.instagram.com/propredictt/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={openExternal("https://www.instagram.com/propredictt/")}
            aria-label="Follow us on Instagram"
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] px-4 py-2 text-[10px] font-bold text-white shadow-md shadow-[#DD2A7B]/30 transition-all hover:scale-105 hover:brightness-110 sm:text-xs"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
            <span>Follow on Instagram</span>
          </a>
          <a
            href="https://www.tiktok.com/@soccerhubpro"
            target="_blank"
            rel="noopener noreferrer"
            onClick={openExternal("https://www.tiktok.com/@soccerhubpro")}
            aria-label="Follow us on TikTok"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-[10px] font-bold text-white transition-all hover:scale-105 hover:bg-white/15 sm:text-xs"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005.8 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.84-.1z" />
            </svg>
            <span>Follow on TikTok</span>
          </a>
          {!isAndroidApp && (
            <a
              href="https://play.google.com/store/apps/details?id=com.propredict.app"
              target="_blank"
              rel="noopener noreferrer"
              onClick={openExternal("https://play.google.com/store/apps/details?id=com.propredict.app")}
              aria-label="Get it on Google Play"
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground/95 px-4 py-2 text-[10px] font-bold text-background transition-all hover:scale-105 hover:bg-foreground sm:text-xs"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
              </svg>
              <span>Get it on Google Play</span>
            </a>
          )}
        </div>

        {/* Legal Links */}
        <div className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
          {legalLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="flex items-center gap-1 text-[9px] text-muted-foreground transition-colors hover:text-foreground sm:text-[10px]"
            >
              <link.icon className="h-2.5 w-2.5 opacity-70 sm:h-3 sm:w-3" />
              <span>{link.label}</span>
            </Link>
          ))}
        </div>

        {/* Contact & Website */}
        <div className="mb-3 flex flex-wrap items-center justify-center gap-4">
          <a
            href="https://propredict.me"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[9px] text-primary transition-colors hover:text-primary/80 sm:text-[10px]"
          >
            <Globe className="h-3 w-3" />
            <span>propredict.me</span>
          </a>
          <a
            href="mailto:propredictsupp@gmail.com"
            className="flex items-center gap-1 text-[9px] text-primary transition-colors hover:text-primary/80 sm:text-[10px]"
          >
            <Mail className="h-3 w-3" />
            <span>propredictsupp@gmail.com</span>
          </a>
        </div>

        {/* Ads Disclosure - Web only */}
        {!isAndroidApp && (
          <p className="mb-2 text-center text-[8px] text-muted-foreground sm:text-[9px]">
            <span className="font-medium">Ads Disclosure:</span> ProPredict may display advertisements on the website through third-party advertising partners. Ads help support the operation of the platform. Learn more in our{" "}
            <Link to="/privacy-policy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        )}

        {/* Copyright */}
        <div className="space-y-0.5 border-t border-border/30 pt-2 text-center">
          <p className="text-[8px] text-accent sm:text-[9px]">
            Disclaimer: ProPredict does not provide gambling services. All AI-generated predictions are for informational and entertainment purposes only.
          </p>
          <p className="text-[8px] text-muted-foreground sm:text-[9px]">
            © {new Date().getFullYear()} ProPredict. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";
