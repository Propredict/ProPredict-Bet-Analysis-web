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
        <SidebarInset className="flex-1 flex flex-col">
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

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto pb-14 md:pb-0">
            <div className="page-content">
              <Outlet />
            </div>
          </main>

          {/* Footer - Hidden on mobile due to bottom nav */}
          <div className="hidden md:block">
            <Footer />
          </div>

          {/* Mobile Bottom Navigation */}
          <MobileBottomNav />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
