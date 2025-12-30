/**
 * Transaction Service
 *
 * Handles recording and retrieving transaction history.
 * Transactions are created when deals are completed (release) or refunded (cancel).
 */

import { transactionRepository, type TransactionFilters, type PaginationOptions } from "@/repositories/transaction.repository";
import { generateId } from "@/utils";
import { formatUsdtAmount } from "@/config/chains";
import type { Transaction, Room, Participant } from "@/types";
import { TRANSACTION_STATUSES } from "@/types";

export interface CreateTransactionData {
  room: Room;
  sender: Participant;
  receiver: Participant;
  depositTxHash: string;
  releaseTxHash: string;
  status: "COMPLETED" | "REFUNDED";
}

export interface TransactionListResult {
  transactions: Transaction[];
  total: number;
  hasMore: boolean;
}

export const transactionService = {
  /**
   * Record a completed transaction (release or refund)
   */
  async recordTransaction(data: CreateTransactionData): Promise<Transaction> {
    const { room, sender, receiver, depositTxHash, releaseTxHash, status } = data;

    if (!room.amount || !room.feePayer) {
      throw new Error("Room amount and fee payer are required");
    }

    // Calculate fee
    const amount = BigInt(room.amount);
    const fee = amount / 100n; // 1%

    const transaction = await transactionRepository.create({
      id: generateId("tx"),
      roomId: room.id,
      chainId: room.chainId,
      senderId: sender.userId,
      receiverId: receiver.userId,
      amount: room.amount,
      fee: fee.toString(),
      feePayer: room.feePayer,
      depositTxHash,
      releaseTxHash,
      status,
      completedAt: new Date(),
    });

    return transaction;
  },

  /**
   * Get transaction by ID
   */
  async getTransactionById(id: string): Promise<Transaction | null> {
    return transactionRepository.findById(id);
  },

  /**
   * Get transaction for a room
   */
  async getTransactionByRoomId(roomId: string): Promise<Transaction | null> {
    return transactionRepository.findByRoomId(roomId);
  },

  /**
   * Get public transaction history with filters and pagination
   */
  async getTransactionHistory(
    filters: TransactionFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<TransactionListResult> {
    const { limit = 20, offset = 0 } = pagination;

    const [transactions, total] = await Promise.all([
      transactionRepository.findAll(filters, { limit: limit + 1, offset }), // +1 to check hasMore
      transactionRepository.count(filters),
    ]);

    const hasMore = transactions.length > limit;
    if (hasMore) {
      transactions.pop(); // Remove the extra item
    }

    return {
      transactions,
      total,
      hasMore,
    };
  },

  /**
   * Get transactions by chain
   */
  async getTransactionsByChain(chainId: number, limit = 50): Promise<Transaction[]> {
    return transactionRepository.findByChainId(chainId, limit);
  },

  /**
   * Get transactions where user is sender
   */
  async getTransactionsAsSender(userId: string, limit = 50): Promise<Transaction[]> {
    return transactionRepository.findBySenderId(userId, limit);
  },

  /**
   * Get transactions where user is receiver
   */
  async getTransactionsAsReceiver(userId: string, limit = 50): Promise<Transaction[]> {
    return transactionRepository.findByReceiverId(userId, limit);
  },

  /**
   * Get all transactions for a user (as sender or receiver)
   */
  async getUserTransactions(userId: string, limit = 50): Promise<Transaction[]> {
    const [asSender, asReceiver] = await Promise.all([
      transactionRepository.findBySenderId(userId, limit),
      transactionRepository.findByReceiverId(userId, limit),
    ]);

    // Merge and sort by date
    const all = [...asSender, ...asReceiver];
    const unique = all.filter(
      (tx, index, self) => index === self.findIndex((t) => t.id === tx.id)
    );

    return unique
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, limit);
  },

  /**
   * Get transaction statistics
   */
  async getStats(): Promise<{
    totalTransactions: number;
    totalVolume: string;
    totalVolumeFormatted: string;
    completedCount: number;
    refundedCount: number;
  }> {
    const stats = await transactionRepository.getStats();

    return {
      ...stats,
      totalVolumeFormatted: formatUsdtAmount(stats.totalVolume),
    };
  },

  /**
   * Format transaction for public display (hide sensitive info)
   */
  formatForPublic(transaction: Transaction): {
    id: string;
    chainId: number;
    amount: string;
    amountFormatted: string;
    fee: string;
    feeFormatted: string;
    feePayer: string;
    status: string;
    completedAt: Date;
    depositTxHash: string;
    releaseTxHash: string;
  } {
    return {
      id: transaction.id,
      chainId: transaction.chainId,
      amount: transaction.amount,
      amountFormatted: formatUsdtAmount(transaction.amount),
      fee: transaction.fee,
      feeFormatted: formatUsdtAmount(transaction.fee),
      feePayer: transaction.feePayer,
      status: transaction.status,
      completedAt: transaction.completedAt,
      depositTxHash: transaction.depositTxHash,
      releaseTxHash: transaction.releaseTxHash,
    };
  },
};
