import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isHROrAdmin } from "@/lib/middleware";
import { hashPassword } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const employee = await prisma.employee.findUnique({
    where: { id: parseInt(id) },
    include: {
      department: true,
      shift: true,
      attendance: { orderBy: { date: "desc" }, take: 30 },
      tasksAssigned: { include: { assigner: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 10 },
      evaluations: { include: { evaluator: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!employee) return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });
  return NextResponse.json({ ...employee, password: undefined });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isHROrAdmin(request))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { id } = await params;
  const data = await request.json();

  const updateData: Record<string, unknown> = {
    name: data.name,
    email: data.email?.toLowerCase().trim(),
    phone: data.phone?.trim() || null,
    nationalId: data.nationalId?.trim() || null,
    role: data.role,
    departmentId: data.departmentId ? parseInt(data.departmentId) : null,
    shiftId: data.shiftId ? parseInt(data.shiftId) : null,
    fingerprintId: data.fingerprintId?.trim() || null,
    basicSalary: data.basicSalary !== undefined && data.basicSalary !== "" ? parseFloat(data.basicSalary) : 0,
    maxAdvanceLimit: data.maxAdvanceLimit !== undefined && data.maxAdvanceLimit !== "" ? parseFloat(data.maxAdvanceLimit) : 0,
    status: data.status,
    hireDate: data.hireDate ? new Date(data.hireDate) : undefined,
    permissions: data.permissions !== undefined ? data.permissions : undefined,
  };

  if (data.password) {
    const auth = (await import("@/lib/middleware")).getAuthFromRequest(request);
    const isAdminOrHR = auth?.role === "admin" || auth?.role === "hr";
    
    if (!isAdminOrHR) {
      // Only require current password if the user is editing their own password
      if (!data.currentPassword) {
        return NextResponse.json({ error: "كلمة المرور الحالية مطلوبة" }, { status: 400 });
      }
      const employee = await prisma.employee.findUnique({ where: { id: parseInt(id) } });
      if (!employee) {
        return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });
      }
      const { verifyPassword } = await import("@/lib/auth");
      const isValid = await verifyPassword(data.currentPassword, employee.password);
      if (!isValid) {
        return NextResponse.json({ error: "كلمة المرور الحالية غير صحيحة" }, { status: 400 });
      }
    }
    updateData.password = await hashPassword(data.password);
  }

  const employee = await prisma.employee.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: { department: true, shift: true },
  });

  return NextResponse.json({ ...employee, password: undefined });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isHROrAdmin(request))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { id } = await params;
  await prisma.employee.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
