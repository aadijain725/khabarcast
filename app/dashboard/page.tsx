import { redirect } from "next/navigation";

// /dashboard is legacy. Signed-in surface moved to /app. Keep this redirect
// so any old bookmarks + nav links still land somewhere useful.
export default function DashboardPage() {
  redirect("/app");
}
