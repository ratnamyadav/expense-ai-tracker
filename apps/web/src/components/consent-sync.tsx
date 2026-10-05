"use client";

import { trpc } from "@/lib/trpc";
import { useEffect } from "react";

export function ConsentSync() {
  const mutation = trpc.account.acceptConsent.useMutation();

  useEffect(() => {
    const version = window.localStorage.getItem("consent:pending");
    if (version) {
      mutation.mutate({ version });
      window.localStorage.removeItem("consent:pending");
    }
  }, [mutation]);

  return null;
}
