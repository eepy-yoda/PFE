import React, { useState } from 'react';
import {
    Users,
    ShieldCheck,
    CheckSquare,
    History,
    LayoutDashboard,
    AlertCircle, Trophy, DollarSign, Inbox, BarChart3,
    CheckCircle2, AlertTriangle, Zap, Target, Activity,
    RefreshCw, UserCheck, Circle, Star, MessageSquare, Briefcase, ArrowRight,
} from 'lucide-react';
import WorkerManagement from './WorkerManagement';
import RoleManagement from './RoleManagement';
import LogViewer from './LogViewer';
import TaskBoard from './TaskBoard';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { ManagerDashboardData, WorkerStat, WorkloadTaskItem, DashboardAlertItem } from '../../../api/projects';

// ── Skeleton ──────────────────────────────────────────────────────────────────

const Skel = ({ cls = 'h-4 w-full' }: { cls?: string }) => (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl ${cls}`} />
);

// ── KPI Card ─────────────────────────────────────────────────────────────────

interface KPICardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    sub?: string;
    color: string;
    iconColor: string;
    progress?: number;
    loading: boolean;
}

const KPICard: React.FC<KPICardProps> = ({ icon, label, value, sub, color, iconColor, progress, loading }) => (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm flex flex-col gap-3">
        {loading ? (
            <div className="space-y-2"><Skel cls="h-8 w-16" /><Skel cls="h-3 w-24" /></div>
        ) : (
            <>
                <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-2xl ${color} flex items-center justify-center ${iconColor}`}>{icon}</div>
                    {sub && <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{sub}</span>}
                </div>
                <div>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{value}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">{label}</p>
                </div>
                {progress !== undefined && (
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-primary transition-all duration-700" style={{ width: `${Math.min(progress, 100)}%` }} />
                    </div>
                )}
            </>
        )}
    </div>
);

// ── Worker Row ────────────────────────────────────────────────────────────────

