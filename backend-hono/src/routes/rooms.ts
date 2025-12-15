import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "@/lib/db";
import { rooms, messages } from "@/db/schema";
import { id } from "@/lib/utils";
import { eq, desc, lt } from "drizzle-orm";
import { requireAuth } from "@/routes/auth";

const createRoomSchema = z.object({
  name: z.string().min(2),
  chainId: z.number(),
  tokenAddress: z.string(),
  amount: z.string(),
  buyerAddress: z.string().optional(),
  sellerAddress: z.string().optional(),
});

const joinSchema = z.object({ address: z.string(), role: z.enum(["buyer", "seller"]) });

const messageSchema = z.object({ text: z.string().min(1).max(2000) });

export const roomsRouter = new Hono();

roomsRouter.get("/", async (c) => {
  const all = await db.select().from(rooms).orderBy(desc(rooms.createdAt)).limit(50);
  return c.json({ data: all });
});

roomsRouter.post("/", zValidator("json", createRoomSchema), async (c) => {
  const body = c.req.valid("json");
  const roomId = id("room");
  await db.insert(rooms).values({
    id: roomId,
    name: body.name,
    chainId: body.chainId,
    tokenAddress: body.tokenAddress,
    amount: body.amount,
    status: "AWAITING_DEPOSIT",
  });
  return c.json({ id: roomId });
});

roomsRouter.get("/:roomId", async (c) => {
  const roomId = c.req.param("roomId");
  const room = await db.query.rooms.findFirst({ where: (fields, { eq: eq2 }) => eq2(fields.id, roomId) });
  if (!room) return c.json({ error: "Not found" }, 404);
  return c.json({ data: room });
});

roomsRouter.post("/:roomId/join", zValidator("json", joinSchema), async (c) => {
  // For brevity, not persisting participants table here.
  const roomId = c.req.param("roomId");
  const body = c.req.valid("json");
  return c.json({ ok: true, roomId, address: body.address, role: body.role });
});

roomsRouter.get("/:roomId/messages", async (c) => {
  const roomId = c.req.param("roomId");
  const limit = Number(c.req.query("limit") ?? 30);
  const cursor = c.req.query("cursor");
  const where = cursor ? (fields: typeof messages) => lt(fields.id, cursor) : undefined;
  const rows = await db
    .select()
    .from(messages)
    .where((fields, ops) => (where ? where(fields) : undefined))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
  return c.json({ data: rows });
});

roomsRouter.post("/:roomId/messages", requireAuth, zValidator("json", messageSchema), async (c) => {
  const roomId = c.req.param("roomId");
  const sender = c.get("address") as string;
  const { text } = c.req.valid("json");
  const mid = id("msg");
  const row = { id: mid, roomId, sender, text, createdAt: new Date() };
  await db.insert(messages).values(row);
  // Broadcast handled elsewhere
  return c.json({ data: row });
});

roomsRouter.get("/escrows/by-address", async (c) => {
  const address = c.req.query("address");
  if (!address) return c.json({ data: [] });
  // Placeholder: would query escrows table by buyer/seller
  return c.json({ data: [] });
});

