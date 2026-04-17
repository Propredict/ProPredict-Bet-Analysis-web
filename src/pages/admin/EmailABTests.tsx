import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, Loader2, Mail, MousePointerClick, Plus, Save, Star, TrendingUp, Trophy } from "lucide-react";

const REVIEW_CONVERSION_FACTOR_DEFAULT = 0.2;
const STORAGE_KEY = "email_ab_review_conversion_factor";
const WEIGHT_CLICKS = 0.5;
const WEIGHT_REVIEWS = 0.5;
const MIN_SENDS_FOR_WINNER = 10;
const MISSING_TABLE_CODE = "PGRST205";

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
  ctr: number;
};

const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;

export default function EmailABTests() {
  const [loading, setLoading] = useState(true);
  const [statsUnavailable, setStatsUnavailable] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [stats, setStats] = useState<VariantStat[]>([]);
  const [conversionFactor, setConversionFactor] = useState<number>(() => {
    if (typeof window === "undefined") return REVIEW_CONVERSION_FACTOR_DEFAULT;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? parseFloat(saved) : Number.NaN;
    return Number.isFinite(parsed)
      ? Math.max(0, Math.min(1, parsed))
      : REVIEW_CONVERSION_FACTOR_DEFAULT;
  });
  const [factorDraft, setFactorDraft] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setFactorDraft((conversionFactor * 100).toFixed(0));
  }, [conversionFactor]);

  const load = async () => {
    setLoading(true);
    setStatsUnavailable(false);

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

      if (variantsRes.error?.code === MISSING_TABLE_CODE || sendsRes.error?.code === MISSING_TABLE_CODE) {
        setVariants([]);
        setStats([]);
        setStatsUnavailable(true);
        return;
      }

      if (variantsRes.error) throw variantsRes.error;
      if (sendsRes.error) throw sendsRes.error;

      const loadedVariants = (variantsRes.data ?? []) as unknown as Variant[];
      setVariants(loadedVariants);

      const aggregate = new Map<string, { sends: number; clicks: number }>();
      for (const row of ((sendsRes.data ?? []) as unknown as Array<{ variant_id: string | null; clicked_at: string | null }>)) {
        if (!row.variant_id) continue;
        const current = aggregate.get(row.variant_id) ?? { sends: 0, clicks: 0 };
        current.sends += 1;
        if (row.clicked_at) current.clicks += 1;
        aggregate.set(row.variant_id, current);
      }

      setStats(
        loadedVariants.map((variant) => {
          const current = aggregate.get(variant.id) ?? { sends: 0, clicks: 0 };
          return {
            variant_id: variant.id,
            variant_label: variant.variant_label,
            subject: variant.subject,
            is_active: variant.is_active,
            sends: current.sends,
            clicks: current.clicks,
            ctr: current.sends > 0 ? current.clicks / current.sends : 0,
          };
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Failed to load A/B data", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const totals = useMemo(() => {
    const sends = stats.reduce((sum, item) => sum + item.sends, 0);
    const clicks = stats.reduce((sum, item) => sum + item.clicks, 0);
    const estReviews = clicks * conversionFactor;
    const ctr = sends > 0 ? clicks / sends : 0;
    const sendToReview = sends > 0 ? estReviews / sends : 0;

    return { sends, clicks, estReviews, ctr, sendToReview };
  }, [stats, conversionFactor]);

  const ranked = useMemo(() => {
    const maxClicks = Math.max(1, ...stats.map((item) => item.clicks));

    return [...stats]
      .map((item) => {
        const estReviews = item.clicks * conversionFactor;
        const clicksNorm = item.clicks / maxClicks;
        const reviewsNorm = estReviews / Math.max(1, maxClicks * conversionFactor);
        const score = clicksNorm * WEIGHT_CLICKS + reviewsNorm * WEIGHT_REVIEWS;

        return { ...item, estReviews, score };
      })
      .sort((a, b) => b.score - a.score);
  }, [stats, conversionFactor]);

  const bestVariantId = useMemo(() => {
    const eligible = ranked.filter((item) => item.sends >= MIN_SENDS_FOR_WINNER && item.clicks > 0);
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
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
    }
    toast({ title: "Conversion rate saved", description: `${parsedPct.toFixed(0)}% of clicks → reviews` });
  };

  const toggleActive = async (id: string, active: boolean) => {
    if (statsUnavailable) {
      toast({ title: "A/B data tables are not available yet", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("email_ab_variants" as any)
      .update({ is_active: active } as any)
      .eq("id", id);

    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: active ? "Variant activated" : "Variant paused" });
    void load();
  };

  const createVariant = async () => {
    if (!newLabel.trim() || !newSubject.trim()) {
      toast({ title: "Label and subject required", variant: "destructive" });
      return;
    }

    if (statsUnavailable) {
      toast({ title: "A/B data tables are not available yet", description: "Create the backend tables first.", variant: "destructive" });
      return;
    }

    setCreating(true);
    const { error } = await supabase.from("email_ab_variants" as any).insert({
      template_name: "rating-followup",
      variant_label: newLabel.trim(),
      subject: newSubject.trim(),
      is_active: true,
    } as any);
    setCreating(false);

    if (error) {
      toast({ title: "Create failed", description: error.message, variant: "destructive" });
      return;
    }

    setNewLabel("");
    setNewSubject("");
    toast({ title: "Variant created" });
    void load();
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
          Rating follow-up — optimized for real review conversion.
        </p>
      </div>

      {statsUnavailable && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>A/B backend not installed</AlertTitle>
          <AlertDescription>
            This admin page is now linked in the sidebar, but the Supabase tables for email A/B testing do not exist yet,
            so live variant data cannot load on this environment.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<MousePointerClick className="h-4 w-4" />}
          label="Total clicks"
          value={totals.clicks.toString()}
          sub="Primary trusted metric"
          highlight
        />
        <StatCard
          icon={<Mail className="h-4 w-4" />}
          label="Emails sent"
          value={totals.sends.toString()}
          sub={`${fmtPct(totals.ctr)} CTR`}
        />
        <StatCard
          icon={<Star className="h-4 w-4" />}
          label="Est. reviews"
          value={totals.estReviews.toFixed(1)}
          sub={`${(conversionFactor * 100).toFixed(0)}% of clicks`}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Send → review"
          value={fmtPct(totals.sendToReview)}
          sub="estimated"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Click → review conversion rate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Default 20% baseline. Adjust it manually as you observe real Play Store review behavior.
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
                onChange={(event) => setFactorDraft(event.target.value)}
                className="w-28"
              />
            </div>
            <Button onClick={saveFactor} className="gap-2">
              <Save className="h-4 w-4" /> Save
            </Button>
            <div className="flex gap-1.5 flex-wrap">
              {[10, 20, 30, 50].map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFactorDraft(String(preset))}
                  className="h-9"
                >
                  {preset}%
                </Button>
              ))}
            </div>
            <span className="text-sm text-muted-foreground ml-auto">
              Currently: <strong className="text-foreground">{(conversionFactor * 100).toFixed(0)}%</strong>
            </span>
          </div>
        </CardContent>
      </Card>

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
            {ranked.map((item, index) => {
              const isLeader = index === 0 && item.clicks > 0;
              const vsLeaderClicks = leader.clicks > 0 ? ((item.clicks - leader.clicks) / leader.clicks) * 100 : 0;

              return (
                <div
                  key={item.variant_id}
                  className={`flex items-center justify-between gap-3 rounded-md p-3 ${
                    isLeader ? "border border-primary/30 bg-primary/10" : "bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xs font-mono text-muted-foreground w-5">#{index + 1}</span>
                    <span className="font-medium text-foreground truncate">{item.variant_label}</span>
                    {isLeader && item.sends >= MIN_SENDS_FOR_WINNER && (
                      <Badge className="bg-primary text-primary-foreground gap-1 shrink-0">
                        <Trophy className="h-3 w-3" /> Winner
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Clicks</div>
                      <div className="font-semibold text-foreground">{item.clicks}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Est. reviews</div>
                      <div className="font-semibold text-foreground">{item.estReviews.toFixed(1)}</div>
                    </div>
                    <div className="text-right w-16">
                      <div className="text-xs text-muted-foreground">vs #1</div>
                      <div className={`font-semibold ${index === 0 ? "text-muted-foreground" : vsLeaderClicks < 0 ? "text-destructive" : "text-foreground"}`}>
                        {index === 0 ? "—" : `${vsLeaderClicks > 0 ? "+" : ""}${vsLeaderClicks.toFixed(0)}%`}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Variant performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {statsUnavailable ? "Waiting for backend A/B tables." : "No variants yet. Create one below."}
            </p>
          )}
          {stats.map((item) => {
            const isBest = item.variant_id === bestVariantId;
            const estReviews = item.clicks * conversionFactor;

            return (
              <div
                key={item.variant_id}
                className={`rounded-lg border p-4 transition-colors ${isBest ? "border-primary bg-primary/5" : "border-border bg-card"}`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{item.variant_label}</span>
                      {isBest && (
                        <Badge className="bg-primary text-primary-foreground gap-1">
                          <Trophy className="h-3 w-3" /> Winner (weighted)
                        </Badge>
                      )}
                      {!item.is_active && <Badge variant="secondary">Paused</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 break-words">"{item.subject}"</p>
                  </div>
                  <Switch checked={item.is_active} onCheckedChange={(value) => void toggleActive(item.variant_id, value)} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                  <Metric label="Clicks (trusted)" value={item.clicks.toString()} highlight={isBest} />
                  <Metric label="Sends" value={item.sends.toString()} />
                  <Metric label="CTR" value={fmtPct(item.ctr)} />
                  <Metric label="Est. reviews" value={estReviews.toFixed(1)} />
                </div>

                {item.sends < MIN_SENDS_FOR_WINNER && item.sends > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Need at least {MIN_SENDS_FOR_WINNER} sends for reliable winner detection.
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add subject variant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="label" className="text-xs">Label</Label>
            <Input
              id="label"
              placeholder="e.g. Variant C – Emoji Heavy"
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
              disabled={statsUnavailable}
            />
          </div>
          <div>
            <Label htmlFor="subj" className="text-xs">Subject line</Label>
            <Input
              id="subj"
              placeholder="e.g. ⭐ Quick favor for the ProPredict team 🙏"
              value={newSubject}
              onChange={(event) => setNewSubject(event.target.value)}
              disabled={statsUnavailable}
            />
          </div>
          <Button onClick={() => void createVariant()} disabled={creating || statsUnavailable} className="w-full sm:w-auto">
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
        <div className={`flex items-center gap-2 text-xs ${highlight ? "text-primary" : "text-muted-foreground"}`}>
          {icon}
          <span>{label}</span>
        </div>
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
