import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Briefcase, Lock, CheckCircle2, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { authService } from '../services/auth';

const Signup = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [isSuccess, setIsSuccess] = useState(false);
    const [isAgency, setIsAgency] = useState(true);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        agencyName: '',
        password: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const payload = {
                email: formData.email,
                password: formData.password,
                full_name: formData.fullName,
                agency_name: isAgency ? formData.agencyName : null,
                role: isAgency ? "manager" : "client"
            };

            await authService.register(payload);
            setIsSuccess(true);

            // Auto-navigate after a short delay or let them click
            setTimeout(() => {
                navigate('/login');
            }, 5000);

        } catch (err) {
            console.error('FULL SIGNUP ERROR:', err);
            const errorMessage = err.message || err.response?.data?.error_description || err.response?.data?.detail || 'Registration failed.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-white">
            {/* Left Side - Gradient */}
            <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-500 to-indigo-600 relative overflow-hidden items-center justify-center p-12 text-white">
                <div className="absolute inset-0">
                    <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-y-[-50%] translate-x-[-20%]"></div>
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl translate-y-[20%] translate-x-[20%]"></div>
                </div>

                <div className="relative z-10 max-w-lg space-y-8">
                    <h2 className="text-4xl font-bold leading-tight">Start Your Free Trial Today</h2>
                    <p className="text-blue-100 text-lg leading-relaxed">
                        No credit card required. Get started in under 60 seconds.
                    </p>

                    <div className="space-y-4 pt-4">
                        {[
                            '14-day free trial',
                            'No credit card required',
                            'Cancel anytime',
                            'Full feature access'
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                                <span className="font-medium text-lg">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Side */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 animate-in fade-in duration-500 slide-in-from-right-10">
                <div className="w-full max-w-md space-y-8">
                    {isSuccess ? (
                        <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
                            <div className="flex justify-center">
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-lg shadow-green-100/50">
                                    <CheckCircle2 size={40} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Registration Successful!</h1>
                                <p className="text-gray-500 text-lg">Your account has been created. You can now log in to access your dashboard.</p>
                            </div>
                            <div className="pt-4">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center justify-center w-full bg-primary text-white font-semibold py-4 rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300 text-lg"
                                >
                                    Log In Now
                                </Link>
                                <p className="mt-4 text-sm text-gray-400">Redirecting to login in few seconds...</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="text-center lg:text-left">
                                <Link to="/" className="inline-block mb-8 lg:hidden">
                                    <span className="text-2xl font-bold text-primary">AgencyFlow</span>
                                </Link>
                                <h2 className="text-sm font-bold text-primary tracking-wide uppercase mb-2">AgencyFlow</h2>
                                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Create Your Account</h1>
                                <p className="mt-2 text-gray-500">Start your 14-day free trial</p>
                            </div>

                            {error && (
                                <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-lg flex items-center gap-2">
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            name="fullName"
                                            required
                                            value={formData.fullName}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900 placeholder:text-gray-400"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">Work Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="email"
                                            name="email"
                                            required
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900 placeholder:text-gray-400"
                                            placeholder="you@company.com"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-2 cursor-pointer group mb-2">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={!isAgency}
                                                onChange={(e) => setIsAgency(!e.target.checked)}
                                                className="peer sr-only"
                                            />
                                            <div className="w-5 h-5 border-2 border-gray-300 rounded md:rounded-md peer-checked:bg-primary peer-checked:border-primary transition-all"></div>
                                            <CheckCircle2 size={12} className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all" />
                                        </div>
                                        <span className="text-sm text-gray-500 group-hover:text-gray-900 transition-colors">I don't have an agency (Personal work)</span>
                                    </label>

                                    {isAgency && (
                                        <>
                                            <label className="text-sm font-medium text-gray-700">Agency Name</label>
                                            <div className="relative">
                                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input
                                                    type="text"
                                                    name="agencyName"
                                                    value={formData.agencyName}
                                                    onChange={handleChange}
                                                    required={isAgency}
                                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900 placeholder:text-gray-400"
                                                    placeholder="Your Agency"
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            required
                                            value={formData.password}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900 placeholder:text-gray-400"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-primary text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 text-base transition-all duration-300 flex items-center justify-center gap-2 mt-4"
                                >
                                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Start Free Trial'}
                                </button>
                            </form>

                            <div className="text-center pt-2 text-xs text-gray-400">
                                By signing up, you agree to our <a href="#" className="underline hover:text-gray-600">Terms of Service</a> and <a href="#" className="underline hover:text-gray-600">Privacy Policy</a>
                            </div>

                            <div className="text-center pt-2">
                                <p className="text-gray-500 text-sm">
                                    Already have an account?{' '}
                                    <Link to="/login" className="text-primary font-semibold hover:underline">
                                        Sign in
                                    </Link>
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Signup;
