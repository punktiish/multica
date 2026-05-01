package middleware

import "context"

type daemonAuthKey struct{}
type daemonIDKey struct{}
type daemonWorkspaceIDKey struct{}

func DaemonAuthPathFromContext(ctx context.Context) string {
	v, _ := ctx.Value(daemonAuthKey{}).(string)
	return v
}

func DaemonIDFromContext(ctx context.Context) string {
	v, _ := ctx.Value(daemonIDKey{}).(string)
	return v
}

func DaemonWorkspaceIDFromContext(ctx context.Context) string {
	v, _ := ctx.Value(daemonWorkspaceIDKey{}).(string)
	return v
}
