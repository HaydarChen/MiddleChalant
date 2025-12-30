import type { Context } from "hono";
import { roomService } from "@/services";
import { NotFoundError, BadRequestError } from "@/middlewares";
import { getUser } from "@/middlewares/auth.middleware";
import type { CreateRoomRequest, JoinRoomByCodeRequest } from "@/types";
import { SUPPORTED_CHAINS } from "@/config/chains";

export const roomController = {
  /**
   * GET /chains
   * Get supported chains for room creation
   */
  async getSupportedChains(c: Context) {
    const chains = Object.values(SUPPORTED_CHAINS).map((chain) => ({
      id: chain.id,
      name: chain.name,
      shortName: chain.shortName,
    }));
    return c.json({ ok: true, data: chains });
  },

  /**
   * GET /rooms
   * Get all rooms
   */
  async getAll(c: Context) {
    const limit = Number(c.req.query("limit") ?? 50);
    const rooms = await roomService.getAllRooms(limit);
    return c.json({ ok: true, data: rooms });
  },

  /**
   * GET /rooms/my
   * Get current user's rooms
   */
  async getMyRooms(c: Context) {
    const user = getUser(c)!;
    const rooms = await roomService.getRoomsByUserId(user.id);

    // Fetch participants for each room
    const roomsWithParticipants = await Promise.all(
      rooms.map(async (room) => {
        const participants = await roomService.getRoomParticipants(room.id);
        return { ...room, participants };
      })
    );

    return c.json({ ok: true, data: roomsWithParticipants });
  },

  /**
   * GET /rooms/:roomId
   * Get room by ID
   */
  async getById(c: Context) {
    const roomId = c.req.param("roomId");
    const room = await roomService.getRoomById(roomId);

    if (!room) {
      throw new NotFoundError("Room not found");
    }

    const participants = await roomService.getRoomParticipants(roomId);

    return c.json({
      ok: true,
      data: {
        ...room,
        participants,
      },
    });
  },

  /**
   * GET /rooms/code/:roomCode
   * Get room by code
   */
  async getByCode(c: Context) {
    const roomCode = c.req.param("roomCode");
    const room = await roomService.getRoomByCode(roomCode);

    if (!room) {
      throw new NotFoundError("Room not found");
    }

    const participants = await roomService.getRoomParticipants(room.id);

    return c.json({
      ok: true,
      data: {
        ...room,
        participants,
      },
    });
  },

  /**
   * POST /rooms
   * Create a new room
   */
  async create(c: Context) {
    const user = getUser(c)!; // requireAuth ensures user is not null
    const body = await c.req.json<CreateRoomRequest>();

    try {
      const room = await roomService.createRoom(body, user.id);

      // Creator automatically joins the room
      await roomService.joinRoomByCode(room.roomCode, user.id);

      // Get updated room with participant
      const updatedRoom = await roomService.getRoomById(room.id);
      const participants = await roomService.getRoomParticipants(room.id);

      return c.json({
        ok: true,
        data: {
          ...updatedRoom,
          participants,
        },
      }, 201);
    } catch (error) {
      throw new BadRequestError(error instanceof Error ? error.message : "Failed to create room");
    }
  },

  /**
   * POST /rooms/join
   * Join a room by code
   */
  async joinByCode(c: Context) {
    const user = getUser(c)!; // requireAuth ensures user is not null
    const body = await c.req.json<JoinRoomByCodeRequest>();

    if (!body.roomCode) {
      throw new BadRequestError("Room code is required");
    }

    const result = await roomService.joinRoomByCode(body.roomCode, user.id);

    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 400);
    }

    const participants = await roomService.getRoomParticipants(result.room!.id);

    return c.json({
      ok: true,
      data: {
        ...result.room,
        participants,
      },
    });
  },

  /**
   * GET /rooms/:roomId/participants
   * Get room participants
   */
  async getParticipants(c: Context) {
    const roomId = c.req.param("roomId");
    const room = await roomService.getRoomById(roomId);

    if (!room) {
      throw new NotFoundError("Room not found");
    }

    const participants = await roomService.getRoomParticipants(roomId);
    return c.json({ ok: true, data: participants });
  },
};
