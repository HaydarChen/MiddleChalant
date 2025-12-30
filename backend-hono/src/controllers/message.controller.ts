import type { Context } from "hono";
import { messageService } from "@/services";
import { getUser } from "@/middlewares";
import { BadRequestError, UnauthorizedError } from "@/middlewares";
import type { SendMessageRequest } from "@/types";

export const messageController = {
  /**
   * GET /rooms/:roomId/messages
   * Get messages for a room with pagination
   */
  async getByRoomId(c: Context) {
    const roomId = c.req.param("roomId");
    const limit = Number(c.req.query("limit") ?? 30);
    const cursor = c.req.query("cursor");

    const { messages, hasMore } = await messageService.getMessagesByRoomId(roomId, {
      limit,
      cursor,
    });

    return c.json({
      ok: true,
      data: messages,
      hasMore,
      cursor: messages.length > 0 ? messages[messages.length - 1].id : null,
    });
  },

  /**
   * POST /rooms/:roomId/messages
   * Send a message in a room (requires auth)
   */
  async send(c: Context) {
    const roomId = c.req.param("roomId");
    const user = getUser(c);

    if (!user) {
      throw new UnauthorizedError();
    }

    const body = await c.req.json<SendMessageRequest>();

    if (!body.text || body.text.trim().length === 0) {
      throw new BadRequestError("Message text is required");
    }

    if (body.text.length > 2000) {
      throw new BadRequestError("Message too long (max 2000 characters)");
    }

    const result = await messageService.sendMessage(roomId, user.id, {
      text: body.text.trim(),
    });

    if (!result.ok) {
      throw new BadRequestError(result.error ?? "Failed to send message");
    }

    return c.json({ ok: true, data: result.message }, 201);
  },
};
