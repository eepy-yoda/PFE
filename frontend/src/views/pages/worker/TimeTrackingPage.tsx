import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Timer, Play, Square, Plus, Trash2, ArrowRight, Clock } from 'lucide-react';
import WorkerNav from '../../components/worker/WorkerNav';
import { timeTrackingApi, formatDuration } from '../../../api/timeTracking';
import { projectsService } from '../../../api/projects';
import type { TimeLog, Task } from '../../../types';

// ── manual entry modal ────────────────────────────────────────────────────────

interface ManualModalProps {
    tasks: Task[];
    onSaved: () => void;
    onClose: () => void;
}

const ManualModal: React.FC<ManualModalProps> = ({ tasks, onSaved, onClose }) => {
    const [taskId, setTaskId] = useState('');
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [desc, setDesc] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const submit = async () => {
        if (!taskId) { setError('Select a task'); return; }
        if (!start || !end) { setError('Start and end required'); return; }
        setLoading(true); setError('');
        try {
            await timeTrackingApi.createManualEntry({
                task_id: taskId,
                start_time: new Date(start).toISOString(),
                end_time: new Date(end).toISOString(),
                description: desc || undefined,
            });
            onSaved();
            onClose();
        } catch (e: any) {
            setError(e?.response?.data?.detail || 'Failed to save');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-2xl w-full max-w-md p-6 space-y-4">
                <h2 className="font-black text-gray-900 dark:text-white">Add Manual Time Entry</h2>
                <div>
                    <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Task</label>
                    <select value={taskId} onChange={e => setTaskId(e.target.value)}
                        className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30">
                        <option value="">Select task...</option>
                        {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Start</label>
                        <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)}
                            className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">End</label>
                        <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)}
                            className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                </div>
                <input value={desc} onChange={e => setDesc(e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                {error && <p className="text-xs text-red-500">{error}</p>}
                <div className="flex gap-3">
                    <button onClick={submit} disabled={loading}
                        className="flex-1 py-2.5 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50">
                        Save Entry
                    </button>
                    <button onClick={onClose} className="px-4 py-2.5 text-sm font-bold text-gray-500 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── start timer picker ────────────────────────────────────────────────────────

interface StartTimerPickerProps {
    tasks: Task[];
    onStarted: () => void;
    onClose: () => void;
}

const StartTimerPicker: React.FC<StartTimerPickerProps> = ({ tasks, onStarted, onClose }) => {
    const [taskId, setTaskId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const start = async () => {
        if (!taskId) { setError('Select a task'); return; }
        setLoading(true);
        try {
            await timeTrackingApi.startTimer(taskId);
            onStarted();
            onClose();
        } catch (e: any) {
            setError(e?.response?.data?.detail || 'Failed to start');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-2xl w-full max-w-sm p-6 space-y-4">
                <h2 className="font-black text-gray-900 dark:text-white">Start Timer</h2>
                <select value={taskId} onChange={e => setTaskId(e.target.value)}
                    className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">Select task...</option>
                    {tasks.filter(t => !['completed', 'approved'].includes(t.status)).map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                </select>
                {error && <p className="text-xs text-red-500">{error}</p>}
                <div className="flex gap-3">
                    <button onClick={start} disabled={loading}
                        className="flex-1 py-2.5 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
                        <Play size={14} /> Start
                    </button>
                    <button onClick={onClose} className="px-4 py-2.5 text-sm font-bold text-gray-500 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── main component ────────────────────────────────────────────────────────────

const TimeTrackingPage: React.FC = () => {
    const navigate = useNavigate();
    const [logs, setLogs] = useState<TimeLog[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [activeTimer, setActiveTimer] = useState<TimeLog | null>(null);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showManual, setShowManual] = useState(false);
    const [showStartPicker, setShowStartPicker] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [logsData, tasksData, active] = await Promise.allSettled([
                timeTrackingApi.getLogs(),
                projectsService.getMyTasks(),
                timeTrackingApi.getActive(),
            ]);
            if (logsData.status === 'fulfilled') setLogs(logsData.value);
            if (tasksData.status === 'fulfilled') setTasks(tasksData.value);
            if (active.status === 'fulfilled') setActiveTimer(active.value);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    useEffect(() => {
        if (!activeTimer) { setTimerSeconds(0); return; }
        const elapsed = Math.floor((Date.now() - new Date(activeTimer.start_time).getTime()) / 1000);
        setTimerSeconds(elapsed);
        const id = setInterval(() => setTimerSeconds(s => s + 1), 1000);
        return () => clearInterval(id);
    }, [activeTimer]);

    const handleStop = async () => {
        try {
            await timeTrackingApi.stopTimer();
            setActiveTimer(null);
            await loadData();
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (id: string) => {
        try {
            await timeTrackingApi.deleteLog(id);
            setLogs(prev => prev.filter(l => l.id !== id));
        } catch (e) { console.error(e); }
    };

    const completedLogs = logs.filter(l => l.end_time);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const todaySeconds = completedLogs.filter(l => new Date(l.start_time) >= todayStart).reduce((a, l) => a + (l.duration_seconds ?? 0), 0);
    const weekSeconds = completedLogs.filter(l => new Date(l.start_time) >= weekStart).reduce((a, l) => a + (l.duration_seconds ?? 0), 0);
    const totalSeconds = completedLogs.reduce((a, l) => a + (l.duration_seconds ?? 0), 0);

    if (loading) {
        return (
            <>
                <WorkerNav />
                <div className="flex items-center justify-center min-h-[50vh]">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
                </div>
            </>
        );
    }

    return (
        <>
            <WorkerNav />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Time Tracking</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{completedLogs.length} logged entries</p>
                    </div>
                    <div className="flex gap-2">
                        {!activeTimer && (
                            <button onClick={() => setShowStartPicker(true)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary/90 transition-all">
                                <Play size={14} /> Start Timer
                            </button>
                        )}
                        <button onClick={() => setShowManual(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl hover:border-primary/40 transition-all">
                            <Plus size={14} /> Manual
                        </button>
                    </div>
                </div>

                {/* Active timer banner */}
                {activeTimer && (
                    <div className="flex items-center justify-between bg-primary/10 dark:bg-primary/20 border border-primary/20 rounded-2xl px-5 py-4">
                        <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                            <div>
                                <p className="font-bold text-primary text-sm">Timer running</p>
                                {activeTimer.task_title && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{activeTimer.task_title}</p>
                                )}
                            </div>
                            <span className="font-mono text-lg font-black text-primary">{formatDuration(timerSeconds)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {activeTimer.task_id && (
                                <button onClick={() => navigate(`/worker/tasks/${activeTimer.task_id}`)}
                                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                                    View task <ArrowRight size={12} />
                                </button>
                            )}
                            <button onClick={handleStop}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all">
                                <Square size={12} /> Stop
                            </button>
                        </div>
                    </div>
                )}

                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Today', value: todaySeconds },
                        { label: 'This Week', value: weekSeconds },
                        { label: 'All Time', value: totalSeconds },
                    ].map(({ label, value }) => (
                        <div key={label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 text-center">
                            <div className="text-xl font-black text-gray-900 dark:text-white">{formatDuration(value)}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{label}</div>
                        </div>
                    ))}
                </div>

                {/* Log Table */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                        <h2 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                            <Clock size={15} className="text-primary" /> Time Log
                        </h2>
                    </div>
                    {completedLogs.length === 0 ? (
                        <div className="py-16 text-center">
                            <Timer size={36} className="mx-auto text-gray-200 dark:text-gray-700 mb-3" />
                            <p className="text-gray-400 font-semibold">No time logs yet.</p>
                            <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Start a timer or add a manual entry.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50 dark:divide-gray-800">
                            {completedLogs.map(log => (
                                <div key={log.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">
                                                {log.task_title ?? 'Unknown Task'}
                                            </p>
                                            {log.is_manual && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded">manual</span>}
                                        </div>
                                        {log.project_name && <p className="text-[11px] text-gray-400">{log.project_name}</p>}
                                        {log.description && <p className="text-xs text-gray-500 mt-0.5">{log.description}</p>}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-sm font-black text-gray-900 dark:text-white">
                                            {formatDuration(log.duration_seconds ?? 0)}
                                        </div>
                                        <div className="text-[10px] text-gray-400">
                                            {new Date(log.start_time).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <button onClick={() => handleDelete(log.id)}
                                        className="text-gray-300 hover:text-red-500 transition-colors ml-2">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {showManual && (
                <ManualModal tasks={tasks} onSaved={loadData} onClose={() => setShowManual(false)} />
            )}
            {showStartPicker && (
                <StartTimerPicker tasks={tasks} onStarted={loadData} onClose={() => setShowStartPicker(false)} />
            )}
        </>
    );
};

export default TimeTrackingPage;
