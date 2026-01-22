import { useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Check, X } from "lucide-react";
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
import { useTickets } from "@/hooks/useTickets";
import { Ticket, TicketInsert, ContentTier, ContentStatus } from "@/types/admin";

interface MatchFormData {
  match_name: string;
  prediction: string;
  odds: number;
}

const defaultTicket: Omit<TicketInsert, "created_at" | "total_odds"> = {
  title: "",
  tier: "daily",
  status: "draft",
};

const defaultMatch: MatchFormData = {
  match_name: "",
  prediction: "",
  odds: 1.5,
};

export default function ManageTickets() {
  const { tickets, isLoading, createTicket, updateTicket, deleteTicket } = useTickets(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [formData, setFormData] = useState<Omit<TicketInsert, "created_at" | "total_odds">>(defaultTicket);
  const [matches, setMatches] = useState<MatchFormData[]>([{ ...defaultMatch }]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const totalOdds = matches.reduce((acc, m) => acc * (m.odds || 1), 1);

  const handleCreate = () => {
    setEditingTicket(null);
    setFormData(defaultTicket);
    setMatches([{ ...defaultMatch }]);
    setIsDialogOpen(true);
  };

  const handleEdit = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setFormData({
      title: ticket.title,
      tier: ticket.tier,
      status: ticket.status,
    });
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

  const handleSubmit = async () => {
    const today = new Date().toISOString().split("T")[0];
    
    if (editingTicket) {
      await updateTicket.mutateAsync({
        id: editingTicket.id,
        updates: formData,
        matches: matches,
      });
    } else {
      await createTicket.mutateAsync({
        ticket: { ...formData, created_at: today, total_odds: totalOdds },
        matches: matches,
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

  const getTierBadge = (tier: ContentTier) => {
    const variants: Record<ContentTier, string> = {
      free: "bg-success/20 text-success",
      daily: "bg-primary/20 text-primary",
      exclusive: "bg-accent/20 text-accent",
      premium: "bg-warning/20 text-warning",
    };
    return <Badge className={variants[tier]}>{tier.toUpperCase()}</Badge>;
  };

  const getStatusBadge = (status: ContentStatus) => {
    return status === "published" ? (
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

  const isPending = createTicket.isPending || updateTicket.isPending;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Manage Tickets</h1>
            <p className="text-muted-foreground">Create and manage betting tickets</p>
          </div>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Ticket
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : tickets.length === 0 ? (
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
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Weekend Accumulator"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Access Level</Label>
                  <Select
                    value={formData.tier}
                    onValueChange={(value: ContentTier) => setFormData({ ...formData, tier: value })}
                  >
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
                  <Select
                    value={formData.status}
                    onValueChange={(value: ContentStatus) => setFormData({ ...formData, status: value })}
                  >
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
                  <Card key={index} className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 grid gap-3">
                        <Input
                          value={match.match_name}
                          onChange={(e) => handleMatchChange(index, "match_name", e.target.value)}
                          placeholder="Match name (e.g., Liverpool vs Man City)"
                        />
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
              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingTicket ? "Update" : "Create"}
              </Button>
            </DialogFooter>
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
                {deleteTicket.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
