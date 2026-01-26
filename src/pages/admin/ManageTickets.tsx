import { useState } from "react";
import { Plus, Loader2, Search, X, Calendar, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTickets } from "@/hooks/useTickets";
import { useFixtures } from "@/hooks/useFixtures";
import { AdminTicketCard } from "@/components/admin/AdminTicketCard";
import { TicketPreviewModal } from "@/components/admin/TicketPreviewModal";
import type {
  Ticket,
  ContentTier,
  ContentStatus,
  TicketResult,
} from "@/types/admin";
import { createMatchName, parseMatchName } from "@/types/admin";
import type { TicketWithMatches } from "@/hooks/useTickets";
import { format } from "date-fns";
import { toast } from "sonner";

/* =====================
   Types
===================== */

interface MatchFormData {
  homeTeam: string;
  awayTeam: string;
  league: string;
  prediction: string;
  odds: number;
}

/* =====================
   Component
===================== */

export default function ManageTickets() {
  const { tickets, isLoading, createTicket, updateTicket, deleteTicket } =
    useTickets(true);
  const { matches: fixtures, isLoading: fixturesLoading } =
    useFixtures("today");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewTicket, setPreviewTicket] =
    useState<TicketWithMatches | null>(null);

  // ===== Ticket Info =====
  const [title, setTitle] = useState("");
  const [ticketPrediction, setTicketPrediction] = useState(""); // ✅ NOVO
  const [tier, setTier] = useState<ContentTier>("daily");
  const [status, setStatus] = useState<ContentStatus>("draft");
  const [result, setResult] = useState<TicketResult>("pending");
  const [description, setDescription] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState("");

  // ===== Matches =====
  const [matches, setMatches] = useState<MatchFormData[]>([]);

  // Match selector
  const [matchSearch, setMatchSearch] = useState("");
  const [matchTab, setMatchTab] = useState<"today" | "custom">("today");
  const [customHomeTeam, setCustomHomeTeam] = useState("");
  const [customAwayTeam, setCustomAwayTeam] = useState("");
  const [customLeague, setCustomLeague] = useState("");
  const [customPrediction, setCustomPrediction] = useState("");
  const [customOdds, setCustomOdds] = useState("1.50");

  const totalOdds =
    matches.length > 0 ? matches.reduce((acc, m) => acc * m.odds, 1) : 0;

  const filteredFixtures = fixtures.filter((f) => {
    const s = matchSearch.toLowerCase();
    return (
      f.homeTeam?.toLowerCase().includes(s) ||
      f.awayTeam?.toLowerCase().includes(s) ||
      f.league?.toLowerCase().includes(s)
    );
  });

  const resetForm = () => {
    setTitle("");
    setTicketPrediction("");
    setTier("daily");
    setStatus("draft");
    setResult("pending");
    setDescription("");
    setAiAnalysis("");
    setMatches([]);
  };

  const handleCreate = () => {
    setEditingTicket(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setTitle(ticket.title);
    setTicketPrediction(ticket.description ?? "");
    setTier(ticket.tier);
    setStatus(ticket.status);
    setResult(ticket.result ?? "pending");

    setMatches(
      ticket.matches?.map((m) => {
        const parsed = parseMatchName(m.match_name);
        return {
          homeTeam: parsed.homeTeam,
          awayTeam: parsed.awayTeam,
          league: parsed.league || "",
          prediction: m.prediction,
          odds: m.odds,
        };
      }) ?? []
    );

    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (matches.length === 0) {
      toast.error("Add at least one match");
      return;
    }

    const dbMatches = matches.map((m) => ({
      match_name: createMatchName(
        m.homeTeam,
        m.awayTeam,
        m.league || undefined
      ),
      prediction: m.prediction,
      odds: m.odds,
    }));

    if (editingTicket) {
      await updateTicket.mutateAsync({
        id: editingTicket.id,
        updates: {
          title,
          description: ticketPrediction,
          tier,
          status,
          result,
          total_odds: totalOdds,
        },
        matches: dbMatches,
      });
      toast.success("Ticket updated");
    } else {
      await createTicket.mutateAsync({
        ticket: {
          title,
          prediction: ticketPrediction, // ✅
          tier,
          status,
          result,
          total_odds: totalOdds,
        } as any,
        matches: dbMatches,
      });
      toast.success("Ticket created");
    }

    setIsDialogOpen(false);
  };

  return (
    <div className="section-gap max-w-6xl mx-auto">
      <div className="flex justify-between">
        <h1 className="font-bold">Manage Tickets</h1>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-1" /> Add Ticket
        </Button>
      </div>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingTicket ? "Edit Ticket" : "Create Ticket"}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-full pr-4">
            <Card className="p-4 mb-6">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />

              {/* ✅ TICKET PREDICTION */}
              <Label className="mt-4 block">Ticket Prediction</Label>
              <Input
                placeholder="e.g. 3/4 Correct – Safe Combo"
                value={ticketPrediction}
                onChange={(e) => setTicketPrediction(e.target.value)}
              />
            </Card>

            {/* Matches ostaju ISTI kao pre */}
          </ScrollArea>

          <DialogFooter>
            <Button onClick={handleSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
