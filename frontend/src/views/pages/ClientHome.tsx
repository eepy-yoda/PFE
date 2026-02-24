import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Briefcase, Rocket, LogOut, Bell, Settings } from 'lucide-react';
import useDashboardViewModel from '../../viewmodels/useDashboardViewModel';

const ActionCard: React.FC<{
    title: string;
    description: string;
    buttonText: string;
    icon: React.ReactNode;
    onClick: () => void;
    primary?: boolean;
}> = ({ title, description, buttonText, icon, onClick, primary }) => (
    <motion.div
        whileHover={{ y: -5, transition: { duration: 0.2 } }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 flex flex-col items-center text-center group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
    >
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300 ${primary
            ? 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white'
            : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500 group-hover:bg-blue-500 group-hover:text-white'
            }`}>
            {icon}
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed max-w-[240px]">
            {description}
        </p>
        <button
            onClick={onClick}
            className={`w-full py-4 rounded-xl font-bold transition-all duration-300 ${primary
                ? 'bg-primary text-white shadow-lg shadow-primary/25 hover:shadow-primary/40'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
        >
            {buttonText}
        </button>
    </motion.div>
);

const ClientHome: React.FC = () => {
    const navigate = useNavigate();
    const { handleLogout } = useDashboardViewModel();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 transition-colors duration-300">
            {/* Header */}
            <header className="bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                            <Rocket size={20} fill="currentColor" />
                        </div>
                        <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">AgencyFlow</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                            <Bell size={22} />
                        </button>
                        <button className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                            <Settings size={22} />
                        </button>
                        <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-2" />
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors font-medium"
                        >
                            <LogOut size={20} />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-16 lg:py-24">
                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-16"
                >
                    <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight">
                        Welcome back👋
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400 font-medium">
                        What would you like to do today?
                    </p>
                </motion.div>

                {/* Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    <ActionCard
                        title="Create Your Idea"
                        description="Start describing your project and let us guide you step by step."
                        buttonText="Start Now"
                        primary
                        icon={<Sparkles size={32} />}
                        onClick={() => navigate('/guided-chat')}
                    />

                    <ActionCard
                        title="Go to My Space"
                        description="View your projects, track progress and manage your requests."
                        buttonText="Go to Dashboard"
                        icon={<Briefcase size={32} />}
                        onClick={() => navigate('/client-dashboard')}
                    />
                </div>

                {/* Subtle Decorative Elements */}
                <div className="fixed top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                <div className="fixed bottom-0 right-0 translate-x-1/4 translate-y-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            </main>
        </div>
    );
};

export default ClientHome;
