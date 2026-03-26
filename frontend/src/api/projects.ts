import { api } from './auth';
import type { Project, Task, TaskSubmission, TaskFeedback } from '../types';

// ── Manager Dashboard Types ───────────────────────────────────────────────────

export interface WorkerStat {
    user_id: string;
    full_name: string;
    email: string;
    completed_tasks: number;
    total_tasks: number;
    on_time_tasks: number;
    avg_ai_score: number | null;
    performance_score: number; // 0–100
}

export interface WorkloadTaskItem {
    id: string;
    title: string;
    status: string;
    priority: string;
    deadline?: string;
    project_name?: string;
    assigned_to?: string;
}

export interface DashboardAlertItem {
    type: string;
    title: string;
    detail: string;
    priority: 'critical' | 'warning' | 'info';
    entity_id?: string;
}

export interface ManagerDashboardData {
    kpi_total_tasks: number;
    kpi_completion_rate: number;
    kpi_avg_ai_score: number | null;
    kpi_active_workers: number;
    workers: WorkerStat[];
    revenue: {
        paid_count: number;
        pending_count: number;
        overdue_count: number;
        recently_paid: Project[];
    };
    workload: {
        total: number;
        todo: number;
        in_progress: number;
        near_deadline: WorkloadTaskItem[];
        urgent: WorkloadTaskItem[];
    };
    projects: {
        total: number;
        active: number;
        completed: number;
        delivered: number;
        on_hold: number;
        delayed: number;
    };
    alerts: DashboardAlertItem[];
    briefs: Project[];
    active_projects: Project[];
}

// ── Projects service (MODEL layer) ────────────────────────────────────────────

interface BriefActionParams {
    action: 'validate' | 'clarify' | 'reject';
    notes?: string;
}

export const projectsService = {
    // ── Projects ──
    async getAll(): Promise<Project[]> {
        const response = await api.get<Project[]>('/projects/');
        return response.data;
    },

    async getById(id: string): Promise<Project> {
        const response = await api.get<Project>(`/projects/${id}`);
        return response.data;
    },

    async create(projectData: Partial<Project>): Promise<Project> {
        const response = await api.post<Project>('/projects/', projectData);
        return response.data;
    },

    async update(id: string, projectData: Partial<Project>): Promise<Project> {
        const response = await api.patch<Project>(`/projects/${id}`, projectData);
        return response.data;
    },

    // ── Brief Lifecycle ──
    async getReceivedBriefs(): Promise<Project[]> {
        const response = await api.get<Project[]>('/projects/briefs/received');
        return response.data;
    },

    async takeBriefAction(id: string, params: BriefActionParams): Promise<Project> {
        const response = await api.post<Project>(`/projects/${id}/brief-action`, params);
        return response.data;
    },

    async convertToProject(id: string, assignedTo?: string): Promise<Project> {
        const response = await api.post<Project>(`/projects/${id}/convert-to-project`, { assigned_to: assignedTo });
        return response.data;
    },

    async markPaid(id: string): Promise<Project> {
        const response = await api.post<Project>(`/projects/${id}/mark-paid`);
        return response.data;
    },

    async getMyBriefHistory(): Promise<Project[]> {
        const response = await api.get<Project[]>('/projects/my-briefs/history');
        return response.data;
    },

    async generateAIResume(id: string): Promise<any> {
        const response = await api.post(`/projects/${id}/ai-resume`);
        return response.data;
    },

    // ── Tasks ──
    async getTasksByProject(projectId: string): Promise<Task[]> {
        const response = await api.get<Task[]>(`/tasks/project/${projectId}`);
        return response.data;
    },

    async getMyTasks(): Promise<Task[]> {
        const response = await api.get<Task[]>('/tasks/my');
        return response.data;
    },

    async createTask(taskData: Partial<Task>): Promise<Task> {
        const response = await api.post<Task>('/tasks/', taskData);
        return response.data;
    },

    async updateTask(id: string, taskData: Partial<Task>): Promise<Task> {
        const response = await api.patch<Task>(`/tasks/${id}`, taskData);
        return response.data;
    },

    async submitTaskWork(taskId: string, submissionData: Partial<TaskSubmission>): Promise<TaskSubmission> {
        const response = await api.post<TaskSubmission>(`/tasks/${taskId}/submit`, submissionData);
        return response.data;
    },

    async getTaskSubmissions(taskId: string): Promise<TaskSubmission[]> {
        const response = await api.get<TaskSubmission[]>(`/tasks/${taskId}/submissions`);
        return response.data;
    },

    async sendTaskFeedback(taskId: string, feedbackData: Partial<TaskFeedback>): Promise<TaskFeedback> {
        const response = await api.post<TaskFeedback>(`/tasks/${taskId}/feedback`, feedbackData);
        return response.data;
    },

    async getTaskFeedbacks(taskId: string): Promise<TaskFeedback[]> {
        const response = await api.get<TaskFeedback[]>(`/tasks/${taskId}/feedbacks`);
        return response.data;
    },

    async getLateTasks(): Promise<Task[]> {
        const response = await api.get<Task[]>('/tasks/alerts/late');
        return response.data;
    },

    async getManagerOverview(): Promise<{ briefs: Project[]; active_projects: Project[]; late_tasks: Task[] }> {
        const response = await api.get('/projects/manager-overview');
        return response.data;
    },

    async getManagerDashboard(): Promise<ManagerDashboardData> {
        const response = await api.get<ManagerDashboardData>('/projects/manager-dashboard');
        return response.data;
    },
};

export default projectsService;

