import type { Context } from "hono";
import { botService, roomService } from "@/services";
import { NotFoundError, BadRequestError } from "@/middlewares";
import { getUser } from "@/middlewares/auth.middleware";
import type { SelectRoleRequest, ProposeAmountRequest, ConfirmAmountRequest, SelectFeePayerRequest } from "@/types";
import { ROLES, FEE_PAYERS, type Role, type FeePayer } from "@/types";

export const botController = {
  /**
   * POST /rooms/:roomId/actions/select-role
   * Select role (sender/receiver)
   */
  async selectRole(c: Context) {
    const user = getUser(c)!;
    const roomId = c.req.param("roomId");
    const body = await c.req.json<SelectRoleRequest>();

    const room = await roomService.getRoomById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    // Validate role
    if (!Object.values(ROLES).includes(body.role as Role)) {
      throw new BadRequestError("Invalid role. Must be 'sender' or 'receiver'");
    }

    const result = await botService.onRoleSelected(room, user.id, body.role as Role);

    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 400);
    }

    // Update last activity
    await roomService.updateLastActivity(roomId);

    return c.json({ ok: true });
  },

  /**
   * POST /rooms/:roomId/actions/reset-roles
   * Reset role selections
   */
  async resetRoles(c: Context) {
    const user = getUser(c)!;
    const roomId = c.req.param("roomId");

    const room = await roomService.getRoomById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    const result = await botService.onResetRoles(room, user.id);

    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 400);
    }

    await roomService.updateLastActivity(roomId);

    return c.json({ ok: true });
  },

  /**
   * POST /rooms/:roomId/actions/propose-amount
   * Propose deal amount (sender only)
   */
  async proposeAmount(c: Context) {
    const user = getUser(c)!;
    const roomId = c.req.param("roomId");
    const body = await c.req.json<ProposeAmountRequest>();

    const room = await roomService.getRoomById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    if (!body.amount) {
      throw new BadRequestError("Amount is required");
    }

    const result = await botService.onAmountProposed(room, user.id, body.amount);

    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 400);
    }

    await roomService.updateLastActivity(roomId);

    return c.json({ ok: true });
  },

  /**
   * POST /rooms/:roomId/actions/confirm-amount
   * Confirm or reject proposed amount
   */
  async confirmAmount(c: Context) {
    const user = getUser(c)!;
    const roomId = c.req.param("roomId");
    const body = await c.req.json<ConfirmAmountRequest>();

    const room = await roomService.getRoomById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    const result = await botService.onAmountConfirmed(room, user.id, body.confirmed);

    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 400);
    }

    await roomService.updateLastActivity(roomId);

    return c.json({ ok: true });
  },

  /**
   * POST /rooms/:roomId/actions/select-fee-payer
   * Select who pays the fee
   */
  async selectFeePayer(c: Context) {
    const user = getUser(c)!;
    const roomId = c.req.param("roomId");
    const body = await c.req.json<SelectFeePayerRequest>();

    const room = await roomService.getRoomById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    // Validate fee payer
    if (!Object.values(FEE_PAYERS).includes(body.feePayer as FeePayer)) {
      throw new BadRequestError("Invalid fee payer. Must be 'sender', 'receiver', or 'split'");
    }

    const result = await botService.onFeePayerSelected(room, user.id, body.feePayer as FeePayer);

    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 400);
    }

    await roomService.updateLastActivity(roomId);

    return c.json({ ok: true });
  },

  /**
   * POST /rooms/:roomId/actions/confirm-fee
   * Confirm fee arrangement
   */
  async confirmFee(c: Context) {
    const user = getUser(c)!;
    const roomId = c.req.param("roomId");

    const room = await roomService.getRoomById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    const result = await botService.onFeeConfirmed(room, user.id);

    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 400);
    }

    await roomService.updateLastActivity(roomId);

    return c.json({ ok: true });
  },

  /**
   * GET /rooms/:roomId/state
   * Get current room state (for reconnecting clients)
   */
  async getRoomState(c: Context) {
    const roomId = c.req.param("roomId");

    const state = await botService.getRoomState(roomId);
    if (!state) {
      throw new NotFoundError("Room not found");
    }

    return c.json({ ok: true, data: state });
  },

  /**
   * GET /rooms/:roomId/deposit-info
   * Get deposit information for a room
   */
  async getDepositInfo(c: Context) {
    const roomId = c.req.param("roomId");

    const depositInfo = await botService.getDepositInfo(roomId);
    if (!depositInfo) {
      throw new NotFoundError("Room not found");
    }

    return c.json({ ok: true, data: depositInfo });
  },

  /**
   * POST /rooms/:roomId/actions/check-deposit
   * Check for incoming deposits (queries blockchain)
   */
  async checkDeposit(c: Context) {
    const roomId = c.req.param("roomId");

    const room = await roomService.getRoomById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    const result = await botService.checkForDeposit(roomId);

    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 400);
    }

    await roomService.updateLastActivity(roomId);

    return c.json({
      ok: true,
      found: result.found,
      txHash: result.txHash,
    });
  },

  /**
   * POST /rooms/:roomId/actions/mock-deposit
   * Mock a deposit for testing (DEV ONLY)
   * This simulates a deposit without actual blockchain interaction
   */
  async mockDeposit(c: Context) {
    const roomId = c.req.param("roomId");

    const room = await roomService.getRoomById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    const result = await botService.mockDeposit(roomId);

    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 400);
    }

    await roomService.updateLastActivity(roomId);

    return c.json({
      ok: true,
      txHash: result.txHash,
      message: "Mock deposit created and processed",
    });
  },
};
