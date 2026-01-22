import { useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Check, X, Search } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Ticket, ContentTier, ContentStatus } from "@/types/admin";

interface MatchFormData {
  match_name: string;
  prediction: string;
  odds: number;
}

interface TodayMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  startTime: string;
}

// Mock today's matches (simulating Live Scores data)
const mockTodayMatches: TodayMatch[] = [
  { id: "m1", homeTeam: "Liverpool", awayTeam: "Manchester City", league: "Premier League", startTime: "15:00" },
  { id: "m2", homeTeam: "Arsenal", awayTeam: "Chelsea", league: "Premier League", startTime: "17:30" },
  { id: "m3", homeTeam: "Barcelona", awayTeam: "Real Madrid", league: "La Liga", startTime: "21:00" },
  { id: "m4", homeTeam: "Bayern Munich", awayTeam: "Borussia Dortmund", league: "Bundesliga", startTime: "18:30" },
  { id: "m5", homeTeam: "PSG", awayTeam: "Marseille", league: "Ligue 1", startTime: "20:45" },
  { id: "m6", homeTeam: "Juventus", awayTeam: "AC Milan", league: "Serie A", startTime: "20:00" },
  { id: "m7", homeTeam: "Inter Milan", awayTeam: "Napoli", league: "Serie A", startTime: "18:00" },
  { id: "m8", homeTeam: "Atletico Madrid", awayTeam: "Sevilla", league: "La Liga", startTime: "16:15" },
];

// Mock tickets data
const mockTickets: Ticket[] = [
  {
    id: "1",
    title: "Weekend Accumulator",
    total_odds: 12.45,
    tier: "premium",
    status: "published",
    created_at: new Date().toISOString().split("T")[0],
    created_at_ts: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    matches: [
      { id: "tm1", ticket_id: "1", match_name: "Liverpool vs Manchester City", prediction: "Over 2.5 Goals", odds: 1.85, sort_order: 1, created_at: "" },
      { id: "tm2", ticket_id: "1", match_name: "Barcelona vs Real Madrid", prediction: "BTTS", odds: 1.65, sort_order: 2, created_at: "" },
      { id: "tm3", ticket_id: "1", match_name: "Bayern Munich vs Dortmund", prediction: "Bayern Win", odds: 1.55, sort_order: 3, created_at: "" },
    ],
  },
  {
    id: "2",
    title: "Safe Bets",
    total_odds: 3.25,
    tier: "daily",
    status: "published",
    created_at: new Date().toISOString().split("T")[0],
    created_at_ts: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    matches: [
      { id: "tm4", ticket_id: "2", match_name: "PSG vs Marseille", prediction: "PSG Win", odds: 1.45, sort_order: 1, created_at: "" },
      { id: "tm5", ticket_id: "2", match_name: "Juventus vs AC Milan", prediction: "Under 3.5 Goals", odds: 1.55, sort_order: 2, created_at: "" },
    ],
  },
];

const defaultMatch: MatchFormData = {
  match_name: "",
  prediction: "",
  odds: 1.5,
};

