import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { CorrectScoreCard } from "@/components/tickets/CorrectScoreCard";
import { useCorrectScoreTickets } from "@/hooks/useCorrectScoreTickets";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useAdminAccess } from "@/hooks/useAdminAccess";

export default function CorrectScore() {
  const navigate = useNavigate();
  const { tickets, isLoading } = useCorrectScoreTickets(false);
  const { plan, isAuthenticated } = useUserPlan() as any;
  const { isAdmin } = useAdminAccess();
  const isPremium = isAdmin || plan === "premium";

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Belgrade" });
  const visible = tickets.filter((t) => (t.ticket_date ?? "") >= today);
  const list = visible.length ? visible : tickets.slice(0, 2);

  return (
    <>
      <Helmet>
        <title>Correct Score Picks – ProPredict</title>
        <meta name="description" content="Today's correct score predictions: three score options for selected matches." />
      </Helmet>
      <div className="mx-auto max-w-6xl space-y-6">
        <h1 className="text-center text-3xl font-extrabold">Correct Score</h1>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : list.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">No correct score picks yet. / Još nema tipova.</p>
        ) : (
          <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 md:gap-6">
            {list.map((t, i) => (
              <div key={t.id} className="space-y-2.5">
                <h2 className="text-center text-xl font-extrabold tracking-tight md:text-2xl">
                  Correct Score <span className="text-primary">#{i + 1}</span>
                </h2>
                <CorrectScoreCard
                  ticket={t}
                  locked={t.tier === "premium" && !isPremium}
                  onUnlock={() => navigate(isAuthenticated ? "/get-premium" : "/login")}
                />
              </div>
            ))}
          </div>
        )}
        <p className="text-center text-xs text-muted-foreground">These AI-generated predictions are for informational and entertainment purposes only.</p>
      </div>
    </>
  );
}
