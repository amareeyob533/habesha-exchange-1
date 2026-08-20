import { PrismaClient } from '@prisma/client'

// On Vercel serverless, we need to reuse the Prisma client across invocations
// to avoid exhausting the database connection pool.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Use the pooled connection URL (POSTGRES_PRISMA_URL or DATABASE_URL) for
// queries, and the direct URL (DIRECT_URL / POSTGRES_URL_NON_POOLING) for
// migrations. Prisma handles this via the schema's `url` and `directUrl`.
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
    // Prevent connection timeouts on serverless cold starts
    datasources: {
      db: {
        url: process.env.POSTGRES_PRISMA_URL ||
             process.env.DATABASE_URL ||
             undefined,
      },
    },
  })

// Cache the client on the global object to prevent connection pool exhaustion
// in serverless environments (Vercel).
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
} else {
  // In production (Vercel), still cache to reuse across warm lambda invocations
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = db
  }
}

// Handle connection errors gracefully on serverless
db.$on('error' as any, (e: any) => {
  console.error('Prisma connection error:', e)
})
