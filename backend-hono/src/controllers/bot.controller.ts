import type { Context } from "hono";
import { botService, roomService } from "@/services";
import { NotFoundError, BadRequestError } from "@/middlewares";
import { getUser } from "@/middlewares/auth.middleware";
import type { SelectRoleRequest, ProposeAmountRequest, ConfirmAmountRequest, SelectFeePayerRequest, SetPayoutAddressRequest } from "@/types";
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

  // ============ Release Flow ============

  /**
   * POST /rooms/:roomId/actions/initiate-release
   * Sender initiates release of funds to receiver
   */
  async initiateRelease(c: Context) {
    const user = getUser(c)!;
    const roomId = c.req.param("roomId");

    const room = await roomService.getRoomById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    const result = await botService.onReleaseInitiated(room, user.id);

    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 400);
    }

    await roomService.updateLastActivity(roomId);

    return c.json({ ok: true });
  },

  /**
   * POST /rooms/:roomId/actions/confirm-release
   * Confirm release (both parties must confirm)
   */
  async confirmRelease(c: Context) {
    const user = getUser(c)!;
    const roomId = c.req.param("roomId");

    const room = await roomService.getRoomById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    const result = await botService.onReleaseConfirmed(room, user.id);

    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 400);
    }

    await roomService.updateLastActivity(roomId);

    return c.json({ ok: true });
  },

  /**
   * POST /rooms/:roomId/actions/cancel-release
   * Cancel the release request (go back to FUNDED state)
   */
  async cancelRelease(c: Context) {
    const user = getUser(c)!;
    const roomId = c.req.param("roomId");

    const room = await roomService.getRoomById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    const result = await botService.onReleaseCancelled(room, user.id);

    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 400);
    }

    await roomService.updateLastActivity(roomId);

    return c.json({ ok: true });
  },

  /**
   * POST /rooms/:roomId/actions/submit-payout-address
   * Receiver submits their wallet address to receive payment
   */
  async submitPayoutAddress(c: Context) {
    const user = getUser(c)!;
    const roomId = c.req.param("roomId");
    const body = await c.req.json<SetPayoutAddressRequest>();

    const room = await roomService.getRoomById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    if (!body.address) {
      throw new BadRequestError("Address is required");
    }

    const result = await botService.onPayoutAddressSubmitted(room, user.id, body.address);

    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 400);
    }

    await roomService.updateLastActivity(roomId);

    return c.json({ ok: true });
  },

  /**
   * POST /rooms/:roomId/actions/confirm-payout-address
   * Receiver confirms their payout address and triggers payment
   */
  async confirmPayoutAddress(c: Context) {
    const user = getUser(c)!;
    const roomId = c.req.param("roomId");

    const room = await roomService.getRoomById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    const result = await botService.onPayoutAddressConfirmed(room, user.id);

    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 400);
    }

    await roomService.updateLastActivity(roomId);

    return c.json({ ok: true });
  },

  /**
   * POST /rooms/:roomId/actions/change-payout-address
   * Receiver wants to change their payout address
   */
  async changePayoutAddress(c: Context) {
    const user = getUser(c)!;
    const roomId = c.req.param("roomId");

    const room = await roomService.getRoomById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    const result = await botService.onPayoutAddressRejected(room, user.id);

    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 400);
    }

    await roomService.updateLastActivity(roomId);

    return c.json({ ok: true });
  },

  // ============ Cancel/Refund Flow ============

  /**
   * POST /rooms/:roomId/actions/initiate-cancel
   * Either party initiates cancellation and refund
   */
  async initiateCancel(c: Context) {
    const user = getUser(c)!;
    const roomId = c.req.param("roomId");

    const room = await roomService.getRoomById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    const result = await botService.onCancelInitiated(room, user.id);

    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 400);
    }

    await roomService.updateLastActivity(roomId);

    return c.json({ ok: true });
  },

  /**
   * POST /rooms/:roomId/actions/confirm-cancel
   * Confirm cancellation (both parties must confirm)
   */
  async confirmCancel(c: Context) {
    const user = getUser(c)!;
    const roomId = c.req.param("roomId");

    const room = await roomService.getRoomById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    const result = await botService.onCancelConfirmed(room, user.id);

    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 400);
    }

    await roomService.updateLastActivity(roomId);

    return c.json({ ok: true });
  },

  /**
   * POST /rooms/:roomId/actions/reject-cancel
   * Reject the cancellation request (go back to FUNDED state)
   */
  async rejectCancel(c: Context) {
    const user = getUser(c)!;
    const roomId = c.req.param("roomId");

    const room = await roomService.getRoomById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    const result = await botService.onCancelRejected(room, user.id);

    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 400);
    }

    await roomService.updateLastActivity(roomId);

    return c.json({ ok: true });
  },

  /**
   * POST /rooms/:roomId/actions/submit-refund-address
   * Sender submits their wallet address to receive refund
   */
  async submitRefundAddress(c: Context) {
    const user = getUser(c)!;
    const roomId = c.req.param("roomId");
    const body = await c.req.json<SetPayoutAddressRequest>();

    const room = await roomService.getRoomById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    if (!body.address) {
      throw new BadRequestError("Address is required");
    }

    const result = await botService.onRefundAddressSubmitted(room, user.id, body.address);

    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 400);
    }

    await roomService.updateLastActivity(roomId);

    return c.json({ ok: true });
  },

  /**
   * POST /rooms/:roomId/actions/confirm-refund-address
   * Sender confirms their refund address and triggers refund
   */
  async confirmRefundAddress(c: Context) {
    const user = getUser(c)!;
    const roomId = c.req.param("roomId");

    const room = await roomService.getRoomById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    const result = await botService.onRefundAddressConfirmed(room, user.id);

    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 400);
    }

    await roomService.updateLastActivity(roomId);

    return c.json({ ok: true });
  },

  /**
   * POST /rooms/:roomId/actions/change-refund-address
   * Sender wants to change their refund address
   */
  async changeRefundAddress(c: Context) {
    const user = getUser(c)!;
    const roomId = c.req.param("roomId");

    const room = await roomService.getRoomById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    const result = await botService.onRefundAddressRejected(room, user.id);

    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 400);
    }

    await roomService.updateLastActivity(roomId);

    return c.json({ ok: true });
  },
};
