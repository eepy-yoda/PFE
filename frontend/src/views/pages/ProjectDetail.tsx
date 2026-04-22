import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { projectsService } from '../../api/projects';
import { managementService } from '../../api/management';
import { api } from '../../api/auth';
import { Project, Task, CurrentUser, TaskSubmission, TaskFeedback } from '../../types';
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
    X,
    Edit2,
    Zap,
    Star,
    ChevronDown,
} from 'lucide-react';
import SubmitWorkModal from '../../components/SubmitWorkModal';
import AIAnalysisCard from '../../components/AIAnalysisCard';
import { AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';

const ProjectDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { isAdmin, isManager, isClient, isEmployee } = useDashboardViewModel();

    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [staff, setStaff] = useState<CurrentUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showTaskModal, setShowTaskModal] = useState(false);

    // Work Submission Modal
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [selectedTaskBrief, setSelectedTaskBrief] = useState<string | undefined>(undefined);

    const openSubmitModal = (task: Task, brief?: string) => {
        setSelectedTask(task);
        setSelectedTaskBrief(brief);
    };

    // Task Detail / Edit Modal
    const [taskDetail, setTaskDetail] = useState<{ task: Task } | null>(null);
    const [detailSubs, setDetailSubs] = useState<TaskSubmission[]>([]);
    const [detailFeedbacks, setDetailFeedbacks] = useState<TaskFeedback[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState<{ title: string; description: string; assigned_to: string; deadline: string; priority: string; status: string }>({ title: '', description: '', assigned_to: '', deadline: '', priority: 'medium', status: 'todo' });
    const [editSaving, setEditSaving] = useState(false);

    // Client-safe deliverable viewer
    const [clientDeliverableModal, setClientDeliverableModal] = useState<{ task: Task; subs: TaskSubmission[] } | null>(null);
    const [clientDeliverableLoading, setClientDeliverableLoading] = useState(false);

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

    const handleProjectPaymentUpdate = async (field: string, value: any) => {
        if (!project) return;
        try {
            const updated = await projectsService.update(project.id, { [field]: value });
            setProject(updated);
        } catch (err) {
            console.error("Failed to update project payment", err);
            alert("Failed to update project payment");
        }
    };

    const handleTaskPaymentUpdate = async (taskId: string, payment_status: string) => {
        try {
            const updated = await projectsService.updateTask(taskId, { payment_status: payment_status as any });
            setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
        } catch (err) {
            console.error("Failed to update task payment", err);
            alert("Failed to update task payment");
        }
    };

    const handleDeliverWatermark = async (taskId: string) => {
        if (!project) return;
        try {
            await projectsService.partialDelivery(project.id, [taskId]);
            // refresh tasks
            const updated = await projectsService.getTasksByProject(project.id);
            setTasks(updated);
            alert("Watermark delivery triggered!");
        } catch (err) {
            console.error(err);
            alert("Failed to trigger watermark delivery. Ensure task has an approved submission.");
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

    const openDeliverableView = async (task: Task) => {
        setClientDeliverableLoading(true);
        setClientDeliverableModal({ task, subs: [] });
        try {
            const subs = await projectsService.getTaskSubmissions(task.id);
            setClientDeliverableModal({ task, subs });
        } catch {
            setClientDeliverableModal({ task, subs: [] });
        } finally {
            setClientDeliverableLoading(false);
        }
    };

    const openTaskDetail = async (task: Task) => {
        if (isClient) {
            openDeliverableView(task);
            return;
        }
        setTaskDetail({ task });
        setEditMode(false);
        setEditForm({
            title: task.title,
            description: task.description || '',
            assigned_to: task.assigned_to || '',
            deadline: task.deadline ? task.deadline.split('T')[0] : '',
            priority: task.priority,
            status: task.status,
        });
        setDetailLoading(true);
        try {
            const [subs, feedbacks] = await Promise.all([
                projectsService.getTaskSubmissions(task.id),
                projectsService.getTaskFeedbacks(task.id),
            ]);
            setDetailSubs(subs);
            setDetailFeedbacks(feedbacks);
        } catch {
            setDetailSubs([]);
            setDetailFeedbacks([]);
        } finally {
            setDetailLoading(false);
        }
    };

    // Deep-link: open task modal once when navigated from a notification (?task=taskId)
    const deepLinkHandled = useRef(false);
    useEffect(() => {
        if (deepLinkHandled.current || tasks.length === 0) return;
        const deepTaskId = searchParams.get('task');
        if (!deepTaskId) return;
        const target = tasks.find(t => t.id === deepTaskId);
        if (target) {
            deepLinkHandled.current = true;
            openTaskDetail(target);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tasks]);

    const handleSaveEdit = async () => {
        if (!taskDetail) return;
        setEditSaving(true);
        try {
            const payload: Record<string, any> = {
                title: editForm.title,
                priority: editForm.priority,
                status: editForm.status,
            };
            if (editForm.description) payload.description = editForm.description;
            if (editForm.assigned_to) payload.assigned_to = editForm.assigned_to;
            if (editForm.deadline) payload.deadline = new Date(editForm.deadline).toISOString();
            const updated = await projectsService.updateTask(taskDetail.task.id, payload);
            setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
            setTaskDetail({ task: updated });
            setEditMode(false);
        } catch (err: any) {
            alert(err?.response?.data?.detail || 'Failed to update task.');
        } finally {
            setEditSaving(false);
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
                                        <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase mb-1">
                                            {isClient ? 'Delivered' : 'Tasks Completed'}
                                        </p>
                                        <p className="font-bold text-gray-800 dark:text-gray-200">
                                            {isClient
                                                ? `${tasks.filter(t => t.delivery_state && t.delivery_state !== 'not_delivered').length} item(s)`
                                                : `${stats.completed} / ${stats.total}`}
                                        </p>
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

                        {/* Employee: read-only brief panel */}
                        {isEmployee && project.brief_content && (
                            <section className="bg-amber-50 dark:bg-amber-900/10 rounded-3xl p-6 border border-amber-100 dark:border-amber-900/30">
                                <div className="flex items-center gap-2 mb-3">
                                    <FileText size={16} className="text-amber-600 dark:text-amber-400" />
                                    <span className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Client Brief</span>
                                    <span className="text-[10px] text-amber-500 dark:text-amber-500 font-bold uppercase tracking-widest ml-auto">read-only</span>
                                </div>
                                <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-amber-100 dark:border-amber-900/20 max-h-64 overflow-y-auto">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{project.brief_content}</p>
                                </div>
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

                        {/* Payment Settings */}
                        {(isManager || isAdmin) && (
                            <section className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm mt-8">
                                <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4">
                                    Payment Settings
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500">Payment Type</label>
                                        <select
                                            className="w-full mt-1 bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-3 py-2 text-sm"
                                            value={project.payment_type}
                                            onChange={e => handleProjectPaymentUpdate('payment_type', e.target.value)}
                                        >
                                            <option value="project">Project Level</option>
                                            <option value="task">Task Level</option>
                                        </select>
                                    </div>
                                    {project.payment_type === 'project' && (
                                        <>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500">Payment Status</label>
                                                <select
                                                    className="w-full mt-1 bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-3 py-2 text-sm"
                                                    value={project.payment_status}
                                                    onChange={e => handleProjectPaymentUpdate('payment_status', e.target.value)}
                                                >
                                                    <option value="unpaid">Unpaid</option>
                                                    <option value="partially_paid">Partially Paid</option>
                                                    <option value="fully_paid">Fully Paid</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500">Total Price</label>
                                                <input
                                                    type="number"
                                                    className="w-full mt-1 bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-3 py-2 text-sm"
                                                    value={project.total_project_price || 0}
                                                    onChange={e => handleProjectPaymentUpdate('total_project_price', parseFloat(e.target.value))}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500">Amount Paid</label>
                                                <input
                                                    type="number"
                                                    className="w-full mt-1 bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-3 py-2 text-sm"
                                                    value={project.amount_paid || 0}
                                                    onChange={e => handleProjectPaymentUpdate('amount_paid', parseFloat(e.target.value))}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Task List Section */}
                    <div className="xl:col-span-3 space-y-8">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                                {isClient ? 'Your Deliverables' : 'Project Deliverables'}
                            </h3>
                            {!isClient && (
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
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {!isClient && tasks.map((task) => (
                                <div
                                    key={task.id}
                                    onClick={() => openTaskDetail(task)}
                                    className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-primary/20 dark:hover:border-primary/40 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer"
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
                                                {task.delivery_state && task.delivery_state !== 'not_delivered' && (
                                                    <div className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded">
                                                        <CheckCircle2 size={12} />
                                                        {task.delivery_state.replace('_', ' ')}
                                                    </div>
                                                )}
                                                {(isManager || isAdmin) && project.payment_type === 'task' && (
                                                    <select
                                                        onClick={e => e.stopPropagation()}
                                                        className="ml-2 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded px-1 text-gray-600 dark:text-gray-300"
                                                        value={task.payment_status || 'unpaid'}
                                                        onChange={e => handleTaskPaymentUpdate(task.id, e.target.value)}
                                                    >
                                                        <option value="unpaid">Unpaid</option>
                                                        <option value="partially_paid">Partially Paid</option>
                                                        <option value="fully_paid">Fully Paid</option>
                                                    </select>
                                                )}
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
                                        {isEmployee && (task.status === 'in_progress' || task.status === 'revision_requested') && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openSubmitModal(task, task.project_brief);
                                                }}
                                                className="bg-primary/10 hover:bg-primary/20 text-primary px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2"
                                            >
                                                <Send size={14} /> Submit Work
                                            </button>
                                        )}
                                        {(isManager || isAdmin) && ['submitted', 'under_ai_review', 'revision_requested'].includes(task.status) && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setFeedbackModal({ task }); setFeedbackMsg(''); setIsRevision(true); }}
                                                title="Send feedback / request revision"
                                                className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors"
                                            >
                                                <MessageSquare size={18} />
                                            </button>
                                        )}
                                        {(isManager || isAdmin) && project.payment_type === 'project' && project.payment_status === 'partially_paid' && task.delivery_state !== 'watermark_delivered' && task.delivery_state !== 'final_delivered' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeliverWatermark(task.id); }}
                                                className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                                                title="Select for Watermark Delivery"
                                            >
                                                Deliver
                                            </button>
                                        )}
                                        <button className="p-2 text-gray-300 dark:text-gray-600 group-hover:text-primary transition-colors">
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {!isClient && tasks.length === 0 && (
                                <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 border-dashed">
                                    <FileText size={48} className="mx-auto text-gray-200 dark:text-gray-700 mb-6" />
                                    <p className="text-gray-400 dark:text-gray-500 font-bold text-lg">No deliverables defined yet.</p>
                                    {(isManager || isAdmin) && <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Create the first task to get this project moving.</p>}
                                </div>
                            )}

                            {/* Client-safe deliverable view: only shows delivered content */}
                            {isClient && (() => {
                                const delivered = tasks.filter(t => t.delivery_state && t.delivery_state !== 'not_delivered');
                                if (delivered.length === 0) return (
                                    <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 border-dashed">
                                        <FileText size={48} className="mx-auto text-gray-200 dark:text-gray-700 mb-6" />
                                        <p className="text-gray-400 dark:text-gray-500 font-bold text-lg">No content delivered yet.</p>
                                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">You'll be notified when your content is ready.</p>
                                    </div>
                                );
                                return delivered.map(task => {
                                    const isFinal = task.delivery_state === 'final_delivered';
                                    const deliveredAt = isFinal ? task.final_delivered_at : task.watermarked_delivered_at;
                                    return (
                                        <div
                                            key={task.id}
                                            onClick={() => openDeliverableView(task)}
                                            className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-primary/20 dark:hover:border-primary/40 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer"
                                        >
                                            <div className="flex gap-5 items-center">
                                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400">
                                                    <CheckCircle2 size={24} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 dark:text-white text-lg group-hover:text-primary transition-colors duration-200">{task.title}</h4>
                                                    {deliveredAt && (
                                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                            Delivered on {new Date(deliveredAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border shadow-sm ${isFinal ? 'bg-green-100/50 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' : 'bg-purple-100/50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'}`}>
                                                    {isFinal ? 'Final Version' : 'Preview Version'}
                                                </span>
                                                <button className="p-2 text-gray-300 dark:text-gray-600 group-hover:text-primary transition-colors">
                                                    <ChevronRight size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>

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

            {taskDetail && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-950/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col">

                        {/* Header */}
                        <div className="px-7 py-5 border-b border-gray-50 dark:border-gray-800 flex items-start justify-between bg-gray-50/40 dark:bg-gray-800/30 shrink-0">
                            <div className="flex-1 min-w-0 pr-4">
                                {!editMode ? (
                                    <>
                                        <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-2 ${
                                            taskDetail.task.status === 'completed' || taskDetail.task.status === 'approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                            taskDetail.task.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                                            taskDetail.task.status === 'submitted' || taskDetail.task.status === 'under_ai_review' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' :
                                            taskDetail.task.status === 'revision_requested' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' :
                                            'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                        }`}>{taskDetail.task.status.replace(/_/g, ' ')}</span>
                                        <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">{taskDetail.task.title}</h2>
                                    </>
                                ) : (
                                    <input
                                        className="w-full text-xl font-black bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary/30 outline-none"
                                        value={editForm.title}
                                        onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                                    />
                                )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {(isManager || isAdmin) && (
                                    <button
                                        onClick={() => setEditMode(m => !m)}
                                        className={`p-2 rounded-xl transition-colors ${editMode ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-primary hover:bg-primary/5'}`}
                                        title={editMode ? 'Cancel edit' : 'Edit task'}
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                )}
                                <button onClick={() => { setTaskDetail(null); setEditMode(false); }} className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Body */}
                        <div className="overflow-y-auto flex-1 px-7 py-6 space-y-6">

                            {/* Meta row */}
                            {!editMode ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[
                                        { label: 'Priority', value: taskDetail.task.priority, icon: <ChevronDown size={12} /> },
                                        { label: 'Assigned to', value: staff.find(s => s.id === taskDetail.task.assigned_to)?.full_name || (taskDetail.task.assigned_to ? 'Employee' : 'Unassigned'), icon: <UserIcon size={12} /> },
                                        { label: 'Deadline', value: taskDetail.task.deadline ? new Date(taskDetail.task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD', icon: <Calendar size={12} /> },
                                        { label: 'Created', value: new Date(taskDetail.task.created_at).toLocaleDateString(), icon: <Clock size={12} /> },
                                    ].map(({ label, value, icon }) => (
                                        <div key={label} className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-3">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{icon}{label}</div>
                                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200 capitalize truncate">{value}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                /* Edit Form */
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Status</label>
                                            <select
                                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none"
                                                value={editForm.status}
                                                onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                                            >
                                                {['todo','in_progress','submitted','under_ai_review','revision_requested','approved','completed','late'].map(s => (
                                                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Priority</label>
                                            <select
                                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none"
                                                value={editForm.priority}
                                                onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}
                                            >
                                                {['low','medium','high','urgent'].map(p => (
                                                    <option key={p} value={p}>{p}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Assign to</label>
                                            <select
                                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none"
                                                value={editForm.assigned_to}
                                                onChange={e => setEditForm(f => ({ ...f, assigned_to: e.target.value }))}
                                            >
                                                <option value="">Unassigned</option>
                                                {staff.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Deadline</label>
                                            <input
                                                type="date"
                                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none"
                                                value={editForm.deadline}
                                                onChange={e => setEditForm(f => ({ ...f, deadline: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Description</label>
                                        <textarea
                                            rows={3}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                                            value={editForm.description}
                                            onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                                            placeholder="Task description…"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Description (view mode) */}
                            {!editMode && taskDetail.task.description && (
                                <div>
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Description</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{taskDetail.task.description}</p>
                                </div>
                            )}

                            {/* Latest Submission */}
                            {!editMode && (
                                detailLoading ? (
                                    <div className="animate-pulse space-y-2">
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                                        <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
                                    </div>
                                ) : detailSubs.length > 0 ? (() => {
                                    const sub = detailSubs[detailSubs.length - 1];
                                    const statusColors: Record<string, string> = {
                                        validated: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
                                        rejected:  'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800',
                                        pending:   'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
                                    };
                                    const statusLabel: Record<string, string> = {
                                        validated: 'Validated',
                                        rejected:  'Revision Requested',
                                        pending:   'Awaiting Validation',
                                    };
                                    const submStatus = sub.submission_status ?? 'pending';

                                    return (
                                        <div className="space-y-3">
                                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <Zap size={12} className="text-violet-500" />Latest Submission
                                            </p>

                                            <div className="bg-violet-50 dark:bg-violet-900/10 rounded-2xl p-4 border border-violet-100 dark:border-violet-800/30 space-y-3">
                                                {/* Header: date + validation status */}
                                                <div className="flex items-center justify-between flex-wrap gap-2">
                                                    <span className="text-xs text-violet-500 font-bold">
                                                        {new Date(sub.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        {sub.attempt_number > 1 && (
                                                            <span className="ml-2 text-[10px] text-violet-400">Attempt #{sub.attempt_number}</span>
                                                        )}
                                                    </span>
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${statusColors[submStatus] ?? statusColors.pending}`}>
                                                        {statusLabel[submStatus] ?? submStatus}
                                                    </span>
                                                </div>

                                                {/* Work description */}
                                                {sub.content && (
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-4">{sub.content}</p>
                                                )}

                                                {/* Submitted images */}
                                                {(() => {
                                                    try {
                                                        const paths: string[] = sub.file_paths ? JSON.parse(sub.file_paths) : [];
                                                        if (paths.length === 0) return null;
                                                        return (
                                                            <div>
                                                                <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest mb-2">Submitted Images</p>
                                                                <div className={`grid gap-2 ${paths.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                                                    {paths.map((url, i) => (
                                                                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                                                           className="block rounded-xl overflow-hidden border border-violet-100 dark:border-violet-800/30 hover:opacity-90 transition-opacity">
                                                                            <img src={url} alt={`submission-${i + 1}`} className="w-full object-contain" />
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    } catch { return null; }
                                                })()}

                                                {/* Brief snapshot */}
                                                {sub.brief_snapshot && (
                                                    <div className="pt-3 border-t border-violet-100 dark:border-violet-800/30">
                                                        <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-2">Brief at Submission Time</p>
                                                        <div className="bg-white dark:bg-gray-900 rounded-xl p-3 max-h-36 overflow-y-auto border border-amber-100 dark:border-amber-900/30">
                                                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">{sub.brief_snapshot}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* AI Analysis Card — internal only, never shown to clients */}
                                            {!isClient && sub.ai_analysis_result ? (
                                                <AIAnalysisCard aiAnalysisResult={sub.ai_analysis_result} />
                                            ) : !isClient && sub.ai_feedback ? (
                                                /* Fallback: legacy plain-text feedback if no structured result */
                                                <div className="rounded-2xl p-3 bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-800/30">
                                                    <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest mb-1">Validation Feedback</p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{sub.ai_feedback}</p>
                                                </div>
                                            ) : null}

                                            {/* Manager action buttons */}
                                            {(isManager || isAdmin) && submStatus === 'validated' && (
                                                <div className="flex gap-2 pt-1">
                                                    <button
                                                        onClick={() => { setFeedbackModal({ task: taskDetail!.task }); setFeedbackMsg(''); setIsRevision(false); }}
                                                        className="flex-1 py-2 text-xs font-black rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                    >
                                                        Request Modification
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            await projectsService.updateTask(taskDetail!.task.id, { status: 'approved' });
                                                            const updated = await projectsService.getTasksByProject(id!);
                                                            setTasks(updated);
                                                            setTaskDetail(null);
                                                        }}
                                                        className="flex-1 py-2 text-xs font-black rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                                                    >
                                                        Approve
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })() : null
                            )}

                            {/* Feedback History — internal only, never shown to clients */}
                            {!editMode && !detailLoading && !isClient && detailFeedbacks.length > 0 && (
                                <div>
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><MessageSquare size={12} className="text-indigo-500" />Feedback History</p>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {detailFeedbacks.map(fb => (
                                            <div key={fb.id} className={`rounded-2xl p-4 ${fb.is_revision_request ? 'bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/30' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${fb.is_revision_request ? 'text-rose-500' : 'text-gray-400'}`}>
                                                        {fb.is_revision_request ? 'Revision Requested' : 'Manager Feedback'}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">{new Date(fb.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{fb.message}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {editMode && (
                            <div className="px-7 py-4 border-t border-gray-50 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/20 flex gap-3 shrink-0">
                                <button
                                    onClick={() => setEditMode(false)}
                                    className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-gray-500 hover:bg-white dark:hover:bg-gray-800 transition-all text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={editSaving || !editForm.title.trim()}
                                    className="flex-[2] py-3 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {editSaving ? 'Saving…' : <><CheckCircle2 size={16} /> Save Changes</>}
                                </button>
                            </div>
                        )}

                        {/* Employee Footer */}
                        {!editMode && isEmployee && (taskDetail.task.status === 'in_progress' || taskDetail.task.status === 'revision_requested') && (
                            <div className="px-7 py-4 border-t border-gray-50 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/20 flex gap-3 shrink-0">
                                <button
                                    onClick={() => {
                                        setTaskDetail(null);
                                        openSubmitModal(taskDetail.task, taskDetail.task.project_brief);
                                    }}
                                    className="w-full py-3.5 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center justify-center gap-2"
                                >
                                    <Send size={16} /> Submit Work
                                </button>
                            </div>
                        )}

                        {/* Manager Footer */}
                        {!editMode && (isManager || isAdmin) && (taskDetail.task.status === 'submitted' || taskDetail.task.status === 'under_ai_review' || taskDetail.task.status === 'revision_requested') && (
                            <div className="px-7 py-4 border-t border-gray-50 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/20 flex gap-3 shrink-0">
                                <button
                                    onClick={() => {
                                        setFeedbackModal({ task: taskDetail.task });
                                        setFeedbackMsg('');
                                        setIsRevision(true);
                                    }}
                                    className="flex-1 py-3 border border-rose-200 dark:border-rose-900/30 rounded-2xl font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all text-sm flex items-center justify-center gap-2"
                                >
                                    <X size={16} /> Request Revision
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            await projectsService.updateTask(taskDetail.task.id, { status: 'approved' as any });
                                            // Refresh
                                            const updatedTasks = await projectsService.getTasksByProject(id!);
                                            setTasks(updatedTasks);
                                            setTaskDetail(null);
                                        } catch (err) {
                                            console.error('Failed to approve task:', err);
                                        }
                                    }}
                                    className="flex-[2] py-3 bg-green-600 text-white rounded-2xl font-black shadow-lg shadow-green-500/20 hover:shadow-green-500/40 transition-all text-sm flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 size={16} /> Approve Task
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Client Deliverable Viewer Modal */}
            {clientDeliverableModal && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-950/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col">
                        <div className="px-7 py-5 border-b border-gray-50 dark:border-gray-800 flex items-start justify-between bg-gray-50/40 dark:bg-gray-800/30 shrink-0">
                            <div>
                                <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-2 ${clientDeliverableModal.task.delivery_state === 'final_delivered' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'}`}>
                                    {clientDeliverableModal.task.delivery_state === 'final_delivered' ? 'Final Version' : 'Preview Version'}
                                </span>
                                <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">{clientDeliverableModal.task.title}</h2>
                            </div>
                            <button onClick={() => setClientDeliverableModal(null)} className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1 px-7 py-6 space-y-6">
                            {clientDeliverableLoading ? (
                                <div className="animate-pulse space-y-3">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                                    <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
                                </div>
                            ) : clientDeliverableModal.subs.length === 0 ? (
                                <div className="text-center py-12">
                                    <FileText size={40} className="mx-auto text-gray-200 dark:text-gray-700 mb-4" />
                                    <p className="text-gray-400 dark:text-gray-500 font-bold">No files available yet.</p>
                                </div>
                            ) : (() => {
                                const sub = clientDeliverableModal.subs[0]; // subs are newest-first; watermark is on the latest approved submission
                                return (
                                    <div className="space-y-4">
                                        {sub.content && (
                                            <div>
                                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Description</p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{sub.content}</p>
                                            </div>
                                        )}
                                        {(() => {
                                            try {
                                                const isWatermark = clientDeliverableModal.task.delivery_state === 'watermark_delivered';
                                                const isFinal = clientDeliverableModal.task.delivery_state === 'final_delivered';

                                                const finalPaths: string[] = (isFinal && sub.file_paths) ? JSON.parse(sub.file_paths) : [];
                                                
                                                let watermarkPaths: string[] = [];
                                                if (!isFinal) {
                                                    // Primary: watermarked_file_paths holds the pre-built public URL
                                                    // stored by the backend as JSON array, e.g. ["https://...supabase.../preview/file.png"]
                                                    if (sub.watermarked_file_paths) {
                                                        try {
                                                            const parsed = JSON.parse(sub.watermarked_file_paths);
                                                            if (Array.isArray(parsed)) watermarkPaths = parsed.filter(Boolean);
                                                        } catch { watermarkPaths = []; }
                                                    }
                                                    // Fallback: reconstruct URL from raw storage path
                                                    if (watermarkPaths.length === 0 && sub.watermark_file_path) {
                                                        const parts = sub.watermark_file_path.split('/');
                                                        const bucket = parts[0];
                                                        const subPath = parts.slice(1).join('/');
                                                        const { data } = supabase.storage.from(bucket).getPublicUrl(subPath);
                                                        if (data.publicUrl) watermarkPaths = [data.publicUrl];
                                                    }
                                                }

                                                const displayPaths = isFinal ? finalPaths : watermarkPaths;

                                                if (displayPaths.length === 0) return (
                                                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                                                        <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">
                                                            {isWatermark
                                                                ? 'Your watermarked preview is being prepared. Check back shortly.'
                                                                : 'Files are being prepared.'}
                                                        </p>
                                                    </div>
                                                );
                                                return (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                                                {isFinal ? 'Final Files' : 'Watermarked Preview'}
                                                            </p>
                                                            {isWatermark && (
                                                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                                                                    Preview
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className={`grid gap-3 ${displayPaths.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                                            {displayPaths.map((url, i) => (
                                                                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                                                   className="block rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 hover:opacity-90 transition-opacity shadow-sm">
                                                                    <img src={url} alt={`deliverable-${i + 1}`} className="w-full object-contain" />
                                                                </a>
                                                            ))}
                                                        </div>
                                                        {isWatermark && (
                                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center">
                                                                Final files will be available after full payment.
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            } catch { return null; }
                                        })()}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* Work Submission Modal */}
            <AnimatePresence>
                {selectedTask && (
                    <SubmitWorkModal
                        task={selectedTask}
                        projectBrief={selectedTaskBrief}
                        onClose={() => setSelectedTask(null)}
                        onSuccess={async () => {
                            // Refresh data
                            try {
                                const [p, t] = await Promise.all([
                                    projectsService.getById(id!),
                                    projectsService.getTasksByProject(id!)
                                ]);
                                setProject(p);
                                setTasks(t);
                            } catch (error) {
                                console.error('Failed to refresh project data:', error);
                            }
                            setSelectedTask(null);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProjectDetail;
