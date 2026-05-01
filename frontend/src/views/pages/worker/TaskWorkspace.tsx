import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, ArrowRight, Calendar, Clock, Send,
    MessageSquare, ChevronDown,
    ChevronUp, FileText, Activity, Upload,
} from 'lucide-react';
import WorkerNav from '../../components/worker/WorkerNav';
import SubmitWorkModal from '../../../components/SubmitWorkModal';
import AIAnalysisCard from '../../../components/AIAnalysisCard';
import { projectsService } from '../../../api/projects';
import { submissionsApi } from '../../../api/submissions';
import { workerApi } from '../../../api/worker';
import type { Task, TaskSubmission, TaskFeedback, ActivityEvent } from '../../../types';

// ── helpers ───────────────────────────────────────────────────────────────────

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

function deadlineLabel(iso?: string): { text: string; color: string } {
    if (!iso) return { text: 'No deadline', color: 'text-gray-400' };
    const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
    if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, color: 'text-red-500 font-bold' };
    if (diff === 0) return { text: 'Due today', color: 'text-orange-500 font-bold' };
    if (diff === 1) return { text: 'Due tomorrow', color: 'text-amber-500' };
    return { text: `Due in ${diff}d`, color: 'text-gray-500' };
}

// ── collapsible section ───────────────────────────────────────────────────────

