import { NextResponse } from "next/server";

const DIRECT_APK_URL = "https://expo.dev/artifacts/eas/KH8_TFgwCbJZU3xNmX-nNdVMNcpii9za8ATURA-slL4.apk";

export async function GET() {
  return NextResponse.redirect(DIRECT_APK_URL, {
    status: 302,
    headers: {
      "Content-Disposition": 'attachment; filename="ARCO-HR-v1.2.0.apk"',
      "Content-Type": "application/vnd.android.package-archive",
    },
  });
}
