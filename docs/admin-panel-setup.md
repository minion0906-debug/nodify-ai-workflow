# Panel de Administración - Guía de Configuración

## 🎉 Implementación Completada

El panel de administración de Nodify ha sido completamente implementado con un sistema robusto de roles, permisos y auditoría.

## 📁 Estructura de Archivos

```
src/
├── app/
│   ├── (admin)/
│   │   └── admin/
│   │       ├── layout.tsx              # Layout del admin panel
│   │       ├── page.tsx                # Dashboard principal
│   │       ├── users/
│   │       │   └── page.tsx            # Gestión de usuarios
│   │       ├── support/
│   │       │   └── page.tsx            # Sistema de soporte
│   │       ├── audit-logs/
│   │       │   └── page.tsx            # Logs de auditoría
│   │       ├── analytics/              # (Pendiente)
│   │       └── settings/               # (Pendiente)
│   └── middleware.ts                   # Protección de rutas
├── components/
│   ├── admin/
│   │   ├── admin-sidebar.tsx           # Navegación lateral
│   │   ├── admin-header.tsx            # Header con búsqueda
│   │   └── index.ts
│   └── auth/
│       └── protected-route.tsx         # Componentes de protección
├── hooks/
│   ├── use-permissions.ts              # Hook de permisos
│   ├── use-user-data.ts                # Hook de datos de usuario
│   └── index.ts
├── lib/
│   ├── types.ts                        # Types completos
│   └── audit.ts                        # Helpers de auditoría
└── firestore.rules                     # Reglas de seguridad
```

## 🚀 Primeros Pasos

### 1. Desplegar Firestore Rules

Primero, despliega las reglas de seguridad actualizadas:

```bash
npm run deploy:rules
# o
firebase deploy --only firestore:rules
```

### 2. Crear tu Primer Super Admin

Necesitas crear manualmente el primer super admin en Firestore:

1. Ve a Firebase Console → Firestore Database
2. Busca tu documento de usuario en `/users/{uid}`
3. Agrega/actualiza los siguientes campos:

```javascript
{
  uid: "tu-user-id",
  role: "super_admin",
  accountStatus: "active",
  profile: {
    email: "admin@nodify.com",
    displayName: "Super Admin"
  },
  subscription: {
    plan: "enterprise",
    status: "active",
    limits: {
      // ... límites de enterprise
    }
  },
  usage: {
    workflowCount: 0,
    executionsThisMonth: 0,
    apiCallsThisMonth: 0,
    storageUsed: 0,
    customNodesCreated: 0,
    lastResetDate: new Date()
  },
  preferences: {
    emailNotifications: true,
    workflowNotifications: true,
    errorNotifications: true,
    weeklyReport: false,
    marketingEmails: false,
    defaultWorkflowStatus: "draft",
    autoSaveInterval: 30,
    showTutorials: false,
    compactMode: false
  },
  stats: {
    totalWorkflows: 0,
    activeWorkflows: 0,
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    totalCustomNodes: 0,
    totalCredentials: 0,
    totalTables: 0
  },
  staffInfo: {
    department: "management",
    title: "Super Administrator",
    assignedAt: new Date(),
    assignedBy: "system",
    internalNotes: "Initial super admin account"
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: new Date()
}
```

### 3. Acceder al Panel de Admin

Una vez configurado tu super admin:

1. Inicia sesión con esa cuenta
2. Navega a `/admin` o haz clic en el enlace del admin panel (si lo agregas a tu app)
3. Deberías ver el dashboard del admin

## 🎯 Características Implementadas

### ✅ Sistema de Roles

6 roles con permisos granulares:

- **User**: Usuario regular sin acceso al admin
- **Support**: Soporte técnico (tickets, ver usuarios)
- **Moderator**: Moderación de contenido y comunidad
- **Developer**: Acceso técnico (logs, debugging)
- **Admin**: Acceso casi completo
- **Super Admin**: Acceso total sin restricciones

### ✅ Páginas Implementadas

1. **Dashboard** (`/admin`)
   - Estadísticas generales
   - Actividad reciente
   - Estado del sistema

2. **Gestión de Usuarios** (`/admin/users`)
   - Lista completa de usuarios
   - Filtros por rol, estado
   - Búsqueda por nombre/email
   - Acciones: Ver, Editar, Suspender, Eliminar, Impersonar

3. **Sistema de Soporte** (`/admin/support`)
   - Lista de tickets
   - Filtros por estado, prioridad
   - Tabs por estado (Open, In Progress, Resolved)
   - Vista de tickets con detalles

4. **Audit Logs** (`/admin/audit-logs`)
   - Registro de todas las acciones administrativas
   - Filtros por acción, severidad
   - Información completa: timestamp, usuario, IP, cambios

### ✅ Componentes de Protección

```tsx
// Proteger una ruta completa
<ProtectedRoute requireAdmin>
  <AdminContent />
</ProtectedRoute>

// Proteger por rol específico
<ProtectedRoute requireRole={["admin", "super_admin"]}>
  <SensitiveContent />
</ProtectedRoute>

// Proteger por permiso
<ProtectedRoute requirePermission="users.delete">
  <DeleteButton />
</ProtectedRoute>

// Mostrar contenido condicionalmente
<RequirePermission permission="users.edit">
  <EditUserButton />
</RequirePermission>

<RequireRole role={["admin", "super_admin"]}>
  <AdminOnlyFeature />
</RequireRole>
```

### ✅ Hooks de Permisos

