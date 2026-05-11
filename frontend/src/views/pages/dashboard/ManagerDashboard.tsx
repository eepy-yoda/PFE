import React, { useState, useEffect } from 'react';
import { projectsService, type ManagerDashboardData } from '../../../api/projects';
import { submissionsApi } from '../../../api/submissions';
import { useNavigate } from 'react-router-dom';
import ManagementBoard from '../../components/management/ManagementBoard';
import {
    LayoutDashboard, Users, MessageSquare, Briefcase,
    ArrowRight, RefreshCw, AlertTriangle, Send, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ClientRejectionSummary } from '../../../types';

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

    // Client rejections state
    const [rejections, setRejections] = useState<ClientRejectionSummary[]>([]);
    const [rejectionsLoading, setRejectionsLoading] = useState(false);
    const [reviewModal, setReviewModal] = useState<ClientRejectionSummary | null>(null);
    const [reviewAction, setReviewAction] = useState<'send_to_worker' | 'ask_client_clarification'>('send_to_worker');
    const [reviewNote, setReviewNote] = useState('');
    const [reviewSaving, setReviewSaving] = useState(false);
    const [reviewError, setReviewError] = useState<string | null>(null);

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

    const fetchRejections = async () => {
        setRejectionsLoading(true);
        try {
            const data = await submissionsApi.getClientRejections();
            setRejections(data);
        } catch (err) {
            console.error('Failed to fetch client rejections', err);
        } finally {
            setRejectionsLoading(false);
        }
    };

    useEffect(() => { fetchDash(); fetchRejections(); }, []);

    const handleReviewSubmit = async () => {
        if (!reviewModal) return;
        const note = reviewNote.trim();
        if (reviewAction === 'ask_client_clarification' && note.length < 10) {
            setReviewError('Clarification message must be at least 10 characters.');
            return;
        }
        setReviewSaving(true);
        setReviewError(null);
        try {
            await submissionsApi.managerReviewRejection(
                reviewModal.submission_id,
                reviewAction,
                note || undefined,
            );
            setRejections(prev => prev.filter(r => r.submission_id !== reviewModal.submission_id));
            setReviewModal(null);
            setReviewNote('');
        } catch (err: any) {
            setReviewError(err?.response?.data?.detail ?? 'Failed to submit. Try again.');
        } finally {
            setReviewSaving(false);
        }
    };

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

                        {/* Client Rejections */}
                        <section className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden lg:col-span-2 mt-4">
                            <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-rose-50/40 dark:bg-rose-900/10">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle size={18} className="text-rose-500" />
                                    <h2 className="font-black text-gray-800 dark:text-gray-100">Client Rejections</h2>
                                </div>
                                {!rejectionsLoading && (
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${rejections.length > 0 ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                                        {rejections.length} Pending
                                    </span>
                                )}
                            </div>
                            <div className="divide-y divide-gray-50 dark:divide-gray-800">
                                {rejectionsLoading ? (
                                    [1, 2].map(i => (
                                        <div key={i} className="p-5 space-y-2">
                                            <Skel cls="h-4 w-2/3" />
                                            <Skel cls="h-3 w-full" />
                                            <Skel cls="h-3 w-5/6" />
                                        </div>
                                    ))
                                ) : rejections.length > 0 ? (
                                    rejections.map(r => (
                                        <div key={r.submission_id} className="p-5 flex flex-col sm:flex-row sm:items-start gap-4">
                                            {r.watermark_preview_url && (
                                                <img
                                                    src={r.watermark_preview_url}
                                                    alt="preview"
                                                    className="w-16 h-16 rounded-xl object-cover shrink-0 border border-gray-100 dark:border-gray-700"
                                                />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 flex-wrap">
                                                    <div>
                                                        <p className="font-bold text-gray-900 dark:text-white text-sm">{r.task_title}</p>
                                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                                            {r.project_name} · Client: {r.client_name}{r.worker_name ? ` · Worker: ${r.worker_name}` : ''}
                                                        </p>
                                                    </div>
                                                    {r.rejected_at && (
                                                        <span className="text-[10px] text-gray-400 shrink-0">{new Date(r.rejected_at).toLocaleDateString()}</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2 bg-rose-50 dark:bg-rose-900/10 rounded-xl px-3 py-2 border border-rose-100 dark:border-rose-800/30 italic">
                                                    "{r.client_feedback}"
                                                </p>
                                                <div className="flex gap-2 mt-3">
                                                    <button
                                                        onClick={() => { setReviewModal(r); setReviewAction('send_to_worker'); setReviewNote(''); setReviewError(null); }}
                                                        className="text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800/40 transition-colors"
                                                    >
                                                        Send to Worker
                                                    </button>
                                                    <button
                                                        onClick={() => { setReviewModal(r); setReviewAction('ask_client_clarification'); setReviewNote(''); setReviewError(null); }}
                                                        className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800/40 transition-colors"
                                                    >
                                                        Ask Clarification
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(`/project/${r.project_id}`)}
                                                        className="text-xs font-bold px-3 py-1.5 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
                                                    >
                                                        View Project <ArrowRight size={11} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-12 text-center text-gray-400 dark:text-gray-500 italic text-sm">
                                        No pending client rejections.
                                    </div>
                                )}
                            </div>
                        </section>

                    </motion.div>
                )}
            </AnimatePresence>

            {/* Manager review rejection modal */}
            {reviewModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-800">
                        <div className="px-8 py-6 border-b border-gray-50 dark:border-gray-800 flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <MessageSquare size={16} className="text-indigo-500" />
                                    <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Review Client Feedback</span>
                                </div>
                                <h2 className="text-xl font-black text-gray-900 dark:text-white">{reviewModal.task_title}</h2>
                                <p className="text-sm text-gray-400 mt-0.5">{reviewModal.project_name}</p>
                            </div>
                            <button onClick={() => setReviewModal(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>
                        <div className="px-8 py-6 space-y-5">
                            {/* Client feedback display */}
                            <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/40 rounded-2xl px-4 py-3">
                                <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">Client Feedback</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{reviewModal.client_feedback}</p>
                            </div>

                            {/* Action selector */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setReviewAction('send_to_worker')}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${reviewAction === 'send_to_worker' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                >
                                    Send to Worker
                                </button>
                                <button
                                    onClick={() => setReviewAction('ask_client_clarification')}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${reviewAction === 'ask_client_clarification' ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                >
                                    Ask Clarification
                                </button>
                            </div>

                            {/* Note textarea */}
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                    {reviewAction === 'send_to_worker' ? 'Note to worker (optional)' : 'Clarification message (required, min 10 chars)'}
                                </label>
                                <textarea
                                    rows={3}
                                    className="w-full bg-gray-50 dark:bg-gray-950 border-none rounded-2xl px-5 py-4 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all resize-none placeholder-gray-300 dark:placeholder-gray-700"
                                    placeholder={reviewAction === 'send_to_worker' ? 'Add context for the worker…' : 'Ask the client to clarify their feedback…'}
                                    value={reviewNote}
                                    onChange={e => { setReviewNote(e.target.value); setReviewError(null); }}
                                />
                            </div>

                            {reviewError && (
                                <div className="flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl px-3 py-2.5">
                                    <AlertTriangle size={15} className="shrink-0" />
                                    {reviewError}
                                </div>
                            )}
                        </div>
                        <div className="px-8 py-5 bg-gray-50/50 dark:bg-gray-800/50 flex gap-3">
                            <button
                                onClick={() => setReviewModal(null)}
                                disabled={reviewSaving}
                                className="flex-1 py-3.5 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 transition-all text-sm disabled:opacity-40"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReviewSubmit}
                                disabled={reviewSaving || (reviewAction === 'ask_client_clarification' && reviewNote.trim().length < 10)}
                                className="flex-[2] py-3.5 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                            >
                                {reviewSaving ? 'Sending…' : <><Send size={16} /> {reviewAction === 'send_to_worker' ? 'Forward to Worker' : 'Request Clarification'}</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagerDashboard;
