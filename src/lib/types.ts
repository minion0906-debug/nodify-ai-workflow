
export type NodeTypeId =
  | "webhook"
  | "cron"
  | "httpRequest"
  | "code"
  | "setTransform"
  | "ifSwitch"
  | "merge"
  | "delayWait"
  | "dataStore";

export type NodeCategory = "trigger" | "logic" | "action" | "data" | "ai" | "other";

// Node shape in format "VxH" where V=vertical slots (top/bottom), H=horizontal slots (left/right)
// Special case: "circle" is equivalent to "1x1" but with circular appearance
export type NodeShape =
  | "circle" // Special: 1x1 with circular appearance
  | "1x1" | "1x2" | "1x3" | "1x4" | "1x5" | "1x6"
  | "2x1" | "2x2" | "2x3" | "2x4" | "2x5" | "2x6"
  | "3x1" | "3x2" | "3x3" | "3x4" | "3x5" | "3x6"
  | "4x1" | "4x2" | "4x3" | "4x4" | "4x5" | "4x6"
  | "5x1" | "5x2" | "5x3" | "5x4" | "5x5" | "5x6"
  | "6x1" | "6x2" | "6x3" | "6x4" | "6x5" | "6x6";

export type NodePort = {
  id: string;
  label: string;
  type?: string;
  position?: 'left' | 'right' | 'top' | 'bottom';
};

export type NodeProperty = {
  name: string;
  displayName: string;
  type: "string" | "number" | "boolean" | "options" | "collection" | "json" | "color" | "credentials" | "notice" | "separator" | "button" | "checkbox" | "radio" | "fixedCollection";
  default?: any;
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: { value: string; label: string }[];
  displayOptions?: {
    show?: Record<string, any[]>;
  };
  typeOptions?: {
    multipleValues?: boolean;
    fields?: NodeProperty[];
    collectionName?: string;
    credentialType?: string;
    [key: string]: any;
  };
  ui?: {
    component?: string;
    [key: string]: any;
  };
  validation?: {
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    [key: string]: any;
  };
};

export type NodeExecutionEnvironment = "backend" | "client" | "both";

export type NodeDefinition = {
  id: NodeTypeId;
  version: number;
  name: string;
  description: string;
  group: string;
  category: NodeCategory;
  shape: NodeShape;
  color: string;
  icon?: string; // Lucide icon name or custom icon URL
  customIcon?: string; // URL to custom uploaded icon
  n8nType?: string;
  inputs?: NodePort[];
  outputs?: NodePort[];
  properties: NodeProperty[];
  executionEnvironment?: NodeExecutionEnvironment;
  executionCode?: string;
  clientExecutionCode?: string;
  customFunctions?: Record<string, string>; // JSON de funciones personalizadas
  dynamicOutputs?: {
    enabled: boolean;
    sourceProperty: string; // Property name that contains the output definitions
    defaultOutput?: NodePort; // Default output if no dynamic outputs are defined
  };
};

export type NodeData = {
  isError: any;
  isCompleted: any;
  isExecuting: any;
  id: string;
  type: string;
  position: { x: number; y: number };
  config: Record<string, any>;
  description?: string;
  label?: string;
  onLongPress?: (id: string) => void;
  onAddNode?: (params: {sourceNodeId: string, sourceHandleId: string}) => void;
  parentId?: string;
};

export type Connection = {
  id: string;
  sourceNodeId: string;
  sourceHandle: string;
  targetNodeId: string;
  targetHandle: string;
};

export type Workflow = {
  id: string;
  name: string;
  description: string;
  nodes: NodeData[];
  connections: Connection[];
  lastRun?: string;
  status: "active" | "inactive" | "draft";
  folderId?: string | null;
  metadata?: Record<string, any> | undefined;
};

// Execution Types
export type ExecutionStatus = "success" | "error" | "running" | "waiting" | "cancelled";
export type ExecutionMode = "manual" | "webhook" | "schedule" | "test";

