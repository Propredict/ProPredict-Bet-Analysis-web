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
  // Track whether initAuth has completed — prevents the listener from
  // prematurely resolving loading=false with a stale null session while
  // the token is still being refreshed.
  const initDoneRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    initDoneRef.current = false;

    const applySession = (nextSession: Session | null, fromInit = false) => {
      if (!isMountedRef.current) return;

      // If we have a real session, always apply it immediately.
      if (nextSession) {
        setSession(nextSession);
        setUser(nextSession.user);
        setLoading(false);
        return;
      }

      // Null session: only trust it once initAuth has finished.
      // This prevents the onAuthStateChange INITIAL_SESSION (null) from
      // flashing a guest state while getUser() is still recovering the token.
      if (fromInit || initDoneRef.current) {
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    };

    // Set up auth state listener BEFORE checking session
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      applySession(nextSession);

      // Track login event in Google Analytics
      if (event === "SIGNED_IN" && nextSession?.user) {
        // Mark login timestamp so interstitial ads don't steal focus from OneSignal permission dialog
        try { localStorage.setItem("propredict:login_ts", String(Date.now())); } catch {}

        if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
          (window as any).gtag("event", "login", {
            method: "Supabase",
            user_id: nextSession.user.id,
          });
        }
      }
    });

    const initAuth = async () => {
      // Timeout guard: if auth takes too long (slow network / no internet),
      // resolve loading=false to prevent infinite spinner.
      const authTimeout = setTimeout(() => {
        if (!initDoneRef.current && isMountedRef.current) {
          console.warn("[Auth] Timeout — resolving as guest after 3s");
          initDoneRef.current = true;
          setLoading(false);
        }
      }, 3000);

      try {
        // getSession reads from localStorage — fast, but may be expired.
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (initialSession) {
          clearTimeout(authTimeout);
          initDoneRef.current = true;
          applySession(initialSession, true);
          return;
        }

        // Fallback: getUser hits the server and can recover the session
        // after a token refresh (critical on Android WebView after app kill).
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        clearTimeout(authTimeout);
        initDoneRef.current = true;

        if (!isMountedRef.current) return;
        if (currentUser) {
          setUser(currentUser);
          // Session might arrive via onAuthStateChange shortly after.
          setLoading(false);
        } else {
          applySession(null, true);
        }
      } catch {
        clearTimeout(authTimeout);
        initDoneRef.current = true;
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
