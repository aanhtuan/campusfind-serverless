import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
const { formatCampusDate } = require('../src/lib/dates.ts');
test('campus timestamps cross midnight in Vietnam regardless of host timezone', () => {
  assert.equal(formatCampusDate('2026-11-09T17:30:00Z'), '10/11/2026');
  assert.equal(formatCampusDate('2026-11-09T16:59:59Z'), '09/11/2026');
  assert.equal(formatCampusDate('2026-11-10T00:30:00+07:00'), '10/11/2026');
  assert.equal(formatCampusDate('invalid'), '—');
});
