# Guía de Escalabilidad Multi-Usuario para Nodify

## Estado Actual

Tu aplicación ya tiene una base sólida para manejo multi-usuario:

✅ **Firestore con aislamiento por usuario** (`/users/{userId}/`)
✅ **Firebase Authentication**
✅ **SQLite para registro de webhooks**
✅ **ServerWorkflowExecutor para ejecución en backend**
✅ **Ejecución asíncrona de webhooks** (no bloquea respuesta)

## Áreas Críticas a Mejorar

### 1. 🔴 **CRÍTICO: Almacenamiento de Archivos Temporales**

**Problema actual:**
```typescript
// src/lib/file-utils.ts
const fileStorage = new Map<string, FileReference>(); // ❌ Global, en memoria
```

**Problemas:**
- ❌ Los archivos se comparten entre TODOS los usuarios
- ❌ Se pierden al reiniciar el servidor
- ❌ No escalan horizontalmente (múltiples instancias)
- ❌ Pueden causar problemas de seguridad (User A puede acceder a archivos de User B)

**Solución: Firebase Storage con aislamiento por usuario**

#### Implementación Recomendada:

```typescript
// src/lib/file-storage.ts
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/firebase/config';

export interface FileReference {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string; // URL de Firebase Storage
  userId: string; // ✅ Aislamiento por usuario
  workflowId?: string;
  executionId?: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Almacenar archivo en Firebase Storage
 * Path: /users/{userId}/temp-files/{executionId}/{fileId}
 */
export async function storeFile(
  buffer: ArrayBuffer,
  metadata: {
    name: string;
    mimeType: string;
    userId: string;
    executionId: string;
  }
): Promise<FileReference> {
  const id = `file_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  const storagePath = `users/${metadata.userId}/temp-files/${metadata.executionId}/${id}`;

  const storageRef = ref(storage, storagePath);
  const blob = new Blob([buffer], { type: metadata.mimeType });

  // Subir a Firebase Storage con metadata
  const uploadResult = await uploadBytes(storageRef, blob, {
    contentType: metadata.mimeType,
    customMetadata: {
      originalName: metadata.name,
      executionId: metadata.executionId,
      uploadedAt: Date.now().toString(),
    },
  });

  // Obtener URL de descarga
  const url = await getDownloadURL(uploadResult.ref);

  const fileRef: FileReference = {
    id,
    name: metadata.name,
    mimeType: metadata.mimeType,
    size: buffer.byteLength,
    url,
    userId: metadata.userId,
    executionId: metadata.executionId,
    createdAt: Date.now(),
    expiresAt: Date.now() + (60 * 60 * 1000), // 1 hora
  };

  // Guardar metadata en Firestore
  await setDoc(
    doc(db, 'users', metadata.userId, 'temp-files', id),
    fileRef
  );

  return fileRef;
}

/**
 * Limpiar archivos expirados (ejecutar con Cloud Function scheduled)
 */
export async function cleanupExpiredFiles(userId: string) {
  const now = Date.now();
  const filesRef = collection(db, 'users', userId, 'temp-files');
  const expiredQuery = query(filesRef, where('expiresAt', '<', now));

  const snapshot = await getDocs(expiredQuery);

  for (const doc of snapshot.docs) {
    const file = doc.data() as FileReference;

    // Delete from Storage
    const storageRef = ref(storage, `users/${userId}/temp-files/${file.executionId}/${file.id}`);
    await deleteObject(storageRef).catch(() => {});

    // Delete from Firestore
    await deleteDoc(doc.ref);
  }
}
```

#### Cloud Function para Limpieza Automática:

```typescript
// functions/src/cleanup-temp-files.ts
import * as functions from 'firebase-functions';
import { cleanupExpiredFiles } from './file-storage';

/**
 * Ejecutar cada hora para limpiar archivos expirados
 */
export const cleanupTempFiles = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    console.log('Starting temp files cleanup');

    // Get all users with temp files
    const usersSnapshot = await admin.firestore().collection('users').get();

    for (const userDoc of usersSnapshot.docs) {
      await cleanupExpiredFiles(userDoc.id);
    }

    console.log('Temp files cleanup completed');
  });
```

---

### 2. 🟡 **IMPORTANTE: Rate Limiting y Protección Anti-Abuso**

**Problema:** Un usuario puede:
- Disparar miles de webhooks simultáneamente
- Ejecutar workflows infinitos
- Consumir todos los recursos del servidor

**Solución: Rate Limiting por Usuario**

```typescript
// src/lib/rate-limiter.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Opción 1: Upstash (recomendado para Next.js)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Rate limits por tipo de operación
export const webhookRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests por minuto
  prefix: 'webhook',
});

