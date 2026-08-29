const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function cleanup() {
  console.log("🗑️  Cleaning up data...");

  // Delete all data except admin account
  await prisma.attendance.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.advanceRequest.deleteMany();
  await prisma.payroll.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.locationLog.deleteMany();

  // Delete all employees except admin
  await prisma.employee.deleteMany({
    where: {
      role: { not: "admin" },
    },
  });

  // Reset company settings
  await prisma.company.update({
    where: { id: 1 },
    data: {
      name: "Arco Tech",
      address: "Cairo, Egypt",
      phone: "0100-000-0000",
      email: "info@arcotech.com",
    },
  });

  console.log("✅ Cleanup completed!");
  console.log("📋 Admin account preserved:");
  console.log("   Email: admin@company.com");
  console.log("   Password: admin123");
}

cleanup()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
