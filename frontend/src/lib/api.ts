import axios from "axios";
import { useAuthStore } from "./authStore";

export const api = axios.create({ baseURL: "http://127.0.0.1:8000" });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// on a 401, try refreshing once, then retry the original request
let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const { refreshToken, setTokens, clear } = useAuthStore.getState();
      if (!refreshToken) {
        clear();
        return Promise.reject(error);
      }
      try {
        if (!refreshing) {
          refreshing = api
            .post("/api/auth/refresh", { refresh_token: refreshToken })
            .then((r) => {
              setTokens(r.data.access_token, r.data.refresh_token);
              return r.data.access_token;
            })
            .finally(() => {
              refreshing = null;
            });
        }
        const newAccess = await refreshing;
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (e) {
        clear();
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);
