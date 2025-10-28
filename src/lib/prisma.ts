import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Removed: Prisma is no longer used after DynamoDB migration.
// export const prisma =
//   globalForPrisma.prisma ??
//   new PrismaClient({
//     log: ['query'],
//   })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma