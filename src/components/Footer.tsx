import { Link } from "react-router-dom";
import { Shield, FileText, ScrollText, Trash2, Mail, Globe, Cookie, Info, Smartphone } from "lucide-react";

export function Footer() {
  const legalLinks = [
    { label: "About Us", path: "/about-us", icon: Info },
    { label: "Disclaimer", path: "/disclaimer", icon: Shield },
    { label: "Privacy Policy", path: "/privacy-policy", icon: FileText },
    { label: "Cookie Policy", path: "/cookie-policy", icon: Cookie },
    { label: "Terms of Service", path: "/terms-of-service", icon: ScrollText },
    { label: "Data Deletion", path: "/data-deletion", icon: Trash2 },
  ];

  return (
    <footer className="border-t border-border bg-gradient-to-b from-card/50 to-background mt-auto">
      <div className="max-w-[1200px] mx-auto px-4 py-4 sm:py-5">
        
        {/* Mobile App Banner - Integrated */}
        <div className="mb-4 p-3 sm:p-4 rounded-lg bg-gradient-to-r from-primary/10 via-card to-accent/10 border border-border/50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/20">
                <Smartphone className="h-4 w-4 text-primary" />
              </div>
              <div className="text-center sm:text-left">
                <h3 className="text-xs sm:text-sm font-semibold text-foreground">Get ProPredict on Mobile</h3>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground">Download for the best experience</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <a 
                href="#" 
                className="flex items-center gap-1.5 bg-foreground text-background px-2.5 sm:px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity shadow-sm"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/>
                </svg>
                <div className="text-left">
                  <div className="text-[7px] uppercase opacity-80">Get it on</div>
                  <div className="text-[9px] sm:text-[10px] font-semibold leading-tight">Google Play</div>
                </div>
              </a>
              
              <a 
                href="#" 
                className="flex items-center gap-1.5 border border-foreground/30 bg-card px-2.5 sm:px-3 py-1.5 rounded-lg hover:bg-foreground/5 transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div className="text-left">
                  <div className="text-[7px] uppercase opacity-60">Download on the</div>
                  <div className="text-[9px] sm:text-[10px] font-semibold leading-tight">App Store</div>
                </div>
              </a>
            </div>
          </div>
        </div>

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

        {/* Copyright */}
        <div className="text-center space-y-0.5 pt-2 border-t border-border/30">
          <p className="text-[8px] sm:text-[9px] text-accent">
            For entertainment purposes only. Gambling involves risk.
          </p>
          <p className="text-[8px] sm:text-[9px] text-muted-foreground">
            © {new Date().getFullYear()} ProPredict. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
