import axios, { type InternalAxiosRequestConfig } from 'axios';
import type { CurrentUser, UserRole, RegisterPayload } from '../types';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL as string,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) reject(error);
        else resolve(token);
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            // Don't retry the refresh endpoint itself
            if (originalRequest.url?.includes('/auth/')) {
                localStorage.removeItem('token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user');
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }

            if (isRefreshing) {
                // Queue requests while refresh is in progress
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = localStorage.getItem('refresh_token');

            if (!refreshToken) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }

            try {
                // Use Supabase to refresh the session
                const { supabase } = await import('../lib/supabaseClient');
                const { data, error: refreshError } = await supabase.auth.refreshSession({
                    refresh_token: refreshToken,
                });

                if (refreshError || !data.session) {
                    throw refreshError || new Error('No session returned');
                }

                const newToken = data.session.access_token;
                const newRefresh = data.session.refresh_token;

                localStorage.setItem('token', newToken);
                localStorage.setItem('refresh_token', newRefresh);

                api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                originalRequest.headers.Authorization = `Bearer ${newToken}`;

                processQueue(null, newToken);
                return api(originalRequest);
            } catch (refreshErr) {
                processQueue(refreshErr, null);
                localStorage.removeItem('token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user');
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }
                return Promise.reject(refreshErr);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

interface LoginResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    role: UserRole;
    user: CurrentUser;
}

export const authService = {
    async login(email: string, password: string): Promise<LoginResponse> {
        const response = await api.post<LoginResponse>('/auth/login', { email, password });
        if (response.data.access_token) {
            localStorage.setItem('token', response.data.access_token);
            localStorage.setItem('refresh_token', response.data.refresh_token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    async register(userData: RegisterPayload): Promise<unknown> {
        const response = await api.post<unknown>('/auth/signup', userData);
        return response.data;
    },

    async forgotPassword(email: string): Promise<{ message: string }> {
        const response = await api.post<{ message: string }>('/auth/forgot-password', { email });
        return response.data;
    },

    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        // Clear brief backups so they don't leak to the next user on this browser
        Object.keys(localStorage)
            .filter(k => k.startsWith('brief_backup_'))
            .forEach(k => localStorage.removeItem(k));
    },

    getCurrentUser(): CurrentUser | null {
        const userStr = localStorage.getItem('user');
        if (userStr) return JSON.parse(userStr) as CurrentUser;
        return null;
    },
};

export default authService;
