// Builds the Marketplace copy of Walkdown in .listing/.
//
// Why: Atlassian won't share an app by install link once it has been submitted to the
// Marketplace. Judges use the main app (install link); the Marketplace listing uses this
// copy, which has its own app id. Same code, different manifest id.
//
// Usage: node scripts/make-listing-copy.mjs [appId]
//   First run: no appId, then `forge register` inside .listing/ writes one.
//   Later runs: the app id already in .listing/manifest.yml is kept.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, '.listing');
const copy = (rel) => fs.cpSync(path.join(root, rel), path.join(out, rel), { recursive: true });

const previousId = (() => {
  try {
    const m = fs.readFileSync(path.join(out, 'manifest.yml'), 'utf8').match(/id: (ari:cloud:ecosystem::app\/[0-9a-f-]+)/);
    return m && m[1];
  } catch {
    return null;
  }
})();
const appId = process.argv[2] ? `ari:cloud:ecosystem::app/${process.argv[2]}` : previousId;

fs.mkdirSync(out, { recursive: true });
for (const rel of ['src', 'prompts', 'skills', 'package.json', 'package-lock.json', 'LICENSE']) copy(rel);
fs.mkdirSync(path.join(out, 'ui'), { recursive: true });
fs.cpSync(path.join(root, 'ui', 'dist'), path.join(out, 'ui', 'dist'), { recursive: true });

// Normalise Windows line endings so a stray carriage return can't end up inside a value.
let manifest = fs.readFileSync(path.join(root, 'manifest.yml'), 'utf8').split('\r\n').join('\n');
if (appId) manifest = manifest.replace(/id: ari:cloud:ecosystem::app\/[0-9a-f-]+/, `id: ${appId}`);
else manifest = manifest.replace(/\n  id: ari:cloud:ecosystem::app\/[0-9a-f-]+/, ''); // forge register adds it
fs.writeFileSync(path.join(out, 'manifest.yml'), manifest);
console.log(`Listing copy written to ${out}${appId ? ` with ${appId}` : ' (no app id yet: run forge register there)'}`);
