-- Disposable local database only. Real roles/RLS/triggers/RPCs; rolled back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions,pg_temp;
select no_plan();
create function pg_temp.attempt(a text,d jsonb,expected text default '00000')
returns boolean language plpgsql security invoker as $$
begin
  perform public.campusfind_workflow(a,d);
  return expected='00000';
exception when others then return sqlstate=expected;
end; $$;
insert into auth.users(id,email,raw_user_meta_data) values
('71000000-0000-4000-8000-000000000001','wf-a@example.invalid','{"role":"ADMIN"}'),
('71000000-0000-4000-8000-000000000002','wf-b@example.invalid','{}'),
('71000000-0000-4000-8000-000000000003','wf-c@example.invalid','{}'),
('71000000-0000-4000-8000-000000000004','wf-admin@example.invalid','{}');
update profiles set role='ADMIN' where id='71000000-0000-4000-8000-000000000004';
insert into items(id,reporter_id,type,title,category,location,event_date) values
('72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','FOUND','Wallet','Other','Library',current_date),
('72000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000001','LOST','Keys','Other','Library',current_date),
('72000000-0000-4000-8000-000000000003','71000000-0000-4000-8000-000000000001','FOUND','Rejection fixture','Other','Library',current_date);
select ok(not has_table_privilege('authenticated',t,a),'No direct '||a||' on '||t)
from unnest(array['handovers','claim_contacts','workflow_issues']) t cross join unnest(array['INSERT','UPDATE','DELETE']) a;
select ok((select relrowsecurity from pg_class where oid=t::regclass),t||' has RLS') from unnest(array['handovers','claim_contacts','workflow_issues']) t;
select ok(not has_function_privilege('anon','public.campusfind_workflow(text,jsonb)','EXECUTE'),'Guest cannot execute workflow');
select ok(not has_function_privilege(r,p.oid,'EXECUTE'),r||' cannot execute private '||p.proname)
from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join unnest(array['anon','service_role']) r where n.nspname='campusfind_private';
select ok(not p.prosecdef,'Exposed wrapper '||p.proname||' is SECURITY INVOKER') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('campusfind_workflow','campusfind_admin_overview');
select ok(not has_function_privilege('service_role','public.campusfind_workflow(text,jsonb)','EXECUTE'),'No service-role workflow endpoint');
set local role authenticated;
set local request.jwt.claim.sub='71000000-0000-4000-8000-000000000001';
select is((select role from profiles),'USER','Registration metadata cannot assign ADMIN');
select throws_ok('select public.campusfind_admin_overview()', '42501', 'Not permitted', 'Ordinary user cannot read administrative aggregates');
select ok(pg_temp.attempt('acknowledge_issue','{"issue_id":"73000000-0000-4000-8000-000000000001"}','42501'),'Ordinary user cannot acknowledge issues as ADMIN');
select ok(pg_temp.attempt('submit_claim','{"item_id":"72000000-0000-4000-8000-000000000001","request_id":"73000000-0000-4000-8000-000000000001","proof_text":"Identifying ownership evidence"}','42501'),'Reporter cannot claim own item');
set local request.jwt.claim.sub='71000000-0000-4000-8000-000000000002';
select ok(pg_temp.attempt('submit_claim','{"item_id":"72000000-0000-4000-8000-000000000002","request_id":"73000000-0000-4000-8000-000000000001","proof_text":"Identifying ownership evidence"}','42501'),'LOST report cannot receive ownership claim');
select ok(pg_temp.attempt('submit_claim','{"item_id":"72000000-0000-4000-8000-000000000001","request_id":"73000000-0000-4000-8000-000000000001","proof_text":"Short"}','22023'),'Evidence minimum enforced by database');
select ok(pg_temp.attempt('submit_claim','{"item_id":"72000000-0000-4000-8000-000000000001","request_id":"73000000-0000-4000-8000-000000000001","proof_text":"Identifying ownership evidence","claimant_id":"71000000-0000-4000-8000-000000000001"}','22023'),'Cannot impersonate actor via RPC fields');
select ok(pg_temp.attempt('submit_claim','{"item_id":"72000000-0000-4000-8000-000000000001","request_id":"73000000-0000-4000-8000-000000000001","proof_text":"Identifying ownership evidence"}'),'B submits private claim');
select ok(pg_temp.attempt('submit_claim','{"item_id":"72000000-0000-4000-8000-000000000001","request_id":"73000000-0000-4000-8000-000000000001","proof_text":"Identifying ownership evidence"}'),'Lost-response replay returns same claim');
select is((select count(*)::int from claims),1,'Idempotent request creates one row');
select ok(pg_temp.attempt('submit_claim','{"item_id":"72000000-0000-4000-8000-000000000001","request_id":"73000000-0000-4000-8000-000000000002","proof_text":"Another identifying ownership proof"}','23505'),'Duplicate active claimant blocked');
set local request.jwt.claim.sub='71000000-0000-4000-8000-000000000003';
select is((select count(*)::int from claims),0,'C cannot read B private evidence');
select ok(pg_temp.attempt('submit_claim','{"item_id":"72000000-0000-4000-8000-000000000001","request_id":"73000000-0000-4000-8000-000000000002","proof_text":"Another identifying ownership proof"}'),'C submits competing claim');
select ok(pg_temp.attempt('review_claim','{"claim_id":"73000000-0000-4000-8000-000000000001","decision":"APPROVED"}','42501'),'C cannot review B claim');
set local request.jwt.claim.sub='71000000-0000-4000-8000-000000000004';
select is((select count(*)::int from claims),0,'ADMIN gets no claim evidence');
select ok(pg_temp.attempt('review_claim','{"claim_id":"73000000-0000-4000-8000-000000000001","decision":"APPROVED"}','42501'),'ADMIN cannot review unrelated claim');
set local request.jwt.claim.sub='71000000-0000-4000-8000-000000000001';
select ok(pg_temp.attempt('review_claim','{"claim_id":"73000000-0000-4000-8000-000000000001","decision":"APPROVED"}'),'Reporter approves B atomically');
select is((select status from items where id='72000000-0000-4000-8000-000000000001'),'IN_PROGRESS','Approval advances item');
select is((select status from claims where id='73000000-0000-4000-8000-000000000002'),'REJECTED','Approval rejects competing pending claim');
select ok(pg_temp.attempt('review_claim','{"claim_id":"73000000-0000-4000-8000-000000000002","decision":"APPROVED"}','22023'),'Second approval blocked');
select ok(pg_temp.attempt('close_report','{"item_id":"72000000-0000-4000-8000-000000000001"}','22023'),'Cannot close unfinished FOUND report');
select ok(pg_temp.attempt('resolve_lost','{"item_id":"72000000-0000-4000-8000-000000000001"}','22023'),'FOUND cannot bypass two-sided completion');
select ok(pg_temp.attempt('propose_handover',jsonb_build_object('claim_id','73000000-0000-4000-8000-000000000001','location','Private apartment','meeting_at',now()+interval '1 day','revision',0),'22023'),'Unsafe location rejected');
select ok(pg_temp.attempt('propose_handover',jsonb_build_object('claim_id','73000000-0000-4000-8000-000000000001','location','Campus security office','meeting_at',now()+interval '1 day','revision',0)),'Reporter proposes public handover');
select ok(pg_temp.attempt('accept_handover','{"claim_id":"73000000-0000-4000-8000-000000000001","revision":1}','22023'),'Proposer cannot accept own proposal');
select ok(pg_temp.attempt('confirm_return','{"claim_id":"73000000-0000-4000-8000-000000000001","revision":1}','22023'),'Return cannot be confirmed before acceptance');
set local request.jwt.claim.sub='71000000-0000-4000-8000-000000000002';
select is((select count(*)::int from claim_contacts),0,'Contact private by default: no automatic account data');
select ok(pg_temp.attempt('share_contact','{"claim_id":"73000000-0000-4000-8000-000000000001","kind":"EMAIL","value":"chosen@example.invalid","consent":false}','22023'),'Sharing without explicit consent rejected');
select ok(pg_temp.attempt('share_contact','{"claim_id":"73000000-0000-4000-8000-000000000001","kind":"EMAIL","value":"chosen@example.invalid","consent":true}'),'B explicitly shares chosen contact');
select ok(pg_temp.attempt('accept_handover','{"claim_id":"73000000-0000-4000-8000-000000000001","revision":0}','22023'),'Stale arrangement cannot be accepted');
select ok(pg_temp.attempt('request_change','{"claim_id":"73000000-0000-4000-8000-000000000001","revision":1}'),'B requests a proposal change');
select ok(pg_temp.attempt('accept_handover','{"claim_id":"73000000-0000-4000-8000-000000000001","revision":2}','22023'),'Change request requires new proposal before acceptance');
select ok(pg_temp.attempt('propose_handover',jsonb_build_object('claim_id','73000000-0000-4000-8000-000000000001','location','University reception','meeting_at',now()+interval '2 days','revision',2)),'B submits revised arrangement');
set local request.jwt.claim.sub='71000000-0000-4000-8000-000000000003';
select is((select count(*)::int from handovers),0,'Rejected claimant cannot read private handover');
select is((select count(*)::int from claim_contacts),0,'Rejected claimant cannot read contact');
select ok(pg_temp.attempt('confirm_return','{"claim_id":"73000000-0000-4000-8000-000000000001","revision":3}','42501'),'C cannot confirm another return');
set local request.jwt.claim.sub='71000000-0000-4000-8000-000000000004';
select is((select count(*)::int from handovers),0,'ADMIN cannot read private handover');
select is((select count(*)::int from claim_contacts),0,'ADMIN cannot read contact');
select ok(campusfind_admin_overview() ? 'claims','ADMIN reads aggregate overview without evidence');
set local request.jwt.claim.sub='71000000-0000-4000-8000-000000000001';
select is((select value from claim_contacts),'chosen@example.invalid','Reporter sees only consented contact');
select ok(pg_temp.attempt('accept_handover','{"claim_id":"73000000-0000-4000-8000-000000000001","revision":3}'),'Reporter accepts B revised proposal');
select ok(pg_temp.attempt('open_issue','{"claim_id":"73000000-0000-4000-8000-000000000001","category":"MISSED_MEETING"}'),'Reporter opens operational issue');
select ok(pg_temp.attempt('confirm_return','{"claim_id":"73000000-0000-4000-8000-000000000001","revision":3}','22023'),'Open issue blocks confirmation');
select ok(pg_temp.attempt('resume_issue',jsonb_build_object('claim_id','73000000-0000-4000-8000-000000000001','issue_id',(select id from workflow_issues))),'Reporter agrees to resume');
select is((select status from workflow_issues),'OPEN','One-sided resumption cannot unblock return');
set local request.jwt.claim.sub='71000000-0000-4000-8000-000000000004';
select ok(pg_temp.attempt('acknowledge_issue',jsonb_build_object('issue_id',(select id from workflow_issues))),'ADMIN acknowledges structured issue');
select is((select status from workflow_issues),'ACKNOWLEDGED','Acknowledgement does not force resolution');
set local request.jwt.claim.sub='71000000-0000-4000-8000-000000000002';
select ok(pg_temp.attempt('resume_issue',jsonb_build_object('claim_id','73000000-0000-4000-8000-000000000001','issue_id',(select id from workflow_issues))),'Claimant agrees to resume');
select is((select status from workflow_issues),'RESOLVED','Both parties resolve issue');
select ok(pg_temp.attempt('revoke_contact','{"claim_id":"73000000-0000-4000-8000-000000000001"}'),'B revokes sharing');
select is((select count(*)::int from claim_contacts),0,'Revoked contact removed');
set local request.jwt.claim.sub='71000000-0000-4000-8000-000000000001';
select ok(pg_temp.attempt('confirm_return','{"claim_id":"73000000-0000-4000-8000-000000000001","revision":3}'),'Reporter confirms item handed over');
select ok((select claimant_confirmed_at is null and reporter_confirmed_at is not null from handovers),'Reporter cannot impersonate claimant receipt');
select is((select status from items where id='72000000-0000-4000-8000-000000000001'),'IN_PROGRESS','Single confirmation does not resolve');
select ok(pg_temp.attempt('confirm_return','{"claim_id":"73000000-0000-4000-8000-000000000001","revision":3}','22023'),'Duplicate confirmation rejected');
select ok(pg_temp.attempt('request_change','{"claim_id":"73000000-0000-4000-8000-000000000001","revision":3}','22023'),'Confirmed return cannot be silently rearranged');
set local request.jwt.claim.sub='71000000-0000-4000-8000-000000000002';
select ok(pg_temp.attempt('confirm_return','{"claim_id":"73000000-0000-4000-8000-000000000001","revision":3}'),'Claimant confirms receipt');
select is((select status from items where id='72000000-0000-4000-8000-000000000001'),'RESOLVED','Both confirmations atomically resolve item');
select is((select count(*)::int from claims where status='APPROVED'),1,'Approval remains recorded after resolution');
set local role anon;
select is((select count(*)::int from items where id='72000000-0000-4000-8000-000000000001'),0,'Resolved report absent from public discovery');
set local role authenticated;
set local request.jwt.claim.sub='71000000-0000-4000-8000-000000000002';
select is((select title from items where id='72000000-0000-4000-8000-000000000001'),'Wallet','Claimant retains item history without RLS recursion');
select ok(pg_temp.attempt('submit_claim','{"item_id":"72000000-0000-4000-8000-000000000001","request_id":"73000000-0000-4000-8000-000000000003","proof_text":"Identifying ownership evidence"}','22023'),'Terminal report rejects new claims');
select ok(pg_temp.attempt('close_report','{"item_id":"72000000-0000-4000-8000-000000000001"}','42501'),'Claimant cannot close reporter record');
set local request.jwt.claim.sub='71000000-0000-4000-8000-000000000001';
select ok(pg_temp.attempt('close_report','{"item_id":"72000000-0000-4000-8000-000000000001"}'),'Reporter closes completed report');
select ok(pg_temp.attempt('resolve_lost','{"item_id":"72000000-0000-4000-8000-000000000002"}'),'Owner independently resolves LOST item');
select ok(pg_temp.attempt('close_report','{"item_id":"72000000-0000-4000-8000-000000000002"}'),'Owner closes resolved LOST report');
-- Separate rejected/cancelled paths preserve OPEN and immutable outcomes.
set local request.jwt.claim.sub='71000000-0000-4000-8000-000000000002';
select ok(pg_temp.attempt('submit_claim','{"item_id":"72000000-0000-4000-8000-000000000003","request_id":"73000000-0000-4000-8000-000000000003","proof_text":"Incorrect but sufficiently long proof"}'),'Submit claim for rejection');
set local request.jwt.claim.sub='71000000-0000-4000-8000-000000000001';
select ok(pg_temp.attempt('review_claim','{"claim_id":"73000000-0000-4000-8000-000000000003","decision":"REJECTED"}'),'Reporter rejects incorrect evidence');
select is((select status from items where id='72000000-0000-4000-8000-000000000003'),'OPEN','Rejected claim leaves item OPEN');
set local request.jwt.claim.sub='71000000-0000-4000-8000-000000000002';
select ok(pg_temp.attempt('cancel_claim','{"claim_id":"73000000-0000-4000-8000-000000000003"}','22023'),'Claimant cannot change rejection');
select ok(pg_temp.attempt('submit_claim','{"item_id":"72000000-0000-4000-8000-000000000003","request_id":"73000000-0000-4000-8000-000000000004","proof_text":"New identifying ownership evidence"}'),'New valid claim allowed after rejection');
select ok(pg_temp.attempt('cancel_claim','{"claim_id":"73000000-0000-4000-8000-000000000004"}'),'Claimant cancels pending claim');
select is((select status from claims where id='73000000-0000-4000-8000-000000000004'),'CANCELLED','Cancellation recorded');
-- Inject a database error after the claim decision to prove transaction rollback.
select ok(pg_temp.attempt('submit_claim','{"item_id":"72000000-0000-4000-8000-000000000003","request_id":"73000000-0000-4000-8000-000000000005","proof_text":"New identifying ownership evidence"}'),'Prepare rollback fixture');
reset role;
create function pg_temp.fail_approval() returns trigger language plpgsql as $$
begin
  if new.status='IN_PROGRESS' then raise exception 'Injected local failure' using errcode='XX000'; end if;
  return new;
end; $$;
create trigger test_workflow_failure before update on public.items for each row execute function pg_temp.fail_approval();
set local role authenticated;
set local request.jwt.claim.sub='71000000-0000-4000-8000-000000000001';
select ok(pg_temp.attempt('review_claim','{"claim_id":"73000000-0000-4000-8000-000000000005","decision":"APPROVED"}','XX000'),'Injected database failure aborts approval');
select is((select status from claims where id='73000000-0000-4000-8000-000000000005'),'PENDING','Claim approval rolled back on item write failure');
select is((select status from items where id='72000000-0000-4000-8000-000000000003'),'OPEN','Item remains OPEN after failed transaction');
set local request.jwt.claim.sub='';
select ok(pg_temp.attempt('close_report','{"item_id":"72000000-0000-4000-8000-000000000003"}','42501'),'Missing identity rejected even via authenticated role');
reset role;
select * from finish();
rollback;
