import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Crown, Star, Loader2 } from "lucide-react";

interface SubscriptionStats {
  proCount: number;
  premiumCount: number;
  totalActive: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<SubscriptionStats>({
    proCount: 0,
    premiumCount: 0,
    totalActive: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch all subscriptions where expires_at is in the future (active)
        const now = new Date().toISOString();
        
        const { data, error } = await supabase
          .from("user_subscriptions")
          .select("plan, expires_at")
          .gt("expires_at", now);

        if (error) {
          console.error("Error fetching subscriptions:", error);
          return;
        }

        // Filter by plan type - 'pro' for Pro, 'premium' for Premium
        const proCount = data?.filter((s) => s.plan === "pro" || s.plan === "basic").length || 0;
        const premiumCount = data?.filter((s) => s.plan === "premium").length || 0;
        const totalActive = data?.length || 0;

        setStats({ proCount, premiumCount, totalActive });
      } catch (err) {
        console.error("Failed to fetch subscription stats:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Subscription statistics overview
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {/* Pro Subscriptions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pro Subscribers</CardTitle>
            <Star className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.proCount}</div>
            <p className="text-xs text-muted-foreground">Active basic plans</p>
          </CardContent>
        </Card>

        {/* Premium Subscriptions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Premium Subscribers</CardTitle>
            <Crown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.premiumCount}</div>
            <p className="text-xs text-muted-foreground">Active premium plans</p>
          </CardContent>
        </Card>

        {/* Total Active */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActive}</div>
            <p className="text-xs text-muted-foreground">All active subscriptions</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
