/**
 * Script para verificar que el panel de administración esté configurado correctamente
 *
 * Uso: npx tsx scripts/verify-admin-setup.ts
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

interface CheckResult {
  name: string;
  status: 'success' | 'warning' | 'error';
  message: string;
}

const results: CheckResult[] = [];

function log(color: string, symbol: string, message: string) {
  console.log(`${color}${symbol}${RESET} ${message}`);
}

function checkFile(path: string, description: string): boolean {
  if (existsSync(path)) {
    results.push({
      name: description,
      status: 'success',
      message: `Found: ${path}`,
    });
    return true;
  } else {
    results.push({
      name: description,
      status: 'error',
      message: `Missing: ${path}`,
    });
    return false;
  }
}

console.log(`${BLUE}╔════════════════════════════════════════════════════════╗${RESET}`);
console.log(`${BLUE}║  🔍 Verificando Configuración del Admin Panel         ║${RESET}`);
console.log(`${BLUE}╚════════════════════════════════════════════════════════╝${RESET}\n`);

// 1. Verificar archivos de types
console.log(`${BLUE}📋 Verificando Types...${RESET}`);
checkFile('src/lib/types.ts', 'Types principales');

// 2. Verificar Firestore rules
console.log(`\n${BLUE}🔐 Verificando Firestore Rules...${RESET}`);
const rulesExist = checkFile('firestore.rules', 'Firestore Security Rules');

if (rulesExist) {
  const rulesContent = readFileSync('firestore.rules', 'utf-8');

  if (rulesContent.includes('getUserRole()')) {
    results.push({
      name: 'Firestore Rules - Role functions',
      status: 'success',
      message: 'Role checking functions found',
    });
  } else {
    results.push({
      name: 'Firestore Rules - Role functions',
      status: 'warning',
      message: 'Role checking functions not found in rules',
    });
  }
}

// 3. Verificar hooks
console.log(`\n${BLUE}🪝 Verificando Hooks...${RESET}`);
checkFile('src/hooks/use-permissions.ts', 'usePermissions hook');
checkFile('src/hooks/use-user-data.ts', 'useUserData hook');

// 4. Verificar middleware
console.log(`\n${BLUE}🛡️ Verificando Middleware...${RESET}`);
checkFile('src/middleware.ts', 'Next.js Middleware');

// 5. Verificar componentes de protección
console.log(`\n${BLUE}🔒 Verificando Componentes de Protección...${RESET}`);
checkFile('src/components/auth/protected-route.tsx', 'ProtectedRoute component');

// 6. Verificar componentes de admin
console.log(`\n${BLUE}⚙️ Verificando Componentes de Admin...${RESET}`);
checkFile('src/components/admin/admin-sidebar.tsx', 'AdminSidebar component');
checkFile('src/components/admin/admin-header.tsx', 'AdminHeader component');

// 7. Verificar páginas del admin panel
console.log(`\n${BLUE}📄 Verificando Páginas del Admin Panel...${RESET}`);
checkFile('src/app/(admin)/admin/layout.tsx', 'Admin Layout');
checkFile('src/app/(admin)/admin/page.tsx', 'Admin Dashboard');
checkFile('src/app/(admin)/admin/users/page.tsx', 'Users Management Page');
checkFile('src/app/(admin)/admin/support/page.tsx', 'Support Tickets Page');
checkFile('src/app/(admin)/admin/audit-logs/page.tsx', 'Audit Logs Page');

// 8. Verificar utilidades
console.log(`\n${BLUE}🛠️ Verificando Utilidades...${RESET}`);
checkFile('src/lib/audit.ts', 'Audit helpers');

// 9. Verificar documentación
console.log(`\n${BLUE}📚 Verificando Documentación...${RESET}`);
checkFile('docs/roles-and-permissions.md', 'Roles and Permissions Documentation');
checkFile('docs/admin-panel-setup.md', 'Admin Panel Setup Guide');

// 10. Verificar credenciales de Firebase Admin
console.log(`\n${BLUE}🔑 Verificando Credenciales de Firebase Admin...${RESET}`);

// Check for firebasesdk.json (preferred method)
if (existsSync('firebasesdk.json')) {
  results.push({
    name: 'Firebase Admin Credentials - firebasesdk.json',
    status: 'success',
    message: 'firebasesdk.json found',
  });
} else if (existsSync('.env.local')) {
  // Fallback to checking environment variables
  const envContent = readFileSync('.env.local', 'utf-8');

  if (envContent.includes('FIREBASE_CONFIG_BASE64')) {
    results.push({
      name: 'Firebase Admin Credentials - FIREBASE_CONFIG_BASE64',
      status: 'success',
      message: 'FIREBASE_CONFIG_BASE64 found in .env.local',
    });
  } else {
    results.push({
      name: 'Firebase Admin Credentials',
      status: 'warning',
      message: 'Neither firebasesdk.json nor FIREBASE_CONFIG_BASE64 found',
    });
  }
} else {
  results.push({
    name: 'Firebase Admin Credentials',
    status: 'warning',
    message: 'No firebasesdk.json or .env.local file found',
  });
}

// Resumen
console.log(`\n${BLUE}╔════════════════════════════════════════════════════════╗${RESET}`);
console.log(`${BLUE}║  📊 Resumen de Verificación                           ║${RESET}`);
console.log(`${BLUE}╚════════════════════════════════════════════════════════╝${RESET}\n`);

const successCount = results.filter(r => r.status === 'success').length;
const warningCount = results.filter(r => r.status === 'warning').length;
const errorCount = results.filter(r => r.status === 'error').length;

results.forEach(result => {
  const symbol = result.status === 'success' ? '✓' : result.status === 'warning' ? '⚠' : '✗';
  const color = result.status === 'success' ? GREEN : result.status === 'warning' ? YELLOW : RED;
  log(color, symbol, `${result.name}: ${result.message}`);
});

console.log(`\n${BLUE}───────────────────────────────────────────────────────${RESET}`);
console.log(`${GREEN}✓ Success: ${successCount}${RESET}`);
console.log(`${YELLOW}⚠ Warnings: ${warningCount}${RESET}`);
console.log(`${RED}✗ Errors: ${errorCount}${RESET}`);

// Próximos pasos
if (errorCount > 0 || warningCount > 0) {
  console.log(`\n${YELLOW}⚠️  Atención:${RESET}`);

  if (errorCount > 0) {
    console.log(`   Hay ${errorCount} errores que deben ser corregidos.`);
  }

  if (warningCount > 0) {
    console.log(`   Hay ${warningCount} advertencias que deberías revisar.`);
  }

  console.log(`\n${BLUE}📖 Consulta la documentación en:${RESET}`);
  console.log(`   - docs/roles-and-permissions.md`);
  console.log(`   - docs/admin-panel-setup.md`);
} else {
  console.log(`\n${GREEN}🎉 ¡Todo listo! El panel de administración está correctamente configurado.${RESET}`);
  console.log(`\n${BLUE}🚀 Próximos pasos:${RESET}`);
  console.log(`   1. Despliega las Firestore rules: ${YELLOW}firebase deploy --only firestore:rules${RESET}`);
  console.log(`   2. Crea tu primer super admin (ver docs/admin-panel-setup.md)`);
  console.log(`   3. Accede al panel: ${YELLOW}http://localhost:9003/admin${RESET}`);
}

console.log();
process.exit(errorCount > 0 ? 1 : 0);
