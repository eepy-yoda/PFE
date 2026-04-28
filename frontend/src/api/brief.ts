import { api } from './auth';

export const UNANSWERED_PLACEHOLDER = "not answered by user code 456";

export interface BriefSeed {
    project_name: string;
    objective: string;
    platforms: string[];
    tone: string;
    language: string;
}

export interface BriefField {
    key: string;
    type: string;
    label: string;
    required?: boolean;
    options?: string[];
}

export interface SavedAnswer {
    question: BriefField;
    answer: string;
}

export interface BriefStatusResponse {
    sessionId: string;
    status: string;
    n8n_response: {
        mode: 'schema' | 'embed' | 'complete';
        fields?: BriefField[];
        title?: string;
        brief_content?: string;
        code?: string | number;
    } | null;
    saved_answers: Record<string, SavedAnswer>;
    brief_content: string | null;
}

export interface BriefResponse {
    sessionId: string;
    n8n_response: {
        mode: 'schema' | 'embed' | 'complete';
        formId?: string;
        title?: string;
        fields?: BriefField[];
        formUrl?: string;
        brief_content?: string;
        code?: string | number;
    };
}

export const startBrief = async (seed: BriefSeed): Promise<BriefResponse> => {
    const response = await api.post('/brief/start', { seed });
    return response.data;
};

export const submitBriefStep = async (
    sessionId: string,
    data: Record<string, any>
): Promise<any> => {
    const response = await api.post('/brief/submit', { sessionId, data });
    return response.data;
};

export const getBriefStatus = async (sessionId: string): Promise<BriefStatusResponse> => {
    const response = await api.get(`/brief/status/${sessionId}`);
    return response.data;
};

/** Persist a single answered field to the database immediately. */
export const autosaveBriefAnswer = async (
    sessionId: string,
    fieldKey: string,
    question: BriefField,
    answer: string
): Promise<void> => {
    try {
        await api.post('/brief/autosave', { sessionId, fieldKey, question, answer });
    } catch (e) {
        // Non-blocking — autosave failure must not interrupt the UX
        console.warn('[Brief] Autosave failed (non-blocking):', e);
    }
};

/** Delete a brief/project. Only allowed for briefing or planning status. */
export const deleteBrief = async (sessionId: string): Promise<void> => {
    await api.delete(`/brief/${sessionId}`);
};

/** Save partial state on session interruption (tab close / page hide).
 *  Uses api.post (not sendBeacon) because we have the token in axios headers.
 *  Call this from visibilitychange; beforeunload writes to localStorage instead. */
export const interruptBrief = async (
    sessionId: string,
    answeredFields: Record<string, { question: BriefField; answer: string }>,
    allFields: BriefField[]
): Promise<void> => {
    try {
        await api.post('/brief/interrupt', {
            sessionId,
            answeredFields,
            allFields,
        });
    } catch (e) {
        console.warn('[Brief] Interrupt save failed (non-blocking):', e);
    }
};
