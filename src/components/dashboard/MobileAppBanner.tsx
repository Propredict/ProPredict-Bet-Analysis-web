import { Card } from "@/components/ui/card";

export function MobileAppBanner() {
  return (
    <Card className="p-3 sm:p-4 bg-gradient-to-b from-card to-muted/30 border-border text-center">
      <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-1">Get ProPredict on Mobile</h3>
      <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-2 sm:mb-3">Download our app for the best experience</p>
      
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        <a 
          href="#" 
          className="flex items-center gap-1.5 bg-foreground text-background px-2 sm:px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
        >
          <svg className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/>
          </svg>
          <div className="text-left">
            <div className="text-[8px] uppercase">Get it on</div>
            <div className="text-[10px] sm:text-xs font-semibold">Google Play</div>
          </div>
        </a>
        
        <a 
          href="#" 
          className="flex items-center gap-1.5 border border-foreground px-2 sm:px-3 py-1.5 rounded-lg hover:bg-foreground/5 transition-colors"
        >
          <svg className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
          <div className="text-left">
            <div className="text-[8px] uppercase">Download on the</div>
            <div className="text-[10px] sm:text-xs font-semibold">App Store</div>
          </div>
        </a>
      </div>
    </Card>
  );
}
