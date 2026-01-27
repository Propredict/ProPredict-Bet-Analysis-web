import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

// Get today's date in Belgrade timezone (YYYY-MM-DD)
function getTodayBelgradeDate() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Belgrade",
  });
}

const defaultTip: TipInsert & { result: TipResult; tip_date?: string } = {
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
  tip_date: getTodayBelgradeDate(),
};

/* =====================
   Prediction options
===================== */

const PREDICTIONS = [
  "Home Win",
  "Draw",
  "Away Win",
  "1X",
  "X2",
  "12",
  "Over 0.5",
  "Over 1.5",
  "Over 2.5",
  "Over 3.5",
  "Under 0.5",
  "Under 1.5",
  "Under 2.5",
  "Under 3.5",
  "BTTS Yes",
  "BTTS No",
];

/* =====================
   Component
===================== */

export default function ManageTips() {
  const { tips, isLoading, createTip, updateTip, deleteTip } = useTips(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTip, setEditingTip] = useState<Tip | null>(null);
  const [formData, setFormData] = useState(defaultTip);
  const [customPrediction, setCustomPrediction] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* =====================
     Handlers
  ===================== */

  const handleCreate = () => {
    setEditingTip(null);
    setFormData(defaultTip);
    setCustomPrediction("");
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
      tip_date: tip.tip_date || getTodayBelgradeDate(),
    });
    setCustomPrediction("");
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      ...formData,
      prediction: customPrediction || formData.prediction,
    };

    if (editingTip) {
      await updateTip.mutateAsync({
        id: editingTip.id,
        updates: payload,
      });
    } else {
      await createTip.mutateAsync(payload);
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

  // Check if tip is scheduled (future date)
  const isScheduled = (tipDate: string | null | undefined) => {
    if (!tipDate) return false;
    const today = getTodayBelgradeDate();
    return tipDate > today;
  };

  /* =====================
     Render
  ===================== */

  return (
    <div className="section-gap max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="font-bold text-lg">Manage Tips</h1>
        <Button onClick={handleCreate} className="gap-1">
          <Plus className="h-4 w-4" />
          Add Tip
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
                  <div className="flex gap-2 mb-1 flex-wrap">
                    {tierBadge(tip.tier)}
                    {isScheduled(tip.tip_date) ? (
                      <Badge className="bg-blue-500/20 text-blue-500">SCHEDULED</Badge>
                    ) : (
                      resultBadge(tip.result ?? "pending")
                    )}
                    {tip.tip_date && (
                      <Badge variant="outline" className="text-xs">
                        {format(new Date(tip.tip_date + "T00:00:00"), "MMM d, yyyy")}
                      </Badge>
                    )}
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
                      @{tip.odds.toFixed(2)}
                    </span>
                    <span>{tip.confidence}%</span>
                  </div>
                </div>

                {/* ACTIONS – SAME AS TICKETS */}
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(tip)}>
                    <Pencil className="h-4 w-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="text-success"
                    disabled={tip.result === "won"}
                    onClick={() => handleMarkResult(tip.id, "won")}
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    disabled={tip.result === "lost"}
                    onClick={() => handleMarkResult(tip.id, "lost")}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>

                  <Button
                    size="sm"
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

      {/* CREATE / EDIT TIP MODAL */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTip ? "Edit Tip" : "Create Tip"}
            </DialogTitle>
          </DialogHeader>

          <Card className="p-4 space-y-4">
            <h3 className="font-semibold">Tip Info</h3>

            {/* TEAMS */}
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

            {/* PREDICTION */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prediction (select)</Label>
                <Select
                  value={formData.prediction}
                  onValueChange={(v) =>
                    setFormData({ ...formData, prediction: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select prediction" />
                  </SelectTrigger>
                  <SelectContent>
                    {PREDICTIONS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Custom Prediction</Label>
                <Input
                  placeholder="e.g. Correct Score 2-1"
                  value={customPrediction}
                  onChange={(e) => setCustomPrediction(e.target.value)}
                />
              </div>
            </div>

            {/* ODDS */}
            <div>
              <Label>Odds</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.odds}
                onChange={(e) =>
                  setFormData({ ...formData, odds: Number(e.target.value) })
                }
              />
            </div>

            {/* AI */}
            <div>
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

            {/* TIER / STATUS / RESULT – SAME AS TICKET */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Tier</Label>
                <Select
                  value={formData.tier}
                  onValueChange={(v) =>
                    setFormData({ ...formData, tier: v as ContentTier })
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
                  onValueChange={(v) =>
                    setFormData({ ...formData, status: v as ContentStatus })
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

              <div>
                <Label>Publish Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.tip_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.tip_date
                        ? format(new Date(formData.tip_date + "T00:00:00"), "PPP")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.tip_date ? new Date(formData.tip_date + "T00:00:00") : undefined}
                      onSelect={(date) =>
                        setFormData({
                          ...formData,
                          tip_date: date ? format(date, "yyyy-MM-dd") : getTodayBelgradeDate(),
                        })
                      }
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>Result</Label>
                <Select
                  value={formData.result}
                  onValueChange={(v) =>
                    setFormData({ ...formData, result: v as TipResult })
                  }
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
            </div>
          </Card>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tip?</AlertDialogTitle>
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
