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
import ProtectedRoute from "./views/components/ProtectedRoute";
import { ThemeProvider } from "./context/ThemeContext";
import GuidedBrief from "./views/pages/GuidedBrief";

const App: React.FC = () => {
    return (
        <ThemeProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Layout />}>
                        <Route index element={<Home />} />
                        {/* Add more authenticated routes here */}
                    </Route>

                    {/* Auth Routes (No Navbar/Footer) */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/test-connection" element={<ConnectionTest />} />

                    {/* Public Pages with Navbar/Footer */}
                    <Route path="/how-it-works" element={<HowItWorks />} />

                    {/* Protected Routes */}
                    <Route
                        path="/client-home"
                        element={
                            <ProtectedRoute>
                                <ClientHome />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/client-dashboard"
                        element={
                            <ProtectedRoute>
                                <ClientDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin-dashboard"
                        element={
                            <ProtectedRoute>
                                <AdminDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/guided-brief" element={<ProtectedRoute><GuidedBrief /></ProtectedRoute>} />

                    <Route path="*" element={<div className="flex items-center justify-center h-screen text-xl text-gray-500 font-medium">404 - Page Not Found</div>} />
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;
