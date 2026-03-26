import React, { useState, useEffect, useCallback } from 'react';
import {
    Users, Briefcase, Plus, X, CheckCircle2, AlertCircle,
    UserCheck, UserX, Shield, Search, RefreshCw, Eye, EyeOff
} from 'lucide-react';
import { projectsService } from '../../../api/projects';
import { usersService, type AdminUserCreate } from '../../../api/users';
import type { Project, CurrentUser, UserRole } from '../../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const roleBadge: Record<string, string> = {
    admin:    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    manager:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    employee: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    client:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

const ROLES: UserRole[] = ['employee', 'manager', 'client', 'admin'];

// ── Create Employee Modal ─────────────────────────────────────────────────────

interface CreateModalProps {
    onClose: () => void;
    onCreated: (u: CurrentUser) => void;
}

const CreateEmployeeModal: React.FC<CreateModalProps> = ({ onClose, onCreated }) => {
    const [form, setForm] = useState<AdminUserCreate>({
        email: '', full_name: '', role: 'employee', password: ''
    });
    const [confirmPw, setConfirmPw] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.password !== confirmPw) { setError('Passwords do not match.'); return; }
        if (form.password.length < 6)   { setError('Password must be at least 6 characters.'); return; }
        setSaving(true); setError('');
        try {
            const newUser = await usersService.createEmployee(form);
            onCreated(newUser);
        } catch (err: unknown) {
            const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            setError(detail || 'Failed to create account.');
        } finally {
            setSaving(false);
        }
    };

    const inputCls = 'w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Account</h2>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-center gap-2">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Full Name</label>
                        <input required className={inputCls} placeholder="Jane Smith" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Email</label>
                        <input required type="email" className={inputCls} placeholder="jane@agency.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Role</label>
                        <select className={inputCls} value={form.role} onChange={e => setForm({ ...form, role: e.target.value as UserRole })}>
                            {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Password</label>
                        <div className="relative">
                            <input required type={showPw ? 'text' : 'password'} className={inputCls + ' pr-10'} placeholder="Minimum 6 characters" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                            <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Confirm Password</label>
                        <input required type={showPw ? 'text' : 'password'} className={inputCls} placeholder="Repeat password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving} className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all disabled:opacity-50">
                            {saving ? 'Creating…' : 'Create Account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────

const AdminDashboard: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<CurrentUser[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');

    const showToast = (text: string, ok = true) => {
        setToast({ text, ok });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchAll = useCallback(() => {
        setLoadingProjects(true);
        setLoadingUsers(true);
        projectsService.getAll()
            .then(setProjects)
            .catch(() => showToast('Failed to load projects.', false))
            .finally(() => setLoadingProjects(false));
        usersService.getAll()
            .then(setUsers)
            .catch(() => showToast('Failed to load users.', false))
            .finally(() => setLoadingUsers(false));
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleCreated = (u: CurrentUser) => {
        setUsers(prev => [u, ...prev]);
        setShowCreateModal(false);
        showToast(`Account created for ${u.full_name}.`);
    };

    const handleToggleActive = async (user: CurrentUser) => {
        try {
            if (user.is_active) {
                await usersService.deactivate(user.id);
                setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: false } : u));
                showToast(`${user.full_name} deactivated.`);
            } else {
                const updated = await usersService.reactivate(user.id);
                setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
                showToast(`${user.full_name} reactivated.`);
            }
        } catch {
            showToast('Action failed. Please try again.', false);
        }
    };

    const handleRoleChange = async (user: CurrentUser, role: UserRole) => {
        try {
            const updated = await usersService.update(user.id, { role });
            setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
            showToast(`Role updated to ${role}.`);
        } catch {
            showToast('Failed to update role.', false);
        }
    };

    const filteredUsers = users.filter(u => {
        const matchSearch = u.full_name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase());
        const matchRole = roleFilter === 'all' || u.role === roleFilter;
        return matchSearch && matchRole;
    });

    const activeCount = users.filter(u => u.is_active).length;
    const employeeCount = users.filter(u => u.role === 'employee').length;

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-950 transition-colors duration-300">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-bold flex items-center gap-2 transition-all ${toast.ok ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {toast.text}
                </div>
            )}

            {showCreateModal && (
                <CreateEmployeeModal onClose={() => setShowCreateModal(false)} onCreated={handleCreated} />
            )}

            <main className="max-w-7xl mx-auto px-6 py-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">Admin Dashboard</h1>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Manage users, roles, and monitor all agency projects.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={fetchAll} className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-500 hover:text-primary transition-colors shadow-sm">
                            <RefreshCw size={18} />
                        </button>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-primary text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center gap-2"
                        >
                            <Plus size={18} /> Create Account
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
                    {[
                        { label: 'Total Users', value: users.length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                        { label: 'Active Users', value: activeCount, icon: UserCheck, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
                        { label: 'Employees', value: employeeCount, icon: Shield, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                        { label: 'Projects', value: loadingProjects ? '…' : projects.length, icon: Briefcase, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                    ].map(({ label, value, icon: Icon, color, bg }) => (
                        <div key={label} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                            <div className={`w-10 h-10 ${bg} ${color} rounded-xl flex items-center justify-center mb-3`}>
                                <Icon size={20} />
                            </div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{loadingUsers ? '…' : value}</div>
                            <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-1">{label}</div>
                        </div>
                    ))}
                </div>

                {/* User Management Table */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden mb-8">
                    <div className="px-6 py-4 border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Users size={18} className="text-primary" /> User Management
                        </h2>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search users…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="pl-8 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 dark:text-white w-48"
                                />
                            </div>
                            <select
                                value={roleFilter}
                                onChange={e => setRoleFilter(e.target.value)}
                                className="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="all">All Roles</option>
                                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                            </select>
                        </div>
                    </div>

                    {loadingUsers ? (
                        <div className="p-10 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="p-16 text-center text-gray-400 dark:text-gray-600 italic">No users found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                        <th className="text-left px-6 py-3">User</th>
                                        <th className="text-left px-6 py-3">Role</th>
                                        <th className="text-left px-6 py-3">Status</th>
                                        <th className="text-left px-6 py-3">Member Since</th>
                                        <th className="text-right px-6 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {filteredUsers.map(u => (
                                        <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                                        {u.full_name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 dark:text-white">{u.full_name}</p>
                                                        <p className="text-xs text-gray-400 dark:text-gray-500">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={u.role}
                                                    onChange={e => handleRoleChange(u, e.target.value as UserRole)}
                                                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 ${roleBadge[u.role] || roleBadge.client}`}
                                                >
                                                    {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${u.is_active ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
                                                    {u.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-400 dark:text-gray-500 text-xs">
                                                {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleToggleActive(u)}
                                                    title={u.is_active ? 'Deactivate account' : 'Reactivate account'}
                                                    className={`p-2 rounded-xl transition-all ${u.is_active
                                                        ? 'text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500'
                                                        : 'text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-500'}`}
                                                >
                                                    {u.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Recent Projects */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                        <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Briefcase size={18} className="text-primary" /> All Projects ({projects.length})
                        </h2>
                    </div>
                    {loadingProjects ? (
                        <div className="p-10 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50 dark:divide-gray-800">
                            {projects.map(p => (
                                <div key={p.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white">{p.name}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(p.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${p.status === 'active' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : p.status === 'completed' || p.status === 'delivered' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                                        {p.status}
                                    </span>
                                </div>
                            ))}
                            {projects.length === 0 && (
                                <div className="p-16 text-center text-gray-400 dark:text-gray-600 italic">No projects found.</div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