const perfBadge = (score: number) => {
    if (score >= 75) return { label: 'High Performer', cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' };
    if (score >= 45) return { label: 'Medium', cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' };
    return { label: 'Low Performer', cls: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' };
};

const WorkerRow: React.FC<{ worker: WorkerStat; rank: number }> = ({ worker, rank }) => {
    const badge = perfBadge(worker.performance_score);
    const initials = worker.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return (
        <div className="flex items-center gap-4 py-3 px-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <span className="text-xs font-black text-gray-400 dark:text-gray-600 w-4 shrink-0">#{rank}</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-[11px] font-black shrink-0">{initials}</div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{worker.full_name}</p>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full shrink-0 ${badge.cls}`}>{badge.label}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                    <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                        <div
                            className={`h-1.5 rounded-full transition-all duration-700 ${worker.performance_score >= 75 ? 'bg-green-500' : worker.performance_score >= 45 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${Math.min(worker.performance_score, 100)}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 w-7 text-right shrink-0">{worker.performance_score}</span>
                </div>
            </div>
            <div className="text-right shrink-0">
                <p className="text-sm font-black text-gray-900 dark:text-white">{worker.completed_tasks}</p>
                <p className="text-[10px] text-gray-400">done</p>
            </div>
            {worker.avg_ai_score !== null && (
                <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-sm font-black text-primary">{worker.avg_ai_score}</p>
                    <p className="text-[10px] text-gray-400">AI avg</p>
                </div>
            )}
        </div>
    );
};

// ── Alert Row ─────────────────────────────────────────────────────────────────

const ALERT_ICONS: Record<string, React.ReactNode> = {
    late_task:     <AlertCircle size={13} />,
    low_ai_score:  <Star size={13} />,
    pending_brief: <MessageSquare size={13} />,
    unassigned:    <UserCheck size={13} />,
};

const ALERT_BADGE: Record<string, string> = {
    critical: 'bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400',
    warning:  'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    info:     'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
};

const AlertRow: React.FC<{ alert: DashboardAlertItem; onClick?: () => void }> = ({ alert, onClick }) => (
    <div
        className={`flex items-start gap-3 px-4 py-3 border-b last:border-b-0 border-gray-50 dark:border-gray-800/50 transition-colors ${onClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30' : ''}`}
        onClick={onClick}
    >
        <span className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${ALERT_BADGE[alert.priority]}`}>
            {ALERT_ICONS[alert.type] ?? <AlertTriangle size={13} />}
        </span>
        <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">{alert.title}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{alert.detail}</p>
        </div>
    </div>
);

// ── Workload Task Row ─────────────────────────────────────────────────────────

const WorkloadRow: React.FC<{ task: WorkloadTaskItem; variant: 'urgent' | 'near' }> = ({ task, variant }) => (
    <div className="flex items-center gap-3 py-2.5 px-4 border-b last:border-b-0 border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
        <Circle size={8} className={`shrink-0 fill-current ${variant === 'urgent' ? 'text-rose-500' : 'text-amber-400'}`} />
        <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{task.title}</p>
            {task.project_name && <p className="text-[10px] text-primary/70 font-bold truncate">{task.project_name}</p>}
        </div>
        {task.deadline && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${variant === 'urgent' ? 'bg-rose-100 dark:bg-rose-900/20 text-rose-600' : 'bg-amber-100 dark:bg-amber-900/20 text-amber-600'}`}>
                {variant === 'urgent' ? 'OVERDUE' : new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
        )}
    </div>
);

// ── Dashboard Overview Content ────────────────────────────────────────────────

interface DashOverviewProps {
    d: ManagerDashboardData | null;
    loading: boolean;
    refreshing: boolean;
    onRefresh: () => void;
}

const DashOverview: React.FC<DashOverviewProps> = ({ d, loading, refreshing, onRefresh }) => {
    const navigate = useNavigate();
    return (
        <div className="space-y-8">
            {/* Refresh button */}
            <div className="flex justify-end">
                <button
                    onClick={onRefresh}
                    disabled={refreshing}
                    className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-primary hover:border-primary/40 transition-colors disabled:opacity-40"
                    title="Refresh"
                >
                    <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Row 1 — KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard loading={loading} icon={<Activity size={18} />} label="Total Tasks" value={d?.kpi_total_tasks ?? 0} color="bg-primary/10" iconColor="text-primary" />
                <KPICard loading={loading} icon={<Target size={18} />} label="Completion Rate" value={`${d?.kpi_completion_rate ?? 0}%`} color="bg-green-100 dark:bg-green-900/20" iconColor="text-green-600 dark:text-green-400" progress={d?.kpi_completion_rate} />
                <KPICard loading={loading} icon={<Zap size={18} />} label="Avg AI Score" value={d?.kpi_avg_ai_score != null ? `${d.kpi_avg_ai_score}/100` : 'N/A'} color="bg-violet-100 dark:bg-violet-900/20" iconColor="text-violet-600 dark:text-violet-400" progress={d?.kpi_avg_ai_score ?? undefined} />
                <KPICard loading={loading} icon={<Users size={18} />} label="Active Workers" value={d?.kpi_active_workers ?? 0} color="bg-amber-100 dark:bg-amber-900/20" iconColor="text-amber-600 dark:text-amber-400" />
            </div>

            {/* Row 2 — Project Snapshot */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 size={16} className="text-primary" />
                    <h3 className="text-sm font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">Project Overview</h3>
                    {!loading && d && <span className="text-xs text-gray-400 ml-auto">{d.projects.total} total</span>}
                </div>
                {loading ? (
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">{[...Array(6)].map((_, i) => <Skel key={i} cls="h-14" />)}</div>
                ) : d ? (
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                        {[
                            { label: 'Active',    val: d.projects.active,    col: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-900/20' },
                            { label: 'Completed', val: d.projects.completed,  col: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-900/20' },
                            { label: 'Delivered', val: d.projects.delivered,  col: 'text-violet-600 dark:text-violet-400',bg: 'bg-violet-50 dark:bg-violet-900/20' },
                            { label: 'On Hold',   val: d.projects.on_hold,    col: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-900/20' },
                            { label: 'Delayed',   val: d.projects.delayed,    col: 'text-rose-600 dark:text-rose-400',    bg: 'bg-rose-50 dark:bg-rose-900/20' },
                            { label: 'Briefs',    val: d.briefs.length,        col: 'text-sky-600 dark:text-sky-400',      bg: 'bg-sky-50 dark:bg-sky-900/20' },
                        ].map(({ label, val, col, bg }) => (
                            <div key={label} className={`${bg} rounded-2xl p-3 text-center`}>
                                <p className={`text-xl font-black ${col}`}>{val}</p>
                                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>

            {/* Row 3 — Workers + Revenue */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Top Workers */}
                <section className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/40">
                        <div className="flex items-center gap-2">
                            <Trophy size={18} className="text-amber-500" />
                            <h2 className="font-black text-gray-800 dark:text-gray-100">Top Workers</h2>
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500">performance score</span>
                    </div>
                    <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-72 overflow-y-auto">
                        {loading ? (
                            [1, 2, 3].map(i => <div key={i} className="px-5 py-3 flex gap-4"><Skel cls="h-8 w-8 rounded-xl" /><div className="flex-1 space-y-1.5"><Skel cls="h-3 w-32" /><Skel cls="h-2 w-full" /></div></div>)
                        ) : d && d.workers.length > 0 ? (
                            d.workers.map((w, i) => <WorkerRow key={w.user_id} worker={w} rank={i + 1} />)
                        ) : (
                            <div className="p-10 text-center text-gray-400 dark:text-gray-600 italic text-sm">No employee data yet.</div>
                        )}
                    </div>
                </section>

                {/* Revenue */}
                <section className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/40">
                        <div className="flex items-center gap-2">
                            <DollarSign size={18} className="text-green-500" />
                            <h2 className="font-black text-gray-800 dark:text-gray-100">Revenue Overview</h2>
                        </div>
                    </div>
                    {loading ? (
                        <div className="p-5 space-y-3"><Skel cls="h-20" /><Skel cls="h-12" /></div>
                    ) : d ? (
                        <>
                            <div className="grid grid-cols-3 gap-3 p-5">
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-3 text-center">
                                    <p className="text-2xl font-black text-green-600 dark:text-green-400">{d.revenue.paid_count}</p>
                                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-0.5">Paid</p>
                                </div>
                                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-3 text-center">
                                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{d.revenue.pending_count}</p>
                                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-0.5">Pending</p>
                                </div>
                                <div className="bg-rose-50 dark:bg-rose-900/20 rounded-2xl p-3 text-center">
                                    <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{d.revenue.overdue_count}</p>
                                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-0.5">Overdue</p>
                                </div>
                            </div>
                            {d.revenue.recently_paid.length > 0 ? (
                                <div className="border-t border-gray-50 dark:border-gray-800">
                                    <p className="px-5 pt-3 pb-1 text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">Recent Paid Projects</p>
                                    {d.revenue.recently_paid.map(p => (
                                        <div key={p.id} className="px-5 py-2.5 flex justify-between items-center border-b last:border-b-0 border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors cursor-pointer" onClick={() => navigate(`/project/${p.id}`)}>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">{p.name}</p>
                                                <p className="text-[10px] text-gray-400">{p.paid_at ? new Date(p.paid_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : new Date(p.updated_at).toLocaleDateString()}</p>
                                            </div>
                                            <span className="text-[10px] font-black uppercase bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">PAID</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="px-5 pb-5 text-center text-sm text-gray-400 italic">No paid projects yet.</p>
                            )}
                        </>
                    ) : null}
                </section>
            </div>

            {/* Row 4 — Workload + Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Task Workload */}
                <section className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
                        <div className="flex items-center gap-2 mb-3">
                            <Inbox size={18} className="text-blue-500" />
                            <h2 className="font-black text-gray-800 dark:text-gray-100">Task Workload</h2>
                        </div>
                        {!loading && d && (
                            <div className="flex gap-2 flex-wrap">
                                {[
                                    { l: 'Active',       v: d.workload.total,       cls: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300' },
                                    { l: 'To Do',        v: d.workload.todo,        cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
                                    { l: 'In Progress',  v: d.workload.in_progress, cls: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' },
                                ].map(({ l, v, cls }) => (
                                    <span key={l} className={`text-[10px] font-black px-2.5 py-1 rounded-full ${cls}`}>{v} {l}</span>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {loading ? (
                            <div className="p-5 space-y-2">{[1, 2, 3, 4].map(i => <Skel key={i} cls="h-10" />)}</div>
                        ) : d && (d.workload.urgent.length > 0 || d.workload.near_deadline.length > 0) ? (
                            <>
                                {d.workload.urgent.length > 0 && (
                                    <>
                                        <p className="px-4 pt-3 pb-1 text-[10px] font-black text-rose-500 uppercase tracking-widest">Overdue ({d.workload.urgent.length})</p>
                                        {d.workload.urgent.map(t => <WorkloadRow key={t.id} task={t} variant="urgent" />)}
                                    </>
                                )}
                                {d.workload.near_deadline.length > 0 && (
                                    <>
                                        <p className="px-4 pt-3 pb-1 text-[10px] font-black text-amber-500 uppercase tracking-widest">Due Soon ({d.workload.near_deadline.length})</p>
                                        {d.workload.near_deadline.map(t => <WorkloadRow key={t.id} task={t} variant="near" />)}
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="p-10 text-center text-gray-400 dark:text-gray-600 italic text-sm">
                                <CheckCircle2 size={32} className="mx-auto mb-2 text-green-400" />
                                All tasks are on schedule.
                            </div>
                        )}
                    </div>
                </section>

                {/* Alerts */}
                <section className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/40">
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={18} className="text-rose-500" />
                            <h2 className="font-black text-gray-800 dark:text-gray-100">Alerts</h2>
                        </div>
                        {!loading && d && d.alerts.length > 0 && (
                            <span className="bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-xs font-black px-2.5 py-1 rounded-full">{d.alerts.length}</span>
                        )}
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {loading ? (
                            <div className="p-5 space-y-2">{[1, 2, 3, 4].map(i => <Skel key={i} cls="h-12" />)}</div>
                        ) : d && d.alerts.length > 0 ? (
                            d.alerts.map((alert, idx) => (
                                <AlertRow
                                    key={idx}
                                    alert={alert}
                                    onClick={alert.entity_id ? () => navigate(`/project/${alert.entity_id}`) : undefined}
                                />
                            ))
                        ) : (
                            <div className="p-10 text-center text-gray-400 dark:text-gray-600 italic text-sm">
                                <CheckCircle2 size={32} className="mx-auto mb-2 text-green-400" />
                                No active alerts. All clear.
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Row 5 — New Briefs + Active Projects */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* New Briefs */}
                <section className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/40">
                        <div className="flex items-center gap-2">
                            <MessageSquare size={18} className="text-blue-500" />
                            <h2 className="font-black text-gray-800 dark:text-gray-100">New Briefs</h2>
                        </div>
                        {!loading && d && (
                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold px-2.5 py-1 rounded-full">{d.briefs.length} Pending</span>
                        )}
                    </div>
                    <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-72 overflow-y-auto">
                        {loading ? (
                            [1, 2].map(i => <div key={i} className="p-5 space-y-2"><Skel cls="h-4 w-3/4" /><Skel cls="h-3 w-full" /><Skel cls="h-3 w-5/6" /></div>)
                        ) : d && d.briefs.length > 0 ? (
                            d.briefs.map(brief => (
                                <div key={brief.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer" onClick={() => navigate(`/brief-review/${brief.id}`)}>
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-gray-900 dark:text-white">{brief.name}</h3>
                                        <span className="text-xs text-gray-400 shrink-0 ml-2">{new Date(brief.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-1 mb-3">{brief.description || 'No description.'}</p>
                                    <div className="flex items-center gap-1 text-primary text-sm font-bold">Review Brief <ArrowRight size={14} /></div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center text-gray-400 dark:text-gray-500 italic text-sm">No new briefs to review.</div>
                        )}
                    </div>
                </section>

                {/* Active Projects */}
                <section className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/40">
                        <div className="flex items-center gap-2">
                            <Briefcase size={18} className="text-indigo-500" />
                            <h2 className="font-black text-gray-800 dark:text-gray-100">Active Projects</h2>
                        </div>
                        {!loading && d && (
                            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-2.5 py-1 rounded-full">{d.active_projects.length} Running</span>
                        )}
                    </div>
                    <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-72 overflow-y-auto">
                        {loading ? (
                            [1, 2].map(i => <div key={i} className="p-5 space-y-2"><Skel cls="h-4 w-2/3" /><Skel cls="h-3 w-1/2" /></div>)
                        ) : d && d.active_projects.length > 0 ? (
                            d.active_projects.map(project => (
                                <div key={project.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer" onClick={() => navigate(`/project/${project.id}`)}>
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-gray-900 dark:text-white">{project.name}</h3>
                                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shrink-0 ml-2">
                                            {project.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                                        Deadline: {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'N/A'}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center text-gray-400 dark:text-gray-500 italic text-sm">No active projects.</div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────

type Tab = 'overview' | 'workers' | 'roles' | 'tasks' | 'logs';

interface ManagementBoardProps {
    dashData?: ManagerDashboardData | null;
    dashLoading?: boolean;
    dashRefreshing?: boolean;
    onRefresh?: () => void;
}

const ManagementBoard: React.FC<ManagementBoardProps> = ({
    dashData = null,
    dashLoading = false,
    dashRefreshing = false,
    onRefresh = () => {},
}) => {
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    const tabs = [
        { id: 'overview' as Tab, label: 'Overview', icon: LayoutDashboard },
        { id: 'workers' as Tab, label: 'Workers', icon: Users },
        { id: 'roles' as Tab, label: 'Roles', icon: ShieldCheck },
        { id: 'tasks' as Tab, label: 'Task Board', icon: CheckSquare },
        { id: 'logs' as Tab, label: 'Audit Logs', icon: History },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'workers': return <WorkerManagement />;
            case 'roles': return <RoleManagement />;
            case 'logs': return <LogViewer />;
            case 'tasks': return <TaskBoard />;
            default: return (
                <DashOverview
                    d={dashData}
                    loading={dashLoading}
                    refreshing={dashRefreshing}
                    onRefresh={onRefresh}
                />
            );
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/30 dark:bg-gray-950/30 transition-colors duration-500">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Navigation Header */}
                <header className="mb-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div>
                            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Workforce <span className="text-primary">Ops</span></h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">Advanced control board for your agency operations.</p>
                        </div>
                        <nav className="flex items-center gap-1 p-1 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-x-auto no-scrollbar">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                                        activeTab === tab.id
                                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                        : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    <tab.icon size={18} />
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                </header>

                {/* Main Content Area */}
                <main>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {renderContent()}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
};

export default ManagementBoard;
