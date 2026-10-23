import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-project') &&
  !supabaseAnonKey.includes('your-supabase-anon-key')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
}

export const authClient = {
  isConfigured: isSupabaseConfigured,
  supabaseUrl: supabaseUrl || null,

  async getSession(): Promise<Session | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Error fetching Supabase session:', error.message);
      return null;
    }
    return data.session;
  },

  async getUser(): Promise<User | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user;
  },

  async signUp(email: string, password: string, displayName?: string) {
    if (!supabase) {
      throw new Error(
        'Supabase Auth is not configured. Missing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
      );
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0],
        },
      },
    });
    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    if (!supabase) {
      throw new Error(
        'Supabase Auth is not configured. Missing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
      );
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  onAuthStateChange(callback: (session: Session | null, user: User | null) => void) {
    if (!supabase) {
      return { unsubscribe: () => {} };
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session, session?.user || null);
    });
    return {
      unsubscribe: () => subscription.unsubscribe(),
    };
  },
};
