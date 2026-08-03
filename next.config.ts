import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    useTypeScriptCli: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "hnzyllbksqvamqfubhri.supabase.co" },
    ],
  },
};

export default nextConfig;
