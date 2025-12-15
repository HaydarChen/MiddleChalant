import { pgTable, text, timestamp, integer, numeric, primaryKey } from "drizzle-orm/pg-core";

export const rooms = pgTable("rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  chainId: integer("chain_id").notNull(),
  tokenAddress: text("token_address").notNull(),
  amount: numeric("amount", { precision: 78, scale: 0 }).notNull(),
  factoryAddress: text("factory_address"),
  escrowAddress: text("escrow_address"),
  status: text("status").notNull().default("AWAITING_DEPOSIT"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const participants = pgTable("participants", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull(),
  address: text("address").notNull(),
  role: text("role").notNull(), // "buyer" | "seller"
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull(),
  sender: text("sender").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const siweNonces = pgTable("siwe_nonces", {
  nonce: text("nonce").primaryKey(),
  address: text("address"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  address: text("address").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const escrows = pgTable("escrows", {
  id: text("id").primaryKey(),
  chainId: integer("chain_id").notNull(),
  escrowAddress: text("escrow_address").notNull(),
  buyer: text("buyer").notNull(),
  seller: text("seller").notNull(),
  token: text("token").notNull(),
  amount: numeric("amount", { precision: 78, scale: 0 }).notNull(),
  feeBps: integer("fee_bps").notNull(),
  status: text("status").notNull(),
  lastTxHash: text("last_tx_hash"),
  lastBlockNumber: numeric("last_block_number", { precision: 78, scale: 0 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const lastBlocks = pgTable("last_blocks", {
  chainId: integer("chain_id").notNull(),
  blockNumber: numeric("block_number", { precision: 78, scale: 0 }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.chainId] }),
}));

