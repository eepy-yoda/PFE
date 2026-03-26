import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { projectsService } from '../../../api/projects';
import { Task, TaskFeedback } from '../../../types';
import {
    CheckCircle2,
    Clock,
    AlertCircle,
    ExternalLink,
    MessageSquare,
    Send,
    Play,
    X,
    Rocket,
    Eye
} from 'lucide-react';

const WorkerDashboard: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [submissionContent, setSubmissionContent] = useState('');
    const [submissionLinks, setSubmissionLinks] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [revisionModal, setRevisionModal] = useState<{ task: Task; feedbacks: TaskFeedback[] } | null>(null);
    const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const myTasks = await projectsService.getMyTasks();
                setTasks(myTasks);
            } catch (err) {
                console.error("Failed to fetch tasks", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTasks();
    }, []);

    const handleSubmitWork = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTask || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await projectsService.submitTaskWork(selectedTask.id, {
                content: submissionContent,
                links: JSON.stringify(submissionLinks.split('\n').filter(l => l.trim())),
            });
            alert("Work submitted successfully!");
            // Refresh tasks
            const myTasks = await projectsService.getMyTasks();
            setTasks(myTasks);
            setSelectedTask(null);
            setSubmissionContent('');
            setSubmissionLinks('');
        } catch (err) {
            console.error("Failed to submit work", err);
            alert("Failed to submit work. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleViewFeedback = async (task: Task) => {
        setFeedbackLoading(task.id);
        try {
            const feedbacks = await projectsService.getTaskFeedbacks(task.id);
            setRevisionModal({ task, feedbacks });
        } catch (err) {
            console.error("Failed to fetch feedbacks", err);
            setRevisionModal({ task, feedbacks: [] });
        } finally {
            setFeedbackLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    const todoTasks = tasks.filter(t => t.status === 'todo' || t.status === 'revision_requested' || t.status === 'late');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const submittedTasks = tasks.filter(t => t.status === 'submitted' || t.status === 'under_ai_review');
    const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'approved');

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 transition-colors duration-300">
            <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Worker Dashboard</h1>
                    <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">Manage your active tasks and submit your work for review.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{completedTasks.length} Completed</span>
                    </div>
                    <div className="px-4 py-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{todoTasks.length + inProgressTasks.length} Active</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Task List - Active */}
                <div className="xl:col-span-3 space-y-8">
                    {/* In-Progress Tasks — one focus card per task */}
                    {inProgressTasks.length > 0 && (
                        <div className="space-y-4">
                            <span className="text-xs font-bold text-primary dark:text-primary uppercase tracking-widest">In Progress ({inProgressTasks.length})</span>
                            {inProgressTasks.map((task, idx) => (
                                <section key={task.id} className={`rounded-3xl border p-6 relative overflow-hidden ${idx === 0 ? 'bg-gradient-to-br from-primary/5 to-blue-500/5 dark:from-primary/10 dark:to-blue-500/10 border-primary/10 dark:border-primary/20' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'}`}>
                                    {idx === 0 && (
                                        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                                            <Clock size={80} className="text-primary" />
                                        </div>
                                    )}
                                    <div className="relative z-10">
                                        {idx === 0 && <span className="text-xs font-bold text-primary uppercase tracking-widest mb-2 block">Current Focus</span>}
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{task.title}</h2>
                                        {task.description && <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">{task.description}</p>}
                                        <div className="flex items-center gap-4 mt-3">
                                            <button
                                                onClick={() => setSelectedTask(task)}
                                                className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20 text-sm"
                                            >
                                                <Send size={16} /> Submit Work
                                            </button>
                                            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                                                Due: {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
                                            </span>
                                        </div>
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* To Do Column */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <Clock size={16} />
                                To Be Done ({todoTasks.length})
                            </h3>
                            {todoTasks.map(task => (
                                <div key={task.id} className={`bg-white dark:bg-gray-900 p-5 rounded-2xl border shadow-sm hover:border-primary/20 dark:hover:border-primary/40 transition-all cursor-pointer group ${task.status === 'revision_requested' ? 'border-rose-200 dark:border-rose-900/50' : 'border-gray-100 dark:border-gray-800'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{task.title}</h4>
                                        {task.status === 'revision_requested' && (
                                            <AlertCircle size={16} className="text-rose-500 flex-shrink-0" />
                                        )}
                                    </div>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs line-clamp-2 mb-4">{task.description}</p>
                                    {task.status === 'revision_requested' && (
                                        <button
                                            onClick={() => handleViewFeedback(task)}
                                            disabled={feedbackLoading === task.id}
                                            className="w-full mb-3 flex items-center justify-center gap-1.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl px-3 py-2 uppercase tracking-widest transition-colors disabled:opacity-50"
                                        >
                                            <Eye size={12} />
                                            {feedbackLoading === task.id ? 'Loading...' : 'View Manager Feedback'}
                                        </button>
                                    )}
                                    <div className="flex items-center justify-between">
                                        <button
                                            onClick={async () => {
                                                await projectsService.updateTask(task.id, { status: 'in_progress' });
                                                const updatedTasks = await projectsService.getMyTasks();
                                                setTasks(updatedTasks);
                                            }}
                                            className="text-[10px] font-bold text-gray-400 dark:text-gray-500 group-hover:text-primary uppercase tracking-widest flex items-center gap-1"
                                        >
                                            <Play size={10} /> Start Work
                                        </button>
                                        <span className="text-[10px] font-medium text-gray-400 dark:text-gray-600">
                                            ID: {task.id.slice(0, 8)}
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

                        {/* Submitted/Review Column */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <CheckCircle2 size={16} />
                                Under Review ({submittedTasks.length})
                            </h3>
                            {submittedTasks.map(task => (
                                <div key={task.id} className="bg-gray-50/50 dark:bg-gray-800/20 p-5 rounded-2xl border border-gray-100/50 dark:border-gray-800/50 opacity-75">
                                    <h4 className="font-bold text-gray-700 dark:text-gray-300">{task.title}</h4>
                                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Submitted on {new Date(task.updated_at).toLocaleDateString()}</p>
                                    <div className="mt-4 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                            {task.status === 'under_ai_review' ? 'AI Reviewing...' : 'Manager Reviewing'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar: Completed & History */}
                <aside className="space-y-6">
                    <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <CheckCircle2 size={18} className="text-green-500" />
                            Recent Completions
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
                            {completedTasks.length === 0 && (
                                <p className="text-xs text-gray-400 dark:text-gray-600 italic">No completed tasks yet.</p>
                            )}
                        </div>
                    </section>

                    <div className="bg-gray-900 dark:bg-gray-950 rounded-2xl p-6 text-white overflow-hidden relative shadow-xl shadow-gray-900/20">
                        <div className="absolute -right-4 -bottom-4 opacity-10">
                            <Rocket size={100} />
                        </div>
                        <h4 className="font-bold mb-2">My Performance</h4>
                        <div className="text-3xl font-bold text-primary mb-1">98%</div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">On-time Completion</p>
                        <div className="w-full bg-gray-800 rounded-full h-1 mt-2">
                            <div className="bg-primary h-1 rounded-full w-[98%]" />
                        </div>
                    </div>
                </aside>
            </div>

            <AnimatePresence>
                {selectedTask && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100 dark:border-gray-800"
                        >
                            <form onSubmit={handleSubmitWork}>
                                <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-gray-50/30 dark:bg-gray-800/30">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Submit Work</h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">For task: {selectedTask.title}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTask(null)}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                                    >
                                        <X size={20} className="text-gray-400" />
                                    </button>
                                </div>
                                <div className="p-8 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest flex items-center gap-2">
                                            <MessageSquare size={14} /> Description of Work
                                        </label>
                                        <textarea
                                            required
                                            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/20 text-gray-900 dark:text-white min-h-[120px] transition-all"
                                            placeholder="What did you achieve? Any specific notes for the reviewer?"
                                            value={submissionContent}
                                            onChange={e => setSubmissionContent(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest flex items-center gap-2">
                                            <ExternalLink size={14} /> Relevant Links
                                        </label>
                                        <textarea
                                            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-sm font-mono focus:ring-2 focus:ring-primary/20 text-gray-900 dark:text-white min-h-[80px] transition-all"
                                            placeholder="Add links (Google Drive, GitHub, etc.) one per line"
                                            value={submissionLinks}
                                            onChange={e => setSubmissionLinks(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="p-8 bg-gray-50/50 dark:bg-gray-800/50 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTask(null)}
                                        className="flex-1 px-6 py-3.5 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-[2] px-6 py-3.5 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'Submitting...' : 'Send for Review'}
                                        <Send size={18} />
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Revision Feedback Modal */}
            <AnimatePresence>
                {revisionModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100 dark:border-gray-800"
                        >
                            {/* Header */}
                            <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-rose-50/30 dark:bg-rose-900/10">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <AlertCircle size={16} className="text-rose-500" />
                                        <span className="text-xs font-bold text-rose-500 uppercase tracking-widest">Revision Requested</span>
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{revisionModal.task.title}</h2>
                                    {revisionModal.task.description && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">{revisionModal.task.description}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => setRevisionModal(null)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                                >
                                    <X size={20} className="text-gray-400" />
                                </button>
                            </div>

                            {/* Feedback list */}
                            <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto">
                                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest flex items-center gap-2">
                                    <MessageSquare size={14} /> Manager Feedback
                                </h3>
                                {revisionModal.feedbacks.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400 dark:text-gray-600 text-sm italic">
                                        No feedback messages found for this task.
                                    </div>
                                ) : (
                                    revisionModal.feedbacks.map(fb => (
                                        <div key={fb.id} className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-5">
                                            <div className="flex items-center justify-between mb-3">
                                                {fb.is_revision_request && (
                                                    <span className="text-[10px] font-bold bg-rose-500 text-white px-2.5 py-1 rounded-full uppercase tracking-widest">
                                                        Revision Required
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">
                                                    {new Date(fb.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{fb.message}</p>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Footer */}
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
