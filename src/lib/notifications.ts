import { prisma } from "@/lib/prisma";

// Central function to create a notification for an employee
export async function createNotification({
  employeeId,
  type,
  category,
  title,
  body,
  link = "/me",
}: {
  employeeId: number;
  type: "info" | "success" | "warning" | "danger";
  category: "task" | "payroll" | "advance" | "leave" | "attendance";
  title: string;
  body: string;
  link?: string;
}) {
  try {
    await prisma.notification.create({
      data: { employeeId, type, category, title, body, link },
    });
  } catch (e) {
    console.error("Failed to create notification:", e);
  }
}

// Notify all HR/Admin/SuperAdmin employees with role-aware body (device details only for superadmin)
export async function createAdminNotification({
  type,
  category,
  title,
  body,
  superAdminBody,
  link = "/attendance",
}: {
  type: "info" | "success" | "warning" | "danger";
  category: "task" | "payroll" | "advance" | "leave" | "attendance";
  title: string;
  body: string;
  superAdminBody?: string;
  link?: string;
}) {
  try {
    const admins = await prisma.employee.findMany({
      where: { role: { in: ["superadmin", "admin", "hr"] }, status: "active" },
      select: { id: true, role: true },
    });
    await Promise.all(
      admins.map(a => {
        const isSuper = a.role === "superadmin";
        const finalBody = isSuper && superAdminBody ? superAdminBody : body;
        return prisma.notification.create({
          data: { employeeId: a.id, type, category, title, body: finalBody, link },
        });
      })
    );
  } catch (e) {
    console.error("Failed to create admin notification:", e);
  }
}
