import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Briefcase } from 'lucide-react';


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

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 transition-colors duration-300">

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
                        onClick={() => navigate('/guided-brief')}
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
