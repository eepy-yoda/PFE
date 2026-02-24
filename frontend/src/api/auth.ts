import axios, { type InternalAxiosRequestConfig } from 'axios';
import type { CurrentUser, UserRole, RegisterPayload } from '../types';

// ── Axios instance ────────────────────────────────────────────────────────────

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL as string,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach JWT token to every outgoing request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ── Response shapes ───────────────────────────────────────────────────────────

interface LoginResponse {
    access_token: string;
    role: UserRole;
}

// ── Auth service (MODEL layer) ────────────────────────────────────────────────

export const authService = {
    async login(email: string, password: string): Promise<LoginResponse> {
        const response = await api.post<LoginResponse>('/auth/login', { email, password });

        if (response.data.access_token) {
            localStorage.setItem('token', response.data.access_token);
            localStorage.setItem(
                'user',
                JSON.stringify({ role: response.data.role, email } satisfies CurrentUser)
            );
        }
        return response.data;
    },

    async register(userData: RegisterPayload): Promise<unknown> {
        console.log('REGISTER PAYLOAD:', userData);
        const response = await api.post<unknown>('/auth/signup', userData);
        return response.data;
    },

    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    getCurrentUser(): CurrentUser | null {
        const userStr = localStorage.getItem('user');
        if (userStr) return JSON.parse(userStr) as CurrentUser;
        return null;
    },
};

export default authService;
