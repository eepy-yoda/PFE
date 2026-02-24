import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Briefcase,
    Clock,
    CheckCircle2,
    FileText,
    TrendingUp,
    Bell,
    Settings,
    LogOut,
    Rocket,
    Plus,
    Search,
    Filter,
    type LucideIcon
} from 'lucide-react';
import useDashboardViewModel from '../../../viewmodels/useDashboardViewModel';
import type { Project } from '../../../types';

const StatCard: React.FC<{
    icon: LucideIcon;
    title: string;
    value: string;
    change: string;
    color: 'blue' | 'green' | 'amber' | 'purple'
}> = ({ icon: Icon, title, value, change, color }) => {
    const colors = {
        blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
        green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
        amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
        purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    };

    return (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all duration-300">
            <div className={`w-12 h-12 ${colors[color]} rounded-xl flex items-center justify-center mb-4`}>
                <Icon size={24} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{value}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{change}</p>
        </div>
    );
};

const ClientDashboard: React.FC = () => {
    const { user, projects, loading, handleLogout } = useDashboardViewModel();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-950 transition-colors duration-300">
            {/* Header */}
            <header className="bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20">
                            <Rocket size={18} fill="currentColor" />
                        </div>
                        <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">AgencyFlow</span>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center gap-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                            <button className="hover:text-primary transition-colors">Support</button>
                            <button className="hover:text-primary transition-colors">Docs</button>
                        </div>
                        <div className="h-4 w-px bg-gray-200 dark:bg-gray-800" />
                        <div className="flex items-center gap-3">
                            <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors relative">
                                <Bell size={20} />
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full border-2 border-white dark:border-gray-950"></span>
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 transition-colors font-medium text-sm"
                            >
                                <LogOut size={18} />
                                <span>Exit</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Welcome & Search */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Projects</h1>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Manage your requests and track progress in real-time.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary text-gray-900 dark:text-white transition-all w-full md:w-64"
                            />
                        </div>
                        <button className="p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm">
                            <Filter size={20} />
                        </button>
                        <button className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center gap-2">
                            <Plus size={20} />
                            <span>New Request</span>
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <StatCard
                        icon={Briefcase}
                        title="Active Projects"
                        value={projects.length.toString()}
                        change="+1 from last month"
                        color="blue"
                    />
                    <StatCard
                        icon={Clock}
                        title="In Progress"
                        value={projects.filter(p => p.status === 'in_progress' || p.status === 'active').length.toString()}
                        change="3 tasks remaining"
                        color="amber"
                    />
                    <StatCard
                        icon={FileText}
                        title="Drafts"
                        value="2"
                        change="Saved 2 days ago"
                        color="purple"
                    />
                    <StatCard
                        icon={TrendingUp}
                        title="Velocity"
                        value="85%"
                        change="On track"
                        color="green"
                    />
                </div>

                {/* Projects List */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-all duration-300">
                    <div className="px-6 py-4 border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 flex items-center justify-between">
                        <h2 className="font-bold text-gray-900 dark:text-white">Project Overview</h2>
                    </div>

                    <div className="divide-y divide-gray-50 dark:divide-gray-800">
                        {filteredProjects.length > 0 ? (
                            filteredProjects.map((project: Project) => (
                                <motion.div
                                    key={project.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                            <FileText size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{project.name}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Last update: {new Date(project.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col md:items-end">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${project.status === 'active' || project.status === 'in_progress'
                                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                                : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                                                }`}>
                                                {project.status}
                                            </span>
                                        </div>
                                        <div className="w-32 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden hidden lg:block">
                                            <div
                                                className="h-full bg-primary rounded-full transition-all duration-1000"
                                                style={{ width: project.status === 'completed' ? '100%' : '35%' }}
                                            />
                                        </div>
                                        <button className="text-gray-400 hover:text-primary transition-colors">
                                            <Settings size={18} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="py-20 text-center">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                    <Search size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">No projects found</h3>
                                <p className="text-gray-500">Try adjusting your search or create a new request.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ClientDashboard;
