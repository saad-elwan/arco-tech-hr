import { NextResponse } from "next/server";

const DIRECT_APK_URL = "https://expo.dev/artifacts/eas/KH8_TFgwCbJZU3xNmX-nNdVMNcpii9za8ATURA-slL4.apk";

export async function GET(req: Request) {
  try {
    const upstreamRes = await fetch(DIRECT_APK_URL);
    if (!upstreamRes.ok || !upstreamRes.body) {
      return NextResponse.redirect(DIRECT_APK_URL);
    }

    const headers = new Headers();
    headers.set("Content-Type", "application/vnd.android.package-archive");
    headers.set("Content-Disposition", 'attachment; filename="ARCO-HR-v1.2.0.apk"');
    headers.set("Access-Control-Allow-Origin", "*");
    
    const contentLength = upstreamRes.headers.get("content-length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    headers.set("Cache-Control", "public, max-age=86400, immutable");

    return new Response(upstreamRes.body as any, {
      status: 200,
      headers,
    });
  } catch (err) {
    return NextResponse.redirect(DIRECT_APK_URL);
  }
}
