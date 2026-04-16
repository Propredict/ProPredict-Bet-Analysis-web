import { useNavigate } from "react-router-dom";
import { Sparkles, Star, Crown, Diamond, Target } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categories = [
  { label: "Daily Picks", icon: Sparkles, color: "text-primary", path: "/daily-analysis" },
  { label: "Pro Picks", icon: Star, color: "text-amber-400", path: "/pro-analysis" },
  { label: "Premium Picks", icon: Crown, color: "text-fuchsia-400", path: "/premium-analysis" },
  { label: "💎 Diamond Pick", icon: Diamond, color: "text-purple-400", path: "/diamond-pick" },
  { label: "🎯 Risk of the Day", icon: Target, color: "text-red-400", path: "/risk-of-the-day" },
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
            <button
              key={cat.path}
              onClick={() => { onOpenChange(false); navigate(cat.path); }}
              className="flex items-center gap-3 w-full p-3 rounded-xl bg-secondary/50 hover:bg-secondary/80 transition-colors"
            >
              <cat.icon className={`h-5 w-5 ${cat.color}`} />
              <span className="text-sm font-semibold text-foreground">{cat.label}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
