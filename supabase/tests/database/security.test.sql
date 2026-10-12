-- Run ONLY against disposable local Supabase. All fixtures roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_temp;
select no_plan();

-- Execute as the CURRENT role, never as a privileged definer.
create function pg_temp.has_result(command text, expected_state text default '00000')
returns boolean language plpgsql security invoker set search_path = public, extensions, pg_temp as $$
begin
  execute command;
  return expected_state = '00000';
exception when others then
  return sqlstate = expected_state;
end;
$$;

insert into auth.users (id, email, raw_user_meta_data) values
('00000000-0000-0000-0000-000000000001', 'reporter@example.invalid', '{"role":"ADMIN"}'),
('00000000-0000-0000-0000-000000000002', 'claimant@example.invalid', '{}'),
('00000000-0000-0000-0000-000000000003', 'outsider@example.invalid', '{}');
select is((select count(*)::int from profiles), 3, 'Auth trigger creates profiles');
select is((select role from profiles where id = '00000000-0000-0000-0000-000000000001'), 'USER', 'User metadata cannot assign ADMIN');
select ok((select bool_and(created_at is not null and updated_at is not null) from profiles), 'Profile timestamps set');
select is((select count(*)::int from pg_class where oid in ('profiles'::regclass, 'items'::regclass, 'item_images'::regclass, 'claims'::regclass) and relrowsecurity), 4, 'All four application tables use RLS');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select is((select count(*)::int from profiles), 1, 'Members see only own profile');
select ok(pg_temp.has_result($q$update profiles set display_name = 'Campus reporter' where id = auth.uid()$q$), 'Own display name is editable');
select ok(pg_temp.has_result($q$update profiles set role = 'ADMIN' where id = auth.uid()$q$, '42501'), 'Role escalation forbidden by column grants');
select ok(pg_temp.has_result($q$update profiles set id = gen_random_uuid() where id = auth.uid()$q$, '42501'), 'Profile identity update forbidden');
select ok(pg_temp.has_result($q$update profiles set updated_at = '2000-01-01' where id = auth.uid()$q$, '42501'), 'Client cannot forge profile timestamps');
select ok(pg_temp.has_result($q$insert into profiles (id) values (auth.uid())$q$, '42501'), 'Direct profile creation forbidden');
select ok(pg_temp.has_result($q$insert into items (type,title,category,location,event_date) values ('FOUND','Backpack','Bags','Library',current_date)$q$), 'Member creates own OPEN report using default reporter');
select ok((select reporter_id = auth.uid() and status = 'OPEN' from items limit 1), 'Report defaults match caller');
select ok(pg_temp.has_result($q$insert into items (reporter_id,type,title,category,location,event_date) values ('00000000-0000-0000-0000-000000000002','FOUND','Spoof','Bags','Library',current_date)$q$, '42501'), 'Reporter spoof rejected by RLS');
select ok(pg_temp.has_result($q$insert into items (type,title,category,location,event_date,status) values ('FOUND','Spoof','Bags','Library',current_date,'RESOLVED')$q$, '42501'), 'Custom initial status forbidden');
select ok(pg_temp.has_result($q$update items set title = 'Blue backpack' where reporter_id = auth.uid()$q$), 'Owner edits permitted fields');
select ok(pg_temp.has_result($q$update items set reporter_id = '00000000-0000-0000-0000-000000000002'$q$, '42501'), 'Reporter reassignment forbidden');
select ok(pg_temp.has_result($q$update items set status = 'RESOLVED'$q$, '42501'), 'Direct item status update forbidden');
select ok(pg_temp.has_result($q$update items set type = 'LOST'$q$, '42501'), 'Item type is immutable to clients');
select ok(pg_temp.has_result($q$delete from items$q$, '42501'), 'Client item hard deletion forbidden');
select ok(pg_temp.has_result($q$update items set created_at = '2000-01-01'$q$, '42501'), 'Client cannot forge item creation time');
select ok(pg_temp.has_result($q$insert into items (type,title,category,location,event_date) values ('OTHER','Invalid','Bags','Library',current_date)$q$, '23514'), 'Item type CHECK enforced');
select ok(pg_temp.has_result($q$insert into items (type,title,category,location,event_date) values ('FOUND',' ','Bags','Library',current_date)$q$, '23514'), 'Blank title rejected');

