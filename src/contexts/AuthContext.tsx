import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { subscribeToPushNotifications, registerServiceWorker, isPushNotificationSupported } from "@/lib/pushNotifications";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Register service worker on mount
  useEffect(() => {
    if (isPushNotificationSupported()) {
      registerServiceWorker();
    }
  }, []);

  // Subscribe to push notifications when user logs in
  useEffect(() => {
    if (user && isPushNotificationSupported()) {
      // Request permission and subscribe after a short delay
      const timer = setTimeout(() => {
        subscribeToPushNotifications(user.id).catch(console.error);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Check if this is a new Google OAuth user who needs to complete profile
        if (event === 'SIGNED_IN' && session?.user) {
          const isOAuth = session.user.app_metadata?.provider === 'google';
          if (isOAuth) {
            // Defer profile check to avoid deadlock
            setTimeout(async () => {
              const { data: profile } = await supabase
                .from('profiles')
                .select('profile_completed')
                .eq('id', session.user.id)
                .single();
              
              // Only redirect if profile is incomplete and not already on complete-profile page
              if (profile && !profile.profile_completed && !window.location.pathname.includes('complete-profile')) {
                window.location.href = '/complete-profile';
              }
            }, 100);
          }
        }
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

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    navigate("/");
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
