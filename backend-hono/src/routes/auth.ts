import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createNonce, verifySiwe, deleteSession, getSession, verifySchema } from "@/auth/siwe";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";

export const authRouter = new Hono();

authRouter.post("/nonce", async (c) => {
  const nonce = await createNonce();
  return c.json({ nonce });
});

authRouter.post("/verify", zValidator("json", verifySchema), async (c) => {
  const { message, signature } = c.req.valid("json");
  const domain = c.req.header("host") ?? "localhost";
  const uri = c.req.url;
  try {
    const { sessionId, address } = await verifySiwe(message, signature, domain, uri);
    setCookie(c, "sid", sessionId, {
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return c.json({ ok: true, address });
  } catch (err) {
    return c.json({ ok: false, error: (err as Error).message }, 400);
  }
});

authRouter.post("/logout", async (c) => {
  const sid = getCookie(c, "sid");
  await deleteSession(sid);
  deleteCookie(c, "sid");
  return c.json({ ok: true });
});

authRouter.get("/session", async (c) => {
  const sid = getCookie(c, "sid");
  const session = await getSession(sid);
  if (!session) return c.json({ ok: false }, 401);
  return c.json({ ok: true, address: session.address });
});

export async function requireAuth(c: any, next: () => Promise<void>) {
  const sid = getCookie(c, "sid");
  const session = await getSession(sid);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  c.set("address", session.address);
  await next();
}

