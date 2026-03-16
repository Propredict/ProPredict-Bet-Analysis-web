import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, CheckCircle, Eye, EyeOff } from "lucide-react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleRecovery = async () => {
      // Safety timeout — never hang forever
      const timeout = setTimeout(() => {
        if (!isValidSession) {
          console.warn("[ResetPassword] Timeout — redirecting to forgot-password");
          toast({
            title: "Invalid or expired link",
            description: "Please request a new password reset link.",
            variant: "destructive",
          });
          navigate("/forgot-password");
        }
      }, 5000);

      try {
        // 1. Check for PKCE flow: ?code= in query params
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get("code");
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data.session) {
            window.history.replaceState(null, "", window.location.pathname);
            clearTimeout(timeout);
            setIsValidSession(true);
            return;
          }
        }

        // 2. Check hash fragments (legacy / non-PKCE flow)
        const hash = window.location.hash;
        if (hash) {
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          const type = params.get("type");

          if (accessToken && refreshToken && type === "recovery") {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (!error) {
              window.history.replaceState(null, "", window.location.pathname);
              clearTimeout(timeout);
              setIsValidSession(true);
              return;
            }
          }
        }

        // 3. Fallback: check existing session (user may already be authenticated)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          clearTimeout(timeout);
          setIsValidSession(true);
          return;
        }

        // No valid session found
        clearTimeout(timeout);
        toast({
          title: "Invalid or expired link",
          description: "Please request a new password reset link.",
          variant: "destructive",
        });
        navigate("/forgot-password");
      } catch (err) {
        console.error("[ResetPassword] Recovery error:", err);
        clearTimeout(timeout);
        toast({
          title: "Something went wrong",
          description: "Please request a new password reset link.",
          variant: "destructive",
        });
        navigate("/forgot-password");
      }
    };
    handleRecovery();
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setFormError("Please make sure both passwords are the same.");
      return;
    }

    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }

    setFormError("");

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setIsSuccess(true);
      toast({
        title: "Password updated",
        description: "Your password has been successfully reset.",
      });

      // Redirect to login after 2 seconds
      setTimeout(() => navigate("/login"), 2000);
    } catch (error: any) {
      setFormError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="w-full max-w-md shadow-2xl border-border/50 backdrop-blur">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            {isSuccess ? (
              <CheckCircle className="h-8 w-8 text-primary" />
            ) : (
              <Lock className="h-8 w-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {isSuccess ? "Password reset!" : "Set new password"}
          </CardTitle>
          <CardDescription>
            {isSuccess
              ? "Redirecting you to login..."
              : "Enter your new password below."}
          </CardDescription>
        </CardHeader>

        {!isSuccess && (
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    disabled={isLoading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    disabled={isLoading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Min. 6 characters with uppercase, lowercase, number & symbol (e.g. Kp9$mXvL)
              </p>

              {formError && (
                <Alert variant="destructive" className="text-sm">
                  <AlertDescription>
                    {formError.toLowerCase().includes('weak') || formError.toLowerCase().includes('breach')
                      ? "Your password is too common. Please use a stronger, unique password."
                      : formError}
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default ResetPassword;
