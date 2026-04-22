import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search, Filter, ChevronDown, ArrowUpDown, AlertTriangle,
    Clock, CheckCircle2, RotateCcw, Send, Calendar, ArrowRight,
} from 'lucide-react';
import WorkerNav from '../../components/worker/WorkerNav';
import { projectsService } from '../../../api/projects';
import type { Task, TaskStatus } from '../../../types';

// ── constants ─────────────────────────────────────────────────────────────────

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

const PRIORITY_DOT: Record<string, string> = {
    urgent: 'bg-red-500',
    high:   'bg-orange-500',
    medium: 'bg-yellow-400',
    low:    'bg-gray-300',
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: 'all', label: 'All Statuses' },
    { value: 'todo', label: 'New' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'under_ai_review', label: 'Under Review' },
    { value: 'revision_requested', label: 'Revision Requested' },
    { value: 'approved', label: 'Approved' },
    { value: 'completed', label: 'Completed' },
    { value: 'late', label: 'Overdue' },
];

const PRIORITY_OPTIONS = ['all', 'urgent', 'high', 'medium', 'low'];

const SORT_OPTIONS = [
    { value: 'deadline_asc', label: 'Deadline (soonest)' },
    { value: 'deadline_desc', label: 'Deadline (latest)' },
    { value: 'priority', label: 'Priority' },
    { value: 'updated', label: 'Recently Updated' },
    { value: 'created', label: 'Recently Assigned' },
];

// ── helpers ───────────────────────────────────────────────────────────────────

function isOverdue(task: Task): boolean {
    return (
        !!task.deadline &&
        new Date(task.deadline) < new Date() &&
        !['completed', 'approved'].includes(task.status)
    );
}

function isDueToday(task: Task): boolean {
    if (!task.deadline) return false;
    const d = new Date(task.deadline);
    const now = new Date();
    return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate() &&
        !['completed', 'approved'].includes(task.status)
    );
}

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

// ── component ─────────────────────────────────────────────────────────────────

const MyTasksPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState(searchParams.get('filter') === 'overdue' ? 'late' : searchParams.get('filter') === 'revision' ? 'revision_requested' : searchParams.get('filter') === 'submitted' ? 'submitted' : searchParams.get('filter') === 'completed' ? 'completed' : searchParams.get('filter') === 'due_today' ? '_due_today' : 'all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [sort, setSort] = useState('deadline_asc');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        projectsService.getMyTasks()
            .then(setTasks)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        let list = [...tasks];

        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(t =>
                t.title.toLowerCase().includes(q) ||
                (t.project_name ?? '').toLowerCase().includes(q) ||
                (t.description ?? '').toLowerCase().includes(q)
            );
        }

        if (statusFilter === '_due_today') {
            list = list.filter(isDueToday);
        } else if (statusFilter === '_overdue') {
            list = list.filter(isOverdue);
        } else if (statusFilter !== 'all') {
            list = list.filter(t => t.status === statusFilter);
        }

        if (priorityFilter !== 'all') {
            list = list.filter(t => t.priority === priorityFilter);
        }

        list.sort((a, b) => {
            switch (sort) {
                case 'deadline_asc':
                    if (!a.deadline && !b.deadline) return 0;
                    if (!a.deadline) return 1;
                    if (!b.deadline) return -1;
                    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
                case 'deadline_desc':
                    if (!a.deadline && !b.deadline) return 0;
                    if (!a.deadline) return 1;
                    if (!b.deadline) return -1;
                    return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
                case 'priority':
                    return (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
                case 'updated':
                    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
                case 'created':
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                default:
                    return 0;
            }
        });

        return list;
    }, [tasks, search, statusFilter, priorityFilter, sort]);

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
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white">My Tasks</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{filtered.length} task{filtered.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>

                {/* Search + Filter bar */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search tasks..."
                            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border transition-all ${showFilters ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-primary/40'}`}
                    >
                        <Filter size={14} /> Filters
                    </button>
                    <div className="relative">
                        <select
                            value={sort}
                            onChange={e => setSort(e.target.value)}
                            className="appearance-none pl-3 pr-8 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none cursor-pointer"
                        >
                            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* Filter panel */}
                {showFilters && (
                    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex flex-wrap gap-4">
                        <div>
                            <label className="text-[10px] font-bold uppercase text-gray-400 mb-2 block">Status</label>
                            <div className="flex flex-wrap gap-2">
                                {STATUS_OPTIONS.map(o => (
                                    <button
                                        key={o.value}
                                        onClick={() => setStatusFilter(o.value)}
                                        className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all ${statusFilter === o.value ? 'bg-primary text-white border-primary' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-primary/40'}`}
                                    >
                                        {o.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-gray-400 mb-2 block">Priority</label>
                            <div className="flex flex-wrap gap-2">
                                {PRIORITY_OPTIONS.map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setPriorityFilter(p)}
                                        className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all capitalize ${priorityFilter === p ? 'bg-primary text-white border-primary' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-primary/40'}`}
                                    >
                                        {p === 'all' ? 'All' : p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Task List */}
                {filtered.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl p-16 text-center">
                        <CheckCircle2 size={40} className="mx-auto text-gray-200 dark:text-gray-700 mb-3" />
                        <p className="text-gray-400 dark:text-gray-600 font-semibold">No tasks match your filters.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map(task => {
                            const overdue = isOverdue(task);
                            const dueToday = isDueToday(task);
                            return (
                                <div
                                    key={task.id}
                                    onClick={() => navigate(`/worker/tasks/${task.id}`)}
                                    className={`bg-white dark:bg-gray-900 rounded-2xl border p-4 cursor-pointer hover:shadow-md transition-all group ${overdue ? 'border-red-200 dark:border-red-900/40' : dueToday ? 'border-amber-200 dark:border-amber-900/40' : 'border-gray-100 dark:border-gray-800 hover:border-primary/30'}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority] ?? 'bg-gray-300'}`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${STATUS_COLORS[task.status] ?? STATUS_COLORS.todo}`}>
                                                    {task.status.replace(/_/g, ' ')}
                                                </span>
                                                {overdue && <span className="text-[10px] font-bold text-red-500 flex items-center gap-1"><AlertTriangle size={10} /> Overdue</span>}
                                                {dueToday && !overdue && <span className="text-[10px] font-bold text-amber-500">Due Today</span>}
                                            </div>
                                            <p className="font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{task.title}</p>
                                            {task.description && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>
                                            )}
                                            <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400 dark:text-gray-500">
                                                {task.project_name && <span>{task.project_name}</span>}
                                                {task.deadline && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar size={10} />
                                                        {new Date(task.deadline).toLocaleDateString()}
                                                    </span>
                                                )}
                                                <span>Updated {new Date(task.updated_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <ArrowRight size={16} className="text-gray-300 group-hover:text-primary transition-colors shrink-0 mt-1" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
};

export default MyTasksPage;
