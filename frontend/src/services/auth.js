import axios from 'axios';
import { supabase } from '../lib/supabaseClient';

const API_URL = import.meta.env.VITE_API_URL + '/auth';

// Create axios instance with default config
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
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
        console.log('REGISTER PAYLOAD:', userData);
        // We now call our backend API so we can see logs in the terminal
        const response = await api.post('/auth/signup', userData);
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
