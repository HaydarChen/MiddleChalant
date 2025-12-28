import { messageRepository } from "@/repositories";
import { roomRepository } from "@/repositories";
import { generateId } from "@/utils";
import type { Message, SendMessageRequest } from "@/types";

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
    senderAddress: string,
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
      sender: senderAddress,
      text: data.text,
      createdAt: new Date(),
    });

    return { ok: true, message };
  },

  async deleteMessage(messageId: string): Promise<boolean> {
    return messageRepository.delete(messageId);
  },
};
