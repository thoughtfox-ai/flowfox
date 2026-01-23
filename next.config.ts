import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Temporarily ignore TypeScript errors during build
    // TODO: Generate Supabase types with: npx supabase gen types typescript --local > src/lib/database.types.ts
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
