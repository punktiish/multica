import { create } from "zustand";

/**
 * Window-level transition overlay: pre-workspace flows that are NOT pages
 * inside a tab. Triggered by navigation-adapter interception, zero-workspace
 * auto-redirect; rendered above the tab system as a full-window takeover.
 *
 * This flow used to be a route (`/workspaces/new`) but on
 * desktop the URL is invisible to users — routes are an implementation detail
 * of the tab system. Representing transitions as routes meant tabs tried to
 * persist them and TabBar rendered on top. Modeling them as application state
 * removes that coupling.
 */
export type WindowOverlay =
  | { type: "new-workspace" };

interface WindowOverlayStore {
  overlay: WindowOverlay | null;
  open: (overlay: WindowOverlay) => void;
  close: () => void;
}

export const useWindowOverlayStore = create<WindowOverlayStore>((set) => ({
  overlay: null,
  open: (overlay) => set({ overlay }),
  close: () => set({ overlay: null }),
}));
