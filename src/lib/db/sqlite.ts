/**
 * SQLite Database for Nodify
 * Self-hosted alternative to Firestore for webhook management
 *
 * WARNING: This module uses Node.js-only APIs and must only be imported server-side
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'nodify.db');
export const db = new Database(dbPath);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

// Disable foreign keys to avoid issues (we'll handle referential integrity in code)
db.pragma('foreign_keys = OFF');

const LATEST_SCHEMA_VERSION = 4;

/**
 * Initialize and migrate database schema
 */
export function initializeDatabase() {
  const currentVersion = db.pragma('user_version', { simple: true }) as number;

  if (currentVersion < 1) {
    console.log('[SQLite] Initializing database schema from scratch...');
    db.exec(`
      -- Webhook Registry: Global index for fast webhook lookups
      CREATE TABLE IF NOT EXISTS webhook_registry (
        webhook_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        workflow_id TEXT NOT NULL,
        method TEXT NOT NULL DEFAULT 'POST',
        status TEXT NOT NULL DEFAULT 'draft',
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );

      -- Index for fast lookups
      CREATE INDEX IF NOT EXISTS idx_webhook_lookup
      ON webhook_registry(webhook_id, method, status);

      -- Webhook Calls: Log all incoming webhook requests
      CREATE TABLE IF NOT EXISTS webhook_calls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        webhook_id TEXT NOT NULL,
        mode TEXT NOT NULL,
        method TEXT NOT NULL,
        body TEXT,
        query TEXT,
        headers TEXT,
        path TEXT,
        workflow_status TEXT,
        timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );

      -- Index for recent calls by webhook
      CREATE INDEX IF NOT EXISTS idx_webhook_calls_webhook
      ON webhook_calls(webhook_id, timestamp DESC);

      -- Workflow Executions: Track workflow runs
      CREATE TABLE IF NOT EXISTS workflow_executions (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        webhook_id TEXT,
        mode TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'running',
        trigger TEXT NOT NULL,
        webhook_data TEXT,
        result TEXT,
        error TEXT,
        started_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        completed_at INTEGER
      );

      -- Index for recent executions by workflow
      CREATE INDEX IF NOT EXISTS idx_executions_workflow
      ON workflow_executions(workflow_id, started_at DESC);

      -- Index for executions by user
      CREATE INDEX IF NOT EXISTS idx_executions_user
      ON workflow_executions(user_id, started_at DESC);

      -- Execution Events: Real-time events for workflow execution (for test mode visualization)
      CREATE TABLE IF NOT EXISTS execution_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        execution_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        node_id TEXT,
        edge_id TEXT,
        data TEXT,
        timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );

      -- Index for getting events by execution
      CREATE INDEX IF NOT EXISTS idx_execution_events
      ON execution_events(execution_id, timestamp ASC);

      -- Form Registry: Global index for fast form lookups
      CREATE TABLE IF NOT EXISTS form_registry (
        form_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        workflow_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );

      -- Index for fast lookups
      CREATE INDEX IF NOT EXISTS idx_form_lookup
      ON form_registry(form_id, status);

      -- Form Calls: Log all incoming form submissions
      CREATE TABLE IF NOT EXISTS form_calls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        form_id TEXT NOT NULL,
        body TEXT,
        timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );

      -- Index for recent calls by form
      CREATE INDEX IF NOT EXISTS idx_form_calls_form
      ON form_calls(form_id, timestamp DESC);
    `);
    db.pragma(`user_version = 1`);
    console.log('[SQLite] Database schema initialized to version 1.');
  }

  if (currentVersion < 2) {
    console.log('[SQLite] Migrating database schema to version 2...');
    try {
        db.exec(`ALTER TABLE form_calls ADD COLUMN files TEXT;`);
    } catch (error) {
        // Ignore error if column already exists
        if (!error.message.includes('duplicate column name')) {
            throw error;
        }
    }
    db.pragma(`user_version = 2`);
    console.log('[SQLite] Database schema migrated to version 2.');
  }

  if (currentVersion < 3) {
    console.log('[SQLite] Migrating database schema to version 3 (Chat support)...');
    db.exec(`
      -- Chat Registry: Global index for fast chat lookups
      CREATE TABLE IF NOT EXISTS chat_registry (
        chat_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        workflow_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );

      -- Index for fast lookups
      CREATE INDEX IF NOT EXISTS idx_chat_lookup
      ON chat_registry(chat_id, status);

      -- Chat Messages: Store conversation history
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        mode TEXT NOT NULL,
        execution_id TEXT,
        metadata TEXT,
        files TEXT,
        timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );

      -- Index for getting messages by chat and session
      CREATE INDEX IF NOT EXISTS idx_chat_messages_session
      ON chat_messages(chat_id, session_id, timestamp ASC);

      -- Index for getting messages by chat
      CREATE INDEX IF NOT EXISTS idx_chat_messages_chat
      ON chat_messages(chat_id, timestamp DESC);
    `);
    db.pragma(`user_version = 3`);
    console.log('[SQLite] Database schema migrated to version 3.');
  }

  if (currentVersion < 4) {
    console.log('[SQLite] Migrating database schema to version 4 (WhatsApp triggers)...');
    db.exec(`
      -- WhatsApp Registry: Map whatsappId to workflow
      CREATE TABLE IF NOT EXISTS whatsapp_registry (
        whatsapp_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        workflow_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        verify_token TEXT,
        app_secret TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );

      CREATE INDEX IF NOT EXISTS idx_whatsapp_lookup
      ON whatsapp_registry(whatsapp_id, status);

      -- WhatsApp Calls: Log incoming webhook calls
      CREATE TABLE IF NOT EXISTS whatsapp_calls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        whatsapp_id TEXT NOT NULL,
        mode TEXT NOT NULL,
        body TEXT,
        query TEXT,
        headers TEXT,
        path TEXT,
        timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );

      CREATE INDEX IF NOT EXISTS idx_whatsapp_calls_id
      ON whatsapp_calls(whatsapp_id, timestamp DESC);
    `);
    db.pragma(`user_version = 4`);
    console.log('[SQLite] Database schema migrated to version 4.');
  }

  console.log(`[SQLite] Database schema is at version ${db.pragma('user_version', { simple: true })}.`);
}

