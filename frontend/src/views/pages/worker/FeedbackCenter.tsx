import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Filter, ArrowRight, RotateCcw, CheckCircle2, AlertTriangle } from 'lucide-react';
import WorkerNav from '../../components/worker/WorkerNav';
import { workerApi } from '../../../api/worker';
import type { TaskFeedback } from '../../../types';

type FilterType = 'all' | 'revision' | 'approval';

const FeedbackCenter: React.FC = () => {
    const navigate = useNavigate();
    const [feedbacks, setFeedbacks] = useState<TaskFeedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>('all');

    useEffect(() => {
        workerApi.getMyFeedback()
            .then(setFeedbacks)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        if (filter === 'revision') return feedbacks.filter(fb => fb.is_revision_request);
        if (filter === 'approval') return feedbacks.filter(fb => !fb.is_revision_request);
        return feedbacks;
    }, [feedbacks, filter]);

    const revisionCount = feedbacks.filter(fb => fb.is_revision_request).length;
    const approvalCount = feedbacks.filter(fb => !fb.is_revision_request).length;

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

    return (
        <>
            <WorkerNav />
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">Feedback Center</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{feedbacks.length} total feedback items</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                        <div className="text-2xl font-black text-gray-900 dark:text-white">{feedbacks.length}</div>
                        <div className="text-xs text-gray-400 mt-0.5">Total</div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-rose-100 dark:border-rose-900/30 p-4">
                        <div className="text-2xl font-black text-rose-500">{revisionCount}</div>
                        <div className="text-xs text-gray-400 mt-0.5">Revisions</div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-green-100 dark:border-green-900/30 p-4">
                        <div className="text-2xl font-black text-green-500">{approvalCount}</div>
                        <div className="text-xs text-gray-400 mt-0.5">Approvals</div>
                    </div>
                </div>

                {/* Filter */}
                <div className="flex gap-2">
                    {(['all', 'revision', 'approval'] as FilterType[]).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 text-sm font-bold rounded-xl border capitalize transition-all ${
                                filter === f
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-primary/40'
                            }`}
                        >
                            {f === 'all' ? 'All' : f === 'revision' ? 'Revisions' : 'Approvals'}
                        </button>
                    ))}
                </div>

                {/* Feedback List */}
                {filtered.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl p-16 text-center">
                        <MessageSquare size={40} className="mx-auto text-gray-200 dark:text-gray-700 mb-3" />
                        <p className="text-gray-400 dark:text-gray-600 font-semibold">No feedback here.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map(fb => (
                            <div
                                key={fb.id}
                                className={`bg-white dark:bg-gray-900 rounded-2xl border p-5 ${
                                    fb.is_revision_request
                                        ? 'border-rose-100 dark:border-rose-900/30'
                                        : 'border-green-100 dark:border-green-900/30'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {fb.is_revision_request ? (
                                            <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                                                <RotateCcw size={9} /> Revision Required
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                                                <CheckCircle2 size={9} /> Approved
                                            </span>
                                        )}
                                        <span className="text-[10px] text-gray-400">{new Date(fb.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/worker/tasks/${fb.task_id}`)}
                                        className="shrink-0 flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                                    >
                                        View Task <ArrowRight size={12} />
                                    </button>
                                </div>
                                <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{fb.message}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default FeedbackCenter;
