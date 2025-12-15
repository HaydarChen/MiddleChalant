import { SiweMessage } from "siwe";
import { z } from "zod";
import { db } from "@/lib/db";
import { siweNonces, sessions } from "@/db/schema";
import { eq, lt } from "drizzle-orm";
import { id, nowPlusMinutes } from "@/lib/utils";

const NONCE_TTL_MINUTES = 10;
const SESSION_TTL_HOURS = 12;

export async function createNonce(address?: string | null) {
  const nonce = crypto.randomUUID();
  const expiresAt = nowPlusMinutes(NONCE_TTL_MINUTES);
  await db.insert(siweNonces).values({ nonce, address: address ?? null, expiresAt });
  return nonce;
}

export async function verifySiwe(message: string, signature: string, domain: string, uri: string) {
  const msg = new SiweMessage(message);
  const parsed = await msg.verify({ signature, domain, nonce: msg.nonce, time: new Date().toISOString() });
  if (!parsed.success) {
    throw new Error("Invalid SIWE signature");
  }

  const nonceRow = await db.query.siweNonces.findFirst({ where: (fields, { eq: eq2, gt }) => eq2(fields.nonce, msg.nonce) && gt(fields.expiresAt, new Date()) });
  if (!nonceRow) {
    throw new Error("Nonce expired or not found");
  }
  // Consume nonce
  await db.delete(siweNonces).where(eq(siweNonces.nonce, msg.nonce));

  const sessionId = id("sid");
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000);
  await db.insert(sessions).values({ id: sessionId, address: msg.address, createdAt: new Date(), expiresAt });

  return { sessionId, address: msg.address };
}

export async function getSession(sessionId?: string | null) {
  if (!sessionId) return null;
  const row = await db.query.sessions.findFirst({ where: (fields, { eq: eq2, gt }) => eq2(fields.id, sessionId) && gt(fields.expiresAt, new Date()) });
  return row ?? null;
}

export async function deleteSession(sessionId?: string | null) {
  if (!sessionId) return;
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export const nonceSchema = z.object({});
export const verifySchema = z.object({ message: z.string(), signature: z.string() });

