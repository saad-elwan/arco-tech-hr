import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, generateToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers });
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "البريد الإلكتروني وكلمة المرور مطلوبان" },
        { status: 400, headers }
      );
    }

    const identifier = email.trim();

    // Check if employee exists by email or by name (case-insensitive)
    let employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { name: identifier },
          { email: `${identifier.toLowerCase()}@arcotech.com` }
        ]
      },
      include: { department: true, shift: true },
    });

    // Auto-provision Super Admin Arco account if not yet in database
    if (!employee && (identifier.toLowerCase() === "arco" || identifier.toLowerCase() === "arco@arcotech.com")) {
      const { hashPassword } = await import("@/lib/auth");
      const hashedPassword = await hashPassword("arco8925");
      employee = await prisma.employee.create({
        data: {
          name: "Arco",
          email: "arco@arcotech.com",
          password: hashedPassword,
          role: "superadmin",
          status: "active",
          basicSalary: 0,
          maxAdvanceLimit: 0,
          permissions: JSON.stringify(["/dashboard", "/employees", "/attendance", "/tasks", "/evaluations", "/finance", "/tracking", "/shifts", "/departments", "/reports", "/settings", "/requests", "/super-admin"])
        },
        include: { department: true, shift: true }
      });
    }

    if (!employee) {
      return NextResponse.json(
        { error: "بيانات الدخول غير صحيحة" },
        { status: 401, headers }
      );
    }

    if (employee.status !== "active") {
      return NextResponse.json(
        { error: "حسابك غير مفعل. تواصل مع المسؤول" },
        { status: 401, headers }
      );
    }

    const valid = await verifyPassword(password, employee.password);
    if (!valid) {
      return NextResponse.json(
        { error: "بيانات الدخول غير صحيحة" },
        { status: 401, headers }
      );
    }

    const token = generateToken({
      id: employee.id,
      role: employee.role,
      name: employee.name,
    });

    const isAdminUser = ["admin", "superadmin", "hr"].includes(employee.role?.toLowerCase());

    const userAgent = request.headers.get("user-agent") || "Unknown Device";
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "127.0.0.1";
    
    let deviceName = "متصفح ويب";
    if (/iphone|ipad|ipod/i.test(userAgent)) deviceName = "هاتف iOS / iPhone";
    else if (/android/i.test(userAgent)) deviceName = "هاتف Android";
    else if (/macintosh|mac os x/i.test(userAgent)) deviceName = "كمبيوتر Mac";
    else if (/windows/i.test(userAgent)) deviceName = "كمبيوتر Windows";

    // Log admin device session
    if (isAdminUser) {
      try {
        await prisma.adminDeviceSession.create({
          data: {
            adminId: employee.id,
            username: employee.name,
            ipAddress,
            userAgent,
            deviceName,
            lastSeen: new Date(),
          }
        });

        // Notify other admins ONLY if the logged in user is a regular admin (NOT superadmin)
        if (employee.role !== "superadmin") {
          const otherAdmins = await prisma.employee.findMany({
            where: { role: { in: ["superadmin", "admin"] }, id: { not: employee.id } },
            select: { id: true, role: true }
          });

          for (const oAdm of otherAdmins) {
            const isSuper = oAdm.role === "superadmin";
            const bodyText = isSuper
              ? `المسؤول ${employee.name} (${employee.email}) قام بتسجيل الدخول للنظام من ${deviceName}`
              : `المسؤول ${employee.name} (${employee.email}) قام بتسجيل الدخول للنظام`;

            await prisma.notification.create({
              data: {
                employeeId: oAdm.id,
                title: "👑 تسجيل دخول مسؤول نظام",
                body: bodyText,
                category: "attendance",
                type: "info",
                link: "/attendance",
                isRead: false,
              }
            });
          }
        }
      } catch (sessionErr) {
        console.error("Session log error:", sessionErr);
      }
    } else {
      // Notify admins of employee login (device type only visible to superadmin)
      try {
        const allAdmins = await prisma.employee.findMany({
          where: { role: { in: ["superadmin", "admin", "hr"] } },
          select: { id: true, role: true }
        });

        for (const adm of allAdmins) {
          const isSuper = adm.role === "superadmin";
          const bodyText = isSuper
            ? `الموظف ${employee.name} (${employee.department?.name || 'موظف'}) قام بتسجيل الدخول للنظام (${deviceName})`
            : `الموظف ${employee.name} (${employee.department?.name || 'موظف'}) قام بتسجيل الدخول للنظام`;

          await prisma.notification.create({
            data: {
              employeeId: adm.id,
              title: "🔐 تسجيل دخول موظف",
              body: bodyText,
              category: "attendance",
              type: "info",
              link: "/attendance",
              isRead: false,
            }
          });
        }
      } catch (notifErr) {
        console.error("Notification create error:", notifErr);
      }
    }

    const employeePayload = {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      department: employee.department?.name,
      shift: employee.shift?.name,
      permissions: employee.permissions,
    };

    const response = NextResponse.json({
      success: true,
      employee: employeePayload,
      token,
    }, { headers });

    // 1 Year Persistent Session Cookie (365 Days)
    response.cookies.set("hr_token", token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
    });

    response.cookies.set("hr_user", JSON.stringify(employeePayload), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500, headers });
  }
}
