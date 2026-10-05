import { createApiClient } from "@acme/api";

const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export const api = createApiClient({ baseUrl });
