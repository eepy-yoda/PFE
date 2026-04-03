import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Briefcase, Clock, FileText, CheckCircle2,
    Plus, Search, ChevronRight, AlertCircle, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { projectsService } from '../../../api/projects';
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
};

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

    const loadProjects = () => {
        setLoading(true);
        projectsService.getMyBriefHistory()
            .then(setProjects)
            .catch(err => console.error('Failed to fetch projects', err))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadProjects(); }, []);

    // Segment projects
    const activeProjects  = projects.filter(p => ['briefing', 'planning', 'active', 'on_hold'].includes(p.status));
    const historyProjects = projects.filter(p => ['completed', 'delivered', 'archived'].includes(p.status));
    // Include interrupted so a crashed session still shows the resume banner
    const draftBriefs     = projects.filter(p =>
        ['draft', 'in_progress', 'interrupted'].includes(p.brief_status)
    );
    // For the resume button: prefer the most recently interrupted/in_progress one
    const resumeTarget    = draftBriefs.find(p => p.brief_status === 'interrupted')
                         ?? draftBriefs.find(p => p.brief_status === 'in_progress')
                         ?? draftBriefs[0];

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
                            <Plus size={18} /> New Request
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
                    <Stat icon={Briefcase}    label="Total Projects"   value={projects.length}         color="text-blue-500"   bg="bg-blue-50 dark:bg-blue-900/20" />
                    <Stat icon={Clock}        label="In Progress"      value={activeProjects.length}   color="text-amber-500"  bg="bg-amber-50 dark:bg-amber-900/20" />
                    <Stat icon={FileText}     label="Draft Briefs"     value={draftBriefs.length}      color="text-purple-500" bg="bg-purple-50 dark:bg-purple-900/20" />
                    <Stat icon={CheckCircle2} label="Delivered"        value={historyProjects.length}  color="text-green-500"  bg="bg-green-50 dark:bg-green-900/20" />
                </div>

                {/* Draft brief banner */}
                {draftBriefs.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center justify-between gap-4"
                    >
                        <div className="flex items-center gap-3">
                            <AlertCircle size={20} className="text-amber-500 shrink-0" />
                            <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                                You have {draftBriefs.length} incomplete brief{draftBriefs.length > 1 ? 's' : ''}.
                                {resumeTarget?.brief_status === 'interrupted' && ' Your last session was interrupted — your answers are saved.'}
                            </p>
                        </div>
                        <button
                            onClick={() => navigate(
                                resumeTarget ? `/guided-brief?resume=${resumeTarget.id}` : '/guided-brief'
                            )}
                            className="text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-4 py-2 rounded-xl hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors whitespace-nowrap"
                        >
                            {resumeTarget?.brief_status === 'interrupted' ? 'Continue Brief' : 'Resume Brief'}
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

                                        <div className="flex items-center gap-5 shrink-0">
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
                                            <ChevronRight size={18} className="text-gray-300 dark:text-gray-600 group-hover:text-primary transition-colors" />
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ClientDashboard;