export const workflowExecutionRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, '1 m'), // 50 ejecuciones por minuto
  prefix: 'workflow',
});

// Opción 2: Redis local (si prefieres self-hosted)
// npm install ioredis
import Redis from 'ioredis';

const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

export async function checkRateLimit(
  userId: string,
  type: 'webhook' | 'workflow',
  limit: number = 100,
  window: number = 60 // seconds
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const key = `ratelimit:${type}:${userId}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - window;

  // Remove old entries
  await redisClient.zremrangebyscore(key, 0, windowStart);

  // Count current requests
  const count = await redisClient.zcard(key);

  if (count >= limit) {
    const oldestEntry = await redisClient.zrange(key, 0, 0, 'WITHSCORES');
    const reset = parseInt(oldestEntry[1]) + window;

    return {
      allowed: false,
      remaining: 0,
      reset,
    };
  }

  // Add new request
  await redisClient.zadd(key, now, `${now}:${Math.random()}`);
  await redisClient.expire(key, window);

  return {
    allowed: true,
    remaining: limit - count - 1,
    reset: now + window,
  };
}
```

#### Uso en API de Webhook:

```typescript
// src/app/api/webhook/prod/[webhookId]/route.ts
import { checkRateLimit } from '@/lib/rate-limiter';

async function handleWebhookRequest(request: NextRequest, { params }: any) {
  const { webhookId } = await params;
  const webhook = webhookRegistry.getById(webhookId);

  if (!webhook) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
  }

  // ✅ Rate limiting por usuario
  const rateLimit = await checkRateLimit(webhook.user_id, 'webhook', 100, 60);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: 'Too many webhook requests. Please try again later.',
        reset: rateLimit.reset,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.reset.toString(),
        },
      }
    );
  }

  // ... resto del código
}
```

---

### 3. 🟡 **IMPORTANTE: Queue System para Ejecuciones**

**Problema actual:**
```typescript
// Ejecuta inmediatamente en el mismo proceso
executor.execute(webhookNode.id, webhookData).catch((err) => {
  console.error('[Webhook:Prod] Workflow execution failed:', err);
});
```

**Problemas:**
- ❌ No se puede cancelar workflows que tardan mucho
- ❌ Si el servidor se cae, se pierde la ejecución
- ❌ No hay priorización de tareas
- ❌ No se puede distribuir carga entre servidores

**Solución: Sistema de Colas (BullMQ + Redis)**

```bash
npm install bullmq ioredis
```

```typescript
// src/lib/queues/workflow-queue.ts
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null, // Required for BullMQ
});

export interface WorkflowJobData {
  workflowId: string;
  userId: string;
  nodeId: string;
  inputData: any;
  executionId: string;
  mode: 'production' | 'test';
  trigger: 'webhook' | 'manual' | 'schedule' | 'form';
}

// Cola de workflows
export const workflowQueue = new Queue<WorkflowJobData>('workflow-executions', {
  connection,
  defaultJobOptions: {
    attempts: 3, // Reintentar hasta 3 veces
    backoff: {
      type: 'exponential',
      delay: 5000, // 5s, 10s, 20s
    },
    removeOnComplete: 100, // Mantener últimos 100 completados
    removeOnFail: 1000, // Mantener últimos 1000 fallidos
  },
});

// Worker que procesa los workflows
export const workflowWorker = new Worker<WorkflowJobData>(
  'workflow-executions',
  async (job: Job<WorkflowJobData>) => {
    const { workflowId, userId, nodeId, inputData, executionId } = job.data;

    console.log(`[WorkflowQueue] Processing job ${job.id} for user ${userId}`);

    try {
      // Fetch workflow from Firestore
      const workflowRef = doc(db, 'users', userId, 'workflows', workflowId);
      const workflowSnap = await getDoc(workflowRef);

      if (!workflowSnap.exists()) {
        throw new Error('Workflow not found');
      }

      const workflowData = workflowSnap.data();
      const workflow = {
        id: workflowId,
        name: workflowData.name || 'Unnamed Workflow',
        status: workflowData.status || 'active',
        nodes: workflowData.nodes || [],
        connections: workflowData.connections || [],
      };

      // Execute workflow
      const executor = new ServerWorkflowExecutor(workflow, {
        onEvent: (event: any) => {
          // Actualizar progreso del job
          job.updateProgress({
            type: event.type,
            nodeId: event.nodeId,
            timestamp: Date.now(),
          });

          // Guardar eventos
          executionEvents.create({
            executionId,
            eventType: event.type,
            nodeId: event.nodeId,
            data: event,
          });
        },
      });

      const result = await executor.execute(nodeId, inputData);

      console.log(`[WorkflowQueue] Job ${job.id} completed successfully`);

      return result;
    } catch (error) {
      console.error(`[WorkflowQueue] Job ${job.id} failed:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 10, // Procesar hasta 10 workflows simultáneamente
    limiter: {
      max: 50, // Máximo 50 jobs por segundo
      duration: 1000,
    },
  }
);

