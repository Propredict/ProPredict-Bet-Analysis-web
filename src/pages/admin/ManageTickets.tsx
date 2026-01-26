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

  // ===== Ticket info
  const [title, setTitle] = useState("");
  const [ticketPrediction, setTicketPrediction] = useState(""); // ✅ NEW
  const [tier, setTier] = useState<ContentTier>("daily");
  const [status, setStatus] = useState<ContentStatus>("draft");
  const [result, setResult] = useState<TicketResult>("pending");
  const [description, setDescription] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState("");

  // ===== Matches
  const [matches, setMatches] = useState<MatchFormData[]>([]);
  const [matchSearch, setMatchSearch] = useState("");
  const [matchTab, setMatchTab] = useState<"today" | "custom">("today");

  const [customHomeTeam, setCustomHomeTeam] = useState("");
  const [customAwayTeam, setCustomAwayTeam] = useState("");
  const [customLeague, setCustomLeague] = useState("");
  const [customPrediction, setCustomPrediction] = useState("");
  const [customOdds, setCustomOdds] = useState("1.50");

  const totalOdds =
    matches.length > 0
      ? matches.reduce((acc, m) => acc * m.odds, 1)
      : 0;

  const filteredFixtures = fixtures.filter((f) => {
    const s = matchSearch.toLowerCase();
    return (
      f.homeTeam?.toLowerCase().includes(s) ||
      f.awayTeam?.toLowerCase().includes(s) ||
      f.league?.toLowerCase().includes(s)
    );
  });

  /* =====================
     Helpers
  ===================== */

  const resetForm = () => {
    setTitle("");
    setTicketPrediction("");
    setTier("daily");
    setStatus("draft");
    setResult("pending");
    setDescription("");
    setAiAnalysis("");
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
      toast.error("Please add at least one match");
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
          description: ticketPrediction,
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

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteTicket.mutateAsync(deleteId);
    setDeleteId(null);
    toast.success("Ticket deleted");
  };

  const handleMarkResult = async (
    ticketId: string,
    newResult: TicketResult
  ) => {
    await updateTicket.mutateAsync({
      id: ticketId,
      updates: { result: newResult },
    });
    toast.success(`Ticket marked as ${newResult}`);
  };

  const addMatchFromFixture = (fixture: any) => {
    if (
      matches.some(
        (m) =>
          m.homeTeam === fixture.homeTeam &&
          m.awayTeam === fixture.awayTeam
      )
    )
      return;

    setMatches([
      ...matches,
      {
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        league: fixture.league || "",
        prediction: "",
        odds: 1.5,
      },
    ]);
  };

  const addCustomMatch = () => {
    if (!customHomeTeam || !customAwayTeam || !customPrediction) return;

    setMatches([
      ...matches,
      {
        homeTeam: customHomeTeam,
        awayTeam: customAwayTeam,
        league: customLeague,
        prediction: customPrediction,
        odds: parseFloat(customOdds) || 1.5,
      },
    ]);

    setCustomHomeTeam("");
    setCustomAwayTeam("");
    setCustomLeague("");
    setCustomPrediction("");
    setCustomOdds("1.50");
  };

  const updateMatch = (
    index: number,
    field: keyof MatchFormData,
    value: any
  ) => {
    const updated = [...matches];
    updated[index] = { ...updated[index], [field]: value };
    setMatches(updated);
  };

  const removeMatch = (index: number) => {
    setMatches(matches.filter((_, i) => i !== index));
  };

  /* =====================
     Render
  ===================== */

  return (
    <div className="section-gap max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="font-bold">Manage Tickets</h1>
        <Button size="sm" onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-1" /> Add Ticket
        </Button>
      </div>

      {isLoading ? (
        <Loader2 className="animate-spin mx-auto" />
      ) : (
        <div className="grid gap-3">
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

      {/* CREATE / EDIT MODAL */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>
              {editingTicket ? "Edit Ticket" : "Create Ticket"}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 p-4 space-y-6">
            {/* TICKET INFO */}
            <Card className="p-4 space-y-4">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />

              <Label>Ticket prediction (custom)</Label>
              <Input
                value={ticketPrediction}
                onChange={(e) => setTicketPrediction(e.target.value)}
                placeholder="e.g. Safe accumulator"
              />

              <div className="grid grid-cols-3 gap-3">
                <Select value={tier} onValueChange={(v) => setTier(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="exclusive">Pro</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={result}
                  onValueChange={(v) => setResult(v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* MATCHES */}
            {/* (ovo ostaje isto kao pre – NIŠTA NIJE DIRANO) */}
          </ScrollArea>

          <DialogFooter className="p-4 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingTicket ? "Update Ticket" : "Create Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PREVIEW */}
      <TicketPreviewModal
        ticket={previewTicket}
        open={!!previewTicket}
        onOpenChange={(o) => !o && setPreviewTicket(null)}
      />

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
    </div>
  );
}
