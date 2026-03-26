import React, { useState, useEffect } from 'react';
import { projectsService, type ManagerDashboardData } from '../../../api/projects';
import { useNavigate } from 'react-router-dom';
import ManagementBoard from '../../components/management/ManagementBoard';
import {
    LayoutDashboard, Users, MessageSquare, Briefcase,
    ArrowRight, RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Skeleton ──────────────────────────────────────────────────────────────────

const Skel = ({ cls = 'h-4 w-full' }: { cls?: string }) => (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl ${cls}`} />
);

// ── Main Component ────────────────────────────────────────────────────────────

const ManagerDashboard: React.FC = () => {
    const [dash, setDash] = useState<ManagerDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [view, setView] = useState<'overview' | 'workforce'>('overview');
    const navigate = useNavigate();

    const fetchDash = async (silent = false) => {
        if (!silent) setLoading(true); else setRefreshing(true);
        try {
            const data = await projectsService.getManagerDashboard();
            setDash(data);
        } catch (err) {
            console.error('Failed to fetch manager dashboard', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchDash(); }, []);

    const d = dash;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 transition-colors duration-300">

            {/* Header */}
            <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Manager Dashboard</h1>
                    <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">Full visibility over projects, team, and workload.</p>
                </div>
                <div className="flex items-center gap-3 self-center md:self-end">
                    <button
                        onClick={() => fetchDash(true)}
                        disabled={refreshing}
                        className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-primary hover:border-primary/40 transition-colors disabled:opacity-40"
                        title="Refresh dashboard"
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                    <div className="flex bg-white dark:bg-gray-900 p-1 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <button
                            onClick={() => setView('overview')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${view === 'overview' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                        >
                            <LayoutDashboard size={16} /> Overview
                        </button>
                        <button
                            onClick={() => setView('workforce')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${view === 'workforce' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                        >
                            <Users size={16} /> Workforce
                        </button>
                    </div>
                </div>
            </header>

            <AnimatePresence mode="wait">

                {/* ── Workforce Tab ── */}
                {view === 'workforce' ? (
                    <motion.div key="workforce" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                        <ManagementBoard
                            dashData={dash}
                            dashLoading={loading}
                            dashRefreshing={refreshing}
                            onRefresh={() => fetchDash(true)}
                        />
                    </motion.div>

                ) : (

                    /* ── Overview Tab ── */
                    <motion.div key="overview" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
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
                                <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-[32rem] overflow-y-auto">
                                    {loading ? (
                                        [1, 2, 3].map(i => <div key={i} className="p-5 space-y-2"><Skel cls="h-4 w-3/4" /><Skel cls="h-3 w-full" /><Skel cls="h-3 w-5/6" /></div>)
                                    ) : d && d.briefs.length > 0 ? (
                                        d.briefs.map(brief => (
                                            <div key={brief.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer" onClick={() => navigate(`/brief-review/${brief.id}`)}>
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className="font-bold text-gray-900 dark:text-white">{brief.name}</h3>
                                                    <span className="text-xs text-gray-400 shrink-0 ml-2">{new Date(brief.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-3">{brief.description || 'No description.'}</p>
                                                <div className="flex items-center gap-1 text-primary text-sm font-bold">Review Brief <ArrowRight size={14} /></div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-16 text-center text-gray-400 dark:text-gray-500 italic text-sm">No new briefs to review.</div>
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
                                <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-[32rem] overflow-y-auto">
                                    {loading ? (
                                        [1, 2, 3].map(i => <div key={i} className="p-5 space-y-2"><Skel cls="h-4 w-2/3" /><Skel cls="h-3 w-1/2" /></div>)
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
                                        <div className="p-16 text-center text-gray-400 dark:text-gray-500 italic text-sm">No active projects.</div>
                                    )}
                                </div>
                            </section>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ManagerDashboard;
