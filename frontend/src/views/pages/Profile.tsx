import React, { useState, useEffect } from 'react';
import { usersService } from '../../api/users';
import { authService } from '../../api/auth';
import type { CurrentUser } from '../../types';
import {
    User,
    Mail,
    Shield,
    Phone,
    Save,
    Camera,
    CheckCircle2,
    AlertCircle,
    Building,
    MapPin,
    Key,
    Home
} from 'lucide-react';

const Profile: React.FC = () => {
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // Profile form — fields match backend UserUpdate schema
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        address: '',       // was "location" — maps to User.address in DB
        agency_name: '',   // was "company" — maps to User.agency_name in DB
        bio: '',
    });

    // Password change form
    const [pwData, setPwData] = useState({ current_password: '', new_password: '', confirm: '' });
    const [pwMsg, setPwMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [isSavingPw, setIsSavingPw] = useState(false);

    useEffect(() => {
        usersService.getMe()
            .then(data => {
                setUser(data);
                setFormData({
                    full_name: data.full_name || '',
                    phone: data.phone || '',
                    address: data.address || '',
                    agency_name: data.agency_name || '',
                    bio: data.bio || '',
                });
            })
            .catch(err => console.error('Failed to fetch profile', err))
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage(null);
        try {
            const updatedUser = await usersService.updateMe(formData);
            setUser(updatedUser);
            const storedUser = authService.getCurrentUser();
            if (storedUser) {
                localStorage.setItem('user', JSON.stringify({ ...storedUser, full_name: updatedUser.full_name }));
            }
            setMessage({ text: 'Profile updated successfully!', type: 'success' });
        } catch (err) {
            console.error('Failed to update profile', err);
            setMessage({ text: 'Failed to update profile. Please try again.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pwData.new_password !== pwData.confirm) {
            setPwMsg({ text: 'New passwords do not match.', type: 'error' });
            return;
        }
        setIsSavingPw(true);
        setPwMsg(null);
        try {
            await usersService.changePassword(pwData.current_password, pwData.new_password);
            setPwMsg({ text: 'Password changed successfully!', type: 'success' });
            setPwData({ current_password: '', new_password: '', confirm: '' });
        } catch (err: unknown) {
            const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            setPwMsg({ text: detail || 'Failed to change password.', type: 'error' });
        } finally {
            setIsSavingPw(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
        );
    }

    const inputCls = 'w-full bg-gray-50 dark:bg-gray-950 border-none rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all placeholder-gray-300 dark:placeholder-gray-700';

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 transition-colors duration-300">
            <div className="mb-10">
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Account Settings</h1>
                <p className="mt-2 text-gray-500 dark:text-gray-400">Manage your profile information and account preferences.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
                        <div className="flex flex-col items-center">
                            <div className="relative group cursor-pointer mb-6">
                                <div className="w-32 h-32 rounded-3xl bg-primary/5 dark:bg-primary/10 flex items-center justify-center border-2 border-dashed border-primary/20 group-hover:border-primary/50 transition-all overflow-hidden">
                                    {user?.avatar_url ? (
                                        <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={64} className="text-primary/20 group-hover:text-primary transition-colors" />
                                    )}
                                </div>
                                <button type="button" className="absolute -bottom-2 -right-2 p-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 text-gray-500 hover:text-primary transition-all">
                                    <Camera size={18} />
                                </button>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user?.full_name || 'Unknown User'}</h2>
                            <p className="text-sm text-gray-400 font-medium mb-6">{user?.email}</p>

                            <div className="w-full space-y-3">
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <Shield size={12} /> Role
                                    </span>
                                    <span className="text-xs font-black text-primary uppercase bg-primary/10 px-2.5 py-1 rounded-lg">
                                        {user?.role}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <CheckCircle2 size={12} /> Status
                                    </span>
                                    <span className={`text-xs font-black px-2.5 py-1 rounded-lg uppercase ${user?.is_active ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}>
                                        {user?.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                {user?.agency_name && (
                                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                        <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                            <Building size={12} /> Agency
                                        </span>
                                        <span className="text-xs font-black text-gray-600 dark:text-gray-400 truncate max-w-[100px]">
                                            {user.agency_name}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Column */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Profile Form */}
                    <form onSubmit={handleSave} className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-all duration-300">
                        <div className="p-8 lg:p-10 space-y-8">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Personal Information</h2>

                            {message && (
                                <div className={`p-4 rounded-2xl flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                                    {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                                    <p className="text-sm font-bold">{message.text}</p>
                                </div>
                            )}

                            {/* Email (read-only) */}
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] pl-1">Email Address (Read Only)</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600" size={18} />
                                    <input disabled className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-gray-400 dark:text-gray-500 cursor-not-allowed" value={user?.email || ''} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] pl-1">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600" size={18} />
                                        <input required className={inputCls} placeholder="Your full name" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] pl-1">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600" size={18} />
                                        <input className={inputCls} placeholder="+1 234 567 890" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] pl-1">Address / Location</label>
                                    <div className="relative">
                                        <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600" size={18} />
                                        <input className={inputCls} placeholder="123 Main St, City, Country" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] pl-1">Agency / Company</label>
                                    <div className="relative">
                                        <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600" size={18} />
                                        <input className={inputCls} placeholder="AgencyFlow LLC" value={formData.agency_name} onChange={e => setFormData({ ...formData, agency_name: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] pl-1">Biography</label>
                                <textarea
                                    className="w-full bg-gray-50 dark:bg-gray-950 border-none rounded-3xl p-6 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary/20 transition-all min-h-[120px] placeholder-gray-300 dark:placeholder-gray-700"
                                    placeholder="Tell us a bit about yourself..."
                                    value={formData.bio}
                                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="p-8 lg:p-10 bg-gray-50/50 dark:bg-gray-950/50 border-t border-gray-50 dark:border-gray-800 flex justify-end">
                            <button type="submit" disabled={isSaving} className="bg-primary text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-3 disabled:opacity-50">
                                {isSaving ? 'Updating…' : 'Save Changes'}
                                <Save size={20} />
                            </button>
                        </div>
                    </form>

                    {/* Password Change Form */}
                    <form onSubmit={handlePasswordChange} className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-all duration-300">
                        <div className="p-8 lg:p-10 space-y-6">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Key size={20} className="text-primary" /> Change Password
                            </h2>

                            {pwMsg && (
                                <div className={`p-4 rounded-2xl flex items-center gap-3 ${pwMsg.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                                    {pwMsg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                                    <p className="text-sm font-bold">{pwMsg.text}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                {[
                                    { label: 'Current Password', key: 'current_password' as const, placeholder: 'Your current password' },
                                    { label: 'New Password', key: 'new_password' as const, placeholder: 'At least 8 characters' },
                                    { label: 'Confirm New Password', key: 'confirm' as const, placeholder: 'Repeat new password' },
                                ].map(({ label, key, placeholder }) => (
                                    <div key={key} className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] pl-1">{label}</label>
                                        <div className="relative">
                                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600" size={18} />
                                            <input
                                                type="password"
                                                required
                                                className={inputCls}
                                                placeholder={placeholder}
                                                value={pwData[key]}
                                                onChange={e => setPwData({ ...pwData, [key]: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-8 lg:p-10 bg-gray-50/50 dark:bg-gray-950/50 border-t border-gray-50 dark:border-gray-800 flex justify-end">
                            <button type="submit" disabled={isSavingPw} className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-8 py-4 rounded-2xl font-black shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-3 disabled:opacity-50">
                                {isSavingPw ? 'Updating…' : 'Update Password'}
                                <Key size={20} />
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Profile;
