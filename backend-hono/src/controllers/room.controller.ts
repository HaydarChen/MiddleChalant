import type { Context } from "hono";
import { roomService } from "@/services";
import { NotFoundError } from "@/middlewares";
import type { CreateRoomRequest, JoinRoomRequest } from "@/types";

export const roomController = {
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
   * POST /rooms
   * Create a new room
   */
  async create(c: Context) {
    const body = await c.req.json<CreateRoomRequest>();
    const room = await roomService.createRoom(body);
    return c.json({ ok: true, data: room }, 201);
  },

  /**
   * POST /rooms/:roomId/join
   * Join a room as buyer or seller
   */
  async join(c: Context) {
    const roomId = c.req.param("roomId");
    const body = await c.req.json<JoinRoomRequest>();

    const result = await roomService.joinRoom(roomId, body);

    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 400);
    }

    return c.json({ ok: true, roomId, ...body });
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
