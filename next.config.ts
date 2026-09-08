import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        // Apply CORS to all API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, PATCH, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
      {
        // Allow WebView/iframe/PWA embedding for ALL pages
        source: "/:path*",
        headers: [
          // Remove X-Frame-Options entirely to allow WebView embedding
          // Use CSP frame-ancestors * instead (modern replacement)
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Permissive referrer for WebView compatibility
          { key: "Referrer-Policy", value: "no-referrer-when-downgrade" },
          // Allow all permissions for embedded contexts
          { key: "Permissions-Policy", value: "geolocation=(*), camera=(*), microphone=(*)" },
        ],
      },
    ];
  },
};

export default nextConfig;
