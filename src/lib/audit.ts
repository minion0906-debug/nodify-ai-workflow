import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import type { AuditAction, AuditLogEntry, UserRole } from "./types";

interface LogAuditParams {
  firestore: Firestore;
  action: AuditAction;
  performedBy: string;
  performedByRole: UserRole;
  targetUserId?: string;
  targetResourceId?: string;
  targetResourceType?: string;
  changes?: {
    before?: any;
    after?: any;
  };
  metadata?: Record<string, any>;
  severity?: "low" | "medium" | "high" | "critical";
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an action to the audit log
 * This should be called for all sensitive administrative actions
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  const {
    firestore,
    action,
    performedBy,
    performedByRole,
    targetUserId,
    targetResourceId,
    targetResourceType,
    changes,
    metadata,
    severity = "medium",
    ipAddress,
    userAgent,
  } = params;

  try {
    const auditLogsRef = collection(firestore, "audit_logs");

    const logEntry: Omit<AuditLogEntry, "id"> = {
      action,
      performedBy,
      performedByRole,
      targetUserId,
      targetResourceId,
      targetResourceType,
      timestamp: serverTimestamp() as any,
      changes,
      metadata,
      severity,
      ipAddress,
      userAgent,
    };

    await addDoc(auditLogsRef, logEntry);
  } catch (error) {
    console.error("Failed to log audit entry:", error);
    // Don't throw - audit logging should not break the main operation
  }
}

/**
 * Get severity level based on action
 */
export function getActionSeverity(action: AuditAction): "low" | "medium" | "high" | "critical" {
  // Critical actions
  if (
    action.includes("deleted") ||
    action.includes("banned") ||
    action === "user.role_changed" ||
    action === "permission.granted" ||
    action === "permission.revoked"
  ) {
    return "critical";
  }

  // High severity actions
  if (
    action.includes("suspended") ||
    action === "user.impersonated" ||
    action === "settings.updated" ||
    action.includes("refund")
  ) {
    return "high";
  }

  // Medium severity actions
  if (
    action.includes("updated") ||
    action.includes("created") ||
    action.includes("moderated")
  ) {
    return "medium";
  }

  // Low severity actions
  return "low";
}

/**
 * Helper to log user-related actions
 */
export async function logUserAction(
  firestore: Firestore,
  action: AuditAction,
  performedBy: string,
  performedByRole: UserRole,
  targetUserId: string,
  changes?: { before?: any; after?: any }
) {
  await logAudit({
    firestore,
    action,
    performedBy,
    performedByRole,
    targetUserId,
    changes,
    severity: getActionSeverity(action),
  });
}

/**
 * Helper to log workflow-related actions
 */
export async function logWorkflowAction(
  firestore: Firestore,
  action: AuditAction,
  performedBy: string,
  performedByRole: UserRole,
  workflowId: string,
  workflowOwnerId?: string
) {
  await logAudit({
    firestore,
    action,
    performedBy,
    performedByRole,
    targetResourceId: workflowId,
    targetResourceType: "workflow",
    targetUserId: workflowOwnerId,
    severity: getActionSeverity(action),
  });
}

/**
 * Helper to log system settings changes
 */
export async function logSettingsChange(
  firestore: Firestore,
  performedBy: string,
  performedByRole: UserRole,
  settingName: string,
  before: any,
  after: any
) {
  await logAudit({
    firestore,
    action: "settings.updated",
    performedBy,
    performedByRole,
    targetResourceId: settingName,
    targetResourceType: "setting",
    changes: { before, after },
    severity: "high",
  });
}
