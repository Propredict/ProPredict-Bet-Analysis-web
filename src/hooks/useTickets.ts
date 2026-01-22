import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Ticket, TicketInsert, TicketUpdate, TicketMatch, TicketMatchInsert } from "@/types/admin";
import { toast } from "sonner";

// Mock tickets data for development (until Supabase tables are created)
const mockTickets: Ticket[] = [
  {
    id: "ticket-1",
    title: "Weekend Accumulator",
    total_odds: 12.5,
    tier: "daily",
    status: "published",
    matches: [
      { id: "m1", ticket_id: "ticket-1", match_name: "Man United vs Liverpool", prediction: "Over 2.5", odds: 1.85, sort_order: 0 },
      { id: "m2", ticket_id: "ticket-1", match_name: "Chelsea vs Arsenal", prediction: "BTTS", odds: 1.72, sort_order: 1 },
      { id: "m3", ticket_id: "ticket-1", match_name: "Man City vs Spurs", prediction: "Home Win", odds: 1.45, sort_order: 2 },
    ],
  },
  {
    id: "ticket-2",
    title: "European Special",
    total_odds: 8.75,
    tier: "daily",
    status: "published",
    matches: [
      { id: "m4", ticket_id: "ticket-2", match_name: "Barcelona vs Real Madrid", prediction: "Over 3.5", odds: 2.10, sort_order: 0 },
      { id: "m5", ticket_id: "ticket-2", match_name: "Bayern vs Dortmund", prediction: "BTTS", odds: 1.65, sort_order: 1 },
      { id: "m6", ticket_id: "ticket-2", match_name: "PSG vs Marseille", prediction: "Home -1.5", odds: 2.52, sort_order: 2 },
    ],
  },
  {
    id: "ticket-3",
    title: "Safe Bets Bundle",
    total_odds: 4.25,
    tier: "exclusive",
    status: "published",
    matches: [
      { id: "m7", ticket_id: "ticket-3", match_name: "Bayern Munich vs Mainz", prediction: "Home Win", odds: 1.25, sort_order: 0 },
      { id: "m8", ticket_id: "ticket-3", match_name: "Man City vs Bournemouth", prediction: "Home Win", odds: 1.30, sort_order: 1 },
      { id: "m9", ticket_id: "ticket-3", match_name: "Real Madrid vs Getafe", prediction: "Home Win", odds: 1.35, sort_order: 2 },
    ],
  },
  {
    id: "ticket-4",
    title: "Goals Galore",
    total_odds: 15.80,
    tier: "exclusive",
    status: "published",
    matches: [
      { id: "m10", ticket_id: "ticket-4", match_name: "Leeds vs Leicester", prediction: "Over 3.5", odds: 2.40, sort_order: 0 },
      { id: "m11", ticket_id: "ticket-4", match_name: "Ajax vs PSV", prediction: "BTTS & Over 2.5", odds: 1.95, sort_order: 1 },
      { id: "m12", ticket_id: "ticket-4", match_name: "Roma vs Napoli", prediction: "Over 2.5", odds: 1.75, sort_order: 2 },
    ],
  },
  {
    id: "ticket-5",
    title: "VIP Premium Pick",
    total_odds: 25.50,
    tier: "premium",
    status: "published",
    matches: [
      { id: "m13", ticket_id: "ticket-5", match_name: "Liverpool vs Newcastle", prediction: "Correct Score 2-1", odds: 8.50, sort_order: 0 },
      { id: "m14", ticket_id: "ticket-5", match_name: "Juventus vs Inter", prediction: "Draw", odds: 3.00, sort_order: 1 },
    ],
  },
  {
    id: "ticket-6",
    title: "Expert Analysis Pick",
    total_odds: 18.90,
    tier: "premium",
    status: "published",
    matches: [
      { id: "m15", ticket_id: "ticket-6", match_name: "Atletico vs Sevilla", prediction: "Under 1.5", odds: 3.50, sort_order: 0 },
      { id: "m16", ticket_id: "ticket-6", match_name: "AC Milan vs Atalanta", prediction: "BTTS No", odds: 2.70, sort_order: 1 },
      { id: "m17", ticket_id: "ticket-6", match_name: "Porto vs Benfica", prediction: "Draw", odds: 3.20, sort_order: 2 },
    ],
  },
];

export function useTickets(adminView = false) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["tickets", adminView],
    queryFn: async () => {
      // Try to fetch from Supabase first
      try {
        let query = (supabase as any)
          .from("tickets")
          .select("*, ticket_matches(*)");
        
        // For public view, only show published tickets from today
        if (!adminView) {
          const today = new Date().toISOString().split("T")[0];
          query = query.eq("status", "published").eq("created_at", today);
        }
        
        const { data, error } = await query.order("created_at_ts", { ascending: false });
        
        if (error) throw error;
        
        // If we have data from Supabase, use it
        if (data && data.length > 0) {
          return (data || []).map((ticket: any) => ({
            ...ticket,
            matches: ticket.ticket_matches || [],
          })) as Ticket[];
        }
      } catch (e) {
        // Supabase table doesn't exist yet, use mock data
        console.log("Using mock tickets data");
      }
      
      // Return mock data for development
      if (!adminView) {
        return mockTickets.filter(t => t.status === "published");
      }
      return mockTickets;
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
      // Calculate total odds
      const totalOdds = matches.reduce((acc, m) => acc * m.odds, 1);
      
      // Create ticket
      const { data: ticketData, error: ticketError } = await (supabase as any)
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
        
        const { error: matchesError } = await (supabase as any)
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
      // If matches provided, recalculate total odds
      let totalOdds = updates.total_odds;
      if (matches) {
        totalOdds = matches.reduce((acc, m) => acc * m.odds, 1);
      }
      
      // Update ticket
      const { data: ticketData, error: ticketError } = await (supabase as any)
        .from("tickets")
        .update({ ...updates, total_odds: totalOdds })
        .eq("id", id)
        .select()
        .single();
      
      if (ticketError) throw ticketError;
      
      // If matches provided, replace all matches
      if (matches) {
        // Delete existing matches
        await (supabase as any)
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
          
          const { error: matchesError } = await (supabase as any)
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
