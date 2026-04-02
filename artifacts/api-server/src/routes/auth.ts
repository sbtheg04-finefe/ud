import * as oidc from "openid-client";
import { Router, type IRouter, type Request, type Response } from "express";
import { GetCurrentAuthUserResponse } from "@workspace/api-zod";
import { db, usersTable, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  createSession,
  deleteSession,
  SESSION_COOKIE,
  SESSION_TTL,
  ISSUER_URL,
  type SessionData,
} from "../lib/auth";

const OIDC_COOKIE_TTL = 10 * 60 * 1000;
const router: IRouter = Router();

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function setOidcCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: OIDC_COOKIE_TTL,
  });
}

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

function generateReferralCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

async function generateUniqueUsername(base: string): Promise<string> {
  const clean = base.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16) || "user";
  let username = clean;
  let attempt = 0;
  while (attempt < 10) {
    const [existing] = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, username));
    if (!existing) return username;
    username = `${clean}${Math.floor(Math.random() * 9999)}`;
    attempt++;
  }
  return `${clean}${Date.now()}`;
}

async function upsertUser(claims: Record<string, unknown>) {
  const replitId = claims.sub as string;

  const [existing] = await db.select()
    .from(usersTable)
    .where(eq(usersTable.replitUserId, replitId));

  if (existing) {
    return existing;
  }

  const firstName = (claims.first_name as string) || "";
  const lastName = (claims.last_name as string) || "";
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || "PlatePair User";
  const emailRaw = (claims.email as string) || `${replitId}@platepair.local`;
  const avatarUrl = (claims.profile_image_url || claims.picture) as string | null;
  const usernameBase = firstName || emailRaw.split("@")[0];
  const username = await generateUniqueUsername(usernameBase);

  const [newUser] = await db.insert(usersTable).values({
    displayName,
    username,
    email: emailRaw,
    avatarUrl: avatarUrl ?? null,
    replitUserId: replitId,
    roles: ["user"],
    referralCode: generateReferralCode(),
    onboardingCompleted: false,
  }).returning();

  return newUser;
}

router.get("/auth/user", (req: Request, res: Response) => {
  res.json(
    GetCurrentAuthUserResponse.parse({ user: req.isAuthenticated() ? req.user : null })
  );
});

router.get("/login", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;
  const returnTo = getSafeReturnTo(req.query.returnTo);

  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

  const redirectTo = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    scope: "openid email profile offline_access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "login consent",
    state,
    nonce,
  });

  setOidcCookie(res, "code_verifier", codeVerifier);
  setOidcCookie(res, "nonce", nonce);
  setOidcCookie(res, "state", state);
  setOidcCookie(res, "return_to", returnTo);

  res.redirect(redirectTo.href);
});

router.get("/callback", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;
  const codeVerifier = req.cookies?.code_verifier;
  const nonce = req.cookies?.nonce;
  const expectedState = req.cookies?.state;

  if (!codeVerifier || !expectedState) {
    res.redirect("/api/login");
    return;
  }

  const currentUrl = new URL(
    `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
  );

  let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
  try {
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
      idTokenExpected: true,
    });
  } catch {
    res.redirect("/api/login");
    return;
  }

  const returnTo = getSafeReturnTo(req.cookies?.return_to);

  res.clearCookie("code_verifier", { path: "/" });
  res.clearCookie("nonce", { path: "/" });
  res.clearCookie("state", { path: "/" });
  res.clearCookie("return_to", { path: "/" });

  const claims = tokens.claims();
  if (!claims) {
    res.redirect("/api/login");
    return;
  }

  const dbUser = await upsertUser(claims as unknown as Record<string, unknown>);

  const now = Math.floor(Date.now() / 1000);
  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      replitId: dbUser.replitUserId ?? "",
      email: dbUser.email,
      firstName: dbUser.displayName.split(" ")[0] ?? null,
      lastName: dbUser.displayName.split(" ").slice(1).join(" ") || null,
      profileImageUrl: dbUser.avatarUrl ?? null,
      displayName: dbUser.displayName,
      username: dbUser.username,
      roles: dbUser.roles,
      onboardingCompleted: dbUser.onboardingCompleted,
      referralCode: dbUser.referralCode ?? null,
    },
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);

  if (!dbUser.onboardingCompleted) {
    res.redirect("/onboarding");
    return;
  }

  res.redirect(returnTo);
});

router.get("/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) await clearSession(res, sid);
  // If they used Replit OIDC, also end that session
  try {
    const config = await getOidcConfig();
    const origin = getOrigin(req);
    const endSessionUrl = oidc.buildEndSessionUrl(config, {
      client_id: process.env.REPL_ID!,
      post_logout_redirect_uri: origin,
    });
    res.redirect(endSessionUrl.href);
  } catch {
    res.redirect("/");
  }
});

function buildSessionUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    replitId: u.replitUserId ?? "",
    email: u.email,
    firstName: u.displayName.split(" ")[0] ?? null,
    lastName: u.displayName.split(" ").slice(1).join(" ") || null,
    profileImageUrl: u.avatarUrl ?? null,
    displayName: u.displayName,
    username: u.username,
    roles: u.roles as string[],
    onboardingCompleted: u.onboardingCompleted,
    referralCode: u.referralCode ?? null,
  };
}

router.post("/auth/register", async (req: Request, res: Response) => {
  const { email, password, displayName, referralCode } = req.body;

  if (!email || !password || !displayName) {
    res.status(400).json({ error: "email, password, and displayName are required" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim()));
  if (existing) {
    res.status(409).json({ error: "An account with that email already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const username = await generateUniqueUsername(displayName);
  const refCode = generateReferralCode();

  let referredById: number | undefined;
  if (referralCode) {
    const [referrer] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.referralCode, referralCode.toUpperCase()));
    if (referrer) referredById = referrer.id;
  }

  const [newUser] = await db.insert(usersTable).values({
    displayName: displayName.trim(),
    username,
    email: email.toLowerCase().trim(),
    passwordHash,
    roles: ["user"],
    referralCode: refCode,
    referredById: referredById ?? null,
    onboardingCompleted: false,
  }).returning();

  const sessionData: SessionData = {
    user: buildSessionUser(newUser),
    access_token: "",
    refresh_token: undefined,
    expires_at: undefined,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.status(201).json({ user: buildSessionUser(newUser) });
});

router.post("/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim()));
  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const sessionData: SessionData = {
    user: buildSessionUser(user),
    access_token: "",
    refresh_token: undefined,
    expires_at: undefined,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.json({ user: buildSessionUser(user) });
});

export default router;
