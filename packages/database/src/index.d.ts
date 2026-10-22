import { IRepositories } from './interfaces';
export * from './interfaces';
export * from './InMemoryRepository';
export * from './SupabaseRepository';
/**
 * Repository factory.
 * If Supabase environment variables are provided, uses Supabase.
 * Otherwise, falls back to in-memory repository (ideal for tests and standalone local demo).
 */
export declare function getRepositories(config?: {
    supabaseUrl?: string;
    supabaseKey?: string;
}): IRepositories;
//# sourceMappingURL=index.d.ts.map