import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { apiReference } from "@scalar/hono-api-reference";
import { auth } from "@/lib/auth";
import { openApiDoc } from "@/lib/openapi";
import { roomController, messageController, escrowController } from "@/controllers";
import { requireAuth } from "@/middlewares";
import { getSupportedChainIds } from "@/config/chains";

// ============ Validation Schemas ============

const createRoomSchema = z.object({
  name: z.string().min(2).max(100),
  chainId: z.number().refine(
    (val) => getSupportedChainIds().includes(val),
    { message: "Unsupported chain ID" }
  ),
});

const joinRoomByCodeSchema = z.object({
  roomCode: z.string().length(6).toUpperCase(),
});

const sendMessageSchema = z.object({
  text: z.string().min(1).max(2000),
});

// ============ Router Setup ============

export const apiRouter = new Hono();

// Health check
apiRouter.get("/health", (c) => c.json({ ok: true, timestamp: new Date().toISOString() }));

// ============ API Documentation ============

// OpenAPI JSON spec
apiRouter.get("/openapi.json", (c) => c.json(openApiDoc));

// Scalar API Reference UI
apiRouter.get(
  "/docs",
  apiReference({
    url: "/api/openapi.json",
    theme: "kepler",
  })
);

// ============ Auth Routes (BetterAuth native) ============

apiRouter.on(["POST", "GET"], "/auth/*", (c) => auth.handler(c.req.raw));

// ============ Chain Routes ============

apiRouter.get("/chains", roomController.getSupportedChains);

// ============ Room Routes (all require auth) ============

apiRouter.get("/rooms", requireAuth, roomController.getAll);
apiRouter.get("/rooms/my", requireAuth, roomController.getMyRooms);
apiRouter.post("/rooms", requireAuth, zValidator("json", createRoomSchema), roomController.create);
apiRouter.post("/rooms/join", requireAuth, zValidator("json", joinRoomByCodeSchema), roomController.joinByCode);
apiRouter.get("/rooms/code/:roomCode", requireAuth, roomController.getByCode);
apiRouter.get("/rooms/:roomId", requireAuth, roomController.getById);
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
