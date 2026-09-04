import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const confirm = url.searchParams.get("confirm");

    if (confirm !== "yes") {
      return NextResponse.json({ 
        message: "This will permanently delete ALL Attendance and Payroll data for August (month 08). Please add ?confirm=yes to the URL to proceed." 
      }, { status: 400 });
    }

    // Delete attendance records for August (date starts with "2026-08")
    const deletedAttendance = await prisma.attendance.deleteMany({
      where: {
        date: { startsWith: "2026-08" }
      }
    });

    // Delete payroll records for August (period equals "2026-08")
    const deletedPayroll = await prisma.payroll.deleteMany({
      where: {
        period: "2026-08"
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "August data successfully deleted.",
      details: {
        attendanceDeleted: deletedAttendance.count,
        payrollDeleted: deletedPayroll.count
      }
    });

  } catch (error) {
    console.error("Error deleting August data:", error);
    return NextResponse.json({ error: "Failed to delete data" }, { status: 500 });
  }
}
