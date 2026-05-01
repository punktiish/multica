"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "../navigation";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Check,
  ChevronRight,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  X as XIcon,
} from "lucide-react";
import { cn } from "@multica/ui/lib/utils";
import { toast } from "sonner";
import type { Issue, IssueStatus, IssuePriority, IssueAssigneeType } from "@multica/core/types";
import {
  DialogContent,
  DialogTitle,
} from "@multica/ui/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@multica/ui/components/ui/dropdown-menu";
import { Tooltip, TooltipTrigger, TooltipContent } from "@multica/ui/components/ui/tooltip";
import { Button } from "@multica/ui/components/ui/button";
import { Switch } from "@multica/ui/components/ui/switch";
import { ContentEditor, type ContentEditorRef, TitleEditor, useFileDropZone, FileDropOverlay } from "../editor";
import { StatusIcon, StatusPicker, PriorityPicker, AssigneePicker, DueDatePicker } from "../issues/components";
import { BacklogAgentHintContent } from "../issues/components/backlog-agent-hint-dialog";
import { ProjectPicker } from "../projects/components/project-picker";
import { RepoPicker } from "../projects/components/repo-picker";
import { projectListOptions } from "@multica/core/projects/queries";
import { useCurrentWorkspace, useWorkspacePaths } from "@multica/core/paths";
import { useWorkspaceId } from "@multica/core/hooks";
import { useIssueDraftStore } from "@multica/core/issues/stores/draft-store";
import { useCreateModeStore } from "@multica/core/issues/stores/create-mode-store";
import { useQuickCreateStore } from "@multica/core/issues/stores/quick-create-store";
import { issueDetailOptions } from "@multica/core/issues/queries";
import { useCreateIssue, useUpdateIssue } from "@multica/core/issues/mutations";
import { useFileUpload } from "@multica/core/hooks/use-file-upload";
import { api } from "@multica/core/api";
import { FileUploadButton } from "@multica/ui/components/common/file-upload-button";
import { PillButton } from "../common/pill-button";
import { IssuePickerModal } from "./issue-picker-modal";

// ---------------------------------------------------------------------------
// ManualCreatePanel — manual-mode body of the create-issue dialog.
// ---------------------------------------------------------------------------

