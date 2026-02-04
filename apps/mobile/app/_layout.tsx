import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { trpc } from "../src/lib/trpc";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";

const baseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      transformer: superjson,
      links: [
        httpBatchLink({
          url: `${baseUrl}/api/trpc`
        })
      ]
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
