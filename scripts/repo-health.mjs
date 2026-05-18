import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();

const REQUIRED_ROUTES = [
  'src/app/page.tsx',
  'src/app/login/page.tsx',
  'src/app/lobby/page.tsx',
  'src/app/room/[id]/page.tsx',
  'src/app/store/page.tsx',
  'src/app/store/success/page.tsx',
  'src/app/account/page.tsx',
  'src/app/account/limits/page.tsx',
  'src/app/account/exclude/page.tsx',
  'src/app/account/sessions/page.tsx',
  'src/app/onboarding/page.tsx',
];

const REQUIRED_INFRA = [
  'src/app/layout.tsx',
  'src/app/globals.css',
  'src/lib/supabase/client.ts',
  'src/lib/supabase/server.ts',
  'supabase/schema.sql',
];

const backupMatches = [];

function walk(dir) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const st = statSync(full);

    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue;
      walk(full);
      continue;
    }

    if (/(\.bak(\.|$)|\.backup$)/.test(entry)) {
      backupMatches.push(relative(root, full));
    }
  }
}

function safeCountRoutesInAudit() {
  try {
    const audit = readFileSync(join(root, 'AUDIT.md'), 'utf8');
    const routeHeadingMatches = audit.match(/^###\s.+`\/[^`]+`/gm) ?? [];
    return routeHeadingMatches.length;
  } catch {
    return 0;
  }
}

walk(root);

const missingRoutes = REQUIRED_ROUTES.filter((p) => !existsSync(join(root, p)));
const missingInfra = REQUIRED_INFRA.filter((p) => !existsSync(join(root, p)));
const auditRoutesCount = safeCountRoutesInAudit();

console.log('== BingoBolla repo health ==');
console.log(`Critical routes present: ${REQUIRED_ROUTES.length - missingRoutes.length}/${REQUIRED_ROUTES.length}`);
if (missingRoutes.length > 0) {
  console.log('Missing critical routes:');
  for (const route of missingRoutes) console.log(`  - ${route}`);
}

console.log(`Core infra files present: ${REQUIRED_INFRA.length - missingInfra.length}/${REQUIRED_INFRA.length}`);
if (missingInfra.length > 0) {
  console.log('Missing infra files:');
  for (const file of missingInfra) console.log(`  - ${file}`);
}

console.log(`Audit route sections in AUDIT.md: ${auditRoutesCount}`);
if (auditRoutesCount === 0) {
  console.log('  - warning: no route headings detected from AUDIT.md format');
}
console.log(`Backup files detected: ${backupMatches.length}`);
for (const file of backupMatches.slice(0, 20)) {
  console.log(`  - ${file}`);
}
if (backupMatches.length > 20) {
  console.log(`  ... and ${backupMatches.length - 20} more`);
}

if (missingRoutes.length > 0 || missingInfra.length > 0) {
  process.exitCode = 1;
}
