begin;

-- Reporter/claimant are stable record identities. For LOST the reporter is the
-- recipient and the responding claimant is the holder; FOUND has inverse roles.
alter table public.claims
  add column owner_proof_text text check (owner_proof_text is null or length(btrim(owner_proof_text)) between 20 and 5000),
  add column owner_proof_submitted_at timestamptz,
  add column ownership_verified_at timestamptz,
  add constraint claims_owner_proof_pair check ((owner_proof_text is null) = (owner_proof_submitted_at is null)),
  add constraint claims_owner_verified_proof check (ownership_verified_at is null or owner_proof_text is not null);

create or replace function campusfind_private.guard_claim()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare report public.items%rowtype;
begin
  select * into report from public.items where id=new.item_id for update;
  if not found then raise exception 'Claim item does not exist' using errcode='23503'; end if;
  if report.reporter_id=new.claimant_id then
    raise exception 'Responses require another user''s report' using errcode='23514';
  end if;
  if report.type='FOUND' and (new.owner_proof_text is not null or new.ownership_verified_at is not null) then
    raise exception 'LOST verification fields are not valid for FOUND' using errcode='23514';
  end if;
  if tg_op='INSERT' then
    if new.status<>'PENDING' or report.status not in ('OPEN','IN_PROGRESS')
      or new.owner_proof_text is not null or new.ownership_verified_at is not null then
      raise exception 'New responses require an active item and PENDING status' using errcode='23514';
    end if;
  else
    if new.id is distinct from old.id or new.item_id is distinct from old.item_id
      or new.claimant_id is distinct from old.claimant_id or new.proof_text is distinct from old.proof_text
      or new.created_at is distinct from old.created_at then
      raise exception 'Claim identity, evidence and creation timestamp are immutable' using errcode='23514';
    end if;
    if new.status is distinct from old.status and not (
      (old.status='PENDING' and new.status in ('APPROVED','REJECTED','CANCELLED')) or
      (report.type='LOST' and report.status='OPEN' and old.status='APPROVED'
        and new.status='REJECTED' and old.ownership_verified_at is null)
    ) then raise exception 'Invalid claim status transition' using errcode='23514'; end if;
    if new.status='APPROVED' and old.status<>'APPROVED' and report.status not in ('OPEN','IN_PROGRESS') then
      raise exception 'An inactive item cannot approve a claim' using errcode='23514'; end if;
    if (old.owner_proof_text is not null and new.owner_proof_text is distinct from old.owner_proof_text)
      or (old.owner_proof_submitted_at is not null and new.owner_proof_submitted_at is distinct from old.owner_proof_submitted_at)
      or (old.ownership_verified_at is not null and new.ownership_verified_at is distinct from old.ownership_verified_at) then
      raise exception 'Submitted ownership evidence and verification are immutable' using errcode='23514'; end if;
    if new.owner_proof_text is distinct from old.owner_proof_text and (old.status<>'APPROVED' or report.status<>'OPEN') then
      raise exception 'Selected LOST response required' using errcode='23514'; end if;
    if new.ownership_verified_at is distinct from old.ownership_verified_at and
      (old.status<>'APPROVED' or report.status<>'OPEN' or old.owner_proof_text is null) then
      raise exception 'Submitted owner evidence required' using errcode='23514'; end if;
  end if;
  return new;
end;
$$;

