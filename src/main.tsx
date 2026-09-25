import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { authStorage } from "@/lib/auth-storage";
import { registerServiceWorker } from "@/lib/pwa";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// هيكل واضح يبقي الخلفية والواجهة مثبتتين أثناء تحميل route chunk حقيقي؛
// لا شاشة بيضاء ولا انتظار صامت.
function RouteLoading() {
  return (
    <main
      className="min-h-dvh bg-background px-4 py-6 text-foreground"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="mx-auto w-full max-w-5xl animate-pulse motion-reduce:animate-none">
        <div className="glass-strong flex h-14 items-center justify-between rounded-2xl px-4">
          <span className="size-10 rounded-xl bg-primary/12" />
          <span className="h-3 w-20 rounded-full bg-primary/15" />
          <span className="size-10 rounded-xl bg-primary/12" />
        </div>
        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <span className="block h-5 w-44 rounded-full bg-foreground/10" />
            <span className="block h-3 w-64 max-w-full rounded-full bg-foreground/8" />
          </div>
          <div className="glass-strong h-36 rounded-3xl p-5">
            <span className="block h-3 w-28 rounded-full bg-primary/15" />
            <span className="mt-4 block h-7 w-52 max-w-full rounded-xl bg-foreground/10" />
            <span className="mt-5 flex gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <span key={index} className="h-1.5 flex-1 rounded-full bg-primary/15" />
              ))}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <span className="glass h-28 rounded-3xl" />
            <span className="glass h-28 rounded-3xl" />
          </div>
        </div>
        <span className="sr-only">جارٍ تجهيز الصفحة</span>
      </div>
    </main>
  );
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in WebContainer environment). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[WebContainer preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div            className="min-h-dvh flex items-center justify-center bg-background px-6 py-10 text-foreground"
          >
          <div className="glass-strong max-w-lg rounded-3xl p-6 text-center">
            <p className="text-sm font-semibold">تعذّر عرض هذه الصفحة</p>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 max-h-40 overflow-auto rounded-xl border border-border/60 bg-background/50 p-2 text-left text-[10px] leading-4 text-muted-foreground/80">
                {this.state.stack}
              </pre>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-primary-edge mt-5 min-h-11 rounded-full px-5 text-sm font-semibold text-primary-foreground"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// عامل الخدمة: يمنح التطبيق العمل دون إنترنت وإمكانية التثبيت على الجهاز.
registerServiceWorker();



function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      {/* تخزين صريح دائم للجلسة: يمنع نسيان تسجيل الدخول عند إعادة فتح التطبيق. */}
      <ConvexAuthProvider client={convex} storage={authStorage} storageNamespace="oud-app">
        <BrowserRouter>
          <RouteSyncer />
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route
                path="/auth"
                element={<AuthPage redirectAfterAuth="/dashboard" />}
              />
              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <Dashboard />
                  </RequireAuth>
                }
              />
              <Route
                path="/onboarding"
                element={
                  <RequireAuth>
                    <Onboarding />
                  </RequireAuth>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
      </ConvexAuthProvider>
    </RootErrorBoundary>
  </StrictMode>,
);
