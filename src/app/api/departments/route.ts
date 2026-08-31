import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, isHROrAdmin } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  try {
    const depts = await prisma.department.findMany({
      include: { 
        _count: { select: { employees: true } },
        supervisor: { select: { id: true, name: true, email: true } }
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(depts);
  } catch (err) {
    console.error("Departments GET error:", err);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  if (!isHROrAdmin(request))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  try {
    const body = await request.json();
    const { name, supervisorId } = body;
    if (!name || !name.trim()) return NextResponse.json({ error: "اسم القسم مطلوب" }, { status: 400 });

    const sId = supervisorId && !isNaN(parseInt(supervisorId)) ? parseInt(supervisorId) : null;

    const dept = await prisma.department.create({ 
      data: { 
        name: name.trim(),
        supervisorId: sId
      },
      include: {
        _count: { select: { employees: true } },
        supervisor: { select: { id: true, name: true } }
      }
    });
    return NextResponse.json(dept);
  } catch (err: any) {
    console.error("Department create error:", err);
    return NextResponse.json({ error: err.message || "فشل في إنشاء القسم" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isHROrAdmin(request))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  try {
    const body = await request.json();
    const { id, name, supervisorId } = body;
    if (!id || !name) return NextResponse.json({ error: "البيانات ناقصة" }, { status: 400 });

    const sId = supervisorId && !isNaN(parseInt(supervisorId)) ? parseInt(supervisorId) : null;

    const dept = await prisma.department.update({ 
      where: { id: parseInt(id) }, 
      data: { 
        name: name.trim(),
        supervisorId: sId
      },
      include: {
        _count: { select: { employees: true } },
        supervisor: { select: { id: true, name: true } }
      }
    });
    return NextResponse.json(dept);
  } catch (err: any) {
    console.error("Department update error:", err);
    return NextResponse.json({ error: err.message || "فشل في تحديث القسم" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isHROrAdmin(request))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "المعرف مطلوب" }, { status: 400 });
    
    // Check if any employees belong to this department
    const count = await prisma.employee.count({ where: { departmentId: parseInt(id) } });
    if (count > 0) {
      // Unlink employees from this department before deleting
      await prisma.employee.updateMany({
        where: { departmentId: parseInt(id) },
        data: { departmentId: null }
      });
    }

    await prisma.department.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Department delete error:", err);
    return NextResponse.json({ error: err.message || "فشل في حذف القسم" }, { status: 500 });
  }
}
