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
  const [customPredictionText, setCustomPredictionText] = useState("");
  const [customOdds, setCustomOdds] = useState("1.50");

  // For Today's Matches - when adding from fixtures
  const [todayPrediction, setTodayPrediction] = useState("");
  const [todayPredictionText, setTodayPredictionText] = useState("");
  const [todayOdds, setTodayOdds] = useState("1.50");

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
    setCustomPredictionText("");
    setCustomOdds("1.50");
    setTodayPrediction("");
    setTodayPredictionText("");
    setTodayOdds("1.50");
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
    const finalPrediction = todayPredictionText || todayPrediction;
    if (!finalPrediction) {
      toast.error("Please select a prediction first");
      return;
    }
    if (
      matches.some(
        (m) =>
          m.homeTeam === fixture.homeTeam &&
          m.awayTeam === fixture.awayTeam
      )
    ) {
      toast.error("Match already added");
      return;
    }

    setMatches([
      ...matches,
      {
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        league: fixture.league || "",
        prediction: finalPrediction,
        odds: parseFloat(todayOdds) || 1.5,
      },
    ]);

    // Reset today's prediction fields after adding
    setTodayPrediction("");
    setTodayPredictionText("");
    setTodayOdds("1.50");
  };

  const addCustomMatch = () => {
    const finalPrediction = customPredictionText || customPrediction;
    if (!customHomeTeam || !customAwayTeam || !finalPrediction) {
      toast.error("Please fill in required fields");
      return;
    }

    setMatches([
      ...matches,
      {
        homeTeam: customHomeTeam,
        awayTeam: customAwayTeam,
        league: customLeague,
        prediction: finalPrediction,
        odds: parseFloat(customOdds) || 1.5,
      },
    ]);

    setCustomHomeTeam("");
    setCustomAwayTeam("");
    setCustomLeague("");
    setCustomPrediction("");
    setCustomPredictionText("");
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
            <Card className="p-4 space-y-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                  2
                </div>
                <span className="font-semibold">Matches</span>
              </div>

              <Tabs value={matchTab} onValueChange={(v) => setMatchTab(v as "today" | "custom")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="today" className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Today's Matches
                  </TabsTrigger>
                  <TabsTrigger value="custom" className="flex items-center gap-1">
                    <Plus className="h-4 w-4" />
                    Custom Match
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="today" className="space-y-3 mt-3">
                  {/* Prediction fields for Today's Matches */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Prediction (select)</Label>
                      <Select value={todayPrediction} onValueChange={setTodayPrediction}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select prediction" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {/* 1X2 */}
                          <SelectItem value="1">Home Win (1)</SelectItem>
                          <SelectItem value="X">Draw (X)</SelectItem>
                          <SelectItem value="2">Away Win (2)</SelectItem>
                          {/* Double Chance */}
                          <SelectItem value="1X">Home or Draw (1X)</SelectItem>
                          <SelectItem value="X2">Draw or Away (X2)</SelectItem>
                          <SelectItem value="12">Home or Away (12)</SelectItem>
                          {/* Goals Over */}
                          <SelectItem value="Over 0.5">Over 0.5 Goals</SelectItem>
                          <SelectItem value="Over 1.5">Over 1.5 Goals</SelectItem>
                          <SelectItem value="Over 2.5">Over 2.5 Goals</SelectItem>
                          <SelectItem value="Over 3.5">Over 3.5 Goals</SelectItem>
                          <SelectItem value="Over 4.5">Over 4.5 Goals</SelectItem>
                          {/* Goals Under */}
                          <SelectItem value="Under 0.5">Under 0.5 Goals</SelectItem>
                          <SelectItem value="Under 1.5">Under 1.5 Goals</SelectItem>
                          <SelectItem value="Under 2.5">Under 2.5 Goals</SelectItem>
                          <SelectItem value="Under 3.5">Under 3.5 Goals</SelectItem>
                          <SelectItem value="Under 4.5">Under 4.5 Goals</SelectItem>
                          {/* BTTS */}
                          <SelectItem value="BTTS Yes">BTTS Yes</SelectItem>
                          <SelectItem value="BTTS No">BTTS No</SelectItem>
                          {/* Correct Score */}
                          <SelectItem value="CS 1-0">Correct Score 1-0</SelectItem>
                          <SelectItem value="CS 2-0">Correct Score 2-0</SelectItem>
                          <SelectItem value="CS 2-1">Correct Score 2-1</SelectItem>
                          <SelectItem value="CS 0-0">Correct Score 0-0</SelectItem>
                          <SelectItem value="CS 1-1">Correct Score 1-1</SelectItem>
                          <SelectItem value="CS 2-2">Correct Score 2-2</SelectItem>
                          <SelectItem value="CS 0-1">Correct Score 0-1</SelectItem>
                          <SelectItem value="CS 0-2">Correct Score 0-2</SelectItem>
                          <SelectItem value="CS 1-2">Correct Score 1-2</SelectItem>
                          <SelectItem value="CS 3-0">Correct Score 3-0</SelectItem>
                          <SelectItem value="CS 3-1">Correct Score 3-1</SelectItem>
                          <SelectItem value="CS 3-2">Correct Score 3-2</SelectItem>
                          <SelectItem value="CS 0-3">Correct Score 0-3</SelectItem>
                          <SelectItem value="CS 1-3">Correct Score 1-3</SelectItem>
                          <SelectItem value="CS 2-3">Correct Score 2-3</SelectItem>
                          {/* Half Time */}
                          <SelectItem value="HT 1">Half Time Home Win</SelectItem>
                          <SelectItem value="HT X">Half Time Draw</SelectItem>
                          <SelectItem value="HT 2">Half Time Away Win</SelectItem>
                          {/* Handicap */}
                          <SelectItem value="Home -1">Home -1 Handicap</SelectItem>
                          <SelectItem value="Home -2">Home -2 Handicap</SelectItem>
                          <SelectItem value="Away +1">Away +1 Handicap</SelectItem>
                          <SelectItem value="Away +2">Away +2 Handicap</SelectItem>
                          {/* Combos */}
                          <SelectItem value="1 & Over 1.5">Home Win & Over 1.5</SelectItem>
                          <SelectItem value="1 & Over 2.5">Home Win & Over 2.5</SelectItem>
                          <SelectItem value="2 & Over 1.5">Away Win & Over 1.5</SelectItem>
                          <SelectItem value="2 & Over 2.5">Away Win & Over 2.5</SelectItem>
                          <SelectItem value="1 & BTTS">Home Win & BTTS</SelectItem>
                          <SelectItem value="2 & BTTS">Away Win & BTTS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Custom Prediction</Label>
                      <Input
                        placeholder="e.g. Correct Score 2-1"
                        value={todayPredictionText}
                        onChange={(e) => setTodayPredictionText(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Odds</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="1"
                      value={todayOdds}
                      onChange={(e) => setTodayOdds(e.target.value)}
                    />
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search matches..."
                      value={matchSearch}
                      onChange={(e) => setMatchSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Select prediction & odds above, then click a match to add it
                  </p>

                  {fixturesLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : filteredFixtures.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No matches found
                    </p>
                  ) : (
                    <ScrollArea className="h-40">
                      <div className="space-y-2">
                        {filteredFixtures.slice(0, 20).map((fixture) => (
                          <div
                            key={fixture.id}
                            className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted cursor-pointer"
                            onClick={() => addMatchFromFixture(fixture)}
                          >
                            <div className="text-sm">
                              <span className="font-medium">{fixture.homeTeam}</span>
                              <span className="text-muted-foreground"> vs </span>
                              <span className="font-medium">{fixture.awayTeam}</span>
                              {fixture.league && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({fixture.league})
                                </span>
                              )}
                            </div>
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </TabsContent>

                <TabsContent value="custom" className="space-y-3 mt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Home Team *</Label>
                      <Input
                        placeholder="e.g. Manchester United"
                        value={customHomeTeam}
                        onChange={(e) => setCustomHomeTeam(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Away Team *</Label>
                      <Input
                        placeholder="e.g. Liverpool"
                        value={customAwayTeam}
                        onChange={(e) => setCustomAwayTeam(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>League</Label>
                    <Input
                      placeholder="e.g. Premier League"
                      value={customLeague}
                      onChange={(e) => setCustomLeague(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Prediction (select)</Label>
                      <Select value={customPrediction} onValueChange={setCustomPrediction}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select prediction" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {/* 1X2 */}
                          <SelectItem value="1">Home Win (1)</SelectItem>
                          <SelectItem value="X">Draw (X)</SelectItem>
                          <SelectItem value="2">Away Win (2)</SelectItem>
                          {/* Double Chance */}
                          <SelectItem value="1X">Home or Draw (1X)</SelectItem>
                          <SelectItem value="X2">Draw or Away (X2)</SelectItem>
                          <SelectItem value="12">Home or Away (12)</SelectItem>
                          {/* Goals Over */}
                          <SelectItem value="Over 0.5">Over 0.5 Goals</SelectItem>
                          <SelectItem value="Over 1.5">Over 1.5 Goals</SelectItem>
                          <SelectItem value="Over 2.5">Over 2.5 Goals</SelectItem>
                          <SelectItem value="Over 3.5">Over 3.5 Goals</SelectItem>
                          <SelectItem value="Over 4.5">Over 4.5 Goals</SelectItem>
                          {/* Goals Under */}
                          <SelectItem value="Under 0.5">Under 0.5 Goals</SelectItem>
                          <SelectItem value="Under 1.5">Under 1.5 Goals</SelectItem>
                          <SelectItem value="Under 2.5">Under 2.5 Goals</SelectItem>
                          <SelectItem value="Under 3.5">Under 3.5 Goals</SelectItem>
                          <SelectItem value="Under 4.5">Under 4.5 Goals</SelectItem>
                          {/* BTTS */}
                          <SelectItem value="BTTS Yes">BTTS Yes</SelectItem>
                          <SelectItem value="BTTS No">BTTS No</SelectItem>
                          {/* Correct Score */}
                          <SelectItem value="CS 1-0">Correct Score 1-0</SelectItem>
                          <SelectItem value="CS 2-0">Correct Score 2-0</SelectItem>
                          <SelectItem value="CS 2-1">Correct Score 2-1</SelectItem>
                          <SelectItem value="CS 0-0">Correct Score 0-0</SelectItem>
                          <SelectItem value="CS 1-1">Correct Score 1-1</SelectItem>
                          <SelectItem value="CS 2-2">Correct Score 2-2</SelectItem>
                          <SelectItem value="CS 0-1">Correct Score 0-1</SelectItem>
                          <SelectItem value="CS 0-2">Correct Score 0-2</SelectItem>
                          <SelectItem value="CS 1-2">Correct Score 1-2</SelectItem>
                          <SelectItem value="CS 3-0">Correct Score 3-0</SelectItem>
                          <SelectItem value="CS 3-1">Correct Score 3-1</SelectItem>
                          <SelectItem value="CS 3-2">Correct Score 3-2</SelectItem>
                          <SelectItem value="CS 0-3">Correct Score 0-3</SelectItem>
                          <SelectItem value="CS 1-3">Correct Score 1-3</SelectItem>
                          <SelectItem value="CS 2-3">Correct Score 2-3</SelectItem>
                          {/* Half Time */}
                          <SelectItem value="HT 1">Half Time Home Win</SelectItem>
                          <SelectItem value="HT X">Half Time Draw</SelectItem>
                          <SelectItem value="HT 2">Half Time Away Win</SelectItem>
                          {/* Handicap */}
                          <SelectItem value="Home -1">Home -1 Handicap</SelectItem>
                          <SelectItem value="Home -2">Home -2 Handicap</SelectItem>
                          <SelectItem value="Away +1">Away +1 Handicap</SelectItem>
                          <SelectItem value="Away +2">Away +2 Handicap</SelectItem>
                          {/* Combos */}
                          <SelectItem value="1 & Over 1.5">Home Win & Over 1.5</SelectItem>
                          <SelectItem value="1 & Over 2.5">Home Win & Over 2.5</SelectItem>
                          <SelectItem value="2 & Over 1.5">Away Win & Over 1.5</SelectItem>
                          <SelectItem value="2 & Over 2.5">Away Win & Over 2.5</SelectItem>
                          <SelectItem value="1 & BTTS">Home Win & BTTS</SelectItem>
                          <SelectItem value="2 & BTTS">Away Win & BTTS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Custom Prediction</Label>
                      <Input
                        placeholder="e.g. Correct Score 2-1"
                        value={customPredictionText}
                        onChange={(e) => setCustomPredictionText(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Odds *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="1"
                      value={customOdds}
                      onChange={(e) => setCustomOdds(e.target.value)}
                    />
                  </div>

                  <Button
                    type="button"
                    className="w-full"
                    onClick={addCustomMatch}
                    disabled={!customHomeTeam || !customAwayTeam || (!customPrediction && !customPredictionText)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Match to Ticket
                  </Button>
                </TabsContent>
              </Tabs>
            </Card>

            {/* SELECTED MATCHES */}
            <Card className="p-4 space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Selected Matches
                </Label>
                {matches.length > 0 && (
                  <span className="text-xs font-medium">
                    Total Odds: <span className="text-primary">{totalOdds.toFixed(2)}</span>
                  </span>
                )}
              </div>

              {matches.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">No matches added yet</p>
                  <p className="text-xs">Select from today's matches or add a custom match above</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {matches.map((match, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-md bg-muted/50 border"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {match.homeTeam} vs {match.awayTeam}
                        </div>
                        <div className="flex items-center gap-2">
                          {match.league && (
                            <span className="text-xs text-muted-foreground">{match.league}</span>
                          )}
                          <span className="text-xs font-medium text-primary">
                            {match.prediction}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-2">
                        <Input
                          value={match.prediction}
                          onChange={(e) => updateMatch(index, "prediction", e.target.value)}
                          className="w-24 h-8 text-xs"
                          placeholder="Prediction"
                        />

                        <Input
                          type="number"
                          step="0.01"
                          min="1"
                          value={match.odds}
                          onChange={(e) =>
                            updateMatch(index, "odds", parseFloat(e.target.value) || 1.5)
                          }
                          className="w-16 h-8 text-xs"
                        />

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeMatch(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
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
