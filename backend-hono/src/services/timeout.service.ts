/**
 * Timeout Service
 *
 * Handles room timeout logic:
 * - Pre-funding timeout (15 min): Rooms in early stages (WAITING_FOR_PEER through FEE_SELECTION)
 * - Funding timeout (30 min): Rooms waiting for deposit (AWAITING_DEPOSIT)
 *
 * This service provides methods to check and expire timed-out rooms.
 * Can be called by a cron job or scheduled task.
 */

import { roomRepository } from "@/repositories";
import { roomService } from "./room.service";
import { botService } from "./bot.service";
import type { Room } from "@/types";
import { ROOM_STEPS, ROOM_STATUSES, TIMEOUTS } from "@/types";

// Steps that are subject to pre-funding timeout
const PRE_FUNDING_STEPS: string[] = [
  ROOM_STEPS.WAITING_FOR_PEER,
  ROOM_STEPS.ROLE_SELECTION,
  ROOM_STEPS.AMOUNT_AGREEMENT,
  ROOM_STEPS.FEE_SELECTION,
];

// Steps that are subject to funding timeout
const FUNDING_STEPS: string[] = [
  ROOM_STEPS.AWAITING_DEPOSIT,
];

export interface TimeoutCheckResult {
  checked: number;
  expired: number;
  errors: string[];
}

export const timeoutService = {
  /**
   * Check all active rooms for timeouts and expire those that have timed out
   * This should be called periodically (e.g., every minute by a cron job)
   */
  async checkAndExpireTimedOutRooms(): Promise<TimeoutCheckResult> {
    const result: TimeoutCheckResult = {
      checked: 0,
      expired: 0,
      errors: [],
    };

    try {
      // Get all open rooms
      const allRooms = await roomRepository.findAll(1000);
      const openRooms = allRooms.filter((r) => r.status === ROOM_STATUSES.OPEN);

      result.checked = openRooms.length;

      for (const room of openRooms) {
        try {
          const expired = await this.checkAndExpireRoom(room);
          if (expired) {
            result.expired++;
          }
        } catch (error) {
          result.errors.push(`Room ${room.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
    } catch (error) {
      result.errors.push(`Failed to fetch rooms: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return result;
  },

  /**
   * Check a single room for timeout and expire if necessary
   * Returns true if the room was expired
   */
  async checkAndExpireRoom(room: Room): Promise<boolean> {
    const now = new Date();
    const lastActivity = new Date(room.lastActivityAt);
    const timeSinceActivity = now.getTime() - lastActivity.getTime();

    // Check pre-funding timeout
    if (PRE_FUNDING_STEPS.includes(room.step)) {
      if (timeSinceActivity > TIMEOUTS.PRE_FUNDING) {
        await this.expireRoom(room, "pre_funding");
        return true;
      }
    }

    // Check funding timeout
    if (FUNDING_STEPS.includes(room.step)) {
      if (timeSinceActivity > TIMEOUTS.FUNDING) {
        await this.expireRoom(room, "funding");
        return true;
      }
    }

    return false;
  },

  /**
   * Expire a room due to timeout
   */
  async expireRoom(room: Room, reason: "pre_funding" | "funding"): Promise<void> {
    // Update room status
    await roomService.updateRoomStep(room.id, ROOM_STEPS.EXPIRED);
    await roomService.updateRoomStatus(room.id, ROOM_STATUSES.EXPIRED);

    // Send appropriate message
    if (reason === "pre_funding") {
      await botService.sendBotMessage(
        room.id,
        "**Room Expired**\n\nThis room has been inactive for too long and has expired.\n\nNo funds were deposited, so no action is needed.",
        { action: "room_expired" }
      );
    } else {
      await botService.sendBotMessage(
        room.id,
        "**Room Expired - Deposit Timeout**\n\nThe deposit was not received within the time limit.\n\nThis room has been closed. Please create a new room to try again.",
        { action: "room_expired_deposit" }
      );
    }
  },

  /**
   * Get time remaining before a room expires (in milliseconds)
   * Returns null if room is not subject to timeout
   */
  getTimeRemaining(room: Room): number | null {
    if (room.status !== ROOM_STATUSES.OPEN) {
      return null;
    }

    const now = new Date();
    const lastActivity = new Date(room.lastActivityAt);
    const timeSinceActivity = now.getTime() - lastActivity.getTime();

    if (PRE_FUNDING_STEPS.includes(room.step)) {
      return Math.max(0, TIMEOUTS.PRE_FUNDING - timeSinceActivity);
    }

    if (FUNDING_STEPS.includes(room.step)) {
      return Math.max(0, TIMEOUTS.FUNDING - timeSinceActivity);
    }

    return null;
  },

  /**
   * Check if a room is close to expiring (within 5 minutes)
   */
  isCloseToExpiring(room: Room): boolean {
    const remaining = this.getTimeRemaining(room);
    if (remaining === null) return false;
    return remaining < 5 * 60 * 1000; // Less than 5 minutes
  },

  /**
   * Get rooms that will expire soon (for sending warnings)
   */
  async getRoomsExpiringSoon(withinMinutes: number = 5): Promise<Room[]> {
    const allRooms = await roomRepository.findAll(1000);
    const openRooms = allRooms.filter((r) => r.status === ROOM_STATUSES.OPEN);
    const threshold = withinMinutes * 60 * 1000;

    return openRooms.filter((room) => {
      const remaining = this.getTimeRemaining(room);
      return remaining !== null && remaining > 0 && remaining < threshold;
    });
  },

  /**
   * Send timeout warnings to rooms that are close to expiring
   */
  async sendTimeoutWarnings(): Promise<{ sent: number; errors: string[] }> {
    const result = { sent: 0, errors: [] as string[] };

    try {
      const expiringRooms = await this.getRoomsExpiringSoon(5);

      for (const room of expiringRooms) {
        try {
          const remaining = this.getTimeRemaining(room);
          if (remaining === null) continue;

          const minutesRemaining = Math.ceil(remaining / (60 * 1000));

          await botService.sendBotMessage(
            room.id,
            `⚠️ **Timeout Warning**\n\nThis room will expire in **${minutesRemaining} minutes** if no action is taken.`,
            { action: "timeout_warning", data: { minutesRemaining } }
          );

          result.sent++;
        } catch (error) {
          result.errors.push(`Room ${room.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
    } catch (error) {
      result.errors.push(`Failed to fetch rooms: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return result;
  },

  /**
   * Get timeout configuration info
   */
  getTimeoutConfig() {
    return {
      preFundingTimeout: {
        ms: TIMEOUTS.PRE_FUNDING,
        minutes: TIMEOUTS.PRE_FUNDING / (60 * 1000),
        applicableSteps: PRE_FUNDING_STEPS,
      },
      fundingTimeout: {
        ms: TIMEOUTS.FUNDING,
        minutes: TIMEOUTS.FUNDING / (60 * 1000),
        applicableSteps: FUNDING_STEPS,
      },
    };
  },
};