export default function ManageTickets() {
  // Local state for tickets
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets);
  
  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMatchPickerOpen, setIsMatchPickerOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [tier, setTier] = useState<ContentTier>("daily");
  const [status, setStatus] = useState<ContentStatus>("draft");
  const [matches, setMatches] = useState<MatchFormData[]>([{ ...defaultMatch }]);
  
  // Match picker state
  const [matchPickerIndex, setMatchPickerIndex] = useState<number>(0);
  const [matchSearchQuery, setMatchSearchQuery] = useState("");

  const totalOdds = matches.reduce((acc, m) => acc * (m.odds || 1), 1);

  const filteredTodayMatches = mockTodayMatches.filter(
    (m) =>
      m.homeTeam.toLowerCase().includes(matchSearchQuery.toLowerCase()) ||
      m.awayTeam.toLowerCase().includes(matchSearchQuery.toLowerCase()) ||
      m.league.toLowerCase().includes(matchSearchQuery.toLowerCase())
  );

  const handleCreate = () => {
    setEditingTicket(null);
    setTitle("");
    setTier("daily");
    setStatus("draft");
    setMatches([{ ...defaultMatch }]);
    setIsDialogOpen(true);
  };

  const handleEdit = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setTitle(ticket.title);
    setTier(ticket.tier);
    setStatus(ticket.status);
    setMatches(
      ticket.matches?.map((m) => ({
        match_name: m.match_name,
        prediction: m.prediction,
        odds: m.odds,
      })) || [{ ...defaultMatch }]
    );
    setIsDialogOpen(true);
  };

  const handleAddMatch = () => {
    setMatches([...matches, { ...defaultMatch }]);
  };

  const handleRemoveMatch = (index: number) => {
    if (matches.length > 1) {
      setMatches(matches.filter((_, i) => i !== index));
    }
  };

  const handleMatchChange = (index: number, field: keyof MatchFormData, value: string | number) => {
    const updated = [...matches];
    updated[index] = { ...updated[index], [field]: value };
    setMatches(updated);
  };

  const openMatchPicker = (index: number) => {
    setMatchPickerIndex(index);
    setMatchSearchQuery("");
    setIsMatchPickerOpen(true);
  };

  const selectMatch = (todayMatch: TodayMatch) => {
    const updated = [...matches];
    updated[matchPickerIndex] = {
      ...updated[matchPickerIndex],
      match_name: `${todayMatch.homeTeam} vs ${todayMatch.awayTeam}`,
    };
    setMatches(updated);
    setIsMatchPickerOpen(false);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    const today = new Date().toISOString().split("T")[0];
    const calculatedTotalOdds = matches.reduce((acc, m) => acc * (m.odds || 1), 1);

    if (editingTicket) {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === editingTicket.id
            ? {
                ...t,
                title,
                tier,
                status,
                total_odds: calculatedTotalOdds,
                matches: matches.map((m, idx) => ({
                  id: `tm-${Date.now()}-${idx}`,
                  ticket_id: editingTicket.id,
                  match_name: m.match_name,
                  prediction: m.prediction,
                  odds: m.odds,
                  sort_order: idx + 1,
                  created_at: "",
                })),
              }
            : t
        )
      );
    } else {
      const newId = crypto.randomUUID();
      const newTicket: Ticket = {
        id: newId,
        title,
        tier,
        status,
        total_odds: calculatedTotalOdds,
        created_at: today,
        created_at_ts: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        matches: matches.map((m, idx) => ({
          id: `tm-${Date.now()}-${idx}`,
          ticket_id: newId,
          match_name: m.match_name,
          prediction: m.prediction,
          odds: m.odds,
          sort_order: idx + 1,
          created_at: "",
        })),
      };
      setTickets((prev) => [newTicket, ...prev]);
    }

    setIsSubmitting(false);
    setIsDialogOpen(false);
  };

  const handleDelete = () => {
    if (deleteId) {
      setTickets((prev) => prev.filter((t) => t.id !== deleteId));
      setDeleteId(null);
    }
  };

  const getTierBadge = (t: ContentTier) => {
    const variants: Record<ContentTier, string> = {
      free: "bg-success/20 text-success",
      daily: "bg-primary/20 text-primary",
      exclusive: "bg-accent/20 text-accent",
      premium: "bg-warning/20 text-warning",
    };
    return <Badge className={variants[t]}>{t.toUpperCase()}</Badge>;
  };

  const getStatusBadge = (s: ContentStatus) => {
    return s === "published" ? (
      <Badge className="bg-success/20 text-success">
        <Check className="h-3 w-3 mr-1" />
        Published
      </Badge>
    ) : (
      <Badge variant="outline" className="text-muted-foreground">
        Draft
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Manage Tickets</h1>
            <p className="text-muted-foreground">Create and manage multi-match betting tickets</p>
          </div>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Ticket
          </Button>
        </div>

        {tickets.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No tickets yet. Create your first ticket!</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {tickets.map((ticket) => (
              <Card key={ticket.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getTierBadge(ticket.tier)}
                      {getStatusBadge(ticket.status)}
                      <span className="text-xs text-muted-foreground">{ticket.created_at}</span>
                    </div>
                    <p className="font-medium text-foreground">{ticket.title}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm text-muted-foreground">
                        {ticket.matches?.length || 0} matches
                      </span>
                      <span className="text-sm text-primary font-bold">
                        Total: @{ticket.total_odds.toFixed(2)}
                      </span>
                    </div>
                    {ticket.matches && ticket.matches.length > 0 && (
                      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                        {ticket.matches.slice(0, 3).map((m, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{m.match_name}: {m.prediction}</span>
                            <span className="text-primary">@{m.odds.toFixed(2)}</span>
                          </div>
                        ))}
                        {ticket.matches.length > 3 && (
                          <p className="text-xs">+{ticket.matches.length - 3} more</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(ticket)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => setDeleteId(ticket.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTicket ? "Edit Ticket" : "Create Ticket"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Weekend Accumulator"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Access Level</Label>
                  <Select value={tier} onValueChange={(v: ContentTier) => setTier(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="exclusive">Exclusive</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v: ContentStatus) => setStatus(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Matches</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddMatch}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Match
                  </Button>
                </div>

                {matches.map((match, index) => (
                  <Card key={index} className="p-3 bg-muted/30">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 grid gap-3">
                        <div className="flex gap-2">
                          <Input
                            value={match.match_name}
                            onChange={(e) => handleMatchChange(index, "match_name", e.target.value)}
                            placeholder="Match name (e.g., Liverpool vs Man City)"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => openMatchPicker(index)}
                            className="shrink-0"
                          >
                            <Search className="h-4 w-4 mr-1" />
                            Choose
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            value={match.prediction}
                            onChange={(e) => handleMatchChange(index, "prediction", e.target.value)}
                            placeholder="Prediction"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            min="1"
                            value={match.odds}
                            onChange={(e) => handleMatchChange(index, "odds", parseFloat(e.target.value) || 1)}
                            placeholder="Odds"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMatch(index)}
                        disabled={matches.length === 1}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}

                <div className="text-right">
                  <span className="text-sm text-muted-foreground">Total Odds: </span>
                  <span className="text-lg font-bold text-primary">@{totalOdds.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingTicket ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Match Picker Modal */}
        <Dialog open={isMatchPickerOpen} onOpenChange={setIsMatchPickerOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Choose Match</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={matchSearchQuery}
                  onChange={(e) => setMatchSearchQuery(e.target.value)}
                  placeholder="Search matches..."
                  className="pl-9"
                />
              </div>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2 pr-4">
                  {filteredTodayMatches.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No matches found</p>
                  ) : (
                    filteredTodayMatches.map((m) => (
                      <Card
                        key={m.id}
                        className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => selectMatch(m)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">
                              {m.homeTeam} vs {m.awayTeam}
                            </p>
                            <p className="text-xs text-muted-foreground">{m.league}</p>
                          </div>
                          <span className="text-sm text-muted-foreground">{m.startTime}</span>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Ticket</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this ticket? This will also delete all matches in this ticket.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
