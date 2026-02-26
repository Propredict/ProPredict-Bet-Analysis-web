import { useState, useEffect, forwardRef } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const ScrollToTopButton = forwardRef<HTMLButtonElement>((_, ref) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button when scrolled past 300px
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <Button
      ref={ref}
      onClick={scrollToTop}
      size="icon"
      className={cn(
        "fixed right-4 z-40 h-10 w-10 rounded-full bg-primary shadow-lg transition-all duration-300 hover:bg-primary/90 hover:scale-110",
        // Position above mobile bottom nav on small screens
        "bottom-20 md:bottom-6",
        // Visibility transitions
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none"
      )}
      aria-label="Scroll to top"
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  );
});

ScrollToTopButton.displayName = "ScrollToTopButton";
