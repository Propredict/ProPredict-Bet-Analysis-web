import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Ticket, TicketMatch } from "@/types/admin";
import type { Database } from "@/integrations/supabase/types";

/* =======================
   Types
======================= */

export type TicketWithMatches = Ticket & {
  matches: TicketMatch[];
};

type TicketInsert = Database["public"]["Tables"]["tickets"]["Insert"];
type TicketUpdate = Database["public"]["Tables"]["tickets"]["Update"];
type TicketMatchInsert = Database["public"]["Tables"]["ticket_matches"]["Insert"];

/* =======================
   Hook
======================= */

export function useTickets(includeAll = false) {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  /* ---------- FETCH ---------- */
  const {
    data: tickets = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tickets", includeAll],
    queryFn: async () => {
      let query = supabase
        .from("tickets")
        .select("*, matches:ticket_matches(*)")
        .order("created_at_ts", { ascending: false });

      // PUBLIC VIEW → only published
      if (!includeAll) {
        query = query.eq("status", "published");
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((ticket: any) => ({
        ...ticket,
        matches: (ticket.matches ?? []).sort(
          (a: TicketMatch, b: TicketMatch) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
        ),
      })) as TicketWithMatches[];
    },
  });

  /* ---------- CREATE ---------- */
  const createTicket = useMutation({
    mutationFn: async ({
      ticket,
      matches,
    }: {
      ticket: Omit<TicketInsert, "created_by">;
      matches: Omit<TicketMatchInsert, "ticket_id">[];
    }) => {
      const { data: newTicket, error } = await supabase
        .from("tickets")
        .insert({
          ...ticket,
          created_by: session?.user?.id ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      if (matches.length > 0) {
        const rows = matches.map((m, idx) => ({
          ...m,
          ticket_id: newTicket.id,
          sort_order: idx,
        }));

        const { error: matchError } = await supabase.from("ticket_matches").insert(rows);

        if (matchError) throw matchError;
      }

      return newTicket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  /* ---------- UPDATE ---------- */
  const updateTicket = useMutation({
    mutationFn: async ({
      id,
      updates,
      matches,
    }: {
      id: string;
      updates: TicketUpdate;
      matches?: Omit<TicketMatchInsert, "ticket_id">[];
    }) => {
      const { data, error } = await supabase.from("tickets").update(updates).eq("id", id).select().single();

      if (error) throw error;

      if (matches) {
        await supabase.from("ticket_matches").delete().eq("ticket_id", id);

        if (matches.length > 0) {
          const rows = matches.map((m, idx) => ({
            ...m,
            ticket_id: id,
            sort_order: idx,
          }));

          const { error: matchError } = await supabase.from("ticket_matches").insert(rows);

          if (matchError) throw matchError;
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  /* ---------- DELETE ---------- */
  const deleteTicket = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("ticket_matches").delete().eq("ticket_id", id);
      const { error } = await supabase.from("tickets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  return {
    tickets,
    isLoading,
    error,
    refetch,
    createTicket,
    updateTicket,
    deleteTicket,
  };
}
