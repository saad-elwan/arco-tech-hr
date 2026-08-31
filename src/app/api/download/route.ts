import { NextResponse } from "next/server";

const DIRECT_APK_URL = "https://expo.dev/artifacts/eas/TtovW06xVgkrcqt08YBBddeZMGu0ww3bgIRTw9sDKnA.apk";

export async function GET() {
  return NextResponse.redirect(DIRECT_APK_URL, {
    status: 302,
    headers: {
      "Content-Disposition": 'attachment; filename="ARCO-HR-v1.2.0.apk"',
      "Content-Type": "application/vnd.android.package-archive",
    },
  });
}
