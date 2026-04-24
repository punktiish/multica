"use client";

import { CoreProvider } from "@multica/core/platform";
import { WebNavigationProvider } from "@/platform/navigation";

// Derive WebSocket URL from the page origin so self-hosted / LAN deployments
// work without explicit NEXT_PUBLIC_WS_URL.  The Next.js rewrite rule
// (/ws → backend) handles proxying.
function deriveWsUrl(): string | undefined {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  if (typeof window === "undefined") return undefined;
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws`;
}

export function WebProviders({ children }: { children: React.ReactNode }) {
  return (
    <CoreProvider
      apiBaseUrl={process.env.NEXT_PUBLIC_API_URL}
      wsUrl={deriveWsUrl()}
    >
      <WebNavigationProvider>{children}</WebNavigationProvider>
    </CoreProvider>
  );
}
