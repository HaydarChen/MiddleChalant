import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { disputes } from "@/db/schema";
import type { Dispute, NewDispute } from "@/types";

export const disputeRepository = {
  async findAll(limit = 50): Promise<Dispute[]> {
    return db.select().from(disputes).orderBy(desc(disputes.createdAt)).limit(limit);
  },

  async findById(id: string): Promise<Dispute | null> {
    const result = await db.query.disputes.findFirst({
      where: eq(disputes.id, id),
    });
    return result ?? null;
  },

  async findByRoomId(roomId: string): Promise<Dispute[]> {
    return db
      .select()
      .from(disputes)
      .where(eq(disputes.roomId, roomId))
      .orderBy(desc(disputes.createdAt));
  },

  async findByReporterId(reporterId: string, limit = 50): Promise<Dispute[]> {
    return db
      .select()
      .from(disputes)
      .where(eq(disputes.reporterId, reporterId))
      .orderBy(desc(disputes.createdAt))
      .limit(limit);
  },

  async findByStatus(status: string, limit = 50): Promise<Dispute[]> {
    return db
      .select()
      .from(disputes)
      .where(eq(disputes.status, status))
      .orderBy(desc(disputes.createdAt))
      .limit(limit);
  },

  async create(data: NewDispute): Promise<Dispute> {
    const [created] = await db.insert(disputes).values(data).returning();
    return created;
  },

  async update(id: string, data: Partial<NewDispute>): Promise<Dispute | null> {
    const [updated] = await db
      .update(disputes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(disputes.id, id))
      .returning();
    return updated ?? null;
  },

  async updateStatus(id: string, status: string): Promise<Dispute | null> {
    return this.update(id, { status });
  },

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(disputes).where(eq(disputes.id, id));
    return (result.rowCount ?? 0) > 0;
  },
};