export type NodeExecution = {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  input: any;
  output: any;
  startedAt: Date | any; // any for Firestore Timestamp
  finishedAt: Date | any;
  duration: number; // milliseconds
  status: ExecutionStatus;
  error?: string;
  errorStack?: string;
};

export type WorkflowExecution = {
  id: string;
  ownerId: string;              // User ID who owns this execution
  workflowId: string;
  workflowName: string;
  status: ExecutionStatus;
  mode: ExecutionMode;
  startedAt: Date | any; // any for Firestore Timestamp
  finishedAt?: Date | any;
  duration?: number; // milliseconds
  nodeExecutions: Record<string, NodeExecution>;
  totalNodes: number;
  successfulNodes: number;
  failedNodes: number;
  waitingNodes: number;
  startNodeId?: string;
  error?: string;
  errorNodeId?: string;
};

// =============================================================================
// USER TYPES
// =============================================================================

// User Roles - System-wide roles for access control
export type UserRole =
  | "user"              // Regular user - can use the service
  | "moderator"         // Can moderate content, support users, manage community
  | "support"           // Can access support tickets and help users
  | "developer"         // Can access developer tools, API logs, and debug info
  | "admin"             // Full access to app settings and configuration
  | "super_admin";      // Highest level - can manage admins and critical settings

// System permissions - granular control over what users can do
export type SystemPermission =
  // User Management
  | "users.view"
  | "users.edit"
  | "users.delete"
  | "users.suspend"
  | "users.impersonate"

  // Content Moderation
  | "content.view"
  | "content.moderate"
  | "content.delete"
  | "content.feature"

  // Community Forum
  | "forum.moderate"
  | "forum.pin"
  | "forum.lock"
  | "forum.delete"
  | "forum.ban_users"

  // Support System
  | "support.view_tickets"
  | "support.respond"
  | "support.escalate"
  | "support.close"

  // Workflows & Nodes
  | "workflows.view_all"
  | "workflows.edit_any"
  | "workflows.delete_any"
  | "nodes.approve"
  | "nodes.feature"
  | "nodes.delete"

  // Analytics & Reports
  | "analytics.view"
  | "analytics.export"
  | "reports.generate"

  // System Configuration
  | "system.view_settings"
  | "system.edit_settings"
  | "system.manage_features"
  | "system.manage_integrations"

  // Billing & Subscriptions
  | "billing.view"
  | "billing.modify"
  | "billing.refund"

  // API & Development
  | "api.view_logs"
  | "api.manage_keys"
  | "developer.debug"

  // Security & Audit
  | "security.view_logs"
  | "security.manage_roles"
  | "audit.view"
  | "audit.export";

