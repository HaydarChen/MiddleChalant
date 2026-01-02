// ============ Constants ============

export const ROOM_STEPS = {
  WAITING_FOR_PEER: "WAITING_FOR_PEER",
  ROLE_SELECTION: "ROLE_SELECTION",
  AMOUNT_AGREEMENT: "AMOUNT_AGREEMENT",
  FEE_SELECTION: "FEE_SELECTION",
  AWAITING_DEPOSIT: "AWAITING_DEPOSIT",
  FUNDED: "FUNDED",
  RELEASING: "RELEASING",
  CANCELLING: "CANCELLING",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;

export const ROOM_STATUSES = {
  OPEN: "OPEN",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
  DISPUTED: "DISPUTED",
} as const;

export const ROLES = {
  SENDER: "sender",
  RECEIVER: "receiver",
} as const;

export const FEE_PAYERS = {
  SENDER: "sender",
  RECEIVER: "receiver",
  SPLIT: "split",
} as const;

export type RoomStep = (typeof ROOM_STEPS)[keyof typeof ROOM_STEPS];
export type RoomStatus = (typeof ROOM_STATUSES)[keyof typeof ROOM_STATUSES];
export type Role = (typeof ROLES)[keyof typeof ROLES];
export type FeePayer = (typeof FEE_PAYERS)[keyof typeof FEE_PAYERS];

// ============ User Types ============

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string;
  walletAddress?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
}

// ============ Room Types ============

export interface Room {
  id: string;
  name: string;
  roomCode: string;
  chainId: number;
  tokenAddress: string;
  amount?: string;
  feePayer?: FeePayer;
  escrowAddress?: string;
  depositTxHash?: string;
  releaseTxHash?: string;
  step: RoomStep;
  status: RoomStatus;
  creatorId: string;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  id: string;
  roomId: string;
  userId: string;
  role?: Role;
  roleConfirmed: boolean;
  amountConfirmed: boolean;
  feeConfirmed: boolean;
  releaseConfirmed: boolean;
  cancelConfirmed: boolean;
  payoutAddress?: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

// ============ Message Types ============

export interface BotButton {
  id: string;
  label: string;
  action: string;
  variant: "primary" | "secondary" | "danger";
}

export interface BotMessageMetadata {
  action?: string;
  data?: Record<string, unknown>;
  buttons?: BotButton[];
}

export interface Message {
  id: string;
  roomId: string;
  senderId?: string;
  senderType: "user" | "bot" | "system";
  text: string;
  metadata?: string | BotMessageMetadata;
  createdAt: string;
  sender?: User;
}

// ============ Transaction Types ============

export interface Transaction {
  id: string;
  roomId: string;
  chainId: number;
  senderId: string;
  receiverId: string;
  amount: string;
  fee: string;
  feePayer: FeePayer;
  depositTxHash: string;
  releaseTxHash: string;
  status: "COMPLETED" | "REFUNDED";
  completedAt: string;
  sender?: User;
  receiver?: User;
}

export interface TransactionStats {
  totalTransactions: number;
  totalVolume: string;
  completedCount: number;
  refundedCount: number;
}

// ============ Dispute Types ============

export interface Dispute {
  id: string;
  roomId: string;
  reporterId: string;
  explanation: string;
  proofUrl?: string;
  status: "PENDING" | "UNDER_REVIEW" | "RESOLVED";
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============ Chain Types ============

export interface ChainConfig {
  chainId: number;
  name: string;
  shortName: string;
  nativeCurrency?: string;
  usdtAddress?: string;
  explorerUrl?: string;
  isTestnet?: boolean;
}

// ============ API Response Types ============

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ============ Request Types ============

export interface CreateRoomRequest {
  name: string;
  chainId: number;
}

export interface JoinRoomRequest {
  roomCode: string;
}

export interface SendMessageRequest {
  text: string;
}

export interface SelectRoleRequest {
  role: Role;
}

export interface ProposeAmountRequest {
  amount: string;
}

export interface ConfirmAmountRequest {
  confirmed: boolean;
}

export interface SelectFeePayerRequest {
  feePayer: FeePayer;
}

export interface SubmitAddressRequest {
  address: string;
}

export interface CreateDisputeRequest {
  explanation: string;
  proofUrl?: string;
}

// ============ Room State ============

export interface RoomState {
  room: Room;
  participants: Participant[];
  sender?: Participant;
  receiver?: Participant;
  currentUser?: Participant;
}

export interface DepositInfo {
  escrowAddress: string | null;
  expectedAmount: string | null;
  depositTxHash: string | null;
  chainName: string;
  explorerUrl: string | null;
}
