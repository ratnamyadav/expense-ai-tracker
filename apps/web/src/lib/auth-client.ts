import { createAuthClient } from "better-auth/client";
import { emailOTPClient } from "better-auth/client/plugins";

const baseURL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (typeof window !== "undefined" ? window.location.origin : "");

export const authClient = createAuthClient({
  baseURL,
  plugins: [emailOTPClient()]
});
