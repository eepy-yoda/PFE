import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle2, Clock, AlertTriangle, RotateCcw, Send,
    ArrowRight, TrendingUp, Calendar, MessageSquare,
    RefreshCw, Zap, Upload,
} from 'lucide-react';
import WorkerNav from '../../components/worker/WorkerNav';
import { workerApi } from '../../../api/worker';
import type { WorkerDashboardSummary } from '../../../types';

// ── helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
    todo:               'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
    in_progress:        'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    submitted:          'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
    under_ai_review:    'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
    revision_requested: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
    approved:           'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    completed:          'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    late:               'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
};

const PRIORITY_COLORS: Record<string, string> = {
    urgent: 'text-red-500',
    high:   'text-orange-500',
    medium: 'text-yellow-500',
    low:    'text-gray-400',
};

function deadlineLabel(iso?: string): string {
    if (!iso) return 'No deadline';
    const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    if (diff === 0) return 'Due today';
    if (diff === 1) return 'Due tomorrow';
    return `Due in ${diff}d`;
}

function deadlineColor(iso?: string): string {
    if (!iso) return 'text-gray-400';
    const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
    if (diff < 0) return 'text-red-500 font-bold';
    if (diff === 0) return 'text-orange-500 font-bold';
    if (diff <= 2) return 'text-amber-500';
    return 'text-gray-400 dark:text-gray-500';
}

// ── stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
    label: string;
    value: number;
    icon: React.ElementType;
    color: string;
    onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, color, onClick }) => (
    <button
        onClick={onClick}
        className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 text-left hover:shadow-md transition-all group ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
        <div className="flex items-center justify-between mb-3">
            <div className={`p-2 rounded-xl ${color}`}>
                <Icon size={18} />
            </div>
            {onClick && <ArrowRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />}
        </div>
        <div className="text-2xl font-black text-gray-900 dark:text-white">{value}</div>
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">{label}</div>
    </button>
);

// ── Skeleton ──────────────────────────────────────────────────────────────────

