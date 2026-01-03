import type {
  Room,
  Participant,
  Message,
  Transaction,
  TransactionStats,
  Dispute,
  ChainConfig,
  RoomState,
  DepositInfo,
  CreateRoomRequest,
  JoinRoomRequest,
  SendMessageRequest,
  SelectRoleRequest,
  ProposeAmountRequest,
  ConfirmAmountRequest,
  SelectFeePayerRequest,
  SubmitAddressRequest,
  CreateDisputeRequest,
  PaginatedResponse,
  User,
  Role,
  FeePayer,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

// ============ Fetch Helper ============

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) return {} as T;

  return JSON.parse(text);
}

// ============ Auth API ============

export const authApi = {
  async getSession(): Promise<{ user: User; session: { id: string } } | null> {
    try {
      return await apiFetch("/api/auth/get-session");
    } catch {
      return null;
    }
  },

  async signUp(email: string, password: string, name: string): Promise<{ user: User }> {
    return apiFetch("/api/auth/sign-up/email", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
  },

  async signIn(email: string, password: string): Promise<{ user: User }> {
    return apiFetch("/api/auth/sign-in/email", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async signOut(): Promise<void> {
    await apiFetch("/api/auth/sign-out", { method: "POST" });
  },
};

// ============ Chains API ============

interface BackendChainConfig {
  id: number;
  name: string;
  shortName: string;
}

export const chainsApi = {
  async getChains(): Promise<ChainConfig[]> {
    const response = await apiFetch<{ data: BackendChainConfig[] }>("/api/chains");
    // Transform backend response to frontend format
    return response.data.map((chain) => ({
      chainId: chain.id,
      name: chain.name,
      shortName: chain.shortName,
      isTestnet: chain.id === 11155111 || chain.id === 97, // Sepolia and BSC Testnet
    }));
  },
};

// ============ Rooms API ============

export const roomsApi = {
  async getMyRooms(): Promise<Room[]> {
    const response = await apiFetch<{ data: Room[] }>("/api/rooms/my");
    return response.data;
  },

  async getRoomById(roomId: string): Promise<Room> {
    const response = await apiFetch<{ data: Room }>(`/api/rooms/${roomId}`);
    return response.data;
  },

  async getRoomByCode(roomCode: string): Promise<Room> {
    const response = await apiFetch<{ data: Room }>(`/api/rooms/code/${roomCode}`);
    return response.data;
  },

  async createRoom(data: CreateRoomRequest): Promise<Room> {
    const response = await apiFetch<{ data: Room }>("/api/rooms", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async joinRoom(data: JoinRoomRequest): Promise<Room> {
    const response = await apiFetch<{ data: Room }>("/api/rooms/join", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async getParticipants(roomId: string): Promise<Participant[]> {
    const response = await apiFetch<{ data: Participant[] }>(
      `/api/rooms/${roomId}/participants`
    );
    return response.data;
  },

  async getRoomState(roomId: string): Promise<RoomState> {
    const response = await apiFetch<{ data: RoomState }>(`/api/rooms/${roomId}/state`);
    return response.data;
  },

  async getDepositInfo(roomId: string): Promise<DepositInfo> {
    const response = await apiFetch<{ data: DepositInfo }>(`/api/rooms/${roomId}/deposit-info`);
    return response.data;
  },

  async getTimeoutStatus(roomId: string): Promise<{
    isExpired: boolean;
    minutesRemaining: number;
    timeoutType: string;
  }> {
    const response = await apiFetch<{ data: { isExpired: boolean; minutesRemaining: number; timeoutType: string } }>(`/api/rooms/${roomId}/timeout-status`);
    return response.data;
  },
};

// ============ Messages API ============

export const messagesApi = {
  async getMessages(roomId: string, limit = 50, cursor?: string): Promise<Message[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);

    const response = await apiFetch<{ data: Message[]; hasMore: boolean; cursor: string | null }>(
      `/api/rooms/${roomId}/messages?${params}`
    );
    return response.data;
  },

  async sendMessage(roomId: string, data: SendMessageRequest): Promise<Message> {
    const response = await apiFetch<{ data: Message }>(
      `/api/rooms/${roomId}/messages`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },
};

// ============ Bot Actions API ============

export const botActionsApi = {
  // Role Selection
  async selectRole(roomId: string, role: Role): Promise<{ ok: boolean }> {
    return apiFetch(`/api/rooms/${roomId}/actions/select-role`, {
      method: "POST",
      body: JSON.stringify({ role }),
    });
  },

  async resetRoles(roomId: string): Promise<{ ok: boolean }> {
    return apiFetch(`/api/rooms/${roomId}/actions/reset-roles`, {
      method: "POST",
    });
  },

  async confirmRoles(roomId: string): Promise<{ ok: boolean }> {
    return apiFetch(`/api/rooms/${roomId}/actions/confirm-roles`, {
      method: "POST",
    });
  },

  // Amount Agreement
  async proposeAmount(roomId: string, amount: string): Promise<{ ok: boolean }> {
    return apiFetch(`/api/rooms/${roomId}/actions/propose-amount`, {
      method: "POST",
      body: JSON.stringify({ amount }),
    });
  },

  async confirmAmount(roomId: string, confirmed: boolean): Promise<{ ok: boolean }> {
    return apiFetch(`/api/rooms/${roomId}/actions/confirm-amount`, {
      method: "POST",
      body: JSON.stringify({ confirmed }),
    });
  },

  // Fee Selection
  async selectFeePayer(roomId: string, feePayer: FeePayer): Promise<{ ok: boolean }> {
    return apiFetch(`/api/rooms/${roomId}/actions/select-fee-payer`, {
      method: "POST",
      body: JSON.stringify({ feePayer }),
    });
  },

  async confirmFee(roomId: string): Promise<{ ok: boolean }> {
    return apiFetch(`/api/rooms/${roomId}/actions/confirm-fee`, {
      method: "POST",
    });
  },

  async changeFee(roomId: string): Promise<{ ok: boolean }> {
    return apiFetch(`/api/rooms/${roomId}/actions/change-fee`, {
      method: "POST",
    });
  },

  // Deposit
  async checkDeposit(roomId: string): Promise<{ ok: boolean; found: boolean; txHash?: string }> {
    return apiFetch(`/api/rooms/${roomId}/actions/check-deposit`, {
      method: "POST",
    });
  },

  async mockDeposit(roomId: string): Promise<{ ok: boolean; txHash?: string }> {
    return apiFetch(`/api/rooms/${roomId}/actions/mock-deposit`, {
      method: "POST",
    });
  },

  // Release Flow
  async initiateRelease(roomId: string): Promise<{ ok: boolean }> {
    return apiFetch(`/api/rooms/${roomId}/actions/initiate-release`, {
      method: "POST",
    });
  },

  async confirmRelease(roomId: string): Promise<{ ok: boolean }> {
    return apiFetch(`/api/rooms/${roomId}/actions/confirm-release`, {
      method: "POST",
    });
  },

  async cancelRelease(roomId: string): Promise<{ ok: boolean }> {
    return apiFetch(`/api/rooms/${roomId}/actions/cancel-release`, {
      method: "POST",
    });
  },

  async submitPayoutAddress(roomId: string, address: string): Promise<{ ok: boolean }> {
    return apiFetch(`/api/rooms/${roomId}/actions/submit-payout-address`, {
      method: "POST",
      body: JSON.stringify({ address }),
    });
  },

  async confirmPayoutAddress(roomId: string): Promise<{ ok: boolean }> {
    return apiFetch(`/api/rooms/${roomId}/actions/confirm-payout-address`, {
      method: "POST",
    });
  },

  async changePayoutAddress(roomId: string): Promise<{ ok: boolean }> {
    return apiFetch(`/api/rooms/${roomId}/actions/change-payout-address`, {
      method: "POST",
    });
  },

  // Cancel/Refund Flow
  async initiateCancel(roomId: string): Promise<{ ok: boolean }> {
    return apiFetch(`/api/rooms/${roomId}/actions/initiate-cancel`, {
      method: "POST",
    });
  },

  async confirmCancel(roomId: string): Promise<{ ok: boolean }> {
    return apiFetch(`/api/rooms/${roomId}/actions/confirm-cancel`, {
      method: "POST",
    });
  },

  async rejectCancel(roomId: string): Promise<{ ok: boolean }> {
    return apiFetch(`/api/rooms/${roomId}/actions/reject-cancel`, {
      method: "POST",
    });
  },

  async submitRefundAddress(roomId: string, address: string): Promise<{ ok: boolean }> {
    return apiFetch(`/api/rooms/${roomId}/actions/submit-refund-address`, {
      method: "POST",
      body: JSON.stringify({ address }),
    });
  },

  async confirmRefundAddress(roomId: string): Promise<{ ok: boolean }> {
    return apiFetch(`/api/rooms/${roomId}/actions/confirm-refund-address`, {
      method: "POST",
    });
  },

  async changeRefundAddress(roomId: string): Promise<{ ok: boolean }> {
    return apiFetch(`/api/rooms/${roomId}/actions/change-refund-address`, {
      method: "POST",
    });
  },
};

// ============ Disputes API ============

export const disputesApi = {
  async createDispute(roomId: string, data: CreateDisputeRequest): Promise<Dispute> {
    const response = await apiFetch<{ data: Dispute }>(
      `/api/rooms/${roomId}/dispute`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  async getRoomDisputes(roomId: string): Promise<Dispute[]> {
    const response = await apiFetch<{ data: Dispute[] }>(
      `/api/rooms/${roomId}/disputes`
    );
    return response.data;
  },

  async getMyDisputes(): Promise<Dispute[]> {
    const response = await apiFetch<{ data: Dispute[] }>("/api/disputes/my");
    return response.data;
  },
};

// ============ Transactions API ============

export const transactionsApi = {
  async getTransactions(params?: {
    chainId?: number;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<Transaction>> {
    const searchParams = new URLSearchParams();
    if (params?.chainId) searchParams.set("chainId", String(params.chainId));
    if (params?.status) searchParams.set("status", params.status);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));

    const response = await apiFetch<{
      data: {
        transactions: Transaction[];
        total: number;
        hasMore: boolean;
        limit: number;
        offset: number;
      };
    }>(`/api/transactions?${searchParams}`);

    // Transform to match PaginatedResponse interface
    return {
      data: response.data.transactions,
      total: response.data.total,
      hasMore: response.data.hasMore,
      limit: response.data.limit,
      offset: response.data.offset,
    };
  },

  async getStats(): Promise<TransactionStats> {
    const response = await apiFetch<{ data: TransactionStats }>("/api/transactions/stats");
    return response.data;
  },

  async getMyTransactions(): Promise<Transaction[]> {
    const response = await apiFetch<{ data: Transaction[] }>(
      "/api/transactions/my"
    );
    return response.data;
  },

  async getTransactionById(transactionId: string): Promise<Transaction> {
    const response = await apiFetch<{ data: Transaction }>(
      `/api/transactions/${transactionId}`
    );
    return response.data;
  },
};

// ============ Export All ============

export const api = {
  auth: authApi,
  chains: chainsApi,
  rooms: roomsApi,
  messages: messagesApi,
  botActions: botActionsApi,
  disputes: disputesApi,
  transactions: transactionsApi,
};

export default api;
