import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { authClient, isSupabaseConfigured } from '../lib/supabase';

import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfiguredState, setIsConfiguredState] = useState(isSupabaseConfigured);

  useEffect(() => {
    let isMounted = true;
    let authSubscription: { unsubscribe: () => void } | null = null;

    async function initAuth() {
      try {
        if (!authClient.isConfigured) {
          try {
            const config = await api.getAuthConfig();
            if (config.isConfigured && config.supabaseUrl && config.supabaseAnonKey) {
              authClient.configure(config.supabaseUrl, config.supabaseAnonKey);
              if (isMounted) setIsConfiguredState(true);
            }
          } catch {
            // Ignore backend config error
          }
        }

        if (authClient.isConfigured) {
          const currentSession = await authClient.getSession();
          if (isMounted) {
            setSession(currentSession);
            setUser(currentSession?.user || null);
          }

          authSubscription = authClient.onAuthStateChange((newSession, newUser) => {
            if (isMounted) {
              setSession(newSession);
              setUser(newUser);
              setLoading(false);
            }
          });
        }
      } catch (err) {
        console.error('Failed to initialize session:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initAuth();

    return () => {
      isMounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await authClient.signIn(email, password);
      setSession(data.session);
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    setLoading(true);
    try {
      const data = await authClient.signUp(email, password, displayName);
      setSession(data.session);
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await authClient.signOut();
      setSession(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: isConfiguredState,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
