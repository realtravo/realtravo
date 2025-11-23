import { supabase } from "@/integrations/supabase/client";

/**
 * Secure session manager for saved items
 * Uses Supabase auth for authenticated users and secure server-generated tokens for guests
 */
export const getSecureSessionId = async (): Promise<string | null> => {
  // For authenticated users, use their user ID
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    return user.id;
  }

  // For guests, use a secure session from Supabase auth session
  // Even anonymous users get a session from Supabase
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    // Use the access token as session identifier (cryptographically secure)
    return session.access_token;
  }

  // If no session exists, return null (saved items won't work for non-authenticated users)
  return null;
};

/**
 * Get user ID for authenticated users
 */
export const getUserId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
};

/**
 * Get or create a simple session ID for tracking purposes (non-authenticated)
 */
export const getSessionId = (): string => {
  const SESSION_KEY = 'app_session_id';
  let sessionId = localStorage.getItem(SESSION_KEY);
  
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  
  return sessionId;
};
