import { eq, desc, lt, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { messages } from "@/db/schema";
import type { Message, NewMessage } from "@/types";

export const messageRepository = {
  async findByRoomId(
    roomId: string,
    options: { limit?: number; cursor?: string } = {}
  ): Promise<Message[]> {
    const { limit = 30, cursor } = options;

    if (cursor) {
      return db
        .select()
        .from(messages)
        .where(and(eq(messages.roomId, roomId), lt(messages.id, cursor)))
        .orderBy(desc(messages.createdAt))
        .limit(limit);
    }

    return db
      .select()
      .from(messages)
      .where(eq(messages.roomId, roomId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  },

  async findById(id: string): Promise<Message | null> {
    const result = await db.query.messages.findFirst({
      where: eq(messages.id, id),
    });
    return result ?? null;
  },

  async create(data: NewMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(data).returning();
    return created;
  },

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(messages).where(eq(messages.id, id));
    return (result.rowCount ?? 0) > 0;
  },

  async deleteByRoomId(roomId: string): Promise<number> {
    const result = await db.delete(messages).where(eq(messages.roomId, roomId));
    return result.rowCount ?? 0;
  },
};
