import type { Context } from "hono";
import { timeoutService, roomService } from "@/services";
import { NotFoundError } from "@/middlewares";

/**
 * Scheduler Controller
 *
 * Provides endpoints for scheduled tasks that can be called by cron jobs.
 * These endpoints should be protected in production (e.g., API key, internal network only).
 */
export const schedulerController = {
  /**
   * POST /scheduler/check-timeouts
   * Check all rooms for timeouts and expire those that have timed out
   * Should be called every minute by a cron job
   */
  async checkTimeouts(c: Context) {
    const result = await timeoutService.checkAndExpireTimedOutRooms();

    return c.json({
      ok: true,
      data: result,
      message: `Checked ${result.checked} rooms, expired ${result.expired}`,
    });
  },

  /**
   * POST /scheduler/send-warnings
   * Send timeout warnings to rooms that are close to expiring
   * Should be called every 5 minutes by a cron job
   */
  async sendWarnings(c: Context) {
    const result = await timeoutService.sendTimeoutWarnings();

    return c.json({
      ok: true,
      data: result,
      message: `Sent ${result.sent} warnings`,
    });
  },

  /**
   * GET /scheduler/config
   * Get timeout configuration
   */
  async getConfig(c: Context) {
    const config = timeoutService.getTimeoutConfig();

    return c.json({
      ok: true,
      data: config,
    });
  },

  /**
   * GET /rooms/:roomId/timeout-status
   * Get timeout status for a specific room
   */
  async getRoomTimeoutStatus(c: Context) {
    const roomId = c.req.param("roomId");
    const room = await roomService.getRoomById(roomId);

    if (!room) {
      throw new NotFoundError("Room not found");
    }

    const timeRemaining = timeoutService.getTimeRemaining(room);
    const isCloseToExpiring = timeoutService.isCloseToExpiring(room);

    return c.json({
      ok: true,
      data: {
        roomId: room.id,
        step: room.step,
        status: room.status,
        lastActivityAt: room.lastActivityAt,
        timeRemaining: timeRemaining,
        timeRemainingMinutes: timeRemaining ? Math.ceil(timeRemaining / (60 * 1000)) : null,
        isCloseToExpiring,
        isTimedOut: timeRemaining === 0,
      },
    });
  },

  /**
   * GET /scheduler/expiring-soon
   * Get rooms that will expire soon
   */
  async getExpiringSoon(c: Context) {
    const minutes = Number(c.req.query("minutes") ?? 5);
    const rooms = await timeoutService.getRoomsExpiringSoon(minutes);

    return c.json({
      ok: true,
      data: rooms.map((room) => ({
        roomId: room.id,
        name: room.name,
        step: room.step,
        lastActivityAt: room.lastActivityAt,
        timeRemainingMinutes: Math.ceil((timeoutService.getTimeRemaining(room) || 0) / (60 * 1000)),
      })),
    });
  },
};
