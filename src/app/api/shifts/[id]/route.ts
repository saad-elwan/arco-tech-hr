import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isHROrAdmin } from "@/lib/middleware";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isHROrAdmin(request))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const { id } = await params;
  const data = await request.json();
  const shift = await prisma.shift.update({
    where: { id: parseInt(id) },
    data: {
      name: data.name,
      startTime: data.startTime,
      endTime: data.endTime,
      breakDuration: data.breakDuration,
    },
  });
  return NextResponse.json(shift);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isHROrAdmin(request))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const { id } = await params;
  await prisma.shift.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
