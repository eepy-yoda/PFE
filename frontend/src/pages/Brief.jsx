import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Info, Target, Layout as LayoutIcon, MessageSquare, Globe } from 'lucide-react';
import { briefService } from '../services/brief';
import DynamicForm from '../components/brief/DynamicForm';

const Brief = () => {
    const navigate = useNavigate();

    // States
    const [step, setStep] = useState('seed'); // 'seed' | 'dynamic' | 'complete'
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [sessionId, setSessionId] = useState(null);
    const [currentSchema, setCurrentSchema] = useState(null);
    const [finalBrief, setFinalBrief] = useState(null);

    // Initial check for existing session
    useEffect(() => {
        const savedSessionId = sessionStorage.getItem('brief_sessionId');
        if (savedSessionId) {
            resumeSession(savedSessionId);
        }
    }, []);

    const resumeSession = async (sid) => {
        setIsLoading(true);
        try {
            const response = await briefService.getStatus(sid);
            setSessionId(response.sessionId);

            if (response.status === 'briefing' && response.n8n_response) {
                setCurrentSchema(response.n8n_response);
                setStep('dynamic');
            } else if (response.status === 'planning') {
                setFinalBrief(response.brief_content);
                setStep('complete');
            }
        } catch (err) {
            console.error("Failed to resume session:", err);
            sessionStorage.removeItem('brief_sessionId');
        } finally {
            setIsLoading(false);
        }
    };

    // Seed Form State
    const [seedData, setSeedData] = useState({
        project_name: '',
        objective: 'lead-gen',
        platforms: ['LinkedIn'],
        tone: 'Professional',
        language: 'English'
    });

    const handleSeedSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await briefService.startBrief(seedData);
            setSessionId(response.sessionId);
            sessionStorage.setItem('brief_sessionId', response.sessionId);

            if (response.n8n_response.mode === 'schema') {
                setCurrentSchema(response.n8n_response);
                setStep('dynamic');
            } else if (response.n8n_response.mode === 'complete') {
                setFinalBrief(response.n8n_response.brief_content);
                setStep('complete');
                sessionStorage.removeItem('brief_sessionId');
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to start briefing session. Please check your connection.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDynamicSubmit = async (formData) => {
        setError('');
        setIsLoading(true);

        try {
            const response = await briefService.submitStep(sessionId, formData);

            if (response.mode === 'schema') {
                setCurrentSchema(response);
            } else if (response.mode === 'complete') {
                setFinalBrief(response.brief_content);
                setStep('complete');
                sessionStorage.removeItem('brief_sessionId');
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to submit step.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePlatformToggle = (platform) => {
        setSeedData(prev => ({
            ...prev,
            platforms: prev.platforms.includes(platform)
                ? prev.platforms.filter(p => p !== platform)
                : [...prev.platforms, platform]
        }));
    };

    if (step === 'complete') {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-6">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="max-w-2xl w-full text-center space-y-8"
                >
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 shadow-xl shadow-green-100/50">
                        <CheckCircle2 size={48} />
                    </div>
                    <div className="space-y-4">
                        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Brief Generated!</h1>
                        <p className="text-gray-500 text-xl font-medium">Your strategy is ready. Our team has been notified and will begin orchestration.</p>
                    </div>

                    <div className="bg-gray-50 border border-gray-100 p-8 rounded-3xl text-left">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Brief Summary</h3>
                        <div className="prose prose-blue max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
                            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                {finalBrief || "Your comprehensive project brief has been successfully created."}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full py-5 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1 transition-all"
                    >
                        Go to Dashboard
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFDFF]">
            {/* Navigation */}
            <header className="fixed top-0 w-full bg-white/70 backdrop-blur-xl border-b border-gray-100/50 z-50">
                <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors font-medium"
                    >
                        <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-gray-100 transition-colors">
                            <ArrowLeft size={18} />
                        </div>
                        <span>Back</span>
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                            <Sparkles size={20} />
                        </div>
                        <span className="font-extrabold text-xl tracking-tight text-gray-900">Briefing Room</span>
                    </div>
                    <div className="w-24 flex justify-end">
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Step</span>
                            <span className="text-sm font-bold text-primary">{step === 'seed' ? '01' : '02'} / 02</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto pt-32 pb-24 px-6 grid md:grid-cols-12 gap-12">
                {/* Left Sidebar - Context & Info */}
                <div className="md:col-span-4 hidden md:block space-y-8">
                    <div className="space-y-6 sticky top-32">
                        <div>
                            <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Define your scope.</h2>
                            <p className="text-gray-500 leading-relaxed font-medium">
                                Our AI-powered briefing system eliminates ambiguity and builds a roadmap for your success.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {[
                                { icon: <Info size={18} />, title: "Precise Execution", desc: "Structured data leads to better results." },
                                { icon: <Target size={18} />, title: "Goal Oriented", desc: "Every question is designed to refine objectives." },
                                { icon: <Sparkles size={18} />, title: "AI Orchestration", desc: "Your inputs feed directly into our production engine." }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                                    <div className="text-primary mt-1">{item.icon}</div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm">{item.title}</h4>
                                        <p className="text-xs text-gray-500">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Content - Forms */}
                <div className="md:col-span-8">
                    <AnimatePresence mode="wait">
                        {step === 'seed' ? (
                            <motion.div
                                key="seed"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="bg-white border border-gray-100 shadow-2xl shadow-gray-200/50 rounded-3xl p-8 space-y-8">
                                    <div className="space-y-2">
                                        <h2 className="text-2xl font-bold text-gray-900">Project Fundamentals</h2>
                                        <p className="text-gray-500">Let's start with the base configuration.</p>
                                    </div>

                                    {error && (
                                        <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 border border-red-100 font-medium text-sm">
                                            <AlertCircle size={18} />
                                            {error}
                                        </div>
                                    )}

                                    <form onSubmit={handleSeedSubmit} className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700 ml-1">Project Name</label>
                                            <input
                                                required
                                                value={seedData.project_name}
                                                onChange={e => setSeedData({ ...seedData, project_name: e.target.value })}
                                                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                                                placeholder="e.g., Summer Brand Refresh"
                                            />
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-gray-700 ml-1">Objective</label>
                                                <div className="relative">
                                                    <select
                                                        value={seedData.objective}
                                                        onChange={e => setSeedData({ ...seedData, objective: e.target.value })}
                                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium appearance-none"
                                                    >
                                                        <option value="awareness">Brand Awareness</option>
                                                        <option value="lead-gen">Lead Generation</option>
                                                        <option value="promotion">Product Promotion</option>
                                                        <option value="engagement">Community Engagement</option>
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                        <Target size={18} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-gray-700 ml-1">Tone of Voice</label>
                                                <div className="relative">
                                                    <select
                                                        value={seedData.tone}
                                                        onChange={e => setSeedData({ ...seedData, tone: e.target.value })}
                                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium appearance-none"
                                                    >
                                                        <option value="Professional">Professional</option>
                                                        <option value="Friendly">Friendly</option>
                                                        <option value="Luxury">Luxury</option>
                                                        <option value="Bold">Bold / Disruptive</option>
                                                        <option value="Educational">Educational</option>
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                        <MessageSquare size={18} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-sm font-semibold text-gray-700 ml-1">Distribution Platforms</label>
                                            <div className="flex flex-wrap gap-2">
                                                {['LinkedIn', 'Twitter', 'Instagram', 'Blog', 'Email'].map(platform => (
                                                    <button
                                                        key={platform}
                                                        type="button"
                                                        onClick={() => handlePlatformToggle(platform)}
                                                        className={`px-6 py-3 rounded-xl font-bold text-sm transition-all border ${seedData.platforms.includes(platform)
                                                            ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                                                            : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                                                            }`}
                                                    >
                                                        {platform}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700 ml-1">Primary Language</label>
                                            <div className="relative">
                                                <select
                                                    value={seedData.language}
                                                    onChange={e => setSeedData({ ...seedData, language: e.target.value })}
                                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium appearance-none"
                                                >
                                                    <option value="English">English</option>
                                                    <option value="French">French</option>
                                                    <option value="Spanish">Spanish</option>
                                                    <option value="Arabic">Arabic</option>
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                    <Globe size={18} />
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full py-5 bg-gradient-to-r from-primary to-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1 transition-all disabled:opacity-70 flex items-center justify-center gap-2 mt-4"
                                        >
                                            {isLoading ? <Loader2 className="animate-spin" /> : <><span>Initialize Briefing</span> <ChevronRight size={20} /></>}
                                        </button>
                                    </form>
                                </div>
                            </motion.div>
                        ) : (
                            <DynamicForm
                                schema={currentSchema}
                                onSubmit={handleDynamicSubmit}
                                isLoading={isLoading}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* Custom Styles */}
            <style jsx="true">{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #E5E7EB;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #D1D5DB;
                }
            `}</style>
        </div>
    );
};

const ChevronRight = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="m9 18 6-6-6-6" />
    </svg>
);

export default Brief;
