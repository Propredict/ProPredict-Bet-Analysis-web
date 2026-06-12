import { useEffect, useState } from "react";
import { MessageCircle, Smartphone, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { MatchCommentsSheet } from "./MatchCommentsSheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getIsAndroidApp } from "@/hooks/usePlatform";

interface Props {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  matchLabel?: string;
  className?: string;
  /** "icon" (default) = compact square; "pill" = wider pill with label */
  variant?: "icon" | "pill";
  /** When provided, button becomes controlled and parent renders inline comments below. */
  expanded?: boolean;
  onToggleExpanded?: () => void;
}

/**
 * Floating chat button used inline in a match row.
 * Shows current comment count and opens the comments sheet.
 */
export function MatchCommentsButton({
  matchId,
  homeTeam,
  awayTeam,
  matchLabel,
  className,
  variant = "icon",
  expanded,
  onToggleExpanded,
}: Props) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [webNoteOpen, setWebNoteOpen] = useState(false);
  const isAndroidApp = getIsAndroidApp();
  const isControlled = typeof onToggleExpanded === "function";

  // Lightweight count fetch + realtime increment
  useEffect(() => {
    let cancelled = false;
    const db = supabase as any;
    (async () => {
      const { count: c } = await db
        .from("match_comments")
        .select("id", { count: "exact", head: true })
        .eq("match_id", matchId)
        .is("deleted_at", null);
      if (!cancelled) setCount(typeof c === "number" ? c : 0);
    })();

    const channel = supabase
      .channel(`mc-count-${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_comments", filter: `match_id=eq.${matchId}` },
        () => {
          (async () => {
            const { count: c } = await db
              .from("match_comments")
              .select("id", { count: "exact", head: true })
              .eq("match_id", matchId)
              .is("deleted_at", null);
            if (!cancelled) setCount(typeof c === "number" ? c : 0);
          })();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  const isPill = variant === "pill";

  const triggerClass = cn(
          "relative flex items-center justify-center transition-all rounded-md",
          isPill
            ? "h-7 px-2.5 gap-1.5 text-[11px] font-medium"
            : "h-8 w-8 sm:h-9 sm:w-9 min-h-[32px] min-w-[32px]",
          (count ?? 0) > 0
            ? "bg-primary/15 text-primary hover:bg-primary/25"
            : "bg-secondary text-muted-foreground hover:bg-secondary/80",
          className
  );

  const inner = (
    <>
      <MessageCircle className={cn(isPill ? "h-3.5 w-3.5" : "h-4 w-4 sm:h-[18px] sm:w-[18px]")} />
        {isPill && (
          <span>
            {count != null && count > 0 ? `Comments · ${count > 99 ? "99+" : count}` : "Comments"}
          </span>
        )}
        {isPill && isControlled && isAndroidApp && (
          expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        )}
        {!isPill && count != null && count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center border border-background">
            {count > 99 ? "99+" : count}
          </span>
        )}
    </>
  );

  if (!isAndroidApp) {
    return (
      <Popover open={webNoteOpen} onOpenChange={setWebNoteOpen}>
        <PopoverTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            aria-label="Match comments"
            className={triggerClass}
          >
            {inner}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="bottom"
          sideOffset={6}
          className="w-[260px] p-3 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-2.5">
            <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Smartphone className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <div className="text-[12px] font-semibold text-foreground mb-0.5">
                Available on the app
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug mb-2">
                Comments are an app-only feature. Download to join the chat.
              </p>
              <button
                onClick={() => {
                  window.open(
                    "https://play.google.com/store/apps/details?id=com.propredict.app&source=match_comments",
                    "_blank",
                    "noopener,noreferrer"
                  );
                }}
                className="inline-flex items-center justify-center h-7 px-3 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90"
              >
                Download the App
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Android + controlled by parent: just toggle inline section, no sheet.
  if (isControlled) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleExpanded!();
        }}
        aria-label="Toggle match comments"
        aria-expanded={!!expanded}
        className={triggerClass}
      >
        {inner}
      </button>
    );
  }

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label="Open match comments"
        className={triggerClass}
      >
        {inner}
      </button>
      {open && (
        <MatchCommentsSheet
          open={open}
          onOpenChange={setOpen}
          matchId={matchId}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          matchLabel={matchLabel}
        />
      )}
    </>
  );
}