const Section: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean }> = ({
    title, icon: Icon, children, defaultOpen = true,
}) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
                <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white text-sm">
                    <Icon size={15} className="text-primary" />
                    {title}
                </div>
                {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-6">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ── main component ────────────────────────────────────────────────────────────

const TaskWorkspace: React.FC = () => {
    const { taskId } = useParams<{ taskId: string }>();
    const navigate = useNavigate();

    const [task, setTask] = useState<Task | null>(null);
    const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
    const [feedbacks, setFeedbacks] = useState<TaskFeedback[]>([]);
    const [activity, setActivity] = useState<ActivityEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitModalOpen, setSubmitModalOpen] = useState(false);

    const loadData = useCallback(async () => {
        if (!taskId) return;
        try {
            const [t, subs, fbs, act] = await Promise.allSettled([
                projectsService.getTaskById(taskId),
                submissionsApi.getForTask(taskId),
                projectsService.getTaskFeedbacks(taskId),
                workerApi.getTaskActivity(taskId),
            ]);
            if (t.status === 'fulfilled') setTask(t.value);
            if (subs.status === 'fulfilled') setSubmissions(subs.value);
            if (fbs.status === 'fulfilled') setFeedbacks(fbs.value);
            if (act.status === 'fulfilled') setActivity(act.value);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [taskId]);

    useEffect(() => { loadData(); }, [loadData]);

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

    if (!task) {
        return (
            <>
                <WorkerNav />
                <div className="max-w-3xl mx-auto px-6 py-16 text-center">
                    <p className="text-gray-400 font-semibold">Task not found or access denied.</p>
                    <button onClick={() => navigate('/worker/tasks')} className="mt-4 text-primary font-bold hover:underline text-sm">
                        Back to My Tasks
                    </button>
                </div>
            </>
        );
    }

    const dl = deadlineLabel(task.deadline);
    const latestSubmission = submissions[0];

    return (
        <>
            <WorkerNav />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">

                {/* Back */}
                <button onClick={() => navigate('/worker/tasks')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <ArrowLeft size={15} /> My Tasks
                </button>

                {/* Task Header */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${STATUS_COLORS[task.status] ?? STATUS_COLORS.todo}`}>
                            {task.status.replace(/_/g, ' ')}
                        </span>
                        <span className={`text-[10px] font-bold uppercase text-gray-400`}>{task.priority} priority</span>
                        {task.deadline && (
                            <span className={`text-[11px] font-semibold ${dl.color} flex items-center gap-1`}>
                                <Calendar size={11} /> {dl.text}
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">{task.title}</h1>
                    {task.project_name && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{task.project_name}</p>
                    )}
                    <div className="mt-4 flex gap-3 flex-wrap">
                        <div className="text-[11px] text-gray-400 flex items-center gap-1">
                            <Clock size={11} /> Assigned {new Date(task.created_at).toLocaleDateString()}
                        </div>
                        {task.deadline && (
                            <div className="text-[11px] text-gray-400 flex items-center gap-1">
                                <Calendar size={11} /> Due {new Date(task.deadline).toLocaleDateString()}
                            </div>
                        )}
                        {submissions.length > 0 && (
                            <div className="text-[11px] text-gray-400 flex items-center gap-1">
                                <Send size={11} /> {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
                            </div>
                        )}
                    </div>
                </div>

                {/* Description / Instructions */}
                <Section title="Task Instructions" icon={FileText}>
                    {task.description ? (
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{task.description}</p>
                    ) : (
                        <p className="text-sm text-gray-400 italic">No description provided.</p>
                    )}
                    {task.project_brief && (
                        <div className="mt-4 p-4 bg-amber-50/60 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl">
                            <p className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 mb-2">Client Brief (read-only)</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap line-clamp-6">{task.project_brief}</p>
                        </div>
                    )}
                </Section>

                {/* Submission Section */}
                <Section title="Submit Work" icon={Upload}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {submissions.length === 0 ? 'No submissions yet.' : `${submissions.length} submission${submissions.length !== 1 ? 's' : ''} — attempt #${(latestSubmission?.attempt_number ?? 0) + 1} next`}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {latestSubmission && (
                                <button
                                    onClick={() => navigate(`/worker/tasks/${taskId}/review/${latestSubmission.id}`)}
                                    className="flex items-center gap-2 px-4 py-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 text-sm font-bold rounded-xl hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-all"
                                >
                                    <Activity size={14} />
                                    View AI Review
                                </button>
                            )}
                            {!['approved', 'completed'].includes(task.status) && (
                                <button
                                    onClick={() => setSubmitModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                                >
                                    <Send size={14} />
                                    {submissions.length === 0 ? 'Submit Work' : 'Resubmit'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Submission History */}
                    {submissions.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Submission History</p>
                            {submissions.map((sub, idx) => {
                                let parsedAI: any = null;
                                try { parsedAI = sub.ai_analysis_result ? JSON.parse(sub.ai_analysis_result) : null; } catch {}
                                return (
                                    <div key={sub.id} className="border border-gray-100 dark:border-gray-800 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-gray-900 dark:text-white">Attempt #{sub.attempt_number}</span>
                                                {idx === 0 && <span className="text-[10px] font-bold text-primary px-1.5 py-0.5 bg-primary/10 rounded">Latest</span>}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                                    sub.submission_status === 'validated' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                    sub.submission_status === 'rejected' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                                                    'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                                                }`}>
                                                    {sub.submission_status}
                                                </span>
                                                <span className="text-[10px] text-gray-400">{new Date(sub.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        {sub.content && <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{sub.content}</p>}
                                        {sub.ai_score != null && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400">AI Score: {sub.ai_score}/100</span>
                                            </div>
                                        )}
                                        {parsedAI && idx === 0 && (
                                            <div className="mt-3">
                                                <AIAnalysisCard aiAnalysisResult={parsedAI} />
                                            </div>
                                        )}
                                        <div className="mt-3 flex justify-end">
                                            <button 
                                                onClick={() => navigate(`/worker/tasks/${taskId}/review/${sub.id}`)}
                                                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                                            >
                                                View Detailed AI Review <ArrowRight size={12} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Section>

                {/* Feedback Section */}
                {feedbacks.length > 0 && (
                    <Section title={`Feedback (${feedbacks.length})`} icon={MessageSquare}>
                        <div className="space-y-3">
                            {feedbacks.map(fb => (
                                <div
                                    key={fb.id}
                                    className={`p-4 rounded-xl border ${
                                        fb.is_revision_request
                                            ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30'
                                            : 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white ${fb.is_revision_request ? 'bg-rose-500' : 'bg-green-500'}`}>
                                            {fb.is_revision_request ? 'Revision Required' : 'Approval Feedback'}
                                        </span>
                                        <span className="text-[10px] text-gray-400">{new Date(fb.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{fb.message}</p>
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

                {/* Activity Timeline */}
                <Section title="Activity Timeline" icon={Activity} defaultOpen={false}>
                    {activity.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No activity yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {activity.map(event => (
                                <div key={event.id} className="flex gap-3">
                                    <div className="flex flex-col items-center">
                                        <div className={`w-2 h-2 rounded-full mt-1.5 ${
                                            event.type === 'feedback' ? 'bg-rose-400' :
                                            event.type === 'submission' ? 'bg-blue-400' :
                                            event.type === 'created' ? 'bg-green-400' :
                                            'bg-gray-300'
                                        }`} />
                                        <div className="w-px flex-1 bg-gray-100 dark:bg-gray-800 mt-1" />
                                    </div>
                                    <div className="pb-3">
                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{event.action}</p>
                                        {event.details?.message && (
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{event.details.message}</p>
                                        )}
                                        <p className="text-[10px] text-gray-400 mt-1">{new Date(event.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Section>

            </div>

            {/* Submit Modal */}
            <AnimatePresence>
                {submitModalOpen && (
                    <SubmitWorkModal
                        task={task}
                        projectBrief={task.project_brief}
                        onClose={() => setSubmitModalOpen(false)}
                        onSuccess={async () => {
                            setSubmitModalOpen(false);
                            await loadData();
                        }}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default TaskWorkspace;
