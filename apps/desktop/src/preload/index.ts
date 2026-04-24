import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

const desktopAPI = {
  /** Open a URL in the default browser */
  openExternal: (url: string) => ipcRenderer.invoke("shell:openExternal", url),
  /** Toggle immersive mode — hide macOS traffic lights for full-screen modals */
  setImmersiveMode: (immersive: boolean) =>
    ipcRenderer.invoke("window:setImmersive", immersive),
};

interface DaemonStatus {
  state: "running" | "stopped" | "starting" | "stopping" | "installing_cli" | "cli_not_found";
  pid?: number;
  uptime?: string;
  daemonId?: string;
  deviceName?: string;
  agents?: string[];
  workspaceCount?: number;
  profile?: string;
  serverUrl?: string;
}

const daemonAPI = {
  start: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("daemon:start"),
  stop: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("daemon:stop"),
  restart: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("daemon:restart"),
  getStatus: (): Promise<DaemonStatus> =>
    ipcRenderer.invoke("daemon:get-status"),
  onStatusChange: (callback: (status: DaemonStatus) => void) => {
    const handler = (_: unknown, status: DaemonStatus) => callback(status);
    ipcRenderer.on("daemon:status", handler);
    return () => ipcRenderer.removeListener("daemon:status", handler);
  },
  setTargetApiUrl: (url: string): Promise<void> =>
    ipcRenderer.invoke("daemon:set-target-api-url", url),
  isCliInstalled: (): Promise<boolean> =>
    ipcRenderer.invoke("daemon:is-cli-installed"),
  getPrefs: (): Promise<{ autoStart: boolean; autoStop: boolean }> =>
    ipcRenderer.invoke("daemon:get-prefs"),
  setPrefs: (prefs: Partial<{ autoStart: boolean; autoStop: boolean }>): Promise<{ autoStart: boolean; autoStop: boolean }> =>
    ipcRenderer.invoke("daemon:set-prefs", prefs),
  autoStart: (): Promise<void> =>
    ipcRenderer.invoke("daemon:auto-start"),
  retryInstall: (): Promise<void> =>
    ipcRenderer.invoke("daemon:retry-install"),
  startLogStream: () => ipcRenderer.send("daemon:start-log-stream"),
  stopLogStream: () => ipcRenderer.send("daemon:stop-log-stream"),
  onLogLine: (callback: (line: string) => void) => {
    const handler = (_: unknown, line: string) => callback(line);
    ipcRenderer.on("daemon:log-line", handler);
    return () => ipcRenderer.removeListener("daemon:log-line", handler);
  },
};

const updaterAPI = {
  onUpdateAvailable: (callback: (info: { version: string; releaseNotes?: string }) => void) => {
    const handler = (_: unknown, info: { version: string; releaseNotes?: string }) => callback(info);
    ipcRenderer.on("updater:update-available", handler);
    return () => ipcRenderer.removeListener("updater:update-available", handler);
  },
  onDownloadProgress: (callback: (progress: { percent: number }) => void) => {
    const handler = (_: unknown, progress: { percent: number }) => callback(progress);
    ipcRenderer.on("updater:download-progress", handler);
    return () => ipcRenderer.removeListener("updater:download-progress", handler);
  },
  onUpdateDownloaded: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on("updater:update-downloaded", handler);
    return () => ipcRenderer.removeListener("updater:update-downloaded", handler);
  },
  downloadUpdate: () => ipcRenderer.invoke("updater:download"),
  installUpdate: () => ipcRenderer.invoke("updater:install"),
  checkForUpdates: (): Promise<
    | { ok: true; currentVersion: string; latestVersion: string; available: boolean }
    | { ok: false; error: string }
  > => ipcRenderer.invoke("updater:check"),
};

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld("electron", electronAPI);
  contextBridge.exposeInMainWorld("desktopAPI", desktopAPI);
  contextBridge.exposeInMainWorld("daemonAPI", daemonAPI);
  contextBridge.exposeInMainWorld("updater", updaterAPI);
} else {
  // @ts-expect-error - fallback for non-isolated context
  window.electron = electronAPI;
  // @ts-expect-error - fallback for non-isolated context
  window.desktopAPI = desktopAPI;
  // @ts-expect-error - fallback for non-isolated context
  window.daemonAPI = daemonAPI;
  // @ts-expect-error - fallback for non-isolated context
  window.updater = updaterAPI;
}
