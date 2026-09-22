# Sistema de Roles y Permisos - Nodify

## Descripción General

Nodify implementa un sistema robusto de roles y permisos basado en RBAC (Role-Based Access Control) que permite gestionar el acceso de usuarios, moderadores, soporte, desarrolladores y administradores a diferentes funcionalidades del sistema.

## Roles del Sistema

### 1. **User** (Usuario Regular)
- **Descripción**: Usuario estándar que utiliza el servicio
- **Acceso**: Puede crear y gestionar sus propios workflows, nodos, credenciales y tablas
- **Limitaciones**: Sujeto a los límites de su plan de suscripción (free, pro, enterprise)
- **Permisos del sistema**: Ninguno (no tiene acceso al panel de administración)

### 2. **Support** (Soporte Técnico)
- **Descripción**: Miembros del equipo de soporte que ayudan a los usuarios
- **Acceso al panel de admin**: ✅ Sí
- **Departamento**: Support
- **Permisos**:
  - ✅ Ver información de usuarios
  - ✅ Ver y gestionar tickets de soporte
  - ✅ Responder a tickets
  - ✅ Escalar tickets a otros departamentos
  - ✅ Cerrar tickets resueltos
  - ✅ Ver todos los workflows (para debugging)
  - ✅ Ver analíticas básicas
  - ❌ No puede modificar usuarios
  - ❌ No puede suspender cuentas
  - ❌ No puede acceder a configuración del sistema

**Caso de uso**: Personal de primera línea que responde preguntas de usuarios y resuelve problemas técnicos básicos.

### 3. **Moderator** (Moderador)
- **Descripción**: Gestiona el contenido, la comunidad y modera el foro
- **Acceso al panel de admin**: ✅ Sí
- **Departamento**: Moderation
- **Permisos**:
  - ✅ Ver usuarios y suspender cuentas temporalmente
  - ✅ Moderar contenido (nodos públicos, workflows compartidos)
  - ✅ Gestionar el foro de la comunidad (pin, lock, eliminar posts)
  - ✅ Banear usuarios del foro
  - ✅ Ver y responder tickets de soporte
  - ✅ Aprobar y destacar nodos personalizados
  - ✅ Ver analíticas
  - ❌ No puede eliminar usuarios permanentemente
  - ❌ No puede acceder a configuración del sistema
  - ❌ No puede gestionar facturación

**Caso de uso**: Personal que asegura que la comunidad y el contenido público sean apropiados y de calidad.

### 4. **Developer** (Desarrollador)
- **Descripción**: Equipo técnico con acceso a herramientas de debugging
- **Acceso al panel de admin**: ✅ Sí
- **Departamento**: Engineering
- **Permisos**:
  - ✅ Ver información de usuarios
  - ✅ Ver todos los workflows
  - ✅ Aprobar nodos personalizados
  - ✅ Ver y exportar analíticas
  - ✅ Acceder a logs de API
  - ✅ Gestionar API keys
  - ✅ Herramientas de debug y diagnóstico
  - ✅ Ver configuración del sistema (solo lectura)
  - ✅ Ver logs de seguridad y auditoría
  - ❌ No puede modificar configuración del sistema
  - ❌ No puede suspender/banear usuarios
  - ❌ No puede acceder a facturación

**Caso de uso**: Desarrolladores que necesitan diagnosticar problemas técnicos complejos, monitorear el sistema y debugging avanzado.

### 5. **Admin** (Administrador)
- **Descripción**: Acceso casi completo al sistema
- **Acceso al panel de admin**: ✅ Sí
- **Departamento**: Operations / Management
- **Permisos**:
  - ✅ **TODOS** los permisos excepto:
    - ❌ No puede eliminar otros administradores
    - ❌ No puede eliminar usuarios permanentemente (solo super_admin)

**Permisos completos incluyen**:
  - Gestión completa de usuarios (ver, editar, suspender, impersonar)
  - Gestión completa de contenido y comunidad
  - Gestión completa de soporte
  - Gestión completa de workflows y nodos
  - Analíticas y reportes completos
  - Configuración del sistema (leer y modificar)
  - Gestión de facturación y suscripciones (ver, modificar, reembolsar)
  - Acceso completo a logs de API y seguridad
  - Gestión de roles y permisos
  - Auditoría completa

**Caso de uso**: Gerentes de operaciones, product managers, y personal de confianza que gestiona el día a día de la plataforma.

