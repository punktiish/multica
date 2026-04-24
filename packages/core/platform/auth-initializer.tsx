"use client";

import { useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getApi } from "../api";
import { useAuthStore } from "../auth";
import { configStore } from "../config";
import { workspaceKeys } from "../workspace/queries";
import { createLogger } from "../logger";

const logger = createLogger("local-user");

export function AuthInitializer({
  children,
}: {
  children: ReactNode;
}) {
  const qc = useQueryClient();

  useEffect(() => {
    const api = getApi();

    // Fetch app config (CDN domain, etc.) in the background — non-blocking.
    api.getConfig().then((cfg) => {
      if (cfg.cdn_domain) configStore.getState().setCdnDomain(cfg.cdn_domain);
    }).catch(() => { /* config is optional — legacy file card matching degrades gracefully */ });

    Promise.all([api.getMe(), api.listWorkspaces()])
      .then(([user, wsList]) => {
        useAuthStore.setState({ user, isLoading: false });
        qc.setQueryData(workspaceKeys.list(), wsList);
      })
      .catch((err) => {
        logger.error("local user init failed", err);
        useAuthStore.setState({ user: null, isLoading: false });
      });
  }, []);

  return <>{children}</>;
}
