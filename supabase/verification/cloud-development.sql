-- Read-only metadata inspection for campusfind-dev; one result also works with CLI db query.
select jsonb_build_object(
  'migrations', (select coalesce(jsonb_agg(to_jsonb(q)), '[]'::jsonb) from (
select version from supabase_migrations.schema_migrations order by version
  ) q),
  'tables', (select coalesce(jsonb_agg(to_jsonb(q)), '[]'::jsonb) from (
select c.relname, c.relrowsecurity, c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('profiles','items','item_images','claims')
  ) q),
  'constraints', (select coalesce(jsonb_agg(to_jsonb(q)), '[]'::jsonb) from (
select conrelid::regclass as table_name, conname, contype, pg_get_constraintdef(oid) as definition
from pg_constraint where conrelid in ('public.profiles'::regclass,'public.items'::regclass,'public.item_images'::regclass,'public.claims'::regclass)
order by conrelid::regclass::text, conname
  ) q),
  'indexes', (select coalesce(jsonb_agg(to_jsonb(q)), '[]'::jsonb) from (
select tablename, indexname, indexdef from pg_indexes
where schemaname = 'public' and tablename in ('profiles','items','item_images','claims') order by tablename,indexname
  ) q),
  'policies', (select coalesce(jsonb_agg(to_jsonb(q)), '[]'::jsonb) from (
select schemaname, tablename, policyname, roles, cmd, qual, with_check from pg_policies
where (schemaname = 'public' and tablename in ('profiles','items','item_images','claims'))
   or (schemaname = 'storage' and tablename = 'objects') order by schemaname,tablename,policyname
  ) q),
  'column_privileges', (select coalesce(jsonb_agg(to_jsonb(q)), '[]'::jsonb) from (
select r.role_name, c.table_name, c.column_name,
  has_column_privilege(r.role_name, format('%I.%I', c.table_schema,c.table_name), c.column_name,'SELECT') as can_select,
  has_column_privilege(r.role_name, format('%I.%I', c.table_schema,c.table_name), c.column_name,'INSERT') as can_insert,
  has_column_privilege(r.role_name, format('%I.%I', c.table_schema,c.table_name), c.column_name,'UPDATE') as can_update
from information_schema.columns c cross join (values ('anon'),('authenticated'),('service_role')) r(role_name)
where c.table_schema = 'public' and c.table_name in ('profiles','items','item_images','claims') order by role_name,table_name,ordinal_position
  ) q),
  'table_privileges', (select coalesce(jsonb_agg(to_jsonb(q)), '[]'::jsonb) from (
select r.role_name, t.table_name,
  has_table_privilege(r.role_name,'public.'||t.table_name,'DELETE') as can_delete,
  has_table_privilege(r.role_name,'public.'||t.table_name,'TRUNCATE') as can_truncate,
  has_table_privilege(r.role_name,'public.'||t.table_name,'TRIGGER') as can_trigger,
  has_table_privilege(r.role_name,'public.'||t.table_name,'REFERENCES') as can_reference
from (values ('anon'),('authenticated'),('service_role')) r(role_name)
cross join (values ('profiles'),('items'),('item_images'),('claims')) t(table_name)
  ) q),
  'roles', (select coalesce(jsonb_agg(to_jsonb(q)), '[]'::jsonb) from (
select rolname, rolsuper, rolbypassrls, rolcanlogin from pg_roles where rolname in ('anon','authenticated','service_role')
  ) q),
  'functions', (select coalesce(jsonb_agg(to_jsonb(q)), '[]'::jsonb) from (
select p.proname,p.prosecdef,p.proconfig,p.proowner::regrole,
  has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
  has_function_privilege('service_role',p.oid,'EXECUTE') as service_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'campusfind_private'
  ) q),
  'triggers', (select coalesce(jsonb_agg(to_jsonb(q)), '[]'::jsonb) from (
select event_object_schema,event_object_table,trigger_name,action_statement from information_schema.triggers
where (event_object_schema = 'public' and event_object_table in ('profiles','items','item_images','claims'))
   or (event_object_schema = 'auth' and trigger_name = 'campusfind_auth_profile')
  ) q),
  'bucket', (select coalesce(jsonb_agg(to_jsonb(q)), '[]'::jsonb) from (
select id,name,public,file_size_limit,allowed_mime_types from storage.buckets where id = 'item-images'
  ) q)
) as verification;
