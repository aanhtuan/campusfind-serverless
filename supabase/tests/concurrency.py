"""Concurrency regression tests for this task's disposable Supabase database.

No Python packages needed. Uses psql inside the local Docker container only.
Creates uniquely tagged fixtures, then deletes ONLY those fixtures in finally.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import subprocess
import threading
import time
import tomllib

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--confirm-disposable-local', action='store_true', required=True)
parser.parse_args()
root = Path(__file__).resolve().parents[2]
config = tomllib.loads((root / 'supabase/config.toml').read_text())
container = 'supabase_db_' + config['project_id']
if config['project_id'] != 'campusfind-task02b':
    raise SystemExit('Refusing to test an unexpected project/container')

reporter = 'a0000000-0000-0000-0000-000000000001'
claimant = 'a0000000-0000-0000-0000-000000000002'
other = 'a0000000-0000-0000-0000-000000000003'
item_ids = [f'b0000000-0000-0000-0000-{i:012d}' for i in range(1, 6)]


def sql(command, require_success=True):
    result = subprocess.run(
        ['docker', 'exec', '-i', container, 'psql', '-X', '-U', 'postgres',
         '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'],
        input=command, text=True, capture_output=True, timeout=30,
    )
    if require_success and result.returncode:
        raise RuntimeError(result.stderr.strip())
    return result


def race(commands):
    barrier = threading.Barrier(len(commands))

    def run(command):
        barrier.wait(timeout=10)
        return sql(command, require_success=False)

    with ThreadPoolExecutor(max_workers=len(commands)) as pool:
        return list(pool.map(run, commands))


def assert_one_winner(results, expected_errors):
    assert sum(r.returncode == 0 for r in results) == 1, [r.stderr for r in results]
    for result in results:
        if result.returncode:
            assert any(error in result.stderr for error in expected_errors), result.stderr


def image_insert(item, number):
    return ("insert into public.item_images (item_id, storage_path) values "
            f"('{item}', '{reporter}/{item}/c0000000-0000-0000-0000-{number:012d}.jpg');")


def user_transaction(command, isolation='READ COMMITTED'):
    return (f'begin isolation level {isolation}; set local role authenticated; '
            f"set local request.jwt.claim.sub = '{reporter}'; "
            + command + ' select pg_sleep(0.25); commit;')


def backend_transaction(command):
    return 'begin; set local role service_role; ' + command + ' select pg_sleep(0.25); commit;'


# Refuse to overwrite existing fixture IDs (INSERT fails if fixtures already exist).
setup_complete = False
try:
    sql('begin; insert into auth.users (id,email) values ' + ','.join(
        f"('{uid}', 'task02b-{i}@example.invalid')"
        for i, uid in enumerate([reporter, claimant, other])
    ) + '; insert into public.items (id,reporter_id,type,title,category,location,event_date) values '
        + ','.join(f"('{item}','{reporter}','FOUND','Concurrency fixture','Other','Test lab',current_date)"
                   for item in item_ids) + '; commit;')
    setup_complete = True

    for isolation, item in zip(['READ COMMITTED', 'REPEATABLE READ'], item_ids[:2]):
        sql(user_transaction(image_insert(item, 1) + image_insert(item, 2), isolation))
        results = race([user_transaction(image_insert(item, n), isolation) for n in [3, 4]])
        assert_one_winner(results, ['at most three images', 'duplicate key', 'could not serialize'])
        assert sql(f"select count(*) from public.item_images where item_id = '{item}';").stdout.strip() == '3'
        print(f'PASS: concurrent fourth-image prevention ({isolation})')

    item = item_ids[2]
    insert_claim = ("insert into public.claims (item_id,claimant_id,proof_text) values "
                    f"('{item}','{claimant}','Concurrency evidence');")
    assert_one_winner(race([backend_transaction(insert_claim)] * 2), ['duplicate key'])
    assert sql(f"select count(*) from public.claims where item_id = '{item}';").stdout.strip() == '1'
    print('PASS: concurrent duplicate active claims')

    item = item_ids[3]
    sql('insert into public.claims (item_id,claimant_id,proof_text) values '
        f"('{item}','{claimant}','Evidence one'),('{item}','{other}','Evidence two');")
    results = race([backend_transaction(f"update public.claims set status = 'APPROVED' "
                                        f"where item_id = '{item}' and claimant_id = '{uid}';")
                    for uid in [claimant, other]])
    assert_one_winner(results, ['duplicate key'])
    assert sql(f"select count(*) from public.claims where item_id = '{item}' and status = 'APPROVED';").stdout.strip() == '1'
    print('PASS: concurrent APPROVED claims')

    item = item_ids[4]
    close_command = ("set application_name = 'campusfind-task02b-close'; begin; set local role service_role; "
                     f"update public.items set status = 'CLOSED' where id = '{item}'; select pg_sleep(2); commit;")
    with ThreadPoolExecutor(max_workers=1) as pool:
        closing = pool.submit(sql, close_command)
        deadline = time.monotonic() + 10
        while sql("select count(*) from pg_stat_activity where application_name = 'campusfind-task02b-close' and wait_event = 'PgSleep';").stdout.strip() != '1':
            if closing.done() or time.monotonic() > deadline:
                raise RuntimeError('Could not observe closing transaction lock')
            time.sleep(0.05)
        attempted = sql(backend_transaction("insert into public.claims (item_id,claimant_id,proof_text) values "
                                            f"('{item}','{claimant}','Late claim');"), require_success=False)
        closing.result()
    assert attempted.returncode != 0 and 'active item' in attempted.stderr, attempted.stderr
    assert sql(f"select count(*) from public.claims where item_id = '{item}';").stdout.strip() == '0'
    print('PASS: claim creation serialized against item closure')
finally:
    if setup_complete:
        ids = ','.join(f"'{item}'" for item in item_ids)
        sql(f'begin; delete from public.claims where item_id in ({ids}); '
            f'delete from public.item_images where item_id in ({ids}); '
            f'delete from public.items where id in ({ids}); '
            + 'delete from auth.users where id in ('
            + ','.join(f"'{uid}'" for uid in [reporter, claimant, other]) + '); commit;')
        print('Local concurrency fixtures cleaned up')
