import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/middleware";
import { ensureDatabaseSchema } from "@/lib/ensureSchema";

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseSchema();
    const auth = getAuthFromRequest(request);
    const body = await request.json();
    const { token, employeeId, platform } = body;

    const targetEmployeeId = auth?.id || employeeId;

    if (!token || !targetEmployeeId) {
      return NextResponse.json({ error: "الرمز ومعرف الموظف مطلوبان" }, { status: 400 });
    }

    // Upsert push token
    await prisma.$executeRawUnsafe(
      `INSERT INTO "DevicePushToken" ("employeeId", "token", "platform", "updatedAt")
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT ("token") DO UPDATE SET "employeeId" = $1, "updatedAt" = CURRENT_TIMESTAMP;`,
      targetEmployeeId,
      token,
      platform || "android"
    );

    return NextResponse.json({ success: true, message: "تم تسجيل جهازك لاستقبال الإشعارات بنجاح" });
  } catch (err: any) {
    console.error("Register token error:", err);
    return NextResponse.json({ error: err.message || "خطأ في التسجيل" }, { status: 500 });
  }
}
