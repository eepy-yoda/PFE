// ── Auth ────────────────────────────────────────────────────────────────────

export type UserRole = 'manager' | 'client' | 'worker';

/** Shape of the user object stored in localStorage and returned by authService */
export interface CurrentUser {
    email: string;
    role: UserRole;
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


/** Shape of the user object stored in localStorage and returned by authService */
export interface CurrentUser {
    email: string;
    role: UserRole;
}

// ── Projects ─────────────────────────────────────────────────────────────────

export type ProjectStatus = 'active' | 'in_progress' | 'completed' | 'archived';

/** Shape of a project returned from the backend API */
export interface Project {
    id: string | number;
    name: string;
    status: ProjectStatus;
    created_at: string; // ISO date string from the backend
}

// ── Dashboard ────────────────────────────────────────────────────────────────

/** What the DashboardViewModel exposes to the view */
export interface DashboardViewModel {
    user: CurrentUser | null;
    loading: boolean;
    projects: Project[];
    isClient: boolean;
    isManager: boolean;
    handleLogout: () => void;
}
