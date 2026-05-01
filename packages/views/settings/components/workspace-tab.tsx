"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Input } from "@multica/ui/components/ui/input";
import { Textarea } from "@multica/ui/components/ui/textarea";
import { Label } from "@multica/ui/components/ui/label";
import { Button } from "@multica/ui/components/ui/button";
import { Card, CardContent } from "@multica/ui/components/ui/card";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentWorkspace } from "@multica/core/paths";
import { workspaceKeys } from "@multica/core/workspace/queries";
import { api } from "@multica/core/api";
import type { Workspace } from "@multica/core/types";

export function WorkspaceTab() {
  const workspace = useCurrentWorkspace();
  const qc = useQueryClient();

  const [name, setName] = useState(workspace?.name ?? "");
  const [description, setDescription] = useState(workspace?.description ?? "");
  const [context, setContext] = useState(workspace?.context ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(workspace?.name ?? "");
    setDescription(workspace?.description ?? "");
    setContext(workspace?.context ?? "");
  }, [workspace]);

  const handleSave = async () => {
    if (!workspace) return;
    setSaving(true);
    try {
      const updated = await api.updateWorkspace(workspace.id, {
        name,
        description,
        context,
      });
      qc.setQueryData(workspaceKeys.list(), (old: Workspace[] | undefined) =>
        old?.map((ws) => (ws.id === updated.id ? updated : ws)),
      );
      toast.success("Workspace settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save workspace settings");
    } finally {
      setSaving(false);
    }
  };

  if (!workspace) return null;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold">General</h2>

        <Card>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 resize-none"
                placeholder="What does this workspace focus on?"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Context</Label>
              <Textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={4}
                className="mt-1 resize-none"
                placeholder="Background information and context for AI agents working in this workspace"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Slug</Label>
              <div className="mt-1 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                {workspace.slug}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !name.trim()}
              >
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
