"use client";

import { useEffect, useState } from "react";
import { Save, Plus, Trash2 } from "lucide-react";
import { Input } from "@multica/ui/components/ui/input";
import { Button } from "@multica/ui/components/ui/button";
import { Card, CardContent } from "@multica/ui/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@multica/ui/components/ui/native-select";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentWorkspace } from "@multica/core/paths";
import { workspaceKeys } from "@multica/core/workspace/queries";
import { api } from "@multica/core/api";
import type { Workspace, WorkspaceRepo, RepoType } from "@multica/core/types";

export function RepositoriesTab() {
  const workspace = useCurrentWorkspace();
  const qc = useQueryClient();

  const [repos, setRepos] = useState<WorkspaceRepo[]>(workspace?.repos ?? []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRepos(workspace?.repos ?? []);
  }, [workspace]);

  const handleSave = async () => {
    if (!workspace) return;
    setSaving(true);
    try {
      const updated = await api.updateWorkspace(workspace.id, { repos });
      qc.setQueryData(workspaceKeys.list(), (old: Workspace[] | undefined) =>
        old?.map((ws) => (ws.id === updated.id ? updated : ws)),
      );
      toast.success("Repositories saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save repositories");
    } finally {
      setSaving(false);
    }
  };

  const handleAddRepo = () => {
    setRepos([...repos, { type: "local", path: "", description: "" }]);
  };

  const handleRemoveRepo = (index: number) => {
    setRepos(repos.filter((_, i) => i !== index));
  };

  const handleRepoChange = (index: number, field: string, value: string) => {
    setRepos(repos.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  if (!workspace) return null;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Repositories</h2>

        <Card>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Code repositories associated with this workspace. Agents use these to work on code. Supports local filesystem paths and remote URLs.
            </p>

            {repos.map((repo, index) => (
              <div key={index} className="flex gap-2">
                <div className="flex-1 space-y-1.5">
                  <div className="flex gap-2">
                    <NativeSelect
                      size="sm"
                      value={repo.type || "local"}
                      onChange={(e) => handleRepoChange(index, "type", e.target.value as RepoType)}
                    >
                      <NativeSelectOption value="local">Local Path</NativeSelectOption>
                      <NativeSelectOption value="remote">Remote URL</NativeSelectOption>
                    </NativeSelect>
                    <Input
                      type={repo.type === "local" ? "text" : "url"}
                      value={repo.path}
                      onChange={(e) => handleRepoChange(index, "path", e.target.value)}
                      placeholder={repo.type === "local" ? "/home/user/my-repo" : "https://github.com/org/repo"}
                      className="flex-1 text-sm"
                    />
                  </div>
                  <Input
                    type="text"
                    value={repo.description}
                    onChange={(e) => handleRepoChange(index, "description", e.target.value)}
                    placeholder="Description (e.g. Go backend + Next.js frontend)"
                    className="text-sm"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-0.5 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemoveRepo(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}

            <div className="flex items-center justify-between pt-1">
              <Button variant="outline" size="sm" onClick={handleAddRepo}>
                <Plus className="h-3 w-3" />
                Add repository
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="h-3 w-3" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
