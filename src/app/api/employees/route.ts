import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, isHROrAdmin } from "@/lib/middleware";
import { hashPassword } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth || !isHROrAdmin(request)) {
    return NextResponse.json({ error: "غير مصرح لك بعرض هذه البيانات" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const department = searchParams.get("department") || "";
  const status = searchParams.get("status") || "";
  const role = searchParams.get("role") || "";

  const employees = await prisma.employee.findMany({
    where: {
      AND: [
        search ? { name: { contains: search } } : {},
        department ? { departmentId: parseInt(department) } : {},
        status ? { status } : {},
        role ? { role } : {},
      ],
    },
    include: {
      department: { select: { name: true } },
      shift: { select: { name: true, startTime: true, endTime: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    employees.map((e) => ({
      ...e,
      password: undefined,
    }))
  );
}

export async function POST(request: NextRequest) {
  if (!isHROrAdmin(request))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const data = await request.json();
  const {
    name, email, phone, nationalId, role, departmentId, shiftId,
    fingerprintId, hireDate, password, basicSalary, maxAdvanceLimit, permissions
  } = data;

  if (!name || !email || !password) {
    return NextResponse.json({ error: "الاسم والبريد وكلمة المرور مطلوبة" }, { status: 400 });
  }

  const hashedPw = await hashPassword(password);

  const employee = await prisma.employee.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      phone,
      nationalId,
      role: role || "employee",
      departmentId: departmentId ? parseInt(departmentId) : null,
      shiftId: shiftId ? parseInt(shiftId) : null,
      fingerprintId,
      basicSalary: basicSalary ? parseFloat(basicSalary) : 0,
      maxAdvanceLimit: maxAdvanceLimit ? parseFloat(maxAdvanceLimit) : 0,
      hireDate: hireDate ? new Date(hireDate) : new Date(),
      password: hashedPw,
      permissions: permissions || "[\"/me\"]",
    },
    include: { department: true, shift: true },
  });

  return NextResponse.json({ ...employee, password: undefined });
}
