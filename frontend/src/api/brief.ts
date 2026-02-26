import { api } from './auth';

export interface BriefSeed {
    project_name: string;
    objective: string;
    platforms: string[];
    tone: string;
    language: string;
}

export interface BriefStartRequest {
    seed: BriefSeed;
}

export interface BriefSubmitRequest {
    sessionId: string;
    data: Record<string, any>;
}

export interface BriefResponse {
    sessionId: string;
    n8n_response: {
        mode: 'schema' | 'embed' | 'complete';
        formId?: string;
        title?: string;
        fields?: any[];
        formUrl?: string;
        brief_content?: string;
        code?: string | number;
    };
}

export const startBrief = async (seed: BriefSeed): Promise<BriefResponse> => {
    const response = await api.post('/brief/start', { seed });
    return response.data;
};

export const submitBriefStep = async (sessionId: string, data: Record<string, any>): Promise<any> => {
    const response = await api.post('/brief/submit', { sessionId, data });
    return response.data;
};

export const getBriefStatus = async (sessionId: string): Promise<any> => {
    const response = await api.get(`/brief/status/${sessionId}`);
    return response.data;
};