### 6. **Super Admin** (Super Administrador)
- **Descripción**: Máximo nivel de acceso al sistema
- **Acceso al panel de admin**: ✅ Sí
- **Departamento**: Management
- **Permisos**:
  - ✅ **TODOS** los permisos sin restricción
  - ✅ Puede eliminar usuarios permanentemente
  - ✅ Puede eliminar otros administradores
  - ✅ Puede gestionar otros super admins

**Caso de uso**: Fundadores, CTO, o personal con máxima autoridad. Solo debería haber 1-2 super admins.

## Matriz de Permisos

| Permiso | User | Support | Moderator | Developer | Admin | Super Admin |
|---------|------|---------|-----------|-----------|-------|-------------|
| **Gestión de Usuarios** |
| Ver usuarios | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Editar usuarios | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Eliminar usuarios | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Suspender usuarios | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Impersonar usuarios | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Moderación de Contenido** |
| Ver contenido | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Moderar contenido | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Eliminar contenido | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Destacar contenido | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Foro de Comunidad** |
| Moderar foro | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Pin/Lock posts | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Eliminar posts | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Banear del foro | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Sistema de Soporte** |
| Ver tickets | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Responder tickets | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Escalar tickets | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Cerrar tickets | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| **Workflows y Nodos** |
| Ver todos los workflows | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Editar cualquier workflow | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Eliminar cualquier workflow | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Aprobar nodos | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Destacar nodos | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Eliminar nodos | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Analíticas y Reportes** |
| Ver analíticas | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Exportar analíticas | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Generar reportes | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Configuración del Sistema** |
| Ver configuración | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Editar configuración | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Gestionar features | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Gestionar integraciones | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Facturación** |
| Ver facturación | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Modificar suscripciones | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Emitir reembolsos | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **API y Desarrollo** |
| Ver logs de API | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Gestionar API keys | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Herramientas de debug | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Seguridad y Auditoría** |
| Ver logs de seguridad | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Gestionar roles | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Ver auditoría | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Exportar auditoría | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

## Estructura de Datos

### User Document (Firestore: `/users/{uid}`)

```typescript
{
  uid: "user123",
  role: "admin", // user, support, moderator, developer, admin, super_admin
  accountStatus: "active", // active, suspended, banned, pending_verification, deleted

  profile: {
    displayName: "John Doe",
    email: "john@example.com",
    photoURL: "https://...",
    // ... más campos
  },

  subscription: {
    plan: "pro", // free, pro, enterprise
    status: "active",
    limits: { /* ... */ }
  },

  // Solo para staff (role != 'user')
  staffInfo: {
    department: "engineering", // support, moderation, engineering, operations, management
    title: "Senior Developer",
    assignedAt: Timestamp,
    assignedBy: "superadmin123",
    customPermissions: ["custom.special_access"], // Permisos adicionales
    internalNotes: "Lead developer on node system"
  },

  suspension: { // Solo si está suspendido/baneado
    suspendedAt: Timestamp,
    suspendedBy: "moderator456",
    suspendedUntil: Timestamp, // Opcional, si es temporal
    reason: "Spam en el foro",
    internalNotes: "Segunda advertencia",
    appealStatus: "pending"
  }
}
```

## Sistema de Auditoría

Todas las acciones sensibles realizadas por staff son registradas en el sistema de auditoría:

### Audit Log Entry (Firestore: `/audit_logs/{id}`)

```typescript
{
  id: "log123",
  action: "user.suspended", // Tipo de acción
  performedBy: "moderator456",
  performedByRole: "moderator",
  targetUserId: "user789",
  timestamp: Timestamp,
  ipAddress: "192.168.1.1",
  changes: {
    before: { accountStatus: "active" },
    after: { accountStatus: "suspended" }
  },
  severity: "high" // low, medium, high, critical
}
```

### Acciones Auditadas

- Cambios en usuarios (creación, edición, suspensión, eliminación)
- Cambios de roles y permisos
- Acciones de moderación (eliminación de contenido, baneos)
- Configuración del sistema
- Facturación y reembolsos
- Impersonación de usuarios
- Acceso a recursos sensibles

## Sistema de Soporte

### Support Ticket (Firestore: `/support_tickets/{id}`)

