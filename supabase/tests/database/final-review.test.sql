-- Additional final-review checks. Disposable local database only.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_temp;
select no_plan();

create function pg_temp.expect_state(command text, expected_state text)
returns boolean language plpgsql security invoker set search_path = public, extensions, pg_temp as $$
begin
  execute command;
  return expected_state = '00000';
exception when others then
  return sqlstate = expected_state;
end;
$$;

select ok(not rolsuper and not rolbypassrls and not rolcanlogin,
  rolname || ' is a non-login role subject to RLS')
from pg_roles where rolname in ('anon', 'authenticated') order by rolname;
select ok(not pg_has_role('authenticated', 'service_role', 'MEMBER'), 'Authenticated does not inherit service_role');
select ok(not pg_has_role('anon', 'service_role', 'MEMBER'), 'Anon does not inherit service_role');
select ok(not has_schema_privilege(r, 'campusfind_private', 'USAGE'), r || ' cannot access internal schema')
from unnest(array['anon', 'authenticated', 'service_role']) as r;
select ok(not has_function_privilege(r, p.oid, 'EXECUTE'), r || ' cannot execute ' || p.proname)
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
cross join unnest(array['anon', 'authenticated', 'service_role']) as r
where n.nspname = 'campusfind_private' order by p.proname, r;
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'campusfind_private' and p.prosecdef), 1, 'Only Auth profile function is SECURITY DEFINER');
select ok(p.proconfig @> array['search_path=""'], p.proname || ' pins empty search_path')
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'campusfind_private' order by p.proname;

-- has_column_privilege accounts for table-wide and inherited grants as well.
select ok(not has_column_privilege('authenticated', 'public.items', c, 'UPDATE'), 'Client cannot UPDATE items.' || c)
from unnest(array['id','reporter_id','type','status','created_at','updated_at']) as c;
select ok(not has_column_privilege('authenticated', 'public.items', c, 'INSERT'), 'Client cannot INSERT items.' || c)
from unnest(array['id','status','created_at','updated_at']) as c;
select ok(not has_column_privilege('authenticated', 'public.profiles', c, 'UPDATE'), 'Client cannot UPDATE profiles.' || c)
from unnest(array['id','role','created_at','updated_at']) as c;
select ok(not has_column_privilege('authenticated', 'public.item_images', c, 'INSERT'), 'Client cannot INSERT item_images.' || c)
from unnest(array['id','image_slot','created_at']) as c;
select ok(not has_table_privilege(r, 'public.claims', action), r || ' cannot ' || action || ' claims')
from unnest(array['anon','authenticated']) as r
cross join unnest(array['INSERT','UPDATE','DELETE','TRUNCATE','TRIGGER','REFERENCES']) as action;
select ok(not has_table_privilege('authenticated', t, action), 'Client cannot ' || action || ' ' || t)
from unnest(array['public.profiles','public.items','public.item_images']) as t
cross join unnest(array['TRUNCATE','TRIGGER','REFERENCES']) as action;
select ok(not has_table_privilege('anon', 'public.claims', 'SELECT'), 'Anon cannot SELECT claims');

insert into auth.users (id,email) values
('d0000000-0000-0000-0000-000000000001','review-reporter@example.invalid'),
('d0000000-0000-0000-0000-000000000002','review-claimant@example.invalid'),
('d0000000-0000-0000-0000-000000000003','review-admin@example.invalid');
update profiles set role = 'ADMIN' where id = 'd0000000-0000-0000-0000-000000000003';
insert into items (id,reporter_id,type,title,category,location,event_date) values
('e0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','FOUND','Review fixture','Other','Test lab',current_date);
insert into claims (item_id,claimant_id,proof_text) values
('e0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002','Strictly private review evidence');

