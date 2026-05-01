import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, Bot, User, ChevronRight, Loader2, CheckCircle2,
    Languages, Target, Palette, Layout, Sparkles, AlertCircle
} from 'lucide-react';
import {
    startBrief, submitBriefStep, getBriefStatus,
    autosaveBriefAnswer, interruptBrief,
    UNANSWERED_PLACEHOLDER,
    BriefSeed, BriefField, SavedAnswer,
} from '../../api/brief';
import { cn } from '../../lib/utils';
import authService from '../../api/auth';

const LS_KEY = (userId: string, id: string) => `brief_backup_${userId}_${id}`;

type Step = 'initial' | 'chat' | 'complete';
type BriefingStatus =
    | 'not_started'
    | 'in_progress'
    | 'completed_answers'     // all questions answered, not yet submitted
    | 'submitting'            // webhook in flight
    | 'submitted'             // delivery confirmed, workflow processing asynchronously
    | 'clarification_required' // workflow returned new questions
    | 'created'               // workflow explicitly confirmed brief was created
    | 'submit_unknown'        // request timed out — delivery status unknown
    | 'failed';               // definite failure — safe to retry

interface Message {
    id: string;
    role: 'bot' | 'user';
    content: string;
    timestamp: Date;
    type?: 'text' | 'options' | 'input';
    options?: string[];
    fieldKey?: string;
}

