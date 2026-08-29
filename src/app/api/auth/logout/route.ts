import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthFromRequest } from "@/lib/middleware";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete("hr_token");
  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  return NextResponse.json({ user: auth });
}
