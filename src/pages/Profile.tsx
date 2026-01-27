import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserPlan } from "@/hooks/useUserPlan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Camera, Loader2, LogOut, CreditCard, CheckCircle2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Profile = () => {
  const { user, signOut, session } = useAuth();
  const { plan } = useUserPlan();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [signingOut, setSigningOut] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("payment") === "success") {
      setShowPaymentSuccess(true);
      // Remove the query param from URL without navigation
      searchParams.delete("payment");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchSubscription();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("username, full_name, avatar_url")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setUsername(data.username || "");
        setFullName(data.full_name || "");
        setAvatarUrl(data.avatar_url || "");
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscription = async () => {
    try {
      const { data } = await supabase
        .from("user_subscriptions")
        .select("expires_at")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (data?.expires_at) {
        setExpiresAt(data.expires_at);
      }
    } catch (error: any) {
      console.error("Error fetching subscription:", error.message);
    }
  };

  const formatPlanName = (p: string) => {
    if (p === "basic") return "Pro";
    if (p === "premium") return "Premium";
    return "Free";
  };

  const formatExpiryDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("profiles")
        .update({
          username,
          full_name: fullName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    if (fullName) {
      return fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    if (username) {
      return username.slice(0, 2).toUpperCase();
    }
    return user?.email?.slice(0, 2).toUpperCase() || "U";
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
      setSigningOut(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!session?.access_token) return;
    
    setOpeningPortal(true);
    try {
      const response = await fetch(
        "https://tczettddxmlcmhdhgebw.supabase.co/functions/v1/create-portal-session",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            returnUrl: `${window.location.origin}/profile`,
          }),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to open portal");
      }

      window.location.href = data.url;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setOpeningPortal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 md:p-6">
      <div className="mx-auto max-w-lg">
        <Button
          variant="ghost"
          onClick={() => navigate("/settings")}
          className="mb-3 h-7 text-xs gap-1"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Settings
        </Button>

        {showPaymentSuccess && (
          <Alert className="mb-4 border-primary/50 bg-primary/10">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <AlertTitle className="text-sm font-medium">Payment Successful!</AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground">
              Congratulations! Your subscription is now active. Enjoy your premium features!
            </AlertDescription>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-6 w-6"
              onClick={() => setShowPaymentSuccess(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Alert>
        )}

        <Card>
          <CardHeader className="p-3 sm:p-4">
            <CardTitle className="text-sm sm:text-base">Profile Settings</CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">
              Update your profile information and avatar
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 space-y-4">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
                  <AvatarImage src={avatarUrl} alt={fullName || username} />
                  <AvatarFallback className="text-sm">{getInitials()}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1.5">
                  <Camera className="h-3 w-3 text-primary-foreground" />
                </div>
              </div>
              <div className="w-full max-w-sm">
                <Label htmlFor="avatar_url" className="text-[10px] sm:text-xs">Avatar URL</Label>
                <Input
                  id="avatar_url"
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
                <p className="mt-1 text-[9px] sm:text-[10px] text-muted-foreground">
                  Enter a URL to an image for your avatar
                </p>
              </div>
            </div>

            {/* Profile Fields */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="email" className="text-[10px] sm:text-xs">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="mt-1 h-8 text-xs bg-muted"
                />
                <p className="mt-1 text-[9px] sm:text-[10px] text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              <div>
                <Label htmlFor="username" className="text-[10px] sm:text-xs">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <Label htmlFor="full_name" className="text-[10px] sm:text-xs">Full Name</Label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full h-8 text-xs"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>

              {plan !== "free" && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Current Plan</span>
                    <span className="text-xs font-medium text-primary">{formatPlanName(plan)}</span>
                  </div>
                  {expiresAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Renews on</span>
                      <span className="text-xs">{formatExpiryDate(expiresAt)}</span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleManageSubscription}
                    disabled={openingPortal}
                    className="w-full h-8 text-xs mt-2"
                  >
                    {openingPortal ? (
                      <>
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                        Opening...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-1.5 h-3 w-3" />
                        Manage Subscription
                      </>
                    )}
                  </Button>
                </div>
              )}

              <Button
                variant="destructive"
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full h-8 text-xs"
              >
                {signingOut ? (
                  <>
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    Signing out...
                  </>
                ) : (
                  <>
                    <LogOut className="mr-1.5 h-3 w-3" />
                    Sign Out
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
