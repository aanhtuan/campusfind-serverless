begin;

create table public.handovers (
  claim_id uuid primary key references public.claims(id) on delete restrict,
  location text not null check (location in ('Campus security office','Student affairs office','University reception')),
  meeting_at timestamptz not null,
  revision integer not null default 1 check (revision > 0),
  proposed_by uuid not null references public.profiles(id),
  accepted_by uuid references public.profiles(id),
  accepted_at timestamptz,
  change_requested boolean not null default false,
  reporter_confirmed_at timestamptz,
  claimant_confirmed_at timestamptz,
  updated_at timestamptz not null default now(),
  check ((accepted_at is null) = (accepted_by is null)),
  check (accepted_by is null or accepted_by <> proposed_by),
  check (not change_requested or accepted_at is null),
  check (accepted_at is not null or (reporter_confirmed_at is null and claimant_confirmed_at is null))
);
create table public.claim_contacts (
  claim_id uuid not null references public.claims(id) on delete restrict,
  user_id uuid not null references public.profiles(id),
  kind text not null check (kind in ('EMAIL','PHONE')),
  value text not null check (length(value) between 3 and 254),
  consented_at timestamptz not null default now(),
  primary key (claim_id,user_id)
);
-- Only structured operational categories reach administrators. No free text,
-- ownership proof, account email, or optional contact is included in this table.
create table public.workflow_issues (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete restrict,
  opened_by uuid not null references public.profiles(id),
  category text not null check (category in ('MISSED_MEETING','RETURN_DISPUTED','SAFETY_CONCERN')),
  status text not null default 'OPEN' check (status in ('OPEN','ACKNOWLEDGED','RESOLVED')),
  reporter_resumed_at timestamptz,
  claimant_resumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index workflow_one_open_issue on public.workflow_issues(claim_id) where status <> 'RESOLVED';
create index workflow_issues_status_idx on public.workflow_issues(status, created_at desc);
alter table public.handovers enable row level security;
alter table public.claim_contacts enable row level security;
alter table public.workflow_issues enable row level security;
revoke all on public.handovers, public.claim_contacts, public.workflow_issues from public, anon, authenticated, service_role;
grant select on public.handovers, public.claim_contacts, public.workflow_issues to authenticated;

-- Narrow predicates avoid recursive items <-> claims RLS. They reveal only
-- whether the current verified identity participates; no arbitrary actor input.
create function campusfind_private.claim_participant(p_claim uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.claims c join public.items i on i.id=c.item_id
    where c.id=p_claim and (c.claimant_id=auth.uid() or i.reporter_id=auth.uid()));
$$;
create function campusfind_private.item_claimant(p_item uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.claims c where c.item_id=p_item and c.claimant_id=auth.uid());
$$;
create function campusfind_private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id=auth.uid() and role='ADMIN');
$$;
grant usage on schema campusfind_private to authenticated;
revoke all on function campusfind_private.claim_participant(uuid), campusfind_private.item_claimant(uuid), campusfind_private.is_admin() from public, anon, authenticated, service_role;
grant execute on function campusfind_private.claim_participant(uuid), campusfind_private.item_claimant(uuid), campusfind_private.is_admin() to authenticated;
-- Same public/owner/history visibility in one member SELECT policy, so
-- PostgreSQL need not evaluate several permissive policies per row.
alter policy items_public_read on public.items to anon;
alter policy items_reporter_read on public.items rename to items_member_read;
alter policy items_member_read on public.items using (
  status in ('OPEN','IN_PROGRESS') or reporter_id=(select auth.uid()) or campusfind_private.item_claimant(id)
);
create policy handovers_participants on public.handovers for select to authenticated
  using (campusfind_private.claim_participant(claim_id));
-- Presence means explicit opt-in. Revoking consent deletes the contact row.
create policy contacts_consented_participants on public.claim_contacts for select to authenticated
  using (campusfind_private.claim_participant(claim_id) and exists (
    select 1 from public.claims c where c.id=claim_id and c.status='APPROVED'));
