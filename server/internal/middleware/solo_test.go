package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestLocalUserMiddlewareInjectsSoloIdentity(t *testing.T) {
	const userID = "00000000-0000-0000-0000-000000000123"

	req := httptest.NewRequest(http.MethodGet, "/api/me", nil)
	rec := httptest.NewRecorder()

	LocalUser(userID)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("X-User-ID"); got != userID {
			t.Fatalf("expected X-User-ID %q, got %q", userID, got)
		}
		w.WriteHeader(http.StatusNoContent)
	})).ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected downstream handler to run, got %d", rec.Code)
	}
}
