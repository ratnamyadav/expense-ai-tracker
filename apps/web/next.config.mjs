/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@acme/api", "@acme/db"],
  typedRoutes: true,
};

export default nextConfig;
