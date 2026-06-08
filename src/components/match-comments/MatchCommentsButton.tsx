import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { MatchCommentsSheet } from "./MatchCommentsSheet";

interface Props {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  matchLabel?: string;
  className?: string;
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
}: Props) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);

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

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label="Open match comments"
        className={cn(
          "relative h-8 w-8 sm:h-9 sm:w-9 min-h-[32px] min-w-[32px] rounded-md flex items-center justify-center transition-all",
          (count ?? 0) > 0
            ? "bg-primary/15 text-primary hover:bg-primary/25"
            : "bg-secondary text-muted-foreground hover:bg-secondary/80",
          className
        )}
      >
        <MessageCircle className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
        {count != null && count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center border border-background">
            {count > 99 ? "99+" : count}
          </span>
        )}
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