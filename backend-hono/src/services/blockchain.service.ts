/**
 * Blockchain Service
 *
 * Handles blockchain interactions for the escrow system using viem.
 * Supports both real blockchain calls and mock mode for development.
 */

import { createHash } from "crypto";
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  type Address,
  type Hash,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia, bscTestnet, mainnet, bsc } from "viem/chains";
import {
  getChainConfig,
  getMasterEscrowAddress,
  getRpcUrl,
  getUsdtAddress,
} from "@/config/chains";
import masterEscrowAbi from "@/contracts/masterEscrow.abi.json";

// ============ Types ============

export interface DepositInfo {
  found: boolean;
  amount?: string;
  txHash?: string;
  confirmedAt?: Date;
  status?: number;
}

export interface TransferResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface DealInfo {
  roomId: string;
  token: string;
  dealAmount: bigint;
  depositAmount: bigint;
  fee: bigint;
  feePayer: number;
  status: number;
  createdAt: bigint;
  fundedAt: bigint;
  completedAt: bigint;
  depositedBy: string;
}

// Deal status enum matching contract
export const DealStatus = {
  CREATED: 0,
  FUNDED: 1,
  RELEASED: 2,
  REFUNDED: 3,
  CANCELLED: 4,
} as const;

// Fee payer enum matching contract
export const FeePayer = {
  SENDER: 0,
  RECEIVER: 1,
  SPLIT: 2,
} as const;

// ============ Chain Configuration ============

const viemChains = {
  1: mainnet,
  56: bsc,
  11155111: sepolia,
  97: bscTestnet,
} as const;

// ============ Mock Storage (for development without contract) ============

const mockDeposits = new Map<
  string,
  { amount: string; txHash: string; confirmedAt: Date }
>();

// ============ Client Factory ============

function getPublicClient(chainId: number): PublicClient {
  const rpcUrl = getRpcUrl(chainId);
  const chain = viemChains[chainId as keyof typeof viemChains];

  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}

function getWalletClient(chainId: number) {
  const privateKey = process.env.BOT_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("BOT_PRIVATE_KEY environment variable is not set");
  }

  const rpcUrl = getRpcUrl(chainId);
  const chain = viemChains[chainId as keyof typeof viemChains];

  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  const account = privateKeyToAccount(
    privateKey.startsWith("0x") ? (privateKey as `0x${string}`) : (`0x${privateKey}` as `0x${string}`)
  );

  const client = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  return { client, account };
}

// ============ Helper Functions ============

/**
 * Generate a deterministic deal ID from room ID and chain ID
 */
function generateDealId(roomId: string, chainId: number): `0x${string}` {
  // Pad roomId to bytes32
  const roomIdBytes = keccak256(
    encodeAbiParameters(parseAbiParameters("string"), [roomId])
  );
  // Generate deal ID: keccak256(roomIdBytes, chainId)
  return keccak256(
    encodeAbiParameters(parseAbiParameters("bytes32, uint256"), [
      roomIdBytes,
      BigInt(chainId),
    ])
  );
}

/**
 * Convert fee payer string to contract enum value
 */
function feePayerToEnum(feePayer: string): number {
  switch (feePayer) {
    case "sender":
      return FeePayer.SENDER;
    case "receiver":
      return FeePayer.RECEIVER;
    case "split":
      return FeePayer.SPLIT;
    default:
      return FeePayer.SENDER;
  }
}

/**
 * Check if we're in mock mode
 * Mock mode is enabled if:
 * - MOCK_MODE env var is set to "true", OR
 * - No contract address is configured for the chain, OR
 * - No BOT_PRIVATE_KEY is set
 */
function isMockMode(chainId: number): boolean {
  // Explicit mock mode flag takes priority
  if (process.env.MOCK_MODE === "true") {
    return true;
  }
  const contractAddress = getMasterEscrowAddress(chainId);
  return !contractAddress || !process.env.BOT_PRIVATE_KEY;
}

// ============ Blockchain Service ============

