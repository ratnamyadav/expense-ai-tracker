import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0c0f14",
        fog: "#eef2f5",
        glow: "#6ee7ff",
        ember: "#ffb86b"
      },
      boxShadow: {
        soft: "0 24px 60px -40px rgba(0, 0, 0, 0.5)"
      }
    }
  },
  plugins: []
};

export default config;
