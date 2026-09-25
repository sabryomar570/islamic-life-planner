import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";

export function useAuth() {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.currentUser);
  const { signIn, signOut } = useAuthActions();

  // المصادقة وحدها تكفي لحماية المسار. الاسم والبريد يظهران لاحقًا داخل
  // الترويسة، فلا نضيف انتظارًا لاستعلام ثانوي إلى بوابة التنقل.
  const isLoading = isAuthLoading;

  return {
    isLoading,
    isAuthenticated,
    user,
    signIn,
    signOut,
  };
}