export const blockchainService = {
  /**
   * Check if running in mock mode
   */
  isMockMode,

  /**
   * Generate deal ID for a room
   */
  getDealId(roomId: string, chainId: number): string {
    return generateDealId(roomId, chainId);
  },

  /**
   * Get the escrow contract address for depositing
   * In the new architecture, users deposit directly to the MasterEscrow contract
   */
  getEscrowAddress(chainId: number): string {
    const contractAddress = getMasterEscrowAddress(chainId);
    if (!contractAddress) {
      // Mock mode: generate deterministic address
      const hash = createHash("sha256")
        .update(`escrow:${chainId}`)
        .digest("hex");
      return "0x" + hash.slice(0, 40);
    }
    return contractAddress;
  },

  /**
   * Create a deal on the smart contract
   */
  async createDeal(
    roomId: string,
    chainId: number,
    dealAmount: string,
    feePayer: string
  ): Promise<TransferResult> {
    if (isMockMode(chainId)) {
      // Mock mode
      const txHash =
        "0x" +
        createHash("sha256")
          .update(`createDeal:${roomId}:${Date.now()}`)
          .digest("hex");
      return { success: true, txHash };
    }

    try {
      const contractAddress = getMasterEscrowAddress(chainId) as Address;
      const tokenAddress = getUsdtAddress(chainId) as Address;
      const { client: walletClient, account } = getWalletClient(chainId);
      const publicClient = getPublicClient(chainId);

      const dealId = generateDealId(roomId, chainId);
      const roomIdBytes = keccak256(
        encodeAbiParameters(parseAbiParameters("string"), [roomId])
      );

      const chain = viemChains[chainId as keyof typeof viemChains];
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: masterEscrowAbi,
        functionName: "createDeal",
        args: [
          dealId,
          roomIdBytes,
          tokenAddress,
          BigInt(dealAmount),
          feePayerToEnum(feePayer),
        ],
        chain,
        account,
      });

      // Wait for confirmation
      await publicClient.waitForTransactionReceipt({ hash });

      return { success: true, txHash: hash };
    } catch (error) {
      console.error("Error creating deal:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  /**
   * Check if a deposit has been received for a deal
   * If deal is still CREATED but contract has balance, record the deposit
   */
  async checkDeposit(
    roomId: string,
    expectedAmount: string,
    chainId: number
  ): Promise<DepositInfo> {
    if (isMockMode(chainId)) {
      // Check mock deposits
      const escrowAddress = this.getEscrowAddress(chainId);
      const deposit = mockDeposits.get(
        `${escrowAddress}:${roomId}`.toLowerCase()
      );

      if (!deposit) {
        return { found: false };
      }

      return {
        found: true,
        amount: deposit.amount,
        txHash: deposit.txHash,
        confirmedAt: deposit.confirmedAt,
        status: DealStatus.FUNDED,
      };
    }

    try {
      const contractAddress = getMasterEscrowAddress(chainId) as Address;
      const publicClient = getPublicClient(chainId);

      const dealId = generateDealId(roomId, chainId);

      // Check if deal exists and its status
      const deal = (await publicClient.readContract({
        address: contractAddress,
        abi: masterEscrowAbi,
        functionName: "getDeal",
        args: [dealId],
      })) as DealInfo;

      // Already funded
      if (deal.status === DealStatus.FUNDED) {
        return {
          found: true,
          amount: deal.depositAmount.toString(),
          status: deal.status,
          confirmedAt: new Date(Number(deal.fundedAt) * 1000),
        };
      }

      // If deal is CREATED, check if contract has received the funds via direct transfer
      if (deal.status === DealStatus.CREATED) {
        const tokenAddress = getUsdtAddress(chainId) as Address;

        // Check contract's USDT balance
        const balance = await publicClient.readContract({
          address: tokenAddress,
          abi: [
            {
              name: "balanceOf",
              type: "function",
              stateMutability: "view",
              inputs: [{ name: "account", type: "address" }],
              outputs: [{ name: "", type: "uint256" }],
            },
          ],
          functionName: "balanceOf",
          args: [contractAddress],
        }) as bigint;

        // If contract has enough balance, record the deposit
        if (balance >= BigInt(deal.depositAmount.toString())) {
          console.log(`Direct deposit detected for room ${roomId}, recording...`);
          const recordResult = await this.recordDeposit(roomId, chainId);

          if (recordResult.success) {
            return {
              found: true,
              amount: deal.depositAmount.toString(),
              txHash: recordResult.txHash,
              status: DealStatus.FUNDED,
              confirmedAt: new Date(),
            };
          }
        }
      }

      return { found: false, status: deal.status };
    } catch (error) {
      console.error("Error checking deposit:", error);
      return { found: false };
    }
  },

  /**
   * Record a direct transfer deposit on the contract
   */
  async recordDeposit(
    roomId: string,
    chainId: number,
    depositorAddress?: string
  ): Promise<TransferResult> {
    if (isMockMode(chainId)) {
      return { success: false, error: "Cannot record deposit in mock mode" };
    }

    try {
      const contractAddress = getMasterEscrowAddress(chainId) as Address;
      const { client: walletClient, account } = getWalletClient(chainId);
      const publicClient = getPublicClient(chainId);

      const dealId = generateDealId(roomId, chainId);
      const chain = viemChains[chainId as keyof typeof viemChains];

      // Use zero address if depositor not specified (we don't always know who sent)
      const depositor = depositorAddress || "0x0000000000000000000000000000000000000000";

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: masterEscrowAbi,
        functionName: "recordDeposit",
        args: [dealId, depositor as Address],
        chain,
        account,
      });

      // Wait for confirmation
      await publicClient.waitForTransactionReceipt({ hash });

      return { success: true, txHash: hash };
    } catch (error) {
      console.error("Error recording deposit:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  /**
   * Mock a deposit for testing purposes
   */
  async mockDeposit(
    roomId: string,
    chainId: number,
    amount: string,
    txHash?: string
  ): Promise<{ txHash: string }> {
    const escrowAddress = this.getEscrowAddress(chainId);
    const finalTxHash =
      txHash ||
      "0x" +
        createHash("sha256")
          .update(`tx:${roomId}:${Date.now()}`)
          .digest("hex");

    mockDeposits.set(`${escrowAddress}:${roomId}`.toLowerCase(), {
      amount,
      txHash: finalTxHash,
      confirmedAt: new Date(),
    });

    return { txHash: finalTxHash };
  },

  /**
   * Execute release of funds to receiver
   */
  async executeRelease(
    roomId: string,
    receiverAddress: string,
    amount: string,
    chainId: number
  ): Promise<TransferResult> {
    if (isMockMode(chainId)) {
      // Mock mode
      await new Promise((resolve) => setTimeout(resolve, 100));
      const escrowAddress = this.getEscrowAddress(chainId);
      mockDeposits.delete(`${escrowAddress}:${roomId}`.toLowerCase());

      const txHash =
        "0x" +
        createHash("sha256")
          .update(`release:${roomId}:${receiverAddress}:${Date.now()}`)
          .digest("hex");

      return { success: true, txHash };
    }

    try {
      const contractAddress = getMasterEscrowAddress(chainId) as Address;
      const { client: walletClient, account } = getWalletClient(chainId);
      const publicClient = getPublicClient(chainId);

      const dealId = generateDealId(roomId, chainId);
      const chain = viemChains[chainId as keyof typeof viemChains];

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: masterEscrowAbi,
        functionName: "release",
        args: [dealId, receiverAddress as Address],
        chain,
        account,
      });

      // Wait for confirmation
      await publicClient.waitForTransactionReceipt({ hash });

      return { success: true, txHash: hash };
    } catch (error) {
      console.error("Error executing release:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  /**
   * Execute refund of funds to sender
   */
  async executeRefund(
    roomId: string,
    senderAddress: string,
    amount: string,
    chainId: number
  ): Promise<TransferResult> {
    if (isMockMode(chainId)) {
      // Mock mode
      await new Promise((resolve) => setTimeout(resolve, 100));
      const escrowAddress = this.getEscrowAddress(chainId);
      mockDeposits.delete(`${escrowAddress}:${roomId}`.toLowerCase());

      const txHash =
        "0x" +
        createHash("sha256")
          .update(`refund:${roomId}:${senderAddress}:${Date.now()}`)
          .digest("hex");

      return { success: true, txHash };
    }

    try {
      const contractAddress = getMasterEscrowAddress(chainId) as Address;
      const { client: walletClient, account } = getWalletClient(chainId);
      const publicClient = getPublicClient(chainId);

      const dealId = generateDealId(roomId, chainId);
      const chain = viemChains[chainId as keyof typeof viemChains];

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: masterEscrowAbi,
        functionName: "refund",
        args: [dealId, senderAddress as Address],
        chain,
        account,
      });

      // Wait for confirmation
      await publicClient.waitForTransactionReceipt({ hash });

      return { success: true, txHash: hash };
    } catch (error) {
      console.error("Error executing refund:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  /**
   * Cancel a deal before it's funded
   */
  async cancelDeal(roomId: string, chainId: number): Promise<TransferResult> {
    if (isMockMode(chainId)) {
      const txHash =
        "0x" +
        createHash("sha256")
          .update(`cancel:${roomId}:${Date.now()}`)
          .digest("hex");
      return { success: true, txHash };
    }

    try {
      const contractAddress = getMasterEscrowAddress(chainId) as Address;
      const { client: walletClient, account } = getWalletClient(chainId);
      const publicClient = getPublicClient(chainId);

      const dealId = generateDealId(roomId, chainId);
      const chain = viemChains[chainId as keyof typeof viemChains];

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: masterEscrowAbi,
        functionName: "cancelDeal",
        args: [dealId],
        chain,
        account,
      });

      await publicClient.waitForTransactionReceipt({ hash });

      return { success: true, txHash: hash };
    } catch (error) {
      console.error("Error cancelling deal:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  /**
   * Get deal information from contract
   */
  async getDeal(roomId: string, chainId: number): Promise<DealInfo | null> {
    if (isMockMode(chainId)) {
      return null;
    }

    try {
      const contractAddress = getMasterEscrowAddress(chainId) as Address;
      const publicClient = getPublicClient(chainId);

      const dealId = generateDealId(roomId, chainId);

      const deal = (await publicClient.readContract({
        address: contractAddress,
        abi: masterEscrowAbi,
        functionName: "getDeal",
        args: [dealId],
      })) as DealInfo;

      return deal;
    } catch (error) {
      console.error("Error getting deal:", error);
      return null;
    }
  },

  /**
   * Get the explorer URL for a transaction
   */
  getExplorerTxUrl(chainId: number, txHash: string): string | null {
    const config = getChainConfig(chainId);
    if (!config) return null;
    return `${config.explorerUrl}/tx/${txHash}`;
  },

  /**
   * Get the explorer URL for an address
   */
  getExplorerAddressUrl(chainId: number, address: string): string | null {
    const config = getChainConfig(chainId);
    if (!config) return null;
    return `${config.explorerUrl}/address/${address}`;
  },

  /**
   * Validate an Ethereum address format
   */
  isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  },

  /**
   * Clear all mock deposits (for testing)
   */
  clearMockDeposits(): void {
    mockDeposits.clear();
  },
};
