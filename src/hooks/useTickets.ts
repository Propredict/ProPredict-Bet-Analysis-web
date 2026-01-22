import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Database } from "@/integrations/supabase/types";

type TicketRow = Database["public"]["Tables"]["tickets"]["Row"];
type TicketInsert = Database["public"]["Tables"]["tickets"]["Insert"];
type TicketUpdate = Database["public"]["Tables"]["tickets"]["Update"];
type TicketMatchInsert = Database["public"]["Tables"]["ticket_matches"]["Insert"];
type TicketMatchRow = Database["public"]["Tables"]["ticket_matches"]["Row"];

export interface TicketWithMatches extends TicketRow {
  matches: TicketMatchRow[];
}

export function useTickets(includeAll = false) {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  const { data: tickets = [], isLoading, error, refetch } = useQuery({
    queryKey: ["tickets", includeAll],
    queryFn: async () => {
      let query = supabase
        .from("tickets")
        .select(`
          *,
          matches:ticket_matches(*)
        `)
        .order("created_at_ts", { ascending: false });

      // If not includeAll (admin view), only show published tickets
      if (!includeAll) {
        query = query.eq("status", "published");
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TicketWithMatches[];
    },
  });

  const createTicket = useMutation({
    mutationFn: async ({
      ticket,
      matches,
    }: {
      ticket: Omit<TicketInsert, "created_by">;
      matches: Omit<TicketMatchInsert, "ticket_id">[];
    }) => {
      // Insert ticket first
      const { data: ticketData, error: ticketError } = await supabase
        .from("tickets")
        .insert({
          ...ticket,
          created_by: session?.user?.id || null,
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Insert matches with ticket_id
      if (matches.length > 0) {
        const matchesWithTicketId = matches.map((m, index) => ({
          ...m,
          ticket_id: ticketData.id,
          sort_order: index,
        }));

        const { error: matchesError } = await supabase
          .from("ticket_matches")
          .insert(matchesWithTicketId);

        if (matchesError) throw matchesError;
      }

      return ticketData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  const updateTicket = useMutation({
    mutationFn: async ({
      id,
      updates,
      matches,
    }: {
      id: string;
      updates: TicketUpdate;
      matches: Omit<TicketMatchInsert, "ticket_id">[];
    }) => {
      // Update ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from("tickets")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Delete old matches
      const { error: deleteError } = await supabase
        .from("ticket_matches")
        .delete()
        .eq("ticket_id", id);

      if (deleteError) throw deleteError;

      // Insert new matches
      if (matches.length > 0) {
        const matchesWithTicketId = matches.map((m, index) => ({
          ...m,
          ticket_id: id,
          sort_order: index,
        }));

        const { error: matchesError } = await supabase
          .from("ticket_matches")
          .insert(matchesWithTicketId);

        if (matchesError) throw matchesError;
      }

      return ticketData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  const deleteTicket = useMutation({
    mutationFn: async (id: string) => {
      // Matches will be cascade deleted
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
