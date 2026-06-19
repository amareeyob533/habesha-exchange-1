// Prebuild script — ensures Prisma has the env vars it needs, regardless of
// which Postgres provider you use (Vercel Neon, Supabase, Railway, Neon direct).
//
// Vercel Neon usually sets POSTGRES_PRISMA_URL + POSTGRES_URL_NON_POOLING,
// but some setups only set one of them. This script fills in the gaps so
// `prisma db push` never fails with "Environment variable not found".
import { execSync } from 'node:child_process'

console.log('→ Ensuring database environment variables...')

// Collect any available Postgres connection URL.
const candidates = {
  POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL,
  POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING,
  POSTGRES_URL: process.env.POSTGRES_URL,
  DATABASE_URL: process.env.DATABASE_URL,
}
const available = Object.entries(candidates).filter(([, v]) => v).map(([k]) => k)
console.log(`  Available Postgres env vars: ${available.length ? available.join(', ') : '(none)'}`)

const firstAvailable =
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL

if (!firstAvailable) {
  console.error('')
  console.error('✗ ERROR: No Postgres connection URL found.')
  console.error('  Connect a Postgres database to your Vercel project:')
  console.error('  Vercel → Storage → Create Database → Postgres → Connect Project')
  console.error('  This auto-sets POSTGRES_PRISMA_URL and POSTGRES_URL_NON_POOLING.')
  process.exit(1)
}

// Prisma schema references these two — make sure both are set.
if (!process.env.POSTGRES_PRISMA_URL) {
  process.env.POSTGRES_PRISMA_URL = firstAvailable
  console.log('  ✓ Set POSTGRES_PRISMA_URL from fallback')
}
if (!process.env.POSTGRES_URL_NON_POOLING) {
  // Prefer a non-pooled URL for migrations; fall back to whatever exists.
  process.env.POSTGRES_URL_NON_POOLING =
    process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || firstAvailable
  console.log('  ✓ Set POSTGRES_URL_NON_POOLING from fallback')
}
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL
  console.log('  ✓ Set DATABASE_URL from fallback')
}

console.log('  ✓ All Prisma env vars are set.\n')

// Run the build steps with the env inherited.
console.log('→ prisma generate')
execSync('prisma generate', { stdio: 'inherit' })

console.log('\n→ prisma db push (creates/updates database tables)')
execSync('prisma db push --accept-data-loss', { stdio: 'inherit' })

console.log('\n→ next build')
execSync('next build', { stdio: 'inherit' })