set local role authenticated;
set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000003';
select is((select role from profiles), 'ADMIN', 'Fixture is a real application ADMIN');
select is((select count(*)::int from claims), 0, 'ADMIN outside claim cannot read evidence');
select ok(pg_temp.expect_state($q$update profiles set role = 'USER' where id = auth.uid()$q$, '42501'), 'ADMIN has no role-column write grant');
select ok(pg_temp.expect_state($q$update claims set status = 'APPROVED'$q$, '42501'), 'ADMIN cannot approve client-side');
select ok(pg_temp.expect_state($q$select campusfind_private.create_user_profile()$q$, '42501'), 'Direct definer call denied');
select ok(pg_temp.expect_state($q$insert into item_images (item_id,storage_path,image_slot) values ('e0000000-0000-0000-0000-000000000001','irrelevant',1)$q$, '42501'), 'Client cannot override image slot');
with changed as (update items set title = 'Admin overwrite' returning id)
select is((select count(*)::int from changed), 0, 'ADMIN cannot edit another reporter item');

set local request.jwt.claim.sub = '';
set local request.jwt.claims = '{}';
select is(auth.uid(), null::uuid, 'Missing JWT identity yields NULL');
select is((select count(*)::int from profiles), 0, 'Missing identity cannot read private profiles');
select is((select count(*)::int from claims), 0, 'Missing identity cannot read private evidence');
select ok(pg_temp.expect_state($q$insert into items (reporter_id,type,title,category,location,event_date) values ('d0000000-0000-0000-0000-000000000001','FOUND','No identity','Other','Test lab',current_date)$q$, '42501'), 'Missing identity cannot spoof reporter');

set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000001';
-- Blank/null and mismatched Storage owner IDs must not satisfy INSERT policy.
select ok(pg_temp.expect_state($q$insert into storage.objects (bucket_id,name,owner_id) values ('item-images','d0000000-0000-0000-0000-000000000001/e0000000-0000-0000-0000-000000000001/f0000000-0000-0000-0000-000000000001.jpg',null)$q$, '42501'), 'Storage rejects null owner_id');
select ok(pg_temp.expect_state($q$insert into storage.objects (bucket_id,name,owner_id) values ('item-images','d0000000-0000-0000-0000-000000000001/e0000000-0000-0000-0000-000000000001/f0000000-0000-0000-0000-000000000001.jpg','d0000000-0000-0000-0000-000000000002')$q$, '42501'), 'Storage rejects mismatched owner_id');
select ok(pg_temp.expect_state($q$insert into storage.objects (bucket_id,name,owner_id) values ('item-images','d0000000-0000-0000-0000-000000000001/e0000000-0000-0000-0000-000000000001/f0000000-0000-0000-0000-000000000001.exe',auth.uid()::text)$q$, '42501'), 'Storage rejects disallowed filename');
select ok(pg_temp.expect_state($q$insert into storage.objects (bucket_id,name,owner_id) values ('item-images','d0000000-0000-0000-0000-000000000001/e0000000-0000-0000-0000-000000000009/f0000000-0000-0000-0000-000000000001.jpg',auth.uid()::text)$q$, '42501'), 'Storage rejects nonexistent item path');
select ok(pg_temp.expect_state($q$insert into storage.objects (bucket_id,name,owner_id) values ('item-images','d0000000-0000-0000-0000-000000000001/e0000000-0000-0000-0000-000000000001/f0000000-0000-0000-0000-000000000001.jpg',auth.uid()::text)$q$, '00000'), 'Owner can create unregistered upload metadata (quota dependency)');
with changed as (update storage.objects set name = 'moved.jpg' where bucket_id = 'item-images' returning id)
select is((select count(*)::int from changed), 0, 'Reporter cannot overwrite/move Storage object');
set local request.jwt.claim.sub = 'd0000000-0000-0000-0000-000000000002';
select is((select count(*)::int from storage.objects where bucket_id = 'item-images'), 0, 'Non-owner cannot see unregistered image');

reset role;
select * from finish();
rollback;