/**
 * Webhook Registry Operations
 */
export const webhookRegistry = {
  /**
   * Register or update a webhook
   */
  upsert: (webhookId: string, data: {
    userId: string;
    workflowId: string;
    method: string;
    status: string;
  }) => {
    const stmt = db.prepare(`
      INSERT INTO webhook_registry (webhook_id, user_id, workflow_id, method, status, updated_at)
      VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
      ON CONFLICT(webhook_id) DO UPDATE SET
        user_id = excluded.user_id,
        workflow_id = excluded.workflow_id,
        method = excluded.method,
        status = excluded.status,
        updated_at = excluded.updated_at
    `);

    return stmt.run(webhookId, data.userId, data.workflowId, data.method, data.status);
  },

  /**
   * Get webhook by ID (O(1) lookup)
   */
  getById: (webhookId: string) => {
    const stmt = db.prepare(`
      SELECT * FROM webhook_registry
      WHERE webhook_id = ?
      LIMIT 1
    `);

    return stmt.get(webhookId) as {
      webhook_id: string;
      user_id: string;
      workflow_id: string;
      method: string;
      status: string;
      created_at: number;
      updated_at: number;
    } | undefined;
  },

  /**
   * Get all webhooks for a user
   */
  getByUserId: (userId: string) => {
    const stmt = db.prepare(`
      SELECT * FROM webhook_registry
      WHERE user_id = ?
      ORDER BY created_at DESC
    `);

    return stmt.all(userId);
  },

  /**
   * Delete webhook
   */
  delete: (webhookId: string) => {
    const stmt = db.prepare('DELETE FROM webhook_registry WHERE webhook_id = ?');
    return stmt.run(webhookId);
  }
};

/**
 * Form Registry Operations
 */
export const formRegistry = {
  /**
   * Register or update a form
   */
  upsert: (formId: string, data: {
    userId: string;
    workflowId: string;
    status: string;
  }) => {
    const stmt = db.prepare(`
      INSERT INTO form_registry (form_id, user_id, workflow_id, status, updated_at)
      VALUES (?, ?, ?, ?, strftime('%s', 'now'))
      ON CONFLICT(form_id) DO UPDATE SET
        user_id = excluded.user_id,
        workflow_id = excluded.workflow_id,
        status = excluded.status,
        updated_at = excluded.updated_at
    `);

    return stmt.run(formId, data.userId, data.workflowId, data.status);
  },

  /**
   * Get form by ID (O(1) lookup)
   */
  getById: (formId: string) => {
    const stmt = db.prepare(`
      SELECT * FROM form_registry
      WHERE form_id = ?
      LIMIT 1
    `);

    return stmt.get(formId) as {
      form_id: string;
      user_id: string;
      workflow_id: string;
      status: string;
      created_at: number;
      updated_at: number;
    } | undefined;
  },

  /**
   * Delete form
   */
  delete: (formId: string) => {
    const stmt = db.prepare('DELETE FROM form_registry WHERE form_id = ?');
    return stmt.run(formId);
  }
};

