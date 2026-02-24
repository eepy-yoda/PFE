import React from 'react';

const WorkerDashboard: React.FC = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Worker Dashboard</h1>
            <p className="text-gray-500 font-medium">Monitoring your tasks and assignments.</p>
            <div className="p-8 bg-white rounded-2xl border border-gray-100 shadow-sm text-center">
                <p className="text-gray-400 italic">Work interface coming soon...</p>
            </div>
        </div>
    );
};

export default WorkerDashboard;
