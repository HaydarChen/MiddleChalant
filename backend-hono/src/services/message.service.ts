import { messageRepository } from "@/repositories";
import { roomRepository } from "@/repositories";
import { generateId } from "@/utils";
import type { Message, SendMessageRequest, BotMessageMetadata, SenderType } from "@/types";
import { SENDER_TYPES } from "@/types";

export const messageService = {
  async getMessagesByRoomId(
    roomId: string,
    options: { limit?: number; cursor?: string } = {}
  ): Promise<{ messages: Message[]; hasMore: boolean }> {
    const limit = options.limit ?? 30;
    const messages = await messageRepository.findByRoomId(roomId, {
      limit: limit + 1, // Fetch one extra to check if there are more
      cursor: options.cursor,
    });

    const hasMore = messages.length > limit;
    if (hasMore) {
      messages.pop(); // Remove the extra item
    }

    return { messages, hasMore };
  },

  async sendMessage(
    roomId: string,
    senderId: string,
    data: SendMessageRequest
  ): Promise<{ ok: boolean; message?: Message; error?: string }> {
    // Verify room exists
    const room = await roomRepository.findById(roomId);
    if (!room) {
      return { ok: false, error: "Room not found" };
    }

    const message = await messageRepository.create({
      id: generateId("msg"),
      roomId,
      senderId,
      senderType: SENDER_TYPES.USER,
      text: data.text,
      createdAt: new Date(),
    });

    return { ok: true, message };
  },

  async sendBotMessage(
    roomId: string,
    text: string,
    metadata?: BotMessageMetadata
  ): Promise<{ ok: boolean; message?: Message; error?: string }> {
    // Verify room exists
    const room = await roomRepository.findById(roomId);
    if (!room) {
      return { ok: false, error: "Room not found" };
    }

    const message = await messageRepository.create({
      id: generateId("msg"),
      roomId,
      senderId: null, // Bot has no user ID
      senderType: SENDER_TYPES.BOT,
      text,
      metadata: metadata ? JSON.stringify(metadata) : null,
      createdAt: new Date(),
    });

    return { ok: true, message };
  },

  async sendSystemMessage(
    roomId: string,
    text: string
  ): Promise<{ ok: boolean; message?: Message; error?: string }> {
    const message = await messageRepository.create({
      id: generateId("msg"),
      roomId,
      senderId: null,
      senderType: SENDER_TYPES.SYSTEM,
      text,
      createdAt: new Date(),
    });

    return { ok: true, message };
  },

  async deleteMessage(messageId: string): Promise<boolean> {
    return messageRepository.delete(messageId);
  },
};
