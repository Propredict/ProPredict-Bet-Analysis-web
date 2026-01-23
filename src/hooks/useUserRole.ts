import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRoleState {
  role: AppRole | null;
  isAdmin: boolean;
  isModerator: boolean;
  isUser: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<UserRoleState>({
    role: null,
    isAdmin: false,
    isModerator: false,
    isUser: false,
    isLoading: true,
    error: null,
  });

  const fetchRole = useCallback(async () => {
    if (!user) {
      setState({
        role: null,
        isAdmin: false,
        isModerator: false,
        isUser: false,
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      // Query user_roles table for the user's role
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        setState({
          role: "user",
          isAdmin: false,
          isModerator: false,
          isUser: true,
          isLoading: false,
          error: error.message,
        });
        return;
      }

      const role = (data?.role as AppRole) || "user";

      setState({
        role,
        isAdmin: role === "admin",
        isModerator: role === "moderator",
        isUser: role === "user",
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error("Error in useUserRole:", err);
      setState({
        role: "user",
        isAdmin: false,
        isModerator: false,
        isUser: true,
        isLoading: false,
        error: "Failed to fetch user role",
      });
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchRole();
    }
  }, [authLoading, fetchRole]);

  return {
    ...state,
    refetch: fetchRole,
  };
}
