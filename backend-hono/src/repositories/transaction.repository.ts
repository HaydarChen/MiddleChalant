import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions } from "@/db/schema";
import type { Transaction, NewTransaction } from "@/types";

export interface TransactionFilters {
  chainId?: number;
  startDate?: Date;
  endDate?: Date;
  status?: string;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export const transactionRepository = {
  async findAll(
    filters: TransactionFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<Transaction[]> {
    const { limit = 50, offset = 0 } = pagination;
    const conditions = [];

    if (filters.chainId) {
      conditions.push(eq(transactions.chainId, filters.chainId));
    }

    if (filters.status) {
      conditions.push(eq(transactions.status, filters.status));
    }

    if (filters.startDate) {
      conditions.push(gte(transactions.completedAt, filters.startDate));
    }

    if (filters.endDate) {
      conditions.push(lte(transactions.completedAt, filters.endDate));
    }

    const query = db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.completedAt))
      .limit(limit)
      .offset(offset);

    if (conditions.length > 0) {
      return query.where(and(...conditions));
    }

    return query;
  },

  async findById(id: string): Promise<Transaction | null> {
    const result = await db.query.transactions.findFirst({
      where: eq(transactions.id, id),
    });
    return result ?? null;
  },

  async findByRoomId(roomId: string): Promise<Transaction | null> {
    const result = await db.query.transactions.findFirst({
      where: eq(transactions.roomId, roomId),
    });
    return result ?? null;
  },

  async findByChainId(chainId: number, limit = 50): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(eq(transactions.chainId, chainId))
      .orderBy(desc(transactions.completedAt))
      .limit(limit);
  },

  async findBySenderId(senderId: string, limit = 50): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(eq(transactions.senderId, senderId))
      .orderBy(desc(transactions.completedAt))
      .limit(limit);
  },

  async findByReceiverId(receiverId: string, limit = 50): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(eq(transactions.receiverId, receiverId))
      .orderBy(desc(transactions.completedAt))
      .limit(limit);
  },

  async create(data: NewTransaction): Promise<Transaction> {
    const [created] = await db.insert(transactions).values(data).returning();
    return created;
  },

  async count(filters: TransactionFilters = {}): Promise<number> {
    const conditions = [];

    if (filters.chainId) {
      conditions.push(eq(transactions.chainId, filters.chainId));
    }

    if (filters.status) {
      conditions.push(eq(transactions.status, filters.status));
    }

    if (filters.startDate) {
      conditions.push(gte(transactions.completedAt, filters.startDate));
    }

    if (filters.endDate) {
      conditions.push(lte(transactions.completedAt, filters.endDate));
    }

    const query = db
      .select({ count: sql<number>`count(*)` })
      .from(transactions);

    let result;
    if (conditions.length > 0) {
      [result] = await query.where(and(...conditions));
    } else {
      [result] = await query;
    }

    return Number(result.count);
  },

  async getStats(): Promise<{
    totalTransactions: number;
    totalVolume: string;
    completedCount: number;
    refundedCount: number;
  }> {
    const allTransactions = await db.select().from(transactions);

    const totalVolume = allTransactions.reduce((sum, tx) => {
      return sum + BigInt(tx.amount);
    }, 0n);

    return {
      totalTransactions: allTransactions.length,
      totalVolume: totalVolume.toString(),
      completedCount: allTransactions.filter((tx) => tx.status === "COMPLETED").length,
      refundedCount: allTransactions.filter((tx) => tx.status === "REFUNDED").length,
    };
  },
};
