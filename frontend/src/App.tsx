import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./views/components/layout/Layout";
import Home from "./views/pages/Home";
import Login from "./views/pages/Login";
import Signup from "./views/pages/Signup";
import ConnectionTest from "./views/pages/ConnectionTest";
import HowItWorks from "./views/pages/HowItWorks";
import Dashboard from "./views/pages/Dashboard";
import ClientHome from "./views/pages/ClientHome";
import ClientDashboard from "./views/pages/dashboard/ClientDashboard";
import AdminDashboard from "./views/pages/dashboard/AdminDashboard";
import ManagerDashboard from "./views/pages/dashboard/ManagerDashboard";
import WorkerDashboard from "./views/pages/dashboard/WorkerDashboard";
import BriefReview from "./views/pages/dashboard/BriefReview";
import ProjectDetail from "./views/pages/ProjectDetail";
import Profile from "./views/pages/Profile";
import ProtectedRoute from "./views/components/ProtectedRoute";
import { ThemeProvider } from "./context/ThemeContext";
import GuidedBrief from "./views/pages/GuidedBrief";
import ResetPassword from "./views/pages/ResetPassword";

const App: React.FC = () => {
    return (
        <ThemeProvider>
            <BrowserRouter>
                <Routes>
                    <Route element={<Layout />}>
                        <Route path="/" element={<Home />} />
                        <Route path="/how-it-works" element={<HowItWorks />} />
                        
                        {/* Protected Routes inside Layout */}
                        <Route
                            path="/client-home"
                            element={<ProtectedRoute><ClientHome /></ProtectedRoute>}
                        />
                        <Route
                            path="/client-dashboard"
                            element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>}
                        />
                        <Route
                            path="/admin-dashboard"
                            element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>}
                        />
                        <Route
                            path="/manager-dashboard"
                            element={<ProtectedRoute><ManagerDashboard /></ProtectedRoute>}
                        />
                        <Route
                            path="/worker-dashboard"
                            element={<ProtectedRoute><WorkerDashboard /></ProtectedRoute>}
                        />
                        <Route
                            path="/brief-review/:id"
                            element={<ProtectedRoute><BriefReview /></ProtectedRoute>}
                        />
                        <Route
                            path="/project/:id"
                            element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>}
                        />
                        <Route
                            path="/projects/:id"
                            element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>}
                        />
                        <Route
                            path="/profile"
                            element={<ProtectedRoute><Profile /></ProtectedRoute>}
                        />
                        <Route
                            path="/dashboard"
                            element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
                        />
                        <Route 
                            path="/guided-brief" 
                            element={<ProtectedRoute><GuidedBrief /></ProtectedRoute>} 
                        />
                    </Route>

                    {/* Auth Routes (No Navbar/Footer) */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/test-connection" element={<ConnectionTest />} />

                    <Route path="*" element={<div className="flex items-center justify-center h-screen text-xl text-gray-500 font-medium">404 - Page Not Found</div>} />
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;

