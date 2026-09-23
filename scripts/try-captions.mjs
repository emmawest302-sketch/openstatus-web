/**
 * Throw real captions at the classifier and see what it would do, without
 * touching a single live Google listing.
 *
 *   node scripts/try-captions.mjs captions.txt
 *   echo "closing early at 3 today" | node scripts/try-captions.mjs
 *
 * One caption per line. Blank lines and lines starting with # are skipped.
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const file = process.argv[2];
const input = file ? readFileSync(file, 'utf8') : readFileSync(0, 'utf8');
const captions = input
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

if (captions.length === 0) {
  console.error('No captions given.');
  process.exit(1);
}

// Compile the TypeScript classifier to something node can import.
const dir = mkdtempSync(join(tmpdir(), 'oscap-'));
const entry = join(dir, 'run.ts');
writeFileSync(
  entry,
  `import { detectHoursIntent } from ${JSON.stringify(process.cwd() + '/src/lib/hours-intent.ts')};\n` +
    `const captions = ${JSON.stringify(captions)};\n` +
    `console.log(JSON.stringify(captions.map((c) => [c, detectHoursIntent(c)])));\n`
);

const raw = execSync(`npx vite-node ${JSON.stringify(entry)}`, {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
});
const results = JSON.parse(raw.trim().split('\n').pop());

let auto = 0;
let ask = 0;
let ignored = 0;

for (const [caption, r] of results) {
  const verdict = r.autoApply
    ? 'APPLY '
    : r.action === 'none'
      ? 'ignore'
      : 'ASK   ';
  if (r.autoApply) auto++;
  else if (r.action === 'none') ignored++;
  else ask++;

  const times = [r.opensAt, r.closesAt].filter(Boolean).join('-');
  console.log(
    `${verdict} ${String(r.confidence).padEnd(5)} ${r.action.padEnd(13)} ${times.padEnd(12)} ${caption}`
  );
  console.log(`       ${r.reason}${r.blocked ? '  [blocked: ' + r.blocked + ']' : ''}`);
}

console.log(
  `\n${results.length} captions:  ${auto} applied automatically, ${ask} sent to the owner to confirm, ${ignored} ignored.`
);
