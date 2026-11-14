begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions,pg_temp;
select no_plan();
insert into auth.users(id,email) values
 ('91000000-0000-4000-8000-000000000001','actor1@example.invalid'),
 ('91000000-0000-4000-8000-000000000002','actor2@example.invalid'),
 ('91000000-0000-4000-8000-000000000003','actor3@example.invalid'),
 ('91000000-0000-4000-8000-000000000004','actor4@example.invalid');
update profiles set display_name='Same Name' where id in ('91000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002');
update profiles set role='ADMIN' where id='91000000-0000-4000-8000-000000000004';
insert into items(id,reporter_id,type,title,category,location,event_date) values
 ('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','LOST','Actor SQL fixture','Other','Library',current_date),
 ('92000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000001','FOUND','Actor SQL fixture','Other','Library',current_date);
insert into claims(id,item_id,claimant_id,proof_text,status) values
 ('93000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002','Private identifying proof for labels SQL fixture','PENDING'),
 ('93000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000003','Other private identifying proof for labels fixture','PENDING');
update claims set status='APPROVED' where id='93000000-0000-4000-8000-000000000001';
update claims set status='REJECTED' where id='93000000-0000-4000-8000-000000000002';
select ok(not has_function_privilege('anon','public.actor_labels(uuid[],uuid[])','execute'),'Anonymous cannot request identities');
select ok(not has_function_privilege('anon','campusfind_private.actor_labels(uuid[],uuid[])','execute'),'Anonymous cannot bypass wrapper');
select ok(has_function_privilege('authenticated','public.actor_labels(uuid[],uuid[])','execute'),'Member may request scoped names');
set local role authenticated; set local request.jwt.claim.sub='91000000-0000-4000-8000-000000000001';
select is((select count(*)::int from actor_labels('{}',array['93000000-0000-4000-8000-000000000001'::uuid,'93000000-0000-4000-8000-000000000002'::uuid])),2,'Reporter sees competing claim identities');
select is((select reporter_display_name from actor_labels('{}','{93000000-0000-4000-8000-000000000001}')),'Same Name','Reporter name loaded');
select is((select respondent_display_name from actor_labels('{}','{93000000-0000-4000-8000-000000000001}')),'Same Name','Respondent name loaded despite self-only profiles');
select ok((select reporter_id<>respondent_id from actor_labels('{}','{93000000-0000-4000-8000-000000000001}')),'Identical names distinguished by account IDs');
select is((select claim_id from actor_labels('{92000000-0000-4000-8000-000000000001}','{}')),'93000000-0000-4000-8000-000000000001'::uuid,'Own report links exact approved claim');
select is((select count(*)::int from profiles),1,'Profile SELECT still self-only');
select throws_ok($$select * from actor_labels(array_fill('92000000-0000-4000-8000-000000000001'::uuid,array[41]),'{}')$$,'22023','At most 40 reports and 40 claims','Input bounded');
select throws_ok($$select * from actor_labels('{}',array_fill('93000000-0000-4000-8000-000000000001'::uuid,array[41]))$$,'22023','At most 40 reports and 40 claims','Claim input bounded');
select is((select count(*)::int from actor_labels(null,null)),0,'Null arrays return no actors');
set local request.jwt.claim.sub='91000000-0000-4000-8000-000000000002';
select is((select count(*)::int from actor_labels('{}','{93000000-0000-4000-8000-000000000001}')),1,'Selected respondent sees both participants');
select is((select count(*)::int from actor_labels('{}','{93000000-0000-4000-8000-000000000002}')),0,'Selected respondent cannot inspect competing claimant');
select is((select respondent_id from actor_labels('{92000000-0000-4000-8000-000000000001}','{}')),'91000000-0000-4000-8000-000000000002'::uuid,'Selected respondent sees own match on item');
set local request.jwt.claim.sub='91000000-0000-4000-8000-000000000003';
select is((select count(*)::int from actor_labels('{}','{93000000-0000-4000-8000-000000000001}')),0,'Competitor cannot inspect approved claim');
select ok((select respondent_id is null and respondent_display_name is null and claim_id is null from actor_labels('{92000000-0000-4000-8000-000000000001}','{}')),'Competitor cannot learn selected party via public item');
set local request.jwt.claim.sub='91000000-0000-4000-8000-000000000004';
select is((select count(*)::int from actor_labels('{}','{93000000-0000-4000-8000-000000000001}')),0,'Unrelated ADMIN has no private participant exception');
select ok((select respondent_id is null from actor_labels('{92000000-0000-4000-8000-000000000001}','{}')),'Active author visible but respondent hidden from unrelated member');
reset role;
reset role;
update items set status='RESOLVED' where id='92000000-0000-4000-8000-000000000001';
update items set status='RESOLVED' where id='92000000-0000-4000-8000-000000000002';
set local role authenticated; set local request.jwt.claim.sub='91000000-0000-4000-8000-000000000004';
select is((select count(*)::int from actor_labels('{92000000-0000-4000-8000-000000000002}','{}')),0,'Unrelated member cannot query terminal author');
set local request.jwt.claim.sub='91000000-0000-4000-8000-000000000003';
select is((select count(*)::int from actor_labels('{92000000-0000-4000-8000-000000000001}','{}')),1,'Former participant retains report author in history');
select ok((select respondent_id is null from actor_labels('{92000000-0000-4000-8000-000000000001}','{}')),'Rejected participant history never leaks selected party');
set local request.jwt.claim.sub='91000000-0000-4000-8000-000000000099';
select throws_ok($$select * from actor_labels('{}','{}')$$,'42501','Verified member required','Missing profile cannot enumerate labels');
set local request.jwt.claim.sub='';
select throws_ok($$select * from actor_labels('{}','{}')$$,'42501','Verified member required','Missing identity cannot enumerate labels');
select * from finish();
rollback;
