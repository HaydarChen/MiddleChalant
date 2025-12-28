import { roomRepository, participantRepository } from "@/repositories";
import { generateId } from "@/utils";
import type { Room, CreateRoomRequest, JoinRoomRequest } from "@/types";

export const roomService = {
  async getAllRooms(limit = 50): Promise<Room[]> {
    return roomRepository.findAll(limit);
  },

  async getRoomById(id: string): Promise<Room | null> {
    return roomRepository.findById(id);
  },

  async createRoom(data: CreateRoomRequest): Promise<Room> {
    const roomId = generateId("room");

    return roomRepository.create({
      id: roomId,
      name: data.name,
      chainId: data.chainId,
      tokenAddress: data.tokenAddress,
      amount: data.amount,
      status: "AWAITING_DEPOSIT",
    });
  },

  async joinRoom(roomId: string, data: JoinRoomRequest): Promise<{ ok: boolean; error?: string }> {
    const room = await roomRepository.findById(roomId);
    if (!room) {
      return { ok: false, error: "Room not found" };
    }

    // Check if user already joined
    const existing = await participantRepository.findByRoomAndAddress(roomId, data.address);
    if (existing) {
      return { ok: false, error: "Already joined this room" };
    }

    // Check if role is already taken
    const participants = await participantRepository.findByRoomId(roomId);
    const roleTaken = participants.some((p) => p.role === data.role);
    if (roleTaken) {
      return { ok: false, error: `Role ${data.role} is already taken` };
    }

    await participantRepository.create({
      id: generateId("part"),
      roomId,
      address: data.address.toLowerCase(),
      role: data.role,
    });

    return { ok: true };
  },

  async getRoomParticipants(roomId: string) {
    return participantRepository.findByRoomId(roomId);
  },

  async updateRoomStatus(roomId: string, status: string): Promise<Room | null> {
    return roomRepository.updateStatus(roomId, status);
  },

  async linkEscrowToRoom(
    roomId: string,
    escrowAddress: string,
    factoryAddress: string
  ): Promise<Room | null> {
    return roomRepository.update(roomId, {
      escrowAddress,
      factoryAddress,
    });
  },
};
