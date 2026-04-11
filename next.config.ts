import type { NextConfig } from "next"

/**
 * vprint-automation (Express) base URL for dev proxy.
 * Run the backend on this port (e.g. WEBHOOK_PORT=3001) while Next.js uses 3000.
 */
const AUTOMATION_SERVICE_URL =
  process.env.AUTOMATION_SERVICE_URL?.replace(/\/$/, "") || "http://localhost:3001"

const nextConfig: NextConfig = {
  reactCompiler: true,

  devIndicators: {
    position: "bottom-right",
  },
  typedRoutes: true,

  /** Proxy dashboard + internal JWT routes to Express so the browser can stay on :3000. */
  async rewrites() {
    return [
      {
        source: "/internal/:path*",
        destination: `${AUTOMATION_SERVICE_URL}/internal/:path*`,
      },
    ]
  },
}

export default nextConfig
