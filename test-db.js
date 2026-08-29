const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

async function test() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  try {
    const result = await prisma.$queryRawUnsafe("SELECT 1 as test");
    console.log("OK:", result);
  } catch (e) {
    console.error("FAIL:", e.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

test();
