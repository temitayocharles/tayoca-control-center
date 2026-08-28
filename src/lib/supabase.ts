/**
 * Compatibility shim for pages inherited from the upstream dashboard.
 * Production identity is enforced before the app loads by Cloudflare Access.
 * No browser-side Supabase authentication is supported by Tayoca Control Center.
 */
export const supabase = null;
export const isSupabaseConfigured = (): false => false;
