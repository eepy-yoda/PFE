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

const LS_KEY = (id: string) => `brief_backup_${id}`;

type Step = 'initial' | 'chat' | 'complete';

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

    // Refs used by event listeners to avoid stale closures
    const sessionIdRef = useRef<string | null>(null);
    const responsesRef = useRef<Record<string, { question: BriefField; answer: string }>>({});
    const allFieldsRef = useRef<BriefField[]>([]);
    const stepRef = useRef<Step>('initial');
    const interruptSentRef = useRef(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Keep refs in sync with state
    useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
    useEffect(() => { responsesRef.current = responses; }, [responses]);
    useEffect(() => { allFieldsRef.current = allFields; }, [allFields]);
    useEffect(() => { stepRef.current = step; }, [step]);

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
            // localStorage backup — synchronous, survives tab close
            // (sendBeacon cannot send Authorization headers, so server-side
            //  interrupt is handled by the visibilitychange handler above)
            const backup = {
                sessionId: sid,
                responses: responsesRef.current,
                allFields: allFieldsRef.current,
                savedAt: new Date().toISOString(),
            };
            localStorage.setItem(LS_KEY(sid), JSON.stringify(backup));
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
        // Scan localStorage for any brief backup saved from a previous session
        const keys = Object.keys(localStorage).filter(k => k.startsWith('brief_backup_'));
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

        const resumeBrief = async () => {
            setLoading(true);
            setResumeError(null);
            try {
                const statusData = await getBriefStatus(resumeId);

                // If already fully submitted, send back to dashboard
                if (statusData.brief_content || statusData.status === 'submitted') {
                    navigate('/client-dashboard');
                    return;
                }

                setSessionId(resumeId);

                const schema = statusData.n8n_response;
                const savedAnswers: Record<string, SavedAnswer> = statusData.saved_answers || {};

                if (!schema || !schema.fields || schema.fields.length === 0) {
                    // No schema — can't resume, start fresh from the same project
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
                        // Answered field — reconstruct the Q+A messages
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
                        // First unanswered field found — stop here
                        break;
                    }
                }

                setResponses(restoredResponses);
                setCurrentFieldIdx(firstUnansweredIdx);
                setMessages(restoredMessages);
                setStep('chat');

                // Add a divider message if we're resuming mid-way
                if (firstUnansweredIdx > 0) {
                    setMessages(prev => [
                        ...prev,
                        {
                            id: 'resume-divider',
                            role: 'bot',
                            content: '✅ Your previous answers have been restored. Let\'s continue from where you left off.',
                            timestamp: new Date(),
                            type: 'text',
                        }
                    ]);
                }

                // Ask the first unanswered question
                if (firstUnansweredIdx < fields.length) {
                    askQuestion(fields[firstUnansweredIdx]);
                }

            } catch (err) {
                console.error('[Brief] Resume failed:', err);
                setResumeError('Failed to resume your brief. Please try starting a new one.');
            } finally {
                setLoading(false);
            }
        };

        resumeBrief();
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
        setTimeout(() => {
            const msg: Message = {
                id: Math.random().toString(36).substring(7),
                role: 'bot',
                content: field.label,
                timestamp: new Date(),
                type: field.type === 'select' || field.type === 'multiselect' ? 'options' : 'input',
                options: field.options,
                fieldKey: field.key,
            };
            setMessages(prev => [...prev, msg]);
            setIsTyping(false);
        }, 800);
    };

    const handleSendMessage = async (content: string, fieldKey?: string) => {
        if (!content.trim()) return;

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
                savedAt: new Date().toISOString(),
            };
            localStorage.setItem(LS_KEY(sessionId), JSON.stringify(backup));
        }

        // Reset interrupt flag since we just saved new progress
        interruptSentRef.current = false;

        if (currentFieldIdx < allFields.length - 1) {
            const nextIdx = currentFieldIdx + 1;
            setCurrentFieldIdx(nextIdx);
            askQuestion(allFields[nextIdx]);
        } else {
            // All questions answered — submit the full brief
            setLoading(true);
            setIsTyping(true);
            try {
                const result = await submitBriefStep(sessionId!, newResponses);
                if (result.mode === 'complete' || result.code === 333 || result.code === '333') {
                    setStep('complete');
                    setFinalBrief(result.brief_content || 'The brief has been generated and sent to the analysis engine.');
                    // Clean up localStorage backup and recovery banner
                    if (sessionId) localStorage.removeItem(LS_KEY(sessionId));
                    setLocalBackup(null);
                } else if (result.mode === 'schema') {
                    // n8n returned more questions (multi-round flow)
                    setResponses({});
                    processQuestions(result.fields || []);
                }
            } catch (error) {
                console.error('[Brief] Submit error:', error);
                setMessages(prev => [...prev, {
                    id: 'err',
                    role: 'bot',
                    content: 'Sorry, I encountered an error submitting your brief. Your answers are saved — you can resume from your dashboard.',
                    timestamp: new Date(),
                }]);
            } finally {
                setLoading(false);
                setIsTyping(false);
            }
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
                setStep('complete');
                setFinalBrief(n8n.brief_content || 'Brief completed.');
            } else if (n8n.mode === 'schema') {
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
        <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30">
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
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            Guided Project Briefing
                        </h1>
                    </motion.div>
                    <p className="text-gray-400 max-w-lg mx-auto">Let's define your project vision together.</p>
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
                                    localStorage.removeItem(LS_KEY(localBackup.sessionId));
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
                            className="bg-[#0f0f0f]/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-16 flex flex-col items-center justify-center space-y-8 shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)] min-h-[450px]"
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
                                <h2 className="text-2xl font-bold text-white tracking-tight">Consulting AI Strategist</h2>
                                <p className="text-gray-400 text-sm max-w-sm leading-relaxed">
                                    Analyzing your project seeds to build a custom briefing experience…
                                </p>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
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
                            className="bg-[#0f0f0f]/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-8 space-y-8"
                        >
                            <form onSubmit={handleInitialSubmit} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm font-medium text-gray-300 ml-1">
                                            <Layout className="w-4 h-4 text-primary" /> Project Name
                                        </label>
                                        <input
                                            required type="text"
                                            placeholder="e.g. Summer Marketing Campaign"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-gray-600"
                                            value={seed.project_name}
                                            onChange={e => setSeed({ ...seed, project_name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm font-medium text-gray-300 ml-1">
                                            <Target className="w-4 h-4 text-primary" /> Main Objective
                                        </label>
                                        <input
                                            required type="text"
                                            placeholder="e.g. Increase brand awareness"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-gray-600"
                                            value={seed.objective}
                                            onChange={e => setSeed({ ...seed, objective: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm font-medium text-gray-300 ml-1">
                                            <Palette className="w-4 h-4 text-primary" /> Brand Tone
                                        </label>
                                        <select
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
                                            value={seed.tone}
                                            onChange={e => setSeed({ ...seed, tone: e.target.value })}
                                        >
                                            {['Professional', 'Creative', 'Informal', 'Bold', 'Minimalist'].map(t =>
                                                <option key={t} className="bg-[#111]">{t}</option>
                                            )}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm font-medium text-gray-300 ml-1">
                                            <Languages className="w-4 h-4 text-primary" /> Language
                                        </label>
                                        <select
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
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
                                    <label className="block text-sm font-medium text-gray-300 ml-1">Platforms</label>
                                    <div className="flex flex-wrap gap-3">
                                        {['Instagram', 'LinkedIn', 'Facebook', 'Twitter', 'TikTok', 'Email', 'Web'].map(p => (
                                            <button
                                                key={p} type="button" onClick={() => togglePlatform(p)}
                                                className={cn(
                                                    "px-4 py-2 rounded-full border text-sm transition-all duration-300",
                                                    seed.platforms.includes(p)
                                                        ? "bg-primary border-primary text-white shadow-lg shadow-primary/30"
                                                        : "border-white/10 text-gray-400 hover:border-white/30"
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
                            className="bg-[#0f0f0f]/80 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col h-[600px] shadow-2xl relative overflow-hidden"
                        >
                            {/* Progress bar */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
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
                                <div className="absolute top-2 right-4 text-[10px] text-gray-500 font-medium">
                                    {Math.min(currentFieldIdx, allFields.length)}/{allFields.length}
                                </div>
                            )}

                            {/* Messages */}
                            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10 mt-2">
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
                                            m.role === 'bot' ? "bg-primary/20 text-primary" : "bg-white/10 text-gray-300"
                                        )}>
                                            {m.role === 'bot' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                                        </div>
                                        <div className={cn(
                                            "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                                            m.role === 'bot'
                                                ? "bg-white/5 text-gray-200 rounded-tl-none border border-white/5"
                                                : "bg-primary text-white rounded-tr-none shadow-lg shadow-primary/10"
                                        )}>
                                            {m.content}
                                            {m.type === 'options' && m.options && (
                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    {m.options.map(opt => (
                                                        <button
                                                            key={opt}
                                                            onClick={() => handleSendMessage(opt, m.fieldKey)}
                                                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-colors"
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
                                        <div className="bg-white/5 px-4 py-2 rounded-2xl rounded-tl-none border border-white/5 flex gap-1 items-center">
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
                            <div className="p-4 border-t border-white/10 bg-white/[0.02]">
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
                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all text-sm"
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
                        </motion.div>
                    )}

                    {/* ── Complete ── */}
                    {step === 'complete' && (
                        <motion.div
                            key="complete"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-[#0f0f0f]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center shadow-2xl"
                        >
                            <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <h2 className="text-3xl font-bold mb-4">Brief Created!</h2>
                            <p className="text-gray-400 mb-8 max-w-md mx-auto">
                                Your project brief has been successfully analyzed.
                            </p>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8 text-left">
                                <h3 className="text-xs font-bold tracking-widest text-primary mb-3 uppercase">Summary</h3>
                                <div className="text-gray-300 italic whitespace-pre-wrap">
                                    "{finalBrief || 'No summary available.'}"
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/client-dashboard')}
                                className="inline-flex items-center gap-2 bg-white text-black font-bold px-8 py-3 rounded-xl hover:bg-gray-200 transition-colors"
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
