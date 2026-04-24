package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSoloLocalWorkspaceUsesLocalRepositoriesOnly(t *testing.T) {
	req := newRequest(http.MethodPatch, "/api/workspaces/"+testWorkspaceID, map[string]any{
		"repos": []map[string]any{
			{"path": "/Users/me/code/app", "description": "app"},
		},
	})
	req = withURLParam(req, "id", testWorkspaceID)

	w := httptest.NewRecorder()
	testHandler.UpdateWorkspace(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected local repo update to succeed, got %d: %s", w.Code, w.Body.String())
	}
}

func TestSoloLocalWorkspaceRejectsRemoteRepositories(t *testing.T) {
	req := newRequest(http.MethodPatch, "/api/workspaces/"+testWorkspaceID, map[string]any{
		"repos": []map[string]any{
			{"url": "https://github.com/acme/app.git", "description": "remote"},
		},
	})
	req = withURLParam(req, "id", testWorkspaceID)

	w := httptest.NewRecorder()
	testHandler.UpdateWorkspace(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected remote repo update to be rejected, got %d: %s", w.Code, w.Body.String())
	}
}
