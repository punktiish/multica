import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock DropdownMenu primitives so we don't fight Base UI portals
vi.mock("@multica/ui/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children, render }: { children: ReactNode; render?: ReactNode }) => (
    <button type="button" data-testid="repo-picker-trigger">{render ?? children}</button>
  ),
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div data-testid="menu-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

import { RepoPicker } from "./repo-picker";

describe("RepoPicker", () => {
  const repos = [
    { path: "https://github.com/org/repo-a", description: "Repo A" },
    { path: "https://github.com/org/repo-b", description: "Repo B" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows 'All workspace repos' in trigger when no repo is selected", () => {
    render(<RepoPicker repoPath={null} repos={repos} onUpdate={vi.fn()} />);
    const trigger = screen.getByTestId("repo-picker-trigger");
    expect(within(trigger).getByText("All workspace repos")).toBeInTheDocument();
  });

  it("shows the selected repo description in trigger when repoPath matches", () => {
    render(<RepoPicker repoPath="https://github.com/org/repo-a" repos={repos} onUpdate={vi.fn()} />);
    const trigger = screen.getByTestId("repo-picker-trigger");
    expect(within(trigger).getByText("Repo A")).toBeInTheDocument();
  });

  it("falls back to path in trigger when description is missing", () => {
    const noDescRepos = [{ path: "https://github.com/org/repo-c", description: "" }];
    render(<RepoPicker repoPath="https://github.com/org/repo-c" repos={noDescRepos} onUpdate={vi.fn()} />);
    const trigger = screen.getByTestId("repo-picker-trigger");
    expect(within(trigger).getByText("https://github.com/org/repo-c")).toBeInTheDocument();
  });

  it("calls onUpdate with repo_path: null when 'All workspace repos' menu item is clicked", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<RepoPicker repoPath="https://github.com/org/repo-a" repos={repos} onUpdate={onUpdate} />);

    const menu = screen.getByTestId("menu-content");
    await user.click(within(menu).getByRole("button", { name: /All workspace repos/i }));
    expect(onUpdate).toHaveBeenCalledWith({ repo_path: null });
  });

  it("calls onUpdate with the repo path when a specific menu item is clicked", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<RepoPicker repoPath={null} repos={repos} onUpdate={onUpdate} />);

    const menu = screen.getByTestId("menu-content");
    await user.click(within(menu).getByRole("button", { name: "Repo B" }));
    expect(onUpdate).toHaveBeenCalledWith({ repo_path: "https://github.com/org/repo-b" });
  });

  it("shows 'No repositories configured' in menu when repos array is empty", () => {
    render(<RepoPicker repoPath={null} repos={[]} onUpdate={vi.fn()} />);
    const menu = screen.getByTestId("menu-content");
    expect(within(menu).getByText("No repositories configured")).toBeInTheDocument();
  });
});
