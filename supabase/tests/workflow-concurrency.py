"""Run real competing workflow transactions on a named disposable LOCAL stack."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import json
import re
import subprocess
import threading
from uuid import uuid4

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--confirm-disposable-local', action='store_true', required=True)
parser.add_argument('--runtime', choices=['podman', 'docker'], default='docker')
parser.add_argument('--container', required=True)
parser.add_argument('--type', choices=['FOUND', 'LOST'], default='FOUND')
args = parser.parse_args()
if not re.fullmatch(r'supabase_db_campusfind-mvp-[a-z0-9-]+', args.container):
    raise SystemExit('Only an explicitly named disposable campusfind-mvp container is permitted')
A, B, C, item, claim_b, claim_c = [str(uuid4()) for _ in range(6)]

def sql(command, check=True):
    result = subprocess.run([args.runtime, 'exec', '-i', args.container, 'psql', '-X', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], input=command, text=True, capture_output=True, timeout=30)
    if check and result.returncode:
        raise RuntimeError(result.stderr)
    return result

def rpc(actor, action, data):
    # Only program-generated fixture values; no credentials or dynamic SQL API.
    return f"begin; set local role authenticated; set local request.jwt.claim.sub='{actor}'; select public.campusfind_workflow('{action}','{json.dumps(data)}'::jsonb); select pg_sleep(0.15); commit;"

def race(commands):
    barrier = threading.Barrier(len(commands))
    def run(command):
        barrier.wait(timeout=10)
        return sql(command, check=False)
    with ThreadPoolExecutor(max_workers=len(commands)) as pool:
        return list(pool.map(run, commands))

fixture_items = [item]
setup = False
try:
    sql(f"begin; insert into auth.users(id,email) values ('{A}','{A}@example.invalid'),('{B}','{B}@example.invalid'),('{C}','{C}@example.invalid'); insert into public.items(id,reporter_id,type,title,category,location,event_date) values ('{item}','{A}','{args.type}','Workflow concurrency','Other','Library',current_date); commit;")
    setup = True
    evidence = 'Distinct identifying details for this local concurrency fixture'
    for actor, claim in [(B, claim_b), (C, claim_c)]:
        sql(rpc(actor, 'submit_found_response' if args.type == 'LOST' else 'submit_claim', dict(item_id=item, request_id=claim, proof_text=evidence)))
    results = race([rpc(A, 'review_claim', dict(claim_id=claim, decision='APPROVED')) for claim in [claim_b, claim_c]])
    assert sum(r.returncode == 0 for r in results) == 1, [r.stderr for r in results]
    assert all(not r.returncode or ('no longer open' in r.stderr or 'no longer pending' in r.stderr) for r in results), [r.stderr for r in results]
    state = sql(f"select status,count(*) from public.claims where item_id='{item}' group by status order by status;").stdout
    assert 'APPROVED|1' in state and 'REJECTED|1' in state, state
    assert sql(f"select status from public.items where id='{item}';").stdout.strip() == ('OPEN' if args.type == 'LOST' else 'IN_PROGRESS')
    print(f'PASS: {args.type} competing selections commit exactly one approval, one rejection without deadlock')
    winner = sql(f"select id||','||claimant_id from public.claims where item_id='{item}' and status='APPROVED';").stdout.strip().split(',')
    approved, claimant = winner
    if args.type == 'LOST':
        results = race([rpc(A, 'submit_owner_proof', dict(claim_id=approved, proof_text=f'Private owner evidence variant {number} with a hidden mark')) for number in [1, 2]])
        assert sum(r.returncode == 0 for r in results) == 1, [r.stderr for r in results]
        print('PASS: concurrent LOST owner evidence submissions preserve one immutable proof')
        results = race([rpc(claimant, 'verify_owner', dict(claim_id=approved, decision='APPROVED')) for _ in range(2)])
        assert sum(r.returncode == 0 for r in results) == 1, [r.stderr for r in results]
        assert sql(f"select status from public.items where id='{item}';").stdout.strip() == 'IN_PROGRESS'
        print('PASS: duplicate concurrent holder verification advances LOST exactly once')
    proposed = dict(claim_id=approved, location='Campus security office', meeting_at='2099-01-01T00:00:00Z', revision=0)
    # SQL generates a future date relative to the server so this test never ages.
    meeting = sql("select (now()+interval '1 day')::text;").stdout.strip()
    proposed['meeting_at'] = meeting
    results = race([rpc(actor, 'propose_handover', proposed) for actor in [A, claimant]])
    assert sum(r.returncode == 0 for r in results) == 1, [r.stderr for r in results]
    assert all(not r.returncode or 'Arrangement changed' in r.stderr for r in results)
    proposer = sql(f"select proposed_by from public.handovers where claim_id='{approved}';").stdout.strip()
    acceptor = claimant if proposer == A else A
    sql(rpc(acceptor, 'accept_handover', dict(claim_id=approved, revision=1)))
    print('PASS: concurrent proposals cannot overwrite the same revision')
    results = race([rpc(actor, 'confirm_return', dict(claim_id=approved, revision=1)) for actor in [A, claimant]])
    assert all(r.returncode == 0 for r in results), [r.stderr for r in results]
    assert sql(f"select status from public.items where id='{item}';").stdout.strip() == 'RESOLVED'
    assert sql(f"select reporter_confirmed_at is not null and claimant_confirmed_at is not null from public.handovers where claim_id='{approved}';").stdout.strip() == 't'
    print('PASS: concurrent two-party confirmations preserve both timestamps and resolve atomically')
    if args.type == 'LOST':
        recovery_item, recovery_response = str(uuid4()), str(uuid4())
        fixture_items.append(recovery_item)
        sql(f"insert into public.items(id,reporter_id,type,title,category,location,event_date) values ('{recovery_item}','{A}','LOST','Recovery race','Other','Library',current_date);")
        results = race([rpc(B, 'submit_found_response', dict(item_id=recovery_item, request_id=recovery_response, proof_text=evidence)), rpc(A, 'resolve_lost', dict(item_id=recovery_item))])
        assert sql(f"select status from public.items where id='{recovery_item}';").stdout.strip() == 'RESOLVED'
        assert sql(f"select count(*) from public.claims where item_id='{recovery_item}' and status in ('PENDING','APPROVED');").stdout.strip() == '0'
        assert any(r.returncode == 0 for r in results)
        print('PASS: LOST independent recovery racing a finder response leaves no active response')
        withdrawal_item, withdrawal_response = str(uuid4()), str(uuid4())
        fixture_items.append(withdrawal_item)
        sql(f"insert into public.items(id,reporter_id,type,title,category,location,event_date) values ('{withdrawal_item}','{A}','LOST','Withdrawal race','Other','Library',current_date);")
        sql(rpc(B, 'submit_found_response', dict(item_id=withdrawal_item, request_id=withdrawal_response, proof_text=evidence)))
        sql(rpc(A, 'review_claim', dict(claim_id=withdrawal_response, decision='APPROVED')))
        sql(rpc(A, 'submit_owner_proof', dict(claim_id=withdrawal_response, proof_text=evidence)))
        results = race([rpc(B, 'verify_owner', dict(claim_id=withdrawal_response, decision='APPROVED')), rpc(A, 'withdraw_match', dict(claim_id=withdrawal_response))])
        assert sum(r.returncode == 0 for r in results) == 1, [r.stderr for r in results]
        state = sql(f"select i.status||'|'||c.status||'|'||(c.ownership_verified_at is not null)::text from public.items i join public.claims c on c.item_id=i.id where i.id='{withdrawal_item}';").stdout.strip()
        assert state in ('IN_PROGRESS|APPROVED|true', 'OPEN|REJECTED|false'), state
        print('PASS: LOST holder verification racing withdrawal preserves one consistent outcome')
finally:
    if setup:
        fixture_ids = ",".join(f"'{record}'" for record in fixture_items)
        sql(f"begin; delete from public.handovers where claim_id in (select id from public.claims where item_id in ({fixture_ids})); delete from public.claims where item_id in ({fixture_ids}); delete from public.items where id in ({fixture_ids}); delete from auth.users where id in ('{A}','{B}','{C}'); commit;")
        print('Workflow concurrency fixtures cleaned')
