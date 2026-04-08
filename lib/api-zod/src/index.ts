export * from "./generated/api";

import * as zod from "zod";

export const AuthUserSchema = zod.object({
  id: zod.number(),
  replitId: zod.string(),
  email: zod.string().nullish(),
  firstName: zod.string().nullish(),
  lastName: zod.string().nullish(),
  profileImageUrl: zod.string().nullish(),
  displayName: zod.string().nullish(),
  username: zod.string().nullish(),
  roles: zod.array(zod.enum(["user", "partner", "judge"])),
  onboardingCompleted: zod.boolean(),
  referralCode: zod.string().nullish(),
});

export type AuthUser = zod.infer<typeof AuthUserSchema>;
export * from "./generated/types";
