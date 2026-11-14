// Creates a separate configuration and copies sources; never links Cloud or resets data.
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, cpSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
if (!process.argv.includes('--confirm-disposable-local')) throw new Error('Pass --confirm-disposable-local to create an isolated test stack configuration.');
const root = resolve(import.meta.dirname, '..');
const localRoot = resolve(process.env.LOCAL_SUPABASE_WORKDIR_ROOT || join(homedir(), '.cache', 'campusfind-tests'));
mkdirSync(localRoot, { recursive: true });
const workdir = mkdtempSync(join(localRoot, 'campusfind-mvp-'));
const project = 'campusfind-mvp-' + workdir.split('-').at(-1).toLowerCase();
const port = Number(process.env.LOCAL_SUPABASE_BASE_PORT || 55420);
if (!Number.isInteger(port) || port < 1024 || port > 65000) throw new Error('Choose a valid local base port.');
mkdirSync(join(workdir, 'supabase'));
let config = readFileSync(join(root, 'supabase/config.toml'), 'utf8').replace('campusfind-task02b', project);
for (const [oldPort, nextPort] of [[54320, port], [54321, port + 1], [54322, port + 2], [54323, port + 3]]) config = config.replaceAll(String(oldPort), String(nextPort));
writeFileSync(join(workdir, 'supabase/config.toml'), config);
for (const folder of ['migrations', 'functions']) cpSync(join(root, 'supabase', folder), join(workdir, 'supabase', folder), { recursive: true });
console.log(JSON.stringify({ workdir, container: 'supabase_db_' + project, url: `http://127.0.0.1:${port + 1}` }));
