import { useAuth } from "@/hooks/use-auth";
import { useGetUser, getGetUserQueryKey } from "@workspace/api-client-react";

export function useCurrentUser() {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const userId = authUser?.id ?? 1;

  const userQuery = useGetUser(userId, {
    query: {
      enabled: !authLoading,
      queryKey: getGetUserQueryKey(userId),
    },
  });

  return {
    ...userQuery,
    authUser,
    isAuthLoading: authLoading,
    isAuthenticated: !!authUser,
    roles: authUser?.roles ?? ["user"],
    isPartner: authUser?.roles?.includes("partner") ?? false,
    isJudge: authUser?.roles?.includes("judge") ?? false,
    onboardingCompleted: authUser?.onboardingCompleted ?? true,
  };
}
