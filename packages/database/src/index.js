import { createInMemoryRepositories } from './InMemoryRepository';
import { createSupabaseRepositories } from './SupabaseRepository';
export * from './interfaces';
export * from './InMemoryRepository';
export * from './SupabaseRepository';
/**
 * Repository factory.
 * If Supabase environment variables are provided, uses Supabase.
 * Otherwise, falls back to in-memory repository (ideal for tests and standalone local demo).
 */
export function getRepositories(config) {
    const url = config?.supabaseUrl || process.env.SUPABASE_URL;
    const key = config?.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key && !url.includes('your-project')) {
        try {
            return createSupabaseRepositories(url, key);
        }
        catch (err) {
            console.warn('Failed to initialize Supabase repositories, falling back to InMemory:', err);
        }
    }
    return createInMemoryRepositories();
}
//# sourceMappingURL=index.js.map