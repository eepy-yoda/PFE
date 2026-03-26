import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsService } from '../../api/projects';
import { managementService } from '../../api/management';
import { api } from '../../api/auth';
import { Project, Task, CurrentUser } from '../../types';
import useDashboardViewModel from '../../viewmodels/useDashboardViewModel';
import {
    Plus,
    Calendar,
    Clock,
    CheckCircle2,
    User as UserIcon,
    FileText,
    ChevronRight,
    Search,
    Filter,
    Activity,
    ArrowRight,
    MessageSquare,
    AlertTriangle,
    Send,
    X
} from 'lucide-react';

const ProjectDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isAdmin, isManager, isClient } = useDashboardViewModel();

    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [staff, setStaff] = useState<CurrentUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showTaskModal, setShowTaskModal] = useState(false);

    // Dependency Form State
    const [depForm, setDepForm] = useState({ task_id: '', depends_on_task_id: '' });
    const [depSaving, setDepSaving] = useState(false);

    // Feedback modal (manager → employee)
    const [feedbackModal, setFeedbackModal] = useState<{ task: Task } | null>(null);
    const [feedbackMsg, setFeedbackMsg] = useState('');
    const [isRevision, setIsRevision] = useState(true);
    const [feedbackSaving, setFeedbackSaving] = useState(false);

    // Task Form State
    const [taskForm, setTaskForm] = useState({
        title: '',
        description: '',
        assigned_to: '',
        deadline: '',
        priority: 'medium'
    });

    useEffect(() => {
        const fetchAll = async () => {
            if (!id) return;
            try {
                const [projData, taskData] = await Promise.all([
                    projectsService.getById(id),
                    projectsService.getTasksByProject(id)
                ]);
                setProject(projData);
                setTasks(taskData);

                if (isManager || isAdmin) {
                    const users = await managementService.getWorkers();
                    setStaff(users.filter(u => u.role === 'employee'));
                }
            } catch (err) {
                console.error("Failed to fetch project detail", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [id, isManager, isAdmin]);

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !project) return;
        try {
            // Build payload — only include optional fields if they have values
            const payload: Record<string, any> = {
                title: taskForm.title,
                project_id: id,
                priority: taskForm.priority,
            };
            if (taskForm.description) payload.description = taskForm.description;
            if (taskForm.assigned_to) payload.assigned_to = taskForm.assigned_to;
            // Convert local date string (YYYY-MM-DD) to ISO datetime string for the backend
            if (taskForm.deadline) payload.deadline = new Date(taskForm.deadline).toISOString();

            const newTask = await projectsService.createTask(payload);
            setTasks([...tasks, newTask]);
            setShowTaskModal(false);
            setTaskForm({ title: '', description: '', assigned_to: '', deadline: '', priority: 'medium' });
        } catch (err: any) {
            console.error("Failed to create task", err);
            const msg = err?.response?.data?.detail || "Error creating task. Please try again.";
            alert(msg);
        }
    };

    const handleAddDependency = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!depForm.task_id || !depForm.depends_on_task_id) return;
        if (depForm.task_id === depForm.depends_on_task_id) {
            alert('A task cannot depend on itself.');
            return;
        }
        setDepSaving(true);
        try {
            await api.post('/tasks/dependencies', {
                task_id: depForm.task_id,
                depends_on_task_id: depForm.depends_on_task_id,
            });
            alert('Dependency added successfully.');
            setDepForm({ task_id: '', depends_on_task_id: '' });
        } catch (err: unknown) {
            const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            alert(detail || 'Failed to add dependency.');
        } finally {
            setDepSaving(false);
        }
    };

    const handleSendFeedback = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedbackModal || !feedbackMsg.trim()) return;
        setFeedbackSaving(true);
        try {
            await projectsService.sendTaskFeedback(feedbackModal.task.id, {
                message: feedbackMsg,
                is_revision_request: isRevision,
            });
            // Refresh tasks so status badge updates
            const updated = await projectsService.getTasksByProject(id!);
            setTasks(updated);
            setFeedbackModal(null);
            setFeedbackMsg('');
            setIsRevision(true);
        } catch (err: unknown) {
            const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            alert(detail || 'Failed to send feedback.');
        } finally {
            setFeedbackSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!project) return <div className="p-20 text-center text-gray-400">Project Not Found</div>;

    const stats = {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'completed' || t.status === 'approved').length,
        pending: tasks.filter(t => t.status === 'todo' || t.status === 'in_progress' || t.status === 'revision_requested').length,
        progress: tasks.length === 0 ? 0 : Math.round((tasks.filter(t => t.status === 'completed' || t.status === 'approved').length / tasks.length) * 100)
    };

    return (
        <div className="bg-[#fcfdff] dark:bg-gray-950 min-h-screen pb-20 transition-colors duration-300">
            {/* Hero Header */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 pt-10 pb-12 shadow-sm transition-all duration-300">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-xs font-bold text-primary dark:text-primary uppercase tracking-widest bg-primary/5 dark:bg-primary/10 px-2.5 py-1 rounded-full">Project #{project.id.slice(0, 8)}</span>
                                <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full tracking-wider ${project.status === 'active' ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                                    }`}>
                                    {project.status.replace('_', ' ')}
                                </span>
                            </div>
                            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-3 tracking-tight">{project.name}</h1>
                            <p className="text-gray-500 dark:text-gray-400 max-w-2xl font-medium">{project.description}</p>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                            <div className="text-right mb-2 hidden md:block">
                                <div className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mb-1">Project Progress</div>
                                <div className="flex items-center gap-3">
                                    <div className="text-2xl font-black text-primary dark:text-primary">{stats.progress}%</div>
                                    <div className="w-48 h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded-full transition-all duration-700 ease-out shadow-lg shadow-primary/20"
                                            style={{ width: `${stats.progress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                            {(isManager || isAdmin) && (
                                <button
                                    onClick={() => setShowTaskModal(true)}
                                    className="bg-primary text-white px-6 py-3.5 rounded-2xl font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center gap-2 group"
                                >
                                    <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                                    <span>New Task Assignment</span>
                                </button>
                            )}
                            {isClient && ['draft', 'in_progress', 'interrupted'].includes(project.brief_status) && (
                                <button
                                    onClick={() => navigate(`/guided-brief?resume=${project.id}`)}
                                    className="bg-amber-500 text-white px-6 py-3.5 rounded-2xl font-bold shadow-xl shadow-amber-500/20 hover:shadow-amber-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2 group"
                                >
                                    <MessageSquare size={20} className="group-hover:scale-110 transition-transform duration-300" />
                                    <span>Continue Brief</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-10">
                    {/* Sidebar Project Stats & Deadlines */}
                    <div className="xl:col-span-1 space-y-8">
                        <section className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm">
                            <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                                <Activity size={14} className="text-primary dark:text-primary" /> Key Information
                            </h3>
                            <div className="space-y-8">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                        <Calendar size={24} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase mb-1">Project Deadline</p>
                                        <p className="font-bold text-gray-800 dark:text-gray-200">{project.deadline ? new Date(project.deadline).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'Flexible'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase mb-1">Tasks Completed</p>
                                        <p className="font-bold text-gray-800 dark:text-gray-200">{stats.completed} / {stats.total}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-10 pt-8 border-t border-gray-50 dark:border-gray-800">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Brief Clarity Review</span>
                                    <span className="text-xs font-bold text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded">High Clarity</span>
                                </div>
                                <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed font-medium">The brief was generated with AI analysis and passed manager review.</p>
                            </div>
                        </section>

                        {(isManager || isAdmin) && (
                            <section className="bg-gray-900 dark:bg-gray-950 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group border border-gray-800">
                                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                    <Activity size={120} />
                                </div>
                                <h3 className="font-bold text-xl mb-2 relative z-10">Brief Discovery</h3>
                                <p className="text-gray-400 text-sm mb-6 relative z-10 leading-relaxed">Access the original guided briefing answers to help your workers understand client expectations.</p>
                                <button
                                    onClick={() => navigate(`/brief-review/${project.id}`)}
                                    className="w-full bg-white text-gray-900 py-3.5 rounded-2xl font-black text-sm hover:shadow-lg transition-all relative z-10"
                                >
                                    Read Original Brief
                                </button>
                            </section>
                        )}

                        {/* Client: unfinished brief CTA */}
                        {isClient && ['draft', 'in_progress', 'interrupted'].includes(project.brief_status) && (
                            <section className="bg-amber-500 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group border border-amber-400">
                                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                    <MessageSquare size={120} />
                                </div>
                                <div className="flex items-center gap-2 mb-2 relative z-10">
                                    <AlertTriangle size={18} className="text-amber-100" />
                                    <span className="text-xs font-black uppercase tracking-widest text-amber-100">Brief Incomplete</span>
                                </div>
                                <h3 className="font-bold text-xl mb-2 relative z-10">Your Brief Isn't Done</h3>
                                <p className="text-amber-100 text-sm mb-6 relative z-10 leading-relaxed">
                                    You left the briefing early. Your progress was saved — pick up right where you left off.
                                </p>
                                <button
                                    onClick={() => navigate(`/guided-brief?resume=${project.id}`)}
                                    className="w-full bg-white text-amber-600 py-3.5 rounded-2xl font-black text-sm hover:shadow-lg transition-all relative z-10 flex items-center justify-center gap-2"
                                >
                                    <MessageSquare size={16} />
                                    Continue My Brief
                                </button>
                            </section>
                        )}
                    </div>

                    {/* Task List Section */}
                    <div className="xl:col-span-3 space-y-8">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Project Deliverables</h3>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search tasks..."
                                        className="pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm transition-all focus:ring-2 focus:ring-primary/20 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <button className="p-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-gray-500 hover:text-primary transition-colors">
                                    <Filter size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {tasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-primary/20 dark:hover:border-primary/40 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-6"
                                >
                                    <div className="flex gap-5 items-start">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${task.status === 'completed' || task.status === 'approved'
                                            ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                                            : task.status === 'in_progress'
                                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                                : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                                            }`}>
                                            {task.status === 'completed' || task.status === 'approved' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white text-lg group-hover:text-primary transition-colors duration-200">{task.title}</h4>
                                            <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-1 mt-0.5">{task.description}</p>
                                            <div className="flex flex-wrap items-center gap-4 mt-3">
                                                <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 font-bold bg-gray-50/50 dark:bg-gray-800/50 px-2 py-1 rounded">
                                                    <UserIcon size={12} />
                                                    {task.assigned_to ? 'Assigned' : 'Unassigned'}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 font-bold bg-gray-50/50 dark:bg-gray-800/50 px-2 py-1 rounded">
                                                    <Calendar size={12} />
                                                    Due: {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'TBD'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 self-end md:self-center">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border shadow-sm ${task.status === 'completed' || task.status === 'approved'
                                            ? 'bg-green-100/50 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                                            : task.status === 'in_progress'
                                                ? 'bg-blue-100/50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                                : task.status === 'submitted' || task.status === 'under_ai_review'
                                                    ? 'bg-indigo-100/50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                                    : task.status === 'revision_requested'
                                                        ? 'bg-rose-100/50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                                        : 'bg-gray-100/50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                                            }`}>
                                            {task.status.replace(/_/g, ' ')}
                                        </span>
                                        {(isManager || isAdmin) && ['submitted', 'under_ai_review', 'revision_requested'].includes(task.status) && (
                                            <button
                                                onClick={() => { setFeedbackModal({ task }); setFeedbackMsg(''); setIsRevision(true); }}
                                                title="Send feedback / request revision"
                                                className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors"
                                            >
                                                <MessageSquare size={18} />
                                            </button>
                                        )}
                                        <button className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {tasks.length === 0 && (
                                <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 border-dashed">
                                    <FileText size={48} className="mx-auto text-gray-200 dark:text-gray-700 mb-6" />
                                    <p className="text-gray-400 dark:text-gray-500 font-bold text-lg">No deliverables defined yet.</p>
                                    {(isManager || isAdmin) && <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Create the first task to get this project moving.</p>}
                                </div>
                            )}
                        </div>

                        {(isManager || isAdmin) && tasks.length >= 2 && (
                            <div className="mt-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <ArrowRight size={18} className="text-primary" /> Task Dependencies
                                </h3>
                                <form onSubmit={handleAddDependency} className="flex flex-col sm:flex-row gap-4 items-end">
                                    <div className="flex-1 space-y-1.5">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Task</label>
                                        <select
                                            required
                                            value={depForm.task_id}
                                            onChange={e => setDepForm({ ...depForm, task_id: e.target.value })}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        >
                                            <option value="">Select task…</option>
                                            {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                                        </select>
                                    </div>
                                    <div className="text-gray-400 text-sm font-bold pb-2.5">depends on</div>
                                    <div className="flex-1 space-y-1.5">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Prerequisite Task</label>
                                        <select
                                            required
                                            value={depForm.depends_on_task_id}
                                            onChange={e => setDepForm({ ...depForm, depends_on_task_id: e.target.value })}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        >
                                            <option value="">Select prerequisite…</option>
                                            {tasks.filter(t => t.id !== depForm.task_id).map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                                        </select>
                                    </div>
                                    <button type="submit" disabled={depSaving} className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all disabled:opacity-50 whitespace-nowrap pb-2.5">
                                        {depSaving ? 'Saving…' : 'Add Dependency'}
                                    </button>
                                </form>
                                <p className="text-xs text-gray-400 dark:text-gray-600 mt-3">Dependencies define which task must be completed before another can start.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Manager Feedback Modal */}
            {feedbackModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-800">
                        <form onSubmit={handleSendFeedback}>
                            <div className="px-8 py-6 border-b border-gray-50 dark:border-gray-800 flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <MessageSquare size={16} className="text-indigo-500" />
                                        <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Manager Feedback</span>
                                    </div>
                                    <h2 className="text-xl font-black text-gray-900 dark:text-white">{feedbackModal.task.title}</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFeedbackModal(null)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                                >
                                    <X size={20} className="text-gray-400" />
                                </button>
                            </div>
                            <div className="px-8 py-6 space-y-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Feedback Message</label>
                                    <textarea
                                        required
                                        rows={4}
                                        className="w-full bg-gray-50 dark:bg-gray-950 border-none rounded-2xl px-5 py-4 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all placeholder-gray-300 dark:placeholder-gray-700 resize-none"
                                        placeholder="Explain what needs to be changed or improved…"
                                        value={feedbackMsg}
                                        onChange={e => setFeedbackMsg(e.target.value)}
                                    />
                                </div>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div
                                        onClick={() => setIsRevision(r => !r)}
                                        className={`w-11 h-6 rounded-full transition-colors ${isRevision ? 'bg-rose-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                                    >
                                        <div className={`w-5 h-5 bg-white rounded-full shadow-sm mt-0.5 transition-all ${isRevision ? 'ml-5' : 'ml-0.5'}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">Request Revision</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">Task will be sent back to the employee for corrections</p>
                                    </div>
                                </label>
                            </div>
                            <div className="px-8 py-5 bg-gray-50/50 dark:bg-gray-800/50 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFeedbackModal(null)}
                                    className="flex-1 py-3.5 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 transition-all text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={feedbackSaving || !feedbackMsg.trim()}
                                    className="flex-[2] py-3.5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                                >
                                    {feedbackSaving ? 'Sending…' : <><Send size={16} /> Send Feedback</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Task Creation Modal */}
            {showTaskModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-gray-800 slide-in-from-bottom-8">
                        <form onSubmit={handleCreateTask}>
                            <div className="px-10 py-8 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-gray-50/30 dark:bg-gray-900/50">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Analyze & Assign Task</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Define a new work unit for this project.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowTaskModal(false)}
                                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 hover:rotate-90 transition-all duration-300"
                                >
                                    <ChevronRight size={24} className="rotate-45" />
                                </button>
                            </div>
                            <div className="p-10 space-y-8">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-1">Task Title</label>
                                    <input
                                        required
                                        className="w-full bg-gray-50 dark:bg-gray-950 border-none rounded-2xl px-5 py-4 text-base font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all placeholder-gray-300 dark:placeholder-gray-700"
                                        placeholder="e.g., Hero Component Final Polish"
                                        value={taskForm.title}
                                        onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-1">
                                        Instruction Details <span className="text-gray-300 dark:text-gray-600 font-medium normal-case">(optional)</span>
                                    </label>
                                    <textarea
                                        className="w-full bg-gray-50 dark:bg-gray-950 border-none rounded-3xl p-6 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary/20 transition-all placeholder-gray-300 dark:placeholder-gray-700 min-h-[120px]"
                                        placeholder="Add extra instructions... (the project brief is already included)"
                                        value={taskForm.description}
                                        onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                                            <UserIcon size={12} /> Assign to Staff
                                        </label>
                                        <select
                                            required
                                            className="w-full bg-gray-50 dark:bg-gray-950 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 dark:text-white appearance-none cursor-pointer focus:ring-2 focus:ring-primary/20"
                                            value={taskForm.assigned_to}
                                            onChange={e => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
                                        >
                                            <option value="">Select Employee</option>
                                            {staff.map(u => (
                                                <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                                            <Calendar size={12} /> Due Date <span className="text-gray-300 dark:text-gray-600 font-medium normal-case">(optional)</span>
                                        </label>
                                        <input
                                            type="date"
                                            className="w-full bg-gray-50 dark:bg-gray-950 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 cursor-pointer"
                                            value={taskForm.deadline}
                                            min={new Date().toISOString().split('T')[0]}
                                            onClick={e => (e.target as HTMLInputElement).showPicker?.()}
                                            onChange={e => setTaskForm({ ...taskForm, deadline: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="p-10 bg-gray-50/50 dark:bg-gray-900/50 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowTaskModal(false)}
                                    className="flex-1 py-4 border border-gray-200 dark:border-gray-800 rounded-2xl font-bold text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    Confirm Assignment
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectDetail;
