"use client";

import { useEffect } from "react";
import { trpc } from "@/lib/trpc";

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
