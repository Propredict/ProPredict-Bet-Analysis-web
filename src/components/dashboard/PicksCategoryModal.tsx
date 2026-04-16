import { useNavigate } from "react-router-dom";
import { Sparkles, Star, Crown, Diamond, Target, ChevronRight, Flame } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categories = [
  { label: "Daily Tips", desc: "Free predictions", icon: Sparkles, bg: "bg-primary", path: "/daily-tips" },
  { label: "Pro Tips", desc: "Higher confidence", icon: Star, bg: "bg-amber-500", path: "/exclusive-tips" },
  { label: "Premium Tips", desc: "Members only", icon: Crown, bg: "bg-fuchsia-500", path: "/premium-tips" },
  { label: "Diamond Pick", desc: "Top premium pick", icon: Diamond, bg: "bg-purple-500", path: "/diamond-pick" },
  { label: "Risk of the Day", desc: "High odds pick", icon: Target, bg: "bg-red-500", path: "/risk-of-the-day" },
];

export function PicksCategoryModal({ open, onOpenChange }: Props) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-6 rounded-2xl border-0 bg-white dark:bg-card">
        {/* Header */}
        <div className="flex flex-col items-center gap-1 pb-2">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-1">
            <Flame className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-lg font-extrabold text-foreground">Today's Picks Are Ready 🔥</h2>
          <p className="text-sm text-primary font-medium">Choose what you want to unlock today</p>
        </div>

        {/* Options */}
        <div className="space-y-2.5 pt-1">
          {categories.map((cat) => (
            <button
              key={cat.path}
              onClick={() => { onOpenChange(false); navigate(cat.path); }}
              className={`flex items-center gap-3 w-full p-3.5 rounded-xl ${cat.bg} text-white hover:opacity-90 transition-opacity shadow-md`}
            >
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <cat.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <span className="text-sm font-bold block">{cat.label}</span>
                <span className="text-xs opacity-80">{cat.desc}</span>
              </div>
              <ChevronRight className="h-5 w-5 opacity-60 shrink-0" />
            </button>
          ))}
        </div>

        {/* Bottom CTA */}
        <button
          onClick={() => onOpenChange(false)}
          className="w-full text-center text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors pt-3"
        >
          Continue → Dashboard
        </button>
      </DialogContent>
    </Dialog>
  );
}
