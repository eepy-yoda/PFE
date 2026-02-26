import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, ChevronRight, Loader2, CheckCircle2, Languages, Target, Palette, Layout, Sparkles } from 'lucide-react';
import { startBrief, submitBriefStep, BriefSeed } from '../../api/brief';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

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
    const [currentFieldIdx, setCurrentFieldIdx] = useState(0);
    const [remainingFields, setRemainingFields] = useState<any[]>([]);
    const [responses, setResponses] = useState<Record<string, any>>({});
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [finalBrief, setFinalBrief] = useState<string | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleInitialSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await startBrief(seed);
            setSessionId(response.sessionId);

            if (response.n8n_response.mode === 'complete' || response.n8n_response.code === 333 || response.n8n_response.code === '333') {
                setStep('complete');
                setFinalBrief(response.n8n_response.brief_content || 'Brief completed.');
            } else if (response.n8n_response.mode === 'schema') {
                setStep('chat');
                processQuestions(response.n8n_response.fields || []);
            }
        } catch (error) {
            console.error('Error starting brief:', error);
            alert('Failed to start briefing process. Please check your connection to n8n.');
        } finally {
            setLoading(false);
        }
    };

    const processQuestions = (fields: any[]) => {
        if (fields.length === 0) return;
        setRemainingFields(fields);
        setCurrentFieldIdx(0);
        askQuestion(fields[0]);
    };

    const askQuestion = (field: any) => {
        setIsTyping(true);
        setTimeout(() => {
            const newMessage: Message = {
                id: Math.random().toString(36).substring(7),
                role: 'bot',
                content: field.label,
                timestamp: new Date(),
                type: field.type === 'select' || field.type === 'multiselect' ? 'options' : 'input',
                options: field.options,
                fieldKey: field.key
            };
            setMessages(prev => [...prev, newMessage]);
            setIsTyping(false);
        }, 1000);
    };

    const handleSendMessage = async (content: string, fieldKey?: string) => {
        if (!content.trim()) return;
        const userMsg: Message = {
            id: Math.random().toString(36).substring(7),
            role: 'user',
            content,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');

        // Pack the question info along with the answer
        const currentField = remainingFields[currentFieldIdx];
        const stepData = {
            question: currentField,
            answer: content
        };

        const newResponses = { ...responses, [fieldKey || 'generic']: stepData };
        setResponses(newResponses);

        if (currentFieldIdx < remainingFields.length - 1) {
            const nextIdx = currentFieldIdx + 1;
            setCurrentFieldIdx(nextIdx);
            askQuestion(remainingFields[nextIdx]);
        } else {
            setLoading(true);
            setIsTyping(true);
            try {
                const result = await submitBriefStep(sessionId!, newResponses);
                // Check for both explicit "complete" mode and status code 333
                if (result.mode === 'complete' || result.code === 333 || result.code === '333') {
                    setStep('complete');
                    setFinalBrief(result.brief_content || 'The brief has been generated and sent to the analysis engine.');
                } else if (result.mode === 'schema') {
                    setResponses({});
                    processQuestions(result.fields || []);
                }
            } catch (error) {
                console.error('Error submitting step:', error);
                setMessages(prev => [...prev, {
                    id: 'err',
                    role: 'bot',
                    content: 'Sorry, I encountered an error communicating with the analysis engine.',
                    timestamp: new Date()
                }]);
            } finally {
                setLoading(false);
                setIsTyping(false);
            }
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

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
                <header className="mb-12 text-center">
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center gap-2 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Guided Project Briefing</h1>
                    </motion.div>
                    <p className="text-gray-400 max-w-lg mx-auto">Let's define your project vision together.</p>
                </header>

                <AnimatePresence mode="wait">
                    {step === 'initial' && (
                        <motion.div key="initial" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="bg-[#0f0f0f]/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-8 space-y-8">
                            <form onSubmit={handleInitialSubmit} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm font-medium text-gray-300 ml-1"><Layout className="w-4 h-4 text-primary" /> Project Name</label>
                                        <input required type="text" placeholder="e.g. Summer Marketing Campaign" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-gray-600" value={seed.project_name} onChange={e => setSeed({ ...seed, project_name: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm font-medium text-gray-300 ml-1"><Target className="w-4 h-4 text-primary" /> Main Objective</label>
                                        <input required type="text" placeholder="e.g. Increase brand awareness" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-gray-600" value={seed.objective} onChange={e => setSeed({ ...seed, objective: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm font-medium text-gray-300 ml-1"><Palette className="w-4 h-4 text-primary" /> Brand Tone</label>
                                        <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none" value={seed.tone} onChange={e => setSeed({ ...seed, tone: e.target.value })}>
                                            {['Professional', 'Creative', 'Informal', 'Bold', 'Minimalist'].map(t => <option key={t} className="bg-[#111]">{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm font-medium text-gray-300 ml-1"><Languages className="w-4 h-4 text-primary" /> Language</label>
                                        <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none" value={seed.language} onChange={e => setSeed({ ...seed, language: e.target.value })}>
                                            {['English', 'French', 'Arabic', 'Spanish'].map(l => <option key={l} className="bg-[#111]">{l}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="block text-sm font-medium text-gray-300 ml-1">Platforms</label>
                                    <div className="flex flex-wrap gap-3">
                                        {['Instagram', 'LinkedIn', 'Facebook', 'Twitter', 'TikTok', 'Email', 'Web'].map(p => (
                                            <button key={p} type="button" onClick={() => togglePlatform(p)} className={cn("px-4 py-2 rounded-full border text-sm transition-all duration-300", seed.platforms.includes(p) ? "bg-primary border-primary text-white shadow-lg shadow-primary/30" : "border-white/10 text-gray-400 hover:border-white/30")}>{p}</button>
                                        ))}
                                    </div>
                                </div>
                                <button disabled={loading || !seed.project_name || !seed.objective} type="submit" className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2 transition-all transform active:scale-95">
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Start Analysis <ChevronRight className="w-5 h-5" /></>}
                                </button>
                            </form>
                        </motion.div>
                    )}

                    {step === 'chat' && (
                        <motion.div key="chat" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0f0f0f]/80 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col h-[600px] shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                                <motion.div animate={{ width: `${((messages.filter(m => m.role === 'user').length) / (remainingFields.length || 1) * 100)}%` }} className="h-full bg-primary" />
                            </div>
                            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
                                {messages.map((m) => (
                                    <motion.div key={m.id} initial={{ opacity: 0, x: m.role === 'bot' ? -10 : 10, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} className={cn("flex gap-3 max-w-[85%]", m.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1", m.role === 'bot' ? "bg-primary/20 text-primary" : "bg-white/10 text-gray-300")}>{m.role === 'bot' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}</div>
                                        <div className={cn("px-4 py-3 rounded-2xl text-sm leading-relaxed", m.role === 'bot' ? "bg-white/5 text-gray-200 rounded-tl-none border border-white/5" : "bg-primary text-white rounded-tr-none shadow-lg shadow-primary/10")}>
                                            {m.content}
                                            {m.type === 'options' && m.options && (
                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    {m.options.map(opt => <button key={opt} onClick={() => handleSendMessage(opt, m.fieldKey)} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-colors">{opt}</button>)}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                                {isTyping && (
                                    <div className="flex gap-3"><div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center"><Bot className="w-5 h-5" /></div><div className="bg-white/5 px-4 py-2 rounded-2xl rounded-tl-none border border-white/5 flex gap-1 items-center"><motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" /><motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" /><motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" /></div></div>
                                )}
                            </div>
                            <div className="p-4 border-t border-white/10 bg-white/[0.02]">
                                <form onSubmit={(e) => { e.preventDefault(); const lastMsg = messages[messages.length - 1]; if (lastMsg && lastMsg.role === 'bot' && lastMsg.type === 'input') handleSendMessage(inputValue, lastMsg.fieldKey); }} className="flex gap-3">
                                    <input disabled={loading || (messages.length > 0 && messages[messages.length - 1].role === 'user')} type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Type your message..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all text-sm" />
                                    <button disabled={loading || !inputValue.trim()} type="submit" className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary/90 disabled:opacity-30 active:scale-95"><Send className="w-5 h-5" /></button>
                                </form>
                            </div>
                        </motion.div>
                    )}

                    {step === 'complete' && (
                        <motion.div key="complete" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#0f0f0f]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center shadow-2xl">
                            <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-3xl flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="w-10 h-10" /></div>
                            <h2 className="text-3xl font-bold mb-4">Brief Created!</h2>
                            <p className="text-gray-400 mb-8 max-w-md mx-auto">Your project brief has been successfully analyzed.</p>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8 text-left">
                                <h3 className="text-xs font-bold tracking-widest text-primary mb-3 uppercase">Summary</h3>
                                <div className="text-gray-300 italic whitespace-pre-wrap">" {finalBrief || 'No summary available.'} "</div>
                            </div>
                            <button onClick={() => navigate('/client-dashboard')} className="inline-flex items-center gap-2 bg-white text-black font-bold px-8 py-3 rounded-xl hover:bg-gray-200 transition-colors">Go to Dashboard <ChevronRight className="w-5 h-5" /></button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default GuidedBrief;
