import { eq, desc, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { rooms, participants } from "@/db/schema";
import type { Room, NewRoom, Participant, NewParticipant } from "@/types";

export const roomRepository = {
  async findAll(limit = 50): Promise<Room[]> {
    return db.select().from(rooms).orderBy(desc(rooms.createdAt)).limit(limit);
  },

  async findById(id: string): Promise<Room | null> {
    const result = await db.query.rooms.findFirst({
      where: eq(rooms.id, id),
    });
    return result ?? null;
  },

  async findByCode(roomCode: string): Promise<Room | null> {
    const result = await db.query.rooms.findFirst({
      where: eq(rooms.roomCode, roomCode.toUpperCase()),
    });
    return result ?? null;
  },

  async findByEscrowAddress(escrowAddress: string): Promise<Room | null> {
    const result = await db.query.rooms.findFirst({
      where: eq(rooms.escrowAddress, escrowAddress),
    });
    return result ?? null;
  },

  async findByCreatorId(creatorId: string, limit = 50): Promise<Room[]> {
    return db
      .select()
      .from(rooms)
      .where(eq(rooms.creatorId, creatorId))
      .orderBy(desc(rooms.createdAt))
      .limit(limit);
  },

  async create(data: NewRoom): Promise<Room> {
    const [created] = await db.insert(rooms).values(data).returning();
    return created;
  },

  async update(id: string, data: Partial<NewRoom>): Promise<Room | null> {
    const [updated] = await db
      .update(rooms)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(rooms.id, id))
      .returning();
    return updated ?? null;
  },

  async updateStatus(id: string, status: string): Promise<Room | null> {
    return this.update(id, { status });
  },

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(rooms).where(eq(rooms.id, id));
    return (result.rowCount ?? 0) > 0;
  },
};

export const participantRepository = {
  async findByRoomId(roomId: string): Promise<Participant[]> {
    return db.query.participants.findMany({
      where: eq(participants.roomId, roomId),
      with: {
        user: true,
      },
    });
  },

  async findByRoomAndUser(roomId: string, userId: string): Promise<Participant | null> {
    const result = await db.query.participants.findFirst({
      where: (fields, { eq: eq2, and: and2 }) =>
        and2(eq2(fields.roomId, roomId), eq2(fields.userId, userId)),
    });
    return result ?? null;
  },

  async findByUserId(userId: string): Promise<Participant[]> {
    return db.select().from(participants).where(eq(participants.userId, userId));
  },

  async findByRole(roomId: string, role: string): Promise<Participant | null> {
    const result = await db.query.participants.findFirst({
      where: (fields, { eq: eq2, and: and2 }) =>
        and2(eq2(fields.roomId, roomId), eq2(fields.role, role)),
    });
    return result ?? null;
  },

  async create(data: NewParticipant): Promise<Participant> {
    const [created] = await db.insert(participants).values(data).returning();
    return created;
  },

  async update(id: string, data: Partial<NewParticipant>): Promise<Participant | null> {
    const [updated] = await db
      .update(participants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(participants.id, id))
      .returning();
    return updated ?? null;
  },

  async updateByRoomAndUser(
    roomId: string,
    userId: string,
    data: Partial<NewParticipant>
  ): Promise<Participant | null> {
    const [updated] = await db
      .update(participants)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(participants.roomId, roomId), eq(participants.userId, userId)))
      .returning();
    return updated ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(participants).where(eq(participants.id, id));
    return (result.rowCount ?? 0) > 0;
  },

  async deleteByRoomId(roomId: string): Promise<boolean> {
    const result = await db.delete(participants).where(eq(participants.roomId, roomId));
    return (result.rowCount ?? 0) > 0;
  },
};
