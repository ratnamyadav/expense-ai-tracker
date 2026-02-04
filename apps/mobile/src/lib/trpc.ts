import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@acme/trpc";

export const trpc = createTRPCReact<AppRouter>();