export function ManualCreatePanel({
  onClose,
  onSwitchMode,
  data,
  isExpanded,
  setIsExpanded,
  backlogHintIssueId,
  setBacklogHintIssueId,
}: {
  onClose: () => void;
  onSwitchMode?: (carry?: Record<string, unknown> | null) => void;
  data?: Record<string, unknown> | null;
  isExpanded: boolean;
  setIsExpanded: (v: boolean) => void;
  backlogHintIssueId: string | null;
  setBacklogHintIssueId: (id: string | null) => void;
}) {
  const router = useNavigation();
  const p = useWorkspacePaths();
  const workspaceName = useCurrentWorkspace()?.name;

  const draft = useIssueDraftStore((s) => s.draft);
  const setDraft = useIssueDraftStore((s) => s.setDraft);
  const clearDraft = useIssueDraftStore((s) => s.clearDraft);
  const setLastAssignee = useIssueDraftStore((s) => s.setLastAssignee);
  const setLastMode = useCreateModeStore((s) => s.setLastMode);
  const keepOpen = useQuickCreateStore((s) => s.keepOpen);
  const setKeepOpen = useQuickCreateStore((s) => s.setKeepOpen);

  const [title, setTitle] = useState(draft.title);
  const [formResetKey, setFormResetKey] = useState(0);
  const descEditorRef = useRef<ContentEditorRef>(null);
  const { isDragOver: descDragOver, dropZoneProps: descDropZoneProps } = useFileDropZone({
    onDrop: (files) => files.forEach((f) => descEditorRef.current?.uploadFile(f)),
  });
  const [status, setStatus] = useState<IssueStatus>((data?.status as IssueStatus) || draft.status);
  const [priority, setPriority] = useState<IssuePriority>(draft.priority);
  const [submitting, setSubmitting] = useState(false);
  const [assigneeType, setAssigneeType] = useState<IssueAssigneeType | undefined>(draft.assigneeType);
  const [assigneeId, setAssigneeId] = useState<string | undefined>(draft.assigneeId);
  const [dueDate, setDueDate] = useState<string | null>(draft.dueDate);
  const [projectId, setProjectId] = useState<string | undefined>(
    (data?.project_id as string) || undefined,
  );
  const [parentIssueId, setParentIssueId] = useState<string | undefined>(
    (data?.parent_issue_id as string) || undefined,
  );
  const [parentPickerOpen, setParentPickerOpen] = useState(false);
  const [childIssues, setChildIssues] = useState<Issue[]>([]);
  const [childPickerOpen, setChildPickerOpen] = useState(false);
  const wsId = useWorkspaceId();
  const { data: parentIssue } = useQuery({
    ...issueDetailOptions(wsId, parentIssueId ?? ""),
    enabled: !!parentIssueId,
  });

  // Projects — needed to default repo when project changes.
  const { data: projects = [] } = useQuery(projectListOptions(wsId));
  const workspace = useCurrentWorkspace();

  // When project changes, default repo to the project's configured repo.
  const [repoPath, setRepoPath] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (projectId) {
      const p = projects.find((proj) => proj.id === projectId);
      setRepoPath(p?.repo_path ?? undefined);
    } else {
      setRepoPath(undefined);
    }
  }, [projectId, projects]);

  // File upload
  const [attachmentIds, setAttachmentIds] = useState<string[]>([]);
  const { uploadWithToast } = useFileUpload(api);
  const handleUpload = async (file: File) => {
    const result = await uploadWithToast(file);
    if (result) {
      setAttachmentIds((prev) => [...prev, result.id]);
    }
    return result;
  };

  const updateTitle = (v: string) => { setTitle(v); setDraft({ title: v }); };
  const updateStatus = (v: IssueStatus) => { setStatus(v); setDraft({ status: v }); };
  const updatePriority = (v: IssuePriority) => { setPriority(v); setDraft({ priority: v }); };
  const updateAssignee = (type?: IssueAssigneeType, id?: string) => {
    setAssigneeType(type); setAssigneeId(id);
    setDraft({ assigneeType: type, assigneeId: id });
  };
  const updateDueDate = (v: string | null) => { setDueDate(v); setDraft({ dueDate: v }); };

  const createIssueMutation = useCreateIssue();
  const updateIssueMutation = useUpdateIssue();
  const resetForNextIssue = () => {
    setTitle("");
    setStatus("todo");
    setPriority("none");
    setDueDate(null);
    setProjectId(undefined);
    setParentIssueId(undefined);
    setChildIssues([]);
    setAttachmentIds([]);
    setDraft({
      title: "",
      description: "",
      status: "todo",
      priority: "none",
      assigneeType,
      assigneeId,
      dueDate: null,
    });
    descEditorRef.current?.clearContent();
    setFormResetKey((key) => key + 1);
  };

  const handleSubmit = async () => {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      const issue = await createIssueMutation.mutateAsync({
        title: title.trim(),
        description: descEditorRef.current?.getMarkdown()?.trim() || undefined,
        status,
        priority,
        assignee_type: assigneeType,
        assignee_id: assigneeId,
        due_date: dueDate || undefined,
        attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
        parent_issue_id: parentIssueId,
        project_id: projectId,
        repo_path: repoPath,
      });

      if (childIssues.length > 0) {
        const results = await Promise.allSettled(
          childIssues.map((child) =>
            updateIssueMutation.mutateAsync({
              id: child.id,
              parent_issue_id: issue.id,
            }),
          ),
        );
        const failed = results.filter((r) => r.status === "rejected").length;
        if (failed > 0) {
          toast.error(
            failed === childIssues.length
              ? "Failed to link sub-issues"
              : `Failed to link ${failed} of ${childIssues.length} sub-issues`,
          );
        }
      }

      setLastAssignee(assigneeType, assigneeId);
      setLastMode("manual");
      clearDraft();
      const shouldShowBacklogHint =
        status === "backlog" && assigneeType === "agent" && assigneeId &&
        localStorage.getItem("multica:backlog-agent-hint-dismissed") !== "true";

      if (shouldShowBacklogHint) {
        setBacklogHintIssueId(issue.id);
      } else if (keepOpen) {
        resetForNextIssue();
      } else {
        onClose();
      }

      if (!shouldShowBacklogHint) {
        toast.custom((t) => (
          <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-4 w-[360px]">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center size-5 rounded-full bg-emerald-500/15 text-emerald-500">
                <Check className="size-3" />
              </div>
              <span className="text-sm font-medium">Issue created</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground ml-7">
              <StatusIcon status={issue.status} className="size-3.5 shrink-0" />
              <span className="truncate">{issue.identifier} – {issue.title}</span>
            </div>
            <button
              type="button"
              className="ml-7 mt-2 text-sm text-primary hover:underline cursor-pointer"
              onClick={() => {
                router.push(p.issueDetail(issue.id));
                toast.dismiss(t);
              }}
            >
              View issue
            </button>
          </div>
        ), { duration: 5000 });
      }
    } catch {
      toast.error("Failed to create issue");
    } finally {
      setSubmitting(false);
    }
  };

  const switchToAgent = () => {
    const desc = descEditorRef.current?.getMarkdown()?.trim() ?? "";
    const prompt = [title.trim(), desc].filter(Boolean).join("\n\n");
    setLastMode("agent");
    onSwitchMode?.({
      prompt,
      ...(assigneeType === "agent" && assigneeId
        ? { agent_id: assigneeId }
        : {}),
    });
  };

  return (
    <>
        {backlogHintIssueId ? (
          <BacklogAgentHintContent
            onKeepInBacklog={() => {
              setBacklogHintIssueId(null);
              onClose();
            }}
            onDismissPermanently={() => {
              localStorage.setItem("multica:backlog-agent-hint-dismissed", "true");
            }}
            onMoveToTodo={() => {
              updateIssueMutation.mutate(
                { id: backlogHintIssueId, status: "todo" },
                { onError: () => toast.error("Failed to update status") },
              );
              setBacklogHintIssueId(null);
              onClose();
            }}
          />
        ) : (
          <>
            <DialogTitle className="sr-only">New Issue</DialogTitle>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-3 pb-2 shrink-0">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">{workspaceName}</span>
                <ChevronRight className="size-3 text-muted-foreground/50" />
                <span className="font-medium">Create manually</span>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="rounded-sm p-1.5 opacity-70 hover:opacity-100 hover:bg-accent/60 transition-all cursor-pointer"
                      >
                        {isExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                      </button>
                    }
                  />
                  <TooltipContent side="bottom">{isExpanded ? "Collapse" : "Expand"}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        onClick={onClose}
                        className="rounded-sm p-1.5 opacity-70 hover:opacity-100 hover:bg-accent/60 transition-all cursor-pointer"
                      >
                        <XIcon className="size-4" />
                      </button>
                    }
                  />
                  <TooltipContent side="bottom">Close</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Title */}
            <div className="px-5 pb-2 shrink-0">
              <TitleEditor
                key={formResetKey}
                autoFocus
                defaultValue={draft.title}
                placeholder="Issue title"
                className="text-lg font-semibold"
                onChange={(v) => updateTitle(v)}
                onSubmit={handleSubmit}
              />
            </div>

            {/* Description */}
            <div {...descDropZoneProps} className="relative flex-1 min-h-0 overflow-y-auto px-5">
              <ContentEditor
                ref={descEditorRef}
                defaultValue={draft.description}
                placeholder="Add description..."
                onUpdate={(md) => setDraft({ description: md })}
                onUploadFile={handleUpload}
                debounceMs={500}
              />
              {descDragOver && <FileDropOverlay />}
            </div>

            {/* Property toolbar */}
            <div className="flex items-center gap-1.5 px-4 py-2 shrink-0 flex-wrap">
              <StatusPicker
                status={status}
                onUpdate={(u) => { if (u.status) updateStatus(u.status); }}
                triggerRender={<PillButton />}
                align="start"
              />
              <PriorityPicker
                priority={priority}
                onUpdate={(u) => { if (u.priority) updatePriority(u.priority); }}
                triggerRender={<PillButton />}
                align="start"
              />
              <AssigneePicker
                assigneeType={assigneeType ?? null}
                assigneeId={assigneeId ?? null}
                onUpdate={(u) => updateAssignee(
                  u.assignee_type ?? undefined,
                  u.assignee_id ?? undefined,
                )}
                triggerRender={<PillButton />}
                align="start"
              />
              <DueDatePicker
                dueDate={dueDate}
                onUpdate={(u) => updateDueDate(u.due_date ?? null)}
                triggerRender={<PillButton />}
                align="start"
              />
              <ProjectPicker
                projectId={projectId ?? null}
                onUpdate={(u) => setProjectId(u.project_id ?? undefined)}
                triggerRender={<PillButton />}
                align="start"
              />

              {/* Parent chip */}
              {parentIssueId && parentIssue && (
                <div className="inline-flex items-center rounded-full border text-xs transition-colors hover:bg-accent/60">
                  <button
                    type="button"
                    onClick={() => setParentPickerOpen(true)}
                    className="flex items-center gap-1.5 py-1 pl-2.5 cursor-pointer"
                  >
                    <ArrowUp className="size-3 text-muted-foreground" />
                    <span>Sub-issue of {parentIssue.identifier}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setParentIssueId(undefined)}
                    className="p-1 pr-2 text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label="Remove parent"
                  >
                    <XIcon className="size-3" />
                  </button>
                </div>
              )}

              {/* Child chips */}
              {childIssues.map((c) => (
                <div
                  key={c.id}
                  className="inline-flex items-center rounded-full border text-xs transition-colors hover:bg-accent/60"
                >
                  <div className="flex items-center gap-1.5 py-1 pl-2.5">
                    <ArrowDown className="size-3 text-muted-foreground" />
                    <span>Sub-issue: {c.identifier}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setChildIssues((prev) => prev.filter((x) => x.id !== c.id))
                    }
                    className="p-1 pr-2 text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label={`Remove sub-issue ${c.identifier}`}
                  >
                    <XIcon className="size-3" />
                  </button>
                </div>
              ))}

              {/* Overflow menu */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <PillButton aria-label="More options">
                      <MoreHorizontal className="size-3.5" />
                    </PillButton>
                  }
                />
                <DropdownMenuContent align="start" className="w-auto">
                  {parentIssueId && parentIssue ? (
                    <DropdownMenuItem onClick={() => setParentPickerOpen(true)}>
                      <ArrowUp className="h-3.5 w-3.5" />
                      Parent: {parentIssue.identifier}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => setParentPickerOpen(true)}>
                      <ArrowUp className="h-3.5 w-3.5" />
                      Set parent issue...
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setChildPickerOpen(true)}>
                    <ArrowDown className="h-3.5 w-3.5" />
                    Add sub-issue...
                  </DropdownMenuItem>
                  {parentIssueId && parentIssue && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setParentIssueId(undefined)}
                      >
                        <XIcon className="h-3.5 w-3.5" />
                        Remove parent
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Parent / child pickers */}
            <IssuePickerModal
              open={parentPickerOpen}
              onOpenChange={setParentPickerOpen}
              title="Set parent issue"
              description="Search for an issue to set as the parent of the new issue"
              excludeIds={[
                ...childIssues.map((c) => c.id),
                ...(parentIssueId ? [parentIssueId] : []),
              ]}
              onSelect={(selected) => {
                setParentIssueId(selected.id);
              }}
            />
            <IssuePickerModal
              open={childPickerOpen}
              onOpenChange={setChildPickerOpen}
              title="Add sub-issue"
              description="Search for an issue to add as a sub-issue of the new issue"
              excludeIds={[
                ...childIssues.map((c) => c.id),
                ...(parentIssueId ? [parentIssueId] : []),
              ]}
              onSelect={(selected) => {
                setChildIssues((prev) =>
                  prev.some((x) => x.id === selected.id) ? prev : [...prev, selected],
                );
              }}
            />

            {/* Footer */}
            <div className="flex flex-col gap-2 border-t px-4 py-3 shrink-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-h-7 items-center gap-2">
                <FileUploadButton
                  onSelect={(file) => descEditorRef.current?.uploadFile(file)}
                />
                <RepoPicker
                  repoPath={repoPath ?? null}
                  repos={workspace?.repos ?? []}
                  onUpdate={(u) => setRepoPath(u.repo_path ?? undefined)}
                />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={switchToAgent}
                  title="Switch to create with agent — describe in one line and let the agent file it"
                  className="flex shrink-0 items-center gap-1.5 text-xs px-2 py-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors cursor-pointer"
                >
                  <ArrowLeftRight className="size-3.5" />
                  Switch to Agent
                </button>
                <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                  <Switch
                    size="sm"
                    checked={keepOpen}
                    onCheckedChange={setKeepOpen}
                  />
                  Create another
                </label>
                <Button size="sm" onClick={handleSubmit} disabled={!title.trim() || submitting}>
                  {submitting ? "Creating..." : "Create Issue"}
                </Button>
              </div>
            </div>
          </>
        )}
    </>
  );
}

