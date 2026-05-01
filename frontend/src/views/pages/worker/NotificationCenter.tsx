import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ExternalLink, Clock } from 'lucide-react';
import WorkerNav from '../../components/worker/WorkerNav';
import { notificationsService } from '../../../api/notifications';
import type { Notification } from '../../../types';

// ── notification type icon/color ──────────────────────────────────────────────

function typeStyle(type: string): { dot: string; label: string } {
    switch (type) {
        case 'task_assigned':      return { dot: 'bg-blue-500', label: 'Task Assigned' };
        case 'revision_requested': return { dot: 'bg-rose-500', label: 'Revision Requested' };
        case 'work_submitted':     return { dot: 'bg-indigo-500', label: 'Submission' };
        case 'task_late':          return { dot: 'bg-orange-500', label: 'Overdue' };
        case 'ai_score_low':       return { dot: 'bg-violet-500', label: 'Low AI Score' };
        case 'project_created':    return { dot: 'bg-green-500', label: 'Project' };
        case 'content_ready':      return { dot: 'bg-emerald-500', label: 'Ready' };
        case 'project_paid':       return { dot: 'bg-yellow-500', label: 'Payment' };
        default:                   return { dot: 'bg-gray-400', label: 'General' };
    }
}

function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
}

// ── component ─────────────────────────────────────────────────────────────────

const NotificationCenter: React.FC = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [markingAll, setMarkingAll] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const data = await notificationsService.getMyNotifications();
            setNotifications(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleMarkRead = async (id: string) => {
        try {
            await notificationsService.markAsRead(id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, status: 'read' as const } : n)
            );
        } catch (e) { console.error(e); }
    };

    const handleMarkAll = async () => {
        setMarkingAll(true);
        try {
            await notificationsService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, status: 'read' as const })));
        } catch (e) { console.error(e); }
        finally { setMarkingAll(false); }
    };

    const handleNotificationClick = async (notif: Notification) => {
        if (notif.status === 'unread') await handleMarkRead(notif.id);
        
        if (notif.task_id) {
            if (['revision_requested', 'ai_score_low'].includes(notif.type)) {
                navigate(`/worker/tasks/${notif.task_id}/review`);
            } else {
                navigate(`/worker/tasks/${notif.task_id}`);
            }
        }
        else if (notif.project_id) navigate(`/project/${notif.project_id}`);
    };

    const displayed = filter === 'unread'
        ? notifications.filter(n => n.status === 'unread')
        : notifications;

    const unreadCount = notifications.filter(n => n.status === 'unread').length;

    if (loading) {
        return (
            <>
                <WorkerNav />
                <div className="flex items-center justify-center min-h-[50vh]">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
                </div>
            </>
        );
    }

    return (
        <>
            <WorkerNav />
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                            Notifications
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 text-xs font-black bg-primary text-white rounded-full">
                                    {unreadCount}
                                </span>
                            )}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{notifications.length} total</p>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAll}
                            disabled={markingAll}
                            className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50"
                        >
                            <CheckCheck size={14} /> Mark all read
                        </button>
                    )}
                </div>

                {/* Filter tabs */}
                <div className="flex gap-2">
                    {(['all', 'unread'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 text-sm font-bold rounded-xl border capitalize transition-all ${
                                filter === f
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-primary/40'
                            }`}
                        >
                            {f === 'all' ? `All (${notifications.length})` : `Unread (${unreadCount})`}
                        </button>
                    ))}
                </div>

                {/* Notification list */}
                {displayed.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl p-16 text-center">
                        <Bell size={40} className="mx-auto text-gray-200 dark:text-gray-700 mb-3" />
                        <p className="text-gray-400 dark:text-gray-600 font-semibold">
                            {filter === 'unread' ? "You're all caught up!" : 'No notifications yet.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {displayed.map(notif => {
                            const { dot, label } = typeStyle(notif.type);
                            const unread = notif.status === 'unread';
                            const clickable = !!(notif.task_id || notif.project_id);
                            return (
                                <div
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`flex gap-4 px-5 py-4 rounded-2xl border transition-all ${
                                        unread
                                            ? 'bg-primary/5 dark:bg-primary/10 border-primary/20 cursor-pointer'
                                            : clickable
                                                ? 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 cursor-pointer hover:border-primary/30'
                                                : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
                                    }`}
                                >
                                    {/* Dot */}
                                    <div className="flex flex-col items-center pt-1.5 shrink-0">
                                        <div className={`w-2 h-2 rounded-full ${unread ? dot : 'bg-gray-200 dark:bg-gray-700'}`} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400`}>
                                                    {label}
                                                </span>
                                                <p className={`mt-1 text-sm font-bold ${unread ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                                    {notif.title}
                                                </p>
                                            </div>
                                            <span className="text-[10px] text-gray-400 shrink-0 flex items-center gap-1 mt-1">
                                                <Clock size={9} /> {relativeTime(notif.created_at)}
                                            </span>
                                        </div>
                                        {notif.body && (
                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{notif.body}</p>
                                        )}
                                        {clickable && (
                                            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-primary">
                                                <ExternalLink size={9} /> View {notif.task_id ? 'task' : 'project'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Mark read button */}
                                    {unread && (
                                        <button
                                            onClick={e => { e.stopPropagation(); handleMarkRead(notif.id); }}
                                            className="shrink-0 text-[10px] font-bold text-gray-400 hover:text-primary transition-colors mt-1"
                                            title="Mark as read"
                                        >
                                            ✓
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
};

export default NotificationCenter;
