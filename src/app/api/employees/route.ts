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
  const includeAdmins = searchParams.get("includeAdmins") === "true";

  const employees = await prisma.employee.findMany({
    where: {
      AND: [
        search ? { name: { contains: search } } : {},
        department ? { departmentId: parseInt(department) } : {},
        status ? { status } : {},
        role ? { role } : (!includeAdmins ? { role: { notIn: ["admin", "superadmin"] } } : {}),
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
    })),
    {
      headers: {
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10"
      }
    }
  );
}

export async function POST(request: NextRequest) {
  if (!isHROrAdmin(request))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  try {
    const data = await request.json();
    let {
      name, email, phone, nationalId, role, departmentId, shiftId,
      fingerprintId, hireDate, password, basicSalary, maxAdvanceLimit, permissions
    } = data;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "اسم الموظف أو المندوب مطلوب" }, { status: 400 });
    }

    const cleanName = name.trim();
    const cleanEmail = email && email.trim()
      ? email.toLowerCase().trim()
      : `${cleanName.replace(/\s+/g, '').toLowerCase() || 'user' + Date.now()}@arcotech.com`;

    // Check if email already in use
    const existing = await prisma.employee.findFirst({
      where: { email: cleanEmail }
    });
    if (existing) {
      return NextResponse.json({ error: "البريد الإلكتروني مسجل بالفعل لموظف آخر" }, { status: 400 });
    }

    const plainPassword = password && password.trim() ? password.trim() : "123456";
    const hashedPw = await hashPassword(plainPassword);

    const employee = await prisma.employee.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        phone: phone?.trim() || null,
        nationalId: nationalId?.trim() || null,
        role: role || "employee",
        departmentId: departmentId ? parseInt(departmentId) : null,
        shiftId: shiftId ? parseInt(shiftId) : null,
        fingerprintId: fingerprintId?.trim() || null,
        basicSalary: basicSalary !== undefined && basicSalary !== "" ? parseFloat(basicSalary) : 0,
        maxAdvanceLimit: maxAdvanceLimit !== undefined && maxAdvanceLimit !== "" ? parseFloat(maxAdvanceLimit) : 0,
        hireDate: hireDate ? new Date(hireDate) : new Date(),
        password: hashedPw,
        permissions: permissions || "[\"/me\"]",
      },
      include: { department: true, shift: true },
    });

    return NextResponse.json({ ...employee, password: undefined });
  } catch (err: any) {
    console.error("Employee create error:", err);
    if (err.code === "P2002") {
      return NextResponse.json({ error: "البريد الإلكتروني أو رقم البطاقة أو معرف البصمة مسجل بالفعل" }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || "حدث خطأ أثناء حفظ الموظف/المندوب" }, { status: 500 });
  }
}
