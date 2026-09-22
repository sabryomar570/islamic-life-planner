import { useAuth } from "@/hooks/use-auth";
import { hasStoredSession } from "@/lib/auth-storage";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  // دون إنترنت: الجلسة المحفوظة تكفي لعرض التطبيق من نسخته المحلية،
  // فلا نُعلّق المستخدم على شاشة تحميل ولا نُعيده لتسجيل الدخول.
  const offlineSession =
    typeof navigator !== "undefined" && !navigator.onLine && hasStoredSession();

  if (offlineSession) return children;

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/auth?returnTo=${encodeURIComponent(returnTo)}`}
        replace
      />
    );
  }

  return children;
}
