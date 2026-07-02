// Prebuild script — ensures Prisma has the env vars it needs, regardless of
// which Postgres provider you use (Vercel Postgres, Neon, Supabase, Railway).
//
// Vercel Postgres usually sets POSTGRES_PRISMA_URL (pooled) + POSTGRES_URL_NON_POOLING (direct),
// but our schema references DATABASE_URL + DIRECT_URL. This script maps them so
// `prisma db push` never fails with "Environment variable not found".
//
// CRITICAL: This script NEVER aborts the build. If prisma db push fails (e.g. the
// database isn't connected yet, or a transient network error), we still run `next build`
// so the deployment succeeds. The runtime APIs are resilient to a missing/mismatched
// schema and will surface a friendly error instead of crashing.
import { execSync } from 'node:child_process'

function run(cmd, label) {
  try {
    console.log(`\n→ ${label}`)
    execSync(cmd, { stdio: 'inherit' })
    console.log(`  ✓ ${label} succeeded`)
    return true
  } catch (err) {
    console.error(`  ⚠ ${label} FAILED — continuing anyway.`)
    console.error(`    (The app will still build; runtime APIs handle DB errors gracefully.)`)
    return false
  }
}

console.log('→ Ensuring database environment variables...')

// Collect any available Postgres connection URL.
const pooled =
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  ''

const direct =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL_NO_POOL ||
  process.env.DIRECT_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  ''

const available = []
if (process.env.POSTGRES_PRISMA_URL) available.push('POSTGRES_PRISMA_URL')
if (process.env.POSTGRES_URL_NON_POOLING) available.push('POSTGRES_URL_NON_POOLING')
if (process.env.POSTGRES_URL) available.push('POSTGRES_URL')
if (process.env.DATABASE_URL) available.push('DATABASE_URL')
if (process.env.DIRECT_URL) available.push('DIRECT_URL')
console.log(`  Available Postgres env vars: ${available.length ? available.join(', ') : '(none)'}`)

if (!pooled && !direct) {
  console.error('')
  console.error('✗ WARNING: No Postgres connection URL found.')
  console.error('  The build will continue, but the app will not be able to read/write data.')
  console.error('  To fix: Vercel → Storage → Create Database → Postgres → Connect Project')
  console.error('  This auto-sets POSTGRES_PRISMA_URL and POSTGRES_URL_NON_POOLING.')
  // DO NOT exit — let the build complete so the user can wire up the DB later.
}

// Map Vercel Postgres env vars onto the names our schema uses.
// Schema: url = DATABASE_URL, directUrl = DIRECT_URL
if (pooled && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = pooled
  console.log('  ✓ Set DATABASE_URL from pooled URL')
} else if (pooled) {
  // Also overwrite in case DATABASE_URL was stale.
  process.env.DATABASE_URL = pooled
}

if (direct && !process.env.DIRECT_URL) {
  process.env.DIRECT_URL = direct
  console.log('  ✓ Set DIRECT_URL from non-pooling URL')
} else if (direct) {
  process.env.DIRECT_URL = direct
}

// If only one of them is set, copy it to the other so Prisma always finds both.
if (process.env.DATABASE_URL && !process.env.DIRECT_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL
  console.log('  ✓ Set DIRECT_URL = DATABASE_URL (no separate non-pooling URL)')
}
if (process.env.DIRECT_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL
  console.log('  ✓ Set DATABASE_URL = DIRECT_URL (no separate pooling URL)')
}

console.log('  ✓ Prisma env vars resolved.\n')

// 1. prisma generate — must succeed for the client to be importable.
run('prisma generate', 'prisma generate')

// 2. prisma db push — creates/updates tables. Best-effort; do not block build.
run('prisma db push --accept-data-loss', 'prisma db push')

// 3. next build — ALWAYS run, even if prisma steps failed.
const ok = run('next build', 'next build')

if (!ok) {
  console.error('\n✗ next build failed.')
  process.exit(1)
}

console.log('\n✓ Build complete.')
