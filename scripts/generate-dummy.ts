import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

const arabNames = [
  "أحمد", "محمد", "محمود", "علي", "عمر", "حسن", "حسين", "خالد", "وليد", "طارق",
  "مصطفى", "إبراهيم", "يوسف", "ياسين", "عبدالرحمن", "عبدالله", "كريم", "سامر", "سعد", "فهد",
  "سارة", "فاطمة", "مريم", "نور", "هدى", "ليلى", "سميرة", "زينب", "آية", "ندى"
];
const arabSurnames = [
  "السيد", "حسن", "علي", "محمود", "محمد", "إبراهيم", "عبدالله", "سعد", "عثمان", "صالح"
];

function getRandomName() {
  const first = arabNames[Math.floor(Math.random() * arabNames.length)];
  const last = arabSurnames[Math.floor(Math.random() * arabSurnames.length)];
  return `${first} ${last}`;
}

async function main() {
  console.log("🚀 جاري إضافة 73 موظف ببياناتهم (حضور ومهام)...");

  // Get departments and shifts
  const depts = await prisma.department.findMany();
  const shifts = await prisma.shift.findMany();

  if (depts.length === 0 || shifts.length === 0) {
    console.error("الرجاء تشغيل db push و seed أولاً لتوفير الأقسام والورديات الأساسية.");
    return;
  }

  const passwordHash = await bcrypt.hash("123456", 12);
  const now = new Date();

  // Create 73 employees
  for (let i = 1; i <= 73; i++) {
    const role = Math.random() > 0.7 ? "delegate" : "employee";
    const dept = depts[Math.floor(Math.random() * depts.length)];
    const shift = shifts[Math.floor(Math.random() * shifts.length)];
    const name = getRandomName() + " " + i;
    
    // Attempt to create employee
    const emp = await prisma.employee.create({
      data: {
        name: name,
        email: `emp${Date.now()}_${i}@company.com`,
        phone: `011${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
        password: passwordHash,
        basicSalary: Math.floor(Math.random() * 5000) + 3000,
        role: role,
        departmentId: dept.id,
        shiftId: shift.id,
      }
    });

    // Create attendance for the last 5 days
    for (let d = 0; d < 5; d++) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      
      // Skip Fridays
      if (date.getDay() === 5) continue;

      const dateStr = date.toISOString().split("T")[0];
      const isPresent = Math.random() > 0.1; // 90% attendance

      if (isPresent) {
        // Random check in time between 07:45 and 08:30
        const inM = Math.floor(Math.random() * 45) + 45;
        const checkIn = `0${inM < 60 ? 7 : 8}:${(inM % 60).toString().padStart(2, '0')}`;
        
        // Random check out time between 16:30 and 17:30
        const outM = Math.floor(Math.random() * 60) + 30;
        const checkOut = `1${outM < 60 ? 6 : 7}:${(outM % 60).toString().padStart(2, '0')}`;
        
        const status = inM > 60 + 15 ? "late" : "present"; // Assuming 08:15 is threshold

        await prisma.attendance.create({
          data: {
            employeeId: emp.id,
            date: dateStr,
            checkIn,
            checkOut,
            status,
            source: "app"
          }
        });
      } else {
        await prisma.attendance.create({
          data: {
            employeeId: emp.id,
            date: dateStr,
            status: "absent",
            source: "manual"
          }
        });
      }
    }

    // Create 1-3 tasks for the employee
    const tasksCount = Math.floor(Math.random() * 3) + 1;
    for (let t = 0; t < tasksCount; t++) {
      const statuses = ["pending", "in_progress", "completed"];
      await prisma.task.create({
        data: {
          title: `مهمة تجريبية رقم ${t + 1} لـ ${emp.name}`,
          description: "تفاصيل المهمة هنا...",
          dueDate: new Date(now.getTime() + (Math.random() * 5 * 24 * 60 * 60 * 1000)),
          status: statuses[Math.floor(Math.random() * statuses.length)],
          assignedTo: emp.id,
          assignedBy: 1 // Assuming admin ID is 1
        }
      });
    }

    if (i % 10 === 0) {
      console.log(`تم إضافة ${i} موظف...`);
    }
  }

  console.log("✅ تم إنشاء 73 موظف ببياناتهم بنجاح!");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
