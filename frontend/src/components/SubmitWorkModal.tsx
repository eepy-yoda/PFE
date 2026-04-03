/**
 * SubmitWorkModal.tsx
 * ────────────────────
 * Fully rebuilt work submission modal.
 *
 * Features:
 *   - Drag-and-drop image upload zone
 *   - Per-file upload progress bars
 *   - Image preview grid with remove buttons
 *   - File type + size validation (client-side)
 *   - Phase state machine: idle → uploading → submitting → success | error
 *   - Inline brief reference panel (read-only)
 *   - Webhook status display (validated / rejected / pending)
 *   - Retry option after failure (keeps already-uploaded images)
 *   - Framer Motion enter/exit animations
 */

import React, { useRef, useState, useCallback, DragEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    X,
    Upload,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Loader2,
    RefreshCw,
    FileText,
    ImageIcon,
    ZapIcon,
    Info,
} from 'lucide-react';
import type { Task, TaskSubmission } from '../types';
import { submissionsApi } from '../api/submissions';
import AIAnalysisCard from './AIAnalysisCard';

// ── constants ─────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_MB = 10;
const MAX_FILES        = 5;
const ALLOWED_TYPES    = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXT      = 'JPEG, PNG, WebP, GIF';

// ── types ─────────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'uploading' | 'submitting' | 'success' | 'error';

interface FileEntry {
    id:       string;         // stable key
    file:     File;
    preview:  string;         // object URL
    progress: number;         // 0–100%
    url?:     string;         // filled after successful upload
    failed?:  boolean;
}

interface Props {
    task:          Task;
    projectBrief?: string;   // project.brief_content (read-only reference)
    onClose:       () => void;
    onSuccess:     () => void;
}

// ── helpers ───────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

