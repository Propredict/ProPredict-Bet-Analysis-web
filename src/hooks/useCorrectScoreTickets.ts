import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CSMatch {
  home_team: string;
  away_team: string;
  scores: [string, string, string];
}
export interface CSTicket {
  id: string;
  title: string;
  tier: "free" | "premium";
  status: "draft" | "published";
  ticket_date: string | null;
  matches: CSMatch[];
}

const toTicket = (t: any): CSTicket => ({
  id: t.id,
  title: t.title,
  tier: t.tier,
  status: t.status,
  ticket_date: t.ticket_date,
  matches: (t.matches ?? [])
    .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((m: any) => {
      const s = String(m.prediction ?? "").split("|");
      const [h, a] = String(m.match_name ?? "").split(" vs ");
      return {
        home_team: m.home_team || h?.trim() || "",
        away_team: m.away_team || a?.trim() || "",
        scores: [s[0] ?? "", s[1] ?? "", s[2] ?? ""] as [string, string, string],
      };
    }),
});

export function useCorrectScoreTickets(admin = false) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["cs-tickets", admin],
    queryFn: async () => {
      let q = supabase
        .from((admin ? "tickets" : "tickets_public") as any)
        .select("*, matches:ticket_matches(*)")
        .eq("category", "correct_score")
        .order("ticket_date", { ascending: false })
        .limit(admin ? 50 : 10);
      const { data, error } = (await q) as any;
      if (error) throw error;
      return (data ?? []).map(toTicket) as CSTicket[];
    },
  });

  const save = useMutation({
    mutationFn: async (t: Omit<CSTicket, "id"> & { id?: string }) => {
      const payload: any = {
        title: t.title,
        tier: t.tier,
        status: t.status,
        ticket_date: t.ticket_date,
        category: "correct_score",
        total_odds: 1,
      };
      let id = t.id;
      if (id) {
        const { error } = await supabase.from("tickets").update(payload).eq("id", id);
        if (error) throw error;
        await supabase.from("ticket_matches").delete().eq("ticket_id", id);
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { data, error } = await supabase
          .from("tickets")
          .insert({ ...payload, created_by: u.user?.id ?? null })
          .select()
          .single();
        if (error) throw error;
        id = data.id;
      }
      const rows = t.matches.map((m, i) => ({
        ticket_id: id!,
        match_name: `${m.home_team.trim()} vs ${m.away_team.trim()}`,
        home_team: m.home_team.trim(),
        away_team: m.away_team.trim(),
        prediction: m.scores.map((s) => s.trim()).join("|"),
        odds: 1,
        sort_order: i,
        match_date: t.ticket_date,
      }));
      const { error: me } = await supabase.from("ticket_matches").insert(rows);
      if (me) throw me;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cs-tickets"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("ticket_matches").delete().eq("ticket_id", id);
      const { error } = await supabase.from("tickets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cs-tickets"] }),
  });

  return { ...query, tickets: query.data ?? [], save, remove };
}
