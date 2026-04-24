package solo

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	UserName      = "Local User"
	UserEmail     = "local@multica.local"
	WorkspaceName = "Personal"
	WorkspaceSlug = "personal"
	IssuePrefix   = "PER"
)

type Identity struct {
	UserID      string
	WorkspaceID string
}

func Ensure(ctx context.Context, pool *pgxpool.Pool) (Identity, error) {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return Identity{}, fmt.Errorf("begin solo bootstrap: %w", err)
	}
	defer tx.Rollback(ctx)

	var identity Identity
	if err := tx.QueryRow(ctx, `
		INSERT INTO "user" (name, email)
		VALUES ($1, $2)
		ON CONFLICT (email) DO UPDATE SET
			name = EXCLUDED.name,
			updated_at = now()
		RETURNING id
	`, UserName, UserEmail).Scan(&identity.UserID); err != nil {
		return Identity{}, fmt.Errorf("ensure local user: %w", err)
	}

	if err := tx.QueryRow(ctx, `
		INSERT INTO workspace (name, slug, description, issue_prefix)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (slug) DO UPDATE SET
			name = EXCLUDED.name,
			updated_at = now()
		RETURNING id
	`, WorkspaceName, WorkspaceSlug, "Personal local workspace", IssuePrefix).Scan(&identity.WorkspaceID); err != nil {
		return Identity{}, fmt.Errorf("ensure personal workspace: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO member (workspace_id, user_id, role)
		VALUES ($1, $2, 'owner')
		ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'owner'
	`, identity.WorkspaceID, identity.UserID); err != nil {
		return Identity{}, fmt.Errorf("ensure local membership: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return Identity{}, fmt.Errorf("commit solo bootstrap: %w", err)
	}

	return identity, nil
}
