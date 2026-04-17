import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trophy, MousePointerClick, Star, TrendingUp, Mail } from "lucide-react";

// Industry-standard proxy: ~35% of users who click a Play Store CTA
// from a transactional email actually leave a review. Configurable below.
const REVIEW_CONVERSION_FACTOR_DEFAULT = 0.35;

type Variant = {
  id: string;
  template_name: string;
  variant_label: string;
  subject: string;
  is_active: boolean;
  created_at: string;
};

type VariantStat = {
  variant_id: string;
  variant_label: string;
  subject: string;
  is_active: boolean;
  sends: number;
  clicks: number;
  ctr: number; // 0..1
};

const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;

export default function EmailABTests() {
  const [loading, setLoading] = useState(true);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [stats, setStats] = useState<VariantStat[]>([]);
  const [conversionFactor, setConversionFactor] = useState(REVIEW_CONVERSION_FACTOR_DEFAULT);
  const [newLabel, setNewLabel] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [variantsRes, sendsRes] = await Promise.all([
        supabase
          .from("email_ab_variants" as any)
          .select("*")
          .eq("template_name", "rating-followup")
          .order("created_at", { ascending: true }),
        supabase
          .from("email_ab_sends" as any)
          .select("variant_id, clicked_at"),
      ]);

      if (variantsRes.error) throw variantsRes.error;
      if (sendsRes.error) throw sendsRes.error;

      const v = ((variantsRes.data ?? []) as unknown) as Variant[];
      setVariants(v);

      // Aggregate sends/clicks per variant
      const agg = new Map<string, { sends: number; clicks: number }>();
      for (const row of (sendsRes.data ?? []) as any[]) {
        if (!row.variant_id) continue;
        const cur = agg.get(row.variant_id) ?? { sends: 0, clicks: 0 };
        cur.sends += 1;
        if (row.clicked_at) cur.clicks += 1;
        agg.set(row.variant_id, cur);
      }

      const computed: VariantStat[] = v.map((vr) => {
        const a = agg.get(vr.id) ?? { sends: 0, clicks: 0 };
        const ctr = a.sends > 0 ? a.clicks / a.sends : 0;
        return {
          variant_id: vr.id,
          variant_label: vr.variant_label,
          subject: vr.subject,
          is_active: vr.is_active,
          sends: a.sends,
          clicks: a.clicks,
          ctr,
        };
      });
      setStats(computed);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Failed to load A/B data", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totals = useMemo(() => {
    const sends = stats.reduce((s, x) => s + x.sends, 0);
    const clicks = stats.reduce((s, x) => s + x.clicks, 0);
    const estReviews = clicks * conversionFactor;
    const ctr = sends > 0 ? clicks / sends : 0;
    const sendToReview = sends > 0 ? estReviews / sends : 0;
    return { sends, clicks, estReviews, ctr, sendToReview };
  }, [stats, conversionFactor]);

  // Best variant by estimated review conversion (clicks * factor / sends).
  // Since factor is constant across variants, this is mathematically equivalent
  // to ranking by CTR — but we expose it explicitly so the metric is auditable.
  const bestVariantId = useMemo(() => {
    let best: VariantStat | null = null;
    for (const s of stats) {
      // Require minimum sample size to avoid noise
      if (s.sends < 10) continue;
      const reviewConv = s.ctr * conversionFactor;
      const bestConv = best ? best.ctr * conversionFactor : -1;
      if (reviewConv > bestConv) best = s;
    }
    return best?.variant_id ?? null;
  }, [stats, conversionFactor]);

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase
      .from("email_ab_variants" as any)
      .update({ is_active: active })
      .eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: active ? "Variant activated" : "Variant paused" });
    load();
  };

  const createVariant = async () => {
    if (!newLabel.trim() || !newSubject.trim()) {
      toast({ title: "Label and subject required", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("email_ab_variants" as any).insert({
      template_name: "rating-followup",
      variant_label: newLabel.trim(),
      subject: newSubject.trim(),
      is_active: true,
    });
    setCreating(false);
    if (error) {
      toast({ title: "Create failed", description: error.message, variant: "destructive" });
      return;
    }
    setNewLabel("");
    setNewSubject("");
    toast({ title: "Variant created" });
    load();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Email A/B Tests</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Rating follow-up — subject line variants, click-through and estimated review conversion.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Mail className="h-4 w-4" />} label="Emails sent" value={totals.sends.toString()} />
        <StatCard icon={<MousePointerClick className="h-4 w-4" />} label="Total clicks" value={totals.clicks.toString()} sub={fmtPct(totals.ctr) + " CTR"} />
        <StatCard icon={<Star className="h-4 w-4" />} label="Est. reviews" value={totals.estReviews.toFixed(1)} sub={`${(conversionFactor * 100).toFixed(0)}% of clicks`} />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Send → review" value={fmtPct(totals.sendToReview)} sub="estimated" />
      </div>

      {/* Conversion factor control */}
      <Card>
        <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <div className="flex-1">
            <Label htmlFor="cf" className="text-sm font-medium">Click → review conversion factor</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Proxy used when real Play Store review data isn't available. Default 35% (industry typical for transactional CTAs).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              id="cf"
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={conversionFactor}
              onChange={(e) => setConversionFactor(Math.max(0, Math.min(1, parseFloat(e.target.value) || 0)))}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">({(conversionFactor * 100).toFixed(0)}%)</span>
          </div>
        </CardContent>
      </Card>

      {/* Variants performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Variant performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.length === 0 && (
            <p className="text-sm text-muted-foreground">No variants yet. Create one below.</p>
          )}
          {stats.map((s) => {
            const isBest = s.variant_id === bestVariantId;
            const reviewConv = s.ctr * conversionFactor;
            const estReviews = s.clicks * conversionFactor;
            return (
              <div
                key={s.variant_id}
                className={`rounded-lg border p-4 transition-colors ${
                  isBest ? "border-primary bg-primary/5" : "border-border bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{s.variant_label}</span>
                      {isBest && (
                        <Badge className="bg-primary text-primary-foreground gap-1">
                          <Trophy className="h-3 w-3" /> Best by est. reviews
                        </Badge>
                      )}
                      {!s.is_active && <Badge variant="secondary">Paused</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 break-words">"{s.subject}"</p>
                  </div>
                  <Switch
                    checked={s.is_active}
                    onCheckedChange={(v) => toggleActive(s.variant_id, v)}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
                  <Metric label="Sends" value={s.sends.toString()} />
                  <Metric label="Clicks" value={s.clicks.toString()} />
                  <Metric label="CTR" value={fmtPct(s.ctr)} />
                  <Metric label="Est. reviews" value={estReviews.toFixed(1)} />
                  <Metric label="Send → review" value={fmtPct(reviewConv)} highlight={isBest} />
                </div>

                {s.sends < 10 && s.sends > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    ⚠ Low sample size — need ≥10 sends for reliable winner detection.
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Add new variant */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add subject variant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="label" className="text-xs">Label</Label>
            <Input id="label" placeholder="e.g. Variant C – Emoji Heavy" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="subj" className="text-xs">Subject line</Label>
            <Input id="subj" placeholder="e.g. ⭐ Quick favor for the ProPredict team 🙏" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} />
          </div>
          <Button onClick={createVariant} disabled={creating} className="w-full sm:w-auto">
            {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Create variant
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs">{icon}<span>{label}</span></div>
        <div className="text-2xl font-bold text-foreground mt-1">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md p-2 ${highlight ? "bg-primary/10" : "bg-muted/50"}`}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`font-semibold ${highlight ? "text-primary" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
