import axios from 'axios';

const API_URL = 'http://localhost:8080/api/v1/auth';

// Create axios instance with default config
export const api = axios.create({
    baseURL: 'http://localhost:8080/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add interceptor to include token in requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth Service for handling API calls
export const authService = {
    async login(email, password) {
        const response = await api.post('/auth/login', {
            email: email,
            password: password
        });

        if (response.data.access_token) {
            localStorage.setItem('token', response.data.access_token);
            localStorage.setItem('user', JSON.stringify({
                role: response.data.role,
                email
            }));
        }
        return response.data;
    },

    async register(userData) {
        const response = await api.post('/auth/signup', userData);
        // After registration, automatically log the user in
        if (response.data) {
            try {
                // Auto-login after registration
                const loginResponse = await this.login(userData.email, userData.password);
                return { ...response.data, ...loginResponse };
            } catch (loginError) {
                console.warn('Auto-login after registration failed:', loginError);
                return response.data;
            }
        }
        return response.data;
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    getCurrentUser() {
        const userStr = localStorage.getItem('user');
        if (userStr) return JSON.parse(userStr);
        return null;
    }
};

export default authService;
