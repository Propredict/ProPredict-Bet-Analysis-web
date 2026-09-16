import { useNavigate } from "react-router-dom";
import { Sparkles, Ticket, Crown, Diamond, Target } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categories = [
  { label: "Daily Picks", icon: Sparkles, color: "text-primary", path: "/daily-tips" },
  { label: "Sure Odds 2+ Ticket", icon: Ticket, color: "text-primary", path: "/exclusive-tickets" },
  { label: "Premium Picks", icon: Crown, color: "text-primary", path: "/premium-tips" },
  { label: "💎 Diamond Pick", icon: Diamond, color: "text-primary", path: "/diamond-pick" },
  { label: "🎯 Risk of the Day", icon: Target, color: "text-primary", path: "/risk-of-the-day" },
];

export function PicksCategoryModal({ open, onOpenChange }: Props) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-base">Choose Category</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          {categories.map((cat) => (
            <Button
              variant="ghost"
              key={cat.path}
              onClick={() => { onOpenChange(false); navigate(cat.path); }}
              className="flex h-auto w-full items-center justify-start gap-3 rounded-xl border border-primary/10 bg-secondary/60 p-3 text-foreground hover:bg-primary/10 hover:text-foreground"
            >
              <cat.icon className={`h-5 w-5 ${cat.color}`} />
              <span className="text-sm font-semibold text-foreground">{cat.label}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