function formatBytes(bytes: number): string {
    if (bytes < 1024)           return `${bytes} B`;
    if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── component ─────────────────────────────────────────────────────────────────

const SubmitWorkModal: React.FC<Props> = ({ task, projectBrief, onClose, onSuccess }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── form state ──────────────────────────────────────────────────────────
    const [content,   setContent]   = useState('');
    const [linksRaw,  setLinksRaw]  = useState('');
    const [files,     setFiles]     = useState<FileEntry[]>([]);
    const [fileError, setFileError] = useState('');
    const [isDragging, setIsDragging] = useState(false);

    // ── phase machine ────────────────────────────────────────────────────────
    const [phase,      setPhase]      = useState<Phase>('idle');
    const [errorMsg,   setErrorMsg]   = useState('');
    const [submission, setSubmission] = useState<TaskSubmission | null>(null);

    // ── file validation ──────────────────────────────────────────────────────

    const validateAndAdd = useCallback((selected: File[]) => {
        setFileError('');
        if (!selected.length) return;

        const invalid  = selected.filter(f => !ALLOWED_TYPES.includes(f.type));
        const oversize = selected.filter(f => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);

        if (invalid.length) {
            setFileError(`Only ${ALLOWED_EXT} images are accepted.`);
            return;
        }
        if (oversize.length) {
            setFileError(`Each image must be under ${MAX_FILE_SIZE_MB} MB.`);
            return;
        }
        if (files.length + selected.length > MAX_FILES) {
            setFileError(`Maximum ${MAX_FILES} images per submission.`);
            return;
        }

        const entries: FileEntry[] = selected.map(file => ({
            id:      uid(),
            file,
            preview: URL.createObjectURL(file),
            progress: 0,
        }));
        setFiles(prev => [...prev, ...entries]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [files.length]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        validateAndAdd(Array.from(e.target.files ?? []));
    };

    const removeFile = (id: string) => {
        setFiles(prev => {
            const entry = prev.find(f => f.id === id);
            if (entry) URL.revokeObjectURL(entry.preview);
            return prev.filter(f => f.id !== id);
        });
    };

    // ── drag-and-drop handlers ───────────────────────────────────────────────

    const onDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };
    const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };
    const onDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (phase !== 'idle' && phase !== 'error') return;
        const dropped = Array.from(e.dataTransfer.files).filter(f => ALLOWED_TYPES.includes(f.type));
        if (dropped.length !== e.dataTransfer.files.length) {
            setFileError(`Only ${ALLOWED_EXT} files are accepted.`);
        }
        validateAndAdd(dropped);
    };

    // ── submit flow ──────────────────────────────────────────────────────────

    const handleSubmit = async () => {
        if (phase === 'uploading' || phase === 'submitting') return;

        setErrorMsg('');

        // ── 1. Upload images (sequentially for clean progress) ──
        setPhase('uploading');
        const uploadedUrls: string[] = [];

        try {
            for (let i = 0; i < files.length; i++) {
                const entry = files[i];

                // Already uploaded in a previous attempt — reuse URL
                if (entry.url) {
                    uploadedUrls.push(entry.url);
                    continue;
                }

                const url = await submissionsApi.uploadImage(
                    entry.file,
                    task.id,
                    (pct) => {
                        setFiles(prev =>
                            prev.map((f, idx) => idx === i ? { ...f, progress: pct } : f),
                        );
                    },
                );

                uploadedUrls.push(url);
                setFiles(prev =>
                    prev.map((f, idx) => idx === i ? { ...f, url, progress: 100 } : f),
                );
            }
        } catch (uploadErr: unknown) {
            const msg = (uploadErr as Error)?.message ?? 'Image upload failed.';
            setErrorMsg(msg);
            setPhase('error');
            return;
        }

        // ── 2. Submit record to backend ──
        setPhase('submitting');
        try {
            const links = linksRaw
                .split('\n')
                .map(l => l.trim())
                .filter(Boolean);

            const result = await submissionsApi.submit(task.id, {
                content:    content.trim() || undefined,
                links:      links.length ? links : undefined,
                file_paths: uploadedUrls.length ? uploadedUrls : undefined,
            });

            setSubmission(result);
            setPhase('success');

            // Refresh task list in background so status updates
            onSuccess();


        } catch (submitErr: unknown) {
            const err = submitErr as { response?: { data?: { detail?: string } }; message?: string };
            const msg = err?.response?.data?.detail ?? err?.message ?? 'Submission failed. Please try again.';
            setErrorMsg(msg);
            setPhase('error');
        }
    };

    const handleRetry = () => {
        setPhase('idle');
        setErrorMsg('');
        setSubmission(null);
    };

    const canSubmit =
        phase === 'idle' &&
        (content.trim().length > 0 || linksRaw.trim().length > 0 || files.length > 0);

    const busy = phase === 'uploading' || phase === 'submitting';

    // ── render ───────────────────────────────────────────────────────────────

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-950/70 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, y: 48 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 48 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="bg-white dark:bg-gray-900 rounded-t-[2.5rem] sm:rounded-[2rem] shadow-2xl shadow-gray-900/20 w-full sm:max-w-2xl max-h-[92vh] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col"
            >
                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="px-7 py-5 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between shrink-0 bg-gray-50/40 dark:bg-gray-800/20">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary mb-0.5 block">
                            Submit Work
                        </span>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight line-clamp-2 max-w-lg">
                            {task.title}
                        </h2>
                        {task.deadline && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-medium">
                                Due {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        disabled={busy}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ml-4 disabled:opacity-30 flex-shrink-0"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* ── Scrollable body ─────────────────────────────────────── */}
                <div className="overflow-y-auto flex-1 px-7 py-6 space-y-6">

                    {/* ── SUCCESS state ───────────────────────────────────── */}
                    <AnimatePresence>
                        {phase === 'success' && submission && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.92 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col gap-5"
                            >
                                {/* Header */}
                                <div className="flex flex-col items-center text-center gap-3 pt-6">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                                        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl ${
                                            submission.submission_status === 'validated'
                                                ? 'bg-emerald-100 dark:bg-emerald-900/30 shadow-emerald-500/20'
                                                : 'bg-rose-100 dark:bg-rose-900/30 shadow-rose-500/20'
                                        }`}
                                    >
                                        {submission.submission_status === 'validated'
                                            ? <CheckCircle2 size={36} className="text-emerald-500" />
                                            : <AlertCircle size={36} className="text-rose-500" />
                                        }
                                    </motion.div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 dark:text-white">
                                            {submission.submission_status === 'validated'
                                                ? 'AI Approved — Sent to Manager!'
                                                : 'Revision Required'}
                                        </h3>
                                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                                            {submission.submission_status === 'validated'
                                                ? 'Your work passed AI review and is now with your manager.'
                                                : 'Review the AI feedback below and resubmit when ready.'}
                                        </p>
                                    </div>
                                    {submission.submission_status === 'validated' && (
                                        <div className="flex items-center gap-2 text-xs text-emerald-500 dark:text-emerald-400 font-medium">
                                            <CheckCircle2 size={12} />
                                            Record saved successfully
                                        </div>
                                    )}
                                </div>

                                {/* AI Analysis Card */}
                                {submission.ai_analysis_result && (
                                    <AIAnalysisCard aiAnalysisResult={submission.ai_analysis_result} />
                                )}

                                {/* Manual close button for rejected submissions */}
                                <button
                                    onClick={() => { onClose(); }}
                                    className={`w-full py-4 rounded-2xl font-black text-sm transition-all transform active:scale-95 shadow-lg ${
                                        submission.submission_status === 'validated'
                                            ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
                                            : 'bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {submission.submission_status === 'validated' ? 'Awesome, Got it!' : 'Close & Revise Later'}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── ERROR banner ─────────────────────────────────────── */}
                    {phase === 'error' && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/30 rounded-2xl p-5 flex flex-col gap-3"
                        >
                            <div className="flex items-start gap-3">
                                <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
                                        {errorMsg || 'Something went wrong.'}
                                    </p>
                                    <p className="text-xs text-rose-500 dark:text-rose-400 mt-0.5">
                                        Already-uploaded images are preserved — just retry.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleRetry}
                                className="flex items-center gap-2 self-start px-4 py-2 bg-rose-500 text-white rounded-xl font-bold text-sm hover:bg-rose-600 transition-colors"
                            >
                                <RefreshCw size={14} /> Retry Submission
                            </button>
                        </motion.div>
                    )}

                    {/* ── FORM (hidden on success) ─────────────────────────── */}
                    {phase !== 'success' && (
                        <>
                            {/* Client brief reference */}
                            {projectBrief && (
                                <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl p-4 border border-amber-100 dark:border-amber-900/30">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileText size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                                            Client Brief (reference)
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-5 whitespace-pre-wrap">
                                        {projectBrief}
                                    </p>
                                </div>
                            )}

                            {/* Description */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                    Work Description
                                    <span className="font-medium normal-case text-gray-300 dark:text-gray-600">(optional)</span>
                                </label>
                                <textarea
                                    rows={3}
                                    className="w-full bg-gray-50 dark:bg-gray-950 border-none rounded-2xl px-5 py-4 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all placeholder-gray-300 dark:placeholder-gray-700 resize-none"
                                    placeholder="Describe what you built, decisions made, tools used…"
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    disabled={busy}
                                />
                            </div>

                            {/* Reference links */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                    Reference Links
                                    <span className="font-medium normal-case text-gray-300 dark:text-gray-600">(one per line, optional)</span>
                                </label>
                                <textarea
                                    rows={2}
                                    className="w-full bg-gray-50 dark:bg-gray-950 border-none rounded-2xl px-5 py-4 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all placeholder-gray-300 dark:placeholder-gray-700 resize-none"
                                    placeholder={"https://figma.com/…\nhttps://drive.google.com/…"}
                                    value={linksRaw}
                                    onChange={e => setLinksRaw(e.target.value)}
                                    disabled={busy}
                                />
                            </div>

                            {/* ── IMAGE UPLOAD ───────────────────────────────── */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                        <ImageIcon size={12} />
                                        Images
                                        <span className="font-medium normal-case text-gray-300 dark:text-gray-600">
                                            ({files.length}/{MAX_FILES})
                                        </span>
                                    </label>
                                    <span className="text-[10px] text-gray-400 dark:text-gray-600">
                                        {ALLOWED_EXT} · max {MAX_FILE_SIZE_MB} MB each
                                    </span>
                                </div>

                                {/* Image preview grid */}
                                {files.length > 0 && (
                                    <div className={`grid gap-3 ${files.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
                                        {files.map((entry) => (
                                            <div key={entry.id} className="relative group rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 aspect-video">
                                                <img
                                                    src={entry.preview}
                                                    alt="preview"
                                                    className="w-full h-full object-cover"
                                                />

                                                {/* Upload progress bar */}
                                                {phase === 'uploading' && !entry.url && (
                                                    <>
                                                        <div className="absolute inset-0 bg-gray-900/30 flex items-center justify-center">
                                                            <span className="text-white text-sm font-black">{entry.progress}%</span>
                                                        </div>
                                                        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gray-200/50">
                                                            <motion.div
                                                                className="h-full bg-primary"
                                                                animate={{ width: `${entry.progress}%` }}
                                                                transition={{ duration: 0.2 }}
                                                            />
                                                        </div>
                                                    </>
                                                )}

                                                {/* Uploaded check */}
                                                {entry.url && (
                                                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                                                        <CheckCircle2 size={13} className="text-white" />
                                                    </div>
                                                )}

                                                {/* File size label */}
                                                <div className="absolute bottom-2 left-2 bg-gray-900/60 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                                                    {formatBytes(entry.file.size)}
                                                </div>

                                                {/* Remove button (idle or error only) */}
                                                {(phase === 'idle' || phase === 'error') && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFile(entry.id)}
                                                        className="absolute top-2 left-2 w-7 h-7 rounded-full bg-gray-900/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500"
                                                        aria-label="Remove image"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* File error */}
                                {fileError && (
                                    <p className="text-xs font-bold text-rose-500 flex items-center gap-1.5">
                                        <AlertCircle size={12} /> {fileError}
                                    </p>
                                )}

                                {/* Drop zone */}
                                {files.length < MAX_FILES && (phase === 'idle' || phase === 'error') && (
                                    <div
                                        onDragOver={onDragOver}
                                        onDragLeave={onDragLeave}
                                        onDrop={onDrop}
                                        onClick={() => { setFileError(''); fileInputRef.current?.click(); }}
                                        className={`w-full rounded-2xl border-2 border-dashed cursor-pointer transition-all py-8 flex flex-col items-center gap-2.5 ${
                                            isDragging
                                                ? 'border-primary bg-primary/5 scale-[1.01]'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                        }`}
                                    >
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                                            isDragging ? 'bg-primary/10' : 'bg-gray-100 dark:bg-gray-800'
                                        }`}>
                                            <Upload size={22} className={isDragging ? 'text-primary' : 'text-gray-400'} />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-gray-600 dark:text-gray-400">
                                                {isDragging
                                                    ? 'Drop images here'
                                                    : files.length === 0
                                                        ? 'Upload images'
                                                        : 'Add more images'
                                                }
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">
                                                Drag & drop or click to browse
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept={ALLOWED_TYPES.join(',')}
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </div>

                            {/* Submission requirement hint */}
                            {!canSubmit && (
                                <div className="flex items-start gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30">
                                    <Info size={13} className="text-blue-400 shrink-0 mt-0.5" />
                                    <p className="text-xs text-blue-500 dark:text-blue-400">
                                        Add at least one image, description, or reference link before submitting.
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ── Footer ─────────────────────────────────────────────── */}
                {phase !== 'success' && (
                    <div className="px-7 py-5 border-t border-gray-100 dark:border-gray-800 flex gap-3 shrink-0 bg-gray-50/30 dark:bg-gray-800/20">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={busy}
                            className="flex-1 py-3.5 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 transition-all text-sm disabled:opacity-40"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            id="submit-work-btn"
                            onClick={handleSubmit}
                            disabled={!canSubmit || busy}
                            className="flex-[2] py-3.5 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 text-sm"
                        >
                            {phase === 'uploading' && (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Uploading…
                                    <span className="text-primary-100/70 text-xs ml-1">
                                        ({files.filter(f => f.url).length}/{files.length})
                                    </span>
                                </>
                            )}
                            {phase === 'submitting' && (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Submitting to n8n…
                                </>
                            )}
                            {(phase === 'idle' || phase === 'error') && (
                                <>
                                    <ZapIcon size={16} />
                                    Submit Work
                                </>
                            )}
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default SubmitWorkModal;
