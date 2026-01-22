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
import { useTips } from "@/hooks/useTips";
import { Tip, TipInsert, ContentTier, ContentStatus } from "@/types/admin";

const defaultTip: Omit<TipInsert, "created_at"> = {
  home_team: "",
  away_team: "",
  league: "",
  prediction: "",
  odds: 1.5,
  confidence: 70,
  kickoff: "Today",
  tier: "daily",
  status: "draft",
};

export default function ManageTips() {
  const { tips, isLoading, createTip, updateTip, deleteTip } = useTips(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTip, setEditingTip] = useState<Tip | null>(null);
  const [formData, setFormData] = useState<Omit<TipInsert, "created_at">>(defaultTip);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = () => {
    setEditingTip(null);
    setFormData(defaultTip);
    setIsDialogOpen(true);
  };

  const handleEdit = (tip: Tip) => {
    setEditingTip(tip);
    setFormData({
      home_team: tip.home_team,
      away_team: tip.away_team,
      league: tip.league,
      prediction: tip.prediction,
      odds: tip.odds,
      confidence: tip.confidence,
      kickoff: tip.kickoff,
      tier: tip.tier,
      status: tip.status,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const today = new Date().toISOString().split("T")[0];
    
    if (editingTip) {
      await updateTip.mutateAsync({ 
        id: editingTip.id, 
        updates: formData 
      });
    } else {
      await createTip.mutateAsync({ 
        ...formData, 
        created_at: today 
      });
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteTip.mutateAsync(deleteId);
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

  const isPending = createTip.isPending || updateTip.isPending;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Manage Tips</h1>
            <p className="text-muted-foreground">Create and manage betting tips</p>
          </div>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Tip
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : tips.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No tips yet. Create your first tip!</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {tips.map((tip) => (
              <Card key={tip.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getTierBadge(tip.tier)}
                      {getStatusBadge(tip.status)}
                      <span className="text-xs text-muted-foreground">{tip.created_at}</span>
                    </div>
                    <p className="font-medium text-foreground">
                      {tip.home_team} vs {tip.away_team}
                    </p>
                    <p className="text-sm text-muted-foreground">{tip.league}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm">
                        <strong>Prediction:</strong> {tip.prediction}
                      </span>
                      <span className="text-sm text-primary font-bold">
                        @{tip.odds.toFixed(2)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {tip.confidence}% confidence
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(tip)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => setDeleteId(tip.id)}
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
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTip ? "Edit Tip" : "Create Tip"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Home Team</Label>
                  <Input
                    value={formData.home_team}
                    onChange={(e) => setFormData({ ...formData, home_team: e.target.value })}
                    placeholder="e.g., Liverpool"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Away Team</Label>
                  <Input
                    value={formData.away_team}
                    onChange={(e) => setFormData({ ...formData, away_team: e.target.value })}
                    placeholder="e.g., Manchester City"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>League</Label>
                <Input
                  value={formData.league}
                  onChange={(e) => setFormData({ ...formData, league: e.target.value })}
                  placeholder="e.g., Premier League"
                />
              </div>
              <div className="space-y-2">
                <Label>Prediction</Label>
                <Input
                  value={formData.prediction}
                  onChange={(e) => setFormData({ ...formData, prediction: e.target.value })}
                  placeholder="e.g., Over 2.5 Goals"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Odds</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    value={formData.odds}
                    onChange={(e) => setFormData({ ...formData, odds: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confidence %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.confidence}
                    onChange={(e) => setFormData({ ...formData, confidence: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kickoff</Label>
                  <Input
                    value={formData.kickoff}
                    onChange={(e) => setFormData({ ...formData, kickoff: e.target.value })}
                    placeholder="Today, 20:00"
                  />
                </div>
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingTip ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Tip</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this tip? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteTip.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
