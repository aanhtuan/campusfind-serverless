# Shared infrastructure

`utils.ts` provides the class-name helper used by shadcn/ui.
Future Supabase browser and server helpers belong in `lib/supabase/`.
The packages are installed, but clients and auth session handling are deferred to the authentication task.
