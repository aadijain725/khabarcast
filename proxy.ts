import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isSignInRoute = createRouteMatcher(["/login"]);
// /app is the signed-in home; /dashboard kept for legacy URLs (server-redirects
// to /app). Both gated.
const isProtectedRoute = createRouteMatcher([
  "/app",
  "/app/(.*)",
  "/dashboard",
]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const authed = await convexAuth.isAuthenticated();

  if (isSignInRoute(request) && authed) {
    return nextjsMiddlewareRedirect(request, "/app");
  }
  if (isProtectedRoute(request) && !authed) {
    return nextjsMiddlewareRedirect(request, "/login");
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
