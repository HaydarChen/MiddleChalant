import { roomRepository, participantRepository } from "@/repositories";
import { generateId, generateRoomCode } from "@/utils";
import { getUsdtAddress, isChainSupported } from "@/config/chains";
import type { Room, CreateRoomRequest, RoomStep, RoomStatus, Participant } from "@/types";
import { ROOM_STEPS, ROOM_STATUSES } from "@/types";

export const roomService = {
  async getAllRooms(limit = 50): Promise<Room[]> {
    return roomRepository.findAll(limit);
  },

  async getRoomById(id: string): Promise<Room | null> {
    return roomRepository.findById(id);
  },

  async getRoomByCode(roomCode: string): Promise<Room | null> {
    return roomRepository.findByCode(roomCode);
  },

  async createRoom(data: CreateRoomRequest, creatorId: string): Promise<Room> {
    // Validate chain is supported
    if (!isChainSupported(data.chainId)) {
      throw new Error(`Chain ${data.chainId} is not supported`);
    }

    const tokenAddress = getUsdtAddress(data.chainId);
    if (!tokenAddress) {
      throw new Error(`USDT address not configured for chain ${data.chainId}`);
    }

    const roomId = generateId("room");
    const roomCode = generateRoomCode();

    return roomRepository.create({
      id: roomId,
      name: data.name,
      roomCode,
      chainId: data.chainId,
      tokenAddress,
      creatorId,
      step: ROOM_STEPS.WAITING_FOR_PEER,
      status: ROOM_STATUSES.OPEN,
    });
  },

  async joinRoomByCode(roomCode: string, userId: string): Promise<{ ok: boolean; room?: Room; error?: string }> {
    const room = await roomRepository.findByCode(roomCode.toUpperCase());
    if (!room) {
      return { ok: false, error: "Room not found" };
    }

    if (room.status !== ROOM_STATUSES.OPEN) {
      return { ok: false, error: "Room is no longer accepting participants" };
    }

    // Check if user already joined
    const existing = await participantRepository.findByRoomAndUser(room.id, userId);
    if (existing) {
      return { ok: false, error: "Already joined this room" };
    }

    // Check if room is full (max 2 participants)
    const participants = await participantRepository.findByRoomId(room.id);
    if (participants.length >= 2) {
      return { ok: false, error: "Room is full" };
    }

    // Add participant (role will be selected later)
    await participantRepository.create({
      id: generateId("part"),
      roomId: room.id,
      userId,
    });

    // If room now has 2 participants, advance to role selection
    if (participants.length === 1) {
      await this.updateRoomStep(room.id, ROOM_STEPS.ROLE_SELECTION);
    }

    // Update last activity
    await this.updateLastActivity(room.id);

    // Return updated room
    const updatedRoom = await roomRepository.findById(room.id);
    return { ok: true, room: updatedRoom || room };
  },

  async getRoomParticipants(roomId: string): Promise<Participant[]> {
    return participantRepository.findByRoomId(roomId);
  },

  async getParticipantByUserId(roomId: string, userId: string): Promise<Participant | null> {
    return participantRepository.findByRoomAndUser(roomId, userId);
  },

  async updateRoomStatus(roomId: string, status: RoomStatus): Promise<Room | null> {
    return roomRepository.updateStatus(roomId, status);
  },

  async updateRoomStep(roomId: string, step: RoomStep): Promise<Room | null> {
    return roomRepository.update(roomId, { step });
  },

  async updateLastActivity(roomId: string): Promise<void> {
    await roomRepository.update(roomId, { lastActivityAt: new Date() });
  },

  async setRoomAmount(roomId: string, amount: string): Promise<Room | null> {
    return roomRepository.update(roomId, { amount });
  },

  async setFeePayer(roomId: string, feePayer: string): Promise<Room | null> {
    return roomRepository.update(roomId, { feePayer });
  },

  async setEscrowAddress(roomId: string, escrowAddress: string): Promise<Room | null> {
    return roomRepository.update(roomId, { escrowAddress });
  },

  async setDepositTxHash(roomId: string, txHash: string): Promise<Room | null> {
    return roomRepository.update(roomId, { depositTxHash: txHash });
  },

  async setReleaseTxHash(roomId: string, txHash: string): Promise<Room | null> {
    return roomRepository.update(roomId, { releaseTxHash: txHash });
  },
};
