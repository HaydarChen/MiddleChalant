import { createMiddleware } from "hono/factory";
import { auth } from "@/lib/auth";
import type { Session, User } from "better-auth/types";

interface AuthVariables {
  user: User | null;
  session: Session | null;
}

/**
 * Middleware to load session from BetterAuth
 * Attaches user and session to context if valid session exists
 */
export const sessionMiddleware = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    c.set("user", session?.user ?? null);
    c.set("session", session?.session ?? null);

    await next();
  }
);

/**
 * Middleware to require authentication
 * Returns 401 if no valid session
 */
export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    c.set("user", session.user);
    c.set("session", session.session);

    await next();
  }
);

/**
 * Get the current user from context
 * Must be used after sessionMiddleware or requireAuth
 */
export function getUser(c: { get: (key: "user") => User | null }): User | null {
  return c.get("user");
}

/**
 * Get the current session from context
 * Must be used after sessionMiddleware or requireAuth
 */
export function getSession(c: { get: (key: "session") => Session | null }): Session | null {
  return c.get("session");
}
