import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook that provides a wrapper for auth-gated actions.
 * If user is not logged in, redirects to login page.
 * Returns a function that wraps async actions with auth check.
 */
export function useRequireAuth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const requireAuth = useCallback(
    <T extends (...args: any[]) => Promise<any>>(
      action: T,
      options?: { 
        message?: string;
        showToast?: boolean;
      }
    ): ((...args: Parameters<T>) => Promise<ReturnType<T> | undefined>) => {
      return async (...args: Parameters<T>) => {
        if (!user) {
          if (options?.showToast !== false) {
            toast({
              title: "Sign in required",
              description: options?.message || "Please sign in to continue.",
            });
          }
          navigate("/login");
          return undefined;
        }
        return action(...args);
      };
    },
    [user, navigate, toast]
  );

  const checkAuth = useCallback((): boolean => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to continue.",
      });
      navigate("/login");
      return false;
    }
    return true;
  }, [user, navigate, toast]);

  return {
    isAuthenticated: !!user,
    isLoading: loading,
    requireAuth,
    checkAuth,
  };
}
