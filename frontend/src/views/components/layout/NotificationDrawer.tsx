import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsService } from '../../../api/notifications';
import { Notification, NotificationType } from '../../../types';
import { Bell, Check, X, Clock, Info, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { authService } from '../../../api/auth';

interface NotificationDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onUnreadCountChange?: (count: number) => void;
}

function resolveRoute(notif: Notification, userRole: string): string | null {
    const { type, project_id, task_id } = notif;

    switch (type as NotificationType) {
        case 'task_assigned':
        case 'work_submitted':
        case 'ai_score_low':
        case 'revision_requested':
        case 'task_late':
            if (project_id && task_id) return `/project/${project_id}?task=${task_id}`;
            if (project_id) return `/project/${project_id}`;
            return null;

        case 'content_ready':
            if (project_id && task_id) return `/project/${project_id}?task=${task_id}`;
            if (project_id) return `/project/${project_id}`;
            return null;

        case 'brief_submitted':
            if (project_id) return `/brief-review/${project_id}`;
            return null;

        case 'clarification_requested':
            // Client needs to update their brief
            if (project_id) return `/project/${project_id}`;
            return null;

        case 'project_created':
        case 'project_paid':
            if (project_id) return `/project/${project_id}`;
            return null;

        case 'general':
        default:
            if (project_id) return `/project/${project_id}`;
            // Role-based dashboard fallback
            if (userRole === 'manager') return '/manager-dashboard';
            if (userRole === 'client') return '/client-dashboard';
            if (userRole === 'employee') return '/worker-dashboard';
            if (userRole === 'admin') return '/admin-dashboard';
            return '/dashboard';
    }
}

const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose, onUnreadCountChange }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const currentUser = authService.getCurrentUser();

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const data = await notificationsService.getMyNotifications();
            setNotifications(data);
            const unreadCount = data.filter(n => n.status === 'unread').length;
            if (onUnreadCountChange) onUnreadCountChange(unreadCount);
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    const handleMarkAsRead = async (id: string) => {
        try {
            await notificationsService.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'read' as const } : n));
            if (onUnreadCountChange) {
                const newUnreadCount = notifications.filter(n => n.id !== id && n.status === 'unread').length;
                onUnreadCountChange(newUnreadCount);
            }
        } catch (err) {
            console.error("Failed to mark as read", err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationsService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, status: 'read' as const })));
            if (onUnreadCountChange) onUnreadCountChange(0);
        } catch (err) {
            console.error("Failed to mark all as read", err);
        }
    };

    const handleNotificationClick = async (notif: Notification) => {
        const route = resolveRoute(notif, currentUser?.role ?? '');
        if (notif.status === 'unread') {
            try {
                await notificationsService.markAsRead(notif.id);
                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, status: 'read' as const } : n));
                if (onUnreadCountChange) {
                    const newCount = notifications.filter(n => n.id !== notif.id && n.status === 'unread').length;
                    onUnreadCountChange(newCount);
                }
            } catch {
                // non-blocking
            }
        }
        if (route) {
            onClose();
            navigate(route);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'brief_submitted': return <AlertCircle size={16} className="text-primary" />;
            case 'clarification_requested': return <Info size={16} className="text-amber-500" />;
            case 'project_created': return <CheckCircle size={16} className="text-green-500" />;
            case 'task_assigned': return <Clock size={16} className="text-blue-500" />;
            case 'work_submitted': return <Check size={16} className="text-indigo-500" />;
            case 'task_late': return <AlertCircle size={16} className="text-rose-500" />;
            case 'ai_score_low': return <AlertCircle size={16} className="text-orange-500" />;
            case 'revision_requested': return <Clock size={16} className="text-amber-600" />;
            case 'project_paid': return <CheckCircle size={16} className="text-green-600" />;
            default: return <Bell size={16} className="text-gray-400" />;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[60]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-screen w-full max-w-sm bg-white dark:bg-gray-950 border-l border-gray-100 dark:border-gray-800 shadow-2xl z-[70] flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Notifications</h2>
                                <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {notifications.filter(n => n.status === 'unread').length} New
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleMarkAllRead}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-primary transition-colors"
                                    title="Mark all as read"
                                >
                                    <Check size={20} />
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-grow overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
                            {loading ? (
                                <div className="flex items-center justify-center p-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : notifications.length > 0 ? (
                                notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`p-6 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors relative group cursor-pointer ${notif.status === 'unread' ? 'bg-primary/[0.02]' : ''}`}
                                    >
                                        <div className="flex gap-4">
                                            <div className="shrink-0 mt-1">
                                                {getIcon(notif.type)}
                                            </div>
                                            <div className="flex-grow">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className={`text-sm font-bold ${notif.status === 'unread' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                                        {notif.title}
                                                    </h3>
                                                    {notif.status === 'unread' && (
                                                        <span className="w-2 h-2 bg-primary rounded-full" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-2">
                                                    {notif.body}
                                                </p>
                                                <span className="text-[10px] font-medium text-gray-400">
                                                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                                                </span>
                                            </div>

                                            {notif.status === 'unread' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notif.id); }}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-md shadow-sm text-gray-400 hover:text-primary transition-all self-center"
                                                    title="Mark as read"
                                                >
                                                    <Check size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 px-10 text-center">
                                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-center text-gray-200 dark:text-gray-800 mb-4">
                                        <Bell size={32} />
                                    </div>
                                    <h4 className="text-gray-900 dark:text-white font-bold mb-1">No notifications</h4>
                                    <p className="text-xs text-gray-400">We'll let you know when something important happens.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default NotificationDrawer;
