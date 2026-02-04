/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@acme/api", "@acme/db"],
  experimental: {
    typedRoutes: true
  }
};

export default nextConfig;
