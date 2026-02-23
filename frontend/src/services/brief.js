import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8080/api/v1';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export const briefService = {
    async startBrief(seed) {
        const response = await axios.post(`${API_URL}/brief/start`, { seed }, getAuthHeaders());
        return response.data;
    },

    async submitStep(sessionId, data) {
        const response = await axios.post(`${API_URL}/brief/submit`, { sessionId, data }, getAuthHeaders());
        return response.data;
    },

    async getStatus(sessionId) {
        const response = await axios.get(`${API_URL}/brief/status/${sessionId}`, getAuthHeaders());
        return response.data;
    }
};
