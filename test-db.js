const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

async function test() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  try {
    const tables = await prisma.$queryRawUnsafe(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    console.log("Tables:", tables);

    const count = await prisma.$queryRawUnsafe('SELECT COUNT(*) FROM "Employee"');
    console.log("Employee count:", count);
  } catch (e) {
    console.error("FAIL:", e.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

test();
