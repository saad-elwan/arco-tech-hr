import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, isHROrAdmin } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const shifts = await prisma.shift.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(shifts);
}

export async function POST(request: NextRequest) {
  if (!isHROrAdmin(request))
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const { name, startTime, endTime, breakDuration } = await request.json();
  const shift = await prisma.shift.create({
    data: { name, startTime, endTime, breakDuration: breakDuration || 60 },
  });
  return NextResponse.json(shift);
}
