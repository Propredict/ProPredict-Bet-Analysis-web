import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function useProvideAuthState(): AuthContextValue {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const applySession = (nextSession: Session | null) => {
      if (!isMountedRef.current) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    };

    // Set up auth state listener BEFORE checking session
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      applySession(nextSession);

      // Track login event in Google Analytics
      if (event === "SIGNED_IN" && nextSession?.user) {
        if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
          (window as any).gtag("event", "login", {
            method: "Supabase",
            user_id: nextSession.user.id,
          });
        }
      }
    });

    const initAuth = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (initialSession) {
          applySession(initialSession);
          return;
        }

        // Fallback: getUser can recover user after token refresh in some environments.
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!isMountedRef.current) return;
        setSession(null);
        setUser(currentUser ?? null);
        setLoading(false);
      } catch {
        // Network/hydration error — stop loading to prevent infinite spinner
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    void initAuth();

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    // Clear local state first to ensure UI updates even if server call fails
    setSession(null);
    setUser(null);

    try {
      // Try to sign out from Supabase (may fail if session expired)
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Ignore errors - local state is already cleared
      console.log("Sign out completed (session may have been expired)");
    }
  }, []);

  return useMemo(
    () => ({
      user,
      session,
      loading,
      signOut,
    }),
    [user, session, loading, signOut],
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useProvideAuthState();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
};
