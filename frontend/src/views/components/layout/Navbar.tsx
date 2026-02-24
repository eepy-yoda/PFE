import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Rocket, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../../lib/utils";
import { useTheme } from "../../../context/ThemeContext";

interface NavLink {
    name: string;
    path: string;
}

const Navbar: React.FC = () => {
    const { theme, toggleTheme } = useTheme();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const navLinks: NavLink[] = [
        { name: "Features", path: "/#features" },
        { name: "How it Works", path: "/how-it-works" },
        { name: "Pricing", path: "/pricing" },
        { name: "About", path: "/about" },
    ];

    return (
        <nav
            className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
                scrolled
                    ? "bg-white/80 dark:bg-gray-950/80 backdrop-blur-md shadow-sm border-b border-gray-100 dark:border-gray-800 py-3"
                    : "bg-transparent py-5"
            )}
        >
            <div className="container mx-auto px-6 flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 group">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform duration-300">
                        <Rocket size={20} fill="currentColor" />
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                        AgencyFlow
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        link.path.startsWith('/') ? (
                            <Link
                                key={link.name}
                                to={link.path}
                                className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary transition-colors duration-200"
                            >
                                {link.name}
                            </Link>
                        ) : (
                            <a
                                key={link.name}
                                href={link.path}
                                className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary transition-colors duration-200"
                            >
                                {link.name}
                            </a>
                        )
                    ))}
                </div>

                {/* Desktop CTA & Theme Toggle */}
                <div className="hidden md:flex items-center gap-4">
                    <Link
                        to="/login"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        Log In
                    </Link>
                    <Link
                        to="/signup"
                        className="bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300"
                    >
                        Get Started
                    </Link>

                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-2" />

                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-xl text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                        title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
                    >
                        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                    </button>
                </div>

                {/* Mobile Controls */}
                <div className="flex md:hidden items-center gap-2">
                    <button
                        onClick={toggleTheme}
                        className="p-2 text-gray-700 dark:text-gray-300"
                    >
                        {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
                    </button>
                    <button
                        className="text-gray-700 dark:text-gray-300 hover:text-primary transition-colors"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 overflow-hidden"
                    >
                        <div className="flex flex-col p-6 space-y-4">
                            {navLinks.map((link) => (
                                link.path.startsWith('/') ? (
                                    <Link
                                        key={link.name}
                                        to={link.path}
                                        className="text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary transition-colors"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        {link.name}
                                    </Link>
                                ) : (
                                    <a
                                        key={link.name}
                                        href={link.path}
                                        className="text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary transition-colors"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        {link.name}
                                    </a>
                                )
                            ))}
                            <div className="h-px bg-gray-100 dark:bg-gray-800 my-2" />
                            <Link
                                to="/login"
                                className="text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary transition-colors"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Log In
                            </Link>
                            <Link
                                to="/signup"
                                className="bg-primary text-white text-base font-semibold px-5 py-3 rounded-xl text-center shadow-lg shadow-primary/25 transition-all"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Get Started Free
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default Navbar;
