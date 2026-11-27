
import type { Session } from '@supabase/supabase-js';
import {
    useCallback,
    createContext,
    useContext,
    useEffect,
    useState,
    useRef,
    type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  athleteProfileState: 'checking' | 'incomplete' | 'complete' | 'error' | null;
  athleteProfileError: string;
  refreshAthleteProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [athleteProfileState, setAthleteProfileState] =
    useState<AuthContextType['athleteProfileState']>(null);
  const [athleteProfileError, setAthleteProfileError] = useState('');
  const profileRequest = useRef(0);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;

      if (error) {
        console.error('Session error:', error.message);
      }

      setSession(data.session);
      setAthleteProfileState(data.session ? 'checking' : null);
      setAthleteProfileError('');
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) {
        setSession(newSession);
        setAthleteProfileState(newSession ? 'checking' : null);
        setAthleteProfileError('');
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id;

  const refreshAthleteProfile = useCallback(async () => {
    if (!userId) {
      return;
    }

    const requestId = ++profileRequest.current;
    const { data, error } = await supabase
      .from('athlete_profiles')
      .select('completed_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (requestId !== profileRequest.current) return;
    if (error) {
      setAthleteProfileError(error.message);
      setAthleteProfileState('error');
      return;
    }

    setAthleteProfileError('');
    setAthleteProfileState(data?.completed_at ? 'complete' : 'incomplete');
  }, [userId]);

  useEffect(() => {
    if (userId) {
      void refreshAthleteProfile();
    } else {
      profileRequest.current += 1;
    }
  }, [refreshAthleteProfile, userId]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        athleteProfileState,
        athleteProfileError,
        refreshAthleteProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
