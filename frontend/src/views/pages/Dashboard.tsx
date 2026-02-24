import React from 'react';
import useDashboardViewModel from '../../viewmodels/useDashboardViewModel';
import AdminDashboard from './dashboard/AdminDashboard';
import ClientDashboard from './dashboard/ClientDashboard';

/**
 * Dashboard (Router Component)
 * This component acts as a controller that decides which specific 
 * dashboard view to render based on the user's role.
 */
const Dashboard: React.FC = () => {
    const { user, loading, isClient, isManager } = useDashboardViewModel();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Role-based rendering
    if (isManager) {
        return <AdminDashboard />;
    }

    if (isClient) {
        // NOTE: Clients generally land on ClientHome first, 
        // but if they navigate to /dashboard directly, we show ClientDashboard.
        return <ClientDashboard />;
    }

    // Fallback or Worker Role (could implement WorkerDashboard later)
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Worker Dashboard</h1>
            <p className="text-gray-500">The specialized view for workers is coming soon.</p>
            <button
                onClick={() => window.location.href = '/'}
                className="text-primary font-bold hover:underline"
            >
                Go back home
            </button>
        </div>
    );
};

export default Dashboard;
