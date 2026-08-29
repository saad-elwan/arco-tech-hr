import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const dbPath = path.join(process.cwd(), "prisma", "hr.db");
const adapter = new PrismaBetterSqlite3({ url: "file:" + dbPath });
const prisma = new PrismaClient({ adapter });



async function main() {
  console.log("🌱 بدء إنشاء البيانات التجريبية...");

  // Company
  await prisma.company.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "شركة النجاح للتكنولوجيا",
      address: "القاهرة، مصر",
      phone: "0100-000-0000",
      email: "info@success-tech.com",
      workStartTime: "08:00",
      workEndTime: "17:00",
      lateThresholdMin: 15,
      geofenceLat: 30.0444, // Cairo
      geofenceLng: 31.2357,
      geofenceRadius: 500,
    },
  });

  // Departments
  const depts = await Promise.all([
    prisma.department.create({ data: { name: "تكنولوجيا المعلومات" } }),
    prisma.department.create({ data: { name: "الموارد البشرية" } }),
    prisma.department.create({ data: { name: "المالية والمحاسبة" } }),
    prisma.department.create({ data: { name: "المبيعات والتسويق" } }),
    prisma.department.create({ data: { name: "خدمة العملاء" } }),
  ]);

  // Shifts
  const shifts = await Promise.all([
    prisma.shift.create({
      data: { name: "الوردية الصباحية", startTime: "07:00", endTime: "15:00" },
    }),
    prisma.shift.create({
      data: { name: "الوردية الرئيسية", startTime: "08:00", endTime: "17:00" },
    }),
    prisma.shift.create({
      data: { name: "الوردية المسائية", startTime: "14:00", endTime: "22:00" },
    }),
    prisma.shift.create({
      data: { name: "الوردية الليلية", startTime: "22:00", endTime: "06:00" },
    }),
  ]);

  const adminPassword = await bcrypt.hash("admin123", 12);
  const hrPassword = await bcrypt.hash("hr123456", 12);
  const empPassword = await bcrypt.hash("emp12345", 12);

  // Admin
  const admin = await prisma.employee.create({
    data: {
      name: "محمد أحمد السيد",
      email: "admin@company.com",
      phone: "0100-111-1111",
      password: adminPassword,
      role: "admin",
      departmentId: depts[0].id,
      shiftId: shifts[1].id,
      fingerprintId: "FP001",
      hireDate: new Date("2020-01-01"),
    },
  });

  // HR
  const hr = await prisma.employee.create({
    data: {
      name: "سارة محمود إبراهيم",
      email: "hr@company.com",
      phone: "0100-222-2222",
      password: hrPassword,
      role: "hr",
      departmentId: depts[1].id,
      shiftId: shifts[1].id,
      fingerprintId: "FP002",
      hireDate: new Date("2021-03-15"),
    },
  });

  // Employees
  const empData = [
    { name: "خالد عبد الله حسن", email: "khaled@company.com", dept: 0, shift: 0, fp: "FP003" },
    { name: "فاطمة علي محمد", email: "fatma@company.com", dept: 2, shift: 1, fp: "FP004" },
    { name: "عمر حسين الجوهري", email: "omar@company.com", dept: 3, shift: 1, fp: "FP005" },
    { name: "نور الدين إبراهيم", email: "nour@company.com", dept: 4, shift: 2, fp: "FP006" },
    { name: "هناء سامي أحمد", email: "hanaa@company.com", dept: 1, shift: 1, fp: "FP007" },
    { name: "يوسف طارق مصطفى", email: "youssef@company.com", dept: 0, shift: 0, fp: "FP008" },
    { name: "ريم محمد الشريف", email: "reem@company.com", dept: 3, shift: 1, fp: "FP009" },
    { name: "أحمد سعيد النجار", email: "ahmed@company.com", dept: 2, shift: 1, fp: "FP010" },
  ];

  const employees = await Promise.all(
    empData.map((e, i) =>
      prisma.employee.create({
        data: {
          name: e.name,
          email: e.email,
          phone: `0100-${(300 + i).toString()}-0000`,
          password: empPassword,
          role: "employee",
          departmentId: depts[e.dept].id,
          shiftId: shifts[e.shift].id,
          fingerprintId: e.fp,
          hireDate: new Date(
            2021 + Math.floor(i / 3),
            i % 12,
            Math.floor(Math.random() * 28) + 1
          ),
        },
      })
    )
  );

  // Attendance for last 30 days
  const allEmployees = [admin, hr, ...employees];
  const today = new Date();
  for (let d = 29; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 5 || dayOfWeek === 6) continue; // Friday/Saturday off

    const dateStr = date.toISOString().split("T")[0];

    for (const emp of allEmployees) {
      const rand = Math.random();
      if (rand < 0.05) continue; // 5% غائب

      const lateMinutes = Math.random() < 0.15 ? Math.floor(Math.random() * 60) + 16 : 0;
      const checkInHour = 8 + (lateMinutes > 0 ? 0 : 0);
      const checkInMin = 0 + lateMinutes;
      const checkIn = `${String(checkInHour + Math.floor(checkInMin / 60)).padStart(2, "0")}:${String(checkInMin % 60).padStart(2, "0")}`;
      const checkOut = `${String(16 + Math.floor(Math.random() * 2)).padStart(2, "0")}:${String(Math.floor(Math.random() * 59)).padStart(2, "0")}`;

      await prisma.attendance.upsert({
        where: { employeeId_date: { employeeId: emp.id, date: dateStr } },
        update: {},
        create: {
          employeeId: emp.id,
          date: dateStr,
          checkIn,
          checkOut: d === 0 && Math.random() < 0.3 ? null : checkOut,
          status: lateMinutes > 15 ? "late" : "present",
          source: Math.random() < 0.7 ? "fingerprint" : "manual",
        },
      });
    }
  }

  // Tasks
  const taskData = [
    { title: "تطوير واجهة المستخدم للعملاء", desc: "إنشاء لوحة تحكم جديدة للعملاء", priority: "high", status: "in_progress", assignedTo: employees[0].id },
    { title: "مراجعة عقود الموردين", desc: "مراجعة وتحديث عقود الموردين الحالية", priority: "medium", status: "new", assignedTo: employees[3].id },
    { title: "تقرير الأداء الشهري", desc: "إعداد تقرير أداء شهر مارس", priority: "high", status: "completed", assignedTo: hr.id },
    { title: "تحديث قاعدة البيانات", desc: "ترقية وتحديث قاعدة البيانات الرئيسية", priority: "urgent" as unknown as "high", status: "in_progress", assignedTo: employees[6].id },
    { title: "تدريب الموظفين الجدد", desc: "تنظيم برنامج تدريبي للموظفين الجدد", priority: "medium", status: "new", assignedTo: employees[4].id },
    { title: "إعداد ميزانية Q2", desc: "إعداد ميزانية الربع الثاني", priority: "high", status: "completed", assignedTo: employees[3].id },
  ];

  for (const t of taskData) {
    await prisma.task.create({
      data: {
        title: t.title,
        description: t.desc,
        priority: t.priority,
        status: t.status,
        assignedTo: t.assignedTo,
        assignedBy: admin.id,
        dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
        completedAt: t.status === "completed" ? new Date() : null,
      },
    });
  }

  // Evaluations
  for (const emp of employees.slice(0, 5)) {
    const attendanceScore = 70 + Math.random() * 30;
    const tasksScore = 60 + Math.random() * 40;
    const manualScore = 50 + Math.random() * 50;
    await prisma.evaluation.create({
      data: {
        employeeId: emp.id,
        evaluatorId: hr.id,
        period: "2024-03",
        attendanceScore: Math.round(attendanceScore),
        tasksScore: Math.round(tasksScore),
        manualScore: Math.round(manualScore),
        totalScore: Math.round((attendanceScore * 0.4) + (tasksScore * 0.4) + (manualScore * 0.2)),
        comments: "أداء جيد في المجمل، يحتاج إلى تحسين في بعض الجوانب",
        type: Math.random() < 0.5 ? "auto" : "manual",
      },
    });
  }

  console.log("✅ تم إنشاء البيانات التجريبية بنجاح!");
  console.log("👤 Admin: admin@company.com / admin123");
  console.log("👩‍💼 HR: hr@company.com / hr123456");
  console.log("👨‍💻 Employee: khaled@company.com / emp12345");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
