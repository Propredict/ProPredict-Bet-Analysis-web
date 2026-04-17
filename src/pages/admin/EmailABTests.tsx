import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trophy, MousePointerClick, Star, TrendingUp, Mail, Save } from "lucide-react";

// Realistic baseline: ~20% of users who click a Play Store CTA from a
// transactional email actually leave a review. Admin can tune this in the UI
// based on real observed Play Store data.
const REVIEW_CONVERSION_FACTOR_DEFAULT = 0.20;
const STORAGE_KEY = "email_ab_review_conversion_factor";

// Winner score weights — equal weight on raw clicks and estimated reviews so
// we optimize for actual review conversion, not just CTR.
const WEIGHT_CLICKS = 0.5;
const WEIGHT_REVIEWS = 0.5;
const MIN_SENDS_FOR_WINNER = 10;

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
  const [conversionFactor, setConversionFactor] = useState<number>(() => {
    if (typeof window === "undefined") return REVIEW_CONVERSION_FACTOR_DEFAULT;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? parseFloat(saved) : NaN;
    return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : REVIEW_CONVERSION_FACTOR_DEFAULT;
  });
  const [factorDraft, setFactorDraft] = useState<string>("");
  const [newLabel, setNewLabel] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setFactorDraft((conversionFactor * 100).toFixed(0));
  }, [conversionFactor]);

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

  // Weighted comparison: rank variants by (clicks * 0.5 + estReviews * 0.5).
  // This balances raw trusted volume (clicks) with downstream review impact.
  const ranked = useMemo(() => {
    const maxClicks = Math.max(1, ...stats.map((s) => s.clicks));
    const withScore = stats.map((s) => {
      const estReviews = s.clicks * conversionFactor;
      // Normalize both metrics to 0..1 against the strongest variant so
      // the weighted score is comparable regardless of absolute volume.
      const clicksNorm = s.clicks / maxClicks;
      const reviewsNorm = (s.clicks * conversionFactor) / (maxClicks * conversionFactor || 1);
      const score = clicksNorm * WEIGHT_CLICKS + reviewsNorm * WEIGHT_REVIEWS;
      return { ...s, estReviews, score };
    });
    return withScore.sort((a, b) => b.score - a.score);
  }, [stats, conversionFactor]);

  const bestVariantId = useMemo(() => {
    const eligible = ranked.filter((s) => s.sends >= MIN_SENDS_FOR_WINNER && s.clicks > 0);
    return eligible[0]?.variant_id ?? null;
  }, [ranked]);

  const saveFactor = () => {
    const parsedPct = parseFloat(factorDraft);
    if (!Number.isFinite(parsedPct) || parsedPct < 0 || parsedPct > 100) {
      toast({ title: "Enter a value between 0 and 100", variant: "destructive" });
      return;
    }
    const next = parsedPct / 100;
    setConversionFactor(next);
    try { window.localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
    toast({ title: "Conversion rate saved", description: `${parsedPct.toFixed(0)}% of clicks → reviews` });
  };

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

  const leader = ranked[0];

  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Email A/B Tests</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Rating follow-up — optimized for real review conversion (clicks × 50% + est. reviews × 50%).
        </p>
      </div>

      {/* Summary stats — clicks is the primary trusted metric */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<MousePointerClick className="h-4 w-4" />}
          label="Total clicks"
          value={totals.clicks.toString()}
          sub="Primary trusted metric"
          highlight
        />
        <StatCard icon={<Mail className="h-4 w-4" />} label="Emails sent" value={totals.sends.toString()} sub={fmtPct(totals.ctr) + " CTR"} />
        <StatCard icon={<Star className="h-4 w-4" />} label="Est. reviews" value={totals.estReviews.toFixed(1)} sub={`${(conversionFactor * 100).toFixed(0)}% of clicks`} />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Send → review" value={fmtPct(totals.sendToReview)} sub="estimated" />
      </div>

      {/* Conversion factor — admin-configurable */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Click → review conversion rate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Default 20% (realistic baseline for transactional CTAs). Adjust based on real Play Store review data.
            Saved locally — affects all calculations on this page.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="cf" className="text-xs">Conversion (%)</Label>
              <Input
                id="cf"
                type="number"
                min={0}
                max={100}
                step={1}
                value={factorDraft}
                onChange={(e) => setFactorDraft(e.target.value)}
                className="w-28"
              />
            </div>
            <Button onClick={saveFactor} className="gap-2">
              <Save className="h-4 w-4" /> Save
            </Button>
            <div className="flex gap-1.5 flex-wrap">
              {[10, 20, 30, 50].map((p) => (
                <Button
                  key={p}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFactorDraft(String(p))}
                  className="h-9"
                >
                  {p}%
                </Button>
              ))}
            </div>
            <span className="text-sm text-muted-foreground ml-auto">
              Currently: <strong className="text-foreground">{(conversionFactor * 100).toFixed(0)}%</strong>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Variant comparison */}
      {ranked.length >= 2 && leader && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" /> Variant comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground mb-2">
              Ranked by weighted score: clicks × 0.5 + estimated reviews × 0.5
            </p>
            {ranked.map((s, idx) => {
              const vsLeaderClicks = leader.clicks > 0
                ? ((s.clicks - leader.clicks) / leader.clicks) * 100
                : 0;
              const isLeader = idx === 0 && s.clicks > 0;
              return (
                <div
                  key={s.variant_id}
                  className={`flex items-center justify-between gap-3 rounded-md p-3 ${
                    isLeader ? "bg-primary/10 border border-primary/30" : "bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xs font-mono text-muted-foreground w-5">#{idx + 1}</span>
                    <span className="font-medium text-foreground truncate">{s.variant_label}</span>
                    {isLeader && s.sends >= MIN_SENDS_FOR_WINNER && (
                      <Badge className="bg-primary text-primary-foreground gap-1 shrink-0">
                        <Trophy className="h-3 w-3" /> Winner
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Clicks</div>
                      <div className="font-semibold text-foreground">{s.clicks}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Est. reviews</div>
                      <div className="font-semibold text-foreground">{s.estReviews.toFixed(1)}</div>
                    </div>
                    <div className="text-right w-16">
                      <div className="text-xs text-muted-foreground">vs #1</div>
                      <div className={`font-semibold ${
                        idx === 0 ? "text-muted-foreground" : vsLeaderClicks < 0 ? "text-destructive" : "text-foreground"
                      }`}>
                        {idx === 0 ? "—" : `${vsLeaderClicks > 0 ? "+" : ""}${vsLeaderClicks.toFixed(0)}%`}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

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
                          <Trophy className="h-3 w-3" /> Winner (weighted)
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

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                  <Metric label="Clicks (trusted)" value={s.clicks.toString()} highlight={isBest} />
                  <Metric label="Sends" value={s.sends.toString()} />
                  <Metric label="CTR" value={fmtPct(s.ctr)} />
                  <Metric label="Est. reviews" value={estReviews.toFixed(1)} />
                </div>

                {s.sends < MIN_SENDS_FOR_WINNER && s.sends > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    ⚠ Low sample size — need ≥{MIN_SENDS_FOR_WINNER} sends for reliable winner detection.
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

function StatCard({ icon, label, value, sub, highlight }: { icon: React.ReactNode; label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-primary/40 bg-primary/5" : ""}>
      <CardContent className="pt-4 pb-4">
        <div className={`flex items-center gap-2 text-xs ${highlight ? "text-primary" : "text-muted-foreground"}`}>{icon}<span>{label}</span></div>
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
