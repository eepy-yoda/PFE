import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../../api/auth';

interface ProtectedRouteProps {
    children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const user = authService.getCurrentUser();
    const token = localStorage.getItem('token');

    if (!user || !token) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