/** className for DialogContent in manual mode */
export function manualDialogContentClass(
  isExpanded: boolean,
  backlogHintIssueId: string | null,
) {
  return cn(
    "p-0 gap-0 flex flex-col overflow-hidden",
    "!top-1/2 !left-1/2 !-translate-x-1/2",
    backlogHintIssueId
      ? "!max-w-[480px] !w-[calc(100vw-2rem)] !h-auto !-translate-y-1/2 !transition-none !duration-0"
      : "!transition-all !duration-300 !ease-out",
    !backlogHintIssueId && isExpanded
      ? "!max-w-4xl !w-full !h-5/6 !-translate-y-1/2"
      : !backlogHintIssueId
        ? "!max-w-2xl !w-full !h-96 !-translate-y-1/2"
        : "",
  );
}

import { Dialog as DialogRoot } from "@multica/ui/components/ui/dialog";
export function CreateIssueModal(props: {
  onClose: () => void;
  data?: Record<string, unknown> | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [backlogHintIssueId, setBacklogHintIssueId] = useState<string | null>(null);
  return (
    <DialogRoot open onOpenChange={(v) => { if (!v) props.onClose(); }}>
      <DialogContent
        finalFocus={false}
        showCloseButton={false}
        className={manualDialogContentClass(isExpanded, backlogHintIssueId)}
      >
        <ManualCreatePanel
          {...props}
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
          backlogHintIssueId={backlogHintIssueId}
          setBacklogHintIssueId={setBacklogHintIssueId}
        />
      </DialogContent>
    </DialogRoot>
  );
}
