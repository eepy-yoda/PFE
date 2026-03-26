import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/auth';
import { Lock, CheckCircle2, AlertCircle, Key } from 'lucide-react';

const ResetPassword: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

    useEffect(() => {
        if (!token) {
            setMessage({ text: 'Invalid or missing reset token.', ok: false });
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirm) {
            setMessage({ text: 'Passwords do not match.', ok: false });
            return;
        }
        if (password.length < 6) {
            setMessage({ text: 'Password must be at least 6 characters.', ok: false });
            return;
        }
        setLoading(true);
        setMessage(null);
        try {
            await api.post('/auth/reset-password', { token, new_password: password });
            setMessage({ text: 'Password reset successfully! Redirecting to login…', ok: true });
            setTimeout(() => navigate('/login'), 2500);
        } catch (err: unknown) {
            const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            setMessage({ text: detail || 'Failed to reset password. Token may be expired.', ok: false });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 p-10">
                    <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mx-auto mb-6">
                        <Key size={32} className="text-primary" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white text-center mb-2">Reset Password</h1>
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center mb-8">Enter your new password below.</p>

                    {message && (
                        <div className={`p-4 rounded-2xl flex items-center gap-3 mb-6 ${message.ok ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                            {message.ok ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                            <p className="text-sm font-bold">{message.text}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600" size={18} />
                                <input type="password" required className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all" placeholder="At least 6 characters" value={password} onChange={e => setPassword(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600" size={18} />
                                <input type="password" required className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all" placeholder="Repeat new password" value={confirm} onChange={e => setConfirm(e.target.value)} />
                            </div>
                        </div>
                        <button type="submit" disabled={loading || !token} className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all disabled:opacity-50">
                            {loading ? 'Resetting…' : 'Reset Password'}
                        </button>
                    </form>
                    <button onClick={() => navigate('/login')} className="w-full mt-4 text-sm text-gray-400 hover:text-primary transition-colors">
                        Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
