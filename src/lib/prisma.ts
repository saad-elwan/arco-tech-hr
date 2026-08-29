import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prismaX: PrismaClient | undefined;
};

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({});
} else {
  if (!globalForPrisma.prismaX) {
    globalForPrisma.prismaX = new PrismaClient({});
  }
  prisma = globalForPrisma.prismaX;
}

export { prisma };
