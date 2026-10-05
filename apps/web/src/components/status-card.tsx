"use client";

import { type Health, createApiClient } from "@acme/api";
import { useEffect, useState } from "react";

const formatTimestamp = (value: string) => new Date(value).toLocaleString();

export function StatusCard() {
  const [status, setStatus] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const client = createApiClient({ baseUrl: window.location.origin });
        const data = await client.getHealth();
        if (mounted) {
          setStatus(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Live check</p>
          <h3 className="mt-2 text-2xl font-semibold">API heartbeat</h3>
        </div>
        <span className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/60">
          {status ? "Connected" : error ? "Offline" : "Connecting"}
        </span>
      </div>

      <div className="mt-6 space-y-3 text-sm text-white/70">
        <div className="flex items-center justify-between">
          <span>Service</span>
          <span className="text-white">{status?.app ?? "--"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Timestamp</span>
          <span className="text-white">{status ? formatTimestamp(status.timestamp) : "--"}</span>
        </div>
        {error ? (
          <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-3 text-red-200">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
