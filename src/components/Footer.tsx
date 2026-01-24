import { Link } from "react-router-dom";
import { Shield, FileText, ScrollText, Trash2 } from "lucide-react";

export function Footer() {
  const legalLinks = [
    { label: "Disclaimer", path: "/disclaimer", icon: Shield },
    { label: "Privacy Policy", path: "/privacy-policy", icon: FileText },
    { label: "Terms of Service", path: "/terms-of-service", icon: ScrollText },
    { label: "Data Deletion", path: "/data-deletion", icon: Trash2 },
  ];

  return (
    <footer className="border-t border-border bg-card/50 mt-auto">
      <div className="max-w-[1200px] mx-auto px-2 sm:px-4 py-3 sm:py-4">
        {/* Legal Links */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-2">
          {legalLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="flex items-center gap-1 text-[9px] sm:text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <link.icon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              <span>{link.label}</span>
            </Link>
          ))}
        </div>

        {/* Disclaimer & Copyright */}
        <div className="text-center space-y-1">
          <p className="text-[8px] sm:text-[9px] text-destructive/80">
            For entertainment purposes only. Gambling involves risk.
          </p>
          <p className="text-[8px] sm:text-[9px] text-muted-foreground">
            © {new Date().getFullYear()} All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
