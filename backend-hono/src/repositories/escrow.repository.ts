import { eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { escrows, lastBlocks } from "@/db/schema";
import type { Escrow, NewEscrow } from "@/types";

export const escrowRepository = {
  async findById(id: string): Promise<Escrow | null> {
    const result = await db.query.escrows.findFirst({
      where: eq(escrows.id, id),
    });
    return result ?? null;
  },

  async findByAddress(chainId: number, escrowAddress: string): Promise<Escrow | null> {
    const result = await db.query.escrows.findFirst({
      where: (fields, { eq: eq2, and }) =>
        and(eq2(fields.chainId, chainId), eq2(fields.escrowAddress, escrowAddress.toLowerCase())),
    });
    return result ?? null;
  },

  async findByUserAddress(address: string): Promise<Escrow[]> {
    const lowerAddress = address.toLowerCase();
    return db
      .select()
      .from(escrows)
      .where(or(eq(escrows.buyer, lowerAddress), eq(escrows.seller, lowerAddress)));
  },

  async create(data: NewEscrow): Promise<Escrow> {
    const [created] = await db.insert(escrows).values(data).returning();
    return created;
  },

  async upsert(data: NewEscrow): Promise<Escrow> {
    const [result] = await db
      .insert(escrows)
      .values(data)
      .onConflictDoUpdate({
        target: escrows.id,
        set: {
          status: data.status,
          lastTxHash: data.lastTxHash,
          lastBlockNumber: data.lastBlockNumber,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  },

  async updateStatus(
    id: string,
    status: string,
    txHash?: string,
    blockNumber?: string
  ): Promise<Escrow | null> {
    const [updated] = await db
      .update(escrows)
      .set({
        status,
        lastTxHash: txHash,
        lastBlockNumber: blockNumber,
        updatedAt: new Date(),
      })
      .where(eq(escrows.id, id))
      .returning();
    return updated ?? null;
  },
};

export const lastBlockRepository = {
  async findByChainId(chainId: number): Promise<{ blockNumber: string } | null> {
    const result = await db.query.lastBlocks.findFirst({
      where: eq(lastBlocks.chainId, chainId),
    });
    return result ?? null;
  },

  async upsert(chainId: number, blockNumber: string): Promise<void> {
    await db
      .insert(lastBlocks)
      .values({ chainId, blockNumber })
      .onConflictDoUpdate({
        target: lastBlocks.chainId,
        set: { blockNumber },
      });
  },
};
