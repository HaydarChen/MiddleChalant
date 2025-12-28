import type { Context } from "hono";
import type { user, session, rooms, messages, participants, escrows } from "@/db/schema";

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
  chainId: number;
  tokenAddress: string;
  amount: string;
  buyerAddress?: string;
  sellerAddress?: string;
}

export interface JoinRoomRequest {
  address: string;
  role: "buyer" | "seller";
}

export interface SendMessageRequest {
  text: string;
}

// ============ Escrow Types ============

export type EscrowStatus =
  | "AWAITING_DEPOSIT"
  | "FUNDED"
  | "RELEASED"
  | "REFUNDED"
  | "CANCELED";

// ============ Context Types ============

export interface AuthVariables {
  user: User;
  address: string;
}

export type AuthContext = Context<{ Variables: AuthVariables }>;
