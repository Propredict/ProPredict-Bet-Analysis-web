import { useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Check, X, Search } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Ticket, ContentTier, ContentStatus } from "@/types/admin";
import { useTickets } from "@/hooks/useTickets";

/* ---------------- TYPES ---------------- */

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
  isLive?: boolean;
  minute?: number;
}

/* ---------------- MOCK MATCHES ---------------- */

const mockTodayMatches: TodayMatch[] = [
  { id: "m1", homeTeam: "Liverpool", awayTeam: "Man City", league: "Premier League", startTime: "15:00" },
  { id: "m2", homeTeam: "Barcelona", awayTeam: "Real Madrid", league: "La Liga", startTime: "21:00" },
];

const defaultMatch: MatchFormData = {
  match_name: "",
  prediction: "",
  odds: 1.5,
};

/* ================= COMPONENT ================= */

export default function ManageTickets() {
  const { tickets, isLoading, createTicket, updateTicket, deleteTicket } = useTickets(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMatchPickerOpen, setIsMatchPickerOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [tier, setTier] = useState<ContentTier>("daily");
  const [status, setStatus] = useState<ContentStatus>("draft");
  const [result, setResult] = useState<"pending" | "won" | "lost">("pending");
  const [matches, setMatches] = useState<MatchFormData[]>([{ ...defaultMatch }]);

  const totalOdds = matches.reduce((acc, m) => acc * (m.odds || 1), 1);

  /* ---------------- HELPERS ---------------- */

  const getResultBadge = (r?: string) => {
    if (r === "won") return <Badge className="bg-success/20 text-success">Won</Badge>;
    if (r === "lost") return <Badge className="bg-destructive/20 text-destructive">Lost</Badge>;
    return <Badge className="bg-warning/20 text-warning">Pending</Badge>;
  };

  /* ---------------- ACTIONS ---------------- */

  const handleCreate = () => {
    setEditingTicket(null);
    setTitle("");
    setTier("daily");
    setStatus("draft");
    setResult("pending");
    setMatches([{ ...defaultMatch }]);
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
      })) || [{ ...defaultMatch }],
    );
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingTicket) {
      await updateTicket.mutateAsync({
        id: editingTicket.id,
        updates: { title, tier, status, result },
        matches,
      });
    } else {
      await createTicket.mutateAsync({
        ticket: { title, tier, status, result, total_odds: totalOdds },
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

  /* ================= UI ================= */

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between">
          <h1 className="text-2xl font-bold">Manage Tickets</h1>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Ticket
          </Button>
        </div>

        {isLoading ? (
          <Loader2 className="animate-spin" />
        ) : (
          tickets.map((ticket) => (
            <Card key={ticket.id} className="p-4">
              <div className="flex justify-between">
                <div>
                  <div className="flex gap-2 mb-1">
                    <Badge>{ticket.tier}</Badge>
                    <Badge>{ticket.status}</Badge>
                    {getResultBadge((ticket as any).result)}
                  </div>
                  <p className="font-semibold">{ticket.title}</p>
                  <p>Total odds: @{ticket.total_odds}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(ticket)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDeleteId(ticket.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTicket ? "Edit Ticket" : "Create Ticket"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />

            <Label>Tier</Label>
            <Select value={tier} onValueChange={(v) => setTier(v as ContentTier)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="exclusive">Exclusive</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>

            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ContentStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>

            <Label>Result</Label>
            <Select value={result} onValueChange={(v) => setResult(v as any)}>
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

          <DialogFooter>
            <Button onClick={handleSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ticket</AlertDialogTitle>
            <AlertDialogDescription>Are you sure?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
