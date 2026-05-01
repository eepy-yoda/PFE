import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, ArrowRight, Briefcase, AlertTriangle } from 'lucide-react';
import WorkerNav from '../../components/worker/WorkerNav';
import { projectsService, WorkerProject } from '../../../api/projects';

const STATUS_COLORS: Record<string, string> = {
    briefing:  'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
    planning:  'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    active:    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    completed: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    on_hold:   'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    delivered: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
    archived:  'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600',
};

const STATUS_LABELS: Record<string, string> = {
    briefing:  'Briefing',
    planning:  'Planning',
    active:    'Active',
    completed: 'Completed',
    on_hold:   'On Hold',
    delivered: 'Delivered',
    archived:  'Archived',
};

function isOverdue(project: WorkerProject): boolean {
    return (
        !!project.deadline &&
        new Date(project.deadline) < new Date() &&
        !['completed', 'delivered', 'archived'].includes(project.status)
    );
}

const WorkerProjectsPage: React.FC = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<WorkerProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        projectsService.getWorkerProjects()
            .then(setProjects)
            .catch(err => setError(err?.message ?? 'Failed to load projects'))
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        let list = [...projects];
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(p => p.name.toLowerCase().includes(q));
        }
        if (statusFilter !== 'all') {
            list = list.filter(p => p.status === statusFilter);
        }
        return list;
    }, [projects, search, statusFilter]);

    const uniqueStatuses = useMemo(
        () => Array.from(new Set(projects.map(p => p.status))),
        [projects]
    );

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

    if (error) {
        return (
            <>
                <WorkerNav />
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
                    <AlertTriangle size={40} className="mx-auto text-red-400 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 font-semibold">{error}</p>
                </div>
            </>
        );
    }

    return (
        <>
            <WorkerNav />
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">My Projects</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {filtered.length} project{filtered.length !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Search + filter */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search projects..."
                            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                    </div>
                    {uniqueStatuses.length > 1 && (
                        <div className="flex flex-wrap gap-2 items-center">
                            <button
                                onClick={() => setStatusFilter('all')}
                                className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all ${statusFilter === 'all' ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-primary/40'}`}
                            >
                                All
                            </button>
                            {uniqueStatuses.map(s => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s)}
                                    className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all ${statusFilter === s ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-primary/40'}`}
                                >
                                    {STATUS_LABELS[s] ?? s}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Project list */}
                {filtered.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl p-16 text-center">
                        <Briefcase size={40} className="mx-auto text-gray-200 dark:text-gray-700 mb-3" />
                        <p className="text-gray-400 dark:text-gray-600 font-semibold">
                            {projects.length === 0 ? 'No projects assigned yet.' : 'No projects match your filters.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map(project => {
                            const overdue = isOverdue(project);
                            return (
                                <div
                                    key={project.id}
                                    onClick={() => navigate(`/project/${project.id}`)}
                                    className={`bg-white dark:bg-gray-900 rounded-2xl border p-4 cursor-pointer hover:shadow-md transition-all group ${overdue ? 'border-red-200 dark:border-red-900/40' : 'border-gray-100 dark:border-gray-800 hover:border-primary/30'}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${STATUS_COLORS[project.status] ?? STATUS_COLORS.planning}`}>
                                                    {STATUS_LABELS[project.status] ?? project.status}
                                                </span>
                                                {overdue && (
                                                    <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                                                        <AlertTriangle size={10} /> Overdue
                                                    </span>
                                                )}
                                            </div>
                                            <p className="font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                                                {project.name}
                                            </p>
                                            <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-400 dark:text-gray-500">
                                                <span>
                                                    {project.assigned_task_count} / {project.task_count} task{project.task_count !== 1 ? 's' : ''} assigned to you
                                                </span>
                                                {project.deadline && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar size={10} />
                                                        {new Date(project.deadline).toLocaleDateString()}
                                                    </span>
                                                )}
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

export default WorkerProjectsPage;
