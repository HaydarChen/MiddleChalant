import { pgTable, text, timestamp, integer, numeric, primaryKey, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============ BetterAuth Tables ============

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Custom fields for Web3
  walletAddress: text("wallet_address").unique(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (table) => [index("session_userId_idx").on(table.userId)]);

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [index("account_userId_idx").on(table.userId)]);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [index("verification_identifier_idx").on(table.identifier)]);

// ============ BetterAuth Relations ============

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// ============ Application Tables ============

// Room steps (bot flow phases)
// WAITING_FOR_PEER -> ROLE_SELECTION -> AMOUNT_AGREEMENT -> FEE_SELECTION ->
// AWAITING_DEPOSIT -> FUNDED -> RELEASING/CANCELLING -> COMPLETED/CANCELLED/EXPIRED

export const rooms = pgTable("rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  roomCode: text("room_code").notNull().unique(), // 6-char code for joining
  chainId: integer("chain_id").notNull(), // 1 = ETH, 56 = BSC (mainnet) or testnets
  tokenAddress: text("token_address").notNull(), // USDT address for the chain
  amount: numeric("amount", { precision: 78, scale: 0 }), // Set during AMOUNT_AGREEMENT (nullable initially)
  feePayer: text("fee_payer"), // "sender" | "receiver" | "split" - set during FEE_SELECTION
  escrowAddress: text("escrow_address"), // Bot-controlled escrow wallet address
  depositTxHash: text("deposit_tx_hash"), // Transaction hash of the deposit
  releaseTxHash: text("release_tx_hash"), // Transaction hash of the release/refund
  step: text("step").notNull().default("WAITING_FOR_PEER"), // Current bot flow phase
  status: text("status").notNull().default("OPEN"), // OPEN, COMPLETED, CANCELLED, EXPIRED, DISPUTED
  creatorId: text("creator_id").notNull().references(() => user.id), // Who created the room
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).defaultNow().notNull(), // For timeout tracking
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("rooms_room_code_idx").on(table.roomCode),
  index("rooms_status_idx").on(table.status),
]);

export const participants = pgTable("participants", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id),
  role: text("role"), // "sender" | "receiver" - null until selected
  roleConfirmed: boolean("role_confirmed").notNull().default(false),
  amountConfirmed: boolean("amount_confirmed").notNull().default(false),
  feeConfirmed: boolean("fee_confirmed").notNull().default(false),
  releaseConfirmed: boolean("release_confirmed").notNull().default(false), // For double confirmation
  cancelConfirmed: boolean("cancel_confirmed").notNull().default(false),
  payoutAddress: text("payout_address"), // Wallet address for receiving funds
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("participants_room_id_idx").on(table.roomId),
  index("participants_user_id_idx").on(table.userId),
]);

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
  senderId: text("sender_id").references(() => user.id), // null for bot messages
  senderType: text("sender_type").notNull().default("user"), // "user" | "bot" | "system"
  text: text("text").notNull(),
  metadata: text("metadata"), // JSON string for bot actions, buttons, embedded data
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("messages_room_id_idx").on(table.roomId),
]);

// Disputes table for report functionality (mock in v1)
export const disputes = pgTable("disputes", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => rooms.id),
  reporterId: text("reporter_id").notNull().references(() => user.id),
  explanation: text("explanation").notNull(),
  proofUrl: text("proof_url"), // URL or file reference
  status: text("status").notNull().default("PENDING"), // PENDING, UNDER_REVIEW, RESOLVED
  adminNotes: text("admin_notes"), // For future admin use
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("disputes_room_id_idx").on(table.roomId),
  index("disputes_status_idx").on(table.status),
]);

// Transaction history for public display
export const transactions = pgTable("transactions", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => rooms.id),
  chainId: integer("chain_id").notNull(),
  senderId: text("sender_id").notNull().references(() => user.id),
  receiverId: text("receiver_id").notNull().references(() => user.id),
  amount: numeric("amount", { precision: 78, scale: 0 }).notNull(),
  fee: numeric("fee", { precision: 78, scale: 0 }).notNull(),
  feePayer: text("fee_payer").notNull(), // "sender" | "receiver" | "split"
  depositTxHash: text("deposit_tx_hash").notNull(),
  releaseTxHash: text("release_tx_hash").notNull(),
  status: text("status").notNull(), // COMPLETED, REFUNDED
  completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("transactions_chain_id_idx").on(table.chainId),
  index("transactions_completed_at_idx").on(table.completedAt),
]);

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

// ============ Application Relations ============

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  creator: one(user, {
    fields: [rooms.creatorId],
    references: [user.id],
  }),
  participants: many(participants),
  messages: many(messages),
  disputes: many(disputes),
  transaction: one(transactions),
}));

export const participantsRelations = relations(participants, ({ one }) => ({
  room: one(rooms, {
    fields: [participants.roomId],
    references: [rooms.id],
  }),
  user: one(user, {
    fields: [participants.userId],
    references: [user.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  room: one(rooms, {
    fields: [messages.roomId],
    references: [rooms.id],
  }),
  sender: one(user, {
    fields: [messages.senderId],
    references: [user.id],
  }),
}));

export const disputesRelations = relations(disputes, ({ one }) => ({
  room: one(rooms, {
    fields: [disputes.roomId],
    references: [rooms.id],
  }),
  reporter: one(user, {
    fields: [disputes.reporterId],
    references: [user.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  room: one(rooms, {
    fields: [transactions.roomId],
    references: [rooms.id],
  }),
  sender: one(user, {
    fields: [transactions.senderId],
    references: [user.id],
    relationName: "transactionSender",
  }),
  receiver: one(user, {
    fields: [transactions.receiverId],
    references: [user.id],
    relationName: "transactionReceiver",
  }),
}));