const Skel = ({ cls = 'h-4 w-full' }: { cls?: string }) => (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl ${cls}`} />
);

// ── component ─────────────────────────────────────────────────────────────────

const WorkerDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [summary, setSummary] = useState<WorkerDashboardSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true); else setRefreshing(true);
        setError(null);
        try {
            const data = await workerApi.getDashboardSummary();
            setSummary(data);
        } catch (e: any) {
            console.error('Failed to load worker summary', e);
            const msg = e?.response?.data?.detail ?? e?.message ?? 'Failed to load dashboard data.';
            setError(msg);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const stats = summary?.stats ?? { total: 0, active: 0, due_today: 0, overdue: 0, in_revision: 0, submitted: 0, completed: 0 };

    return (
        <>
            <WorkerNav />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 transition-colors duration-300">

                {/* Header */}
                <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">My Workspace</h1>
                        <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">
                            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 self-start md:self-end">
                        <button
                            onClick={() => navigate('/worker/tasks')}
                            className="flex items-center gap-2 bg-primary hover:bg-primary/90 active:scale-95 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-primary/20 transition-all"
                        >
                            <Upload size={16} />
                            Submit Work
                        </button>
                        <button
                            onClick={() => load(true)}
                            disabled={refreshing}
                            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-primary hover:border-primary/40 transition-colors disabled:opacity-40"
                            title="Refresh"
                        >
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </header>

                {/* Error banner */}
                {error && (
                    <div className="mb-6 flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
                        <AlertTriangle size={16} className="shrink-0" />
                        <span>{error}</span>
                        <button onClick={() => load()} className="ml-auto text-xs font-bold underline hover:no-underline">Retry</button>
                    </div>
                )}

                {/* Stat Cards */}
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-3">
                                <Skel cls="h-8 w-8 rounded-xl" />
                                <Skel cls="h-7 w-12" />
                                <Skel cls="h-3 w-20" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
                        <StatCard label="Total Tasks"  value={stats.total}       icon={CheckCircle2}  color="bg-gray-100 dark:bg-gray-800 text-gray-500"           onClick={() => navigate('/worker/tasks')} />
                        <StatCard label="Due Today"    value={stats.due_today}   icon={Calendar}      color="bg-amber-100 dark:bg-amber-900/30 text-amber-600"      onClick={() => navigate('/worker/tasks?filter=due_today')} />
                        <StatCard label="Overdue"      value={stats.overdue}     icon={AlertTriangle} color="bg-red-100 dark:bg-red-900/30 text-red-500"            onClick={() => navigate('/worker/tasks?filter=overdue')} />
                        <StatCard label="In Revision"  value={stats.in_revision} icon={RotateCcw}     color="bg-rose-100 dark:bg-rose-900/30 text-rose-500"         onClick={() => navigate('/worker/tasks?filter=revision')} />
                        <StatCard label="Submitted"    value={stats.submitted}   icon={Send}          color="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500"   onClick={() => navigate('/worker/tasks?filter=submitted')} />
                        <StatCard label="Completed"    value={stats.completed}   icon={CheckCircle2}  color="bg-green-100 dark:bg-green-900/30 text-green-600"      onClick={() => navigate('/worker/tasks?filter=completed')} />
                    </div>
                )}

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Priority Tasks */}
                    <section className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/40">
                            <div className="flex items-center gap-2">
                                <Zap size={18} className="text-amber-500" />
                                <h2 className="font-black text-gray-800 dark:text-gray-100">Priority Tasks</h2>
                            </div>
                            <button onClick={() => navigate('/worker/tasks')} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                                View all <ArrowRight size={12} />
                            </button>
                        </div>
                        <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-[32rem] overflow-y-auto">
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <div key={i} className="p-5 space-y-2">
                                        <Skel cls="h-4 w-3/4" />
                                        <Skel cls="h-3 w-1/2" />
                                    </div>
                                ))
                            ) : summary?.priority_tasks && summary.priority_tasks.length > 0 ? (
                                summary.priority_tasks.map(task => (
                                    <div
                                        key={task.id}
                                        onClick={() => navigate(`/worker/tasks/${task.id}`)}
                                        className="p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${STATUS_COLORS[task.status] ?? STATUS_COLORS.todo}`}>
                                                        {task.status.replace(/_/g, ' ')}
                                                    </span>
                                                    <span className={`text-[10px] font-semibold uppercase ${PRIORITY_COLORS[task.priority] ?? ''}`}>
                                                        {task.priority}
                                                    </span>
                                                </div>
                                                <p className="font-bold text-gray-900 dark:text-white text-sm hover:text-primary transition-colors truncate">
                                                    {task.title}
                                                </p>
                                                {task.project_name && (
                                                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{task.project_name}</p>
                                                )}
                                            </div>
                                            <span className={`text-[11px] shrink-0 ${deadlineColor(task.deadline)}`}>
                                                {deadlineLabel(task.deadline)}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-16 text-center text-gray-400 dark:text-gray-500 italic text-sm">
                                    No priority tasks right now.
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Right Column */}
                    <div className="space-y-6">

                        {/* Recent Feedback */}
                        <section className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/40">
                                <div className="flex items-center gap-2">
                                    <MessageSquare size={18} className="text-rose-500" />
                                    <h2 className="font-black text-gray-800 dark:text-gray-100">Recent Feedback</h2>
                                </div>
                                <button onClick={() => navigate('/worker/feedback')} className="text-xs font-bold text-primary hover:underline">
                                    View all
                                </button>
                            </div>
                            <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-64 overflow-y-auto">
                                {loading ? (
                                    [1, 2].map(i => <div key={i} className="p-5 space-y-2"><Skel cls="h-3 w-2/3" /><Skel cls="h-3 w-full" /></div>)
                                ) : summary?.recent_feedback && summary.recent_feedback.length > 0 ? (
                                    summary.recent_feedback.map(fb => (
                                        <div
                                            key={fb.id}
                                            onClick={() => navigate(`/worker/tasks/${fb.task_id}`)}
                                            className="p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                                        >
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${fb.is_revision_request ? 'bg-rose-500' : 'bg-green-500'}`} />
                                                <span className={`text-[10px] font-bold uppercase ${fb.is_revision_request ? 'text-rose-500' : 'text-green-600 dark:text-green-400'}`}>
                                                    {fb.is_revision_request ? 'Revision Required' : 'Approved'}
                                                </span>
                                                <span className="text-[10px] text-gray-400 ml-auto">
                                                    {new Date(fb.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{fb.message}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-16 text-center text-gray-400 dark:text-gray-500 italic text-sm">No feedback yet.</div>
                                )}
                            </div>
                        </section>

                        {/* Upcoming Deadlines */}
                        <section className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/40">
                                <div className="flex items-center gap-2">
                                    <Clock size={18} className="text-amber-500" />
                                    <h2 className="font-black text-gray-800 dark:text-gray-100">Upcoming Deadlines</h2>
                                </div>
                            </div>
                            <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-64 overflow-y-auto">
                                {loading ? (
                                    [1, 2].map(i => <div key={i} className="p-5 space-y-2"><Skel cls="h-4 w-2/3" /><Skel cls="h-3 w-1/3" /></div>)
                                ) : summary?.upcoming_deadlines && summary.upcoming_deadlines.length > 0 ? (
                                    summary.upcoming_deadlines.map(task => (
                                        <div
                                            key={task.id}
                                            onClick={() => navigate(`/worker/tasks/${task.id}`)}
                                            className="p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer flex items-center justify-between"
                                        >
                                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate flex-1 mr-3">{task.title}</p>
                                            <span className={`text-[11px] shrink-0 font-semibold ${deadlineColor(task.deadline)}`}>
                                                {deadlineLabel(task.deadline)}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-16 text-center text-gray-400 dark:text-gray-500 italic text-sm">No upcoming deadlines.</div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>

                {/* Bottom Row: Completion Rate */}
                {!loading && (
                    <div className="mt-6">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
                                    <TrendingUp size={15} className="text-primary" /> Completion Rate
                                </h3>
                                <span className="text-sm font-black text-primary">
                                    {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                                </span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary rounded-full transition-all duration-500"
                                    style={{ width: `${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%` }}
                                />
                            </div>
                            <div className="mt-2 flex gap-4 text-[11px] text-gray-400 dark:text-gray-500">
                                <span>{stats.completed} completed</span>
                                <span>{stats.active} active</span>
                                {stats.overdue > 0 && <span className="text-red-500">{stats.overdue} overdue</span>}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </>
    );
};

export default WorkerDashboard;
