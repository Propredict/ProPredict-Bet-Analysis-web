import { useState } from "react";
import { Plus, Loader2, Search, X, Calendar, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import type { Ticket, ContentTier, ContentStatus, TicketResult } from "@/types/admin";
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
  const { tickets, isLoading, createTicket, updateTicket, deleteTicket } = useTickets(true);
  const { matches: fixtures, isLoading: fixturesLoading } = useFixtures("today");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewTicket, setPreviewTicket] = useState<TicketWithMatches | null>(null);

  // Form state - Basic Info
  const [title, setTitle] = useState("");
  const [tier, setTier] = useState<ContentTier>("daily");
  const [status, setStatus] = useState<ContentStatus>("draft");
  const [result, setResult] = useState<TicketResult>("pending");
  const [description, setDescription] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState("");

  // Form state - Matches
  const [matches, setMatches] = useState<MatchFormData[]>([]);

  // Match selection state
  const [matchSearch, setMatchSearch] = useState("");
  const [matchTab, setMatchTab] = useState<"today" | "custom">("today");
  const [customHomeTeam, setCustomHomeTeam] = useState("");
  const [customAwayTeam, setCustomAwayTeam] = useState("");
  const [customLeague, setCustomLeague] = useState("");
  const [customPrediction, setCustomPrediction] = useState("");
  const [customOdds, setCustomOdds] = useState("1.50");

  const totalOdds = matches.length > 0 ? matches.reduce((acc, m) => acc * m.odds, 1) : 0;

  // Filter fixtures for search
  const filteredFixtures = fixtures.filter((f) => {
    const searchLower = matchSearch.toLowerCase();
    const homeTeam = f.homeTeam?.toLowerCase() || "";
    const awayTeam = f.awayTeam?.toLowerCase() || "";
    const league = f.league?.toLowerCase() || "";
    return homeTeam.includes(searchLower) || awayTeam.includes(searchLower) || league.includes(searchLower);
  });

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
    setDescription(""); // DB field not yet added
    setAiAnalysis(""); // DB field not yet added
    
    // Parse existing matches from match_name format
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
      toast.error("Please add at least one match");
      return;
    }

    // Convert MatchFormData to DB format (using match_name)
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
          // description, // Uncomment when DB column added
          // ai_analysis: aiAnalysis, // Uncomment when DB column added
        },
        matches: dbMatches,
      });
      toast.success("Ticket updated successfully");
    } else {
      await createTicket.mutateAsync({
        ticket: {
          title,
          tier,
          status,
          result,
          total_odds: totalOdds,
          // description, // Uncomment when DB column added
          // ai_analysis: aiAnalysis, // Uncomment when DB column added
        } as any,
        matches: dbMatches,
      });
      toast.success("Ticket created successfully");
    }

    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteTicket.mutateAsync(deleteId);
      setDeleteId(null);
      toast.success("Ticket deleted");
    }
  };

  const handleMarkResult = async (ticketId: string, newResult: TicketResult) => {
    await updateTicket.mutateAsync({
      id: ticketId,
      updates: { result: newResult },
    });
    toast.success(`Ticket marked as ${newResult}`);
  };

  const addMatchFromFixture = (fixture: any) => {
    const existingMatch = matches.find(
      (m) => m.homeTeam === fixture.homeTeam && m.awayTeam === fixture.awayTeam
    );
    if (!existingMatch) {
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
    }
  };

  const addCustomMatch = () => {
    if (customHomeTeam && customAwayTeam && customPrediction) {
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
    }
  };

  const removeMatch = (index: number) => {
    setMatches(matches.filter((_, i) => i !== index));
  };

  const updateMatch = (index: number, field: keyof MatchFormData, value: string | number) => {
    const updated = [...matches];
    updated[index] = { ...updated[index], [field]: value };
    setMatches(updated);
  };

  /* =====================
     Render
  ===================== */

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Manage Tickets</h1>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Ticket
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4">
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
            {tickets.length === 0 && (
              <Card className="p-8 text-center bg-card border-border">
                <p className="text-muted-foreground">No tickets yet. Create your first ticket!</p>
              </Card>
            )}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl h-[90vh] max-h-[90vh] overflow-hidden flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
              <DialogTitle className="text-xl">
                {editingTicket ? "Edit Ticket" : "Create Ticket"}
              </DialogTitle>
            </DialogHeader>

            <ScrollArea className="flex-1 px-6 overflow-y-auto">
              <div className="space-y-6 py-4">
                {/* Section 1: Basic Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm">1</span>
                    Basic Information
                  </h3>

                  <div className="grid gap-4 pl-8">
                    <div className="space-y-2">
                      <Label htmlFor="title">Ticket Title *</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Weekend Accumulator"
                        className="bg-background"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Tier *</Label>
                        <Select value={tier} onValueChange={(v) => setTier(v as ContentTier)}>
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="exclusive">Pro (Exclusive)</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Status *</Label>
                        <Select value={status} onValueChange={(v) => setStatus(v as ContentStatus)}>
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Result</Label>
                        <Select value={result} onValueChange={(v) => setResult(v as TicketResult)}>
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="won">Won</SelectItem>
                            <SelectItem value="lost">Lost</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Description - UI ready, DB column needed */}
                    <div className="space-y-2">
                      <Label htmlFor="description">Description (optional)</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Brief description of this ticket..."
                        className="bg-background resize-none"
                        rows={2}
                      />
                      <p className="text-xs text-muted-foreground">Note: Add 'description' column to tickets table to save</p>
                    </div>

                    {/* AI Analysis - UI ready, DB column needed */}
                    <div className="space-y-2">
                      <Label htmlFor="aiAnalysis" className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        AI Analysis (optional)
                      </Label>
                      <Textarea
                        id="aiAnalysis"
                        value={aiAnalysis}
                        onChange={(e) => setAiAnalysis(e.target.value)}
                        placeholder="AI-generated analysis and insights..."
                        className="bg-background resize-none"
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">Note: Add 'ai_analysis' column to tickets table to save</p>
                    </div>
                  </div>
                </div>

                {/* Section 2: Match Selection */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm">2</span>
                    Match Selection
                  </h3>

                  <div className="pl-8 space-y-4">
                    <Tabs value={matchTab} onValueChange={(v) => setMatchTab(v as "today" | "custom")}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="today" className="gap-2">
                          <Calendar className="h-4 w-4" />
                          Today's Matches
                        </TabsTrigger>
                        <TabsTrigger value="custom" className="gap-2">
                          <Plus className="h-4 w-4" />
                          Custom Match
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="today" className="space-y-3 mt-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search by team or league..."
                            value={matchSearch}
                            onChange={(e) => setMatchSearch(e.target.value)}
                            className="pl-10 bg-background"
                          />
                        </div>

                        <ScrollArea className="h-48 border rounded-lg">
                          {fixturesLoading ? (
                            <div className="flex items-center justify-center h-full">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                          ) : filteredFixtures.length > 0 ? (
                            <div className="p-2 space-y-1">
                              {filteredFixtures.slice(0, 20).map((fixture) => {
                                const isSelected = matches.some(
                                  (m) => m.homeTeam === fixture.homeTeam && m.awayTeam === fixture.awayTeam
                                );
                                return (
                                  <button
                                    key={fixture.id}
                                    onClick={() => addMatchFromFixture(fixture)}
                                    disabled={isSelected}
                                    className={`w-full text-left p-2 rounded-md transition-colors ${
                                      isSelected
                                        ? "bg-primary/10 text-primary cursor-not-allowed"
                                        : "hover:bg-muted"
                                    }`}
                                  >
                                    <p className="text-sm font-medium">
                                      {fixture.homeTeam} vs {fixture.awayTeam}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {fixture.league} •{" "}
                                      {fixture.startTime && !isNaN(new Date(fixture.startTime).getTime())
                                        ? format(new Date(fixture.startTime), "HH:mm")
                                        : "TBD"}
                                    </p>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                              {matchSearch ? "No matches found" : "No fixtures available"}
                            </div>
                          )}
                        </ScrollArea>
                      </TabsContent>

                      <TabsContent value="custom" className="space-y-3 mt-4">
                        <div className="space-y-3 p-4 bg-muted/20 rounded-lg border border-primary/30">
                          <p className="text-sm font-medium text-primary">Create Custom Match</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label>Home Team *</Label>
                              <Input
                                placeholder="e.g., Manchester United"
                                value={customHomeTeam}
                                onChange={(e) => setCustomHomeTeam(e.target.value)}
                                className="bg-background"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Away Team *</Label>
                              <Input
                                placeholder="e.g., Liverpool"
                                value={customAwayTeam}
                                onChange={(e) => setCustomAwayTeam(e.target.value)}
                                className="bg-background"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>League (optional)</Label>
                            <Input
                              placeholder="e.g., Premier League"
                              value={customLeague}
                              onChange={(e) => setCustomLeague(e.target.value)}
                              className="bg-background"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label>Prediction *</Label>
                              <Select value={customPrediction} onValueChange={setCustomPrediction}>
                                <SelectTrigger className="bg-background">
                                  <SelectValue placeholder="Select bet type" />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-border z-50">
                                  <SelectItem value="Home Win">Home Win (1)</SelectItem>
                                  <SelectItem value="Draw">Draw (X)</SelectItem>
                                  <SelectItem value="Away Win">Away Win (2)</SelectItem>
                                  <SelectItem value="1X">Home or Draw (1X)</SelectItem>
                                  <SelectItem value="X2">Draw or Away (X2)</SelectItem>
                                  <SelectItem value="12">Home or Away (12)</SelectItem>
                                  <SelectItem value="Over 0.5">Over 0.5 Goals</SelectItem>
                                  <SelectItem value="Over 1.5">Over 1.5 Goals</SelectItem>
                                  <SelectItem value="Over 2.5">Over 2.5 Goals</SelectItem>
                                  <SelectItem value="Over 3.5">Over 3.5 Goals</SelectItem>
                                  <SelectItem value="Under 0.5">Under 0.5 Goals</SelectItem>
                                  <SelectItem value="Under 1.5">Under 1.5 Goals</SelectItem>
                                  <SelectItem value="Under 2.5">Under 2.5 Goals</SelectItem>
                                  <SelectItem value="Under 3.5">Under 3.5 Goals</SelectItem>
                                  <SelectItem value="BTTS Yes">Both Teams to Score - Yes</SelectItem>
                                  <SelectItem value="BTTS No">Both Teams to Score - No</SelectItem>
                                  <SelectItem value="Home -1">Home -1 Handicap</SelectItem>
                                  <SelectItem value="Away -1">Away -1 Handicap</SelectItem>
                                  <SelectItem value="Home +1">Home +1 Handicap</SelectItem>
                                  <SelectItem value="Away +1">Away +1 Handicap</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Odds *</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="1"
                                placeholder="1.50"
                                value={customOdds}
                                onChange={(e) => setCustomOdds(e.target.value)}
                                className="bg-background"
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            onClick={addCustomMatch}
                            disabled={!customHomeTeam || !customAwayTeam || !customPrediction}
                            className="w-full bg-primary hover:bg-primary/90"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Custom Match
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>

                {/* Section 3: Selected Matches */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm">3</span>
                    Selected Matches ({matches.length})
                  </h3>

                  <div className="pl-8 space-y-3">
                    {matches.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-border rounded-lg">
                        <p className="text-muted-foreground text-sm">
                          No matches added yet. Select from today's matches or add a custom match.
                        </p>
                      </div>
                    ) : (
                      <>
                        {matches.map((match, index) => (
                          <Card key={index} className="p-3 bg-muted/30 border-border">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 space-y-2">
                                <p className="font-medium text-sm text-foreground">
                                  {match.homeTeam} vs {match.awayTeam}
                                </p>
                                {match.league && (
                                  <p className="text-xs text-muted-foreground">{match.league}</p>
                                )}
                                <div className="grid grid-cols-2 gap-2">
                                  <Select
                                    value={match.prediction}
                                    onValueChange={(v) => updateMatch(index, "prediction", v)}
                                  >
                                    <SelectTrigger className="h-8 text-sm bg-background">
                                      <SelectValue placeholder="Prediction" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Home Win">Home Win (1)</SelectItem>
                                      <SelectItem value="Draw">Draw (X)</SelectItem>
                                      <SelectItem value="Away Win">Away Win (2)</SelectItem>
                                      <SelectItem value="1X">1X</SelectItem>
                                      <SelectItem value="X2">X2</SelectItem>
                                      <SelectItem value="12">12</SelectItem>
                                      <SelectItem value="Over 1.5">Over 1.5</SelectItem>
                                      <SelectItem value="Over 2.5">Over 2.5</SelectItem>
                                      <SelectItem value="Under 2.5">Under 2.5</SelectItem>
                                      <SelectItem value="BTTS Yes">BTTS Yes</SelectItem>
                                      <SelectItem value="BTTS No">BTTS No</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="1"
                                    placeholder="Odds"
                                    value={match.odds}
                                    onChange={(e) => updateMatch(index, "odds", parseFloat(e.target.value) || 1)}
                                    className="h-8 text-sm bg-background"
                                  />
                                </div>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => removeMatch(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </Card>
                        ))}

                        <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                          <span className="font-medium text-foreground">Total Odds</span>
                          <span className="font-bold text-primary">@{totalOdds.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="px-6 py-4 border-t border-border shrink-0 bg-card">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!title || matches.length === 0 || matches.some((m) => !m.prediction)}
                className="bg-primary hover:bg-primary/90"
              >
                {editingTicket ? "Update Ticket" : "Create Ticket"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Modal */}
        <TicketPreviewModal
          ticket={previewTicket}
          open={!!previewTicket}
          onOpenChange={(open) => !open && setPreviewTicket(null)}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Ticket?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the ticket and all its matches.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
