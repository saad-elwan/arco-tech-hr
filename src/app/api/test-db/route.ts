import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const records = await prisma.attendance.findMany({
    where: { date: { startsWith: "2026-09" } },
    include: { employee: { select: { name: true } } },
    orderBy: { date: 'asc' }
  });

  return NextResponse.json(records);
}
