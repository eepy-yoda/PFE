import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertCircle, Loader2, CheckCircle2, RotateCcw, ExternalLink, FileImage, Link2 } from 'lucide-react';
import WorkerNav from '../../components/worker/WorkerNav';
import AIAnalysisCard from '../../../components/AIAnalysisCard';
import { submissionsApi } from '../../../api/submissions';
import { projectsService } from '../../../api/projects';
import type { TaskSubmission, Task } from '../../../types';

// ── helpers ───────────────────────────────────────────────────────────────────

function safeParse<T>(json?: string): T[] {
    if (!json) return [];
    try { return JSON.parse(json) as T[]; } catch { return []; }
}

function isImageUrl(url: string): boolean {
    return /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url);
}

// ── component ─────────────────────────────────────────────────────────────────

const AIReviewPage: React.FC = () => {
    const { taskId, submissionId } = useParams<{ taskId: string; submissionId: string }>();
    const navigate = useNavigate();

    const [submission, setSubmission] = useState<TaskSubmission | null>(null);
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [triggeringReview, setTriggeringReview] = useState(false);
    const [triggerError, setTriggerError] = useState<string | null>(null);
    const [triggerSuccess, setTriggerSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async (isRefresh = false) => {
        if (!taskId) return;
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        setError(null);
        try {
            let sub: TaskSubmission;
            if (submissionId) {
                sub = await submissionsApi.getById(submissionId);
            } else {
                const subs = await submissionsApi.getForTask(taskId);
                if (subs.length === 0) throw new Error('No submissions found for this task.');
                sub = subs[0];
            }

            const t = await projectsService.getTaskById(taskId);
            setSubmission(sub);
            setTask(t);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || err.message || 'Failed to load AI review.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [submissionId, taskId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Auto-refresh while pending
    useEffect(() => {
        let interval: any;
        if (submission?.submission_status === 'pending') {
            interval = setInterval(() => {
                loadData(true);
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [submission?.submission_status, loadData]);

    const handleRetrigger = async () => {
        if (!submission || triggeringReview) return;
        setTriggeringReview(true);
        setTriggerError(null);
        setTriggerSuccess(false);
        try {
            const updated = await submissionsApi.retriggerAiReview(submission.id);
            setSubmission(updated);
            setTriggerSuccess(true);
            setTimeout(() => setTriggerSuccess(false), 4000);
        } catch (err: any) {
            setTriggerError(err.response?.data?.detail || err.message || 'Failed to trigger AI review.');
        } finally {
            setTriggeringReview(false);
        }
    };

    if (loading) {
        return (
            <>
                <WorkerNav />
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-gray-500 font-medium">Loading AI Review...</p>
                </div>
            </>
        );
    }

    if (error || !submission) {
        return (
            <>
                <WorkerNav />
                <div className="max-w-2xl mx-auto px-6 py-16 text-center">
                    <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="text-rose-500" size={32} />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Oops!</h1>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">{error || 'Submission not found.'}</p>
                    <button
                        onClick={() => navigate(`/worker/tasks/${taskId}`)}
                        className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-bold hover:bg-gray-200 transition-colors"
                    >
                        Back to Task
                    </button>
                </div>
            </>
        );
    }

    const filePaths = safeParse<string>(submission.file_paths);
    const links = safeParse<string>(submission.links);
    const isPending = submission.submission_status === 'pending';
    const canRetrigger = !isPending && !triggeringReview;

    return (
        <>
            <WorkerNav />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <button
                            onClick={() => navigate(`/worker/tasks/${taskId}`)}
                            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors mb-2 w-fit"
                        >
                            <ArrowLeft size={15} /> Back to Task
                        </button>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white">AI Work Review</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Submission Attempt #{submission.attempt_number} • {task?.title}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Retrigger button — only when review is not in progress */}
                        {!isPending && (
                            <button
                                onClick={handleRetrigger}
                                disabled={!canRetrigger}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-violet-100 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800 rounded-xl text-sm font-bold text-violet-700 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <RotateCcw size={14} className={triggeringReview ? 'animate-spin' : ''} />
                                {triggeringReview ? 'Retriggering...' : 'Retrigger AI Review'}
                            </button>
                        )}

                        <button
                            onClick={() => loadData(true)}
                            disabled={refreshing}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm disabled:opacity-50"
                        >
                            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                            {refreshing ? 'Refreshing...' : 'Refresh Status'}
                        </button>
                    </div>
                </div>

                {/* Retrigger feedback */}
                {triggerSuccess && (
                    <div className="flex items-center gap-3 p-4 bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-900/30 rounded-2xl text-sm text-violet-700 dark:text-violet-400 font-medium">
                        <CheckCircle2 size={16} />
                        AI review retriggered. Status will update automatically.
                    </div>
                )}
                {triggerError && (
                    <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl text-sm text-rose-700 dark:text-rose-400 font-medium">
                        <AlertCircle size={16} />
                        {triggerError}
                    </div>
                )}

                {/* Status Banner */}
                <div className={`p-6 rounded-3xl border flex flex-col sm:flex-row items-center gap-6 ${
                    submission.submission_status === 'validated'
                        ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30'
                        : submission.submission_status === 'rejected'
                        ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30'
                        : 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30'
                }`}>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center shrink-0 shadow-lg ${
                        submission.submission_status === 'validated'
                            ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                            : submission.submission_status === 'rejected'
                            ? 'bg-rose-500 text-white shadow-rose-500/20'
                            : 'bg-blue-500 text-white shadow-blue-500/20 animate-pulse'
                    }`}>
                        {submission.submission_status === 'validated' ? <CheckCircle2 size={32} /> :
                         submission.submission_status === 'rejected' ? <AlertCircle size={32} /> :
                         <Loader2 size={32} className="animate-spin" />}
                    </div>

                    <div className="text-center sm:text-left flex-1">
                        <h2 className="text-xl font-black text-gray-900 dark:text-white">
                            {submission.submission_status === 'validated' ? 'AI Review Approved' :
                             submission.submission_status === 'rejected' ? 'Revision Requested' :
                             'AI Review in Progress'}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {submission.submission_status === 'validated'
                                ? 'Great job! Your work aligns with the brief and has been forwarded to your manager.'
                                : submission.submission_status === 'rejected'
                                ? 'The AI analysis found some areas that need improvement to match the brief requirements.'
                                : 'Please wait while our AI analyzes your submission against the project brief. This usually takes 30–60 seconds.'}
                        </p>
                    </div>

                    {submission.submission_status === 'rejected' && (
                        <button
                            onClick={() => navigate(`/worker/tasks/${taskId}`)}
                            className="w-full sm:w-auto px-6 py-3 bg-primary text-white rounded-xl font-black text-sm shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all"
                        >
                            Resubmit Now
                        </button>
                    )}
                </div>

                {/* Submitted Work */}
                {(submission.content || filePaths.length > 0 || links.length > 0) && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-4">
                        <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Submitted Work</h3>

                        {submission.content && (
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Description</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{submission.content}</p>
                            </div>
                        )}

                        {filePaths.length > 0 && (
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <FileImage size={11} /> Files ({filePaths.length})
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {filePaths.map((url, i) => (
                                        isImageUrl(url) ? (
                                            <a
                                                key={i}
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group relative aspect-square rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800"
                                            >
                                                <img
                                                    src={url}
                                                    alt={`Submission file ${i + 1}`}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                    loading="lazy"
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                    <ExternalLink size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </a>
                                        ) : (
                                            <a
                                                key={i}
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-xs font-medium text-primary truncate"
                                            >
                                                <ExternalLink size={12} className="flex-shrink-0" />
                                                {url.split('/').pop() || `File ${i + 1}`}
                                            </a>
                                        )
                                    ))}
                                </div>
                            </div>
                        )}

                        {links.length > 0 && (
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <Link2 size={11} /> Reference Links ({links.length})
                                </p>
                                <div className="space-y-1.5">
                                    {links.map((url, i) => (
                                        <a
                                            key={i}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm text-primary font-medium truncate"
                                        >
                                            <ExternalLink size={12} className="flex-shrink-0" />
                                            {url}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* AI Analysis Details */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">Detailed Analysis</h3>
                    {submission.ai_analysis_result ? (
                        <AIAnalysisCard aiAnalysisResult={submission.ai_analysis_result} />
                    ) : (
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
                            {isPending ? (
                                <>
                                    <Loader2 className="w-12 h-12 text-primary/20 animate-spin mx-auto mb-4" />
                                    <p className="text-gray-400 font-medium">Analyzing your work...</p>
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="w-12 h-12 text-gray-200 dark:text-gray-800 mx-auto mb-4" />
                                    <p className="text-gray-400 font-medium">Detailed AI feedback is not available for this submission.</p>
                                    <p className="text-gray-400 text-sm mt-1">Use "Retrigger AI Review" to request a new analysis.</p>
                                </>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </>
    );
};

export default AIReviewPage;
