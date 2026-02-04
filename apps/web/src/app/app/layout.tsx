import Link from "next/link";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { ConsentSync } from "@/components/consent-sync";

export default async function AppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <ConsentSync />
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0c0f14]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-[0.4em] text-white/50">
              Expense AI Tracker
            </span>
          </div>
          <nav className="flex items-center gap-4 text-sm text-white/70">
            <Link className="hover:text-white" href="/app/home">
              Chat
            </Link>
            <Link className="hover:text-white" href="/app/summary">
              Summary
            </Link>
            <Link className="hover:text-white" href="/app/transactions">
              Transactions
            </Link>
            <Link className="hover:text-white" href="/app/profile">
              Profile
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        {children}
      </main>
    </div>
  );
}
