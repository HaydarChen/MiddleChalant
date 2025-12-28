import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { roomController, messageController, escrowController } from "@/controllers";
import { requireAuth } from "@/middlewares";

// ============ Validation Schemas ============

const createRoomSchema = z.object({
  name: z.string().min(2).max(100),
  chainId: z.number(),
  tokenAddress: z.string(),
  amount: z.string(),
  buyerAddress: z.string().optional(),
  sellerAddress: z.string().optional(),
});

const joinRoomSchema = z.object({
  address: z.string(),
  role: z.enum(["buyer", "seller"]),
});

const sendMessageSchema = z.object({
  text: z.string().min(1).max(2000),
});

// ============ Router Setup ============

export const apiRouter = new Hono();

// Health check
apiRouter.get("/health", (c) => c.json({ ok: true, timestamp: new Date().toISOString() }));

// ============ Auth Routes (BetterAuth native) ============

apiRouter.on(["POST", "GET"], "/auth/*", (c) => auth.handler(c.req.raw));

// ============ Room Routes (all require auth) ============

apiRouter.get("/rooms", requireAuth, roomController.getAll);
apiRouter.post("/rooms", requireAuth, zValidator("json", createRoomSchema), roomController.create);
apiRouter.get("/rooms/:roomId", requireAuth, roomController.getById);
apiRouter.post("/rooms/:roomId/join", requireAuth, zValidator("json", joinRoomSchema), roomController.join);
apiRouter.get("/rooms/:roomId/participants", requireAuth, roomController.getParticipants);

// ============ Message Routes (all require auth) ============

apiRouter.get("/rooms/:roomId/messages", requireAuth, messageController.getByRoomId);
apiRouter.post(
  "/rooms/:roomId/messages",
  requireAuth,
  zValidator("json", sendMessageSchema),
  messageController.send
);

// ============ Escrow Routes ============

apiRouter.get("/escrows/by-address", escrowController.getByAddress);
apiRouter.get("/escrows/:chainId/:escrowAddress", escrowController.getByChainAndAddress);
