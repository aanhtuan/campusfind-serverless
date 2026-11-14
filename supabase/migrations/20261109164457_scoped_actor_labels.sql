begin;

-- Display names are scoped to a visible report or a participating claim, never
-- to an arbitrary account lookup. Profiles keep their self-only SELECT policy.
create function campusfind_private.actor_labels(p_item_ids uuid[], p_claim_ids uuid[])
returns table (
  scope_type text, scope_id uuid, reporter_id uuid, reporter_display_name text,
  respondent_id uuid, respondent_display_name text, claim_id uuid
) language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null or not exists (select 1 from public.profiles p where p.id=actor) then
    raise exception 'Verified member required' using errcode='42501';
  end if;
  if coalesce(cardinality(p_item_ids),0)>40 or coalesce(cardinality(p_claim_ids),0)>40 then
    raise exception 'At most 40 reports and 40 claims' using errcode='22023';
  end if;
  return query
    select 'item'::text, i.id, i.reporter_id, p.display_name,
      c.claimant_id, q.display_name, c.id
    from public.items i join public.profiles p on p.id=i.reporter_id
    left join public.claims c on c.item_id=i.id and c.status='APPROVED'
      and (i.reporter_id=actor or c.claimant_id=actor)
    left join public.profiles q on q.id=c.claimant_id
    where i.id=any(p_item_ids) and (
      i.status in ('OPEN','IN_PROGRESS') or i.reporter_id=actor or exists (
        select 1 from public.claims mine where mine.item_id=i.id and mine.claimant_id=actor))
    union all
    select 'claim'::text, c.id, i.reporter_id, p.display_name,
      c.claimant_id, q.display_name, c.id
    from public.claims c join public.items i on i.id=c.item_id
    join public.profiles p on p.id=i.reporter_id
    join public.profiles q on q.id=c.claimant_id
    where c.id=any(p_claim_ids) and (i.reporter_id=actor or c.claimant_id=actor);
end;
$$;
revoke all on function campusfind_private.actor_labels(uuid[],uuid[]) from public, anon, authenticated, service_role;
grant execute on function campusfind_private.actor_labels(uuid[],uuid[]) to authenticated;

create function public.actor_labels(p_item_ids uuid[] default '{}', p_claim_ids uuid[] default '{}')
returns table (
  scope_type text, scope_id uuid, reporter_id uuid, reporter_display_name text,
  respondent_id uuid, respondent_display_name text, claim_id uuid
) language sql stable security invoker set search_path = '' as $$
  select * from campusfind_private.actor_labels(p_item_ids,p_claim_ids);
$$;
revoke all on function public.actor_labels(uuid[],uuid[]) from public, anon, authenticated, service_role;
grant execute on function public.actor_labels(uuid[],uuid[]) to authenticated;
comment on function public.actor_labels(uuid[],uuid[]) is 'Member display names for visible reports and participating claims only; excludes account email, contact, role and evidence.';
commit;
