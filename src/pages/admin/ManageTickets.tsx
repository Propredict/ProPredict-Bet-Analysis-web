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

  /* ---------- BASIC INFO ---------- */
  const [title, setTitle] = useState("");
  const [tier, setTier] = useState<ContentTier>("daily");
  const [status, setStatus] = useState<ContentStatus>("draft");
  const [result, setResult] = useState<TicketResult>("pending");
  const [description, setDescription] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState("");

  // ✅ NEW – custom ticket prediction
  const [ticketPrediction, setTicketPrediction] = useState("");

  /* ---------- MATCHES ---------- */
  const [matches, setMatches] = useState<MatchFormData[]>([]);
  const [matchSearch, setMatchSearch] = useState("");
  const [matchTab, setMatchTab] = useState<"today" | "custom">("today");

  const [customHomeTeam, setCustomHomeTeam] = useState("");
  const [customAwayTeam, setCustomAwayTeam] = useState("");
  const [customLeague, setCustomLeague] = useState("");
  const [customPrediction, setCustomPrediction] = useState("");
  const [customOdds, setCustomOdds] = useState("1.50");

  const totalOdds =
    matches.length > 0 ? matches.reduce((a, m) => a * m.odds, 1) : 0;

  /* =====================
     Helpers
  ===================== */

  const resetForm = () => {
    setTitle("");
    setTier("daily");
    setStatus("draft");
    setResult("pending");
    setDescription("");
    setAiAnalysis("");
    setTicketPrediction("");
    setMatches([]);
    setMatchSearch("");
    setCustomHomeTeam("");
    setCustomAwayTeam("");
    setCustomLeague("");
    setCustomPrediction("");
    setCustomOdds("1.50");
  };

  const handleCreate = () => {
    setEditingTicket(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setTitle(ticket.title);
    setTier(ticket.tier);
    setStatus(ticket.status);
    setResult(ticket.result ?? "pending");
    setTicketPrediction((ticket as any).prediction_text ?? "");
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
      }) ?? [],
    );
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (matches.length === 0) {
      toast.error("Add at least one match");
      return;
    }

    const dbMatches = matches.map((m) => ({
      match_name: createMatchName(m.homeTeam, m.awayTeam, m.league || undefined),
      prediction: m.prediction,
      odds: m.odds,
    }));

    if (editingTicket) {
      await updateTicket.mutateAsync({
        id: editingTicket.id,
        updates: {
          title,
          tier,
          status,
          result,
          total_odds: totalOdds,
          description: ticketPrediction,
        },
        matches: dbMatches,
      });
      toast.success("Ticket updated");
    } else {
      await createTicket.mutateAsync({
        ticket: {
          title,
          tier,
          status,
          result,
          total_odds: totalOdds,
          prediction_text: ticketPrediction,
        } as any,
        matches: dbMatches,
      });
      toast.success("Ticket created");
    }

    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteTicket.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const handleMarkResult = async (id: string, r: TicketResult) => {
    await updateTicket.mutateAsync({ id, updates: { result: r } });
  };

  /* =====================
     Render
  ===================== */

  return (
    <div className="section-gap max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="font-bold">Manage Tickets</h1>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-1" /> Add Ticket
        </Button>
      </div>

      {isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin mx-auto mt-10" />
      ) : (
        <div className="grid gap-3 mt-4">
          {tickets.map((t) => (
            <AdminTicketCard
              key={t.id}
              ticket={t}
              onEdit={() => handleEdit(t)}
              onPreview={() => setPreviewTicket(t)}
              onDelete={() => setDeleteId(t.id)}
              onMarkWon={() => handleMarkResult(t.id, "won")}
              onMarkLost={() => handleMarkResult(t.id, "lost")}
            />
          ))}
        </div>
      )}

      {/* CREATE / EDIT */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>
              {editingTicket ? "Edit Ticket" : "Create Ticket"}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              <Card className="p-4 space-y-4">
                <h3 className="font-semibold">Ticket Info</h3>

                <Input
                  placeholder="Ticket title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />

                {/* ✅ CUSTOM TICKET PREDICTION */}
                <Input
                  placeholder="Ticket prediction (custom)"
                  value={ticketPrediction}
                  onChange={(e) =>
                    setTicketPrediction(e.target.value)
                  }
                />

                <div className="grid grid-cols-3 gap-4">
                  <Select value={tier} onValueChange={(v) => setTier(v as ContentTier)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="exclusive">Exclusive</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={status} onValueChange={(v) => setStatus(v as ContentStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={result} onValueChange={(v) => setResult(v as TicketResult)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Card>
            </div>
          </ScrollArea>

          <DialogFooter className="p-4 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingTicket ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TicketPreviewModal
        ticket={previewTicket}
        open={!!previewTicket}
        onOpenChange={() => setPreviewTicket(null)}
      />
    </div>
  );
}
