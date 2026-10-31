import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Separate loopback origins keep the two development test sessions isolated.
  allowedDevOrigins: ["127.0.0.1"],
  logging: {
    // Confirmation URLs may contain one-time credentials in development.
    incomingRequests: { ignore: [/^\/(?:auth\/(?:callback|confirm)|login|register|verify-email)(?:[/?]|$)/] },
  },
};

export default nextConfig;
