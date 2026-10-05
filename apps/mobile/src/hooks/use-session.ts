import { useQuery } from "@tanstack/react-query";
import { authClient } from "../lib/auth-client";

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const result = await authClient.getSession();
      if (result.error) throw new Error(result.error.message ?? "Unable to load session");
      return result.data;
    },
  });
}
