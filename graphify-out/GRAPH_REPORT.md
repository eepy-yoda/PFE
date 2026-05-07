# Graph Report - .  (2026-05-07)

## Corpus Check
- 131 files · ~78,292 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1252 nodes · 2228 edges · 112 communities (74 shown, 38 thin omitted)
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 376 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Data Models & Schema Hub|Data Models & Schema Hub]]
- [[_COMMUNITY_Frontend API Layer|Frontend API Layer]]
- [[_COMMUNITY_Brief API & Types|Brief API & Types]]
- [[_COMMUNITY_Dashboard & Admin UI|Dashboard & Admin UI]]
- [[_COMMUNITY_Project Detail Page|Project Detail Page]]
- [[_COMMUNITY_Submission & Image Callbacks|Submission & Image Callbacks]]
- [[_COMMUNITY_Domain Enums & Status Types|Domain Enums & Status Types]]
- [[_COMMUNITY_Figma UI Components|Figma UI Components]]
- [[_COMMUNITY_User Management UI|User Management UI]]
- [[_COMMUNITY_AI Review Status|AI Review Status]]
- [[_COMMUNITY_Worker Task API|Worker Task API]]
- [[_COMMUNITY_Figma Design Plugin|Figma Design Plugin]]
- [[_COMMUNITY_Client Dashboard|Client Dashboard]]
- [[_COMMUNITY_Task Routes|Task Routes]]
- [[_COMMUNITY_File Upload & Submit Work|File Upload & Submit Work]]
- [[_COMMUNITY_My Tasks Page|My Tasks Page]]
- [[_COMMUNITY_Management Board & Logs|Management Board & Logs]]
- [[_COMMUNITY_Auth Token Refresh|Auth Token Refresh]]
- [[_COMMUNITY_Supabase JWT Auth|Supabase JWT Auth]]
- [[_COMMUNITY_Navbar & Utilities|Navbar & Utilities]]
- [[_COMMUNITY_Manager Dashboard Data|Manager Dashboard Data]]
- [[_COMMUNITY_Submission Webhook Service|Submission Webhook Service]]
- [[_COMMUNITY_Frontend API Concepts|Frontend API Concepts]]
- [[_COMMUNITY_Notification System|Notification System]]
- [[_COMMUNITY_Delivery & Email Services|Delivery & Email Services]]
- [[_COMMUNITY_Project Routes & Brief Conversion|Project Routes & Brief Conversion]]
- [[_COMMUNITY_Submission Upload API|Submission Upload API]]
- [[_COMMUNITY_Brief Review Manager Actions|Brief Review Manager Actions]]
- [[_COMMUNITY_Brief API & n8n Webhook|Brief API & n8n Webhook]]
- [[_COMMUNITY_App Shell & Layout|App Shell & Layout]]
- [[_COMMUNITY_Worker Projects Page|Worker Projects Page]]
- [[_COMMUNITY_Notification Center UI|Notification Center UI]]
- [[_COMMUNITY_Theme System|Theme System]]
- [[_COMMUNITY_Task Workspace|Task Workspace]]
- [[_COMMUNITY_Task Board Kanban|Task Board Kanban]]
- [[_COMMUNITY_Worker Management|Worker Management]]
- [[_COMMUNITY_Cross-Layer References|Cross-Layer References]]
- [[_COMMUNITY_RBAC Routes & Service|RBAC Routes & Service]]
- [[_COMMUNITY_Supabase Client & Auth Reset|Supabase Client & Auth Reset]]
- [[_COMMUNITY_User Profile Page|User Profile Page]]
- [[_COMMUNITY_User Models & Schemas|User Models & Schemas]]
- [[_COMMUNITY_Activity Logging|Activity Logging]]
- [[_COMMUNITY_Connection Testing|Connection Testing]]
- [[_COMMUNITY_FastAPI Auth Dependencies|FastAPI Auth Dependencies]]
- [[_COMMUNITY_Management Routes|Management Routes]]
- [[_COMMUNITY_Auth Routes|Auth Routes]]
- [[_COMMUNITY_User Admin Routes|User Admin Routes]]
- [[_COMMUNITY_Password Security|Password Security]]
- [[_COMMUNITY_Figma Screen Designs|Figma Screen Designs]]
- [[_COMMUNITY_RBAC Schemas|RBAC Schemas]]
- [[_COMMUNITY_Database Migrations|Database Migrations]]
- [[_COMMUNITY_Alembic Runner|Alembic Runner]]
- [[_COMMUNITY_App Startup & Lifespan|App Startup & Lifespan]]
- [[_COMMUNITY_Email Service|Email Service]]
- [[_COMMUNITY_Python Dependencies|Python Dependencies]]
- [[_COMMUNITY_Brief Resume Migration|Brief Resume Migration]]
- [[_COMMUNITY_Password Reset Migration|Password Reset Migration]]
- [[_COMMUNITY_Supabase Auth Migration|Supabase Auth Migration]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]
- [[_COMMUNITY_Utility Module|Utility Module]]

