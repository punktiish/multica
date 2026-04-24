package main

import (
	"bufio"
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/multica-ai/multica/server/internal/cli"
)

var setupCmd = &cobra.Command{
	Use:   "setup",
	Short: "Configure the CLI, authenticate, and start the daemon",
	Long: `Configures the CLI to connect to the local Multica server, then
starts the agent daemon.

If a configuration already exists, you will be prompted before overwriting.

Use --profile to create an isolated configuration for a separate environment:
  multica setup --profile dev --server-url http://localhost:8080`,
	RunE: runSetupSelfHost,
}

var setupCloudCmd = &cobra.Command{
	Use:   "cloud",
	Short: "Deprecated alias for local setup",
	Long:  "Cloud setup is disabled in solo local mode. This command configures the local server instead.",
	RunE:  runSetupSelfHost,
}

var setupSelfHostCmd = &cobra.Command{
	Use:   "self-host",
	Short: "Configure the CLI for a self-hosted Multica server",
	Long: `Configures the CLI to connect to a self-hosted Multica server.

By default, connects to http://localhost:8080 (backend) and http://localhost:3000 (frontend).
Use --server-url and --app-url to specify a custom server (e.g. an on-premise deployment).

Examples:
  multica setup self-host
  multica setup self-host --server-url https://api.internal.co --app-url https://app.internal.co
  multica setup self-host --port 9090 --frontend-port 4000`,
	RunE: runSetupSelfHost,
}

func init() {
	setupCmd.Flags().String("server-url", "", "Backend server URL (default http://localhost:8080)")
	setupCmd.Flags().String("app-url", "", "Frontend app URL (default http://localhost:3000)")
	setupCmd.Flags().Int("port", 8080, "Backend server port (used when --server-url is not set)")
	setupCmd.Flags().Int("frontend-port", 3000, "Frontend port (used when --app-url is not set)")

	setupCloudCmd.Flags().String("server-url", "", "Backend server URL (default http://localhost:8080)")
	setupCloudCmd.Flags().String("app-url", "", "Frontend app URL (default http://localhost:3000)")
	setupCloudCmd.Flags().Int("port", 8080, "Backend server port (used when --server-url is not set)")
	setupCloudCmd.Flags().Int("frontend-port", 3000, "Frontend port (used when --app-url is not set)")

	setupSelfHostCmd.Flags().String("server-url", "", "Backend server URL (e.g. https://api.internal.co)")
	setupSelfHostCmd.Flags().String("app-url", "", "Frontend app URL (e.g. https://app.internal.co)")
	setupSelfHostCmd.Flags().Int("port", 8080, "Backend server port (used when --server-url is not set)")
	setupSelfHostCmd.Flags().Int("frontend-port", 3000, "Frontend port (used when --app-url is not set)")

	setupCmd.AddCommand(setupCloudCmd)
	setupCmd.AddCommand(setupSelfHostCmd)
}

// printConfigLocation prints the config file path and profile name.
func printConfigLocation(profile string) {
	path, err := cli.CLIConfigPathForProfile(profile)
	if err != nil {
		return
	}
	if profile != "" {
		fmt.Fprintf(os.Stderr, "  profile:    %s\n", profile)
	}
	fmt.Fprintf(os.Stderr, "  config:     %s\n", path)
}

// confirmOverwrite checks for an existing config and prompts the user.
// Returns true if we should proceed, false if the user declined.
func confirmOverwrite(profile string) (bool, error) {
	cfg, err := cli.LoadCLIConfigForProfile(profile)
	if err != nil {
		return true, nil // can't load → treat as no config
	}
	if cfg.ServerURL == "" {
		return true, nil // no server configured → fresh config
	}

	fmt.Fprintln(os.Stderr, "Current configuration:")
	fmt.Fprintf(os.Stderr, "  server_url: %s\n", cfg.ServerURL)
	fmt.Fprintf(os.Stderr, "  app_url:    %s\n", cfg.AppURL)
	if cfg.WorkspaceID != "" {
		fmt.Fprintf(os.Stderr, "  workspace:  %s\n", cfg.WorkspaceID)
	}
	fmt.Fprintln(os.Stderr, "")
	fmt.Fprint(os.Stderr, "This will reset your configuration. Continue? [y/N] ")

	reader := bufio.NewReader(os.Stdin)
	answer, _ := reader.ReadString('\n')
	answer = strings.TrimSpace(strings.ToLower(answer))
	if answer != "y" && answer != "yes" {
		fmt.Fprintln(os.Stderr, "Aborted.")
		return false, nil
	}
	return true, nil
}

func runSetupSelfHost(cmd *cobra.Command, args []string) error {
	profile := resolveProfile(cmd)

	ok, err := confirmOverwrite(profile)
	if err != nil {
		return err
	}
	if !ok {
		return nil
	}

	serverURL, _ := cmd.Flags().GetString("server-url")
	appURL, _ := cmd.Flags().GetString("app-url")
	port, _ := cmd.Flags().GetInt("port")
	frontendPort, _ := cmd.Flags().GetInt("frontend-port")

	// If custom URLs provided, use them; otherwise default to localhost with ports.
	if serverURL == "" {
		serverURL = fmt.Sprintf("http://localhost:%d", port)
	}
	if appURL == "" {
		appURL = fmt.Sprintf("http://localhost:%d", frontendPort)
	}

	cfg := cli.CLIConfig{
		ServerURL: serverURL,
		AppURL:    appURL,
	}
	if err := cli.SaveCLIConfigForProfile(cfg, profile); err != nil {
		return fmt.Errorf("save config: %w", err)
	}

	fmt.Fprintln(os.Stderr, "Configured for local Multica.")
	fmt.Fprintf(os.Stderr, "  server_url: %s\n", cfg.ServerURL)
	fmt.Fprintf(os.Stderr, "  app_url:    %s\n", cfg.AppURL)
	printConfigLocation(profile)

	// Check if the server is reachable.
	if !probeServer(serverURL) {
		fmt.Fprintf(os.Stderr, "\n⚠ Server at %s is not reachable.\n", serverURL)
		fmt.Fprintln(os.Stderr, "  Make sure the server is running, then run 'multica login'.")
		return nil
	}

	fmt.Fprintln(os.Stderr, "")
	if err := runLogin(cmd, args); err != nil {
		return err
	}

	fmt.Fprintln(os.Stderr, "\nStarting daemon...")
	if err := runDaemonBackground(cmd); err != nil {
		return fmt.Errorf("start daemon: %w", err)
	}
	fmt.Fprintln(os.Stderr, "\n✓ Setup complete! Your machine is now connected to Multica.")

	return nil
}

// probeServer checks whether a Multica backend is reachable at the given URL.
func probeServer(baseURL string) bool {
	url := strings.TrimRight(baseURL, "/") + "/health"
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return false
	}

	resp, err := (&http.Client{Timeout: 2 * time.Second}).Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}
