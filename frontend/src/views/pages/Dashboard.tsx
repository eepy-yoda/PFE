import React from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../api/auth';
import AdminDashboard from './dashboard/AdminDashboard';
import ClientDashboard from './dashboard/ClientDashboard';
import ManagerDashboard from './dashboard/ManagerDashboard';
import WorkerDashboard from './dashboard/WorkerDashboard';

/**
 * Dashboard (Router Component)
 * Reads the user role synchronously from localStorage — zero network delay.
 * Each sub-dashboard handles its own data fetching independently.
 */
const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const user = authService.getCurrentUser();

    if (!user) {
        navigate('/login');
        return null;
    }

    switch (user.role) {
        case 'admin':    return <AdminDashboard />;
        case 'manager':  return <ManagerDashboard />;
        case 'employee': return <WorkerDashboard />;
        case 'client':   return <ClientDashboard />;
        default:
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 flex-col gap-4">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Dashboard</h1>
                    <p className="text-gray-500 dark:text-gray-400">Your role dashboard is not yet configured.</p>
                    <button onClick={() => navigate('/')} className="text-primary font-bold hover:underline">
                        Go back home
                    </button>
                </div>
            );
    }
};

export default Dashboard;
