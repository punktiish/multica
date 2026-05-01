"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { WSClient } from "../api/ws-client";
import type { StoreApi, UseBoundStore } from "zustand";
import type { AuthState } from "../auth/store";
import { createLogger } from "../logger";
import { clearWorkspaceStorage } from "../platform/storage-cleanup";
import { defaultStorage } from "../platform/storage";
import { getCurrentWsId, getCurrentSlug } from "../platform/workspace-storage";
import { issueKeys } from "../issues/queries";
import { projectKeys } from "../projects/queries";
import { pinKeys } from "../pins/queries";
import { autopilotKeys } from "../autopilots/queries";
import { runtimeKeys } from "../runtimes/queries";
import {
  agentTaskSnapshotKeys,
  agentActivityKeys,
  agentRunCountsKeys,
  agentTasksKeys,
} from "../agents/queries";
import {
  onIssueCreated,
  onIssueUpdated,
  onIssueDeleted,
  onIssueLabelsChanged,
} from "../issues/ws-updaters";
import { onInboxNew, onInboxInvalidate, onInboxIssueStatusChanged, onInboxIssueDeleted } from "../inbox/ws-updaters";
import { inboxKeys } from "../inbox/queries";
import { workspaceKeys, workspaceListOptions } from "../workspace/queries";
import { chatKeys } from "../chat/queries";
import { resolvePostAuthDestination, useHasOnboarded } from "../paths";
import type {
  MemberAddedPayload,
  WorkspaceDeletedPayload,
  MemberRemovedPayload,
  IssueUpdatedPayload,
  IssueCreatedPayload,
  IssueDeletedPayload,
  IssueLabelsChangedPayload,
  InboxNewPayload,
  CommentCreatedPayload,
  CommentUpdatedPayload,
  CommentDeletedPayload,
  ActivityCreatedPayload,
  ReactionAddedPayload,
  ReactionRemovedPayload,
  IssueReactionAddedPayload,
  IssueReactionRemovedPayload,
  SubscriberAddedPayload,
  SubscriberRemovedPayload,
  TaskMessagePayload,
  TaskQueuedPayload,
  TaskDispatchPayload,
  TaskCompletedPayload,
  TaskFailedPayload,
  TaskCancelledPayload,
  ChatDonePayload,
  ChatPendingTask,
  InvitationCreatedPayload,
} from "../types";

const chatWsLogger = createLogger("chat.ws");

const logger = createLogger("realtime-sync");

export interface RealtimeSyncStores {
  authStore: UseBoundStore<StoreApi<AuthState>>;
}

/**
 * Centralized WS -> store sync. Called once from WSProvider.
 *
 * Uses the "WS as invalidation signal + refetch" pattern:
 * - onAny handler extracts event prefix and calls the matching store refresh
 * - Debounce per-prefix prevents rapid-fire refetches (e.g. bulk issue updates)
 * - Precise handlers only for side effects (toast, navigation, self-check)
 *
 * Per-issue events (comments, activity, reactions, subscribers) are handled
 * both here (invalidation fallback) and by per-page useWSEvent hooks (granular
 * updates). Daemon register events invalidate runtimes globally; heartbeats
 * are skipped to avoid excessive refetches.
 *
 * @param ws - WebSocket client instance (null when not yet connected)
 * @param stores - Platform-created Zustand store instances for auth and workspace
 * @param onToast - Optional callback for showing toast messages (platform-specific)
 */
