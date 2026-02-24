import React from 'react';
import {
    Users,
    Briefcase,
    TrendingUp,
    Zap,
    Bell,
    Settings,
    LogOut,
    Rocket,
    Plus,
    BarChart3,
    Calendar,
    FileText,
    type LucideIcon
} from 'lucide-react';
import useDashboardViewModel from '../../../viewmodels/useDashboardViewModel';
import type { Project } from '../../../types';
import { useTheme } from '../../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const StatCard: React.FC<{
    icon: LucideIcon;
    title: string;
    value: string;
    change: string;
    color: 'blue' | 'green' | 'purple' | 'amber'
}> = ({ icon: Icon, title, value, change, color }) => {
    const colors = {
        blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
        green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
        purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
        amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
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

const AdminDashboard: React.FC = () => {
    const { projects, loading, handleLogout } = useDashboardViewModel();
    const { theme, toggleTheme } = useTheme();

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
                        <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">AgencyFlow Admin</span>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center gap-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                            <button className="hover:text-primary transition-colors">Team</button>
                            <button className="hover:text-primary transition-colors">Reports</button>
                            <button className="hover:text-primary transition-colors">Billing</button>
                        </div>
                        <div className="h-4 w-px bg-gray-200 dark:bg-gray-800" />
                        <div className="flex items-center gap-3">
                            <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors relative">
                                <Bell size={20} />
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full border-2 border-white dark:border-gray-950"></span>
                            </button>

                            <button
                                onClick={toggleTheme}
                                className="flex items-center justify-center p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-500 hover:text-primary border border-gray-100 dark:border-gray-800 shadow-sm transition-all"
                            >
                                {theme === 'light' ? <Moon size={18} className="fill-current" /> : <Sun size={18} />}
                            </button>

                            <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                <Settings size={20} />
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 transition-colors font-medium text-sm"
                            >
                                <LogOut size={18} />
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Agency Overview</h1>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Monitoring {projects.length} active agency projects.</p>
                    </div>
                    <button className="bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center gap-2">
                        <Plus size={20} />
                        <span>Create Project</span>
                    </button>
                </div>

                {/* Manager Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <StatCard icon={Users} title="Team Members" value="8" change="+2 this month" color="blue" />
                    <StatCard icon={Briefcase} title="Active Projects" value={projects.length.toString()} change="+3 this month" color="green" />
                    <StatCard icon={TrendingUp} title="Revenue" value="$45.2K" change="+12% from last month" color="purple" />
                    <StatCard icon={Zap} title="Tasks Completed" value="156" change="+24 this week" color="amber" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recent Projects Table */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-all duration-300">
                        <div className="px-6 py-4 border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 flex items-center justify-between">
                            <h2 className="font-bold text-gray-900 dark:text-white">Recent Projects</h2>
                            <button className="text-primary text-sm font-bold hover:underline">View All</button>
                        </div>
                        <div className="divide-y divide-gray-50 dark:divide-gray-800">
                            {projects.map((project: Project) => (
                                <div key={project.id} className="p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">{project.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">{project.status}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex -space-x-2">
                                            {[1, 2].map(i => (
                                                <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-950 bg-gray-200 dark:bg-gray-800" />
                                            ))}
                                        </div>
                                        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                            <Settings size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Tools */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 transition-all duration-300">
                            <h2 className="font-bold text-gray-900 dark:text-white mb-6">Quick Tools</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <button className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex flex-col items-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all">
                                    <BarChart3 size={24} />
                                    <span className="text-xs font-bold">Analytics</span>
                                </button>
                                <button className="p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl flex flex-col items-center gap-2 hover:bg-green-100 dark:hover:bg-green-900/40 transition-all">
                                    <Calendar size={24} />
                                    <span className="text-xs font-bold">Schedule</span>
                                </button>
                                <button className="p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl flex flex-col items-center gap-2 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all">
                                    <Users size={24} />
                                    <span className="text-xs font-bold">Clients</span>
                                </button>
                                <button className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl flex flex-col items-center gap-2 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all">
                                    <FileText size={24} />
                                    <span className="text-xs font-bold">Invoices</span>
                                </button>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-primary to-blue-600 rounded-2xl p-6 text-white shadow-xl shadow-primary/20">
                            <h3 className="font-bold text-lg mb-2">Agency Growth</h3>
                            <p className="text-white/80 text-sm mb-4">Your agency has grown by 15% this quarter. Explore ways to optimize your team workflow.</p>
                            <button className="w-full py-3 bg-white text-primary rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors">
                                View Strategy
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
