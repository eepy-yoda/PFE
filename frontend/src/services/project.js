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

export const projectService = {
    async getProjects() {
        const response = await axios.get(`${API_URL}/projects/`, getAuthHeaders());
        return response.data;
    },

    async getProject(id) {
        const response = await axios.get(`${API_URL}/projects/${id}`, getAuthHeaders());
        return response.data;
    },

    async requestBrief(briefData) {
        const response = await axios.post(`${API_URL}/projects/request-brief`, briefData, getAuthHeaders());
        return response.data;
    },

    async submitAnswer(answerData) {
        const response = await axios.post(`${API_URL}/projects/submit-answer`, answerData, getAuthHeaders());
        return response.data;
    }
};
