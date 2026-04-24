import { autoUpdater } from "electron-updater";
import { app, BrowserWindow, ipcMain } from "electron";

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

export type ManualUpdateCheckResult =
  | {
      ok: true;
      currentVersion: string;
      latestVersion: string;
      available: boolean;
    }
  | { ok: false; error: string };

export function setupAutoUpdater(getMainWindow: () => BrowserWindow | null): void {
  autoUpdater.on("update-available", (info) => {
    const win = getMainWindow();
    win?.webContents.send("updater:update-available", {
      version: info.version,
      releaseNotes: info.releaseNotes,
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    const win = getMainWindow();
    win?.webContents.send("updater:download-progress", {
      percent: progress.percent,
    });
  });

  autoUpdater.on("update-downloaded", () => {
    const win = getMainWindow();
    win?.webContents.send("updater:update-downloaded");
  });

  autoUpdater.on("error", (err) => {
    console.error("Auto-updater error:", err);
  });

  ipcMain.handle("updater:download", () => {
    return autoUpdater.downloadUpdate();
  });

  ipcMain.handle("updater:install", () => {
    autoUpdater.quitAndInstall(false, true);
  });

  ipcMain.handle("updater:check", async (): Promise<ManualUpdateCheckResult> => {
    try {
      const result = await autoUpdater.checkForUpdates();
      const currentVersion = app.getVersion();
      // Trust electron-updater's own decision rather than re-deriving it from
      // a version-string compare. The two diverge for pre-release channels,
      // staged rollouts, downgrades, and minimum-system-version gates — in
      // those cases updateInfo.version differs from app.getVersion() but no
      // `update-available` event fires, so showing "available" here would
      // promise a download prompt that never appears.
      return {
        ok: true,
        currentVersion,
        latestVersion: result?.updateInfo.version ?? currentVersion,
        available: result?.isUpdateAvailable ?? false,
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

  // Solo local mode is offline by default. Updates are checked only when the
  // user explicitly presses the manual update button.
}
