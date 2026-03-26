import React, { useState, useEffect } from 'react';
import { managementService } from '../../../api/management';
import { Role, Permission } from '../../../types';
import { Plus, Shield, Check, ShieldAlert, Edit2 } from 'lucide-react';

const RoleManagement: React.FC = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [r, p] = await Promise.all([
                managementService.getRoles(),
                managementService.getPermissions()
            ]);
            setRoles(r);
            setPermissions(p);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const togglePermission = async (role: Role, permId: string) => {
        const hasPerm = role.permissions.some(p => p.id === permId);
        const newPermIds = hasPerm 
            ? role.permissions.filter(p => p.id !== permId).map(p => p.id)
            : [...role.permissions.map(p => p.id), permId];
        
        try {
            await managementService.updateRole(role.id, { permission_ids: newPermIds });
            fetchData();
            if (selectedRole?.id === role.id) {
                 // update selected role locally
                 setSelectedRole({...role, permissions: permissions.filter(p => newPermIds.includes(p.id))});
            }
        } catch (err) {
            alert("Failed to update role permissions");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading roles...</div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Roles List */}
            <div className="lg:col-span-1 space-y-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Active Roles</h3>
                    <button className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all">
                        <Plus size={18} />
                    </button>
                </div>
                <div className="space-y-3">
                    {roles.map(role => (
                        <div 
                            key={role.id} 
                            onClick={() => setSelectedRole(role)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                                selectedRole?.id === role.id 
                                ? 'bg-primary/5 border-primary/20 shadow-sm' 
                                : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-gray-200'
                            }`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${role.is_system ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                        <Shield size={18} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900 dark:text-white">{role.name}</div>
                                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">
                                            {role.permissions.length} Permissions
                                        </div>
                                    </div>
                                </div>
                                {role.is_system && <ShieldAlert size={14} className="text-amber-400" />}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Permission Editor */}
            <div className="lg:col-span-2">
                {selectedRole ? (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm h-full flex flex-col">
                        <div className="p-6 border-b border-gray-50 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/30 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    Editing: {selectedRole.name}
                                    <Edit2 size={14} className="text-gray-400" />
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">{selectedRole.description || 'Manage permissions for this role.'}</p>
                            </div>
                            {selectedRole.is_system && (
                                <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase">System Restricted</span>
                            )}
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[600px]">
                            {permissions.map(perm => {
                                const isAssigned = selectedRole.permissions.some(p => p.id === perm.id);
                                return (
                                    <div 
                                        key={perm.id} 
                                        onClick={() => togglePermission(selectedRole, perm.id)}
                                        className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                            isAssigned 
                                            ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200/50 dark:border-green-900/30' 
                                            : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-gray-200'
                                        }`}
                                    >
                                        <div className="flex-1">
                                            <div className={`text-sm font-bold ${isAssigned ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {perm.name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                            </div>
                                            <div className="text-[10px] text-gray-400 line-clamp-1">{perm.description}</div>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                            isAssigned ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-transparent'
                                        }`}>
                                            <Check size={14} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-auto p-6 bg-gray-50/30 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 flex items-center gap-2">
                             <Shield size={14} /> Changes are applied immediately to all workers with this role.
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl text-gray-400">
                        <Shield size={64} className="mb-4 opacity-10" />
                        <p className="font-bold">Select a role to manage permissions</p>
                        <p className="text-sm">Customize what each type of worker can see and do.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoleManagement;
