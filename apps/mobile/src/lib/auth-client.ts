import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/client";
import { emailOTPClient } from "better-auth/client/plugins";
import * as SecureStore from "expo-secure-store";

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    emailOTPClient(),
    expoClient({
      storage: SecureStore,
    }),
  ],
});
