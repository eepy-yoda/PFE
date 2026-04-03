import { api } from './auth';
import { supabase } from '../lib/supabaseClient';
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

    async partialDelivery(id: string, taskIds: string[]): Promise<any> {
        const response = await api.post(`/projects/${id}/partial-delivery`, { task_ids: taskIds });
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

    async submitTaskWork(
        taskId: string,
        submissionData: { content?: string; links?: string[]; file_paths?: string[] }
    ): Promise<TaskSubmission> {
        const response = await api.post<TaskSubmission>(`/tasks/${taskId}/submit`, submissionData);
        return response.data;
    },

    /**
     * Upload a file directly to Supabase Storage and return its public URL.
     * Files land in the `task-submissions` bucket under `{taskId}/{filename}`.
     */
    async uploadSubmissionFile(file: File, taskId: string): Promise<string> {
        const ext = file.name.split('.').pop();
        const path = `${taskId}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage
            .from('task-submissions')
            .upload(path, file, { upsert: false });
        if (error) throw new Error(error.message);
        const { data } = supabase.storage.from('task-submissions').getPublicUrl(path);
        return data.publicUrl;
    },

    /**
     * Upload with per-file progress callback.
     * onProgress receives 0-100 percent for the file being uploaded.
     */
    async uploadSubmissionFileWithProgress(
        file: File,
        taskId: string,
        onProgress: (pct: number) => void,
    ): Promise<string> {
        const ext = file.name.split('.').pop();
        const path = `${taskId}/${Date.now()}.${ext}`;

        // Use XHR so we can track upload progress
        const publicBucketUrl = await new Promise<string>((resolve, reject) => {
            const supabaseUrl = (supabase as any).supabaseUrl as string;
            const supabaseKey = (supabase as any).supabaseKey as string;
            const uploadUrl = `${supabaseUrl}/storage/v1/object/task-submissions/${path}`;

            const xhr = new XMLHttpRequest();
            xhr.open('POST', uploadUrl);
            xhr.setRequestHeader('Authorization', `Bearer ${supabaseKey}`);
            xhr.setRequestHeader('x-upsert', 'false');

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    onProgress(Math.round((e.loaded / e.total) * 100));
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const { data } = supabase.storage.from('task-submissions').getPublicUrl(path);
                    resolve(data.publicUrl);
                } else {
                    try {
                        const err = JSON.parse(xhr.responseText);
                        reject(new Error(err.message || 'Upload failed'));
                    } catch {
                        reject(new Error(`Upload failed with status ${xhr.status}`));
                    }
                }
            };

            xhr.onerror = () => reject(new Error('Network error during upload'));
            xhr.send(file);
        });

        return publicBucketUrl;
    },

    /** Returns all projects the current employee is associated with (via tasks or direct assignment). */
    async getWorkerProjects(): Promise<Project[]> {
        const response = await api.get<Project[]>('/projects/');
        return response.data;
    },

    async getTaskSubmissions(taskId: string): Promise<TaskSubmission[]> {
        const response = await api.get<TaskSubmission[]>(`/submissions/${taskId}/`);
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

