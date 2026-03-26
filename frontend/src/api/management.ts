import { api } from './auth';
import { 
    CurrentUser, 
    Role, 
    Permission, 
    ActivityLog,
    Task
} from '../types';

export const managementService = {
    // Workers
    getWorkers: async (): Promise<CurrentUser[]> => {
        const res = await api.get<CurrentUser[]>('/management/workers');
        return res.data;
    },

    createWorker: async (data: any): Promise<CurrentUser> => {
        const res = await api.post<CurrentUser>('/management/workers', data);
        return res.data;
    },

    updateWorker: async (id: string, data: any): Promise<CurrentUser> => {
        const res = await api.patch<CurrentUser>(`/management/workers/${id}`, data);
        return res.data;
    },

    // Roles & Permissions
    getRoles: async (): Promise<Role[]> => {
        const res = await api.get<Role[]>('/management/roles');
        return res.data;
    },

    createRole: async (data: any): Promise<Role> => {
        const res = await api.post<Role>('/management/roles', data);
        return res.data;
    },

    updateRole: async (id: string, data: any): Promise<Role> => {
        const res = await api.patch<Role>(`/management/roles/${id}`, data);
        return res.data;
    },

    getPermissions: async (): Promise<Permission[]> => {
        const res = await api.get<Permission[]>('/management/permissions');
        return res.data;
    },

    // Activity Logs
    getLogs: async (skip = 0, limit = 50): Promise<ActivityLog[]> => {
        const res = await api.get<ActivityLog[]>(`/management/logs?skip=${skip}&limit=${limit}`);
        return res.data;
    },

    // Tasks (Manager View)
    getTasks: async (): Promise<Task[]> => {
        const res = await api.get<Task[]>('/management/tasks');
        return res.data;
    }
};
