import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, generateToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "البريد الإلكتروني وكلمة المرور مطلوبان" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findFirst({
      where: { email: email.toLowerCase().trim() },
      include: { department: true, shift: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "بيانات الدخول غير صحيحة" },
        { status: 401 }
      );
    }

    if (employee.status !== "active") {
      return NextResponse.json(
        { error: "حسابك غير مفعل. تواصل مع المسؤول" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, employee.password);
    if (!valid) {
      return NextResponse.json(
        { error: "بيانات الدخول غير صحيحة" },
        { status: 401 }
      );
    }

    const token = generateToken({
      id: employee.id,
      role: employee.role,
      name: employee.name,
    });

    const cookieStore = await cookies();
    cookieStore.set("hr_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
      sameSite: "lax",
    });

    return NextResponse.json({
      success: true,
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        department: employee.department?.name,
        shift: employee.shift?.name,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
