import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { projectsService } from '../../../api/projects';
import { authService } from '../../../api/auth';
import { Task, TaskFeedback, TaskSubmission, Project } from '../../../types';
import SubmitWorkModal from '../../../components/SubmitWorkModal';
import AIAnalysisCard from '../../../components/AIAnalysisCard';
import { submissionsApi } from '../../../api/submissions';
import {
    CheckCircle2,
    Clock,
    AlertCircle,
    MessageSquare,
    Send,
    Play,
    X,
    Rocket,
    Eye,
    FolderOpen,
    LayoutDashboard,
    FileText,
    Calendar,
    ArrowUpRight,
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
    todo: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
    in_progress: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    submitted: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
    under_ai_review: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
    revision_requested: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
    approved: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    late: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
    active: 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400',
    planning: 'bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
};

type ActiveTab = 'dashboard' | 'projects';

// ── component ─────────────────────────────────────────────────────────────────

const WorkerDashboard: React.FC = () => {
    const navigate = useNavigate();
    const currentUserId = authService.getCurrentUser()?.id;

    // ── tab ──
    const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

    // ── tasks ──
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(true);

    // ── projects ──
    const [projects, setProjects] = useState<Project[]>([]);
    const [projectTasks, setProjectTasks] = useState<Record<string, Task[]>>({});
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [briefOpen, setBriefOpen] = useState<string | null>(null);

    // ── submit modal ──
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [selectedTaskBrief, setSelectedTaskBrief] = useState<string | undefined>(undefined);

    // ── feedback modal ──
    const [revisionModal, setRevisionModal] = useState<{ task: Task; feedbacks: TaskFeedback[]; latestSubmission?: TaskSubmission } | null>(null);
    const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);

    // ── fetch tasks ──────────────────────────────────────────────────────────
    useEffect(() => {
        projectsService.getMyTasks()
            .then(setTasks)
            .catch(err => console.error('Failed to fetch tasks', err))
            .finally(() => setLoadingTasks(false));
    }, []);

    // ── fetch projects when tab selected ────────────────────────────────────
    useEffect(() => {
        if (activeTab !== 'projects') return;
        setLoadingProjects(true);
        projectsService.getWorkerProjects()
            .then(async (projs) => {
                setProjects(projs);
                // Fetch tasks per project in parallel
                const entries = await Promise.all(
                    projs.map(async (p) => {
                        try {
                            const t = await projectsService.getTasksByProject(p.id);
                            return [p.id, t] as [string, Task[]];
                        } catch {
                            return [p.id, []] as [string, Task[]];
                        }
                    })
                );
                setProjectTasks(Object.fromEntries(entries));
            })
            .catch(err => console.error('Failed to fetch projects', err))
            .finally(() => setLoadingProjects(false));
    }, [activeTab]);

    const openSubmitModal = (task: Task, brief?: string) => {
        setSelectedTask(task);
        setSelectedTaskBrief(brief);
    };

    // ── view feedback + AI analysis ──────────────────────────────────────────
    const handleViewFeedback = async (task: Task) => {
        setFeedbackLoading(task.id);
        try {
            const [feedbacks, submissions] = await Promise.allSettled([
                projectsService.getTaskFeedbacks(task.id),
                submissionsApi.getForTask(task.id),
            ]);
            const fb = feedbacks.status === 'fulfilled' ? feedbacks.value : [];
            const subs = submissions.status === 'fulfilled' ? submissions.value : [];
            // Latest submission with AI analysis (most recent first)
            const latestWithAI = subs.find(s => s.ai_analysis_result);
            setRevisionModal({ task, feedbacks: fb, latestSubmission: latestWithAI ?? subs[0] });
        } catch {
            setRevisionModal({ task, feedbacks: [] });
        } finally {
            setFeedbackLoading(null);
        }
    };

    // ── derived ──────────────────────────────────────────────────────────────
    const todoTasks = tasks.filter(t => ['todo', 'revision_requested', 'late'].includes(t.status));
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const submittedTasks = tasks.filter(t => ['submitted', 'under_ai_review'].includes(t.status));
    const completedTasks = tasks.filter(t => ['completed', 'approved'].includes(t.status));

    if (loadingTasks) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 transition-colors duration-300">

            {/* ── Header ── */}
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Worker Dashboard</h1>
                    <p className="mt-1 text-gray-500 dark:text-gray-400">Manage your tasks, submit deliverables, and track project progress.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{completedTasks.length} Done</span>
                    </div>
                    <div className="px-4 py-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{todoTasks.length + inProgressTasks.length} Active</span>
                    </div>
                </div>
            </header>

            {/* ── Tabs ── */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800/60 rounded-2xl mb-8 w-fit">
                {([['dashboard', <LayoutDashboard size={16} />, 'My Tasks'], ['projects', <FolderOpen size={16} />, 'My Projects']] as const).map(([tab, icon, label]) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as ActiveTab)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === tab
                            ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                    >
                        {icon}{label}
                    </button>
                ))}
            </div>

            {/* ════════════════════════════ DASHBOARD TAB ════════════════════════════ */}
            {activeTab === 'dashboard' && (
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                    <div className="xl:col-span-3 space-y-8">

                        {/* In-Progress Tasks */}
                        {inProgressTasks.length > 0 && (
                            <div className="space-y-4">
                                <span className="text-xs font-bold text-primary uppercase tracking-widest">In Progress ({inProgressTasks.length})</span>
                                {inProgressTasks.map((task, idx) => (
                                    <section key={task.id} className={`rounded-3xl border p-6 relative overflow-hidden ${idx === 0 ? 'bg-gradient-to-br from-primary/5 to-blue-500/5 dark:from-primary/10 dark:to-blue-500/10 border-primary/10 dark:border-primary/20' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'}`}>
                                        {idx === 0 && <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none"><Clock size={80} className="text-primary" /></div>}
                                        <div className="relative z-10">
                                            {idx === 0 && <span className="text-xs font-bold text-primary uppercase tracking-widest mb-2 block">Current Focus</span>}
                                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{task.title}</h2>
                                            {task.description && <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">{task.description}</p>}
                                            <div className="flex items-center gap-4 mt-3">
                                                <button
                                                    onClick={() => openSubmitModal(task, task.project_brief)}
                                                    className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20 text-sm"
                                                >
                                                    <Send size={16} /> Submit Work
                                                </button>
                                                <span className="text-xs text-gray-400 font-medium">
                                                    Due: {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
                                                </span>
                                            </div>
                                        </div>
                                    </section>
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* To Do */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={16} /> To Be Done ({todoTasks.length})
                                </h3>
                                {todoTasks.map(task => (
                                    <div
                                        key={task.id}
                                        className={`bg-white dark:bg-gray-900 p-5 rounded-2xl border shadow-sm hover:border-primary/20 dark:hover:border-primary/40 transition-all cursor-pointer group ${task.status === 'revision_requested' ? 'border-rose-200 dark:border-rose-900/50' : 'border-gray-100 dark:border-gray-800'}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{task.title}</h4>
                                            {task.status === 'revision_requested' && <AlertCircle size={16} className="text-rose-500 flex-shrink-0" />}
                                        </div>
                                        <p className="text-gray-500 dark:text-gray-400 text-xs line-clamp-2 mb-4">{task.description}</p>
                                        {task.status === 'revision_requested' && (
                                            <button
                                                onClick={() => handleViewFeedback(task)}
                                                disabled={feedbackLoading === task.id}
                                                className="w-full mb-3 flex items-center justify-center gap-1.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl px-3 py-2 uppercase tracking-widest transition-colors disabled:opacity-50"
                                            >
                                                <Eye size={12} />
                                                {feedbackLoading === task.id ? 'Loading…' : 'View AI Review & Feedback'}
                                            </button>
                                        )}
                                        <div className="flex items-center justify-between">
                                            <button
                                                onClick={async () => {
                                                    await projectsService.updateTask(task.id, { status: 'in_progress' });
                                                    setTasks(await projectsService.getMyTasks());
                                                }}
                                                className="text-[10px] font-bold text-gray-400 dark:text-gray-500 group-hover:text-primary uppercase tracking-widest flex items-center gap-1"
                                            >
                                                <Play size={10} /> Start Work
                                            </button>
                                            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-600">
                                                {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {todoTasks.length === 0 && (
                                    <div className="p-8 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl text-gray-300 dark:text-gray-700 italic text-sm">
                                        All caught up!
                                    </div>
                                )}
                            </div>

                            {/* Under Review */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <CheckCircle2 size={16} /> Under Review ({submittedTasks.length})
                                </h3>
                                {submittedTasks.map(task => (
                                    <div key={task.id} className="bg-gray-50/50 dark:bg-gray-800/20 p-5 rounded-2xl border border-gray-100/50 dark:border-gray-800/50 opacity-75">
                                        <h4 className="font-bold text-gray-700 dark:text-gray-300">{task.title}</h4>
                                        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Submitted on {new Date(task.updated_at).toLocaleDateString()}</p>
                                        <div className="mt-4 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                                {task.status === 'under_ai_review' ? 'AI Reviewing…' : 'Manager Reviewing'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {submittedTasks.length === 0 && (
                                    <div className="p-8 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl text-gray-300 dark:text-gray-700 italic text-sm">
                                        Nothing under review.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <aside className="space-y-6">
                        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <CheckCircle2 size={18} className="text-green-500" /> Recent Completions
                            </h3>
                            <div className="space-y-4">
                                {completedTasks.slice(0, 5).map(task => (
                                    <div key={task.id} className="flex gap-3">
                                        <div className="w-1 h-10 bg-green-100 dark:bg-green-900/30 rounded-full" />
                                        <div>
                                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200 line-clamp-1">{task.title}</p>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(task.updated_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))}
                                {completedTasks.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-600 italic">No completed tasks yet.</p>}
                            </div>
                        </section>

                        <div className="bg-gray-900 dark:bg-gray-950 rounded-2xl p-6 text-white overflow-hidden relative shadow-xl shadow-gray-900/20">
                            <div className="absolute -right-4 -bottom-4 opacity-10">
                                <Rocket size={100} />
                            </div>
                            <h4 className="font-bold mb-2">My Performance</h4>
                            {(() => {
                                const total = tasks.length;
                                const done = completedTasks.length;
                                const rate = total > 0 ? Math.round((done / total) * 100) : 0;
                                return (
                                    <>
                                        <div className="text-3xl font-bold text-primary mb-1">{rate}%</div>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Completion Rate</p>
                                        <div className="w-full bg-gray-800 rounded-full h-1 mt-2">
                                            <div className="bg-primary h-1 rounded-full transition-all" style={{ width: `${rate}%` }} />
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </aside>
                </div>
            )}

            {/* ════════════════════════════ PROJECTS TAB ═════════════════════════════ */}
            {activeTab === 'projects' && (
                <div>
                    {loadingProjects ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                            <FolderOpen size={48} className="mx-auto text-gray-200 dark:text-gray-700 mb-4" />
                            <p className="text-gray-400 dark:text-gray-500 font-bold text-lg">No projects assigned yet.</p>
                            <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">Projects appear here once a manager assigns you a task.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {projects.map(project => {
                                const ptasks = projectTasks[project.id] || [];
                                const myTasks = ptasks.filter(t => t.assigned_to === currentUserId);
                                const done = myTasks.filter(t => ['completed', 'approved'].includes(t.status)).length;
                                const progress = myTasks.length ? Math.round((done / myTasks.length) * 100) : 0;
                                const isBriefOpen = briefOpen === project.id;

                                return (
                                    <div key={project.id} className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                                        {/* Project Header */}
                                        <div className="p-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${STATUS_COLORS[project.status] || STATUS_COLORS.planning}`}>
                                                        {project.status.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">#{project.id.slice(0, 8)}</span>
                                                </div>
                                                <h2 className="text-xl font-black text-gray-900 dark:text-white mb-1 truncate">{project.name}</h2>
                                                {project.description && (
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{project.description}</p>
                                                )}
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                                                        <Calendar size={13} />
                                                        {project.deadline ? new Date(project.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No deadline'}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                                                        <CheckCircle2 size={13} />
                                                        {done}/{myTasks.length} tasks done
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {project.brief_content && (
                                                    <button
                                                        onClick={() => setBriefOpen(isBriefOpen ? null : project.id)}
                                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors border ${isBriefOpen
                                                            ? 'bg-primary text-white border-primary'
                                                            : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-primary/40'
                                                        }`}
                                                    >
                                                        <FileText size={13} /> Brief
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => navigate(`/project/${project.id}`)}
                                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-primary/40 transition-colors"
                                                >
                                                    <ArrowUpRight size={13} /> View
                                                </button>
                                            </div>
                                        </div>

                                        {/* Progress bar */}
                                        <div className="px-6 pb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                                                </div>
                                                <span className="text-xs font-bold text-primary w-8 text-right">{progress}%</span>
                                            </div>
                                        </div>

                                        {/* Brief Panel (collapsible) */}
                                        <AnimatePresence>
                                            {isBriefOpen && project.brief_content && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="overflow-hidden border-t border-gray-100 dark:border-gray-800"
                                                >
                                                    <div className="p-6 bg-amber-50/40 dark:bg-amber-900/10">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <FileText size={14} className="text-amber-600 dark:text-amber-400" />
                                                            <span className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Client Brief (read-only)</span>
                                                        </div>
                                                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-amber-100 dark:border-amber-900/30 max-h-80 overflow-y-auto">
                                                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{project.brief_content}</p>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Task List */}
                                        {myTasks.length > 0 && (
                                            <div className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800/50">
                                                {myTasks.map(task => (
                                                    <div key={task.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${['completed', 'approved'].includes(task.status) ? 'bg-green-500' : task.status === 'in_progress' ? 'bg-blue-500' : task.status === 'revision_requested' ? 'bg-rose-500' : 'bg-gray-300'}`} />
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{task.title}</p>
                                                                {task.deadline && (
                                                                    <p className="text-[10px] text-gray-400 dark:text-gray-500">Due {new Date(task.deadline).toLocaleDateString()}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${STATUS_COLORS[task.status] || STATUS_COLORS.todo}`}>
                                                                {task.status.replace(/_/g, ' ')}
                                                            </span>
                                                            {task.status === 'in_progress' && (
                                                                <button
                                                                    onClick={() => openSubmitModal(task, task.project_brief)}
                                                                    className="text-[10px] font-bold text-primary bg-primary/5 hover:bg-primary/10 px-2.5 py-1 rounded-full transition-colors flex items-center gap-1"
                                                                >
                                                                    <Send size={10} /> Submit
                                                                </button>
                                                            )}
                                                            {(['revision_requested', 'approved', 'completed'].includes(task.status)) && (
                                                                <button
                                                                    onClick={() => { setActiveTab('dashboard'); handleViewFeedback(task); }}
                                                                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors ${
                                                                        task.status === 'revision_requested'
                                                                            ? 'text-rose-500 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30'
                                                                            : 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                                                                    }`}
                                                                >
                                                                    {task.status === 'revision_requested' ? 'Feedback' : 'View Review'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════════════════ SUBMIT MODAL ══════════════════════════════ */}
            <AnimatePresence>
                {selectedTask && (
                    <SubmitWorkModal
                        task={selectedTask}
                        projectBrief={selectedTaskBrief}
                        onClose={() => setSelectedTask(null)}
                        onSuccess={async () => {
                            const updated = await projectsService.getMyTasks();
                            setTasks(updated);
                        }}
                    />
                )}
            </AnimatePresence>

            {/* ════════════════════════ REVISION FEEDBACK MODAL ══════════════════════ */}
            <AnimatePresence>
                {revisionModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100 dark:border-gray-800"
                        >
<div className={`p-8 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center ${
                                    (['approved', 'completed'].includes(revisionModal.task.status))
                                        ? 'bg-emerald-50/30 dark:bg-emerald-900/10'
                                        : 'bg-rose-50/30 dark:bg-rose-900/10'
                                }`}>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            {(['approved', 'completed'].includes(revisionModal.task.status))
                                                ? <CheckCircle2 size={16} className="text-emerald-500" />
                                                : <AlertCircle size={16} className="text-rose-500" />
                                            }
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${
                                                (['approved', 'completed'].includes(revisionModal.task.status))
                                                    ? 'text-emerald-500'
                                                    : 'text-rose-500'
                                            }`}>
                                                AI Review & Feedback
                                            </span>
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{revisionModal.task.title}</h2>
                                    </div>
                                    <button onClick={() => setRevisionModal(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                                        <X size={20} className="text-gray-400" />
                                    </button>
                                </div>
                            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                                {/* AI Analysis */}
                                {revisionModal.latestSubmission?.ai_analysis_result && (
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest flex items-center gap-2 mb-3">
                                            <span className="text-violet-500">⚡</span> AI Review Result
                                        </h3>
                                        <AIAnalysisCard aiAnalysisResult={revisionModal.latestSubmission.ai_analysis_result} />
                                    </div>
                                )}

                                {/* Manager Feedback */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest flex items-center gap-2 mb-3">
                                        <MessageSquare size={14} /> Manager Feedback
                                    </h3>
                                    {revisionModal.feedbacks.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400 dark:text-gray-600 text-sm italic">
                                            No manager feedback yet.
                                        </div>
                                    ) : (
                                        revisionModal.feedbacks.map(fb => (
                                            <div key={fb.id} className={`${
                                                fb.is_revision_request
                                                    ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30'
                                                    : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30'
                                            } border rounded-2xl p-5 mb-3`}>
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className={`text-[10px] font-bold text-white px-2.5 py-1 rounded-full uppercase tracking-widest ${
                                                        fb.is_revision_request ? 'bg-rose-500' : 'bg-emerald-500'
                                                    }`}>
                                                        {fb.is_revision_request ? 'Revision Required' : 'Approval Feedback'}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">
                                                        {new Date(fb.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{fb.message}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                            <div className="p-6 bg-gray-50/50 dark:bg-gray-800/50 flex justify-end">
                                <button
                                    onClick={() => setRevisionModal(null)}
                                    className="px-6 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 transition-all text-sm"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WorkerDashboard;
