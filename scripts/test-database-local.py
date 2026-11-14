"""Execute pgTAP suites against a named disposable container, never a hosted DB.

Start a local stack and apply versioned migrations first. Tests roll back.
"""
import argparse
from pathlib import Path
import re
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--confirm-disposable-local', action='store_true', required=True)
parser.add_argument('--runtime', choices=['podman', 'docker'], default='docker')
parser.add_argument('--container', required=True)
args = parser.parse_args()
if not re.fullmatch(r'supabase_db_campusfind-mvp-[a-z0-9-]+', args.container):
    raise SystemExit('Only a named disposable campusfind-mvp container is permitted')
root = Path(__file__).resolve().parents[1]
checks = 0
for path in sorted((root / 'supabase/tests/database').glob('*.sql')):
    result = subprocess.run([args.runtime, 'exec', '-i', args.container, 'psql', '-X', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], input=path.read_text(), text=True, capture_output=True, timeout=60)
    assertions = re.findall(r'^ok [0-9]+\b', result.stdout, re.M)
    if result.returncode or re.search(r'^(not ok |Bail out!)', result.stdout, re.M) or not assertions:
        print(result.stdout)
        print(result.stderr)
        raise SystemExit(f'FAIL: {path.name}')
    checks += len(assertions)
    print(f'PASS: {path.name}: {len(assertions)} assertions (rolled back)')
print(f'LOCAL DATABASE: {checks} assertions passed; hosted RLS acceptance NOT RUN.')