// Event listeners
workflowWorker.on('completed', (job) => {
  console.log(`[WorkflowQueue] Job ${job.id} completed`);
});

workflowWorker.on('failed', (job, err) => {
  console.error(`[WorkflowQueue] Job ${job?.id} failed:`, err);
});

workflowWorker.on('error', (err) => {
  console.error('[WorkflowQueue] Worker error:', err);
});

/**
 * Agregar workflow a la cola
 */
export async function enqueueWorkflow(data: WorkflowJobData) {
  const job = await workflowQueue.add('execute-workflow', data, {
    priority: data.mode === 'production' ? 1 : 10, // Producción tiene prioridad
    jobId: data.executionId, // Evitar duplicados
  });

  return job;
}

/**
 * Cancelar ejecución de workflow
 */
export async function cancelWorkflow(executionId: string) {
  const job = await workflowQueue.getJob(executionId);
  if (job) {
    await job.remove();
    return true;
  }
  return false;
}
```

#### Uso en API de Webhook:

```typescript
// src/app/api/webhook/prod/[webhookId]/route.ts
import { enqueueWorkflow } from '@/lib/queues/workflow-queue';

async function handleWebhookRequest(request: NextRequest, { params }: any) {
  // ... código anterior ...

  // ✅ Agregar a la cola en lugar de ejecutar directamente
  await enqueueWorkflow({
    workflowId: webhook.workflow_id,
    userId: webhook.user_id,
    nodeId: webhookNode.id,
    inputData: webhookData,
    executionId,
    mode: 'production',
    trigger: 'webhook',
  });

  console.log('[Webhook:Prod] Workflow added to queue');

  return NextResponse.json({
    status: 'ok',
    message: 'Workflow execution queued',
    executionId,
    workflowId: webhook.workflow_id,
  });
}
```

---

### 4. 🟢 **RECOMENDADO: Límites de Recursos por Usuario**

Implementar límites para evitar abuso:

```typescript
// src/lib/user-limits.ts
export interface UserLimits {
  maxWorkflows: number;
  maxWebhooks: number;
  maxExecutionsPerDay: number;
  maxExecutionTime: number; // milliseconds
  maxConcurrentExecutions: number;
  maxFileSize: number; // bytes
  maxStorageSize: number; // bytes
}

export const USER_TIERS: Record<string, UserLimits> = {
  free: {
    maxWorkflows: 5,
    maxWebhooks: 3,
    maxExecutionsPerDay: 100,
    maxExecutionTime: 30000, // 30s
    maxConcurrentExecutions: 2,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxStorageSize: 100 * 1024 * 1024, // 100MB
  },
  pro: {
    maxWorkflows: 50,
    maxWebhooks: 20,
    maxExecutionsPerDay: 10000,
    maxExecutionTime: 300000, // 5min
    maxConcurrentExecutions: 10,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxStorageSize: 10 * 1024 * 1024 * 1024, // 10GB
  },
  enterprise: {
    maxWorkflows: -1, // unlimited
    maxWebhooks: -1,
    maxExecutionsPerDay: -1,
    maxExecutionTime: 600000, // 10min
    maxConcurrentExecutions: 50,
    maxFileSize: 500 * 1024 * 1024, // 500MB
    maxStorageSize: 100 * 1024 * 1024 * 1024, // 100GB
  },
};

export async function checkUserLimits(
  userId: string,
  action: 'workflow' | 'webhook' | 'execution' | 'file'
): Promise<{ allowed: boolean; reason?: string }> {
  // Obtener tier del usuario desde Firestore
  const userDoc = await getDoc(doc(db, 'users', userId));
  const tier = userDoc.data()?.tier || 'free';
  const limits = USER_TIERS[tier];

  if (action === 'workflow') {
    const workflows = await getDocs(
      collection(db, 'users', userId, 'workflows')
    );

    if (limits.maxWorkflows !== -1 && workflows.size >= limits.maxWorkflows) {
      return {
        allowed: false,
        reason: `You have reached the maximum number of workflows (${limits.maxWorkflows}). Upgrade to create more.`,
      };
    }
  }

  if (action === 'execution') {
    // Check concurrent executions
    const runningExecutions = await getDocs(
      query(
        collection(db, 'users', userId, 'executions'),
        where('status', '==', 'running')
      )
    );

    if (
      limits.maxConcurrentExecutions !== -1 &&
      runningExecutions.size >= limits.maxConcurrentExecutions
    ) {
      return {
        allowed: false,
        reason: `You have too many workflows running simultaneously (${limits.maxConcurrentExecutions}). Please wait for some to finish.`,
      };
    }
  }

  return { allowed: true };
}
```

---

### 5. 🟢 **RECOMENDADO: Monitoring y Observabilidad**

Para detectar problemas y optimizar:

```typescript
// src/lib/monitoring.ts
import * as Sentry from '@sentry/nextjs';

