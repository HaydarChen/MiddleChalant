import { escrowRepository } from "@/repositories";
import type { Escrow, EscrowStatus } from "@/types";

export const escrowService = {
  async getEscrowsByUserAddress(address: string): Promise<Escrow[]> {
    return escrowRepository.findByUserAddress(address);
  },

  async getEscrowByAddress(chainId: number, escrowAddress: string): Promise<Escrow | null> {
    return escrowRepository.findByAddress(chainId, escrowAddress);
  },

  async updateEscrowStatus(
    escrowId: string,
    status: EscrowStatus,
    txHash?: string,
    blockNumber?: string
  ): Promise<Escrow | null> {
    return escrowRepository.updateStatus(escrowId, status, txHash, blockNumber);
  },

  async createOrUpdateEscrow(data: {
    chainId: number;
    escrowAddress: string;
    buyer: string;
    seller: string;
    token: string;
    amount: string;
    feeBps: number;
    status: EscrowStatus;
    lastTxHash?: string;
    lastBlockNumber?: string;
  }): Promise<Escrow> {
    const id = `${data.chainId}-${data.escrowAddress.toLowerCase()}`;

    return escrowRepository.upsert({
      id,
      chainId: data.chainId,
      escrowAddress: data.escrowAddress.toLowerCase(),
      buyer: data.buyer.toLowerCase(),
      seller: data.seller.toLowerCase(),
      token: data.token.toLowerCase(),
      amount: data.amount,
      feeBps: data.feeBps,
      status: data.status,
      lastTxHash: data.lastTxHash,
      lastBlockNumber: data.lastBlockNumber,
    });
  },
};
