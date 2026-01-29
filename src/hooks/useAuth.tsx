import { useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { maybeSendPostSignupEmails } from "@/lib/emailjs/postSignupEmails";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener BEFORE checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    // Fire-and-forget: only sends after the user is confirmed + signed in.
    void maybeSendPostSignupEmails(user);
  }, [user?.id, user?.email_confirmed_at]);

  const signOut = async () => {
    // Clear local state first to ensure UI updates even if server call fails
    setSession(null);
    setUser(null);
    
    try {
      // Try to sign out from Supabase (may fail if session expired)
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      // Ignore errors - local state is already cleared
      console.log("Sign out completed (session may have been expired)");
    }
  };

  return {
    user,
    session,
    loading,
    signOut,
  };
};