export function initMonitoring() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1, // 10% de transacciones
  });
}

export function trackWorkflowExecution(
  userId: string,
  workflowId: string,
  duration: number,
  status: 'success' | 'error'
) {
  // Sentry
  Sentry.addBreadcrumb({
    category: 'workflow',
    message: `Workflow ${workflowId} ${status}`,
    level: status === 'error' ? 'error' : 'info',
    data: { userId, duration },
  });

  // Google Analytics / Mixpanel / etc
  if (typeof window !== 'undefined') {
    (window as any).gtag?.('event', 'workflow_execution', {
      user_id: userId,
      workflow_id: workflowId,
      duration,
      status,
    });
  }
}
```

---

## Plan de Implementación Recomendado

### Fase 1: Crítico (Semana 1)
1. ✅ Migrar file storage a Firebase Storage con aislamiento
2. ✅ Implementar rate limiting básico
3. ✅ Añadir validación de límites por usuario

### Fase 2: Importante (Semana 2-3)
4. ✅ Implementar sistema de colas (BullMQ)
5. ✅ Añadir timeouts y cancelación de workflows
6. ✅ Implementar limpieza automática de archivos

### Fase 3: Escalabilidad (Mes 2)
7. ✅ Configurar Redis para rate limiting y colas
8. ✅ Implementar monitoring con Sentry
9. ✅ Optimizar queries de Firestore con índices
10. ✅ Añadir sistema de tiers/pricing

### Fase 4: Producción (Mes 3+)
11. ✅ Load testing (simular 1000+ usuarios)
12. ✅ Configurar auto-scaling en cloud
13. ✅ Implementar CDN para assets estáticos
14. ✅ Configurar backups automáticos

---

## Infraestructura Recomendada

### Para 100-1,000 usuarios:
```yaml
# Vercel/Railway para Next.js
- Next.js App: Vercel (Auto-scaling)
- Database: Firebase Firestore
- File Storage: Firebase Storage
- Redis: Upstash (serverless)
- Queue: BullMQ con Upstash Redis
- Monitoring: Sentry

Costo mensual estimado: $50-200
```

### Para 1,000-10,000 usuarios:
```yaml
# Configuración más robusta
- Next.js: Vercel Pro ($20/mes)
- Firestore: Firebase Blaze (pay-as-you-go)
- Storage: Firebase Storage ($0.026/GB)
- Redis: Upstash Pro ($10-50/mes)
- Worker Server: Railway/Render ($10-30/mes)
- Monitoring: Sentry Team ($26/mes)

Costo mensual estimado: $100-500
```

### Para 10,000+ usuarios:
```yaml
# Configuración enterprise
- Kubernetes Cluster (GKE/EKS)
- Self-hosted Redis Cluster
- Firebase + PostgreSQL (híbrido)
- Cloud Storage (GCS/S3)
- Prometheus + Grafana
- Multiple regions

Costo mensual estimado: $1,000-5,000+
```

---

## Resumen de Cambios Críticos

| Componente | Estado Actual | Acción Requerida | Prioridad |
|------------|---------------|------------------|-----------|
| File Storage | ❌ In-memory global | Migrar a Firebase Storage | 🔴 CRÍTICO |
| Rate Limiting | ❌ No existe | Implementar con Redis | 🟡 IMPORTANTE |
| Queue System | ❌ Ejecución directa | Implementar BullMQ | 🟡 IMPORTANTE |
| User Limits | ❌ Sin límites | Añadir validación | 🟡 IMPORTANTE |
| Monitoring | ⚠️ Solo console.log | Implementar Sentry | 🟢 RECOMENDADO |
| Firestore Indexes | ⚠️ Básicos | Optimizar | 🟢 RECOMENDADO |
| Caching | ❌ Sin cache | Redis/Memory cache | 🟢 RECOMENDADO |

---

## Próximos Pasos

¿Quieres que implemente alguna de estas mejoras? Puedo empezar con:

1. **Migración de File Storage a Firebase Storage** (más crítico)
2. **Implementar Rate Limiting con Redis**
3. **Sistema de Colas con BullMQ**
4. **User Limits y validaciones**

Dime por dónde prefieres empezar y lo implementamos paso a paso.
