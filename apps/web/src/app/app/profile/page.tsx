"use client";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import Link from "next/link";

export default function ProfilePage() {
  const subscriptionQuery = trpc.subscription.get.useQuery();

  const deleteMutation = trpc.account.delete.useMutation({
    onSuccess: async () => {
      await authClient.signOut();
      window.location.href = "/login";
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-lg font-semibold">Subscription</h3>
        <p className="mt-2 text-sm text-white/60">
          Status: {subscriptionQuery.data?.status ?? "loading"}
        </p>
        <p className="text-sm text-white/60">
          Entries used: {subscriptionQuery.data?.entriesUsed ?? "--"} /{" "}
          {subscriptionQuery.data?.entriesLimit ?? "--"}
        </p>
        <p className="mt-2 text-xs text-white/50">
          Subscriptions are billed through the App Store or Play Store. Cancel anytime in your
          account settings.
        </p>
        <button
          type="button"
          className="mt-4 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900"
        >
          Upgrade to Pro
        </button>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-lg font-semibold">Data & privacy</h3>
        <div className="mt-4 flex flex-col gap-2 text-sm">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/app/summary";
            }}
            className="rounded-2xl border border-white/20 px-3 py-2 text-left"
          >
            Export data (Pro)
          </button>
          <Link className="text-white/70 hover:text-white" href="/privacy">
            Privacy Policy
          </Link>
          <Link className="text-white/70 hover:text-white" href="/terms">
            Terms of Service
          </Link>
          <button
            type="button"
            onClick={() => deleteMutation.mutate()}
            className="mt-2 rounded-2xl border border-red-500/40 px-3 py-2 text-left text-red-200"
          >
            Delete account
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <button
          type="button"
          onClick={async () => {
            await authClient.signOut();
            window.location.href = "/login";
          }}
          className="rounded-2xl border border-white/20 px-4 py-2 text-sm"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