// Role-based permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, SystemPermission[]> = {
  user: [
    // Regular users have no system permissions
  ],

  support: [
    // Support can handle tickets and view user info
    "users.view",
    "support.view_tickets",
    "support.respond",
    "support.escalate",
    "support.close",
    "workflows.view_all",
    "analytics.view",
  ],

  moderator: [
    // Moderators can manage content and community
    "users.view",
    "users.suspend",
    "content.view",
    "content.moderate",
    "content.delete",
    "content.feature",
    "forum.moderate",
    "forum.pin",
    "forum.lock",
    "forum.delete",
    "forum.ban_users",
    "support.view_tickets",
    "support.respond",
    "workflows.view_all",
    "nodes.approve",
    "nodes.feature",
    "analytics.view",
  ],

  developer: [
    // Developers have technical access
    "users.view",
    "workflows.view_all",
    "nodes.approve",
    "analytics.view",
    "analytics.export",
    "api.view_logs",
    "api.manage_keys",
    "developer.debug",
    "system.view_settings",
    "security.view_logs",
    "audit.view",
  ],

  admin: [
    // Admins have almost full access
    "users.view",
    "users.edit",
    "users.suspend",
    "users.impersonate",
    "content.view",
    "content.moderate",
    "content.delete",
    "content.feature",
    "forum.moderate",
    "forum.pin",
    "forum.lock",
    "forum.delete",
    "forum.ban_users",
    "support.view_tickets",
    "support.respond",
    "support.escalate",
    "support.close",
    "workflows.view_all",
    "workflows.edit_any",
    "workflows.delete_any",
    "nodes.approve",
    "nodes.feature",
    "nodes.delete",
    "analytics.view",
    "analytics.export",
    "reports.generate",
    "system.view_settings",
    "system.edit_settings",
    "system.manage_features",
    "system.manage_integrations",
    "billing.view",
    "billing.modify",
    "billing.refund",
    "api.view_logs",
    "api.manage_keys",
    "developer.debug",
    "security.view_logs",
    "security.manage_roles",
    "audit.view",
    "audit.export",
  ],

  super_admin: [
    // Super admins have ALL permissions (including ability to delete other admins)
    "users.view",
    "users.edit",
    "users.delete",
    "users.suspend",
    "users.impersonate",
    "content.view",
    "content.moderate",
    "content.delete",
    "content.feature",
    "forum.moderate",
    "forum.pin",
    "forum.lock",
    "forum.delete",
    "forum.ban_users",
    "support.view_tickets",
    "support.respond",
    "support.escalate",
    "support.close",
    "workflows.view_all",
    "workflows.edit_any",
    "workflows.delete_any",
    "nodes.approve",
    "nodes.feature",
    "nodes.delete",
    "analytics.view",
    "analytics.export",
    "reports.generate",
    "system.view_settings",
    "system.edit_settings",
    "system.manage_features",
    "system.manage_integrations",
    "billing.view",
    "billing.modify",
    "billing.refund",
    "api.view_logs",
    "api.manage_keys",
    "developer.debug",
    "security.view_logs",
    "security.manage_roles",
    "audit.view",
    "audit.export",
  ],
};

// Staff member information (for admin panel)
export type StaffMember = {
  userId: string;
  role: UserRole;
  displayName: string;
  email: string;
  photoURL?: string;
  department?: "support" | "moderation" | "engineering" | "operations" | "management";
  title?: string;
  assignedAt: Date | any;
  assignedBy: string; // User ID of who assigned this role
  customPermissions?: SystemPermission[]; // Additional permissions beyond role
  notes?: string; // Internal notes about this staff member
  isActive: boolean;
  lastActive?: Date | any;
};

// User account status
export type UserAccountStatus =
  | "active"          // Normal, active account
  | "suspended"       // Temporarily suspended by moderator
  | "banned"          // Permanently banned
  | "pending_verification" // Email not verified yet
  | "deleted";        // Soft deleted, can be recovered

// Suspension information
export type UserSuspension = {
  suspendedAt: Date | any;
  suspendedBy: string; // Staff user ID
  suspendedUntil?: Date | any; // If temporary
  reason: string;
  internalNotes?: string; // Private notes for staff
  appealStatus?: "pending" | "approved" | "denied";
  appealMessage?: string;
};

// Subscription Plans
export type SubscriptionPlan = "free" | "pro" | "enterprise";

export type SubscriptionStatus =
  | "active"       // Subscription is currently active
  | "inactive"     // Subscription has been cancelled or expired
  | "trialing"     // In trial period
  | "past_due"     // Payment failed but still has access
  | "cancelled"    // Cancelled, will expire at period end
  | "paused";      // Temporarily paused

export type BillingInterval = "monthly" | "yearly";

// Subscription limits and features
export type SubscriptionLimits = {
  maxWorkflows: number;           // Maximum workflows user can create
  maxNodesPerWorkflow: number;    // Maximum nodes per workflow
  maxExecutionsPerMonth: number;  // Monthly execution quota
  maxCustomNodes: number;         // Maximum custom nodes user can create
  maxApiCalls: number;           // API calls per month
  maxStorage: number;            // Storage in MB for files/assets
  maxTeamMembers: number;        // Team members (for enterprise)
  canUseAI: boolean;            // Access to AI features
  canUseAdvancedNodes: boolean; // Access to premium nodes
  canUseScheduler: boolean;     // Access to cron/scheduler
  canUseWebhooks: boolean;      // Access to webhooks
  prioritySupport: boolean;     // Priority customer support
  customBranding: boolean;      // Remove "Powered by Nodify"
};

