import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../api/auth';
import type { CurrentUser, DashboardViewModel } from '../types';

/**
 * useDashboardViewModel
 * Purely reads role + user from localStorage (synchronous).
 * Each dashboard component is responsible for its own data fetching.
 */
const useDashboardViewModel = (): DashboardViewModel => {
    const navigate = useNavigate();
    const [user, setUser] = useState<CurrentUser | null>(() => authService.getCurrentUser());

    useEffect(() => {
        if (!user) {
            navigate('/login');
        }
    }, [user, navigate]);

    const handleLogout = (): void => {
        authService.logout();
        navigate('/login');
    };

    return {
        user,
        loading: false,      // No async fetch — always ready instantly
        projects: [],        // Each sub-dashboard fetches what it needs
        isClient:   user?.role === 'client',
        isManager:  user?.role === 'manager',
        isEmployee: user?.role === 'employee',
        isAdmin:    user?.role === 'admin',
        handleLogout,
    };
};

export default useDashboardViewModel;
