import { create } from "zustand";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  setTokens: (access: string, refresh: string) => void;
  clear: () => void;
}

function clearPersistedAuth() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: localStorage.getItem("access_token"),
  refreshToken: localStorage.getItem("refresh_token"),
  setTokens: (access, refresh) => {
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
    set({ accessToken: access, refreshToken: refresh });
  },
  clear: () => {
    clearPersistedAuth();
    set({ accessToken: null, refreshToken: null });
  },
}));
