import { useGetUser, getGetUserQueryKey } from "@workspace/api-client-react";

export function useCurrentUser() {
  const currentUserId = 1; // Hardcoded for demo purposes as requested
  return useGetUser(currentUserId, {
    query: {
      enabled: true,
      queryKey: getGetUserQueryKey(currentUserId),
    },
  });
}
