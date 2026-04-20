import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, Rocket, Sun, Moon, LogOut, Bell, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../../lib/utils";
import { useTheme } from "../../../context/ThemeContext";
import { authService } from "../../../api/auth";
import { notificationsService } from "../../../api/notifications";
import { CurrentUser } from "../../../types";
import NotificationDrawer from "./NotificationDrawer";

interface NavLink {
    name: string;
    path: string;
}

const Navbar: React.FC = () => {
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);

        const user = authService.getCurrentUser();
        setCurrentUser(user);

        const fetchUnread = () => {
            if (user) {
                notificationsService.getUnreadCount()
                    .then(data => setUnreadCount(data.count))
                    .catch(err => console.error("Poll failed", err));
            }
        };

        fetchUnread();
        const interval = setInterval(fetchUnread, 30000); // Poll every 30s

        return () => {
            window.removeEventListener("scroll", handleScroll);
            clearInterval(interval);
        };
    }, []);

    const handleLogout = () => {
        authService.logout();
        setCurrentUser(null);
        navigate("/");
    };

    const getHomePath = () => {
        if (!currentUser) return "/";
        return currentUser.role === 'client' ? "/client-home" : "/dashboard";
    };

    const homePath = getHomePath();
    const navLinks: NavLink[] = !currentUser
        ? [{ name: "How it Works", path: "/how-it-works" }]
        : [
            { name: currentUser.role === 'client' ? "Home" : "Dashboard", path: homePath },
            ...(currentUser.role === 'client' ? [{ name: "Dashboard", path: "/dashboard" }] : [])
        ];

    return (
        <>
            <nav
                className={cn(
                    "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
                    scrolled
                        ? "bg-white/80 dark:bg-gray-950/80 backdrop-blur-md shadow-sm border-b border-gray-100 dark:border-gray-800 py-3"
                        : "bg-transparent py-5"
                )}
            >
                <div className="container mx-auto px-6 flex items-center h-full">
                    {/* Left: Logo (flex-1 forces it to take space) */}
                    <div className="flex-1 flex items-center">
                        <Link to={getHomePath()} className="flex items-center gap-2 group">
                            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform duration-300">
                                <Rocket size={20} fill="currentColor" />
                            </div>
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                                AgencyFlow
                            </span>
                        </Link>
                    </div>

                    {/* Center: Desktop Navigation */}
                    <div className="hidden md:flex items-center justify-center gap-10">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                to={link.path}
                                className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-primary transition-all duration-200 relative group/link"
                            >
                                {link.name}
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover/link:w-full" />
                            </Link>
                        ))}
                    </div>

                    {/* Right: Desktop CTA & Theme Toggle (flex-1 + justify-end) */}
                    <div className="flex-1 hidden md:flex items-center justify-end gap-5">
                        {!currentUser ? (
                            <div className="flex items-center gap-6">
                                <Link
                                    to="/login"
                                    className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                                >
                                    Log In
                                </Link>
                                <Link
                                    to="/signup"
                                    className="bg-primary text-white text-sm font-semibold px-6 py-2.5 rounded-full shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300"
                                >
                                    Get Started
                                </Link>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setIsNotificationOpen(true)}
                                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary transition-colors relative"
                                >
                                    <Bell size={20} />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1 right-1 px-1 min-w-[12px] h-3 shadow-lg bg-rose-500 text-[8px] font-black text-white rounded-full flex items-center justify-center border border-white dark:border-gray-950">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>
                                <Link to="/profile" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-primary transition-colors group/profile">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700 group-hover/profile:border-primary/50 transition-colors">
                                        <UserIcon size={16} />
                                    </div>
                                    <span className="text-sm font-medium hidden lg:inline-block">{currentUser.full_name || currentUser.email}</span>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-1.5 text-sm font-medium text-rose-600 hover:text-rose-700 transition-colors"
                                >
                                    <LogOut size={16} />
                                    <span className="hidden lg:inline">Logout</span>
                                </button>
                            </div>
                        )}

                        <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-1" />

                        <button
                            onClick={toggleTheme}
                            className="flex items-center justify-center p-2 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-800 hover:text-primary hover:border-primary/30 transition-all duration-300"
                            aria-label="Toggle theme"
                            title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
                        >
                            {theme === 'light' ? <Moon size={18} className="fill-current" /> : <Sun size={18} />}
                        </button>
                    </div>

                    {/* Mobile Controls */}
                    <div className="flex md:hidden items-center gap-2">
                        {currentUser && (
                            <button
                                onClick={() => setIsNotificationOpen(true)}
                                className="p-2 text-gray-700 dark:text-gray-300 relative"
                            >
                                <Bell size={22} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-white dark:border-gray-950" />
                                )}
                            </button>
                        )}
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
                                    <Link
                                        key={link.name}
                                        to={link.path}
                                        className="text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary transition-colors"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        {link.name}
                                    </Link>
                                ))}
                                <div className="h-px bg-gray-100 dark:bg-gray-800 my-2" />
                                {!currentUser ? (
                                    <>
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
                                    </>
                                ) : (
                                    <button
                                        onClick={handleLogout}
                                        className="text-left text-base font-medium text-rose-600 hover:text-rose-700 transition-colors"
                                    >
                                        Logout
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            <NotificationDrawer
                isOpen={isNotificationOpen}
                onClose={() => setIsNotificationOpen(false)}
                onUnreadCountChange={setUnreadCount}
            />
        </>
    );
};

export default Navbar;