// User subscription information
export type UserSubscription = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billingInterval?: BillingInterval;
  currentPeriodStart?: Date | any; // Firestore Timestamp
  currentPeriodEnd?: Date | any;   // Firestore Timestamp
  cancelAt?: Date | any;           // Scheduled cancellation date
  canceledAt?: Date | any;         // When it was cancelled
  trialStart?: Date | any;
  trialEnd?: Date | any;
  stripeCustomerId?: string;       // Stripe customer ID
  stripeSubscriptionId?: string;   // Stripe subscription ID
  stripePriceId?: string;          // Stripe price ID
  limits: SubscriptionLimits;
};

// Usage statistics for tracking limits
export type UserUsage = {
  workflowCount: number;            // Total workflows created
  executionsThisMonth: number;      // Executions in current billing period
  apiCallsThisMonth: number;        // API calls in current billing period
  storageUsed: number;              // Storage used in MB
  customNodesCreated: number;       // Custom nodes created
  lastResetDate: Date | any;        // When usage was last reset
};

// User profile information
export type UserProfile = {
  displayName?: string;
  email: string;
  photoURL?: string;
  phoneNumber?: string;
  company?: string;
  jobTitle?: string;
  bio?: string;
  website?: string;
  location?: string;
  timezone?: string;
  language?: string; // Preferred language (en, es, etc.)
};

// User preferences and settings
export type UserPreferences = {
  theme?: "light" | "dark" | "system";
  emailNotifications: boolean;
  workflowNotifications: boolean;
  errorNotifications: boolean;
  weeklyReport: boolean;
  marketingEmails: boolean;
  defaultWorkflowStatus: "active" | "inactive" | "draft";
  autoSaveInterval: number; // seconds
  showTutorials: boolean;
  compactMode: boolean;
};

// Custom node created by user
export type CustomNodeDefinition = NodeDefinition & {
  createdBy: string;            // User ID
  createdAt: Date | any;        // Firestore Timestamp
  updatedAt: Date | any;
  isPublic: boolean;           // If true, other users can install it
  downloads: number;           // Times installed by other users
  tags: string[];              // Searchable tags
  version: number;             // Version number
  changeLog?: string;          // Version change notes
};

// Installed custom node (from marketplace)
export type InstalledNode = {
  nodeId: string;              // Reference to custom node ID
  nodeDefinitionId: string;    // The node type ID
  installedAt: Date | any;
  installedFrom: string;       // User ID who created it
  version: number;             // Installed version
  autoUpdate: boolean;         // Auto-update to latest version
};

// Credential information (already exists in Firestore, adding type)
export type UserCredential = {
  id: string;
  name: string;
  type: string;                // credential type (google, stripe, openai, etc.)
  data: Record<string, any>;   // Encrypted credential data
  createdAt: Date | any;
  updatedAt: Date | any;
  lastUsed?: Date | any;
  usageCount: number;
};

// Custom table (already exists, adding type)
export type UserTable = {
  id: string;
  name: string;
  description?: string;
  schema: {
    columns: Array<{
      id: string;
      name: string;
      type: "string" | "number" | "boolean" | "date" | "json";
      required: boolean;
      unique: boolean;
      default?: any;
    }>;
  };
  data: Array<Record<string, any>>;
  createdAt: Date | any;
  updatedAt: Date | any;
  rowCount: number;
};

// Notification
export type UserNotification = {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  read: boolean;
  createdAt: Date | any;
  actionUrl?: string;         // Optional link to related resource
  actionLabel?: string;       // Label for action button
  workflowId?: string;        // Related workflow
  executionId?: string;       // Related execution
};

// Workflow folder for organization
export type WorkflowFolder = {
  id: string;
  name: string;
  description?: string;
  color?: string;             // Hex color for visual organization
  icon?: string;              // Lucide icon name
  parentId?: string | null;   // For nested folders
  createdAt: Date | any;
  updatedAt: Date | any;
  workflowCount: number;      // Cached count
};

