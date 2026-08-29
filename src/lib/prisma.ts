import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prismaX: PrismaClient | undefined;
};

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/postgres";

// Configure pool for Supabase
const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 10000,
  max: 1,
});

const adapter = new PrismaPg(pool);

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({ adapter });
} else {
  if (!globalForPrisma.prismaX) {
    globalForPrisma.prismaX = new PrismaClient({ adapter });
  }
  prisma = globalForPrisma.prismaX;
}

export { prisma };
