import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import React from "react";

interface LayoutProps {
    children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-gray-950 selection:bg-primary/20 selection:text-primary transition-colors duration-300">
            <Navbar />
            <main className="flex-grow pt-20">
                {children ? children : <Outlet />}
            </main>
            <Footer />
        </div>
    );
};

export default Layout;

