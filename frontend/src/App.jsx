import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ConnectionTest from "./pages/ConnectionTest";
import HowItWorks from "./pages/HowItWorks";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
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
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<div className="flex items-center justify-center h-screen text-xl text-gray-500">404 - Page Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
