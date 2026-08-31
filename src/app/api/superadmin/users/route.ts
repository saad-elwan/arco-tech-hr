import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, isSuperAdmin, isAdmin } from "@/lib/middleware";
import bcrypt from "bcryptjs";

// GET /api/superadmin/users -> Get all users across the system
export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth || !isAdmin(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");
  const search = searchParams.get("search");

  const where: any = {};
  if (role && role !== "all") {
    where.role = role;
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  const users = await prisma.employee.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      departmentId: true,
      shiftId: true,
      basicSalary: true,
      hireDate: true,
      permissions: true,
      createdAt: true,
      updatedAt: true,
      department: { select: { id: true, name: true } },
      shift: { select: { id: true, name: true, startTime: true, endTime: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}

// POST /api/superadmin/users -> Create user directly from Super Admin
export async function POST(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth || !isSuperAdmin(request)) {
    return NextResponse.json({ error: "صلاحية المشرف العام مطلوبة" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, email, password, role, status, phone, departmentId, shiftId, basicSalary } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "الاسم والبريد الإلكتروني مطلوبان" }, { status: 400 });
    }

    const existing = await prisma.employee.findFirst({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "البريد الإلكتروني مسجل بالفعل" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password || "123456", 10);

    const newUser = await prisma.employee.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "employee",
        status: status || "active",
        phone: phone || null,
        departmentId: departmentId ? parseInt(departmentId) : null,
        shiftId: shiftId ? parseInt(shiftId) : null,
        basicSalary: basicSalary ? parseFloat(basicSalary) : 0,
        hireDate: new Date(),
        permissions: JSON.stringify(["/me", "/tasks", "/attendance", "/evaluations", "/requests"]),
      }
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error) {
    console.error("Super Admin user create error:", error);
    return NextResponse.json({ error: "فشل في إنشاء الحساب" }, { status: 500 });
  }
}

// PATCH /api/superadmin/users -> Edit user role, password, status, or details
export async function PATCH(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth || !isAdmin(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { userId, role, status, newPassword, name, email, phone, basicSalary, departmentId, shiftId } = body;

    if (!userId) {
      return NextResponse.json({ error: "معرف المستخدم مطلوب" }, { status: 400 });
    }

    const updateData: any = {};

    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (basicSalary !== undefined) updateData.basicSalary = parseFloat(basicSalary) || 0;
    if (departmentId !== undefined) updateData.departmentId = departmentId ? parseInt(departmentId) : null;
    if (shiftId !== undefined) updateData.shiftId = shiftId ? parseInt(shiftId) : null;

    if (newPassword && newPassword.trim().length >= 4) {
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.employee.update({
      where: { id: parseInt(userId) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        department: { select: { name: true } },
      }
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Super Admin user update error:", error);
    return NextResponse.json({ error: "فشل في تحديث الحساب" }, { status: 500 });
  }
}

// DELETE /api/superadmin/users -> Delete a user account
export async function DELETE(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth || !isSuperAdmin(request)) {
    return NextResponse.json({ error: "صلاحية المشرف العام مطلوبة للحذف" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json({ error: "معرف المستخدم مطلوب" }, { status: 400 });
    }

    // Prevent deleting own account
    if (parseInt(userId) === auth.id) {
      return NextResponse.json({ error: "لا يمكنك حذف حسابك الحالي" }, { status: 400 });
    }

    await prisma.employee.delete({
      where: { id: parseInt(userId) }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Super Admin user delete error:", error);
    return NextResponse.json({ error: "فشل في حذف الحساب" }, { status: 500 });
  }
}
