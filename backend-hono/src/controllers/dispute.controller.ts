import type { Context } from "hono";
import { disputeService, roomService } from "@/services";
import { NotFoundError, BadRequestError } from "@/middlewares";
import { getUser } from "@/middlewares/auth.middleware";
import type { CreateDisputeRequest } from "@/types";

export const disputeController = {
  /**
   * POST /rooms/:roomId/dispute
   * Create a dispute for a room
   */
  async createDispute(c: Context) {
    const user = getUser(c)!;
    const roomId = c.req.param("roomId");
    const body = await c.req.json<CreateDisputeRequest>();

    const result = await disputeService.createDispute(roomId, user.id, body);

    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 400);
    }

    await roomService.updateLastActivity(roomId);

    return c.json({
      ok: true,
      data: result.dispute,
    }, 201);
  },

  /**
   * GET /rooms/:roomId/disputes
   * Get all disputes for a room
   */
  async getDisputesByRoom(c: Context) {
    const roomId = c.req.param("roomId");

    const room = await roomService.getRoomById(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }

    const disputes = await disputeService.getDisputesByRoomId(roomId);

    return c.json({
      ok: true,
      data: disputes,
    });
  },

  /**
   * GET /disputes/my
   * Get disputes filed by the current user
   */
  async getMyDisputes(c: Context) {
    const user = getUser(c)!;
    const limit = Number(c.req.query("limit") ?? 50);

    const disputes = await disputeService.getDisputesByReporterId(user.id, limit);

    return c.json({
      ok: true,
      data: disputes,
    });
  },

  /**
   * GET /disputes/:disputeId
   * Get a specific dispute
   */
  async getDisputeById(c: Context) {
    const disputeId = c.req.param("disputeId");

    const dispute = await disputeService.getDisputeById(disputeId);
    if (!dispute) {
      throw new NotFoundError("Dispute not found");
    }

    return c.json({
      ok: true,
      data: dispute,
    });
  },

  // ============ Admin Endpoints (Mock) ============
  // In production, these would be protected by admin authentication

  /**
   * GET /admin/disputes
   * Get all disputes (admin)
   */
  async getAllDisputes(c: Context) {
    const status = c.req.query("status");
    const limit = Number(c.req.query("limit") ?? 50);

    let disputes;
    if (status) {
      disputes = await disputeService.getDisputesByStatus(status, limit);
    } else {
      disputes = await disputeService.getPendingDisputes(limit);
    }

    return c.json({
      ok: true,
      data: disputes,
    });
  },

  /**
   * GET /admin/disputes/stats
   * Get dispute statistics (admin)
   */
  async getDisputeStats(c: Context) {
    const stats = await disputeService.getDisputeStats();

    return c.json({
      ok: true,
      data: stats,
    });
  },

  /**
   * PATCH /admin/disputes/:disputeId/status
   * Update dispute status (admin)
   */
  async updateDisputeStatus(c: Context) {
    const disputeId = c.req.param("disputeId");
    const body = await c.req.json<{ status: string; adminNotes?: string }>();

    if (!body.status) {
      throw new BadRequestError("Status is required");
    }

    const result = await disputeService.updateDisputeStatus(
      disputeId,
      body.status,
      body.adminNotes
    );

    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 400);
    }

    return c.json({
      ok: true,
      data: result.dispute,
    });
  },

  /**
   * POST /admin/disputes/:disputeId/notes
   * Add admin notes to a dispute (admin)
   */
  async addAdminNotes(c: Context) {
    const disputeId = c.req.param("disputeId");
    const body = await c.req.json<{ notes: string }>();

    if (!body.notes) {
      throw new BadRequestError("Notes are required");
    }

    const result = await disputeService.addAdminNotes(disputeId, body.notes);

    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 400);
    }

    return c.json({
      ok: true,
      data: result.dispute,
    });
  },
};
