import { useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Search, X, Sparkles, Calendar } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import type { Ticket, ContentTier, ContentStatus } from "@/types/admin";
import { format } from "date-fns";

/* =====================
   Types
===================== */

type TicketResult = "pending" | "won" | "lost";

interface MatchFormData {
  match_name: string;
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

  // form state
  const [title, setTitle] = useState("");
  const [tier, setTier] = useState<ContentTier>("daily");
  const [status, setStatus] = useState<ContentStatus>("draft");
  const [result, setResult] = useState<TicketResult>("pending");
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
    setResult((ticket as any).result ?? "pending");
    setMatches(
      ticket.matches?.map((m) => ({
        match_name: m.match_name,
        prediction: m.prediction,
        odds: m.odds,
      })) ?? [],
    );
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (matches.length === 0) {
      return;
    }

    if (editingTicket) {
      await updateTicket.mutateAsync({
        id: editingTicket.id,
        updates: {
          title,
          tier,
          status,
          result,
          total_odds: totalOdds,
        },
        matches,
      });
    } else {
      await createTicket.mutateAsync({
        ticket: {
          title,
          tier,
          status,
          result,
          total_odds: totalOdds,
        } as any,
        matches,
      });
    }

    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteTicket.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const addMatchFromFixture = (fixture: any) => {
    const matchName = `${fixture.homeTeam} vs ${fixture.awayTeam} - ${fixture.league}`;
    if (!matches.find((m) => m.match_name === matchName)) {
      setMatches([...matches, { match_name: matchName, prediction: "", odds: 1.5 }]);
    }
  };

  const addCustomMatch = () => {
    if (customHomeTeam && customAwayTeam && customPrediction) {
      const matchName = customLeague 
        ? `${customHomeTeam} vs ${customAwayTeam} - ${customLeague}`
        : `${customHomeTeam} vs ${customAwayTeam}`;
      setMatches([
        ...matches,
        {
          match_name: matchName,
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
     Badges
  ===================== */

  const resultBadge = (r: TicketResult) => {
    if (r === "won") return <Badge className="bg-success/20 text-success">WON</Badge>;
    if (r === "lost") return <Badge className="bg-destructive/20 text-destructive">LOST</Badge>;
    return <Badge variant="outline">PENDING</Badge>;
  };

  const tierBadge = (t: ContentTier) => {
    switch (t) {
      case "daily":
        return <Badge className="bg-primary/20 text-primary">DAILY</Badge>;
      case "exclusive":
        return <Badge className="bg-accent/20 text-accent">PRO</Badge>;
      case "premium":
        return <Badge className="bg-warning/20 text-warning">PREMIUM</Badge>;
      default:
        return <Badge>{t.toUpperCase()}</Badge>;
    }
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
              <Card key={t.id} className="p-4 bg-card border-border">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {resultBadge((t as any).result ?? "pending")}
                      {tierBadge(t.tier)}
                      <Badge variant={t.status === "published" ? "default" : "secondary"}>
                        {t.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="font-semibold text-foreground">{t.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Total Odds: @{t.total_odds.toFixed(2)} • {t.matches?.length || 0} matches
                    </p>
                    {t.matches && t.matches.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {t.matches.slice(0, 3).map((m, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {m.match_name.split(" - ")[0]}
                          </Badge>
                        ))}
                        {t.matches.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{t.matches.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteId(t.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
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
                {/* Basic Info Section */}
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
                  </div>
                </div>

                {/* Match Selection Section */}
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
                                const matchName = `${fixture.homeTeam} vs ${fixture.awayTeam} - ${fixture.league}`;
                                const isSelected = matches.some((m) => m.match_name === matchName);
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
                                placeholder="Home team name"
                                value={customHomeTeam}
                                onChange={(e) => setCustomHomeTeam(e.target.value)}
                                className="bg-background"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Away Team *</Label>
                              <Input
                                placeholder="Away team name"
                                value={customAwayTeam}
                                onChange={(e) => setCustomAwayTeam(e.target.value)}
                                className="bg-background"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>League (optional)</Label>
                            <Input
                              placeholder="League name"
                              value={customLeague}
                              onChange={(e) => setCustomLeague(e.target.value)}
                              className="bg-background"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label>Prediction *</Label>
                              <Input
                                placeholder="e.g., Home Win, Over 2.5"
                                value={customPrediction}
                                onChange={(e) => setCustomPrediction(e.target.value)}
                                className="bg-background"
                              />
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

                {/* Selected Matches Section */}
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
                                <p className="font-medium text-sm text-foreground">{match.match_name}</p>
                                <div className="grid grid-cols-2 gap-2">
                                  <Input
                                    placeholder="Prediction"
                                    value={match.prediction}
                                    onChange={(e) => updateMatch(index, "prediction", e.target.value)}
                                    className="h-8 text-sm bg-background"
                                  />
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
