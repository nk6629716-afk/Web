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

let dynamicClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (dynamicClient) return dynamicClient;
  if (isSupabaseConfigured && !dynamicClient) {
    dynamicClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'relay_supabase_session',
      },
    });
  }
  return dynamicClient;
}

export const supabase: SupabaseClient | null = isSupabaseConfigured ? getSupabase() : null;

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
}

export const authClient = {
  isConfigured: isSupabaseConfigured,
  supabaseUrl: supabaseUrl || null,

  configure(url: string, anonKey: string): SupabaseClient {
    dynamicClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'relay_supabase_session',
      },
    });
    this.isConfigured = true;
    this.supabaseUrl = url;
    return dynamicClient;
  },

  async getSession(): Promise<Session | null> {
    const client = getSupabase();
    if (!client) return null;
    const { data, error } = await client.auth.getSession();
    if (error) {
      console.warn('Error fetching Supabase session:', error.message);
      return null;
    }
    return data.session;
  },

  async getUser(): Promise<User | null> {
    const client = getSupabase();
    if (!client) return null;
    const { data, error } = await client.auth.getUser();
    if (error) return null;
    return data.user;
  },

  async signUp(email: string, password: string, displayName?: string) {
    const client = getSupabase();
    if (!client) {
      throw new Error(
        'Supabase Auth is not configured. Missing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
      );
    }
    const { data, error } = await client.auth.signUp({
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
    const client = getSupabase();
    if (!client) {
      throw new Error(
        'Supabase Auth is not configured. Missing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
      );
    }
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const client = getSupabase();
    if (!client) return;
    try {
      await client.auth.signOut();
    } catch (err: any) {
      console.warn('Supabase signOut error:', err?.message);
    }
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('relay_supabase_session');
      window.localStorage.removeItem('relay:demo_bypass');
    }
  },

  onAuthStateChange(callback: (session: Session | null, user: User | null) => void) {
    const client = getSupabase();
    if (!client) {
      return { unsubscribe: () => {} };
    }
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      callback(session, session?.user || null);
    });
    return {
      unsubscribe: () => subscription.unsubscribe(),
    };
  },
};
