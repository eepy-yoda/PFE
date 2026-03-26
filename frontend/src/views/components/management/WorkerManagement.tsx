import React, { useState, useEffect } from 'react';
import { managementService } from '../../../api/management';
import { CurrentUser, Role } from '../../../types';
import { 
    UserPlus, 
    Search, 
    UserCheck, 
    UserX, 
    Mail, 
    Calendar,
    Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const WorkerManagement: React.FC = () => {
    const [workers, setWorkers] = useState<CurrentUser[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    // Create form state
    const [formData, setFormData] = useState({
        email: '',
        full_name: '',
        password: '',
        role: 'employee' as any,
        role_ids: [] as string[]
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [w, r] = await Promise.all([
                managementService.getWorkers(),
                managementService.getRoles()
            ]);
            setWorkers(w);
            setRoles(r);
        } catch (err) {
            console.error("Failed to fetch management data", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateWorker = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await managementService.createWorker(formData);
            setIsCreateModalOpen(false);
            setFormData({ email: '', full_name: '', password: '', role: 'employee', role_ids: [] });
            fetchData();
        } catch (err: any) {
            const msg = err.response?.data?.detail || err.message || "Failed to create worker";
            alert(msg);
        }
    };

    const toggleWorkerStatus = async (worker: CurrentUser) => {
        try {
            await managementService.updateWorker(worker.id, { is_active: !worker.is_active });
            fetchData();
        } catch (err) {
            alert("Failed to update status");
        }
    };

    const filteredWorkers = workers.filter(w => 
        w.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        w.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center">Loading workers...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search workers by name or email..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold hover:shadow-lg hover:shadow-primary/20 transition-all"
                >
                    <UserPlus size={18} />
                    Create Worker
                </button>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Worker</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Role</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Joined</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {filteredWorkers.map(worker => (
                            <tr key={worker.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                            {worker.full_name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 dark:text-white">{worker.full_name}</div>
                                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                                <Mail size={12} /> {worker.email}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-bold uppercase text-gray-600 dark:text-gray-400">
                                            {worker.role}
                                        </span>
                                        {worker.assigned_roles?.map(r => (
                                            <span key={r.id} className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400">
                                                {r.name}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                        worker.is_active 
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                    }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${worker.is_active ? 'bg-green-500' : 'bg-rose-500'}`} />
                                        {worker.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    <div className="flex items-center gap-1">
                                        <Calendar size={14} />
                                        {new Date(worker.created_at).toLocaleDateString()}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button 
                                            onClick={() => toggleWorkerStatus(worker)}
                                            className={`p-2 rounded-lg transition-colors ${worker.is_active ? 'text-rose-500 hover:bg-rose-50' : 'text-green-500 hover:bg-green-50'}`}
                                            title={worker.is_active ? 'Deactivate' : 'Activate'}
                                        >
                                            {worker.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
                                        </button>
                                        <button className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                                            <Settings size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create Worker Modal */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-800"
                        >
                            <form onSubmit={handleCreateWorker}>
                                <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <UserPlus className="text-primary" size={20} />
                                        New Worker Account
                                    </h3>
                                    <button type="button" onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Full Name</label>
                                        <input 
                                            required
                                            type="text" 
                                            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                            value={formData.full_name}
                                            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                                        <input 
                                            required
                                            type="email" 
                                            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                            value={formData.email}
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Initial Password</label>
                                        <input 
                                            required
                                            type="password" 
                                            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                            value={formData.password}
                                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Primary Role</label>
                                            <select 
                                                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                                value={formData.role}
                                                onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                                            >
                                                <option value="employee">Employee</option>
                                                <option value="manager">Manager</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Functional Role</label>
                                            <select 
                                                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                                multiple
                                                onChange={(e) => {
                                                    const values = Array.from(e.target.selectedOptions, option => option.value);
                                                    setFormData({...formData, role_ids: values});
                                                }}
                                            >
                                                {roles.map(r => (
                                                    <option key={r.id} value={r.id}>{r.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 bg-gray-50/50 dark:bg-gray-800/50 flex gap-3">
                                    <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-500">Cancel</button>
                                    <button type="submit" className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">Create Account</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WorkerManagement;
