import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, isHROrAdmin } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const depts = await prisma.department.findMany({
    include: { 
      _count: { select: { employees: true } },
      supervisor: { select: { id: true, name: true, email: true } }
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(depts);
}

export async function POST(request: NextRequest) {
  if (!isHROrAdmin(request))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const { name, supervisorId } = await request.json();
  if (!name) return NextResponse.json({ error: "اسم القسم مطلوب" }, { status: 400 });
  const dept = await prisma.department.create({ 
    data: { 
      name,
      supervisorId: supervisorId ? parseInt(supervisorId) : null
    } 
  });
  return NextResponse.json(dept);
}

export async function PUT(request: NextRequest) {
  if (!isHROrAdmin(request))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const { id, name, supervisorId } = await request.json();
  if (!id || !name) return NextResponse.json({ error: "البيانات ناقصة" }, { status: 400 });
  const dept = await prisma.department.update({ 
    where: { id: parseInt(id) }, 
    data: { 
      name,
      supervisorId: supervisorId ? parseInt(supervisorId) : null
    } 
  });
  return NextResponse.json(dept);
}

export async function DELETE(request: NextRequest) {
  if (!isHROrAdmin(request))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "المعرف مطلوب" }, { status: 400 });
  // Check no employees assigned
  const count = await prisma.employee.count({ where: { departmentId: parseInt(id) } });
  if (count > 0) return NextResponse.json({ error: "لا يمكن حذف قسم يحتوي على موظفين" }, { status: 400 });
  await prisma.department.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
