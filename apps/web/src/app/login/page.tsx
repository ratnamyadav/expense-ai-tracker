"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const consentMutation = trpc.account.acceptConsent.useMutation();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  const googleEnabled = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  const appleEnabled = Boolean(process.env.NEXT_PUBLIC_APPLE_CLIENT_ID);

  async function handleSendOtp() {
    setError(null);
    setLoading(true);
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      if (result.error) throw new Error(result.error.message ?? "Unable to send code");
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send code");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setError(null);
    setLoading(true);
    try {
      const result = await authClient.signIn.emailOtp({
        email,
        otp,
      });
      if (result.error) throw new Error(result.error.message ?? "Unable to verify code");
      if (accepted) {
        await consentMutation.mutateAsync({ version: "v1" });
      }
      router.push("/app/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify code");
    } finally {
      setLoading(false);
    }
  }

  async function handleSocial(provider: "google" | "apple") {
    setError(null);
    if (!accepted) {
      setError("Please accept the Terms and Privacy Policy.");
      return;
    }
    try {
      window.localStorage.setItem("consent:pending", "v1");
      const result = await authClient.signIn.social({ provider });
      if (result.error) throw new Error(result.error.message ?? "Unable to sign in");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-10 px-6 py-16">
      <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <p className="text-xs uppercase tracking-[0.45em] text-white/50">Expense AI Tracker</p>
          <h1 className="text-5xl font-semibold leading-tight">Log expenses with a simple chat.</h1>
          <p className="text-lg text-white/70">
            Continue with email OTP and start turning messages into structured income and expenses.
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              className={`rounded-2xl border border-white/10 px-5 py-3 text-sm ${
                googleEnabled
                  ? "bg-white/10 text-white"
                  : "cursor-not-allowed bg-white/5 text-white/40"
              }`}
              onClick={() => handleSocial("google")}
              disabled={!googleEnabled}
            >
              Continue with Google
            </button>
            <button
              type="button"
              className={`rounded-2xl border border-white/10 px-5 py-3 text-sm ${
                appleEnabled
                  ? "bg-white/10 text-white"
                  : "cursor-not-allowed bg-white/5 text-white/40"
              }`}
              onClick={() => handleSocial("apple")}
              disabled={!appleEnabled}
            >
              Continue with Apple
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <h2 className="text-2xl font-semibold">Email login</h2>
          <p className="mt-2 text-sm text-white/60">
            We'll send a one-time code to verify your email.
          </p>

          <div className="mt-6 space-y-4">
            <label className="block text-sm text-white/70">
              Email
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                placeholder="you@company.com"
              />
            </label>

            {step === "otp" && (
              <label className="block text-sm text-white/70">
                One-time code
                <input
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  type="text"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                  placeholder="123456"
                />
              </label>
            )}

            <label className="flex items-center gap-3 text-xs text-white/60">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
              />
              I agree to the Terms and Privacy Policy.
            </label>

            {error && (
              <p className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </p>
            )}

            <Button
              type="button"
              onClick={step === "email" ? handleSendOtp : handleVerifyOtp}
              disabled={loading || !email || (step === "otp" && !otp) || !accepted}
              className="w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Working..." : step === "email" ? "Send code" : "Verify & continue"}
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
