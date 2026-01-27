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
        
        {/* Google Play Button - Clean & Minimal */}
        <div className="flex justify-center mb-3">
          <a 
            href="#" 
            className="inline-flex items-center gap-2 bg-foreground/95 text-background px-4 py-2 rounded-lg hover:bg-foreground transition-colors shadow-sm"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/>
            </svg>
            <span className="text-sm font-medium">Get it on Google Play</span>
          </a>
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
