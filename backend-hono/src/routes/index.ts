import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { apiReference } from "@scalar/hono-api-reference";
import { auth } from "@/lib/auth";
import { openApiDoc } from "@/lib/openapi";
import { roomController, messageController, escrowController, botController } from "@/controllers";
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

// Bot action schemas
const selectRoleSchema = z.object({
  role: z.enum(["sender", "receiver"]),
});

const proposeAmountSchema = z.object({
  amount: z.string().min(1),
});

const confirmAmountSchema = z.object({
  confirmed: z.boolean(),
});

const selectFeePayerSchema = z.object({
  feePayer: z.enum(["sender", "receiver", "split"]),
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

// ============ Bot Action Routes (all require auth) ============

apiRouter.get("/rooms/:roomId/state", requireAuth, botController.getRoomState);
apiRouter.get("/rooms/:roomId/deposit-info", requireAuth, botController.getDepositInfo);
apiRouter.post("/rooms/:roomId/actions/select-role", requireAuth, zValidator("json", selectRoleSchema), botController.selectRole);
apiRouter.post("/rooms/:roomId/actions/reset-roles", requireAuth, botController.resetRoles);
apiRouter.post("/rooms/:roomId/actions/propose-amount", requireAuth, zValidator("json", proposeAmountSchema), botController.proposeAmount);
apiRouter.post("/rooms/:roomId/actions/confirm-amount", requireAuth, zValidator("json", confirmAmountSchema), botController.confirmAmount);
apiRouter.post("/rooms/:roomId/actions/select-fee-payer", requireAuth, zValidator("json", selectFeePayerSchema), botController.selectFeePayer);
apiRouter.post("/rooms/:roomId/actions/confirm-fee", requireAuth, botController.confirmFee);
apiRouter.post("/rooms/:roomId/actions/check-deposit", requireAuth, botController.checkDeposit);
apiRouter.post("/rooms/:roomId/actions/mock-deposit", requireAuth, botController.mockDeposit);

// Release Flow Routes
apiRouter.post("/rooms/:roomId/actions/initiate-release", requireAuth, botController.initiateRelease);
apiRouter.post("/rooms/:roomId/actions/confirm-release", requireAuth, botController.confirmRelease);
apiRouter.post("/rooms/:roomId/actions/cancel-release", requireAuth, botController.cancelRelease);
apiRouter.post("/rooms/:roomId/actions/submit-payout-address", requireAuth, zValidator("json", z.object({ address: z.string().min(1) })), botController.submitPayoutAddress);
apiRouter.post("/rooms/:roomId/actions/confirm-payout-address", requireAuth, botController.confirmPayoutAddress);
apiRouter.post("/rooms/:roomId/actions/change-payout-address", requireAuth, botController.changePayoutAddress);

// ============ Escrow Routes ============

apiRouter.get("/escrows/by-address", escrowController.getByAddress);
apiRouter.get("/escrows/:chainId/:escrowAddress", escrowController.getByChainAndAddress);