-- Reuse the already tested arrangement/contact/issue/two-confirmation operations.
-- Only the guarded entry point is callable by members, including via private RPC.
alter function campusfind_private.run_workflow(text,jsonb) rename to run_workflow_base;
revoke all on function campusfind_private.run_workflow_base(text,jsonb) from public,anon,authenticated,service_role;
create function campusfind_private.run_workflow(p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  item public.items%rowtype;
  claim public.claims%rowtype;
  target uuid;
  result_id uuid;
  proof text;
  allowed text[];
begin
  if actor is null or not exists(select 1 from public.profiles where id=actor) then
    raise exception 'Authentication required' using errcode='42501'; end if;
  if p_data is null or jsonb_typeof(p_data)<>'object' then
    raise exception 'Invalid request' using errcode='22023'; end if;
  allowed := case p_action
    when 'submit_found_response' then array['item_id','proof_text','request_id']
    when 'submit_owner_proof' then array['claim_id','proof_text']
    when 'verify_owner' then array['claim_id','decision']
    when 'withdraw_match' then array['claim_id']
    when 'submit_claim' then array['item_id','proof_text','request_id']
    when 'cancel_claim' then array['claim_id']
    when 'review_claim' then array['claim_id','decision']
    when 'propose_handover' then array['claim_id','location','meeting_at','revision']
    when 'accept_handover' then array['claim_id','revision']
    when 'request_change' then array['claim_id','revision']
    when 'confirm_return' then array['claim_id','revision']
    when 'share_contact' then array['claim_id','kind','value','consent']
    when 'revoke_contact' then array['claim_id']
    when 'open_issue' then array['claim_id','category']
    when 'resume_issue' then array['claim_id','issue_id']
    when 'acknowledge_issue' then array['issue_id']
    when 'resolve_lost' then array['item_id']
    when 'close_report' then array['item_id']
    else null end;
  if allowed is null or (exists(select 1 from jsonb_object_keys(p_data) k where not(k=any(allowed)))
    or exists(select 1 from unnest(allowed) k where not(p_data ? k))) then
    raise exception 'Invalid operation fields' using errcode='22023'; end if;
  if p_action in ('submit_claim','submit_found_response','resolve_lost','close_report') then
    target := (p_data->>'item_id')::uuid;
  elsif p_action='acknowledge_issue' then
    return campusfind_private.run_workflow_base(p_action,p_data);
  else
    select item_id into target from public.claims where id=(p_data->>'claim_id')::uuid;
  end if;
  -- Same lock ordering as the base function, including cancellation and resolution.
  select * into item from public.items where id=target for update;
  if not found then raise exception 'Record unavailable' using errcode='42501'; end if;
  if p_action='submit_found_response' then
    if item.type<>'LOST' or item.reporter_id=actor then raise exception 'Not permitted' using errcode='42501'; end if;
    proof := btrim(p_data->>'proof_text'); result_id := (p_data->>'request_id')::uuid;
    if proof is null or length(proof) not between 20 and 5000 or result_id is null then
      raise exception 'Response must contain 20 to 5000 characters' using errcode='22023'; end if;
    select * into claim from public.claims where id=result_id;
    if found then
      if claim.item_id=item.id and claim.claimant_id=actor and claim.proof_text=proof then
        return jsonb_build_object('id',claim.id); end if;
      raise exception 'Request conflict' using errcode='22023'; end if;
    if item.status<>'OPEN' then
      raise exception 'Item is no longer accepting responses' using errcode='22023'; end if;
    insert into public.claims(id,item_id,claimant_id,proof_text) values(result_id,item.id,actor,proof);
    return jsonb_build_object('id',result_id);
  end if;
  if p_action='resolve_lost' and item.type='LOST' then
    if item.reporter_id<>actor then raise exception 'Not permitted' using errcode='42501'; end if;
    if exists(select 1 from public.claims where item_id=item.id and status='APPROVED') then
      raise exception 'Selected response requires verified two-sided return' using errcode='22023'; end if;
    -- A separately recovered item must not leave actionable pending responses.
    if item.status='OPEN' then update public.claims set status='REJECTED' where item_id=item.id and status='PENDING'; end if;
  end if;
  if p_action in ('submit_claim','resolve_lost','close_report') then
    return campusfind_private.run_workflow_base(p_action,p_data); end if;
  select * into claim from public.claims where id=(p_data->>'claim_id')::uuid for update;
  if not found or (actor<>item.reporter_id and actor<>claim.claimant_id) then
    raise exception 'Not permitted' using errcode='42501'; end if;
  if p_action='review_claim' and item.type='LOST' then
    if actor<>item.reporter_id then raise exception 'Not permitted' using errcode='42501'; end if;
    if exists(select 1 from jsonb_object_keys(p_data) k where k not in ('claim_id','decision'))
      or not(p_data ? 'decision') or claim.status<>'PENDING' or item.status<>'OPEN'
      or (p_data->>'decision') is null or (p_data->>'decision') not in ('APPROVED','REJECTED') then
      raise exception 'Response is no longer pending or invalid decision' using errcode='22023'; end if;
    -- APPROVED reserves a response; ownership is NOT verified and no meeting is
    -- permitted yet. Leave item OPEN until the holder verifies private evidence.
    update public.claims set status=p_data->>'decision' where id=claim.id;
    if p_data->>'decision'='APPROVED' then
      update public.claims set status='REJECTED' where item_id=item.id and status='PENDING' and id<>claim.id;
    end if;
    return jsonb_build_object('id',claim.id);
  end if;
  if p_action='withdraw_match' then
    if item.type<>'LOST' or claim.status<>'APPROVED' or item.status<>'OPEN' or claim.ownership_verified_at is not null then
      raise exception 'Unverified selected LOST response required' using errcode='22023'; end if;
    update public.claims set status='REJECTED' where id=claim.id;
    return jsonb_build_object('id',claim.id);
  end if;
  if p_action in ('submit_owner_proof','verify_owner') then
    if item.type<>'LOST' or claim.status<>'APPROVED' or item.status<>'OPEN' then
      raise exception 'Selected LOST response required' using errcode='22023'; end if;
    if p_action='submit_owner_proof' then
      if actor<>item.reporter_id then raise exception 'Not permitted' using errcode='42501'; end if;
      proof := btrim(p_data->>'proof_text');
      if proof is null or length(proof) not between 20 and 5000 then
        raise exception 'Evidence must contain 20 to 5000 characters' using errcode='22023'; end if;
      if claim.owner_proof_text is not null then
        if claim.owner_proof_text=proof then return jsonb_build_object('id',claim.id); end if;
        raise exception 'Ownership evidence is immutable' using errcode='22023'; end if;
      update public.claims set owner_proof_text=proof,owner_proof_submitted_at=now() where id=claim.id;
    else
      if actor<>claim.claimant_id then raise exception 'Not permitted' using errcode='42501'; end if;
      if claim.owner_proof_text is null or (p_data->>'decision') is null
        or (p_data->>'decision') not in ('APPROVED','REJECTED') then
        raise exception 'Review the submitted ownership evidence' using errcode='22023'; end if;
      if p_data->>'decision'='APPROVED' then
        update public.claims set ownership_verified_at=now() where id=claim.id;
        update public.claims set status='REJECTED' where item_id=item.id and status='PENDING' and id<>claim.id;
        update public.items set status='IN_PROGRESS' where id=item.id;
      else
        update public.claims set status='REJECTED' where id=claim.id;
      end if;
    end if;
    return jsonb_build_object('id',claim.id);
  end if;
  if item.type='LOST' and claim.ownership_verified_at is null
    and p_action not in ('cancel_claim','revoke_contact') then
    raise exception 'Holder must verify ownership before coordination' using errcode='22023'; end if;
  return campusfind_private.run_workflow_base(p_action,p_data);
end;
$$;
revoke all on function campusfind_private.run_workflow(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function campusfind_private.run_workflow(text,jsonb) to authenticated;
-- SQL functions bind by OID: rebind this public invoker to the new guarded entry.
create or replace function public.campusfind_workflow(p_action text,p_data jsonb)
returns jsonb language sql security invoker set search_path = '' as $$
  select campusfind_private.run_workflow(p_action,p_data);
$$;
commit;
