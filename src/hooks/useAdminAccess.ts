import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AdminAccessState {
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useAdminAccess() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<AdminAccessState>({
    isAdmin: false,
    isLoading: true,
    error: null,
  });

  const checkAdminAccess = useCallback(async () => {
    if (!user) {
      setState({ isAdmin: false, isLoading: false, error: null });
      return;
    }

    try {
      // Check user_roles table first (proper security pattern)
      const { data: roleData, error: roleError } = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleError && roleData) {
        setState({ isAdmin: true, isLoading: false, error: null });
        return;
      }

      // Fallback: Check profiles.role for backwards compatibility
      const { data: profileData, error: profileError } = await (supabase as any)
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) {
        setState({ isAdmin: false, isLoading: false, error: profileError.message });
        return;
      }

      setState({
        isAdmin: profileData?.role === "admin",
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error("Error checking admin access:", err);
      setState({ isAdmin: false, isLoading: false, error: "Failed to check admin access" });
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      checkAdminAccess();
    }
  }, [authLoading, checkAdminAccess]);

  return {
    ...state,
    refetch: checkAdminAccess,
  };
}
