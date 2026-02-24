import { api } from './auth';
import type { Project } from '../types';

// ── Projects service (MODEL layer) ────────────────────────────────────────────

export const projectsService = {
    async getAll(): Promise<Project[]> {
        const response = await api.get<Project[]>('/projects/');
        return response.data;
    },

    async getById(id: string | number): Promise<Project> {
        const response = await api.get<Project>(`/projects/${id}`);
        return response.data;
    },

    async create(projectData: Omit<Project, 'id' | 'created_at'>): Promise<Project> {
        const response = await api.post<Project>('/projects/', projectData);
        return response.data;
    },

    async update(id: string | number, projectData: Partial<Omit<Project, 'id' | 'created_at'>>): Promise<Project> {
        const response = await api.put<Project>(`/projects/${id}`, projectData);
        return response.data;
    },

    async delete(id: string | number): Promise<void> {
        await api.delete(`/projects/${id}`);
    },
};

export default projectsService;
