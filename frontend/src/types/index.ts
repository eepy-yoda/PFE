// ── RBAC ───────────────────────────────────────────────────────────────────

export interface Permission {
    id: string;
    name: string;
    description?: string;
}

export interface Role {
    id: string;
    name: string;
    description?: string;
    is_system: boolean;
    permissions: Permission[];
}

// ── Auth ────────────────────────────────────────────────────────────────────

export type UserRole = 'manager' | 'client' | 'admin' | 'employee';

/** Shape of the user object stored in localStorage and returned by authService */
export interface CurrentUser {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    avatar_url?: string;
    phone?: string;
    address?: string;
    location?: string;
    company?: string;
    bio?: string;
    agency_name?: string;
    created_at: string;
    is_active: boolean;
    assigned_roles?: Role[];
}

// ── Login ────────────────────────────────────────────────────────────────────

export interface LoginFormData {
    email: string;
    password: string;
    rememberMe: boolean;
}

/** What the LoginViewModel exposes to the view */
export interface LoginViewModel {
    formData: LoginFormData;
    isLoading: boolean;
    error: string;
    showPassword: boolean;
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
    togglePasswordVisibility: () => void;
}

// ── Signup ───────────────────────────────────────────────────────────────────

export interface SignupFormData {
    fullName: string;
    email: string;
    agencyName: string;
    password: string;
}

/** Payload sent to the backend registration endpoint */
export interface RegisterPayload {
    email: string;
    password: string;
    full_name: string;
    agency_name: string | null;
    role: 'manager' | 'client';
}

/** What the SignupViewModel exposes to the view */
export interface SignupViewModel {
    formData: SignupFormData;
    isLoading: boolean;
    error: string;
    showPassword: boolean;
    isSuccess: boolean;
    isAgency: boolean;
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleAgencyToggle: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
    togglePasswordVisibility: () => void;
}

// ── Projects ─────────────────────────────────────────────────────────────────

export type ProjectStatus = 'briefing' | 'planning' | 'active' | 'completed' | 'on_hold' | 'delivered' | 'archived';
export type BriefStatus = 'draft' | 'in_progress' | 'interrupted' | 'submitted' | 'clarification_requested' | 'validated' | 'rejected' | 'converted';
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'fully_paid' | 'pending' | 'paid' | 'overdue';
export type PaymentType = 'project' | 'task';
export type DeliveryState = 'not_delivered' | 'watermark_delivered' | 'final_delivered';

/** Shape of a project returned from the backend API */
export interface Project {
    id: string;
    name: string;
    description?: string;
    status: ProjectStatus;
    brief_status: BriefStatus;
    payment_type: PaymentType;
    payment_status: PaymentStatus;
    total_project_price?: number;
    amount_paid?: number;
    manager_id: string;
    client_id?: string;
    assigned_to?: string;
    deadline?: string;
    brief_content?: string;
    clarification_notes?: string;
    payment_updated_at?: string;
    paid_at?: string;
    created_at: string;
    updated_at: string;
}

// ── Tasks ────────────────────────────────────────────────────────────────────

export type TaskStatus = 'todo' | 'in_progress' | 'submitted' | 'under_ai_review' | 'revision_requested' | 'approved' | 'completed' | 'late';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
    id: string;
    project_id: string;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigned_to?: string;
    assignee_ids: string[];
    created_by: string;
    deadline?: string;
    order_index: number;
    project_name?: string;
    project_brief?: string;
    payment_status?: PaymentStatus;
    amount_paid?: number;
    delivery_state?: DeliveryState;
    final_delivered_at?: string;
    watermarked_delivered_at?: string;
    last_payment_update_at?: string;
    created_at: string;
    updated_at: string;
}

export type SubmissionStatus = 'pending' | 'validated' | 'rejected';

// ── AI Analysis Result ────────────────────────────────────────────────────────

export type AIAnalysisStatus = 'aligns' | 'does_not_align' | 'needs_revision' | 'error';

export interface AIChecks {
    subject_concept: string;
    brand_message: string;
    target_audience: string;
    style_mood: string;
    colors: string;
    composition: string;
    required_elements: string;
}

/** Normalized AI analysis stored as JSON string in TaskSubmission.ai_analysis_result */
export interface AIAnalysisResult {
    status: AIAnalysisStatus;
    summary: string;
    score: number;
    checks: AIChecks;
    feedback: string[];
}

export interface TaskSubmission {
    id: string;
    task_id: string;
    submitted_by: string;
    content?: string;
    links?: string;           // JSON string
    file_paths?: string;      // JSON string
    watermarked_file_paths?: string; // JSON string (Public URLs)
    watermark_file_path?: string;    // Raw storage path (e.g. task-submissions/preview/...)
    submission_status: SubmissionStatus;
    brief_snapshot?: string;  // Brief content captured at submission time
    webhook_response?: string;      // Raw JSON from n8n
    ai_analysis_result?: string;    // Normalized JSON: AIAnalysisResult
    ai_score?: number;
    ai_feedback?: string;
    attempt_number: number;
    is_approved: boolean;
    reviewed_by?: string;
    created_at: string;
}

export interface TaskFeedback {
    id: string;
    task_id: string;
    submission_id?: string;
    sent_by: string;
    sent_to: string;
    message: string;
    is_revision_request: boolean;
    created_at: string;
}

// ── Activity ─────────────────────────────────────────────────────────────────

export interface ActivityLog {
    id: string;
    user_id: string;
    action: string;
    entity_type: string;
    entity_id?: string;
    details?: any;
    created_at: string;
}

// ── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
    | 'brief_submitted'
    | 'clarification_requested'
    | 'project_created'
    | 'task_assigned'
    | 'work_submitted'
    | 'task_late'
    | 'ai_score_low'
    | 'revision_requested'
    | 'content_ready'
    | 'project_paid'
    | 'general';

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    status: 'unread' | 'read' | 'archived';
    title: string;
    body?: string;
    project_id?: string;
    task_id?: string;
    brief_id?: string;
    created_at: string;
    read_at?: string;
}

// ── Dashboard ────────────────────────────────────────────────────────────────

/** What the DashboardViewModel exposes to the view */
export interface DashboardViewModel {
    user: CurrentUser | null;
    loading: boolean;
    projects: Project[];
    isClient: boolean;
    isManager: boolean;
    isEmployee: boolean;
    isAdmin: boolean;
    handleLogout: () => void;
}

