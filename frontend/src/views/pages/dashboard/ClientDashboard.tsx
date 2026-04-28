import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Briefcase, Clock, FileText, CheckCircle2,
    Plus, Search, ChevronRight, AlertCircle, RefreshCw, Trash2, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { projectsService } from '../../../api/projects';
import { deleteBrief } from '../../../api/brief';
import type { Project } from '../../../types';

// ── Status helpers ────────────────────────────────────────────────────────────

const statusLabel: Record<string, string> = {
    briefing:   'Briefing',
    planning:   'Planning',
    active:     'Active',
    on_hold:    'On Hold',
    completed:  'Completed',
    delivered:  'Delivered',
    archived:   'Archived',
};

const statusColor: Record<string, string> = {
    briefing:  'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    planning:  'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    active:    'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    on_hold:   'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    completed: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    delivered: 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400',
    archived:  'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
};

const briefStatusColor: Record<string, string> = {
    draft:                    'text-gray-400',
    in_progress:              'text-amber-500',
    interrupted:              'text-rose-500',
    submitted:                'text-blue-500',
    clarification_requested:  'text-orange-500',
    validated:                'text-green-500',
    rejected:                 'text-red-500',
    converted:                'text-purple-500',
    failed_start:             'text-red-400',
};

const RESUMABLE_BRIEF_STATUSES = ['in_progress', 'interrupted'];

const progressPct = (p: Project): number => {
    if (p.status === 'delivered' || p.status === 'completed') return 100;
    if (p.status === 'active') return 65;
    if (p.status === 'planning') return 40;
    if (p.status === 'briefing') return 15;
    return 10;
};

// ── Stat card ─────────────────────────────────────────────────────────────────

const Stat: React.FC<{ icon: React.ElementType; label: string; value: string | number; color: string; bg: string }> =
    ({ icon: Icon, label, value, color, bg }) => (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className={`w-11 h-11 ${bg} ${color} rounded-xl flex items-center justify-center mb-4`}>
                <Icon size={22} />
            </div>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{value}</p>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-1">{label}</p>
        </div>
    );

// ── Main component ────────────────────────────────────────────────────────────

type Tab = 'active' | 'history';

const ClientDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState<Tab>('active');
    const [confirmTarget, setConfirmTarget] = useState<{ id: string; name: string } | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const loadProjects = () => {
        setLoading(true);
        projectsService.getMyBriefHistory()
            .then(setProjects)
            .catch(err => console.error('Failed to fetch projects', err))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadProjects(); }, []);

    const openConfirm = (e: React.MouseEvent, id: string, name: string) => {
        e.stopPropagation();
        setDeleteError(null);
        setConfirmTarget({ id, name });
    };

    const closeConfirm = () => {
        if (deleting) return;
        setConfirmTarget(null);
        setDeleteError(null);
    };

    const confirmDelete = async () => {
        if (!confirmTarget) return;
        setDeleting(true);
        setDeleteError(null);
        try {
            await deleteBrief(confirmTarget.id);
            setProjects(prev => prev.filter(p => p.id !== confirmTarget.id));
            setConfirmTarget(null);
        } catch (err: any) {
            setDeleteError(err?.response?.data?.detail ?? 'Failed to delete. Please try again.');
        } finally {
            setDeleting(false);
        }
    };

    // Segment projects
    const activeProjects  = projects.filter(p => ['briefing', 'planning', 'active', 'on_hold'].includes(p.status));
    const historyProjects = projects.filter(p => ['completed', 'delivered', 'archived'].includes(p.status));
    // Only in_progress/interrupted are genuinely resumable — draft = zombie/initializing, excluded
    const resumableBriefs = projects.filter(p => RESUMABLE_BRIEF_STATUSES.includes(p.brief_status));
    // Prefer interrupted (has saved answers) over in_progress
    const resumeTarget    = resumableBriefs.find(p => p.brief_status === 'interrupted')
                         ?? resumableBriefs[0];

    const displayed = (tab === 'active' ? activeProjects : historyProjects)
        .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-950 transition-colors duration-300">
            <main className="max-w-7xl mx-auto px-6 py-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">My Projects</h1>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Track your requests and project delivery in real time.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={loadProjects} className="p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-400 hover:text-primary transition-colors shadow-sm">
                            <RefreshCw size={18} />
                        </button>
                        <button
                            onClick={() => navigate('/guided-brief')}
                            className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center gap-2"
                        >
                            <Plus size={18} /> New Brief
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
                    <Stat icon={Briefcase}    label="Total Projects"   value={projects.length}          color="text-blue-500"   bg="bg-blue-50 dark:bg-blue-900/20" />
                    <Stat icon={Clock}        label="In Progress"      value={activeProjects.length}    color="text-amber-500"  bg="bg-amber-50 dark:bg-amber-900/20" />
                    <Stat icon={FileText}     label="Pending Briefs"   value={resumableBriefs.length}   color="text-purple-500" bg="bg-purple-50 dark:bg-purple-900/20" />
                    <Stat icon={CheckCircle2} label="Delivered"        value={historyProjects.length}   color="text-green-500"  bg="bg-green-50 dark:bg-green-900/20" />
                </div>

                {/* Resumable brief banner */}
                {resumableBriefs.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center justify-between gap-4"
                    >
                        <div className="flex items-center gap-3">
                            <AlertCircle size={20} className="text-amber-500 shrink-0" />
                            <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                                {resumeTarget?.brief_status === 'interrupted'
                                    ? `"${resumeTarget.name}" was interrupted — your answers are saved.`
                                    : `"${resumeTarget?.name}" brief is in progress.`
                                }
                            </p>
                        </div>
                        <button
                            onClick={() => navigate(`/guided-brief?resume=${resumeTarget!.id}`)}
                            className="text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-4 py-2 rounded-xl hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors whitespace-nowrap"
                        >
                            Continue Brief
                        </button>
                    </motion.div>
                )}

                {/* Tabs + Search */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Tabs */}
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
                            {(['active', 'history'] as Tab[]).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTab(t)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all capitalize ${tab === t ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                                >
                                    {t === 'active' ? `Active (${activeProjects.length})` : `History (${historyProjects.length})`}
                                </button>
                            ))}
                        </div>
                        {/* Search */}
                        <div className="relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search projects…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 dark:text-white w-52"
                            />
                        </div>
                    </div>

                    {/* Project List */}
                    <div className="divide-y divide-gray-50 dark:divide-gray-800">
                        {displayed.length === 0 ? (
                            <div className="py-20 text-center">
                                <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300 dark:text-gray-700">
                                    {tab === 'active' ? <Clock size={28} /> : <CheckCircle2 size={28} />}
                                </div>
                                <h3 className="text-base font-bold text-gray-600 dark:text-gray-400">
                                    {tab === 'active' ? 'No active projects' : 'No completed projects yet'}
                                </h3>
                                <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">
                                    {tab === 'active' ? 'Start a new request to get going.' : 'Finished projects will appear here.'}
                                </p>
                            </div>
                        ) : (
                            displayed.map(project => {
                                const pct = progressPct(project);
                                return (
                                    <motion.div
                                        key={project.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        onClick={() => navigate(`/project/${project.id}`)}
                                        className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-11 h-11 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
                                                <FileText size={20} />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors truncate">{project.name}</h3>
                                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                    <span className={`text-[10px] font-bold uppercase ${briefStatusColor[project.brief_status] || 'text-gray-400'}`}>
                                                        Brief: {project.brief_status.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-gray-300 dark:text-gray-700">·</span>
                                                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(project.created_at).toLocaleDateString()}</span>
                                                    {project.payment_status === 'fully_paid' && (
                                                        <>
                                                            <span className="text-gray-300 dark:text-gray-700">·</span>
                                                            <span className="text-[10px] font-bold text-green-500">Paid</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColor[project.status] || statusColor.archived}`}>
                                                {statusLabel[project.status] || project.status}
                                            </span>
                                            <div className="hidden md:flex flex-col gap-1 w-28">
                                                <div className="flex justify-between text-[10px] text-gray-400">
                                                    <span>Progress</span>
                                                    <span>{pct}%</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                            {RESUMABLE_BRIEF_STATUSES.includes(project.brief_status) && (
                                                <button
                                                    onClick={e => { e.stopPropagation(); navigate(`/guided-brief?resume=${project.id}`); }}
                                                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800 transition-colors whitespace-nowrap"
                                                >
                                                    Continue Brief
                                                </button>
                                            )}
                                            {(project.status === 'briefing' || project.status === 'planning') && (
                                                <button
                                                    onClick={e => openConfirm(e, project.id, project.name)}
                                                    title="Delete brief"
                                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            )}
                                            <ChevronRight size={18} className="text-gray-300 dark:text-gray-600 group-hover:text-primary transition-colors" />
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>
                </div>
            </main>

            {/* ── Delete confirmation modal ── */}
            <AnimatePresence>
                {confirmTarget && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeConfirm}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                        />

                        {/* Dialog */}
                        <motion.div
                            key="dialog"
                            initial={{ opacity: 0, scale: 0.95, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 8 }}
                            transition={{ duration: 0.15 }}
                            className="fixed z-50 inset-0 flex items-center justify-center p-4 pointer-events-none"
                        >
                            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-sm pointer-events-auto p-6">
                                {/* Icon */}
                                <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
                                    <Trash2 size={22} className="text-red-500" />
                                </div>

                                <h2 className="text-lg font-extrabold text-gray-900 dark:text-white mb-1">
                                    Delete brief?
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">"{confirmTarget.name}"</span> will be permanently deleted. This cannot be undone.
                                </p>

                                {/* Error */}
                                {deleteError && (
                                    <div className="mb-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5">
                                        <AlertCircle size={15} className="shrink-0" />
                                        {deleteError}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={closeConfirm}
                                        disabled={deleting}
                                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        disabled={deleting}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {deleting
                                            ? <><Loader2 size={15} className="animate-spin" /> Deleting…</>
                                            : 'Delete'
                                        }
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ClientDashboard;
