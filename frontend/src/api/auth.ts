import axios, { type InternalAxiosRequestConfig } from 'axios';
import type { CurrentUser, UserRole, RegisterPayload } from '../types';

// ── Axios instance ────────────────────────────────────────────────────────────

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL as string,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach Supabase access token to every outgoing request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 Unauthorized globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.warn('Unauthorized — clearing session and redirecting to login...');
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// ── Response shapes ───────────────────────────────────────────────────────────

interface LoginResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    role: UserRole;
    user: CurrentUser;
}

// ── Auth service ──────────────────────────────────────────────────────────────

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
    },

    getCurrentUser(): CurrentUser | null {
        const userStr = localStorage.getItem('user');
        if (userStr) return JSON.parse(userStr) as CurrentUser;
        return null;
    },
};

export default authService;
