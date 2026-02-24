import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../api/auth';
import { projectsService } from '../api/projects';
import type { CurrentUser, Project, DashboardViewModel } from '../types';

/**
 * DashboardViewModel
 * Manages all state and logic for the Dashboard page.
 * The View (Dashboard.tsx) should only call these methods and display this state.
 */
const useDashboardViewModel = (): DashboardViewModel => {
    const navigate = useNavigate();
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [projects, setProjects] = useState<Project[]>([]);

    useEffect(() => {
        const fetchDashboardData = async (): Promise<void> => {
            const currentUser = authService.getCurrentUser() as CurrentUser | null;
            if (!currentUser) {
                navigate('/login');
                return;
            }
            setUser(currentUser);

            try {
                const data: Project[] = await projectsService.getAll();
                setProjects(data);
            } catch (error) {
                console.error('Failed to fetch projects:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [navigate]);

    const handleLogout = (): void => {
        authService.logout();
        navigate('/login');
    };

    const isClient: boolean = user?.role === 'client';
    const isManager: boolean = user?.role === 'manager';

    return {
        user,
        loading,
        projects,
        isClient,
        isManager,
        handleLogout,
    };
};

export default useDashboardViewModel;
