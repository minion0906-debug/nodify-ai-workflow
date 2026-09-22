import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware for protecting routes and checking permissions
 * Runs on every request before the page is rendered
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protected routes that require authentication
  const protectedRoutes = ["/workflows", "/tables", "/credentials", "/node-labs", "/settings", "/admin"];
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  // Admin routes that require staff role
  const isAdminRoute = pathname.startsWith("/admin");

  // Check authentication (simplified - in production, verify Firebase auth token)
  const isAuthenticated = await checkAuthentication(request);

  // If trying to access protected route without auth, redirect to login
  if (isProtectedRoute && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // TEMPORARY: Disable admin check in middleware
  // Admin access is checked on the client side using usePermissions hook
  // This will be re-enabled when we implement proper server-side verification

  // if (isAdminRoute && isAuthenticated) {
  //   const hasAdminAccess = await checkAdminAccess(request);
  //
  //   if (!hasAdminAccess) {
  //     // Redirect to main app if no admin access
  //     const url = request.nextUrl.clone();
  //     url.pathname = "/workflows";
  //     return NextResponse.redirect(url);
  //   }
  // }

  return NextResponse.next();
}

/**
 * Check if user is authenticated
 * In production, this would verify Firebase auth token
 */
async function checkAuthentication(request: NextRequest): Promise<boolean> {
  // TEMPORARY: Disable middleware authentication check
  // Firebase Auth handles authentication on the client side
  // The middleware will be re-enabled when we implement proper server-side auth verification
  return true;

  // TODO: Implement proper Firebase Auth verification
  // This would involve:
  // 1. Getting the Firebase ID token from cookies or headers
  // 2. Verifying it with Firebase Admin SDK
  // 3. Checking token expiration

  // Example implementation (when ready):
  // const authToken = request.cookies.get("firebase-auth-token");
  // if (!authToken) return false;
  //
  // try {
  //   const decodedToken = await getFirebaseAdmin().auth.verifyIdToken(authToken.value);
  //   return !!decodedToken.uid;
  // } catch (error) {
  //   return false;
  // }
}

/**
 * Check if user has admin access
 * In production, this would check user role from Firestore
 */
async function checkAdminAccess(request: NextRequest): Promise<boolean> {
  // Get user ID from auth token
  const authToken = request.cookies.get("auth-token");

  if (!authToken) {
    return false;
  }

  // TODO: Fetch user data from Firestore and check role
  // For now, we'll implement this check on the client side
  // Middleware will just ensure authentication

  // In production, you would:
  // 1. Verify the auth token
  // 2. Get user document from Firestore
  // 3. Check if user.role is in ['support', 'moderator', 'developer', 'admin', 'super_admin']

  return true; // Temporarily allow all authenticated users
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
