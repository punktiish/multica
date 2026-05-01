"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigationStore } from "@multica/core/navigation";
import { useAuthStore } from "@multica/core/auth";
import {
  paths,
  resolvePostAuthDestination,
  useCurrentWorkspace,
  useHasOnboarded,
} from "@multica/core/paths";
import { workspaceListOptions } from "@multica/core/workspace";
import { useNavigation } from "../navigation";

/**
 * Local user + workspace gate for the dashboard.
 *
 * Redirect logic:
 *  - Auth still loading → wait
 *  - Logged in but workspace list not yet loaded → wait (don't bounce prematurely)
 *  - Logged in but URL slug doesn't resolve to any workspace →
 *    `resolvePostAuthDestination(list, hasOnboarded)`:
 *      • un-onboarded → /onboarding
 *      • onboarded with workspaces → first workspace
 *      • onboarded with zero workspaces → /workspaces/new
 */
export function useDashboardGuard() {
  const { pathname, replace } = useNavigation();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const workspace = useCurrentWorkspace();
  const hasOnboarded = useHasOnboarded();
  const { data: workspaces = [], isFetched: workspaceListFetched } = useQuery({
    ...workspaceListOptions(),
    enabled: !!user,
  });

  useEffect(() => {
    if (isLoading) return;
    if (!user) return;
    if (!workspaceListFetched) return;
    if (!workspace) {
      replace(resolvePostAuthDestination(workspaces, hasOnboarded));
    }
  }, [user, isLoading, workspaceListFetched, workspace, workspaces, hasOnboarded, replace]);

  useEffect(() => {
    useNavigationStore.getState().onPathChange(pathname);
  }, [pathname]);

  return { user, isLoading, workspace };
}
