"use client";

import { Check, GitBranch } from "lucide-react";
import type { WorkspaceRepo } from "@multica/core/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@multica/ui/components/ui/dropdown-menu";

export function RepoPicker({
  repoPath,
  repos,
  onUpdate,
  triggerRender,
  align = "start",
}: {
  repoPath: string | null;
  repos: WorkspaceRepo[];
  onUpdate: (updates: { repo_path?: string | null }) => void;
  triggerRender?: React.ReactElement;
  align?: "start" | "center" | "end";
}) {
  const current = repos.find((r) => r.path === repoPath);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={triggerRender ? undefined : "flex items-center gap-1.5 cursor-pointer rounded px-1 -mx-1 hover:bg-accent/30 transition-colors overflow-hidden"}
        render={triggerRender}
      >
        <GitBranch className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{current ? current.description || current.path : "All workspace repos"}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-64">
        <DropdownMenuItem onClick={() => onUpdate({ repo_path: null })}>
          <span className="truncate">All workspace repos</span>
          {!repoPath && <Check className="ml-auto h-3.5 w-3.5 shrink-0" />}
        </DropdownMenuItem>
        {repos.length > 0 && <DropdownMenuSeparator />}
        {repos.map((r) => (
          <DropdownMenuItem key={r.path} onClick={() => onUpdate({ repo_path: r.path })}>
            <span className="truncate">{r.description || r.path}</span>
            {r.path === repoPath && <Check className="ml-auto h-3.5 w-3.5 shrink-0" />}
          </DropdownMenuItem>
        ))}
        {repos.length === 0 && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">No repositories configured</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