create policy issues_participants_or_admin on public.workflow_issues for select to authenticated
  using (campusfind_private.claim_participant(claim_id) or campusfind_private.is_admin());

-- All mutations lock item -> claim -> handover/issue. No caller-supplied actor,
-- no dynamic SQL, no service-role key. Direct table writes remain denied.
create function campusfind_private.run_workflow(p_action text, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  item public.items%rowtype;
  claim public.claims%rowtype;
  handover public.handovers%rowtype;
  issue public.workflow_issues%rowtype;
  target uuid;
  result_id uuid;
  proof text;
  contact text;
  meeting timestamptz;
  rev integer;
  allowed text[];
begin
  if actor is null or not exists(select 1 from public.profiles where id=actor) then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  if p_data is null or jsonb_typeof(p_data)<>'object' then
    raise exception 'Invalid request' using errcode='22023';
  end if;
  allowed := case p_action
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
  if allowed is null or exists(select 1 from jsonb_object_keys(p_data) k where not(k=any(allowed)))
    or exists(select 1 from unnest(allowed) k where not(p_data ? k)) then
    raise exception 'Invalid operation or fields' using errcode='22023';
  end if;
  if p_action='acknowledge_issue' then
    if not campusfind_private.is_admin() then raise exception 'Not permitted' using errcode='42501'; end if;
    update public.workflow_issues set status='ACKNOWLEDGED',updated_at=now()
      where id=(p_data->>'issue_id')::uuid and status='OPEN' returning id into result_id;
    if result_id is null then raise exception 'Issue is no longer open' using errcode='22023'; end if;
    return jsonb_build_object('id',result_id);
  end if;
  if p_action in ('submit_claim','resolve_lost','close_report') then
    target := (p_data->>'item_id')::uuid;
  else
    select item_id into target from public.claims where id=(p_data->>'claim_id')::uuid;
  end if;
  select * into item from public.items where id=target for update;
  if not found then raise exception 'Record unavailable' using errcode='42501'; end if;

  if p_action in ('resolve_lost','close_report') then
    if item.reporter_id<>actor then raise exception 'Not permitted' using errcode='42501'; end if;
    if p_action='resolve_lost' and item.type='LOST' and item.status='OPEN' then
      update public.items set status='RESOLVED' where id=item.id;
    elsif p_action='close_report' and item.status='RESOLVED' then
      update public.items set status='CLOSED' where id=item.id;
    else raise exception 'Invalid report transition' using errcode='22023'; end if;
    return jsonb_build_object('id',item.id);
  end if;

  if p_action='submit_claim' then
    if item.type<>'FOUND' or item.reporter_id=actor then raise exception 'Not permitted' using errcode='42501'; end if;
    proof := btrim(p_data->>'proof_text');
    result_id := (p_data->>'request_id')::uuid;
    if proof is null or length(proof) not between 20 and 5000 or result_id is null then
      raise exception 'Evidence must contain 20 to 5000 characters' using errcode='22023';
    end if;
    -- Stable request id handles lost responses without inserting twice.
    select * into claim from public.claims where id=result_id;
    if found then
      if claim.claimant_id=actor and claim.item_id=item.id and claim.proof_text=proof then
        return jsonb_build_object('id',claim.id);
      end if;
      raise exception 'Request conflict' using errcode='22023';
    end if;
    if item.status<>'OPEN' or exists(select 1 from public.claims where item_id=item.id and status='APPROVED') then
      raise exception 'Item is no longer accepting claims' using errcode='22023';
    end if;
    insert into public.claims(id,item_id,claimant_id,proof_text) values(result_id,item.id,actor,proof);
    return jsonb_build_object('id',result_id);
  end if;

  select * into claim from public.claims where id=(p_data->>'claim_id')::uuid for update;
  if not found or (actor<>item.reporter_id and actor<>claim.claimant_id) then
    raise exception 'Not permitted' using errcode='42501';
  end if;
  if p_action='cancel_claim' then
    if actor<>claim.claimant_id or claim.status<>'PENDING' then raise exception 'Claim is no longer pending' using errcode='22023'; end if;
    update public.claims set status='CANCELLED' where id=claim.id;
  elsif p_action='review_claim' then
    if actor<>item.reporter_id then raise exception 'Not permitted' using errcode='42501'; end if;
    if claim.status<>'PENDING' or item.status<>'OPEN' or (p_data->>'decision') is null
      or (p_data->>'decision') not in ('APPROVED','REJECTED') then
      raise exception 'Claim or item is no longer open' using errcode='22023';
    end if;
    update public.claims set status=p_data->>'decision' where id=claim.id;
    if p_data->>'decision'='APPROVED' then
      update public.claims set status='REJECTED' where item_id=item.id and status='PENDING' and id<>claim.id;
      update public.items set status='IN_PROGRESS' where id=item.id;
    end if;
  else
    if claim.status<>'APPROVED' then raise exception 'Approved claim required' using errcode='22023'; end if;
    if p_action in ('share_contact','revoke_contact') then
      if p_action='revoke_contact' then delete from public.claim_contacts where claim_id=claim.id and user_id=actor;
      else
        contact := btrim(p_data->>'value');
        if p_data->'consent' is distinct from 'true'::jsonb or contact is null or length(contact)>254
          or not ((p_data->>'kind'='EMAIL' and contact ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
            or (p_data->>'kind'='PHONE' and contact ~ '^\+?[0-9 ()-]{7,30}$')) then
          raise exception 'Explicit consent and valid contact required' using errcode='22023';
        end if;
        insert into public.claim_contacts(claim_id,user_id,kind,value) values(claim.id,actor,p_data->>'kind',contact)
          on conflict(claim_id,user_id) do update set kind=excluded.kind,value=excluded.value,consented_at=now();
      end if;
      return jsonb_build_object('id',claim.id);
    end if;
    if item.status<>'IN_PROGRESS' then raise exception 'Return is not in progress' using errcode='22023'; end if;
    select * into handover from public.handovers where claim_id=claim.id for update;
    if p_action='open_issue' then
      if (p_data->>'category') is null or (p_data->>'category') not in ('MISSED_MEETING','RETURN_DISPUTED','SAFETY_CONCERN') then
        raise exception 'Invalid issue category' using errcode='22023'; end if;
      insert into public.workflow_issues(claim_id,opened_by,category) values(claim.id,actor,p_data->>'category') returning id into result_id;
      return jsonb_build_object('id',result_id);
    end if;
    if p_action='resume_issue' then
      select * into issue from public.workflow_issues where id=(p_data->>'issue_id')::uuid and claim_id=claim.id for update;
      if not found or issue.status='RESOLVED' then raise exception 'Issue unavailable' using errcode='22023'; end if;
      update public.workflow_issues set
        reporter_resumed_at=case when actor=item.reporter_id then coalesce(reporter_resumed_at,now()) else reporter_resumed_at end,
        claimant_resumed_at=case when actor=claim.claimant_id then coalesce(claimant_resumed_at,now()) else claimant_resumed_at end,
        updated_at=now() where id=issue.id returning * into issue;
      if issue.reporter_resumed_at is not null and issue.claimant_resumed_at is not null then
        update public.workflow_issues set status='RESOLVED' where id=issue.id;
      end if;
      return jsonb_build_object('id',issue.id);
    end if;
    if exists(select 1 from public.workflow_issues where claim_id=claim.id and status<>'RESOLVED') then
      raise exception 'Resolve the operational issue together before continuing' using errcode='22023'; end if;
    rev := (p_data->>'revision')::integer;
    if rev is null or rev<>coalesce(handover.revision,0) then raise exception 'Arrangement changed; reload' using errcode='22023'; end if;
    if p_action='propose_handover' then
      meeting := (p_data->>'meeting_at')::timestamptz;
      if meeting is null or meeting<=now() or meeting>now()+interval '90 days' or (p_data->>'location') is null
        or (p_data->>'location') not in ('Campus security office','Student affairs office','University reception') then
        raise exception 'Choose a public campus location and future time within 90 days' using errcode='22023'; end if;
      if handover.reporter_confirmed_at is not null or handover.claimant_confirmed_at is not null or handover.accepted_at is not null then
        raise exception 'Request a change before replacing an accepted arrangement' using errcode='22023'; end if;
      insert into public.handovers(claim_id,location,meeting_at,proposed_by) values(claim.id,p_data->>'location',meeting,actor)
        on conflict(claim_id) do update set location=excluded.location,meeting_at=excluded.meeting_at,
          proposed_by=actor,accepted_by=null,accepted_at=null,change_requested=false,revision=public.handovers.revision+1,updated_at=now();
    elsif p_action='request_change' then
      if handover.claim_id is null or handover.reporter_confirmed_at is not null or handover.claimant_confirmed_at is not null then
        raise exception 'Cannot change a confirmed return; report an issue' using errcode='22023'; end if;
      update public.handovers set accepted_at=null,accepted_by=null,change_requested=true,revision=revision+1,updated_at=now() where claim_id=claim.id;
    elsif p_action='accept_handover' then
      if handover.claim_id is null or handover.proposed_by=actor or handover.change_requested or handover.accepted_at is not null or handover.meeting_at<=now() then
        raise exception 'Only the other party can accept a future proposal' using errcode='22023'; end if;
      update public.handovers set accepted_by=actor,accepted_at=now(),updated_at=now() where claim_id=claim.id;
    elsif p_action='confirm_return' then
      if handover.accepted_at is null or (actor=item.reporter_id and handover.reporter_confirmed_at is not null)
        or (actor=claim.claimant_id and handover.claimant_confirmed_at is not null) then
        raise exception 'Accepted arrangement and a new confirmation required' using errcode='22023'; end if;
      update public.handovers set
        reporter_confirmed_at=case when actor=item.reporter_id then now() else reporter_confirmed_at end,
        claimant_confirmed_at=case when actor=claim.claimant_id then now() else claimant_confirmed_at end,
        updated_at=now() where claim_id=claim.id returning * into handover;
      if handover.reporter_confirmed_at is not null and handover.claimant_confirmed_at is not null then
        update public.items set status='RESOLVED' where id=item.id;
      end if;
    else raise exception 'Unsupported operation' using errcode='22023'; end if;
  end if;
  return jsonb_build_object('id',claim.id);
end;
$$;
revoke all on function campusfind_private.run_workflow(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function campusfind_private.run_workflow(text,jsonb) to authenticated;
create function public.campusfind_workflow(p_action text,p_data jsonb)
returns jsonb language sql security invoker set search_path = '' as $$
  select campusfind_private.run_workflow(p_action,p_data);
$$;
revoke all on function public.campusfind_workflow(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.campusfind_workflow(text,jsonb) to authenticated;

create function campusfind_private.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not campusfind_private.is_admin() then raise exception 'Not permitted' using errcode='42501'; end if;
  return jsonb_build_object(
    'items', (select coalesce(jsonb_object_agg(status,n),'{}'::jsonb) from (select status,count(*) n from public.items group by status) s),
    'claims', (select coalesce(jsonb_object_agg(status,n),'{}'::jsonb) from (select status,count(*) n from public.claims group by status) s),
    'open_issues',(select count(*) from public.workflow_issues where status<>'RESOLVED'));
end;
$$;
create function public.campusfind_admin_overview()
returns jsonb language sql security invoker set search_path = '' as $$ select campusfind_private.admin_overview(); $$;
revoke all on function campusfind_private.admin_overview(), public.campusfind_admin_overview() from public,anon,authenticated,service_role;
grant execute on function campusfind_private.admin_overview(), public.campusfind_admin_overview() to authenticated;
commit;