// Team member (for enterprise plans)
export type TeamMember = {
  id: string;
  userId: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: "owner" | "admin" | "editor" | "viewer";
  permissions: {
    canCreateWorkflows: boolean;
    canEditWorkflows: boolean;
    canDeleteWorkflows: boolean;
    canManageCredentials: boolean;
    canManageTeam: boolean;
    canManageBilling: boolean;
  };
  invitedAt: Date | any;
  joinedAt?: Date | any;
  lastActive?: Date | any;
  status: "pending" | "active" | "inactive";
};

// Main User document
export type User = {
  uid: string;                      // Firebase Auth UID
  profile: UserProfile;
  subscription: UserSubscription;
  usage: UserUsage;
  preferences: UserPreferences;

  // Role & Permissions
  role: UserRole;                   // System role (user, moderator, admin, etc.)
  accountStatus: UserAccountStatus; // Account status (active, suspended, etc.)
  suspension?: UserSuspension;      // If suspended/banned, contains details

  // Timestamps
  createdAt: Date | any;            // Firestore Timestamp
  updatedAt: Date | any;
  lastLoginAt: Date | any;
  emailVerifiedAt?: Date | any;

  // Counters (for quick access without queries)
  stats: {
    totalWorkflows: number;
    activeWorkflows: number;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    totalCustomNodes: number;
    totalCredentials: number;
    totalTables: number;
  };

  // Feature flags (for A/B testing or gradual rollouts)
  featureFlags?: Record<string, boolean>;

  // Onboarding progress
  onboarding?: {
    completed: boolean;
    currentStep: number;
    stepsCompleted: string[];
    skipped: boolean;
  };

  // Staff-specific fields (only if role is not 'user')
  staffInfo?: {
    department?: "support" | "moderation" | "engineering" | "operations" | "management";
    title?: string;
    assignedAt: Date | any;
    assignedBy: string; // User ID of who assigned this role
    customPermissions?: SystemPermission[]; // Additional permissions beyond role
    internalNotes?: string; // Private notes about this staff member
  };
};

// Default limits for each plan
export const DEFAULT_SUBSCRIPTION_LIMITS: Record<SubscriptionPlan, SubscriptionLimits> = {
  free: {
    maxWorkflows: 3,
    maxNodesPerWorkflow: 10,
    maxExecutionsPerMonth: 100,
    maxCustomNodes: 0,
    maxApiCalls: 1000,
    maxStorage: 100, // 100 MB
    maxTeamMembers: 1,
    canUseAI: false,
    canUseAdvancedNodes: false,
    canUseScheduler: false,
    canUseWebhooks: true,
    prioritySupport: false,
    customBranding: false,
  },
  pro: {
    maxWorkflows: 50,
    maxNodesPerWorkflow: 100,
    maxExecutionsPerMonth: 10000,
    maxCustomNodes: 25,
    maxApiCalls: 100000,
    maxStorage: 5000, // 5 GB
    maxTeamMembers: 1,
    canUseAI: true,
    canUseAdvancedNodes: true,
    canUseScheduler: true,
    canUseWebhooks: true,
    prioritySupport: true,
    customBranding: false,
  },
  enterprise: {
    maxWorkflows: -1, // Unlimited
    maxNodesPerWorkflow: -1,
    maxExecutionsPerMonth: -1,
    maxCustomNodes: -1,
    maxApiCalls: -1,
    maxStorage: -1,
    maxTeamMembers: -1,
    canUseAI: true,
    canUseAdvancedNodes: true,
    canUseScheduler: true,
    canUseWebhooks: true,
    prioritySupport: true,
    customBranding: true,
  },
};

// Helper type for Firestore collections structure
export type UserCollections = {
  workflows: Workflow;
  credentials: UserCredential;
  tables: UserTable;
  notifications: UserNotification;
  folders: WorkflowFolder;
  customNodes: CustomNodeDefinition;
  installedNodes: InstalledNode;
  executions: WorkflowExecution;
  teamMembers?: TeamMember; // Only for enterprise
};

// =============================================================================
// AUDIT & LOGGING TYPES (for admin panel)
// =============================================================================

