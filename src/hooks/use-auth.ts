import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";

export function useAuth() {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.currentUser);
  const { signIn, signOut } = useAuthActions();

  // لا نُعلّق الواجهة على استعلام المستخدم: قد يتأخر أو يتعذّر (شبكة ضعيفة أو دون
  // إنترنت) فيبدو المستخدم وكأنه خرج من حسابه. يكفي أن الجلسة صالحة.
  const isLoading = isAuthLoading || (isAuthenticated && user === undefined);

  return {
    isLoading,
    isAuthenticated,
    user,
    signIn,
    signOut,
  };
}