export function useRealtimeSync(
  ws: WSClient | null,
  stores: RealtimeSyncStores,
  onToast?: (message: string, type?: "info" | "error") => void,
) {
  const { authStore } = stores;
  const qc = useQueryClient();

  // Captured via ref so the (rare) hasOnboarded change doesn't re-subscribe
  // every WS handler in this effect. The resolver reads `.current` at the
  // moment workspace-loss fires, which is what we want.
  const hasOnboarded = useHasOnboarded();
  const hasOnboardedRef = useRef(hasOnboarded);
  hasOnboardedRef.current = hasOnboarded;

  // Main sync: onAny -> refreshMap with debounce
  useEffect(() => {
    if (!ws) return;

    const refreshMap: Record<string, () => void> = {
      inbox: () => {
        const wsId = getCurrentWsId();
        if (wsId) onInboxInvalidate(qc, wsId);
      },
      agent: () => {
        const wsId = getCurrentWsId();
        if (wsId) qc.invalidateQueries({ queryKey: workspaceKeys.agents(wsId) });
      },
      member: () => {
        const wsId = getCurrentWsId();
        if (wsId) qc.invalidateQueries({ queryKey: workspaceKeys.members(wsId) });
      },
      workspace: () => {
        qc.invalidateQueries({ queryKey: workspaceKeys.list() });
      },
      skill: () => {
        const wsId = getCurrentWsId();
        if (wsId) qc.invalidateQueries({ queryKey: workspaceKeys.skills(wsId) });
      },
      project: () => {
        const wsId = getCurrentWsId();
        if (wsId) qc.invalidateQueries({ queryKey: projectKeys.all(wsId) });
      },
      label: () => {
        const wsId = getCurrentWsId();
        if (wsId) {
          qc.invalidateQueries({ queryKey: ["labels", wsId] });
          qc.invalidateQueries({ queryKey: issueKeys.all(wsId) });
        }
      },
      pin: () => {
        const wsId = getCurrentWsId();
        const userId = authStore.getState().user?.id;
        if (wsId && userId) qc.invalidateQueries({ queryKey: pinKeys.all(wsId, userId) });
      },
      daemon: () => {
        const wsId = getCurrentWsId();
        if (wsId) qc.invalidateQueries({ queryKey: runtimeKeys.all(wsId) });
      },
      autopilot: () => {
        const wsId = getCurrentWsId();
        if (wsId) qc.invalidateQueries({ queryKey: autopilotKeys.all(wsId) });
      },
      task: () => {
        const wsId = getCurrentWsId();
        if (!wsId) return;
        qc.invalidateQueries({ queryKey: agentTaskSnapshotKeys.list(wsId) });
        qc.invalidateQueries({ queryKey: agentActivityKeys.last30d(wsId) });
        qc.invalidateQueries({ queryKey: agentRunCountsKeys.last30d(wsId) });
        qc.invalidateQueries({ queryKey: agentTasksKeys.all(wsId) });
        qc.invalidateQueries({ queryKey: ["issues", "tasks"] });
      },
    };

    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const debouncedRefresh = (prefix: string, fn: () => void) => {
      const existing = timers.get(prefix);
      if (existing) clearTimeout(existing);
      timers.set(
        prefix,
        setTimeout(() => {
          timers.delete(prefix);
          fn();
        }, 100),
      );
    };

    const specificEvents = new Set([
      "issue:updated", "issue:created", "issue:deleted", "issue_labels:changed", "inbox:new",
      "comment:created", "comment:updated", "comment:deleted",
      "activity:created",
      "reaction:added", "reaction:removed",
      "issue_reaction:added", "issue_reaction:removed",
      "subscriber:added", "subscriber:removed",
      "daemon:heartbeat",
      "chat:message", "chat:done", "chat:session_read",
      "task:message",
    ]);

    const unsubAny = ws.onAny((msg) => {
      if (specificEvents.has(msg.type)) return;
      const prefix = msg.type.split(":")[0] ?? "";
      const refresh = refreshMap[prefix];
      if (refresh) debouncedRefresh(prefix, refresh);
    });

    const unsubIssueUpdated = ws.on("issue:updated", (p) => {
      const { issue } = p as IssueUpdatedPayload;
      if (!issue?.id) return;
      const wsId = getCurrentWsId();
      if (wsId) {
        onIssueUpdated(qc, wsId, issue);
        if (issue.status) {
          onInboxIssueStatusChanged(qc, wsId, issue.id, issue.status);
        }
      }
    });

    const unsubIssueCreated = ws.on("issue:created", (p) => {
      const { issue } = p as IssueCreatedPayload;
      if (!issue) return;
      const wsId = getCurrentWsId();
      if (wsId) onIssueCreated(qc, wsId, issue);
    });

    const unsubIssueDeleted = ws.on("issue:deleted", (p) => {
      const { issue_id } = p as IssueDeletedPayload;
      if (!issue_id) return;
      const wsId = getCurrentWsId();
      if (wsId) {
        onIssueDeleted(qc, wsId, issue_id);
        onInboxIssueDeleted(qc, wsId, issue_id);
      }
    });

    const unsubIssueLabelsChanged = ws.on("issue_labels:changed", (p) => {
      const { issue_id, labels } = p as IssueLabelsChangedPayload;
      if (!issue_id) return;
      const wsId = getCurrentWsId();
      if (wsId) onIssueLabelsChanged(qc, wsId, issue_id, labels ?? []);
    });

    const unsubInboxNew = ws.on("inbox:new", (p) => {
      const { item } = p as InboxNewPayload;
      if (!item) return;
      const wsId = getCurrentWsId();
      if (wsId) onInboxNew(qc, wsId, item);
      if (typeof document !== "undefined" && document.hasFocus()) return;
      const slug = getCurrentSlug();
      if (!slug) return;
      const desktopAPI = (
        window as unknown as {
          desktopAPI?: {
            showNotification?: (payload: {
              slug: string;
              itemId: string;
              issueKey: string;
              title: string;
              body: string;
            }) => void;
          };
        }
      ).desktopAPI;
      desktopAPI?.showNotification?.({
        slug,
        itemId: item.id,
        issueKey: item.issue_id ?? item.id,
        title: item.title,
        body: item.body ?? "",
      });
    });

    const invalidateTimeline = (issueId: string) => {
      qc.invalidateQueries({ queryKey: issueKeys.timeline(issueId) });
    };

    const unsubCommentCreated = ws.on("comment:created", (p) => {
      const { comment } = p as CommentCreatedPayload;
      if (comment?.issue_id) invalidateTimeline(comment.issue_id);
    });

    const unsubCommentUpdated = ws.on("comment:updated", (p) => {
      const { comment } = p as CommentUpdatedPayload;
      if (comment?.issue_id) invalidateTimeline(comment.issue_id);
    });

    const unsubCommentDeleted = ws.on("comment:deleted", (p) => {
      const { issue_id } = p as CommentDeletedPayload;
      if (issue_id) invalidateTimeline(issue_id);
    });

    const unsubActivityCreated = ws.on("activity:created", (p) => {
      const { issue_id } = p as ActivityCreatedPayload;
      if (issue_id) invalidateTimeline(issue_id);
    });

    const unsubReactionAdded = ws.on("reaction:added", (p) => {
      const { issue_id } = p as ReactionAddedPayload;
      if (issue_id) invalidateTimeline(issue_id);
    });

    const unsubReactionRemoved = ws.on("reaction:removed", (p) => {
      const { issue_id } = p as ReactionRemovedPayload;
      if (issue_id) invalidateTimeline(issue_id);
    });

    const unsubIssueReactionAdded = ws.on("issue_reaction:added", (p) => {
      const { issue_id } = p as IssueReactionAddedPayload;
      if (issue_id) qc.invalidateQueries({ queryKey: issueKeys.reactions(issue_id) });
    });

    const unsubIssueReactionRemoved = ws.on("issue_reaction:removed", (p) => {
      const { issue_id } = p as IssueReactionRemovedPayload;
      if (issue_id) qc.invalidateQueries({ queryKey: issueKeys.reactions(issue_id) });
    });

    const unsubSubscriberAdded = ws.on("subscriber:added", (p) => {
      const { issue_id } = p as SubscriberAddedPayload;
      if (issue_id) qc.invalidateQueries({ queryKey: issueKeys.subscribers(issue_id) });
    });

    const unsubSubscriberRemoved = ws.on("subscriber:removed", (p) => {
      const { issue_id } = p as SubscriberRemovedPayload;
      if (issue_id) qc.invalidateQueries({ queryKey: issueKeys.subscribers(issue_id) });
    });

    const relocateAfterWorkspaceLoss = async (lostWsId: string) => {
      const wsList = await qc.fetchQuery({
        ...workspaceListOptions(),
        staleTime: 0,
      });
      const remaining = wsList.filter((w) => w.id !== lostWsId);
      const target = resolvePostAuthDestination(
        remaining,
        hasOnboardedRef.current,
      );
      if (typeof window !== "undefined") {
        window.location.assign(target);
      }
    };

    const unsubWsDeleted = ws.on("workspace:deleted", (p) => {
      const { workspace_id } = p as WorkspaceDeletedPayload;
      const wsList = qc.getQueryData<{ id: string; slug: string }[]>(workspaceKeys.list()) ?? [];
      const deletedSlug = wsList.find((w) => w.id === workspace_id)?.slug;
      if (deletedSlug) clearWorkspaceStorage(defaultStorage, deletedSlug);
      if (getCurrentWsId() === workspace_id) {
        logger.warn("current workspace deleted, switching");
        onToast?.("This workspace was deleted", "info");
        relocateAfterWorkspaceLoss(workspace_id);
      }
    });

    const unsubMemberRemoved = ws.on("member:removed", (p) => {
      const { user_id } = p as MemberRemovedPayload;
      const myUserId = authStore.getState().user?.id;
      if (user_id === myUserId) {
        const slug = getCurrentSlug();
        const wsId = getCurrentWsId();
        if (slug && wsId) {
          clearWorkspaceStorage(defaultStorage, slug);
          logger.warn("removed from workspace, switching");
          onToast?.("You were removed from this workspace", "info");
          relocateAfterWorkspaceLoss(wsId);
        }
      }
    });

    const unsubMemberAdded = ws.on("member:added", (p) => {
      const { member, workspace_name } = p as MemberAddedPayload;
      const myUserId = authStore.getState().user?.id;
      if (member.user_id === myUserId) {
        qc.invalidateQueries({ queryKey: workspaceKeys.list() });
        onToast?.(
          `You joined ${workspace_name ?? "a workspace"}`,
          "info",
        );
      }
    });

    const unsubTaskMessage = ws.on("task:message", (p) => {
      const payload = p as TaskMessagePayload;
      qc.setQueryData<TaskMessagePayload[]>(
        ["task-messages", payload.task_id],
        (old = []) => {
          if (old.some((m) => m.seq === payload.seq)) return old;
          return [...old, payload].sort((a, b) => a.seq - b.seq);
        },
      );
      chatWsLogger.debug("task:message (global)", {
        task_id: payload.task_id,
        seq: payload.seq,
        type: payload.type,
      });
    });

    const invalidatePendingAggregate = () => {
      const id = getCurrentWsId();
      if (id) qc.invalidateQueries({ queryKey: chatKeys.pendingTasks(id) });
    };
    const invalidateSessionLists = () => {
      const id = getCurrentWsId();
      if (id) {
        qc.invalidateQueries({ queryKey: chatKeys.sessions(id) });
        qc.invalidateQueries({ queryKey: chatKeys.allSessions(id) });
      }
    };

    const unsubChatMessage = ws.on("chat:message", (p) => {
      const payload = p as { chat_session_id: string };
      chatWsLogger.info("chat:message (global)", { chat_session_id: payload.chat_session_id });
      qc.invalidateQueries({ queryKey: chatKeys.messages(payload.chat_session_id) });
      qc.invalidateQueries({ queryKey: chatKeys.pendingTask(payload.chat_session_id) });
      invalidatePendingAggregate();
    });

    const unsubChatDone = ws.on("chat:done", (p) => {
      const payload = p as ChatDonePayload;
      chatWsLogger.info("chat:done (global)", {
        task_id: payload.task_id,
        chat_session_id: payload.chat_session_id,
      });
      qc.setQueryData(chatKeys.pendingTask(payload.chat_session_id), {});
      qc.invalidateQueries({ queryKey: chatKeys.messages(payload.chat_session_id) });
      qc.invalidateQueries({ queryKey: chatKeys.pendingTask(payload.chat_session_id) });
      invalidatePendingAggregate();
      invalidateSessionLists();
    });

    const unsubTaskQueued = ws.on("task:queued", (p) => {
      const payload = p as TaskQueuedPayload;
      if (!payload.chat_session_id) return;
      qc.setQueryData<ChatPendingTask>(
        chatKeys.pendingTask(payload.chat_session_id),
        (old) => ({
          ...(old ?? {}),
          task_id: payload.task_id,
          status: "queued",
        }),
      );
      invalidatePendingAggregate();
    });

    const unsubTaskDispatch = ws.on("task:dispatch", (p) => {
      const payload = p as TaskDispatchPayload;
      if (!payload.chat_session_id) return;
      qc.setQueryData<ChatPendingTask>(
        chatKeys.pendingTask(payload.chat_session_id),
        (old) => {
          if (!old || old.task_id !== payload.task_id) return old;
          return { ...old, status: "running" };
        },
      );
    });

    const unsubTaskCancelled = ws.on("task:cancelled", (p) => {
      const payload = p as TaskCancelledPayload;
      if (!payload.chat_session_id) return;
      chatWsLogger.info("task:cancelled (global, chat)", {
        task_id: payload.task_id,
        chat_session_id: payload.chat_session_id,
      });
      qc.setQueryData(chatKeys.pendingTask(payload.chat_session_id), {});
      invalidatePendingAggregate();
    });

    const unsubTaskCompleted = ws.on("task:completed", (p) => {
      const payload = p as TaskCompletedPayload;
      if (!payload.chat_session_id) return;
      chatWsLogger.info("task:completed (global, chat)", {
        task_id: payload.task_id,
        chat_session_id: payload.chat_session_id,
      });
      qc.setQueryData(chatKeys.pendingTask(payload.chat_session_id), {});
      qc.invalidateQueries({ queryKey: chatKeys.messages(payload.chat_session_id) });
      qc.invalidateQueries({ queryKey: chatKeys.pendingTask(payload.chat_session_id) });
      invalidatePendingAggregate();
    });

    const unsubTaskFailed = ws.on("task:failed", (p) => {
      const payload = p as TaskFailedPayload;
      if (!payload.chat_session_id) return;
      chatWsLogger.warn("task:failed (global, chat)", {
        task_id: payload.task_id,
        chat_session_id: payload.chat_session_id,
      });
      qc.setQueryData(chatKeys.pendingTask(payload.chat_session_id), {});
      qc.invalidateQueries({ queryKey: chatKeys.messages(payload.chat_session_id) });
      qc.invalidateQueries({ queryKey: chatKeys.pendingTask(payload.chat_session_id) });
      invalidatePendingAggregate();
    });

    const unsubChatSessionRead = ws.on("chat:session_read", (p) => {
      const payload = p as { chat_session_id: string };
      chatWsLogger.info("chat:session_read (global)", payload);
      invalidateSessionLists();
    });

    return () => {
      unsubAny();
      unsubIssueUpdated();
      unsubIssueCreated();
      unsubIssueDeleted();
      unsubIssueLabelsChanged();
      unsubInboxNew();
      unsubCommentCreated();
      unsubCommentUpdated();
      unsubCommentDeleted();
      unsubActivityCreated();
      unsubReactionAdded();
      unsubReactionRemoved();
      unsubIssueReactionAdded();
      unsubIssueReactionRemoved();
      unsubSubscriberAdded();
      unsubSubscriberRemoved();
      unsubWsDeleted();
      unsubMemberRemoved();
      unsubMemberAdded();
      unsubTaskMessage();
      unsubChatMessage();
      unsubChatDone();
      unsubTaskQueued();
      unsubTaskDispatch();
      unsubTaskCancelled();
      unsubTaskCompleted();
      unsubTaskFailed();
      unsubChatSessionRead();
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, [ws, qc, authStore, onToast]);

  // Reconnect -> refetch all data to recover missed events
  useEffect(() => {
    if (!ws) return;

    const unsub = ws.onReconnect(async () => {
      logger.info("reconnected, refetching all data");
      try {
        const wsId = getCurrentWsId();
        if (wsId) {
          qc.invalidateQueries({ queryKey: issueKeys.all(wsId) });
          qc.invalidateQueries({ queryKey: inboxKeys.all(wsId) });
          qc.invalidateQueries({ queryKey: workspaceKeys.agents(wsId) });
          qc.invalidateQueries({ queryKey: workspaceKeys.members(wsId) });
          qc.invalidateQueries({ queryKey: workspaceKeys.skills(wsId) });
          qc.invalidateQueries({ queryKey: projectKeys.all(wsId) });
          qc.invalidateQueries({ queryKey: runtimeKeys.all(wsId) });
          qc.invalidateQueries({ queryKey: autopilotKeys.all(wsId) });
          qc.invalidateQueries({ queryKey: agentTaskSnapshotKeys.all(wsId) });
          qc.invalidateQueries({ queryKey: agentActivityKeys.all(wsId) });
          qc.invalidateQueries({ queryKey: agentRunCountsKeys.all(wsId) });
        }
        qc.invalidateQueries({ queryKey: workspaceKeys.list() });
      } catch (e) {
        logger.error("reconnect refetch failed", e);
      }
    });

    return unsub;
  }, [ws, qc]);
}
