import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

export function AndroidPushModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const isAndroid = typeof window !== "undefined" && window.Android !== undefined;
    if (!isAndroid) return;

    const alreadyShown = localStorage.getItem("push_prompt_shown") === "true";
    if (alreadyShown) return;

    // Small delay so the app loads first
    const timer = setTimeout(() => setOpen(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleEnable = () => {
    window.Android?.requestPushPermission?.();
    localStorage.setItem("push_prompt_shown", "true");
    setOpen(false);
  };

  const handleLater = () => {
    localStorage.setItem("push_prompt_shown", "true");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleLater(); }}>
      <DialogContent className="sm:max-w-[380px] gap-5">
        <DialogHeader className="items-center text-center gap-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Bell className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-lg">Enable Goal Alerts & New AI Picks</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Get instant goal alerts and high-probability AI predictions directly on your phone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2.5 pt-1">
          <Button onClick={handleEnable} className="w-full">
            Enable Notifications
          </Button>
          <Button variant="ghost" onClick={handleLater} className="w-full text-muted-foreground">
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