## God Nodes (most connected - your core abstractions)
1. `PaymentStatus` - 35 edges
2. `ManagerOverview` - 29 edges
3. `BriefActionRequest` - 28 edges
4. `ConvertProjectRequest` - 28 edges
5. `PartialDeliveryRequest` - 28 edges
6. `TaskStatus` - 21 edges
7. `SubmissionStatus` - 21 edges
8. `frame()` - 20 edges
9. `DeliveryState` - 20 edges
10. `frame()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `Figma Brief Review Page Screen` --semantically_similar_to--> `Project Routes (/projects)`  [INFERRED] [semantically similar]
  figma-design-plugin.js → backend/app/api/routes/projects.py
- `Figma Guided Brief Page Screen` --semantically_similar_to--> `Brief Routes (/brief)`  [INFERRED] [semantically similar]
  figma-design-plugin.js → backend/app/api/routes/brief.py
- `AI Brief Resume Feature` --conceptually_related_to--> `n8n Webhook Integration`  [INFERRED]
  frontend/src/views/pages/dashboard/BriefReview.tsx → CLAUDE.md
- `Auto-Refresh on Pending Submission` --conceptually_related_to--> `n8n Webhook Integration`  [INFERRED]
  frontend/src/views/pages/worker/AIReviewPage.tsx → CLAUDE.md
- `SubmitWorkModal Component` --conceptually_related_to--> `n8n Webhook Integration`  [INFERRED]
  frontend/src/components/SubmitWorkModal.tsx → CLAUDE.md

## Hyperedges (group relationships)
- **Brief Submission n8n Webhook Flow** — routes_brief, routes_brief_call_n8n, n8n_brief_webhook_pattern [EXTRACTED 0.95]
- **Supabase JWT Auth Chain** — api_deps_validate_supabase_token, api_deps_lookup_user, api_deps_get_current_user [EXTRACTED 1.00]
- **Submission Watermark and Delivery Chain** — routes_submissions, watermark_delivery_gating, routes_image_callbacks [INFERRED 0.85]
- **n8n Callback Context Resolution Flow** — model_workflowimagecallback, schema_imagecallbackread, schema_watermarkcallbackpayload [INFERRED 0.85]
- **Task Submission AI Review Data Flow** — model_tasksubmission, schema_submissionread, schema_webhookcallbackpayload [INFERRED 0.85]
- **RBAC User-Role-Permission Chain** — model_user, model_userroles, model_role, model_rolepermissions, model_permission [EXTRACTED 1.00]
- **Watermark Delivery Pipeline** — delivery_service_DeliveryService, image_callback_service_ImageCallbackService, storage_service_StorageService [INFERRED 0.95]
- **Submission AI Review Flow** — submission_service_SubmissionService, n8n_submission_review_webhook, notification_service_NotificationService [INFERRED 0.95]
- **Role-Based Dashboard Routing** — frontend_App, frontend_ProtectedRoute, frontend_ClientDashboard [EXTRACTED 0.95]
- **Submission Upload Pipeline** — components_SubmitWorkModal, api_submissions_submissionsApi, lib_supabaseClient_ts [EXTRACTED 0.95]
- **Auth Token Refresh Flow** — api_auth_axiosInstance, api_auth_tokenRefreshInterceptor, lib_supabaseClient_ts [EXTRACTED 0.95]
- **AI Review Display Chain** — types_index_AIAnalysisResult, types_index_TaskSubmission, components_AIAnalysisCard [INFERRED 0.90]
- **ViewModel Auth Pattern** — viewmodels_useLoginViewModel, viewmodels_useSignupViewModel, api_auth_authService [EXTRACTED 0.95]
- **RBAC Type Hierarchy** — types_index_CurrentUser, types_index_Role, types_index_Permission [EXTRACTED 1.00]
- **Management Board Tab System** — management_ManagementBoard, management_WorkerManagement, management_RoleManagement, management_TaskBoard [EXTRACTED 1.00]
- **Authentication Page Cluster** — pages_Login, pages_Signup, pages_ForgotPassword, pages_ResetPassword [INFERRED 0.90]
- **Guided Brief Creation Flow** — pages_ClientHome, pages_GuidedBrief, api_briefApi [EXTRACTED 0.95]
- **Worker Module Pages** — workerdashboard_component, mytaskspage_component, taskworkspace_component, aireviewpage_component, feedbackcenter_component, notificationcenter_component, workerprojectspage_component [EXTRACTED 0.95]
- **Role-Based Dashboard Components** — admindashboard_component, managerdashboard_component, clientdashboard_component, workerdashboard_component [EXTRACTED 1.00]
- **Brief Review and Assignment Flow** — briefreview_component, briefreview_airÃ©sumÃ©, briefreview_assignandconvert, concept_briefworkflow [EXTRACTED 0.95]

## Communities (112 total, 38 thin omitted)

### Community 0 - "Data Models & Schema Hub"
Cohesion: 0.06
Nodes (83): Base, BaseModel, Notification, NotificationStatus, NotificationType, BriefStatus, DeliveryState, PaymentStatus (+75 more)

### Community 1 - "Frontend API Layer"
Cohesion: 0.05
Nodes (63): authService, Axios API Instance (auth.ts), Token Refresh Interceptor, BriefField Interface, BriefResponse Interface, BriefSeed Interface, BriefStatusResponse Interface, Brief API Module (+55 more)

### Community 2 - "Brief API & Types"
Cohesion: 0.05
Nodes (54): autosaveBriefAnswer(), BriefField, BriefResponse, BriefSeed, BriefStatusResponse, getBriefStatus(), interruptBrief(), SavedAnswer (+46 more)

### Community 3 - "Dashboard & Admin UI"
Cohesion: 0.06
Nodes (53): AdminDashboard Component, CreateEmployeeModal, User Management Table, Auto-Refresh on Pending Submission, AIReviewPage Component, deleteBrief API function, managementService API Client, notificationsService API Client (+45 more)

### Community 4 - "Project Detail Page"
Cohesion: 0.04
Nodes (35): [clientDeliverableLoading, setClientDeliverableLoading], [clientDeliverableModal, setClientDeliverableModal], { data }, deepLinkHandled, deepTaskId, delivered, [detailFeedbacks, setDetailFeedbacks], [detailLoading, setDetailLoading] (+27 more)

### Community 5 - "Submission & Image Callbacks"
Cohesion: 0.07
Nodes (31): get_submission(), list_submissions(), Retrieve a single submission by ID.     Access control:     - Admin/Manager: all, Async callback from n8n after it finishes validating a work submission.      Sec, Async callback from n8n after it finishes watermarking the preview files.      S, Binary watermark callback — multipart/form-data variant.      n8n HTTP Request n, Binary watermark callback — raw binary body variant.      n8n HTTP Request node, Returns all submissions for a task, sorted newest-first.     Managers/admins see (+23 more)

### Community 6 - "Domain Enums & Status Types"
Cohesion: 0.07
Nodes (40): ActivityLog Model, BriefStatus Enum, DeliveryState Enum, Notification Model, NotificationStatus Enum, NotificationType Enum, PaymentStatus Enum, PaymentType Enum (+32 more)

### Community 7 - "Figma UI Components"
Cohesion: 0.37
Nodes (27): badge(), button(), card(), COLOR, create404Page(), createAdminDashboard(), createBriefReviewPage(), createClientDashboard() (+19 more)

### Community 8 - "User Management UI"
Cohesion: 0.08
Nodes (26): AdminUserCreate, AdminUserUpdate, usersService, [confirmPw, setConfirmPw], CreateModalProps, [error, setError], fetchAll, filteredUsers (+18 more)

### Community 9 - "AI Review Status"
Cohesion: 0.09
Nodes (22): badge, CHECK_BADGE, CHECK_LABELS, result, StatusConfig, AIAnalysisResult, AIAnalysisStatus, AIChecks (+14 more)

### Community 10 - "Worker Task API"
Cohesion: 0.08
Nodes (20): workerApi, [error, setError], load, [loading, setLoading], navigate, PRIORITY_COLORS, [refreshing, setRefreshing], StatCardProps (+12 more)

### Community 11 - "Figma Design Plugin"
Cohesion: 0.42
Nodes (26): badge(), button(), card(), COLOR, create404Page(), createAdminDashboard(), createBriefReviewPage(), createClientDashboard() (+18 more)

### Community 12 - "Client Dashboard"
Cohesion: 0.08
Nodes (20): deleteBrief(), activeProjects, briefStatusColor, confirmDelete(), [confirmTarget, setConfirmTarget], [deleteError, setDeleteError], [deleting, setDeleting], displayed (+12 more)

### Community 13 - "Task Routes"
Cohesion: 0.14
Nodes (21): create_task(), delete_task(), _employee_has_project_access(), get_late_tasks(), get_my_feedback(), get_submissions(), get_task(), get_task_activity() (+13 more)

### Community 14 - "File Upload & Submit Work"
Cohesion: 0.09
Nodes (17): ALLOWED_TYPES, [content,   setContent], [errorMsg,   setErrorMsg], FileEntry, [fileError, setFileError], fileInputRef, [files,     setFiles], handleFileChange() (+9 more)

### Community 15 - "My Tasks Page"
Cohesion: 0.09
Nodes (19): TaskStatus, dueToday, filtered, [loading, setLoading], navigate, overdue, PRIORITY_DOT, PRIORITY_OPTIONS (+11 more)

### Community 16 - "Management Board & Logs"
Cohesion: 0.12
Nodes (17): managementService, [loading, setLoading], [logs, setLogs], fetchData(), isAssigned, [loading, setLoading], [permissions, setPermissions], [roles, setRoles] (+9 more)

### Community 17 - "Auth Token Refresh"
Cohesion: 0.12
Nodes (11): authService, failedQueue, LoginResponse, refreshToken, token, ProtectedRouteProps, [email, setEmail], [loading, setLoading] (+3 more)

### Community 18 - "Supabase JWT Auth"
Cohesion: 0.16
Nodes (20): get_current_user(), get_current_user_optional(), _lookup_user(), Validate a Supabase JWT by calling Supabase's auth service.     Returns (user_id, Resolve a local User from a Supabase auth identity.      Primary lookup is by UU, _validate_supabase_token(), Password Hashing (bcrypt), FastAPI Application Entry Point (+12 more)

### Community 19 - "Navbar & Utilities"
Cohesion: 0.12
Nodes (13): [currentUser, setCurrentUser], handleLogout(), homePath, interval, [isNotificationOpen, setIsNotificationOpen], [mobileMenuOpen, setMobileMenuOpen], navigate, NavLink (+5 more)

### Community 20 - "Manager Dashboard Data"
Cohesion: 0.15
Nodes (13): BriefActionParams, DashboardAlertItem, ManagerDashboardData, projectsService, WorkerStat, WorkloadTaskItem, [dash, setDash], [loading, setLoading] (+5 more)

### Community 21 - "Submission Webhook Service"
Cohesion: 0.18
Nodes (15): apply_webhook_callback(), _apply_webhook_response(), _build_brief_snapshot(), create_submission(), _empty_checks(), _normalize_ai_result(), _normalize_legacy_response(), _parse_ai_webhook_response() (+7 more)

### Community 22 - "Frontend API Concepts"
Cohesion: 0.14
Nodes (18): Auth API Service, Brief API Module, Notifications API Service, Users API Service, Brief Session Persistence & Resume Flow, Notification Type to Route Resolution, Role-Based Dashboard Routing, Layout Component (+10 more)

### Community 23 - "Notification System"
Cohesion: 0.15
Nodes (11): api, notificationsService, currentUser, handleNotificationClick(), [loading, setLoading], navigate, NotificationDrawerProps, [notifications, setNotifications] (+3 more)

### Community 24 - "Delivery & Email Services"
Cohesion: 0.24
Nodes (17): DeliveryService, EmailService, ImageCallbackService, Drop Task Dependencies Migration, Notification Model, Project Model, Task Model, TaskSubmission Model (+9 more)

### Community 25 - "Project Routes & Brief Conversion"
Cohesion: 0.21
Nodes (12): brief_action(), convert_brief_to_project(), create_project(), delete_project(), deliver_partial_project(), generate_ai_resume(), get_manager_overview(), get_received_briefs() (+4 more)

### Community 26 - "Submission Upload API"
Cohesion: 0.14
Nodes (13): SubmissionCreatePayload, SubmissionCreateResponse, submissionsApi, Task, TaskSubmission, [error, setError], loadData, [loading, setLoading] (+5 more)

### Community 27 - "Brief Review Manager Actions"
Cohesion: 0.14
Nodes (13): [actionLoading, setActionLoading], [aiResume, setAiResume], [employees, setEmployees], [generatingResume, setGeneratingResume], handleAction(), handleAssignAndConvert(), { id }, [loading, setLoading] (+5 more)

### Community 28 - "Brief API & n8n Webhook"
Cohesion: 0.18
Nodes (12): Figma Guided Brief Page Screen, n8n Brief Webhook Integration Pattern, Brief Routes (/brief), autosave_brief_answer(), _call_n8n(), _is_complete(), _parse_n8n_response(), Persist a single answered field so progress survives a lost session. (+4 more)

### Community 29 - "App Shell & Layout"
Cohesion: 0.14
Nodes (7): LayoutProps, navigate, fadeIn, staggerContainer, Step, steps, container

### Community 30 - "Worker Projects Page"
Cohesion: 0.14
Nodes (12): WorkerProject, [error, setError], filtered, [loading, setLoading], navigate, overdue, [projects, setProjects], [search, setSearch] (+4 more)

### Community 31 - "Notification Center UI"
Cohesion: 0.18
Nodes (9): { dot, label }, [filter, setFilter], handleMarkRead(), handleNotificationClick(), loadData, [loading, setLoading], [markingAll, setMarkingAll], navigate (+1 more)

### Community 32 - "Theme System"
Cohesion: 0.18
Nodes (9): Theme, [theme, setTheme], ThemeContext, ThemeContextType, useTheme(), {
        formData,
        isLoading,
        error,
        showPassword,
        handleChange,
        handleSubmit,
        togglePasswordVisibility,
    }, { theme, toggleTheme }, {
        formData,
        isLoading,
        error,
        showPassword,
        isSuccess,
        handleChange,
        handleSubmit,
        togglePasswordVisibility,
    } (+1 more)

### Community 33 - "Task Workspace"
Cohesion: 0.15
Nodes (11): [activity, setActivity], [feedbacks, setFeedbacks], loadData, [loading, setLoading], navigate, [open, setOpen], STATUS_COLORS, [submissions, setSubmissions] (+3 more)

### Community 34 - "Task Board Kanban"
Cohesion: 0.15
Nodes (10): COLUMN_STATUS_MAP, COLUMN_TARGET_STATUS, [editing, setEditing], [error,   setError], [form, setForm], PRIORITY_COLORS, [saving,  setSaving], task (+2 more)

### Community 35 - "Worker Management"
Cohesion: 0.2
Nodes (11): fetchData(), filteredWorkers, [formData, setFormData], handleCreateWorker(), [isCreateModalOpen, setIsCreateModalOpen], [loading, setLoading], [roles, setRoles], [searchQuery, setSearchQuery] (+3 more)

### Community 36 - "Cross-Layer References"
Cohesion: 0.2
Nodes (12): Figma Design Plugin (JS), Figma Design Plugin (TS stub), AIReviewPage (Worker), AdminDashboard Page, App (React Router Root), ClientDashboard Page, GuidedBrief Page, ManagerDashboard Page (+4 more)

### Community 37 - "RBAC Routes & Service"
Cohesion: 0.2
Nodes (3): Permission, Role, RBACService

### Community 38 - "Supabase Client & Auth Reset"
Cohesion: 0.2
Nodes (7): supabase, [confirm, setConfirm], [loading, setLoading], [message, setMessage], navigate, [password, setPassword], [ready, setReady]

### Community 39 - "User Profile Page"
Cohesion: 0.18
Nodes (8): [formData, setFormData], [isSaving, setIsSaving], [isSavingPw, setIsSavingPw], [loading, setLoading], [message, setMessage], [pwData, setPwData], [pwMsg, setPwMsg], [user, setUser]

### Community 40 - "User Models & Schemas"
Cohesion: 0.33
Nodes (9): RoleRead, AdminUserCreate, AdminUserUpdate, PasswordChange, Used by admin to create employee accounts, Used by admin to change role or activate/deactivate, UserBase, UserCreate (+1 more)

### Community 41 - "Activity Logging"
Cohesion: 0.24
Nodes (5): ActivityLog, ActivityLogBase, ActivityLogCreate, ActivityLogRead, ActivityService

### Community 42 - "Connection Testing"
Cohesion: 0.2
Nodes (6): [isRunning, setIsRunning], TestCardProps, TestResult, [tests, setTests], TestState, [testUser]

### Community 43 - "FastAPI Auth Dependencies"
Cohesion: 0.27
Nodes (9): FastAPI Dependency Injection (Auth), AuthService, BaseSettings, Settings, User Model, StorageService (module), Supabase Client Module, Supabase Storage (+1 more)

### Community 45 - "Auth Routes"
Cohesion: 0.33
Nodes (6): ForgotPasswordRequest, LoginRequest, Token, TokenPayload, UserRead, AuthService

### Community 46 - "User Admin Routes"
Cohesion: 0.33
Nodes (5): admin_update_user(), create_employee(), deactivate_user(), list_users(), _require_admin()

### Community 47 - "Password Security"
Cohesion: 0.22
Nodes (4): get_password_hash(), change_password(), create_user(), UserService

### Community 48 - "Figma Screen Designs"
Cohesion: 0.25
Nodes (8): Figma Admin Dashboard Screen, AgencyFlow Figma Design Plugin, Figma Brief Review Page Screen, Figma Client Dashboard Screen, Figma Home Page Screen, Figma Manager Dashboard Screen, Figma Project Detail Page Screen, Figma Worker Dashboard Screen

### Community 49 - "RBAC Schemas"
Cohesion: 0.43
Nodes (6): PermissionBase, PermissionCreate, PermissionRead, RoleBase, RoleCreate, RoleUpdate

### Community 50 - "Database Migrations"
Cohesion: 0.29
Nodes (7): Alembic Migration Environment, Migration 001: Brief Resume Fields, Migration 002: Password Reset Tokens, Migration 003: Supabase Auth Migration, BriefStatus Enum, Inline Startup Migration Pattern, Startup DB Inline Migration Runner

### Community 51 - "Alembic Runner"
Cohesion: 0.33
Nodes (5): Alembic environment — connects to the database via the app's settings and uses, Run migrations in 'offline' mode (generates SQL without a live connection)., Run migrations in 'online' mode (requires a live DB connection)., run_migrations_offline(), run_migrations_online()

### Community 57 - "Python Dependencies"
Cohesion: 0.4
Nodes (5): backend/requirements.txt Python Dependencies, Alembic DB Migration Tool, FastAPI Framework, SQLAlchemy ORM, Supabase Python Client

### Community 62 - "Utility Module"
Cohesion: 0.5
Nodes (3): routes/image_callbacks.py ────────────────────────── Webhook endpoint for n8n im, Receive a processed image result from n8n.      Supports two modes:       1. Bin, receive_image_result()

### Community 63 - "Utility Module"
Cohesion: 0.5
Nodes (3): eslint, figmaPlugin, tseslint

### Community 64 - "Utility Module"
Cohesion: 0.67
Nodes (4): Frontend Public Assets Directory, Iconify Logos Icon Set, Vite Build Tool / Framework, Vite Logo SVG

### Community 65 - "Utility Module"
Cohesion: 0.67
Nodes (4): Frontend Static Assets, React Logo SVG, React.js Framework, Vite React Project Scaffold

### Community 67 - "Utility Module"
Cohesion: 0.67
Nodes (3): SQLAlchemy Engine (Supabase/SQLite), get_db Dependency, SessionLocal (DB Session Factory)

## Knowledge Gaps
- **479 isolated node(s):** `COLOR`, `Alembic environment — connects to the database via the app's settings and uses`, `Run migrations in 'offline' mode (generates SQL without a live connection).`, `Run migrations in 'online' mode (requires a live DB connection).`, `Add saved_answers column and interrupted brief status  Revision ID: 001 Revis` (+474 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ImageCallbackService` connect `Submission & Image Callbacks` to `Data Models & Schema Hub`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `TaskUpdate` connect `Data Models & Schema Hub` to `Task Routes`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `update_task()` connect `Task Routes` to `Data Models & Schema Hub`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Are the 33 inferred relationships involving `PaymentStatus` (e.g. with `BriefActionRequest` and `ConvertProjectRequest`) actually correct?**
  _`PaymentStatus` has 33 INFERRED edges - model-reasoned connections that need verification._
- **Are the 26 inferred relationships involving `ManagerOverview` (e.g. with `ProjectCreate` and `ProjectRead`) actually correct?**
  _`ManagerOverview` has 26 INFERRED edges - model-reasoned connections that need verification._
- **Are the 26 inferred relationships involving `BriefActionRequest` (e.g. with `ProjectCreate` and `ProjectRead`) actually correct?**
  _`BriefActionRequest` has 26 INFERRED edges - model-reasoned connections that need verification._
- **Are the 26 inferred relationships involving `ConvertProjectRequest` (e.g. with `ProjectCreate` and `ProjectRead`) actually correct?**
  _`ConvertProjectRequest` has 26 INFERRED edges - model-reasoned connections that need verification._