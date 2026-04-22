import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    CheckSquare,
    MessageSquare,
    Bell,
    User,
} from 'lucide-react';

const NAV_ITEMS = [
    { to: '/worker-dashboard', icon: LayoutDashboard, label: 'Overview',      end: true },
    { to: '/worker/tasks',     icon: CheckSquare,    label: 'My Tasks',       end: false },
    { to: '/worker/feedback',  icon: MessageSquare,  label: 'Feedback',       end: false },
    { to: '/worker/notifications', icon: Bell,       label: 'Notifications',  end: false },
    { to: '/profile',          icon: User,           label: 'Profile',        end: true },
];

const WorkerNav: React.FC = () => (
    <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto flex items-center">
            <div className="flex bg-white dark:bg-gray-900 p-1 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-x-auto gap-0.5">
                {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={end}
                        className={({ isActive }) =>
                            `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                                isActive
                                    ? 'bg-primary text-white shadow-md'
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`
                        }
                    >
                        <Icon size={15} />
                        {label}
                    </NavLink>
                ))}
            </div>
        </div>
    </div>
);

export default WorkerNav;
