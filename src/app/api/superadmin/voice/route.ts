import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, isAdmin } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth || !isAdmin(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    const messages = await prisma.voiceMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(messages || []);
  } catch (err) {
    console.error("Voice GET error:", err);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth || !isAdmin(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { audioData, duration } = body;

    if (!audioData) {
      return NextResponse.json({ error: "بيانات الصوت مطلوبة" }, { status: 400 });
    }

    const voiceMsg = await prisma.voiceMessage.create({
      data: {
        senderId: auth.id,
        senderName: auth.name,
        audioData,
        duration: duration ? parseFloat(duration) : 0,
      }
    });

    return NextResponse.json({ success: true, message: voiceMsg });
  } catch (err: any) {
    console.error("Voice POST error:", err);
    return NextResponse.json({ error: "فشل في حفظ البث الصوتي" }, { status: 500 });
  }
}
