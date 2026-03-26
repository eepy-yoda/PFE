import React, { useState, useEffect, useRef } from 'react';
import { managementService } from '../../../api/management';
import { projectsService } from '../../../api/projects';
import { Task, CurrentUser } from '../../../types';
import {
    Search, Clock, Play, CheckCircle2, AlertCircle,
    User, Calendar, GripVertical, X, Edit3, Save,
    Briefcase, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Column config ─────────────────────────────────────────────────────────────

const COLUMN_STATUS_MAP: Record<string, string[]> = {
    todo:        ['todo', 'revision_requested', 'late'],
    in_progress: ['in_progress'],
    review:      ['submitted', 'under_ai_review'],
    completed:   ['completed', 'approved'],
};

const COLUMN_TARGET_STATUS: Record<string, string> = {
    todo:        'todo',
    in_progress: 'in_progress',
    review:      'submitted',
    completed:   'completed',
};

const PRIORITY_COLORS: Record<string, string> = {
    low:    'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    medium: 'bg-blue-50 text-blue-500 dark:bg-blue-900/20 dark:text-blue-400',
    high:   'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    urgent: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
};

// ── Task Detail / Edit Modal ──────────────────────────────────────────────────

interface TaskModalProps {
    task: Task;
    workers: CurrentUser[];
    onClose: () => void;
    onSaved: (updated: Task) => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ task, workers, onClose, onSaved }) => {
    const [editing, setEditing] = useState(false);
    const [saving,  setSaving]  = useState(false);
    const [error,   setError]   = useState('');

    const [form, setForm] = useState({
        title:       task.title,
        description: task.description ?? '',
        assigned_to: task.assigned_to ?? '',
        deadline:    task.deadline ? task.deadline.split('T')[0] : '',
        priority:    task.priority,
    });

    const workerName = (id?: string) => {
        if (!id) return 'Unassigned';
        const w = workers.find(w => w.id === id);
        return w ? (w.full_name || w.email) : 'Unknown';
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setError('');
        try {
            const payload: Record<string, unknown> = {
                title:    form.title,
                priority: form.priority,
            };
            if (form.description !== undefined) payload.description = form.description || null;
            if (form.assigned_to)  payload.assigned_to = form.assigned_to;
            if (form.deadline)     payload.deadline    = new Date(form.deadline).toISOString();

            const updated = await projectsService.updateTask(task.id, payload as Partial<Task>);
            onSaved(updated);
            setEditing(false);
        } catch (err: unknown) {
            const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            setError(detail || 'Failed to save changes.');
        } finally {
            setSaving(false);
        }
    };

    const isOverdue = task.deadline && new Date(task.deadline) < new Date()
        && task.status !== 'completed' && task.status !== 'approved';

    const inputCls = 'w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all';

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.18 }}
                className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-800"
            >
                {/* Header */}
                <div className="px-7 py-5 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-3 bg-gray-50/40 dark:bg-gray-800/40">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            {task.project_name && (
                                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-widest">
                                    <Briefcase size={10} /> {task.project_name}
                                </span>
                            )}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium}`}>
                                {task.priority}
                            </span>
                        </div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
                            {editing ? 'Edit Task' : task.title}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {!editing && (
                            <button
                                onClick={() => setEditing(true)}
                                className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors"
                                title="Edit task"
                            >
                                <Edit3 size={16} />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                        >
                            <X size={18} className="text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="px-7 py-6 max-h-[60vh] overflow-y-auto">
                    {editing ? (
                        <form id="task-edit-form" onSubmit={handleSave} className="space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm">
                                    {error}
                                </div>
                            )}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Task Title *</label>
                                <input
                                    required
                                    className={inputCls}
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Description</label>
                                <textarea
                                    rows={3}
                                    className={inputCls + ' resize-none'}
                                    placeholder="Task details…"
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Assigned To</label>
                                    <select
                                        className={inputCls}
                                        value={form.assigned_to}
                                        onChange={e => setForm({ ...form, assigned_to: e.target.value })}
                                    >
                                        <option value="">Unassigned</option>
                                        {workers.map(w => (
                                            <option key={w.id} value={w.id}>{w.full_name || w.email}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Priority</label>
                                    <select
                                        className={inputCls}
                                        value={form.priority}
                                        onChange={e => setForm({ ...form, priority: e.target.value })}
                                    >
                                        {['low', 'medium', 'high', 'urgent'].map(p => (
                                            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Deadline</label>
                                <input
                                    type="date"
                                    className={inputCls}
                                    value={form.deadline}
                                    onChange={e => setForm({ ...form, deadline: e.target.value })}
                                />
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-5">
                            {/* Description */}
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Description</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                    {task.description || <span className="italic text-gray-400">No description provided.</span>}
                                </p>
                            </div>

                            {/* Meta grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                        <User size={10} /> Assigned To
                                    </p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{workerName(task.assigned_to)}</p>
                                </div>
                                <div className={`rounded-2xl p-4 ${isOverdue ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                        <Calendar size={10} /> Deadline
                                    </p>
                                    <p className={`text-sm font-bold ${isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white'}`}>
                                        {task.deadline
                                            ? new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                            : 'No deadline'}
                                        {isOverdue && <span className="block text-[10px] font-bold text-rose-500 mt-0.5">OVERDUE</span>}
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                        <Tag size={10} /> Status
                                    </p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">
                                        {task.status.replace(/_/g, ' ')}
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                        <Briefcase size={10} /> Project
                                    </p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                                        {task.project_name || '—'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-7 py-5 border-t border-gray-50 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-800/40 flex gap-3">
                    {editing ? (
                        <>
                            <button
                                type="button"
                                onClick={() => { setEditing(false); setError(''); }}
                                className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold text-gray-500 hover:bg-white dark:hover:bg-gray-800 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="task-edit-form"
                                disabled={saving}
                                className="flex-[2] py-3 bg-primary text-white rounded-2xl text-sm font-black shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {saving ? 'Saving…' : <><Save size={15} /> Save Changes</>}
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold text-gray-500 hover:bg-white dark:hover:bg-gray-800 transition-all"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => setEditing(true)}
                                className="flex-[2] py-3 bg-primary text-white rounded-2xl text-sm font-black shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center justify-center gap-2"
                            >
                                <Edit3 size={15} /> Edit Task
                            </button>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

// ── Main TaskBoard ────────────────────────────────────────────────────────────

const TaskBoard: React.FC = () => {
    const [tasks,       setTasks]       = useState<Task[]>([]);
    const [workers,     setWorkers]     = useState<CurrentUser[]>([]);
    const [loading,     setLoading]     = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    // Drag state
    const dragTaskId  = useRef<string | null>(null);
    const didDragRef  = useRef(false);          // true if mouse actually moved columns
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [overColumn, setOverColumn] = useState<string | null>(null);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [t, w] = await Promise.all([
                managementService.getTasks(),
                managementService.getWorkers(),
            ]);
            setTasks(t);
            setWorkers(w);
        } catch (err) {
            console.error('Failed to fetch task board data', err);
        } finally {
            setLoading(false);
        }
    };

    const getWorkerName = (id: string | null | undefined) => {
        if (!id) return 'Unassigned';
        const w = workers.find(w => w.id === id);
        return w ? (w.full_name || w.email) : 'Unknown';
    };

    const filteredTasks = tasks.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.project_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const columns = [
        { id: 'todo',        title: 'To Do',      icon: Clock,        color: 'text-gray-500',  bg: 'bg-gray-100 dark:bg-gray-800',        border: 'border-gray-200 dark:border-gray-700',   accent: 'border-gray-400' },
        { id: 'in_progress', title: 'In Progress', icon: Play,         color: 'text-blue-500',  bg: 'bg-blue-50 dark:bg-blue-900/20',       border: 'border-blue-200 dark:border-blue-800',   accent: 'border-blue-400' },
        { id: 'review',      title: 'In Review',   icon: AlertCircle,  color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20',     border: 'border-amber-200 dark:border-amber-800', accent: 'border-amber-400' },
        { id: 'completed',   title: 'Completed',   icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20',     border: 'border-green-200 dark:border-green-800', accent: 'border-green-400' },
    ].map(col => ({
        ...col,
        tasks: filteredTasks.filter(t => COLUMN_STATUS_MAP[col.id].includes(t.status)),
    }));

    // ── Drag handlers ────────────────────────────────────────────────────────

    const handleDragStart = (e: React.DragEvent, task: Task) => {
        didDragRef.current = false;
        dragTaskId.current = task.id;
        setDraggingId(task.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        dragTaskId.current = null;
        setDraggingId(null);
        setOverColumn(null);
        // Reset drag flag slightly after so onClick can check it
        setTimeout(() => { didDragRef.current = false; }, 50);
    };

    const handleDragOver = (e: React.DragEvent, colId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        didDragRef.current = true;
        setOverColumn(colId);
    };

    const handleDragLeave = () => setOverColumn(null);

    const handleDrop = async (e: React.DragEvent, colId: string) => {
        e.preventDefault();
        setOverColumn(null);

        const taskId = dragTaskId.current;
        if (!taskId) return;

        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const newStatus = COLUMN_TARGET_STATUS[colId];
        if (COLUMN_STATUS_MAP[colId].includes(task.status)) return;

        // Optimistic update
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as Task['status'] } : t));
        try {
            await projectsService.updateTask(taskId, { status: newStatus as Task['status'] });
        } catch {
            // Rollback
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: task.status } : t));
        }
    };

    // ── Click handler — only fires when NOT dragging ──────────────────────────

    const handleCardClick = (task: Task) => {
        if (didDragRef.current) return; // was a drag, not a click
        setSelectedTask(task);
    };

    // ── After saving from modal — patch the task in state ────────────────────

    const handleTaskSaved = (updated: Task) => {
        setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
        setSelectedTask(updated);
    };

    if (loading) return (
        <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
    );

    return (
        <>
            <div className="space-y-6">
                {/* Search */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by task, description or project…"
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm text-gray-900 dark:text-white"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-medium hidden md:block">
                        Click a card to view details · Drag to change status
                    </p>
                </div>

                {/* Board */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                    {columns.map(col => {
                        const isOver = overColumn === col.id;
                        return (
                            <div
                                key={col.id}
                                onDragOver={e => handleDragOver(e, col.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={e => handleDrop(e, col.id)}
                                className={`flex flex-col rounded-3xl border-2 bg-white dark:bg-gray-900 shadow-sm overflow-hidden min-h-[500px] transition-all duration-200 ${
                                    isOver ? `${col.accent} shadow-lg scale-[1.01]` : col.border
                                }`}
                            >
                                {/* Column header */}
                                <div className={`px-5 py-4 ${col.bg} border-b ${col.border} flex justify-between items-center`}>
                                    <h3 className={`font-bold flex items-center gap-2 ${col.color}`}>
                                        <col.icon size={18} /> {col.title}
                                    </h3>
                                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/50 dark:bg-black/20 text-gray-700 dark:text-gray-300">
                                        {col.tasks.length}
                                    </span>
                                </div>

                                {/* Task cards */}
                                <div className={`p-4 flex-1 space-y-3 transition-colors duration-200 ${isOver ? 'bg-primary/5' : 'bg-gray-50/50 dark:bg-gray-950/20'}`}>
                                    {col.tasks.map(task => (
                                        <div
                                            key={task.id}
                                            draggable
                                            onDragStart={e => handleDragStart(e, task)}
                                            onDragEnd={handleDragEnd}
                                            onClick={() => handleCardClick(task)}
                                            className={`bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-primary/30 dark:hover:border-primary/40 transition-all group select-none ${
                                                draggingId === task.id
                                                    ? 'opacity-40 scale-95 ring-2 ring-primary/40'
                                                    : 'cursor-pointer hover:-translate-y-0.5'
                                            }`}
                                        >
                                            {/* Card header */}
                                            <div className="flex justify-between items-start mb-1 gap-2">
                                                <h4 className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-primary transition-colors line-clamp-2 flex-1">
                                                    {task.title}
                                                </h4>
                                                <GripVertical
                                                    size={15}
                                                    className="text-gray-300 dark:text-gray-600 shrink-0 mt-0.5 group-hover:text-gray-400 transition-colors cursor-grab active:cursor-grabbing"
                                                    onMouseDown={e => e.stopPropagation()} // drag handle only
                                                />
                                            </div>

                                            {/* Project name — NEW */}
                                            {task.project_name && (
                                                <p className="text-[10px] font-bold text-primary/70 dark:text-primary/60 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                    <Briefcase size={9} /> {task.project_name}
                                                </p>
                                            )}

                                            {task.description && (
                                                <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1 mb-3">{task.description}</p>
                                            )}

                                            {/* Footer meta */}
                                            <div className="flex flex-wrap items-center gap-y-1.5 justify-between mt-2 text-xs text-gray-500">
                                                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-md">
                                                    <User size={11} />
                                                    <span className="font-medium truncate max-w-[90px]" title={getWorkerName(task.assigned_to)}>
                                                        {getWorkerName(task.assigned_to)}
                                                    </span>
                                                </div>
                                                {task.deadline && (
                                                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${
                                                        new Date(task.deadline) < new Date() && task.status !== 'completed' && task.status !== 'approved'
                                                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 font-bold'
                                                            : 'bg-gray-50 dark:bg-gray-800'
                                                    }`}>
                                                        <Calendar size={11} />
                                                        <span>{new Date(task.deadline).toLocaleDateString()}</span>
                                                    </div>
                                                )}
                                                {task.priority && task.priority !== 'medium' && (
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${PRIORITY_COLORS[task.priority] || ''}`}>
                                                        {task.priority}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Drop zone */}
                                    {isOver && draggingId && !col.tasks.find(t => t.id === draggingId) && (
                                        <div className={`border-2 border-dashed ${col.accent} rounded-2xl p-6 text-center text-xs font-bold ${col.color} opacity-70 animate-pulse`}>
                                            Drop here
                                        </div>
                                    )}

                                    {col.tasks.length === 0 && !isOver && (
                                        <div className="p-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-gray-400 dark:text-gray-600 italic text-sm">
                                            No tasks
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Task Detail / Edit Modal */}
            <AnimatePresence>
                {selectedTask && (
                    <TaskModal
                        task={selectedTask}
                        workers={workers}
                        onClose={() => setSelectedTask(null)}
                        onSaved={handleTaskSaved}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default TaskBoard;
