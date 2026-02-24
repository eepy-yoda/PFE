import { Link } from 'react-router-dom';
import { Mail, Lock, CheckCircle2, AlertCircle, Eye, EyeOff, Loader2, Sun, Moon } from 'lucide-react';
import useLoginViewModel from '../../viewmodels/useLoginViewModel';
import { useTheme } from '../../context/ThemeContext';

const Login: React.FC = () => {
    const {
        formData,
        isLoading,
        error,
        showPassword,
        handleChange,
        handleSubmit,
        togglePasswordVisibility,
    } = useLoginViewModel();
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="min-h-screen flex bg-white dark:bg-gray-950 transition-colors duration-300 relative">
            {/* Absolute Top Toggle for Auth Pages */}
            <div className="absolute top-6 right-6 z-10">
                <button
                    onClick={toggleTheme}
                    className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-500 hover:text-primary border border-gray-100 dark:border-gray-800 shadow-sm transition-all"
                >
                    {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>
            </div>
            {/* Left Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 animate-in fade-in duration-500">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <Link to="/" className="inline-block mb-12">
                            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
                                AgencyFlow
                            </span>
                        </Link>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Welcome Back</h2>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">log in to your account to continue</p>
                    </div>

                    {error && (
                        <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-lg flex items-center gap-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900 dark:text-white placeholder:text-gray-400"
                                    placeholder="you@company.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-10 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900 dark:text-white placeholder:text-gray-400"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={togglePasswordVisibility}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        name="rememberMe"
                                        checked={formData.rememberMe}
                                        onChange={handleChange}
                                        className="peer sr-only"
                                    />
                                    <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-700 rounded md:rounded-md peer-checked:bg-primary peer-checked:border-primary transition-all"></div>
                                    <CheckCircle2
                                        size={12}
                                        className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all"
                                    />
                                </div>
                                <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                    Remember me
                                </span>
                            </label>

                            <a href="#" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                                Forgot password?
                            </a>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 text-base transition-all duration-300 flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Login'}
                        </button>
                    </form>

                    <div className="text-center pt-4">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Don't have an account?{' '}
                            <Link to="/signup" className="text-primary font-semibold hover:underline">
                                Sign up for free
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side - Gradient & Content */}
            <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 relative overflow-hidden items-center justify-center p-12 text-white">
                <div className="absolute inset-0">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
                </div>

                <div className="relative z-10 max-w-lg space-y-8">
                    <h2 className="text-4xl font-bold leading-tight">Streamline Your Agency Operations</h2>
                    <p className="text-blue-100 text-lg leading-relaxed">
                        Join 200+ agencies already growing with AgencyFlow. Automate workflows, delight clients, and
                        scale with confidence.
                    </p>

                    <div className="space-y-4 pt-4">
                        {['40% faster delivery', '95% client satisfaction', '20+ hours saved weekly'].map(
                            (item, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                                        <CheckCircle2 size={14} className="text-white" />
                                    </div>
                                    <span className="font-medium">{item}</span>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
