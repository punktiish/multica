# CLAUDE.md

This file is the authoritative guide for AI agents working in this repository. `AGENTS.md` is only a compact pointer to this file.

## Project Context

Multica is a solo, local-first task management tool for coding agents.

- The app bootstraps one local user and does not require login.
- Workspaces organize local repositories, issues, projects, agents, runtimes, inbox, and settings.
- Repositories are local filesystem paths. Remote repository URLs are rejected by the server.
- Agent execution happens through the local daemon on the user's machine.
- Cloud runtimes, team invitations, email verification, OAuth, JWT auth, personal access tokens, and telemetry are intentionally out of scope.

## Architecture

Go backend + monorepo frontend using pnpm workspaces and Turborepo.

- `server/` - Go backend, CLI, daemon, migrations, sqlc queries.
- `apps/web/` - Next.js frontend with App Router.
- `apps/desktop/` - Electron desktop app.
- `apps/docs/` - Fumadocs documentation site.
- `packages/core/` - headless business logic, API clients, stores, query options.
- `packages/ui/` - atomic UI components.
- `packages/views/` - shared pages/components with business UI.
- `packages/tsconfig/` - shared TypeScript config.

### Package Boundaries

- `packages/core/` - zero `react-dom`, zero direct `localStorage`, zero `process.env`, zero UI libraries. Shared Zustand stores live here.
- `packages/ui/` - zero `@multica/core` imports.
- `packages/views/` - zero `next/*`, zero `react-router-dom`, zero stores. Use `NavigationAdapter` for routing.
- `apps/web/platform/` - the only place for Next.js APIs.
- `apps/desktop/src/renderer/src/platform/` - the only place for React Router navigation wiring.

### State Management

- TanStack Query owns server state: workspaces, issues, members, agents, inbox, runtimes, projects.
- Zustand owns client state: current workspace selection, filters, drafts, modals, tab layout.
- WebSocket events invalidate TanStack Query caches. They do not write server data into Zustand.
- Workspace-scoped queries must key on `wsId`.
- Do not duplicate API data into stores.

### Local Identity

The server injects the solo local user for app and daemon routes. Do not add bearer-token auth, cookie auth, OAuth redirects, login pages, or token storage.

`packages/core/auth` remains as a local user bootstrap store. Treat its name as historical unless doing a larger rename.

### Workspace Identity

`setCurrentWorkspace(slug, uuid)` in `@multica/core/platform` is the singleton for active workspace identity.

Consumers:

- API client's `X-Workspace-Slug` header.
- Per-workspace storage namespace.
- Chrome/sidebar gating.

Unmount does not clear it. Code that leaves workspace context must call `setCurrentWorkspace(null, null)`.

## Commands

```bash
make dev              # setup + start backend/frontend/database
make setup            # create env, install deps, migrate
make start            # start backend + frontend
make stop             # stop app processes
make db-up            # start shared PostgreSQL
make db-down          # stop shared PostgreSQL

pnpm install
pnpm dev:web
pnpm dev:desktop
pnpm typecheck
pnpm test
pnpm build

make server
make daemon
make build
make cli ARGS="workspace list"
make test
make check
make sqlc
make migrate-up
make migrate-down

make selfhost
make selfhost-stop
```

The default compose command is `podman compose`. Override with `COMPOSE="docker compose"` when needed.

### Single Test Examples

```bash
pnpm --filter @multica/views exec vitest run workspace/create-workspace-form.test.tsx
pnpm --filter @multica/core exec vitest run paths/paths.test.ts
cd server && GOCACHE=/tmp/go-build-cache go test ./internal/handler -run TestName
```

## Coding Rules

- TypeScript strict mode is enabled.
- Go code must be gofmt-formatted.
- Comments in code are English only.
- Prefer existing patterns/components over introducing parallel abstractions.
- Unless explicitly requested, do not add compatibility layers, fallback paths, dual-write logic, legacy adapters, or temporary shims.
- If an obsolete flow is replaced and the product is not live, remove the old path instead of preserving it.
- Avoid broad refactors unless required.
- New global routes must use one word (`/inbox`) or a noun/action pair (`/workspaces/new`). Do not add hyphenated root routes such as `/new-workspace`.

## Frontend Rules

- New shared page components go in `packages/views/<domain>/`.
- Wire shared pages into both web and desktop when the feature is cross-platform.
- Use `useNavigation().push()` or `<AppLink>` in shared code.
- Use semantic design tokens. Avoid hardcoded Tailwind colors.
- If identical logic appears in both apps, extract it to `packages/core` or `packages/views`.
- Hooks needing workspace context should accept `wsId` as a parameter when possible.

## Desktop Rules

Desktop paths fall into these categories:

- Session routes: workspace-scoped pages under `/:slug/...`; valid tab destinations.
- Transition flows: pre-workspace actions such as creating a workspace; use `WindowOverlay`, not tabs.
- Stale workspace states: heal silently by dropping stale tab groups.

Full-window desktop overlays need a top drag strip:

```tsx
<div className="fixed inset-0 z-50 flex flex-col bg-background">
  <div className="h-12 shrink-0" style={{ WebkitAppRegion: "drag" }} />
  <div className="flex-1 overflow-auto" style={{ WebkitAppRegion: "no-drag" }}>
    {/* content */}
  </div>
</div>
```

## Backend Rules

- Keep handlers domain-focused.
- Keep sqlc query files in `server/pkg/db/queries/`.
- Run `make sqlc` after changing sqlc query files when `sqlc` is installed.
- Daemon routes run against the local solo user.
- WebSocket connections use local user context and workspace membership checks.
- Workspace repository payloads must remain local paths only.

## Verification

After code changes, run the relevant checks:

```bash
pnpm typecheck
pnpm test
make test
```

If `make test` cannot run in the sandbox because `httptest` cannot bind ports, run the package subset that does not require listeners and state the limitation.
