import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, Server, Database, Shield, AlertCircle, RefreshCw, type LucideIcon } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:8001';

interface TestResult {
    status: 'pending' | 'success' | 'error';
    message: string;
    data: any;
}

interface TestState {
    health: TestResult;
    root: TestResult;
    register: TestResult;
    login: TestResult;
}

interface TestCardProps {
    title: string;
    icon: LucideIcon;
    test: TestResult;
    description: string;
}

const ConnectionTest: React.FC = () => {
    const [tests, setTests] = useState<TestState>({
        health: { status: 'pending', message: '', data: null },
        root: { status: 'pending', message: '', data: null },
        register: { status: 'pending', message: '', data: null },
        login: { status: 'pending', message: '', data: null },
    });
    const [isRunning, setIsRunning] = useState(false);
    const [testUser] = useState({
        email: `test${Date.now()}@example.com`,
        username: `testuser${Date.now()}`,
        password: 'TestPass123',
    });

    const runAllTests = async () => {
        setIsRunning(true);
        setTests({
            health: { status: 'pending', message: 'Testing...', data: null },
            root: { status: 'pending', message: 'Testing...', data: null },
            register: { status: 'pending', message: 'Testing...', data: null },
            login: { status: 'pending', message: 'Testing...', data: null },
        });

        // Test 1: Health Check
        try {
            const healthRes = await axios.get(`${API_BASE}/health`);
            setTests(prev => ({
                ...prev,
                health: {
                    status: 'success',
                    message: 'Backend is healthy',
                    data: healthRes.data,
                },
            }));
        } catch (error: any) {
            setTests(prev => ({
                ...prev,
                health: {
                    status: 'error',
                    message: error.message || 'Backend not reachable',
                    data: error.response?.data || null,
                },
            }));
        }

        // Test 2: Root Endpoint
        try {
            const rootRes = await axios.get(`${API_BASE}/`);
            setTests(prev => ({
                ...prev,
                root: {
                    status: 'success',
                    message: 'API root endpoint accessible',
                    data: rootRes.data,
                },
            }));
        } catch (error: any) {
            setTests(prev => ({
                ...prev,
                root: {
                    status: 'error',
                    message: error.message || 'Root endpoint not accessible',
                    data: error.response?.data || null,
                },
            }));
        }

        // Test 3: Register
        try {
            const registerRes = await axios.post(`${API_BASE}/api/v1/auth/register`, {
                email: testUser.email,
                username: testUser.username,
                password: testUser.password,
                full_name: 'Test User',
                role: 'client',
            });
            setTests(prev => ({
                ...prev,
                register: {
                    status: 'success',
                    message: 'User registration successful',
                    data: registerRes.data,
                },
            }));
        } catch (error: any) {
            setTests(prev => ({
                ...prev,
                register: {
                    status: 'error',
                    message: error.response?.data?.detail || error.message || 'Registration failed',
                    data: error.response?.data || null,
                },
            }));
        }

        // Test 4: Login
        try {
            const formData = new FormData();
            formData.append('username', testUser.email);
            formData.append('password', testUser.password);

            const loginRes = await axios.post(`${API_BASE}/api/v1/auth/login`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setTests(prev => ({
                ...prev,
                login: {
                    status: 'success',
                    message: 'Login successful - Token received',
                    data: {
                        ...loginRes.data,
                        token_preview: (loginRes.data.access_token as string)?.substring(0, 50) + '...',
                    },
                },
            }));
        } catch (error: any) {
            setTests(prev => ({
                ...prev,
                login: {
                    status: 'error',
                    message: error.response?.data?.detail || error.message || 'Login failed',
                    data: error.response?.data || null,
                },
            }));
        }

        setIsRunning(false);
    };

    const TestCard: React.FC<TestCardProps> = ({ title, icon: Icon, test, description }) => {
        const getStatusColor = () => {
            if (test.status === 'success') return 'text-green-600 bg-green-50 border-green-200';
            if (test.status === 'error') return 'text-red-600 bg-red-50 border-red-200';
            return 'text-gray-600 bg-gray-50 border-gray-200';
        };

        const getStatusIcon = () => {
            if (test.status === 'success') return <CheckCircle2 className="text-green-600" size={20} />;
            if (test.status === 'error') return <XCircle className="text-red-600" size={20} />;
            return <Loader2 className="text-gray-400 animate-spin" size={20} />;
        };

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 rounded-xl border-2 ${getStatusColor()} transition-all`}
            >
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg">
                            <Icon size={24} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">{title}</h3>
                            <p className="text-sm opacity-75 mt-1">{description}</p>
                        </div>
                    </div>
                    {getStatusIcon()}
                </div>

                <div className="mt-4">
                    <p className={`text-sm font-medium mb-2 ${test.status === 'success' ? 'text-green-700' : test.status === 'error' ? 'text-red-700' : 'text-gray-600'}`}>
                        {test.message || 'Waiting to test...'}
                    </p>
                    {test.data && (
                        <details className="mt-3">
                            <summary className="text-xs cursor-pointer opacity-75 hover:opacity-100">
                                View response data
                            </summary>
                            <pre className="mt-2 p-3 bg-white/50 rounded-lg text-xs overflow-x-auto">
                                {JSON.stringify(test.data, null, 2)}
                            </pre>
                        </details>
                    )}
                </div>
            </motion.div>
        );
    };

    const allTestsPassed = Object.values(tests).every(t => t.status === 'success');
    const anyTestFailed = (Object.values(tests) as TestResult[]).some(t => t.status === 'error');
    const allTestsRun = Object.values(tests).every(t => t.status !== 'pending');

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Backend Connection Test</h1>
                    <p className="text-gray-600">
                        Verify that your frontend can communicate with the AgencyFlow backend API
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200 shadow-sm">
                        <Server size={16} className="text-gray-500" />
                        <span className="text-sm font-mono text-gray-700">{API_BASE}</span>
                    </div>
                </motion.div>

                {/* Status Banner */}
                {allTestsRun && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`mb-6 p-4 rounded-xl border-2 flex items-center gap-3 ${allTestsPassed
                            ? 'bg-green-50 border-green-200 text-green-800'
                            : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                            }`}
                    >
                        {allTestsPassed ? (
                            <>
                                <CheckCircle2 size={24} />
                                <div>
                                    <p className="font-semibold">All tests passed! 🎉</p>
                                    <p className="text-sm opacity-75">Your frontend and backend are connected successfully.</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <AlertCircle size={24} />
                                <div>
                                    <p className="font-semibold">Some tests failed</p>
                                    <p className="text-sm opacity-75">
                                        {anyTestFailed
                                            ? 'Check the error messages below and ensure your backend is running.'
                                            : 'Please run the tests to check connection status.'}
                                    </p>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}

                {/* Test Button */}
                <div className="mb-8 flex justify-center">
                    <button
                        onClick={runAllTests}
                        disabled={isRunning}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isRunning ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                Running tests...
                            </>
                        ) : (
                            <>
                                <RefreshCw size={20} />
                                Run All Tests
                            </>
                        )}
                    </button>
                </div>

                {/* Test Cards */}
                <div className="space-y-4">
                    <TestCard
                        title="Health Check"
                        icon={Database}
                        test={tests.health}
                        description="Tests if the backend server is running and healthy"
                    />
                    <TestCard
                        title="Root Endpoint"
                        icon={Server}
                        test={tests.root}
                        description="Tests basic API connectivity and CORS configuration"
                    />
                    <TestCard
                        title="User Registration"
                        icon={Shield}
                        test={tests.register}
                        description="Tests the registration endpoint with a test user"
                    />
                    <TestCard
                        title="User Login"
                        icon={CheckCircle2}
                        test={tests.login}
                        description="Tests authentication and token generation"
                    />
                </div>

                {/* Instructions */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-8 p-6 bg-white rounded-xl border border-gray-200 shadow-sm"
                >
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <AlertCircle size={20} className="text-gray-500" />
                        How to test
                    </h3>
                    <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
                        <li>
                            <strong>Start your backend:</strong> Open a terminal, navigate to the <code className="bg-gray-100 px-1 rounded">backend</code> folder, and run:
                            <pre className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono">
                                uvicorn app.main:app --reload --port 8001
                            </pre>
                        </li>
                        <li>
                            <strong>Verify backend is running:</strong> Open{' '}
                            <a href={`${API_BASE}/docs`} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                                {API_BASE}/docs
                            </a>{' '}
                            in your browser to see the API documentation.
                        </li>
                        <li>
                            <strong>Run the tests:</strong> Click the "Run All Tests" button above to test all endpoints.
                        </li>
                        <li>
                            <strong>Check results:</strong> Green checkmarks mean success, red X means failure. Expand any test card to see detailed response data.
                        </li>
                    </ol>
                </motion.div>
            </div>
        </div>
    );
};

export default ConnectionTest;
