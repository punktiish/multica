package main

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/multica-ai/multica/server/internal/cli"
)

var authCmd = &cobra.Command{
	Use:   "auth",
	Short: "Show local Multica session information",
}

var authStatusCmd = &cobra.Command{
	Use:   "status",
	Short: "Show current local session status",
	RunE:  runAuthStatus,
}

var authLogoutCmd = &cobra.Command{
	Use:   "logout",
	Short: "Clear the legacy stored token if one exists",
	RunE:  runAuthLogout,
}

func init() {
	authCmd.AddCommand(authStatusCmd)
	authCmd.AddCommand(authLogoutCmd)
}

func resolveToken(cmd *cobra.Command) string {
	if v := strings.TrimSpace(os.Getenv("MULTICA_TOKEN")); v != "" {
		return v
	}
	profile := resolveProfile(cmd)
	cfg, _ := cli.LoadCLIConfigForProfile(profile)
	return cfg.Token
}

func resolveAppURL(cmd *cobra.Command) string {
	for _, key := range []string{"MULTICA_APP_URL", "FRONTEND_ORIGIN"} {
		if val := strings.TrimSpace(os.Getenv(key)); val != "" {
			return strings.TrimRight(val, "/")
		}
	}
	profile := resolveProfile(cmd)
	cfg, err := cli.LoadCLIConfigForProfile(profile)
	if err == nil && cfg.AppURL != "" {
		return strings.TrimRight(cfg.AppURL, "/")
	}
	return "http://localhost:3000"
}

func runAuthLogin(cmd *cobra.Command, _ []string) error {
	serverURL := resolveServerURL(cmd)
	appURL := resolveAppURL(cmd)
	profile := resolveProfile(cmd)
	cfg, _ := cli.LoadCLIConfigForProfile(profile)
	cfg.ServerURL = serverURL
	cfg.AppURL = appURL
	cfg.Token = ""
	cfg.WorkspaceID = ""
	if err := cli.SaveCLIConfigForProfile(cfg, profile); err != nil {
		return fmt.Errorf("save config: %w", err)
	}
	fmt.Fprintf(os.Stderr, "Configured local Multica session at %s.\n", serverURL)
	return nil
}

func runAuthStatus(cmd *cobra.Command, _ []string) error {
	serverURL := resolveServerURL(cmd)
	client := cli.NewAPIClient(serverURL, "", resolveToken(cmd))

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	var me struct {
		Name  string `json:"name"`
		Email string `json:"email"`
	}
	if err := client.GetJSON(ctx, "/api/me", &me); err != nil {
		return fmt.Errorf("local server not reachable or not initialized: %w", err)
	}

	fmt.Fprintf(os.Stderr, "Server: %s\nUser:   %s (%s)\nMode:   solo local\n", serverURL, me.Name, me.Email)
	return nil
}

func runAuthLogout(cmd *cobra.Command, _ []string) error {
	profile := resolveProfile(cmd)
	cfg, _ := cli.LoadCLIConfigForProfile(profile)
	cfg.Token = ""
	if err := cli.SaveCLIConfigForProfile(cfg, profile); err != nil {
		return fmt.Errorf("save config: %w", err)
	}
	fmt.Fprintln(os.Stderr, "Legacy token cleared. Solo local mode does not require authentication.")
	return nil
}
