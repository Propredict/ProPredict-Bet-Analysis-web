import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { Footer } from "@/components/Footer";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { 
  SidebarProvider, 
  SidebarInset, 
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col min-h-screen">
          {/* Mobile Header with Hamburger Menu */}
          <header className="flex items-center gap-2 px-3 py-2 border-b border-border md:hidden bg-background/95 backdrop-blur-sm sticky top-0 z-40">
            <SidebarTrigger className="h-8 w-8 p-0 flex items-center justify-center">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <div className="flex items-center gap-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
                P
              </div>
              <span className="text-sm font-semibold">ProPredict</span>
            </div>
          </header>

          {/* Main Content - flex-1 ensures it grows, pushing footer down */}
          <main className="flex-1 pb-16 md:pb-0">
            <div className="page-content">
              <Outlet />
            </div>
          </main>

          {/* Footer - Always visible on desktop, hidden on mobile (bottom nav replaces it) */}
          <footer className="hidden md:block mt-auto">
            <Footer />
          </footer>

          {/* Mobile Bottom Navigation - Fixed at bottom */}
          <MobileBottomNav />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
