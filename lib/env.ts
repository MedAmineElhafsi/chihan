/**
 * Whether Supabase is configured. `NEXT_PUBLIC_*` vars are inlined at build
 * time, so this is safe to read on both the server and the client. Used to
 * keep the app runnable before real keys are added to `.env.local`.
 */
export const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
