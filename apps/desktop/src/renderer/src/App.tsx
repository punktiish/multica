import { useEffect, useLayoutEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { CoreProvider } from "@multica/core/platform";
import { useAuthStore } from "@multica/core/auth";
import { workspaceListOptions } from "@multica/core/workspace/queries";
import { ThemeProvider } from "@multica/ui/components/common/theme-provider";
import { MulticaIcon } from "@multica/ui/components/common/multica-icon";
import { Toaster } from "sonner";
import { DesktopShell } from "./components/desktop-layout";
import { UpdateNotification } from "./components/update-notification";
import { useTabStore } from "./stores/tab-store";
import { useWindowOverlayStore } from "./stores/window-overlay-store";

function AppContent() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  // Tell the main process which backend URL we talk to, so daemon-manager
  // can pick the matching CLI profile (server_url from ~/.multica config).
  useEffect(() => {
    window.daemonAPI.setTargetApiUrl(DAEMON_TARGET_API_URL);
  }, []);

  // Start the daemon whenever the local user is ready.
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        await window.daemonAPI.autoStart();
      } catch (err) {
        console.error("Failed to start daemon", err);
      }
    })();
  }, [user]);

  // When a user who started the session with zero workspaces creates their
  // first one, restart the daemon so it picks up the new workspace
  // immediately (otherwise workspaceSyncLoop's next 30s tick would be the
  // earliest pickup point).
  const { data: workspaces, isFetched: workspaceListFetched } = useQuery({
    ...workspaceListOptions(),
    enabled: !!user,
  });
  const wsCount = workspaces?.length ?? 0;

  // Validate persisted tab state against the current user's workspace list,
  // and pick an active workspace if none is set. Runs in useLayoutEffect
  // (synchronously after render, before paint) rather than the render
  // phase — the original render-phase pattern triggered React's
  // "Cannot update a component while rendering a different component"
  // warning because `switchWorkspace` is a Zustand setState that the
  // TabBar is subscribed to. useLayoutEffect flushes both renders before
  // the user sees anything, so there's no visible flicker.
  useLayoutEffect(() => {
    if (!workspaces) return;
    const validSlugs = new Set(workspaces.map((w) => w.slug));
    const tabStore = useTabStore.getState();
    tabStore.validateWorkspaceSlugs(validSlugs);
    if (!tabStore.activeWorkspaceSlug && workspaces.length > 0) {
      tabStore.switchWorkspace(workspaces[0].slug);
    }
  }, [workspaces]);

  // Bidirectional new-workspace overlay: visible when there are no
  // workspaces to enter, hidden as soon as one exists. Gated on
  // `workspaceListFetched` so the initial render doesn't flash the
  // overlay before the list arrives.
  useEffect(() => {
    if (!user) return;
    if (!workspaceListFetched) return;
    const { overlay, open, close } = useWindowOverlayStore.getState();
    const isEmpty = wsCount === 0;
    if (isEmpty) {
      if (!overlay) open({ type: "new-workspace" });
    } else if (overlay?.type === "new-workspace") {
      close();
    }
  }, [user, workspaceListFetched, wsCount]);
  // null = undecided (local user or list hasn't settled yet)
  // true  = session started with zero workspaces; next transition to >=1 triggers restart
  // false = session started with >=1 workspace, OR we've already restarted; skip
  const sessionStartedEmptyRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!user) {
      sessionStartedEmptyRef.current = null;
      return;
    }
    if (!workspaceListFetched) return;
    if (sessionStartedEmptyRef.current === null) {
      sessionStartedEmptyRef.current = wsCount === 0;
      return;
    }
    if (sessionStartedEmptyRef.current && wsCount >= 1) {
      void window.daemonAPI.restart();
      sessionStartedEmptyRef.current = false;
    }
  }, [user, workspaceListFetched, wsCount]);

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <MulticaIcon className="size-6 animate-pulse" />
      </div>
    );
  }

  return <DesktopShell />;
}

// Backend the daemon should connect to — same URL the renderer talks to.
const DAEMON_TARGET_API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function App() {
  return (
    <ThemeProvider>
      <CoreProvider
        apiBaseUrl={import.meta.env.VITE_API_URL || "http://localhost:8080"}
        wsUrl={import.meta.env.VITE_WS_URL || "ws://localhost:8080/ws"}
      >
        <AppContent />
      </CoreProvider>
      <Toaster />
      <UpdateNotification />
    </ThemeProvider>
  );
}