```tsx
import { usePermissions } from '@/hooks';

function MyComponent() {
  const {
    user,
    role,
    permissions,
    isAdmin,
    isSuperAdmin,
    canAccessAdmin,
    can,
    canAny,
    hasRole,
  } = usePermissions();

  // Verificar permiso específico
  if (can('users.delete')) {
    // Mostrar botón de eliminar
  }

  // Verificar múltiples permisos
  if (canAny(['users.edit', 'users.suspend'])) {
    // Puede editar O suspender
  }

  // Verificar rol
  if (hasRole('admin')) {
    // Es admin
  }
}
```

### ✅ Sistema de Auditoría

```typescript
import { logAudit, logUserAction } from '@/lib/audit';

// Log de acción genérica
await logAudit({
  firestore,
  action: "user.suspended",
  performedBy: currentUserId,
  performedByRole: currentUserRole,
  targetUserId: suspendedUserId,
  changes: {
    before: { accountStatus: "active" },
    after: { accountStatus: "suspended" }
  },
  severity: "high"
});

// Helper para acciones de usuario
await logUserAction(
  firestore,
  "user.role_changed",
  adminId,
  "admin",
  targetUserId,
  { before: { role: "user" }, after: { role: "moderator" } }
);
```

## 🔐 Seguridad

### Firestore Rules

Las reglas de seguridad verifican automáticamente:

- ✅ Autenticación del usuario
- ✅ Rol del usuario
- ✅ Estado de la cuenta (active, suspended, banned)
- ✅ Permisos específicos por colección

### Middleware

El middleware de Next.js protege:

- ✅ Rutas protegidas (requieren autenticación)
- ✅ Rutas de admin (requieren rol de staff)
- ✅ Redirecciones automáticas si no tiene acceso

### Client-Side Protection

Componentes de protección adicionales:

- ✅ `<ProtectedRoute>` - Protege páginas completas
- ✅ `<RequirePermission>` - Muestra contenido por permiso
- ✅ `<RequireRole>` - Muestra contenido por rol
- ✅ `<RequireStaff>` - Solo para staff

## 📝 Tareas Pendientes

### Páginas por Implementar

1. **Analytics** (`/admin/analytics`)
   - Gráficos de uso
   - Métricas de ejecución
   - Reportes de rendimiento

2. **System Settings** (`/admin/settings`)
   - Configuración general
   - Feature flags
   - Integraciones
   - Límites globales

3. **Workflows** (`/admin/workflows`)
   - Ver todos los workflows
   - Estadísticas de ejecución
   - Workflows problemáticos

4. **Custom Nodes** (`/admin/nodes`)
   - Aprobar nodos públicos
   - Destacar nodos
   - Moderar contenido

### Funcionalidades Adicionales

1. **Modales de Detalle**
   - Modal de detalle de usuario
   - Modal de detalle de ticket
   - Modal de historial de cambios

2. **Acciones en Masa**
   - Seleccionar múltiples usuarios
   - Acciones en lote
   - Exportar selección

3. **Notificaciones en Tiempo Real**
   - Alertas de tickets urgentes
   - Notificaciones de eventos críticos
   - WebSocket para updates en vivo

4. **Dashboards Personalizados**
   - Widgets configurables
   - Métricas personalizadas por rol
   - Favoritos y accesos rápidos

## 🎨 Personalización

### Sidebar Navigation

Edita `src/components/admin/admin-sidebar.tsx` para agregar o quitar items:

```typescript
const navItems: NavItem[] = [
  {
    title: "Mi Nueva Sección",
    href: "/admin/mi-seccion",
    icon: MiIcono,
    permission: "mi.permiso", // Opcional
  },
  // ... más items
];
```

### Estadísticas del Dashboard

Edita `src/app/(admin)/admin/page.tsx` para personalizar las tarjetas:

```typescript
<StatsCard
  title="Mi Métrica"
  value="123"
  description="Descripción"
  icon={MiIcono}
  variant="success"
/>
```

## 🧪 Testing

### Probar Diferentes Roles

Para probar el sistema con diferentes roles:

1. Crea usuarios de prueba en Firestore
2. Asigna diferentes roles a cada uno
3. Inicia sesión con cada cuenta
4. Verifica que solo ves las secciones permitidas
5. Intenta acceder a rutas no permitidas (deberías ser redirigido)

### Probar Firestore Rules

Usa el emulador de Firestore para probar las reglas:

```bash
firebase emulators:start
```

## 📚 Recursos Adicionales

- [Documentación de Roles y Permisos](./roles-and-permissions.md)
- [Types Reference](../src/lib/types.ts)
- [Firestore Security Rules](../firestore.rules)

## 🤝 Contribuir

Para agregar nuevas funcionalidades al admin panel:

1. Define los permisos necesarios en `src/lib/types.ts`
2. Actualiza las reglas de Firestore si es necesario
3. Crea la página en `src/app/(admin)/admin/`
4. Agrega el item al sidebar
5. Implementa la lógica de auditoría si corresponde
6. Documenta los cambios

## 🐛 Troubleshooting

### "Permission Denied" en Firestore

- Verifica que las rules estén desplegadas
- Confirma que el usuario tiene el rol correcto
- Revisa que `accountStatus` sea "active"

### No puedo acceder a `/admin`

- Verifica que tu cuenta tenga un rol de staff
- Confirma que `canAccessAdminPanel` retorna `true`
- Revisa el middleware en `src/middleware.ts`

### Los permisos no se actualizan

- El hook `useUserData` cachea los datos
- Cierra sesión y vuelve a iniciar para refrescar
- En desarrollo, limpia el cache del navegador

## 📞 Soporte

Si tienes problemas o preguntas:

1. Revisa la documentación
2. Verifica la consola del navegador
3. Revisa los logs de Firestore
4. Consulta el audit log para ver qué está pasando
