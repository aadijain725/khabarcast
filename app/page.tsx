import { redirect } from "next/navigation";

// Root route is now a thin redirect to /login. Proxy bounces signed-in users
// from /login → /app, so authed users land on the app and signed-out users see
// the sign-in page. The marketing/waitlist landing has been retired.
export default function Page() {
  redirect("/login");
}