/**
 * Webhook Calls Operations
 */
export const webhookCalls = {
  /**
   * Log a webhook call
   */
  create: (data: {
    webhookId: string;
    mode: 'test' | 'production';
    method: string;
    body: any;
    query: Record<string, string>;
    headers: Record<string, string>;
    path: string;
    workflowStatus: string;
  }) => {
    const stmt = db.prepare(`
      INSERT INTO webhook_calls
      (webhook_id, mode, method, body, query, headers, path, workflow_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      data.webhookId,
      data.mode,
      data.method,
      JSON.stringify(data.body),
      JSON.stringify(data.query),
      JSON.stringify(data.headers),
      data.path,
      data.workflowStatus
    );
  },

  /**
   * Get recent calls for a webhook
   */
  getByWebhookId: (webhookId: string, limit = 50) => {
    const stmt = db.prepare(`
      SELECT * FROM webhook_calls
      WHERE webhook_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(webhookId, limit) as any[];

    // Parse JSON fields
    return rows.map(row => ({
      ...row,
      body: JSON.parse(row.body || 'null'),
      query: JSON.parse(row.query || '{}'),
      headers: JSON.parse(row.headers || '{}')
    }));
  }
};

/**
 * Form Calls Operations
 */
export const formCalls = {
  /**
   * Log a form call
   */
  create: (data: {
    formId: string;
    body: any;
    files?: any;
  }) => {
    const stmt = db.prepare(`
      INSERT INTO form_calls
      (form_id, body, files)
      VALUES (?, ?, ?)
    `);

    return stmt.run(
      data.formId,
      JSON.stringify(data.body),
      data.files ? JSON.stringify(data.files) : null
    );
  },

  /**
   * Get recent calls for a form
   */
  getByFormId: (formId: string, limit = 50) => {
    const stmt = db.prepare(`
      SELECT * FROM form_calls
      WHERE form_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(formId, limit) as any[];

    // Parse JSON fields
    return rows.map(row => ({
      ...row,
      body: JSON.parse(row.body || 'null'),
      files: JSON.parse(row.files || 'null'),
    }));
  },

  /**
   * Delete a specific form call
   */
  delete: (callId: number) => {
    const stmt = db.prepare('DELETE FROM form_calls WHERE id = ?');
    return stmt.run(callId);
  }
};

/**
 * Workflow Executions Operations
 */
export const workflowExecutions = {
  /**
   * Create a new execution
   */
  create: (data: {
    id: string;
    workflowId: string;
    userId: string;
    webhookId?: string;
    mode: 'test' | 'production';
    trigger: 'webhook' | 'manual' | 'schedule' | 'form_submit' | 'whatsapp';
    webhookData?: any;
  }) => {
    const stmt = db.prepare(`
      INSERT INTO workflow_executions
      (id, workflow_id, user_id, webhook_id, mode, trigger, webhook_data)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      data.id,
      data.workflowId,
      data.userId,
      data.webhookId || null,
      data.mode,
      data.trigger,
      data.webhookData ? JSON.stringify(data.webhookData) : null
    );
  },

  /**
   * Update execution status
   */
  updateStatus: (id: string, status: 'completed' | 'failed', result?: any, error?: string) => {
    const stmt = db.prepare(`
      UPDATE workflow_executions
      SET status = ?,
          result = ?,
          error = ?,
          completed_at = strftime('%s', 'now')
      WHERE id = ?
    `);

    return stmt.run(
      status,
      result ? JSON.stringify(result) : null,
      error || null,
      id
    );
  },

  /**
   * Get execution by ID
   */
  getById: (id: string) => {
    const stmt = db.prepare('SELECT * FROM workflow_executions WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return {
      ...row,
      webhook_data: JSON.parse(row.webhook_data || 'null'),
      result: JSON.parse(row.result || 'null')
    };
  },

  /**
   * Get recent executions for a workflow
   */
  getByWorkflowId: (workflowId: string, limit = 50) => {
    const stmt = db.prepare(`
      SELECT * FROM workflow_executions
      WHERE workflow_id = ?
      ORDER BY started_at DESC
      LIMIT ?
    `);

    return stmt.all(workflowId, limit);
  }
};

/**
 * WhatsApp Registry Operations
 */
export const whatsappRegistry = {
  upsert: (
    whatsappId: string,
    data: {
      userId: string;
      workflowId: string;
      status: string;
      verifyToken?: string;
      appSecret?: string;
    }
  ) => {
    const stmt = db.prepare(`
      INSERT INTO whatsapp_registry (whatsapp_id, user_id, workflow_id, status, verify_token, app_secret, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
      ON CONFLICT(whatsapp_id) DO UPDATE SET
        user_id = excluded.user_id,
        workflow_id = excluded.workflow_id,
        status = excluded.status,
        verify_token = excluded.verify_token,
        app_secret = excluded.app_secret,
        updated_at = excluded.updated_at
    `);
    return stmt.run(
      whatsappId,
      data.userId,
      data.workflowId,
      data.status || 'draft',
      data.verifyToken || null,
      data.appSecret || null
    );
  },

  getById: (whatsappId: string) => {
    const stmt = db.prepare(
      `SELECT * FROM whatsapp_registry WHERE whatsapp_id = ? LIMIT 1`
    );
    return stmt.get(whatsappId) as
      | {
          whatsapp_id: string;
          user_id: string;
          workflow_id: string;
          status: string;
          verify_token?: string | null;
          app_secret?: string | null;
          created_at: number;
          updated_at: number;
        }
      | undefined;
  },

  delete: (whatsappId: string) => {
    const stmt = db.prepare('DELETE FROM whatsapp_registry WHERE whatsapp_id = ?');
    return stmt.run(whatsappId);
  },
};

/**
 * WhatsApp Calls Operations
 */
export const whatsappCalls = {
  create: (data: {
    whatsappId: string;
    mode: 'test' | 'production';
    body?: any;
    query?: any;
    headers?: any;
    path?: string;
  }) => {
    const stmt = db.prepare(`
      INSERT INTO whatsapp_calls
      (whatsapp_id, mode, body, query, headers, path)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      data.whatsappId,
      data.mode,
      data.body ? JSON.stringify(data.body) : null,
      data.query ? JSON.stringify(data.query) : null,
      data.headers ? JSON.stringify(data.headers) : null,
      data.path || null
    );
  },

  getByWhatsappId: (whatsappId: string, limit = 50) => {
    const stmt = db.prepare(`
      SELECT * FROM whatsapp_calls
      WHERE whatsapp_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    const rows = stmt.all(whatsappId, limit) as any[];
    return rows.map((row) => ({
      ...row,
      body: JSON.parse(row.body || 'null'),
      query: JSON.parse(row.query || 'null'),
      headers: JSON.parse(row.headers || 'null'),
    }));
  },
};

/**
 * Execution Events Operations (for test mode visualization)
 */
export const executionEvents = {
  /**
   * Create a new execution event
   */
  create: (data: {
    executionId: string;
    eventType: 'node_start' | 'node_end' | 'edge_traverse' | 'workflow_start' | 'workflow_end';
    nodeId?: string;
    edgeId?: string;
    data?: any;
  }) => {
    const stmt = db.prepare(`
      INSERT INTO execution_events
      (execution_id, event_type, node_id, edge_id, data)
      VALUES (?, ?, ?, ?, ?)
    `);

    return stmt.run(
      data.executionId,
      data.eventType,
      data.nodeId || null,
      data.edgeId || null,
      data.data ? JSON.stringify(data.data) : null
    );
  },

  /**
   * Get all events for an execution
   */
  getByExecutionId: (executionId: string) => {
    const stmt = db.prepare(`
      SELECT * FROM execution_events
      WHERE execution_id = ?
      ORDER BY timestamp ASC
    `);

    const rows = stmt.all(executionId) as any[];

    return rows.map(row => ({
      ...row,
      data: row.data ? JSON.parse(row.data) : null
    }));
  },

  /**
   * Get events since a timestamp (for polling)
   */
  getSince: (executionId: string, sinceTimestamp: number) => {
    const stmt = db.prepare(`
      SELECT * FROM execution_events
      WHERE execution_id = ? AND timestamp > ?
      ORDER BY timestamp ASC
    `);

    const rows = stmt.all(executionId, sinceTimestamp) as any[];

    return rows.map(row => ({
      ...row,
      data: row.data ? JSON.parse(row.data) : null
    }));
  },

  /**
   * Clean up old events (older than 1 hour)
   */
  cleanup: () => {
    const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
    const stmt = db.prepare(`
      DELETE FROM execution_events
      WHERE timestamp < ?
    `);

    return stmt.run(oneHourAgo);
  }
};

/**
 * Chat Registry Operations
 */
export const chatRegistry = {
  /**
   * Register or update a chat
   */
  upsert: (chatId: string, data: {
    userId: string;
    workflowId: string;
    status: string;
  }) => {
    const stmt = db.prepare(`
      INSERT INTO chat_registry (chat_id, user_id, workflow_id, status, updated_at)
      VALUES (?, ?, ?, ?, strftime('%s', 'now'))
      ON CONFLICT(chat_id) DO UPDATE SET
        user_id = excluded.user_id,
        workflow_id = excluded.workflow_id,
        status = excluded.status,
        updated_at = excluded.updated_at
    `);

    return stmt.run(chatId, data.userId, data.workflowId, data.status);
  },

  /**
   * Get chat by ID (O(1) lookup)
   */
  getById: (chatId: string) => {
    const stmt = db.prepare(`
      SELECT * FROM chat_registry
      WHERE chat_id = ?
      LIMIT 1
    `);

    return stmt.get(chatId) as {
      chat_id: string;
      user_id: string;
      workflow_id: string;
      status: string;
      created_at: number;
      updated_at: number;
    } | undefined;
  },

  /**
   * Get all chats for a user
   */
  getByUserId: (userId: string) => {
    const stmt = db.prepare(`
      SELECT * FROM chat_registry
      WHERE user_id = ?
      ORDER BY created_at DESC
    `);

    return stmt.all(userId);
  },

  /**
   * Delete chat
   */
  delete: (chatId: string) => {
    const stmt = db.prepare('DELETE FROM chat_registry WHERE chat_id = ?');
    return stmt.run(chatId);
  }
};

/**
 * Chat Messages Operations
 */
export const chatMessages = {
  /**
   * Create a new chat message
   */
  create: (data: {
    chatId: string;
    sessionId: string;
    messageId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    mode: 'test' | 'production';
    executionId?: string;
    metadata?: any;
    files?: any[];
  }) => {
    const stmt = db.prepare(`
      INSERT INTO chat_messages
      (chat_id, session_id, message_id, role, content, mode, execution_id, metadata, files)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      data.chatId,
      data.sessionId,
      data.messageId,
      data.role,
      data.content,
      data.mode,
      data.executionId || null,
      data.metadata ? JSON.stringify(data.metadata) : null,
      data.files ? JSON.stringify(data.files) : null
    );
  },

  /**
   * Get messages for a chat session
   */
  getBySession: (chatId: string, sessionId: string, limit = 100) => {
    const stmt = db.prepare(`
      SELECT * FROM chat_messages
      WHERE chat_id = ? AND session_id = ?
      ORDER BY timestamp ASC
      LIMIT ?
    `);

    const rows = stmt.all(chatId, sessionId, limit) as any[];

    return rows.map(row => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      files: row.files ? JSON.parse(row.files) : null
    }));
  },

  /**
   * Get all messages for a chat (across all sessions)
   */
  getByChatId: (chatId: string, limit = 500) => {
    const stmt = db.prepare(`
      SELECT * FROM chat_messages
      WHERE chat_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(chatId, limit) as any[];

    return rows.map(row => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      files: row.files ? JSON.parse(row.files) : null
    }));
  },

  /**
   * Delete messages for a session
   */
  deleteSession: (chatId: string, sessionId: string) => {
    const stmt = db.prepare('DELETE FROM chat_messages WHERE chat_id = ? AND session_id = ?');
    return stmt.run(chatId, sessionId);
  },

  /**
   * Clean up old messages (older than 30 days)
   */
  cleanup: (daysOld = 30) => {
    const cutoffTime = Math.floor(Date.now() / 1000) - (daysOld * 24 * 3600);
    const stmt = db.prepare(`
      DELETE FROM chat_messages
      WHERE timestamp < ?
    `);

    return stmt.run(cutoffTime);
  }
};

// Initialize database on import
initializeDatabase();
