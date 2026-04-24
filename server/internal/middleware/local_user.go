package middleware

import "net/http"

func LocalUser(userID string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if userID != "" {
				r.Header.Set("X-User-ID", userID)
			}
			next.ServeHTTP(w, r)
		})
	}
}
