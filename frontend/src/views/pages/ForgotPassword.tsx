import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../api/auth';
import { Mail, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';

const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            const data = await authService.forgotPassword(email);
            setMessage({ text: data.message, ok: true });
        } catch {
            setMessage({ text: 'Something went wrong. Please try again.', ok: false });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 p-10">
                    <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mx-auto mb-6">
                        <KeyRound size={32} className="text-primary" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white text-center mb-2">Forgot Password</h1>
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center mb-8">
                        Enter your account email and we'll send you a reset link.
                    </p>

                    {message && (
                        <div className={`p-4 rounded-2xl flex items-center gap-3 mb-6 ${message.ok ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                            {message.ok ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                            <p className="text-sm font-bold">{message.text}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600" size={18} />
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all"
                                    placeholder="you@company.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Sending…' : 'Send Reset Link'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link to="/login" className="text-sm text-gray-400 hover:text-primary transition-colors">
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