```typescript
{
  id: "ticket123",
  userId: "user789",
  subject: "No puedo conectar mi workflow",
  category: "technical", // technical, billing, account, feature_request, bug_report, other
  priority: "high", // low, medium, high, urgent
  status: "in_progress", // open, in_progress, waiting_user, resolved, closed
  assignedTo: "support001", // Staff user ID
  createdAt: Timestamp,
  updatedAt: Timestamp,
  tags: ["workflows", "connections"],
  satisfaction: {
    rating: 5,
    feedback: "Excelente soporte!",
    submittedAt: Timestamp
  }
}
```

### Support Ticket Messages (Firestore: `/support_tickets/{ticketId}/messages/{id}`)

```typescript
{
  id: "msg123",
  ticketId: "ticket123",
  senderId: "support001",
  senderRole: "support",
  senderName: "Sarah Support",
  message: "Hola, voy a revisar tu workflow...",
  isInternal: false, // Si es true, solo visible para staff
  createdAt: Timestamp
}
```

## Funciones Helper

El archivo `types.ts` incluye funciones helper para verificar permisos:

```typescript
import { hasPermission, canAccessAdminPanel, getUserPermissions } from '@/lib/types';

// Verificar un permiso específico
if (hasPermission(user, "users.suspend")) {
  // Usuario puede suspender cuentas
}

// Verificar si puede acceder al panel de admin
if (canAccessAdminPanel(user)) {
  // Mostrar enlace al panel de admin
}

// Obtener todos los permisos del usuario
const permissions = getUserPermissions(user);
console.log(permissions); // ["users.view", "users.suspend", ...]
```

## Permisos Personalizados

Los administradores pueden asignar permisos personalizados adicionales a usuarios staff más allá de los permisos de su rol:

```typescript
// Ejemplo: Dar acceso temporal a facturación a un developer
{
  role: "developer",
  staffInfo: {
    customPermissions: [
      "billing.view",
      "billing.modify"
    ]
  }
}
```

## Seguridad

### Reglas de Firestore

Las reglas de Firestore deben verificar el rol del usuario:

```javascript
// firestore.rules
match /users/{userId} {
  // Los usuarios solo pueden leer su propia información
  allow read: if request.auth.uid == userId;

  // Solo admins y super_admins pueden editar otros usuarios
  allow write: if request.auth.uid == userId
    || hasRole('admin')
    || hasRole('super_admin');
}

function hasRole(role) {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == role;
}
```

### Middleware de Next.js

Crear middleware para proteger rutas del panel de admin:

```typescript
// middleware.ts
import { hasPermission, canAccessAdminPanel } from '@/lib/types';

export async function middleware(request: NextRequest) {
  const user = await getCurrentUser();

  // Proteger rutas de admin
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!canAccessAdminPanel(user)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Verificar permisos específicos por ruta
  if (request.nextUrl.pathname.startsWith('/admin/users')) {
    if (!hasPermission(user, 'users.view')) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }
}
```

## Recomendaciones de Implementación

### 1. Panel de Administración

Crear una ruta `/admin` con sub-rutas según permisos:

```
/admin
  /dashboard        (todos los staff)
  /users            (users.view)
  /support          (support.view_tickets)
  /moderation       (content.moderate)
  /analytics        (analytics.view)
  /settings         (system.view_settings)
  /audit-logs       (audit.view)
  /billing          (billing.view)
```

### 2. Asignación de Roles

Solo `super_admin` debería poder:
- Crear otros admins
- Cambiar roles de admin a super_admin
- Eliminar super_admins

Solo `admin` y `super_admin` deberían poder:
- Asignar roles de support, moderator, developer
- Cambiar roles entre estos niveles

### 3. Impersonación de Usuarios

La función de impersonar usuarios (útil para debugging) debe:
- Estar disponible solo para admins
- Registrarse en audit logs
- Mostrar un banner visible "Impersonando a [usuario]"
- Tener límite de tiempo (ej: 1 hora)
- No permitir acciones sensibles (cambio de password, eliminación de cuenta)

### 4. Rate Limiting

Implementar rate limiting para acciones sensibles:
- Suspensión de usuarios: max 10/hora por moderador
- Eliminación de contenido: max 50/hora por moderador
- Cambios de roles: max 5/hora por admin

## Próximos Pasos

1. ✅ Types creados en `src/lib/types.ts`
2. ⏳ Actualizar Firestore security rules
3. ⏳ Crear middleware de Next.js para protección de rutas
4. ⏳ Implementar panel de administración (`/admin`)
5. ⏳ Crear sistema de auditoría
6. ⏳ Implementar sistema de soporte
7. ⏳ Agregar UI para gestión de roles en admin panel