const GuidedBrief: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const userId = authService.getCurrentUser()?.id ?? '';

    const [step, setStep] = useState<Step>('initial');
    const [loading, setLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);

    const [seed, setSeed] = useState<BriefSeed>({
        project_name: '',
        objective: '',
        platforms: [],
        tone: 'Professional',
        language: 'English'
    });

    const [messages, setMessages] = useState<Message[]>([]);
    const [allFields, setAllFields] = useState<BriefField[]>([]);   // full n8n schema
    const [currentFieldIdx, setCurrentFieldIdx] = useState(0);
    // responses: fieldKey → {question, answer} — grows with each real answer
    const [responses, setResponses] = useState<Record<string, { question: BriefField; answer: string }>>({});
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [finalBrief, setFinalBrief] = useState<string | null>(null);
    const [resumeError, setResumeError] = useState<string | null>(null);
    const [localBackup, setLocalBackup] = useState<{ sessionId: string; savedAt: string } | null>(null);
    const [briefingStatus, setBriefingStatus] = useState<BriefingStatus>('not_started');
    const [webhookAttemptCount, setWebhookAttemptCount] = useState(0);

    // Refs used by event listeners to avoid stale closures
    const sessionIdRef = useRef<string | null>(null);
    const responsesRef = useRef<Record<string, { question: BriefField; answer: string }>>({});
    const allFieldsRef = useRef<BriefField[]>([]);
    const stepRef = useRef<Step>('initial');
    const interruptSentRef = useRef(false);
    const briefingStatusRef = useRef<BriefingStatus>('not_started');
    // Binary lock — set synchronously before any await; prevents concurrent submit calls
    // even if two events fire in the same JS tick before briefingStatusRef propagates.
    const isSubmittingFinalRef = useRef(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Keep refs in sync with state
    useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
    useEffect(() => { responsesRef.current = responses; }, [responses]);
    useEffect(() => { allFieldsRef.current = allFields; }, [allFields]);
    useEffect(() => { stepRef.current = step; }, [step]);
    useEffect(() => { briefingStatusRef.current = briefingStatus; }, [briefingStatus]);

    // Auto-scroll chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    // Focus input when chat is active
    useEffect(() => {
        if (step === 'chat' && !isTyping && !loading) {
            const t = setTimeout(() => inputRef.current?.focus(), 100);
            return () => clearTimeout(t);
        }
    }, [step, isTyping, loading, messages.length]);

    // ── Interruption guard ────────────────────────────────────────────────────

    const handleInterrupt = useCallback(() => {
        const sid = sessionIdRef.current;
        if (!sid || stepRef.current !== 'chat' || interruptSentRef.current) return;
        // Never interrupt after submission is in flight or confirmed
        const bs = briefingStatusRef.current;
        if (bs === 'submitting' || bs === 'submitted' || bs === 'created' || bs === 'submit_unknown') return;
        interruptSentRef.current = true;

        const answered = responsesRef.current;
        const fields = allFieldsRef.current;

        // Fire-and-forget API call (page is still alive on visibilitychange)
        interruptBrief(sid, answered, fields);
    }, []);

    useEffect(() => {
        const onVisibilityChange = () => {
            if (document.hidden) handleInterrupt();
        };
        const onBeforeUnload = () => {
            const sid = sessionIdRef.current;
            if (!sid || stepRef.current !== 'chat') return;
            // Already finalised or in-flight — nothing to preserve
            const bs = briefingStatusRef.current;
            if (bs === 'created' || bs === 'submitted' || bs === 'submitting' || bs === 'submit_unknown') return;
            // localStorage backup — synchronous, survives tab close
            // (sendBeacon cannot send Authorization headers, so server-side
            //  interrupt is handled by the visibilitychange handler above)
            const backup = {
                sessionId: sid,
                responses: responsesRef.current,
                allFields: allFieldsRef.current,
                briefingStatus: briefingStatusRef.current,
                savedAt: new Date().toISOString(),
            };
            localStorage.setItem(LS_KEY(userId, sid), JSON.stringify(backup));
        };

        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => {
            document.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('beforeunload', onBeforeUnload);
        };
    }, [handleInterrupt]);

    // ── localStorage backup detection (no ?resume= param) ────────────────────

    useEffect(() => {
        if (searchParams.get('resume')) return; // handled by resume flow below
        if (!userId) return; // not authenticated — skip
        // Scan localStorage for brief backups belonging to the current user only
        const keys = Object.keys(localStorage).filter(k => k.startsWith(`brief_backup_${userId}_`));
        if (keys.length === 0) return;
        // Pick the most recent backup
        const backups = keys
            .map(k => { try { return JSON.parse(localStorage.getItem(k)!); } catch { return null; } })
            .filter(Boolean)
            .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
        if (backups.length > 0) {
            setLocalBackup({ sessionId: backups[0].sessionId, savedAt: backups[0].savedAt });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Resume flow ───────────────────────────────────────────────────────────

    useEffect(() => {
        const resumeId = searchParams.get('resume');
        if (!resumeId) return;

        let cancelled = false;

        const resumeBrief = async () => {
            setLoading(true);
            setResumeError(null);
            try {
                const statusData = await getBriefStatus(resumeId);
                if (cancelled) return;

                // Already fully submitted — back to dashboard
                if (statusData.brief_content || statusData.status === 'submitted') {
                    navigate('/client-dashboard');
                    return;
                }

                // Webhook failed on start — not resumable
                if (statusData.status === 'failed_start') {
                    setResumeError(
                        statusData.error
                            ? `Previous brief failed to start: ${statusData.error}. Please start a new brief.`
                            : 'Previous brief failed to start. Please start a new brief.'
                    );
                    return;
                }

                // Project committed but webhook not yet complete — not resumable yet
                if (statusData.status === 'draft' && (!statusData.n8n_response?.fields?.length)) {
                    setResumeError('Previous brief session did not complete initialization. Please start a new brief.');
                    return;
                }

                setSessionId(resumeId);

                const schema = statusData.n8n_response;
                const savedAnswers: Record<string, SavedAnswer> = statusData.saved_answers || {};

                if (!schema || !schema.fields || schema.fields.length === 0) {
                    setResumeError('Could not restore your previous session. Please start a new brief.');
                    return;
                }

                const fields: BriefField[] = schema.fields;
                setAllFields(fields);
                interruptSentRef.current = false;

                // Rebuild conversation from saved answers
                const restoredMessages: Message[] = [];
                const restoredResponses: Record<string, { question: BriefField; answer: string }> = {};
                let firstUnansweredIdx = 0;

                for (let i = 0; i < fields.length; i++) {
                    const field = fields[i];
                    const saved = savedAnswers[field.key];

                    if (saved && saved.answer && saved.answer !== UNANSWERED_PLACEHOLDER) {
                        restoredMessages.push({
                            id: `resume-bot-${i}`,
                            role: 'bot',
                            content: field.label,
                            timestamp: new Date(),
                            type: 'text',
                            fieldKey: field.key,
                        });
                        restoredMessages.push({
                            id: `resume-user-${i}`,
                            role: 'user',
                            content: saved.answer,
                            timestamp: new Date(),
                        });
                        restoredResponses[field.key] = { question: field, answer: saved.answer };
                        firstUnansweredIdx = i + 1;
                    } else {
                        break;
                    }
                }

                // Build the full initial message list including the divider inline,
                // so a single setMessages call sets the final pre-question state.
                const initialMessages: Message[] = [...restoredMessages];
                if (firstUnansweredIdx > 0) {
                    initialMessages.push({
                        id: 'resume-divider',
                        role: 'bot',
                        content: '✅ Your previous answers have been restored. Let\'s continue from where you left off.',
                        timestamp: new Date(),
                        type: 'text',
                    });
                }

                setResponses(restoredResponses);
                setCurrentFieldIdx(firstUnansweredIdx);
                setMessages(initialMessages);
                setStep('chat');

                // Ask the first unanswered question after state settles
                if (firstUnansweredIdx < fields.length) {
                    askQuestion(fields[firstUnansweredIdx]);
                }

            } catch (err) {
                if (cancelled) return;
                console.error('[Brief] Resume failed:', err);
                setResumeError('Failed to resume your brief. Please try starting a new one.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        resumeBrief();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Chat helpers ──────────────────────────────────────────────────────────

    const processQuestions = (fields: BriefField[]) => {
        if (fields.length === 0) return;
        setAllFields(fields);
        setCurrentFieldIdx(0);
        askQuestion(fields[0]);
    };

    const askQuestion = (field: BriefField) => {
        setIsTyping(true);
        const msgId = `bot-${field.key}-${Date.now()}`;
        setTimeout(() => {
            setMessages(prev => {
                // Prevent duplicate: skip if a message with same fieldKey already exists
                if (prev.some(m => m.fieldKey === field.key && m.role === 'bot')) return prev;
                return [...prev, {
                    id: msgId,
                    role: 'bot',
                    content: field.label,
                    timestamp: new Date(),
                    type: field.type === 'select' || field.type === 'multiselect' ? 'options' : 'input',
                    options: field.options,
                    fieldKey: field.key,
                }];
            });
            setIsTyping(false);
        }, 800);
    };

    // Terminal statuses: webhook must NOT be called again.
    const TERMINAL_STATUSES: BriefingStatus[] = ['submitting', 'submitted', 'created', 'submit_unknown'];

    // Sends the final webhook exactly once.
    // Two independent locks prevent any duplicate:
    //   1. isSubmittingFinalRef — set synchronously before any await (binary semaphore)
    //   2. briefingStatusRef    — set to 'submitting' immediately after; secondary guard
    const sendFinalWebhook = useCallback(async (
        answersToSend: Record<string, { question: BriefField; answer: string }>
    ) => {
        // Lock 1: binary semaphore — catches same-tick concurrent calls
        if (isSubmittingFinalRef.current) return;
        // Lock 2: status guard — catches calls after first lock was released for retry
        if (TERMINAL_STATUSES.includes(briefingStatusRef.current)) return;

        const sid = sessionIdRef.current;
        if (!sid) return;

        // Set BOTH locks synchronously before any await
        isSubmittingFinalRef.current = true;
        briefingStatusRef.current = 'submitting';
        setBriefingStatus('submitting');
        setWebhookAttemptCount(prev => prev + 1);
        setLoading(true);
        setIsTyping(true);

        try {
            const result = await submitBriefStep(sid, answersToSend);

            if (result.status === 'created' || result.mode === 'complete' || result.code === 333 || result.code === '333') {
                // Workflow confirmed brief was created
                briefingStatusRef.current = 'created';
                setBriefingStatus('created');
                setStep('complete');
                setFinalBrief(result.brief_content || 'Your brief has been successfully created.');
                localStorage.removeItem(LS_KEY(userId, sid));
                setLocalBackup(null);

            } else if (result.status === 'submitted') {
                // Delivery confirmed — workflow is processing asynchronously
                briefingStatusRef.current = 'submitted';
                setBriefingStatus('submitted');
                setStep('complete');
                setFinalBrief(null); // will show generic "submitted" message in complete screen
                localStorage.removeItem(LS_KEY(userId, sid));
                setLocalBackup(null);

            } else if (result.status === 'clarification') {
                // Workflow needs more answers — continue chat with new questions
                briefingStatusRef.current = 'clarification_required';
                setBriefingStatus('clarification_required');
                isSubmittingFinalRef.current = false; // unlock for next round
                setResponses({});
                setMessages(prev => [...prev, {
                    id: `clarif-${Date.now()}`,
                    role: 'bot',
                    content: 'Thank you for your answers! I have a few follow-up questions to complete your brief.',
                    timestamp: new Date(),
                }]);
                processQuestions(result.fields || []);

            } else if (result.status === 'submit_unknown') {
                // Timeout — delivery unknown, do NOT auto-retry
                briefingStatusRef.current = 'submit_unknown';
                setBriefingStatus('submit_unknown');
                isSubmittingFinalRef.current = false; // allow deliberate retry
                setMessages(prev => [...prev, {
                    id: `warn-${Date.now()}`,
                    role: 'bot',
                    content: 'Submission status is uncertain — the server took too long to respond. Your answers are saved. Please check the workflow before retrying.',
                    timestamp: new Date(),
                }]);

            } else {
                // Unexpected shape — definite failure, safe to retry
                throw new Error(`Unrecognised response: ${JSON.stringify(result)}`);
            }

        } catch (error) {
            console.error('[Brief] Submit error:', error);
            briefingStatusRef.current = 'failed';
            setBriefingStatus('failed');
            isSubmittingFinalRef.current = false; // allow retry
            setMessages(prev => [...prev, {
                id: `err-${Date.now()}`,
                role: 'bot',
                content: 'Sorry, I encountered an error submitting your brief. Your answers are saved — click "Retry Submission" below.',
                timestamp: new Date(),
            }]);
        } finally {
            setLoading(false);
            setIsTyping(false);
            // Do NOT clear isSubmittingFinalRef here for terminal success statuses
            // (submitted / created). Only cleared explicitly above for retriable paths.
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSendMessage = async (content: string, fieldKey?: string) => {
        if (!content.trim()) return;
        // Block while submitting or after a terminal success — prevents duplicate chat entries
        // and any accidental second submit triggered by lingering UI events.
        if (
            briefingStatusRef.current === 'submitting' ||
            briefingStatusRef.current === 'submitted' ||
            briefingStatusRef.current === 'created' ||
            briefingStatusRef.current === 'submit_unknown'
        ) return;

        const userMsg: Message = {
            id: Math.random().toString(36).substring(7),
            role: 'user',
            content,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');

        const currentField = allFields[currentFieldIdx];
        const key = fieldKey || currentField?.key || 'generic';
        const stepData = { question: currentField, answer: content };
        const newResponses = { ...responses, [key]: stepData };
        setResponses(newResponses);

        // Autosave this answer immediately
        if (sessionId && currentField) {
            autosaveBriefAnswer(sessionId, key, currentField, content);
            // Also update localStorage backup
            const backup = {
                sessionId,
                responses: newResponses,
                allFields: allFieldsRef.current,
                briefingStatus: 'in_progress',
                savedAt: new Date().toISOString(),
            };
            localStorage.setItem(LS_KEY(userId, sessionId), JSON.stringify(backup));
        }

        // Reset interrupt flag since we just saved new progress
        interruptSentRef.current = false;

        if (currentFieldIdx < allFields.length - 1) {
            const nextIdx = currentFieldIdx + 1;
            setCurrentFieldIdx(nextIdx);
            askQuestion(allFields[nextIdx]);
        } else {
            // All questions answered — send webhook exactly once
            setBriefingStatus('completed_answers');
            await sendFinalWebhook(newResponses);
        }
    };

    // ── Initial form submit ───────────────────────────────────────────────────

    const handleInitialSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setResumeError(null);
        try {
            const response = await startBrief(seed);
            setSessionId(response.sessionId);
            interruptSentRef.current = false;

            const n8n = response.n8n_response;
            if (n8n.mode === 'complete' || n8n.code === 333 || n8n.code === '333') {
                setBriefingStatus('created');
                setStep('complete');
                setFinalBrief(n8n.brief_content || 'Brief completed.');
            } else if (n8n.mode === 'schema') {
                setBriefingStatus('in_progress');
                setStep('chat');
                processQuestions(n8n.fields || []);
            } else {
                // n8n returned something we don't recognise (shouldn't happen after backend fix)
                setResumeError('The briefing engine returned an unexpected response. Please try again.');
            }
        } catch (error: any) {
            console.error('[Brief] Start error:', error);
            const detail = error?.response?.data?.detail ?? 'Failed to start the briefing process. Please try again.';
            setResumeError(detail);
        } finally {
            setLoading(false);
        }
    };

    const togglePlatform = (p: string) => {
        setSeed(prev => ({
            ...prev,
            platforms: prev.platforms.includes(p)
                ? prev.platforms.filter(x => x !== p)
                : [...prev.platforms, p]
        }));
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-white selection:bg-primary/30">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
                <header className="mb-12 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-center gap-2 mb-4"
                    >
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400">
                            Guided Project Briefing
                        </h1>
                    </motion.div>
                    <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto">Let's define your project vision together.</p>
                </header>

                {localBackup && step === 'initial' && (
                    <div className="mb-6 flex items-center justify-between gap-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl px-4 py-3 text-sm">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                            <span>You have an unfinished brief from {new Date(localBackup.savedAt).toLocaleString()}. Continue where you left off?</span>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                            <button
                                onClick={() => navigate(`/guided-brief?resume=${localBackup.sessionId}`)}
                                className="text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                Continue
                            </button>
                            <button
                                onClick={() => {
                                    localStorage.removeItem(LS_KEY(userId, localBackup.sessionId));
                                    setLocalBackup(null);
                                }}
                                className="text-xs text-amber-500/60 hover:text-amber-400 px-2 py-1.5 transition-colors"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                )}

                {resumeError && (
                    <div className="mb-6 flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {resumeError}
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {/* ── Loading spinner (initial form → n8n) ── */}
                    {step === 'initial' && loading && (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white/90 dark:bg-[#0f0f0f]/80 backdrop-blur-2xl border border-gray-200 dark:border-white/10 rounded-3xl p-16 flex flex-col items-center justify-center space-y-8 shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)] min-h-[450px]"
                        >
                            <div className="relative">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                    className="w-24 h-24 rounded-full border-b-2 border-r-2 border-primary/40"
                                />
                                <motion.div
                                    animate={{ rotate: -360 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    className="w-24 h-24 rounded-full border-t-2 border-l-2 border-primary absolute top-0 left-0"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Bot className="w-10 h-10 text-primary animate-pulse" />
                                </div>
                            </div>
                            <div className="text-center space-y-4">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Consulting AI Strategist</h2>
                                <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm leading-relaxed">
                                    Analyzing your project seeds to build a custom briefing experience…
                                </p>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/5 rounded-full border border-gray-200 dark:border-white/10">
                                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Securely connecting to system</span>
                            </div>
                        </motion.div>
                    )}

                    {/* ── Initial seed form ── */}
                    {step === 'initial' && !loading && (
                        <motion.div
                            key="initial"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            className="bg-white dark:bg-[#0f0f0f]/80 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-2xl p-8 space-y-8"
                        >
                            <form onSubmit={handleInitialSubmit} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 ml-1">
                                            <Layout className="w-4 h-4 text-primary" /> Project Name
                                        </label>
                                        <input
                                            required type="text"
                                            placeholder="e.g. Summer Marketing Campaign"
                                            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                            value={seed.project_name}
                                            onChange={e => setSeed({ ...seed, project_name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 ml-1">
                                            <Target className="w-4 h-4 text-primary" /> Main Objective
                                        </label>
                                        <input
                                            required type="text"
                                            placeholder="e.g. Increase brand awareness"
                                            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                            value={seed.objective}
                                            onChange={e => setSeed({ ...seed, objective: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 ml-1">
                                            <Palette className="w-4 h-4 text-primary" /> Brand Tone
                                        </label>
                                        <select
                                            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
                                            value={seed.tone}
                                            onChange={e => setSeed({ ...seed, tone: e.target.value })}
                                        >
                                            {['Professional', 'Creative', 'Informal', 'Bold', 'Minimalist'].map(t =>
                                                <option key={t} className="bg-[#111]">{t}</option>
                                            )}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 ml-1">
                                            <Languages className="w-4 h-4 text-primary" /> Language
                                        </label>
                                        <select
                                            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
                                            value={seed.language}
                                            onChange={e => setSeed({ ...seed, language: e.target.value })}
                                        >
                                            {['English', 'French', 'Arabic', 'Spanish'].map(l =>
                                                <option key={l} className="bg-[#111]">{l}</option>
                                            )}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 ml-1">Platforms</label>
                                    <div className="flex flex-wrap gap-3">
                                        {['Instagram', 'LinkedIn', 'Facebook', 'Twitter', 'TikTok', 'Email', 'Web'].map(p => (
                                            <button
                                                key={p} type="button" onClick={() => togglePlatform(p)}
                                                className={cn(
                                                    "px-4 py-2 rounded-full border text-sm transition-all duration-300",
                                                    seed.platforms.includes(p)
                                                        ? "bg-primary border-primary text-white shadow-lg shadow-primary/30"
                                                        : "border-gray-300 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-white/30"
                                                )}
                                            >{p}</button>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    disabled={loading || !seed.project_name || !seed.objective}
                                    type="submit"
                                    className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2 transition-all transform active:scale-95"
                                >
                                    {loading
                                        ? <Loader2 className="w-5 h-5 animate-spin" />
                                        : <>Start Analysis <ChevronRight className="w-5 h-5" /></>
                                    }
                                </button>
                            </form>
                        </motion.div>
                    )}

                    {/* ── Chat stage ── */}
                    {step === 'chat' && (
                        <motion.div
                            key="chat"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-[#0f0f0f]/80 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl flex flex-col h-[600px] shadow-2xl relative overflow-hidden"
                        >
                            {/* Progress bar */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gray-100 dark:bg-white/5">
                                <motion.div
                                    animate={{
                                        width: `${(currentFieldIdx / (allFields.length || 1)) * 100}%`
                                    }}
                                    transition={{ ease: 'easeOut' }}
                                    className="h-full bg-primary"
                                />
                            </div>

                            {/* Progress label */}
                            {allFields.length > 0 && (
                                <div className="absolute top-2 right-4 text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                                    {Math.min(currentFieldIdx, allFields.length)}/{allFields.length}
                                </div>
                            )}

                            {/* Messages */}
                            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10 mt-2">
                                {messages.map((m) => (
                                    <motion.div
                                        key={m.id}
                                        initial={{ opacity: 0, x: m.role === 'bot' ? -10 : 10, scale: 0.95 }}
                                        animate={{ opacity: 1, x: 0, scale: 1 }}
                                        className={cn(
                                            "flex gap-3 max-w-[85%]",
                                            m.role === 'user' ? "ml-auto flex-row-reverse" : ""
                                        )}
                                    >
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1",
                                            m.role === 'bot' ? "bg-primary/20 text-primary" : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300"
                                        )}>
                                            {m.role === 'bot' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                                        </div>
                                        <div className={cn(
                                            "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                                            m.role === 'bot'
                                                ? "bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-200 rounded-tl-none border border-gray-200 dark:border-white/5"
                                                : "bg-primary text-white rounded-tr-none shadow-lg shadow-primary/10"
                                        )}>
                                            {m.content}
                                            {m.type === 'options' && m.options && (
                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    {m.options.map(opt => (
                                                        <button
                                                            key={opt}
                                                            disabled={loading || isSubmittingFinalRef.current}
                                                            onClick={() => handleSendMessage(opt, m.fieldKey)}
                                                            className="px-3 py-1.5 bg-white/20 dark:bg-white/10 hover:bg-white/30 dark:hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs transition-colors"
                                                        >{opt}</button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}

                                {isTyping && (
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                                            <Bot className="w-5 h-5" />
                                        </div>
                                        <div className="bg-gray-100 dark:bg-white/5 px-4 py-2 rounded-2xl rounded-tl-none border border-gray-200 dark:border-white/5 flex gap-1 items-center">
                                            {[0, 0.2, 0.4].map((delay, i) => (
                                                <motion.div
                                                    key={i}
                                                    animate={{ opacity: [0.3, 1, 0.3] }}
                                                    transition={{ repeat: Infinity, duration: 1, delay }}
                                                    className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Input */}
                            <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const last = messages[messages.length - 1];
                                        if (last?.role === 'bot' && last?.type === 'input') {
                                            handleSendMessage(inputValue, last.fieldKey);
                                        }
                                    }}
                                    className="flex gap-3"
                                >
                                    <input
                                        ref={inputRef}
                                        disabled={loading || (messages.length > 0 && messages[messages.length - 1].role === 'user')}
                                        type="text"
                                        value={inputValue}
                                        onChange={e => setInputValue(e.target.value)}
                                        placeholder="Type your answer…"
                                        className="flex-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all text-sm"
                                    />
                                    <button
                                        disabled={loading || !inputValue.trim()}
                                        type="submit"
                                        className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary/90 disabled:opacity-30 active:scale-95"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                </form>
                            </div>

                            {/* Retry strip — failed = safe retry; submit_unknown = deliberate retry */}
                            {(briefingStatus === 'failed' || briefingStatus === 'submit_unknown') && !loading && (
                                <div className="px-4 pb-4">
                                    <button
                                        onClick={() => sendFinalWebhook(responses)}
                                        className={cn(
                                            "w-full text-sm font-medium py-2.5 rounded-xl border transition-colors",
                                            briefingStatus === 'submit_unknown'
                                                ? "text-amber-400 hover:text-amber-300 border-amber-500/30 hover:border-amber-500/50 bg-amber-500/5"
                                                : "text-red-400 hover:text-red-300 border-red-500/30 hover:border-red-500/50 bg-red-500/5"
                                        )}
                                    >
                                        {briefingStatus === 'submit_unknown'
                                            ? 'Retry Submission (check workflow first)'
                                            : 'Retry Submission'}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ── Complete ── */}
                    {step === 'complete' && (
                        <motion.div
                            key="complete"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white dark:bg-[#0f0f0f]/80 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-12 text-center shadow-2xl"
                        >
                            <div className={cn(
                                "w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6",
                                briefingStatus === 'created'
                                    ? "bg-green-500/20 text-green-500"
                                    : "bg-blue-500/20 text-blue-400"
                            )}>
                                <CheckCircle2 className="w-10 h-10" />
                            </div>

                            {briefingStatus === 'created' ? (
                                <>
                                    <h2 className="text-3xl font-bold mb-4">Brief Created!</h2>
                                    <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
                                        Your project brief has been successfully created.
                                    </p>
                                    {finalBrief && (
                                        <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6 mb-8 text-left">
                                            <h3 className="text-xs font-bold tracking-widest text-primary mb-3 uppercase">Summary</h3>
                                            <div className="text-gray-600 dark:text-gray-300 italic whitespace-pre-wrap">
                                                "{finalBrief}"
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <h2 className="text-3xl font-bold mb-4">Brief Submitted!</h2>
                                    <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
                                        Your brief has been received and is being processed. Your manager will be notified when it's ready.
                                    </p>
                                </>
                            )}

                            <button
                                onClick={() => navigate('/client-dashboard')}
                                className="inline-flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-black font-bold px-8 py-3 rounded-xl hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors"
                            >
                                Go to Dashboard <ChevronRight className="w-5 h-5" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default GuidedBrief;
