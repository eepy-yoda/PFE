import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, Bot, User, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { projectService } from '../services/project';

const BriefRequest = () => {
    const navigate = useNavigate();
    const scrollRef = useRef(null);

    // States
    const [step, setStep] = useState('initial'); // 'initial' or 'chat' or 'completed'
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentProject, setCurrentProject] = useState(null);

    // Form States
    const [formData, setFormData] = useState({
        name: '',
        goals: '',
        target_audience: '',
    });

    // Chat States
    const [messages, setMessages] = useState([]);
    const [currentAnswer, setCurrentAnswer] = useState('');

    // Auto-scroll chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleInitialSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const project = await projectService.requestBrief(formData);
            setCurrentProject(project);

            // Add initial bot message if it exists
            if (project.next_question) {
                setMessages([{ role: 'assistant', content: project.next_question }]);
            }

            setStep('chat');
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to start briefing session.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnswerSubmit = async (e) => {
        e.preventDefault();
        if (!currentAnswer.trim() || isLoading) return;

        const answer = currentAnswer;
        setCurrentAnswer('');
        setError('');

        // Add user message to UI immediately
        setMessages(prev => [...prev, { role: 'user', content: answer }]);
        setIsLoading(true);

        try {
            const updatedProject = await projectService.submitAnswer({
                project_id: currentProject.id,
                answer: answer
            });

            if (updatedProject.status === 'planning') {
                setStep('completed');
            } else if (updatedProject.next_question) {
                setMessages(prev => [...prev, { role: 'assistant', content: updatedProject.next_question }]);
            }

            setCurrentProject(updatedProject);
        } catch (err) {
            setError('Connection lost. Please try re-sending.');
            // Remove the failed user message from UI to allow retry
            setMessages(prev => prev.slice(0, -1));
            setCurrentAnswer(answer);
        } finally {
            setIsLoading(false);
        }
    };

    if (step === 'completed') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="max-w-md w-full bg-white p-8 rounded-3xl shadow-2xl text-center space-y-6"
                >
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                        <CheckCircle2 size={40} />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Brief Completed!</h1>
                    <p className="text-gray-500 text-lg">Your autonomous brief has been generated and sent to our team. We'll start planning immediately.</p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:-translate-y-1 transition-all"
                    >
                        Back to Dashboard
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center gap-2 font-bold text-lg">
                        <Sparkles className="text-primary" size={20} />
                        <span>Brief Generation</span>
                    </div>
                    <div className="w-10" /> {/* Spacer */}
                </div>
            </header>

            <main className="max-w-3xl mx-auto pt-24 pb-32 px-4">
                <AnimatePresence mode="wait">
                    {step === 'initial' ? (
                        <motion.div
                            key="initial"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-10"
                        >
                            <div className="text-center space-y-3">
                                <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Let's Define Your Project</h1>
                                <p className="text-gray-500 text-lg">Start with the basics, and our AI will guide you through the rest.</p>
                            </div>

                            <form onSubmit={handleInitialSubmit} className="bg-white border border-gray-100 shadow-2xl shadow-gray-200/50 rounded-3xl p-8 space-y-6">
                                {error && (
                                    <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-2">
                                        <AlertCircle size={18} />
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 ml-1">Project Name</label>
                                    <input
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        placeholder="e.g., Q3 Marketing Push"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 ml-1">What are your main goals?</label>
                                    <textarea
                                        required
                                        value={formData.goals}
                                        onChange={e => setFormData({ ...formData, goals: e.target.value })}
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-32 resize-none"
                                        placeholder="Describe what you want to achieve..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 ml-1">Target Audience</label>
                                    <textarea
                                        required
                                        value={formData.target_audience}
                                        onChange={e => setFormData({ ...formData, target_audience: e.target.value })}
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-32 resize-none"
                                        placeholder="Who is this project for?"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-5 bg-gradient-to-r from-primary to-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                                    Start Briefing Session
                                </button>
                            </form>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="chat"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col h-[70vh]"
                        >
                            {/* Chat Window */}
                            <div
                                ref={scrollRef}
                                className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar pb-10"
                            >
                                {messages.map((msg, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: msg.role === 'assistant' ? -10 : 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                                    >
                                        <div className={`flex gap-3 max-w-[85%] ${msg.role === 'assistant' ? 'flex-row' : 'flex-row-reverse'}`}>
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === 'assistant' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {msg.role === 'assistant' ? <Bot size={20} /> : <User size={20} />}
                                            </div>
                                            <div className={`p-4 rounded-2xl text-[15px] leading-relaxed shadow-sm ${msg.role === 'assistant'
                                                    ? 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                                                    : 'bg-primary text-white rounded-tr-none'
                                                }`}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="flex gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-sm">
                                                <Bot size={20} />
                                            </div>
                                            <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {error && (
                                    <div className="text-center text-red-500 text-sm font-medium py-2">
                                        {error}
                                    </div>
                                )}
                            </div>

                            {/* Chat Input */}
                            <div className="fixed bottom-10 left-0 w-full px-4">
                                <div className="max-w-3xl mx-auto relative group">
                                    <form onSubmit={handleAnswerSubmit}>
                                        <input
                                            autoFocus
                                            value={currentAnswer}
                                            onChange={e => setCurrentAnswer(e.target.value)}
                                            disabled={isLoading}
                                            placeholder="Type your response..."
                                            className="w-full pl-6 pr-16 py-5 bg-white border border-gray-200 rounded-3xl shadow-xl focus:border-primary/50 focus:ring-4 focus:ring-primary/5 outline-none transition-all placeholder:text-gray-400 text-gray-800"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!currentAnswer.trim() || isLoading}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25 hover:scale-105 disabled:opacity-30 disabled:hover:scale-100 transition-all font-bold"
                                        >
                                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default BriefRequest;
