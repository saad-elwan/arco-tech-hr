import { prisma } from "./prisma";

let schemaInitialized = false;

export async function ensureDatabaseSchema() {
  if (schemaInitialized) return;

  try {
    // 1. Employee extra columns
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Employee' AND column_name='maxAdvanceLimit') THEN
          ALTER TABLE "Employee" ADD COLUMN "maxAdvanceLimit" DOUBLE PRECISION NOT NULL DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Employee' AND column_name='permissions') THEN
          ALTER TABLE "Employee" ADD COLUMN "permissions" TEXT DEFAULT '["/me"]';
        END IF;
      END $$;
    `).catch(() => {});

    // 2. DailyRoute table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "DailyRoute" (
        "id" SERIAL PRIMARY KEY,
        "delegateId" INTEGER NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
        "date" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'in_progress',
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. RouteCheckpoint table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "RouteCheckpoint" (
        "id" SERIAL PRIMARY KEY,
        "routeId" INTEGER NOT NULL REFERENCES "DailyRoute"("id") ON DELETE CASCADE,
        "clientName" TEXT NOT NULL,
        "address" TEXT,
        "phone" TEXT,
        "lat" DOUBLE PRECISION NOT NULL,
        "lng" DOUBLE PRECISION NOT NULL,
        "order" INTEGER NOT NULL DEFAULT 1,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "visitedAt" TIMESTAMP(3),
        "notes" TEXT
      );
    `);

    // 4. AdminDeviceSession table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AdminDeviceSession" (
        "id" SERIAL PRIMARY KEY,
        "adminId" INTEGER NOT NULL,
        "username" TEXT NOT NULL,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "deviceName" TEXT,
        "lat" DOUBLE PRECISION,
        "lng" DOUBLE PRECISION,
        "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "isLiveAudioActive" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Treasury table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Treasury" (
        "id" INTEGER PRIMARY KEY DEFAULT 1,
        "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "totalDeposits" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "totalWithdrawals" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. TreasuryTransaction table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "TreasuryTransaction" (
        "id" SERIAL PRIMARY KEY,
        "type" TEXT NOT NULL,
        "amount" DOUBLE PRECISION NOT NULL,
        "description" TEXT NOT NULL,
        "referenceId" TEXT,
        "performedBy" TEXT NOT NULL DEFAULT 'الإدارة',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. DevicePushToken table for background and closed app notifications
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "DevicePushToken" (
        "id" SERIAL PRIMARY KEY,
        "employeeId" INTEGER NOT NULL,
        "token" TEXT NOT NULL UNIQUE,
        "platform" TEXT DEFAULT 'android',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    schemaInitialized = true;
  } catch (err) {
    console.error("ensureDatabaseSchema error:", err);
  }
}
