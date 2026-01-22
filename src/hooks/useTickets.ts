import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Ticket, TicketInsert, TicketUpdate, TicketMatchInsert } from "@/types/admin";
import { toast } from "sonner";

export function useTickets(adminView = false) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["tickets", adminView],
    queryFn: async () => {
      const db = supabase as any;
      let q = db.from("tickets").select("*, ticket_matches(*)");
      
      // For public view, only show published tickets from today
      if (!adminView) {
        const today = new Date().toISOString().split("T")[0];
        q = q.eq("status", "published").eq("created_at", today);
      }
      
      const { data, error } = await q.order("created_at_ts", { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map((ticket: any) => ({
        ...ticket,
        matches: ticket.ticket_matches || [],
      })) as Ticket[];
    },
  });

  const createTicket = useMutation({
    mutationFn: async ({ 
      ticket, 
      matches 
    }: { 
      ticket: TicketInsert; 
      matches: Omit<TicketMatchInsert, "ticket_id">[] 
    }) => {
      const db = supabase as any;
      
      // Calculate total odds
      const totalOdds = matches.reduce((acc, m) => acc * m.odds, 1);
      
      // Create ticket
      const { data: ticketData, error: ticketError } = await db
        .from("tickets")
        .insert({ ...ticket, total_odds: totalOdds, created_by: user?.id })
        .select()
        .single();
      
      if (ticketError) throw ticketError;
      
      // Create matches
      if (matches.length > 0) {
        const matchesWithTicketId = matches.map((m, idx) => ({
          ...m,
          ticket_id: ticketData.id,
          sort_order: idx,
        }));
        
        const { error: matchesError } = await db
          .from("ticket_matches")
          .insert(matchesWithTicketId);
        
        if (matchesError) throw matchesError;
      }
      
      return ticketData as Ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create ticket: ${error.message}`);
    },
  });

  const updateTicket = useMutation({
    mutationFn: async ({ 
      id, 
      updates, 
      matches 
    }: { 
      id: string; 
      updates: TicketUpdate; 
      matches?: Omit<TicketMatchInsert, "ticket_id">[] 
    }) => {
      const db = supabase as any;
      
      // If matches provided, recalculate total odds
      let totalOdds = updates.total_odds;
      if (matches) {
        totalOdds = matches.reduce((acc, m) => acc * m.odds, 1);
      }
      
      // Update ticket
      const { data: ticketData, error: ticketError } = await db
        .from("tickets")
        .update({ ...updates, total_odds: totalOdds })
        .eq("id", id)
        .select()
        .single();
      
      if (ticketError) throw ticketError;
      
      // If matches provided, replace all matches
      if (matches) {
        // Delete existing matches
        await db
          .from("ticket_matches")
          .delete()
          .eq("ticket_id", id);
        
        // Insert new matches
        if (matches.length > 0) {
          const matchesWithTicketId = matches.map((m, idx) => ({
            ...m,
            ticket_id: id,
            sort_order: idx,
          }));
          
          const { error: matchesError } = await db
            .from("ticket_matches")
            .insert(matchesWithTicketId);
          
          if (matchesError) throw matchesError;
        }
      }
      
      return ticketData as Ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update ticket: ${error.message}`);
    },
  });

  const deleteTicket = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("tickets")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete ticket: ${error.message}`);
    },
  });

  return {
    tickets: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createTicket,
    updateTicket,
    deleteTicket,
    refetch: query.refetch,
  };
}