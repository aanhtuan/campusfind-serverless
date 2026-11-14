# Features

Domain modules are `auth`, `reports`, `discovery` and `workflow`. Keep module-specific components, validation, data access and types together. Shared Supabase clients stay in `src/lib/supabase`; authenticated workflow input validation is shared with the Deno Edge Function under `supabase/functions/_shared`.

See `docs/mvp-workflow.md` for private data boundaries, atomic transitions and deployment requirements.
