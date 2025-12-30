import type { Context } from "hono";
import type { user, session, rooms, messages, participants, escrows, disputes, transactions } from "@/db/schema";

// ============ Constants ============

// Room steps (bot flow phases)
export const ROOM_STEPS = {
  WAITING_FOR_PEER: "WAITING_FOR_PEER",      // Waiting for second user to join
  ROLE_SELECTION: "ROLE_SELECTION",          // Both users selecting sender/receiver
  AMOUNT_AGREEMENT: "AMOUNT_AGREEMENT",      // Sender proposes amount, both confirm
  FEE_SELECTION: "FEE_SELECTION",            // Choose who pays the fee
  AWAITING_DEPOSIT: "AWAITING_DEPOSIT",      // Waiting for sender to deposit
  FUNDED: "FUNDED",                          // Funds received, awaiting release/cancel
  RELEASING: "RELEASING",                    // Release in progress
  CANCELLING: "CANCELLING",                  // Cancel in progress (both confirming)
  COMPLETED: "COMPLETED",                    // Successfully released
  CANCELLED: "CANCELLED",                    // Refunded to sender
  EXPIRED: "EXPIRED",                        // Timed out
} as const;

export type RoomStep = typeof ROOM_STEPS[keyof typeof ROOM_STEPS];

// Room statuses (overall state)
export const ROOM_STATUSES = {
  OPEN: "OPEN",           // Active room
  COMPLETED: "COMPLETED", // Successfully finished
  CANCELLED: "CANCELLED", // Cancelled/refunded
  EXPIRED: "EXPIRED",     // Timed out
  DISPUTED: "DISPUTED",   // Under dispute
} as const;

export type RoomStatus = typeof ROOM_STATUSES[keyof typeof ROOM_STATUSES];

// Fee payer options
export const FEE_PAYERS = {
  SENDER: "sender",
  RECEIVER: "receiver",
  SPLIT: "split",
} as const;

export type FeePayer = typeof FEE_PAYERS[keyof typeof FEE_PAYERS];

// Participant roles
export const ROLES = {
  SENDER: "sender",
  RECEIVER: "receiver",
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Message sender types
export const SENDER_TYPES = {
  USER: "user",
  BOT: "bot",
  SYSTEM: "system",
} as const;

export type SenderType = typeof SENDER_TYPES[keyof typeof SENDER_TYPES];

// Dispute statuses
export const DISPUTE_STATUSES = {
  PENDING: "PENDING",
  UNDER_REVIEW: "UNDER_REVIEW",
  RESOLVED: "RESOLVED",
} as const;

export type DisputeStatus = typeof DISPUTE_STATUSES[keyof typeof DISPUTE_STATUSES];

// Transaction statuses
export const TRANSACTION_STATUSES = {
  COMPLETED: "COMPLETED",
  REFUNDED: "REFUNDED",
} as const;

export type TransactionStatus = typeof TRANSACTION_STATUSES[keyof typeof TRANSACTION_STATUSES];

// Fee percentage (1% = 100 basis points)
export const FEE_BPS = 100;
export const FEE_PERCENTAGE = 1;

// Timeout durations (in milliseconds)
export const TIMEOUTS = {
  PRE_FUNDING: 15 * 60 * 1000,  // 15 minutes before deposit stage
  FUNDING: 30 * 60 * 1000,      // 30 minutes after escrow address shown
} as const;

// ============ Database Types ============

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;

export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;

export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type Participant = typeof participants.$inferSelect;
export type NewParticipant = typeof participants.$inferInsert;

export type Escrow = typeof escrows.$inferSelect;
export type NewEscrow = typeof escrows.$inferInsert;

export type Dispute = typeof disputes.$inferSelect;
export type NewDispute = typeof disputes.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

// ============ API Types ============

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  cursor?: string;
  hasMore: boolean;
}

// ============ Auth Types ============

export interface AuthUser {
  id: string;
  name: string;
  walletAddress: string | null;
}

export interface SiweVerifyRequest {
  message: string;
  signature: string;
}

export interface SiweVerifyResponse {
  ok: boolean;
  address?: string;
  user?: AuthUser;
  error?: string;
}

// ============ Room Types ============

export interface CreateRoomRequest {
  name: string;
  chainId: number; // 1 = ETH mainnet, 11155111 = Sepolia, 56 = BSC, 97 = BSC Testnet
}

export interface JoinRoomByCodeRequest {
  roomCode: string;
}

export interface SelectRoleRequest {
  role: Role;
}

export interface ProposeAmountRequest {
  amount: string; // Amount in smallest unit (wei for USDT)
}

export interface ConfirmAmountRequest {
  confirmed: boolean;
}

export interface SelectFeePayerRequest {
  feePayer: FeePayer;
}

export interface ConfirmFeeRequest {
  confirmed: boolean;
}

export interface ConfirmReleaseRequest {
  confirmed: boolean;
}

export interface ConfirmCancelRequest {
  confirmed: boolean;
}

export interface SetPayoutAddressRequest {
  address: string;
}

export interface SendMessageRequest {
  text: string;
}

export interface CreateDisputeRequest {
  explanation: string;
  proofUrl?: string;
}

// ============ Escrow Types ============

export type EscrowStatus =
  | "AWAITING_DEPOSIT"
  | "FUNDED"
  | "RELEASED"
  | "REFUNDED"
  | "CANCELED";

// ============ Bot Message Metadata ============

export interface BotMessageMetadata {
  action?: string;           // Action identifier for the bot message
  buttons?: BotButton[];     // Clickable buttons
  data?: Record<string, unknown>; // Additional data (amounts, addresses, etc.)
}

export interface BotButton {
  id: string;
  label: string;
  action: string;  // Action to trigger when clicked
  variant?: "primary" | "secondary" | "danger";
}

// ============ Context Types ============

export interface AuthVariables {
  user: User;
  address: string;
}

export type AuthContext = Context<{ Variables: AuthVariables }>;
