import { pgTable, text, timestamp, integer, numeric, primaryKey, boolean } from "drizzle-orm/pg-core";

// ============ BetterAuth Tables ============

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  // Custom fields for Web3
  walletAddress: text("wallet_address").unique(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ============ Application Tables ============

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

// Note: Old siweNonces and sessions tables removed - using BetterAuth tables now

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

