import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Rocket,
    Users,
    FileText,
    Calendar,
    TrendingUp,
    CheckCircle2,
    Clock,
    BarChart3,
    Bell,
    Settings,
    LogOut,
    Briefcase,
    Sparkles,
    Zap
} from 'lucide-react';
import { authService, api } from '../services/auth';

const Dashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            const currentUser = authService.getCurrentUser();
            if (!currentUser) {
                navigate('/login');
                return;
            }
            setUser(currentUser);

            try {
                // Fetch real projects from backend
                const response = await api.get('/projects/');
                setProjects(response.data);
            } catch (error) {
                console.error("Failed to fetch projects:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [navigate]);

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    const isClient = user?.role === 'client';
    const isManager = user?.role === 'manager';

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-cyan-50/30">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                                <Rocket size={20} fill="currentColor" />
                            </div>
                            <span className="text-xl font-bold text-gray-900">AgencyFlow</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                                <Bell size={20} />
                            </button>
                            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                                <Settings size={20} />
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                <LogOut size={18} />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome Section */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}! 👋
                    </h1>
                    <p className="text-gray-600">
                        {isClient
                            ? "Here's an overview of your projects and activities"
                            : "Manage your agency, track projects, and collaborate with your team"}
                    </p>
                </motion.div>

                {/* Role Badge */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="mb-8"
                >
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${isManager
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                        }`}>
                        {isManager ? <Briefcase size={16} /> : <Users size={16} />}
                        <span className="text-sm font-semibold capitalize">{user?.role || 'User'}</span>
                    </div>
                </motion.div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {isClient ? (
                        <>
                            <StatCard
                                icon={FileText}
                                title="Active Projects"
                                value="3"
                                change="+2 this month"
                                color="blue"
                            />
                            <StatCard
                                icon={CheckCircle2}
                                title="Completed Tasks"
                                value="12"
                                change="+5 this week"
                                color="green"
                            />
                            <StatCard
                                icon={Clock}
                                title="Pending Reviews"
                                value="2"
                                change="Awaiting approval"
                                color="amber"
                            />
                            <StatCard
                                icon={TrendingUp}
                                title="Project Status"
                                value="On Track"
                                change="All deadlines met"
                                color="purple"
                            />
                        </>
                    ) : (
                        <>
                            <StatCard
                                icon={Users}
                                title="Team Members"
                                value="8"
                                change="+2 this month"
                                color="blue"
                            />
                            <StatCard
                                icon={Briefcase}
                                title="Active Projects"
                                value="12"
                                change="+3 this month"
                                color="green"
                            />
                            <StatCard
                                icon={TrendingUp}
                                title="Revenue"
                                value="$45.2K"
                                change="+12% from last month"
                                color="purple"
                            />
                            <StatCard
                                icon={Zap}
                                title="Tasks Completed"
                                value="156"
                                change="+24 this week"
                                color="amber"
                            />
                        </>
                    )}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Projects/Tasks */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Recent Projects */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-900">
                                    {isClient ? 'My Projects' : 'Recent Projects'}
                                </h2>
                                <button className="text-sm text-primary hover:text-primary/80 font-medium">
                                    View All
                                </button>
                            </div>
                            <div className="space-y-4">
                                {projects.length > 0 ? (
                                    projects.map((project) => (
                                        <ProjectCard
                                            key={project.id}
                                            project={project}
                                            isClient={isClient}
                                        />
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-500 italic">
                                        No projects found. Create your first one!
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Quick Actions */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                        >
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <QuickActionButton
                                    icon={Sparkles}
                                    label={isClient ? "Request New Brief" : "Create Project"}
                                    onClick={() => navigate(isClient ? '/brief' : '/dashboard')}
                                    color="blue"
                                />
                                <QuickActionButton
                                    icon={Users}
                                    label={isClient ? "Contact Team" : "Invite Team"}
                                    color="green"
                                />
                                <QuickActionButton
                                    icon={BarChart3}
                                    label="View Reports"
                                    color="purple"
                                />
                                <QuickActionButton
                                    icon={Calendar}
                                    label="Schedule Meeting"
                                    color="amber"
                                />
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column - Activity & Updates */}
                    <div className="space-y-6">
                        {/* Activity Feed */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                        >
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
                            <div className="space-y-4">
                                {[
                                    { icon: CheckCircle2, text: "Project 'Website Redesign' updated", time: "2h ago", color: "green" },
                                    { icon: FileText, text: "New document uploaded", time: "5h ago", color: "blue" },
                                    { icon: Users, text: "Team member joined", time: "1d ago", color: "purple" },
                                    { icon: Bell, text: "Review request sent", time: "2d ago", color: "amber" },
                                ].map((activity, idx) => (
                                    <div key={idx} className="flex items-start gap-3">
                                        <div className={`w-8 h-8 rounded-full bg-${activity.color}-100 flex items-center justify-center flex-shrink-0`}>
                                            <activity.icon className={`w-4 h-4 text-${activity.color}-600`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-900">{activity.text}</p>
                                            <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Getting Started */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl shadow-lg p-6 text-white"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <Sparkles size={24} />
                                <h2 className="text-xl font-bold">Getting Started</h2>
                            </div>
                            <ul className="space-y-3 text-sm">
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 size={16} />
                                    Complete your profile
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 size={16} />
                                    {isClient ? "Explore your projects" : "Create your first project"}
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 size={16} />
                                    {isClient ? "Connect with your team" : "Invite team members"}
                                </li>
                            </ul>
                        </motion.div>
                    </div>
                </div>
            </main>
        </div>
    );
};

// Stat Card Component
const StatCard = ({ icon: Icon, title, value, change, color }) => {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        amber: 'bg-amber-100 text-amber-600',
        purple: 'bg-purple-100 text-purple-600',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
            <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
                    <Icon size={24} />
                </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
            <p className="text-sm text-gray-600 mb-1">{title}</p>
            <p className="text-xs text-gray-500">{change}</p>
        </motion.div>
    );
};

// Project Card Component
const ProjectCard = ({ project, isClient }) => {
    return (
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer">
            <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center text-white">
                    <Briefcase size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1">
                        {project.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                        {project.status} • Created {new Date(project.created_at).toLocaleDateString()}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${project.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                    {project.status}
                </span>
            </div>
        </div>
    );
};

// Quick Action Button Component
const QuickActionButton = ({ icon: Icon, label, color, onClick }) => {
    const colorClasses = {
        blue: 'bg-blue-50 hover:bg-blue-100 text-blue-600',
        green: 'bg-green-50 hover:bg-green-100 text-green-600',
        purple: 'bg-purple-50 hover:bg-purple-100 text-purple-600',
        amber: 'bg-amber-50 hover:bg-amber-100 text-amber-600',
    };

    return (
        <button
            onClick={onClick}
            className={`${colorClasses[color]} p-4 rounded-lg flex flex-col items-center gap-2 transition-all hover:scale-105 w-full`}
        >
            <Icon size={24} />
            <span className="text-sm font-medium">{label}</span>
        </button>
    );
};

export default Dashboard;
