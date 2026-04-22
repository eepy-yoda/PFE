import { api } from './auth';
import type { TimeLog, TimeSummary } from '../types';

export const timeTrackingApi = {
    async getSummary(): Promise<TimeSummary> {
        const res = await api.get<TimeSummary>('/time-tracking/summary');
        return res.data;
    },

    async getActive(): Promise<TimeLog | null> {
        const res = await api.get<TimeLog | null>('/time-tracking/active');
        return res.data;
    },

    async getLogs(taskId?: string): Promise<TimeLog[]> {
        const params = taskId ? { task_id: taskId } : {};
        const res = await api.get<TimeLog[]>('/time-tracking/', { params });
        return res.data;
    },

    async startTimer(taskId: string, description?: string): Promise<TimeLog> {
        const res = await api.post<TimeLog>('/time-tracking/start', {
            task_id: taskId,
            description,
        });
        return res.data;
    },

    async stopTimer(): Promise<TimeLog> {
        const res = await api.post<TimeLog>('/time-tracking/stop');
        return res.data;
    },

    async createManualEntry(payload: {
        task_id: string;
        start_time: string;
        end_time: string;
        description?: string;
    }): Promise<TimeLog> {
        const res = await api.post<TimeLog>('/time-tracking/manual', payload);
        return res.data;
    },

    async deleteLog(logId: string): Promise<void> {
        await api.delete(`/time-tracking/${logId}`);
    },
};

export function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${Math.floor(seconds)}s`;
}
