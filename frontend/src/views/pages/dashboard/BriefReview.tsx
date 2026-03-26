import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsService } from '../../../api/projects';
import { managementService } from '../../../api/management';
import { Project, CurrentUser } from '../../../types';
import { User, CheckCircle2, AlertCircle, MessageSquare, Briefcase, ChevronRight, Sparkles } from 'lucide-react';

const BriefReview: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | null>(null);
    const [employees, setEmployees] = useState<CurrentUser[]>([]);
    const [selectedWorkerId, setSelectedWorkerId] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [aiResume, setAiResume] = useState<{message: string, image?: string} | null>(null);
    const [generatingResume, setGeneratingResume] = useState(false);

    const handleGenerateResume = async () => {
        if (!project || !project.brief_content) return;
        setGeneratingResume(true);
        try {
            const data = await projectsService.generateAIResume(project.id);
            // Handle the updated array structure from n8n 
            // e.g. [{ message: "...", imageBase64: { data: "...", mimeType: "..." } }]
            if (Array.isArray(data) && data.length > 0) {
                const responseData = data[0];
                const msg = responseData.message || 'No message provided.';
                
                let imgData = undefined;
                if (responseData.imageBase64) {
                     if (responseData.imageBase64.data === "filesystem-v2" && responseData.imageBase64.directory) {
                          // n8n binary data might be externalized, but here 'directory' contains the actual pollinations.ai URL!
                          imgData = responseData.imageBase64.directory;
                     } else if (responseData.imageBase64.data && responseData.imageBase64.data !== "filesystem-v2") {
                          // Standard base64
                          imgData = `data:${responseData.imageBase64.mimeType};base64,${responseData.imageBase64.data}`;
                     }
                }
                setAiResume({ message: msg, image: imgData });
            } else {
                setAiResume({ message: JSON.stringify(data, null, 2) });
            }
        } catch (err) {
            console.error("Failed to generate AI resume", err);
            alert("Failed to reach the AI service.");
        } finally {
            setGeneratingResume(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                const [projData, allUsers] = await Promise.all([
                    projectsService.getById(id),
                    managementService.getWorkers()
                ]);
                setProject(projData);
                // getWorkers already filters for employee/manager, but we can double check
                setEmployees(allUsers.filter((u: CurrentUser) => u.role === 'employee'));
            } catch (err) {
                console.error("Failed to fetch data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleAction = async (action: 'validate' | 'clarify' | 'reject') => {
        if (!id) return;
        setActionLoading(true);
        try {
            await projectsService.takeBriefAction(id, { action, notes });
            
            if (action === 'validate') {
                alert("Brief validated! Now you can assign a worker to start the project.");
                // Refresh project data to show assignment section
                const updated = await projectsService.getById(id);
                setProject(updated);
            } else {
                alert(`Brief ${action}ed successfully.`);
                navigate('/manager-dashboard');
            }
        } catch (err) {
            console.error(`Failed to ${action} brief`, err);
            alert(`Failed to ${action} brief. Please try again.`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleAssignAndConvert = async () => {
        if (!id || !selectedWorkerId) {
            alert("Please select a worker first.");
            return;
        }
        setActionLoading(true);
        try {
            await projectsService.convertToProject(id, selectedWorkerId);
            alert("Project assigned and move to active successfully!");
            navigate('/manager-dashboard');
        } catch (err) {
            console.error("Failed to convert/assign project", err);
            alert("Failed to assign project. Make sure the brief is validated first.");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-xl font-medium text-gray-400">
                Brief not found.
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 transition-colors duration-300">
            <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg">
                            Brief Review
                        </span>
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                            {project.name}
                        </h1>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">Review client request and assign to the right talent.</p>
                </div>
                <button
                    onClick={() => navigate('/manager-dashboard')}
                    className="group flex items-center gap-2 text-gray-400 hover:text-primary font-bold transition-all text-sm"
                >
                    <ChevronRight size={18} className="rotate-180" />
                    Back to Dashboard
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Main Content: Brief Details */}
                <div className="lg:col-span-2 space-y-8">
                    <section className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 lg:p-10 transition-all">
                        <div className="flex items-center gap-3 mb-8 border-b border-gray-50 dark:border-gray-800 pb-6">
                            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-primary">
                                <MessageSquare size={24} />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white">Brief Content</h2>
                        </div>
                        
                        <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-medium">
                            {project.brief_content || 'Brief content is empty. Check n8n logs.'}
                        </div>

                        {project.clarification_notes && (
                            <div className="mt-10 p-6 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                                <h3 className="text-amber-800 dark:text-amber-500 font-bold mb-2 flex items-center gap-2">
                                    <AlertCircle size={18} /> Previous Clarification Notes
                                </h3>
                                <p className="text-amber-700 dark:text-amber-600 text-sm italic">{project.clarification_notes}</p>
                            </div>
                        )}
                    </section>
                </div>

                {/* Sidebar: Actions & Assignment */}
                <aside className="space-y-8">
                    {/* Decisions Section */}
                    {project.brief_status !== 'validated' && project.brief_status !== 'converted' ? (
                        <section className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 transition-all">
                            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6">Review Decision</h2>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Feedback/Notes</label>
                                    <textarea
                                        className="w-full bg-gray-50 dark:bg-gray-950 border-none rounded-2xl p-4 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 min-h-[120px] transition-all placeholder-gray-300 dark:placeholder-gray-700"
                                        placeholder="Add notes for the client..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />
                                </div>
                                
                                <div className="space-y-3 pt-2">
                                    <button
                                        onClick={() => handleAction('validate')}
                                        disabled={actionLoading}
                                        className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-green-500/20 disabled:opacity-50 flex items-center justify-center gap-2 group"
                                    >
                                        <CheckCircle2 size={18} />
                                        Validate Brief
                                    </button>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => handleAction('clarify')}
                                            disabled={actionLoading}
                                            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-500 font-bold py-3 rounded-2xl transition-all disabled:opacity-50 text-xs uppercase tracking-wider"
                                        >
                                            Clarify
                                        </button>
                                        <button
                                            onClick={() => handleAction('reject')}
                                            disabled={actionLoading}
                                            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-500 font-bold py-3 rounded-2xl transition-all disabled:opacity-50 text-xs uppercase tracking-wider"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>
                    ) : project.brief_status === 'validated' ? (
                        /* Assignment Section (Visible after validation) */
                        <section className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border-2 border-primary/20 p-8 transition-all animate-in zoom-in duration-300">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <Briefcase size={20} />
                                </div>
                                <h2 className="text-xl font-black text-gray-900 dark:text-white">Assign & Activate</h2>
                            </div>
                            
                            <p className="text-gray-500 dark:text-gray-400 text-xs mb-6 font-bold leading-relaxed">
                                The brief is validated. Assign a worker to transition this brief into an active working project.
                            </p>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Assign Worker</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-hover:text-primary transition-colors" size={18} />
                                        <select
                                            className="w-full bg-gray-50 dark:bg-gray-950 border-none rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                                            value={selectedWorkerId}
                                            onChange={(e) => setSelectedWorkerId(e.target.value)}
                                        >
                                            <option value="">Select an employee...</option>
                                            {employees.map(emp => (
                                                <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.email})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <button
                                    onClick={handleAssignAndConvert}
                                    disabled={actionLoading || !selectedWorkerId}
                                    className="w-full bg-primary text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    Activate Project
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </section>
                    ) : (
                        /* Converted State */
                        <div className="bg-green-500/10 border border-green-500/20 p-8 rounded-3xl text-center">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center text-green-500 mx-auto mb-4">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-green-800 dark:text-green-400 font-black text-lg mb-2">Project Active</h3>
                            <p className="text-green-700/70 dark:text-green-500/70 text-sm font-bold">This brief has already been converted into an active project.</p>
                        </div>
                    )}

                    {/* AI Resume Card */}
                    <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-8 rounded-3xl border border-indigo-100 dark:border-indigo-900/30 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-indigo-900 dark:text-indigo-400 font-black flex items-center gap-2">
                                <Sparkles size={18} /> AI Brief Resume
                            </h3>
                        </div>
                        
                        {!aiResume ? (
                            <div className="text-center">
                                <p className="text-indigo-700/70 dark:text-indigo-500/70 text-xs font-bold leading-relaxed mb-4">
                                    Need a quick summary? Generate an AI resume of this brief to get the key points instantly.
                                </p>
                                <button
                                    onClick={handleGenerateResume}
                                    disabled={generatingResume}
                                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                                >
                                    {generatingResume ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    ) : (
                                        <Sparkles size={16} />
                                    )}
                                    {generatingResume ? "Generating..." : "Generate AI Resume"}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {aiResume.image && (
                                    <div className="rounded-2xl overflow-hidden border border-indigo-100/50 dark:border-indigo-800/30">
                                        <img src={aiResume.image} alt="AI Generated Reference" className="w-full h-auto object-cover" />
                                    </div>
                                )}
                                <div className="p-4 bg-white/60 dark:bg-black/20 rounded-2xl border border-indigo-100/50 dark:border-indigo-800/30 text-sm text-indigo-900 dark:text-indigo-300 whitespace-pre-wrap leading-relaxed">
                                    {aiResume.message}
                                </div>
                                <button
                                    onClick={handleGenerateResume}
                                    disabled={generatingResume}
                                    className="text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:underline flex items-center gap-1 justify-center w-full"
                                >
                                    {generatingResume ? "Regenerating..." : "Regenerate Resume"}
                                </button>
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default BriefReview;
