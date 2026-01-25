import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  XCircle,
  CheckCircle,
  Sparkles,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { useTips } from "@/hooks/useTips";
import type {
  Tip,
  TipInsert,
  ContentTier,
  ContentStatus,
  TipResult,
} from "@/types/admin";

/* =====================
   Defaults
===================== */

const defaultTip: TipInsert & { result: TipResult } = {
  home_team: "",
  away_team: "",
  league: "",
  prediction: "",
  odds: 1.5,
  confidence: 70,
  ai_prediction: "",
  tier: "daily",
  status: "draft",
  result: "pending",
};

/* =====================
   Component
===================== */

export default function ManageTips() {
  const { tips, isLoading, createTip, updateTip, deleteTip } = useTips(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTip, setEditingTip] = useState<Tip | null>(null);
  const [formData, setFormData] = useState(defaultTip);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* =====================
     Handlers
  ===================== */

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
      confidence: tip.confidence ?? 70,
      ai_prediction: tip.ai_prediction || "",
      tier: tip.tier,
      status: tip.status,
      result: tip.result ?? "pending",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingTip) {
      await updateTip.mutateAsync({
        id: editingTip.id,
        updates: formData,
      });
    } else {
      await createTip.mutateAsync(formData);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteTip.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleMarkResult = async (id: string, result: TipResult) => {
    await updateTip.mutateAsync({
      id,
      updates: { result },
    });
  };

  /* =====================
     Helpers
  ===================== */

  const tierBadge = (tier: ContentTier) => {
    const map: Record<ContentTier, string> = {
      free: "bg-success/20 text-success",
      daily: "bg-primary/20 text-primary",
      exclusive: "bg-accent/20 text-accent",
      premium: "bg-warning/20 text-warning",
    };
    return <Badge className={map[tier]}>{tier.toUpperCase()}</Badge>;
  };

  const resultBadge = (result: TipResult) => {
    if (result === "won")
      return <Badge className="bg-success/20 text-success">WON</Badge>;
    if (result === "lost")
      return <Badge className="bg-destructive/20 text-destructive">LOST</Badge>;
    return <Badge variant="outline">PENDING</Badge>;
  };

  /* =====================
     Render
  ===================== */

  return (
    <div className="section-gap max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="font-bold">Manage Tips</h1>
        <Button size="sm" onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-1" /> Add Tip
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-10 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </Card>
      ) : (
        <div className="grid gap-4">
          {tips.map((tip) => (
            <Card key={tip.id} className="p-4">
              <div className="flex justify-between gap-4">
                <div className="flex-1">
                  <div className="flex gap-2 mb-1">
                    {tierBadge(tip.tier)}
                    {resultBadge(tip.result)}
                  </div>

                  <p className="font-semibold">
                    {tip.home_team} vs {tip.away_team}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {tip.league}
                  </p>

                  <div className="flex gap-4 mt-2 text-sm">
                    <span>{tip.prediction}</span>
                    <span className="font-bold text-primary">
                      @{tip.odds}
                    </span>
                    <span>{tip.confidence}%</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button size="icon" variant="outline" onClick={() => handleEdit(tip)}>
                    <Pencil className="h-4 w-4" />
                  </Button>

                  <Button
                    size="icon"
                    variant="outline"
                    className="text-success"
                    disabled={tip.result === "won"}
                    onClick={() => handleMarkResult(tip.id, "won")}
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>

                  <Button
                    size="icon"
                    variant="outline"
                    className="text-destructive"
                    disabled={tip.result === "lost"}
                    onClick={() => handleMarkResult(tip.id, "lost")}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>

                  <Button
                    size="icon"
                    variant="outline"
                    className="text-destructive"
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

      {/* CREATE / EDIT TIP – TICKET STYLE */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-3xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>
              {editingTip ? "Edit Tip" : "Create Tip"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <Card className="p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Tip Info
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Home Team</Label>
                  <Input
                    value={formData.home_team}
                    onChange={(e) =>
                      setFormData({ ...formData, home_team: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label>Away Team</Label>
                  <Input
                    value={formData.away_team}
                    onChange={(e) =>
                      setFormData({ ...formData, away_team: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label>League</Label>
                  <Input
                    value={formData.league}
                    onChange={(e) =>
                      setFormData({ ...formData, league: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label>Prediction</Label>
                  <Input
                    value={formData.prediction}
                    onChange={(e) =>
                      setFormData({ ...formData, prediction: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label>Odds</Label>
                  <Input
                    type="number"
                    value={formData.odds}
                    onChange={(e) =>
                      setFormData({ ...formData, odds: Number(e.target.value) })
                    }
                  />
                </div>

                <div>
                  <Label>Confidence %</Label>
                  <Input
                    type="number"
                    value={formData.confidence}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confidence: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="mt-4">
                <Label>AI Analysis</Label>
                <Textarea
                  value={formData.ai_prediction}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      ai_prediction: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>Tier</Label>
                  <Select
                    value={formData.tier}
                    onValueChange={(v: ContentTier) =>
                      setFormData({ ...formData, tier: v })
                    }
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

                <div>
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v: ContentStatus) =>
                      setFormData({ ...formData, status: v })
                    }
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
            </Card>
          </div>

          <DialogFooter className="p-4 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingTip ? "Update Tip" : "Create Tip"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tip?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
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