-- Fixed item IDs are owner-only fixtures, not available in client INSERT grants.
reset role;
insert into items (id,reporter_id,type,title,category,location,event_date,status) values
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','FOUND','Keys','Keys','Hall',current_date,'OPEN'),
('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','LOST','Bottle','Other','Hall',current_date,'OPEN'),
('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','FOUND','Resolved','Other','Hall',current_date,'RESOLVED'),
('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','FOUND','Closed','Other','Hall',current_date,'CLOSED');
select ok(pg_temp.has_result($q$insert into items (reporter_id,type,title,category,location,event_date) values ('ffffffff-ffff-ffff-ffff-ffffffffffff','FOUND','Bad FK','Other','Hall',current_date)$q$, '23503'), 'Reporter FK enforced');
select ok(pg_temp.has_result($q$update items set status = 'INVALID' where id = '10000000-0000-0000-0000-000000000001'$q$, '23514'), 'Invalid trusted status rejected');

set local role anon;
select is((select count(*)::int from items), 3, 'Guests see OPEN reports and not terminal reports');
select ok(pg_temp.has_result($q$select * from profiles$q$, '42501'), 'Guests cannot read private profiles');
select ok(pg_temp.has_result($q$select * from claims$q$, '42501'), 'Guests cannot read claim proof');
select ok(pg_temp.has_result($q$select * from item_images$q$, '42501'), 'Private image metadata requires authentication');
select ok(pg_temp.has_result($q$insert into items (type,title,category,location,event_date) values ('FOUND','Anon','Other','Hall',current_date)$q$, '42501'), 'Anonymous reports forbidden');
select is((select count(*)::int from storage.objects where bucket_id = 'item-images'), 0, 'Anonymous Storage read yields no objects');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
with changed as (update items set title = 'Unauthorized' returning id) select is((select count(*)::int from changed), 0, 'Cross-user update touches zero rows');
with changed as (update profiles set display_name = 'Unauthorized' where id = '00000000-0000-0000-0000-000000000001' returning id) select is((select count(*)::int from changed), 0, 'Cross-user profile edit touches zero rows');
select ok(pg_temp.has_result($q$insert into claims (item_id,claimant_id,proof_text) values ('10000000-0000-0000-0000-000000000001',auth.uid(),'Private evidence')$q$, '42501'), 'Direct client claim creation forbidden');
select ok(pg_temp.has_result($q$update claims set status = 'APPROVED'$q$, '42501'), 'Direct client claim approval forbidden');
select ok(pg_temp.has_result($q$delete from claims$q$, '42501'), 'Direct client claim deletion forbidden');
select ok(pg_temp.has_result($q$insert into item_images (item_id,storage_path) values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000001.jpg')$q$, '23503'), 'Cross-user image insert forbidden');

set local role service_role;
select ok(pg_temp.has_result($q$insert into claims (item_id,claimant_id,proof_text) values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','Private evidence')$q$), 'Trusted backend can create PENDING claim');
select ok(pg_temp.has_result($q$insert into claims (item_id,claimant_id,proof_text) values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','Duplicate')$q$, '23505'), 'Duplicate active claim rejected');
select ok(pg_temp.has_result($q$insert into claims (item_id,claimant_id,proof_text) values ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','Lost report')$q$, '23514'), 'LOST report cannot receive claim');
select ok(pg_temp.has_result($q$insert into claims (item_id,claimant_id,proof_text) values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Own report')$q$, '23514'), 'Self-claim rejected');
select ok(pg_temp.has_result($q$insert into claims (item_id,claimant_id,proof_text) values ('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002','Resolved')$q$, '23514'), 'Resolved report rejects new claims');
select ok(pg_temp.has_result($q$insert into claims (item_id,claimant_id,proof_text) values ('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000002','Closed')$q$, '23514'), 'Closed report rejects new claims');
select ok(pg_temp.has_result($q$insert into claims (item_id,claimant_id,proof_text) values ('10000000-0000-0000-0000-000000000001','ffffffff-ffff-ffff-ffff-ffffffffffff','Bad FK')$q$, '23503'), 'Claimant FK enforced');
select ok(pg_temp.has_result($q$insert into claims (item_id,claimant_id,proof_text) values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003',' ')$q$, '23514'), 'Blank evidence rejected');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select is((select proof_text from claims limit 1), 'Private evidence', 'Claimant can read own evidence');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select is((select proof_text from claims limit 1), 'Private evidence', 'Reporter can read evidence');
select is((select count(*)::int from items), 5, 'Reporter sees own terminal reports');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select is((select count(*)::int from claims), 0, 'Outsider cannot read evidence');

set local role service_role;
insert into claims (item_id,claimant_id,proof_text) values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','Other evidence');
select ok(pg_temp.has_result($q$update claims set status = 'APPROVED' where claimant_id = '00000000-0000-0000-0000-000000000002'$q$), 'Trusted workflow can approve a pending claim');
select ok(pg_temp.has_result($q$update claims set status = 'APPROVED' where claimant_id = '00000000-0000-0000-0000-000000000003'$q$, '23505'), 'Second APPROVED claim rejected');
select ok(pg_temp.has_result($q$update claims set status = 'CANCELLED' where status = 'APPROVED'$q$, '23514'), 'Terminal claim cannot transition again');
select ok(pg_temp.has_result($q$update claims set claimant_id = '00000000-0000-0000-0000-000000000003' where status = 'APPROVED'$q$, '23514'), 'Claim identity immutable even for backend');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select ok(pg_temp.has_result($q$insert into item_images (item_id,storage_path) values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000001.jpg')$q$), 'Reporter creates image metadata');
select ok(pg_temp.has_result($q$insert into item_images (item_id,storage_path) values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000001.jpg')$q$, '23505'), 'Duplicate storage path rejected');
select ok(pg_temp.has_result($q$insert into item_images (item_id,storage_path) values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002/10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000002.jpg')$q$, '23514'), 'Metadata path ownership enforced');
select ok(pg_temp.has_result($q$insert into item_images (item_id,storage_path) values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000002.exe')$q$, '23514'), 'Image path extension CHECK enforced');
insert into item_images (item_id,storage_path) values
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000002.png'),
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000003.webp');
select ok(pg_temp.has_result($q$insert into item_images (item_id,storage_path) values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000004.jpg')$q$, '23514'), 'Fourth image rejected');
select is((select count(*)::int from item_images), 3, 'Exactly three image slots remain');
select ok(pg_temp.has_result($q$update item_images set item_id = '10000000-0000-0000-0000-000000000002'$q$, '42501'), 'Image reassignment forbidden');

-- SQL-only Storage tests. Actual uploads/MIME/signing are separate API tests.
-- Supabase Storage normally sets this flag inside its API transaction. Only
-- simulate it here on rolled-back metadata fixtures; never use for real files.
set local storage.allow_delete_query = 'true';
select ok(pg_temp.has_result($q$insert into storage.objects (bucket_id,name,owner_id) values ('item-images','00000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000001.jpg',auth.uid()::text)$q$), 'Reporter Storage INSERT policy allows own path');
select ok(pg_temp.has_result($q$insert into storage.objects (bucket_id,name,owner_id) values ('item-images','00000000-0000-0000-0000-000000000002/10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000001.jpg',auth.uid()::text)$q$, '42501'), 'Storage path spoof rejected');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select is((select count(*)::int from storage.objects where bucket_id = 'item-images'), 1, 'Member can read registered image of public report');
with changed as (delete from item_images returning id) select is((select count(*)::int from changed), 0, 'Non-owner cannot delete image metadata');
with changed as (delete from storage.objects where bucket_id = 'item-images' returning id) select is((select count(*)::int from changed), 0, 'Non-owner cannot delete Storage object');
select ok(pg_temp.has_result($q$insert into storage.objects (bucket_id,name,owner_id) values ('item-images','00000000-0000-0000-0000-000000000002/10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000002.jpg',auth.uid()::text)$q$, '42501'), 'Non-owner cannot upload to another report');
set local role anon;
select is((select count(*)::int from storage.objects where bucket_id = 'item-images'), 0, 'Anonymous cannot read stored image');
set local role service_role;
update items set status = 'RESOLVED' where id = '10000000-0000-0000-0000-000000000001';
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select is((select count(*)::int from item_images), 0, 'Terminal item hides image metadata from other members');
select is((select count(*)::int from storage.objects where bucket_id = 'item-images'), 0, 'Terminal item hides Storage objects from other members');
select is((select count(*)::int from claims), 1, 'Claimant retains private evidence access after resolution');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
with changed as (delete from item_images where image_slot = 3 returning id) select is((select count(*)::int from changed), 1, 'Reporter can delete own image metadata');
with changed as (delete from storage.objects where bucket_id = 'item-images' returning id) select is((select count(*)::int from changed), 1, 'Reporter can delete own Storage object');
reset role;
select is((select public from storage.buckets where id = 'item-images'), false, 'Bucket is private');
-- Make the creation timestamp older, then prove an ordinary update replaces it.
update profiles set created_at = '2000-01-01', updated_at = '2000-01-01' where id = '00000000-0000-0000-0000-000000000001';
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
update profiles set display_name = 'Timestamp verification' where id = auth.uid();
select ok((select updated_at > created_at from profiles where id = auth.uid()), 'Updated timestamp replaced by database time');
reset role;
select ok(pg_temp.has_result($q$update profiles set role = 'SUPERADMIN' where id = '00000000-0000-0000-0000-000000000001'$q$, '23514'), 'Profile role CHECK enforced');
select ok(pg_temp.has_result($q$delete from auth.users where id = '00000000-0000-0000-0000-000000000001'$q$, '23503'), 'Referenced reporter cannot be hard-deleted');
select * from finish();
rollback;
