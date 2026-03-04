import { create } from 'zustand';

// ---- Types ----

interface UserState {
  id: string | null;
  email: string | null;
  role: 'admin' | 'member' | null;
  status: string | null;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  dealId?: string;
  createdAt: string;
  read: boolean;
}

// ---- App Store ----

interface AppState {
  user: UserState;
  sidebarOpen: boolean;
  notifications: Notification[];

  setUser: (user: UserState) => void;
  clearUser: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: { id: null, email: null, role: null, status: null },
  sidebarOpen: true,
  notifications: [],

  setUser: (user) => set({ user }),
  clearUser: () =>
    set({ user: { id: null, email: null, role: null, status: null } }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        {
          ...notification,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...state.notifications,
      ],
    })),
  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
  clearNotifications: () => set({ notifications: [] }),
}));

// ---- Active Deal Store ----

interface ActiveDealState {
  dealId: string | null;
  analysisStatus: string | null;
  isPolling: boolean;

  setActiveDeal: (dealId: string) => void;
  setAnalysisStatus: (status: string) => void;
  setPolling: (polling: boolean) => void;
  clearActiveDeal: () => void;
}

export const useActiveDealStore = create<ActiveDealState>((set) => ({
  dealId: null,
  analysisStatus: null,
  isPolling: false,

  setActiveDeal: (dealId) => set({ dealId, analysisStatus: null }),
  setAnalysisStatus: (status) => set({ analysisStatus: status }),
  setPolling: (polling) => set({ isPolling: polling }),
  clearActiveDeal: () =>
    set({ dealId: null, analysisStatus: null, isPolling: false }),
}));
