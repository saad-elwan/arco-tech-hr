import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting seed...");

  const adminPassword = await bcrypt.hash("admin123", 12);
  const hrPassword = await bcrypt.hash("hr123456", 12);
  const empPassword = await bcrypt.hash("emp12345", 12);

  // Create company
  await prisma.company.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "Arco Tech",
      address: "Cairo, Egypt",
      phone: "0100-000-0000",
      email: "info@arcotech.com",
      workStartTime: "08:00",
      workEndTime: "17:00",
      lateThresholdMin: 15,
      geofenceLat: 30.0444,
      geofenceLng: 31.2357,
      geofenceRadius: 500,
    },
  });

  // Create departments
  const itDept = await prisma.department.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: "IT" },
  });

  const hrDept = await prisma.department.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, name: "HR" },
  });

  // Create shifts
  const shift = await prisma.shift.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: "Main", startTime: "08:00", endTime: "17:00" },
  });

  // Create admin
  await prisma.employee.upsert({
    where: { fingerprintId: "FP001" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@company.com",
      phone: "0100-111-1111",
      password: adminPassword,
      role: "admin",
      departmentId: itDept.id,
      shiftId: shift.id,
      fingerprintId: "FP001",
    },
  });

  // Create HR
  await prisma.employee.upsert({
    where: { fingerprintId: "FP002" },
    update: {},
    create: {
      name: "HR Manager",
      email: "hr@company.com",
      phone: "0100-222-2222",
      password: hrPassword,
      role: "hr",
      departmentId: hrDept.id,
      shiftId: shift.id,
      fingerprintId: "FP002",
    },
  });

  // Create employee
  await prisma.employee.upsert({
    where: { fingerprintId: "FP003" },
    update: {},
    create: {
      name: "Khaled",
      email: "khaled@company.com",
      phone: "0100-333-3333",
      password: empPassword,
      role: "employee",
      departmentId: itDept.id,
      shiftId: shift.id,
      fingerprintId: "FP003",
    },
  });

  console.log("✅ Seed completed!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