export type AuditAction =
  | "user.created"
  | "user.updated"
  | "user.deleted"
  | "user.suspended"
  | "user.banned"
  | "user.role_changed"
  | "user.impersonated"
  | "workflow.created"
  | "workflow.updated"
  | "workflow.deleted"
  | "workflow.executed"
  | "node.created"
  | "node.approved"
  | "node.deleted"
  | "settings.updated"
  | "permission.granted"
  | "permission.revoked"
  | "billing.subscription_created"
  | "billing.subscription_updated"
  | "billing.subscription_cancelled"
  | "billing.refund_issued"
  | "support.ticket_created"
  | "support.ticket_responded"
  | "support.ticket_closed"
  | "content.moderated"
  | "content.deleted"
  | "forum.post_deleted"
  | "forum.user_banned";

export type AuditLogEntry = {
  id: string;
  action: AuditAction;
  performedBy: string;         // User ID who performed the action
  performedByRole: UserRole;   // Role at the time of action
  targetUserId?: string;       // User affected by the action
  targetResourceId?: string;   // ID of resource (workflow, node, etc.)
  targetResourceType?: string; // Type of resource
  timestamp: Date | any;
  ipAddress?: string;
  userAgent?: string;
  changes?: {                  // What changed (before/after)
    before?: any;
    after?: any;
  };
  metadata?: Record<string, any>; // Additional context
  severity: "low" | "medium" | "high" | "critical";
};

// =============================================================================
// PERMISSION HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a user has a specific permission
 */
export function hasPermission(user: User, permission: SystemPermission): boolean {
  // Get role-based permissions
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];

  // Check if permission is in role permissions
  if (rolePermissions.includes(permission)) {
    return true;
  }

  // Check custom permissions (if staff member)
  if (user.staffInfo?.customPermissions?.includes(permission)) {
    return true;
  }

  return false;
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(user: User, permissions: SystemPermission[]): boolean {
  return permissions.some(permission => hasPermission(user, permission));
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(user: User, permissions: SystemPermission[]): boolean {
  return permissions.every(permission => hasPermission(user, permission));
}

/**
 * Check if user is staff (has any role other than 'user')
 */
export function isStaff(user: User): boolean {
  return user.role !== "user";
}

/**
 * Check if user can access admin panel
 */
export function canAccessAdminPanel(user: User): boolean {
  return ["moderator", "support", "developer", "admin", "super_admin"].includes(user.role);
}

/**
 * Get all permissions for a user (role + custom)
 */
export function getUserPermissions(user: User): SystemPermission[] {
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  const customPermissions = user.staffInfo?.customPermissions || [];

  // Combine and deduplicate
  return Array.from(new Set([...rolePermissions, ...customPermissions]));
}

// =============================================================================
// SUPPORT SYSTEM TYPES (for admin panel)
// =============================================================================

export type SupportTicketStatus =
  | "open"
  | "in_progress"
  | "waiting_user"
  | "resolved"
  | "closed";

export type SupportTicketPriority = "low" | "medium" | "high" | "urgent";

export type SupportTicketCategory =
  | "technical"
  | "billing"
  | "account"
  | "feature_request"
  | "bug_report"
  | "other";

export type SupportTicket = {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  description: string;
  assignedTo?: string; // Staff user ID
  createdAt: Date | any;
  updatedAt: Date | any;
  closedAt?: Date | any;
  firstResponseAt?: Date | any;
  resolvedAt?: Date | any;
  tags: string[];
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    size: number;
    mimeType: string;
  }>;
  relatedWorkflowId?: string;
  relatedExecutionId?: string;
  satisfaction?: {
    rating: 1 | 2 | 3 | 4 | 5;
    feedback?: string;
    submittedAt: Date | any;
  };
};

export type SupportTicketMessage = {
  id: string;
  ticketId: string;
  senderId: string;
  senderRole: UserRole;
  senderName: string;
  message: string;
  isInternal: boolean; // If true, only visible to staff
  createdAt: Date | any;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    size: number;
    mimeType: string;
  }>;
};
    
