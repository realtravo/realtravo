import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface UseProtectedRouteOptions {
  requireProfileComplete?: boolean;
  redirectTo?: string;
}

export const useProtectedRoute = (options: UseProtectedRouteOptions = {}) => {
  const { requireProfileComplete = false, redirectTo = '/auth' } = options;
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      if (authLoading) return;

      if (!user) {
        navigate(redirectTo);
        return;
      }

      if (requireProfileComplete) {
        const { data } = await supabase
          .from('profiles')
          .select('profile_completed')
          .eq('id', user.id)
          .single();

        if (data && !data.profile_completed) {
          navigate('/complete-profile');
          return;
        }
        setProfileComplete(data?.profile_completed ?? true);
      }

      setIsReady(true);
    };

    checkAccess();
  }, [user, authLoading, navigate, redirectTo, requireProfileComplete]);

  return { isReady, user, profileComplete, loading: authLoading || !isReady };
};
