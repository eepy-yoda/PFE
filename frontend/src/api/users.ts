import { api } from './auth';
import type { CurrentUser, UserRole } from '../types';

export interface AdminUserCreate {
    email: string;
    full_name: string;
    role: UserRole;
    password: string;
}

export interface AdminUserUpdate {
    role?: UserRole;
    is_active?: boolean;
}

export const usersService = {
    async getAll(): Promise<CurrentUser[]> {
        const response = await api.get<CurrentUser[]>('/users/');
        return response.data;
    },

    async createEmployee(userData: AdminUserCreate): Promise<CurrentUser> {
        const response = await api.post<CurrentUser>('/users/employee', userData);
        return response.data;
    },

    async update(userId: string, userData: AdminUserUpdate): Promise<CurrentUser> {
        const response = await api.patch<CurrentUser>(`/users/${userId}`, userData);
        return response.data;
    },

    async deactivate(userId: string): Promise<void> {
        await api.delete(`/users/${userId}/deactivate`);
    },

    async reactivate(userId: string): Promise<CurrentUser> {
        const response = await api.patch<CurrentUser>(`/users/${userId}`, { is_active: true });
        return response.data;
    },

    async getMe(): Promise<CurrentUser> {
        const response = await api.get<CurrentUser>('/users/me');
        return response.data;
    },

    async updateMe(profileData: {
        full_name?: string;
        phone?: string;
        address?: string;
        bio?: string;
        agency_name?: string;
        avatar_url?: string;
    }): Promise<CurrentUser> {
        const response = await api.put<CurrentUser>('/users/me', profileData);
        return response.data;
    },

    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        await api.patch('/users/me/password', {
            current_password: currentPassword,
            new_password: newPassword,
        });
    },
};

export default usersService;
