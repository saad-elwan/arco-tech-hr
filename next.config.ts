import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        // Apply CORS to all API routes with credentials support
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, PATCH, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, Cookie" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ],
      },
      {
        // iOS/WebView/PWA compatibility headers for ALL pages
        source: "/:path*",
        headers: [
          // CSP: allow embedding from anywhere + upgrade HTTP to HTTPS (iOS ATS requirement)
          { key: "Content-Security-Policy", value: "frame-ancestors *; upgrade-insecure-requests" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Permissive referrer for WebView compatibility
          { key: "Referrer-Policy", value: "no-referrer-when-downgrade" },
          // Allow all permissions for embedded contexts (iOS needs explicit grants)
          { key: "Permissions-Policy", value: "geolocation=(*), camera=(*), microphone=(*)" },
          // Strict-Transport-Security for iOS ATS compliance
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
