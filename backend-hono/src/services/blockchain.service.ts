/**
 * Blockchain Service - Mock Implementation
 *
 * This service handles blockchain interactions for the escrow system.
 * Currently implemented as mocks that can be replaced with real blockchain
 * functionality when smart contracts are deployed.
 *
 * TODO: Replace mock implementations with actual blockchain calls:
 * - generateEscrowAddress: Deploy/derive actual escrow contract address
 * - checkDeposit: Query blockchain for USDT transfers to escrow address
 * - executeRelease: Call smart contract release function
 * - executeRefund: Call smart contract refund function
 */

import { createHash } from "crypto";
import { getChainConfig, formatUsdtAmount, USDT_DECIMALS } from "@/config/chains";

// Mock deposit storage for testing (in-memory)
// In production, this would be replaced by blockchain queries
const mockDeposits = new Map<
  string,
  { amount: string; txHash: string; confirmedAt: Date }
>();

export interface DepositInfo {
  found: boolean;
  amount?: string;
  txHash?: string;
  confirmedAt?: Date;
}

export interface TransferResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export const blockchainService = {
  /**
   * Generate a deterministic escrow address for a room
   *
   * MOCK: Creates a deterministic address based on room ID and chain ID.
   * In production, this would either:
   * 1. Deploy a new escrow contract and return its address
   * 2. Use CREATE2 to derive a deterministic address
   * 3. Assign from a pool of pre-deployed escrow contracts
   */
  generateEscrowAddress(roomId: string, chainId: number): string {
    // Create deterministic address from room ID and chain
    const input = `escrow:${chainId}:${roomId}`;
    const hash = createHash("sha256").update(input).digest("hex");
    // Take first 40 chars and prefix with 0x
    return "0x" + hash.slice(0, 40);
  },

  /**
   * Check if a deposit has been received at the escrow address
   *
   * MOCK: Checks in-memory mock deposits.
   * In production, this would query the blockchain for:
   * 1. USDT transfer events to the escrow address
   * 2. Current USDT balance of the escrow address
   */
  async checkDeposit(
    escrowAddress: string,
    expectedAmount: string,
    chainId: number
  ): Promise<DepositInfo> {
    // Check mock deposits
    const deposit = mockDeposits.get(escrowAddress.toLowerCase());

    if (!deposit) {
      return { found: false };
    }

    // In production, you'd verify the amount matches
    // For now, we accept any deposit that was mocked
    return {
      found: true,
      amount: deposit.amount,
      txHash: deposit.txHash,
      confirmedAt: deposit.confirmedAt,
    };
  },

  /**
   * Mock a deposit for testing purposes
   *
   * This allows manual triggering of deposits during development.
   * This function should be removed or disabled in production.
   */
  async mockDeposit(
    escrowAddress: string,
    amount: string,
    txHash?: string
  ): Promise<{ txHash: string }> {
    const finalTxHash =
      txHash ||
      "0x" +
        createHash("sha256")
          .update(`tx:${escrowAddress}:${Date.now()}`)
          .digest("hex");

    mockDeposits.set(escrowAddress.toLowerCase(), {
      amount,
      txHash: finalTxHash,
      confirmedAt: new Date(),
    });

    return { txHash: finalTxHash };
  },

  /**
   * Execute release of funds to receiver
   *
   * MOCK: Returns a fake transaction hash.
   * In production, this would:
   * 1. Call the smart contract's release function
   * 2. Wait for transaction confirmation
   * 3. Return the actual transaction hash
   */
  async executeRelease(
    escrowAddress: string,
    receiverAddress: string,
    amount: string,
    chainId: number
  ): Promise<TransferResult> {
    // Simulate blockchain delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Mock success
    const txHash =
      "0x" +
      createHash("sha256")
        .update(`release:${escrowAddress}:${receiverAddress}:${Date.now()}`)
        .digest("hex");

    // Clear mock deposit
    mockDeposits.delete(escrowAddress.toLowerCase());

    return {
      success: true,
      txHash,
    };
  },

  /**
   * Execute refund of funds to sender
   *
   * MOCK: Returns a fake transaction hash.
   * In production, this would:
   * 1. Call the smart contract's refund function
   * 2. Wait for transaction confirmation
   * 3. Return the actual transaction hash
   */
  async executeRefund(
    escrowAddress: string,
    senderAddress: string,
    amount: string,
    chainId: number
  ): Promise<TransferResult> {
    // Simulate blockchain delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Mock success
    const txHash =
      "0x" +
      createHash("sha256")
        .update(`refund:${escrowAddress}:${senderAddress}:${Date.now()}`)
        .digest("hex");

    // Clear mock deposit
    mockDeposits.delete(escrowAddress.toLowerCase());

    return {
      success: true,
      txHash,
    };
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
