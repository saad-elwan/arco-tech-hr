-- CreateTable
CREATE TABLE "Payroll" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "basicSalary" REAL NOT NULL DEFAULT 0,
    "workingDays" INTEGER NOT NULL DEFAULT 30,
    "presentDays" INTEGER NOT NULL DEFAULT 0,
    "absentDays" INTEGER NOT NULL DEFAULT 0,
    "lateDays" INTEGER NOT NULL DEFAULT 0,
    "autoDeduction" REAL NOT NULL DEFAULT 0,
    "bonus" REAL NOT NULL DEFAULT 0,
    "manualDeduction" REAL NOT NULL DEFAULT 0,
    "netSalary" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payroll_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LocationLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "isOutOfRange" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LocationLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdvanceRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedAmount" REAL NOT NULL DEFAULT 0,
    "repaidAmount" REAL NOT NULL DEFAULT 0,
    "reviewedBy" INTEGER,
    "reviewNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AdvanceRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "duration" REAL NOT NULL DEFAULT 1,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" INTEGER,
    "reviewNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Attendance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "checkIn" TEXT,
    "checkOut" TEXT,
    "status" TEXT NOT NULL DEFAULT 'present',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "notes" TEXT,
    "checkInLat" REAL,
    "checkInLng" REAL,
    "checkOutLat" REAL,
    "checkOutLng" REAL,
    "isOutOfRange" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Attendance" ("checkIn", "checkOut", "createdAt", "date", "employeeId", "id", "notes", "source", "status") SELECT "checkIn", "checkOut", "createdAt", "date", "employeeId", "id", "notes", "source", "status" FROM "Attendance";
DROP TABLE "Attendance";
ALTER TABLE "new_Attendance" RENAME TO "Attendance";
CREATE UNIQUE INDEX "Attendance_employeeId_date_key" ON "Attendance"("employeeId", "date");
CREATE TABLE "new_Company" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "name" TEXT NOT NULL DEFAULT 'شركتي',
    "logo" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "workStartTime" TEXT NOT NULL DEFAULT '08:00',
    "workEndTime" TEXT NOT NULL DEFAULT '17:00',
    "lateThresholdMin" INTEGER NOT NULL DEFAULT 15,
    "geofenceLat" REAL,
    "geofenceLng" REAL,
    "geofenceRadius" INTEGER NOT NULL DEFAULT 500,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Company" ("address", "createdAt", "email", "id", "lateThresholdMin", "logo", "name", "phone", "updatedAt", "workEndTime", "workStartTime") SELECT "address", "createdAt", "email", "id", "lateThresholdMin", "logo", "name", "phone", "updatedAt", "workEndTime", "workStartTime" FROM "Company";
DROP TABLE "Company";
ALTER TABLE "new_Company" RENAME TO "Company";
CREATE TABLE "new_Employee" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "nationalId" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "photo" TEXT,
    "password" TEXT NOT NULL,
    "basicSalary" REAL NOT NULL DEFAULT 0,
    "role" TEXT NOT NULL DEFAULT 'employee',
    "hireDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',
    "fingerprintId" TEXT,
    "departmentId" INTEGER,
    "shiftId" INTEGER,
    "maxAdvanceLimit" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Employee_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Employee" ("createdAt", "departmentId", "email", "fingerprintId", "hireDate", "id", "name", "nationalId", "password", "phone", "photo", "role", "shiftId", "status", "updatedAt") SELECT "createdAt", "departmentId", "email", "fingerprintId", "hireDate", "id", "name", "nationalId", "password", "phone", "photo", "role", "shiftId", "status", "updatedAt" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
CREATE UNIQUE INDEX "Employee_nationalId_key" ON "Employee"("nationalId");
CREATE UNIQUE INDEX "Employee_fingerprintId_key" ON "Employee"("fingerprintId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Payroll_employeeId_period_key" ON "Payroll"("employeeId", "period");
