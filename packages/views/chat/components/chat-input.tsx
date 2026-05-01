"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { cn } from "@multica/ui/lib/utils";
import { ContentEditor, type ContentEditorRef } from "../../editor";
import { SubmitButton } from "@multica/ui/components/common/submit-button";
import { useChatStore, DRAFT_NEW_SESSION } from "@multica/core/chat";
import { createLogger } from "@multica/core/logger";

const logger = createLogger("chat.ui");

interface ChatInputProps {
  onSend: (content: string) => void;
  onStop?: () => void;
  isRunning?: boolean;
  disabled?: boolean;
  noAgent?: boolean;
  agentName?: string;
  leftAdornment?: ReactNode;
  rightAdornment?: ReactNode;
  topSlot?: ReactNode;
}

export function ChatInput({
  onSend,
  onStop,
  isRunning,
  disabled,
  noAgent,
  agentName,
  leftAdornment,
  rightAdornment,
  topSlot,
}: ChatInputProps) {
  const editorRef = useRef<ContentEditorRef>(null);
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const selectedAgentId = useChatStore((s) => s.selectedAgentId);
  const draftKey =
    activeSessionId ?? `${DRAFT_NEW_SESSION}:${selectedAgentId ?? ""}`;
  const inputDraft = useChatStore((s) => s.inputDrafts[draftKey] ?? "");
  const setInputDraft = useChatStore((s) => s.setInputDraft);
  const clearInputDraft = useChatStore((s) => s.clearInputDraft);
  const [isEmpty, setIsEmpty] = useState(!inputDraft.trim());

  const handleSend = () => {
    const content = editorRef.current?.getMarkdown()?.replace(/(\n\s*)+$/, "").trim();
    if (!content || isRunning || disabled || noAgent) {
      logger.debug("input.send skipped", {
        emptyContent: !content,
        isRunning,
        disabled,
        noAgent,
      });
      return;
    }
    const keyAtSend = draftKey;
    logger.info("input.send", { contentLength: content.length, draftKey: keyAtSend });
    onSend(content);
    editorRef.current?.clearContent();
    editorRef.current?.blur();
    clearInputDraft(keyAtSend);
    setIsEmpty(true);
  };

  const placeholder = noAgent
    ? "Create an agent to start chatting"
    : disabled
      ? "This session is archived"
      : agentName
        ? `Tell ${agentName} what to do…`
        : "Tell me what to do…";

  return (
    <div
      className={cn(
        "px-5 pb-3 pt-0",
        noAgent && "cursor-not-allowed",
      )}
    >
      <div
        className={cn(
          "relative mx-auto flex min-h-16 max-h-40 w-full max-w-4xl flex-col rounded-lg bg-card pb-9 border-1 border-border transition-colors focus-within:border-brand",
          noAgent && "pointer-events-none opacity-60",
        )}
        aria-disabled={noAgent || undefined}
      >
        {topSlot}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
          <ContentEditor
            key={draftKey}
            ref={editorRef}
            defaultValue={inputDraft}
            placeholder={placeholder}
            onUpdate={(md) => {
              setIsEmpty(!md.trim());
              setInputDraft(draftKey, md);
            }}
            onSubmit={handleSend}
            debounceMs={100}
            showBubbleMenu={false}
            submitOnEnter
          />
        </div>
        {leftAdornment && (
          <div className="absolute bottom-1.5 left-2 flex items-center">
            {leftAdornment}
          </div>
        )}
        <div className="absolute bottom-1 right-1.5 flex items-center gap-2">
          {rightAdornment}
          <SubmitButton
            onClick={handleSend}
            disabled={isEmpty || !!disabled || !!noAgent}
            running={isRunning}
            onStop={onStop}
          />
        </div>
      </div>
    </div>
  );
}
