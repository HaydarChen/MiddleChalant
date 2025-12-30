import type { Context } from "hono";
import { transactionService } from "@/services";
import { NotFoundError } from "@/middlewares";
import { getUser } from "@/middlewares/auth.middleware";

export const transactionController = {
  /**
   * GET /transactions
   * Get public transaction history with filters and pagination
   */
  async getTransactionHistory(c: Context) {
    // Parse filters
    const chainId = c.req.query("chainId") ? Number(c.req.query("chainId")) : undefined;
    const status = c.req.query("status");
    const startDate = c.req.query("startDate") ? new Date(c.req.query("startDate")!) : undefined;
    const endDate = c.req.query("endDate") ? new Date(c.req.query("endDate")!) : undefined;

    // Parse pagination
    const limit = Number(c.req.query("limit") ?? 20);
    const offset = Number(c.req.query("offset") ?? 0);

    const result = await transactionService.getTransactionHistory(
      { chainId, status, startDate, endDate },
      { limit, offset }
    );

    // Format for public display
    const formattedTransactions = result.transactions.map((tx) =>
      transactionService.formatForPublic(tx)
    );

    return c.json({
      ok: true,
      data: {
        transactions: formattedTransactions,
        total: result.total,
        hasMore: result.hasMore,
        limit,
        offset,
      },
    });
  },

  /**
   * GET /transactions/stats
   * Get transaction statistics
   */
  async getStats(c: Context) {
    const stats = await transactionService.getStats();

    return c.json({
      ok: true,
      data: stats,
    });
  },

  /**
   * GET /transactions/:transactionId
   * Get a specific transaction
   */
  async getTransactionById(c: Context) {
    const transactionId = c.req.param("transactionId");

    const transaction = await transactionService.getTransactionById(transactionId);
    if (!transaction) {
      throw new NotFoundError("Transaction not found");
    }

    return c.json({
      ok: true,
      data: transactionService.formatForPublic(transaction),
    });
  },

  /**
   * GET /transactions/my
   * Get current user's transactions (as sender or receiver)
   */
  async getMyTransactions(c: Context) {
    const user = getUser(c)!;
    const limit = Number(c.req.query("limit") ?? 50);

    const transactions = await transactionService.getUserTransactions(user.id, limit);

    return c.json({
      ok: true,
      data: transactions.map((tx) => ({
        ...transactionService.formatForPublic(tx),
        role: tx.senderId === user.id ? "sender" : "receiver",
      })),
    });
  },

  /**
   * GET /transactions/chain/:chainId
   * Get transactions by chain
   */
  async getTransactionsByChain(c: Context) {
    const chainId = Number(c.req.param("chainId"));
    const limit = Number(c.req.query("limit") ?? 50);

    const transactions = await transactionService.getTransactionsByChain(chainId, limit);

    return c.json({
      ok: true,
      data: transactions.map((tx) => transactionService.formatForPublic(tx)),
    });
  },

  /**
   * GET /rooms/:roomId/transaction
   * Get transaction for a specific room
   */
  async getTransactionByRoom(c: Context) {
    const roomId = c.req.param("roomId");

    const transaction = await transactionService.getTransactionByRoomId(roomId);
    if (!transaction) {
      throw new NotFoundError("No transaction found for this room");
    }

    return c.json({
      ok: true,
      data: transactionService.formatForPublic(transaction),
    });
  },
};
