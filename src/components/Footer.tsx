import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Shield, FileText, ScrollText, Trash2, Mail, Globe, Cookie, Info, Brain } from "lucide-react";
import { usePlatform } from "@/hooks/usePlatform";

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
    <footer ref={ref} className="border-t border-border bg-gradient-to-b from-card/50 to-background mt-auto">
      <div className="max-w-[1200px] mx-auto px-4 py-4 sm:py-5">
        {/* Social Links */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-3">
          <a
            href="https://t.me/propredictxx"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Join us on Telegram"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#229ED9]/15 hover:bg-[#229ED9]/25 border border-[#229ED9]/40 text-[#5DC5F0] text-[10px] sm:text-xs font-semibold transition-all hover:scale-105"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
              <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
            </svg>
            <span>Join on Telegram</span>
          </a>
          <a
            href="https://www.facebook.com/profile.php?id=61586935684859"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Join us on Facebook"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1877F2]/15 hover:bg-[#1877F2]/25 border border-[#1877F2]/40 text-[#5B9BFF] text-[10px] sm:text-xs font-semibold transition-all hover:scale-105"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span>Follow on Facebook</span>
          </a>
          <a
            href="https://www.instagram.com/propredictt/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow us on Instagram"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#F58529]/15 via-[#DD2A7B]/15 to-[#8134AF]/15 hover:from-[#F58529]/25 hover:via-[#DD2A7B]/25 hover:to-[#8134AF]/25 border border-[#DD2A7B]/40 text-[#FF6FA8] text-[10px] sm:text-xs font-semibold transition-all hover:scale-105"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
            <span>Follow on Instagram</span>
          </a>
          <a
            href="https://www.tiktok.com/@soccerhubpro"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow us on TikTok"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/30 text-white text-[10px] sm:text-xs font-semibold transition-all hover:scale-105"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005.8 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.84-.1z"/>
            </svg>
            <span>Follow on TikTok</span>
          </a>
        </div>

        {/* Google Play - small square button (right aligned) - Hidden on Android */}
        {!isAndroidApp && (
          <div className="flex justify-end mb-2">
            <div className="flex flex-col items-center gap-1">
              <a
                href="https://play.google.com/store/apps/details?id=com.propredict.app"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Get it on Google Play"
                title="Get it on Google Play"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-foreground/95 text-background hover:bg-foreground transition-colors shadow-sm"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
                </svg>
              </a>
              <span className="text-[8px] text-muted-foreground">Get Google Play App</span>
            </div>
          </div>
        )}

        {/* Legal Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mb-3">
          {legalLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="flex items-center gap-1 text-[9px] sm:text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <link.icon className="h-2.5 w-2.5 sm:h-3 sm:w-3 opacity-70" />
              <span>{link.label}</span>
            </Link>
          ))}
        </div>

        {/* Contact & Website */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-3">
          <a
            href="https://propredict.me"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[9px] sm:text-[10px] text-primary hover:text-primary/80 transition-colors"
          >
            <Globe className="h-3 w-3" />
            <span>propredict.me</span>
          </a>
          <a
            href="mailto:propredictsupp@gmail.com"
            className="flex items-center gap-1 text-[9px] sm:text-[10px] text-primary hover:text-primary/80 transition-colors"
          >
            <Mail className="h-3 w-3" />
            <span>propredictsupp@gmail.com</span>
          </a>
        </div>

        {/* Ads Disclosure - Web only */}
        {!isAndroidApp && (
          <p className="text-center text-[8px] sm:text-[9px] text-muted-foreground mb-2">
            <span className="font-medium">Ads Disclosure:</span> ProPredict may display advertisements on the website through third-party advertising partners. Ads help support the operation of the platform. Learn more in our{" "}
            <Link to="/privacy-policy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        )}

        {/* Copyright */}
        <div className="text-center space-y-0.5 pt-2 border-t border-border/30">
          <p className="text-[8px] sm:text-[9px] text-accent">
            Disclaimer: ProPredict does not provide gambling services. All AI-generated predictions are for informational and entertainment purposes only.
          </p>
          <p className="text-[8px] sm:text-[9px] text-muted-foreground">
            © {new Date().getFullYear()} ProPredict. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";
