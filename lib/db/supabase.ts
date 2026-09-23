import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let browserClient: SupabaseClient | null = null

function createMockClient(): SupabaseClient {
  return {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signUp: () => Promise.resolve({ data: {}, error: null }),
      signInWithOtp: () => Promise.resolve({ data: {}, error: null }),
      verifyOtp: () => Promise.resolve({ data: {}, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      refreshSession: () => Promise.resolve({ data: { session: null }, error: null }),
    },
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null, count: 0 }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
      eq: function() { return this },
      single: () => Promise.resolve({ data: null, error: null }),
      order: function() { return this },
      range: function() { return this },
      gte: function() { return this },
      lte: function() { return this },
      in: function() { return this },
      not: function() { return this },
      gt: function() { return this },
      limit: function() { return this },
    }),
    rpc: () => Promise.resolve({ data: null, error: null }),
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => {},
    }),
  } as unknown as SupabaseClient
}

export function createClient(): SupabaseClient {
  // During build/static generation, return mock client if env vars not set
  if (!supabaseUrl || !supabaseAnonKey) {
    return createMockClient()
  }

  if (isBrowser()) {
    if (!browserClient) {
      browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
    }
    return browserClient
  }
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return []
      },
      setAll() {},
    },
  })
}

export const supabase = createClient()