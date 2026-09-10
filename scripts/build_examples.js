#!/usr/bin/env node
// Builds every examples/*.json into out/ and checks the .pptx zip. Used by `npm test` and CI.
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'out');
fs.mkdirSync(outDir, { recursive: true });
let failed = 0;
for (const f of fs.readdirSync(path.join(root, 'examples')).filter(n => n.endsWith('.json')).sort()) {
  const spec = path.join(root, 'examples', f);
  const out = path.join(outDir, f.replace(/\.json$/, '.pptx'));
  try {
    const log = execFileSync('node', [path.join(__dirname, 'build_deck.js'), spec, out], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    process.stdout.write(log);
  } catch (e) {
    // exit 3 = overflow warnings only; anything else is a failure
    if (e.status !== 3) { failed++; console.error(`FAIL ${f}\n${e.stderr || e.message}`); continue; }
    process.stdout.write(e.stdout || ''); process.stderr.write(e.stderr || '');
  }
  const head = fs.readFileSync(out).subarray(0, 2).toString('binary');
  if (head !== 'PK') { failed++; console.error(`FAIL ${f}: output is not a zip`); }
  else console.log(`ok   ${path.basename(out)} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
}
process.exit(failed ? 1 : 0);
