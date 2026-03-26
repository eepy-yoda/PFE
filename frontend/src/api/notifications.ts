import { api } from './auth';
import type { Notification } from '../types';

export const notificationsService = {
    async getMyNotifications(): Promise<Notification[]> {
        const response = await api.get<Notification[]>('/notifications/');
        return response.data;
    },

    async getUnreadCount(): Promise<{ count: number }> {
        const response = await api.get<{ count: number }>('/notifications/unread-count');
        return response.data;
    },

    async markAsRead(id: string): Promise<Notification> {
        const response = await api.patch<Notification>(`/notifications/${id}/read`);
        return response.data;
    },

    async markAllAsRead(): Promise<{ message: string }> {
        const response = await api.post<{ message: string }>('/notifications/mark-all-read');
        return response.data;
    }
};

export default notificationsService;
