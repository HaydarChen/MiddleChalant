/**
 * Dispute Service
 *
 * Handles dispute creation and management.
 * In a production system, this would integrate with an admin dashboard
 * and possibly external arbitration services.
 *
 * Current implementation is a mock that stores disputes for review.
 */

import { disputeRepository } from "@/repositories";
import { roomService } from "./room.service";
import { botService } from "./bot.service";
import { generateId } from "@/utils";
import type { Dispute, CreateDisputeRequest } from "@/types";
import { ROOM_STATUSES, DISPUTE_STATUSES } from "@/types";

export interface DisputeResult {
  ok: boolean;
  dispute?: Dispute;
  error?: string;
}

export const disputeService = {
  /**
   * Create a new dispute for a room
   */
  async createDispute(
    roomId: string,
    reporterId: string,
    data: CreateDisputeRequest
  ): Promise<DisputeResult> {
    // Verify room exists
    const room = await roomService.getRoomById(roomId);
    if (!room) {
      return { ok: false, error: "Room not found" };
    }

    // Verify reporter is a participant
    const participant = await roomService.getParticipantByUserId(roomId, reporterId);
    if (!participant) {
      return { ok: false, error: "You are not a participant in this room" };
    }

    // Check if there's already an active dispute for this room
    const existingDisputes = await disputeRepository.findByRoomId(roomId);
    const activeDispute = existingDisputes.find(
      (d) => d.status !== DISPUTE_STATUSES.RESOLVED
    );
    if (activeDispute) {
      return { ok: false, error: "There is already an active dispute for this room" };
    }

    // Validate explanation
    if (!data.explanation || data.explanation.trim().length < 10) {
      return { ok: false, error: "Please provide a detailed explanation (at least 10 characters)" };
    }

    // Create the dispute
    const dispute = await disputeRepository.create({
      id: generateId("disp"),
      roomId,
      reporterId,
      explanation: data.explanation.trim(),
      proofUrl: data.proofUrl || null,
      status: DISPUTE_STATUSES.PENDING,
    });

    // Update room status to DISPUTED
    await roomService.updateRoomStatus(roomId, ROOM_STATUSES.DISPUTED);

    // Send bot notification
    await botService.sendBotMessage(
      roomId,
      `**Dispute Filed**\n\n` +
        `A dispute has been filed for this transaction.\n\n` +
        `**Reason:** ${data.explanation.trim().substring(0, 200)}${data.explanation.length > 200 ? "..." : ""}\n\n` +
        `The transaction is now on hold pending review. Our team will investigate and contact both parties.\n\n` +
        `Dispute ID: \`${dispute.id}\``,
      { action: "dispute_filed", data: { disputeId: dispute.id } }
    );

    return { ok: true, dispute };
  },

  /**
   * Get dispute by ID
   */
  async getDisputeById(id: string): Promise<Dispute | null> {
    return disputeRepository.findById(id);
  },

  /**
   * Get disputes for a room
   */
  async getDisputesByRoomId(roomId: string): Promise<Dispute[]> {
    return disputeRepository.findByRoomId(roomId);
  },

  /**
   * Get disputes filed by a user
   */
  async getDisputesByReporterId(reporterId: string, limit = 50): Promise<Dispute[]> {
    return disputeRepository.findByReporterId(reporterId, limit);
  },

  /**
   * Get all disputes with a specific status
   */
  async getDisputesByStatus(status: string, limit = 50): Promise<Dispute[]> {
    return disputeRepository.findByStatus(status, limit);
  },

  /**
   * Get all pending disputes (for admin dashboard)
   */
  async getPendingDisputes(limit = 50): Promise<Dispute[]> {
    return disputeRepository.findByStatus(DISPUTE_STATUSES.PENDING, limit);
  },

  /**
   * Update dispute status (admin action)
   * In production, this would be protected by admin auth
   */
  async updateDisputeStatus(
    disputeId: string,
    status: string,
    adminNotes?: string
  ): Promise<DisputeResult> {
    const dispute = await disputeRepository.findById(disputeId);
    if (!dispute) {
      return { ok: false, error: "Dispute not found" };
    }

    const updateData: Partial<Dispute> = { status };
    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    const updated = await disputeRepository.update(disputeId, updateData);
    if (!updated) {
      return { ok: false, error: "Failed to update dispute" };
    }

    // Send notification based on status change
    if (status === DISPUTE_STATUSES.UNDER_REVIEW) {
      await botService.sendBotMessage(
        dispute.roomId,
        `**Dispute Under Review**\n\n` +
          `Your dispute is now being reviewed by our team.\n\n` +
          `Dispute ID: \`${disputeId}\``,
        { action: "dispute_under_review", data: { disputeId } }
      );
    } else if (status === DISPUTE_STATUSES.RESOLVED) {
      await botService.sendBotMessage(
        dispute.roomId,
        `**Dispute Resolved**\n\n` +
          `The dispute has been resolved.\n\n` +
          `${adminNotes ? `Resolution: ${adminNotes}\n\n` : ""}` +
          `Dispute ID: \`${disputeId}\``,
        { action: "dispute_resolved", data: { disputeId } }
      );
    }

    return { ok: true, dispute: updated };
  },

  /**
   * Add admin notes to a dispute
   */
  async addAdminNotes(disputeId: string, notes: string): Promise<DisputeResult> {
    const dispute = await disputeRepository.findById(disputeId);
    if (!dispute) {
      return { ok: false, error: "Dispute not found" };
    }

    const existingNotes = dispute.adminNotes || "";
    const timestamp = new Date().toISOString();
    const newNotes = existingNotes
      ? `${existingNotes}\n\n[${timestamp}] ${notes}`
      : `[${timestamp}] ${notes}`;

    const updated = await disputeRepository.update(disputeId, { adminNotes: newNotes });
    if (!updated) {
      return { ok: false, error: "Failed to update dispute" };
    }

    return { ok: true, dispute: updated };
  },

  /**
   * Get dispute statistics (for admin dashboard)
   */
  async getDisputeStats(): Promise<{
    total: number;
    pending: number;
    underReview: number;
    resolved: number;
  }> {
    const allDisputes = await disputeRepository.findAll(1000);

    return {
      total: allDisputes.length,
      pending: allDisputes.filter((d) => d.status === DISPUTE_STATUSES.PENDING).length,
      underReview: allDisputes.filter((d) => d.status === DISPUTE_STATUSES.UNDER_REVIEW).length,
      resolved: allDisputes.filter((d) => d.status === DISPUTE_STATUSES.RESOLVED).length,
    };
  },
};
