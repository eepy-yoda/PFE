import { api } from './auth';
import type {
    WorkerDashboardSummary,
    TaskFeedback,
    ActivityEvent,
} from '../types';

export const workerApi = {
    async getDashboardSummary(): Promise<WorkerDashboardSummary> {
        const res = await api.get<WorkerDashboardSummary>('/tasks/worker-summary');
        return res.data;
    },

    async getMyFeedback(): Promise<TaskFeedback[]> {
        const res = await api.get<TaskFeedback[]>('/tasks/my-feedback');
        return res.data;
    },

    async getTaskActivity(taskId: string): Promise<ActivityEvent[]> {
        const res = await api.get<ActivityEvent[]>(`/tasks/${taskId}/activity`);
        return res.data;
    },
};
