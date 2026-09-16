import { Link } from "react-router-dom";
import { ArrowRight, Crown, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export const PREMIUM_LOCK_TEXT = {
  badge: "Premium",
  title: "Premium pick locked",
  subtitle: "Unlock all Premium picks, Diamond & Risk of the Day.",
  cta: "Go Premium",
};

/** Small inline lock chip — used inside lists/rows. */
export function PremiumLockBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md border border-primary/45 bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary",
        className,
      )}
    >
      <Lock className="h-3 w-3" /> {PREMIUM_LOCK_TEXT.badge}
    </span>
  );
}

/** Full lock block with the single shared Go Premium action. */
export function PremiumLockCard({
  className,
  title = PREMIUM_LOCK_TEXT.title,
  subtitle = PREMIUM_LOCK_TEXT.subtitle,
}: {
  className?: string;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border-2 border-primary/35 bg-secondary/50 p-4 text-center",
        className,
      )}
    >
      <Crown className="mx-auto h-6 w-6 text-yellow-400" />
      <p className="mt-2 text-sm font-black text-sidebar">{title}</p>
      <p className="mt-1 text-xs font-medium text-muted-foreground">{subtitle}</p>
      <Link
        to="/get-premium"
        className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-black text-primary-foreground shadow-md transition-colors hover:bg-primary/90"
      >
        {PREMIUM_LOCK_TEXT.cta} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

export default PremiumLockCard;
