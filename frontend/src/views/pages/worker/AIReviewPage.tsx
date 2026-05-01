import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import WorkerNav from '../../components/worker/WorkerNav';
import AIAnalysisCard from '../../../components/AIAnalysisCard';
import { submissionsApi } from '../../../api/submissions';
import { projectsService } from '../../../api/projects';
import type { TaskSubmission, Task } from '../../../types';

const AIReviewPage: React.FC = () => {
    const { taskId, submissionId } = useParams<{ taskId: string; submissionId: string }>();
    const navigate = useNavigate();

    const [submission, setSubmission] = useState<TaskSubmission | null>(null);
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
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

    // Auto-refresh if pending
    useEffect(() => {
        let interval: any;
        if (submission?.submission_status === 'pending') {
            interval = setInterval(() => {
                loadData(true);
            }, 5000); // refresh every 5 seconds
        }
        return () => clearInterval(interval);
    }, [submission?.submission_status, loadData]);

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
                    
                    <button 
                        onClick={() => loadData(true)}
                        disabled={refreshing}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm"
                    >
                        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                        {refreshing ? 'Refreshing...' : 'Refresh Status'}
                    </button>
                </div>

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
                            {submission.submission_status === 'validated' ? 'Great job! Your work aligns with the brief and has been forwarded to your manager.' :
                             submission.submission_status === 'rejected' ? 'The AI analysis found some areas that need improvement to match the brief requirements.' :
                             'Please wait while our AI analyzes your submission against the project brief. This usually takes 30-60 seconds.'}
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

                {/* AI Analysis Details */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">Detailed Analysis</h3>
                    {submission.ai_analysis_result ? (
                        <AIAnalysisCard aiAnalysisResult={submission.ai_analysis_result} />
                    ) : (
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
                            {submission.submission_status === 'pending' ? (
                                <>
                                    <Loader2 className="w-12 h-12 text-primary/20 animate-spin mx-auto mb-4" />
                                    <p className="text-gray-400 font-medium">Analyzing your work...</p>
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="w-12 h-12 text-gray-200 dark:text-gray-800 mx-auto mb-4" />
                                    <p className="text-gray-400 font-medium">Detailed AI feedback is not available for this submission.</p>
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
